// ============================================================
// 🤖 agents/registry.js — Specialized AI Workforce
// Each agent has: role, expertise, preferred model, validators
// Supports hierarchical delegation and shared memory
// ============================================================

const AGENTS = {
  // ─── EXECUTIVE ──────────────────────────
  ceo: {
    name: 'CEO Agent',
    emoji: '👔',
    role: 'Chief Strategy & Decisions',
    task: 'reasoning-deep',
    system: 'You are the CEO Agent — strategic, decisive, business-focused. Set vision, priorities, and identify risks. Be specific and grounded.',
    schema: 'strategic_plan',
    can_delegate_to: ['product', 'marketing', 'analyst'],
  },

  product: {
    name: 'Product Agent',
    emoji: '📦',
    role: 'Product Specs & Roadmap',
    task: 'reasoning-deep',
    system: 'You are the Product Agent — define features, user flows, and MVP scope. Be detailed and pragmatic.',
    schema: 'product_spec',
    can_delegate_to: ['design', 'developer', 'qa'],
  },

  // ─── BUILDERS ───────────────────────────
  designer: {
    name: 'Design Agent',
    emoji: '🎨',
    role: 'UI/UX & Visual Design',
    task: 'creative',
    system: 'You are the Design Agent — premium dark-themed UI/UX expert. Create beautiful, modern designs.',
    can_delegate_to: ['frontend'],
  },

  backend: {
    name: 'Backend Engineer',
    emoji: '💻',
    role: 'Server & Database Implementation',
    task: 'coding-strong',
    system: 'You are the Backend Agent — senior Node.js/Express/SQLite engineer. Write production-grade code with auth, error handling, and proper architecture.',
    can_delegate_to: ['qa', 'security'],
  },

  frontend: {
    name: 'Frontend Engineer',
    emoji: '🖥️',
    role: 'Client-side Implementation',
    task: 'coding-strong',
    system: 'You are the Frontend Agent — senior React/HTML/CSS engineer. Write clean, responsive, performant UIs.',
    can_delegate_to: ['qa'],
  },

  devops: {
    name: 'DevOps Agent',
    emoji: '🚀',
    role: 'Deployment & Infrastructure',
    task: 'coding-fast',
    system: 'You are the DevOps Agent — generate Dockerfiles, CI/CD configs, deployment scripts, and infrastructure.',
  },

  // ─── QUALITY & VALIDATION ───────────────
  qa: {
    name: 'QA Engineer',
    emoji: '🔍',
    role: 'Quality Assurance',
    task: 'reasoning-fast',
    system: 'You are the QA Agent — find bugs, edge cases, and quality issues. Be thorough.',
  },

  security: {
    name: 'Security Engineer',
    emoji: '🔒',
    role: 'Security Audit',
    task: 'reasoning-fast',
    system: 'You are the Security Agent — scan for OWASP issues, vulnerabilities, and compliance gaps.',
  },

  validator: {
    name: 'Validator Agent',
    emoji: '✅',
    role: 'Output Validation & Scoring',
    task: 'classification',
    system: 'You are the Validator — score outputs strictly. Be a harsh but fair critic.',
  },

  // ─── GROWTH & INTELLIGENCE ──────────────
  marketing: {
    name: 'Marketing Agent',
    emoji: '📢',
    role: 'Growth & Launch',
    task: 'creative',
    system: 'You are the Marketing Agent — viral growth expert. Create compelling launch materials.',
  },

  analyst: {
    name: 'Analyst Agent',
    emoji: '📊',
    role: 'Data & Market Analysis',
    task: 'reasoning-deep',
    system: 'You are the Analyst Agent — analyze markets, competitors, trends with data-driven insights.',
  },

  researcher: {
    name: 'Research Agent',
    emoji: '🔬',
    role: 'Deep Research',
    task: 'reasoning-deep',
    system: 'You are the Research Agent — gather information, validate sources, synthesize findings.',
  },

  // ─── INFRASTRUCTURE ─────────────────────
  planner: {
    name: 'Planner Agent',
    emoji: '📋',
    role: 'Decompose goals into executable plans',
    task: 'reasoning-deep',
    system: 'You are the Planner Agent — break goals into clear, executable phases with dependencies, owners, and timelines.',
  },

  supervisor: {
    name: 'Supervisor Agent',
    emoji: '🎯',
    role: 'Orchestrate other agents',
    task: 'reasoning-deep',
    system: 'You are the Supervisor — coordinate multiple agents, decide who works on what, and synthesize their outputs into cohesive results.',
    can_delegate_to: ['*'], // can delegate to any agent
  },

  refiner: {
    name: 'Refiner Agent',
    emoji: '🔁',
    role: 'Improve weak outputs',
    task: 'reasoning-deep',
    system: 'You are the Refiner — take weak outputs and specific feedback, then produce significantly improved versions.',
  },
};

/**
 * Run a single agent with optional context.
 */
async function runAgent(smartCall, agentKey, prompt, contextData) {
  const agent = AGENTS[agentKey];
  if (!agent) throw new Error(`Unknown agent: ${agentKey}`);

  const fullPrompt = contextData
    ? `${prompt}\n\nCONTEXT FROM OTHER AGENTS:\n${formatContext(contextData)}`
    : prompt;

  const result = await smartCall({
    prompt: fullPrompt,
    system: agent.system,
    task: agent.task,
    json: agent.json !== false,
    max_tokens: agent.max_tokens || 2000,
    cacheable: agent.cacheable !== false,
  });

  return {
    agent: agentKey,
    name: agent.name,
    emoji: agent.emoji,
    role: agent.role,
    output: result.output,
    model: result.model,
    provider: result.provider,
    duration_ms: result.duration_ms,
  };
}

function formatContext(contextData) {
  if (!contextData) return '';
  if (typeof contextData === 'string') return contextData;
  return Object.entries(contextData)
    .map(([key, value]) => `[${key}]\n${typeof value === 'string' ? value : JSON.stringify(value)}`)
    .join('\n\n')
    .slice(0, 4000);
}

/**
 * Resolve which agent to use for a task description.
 */
function pickAgent(taskDescription) {
  const lower = String(taskDescription || '').toLowerCase();
  if (/(strategy|vision|business model|decision)/i.test(lower)) return 'ceo';
  if (/(feature|spec|roadmap|persona|user flow)/i.test(lower)) return 'product';
  if (/(design|ui|ux|landing page|visual|color|layout)/i.test(lower)) return 'designer';
  if (/(backend|server|database|api endpoint|express)/i.test(lower)) return 'backend';
  if (/(frontend|react|component|html|css)/i.test(lower)) return 'frontend';
  if (/(deploy|docker|kubernetes|ci\/cd)/i.test(lower)) return 'devops';
  if (/(test|qa|bug|edge case)/i.test(lower)) return 'qa';
  if (/(security|vulnerability|owasp|threat)/i.test(lower)) return 'security';
  if (/(market|launch|tweet|copy|growth|seo)/i.test(lower)) return 'marketing';
  if (/(analy|data|trend|competitor)/i.test(lower)) return 'analyst';
  if (/(research|investigate|sources)/i.test(lower)) return 'researcher';
  if (/(plan|breakdown|phases|steps)/i.test(lower)) return 'planner';
  return 'supervisor';
}

module.exports = { AGENTS, runAgent, pickAgent };