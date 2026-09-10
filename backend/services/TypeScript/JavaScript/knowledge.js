// ============================================================
// 🔍 services/knowledge.js — Elite Search & Retrieval
// Multi-source RAG with citations, source scoring, fusion
// ============================================================
const crypto = require('crypto');

class KnowledgeService {
  constructor(options) {
    this.smartCall = options.smartCall;
    this.cache = options.cache;
    this.logger = options.logger;
    this.tracer = options.tracer;
  }

  // ─── Tavily search (most relevant for AI) ───
  async tavilySearch(query, { depth = 'basic', maxResults = 5 } = {}) {
    if (!process.env.TAVILY_API_KEY) return null;
    const cacheKey = ['tavily', query, depth, maxResults];
    const cached = await this.cache?.get(cacheKey);
    if (cached) return cached;

    try {
      const r = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query,
          search_depth: depth,
          max_results: maxResults,
          include_answer: true,
          include_raw_content: false,
        }),
      });
      if (!r.ok) return null;
      const data = await r.json();
      const result = {
        answer: data.answer,
        results: (data.results || []).map(r => ({
          title: r.title,
          url: r.url,
          snippet: r.content,
          score: r.score || 0,
          source: this._domainOf(r.url),
        })),
      };
      await this.cache?.set(cacheKey, result, { ttl: 1800 });
      return result;
    } catch (e) {
      this.logger?.warn('Tavily error', { error: e.message });
      return null;
    }
  }

  // ─── Source credibility scoring ───────────
  scoreSource(url) {
    const domain = this._domainOf(url);
    const tiers = {
      tier1: ['nature.com', 'science.org', 'arxiv.org', 'nih.gov', 'who.int', 'reuters.com', 'apnews.com'],
      tier2: ['nytimes.com', 'wsj.com', 'bbc.com', 'theguardian.com', 'economist.com', 'bloomberg.com'],
      tier3: ['wikipedia.org', 'github.com', 'stackoverflow.com', 'developer.mozilla.org'],
    };
    if (tiers.tier1.some(d => domain.endsWith(d))) return 95;
    if (tiers.tier2.some(d => domain.endsWith(d))) return 85;
    if (tiers.tier3.some(d => domain.endsWith(d))) return 80;
    if (domain.endsWith('.edu') || domain.endsWith('.gov')) return 90;
    if (domain.endsWith('.org')) return 70;
    return 60;
  }

  // ─── Hybrid RAG: search + ground + cite ──
  async groundedAnswer(question, options = {}) {
    const traceId = this.tracer?.start('grounded_answer', { user_id: options.user_id });
    const t0 = Date.now();

    try {
      // Step 1: Search
      const search = await this.tavilySearch(question, {
        depth: options.deepSearch ? 'advanced' : 'basic',
        maxResults: options.maxSources || 6,
      });

      if (!search?.results?.length) {
        // Fallback: answer from model only
        const answer = await this.smartCall({
          prompt: question,
          system: 'You are an expert. Answer based on your knowledge. Note any uncertainty.',
          task: 'reasoning-deep',
          cacheable: false,
        });
        this.tracer?.finish(traceId, 'no_sources');
        return {
          answer: answer.output,
          sources: [],
          citations: [],
          grounded: false,
          duration_ms: Date.now() - t0,
        };
      }

      // Step 2: Score and rank sources
      const ranked = search.results
        .map(r => ({ ...r, credibility: this.scoreSource(r.url) }))
        .sort((a, b) => (b.credibility * b.score) - (a.credibility * a.score));

      // Step 3: Build context with numbered citations
      const context = ranked.map((r, i) => `[${i + 1}] ${r.title} (${r.source}, credibility: ${r.credibility}/100)\n${String(r.snippet || '').slice(0, 600)}`).join('\n\n');

      // Step 4: Grounded synthesis
      const synth = await this.smartCall({
        prompt: `Answer the question using ONLY the sources below. Cite using [1], [2], etc. If sources disagree, note it. If sources don't cover something, say so.

QUESTION: ${question}

SOURCES:
${context}

Provide a clear, well-cited answer.`,
        system: 'You are a careful researcher. Cite all claims. Prefer recent and credible sources. Be transparent about uncertainty.',
        task: 'reasoning-deep',
        cacheable: false,
        max_tokens: 1500,
      });

      // Step 5: Extract which citations were actually used
      const text = String(synth.output);
      const usedCitations = [...text.matchAll(/\[(\d+)\]/g)].map(m => parseInt(m[1])).filter((n, i, a) => a.indexOf(n) === i);
      const citations = usedCitations.map(n => ranked[n - 1]).filter(Boolean);

      this.tracer?.finish(traceId, 'success');

      return {
        answer: text,
        sources: ranked,
        citations,
        grounded: true,
        confidence: this._computeConfidence(ranked, citations),
        duration_ms: Date.now() - t0,
        model: synth.model,
      };
    } catch (err) {
      this.tracer?.finish(traceId, 'error', err.message);
      throw err;
    }
  }

  // ─── Adaptive search refinement ──────────
  async refinedResearch(topic, options = {}) {
    const maxIters = options.maxIterations || 3;
    const research = { iterations: [], findings: [] };

    let currentQuery = topic;
    for (let i = 0; i < maxIters; i++) {
      // Search
      const result = await this.groundedAnswer(currentQuery, { deepSearch: i > 0, ...options });
      research.iterations.push({ query: currentQuery, found_sources: result.sources?.length || 0 });
      research.findings.push(result.answer);

      // Decide if we need to refine
      const decision = await this.smartCall({
        prompt: `We're researching: "${topic}"\n\nLatest findings: ${result.answer.slice(0, 1500)}\n\nDecide JSON: {"satisfied":true|false,"gaps":["..."],"next_query":"specific follow-up query if not satisfied"}`,
        task: 'classification',
        json: true,
        cacheable: false,
      });

      if (decision.output.satisfied) break;
      if (!decision.output.next_query) break;
      currentQuery = decision.output.next_query;
    }

    // Final synthesis
    const finalSynth = await this.smartCall({
      prompt: `Synthesize comprehensive research on: "${topic}"\n\nFindings from ${research.iterations.length} research iterations:\n\n${research.findings.map((f, i) => `[Iteration ${i + 1}]\n${f}`).join('\n\n---\n\n')}\n\nProduce a unified, well-structured answer.`,
      task: 'reasoning-deep',
      cacheable: false,
      max_tokens: 2500,
    });

    return {
      topic,
      iterations: research.iterations.length,
      synthesis: finalSynth.output,
      research_log: research.iterations,
    };
  }

  _domainOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); }
    catch (_) { return ''; }
  }

  _computeConfidence(sources, citations) {
    if (!sources.length) return 30;
    const avgCredibility = sources.reduce((s, r) => s + r.credibility, 0) / sources.length;
    const citationCoverage = citations.length / Math.max(sources.length, 1);
    return Math.round(avgCredibility * 0.6 + citationCoverage * 100 * 0.4);
  }
}

module.exports = { KnowledgeService };