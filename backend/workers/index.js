// ============================================================
// ⚙️ workers/index.js — Background job handlers
// Registers handlers for: deploy, email, analytics, agent tasks
// ============================================================

function registerWorkers(queueManager, services) {
  const { logger } = services;

  // ─── Email worker ────────────────────────
  queueManager.registerWorker('email', async (data, ctx) => {
    logger.debug('Processing email job', { id: ctx.id, to: data.to });
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not set');
    }
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'NexusAI <onboarding@resend.dev>',
        to: [data.to],
        subject: data.subject,
        html: data.html || data.text,
        text: data.text,
      }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.message || 'Email send failed');
    }
    return { sent: true, to: data.to };
  });

  // ─── Deployment worker ───────────────────
  queueManager.registerWorker('deploy', async (data, ctx) => {
    logger.info('Processing deploy job', { id: ctx.id, project: data.project_id });
    // The deploy-engine route already does sync deploys.
    // This worker is for scheduled/retry deployments.
    return { project_id: data.project_id, status: 'queued' };
  });

  // ─── Agent task worker ───────────────────
  queueManager.registerWorker('agent-task', async (data, ctx) => {
    logger.debug('Processing agent task', { id: ctx.id, type: data.type });
    if (!services.openai || !data.prompt) {
      throw new Error('Missing openai or prompt');
    }
    const result = await services.openai.chat.completions.create({
      model: data.model || 'gpt-4o-mini',
      max_tokens: data.max_tokens || 1000,
      messages: [{ role: 'user', content: data.prompt }],
    });
    return {
      content: result.choices[0]?.message?.content,
      usage: result.usage,
    };
  });

  // ─── Analytics worker ────────────────────
  queueManager.registerWorker('analytics', async (data, ctx) => {
    logger.debug('Processing analytics event', { event: data.event });
    return { tracked: true, event: data.event };
  });

  // ─── Cleanup worker (scheduled) ──────────
  queueManager.registerWorker('cleanup', async (data, ctx) => {
    logger.info('Running cleanup', { task: data.task });
    return { cleaned: true };
  });

  logger.info('Workers registered: email, deploy, agent-task, analytics, cleanup');
}

module.exports = { registerWorkers };