// ============================================================
// 💰 STRIPE PAYMENTS + 6 NEW AGENTS
// routes/payments-and-agents.js
// ============================================================
const express = require('express');
const router = express.Router();

module.exports = (db, openai, requireAuth, requireQuota, aiLimiter, wrap, chatComplete) => {

// ─────────────────────────────────────────────
// 💳 STRIPE PAYMENTS
// ─────────────────────────────────────────────
const Stripe = require('stripe');
const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;

const PRICE_IDS = {
  pro: process.env.STRIPE_PRICE_PRO || 'price_pro_placeholder',
  elite: process.env.STRIPE_PRICE_ELITE || 'price_elite_placeholder',
};

const PLANS = {
  free: { name: 'Free', price: 0, requests: 10, features: ['10 req/day', 'Basic tools'] },
  pro: { name: 'Pro', price: 19, requests: 500, features: ['500 req/day', 'All tools', 'Priority support', 'API access'] },
  elite: { name: 'Elite', price: 49, requests: -1, features: ['Unlimited', 'All tools', 'Multi-Agent System', '24/7 support', 'Custom AI', 'Auto-deploy'] },
};

db.prepare(`CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  current_period_end TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id)
)`).run();

// Get plans
router.get('/plans', wrap(async (req, res) => {
  res.json({ plans: PLANS });
}));

// Create Stripe checkout session
router.post('/checkout', requireAuth, wrap(async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured. Set STRIPE_SECRET_KEY.' });
  const { plan = 'pro' } = req.body;
  if (!['pro', 'elite'].includes(plan)) return res.status(400).json({ error: 'Invalid plan' });

  try {
    const sub = db.prepare(`SELECT * FROM subscriptions WHERE user_id = ?`).get(req.user.id);
    let customerId = sub?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        metadata: { user_id: String(req.user.id) },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.APP_URL || 'http://localhost:3000'}/?upgrade=success`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/?upgrade=cancel`,
      metadata: { user_id: String(req.user.id), plan },
    });

    res.json({ checkout_url: session.url, session_id: session.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}));

// Stripe webhook
router.post('/webhook', express.raw({ type: 'application/json' }), wrap(async (req, res) => {
  if (!stripe) return res.status(503).send('Stripe not configured');
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = parseInt(session.metadata.user_id);
      const plan = session.metadata.plan;
      db.prepare(`INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, plan, status)
                  VALUES (?, ?, ?, ?, 'active')
                  ON CONFLICT(user_id) DO UPDATE SET
                  stripe_customer_id=excluded.stripe_customer_id,
                  stripe_subscription_id=excluded.stripe_subscription_id,
                  plan=excluded.plan, status='active', updated_at=datetime('now')`).run(
        userId, session.customer, session.subscription, plan
      );
      db.prepare(`UPDATE users SET plan = ? WHERE id = ?`).run(plan, userId);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const userId = parseInt(sub.metadata?.user_id || 0);
      if (userId) {
        db.prepare(`UPDATE subscriptions SET status='cancelled' WHERE user_id=?`).run(userId);
        db.prepare(`UPDATE users SET plan='free' WHERE id=?`).run(userId);
      }
      break;
    }
  }

  res.json({ received: true });
}));

// Get current subscription
router.get('/subscription', requireAuth, wrap(async (req, res) => {
  const sub = db.prepare(`SELECT * FROM subscriptions WHERE user_id=?`).get(req.user.id);
  const user = db.prepare(`SELECT plan FROM users WHERE id=?`).get(req.user.id);
  res.json({
    subscription: sub,
    current_plan: user?.plan || 'free',
    plan_details: PLANS[user?.plan || 'free'],
  });
}));

