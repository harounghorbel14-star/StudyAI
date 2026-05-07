// ============================================================
// 🤖 MULTI-AGENT SYSTEM — routes/agents-system.js
// 6 specialized agents working together with orchestrator
// ============================================================
const express = require('express');
const router = express.Router();
const crypto = require('crypto');

module.exports = (db, openai, requireAuth, requireQuota, aiLimiter, wrap, chatComplete) => {

// ─────────────────────────────────────────────
// 📊 DATABASE TABLES
// ─────────────────────────────────────────────
db.prepare(`CREATE TABLE IF NOT EXISTS agent_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  share_id TEXT UNIQUE,
  name TEXT NOT NULL,
  idea TEXT NOT NULL,
  status TEXT DEFAULT 'building',
  metadata TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS agent_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  agent_name TEXT NOT NULL,
  step_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  input TEXT,
  output TEXT,
  metadata TEXT DEFAULT '{}',
  duration_ms INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES agent_projects(id) ON DELETE CASCADE
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS agent_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  agent_name TEXT,
  level TEXT DEFAULT 'info',
  message TEXT,
  data TEXT,
  created_at TEXT DEFAULT (datetime('now'))
)`).run();

// ─────────────────────────────────────────────
// 🛠️ AGENT DEFINITIONS
// ─────────────────────────────────────────────
const AGENTS = {
  CEO_AGENT: {
    name: 'CEO Agent',
    emoji: '👔',
    role: 'Chief Strategy Officer',
    systemPrompt: `You are the CEO Agent — a brilliant startup strategist and decision maker.

Always respond in structured JSON:
{
  "vision": "...",
  "mission": "...",
  "target_market": {"primary": "...", "size": "...", "demographics": "..."},
  "value_proposition": "...",
  "differentiators": ["...", "...", "..."],
  "revenue_streams": ["...", "..."],
  "risks": [{"risk": "...", "mitigation": "..."}],
  "go_to_market": "...",
  "decision": "GO/PIVOT/REJECT with reasoning"
}`,
    model: 'gpt-4o',
  },

  PRODUCT_AGENT: {
    name: 'Product Agent',
    emoji: '📦',
    role: 'Head of Product',
    systemPrompt: `You are the Product Agent — an expert product manager.

Always respond in structured JSON:
{
  "product_name": "...",
  "tagline": "...",
  "core_features": [{"name": "...", "description": "...", "priority": "high/medium/low"}],
  "user_personas": [{"name": "...", "description": "...", "needs": ["..."], "pain_points": ["..."]}],
  "user_journey": ["step 1", "step 2", "step 3"],
  "mvp_scope": ["feature 1", "feature 2"],
  "tech_requirements": {"frontend": "...", "backend": "...", "database": "..."},
  "success_metrics": ["..."],
  "roadmap": {"v1": ["..."], "v2": ["..."], "v3": ["..."]}
}`,
    model: 'gpt-4o',
  },

  DEV_AGENT: {
    name: 'Dev Agent',
    emoji: '💻',
    role: 'Senior Full-Stack Developer',
    systemPrompt: `You are the Dev Agent — a senior full-stack engineer. Generate REAL, COMPLETE, WORKING code.

Always respond with:
{
  "stack": {"backend": "...", "frontend": "...", "database": "..."},
  "files": [{"path": "backend/server.js", "language": "javascript", "content": "// COMPLETE working code", "description": "..."}],
  "api_endpoints": [{"method": "POST", "path": "/api/...", "description": "..."}],
  "database_schema": "CREATE TABLE...",
  "env_vars": [{"key": "OPENAI_API_KEY", "description": "..."}],
  "setup_commands": ["npm install", "npm start"]
}`,
    model: 'gpt-4o',
  },

  DESIGN_AGENT: {
    name: 'Design Agent',
    emoji: '🎨',
    role: 'Lead UI/UX Designer',
    systemPrompt: `You are the Design Agent — a world-class UI/UX designer.

Generate a COMPLETE, BEAUTIFUL, RESPONSIVE HTML landing page with:
- Dark theme with lime/cyan gradient accents (#c6f135, #35f1c6)
- Hero, features (6), pricing (3 tiers), testimonials, FAQ, footer
- Smooth animations, mobile responsive

Return:
{
  "design_system": {"colors": {"primary": "#c6f135", "secondary": "#35f1c6", "bg": "#0a0a0f"}, "fonts": {"heading": "Inter", "body": "Inter"}},
  "landing_page_html": "<!DOCTYPE html>...COMPLETE HTML WITH INLINE CSS...</html>",
  "logo_concept": "...",
  "ui_components": ["Button", "Card", "Modal"]
}`,
    model: 'gpt-4o',
  },

  MARKETING_AGENT: {
    name: 'Marketing Agent',
    emoji: '📢',
    role: 'Growth & Marketing Lead',
    systemPrompt: `You are the Marketing Agent — a viral growth expert.

Return:
{
  "brand_voice": "...",
  "launch_strategy": "...",
  "twitter_threads": [{"hook": "...", "thread": ["tweet 1", "tweet 2"]}],
  "linkedin_posts": ["post 1", "post 2"],
  "product_hunt": {"tagline": "...", "description": "...", "first_comment": "..."},
  "email_sequence": [{"day": 0, "subject": "...", "body": "..."}],
  "tiktok_scripts": [{"hook": "...", "script": "...", "cta": "..."}],
  "seo_strategy": {"primary_keywords": ["..."], "blog_titles": ["..."], "meta_description": "..."}
}`,
    model: 'gpt-4o',
  },

  DEPLOY_AGENT: {
    name: 'Deploy Agent',
    emoji: '🚀',
    role: 'DevOps Engineer',
    systemPrompt: `You are the Deploy Agent — an expert DevOps engineer.

Return:
{
  "github_setup": {"repo_name": "...", "gitignore": "...", "readme": "..."},
  "dockerfile": "FROM node:20...",
  "docker_compose": "version: '3.8'...",
  "github_actions": "...",
  "vercel_config": "{...}",
  "railway_config": "{...}",
  "env_template": "OPENAI_API_KEY=\\n...",
  "deployment_steps": ["1. Create GitHub repo", "2. ..."],
  "estimated_cost": "$0-20/month"
}`,
    model: 'gpt-4o',
  },
};

// ─────────────────────────────────────────────
// 🎯 AGENT EXECUTOR
// ─────────────────────────────────────────────
async function runAgent(agentKey, context, projectId) {
  const agent = AGENTS[agentKey];
  if (!agent) throw new Error(`Agent ${agentKey} not found`);

  const startTime = Date.now();

  try {
    const result = await openai.chat.completions.create({
      model: agent.model,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: agent.systemPrompt },
        { role: 'user', content: context },
      ],
    });

    const output = result.choices[0]?.message?.content || '{}';
    let parsed;
    try {
      parsed = JSON.parse(output);
    } catch (e) {
      parsed = { raw_output: output, parse_error: true };
    }

    const duration = Date.now() - startTime;

    db.prepare(`INSERT INTO agent_steps (project_id, agent_name, step_name, status, input, output, duration_ms)
                VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      projectId, agent.name, agent.role, 'completed',
      context.slice(0, 1000), JSON.stringify(parsed).slice(0, 10000), duration
    );

    return { agent: agentKey, success: true, output: parsed, duration };

  } catch (error) {
    const duration = Date.now() - startTime;

    db.prepare(`INSERT INTO agent_steps (project_id, agent_name, step_name, status, input, output, duration_ms)
                VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      projectId, agent.name, agent.role, 'failed',
      context.slice(0, 1000), error.message, duration
    );

    return { agent: agentKey, success: false, error: error.message, duration };
  }
}

