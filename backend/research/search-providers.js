// ============================================================
// 🔎 research/search-providers.js — Pluggable web search
//
// Every provider uses an official, documented API. None of them scrape
// search-engine result pages. A provider is enabled only when its
// configuration is present, except Wikipedia, whose public API needs no
// key (turn it off with RESEARCH_WIKIPEDIA=off).
//
//   tavily     TAVILY_API_KEY
//   brave      BRAVE_SEARCH_API_KEY        (api.search.brave.com)
//   searxng    SEARXNG_URL                 (your own SearXNG instance)
//   wikipedia  —                           (MediaWiki search API)
//
// Each search() resolves to normalized results:
//   { title, url, snippet, published_at|null, provider }
// ============================================================

const UA = 'NexusAIResearchBot/1.0 (+https://nexusaitools.it.com)';

async function defaultHttpJson(url, { method = 'GET', headers = {}, body, timeoutMs = 10_000 } = {}) {
  const res = await fetch(url, {
    method,
    headers: { 'User-Agent': UA, Accept: 'application/json', ...headers },
    body,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

const isoOrNull = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

function tavily({ apiKey, httpJson }) {
  return {
    name: 'tavily',
    async search(query, { maxResults = 6 } = {}) {
      const data = await httpJson('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, query, search_depth: 'basic', max_results: maxResults }),
      });
      return (data.results || []).map((r) => ({
        title: r.title, url: r.url, snippet: r.content || '', published_at: isoOrNull(r.published_date), provider: 'tavily',
      }));
    },
  };
}

function brave({ apiKey, httpJson }) {
  return {
    name: 'brave',
    async search(query, { maxResults = 6 } = {}) {
      const u = new URL('https://api.search.brave.com/res/v1/web/search');
      u.searchParams.set('q', query);
      u.searchParams.set('count', String(Math.min(maxResults, 20)));
      const data = await httpJson(u.toString(), { headers: { 'X-Subscription-Token': apiKey } });
      return (data.web?.results || []).map((r) => ({
        title: r.title, url: r.url, snippet: (r.description || '').replace(/<[^>]+>/g, ''),
        published_at: isoOrNull(r.page_age), provider: 'brave',
      }));
    },
  };
}

function searxng({ baseUrl, httpJson }) {
  return {
    name: 'searxng',
    async search(query, { maxResults = 6 } = {}) {
      const u = new URL('/search', baseUrl);
      u.searchParams.set('q', query);
      u.searchParams.set('format', 'json');
      const data = await httpJson(u.toString());
      return (data.results || []).slice(0, maxResults).map((r) => ({
        title: r.title, url: r.url, snippet: r.content || '', published_at: isoOrNull(r.publishedDate), provider: 'searxng',
      }));
    },
  };
}

function wikipedia({ lang = 'en', httpJson }) {
  return {
    name: 'wikipedia',
    async search(query, { maxResults = 4 } = {}) {
      const u = new URL(`https://${lang}.wikipedia.org/w/api.php`);
      Object.entries({ action: 'query', list: 'search', srsearch: query, format: 'json', srlimit: String(maxResults), origin: '*' })
        .forEach(([k, v]) => u.searchParams.set(k, v));
      const data = await httpJson(u.toString());
      return (data.query?.search || []).map((r) => ({
        title: r.title,
        url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, '_'))}`,
        snippet: String(r.snippet || '').replace(/<[^>]+>/g, ''),
        published_at: isoOrNull(r.timestamp),
        provider: 'wikipedia',
      }));
    },
  };
}

/** Build the providers this deployment is configured for. */
function configuredProviders(env = process.env, { httpJson = defaultHttpJson } = {}) {
  const list = [];
  if (env.TAVILY_API_KEY) list.push(tavily({ apiKey: env.TAVILY_API_KEY, httpJson }));
  if (env.BRAVE_SEARCH_API_KEY) list.push(brave({ apiKey: env.BRAVE_SEARCH_API_KEY, httpJson }));
  if (env.SEARXNG_URL) list.push(searxng({ baseUrl: env.SEARXNG_URL, httpJson }));
  if (env.RESEARCH_WIKIPEDIA !== 'off') list.push(wikipedia({ lang: env.RESEARCH_WIKIPEDIA_LANG || 'en', httpJson }));
  return list;
}

module.exports = { configuredProviders, tavily, brave, searxng, wikipedia, defaultHttpJson, UA };