// Cancel subscription
router.post('/cancel', requireAuth, wrap(async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
  const sub = db.prepare(`SELECT stripe_subscription_id FROM subscriptions WHERE user_id=?`).get(req.user.id);
  if (!sub?.stripe_subscription_id) return res.status(404).json({ error: 'No active subscription' });
  try {
    await stripe.subscriptions.cancel(sub.stripe_subscription_id);
    db.prepare(`UPDATE subscriptions SET status='cancelled' WHERE user_id=?`).run(req.user.id);
    db.prepare(`UPDATE users SET plan='free' WHERE id=?`).run(req.user.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}));

// ─────────────────────────────────────────────
// 🤖 6 NEW AGENTS
// ─────────────────────────────────────────────

// QA Agent — Quality assurance
router.post('/qa-agent', requireAuth, requireQuota, aiLimiter, wrap(async (req, res) => {
  const { project_id, code, output } = req.body;
  if (!code && !output && !project_id) return res.status(400).json({ error: 'Provide code, output, or project_id' });

  let target = code || output;
  if (project_id) {
    const steps = db.prepare(`SELECT output FROM agent_steps WHERE project_id=? AND status='completed'`).all(project_id);
    target = steps.map(s => s.output).join('\n\n').slice(0, 8000);
  }

  const result = await openai.chat.completions.create({
    model: 'gpt-4o', max_tokens: 1500,
    response_format: { type: 'json_object' },
    messages: [{
      role: 'system',
      content: `You are a QA Agent — find bugs, issues, edge cases, and quality problems. Return JSON:
{
  "quality_score": 0-100,
  "verdict": "PASS/NEEDS_WORK/FAIL",
  "critical_issues": [{"severity": "high", "issue": "...", "fix": "..."}],
  "edge_cases_missed": ["..."],
  "code_smells": ["..."],
  "best_practices_violations": ["..."],
  "test_recommendations": ["..."],
  "production_readiness": 0-100
}`,
    }, { role: 'user', content: target }],
  });
  res.json(JSON.parse(result.choices[0]?.message?.content || '{}'));
}));

// Security Agent
router.post('/security-agent', requireAuth, requireQuota, aiLimiter, wrap(async (req, res) => {
  const { code, project_id } = req.body;
  let target = code;
  if (project_id) {
    const steps = db.prepare(`SELECT output FROM agent_steps WHERE project_id=? AND agent_name='Dev Agent'`).all(project_id);
    target = steps.map(s => s.output).join('\n').slice(0, 8000);
  }
  if (!target) return res.status(400).json({ error: 'Provide code or project_id' });

  const result = await openai.chat.completions.create({
    model: 'gpt-4o', max_tokens: 1500,
    response_format: { type: 'json_object' },
    messages: [{
      role: 'system',
      content: `Security Agent — scan for vulnerabilities. Return JSON:
{
  "security_score": 0-100,
  "owasp_issues": [{"category": "A01:2021 – Broken Access Control", "found": true, "details": "..."}],
  "critical_vulnerabilities": [{"type": "XSS/SQLi/CSRF/etc", "location": "...", "impact": "...", "fix": "..."}],
  "data_exposure_risks": ["..."],
  "auth_issues": ["..."],
  "dependency_risks": ["..."],
  "recommended_security_headers": ["..."],
  "compliance_gaps": ["GDPR", "HIPAA", "SOC2"],
  "production_safe": true/false
}`,
    }, { role: 'user', content: target }],
  });
  res.json(JSON.parse(result.choices[0]?.message?.content || '{}'));
}));

// Growth Agent
router.post('/growth-agent', requireAuth, requireQuota, aiLimiter, wrap(async (req, res) => {
  const { idea, current_users, current_mrr } = req.body;
  if (!idea) return res.status(400).json({ error: 'Missing idea' });

  const result = await openai.chat.completions.create({
    model: 'gpt-4o', max_tokens: 2000,
    response_format: { type: 'json_object' },
    messages: [{
      role: 'system',
      content: `Growth Agent — design viral growth strategies. Return JSON:
{
  "growth_score": 0-100,
  "viral_potential": "high/medium/low",
  "north_star_metric": "...",
  "growth_loops": [{"name": "...", "mechanism": "...", "expected_k_factor": 1.X}],
  "acquisition_channels": [{"channel": "...", "tactics": ["..."], "estimated_cac": "$X", "expected_ltv": "$X"}],
  "activation_tactics": ["..."],
  "retention_strategies": ["..."],
  "referral_program": {"reward": "...", "incentive": "...", "viral_coefficient": "..."},
  "content_strategy": {"types": ["..."], "frequency": "...", "platforms": ["..."]},
  "partnerships": ["..."],
  "weekly_growth_target": "X%",
  "30_day_action_plan": ["..."]
}`,
    }, { role: 'user', content: `Idea: ${idea}\n${current_users ? `Current users: ${current_users}` : ''}\n${current_mrr ? `Current MRR: ${current_mrr}` : ''}` }],
  });
  res.json(JSON.parse(result.choices[0]?.message?.content || '{}'));
}));

// Analytics Agent
router.post('/analytics-agent', requireAuth, requireQuota, aiLimiter, wrap(async (req, res) => {
  const { idea, business_model } = req.body;
  if (!idea) return res.status(400).json({ error: 'Missing idea' });

  const result = await openai.chat.completions.create({
    model: 'gpt-4o', max_tokens: 1500,
    response_format: { type: 'json_object' },
    messages: [{
      role: 'system',
      content: `Analytics Agent — define what to measure. Return JSON:
{
  "key_metrics": [{"metric": "...", "why_important": "...", "target": "...", "measurement_method": "..."}],
  "north_star": "...",
  "leading_indicators": ["..."],
  "lagging_indicators": ["..."],
  "user_journey_metrics": [{"stage": "acquisition", "metric": "..."}],
  "conversion_funnel": [{"step": "...", "expected_conversion": "X%"}],
  "cohort_analysis_plan": "...",
  "tools_recommended": ["Mixpanel", "Amplitude", "PostHog"],
  "dashboard_widgets": ["..."],
  "experiments_to_run": [{"hypothesis": "...", "metric": "...", "duration": "..."}]
}`,
    }, { role: 'user', content: `Idea: ${idea}\nBusiness model: ${business_model || 'SaaS'}` }],
  });
  res.json(JSON.parse(result.choices[0]?.message?.content || '{}'));
}));

return router;
};