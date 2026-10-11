// ============================================================
// 🌐 research/fetcher.js — Polite, SSRF-safe page retrieval
//
//   • Every request goes through security/safe-http.js: public
//     addresses only, re-checked on each redirect, 2 MB cap.
//   • robots.txt is honoured for our user agent and for "*".
//   • At most one request per host per RESEARCH_HOST_INTERVAL_MS.
//   • Pages that answer with a CAPTCHA, a login wall or a paywall are
//     reported as blocked. Nothing here tries to get around them.
//   • Extracted pages are cached in SQLite for RESEARCH_CACHE_TTL_HOURS.
//
// The text returned is untrusted third-party content. Callers must
// treat it as data, never as instructions (see research/engine.js).
// ============================================================
const { safeRequest } = require('../security/safe-http');
const { UA } = require('./search-providers');

const BLOCK_PATTERNS = [
  [/captcha|are you a robot|verify you are human|cf-challenge|challenge-platform/i, 'captcha'],
  [/subscribe to (continue|read)|this content is for subscribers|paywall/i, 'paywall'],
  [/please (log|sign) in to (continue|view)|login required/i, 'login'],
];

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", mdash: '—', ndash: '–', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };
function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : ' ';
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

function metaContent(html, attr, name) {
  const re = new RegExp(`<meta[^>]+${attr}=["']${name}["'][^>]*>`, 'i');
  const tag = html.match(re)?.[0];
  return tag ? decodeEntities(tag.match(/content=["']([^"']*)["']/i)?.[1] || '').trim() : '';
}

function extractPublished(html) {
  const candidates = [
    metaContent(html, 'property', 'article:published_time'),
    metaContent(html, 'name', 'date'),
    metaContent(html, 'name', 'dc.date'),
    metaContent(html, 'itemprop', 'datePublished'),
    html.match(/"datePublished"\s*:\s*"([^"]+)"/i)?.[1],
    html.match(/<time[^>]+datetime=["']([^"']+)["']/i)?.[1],
  ];
  for (const c of candidates) {
    if (!c) continue;
    const d = new Date(c);
    if (!Number.isNaN(d.getTime()) && d.getTime() < Date.now() + 86_400_000) return d.toISOString();
  }
  return null;
}

