// ============================================================
// 🔧 routes/admin.js — Production Admin & Security Dashboard
// Backup · Cost · Audit · Protection · Health · Anomalies
// ============================================================
const express = require('express');

module.exports = (db, services, requireAuth, wrap) => {
const router = express.Router();
const { backup, cost, audit, protection, healthMonitor, AUDIT_ACTIONS } = services;

// ─── Admin guard: only specific user IDs ─────
function requireAdmin(req, res, next) {
  const adminEmails = (process.env.ADMIN_EMAILS || 'haroun.ghorbel@gmail.com,harounghorbel14-star@gmail.com').split(',').map(s => s.trim().toLowerCase());
  const email = String(req.user?.email || '').toLowerCase();
  if (!adminEmails.includes(email)) {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}

// ═══════════════════════════════════════════════════
// 💾 BACKUP ENDPOINTS
// ═══════════════════════════════════════════════════
router.get('/backups', requireAuth, requireAdmin, wrap(async (req, res) => {
  res.json({ backups: backup.list(), stats: backup.stats() });
}));

router.post('/backups/create', requireAuth, requireAdmin, wrap(async (req, res) => {
  const result = backup.createBackup(req.body.label || 'manual');
  audit?.log({
    user_id: req.user.id, action: AUDIT_ACTIONS.ADMIN_ACTION,
    resource: 'backup', metadata: { label: req.body.label }, severity: 'info',
    ip: req.ip, user_agent: req.headers['user-agent'],
  });
  res.json(result);
}));

router.post('/backups/verify/:filename', requireAuth, requireAdmin, wrap(async (req, res) => {
  res.json(backup.verify(req.params.filename));
}));

router.delete('/backups/:filename', requireAuth, requireAdmin, wrap(async (req, res) => {
  const result = backup.delete(req.params.filename);
  audit?.log({
    user_id: req.user.id, action: AUDIT_ACTIONS.ADMIN_ACTION,
    resource: 'backup_delete', resource_id: req.params.filename,
    severity: 'warning', ip: req.ip,
  });
  res.json(result);
}));

// ═══════════════════════════════════════════════════
// 💰 COST ENDPOINTS
// ═══════════════════════════════════════════════════
router.get('/cost/system', requireAuth, requireAdmin, wrap(async (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 30, 90);
  res.json(cost.systemStats(days));
}));

router.get('/cost/top-users', requireAuth, requireAdmin, wrap(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const days = Math.min(parseInt(req.query.days) || 30, 90);
  res.json({ users: cost.topUsers(limit, days) });
}));

// User can see their own
router.get('/cost/my-usage', requireAuth, wrap(async (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 30, 90);
  res.json(cost.userCostStats(req.user.id, days));
}));

router.get('/cost/budget', requireAuth, wrap(async (req, res) => {
  const tier = req.user?.subscription_tier || 'free';
  res.json(cost.checkBudget(req.user.id, tier));
}));

// ═══════════════════════════════════════════════════
// 🛡️ AUDIT LOG ENDPOINTS
// ═══════════════════════════════════════════════════
router.get('/audit/log', requireAuth, requireAdmin, wrap(async (req, res) => {
  const { action, severity, limit } = req.query;
  const since = req.query.days ? Date.now() - parseInt(req.query.days) * 86400000 : null;
  res.json({ entries: audit.query({ action, severity, since, limit: parseInt(limit) || 100 }) });
}));

router.get('/audit/suspicious', requireAuth, requireAdmin, wrap(async (req, res) => {
  res.json({ entries: audit.recentSuspicious(parseInt(req.query.limit) || 50) });
}));

router.get('/audit/stats', requireAuth, requireAdmin, wrap(async (req, res) => {
  res.json(audit.stats(parseInt(req.query.days) || 7));
}));

router.get('/audit/my-activity', requireAuth, wrap(async (req, res) => {
  res.json(audit.userActivity(req.user.id, parseInt(req.query.days) || 7));
}));

// ═══════════════════════════════════════════════════
// 🚨 SECURITY / PROTECTION ENDPOINTS
// ═══════════════════════════════════════════════════
router.get('/security/blocked', requireAuth, requireAdmin, wrap(async (req, res) => {
  res.json({ blocked: protection.listBlocked() });
}));

router.post('/security/block', requireAuth, requireAdmin, wrap(async (req, res) => {
  const { identifier, reason, duration_ms } = req.body;
  if (!identifier) return res.status(400).json({ error: 'Missing identifier' });
  protection.block(identifier, reason || 'manual', duration_ms || 3600000);
  audit?.log({
    user_id: req.user.id, action: AUDIT_ACTIONS.ADMIN_ACTION,
    resource: 'security_block', resource_id: identifier,
    metadata: { reason, duration_ms }, severity: 'warning', ip: req.ip,
  });
  res.json({ ok: true });
}));

router.post('/security/unblock', requireAuth, requireAdmin, wrap(async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) return res.status(400).json({ error: 'Missing identifier' });
  protection.unblock(identifier);
  audit?.log({
    user_id: req.user.id, action: AUDIT_ACTIONS.ADMIN_ACTION,
    resource: 'security_unblock', resource_id: identifier,
    severity: 'info', ip: req.ip,
  });
  res.json({ ok: true });
}));

router.get('/security/anomalies', requireAuth, requireAdmin, wrap(async (req, res) => {
  res.json({ anomalies: protection.recentAnomalies(parseInt(req.query.limit) || 50) });
}));

// ═══════════════════════════════════════════════════
// 🩺 HEALTH MONITOR ENDPOINTS
// ═══════════════════════════════════════════════════
router.get('/health/status', requireAuth, wrap(async (req, res) => {
  res.json(healthMonitor.getStatus());
}));

router.get('/health/alerts', requireAuth, requireAdmin, wrap(async (req, res) => {
  res.json({ alerts: healthMonitor.recentAlerts(parseInt(req.query.limit) || 20) });
}));

router.post('/health/check', requireAuth, requireAdmin, wrap(async (req, res) => {
  res.json(await healthMonitor.check());
}));

// ═══════════════════════════════════════════════════
// 📊 UNIFIED ADMIN OVERVIEW
// ═══════════════════════════════════════════════════
router.get('/overview', requireAuth, requireAdmin, wrap(async (req, res) => {
  res.json({
    health: healthMonitor.getStatus(),
    backups: backup.stats(),
    costs_30d: cost.systemStats(30),
    audit_7d: audit.stats(7),
    blocked: protection.listBlocked().length,
    anomalies_recent: protection.recentAnomalies(5),
  });
}));

return router;
};