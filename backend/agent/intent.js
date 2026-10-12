// ============================================================
// 🧭 agent/intent.js — What kind of task is this, and how big?
//
// Deterministic (no model call): the result decides which specialists
// the planner is offered and how much delegation the plan may use, so
// it must be cheap, explainable and testable. The planner still writes
// the plan; this only frames it.
// ============================================================

const CAPABILITIES = ['research', 'coding', 'analysis', 'planning', 'business', 'general'];

// Weighted signals per capability. Word boundaries keep "code" from matching "decode" etc.
const SIGNALS = {
  coding: [
    [/\b(bug|stack ?trace|exception|refactor|regression|unit tests?|typescript|javascript|node(\.js)?|express|endpoint|function|module|repository|repo|codebase|pull request|diff|patch|compile|lint)\b/i, 2],
    [/\b(code|coding|implement|debug|fix)\b/i, 1],
    [/\.(js|ts|tsx|py|go|rs|java|json|ya?ml|sql|css|html)\b/i, 2],
  ],
  research: [
    [/\b(research|sources?|evidence|cite|citations?|literature|studies|study|according to|latest|news|history of|who|when did|what is known)\b/i, 2],
    [/\b(compare|find out|look up|investigate|verify|fact[- ]check)\b/i, 1],
  ],
  analysis: [
    [/\b(analy[sz]e|analysis|calculate|compute|estimate|percentage|ratio|average|growth rate|statistics?|trade-?offs?|root cause|why does)\b/i, 2],
    [/\d+\s*[-+*/^%]\s*\d+/, 2],
  ],
  planning: [
    [/\b(plan|roadmap|milestones?|timeline|schedule|steps to|phases?|break (it )?down|prioriti[sz]e|checklist)\b/i, 2],
  ],
  business: [
    [/\b(business|market|customers?|revenue|pricing|go[- ]to[- ]market|competitors?|startup|sales|marketing|strategy|budget|cost|profit|kpi|okr)\b/i, 2],
  ],
};

/**
 * @param {string} goal
 * @returns {{ capability: string, secondary: string[], complexity: 'simple'|'compound',
 *   scores: Record<string, number>, signals: string[], method: 'keyword' }}
 */
function classifyIntent(goal) {
  const text = String(goal || '');
  const scores = {}; const signals = [];
  for (const [cap, rules] of Object.entries(SIGNALS)) {
    let score = 0;
    for (const [re, w] of rules) {
      const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
      const hits = [...text.matchAll(g)].map((m) => m[0].toLowerCase());
      if (hits.length) { score += w * Math.min(hits.length, 3); signals.push(...hits.slice(0, 3).map((h) => `${cap}:${h}`)); }
    }
    if (score) scores[cap] = score;
  }
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1] || CAPABILITIES.indexOf(a[0]) - CAPABILITIES.indexOf(b[0]));
  const capability = ranked[0]?.[0] || 'general';
  // A capability counts as secondary when it carries real weight next to the primary one.
  const secondary = ranked.slice(1).filter(([, s]) => s >= 2).map(([c]) => c);
  const clauses = text.split(/\b(?:and then|then|after that|also|additionally)\b|[;\n]|\d+[.)]\s/i).filter((c) => c.trim().length > 12).length;
  const complexity = secondary.length >= 1 || clauses >= 3 || text.length > 400 ? 'compound' : 'simple';
  return { capability, secondary, complexity, scores, signals: [...new Set(signals)].slice(0, 10), method: 'keyword' };
}

module.exports = { classifyIntent, CAPABILITIES };
