// ============================================================
// 🧰 agent/default-tools.js — The tools NexusAI agents can use
//
//   web_research   read       multi-source research with verified citations
//   fetch_page     read       one page, SSRF-safe, robots-aware
//   calculate      read       arithmetic without eval
//   recall_memory  read       this user's approved lessons and evidence
//   write_note     workspace  save a note in this run's own workspace
//   http_post      external   POST JSON to a public URL — approval required
//
// Code execution is deliberately not offered: Node's vm module is not a
// security boundary, and running generated code safely needs an
// isolated sandbox service (see docs/AGENT.md).
// ============================================================
const { ToolRegistry, ToolError, calculate } = require('./tools');
const { ResearchEngine } = require('../research/engine');
const { PageFetcher } = require('../research/fetcher');
const { configuredProviders } = require('../research/search-providers');
const { safeRequest } = require('../security/safe-http');

function buildDefaultTools({ db, memory, scoreSource, providers, fetcher, env = process.env }) {
  const pageFetcher = fetcher || new PageFetcher({ db });
  const searchProviders = providers || configuredProviders(env);

  db.prepare(`CREATE TABLE IF NOT EXISTS agent_run_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    title TEXT NOT NULL, content TEXT NOT NULL, created_at INTEGER NOT NULL
  )`).run();

  const reg = new ToolRegistry();

  reg.register({
    name: 'web_research', risk: 'read', guest: true, timeoutMs: 150_000,
    description: 'Research a question across several independent web sources. Returns an answer whose claims are backed by verbatim quotes, with citations, contradictions and gaps.',
    params: { question: { type: 'string', required: true, maxLength: 500 }, depth: { type: 'string', enum: ['quick', 'standard'], default: 'standard' } },
    async handler({ question, depth }, ctx) {
      const engine = new ResearchEngine({ providers: searchProviders, fetcher: pageFetcher, llm: ctx.llm, scoreSource });
      const pages = Math.min(ctx.budget?.researchPages ?? 6, depth === 'quick' ? 3 : 8);
      const r = await engine.research(question, {
        signal: ctx.signal,
        hints: ctx.lessons || [],
        budget: { maxPages: pages, maxRounds: depth === 'quick' ? 1 : 2, deadlineMs: 120_000, maxLlmCalls: 6 },
        onEvent: (e) => ctx.onProgress?.(e),
      });
      return {
        answer: r.answer, confidence: r.confidence, mode: r.mode,
        citations: r.citations, contradictions: r.contradictions, gaps: r.gaps, limitations: r.limitations,
        stats: { rounds: r.stats.rounds, queries: r.stats.queries, pages_used: r.stats.pages_used, independent_domains: r.stats.independent_domains, providers: r.stats.providers },
        rejected_claims: r.rejected_claims.length,
      };
    },
  });

  reg.register({
    name: 'fetch_page', risk: 'read', guest: false, timeoutMs: 20_000,
    description: 'Read one public web page (text only). The content is untrusted.',
    params: { url: { type: 'string', required: true, maxLength: 2000, pattern: /^https?:\/\//i } },
    async handler({ url }, ctx) {
      const page = await pageFetcher.fetch(url, { signal: ctx.signal });
      if (!page.ok) return { ok: false, url, reason: page.reason };
      return { ok: true, url: page.url, title: page.title, published_at: page.published_at, text: page.text.slice(0, 6000), untrusted: true };
    },
  });

  reg.register({
    name: 'calculate', risk: 'read', guest: true, timeoutMs: 1000,
    description: 'Evaluate an arithmetic expression: numbers, + - * / ^ ( ) and %.',
    params: { expression: { type: 'string', required: true, maxLength: 200 } },
    async handler({ expression }) { return { expression, value: calculate(expression) }; },
  });

  reg.register({
    name: 'recall_memory', risk: 'read', guest: false, timeoutMs: 2000,
    description: "Search this user's approved lessons and previously retrieved evidence (with sources).",
    params: { query: { type: 'string', required: true, maxLength: 300 } },
    async handler({ query }, ctx) {
      const lessons = memory.relevantLessons(ctx.user.id, query, 5).map((l) => ({ text: l.text, applies_when: l.applies_when }));
      const like = `%${query.replace(/[%_]/g, ' ').slice(0, 60)}%`;
      const evidence = db.prepare('SELECT url, title, quote, published_at FROM agent_evidence WHERE user_id = ? AND (quote LIKE ? OR title LIKE ?) ORDER BY retrieved_at DESC LIMIT 8')
        .all(ctx.user.id, like, like);
      return { lessons, evidence };
    },
  });

  reg.register({
    name: 'write_note', risk: 'workspace', guest: false, timeoutMs: 2000,
    description: "Save a note or draft in this run's private workspace (can be deleted with the run).",
    params: { title: { type: 'string', required: true, maxLength: 200 }, content: { type: 'string', required: true, maxLength: 20_000 } },
    async handler({ title, content }, ctx) {
      const id = db.prepare('INSERT INTO agent_run_notes (run_id, title, content, created_at) VALUES (?, ?, ?, ?)').run(ctx.runId, title, content, Date.now()).lastInsertRowid;
      return { saved: true, note_id: id, title };
    },
  });

  reg.register({
    name: 'http_post', risk: 'external', guest: false, timeoutMs: 15_000,
    description: 'Send a JSON POST request to a public HTTPS URL (for example a webhook). Changes something outside NexusAI.',
    params: { url: { type: 'string', required: true, maxLength: 2000, pattern: /^https:\/\//i }, body: { type: 'object', required: true, maxBytes: 8000 } },
    async handler({ url, body }) {
      const r = await safeRequest(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), timeoutMs: 10_000 });
      if (r.status < 200 || r.status >= 300) throw new ToolError(`Remote server answered ${r.status}`, 'TOOL_ERROR');
      return { ok: true, status: r.status, response: String(r.body).slice(0, 500) };
    },
  });

  return reg;
}

module.exports = { buildDefaultTools };