// ─────────────────────────────────────────────
// 🎬 ORCHESTRATOR — runs all agents with SSE
// ─────────────────────────────────────────────
router.post('/orchestrate', requireAuth, requireQuota, aiLimiter, wrap(async (req, res) => {
  const { idea, project_name } = req.body;
  if (!idea) return res.status(400).json({ error: 'Missing idea.' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);

  const shareId = crypto.randomBytes(8).toString('hex');
  const name = project_name || idea.slice(0, 60);
  const projectId = db.prepare(`INSERT INTO agent_projects (user_id, share_id, name, idea, status)
                                VALUES (?, ?, ?, ?, ?)`).run(
    req.user.id, shareId, name, idea, 'building'
  ).lastInsertRowid;

  send({ type: 'project_created', project_id: projectId, share_id: shareId });

  const pipeline = [
    { agent: 'CEO_AGENT', context: (prev) => `Analyze this startup idea: ${idea}` },
    { agent: 'PRODUCT_AGENT', context: (prev) => `Design product based on:\n\nIDEA: ${idea}\n\nCEO STRATEGY: ${JSON.stringify(prev.CEO_AGENT?.output || {}).slice(0, 2000)}` },
    { agent: 'DESIGN_AGENT', context: (prev) => `Design landing page for:\n\nIDEA: ${idea}\n\nPRODUCT: ${JSON.stringify(prev.PRODUCT_AGENT?.output || {}).slice(0, 2000)}` },
    { agent: 'DEV_AGENT', context: (prev) => `Build technical implementation:\n\nIDEA: ${idea}\n\nPRODUCT: ${JSON.stringify(prev.PRODUCT_AGENT?.output || {}).slice(0, 2000)}` },
    { agent: 'MARKETING_AGENT', context: (prev) => `Create marketing strategy:\n\nIDEA: ${idea}\n\nPRODUCT: ${JSON.stringify(prev.PRODUCT_AGENT?.output || {}).slice(0, 1500)}` },
    { agent: 'DEPLOY_AGENT', context: (prev) => `Create deployment config:\n\nIDEA: ${idea}\n\nTECH: ${JSON.stringify(prev.DEV_AGENT?.output?.stack || {}).slice(0, 500)}` },
  ];

  const results = {};
  let completedAgents = 0;
  const totalAgents = pipeline.length;

  try {
    for (const step of pipeline) {
      const agent = AGENTS[step.agent];
      send({
        type: 'agent_started',
        agent: step.agent,
        agent_name: agent.name,
        emoji: agent.emoji,
        role: agent.role,
        progress: Math.round((completedAgents / totalAgents) * 100),
      });

      const context = step.context(results);
      const result = await runAgent(step.agent, context, projectId);
      results[step.agent] = result;
      completedAgents++;

      send({
        type: 'agent_completed',
        agent: step.agent,
        agent_name: agent.name,
        emoji: agent.emoji,
        success: result.success,
        output: result.output,
        duration_ms: result.duration,
        progress: Math.round((completedAgents / totalAgents) * 100),
      });
    }

    db.prepare(`UPDATE agent_projects SET status = 'completed', updated_at = datetime('now') WHERE id = ?`).run(projectId);

    send({
      type: 'complete',
      project_id: projectId,
      share_id: shareId,
      summary: {
        total_agents: totalAgents,
        successful: Object.values(results).filter(r => r.success).length,
        failed: Object.values(results).filter(r => !r.success).length,
        total_duration_ms: Object.values(results).reduce((sum, r) => sum + r.duration, 0),
      },
      next_steps: ['✨ Share publicly', '🚀 Export & deploy', '🔄 Improve', '📈 Generate viral content'],
    });

    res.end();

  } catch (error) {
    db.prepare(`UPDATE agent_projects SET status = 'failed' WHERE id = ?`).run(projectId);
    send({ type: 'error', error: error.message });
    res.end();
  }
}));

// ─────────────────────────────────────────────
// 📋 PROJECT MANAGEMENT
// ─────────────────────────────────────────────
router.get('/projects', requireAuth, wrap(async (req, res) => {
  const projects = db.prepare(`SELECT id, share_id, name, idea, status, created_at, updated_at
                               FROM agent_projects WHERE user_id = ?
                               ORDER BY updated_at DESC`).all(req.user.id);
  res.json({ projects });
}));

router.get('/projects/:id', requireAuth, wrap(async (req, res) => {
  const project = db.prepare(`SELECT * FROM agent_projects WHERE id = ? AND user_id = ?`)
                    .get(req.params.id, req.user.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const steps = db.prepare(`SELECT * FROM agent_steps WHERE project_id = ? ORDER BY id`)
                  .all(req.params.id);
  res.json({ project, steps });
}));

router.delete('/projects/:id', requireAuth, wrap(async (req, res) => {
  db.prepare(`DELETE FROM agent_projects WHERE id = ? AND user_id = ?`)
    .run(req.params.id, req.user.id);
  res.json({ ok: true });
}));

// ─────────────────────────────────────────────
// 🔗 PUBLIC SHARE PAGE (NO AUTH)
// ─────────────────────────────────────────────
router.get('/share/:share_id', wrap(async (req, res) => {
  const project = db.prepare(`SELECT id, name, idea, status, created_at FROM agent_projects WHERE share_id = ?`)
                    .get(req.params.share_id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const steps = db.prepare(`SELECT agent_name, step_name, output, duration_ms FROM agent_steps WHERE project_id = ? AND status = 'completed'`)
                  .all(project.id);

  res.json({
    project,
    agents: steps.map(s => ({
      name: s.agent_name,
      role: s.step_name,
      output: JSON.parse(s.output || '{}'),
      duration_ms: s.duration_ms,
    })),
  });
}));

// ─────────────────────────────────────────────
// 🔄 SELF-IMPROVEMENT LOOP
// ─────────────────────────────────────────────
router.post('/improve', requireAuth, requireQuota, aiLimiter, wrap(async (req, res) => {
  const { project_id, focus_area } = req.body;
  if (!project_id) return res.status(400).json({ error: 'Missing project_id' });

  const project = db.prepare(`SELECT * FROM agent_projects WHERE id = ? AND user_id = ?`)
                    .get(project_id, req.user.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const steps = db.prepare(`SELECT agent_name, output FROM agent_steps WHERE project_id = ? AND status = 'completed'`)
                  .all(project_id);

  const context = `Project: ${project.name}\nIdea: ${project.idea}\n\nCurrent outputs:\n${steps.map(s => `${s.agent_name}: ${s.output.slice(0, 500)}`).join('\n\n')}`;

  const improvement = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2000,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Analyze startup project and suggest improvements.${focus_area ? ` Focus on: ${focus_area}` : ''}

Return JSON:
{
  "analysis": {"strengths": ["..."], "weaknesses": ["..."], "opportunities": ["..."]},
  "improvements": [{"agent": "DEV_AGENT", "area": "...", "current_state": "...", "improved_state": "...", "priority": "high"}],
  "next_iteration_prompt": "...",
  "viral_score": 0-100,
  "monetization_score": 0-100,
  "tech_quality_score": 0-100
}`,
      },
      { role: 'user', content: context },
    ],
  });

  const result = JSON.parse(improvement.choices[0]?.message?.content || '{}');
  res.json({ ok: true, ...result });
}));

// ─────────────────────────────────────────────
// 📤 EXPORT PROJECT
// ─────────────────────────────────────────────
router.get('/projects/:id/export', requireAuth, wrap(async (req, res) => {
  const project = db.prepare(`SELECT * FROM agent_projects WHERE id = ? AND user_id = ?`)
                    .get(req.params.id, req.user.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const steps = db.prepare(`SELECT * FROM agent_steps WHERE project_id = ? AND status = 'completed' ORDER BY id`)
                  .all(req.params.id);

  let markdown = `# ${project.name}\n\n**Idea:** ${project.idea}\n\n**Created:** ${project.created_at}\n\n---\n\n`;
  const files = [];

  for (const step of steps) {
    const output = JSON.parse(step.output || '{}');
    markdown += `## ${step.agent_name}\n\n**Role:** ${step.step_name}\n\n`;

    if (step.agent_name === 'Dev Agent' && output.files) {
      output.files.forEach(f => {
        files.push({ path: f.path, content: f.content, language: f.language });
      });
    }

    if (step.agent_name === 'Design Agent' && output.landing_page_html) {
      files.push({ path: 'landing.html', content: output.landing_page_html, language: 'html' });
    }

    markdown += '```json\n' + JSON.stringify(output, null, 2).slice(0, 3000) + '\n```\n\n';
  }

  res.json({ markdown, files, project: { name: project.name, share_url: `/share/${project.share_id}` } });
}));

// ─────────────────────────────────────────────
// 📊 PROJECT ANALYTICS
// ─────────────────────────────────────────────
router.post('/projects/:id/analytics', wrap(async (req, res) => {
  const { event } = req.body;
  const project = db.prepare(`SELECT id, metadata FROM agent_projects WHERE id = ?`)
                    .get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });

  const meta = JSON.parse(project.metadata || '{}');
  meta[event] = (meta[event] || 0) + 1;
  meta.last_event_at = new Date().toISOString();

  db.prepare(`UPDATE agent_projects SET metadata = ? WHERE id = ?`)
    .run(JSON.stringify(meta), req.params.id);

  res.json({ ok: true, analytics: meta });
}));

// ─────────────────────────────────────────────
// 🌟 VIRAL SOCIAL CONTENT
// ─────────────────────────────────────────────
router.post('/social-content', requireAuth, requireQuota, aiLimiter, wrap(async (req, res) => {
  const { project_id, platform } = req.body;
  if (!project_id) return res.status(400).json({ error: 'Missing project_id' });

  const project = db.prepare(`SELECT * FROM agent_projects WHERE id = ? AND user_id = ?`)
                    .get(project_id, req.user.id);
  if (!project) return res.status(404).json({ error: 'Not found' });

  const platforms = platform ? [platform] : ['twitter', 'tiktok', 'linkedin', 'producthunt', 'reddit'];

  const content = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2500,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Create viral social content. Return JSON for: ${platforms.join(', ')}.

{
  "twitter": {"hook": "...", "thread": ["tweet 1 (under 280 chars)"], "hashtags": ["..."]},
  "tiktok": {"hook": "first 3 seconds", "script": "30s script", "music": "trending sound"},
  "linkedin": {"hook": "...", "post": "long-form", "cta": "..."},
  "producthunt": {"tagline": "60 chars", "description": "260 chars", "first_comment": "founder story"},
  "reddit": {"subreddit_suggestions": ["r/..."], "title": "...", "post": "value-first"}
}`,
      },
      { role: 'user', content: `Startup: ${project.name}\nIdea: ${project.idea}` },
    ],
  });

  const result = JSON.parse(content.choices[0]?.message?.content || '{}');
  res.json({ project: project.name, content: result });
}));

// ─────────────────────────────────────────────
// 🔍 COMPETITOR ANALYSIS
// ─────────────────────────────────────────────
router.post('/competitor-analysis', requireAuth, requireQuota, aiLimiter, wrap(async (req, res) => {
  const { idea, market } = req.body;
  if (!idea) return res.status(400).json({ error: 'Missing idea' });

  const analysis = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2000,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Competitive intelligence expert. Return JSON:
{
  "market_size": "TAM/SAM",
  "direct_competitors": [{"name": "...", "strengths": ["..."], "weaknesses": ["..."], "pricing": "..."}],
  "indirect_competitors": [{"name": "...", "why": "..."}],
  "market_gaps": ["..."],
  "differentiation_opportunities": ["..."],
  "winning_strategy": "...",
  "competitive_advantage_score": 0-100
}`,
      },
      { role: 'user', content: `Idea: ${idea}${market ? `\nMarket: ${market}` : ''}` },
    ],
  });

  const result = JSON.parse(analysis.choices[0]?.message?.content || '{}');
  res.json(result);
}));

