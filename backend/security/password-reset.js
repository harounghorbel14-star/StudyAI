// ============================================================
// 🔁 security/password-reset.js — Forgot / reset password
//
//   • Tokens are 32 random bytes, sent only inside the emailed link.
//     The database stores their SHA-256, so a leaked table cannot be
//     replayed.
//   • Single use: consuming a token is a conditional UPDATE, so two
//     concurrent submissions cannot both succeed.
//   • Expiry: RESET_TTL_MINUTES (default 30).
//   • A successful reset re-hashes the password, invalidates every
//     other outstanding token for the account and ends every existing
//     session (token_version + 1).
//   • request() never reports whether the email belongs to an
//     account; callers return the same neutral response either way.
//   • Tokens are never logged or returned by any HTTP endpoint.
// ============================================================
const crypto = require('crypto');

const PASSWORD_MIN = 8;
// bcrypt only reads the first 72 bytes; a hard cap also stops
// multi-megabyte "passwords" from tying up the hashing pool.
const PASSWORD_MAX = 128;
const MAX_REQUESTS_PER_HOUR = 3;

const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN) {
    return `Password must be at least ${PASSWORD_MIN} characters.`;
  }
  if (password.length > PASSWORD_MAX) {
    return `Password must be at most ${PASSWORD_MAX} characters.`;
  }
  return null;
}

class PasswordResetService {
  constructor({ db, bcrypt, rounds = 12, sessions, mailer, logger, appUrl, ttlMinutes, now }) {
    this.db = db;
    this.bcrypt = bcrypt;
    this.rounds = rounds;
    this.sessions = sessions;
    this.mailer = mailer;
    this.logger = logger;
    this.appUrl = String(appUrl || '').replace(/\/+$/, '');
    this.ttlMs = Number(ttlMinutes || process.env.RESET_TTL_MINUTES || 30) * 60_000;
    this.now = now || Date.now;
    this.db.prepare(`CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      used_at INTEGER,
      created_at INTEGER NOT NULL
    )`).run();
    this.db.prepare('CREATE INDEX IF NOT EXISTS idx_pwreset_user ON password_resets(user_id, created_at)').run();
  }

  /**
   * Start a reset. Returns internal details for the caller to log in
   * aggregate; the HTTP layer must respond identically regardless.
   * The raw token is returned only to in-process callers (tests).
   */
  async request(email) {
    const normalized = String(email || '').trim().toLowerCase();
    const user = this.db.prepare('SELECT id, email, is_guest FROM users WHERE email = ?').get(normalized);
    if (!user || user.is_guest) return { status: 'no_account' };

    const now = this.now();
    const recent = this.db.prepare(
      'SELECT COUNT(*) AS c FROM password_resets WHERE user_id = ? AND created_at > ?',
    ).get(user.id, now - 3_600_000).c;
    if (recent >= MAX_REQUESTS_PER_HOUR) return { status: 'throttled' };

    const token = crypto.randomBytes(32).toString('base64url');
    // Only the newest link works.
    this.db.prepare('UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL')
      .run(now, user.id);
    this.db.prepare(
      'INSERT INTO password_resets (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)',
    ).run(user.id, sha256(token), now + this.ttlMs, now);

    const link = `${this.appUrl}/?reset=${encodeURIComponent(token)}`;
    const minutes = Math.round(this.ttlMs / 60_000);
    let delivery;
    try {
      delivery = await this.mailer.send({
        to: user.email,
        subject: 'Reset your NexusAI password',
        text: `Someone asked to reset the password for this NexusAI account.\n\n`
          + `Open this link within ${minutes} minutes to choose a new password:\n${link}\n\n`
          + `If you did not ask for this, ignore this email; your password will not change.`,
        html: `<p>Someone asked to reset the password for this NexusAI account.</p>`
          + `<p><a href="${link}">Choose a new password</a> (valid for ${minutes} minutes).</p>`
          + `<p>If you did not ask for this, ignore this email; your password will not change.</p>`,
      });
    } catch (err) {
      this.logger?.error?.('Password reset email failed', { user_id: user.id, error: err.message });
      delivery = { delivered: false, reason: 'SEND_FAILED' };
    }
    if (!delivery.delivered) {
      this.logger?.warn?.('Password reset requested but email was not delivered', {
        user_id: user.id, reason: delivery.reason,
      });
    }
    return { status: delivery.delivered ? 'sent' : 'not_delivered', reason: delivery.reason, token };
  }

  /** @returns {Promise<{ ok: true, userId: number } | { ok: false, error: string }>} */
  async reset(token, newPassword) {
    const pwErr = validatePassword(newPassword);
    if (pwErr) return { ok: false, error: pwErr };
    if (typeof token !== 'string' || token.length < 20 || token.length > 200) {
      return { ok: false, error: 'This reset link is invalid or has expired.' };
    }
    const hash = sha256(token);
    const now = this.now();
    const row = this.db.prepare(
      'SELECT id, user_id FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?',
    ).get(hash, now);
    if (!row) return { ok: false, error: 'This reset link is invalid or has expired.' };

    const hashed = await this.bcrypt.hash(newPassword, this.rounds);
    const applied = this.db.transaction(() => {
      // Claim the token; a concurrent request that got here first wins.
      const claim = this.db.prepare(
        'UPDATE password_resets SET used_at = ? WHERE id = ? AND used_at IS NULL AND expires_at > ?',
      ).run(now, row.id, now);
      if (claim.changes !== 1) return false;
      this.db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, row.user_id);
      this.db.prepare('UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL')
        .run(now, row.user_id);
      this.sessions.revokeAll(row.user_id);
      return true;
    })();
    if (!applied) return { ok: false, error: 'This reset link is invalid or has expired.' };
    return { ok: true, userId: row.user_id };
  }
}

module.exports = { PasswordResetService, validatePassword, PASSWORD_MIN, PASSWORD_MAX };
