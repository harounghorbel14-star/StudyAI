// ============================================================
// 👤 security/guest.js — Isolated, limited guest sessions
//
// "Continue as Guest" creates a real account row with a random,
// unusable password and a server-generated address under the reserved
// .invalid TLD. Nobody can log into it, sign up as it, or reset it,
// and it never matches ADMIN_EMAILS / VIP_EMAILS.
//
// Guest status is read from the database on every request (see
// security/sessions.js), never from a client flag or token claim, so
// editing localStorage or a JWT cannot lift the limits.
//
// Guests may only reach the routes allow-listed below. Everything else
// (billing, API keys, admin, workspaces, secrets, deploy, files,
// webhooks, account management) is refused by the backend.
// ============================================================
const crypto = require('crypto');

const GUEST_DOMAIN = 'guest.nexusai.invalid';

const GUEST_TTL_HOURS = () => Number(process.env.GUEST_TTL_HOURS || 24);
const GUEST_DAILY_REQUESTS = () => Number(process.env.GUEST_DAILY_REQUESTS || 5);

// [method, exact path or RegExp]. Paths are matched against
// req.originalUrl without its query string.
const GUEST_ALLOWED = [
  ['GET', '/api/me'],
  ['POST', '/api/logout'],
  ['GET', '/api/history'],
  ['GET', '/api/sessions'],
  ['GET', '/api/usage/stats'],
  ['POST', '/api/chat'],
  ['POST', '/api/chat/stream'],
  ['POST', '/api/tool'],
  ['GET', '/api/agent/runs'],
  ['POST', '/api/agent/runs'],
  ['GET', /^\/api\/agent\/runs\/[\w-]+$/],
  ['GET', /^\/api\/agent\/runs\/[\w-]+\/events$/],
  ['POST', /^\/api\/agent\/runs\/[\w-]+\/cancel$/],
];

function isGuestAllowed(method, url) {
  const pathOnly = String(url || '').split('?')[0].replace(/\/+$/, '') || '/';
  return GUEST_ALLOWED.some(([m, p]) =>
    m === method && (typeof p === 'string' ? p === pathOnly : p.test(pathOnly)));
}

function isGuestEmail(email) {
  return String(email || '').toLowerCase().endsWith(`@${GUEST_DOMAIN}`);
}

/**
 * Create a guest users row. Returns the row (with token_version etc).
 */
async function createGuest(db, bcrypt, { now = Date.now } = {}) {
  const handle = crypto.randomBytes(9).toString('hex');
  const email = `guest-${handle}@${GUEST_DOMAIN}`;
  // Unusable password: a hash of random bytes that are then discarded.
  const password = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 4);
  const expiresAt = now() + GUEST_TTL_HOURS() * 3_600_000;
  const id = db.prepare(
    `INSERT INTO users (email, password, plan, is_guest, guest_expires_at) VALUES (?, ?, 'guest', 1, ?)`,
  ).run(email, password, expiresAt).lastInsertRowid;
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

module.exports = {
  GUEST_DOMAIN, GUEST_ALLOWED, GUEST_TTL_HOURS, GUEST_DAILY_REQUESTS,
  isGuestAllowed, isGuestEmail, createGuest,
};