// ─────────────────────────────────────────────
// 💡 IDEA VALIDATION
// ─────────────────────────────────────────────
router.post('/validate', requireAuth, requireQuota, aiLimiter, wrap(async (req, res) => {
  const { idea } = req.body;
  if (!idea) return res.status(400).json({ error: 'Missing idea' });

  const validation = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1500,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Brutal startup validator (YC partner style). Return JSON:
{
  "overall_score": 0-100,
  "scores": {"problem_severity": 0-10, "market_size": 0-10, "monetization_potential": 0-10, "execution_difficulty": 0-10, "competitive_moat": 0-10, "timing": 0-10, "scalability": 0-10},
  "verdict": "GO/PIVOT/KILL with reasoning",
  "biggest_risks": ["..."],
  "biggest_opportunities": ["..."],
  "similar_failed_startups": [{"name": "...", "why_failed": "..."}],
  "similar_successful_startups": [{"name": "...", "why_won": "..."}],
  "recommended_pivots": ["..."],
  "first_100_users_strategy": "..."
}`,
      },
      { role: 'user', content: `Validate: ${idea}` },
    ],
  });

  const result = JSON.parse(validation.choices[0]?.message?.content || '{}');
  res.json(result);
}));

// ─────────────────────────────────────────────
// 📈 TREND DETECTION AGENT
// ─────────────────────────────────────────────
router.post('/trends', requireAuth, requireQuota, aiLimiter, wrap(async (req, res) => {
  const { industry, timeframe = '2026' } = req.body;
  if (!industry) return res.status(400).json({ error: 'Missing industry' });

  const trends = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2000,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are a trend analyst. Identify emerging trends and opportunities. Return JSON:
{
  "industry": "...",
  "timeframe": "...",
  "rising_trends": [{"trend": "...", "growth_rate": "...", "evidence": "...", "opportunity_score": 0-10}],
  "declining_trends": [{"trend": "...", "why": "..."}],
  "wild_cards": [{"trend": "...", "potential": "..."}],
  "startup_opportunities": [{"idea": "...", "market_size": "...", "difficulty": "low/medium/high", "timing": "now/6mo/1yr"}],
  "tech_to_watch": ["..."],
  "key_thesis": "...",
  "action_items": ["..."]
}`,
      },
      { role: 'user', content: `Industry: ${industry}\nTimeframe: ${timeframe}\n\nWhat are the most important trends and opportunities?` },
    ],
  });

  const result = JSON.parse(trends.choices[0]?.message?.content || '{}');
  res.json(result);
}));

