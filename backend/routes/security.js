// ============================================================
// 🔐 routes/security.js — Admin Security & Hardening Endpoints
// Audit log · Threat monitor · RBAC · Backups · Cost · Health
// All admin-only via RBAC.
// ============================================================
const express = require('express');

module.exports = (db, services, requireAuth, wrap) => {
const router = express.Router();
const { audit, rbac, protection, backup, cost, healthMonitor, breakers, metrics, events } = services;

const requireAdmin = rbac.require(services.PERMISSIONS?.ADMIN_VIEW_USERS || 'admin.users.view');

// ─── Audit log ───────────────────────────────
router.get('/audit', requireAuth, requireAdmin, wrap(async (req, res) => {
  const { event_type, severity, user_id, since, limit } = req.query;
  const events = audit.query({
    event_type,
    severity,
    user_id: user_id ? Number(user_id) : undefined,
    since: since ? Number(since) : undefined,
    limit: Math.min(Number(limit) || 100, 500),
  });
  res.json({ events, count: events.length });
}));

router.get('/audit/stats', requireAuth, requireAdmin, wrap(async (req, res) => {
  const since = req.query.since ? Number(req.query.since) : null;
  res.json(audit.stats(since));
}));

router.get('/audit/verify', requireAuth, requireAdmin, wrap(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 1000, 5000);
  const result = audit.verifyIntegrity?.(limit) || { ok: true, note: 'verifyIntegrity not implemented' };
  res.json(result);
}));

// ─── My audit log (user can see their own) ──
router.get('/audit/me', requireAuth, wrap(async (req, res) => {
  const events = audit.query({ user_id: req.user.id, limit: 100 });
  res.json({ events });
}));

// ─── Threat protection ──────────────────────
router.get('/threats/stats', requireAuth, requireAdmin, wrap(async (req, res) => {
  const stats = protection.stats?.() || protection.getStats?.() || {};
  res.json(stats);
}));

router.post('/threats/block-ip', requireAuth, requireAdmin, wrap(async (req, res) => {
  const { ip, reason } = req.body;
  if (!ip) return res.status(400).json({ error: 'Missing ip' });
  if (protection.blockIp) protection.blockIp(ip, reason || 'admin_action');
  audit.log({
    user_id: req.user.id,
    event_type: 'admin.action',
    severity: 'warn',
    ip: req.ip,
    action: 'block_ip',
    metadata: { target_ip: ip, reason },
  });
  res.json({ ok: true });
}));

router.post('/threats/unblock-ip', requireAuth, requireAdmin, wrap(async (req, res) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: 'Missing ip' });
  if (protection.unblockIp) protection.unblockIp(ip);
  audit.log({
    user_id: req.user.id,
    event_type: 'admin.action',
    severity: 'info',
    action: 'unblock_ip',
    metadata: { target_ip: ip },
  });
  res.json({ ok: true });
}));

// ─── RBAC ───────────────────────────────────
router.get('/rbac/me', requireAuth, wrap(async (req, res) => {
  res.json({
    role: rbac.getRole(req.user),
    permissions: rbac.getPermissions(req.user),
  });
}));

router.get('/rbac/roles', requireAuth, requireAdmin, wrap(async (req, res) => {
  res.json({
    roles: services.ROLES,
    permissions: services.PERMISSIONS,
  });
}));

// ─── Backups ────────────────────────────────
router.get('/backups', requireAuth, requireAdmin, wrap(async (req, res) => {
  const list = backup.list?.() || [];
  res.json({ backups: list });
}));

router.post('/backups/create', requireAuth, requireAdmin, wrap(async (req, res) => {
  const result = await backup.createBackup?.();
  audit.log({
    user_id: req.user.id,
    event_type: 'admin.action',
    severity: 'info',
    action: 'manual_backup',
    metadata: { result: result?.path },
  });
  res.json(result || { error: 'Backup not configured' });
}));

router.post('/backups/restore', requireAuth, requireAdmin, wrap(async (req, res) => {
  const { backup_path } = req.body;
  if (!backup_path) return res.status(400).json({ error: 'Missing backup_path' });
  audit.log({
    user_id: req.user.id,
    event_type: 'admin.action',
    severity: 'critical',
    action: 'restore_backup',
    metadata: { backup_path },
  });
  const result = await backup.restore?.(backup_path);
  res.json(result || { error: 'Restore not configured' });
}));

// ─── Cost analytics ─────────────────────────
router.get('/cost/summary', requireAuth, requireAdmin, wrap(async (req, res) => {
  const summary = cost.summary?.() || {};
  res.json(summary);
}));

router.get('/cost/me', requireAuth, wrap(async (req, res) => {
  const usage = cost.userUsage?.(req.user.id) || {};
  res.json(usage);
}));

router.get('/cost/by-provider', requireAuth, requireAdmin, wrap(async (req, res) => {
  const data = cost.byProvider?.() || [];
  res.json({ providers: data });
}));

// ─── Health monitor ─────────────────────────
router.get('/health/full', requireAuth, requireAdmin, wrap(async (req, res) => {
  const report = healthMonitor.lastReport || {};
  const breakerStats = breakers.stats();
  const metricsSnap = metrics.snapshot();

  res.json({
    health: report,
    breakers: breakerStats,
    metrics: {
      counters: Object.entries(metricsSnap.counters).slice(0, 20),
      histograms_p95: Object.fromEntries(
        Object.entries(metricsSnap.histograms || {}).map(([k, v]) => [k, v.p95])
      ),
    },
    events_buffer: events.stats?.() || {},
  });
}));

router.post('/health/check', requireAuth, requireAdmin, wrap(async (req, res) => {
  const report = await healthMonitor.runChecks?.();
  res.json(report || { error: 'Health monitor not configured' });
}));

return router;
};