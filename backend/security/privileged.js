// ============================================================
// 👑 security/privileged.js — Admin & VIP identity, one source
//
// Admin and VIP access is granted by account email. Several modules
// used to carry their own hard-coded lists, and they disagreed: one
// fell back to an address nobody owns, so whoever registered it first
// would have become an admin. Every check now reads from here.
//
// Configure with comma-separated env vars:
//   ADMIN_EMAILS — full admin access (admin dashboards, backups, users)
//   VIP_EMAILS   — free elite plan; defaults to ADMIN_EMAILS
//
// Signup does not verify email ownership, so an address listed here
// must already be registered by its real owner. An unregistered
// privileged address is an open admin account for whoever claims it.
// ============================================================

// Owner accounts used before these lists became configurable. Kept as
// the default so existing deployments keep working; ADMIN_EMAILS
// replaces it entirely when set.
const DEFAULT_ADMIN_EMAILS = [
  'haroun.ghorbel@gmail.com',
  'harounghorbel14@gmail.com',
  'ghorbelharoun16@gmail.com',
];

function parseList(raw) {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function adminEmails(env = process.env) {
  return env.ADMIN_EMAILS !== undefined ? parseList(env.ADMIN_EMAILS) : DEFAULT_ADMIN_EMAILS.slice();
}

function vipEmails(env = process.env) {
  return env.VIP_EMAILS !== undefined ? parseList(env.VIP_EMAILS) : adminEmails(env);
}

const normalize = (email) => String(email || '').trim().toLowerCase();

function isAdminEmail(email, env = process.env) {
  const e = normalize(email);
  return !!e && adminEmails(env).includes(e);
}

function isVipEmail(email, env = process.env) {
  const e = normalize(email);
  return !!e && vipEmails(env).includes(e);
}

module.exports = { adminEmails, vipEmails, isAdminEmail, isVipEmail, DEFAULT_ADMIN_EMAILS };