// ─────────────────────────────────────────────
// 💰 REVENUE PREDICTION AGENT
// ─────────────────────────────────────────────
router.post('/revenue-prediction', requireAuth, requireQuota, aiLimiter, wrap(async (req, res) => {
  const { idea, pricing_model, target_market } = req.body;
  if (!idea) return res.status(400).json({ error: 'Missing idea' });

  const prediction = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2000,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are a startup financial analyst. Predict realistic revenue based on comparable companies. Return JSON:
{
  "pricing_recommendation": {"free": "...", "starter": "$X/mo", "pro": "$X/mo", "enterprise": "..."},
  "year_1": {"users": "...", "paying_users": "...", "mrr": "$...", "arr": "$..."},
  "year_2": {"users": "...", "paying_users": "...", "mrr": "$...", "arr": "$..."},
  "year_3": {"users": "...", "paying_users": "...", "mrr": "$...", "arr": "$..."},
  "ltv_estimate": "$...",
  "cac_estimate": "$...",
  "ltv_cac_ratio": "X:1",
  "burn_rate": "$X/mo",
  "runway_required": "$...",
  "key_metrics_to_track": ["..."],
  "comparable_companies": [{"name": "...", "their_arr": "$...", "trajectory": "..."}],
  "risks": ["..."],
  "growth_levers": ["..."],
  "realistic_scenario": {"y1_arr": "$...", "y3_arr": "$..."},
  "optimistic_scenario": {"y1_arr": "$...", "y3_arr": "$..."},
  "pessimistic_scenario": {"y1_arr": "$...", "y3_arr": "$..."}
}`,
      },
      { role: 'user', content: `Idea: ${idea}\nPricing: ${pricing_model || 'SaaS subscription'}\nMarket: ${target_market || 'B2B SaaS'}` },
    ],
  });

  const result = JSON.parse(prediction.choices[0]?.message?.content || '{}');
  res.json(result);
}));

// ─────────────────────────────────────────────
// 🤖 AUTONOMOUS MODE — AI runs by itself
// ─────────────────────────────────────────────
router.post('/autonomous', requireAuth, requireQuota, aiLimiter, wrap(async (req, res) => {
  const { goal, max_iterations = 5 } = req.body;
  if (!goal) return res.status(400).json({ error: 'Missing goal' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);

  send({ type: 'started', goal, max_iterations });

  let context = `Goal: ${goal}\n\nYou are an autonomous AI. Plan and execute steps to achieve the goal. After each action, decide the next step.`;
  let iteration = 0;
  let achieved = false;

  try {
    while (iteration < max_iterations && !achieved) {
      iteration++;

      send({ type: 'iteration', iteration, max_iterations });

      // Plan
      const planResult = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 1500,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are an autonomous agent. Decide the next action. Return JSON:
{
  "thought": "what you're thinking",
  "action": "specific action to take",
  "reasoning": "why this action",
  "expected_outcome": "what should happen",
  "achieved_goal": false/true,
  "next_step_hint": "..."
}`,
          },
          { role: 'user', content: context },
        ],
      });

      const plan = JSON.parse(planResult.choices[0]?.message?.content || '{}');

      send({
        type: 'thinking',
        iteration,
        thought: plan.thought,
        action: plan.action,
        reasoning: plan.reasoning,
      });

      // Execute (simulated — generate the result)
      const execResult = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 2000,
        messages: [
          {
            role: 'system',
            content: `Execute this action and return the result. Be specific and detailed.`,
          },
          {
            role: 'user',
            content: `Goal: ${goal}\n\nAction: ${plan.action}\n\nExecute and provide the result:`,
          },
        ],
      });

      const result = execResult.choices[0]?.message?.content || '';

      send({
        type: 'executed',
        iteration,
        action: plan.action,
        result: result.slice(0, 1500),
      });

      // Update context
      context += `\n\nIteration ${iteration}:\nAction: ${plan.action}\nResult: ${result.slice(0, 500)}`;

      if (plan.achieved_goal) {
        achieved = true;
        send({
          type: 'goal_achieved',
          iteration,
          summary: `Goal achieved in ${iteration} iterations`,
        });
      }
    }

    if (!achieved) {
      send({
        type: 'max_iterations_reached',
        iteration,
        message: 'Reached maximum iterations. Continue manually if needed.',
      });
    }

    send({ type: 'complete', total_iterations: iteration, achieved });
    res.end();

  } catch (e) {
    send({ type: 'error', error: e.message });
    res.end();
  }
}));

return router;
};