/** HTML → { title, text, published_at, canonical }. */
function extractContent(html) {
  const title = decodeEntities(
    metaContent(html, 'property', 'og:title') || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '',
  ).replace(/\s+/g, ' ').trim();
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i)?.[0]?.match(/href=["']([^"']+)["']/i)?.[1] || null;
  const published_at = extractPublished(html);

  let body = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template|iframe|form|button|select)[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  // Prefer the main content region when the page marks one.
  const main = body.match(/<(article|main)[^>]*>([\s\S]*?)<\/\1>/i);
  if (main && main[2].replace(/<[^>]+>/g, '').trim().length > 400) body = main[2];
  body = body.replace(/<(nav|header|footer|aside)[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  const text = decodeEntities(
    body
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t\f\v\r]+/g, ' ')
    .replace(/\n\s*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
  return { title, text, published_at, canonical };
}

// ── robots.txt ───────────────────────────────────────────────
function parseRobots(txt) {
  const groups = [];
  let current = null;
  let lastWasAgent = false;
  for (const raw of String(txt).split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = line.match(/^([\w-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const [, key, value] = [m[0], m[1].toLowerCase(), m[2].trim()];
    if (key === 'user-agent') {
      if (!lastWasAgent || !current) { current = { agents: [], rules: [] }; groups.push(current); }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((key === 'allow' || key === 'disallow') && current) {
      current.rules.push({ allow: key === 'allow', path: value });
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }
  return groups;
}

function robotsAllows(groups, path, agent = 'nexusairesearchbot') {
  const pick = groups.find((g) => g.agents.some((a) => a !== '*' && agent.includes(a)))
    || groups.find((g) => g.agents.includes('*'));
  if (!pick) return true;
  // Longest matching rule wins; Allow wins a tie.
  let best = null;
  for (const r of pick.rules) {
    if (!r.path) continue;
    const re = new RegExp('^' + r.path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
    if (re.test(path) && (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow))) best = r;
  }
  return !best || best.allow;
}

class PageFetcher {
  /**
   * @param {{ db?: any, request?: typeof safeRequest, now?: () => number, hostIntervalMs?: number, ttlHours?: number }} opts
   */
  constructor(opts = {}) {
    this.request = opts.request || safeRequest;
    this.now = opts.now || Date.now;
    this.hostIntervalMs = Number(opts.hostIntervalMs ?? process.env.RESEARCH_HOST_INTERVAL_MS ?? 1000);
    this.ttlMs = Number(opts.ttlHours ?? process.env.RESEARCH_CACHE_TTL_HOURS ?? 6) * 3_600_000;
    this.db = opts.db || null;
    this.robots = new Map();      // origin → { groups, at }
    this.lastHit = new Map();     // host → ms
    this.stats = { network: 0, cache_hits: 0, robots_blocked: 0, blocked: 0, errors: 0 };
    if (this.db) {
      this.db.prepare(`CREATE TABLE IF NOT EXISTS research_page_cache (
        url TEXT PRIMARY KEY, fetched_at INTEGER NOT NULL, payload TEXT NOT NULL
      )`).run();
    }
  }

  async _politeWait(host, signal) {
    const wait = (this.lastHit.get(host) || 0) + this.hostIntervalMs - this.now();
    if (wait > 0) {
      await new Promise((resolve, reject) => {
        const t = setTimeout(resolve, wait);
        signal?.addEventListener('abort', () => { clearTimeout(t); reject(new Error('aborted')); }, { once: true });
      });
    }
    this.lastHit.set(host, this.now());
  }

  async _robotsFor(url, signal) {
    const origin = url.origin;
    const hit = this.robots.get(origin);
    if (hit && this.now() - hit.at < 3_600_000) return hit.groups;
    let groups = [];
    try {
      await this._politeWait(url.host, signal);
      const r = await this.request(`${origin}/robots.txt`, { headers: { 'User-Agent': UA }, timeoutMs: 6000 });
      // 4xx: no robots policy → allowed. 5xx: treat the site as off limits for now.
      if (r.status >= 500) groups = [{ agents: ['*'], rules: [{ allow: false, path: '/' }] }];
      else if (r.status === 200) groups = parseRobots(r.body);
    } catch (_) {
      groups = [];
    }
    this.robots.set(origin, { groups, at: this.now() });
    return groups;
  }

  _cacheGet(url) {
    if (!this.db) return null;
    const row = this.db.prepare('SELECT fetched_at, payload FROM research_page_cache WHERE url = ?').get(url);
    if (!row || this.now() - row.fetched_at > this.ttlMs) return null;
    return { ...JSON.parse(row.payload), cached: true, fetched_at: new Date(row.fetched_at).toISOString() };
  }

  _cachePut(url, page) {
    if (!this.db) return;
    this.db.prepare('INSERT OR REPLACE INTO research_page_cache (url, fetched_at, payload) VALUES (?, ?, ?)')
      .run(url, this.now(), JSON.stringify(page));
  }

  /**
   * @returns {Promise<{ ok: boolean, url: string, title?: string, text?: string, published_at?: string|null,
   *   fetched_at?: string, cached?: boolean, reason?: string }>}
   */
  async fetch(rawUrl, { signal } = {}) {
    let url;
    try { url = new URL(rawUrl); } catch (_) { return { ok: false, url: rawUrl, reason: 'invalid_url' }; }
    if (!['http:', 'https:'].includes(url.protocol)) return { ok: false, url: rawUrl, reason: 'unsupported_protocol' };
    url.hash = '';
    const key = url.toString();
    const cached = this._cacheGet(key);
    if (cached) { this.stats.cache_hits++; return cached; }
    if (signal?.aborted) return { ok: false, url: key, reason: 'aborted' };

    const groups = await this._robotsFor(url, signal).catch(() => []);
    if (!robotsAllows(groups, url.pathname + url.search)) {
      this.stats.robots_blocked++;
      return { ok: false, url: key, reason: 'robots_disallowed' };
    }
    try {
      await this._politeWait(url.host, signal);
      this.stats.network++;
      const r = await this.request(key, {
        headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,text/plain;q=0.8' },
        timeoutMs: 10_000,
      });
      if (r.status === 401 || r.status === 402 || r.status === 403) {
        this.stats.blocked++;
        return { ok: false, url: key, reason: `access_denied_${r.status}` };
      }
      if (r.status < 200 || r.status >= 300) return { ok: false, url: key, reason: `http_${r.status}` };
      const ctype = String(r.headers?.['content-type'] || '');
      if (ctype && !/text\/html|application\/xhtml|text\/plain/i.test(ctype)) {
        return { ok: false, url: key, reason: 'unsupported_content_type' };
      }
      const page = /text\/plain/i.test(ctype)
        ? { title: key, text: r.body.trim(), published_at: null, canonical: null }
        : extractContent(r.body);
      if (page.text.length < 1500) {
        const hit = BLOCK_PATTERNS.find(([re]) => re.test(r.body));
        if (hit) { this.stats.blocked++; return { ok: false, url: key, reason: `blocked_${hit[1]}` }; }
      }
      if (page.text.length < 200) return { ok: false, url: key, reason: 'no_readable_content' };
      const result = {
        ok: true, url: r.url || key, title: page.title || key, text: page.text.slice(0, 60_000),
        published_at: page.published_at, fetched_at: new Date(this.now()).toISOString(),
      };
      this._cachePut(key, result);
      return result;
    } catch (err) {
      this.stats.errors++;
      return { ok: false, url: key, reason: /private|not allowed|reserved/i.test(err.message) ? 'blocked_private_address' : `error: ${String(err.message).slice(0, 120)}` };
    }
  }
}

module.exports = { PageFetcher, extractContent, parseRobots, robotsAllows, decodeEntities };
