// ============================================================
// 🔑 security/sessions.js — JWT sessions checked against the database
//
// A bare jwt.verify() trusts every claim until the token expires, so
// logout could not end a session, a password reset could not revoke a
// stolen token, and a deleted account kept working for 24 hours.
// Every authenticated request now also checks:
//
//   • the account still exists (identity is read from the DB row, not
//     from the token's email/plan claims, which may be stale);
//   • the token's version matches users.token_version — a password
//     reset increments it, ending every existing session;
//   • the token's id (jti) has not been revoked by logout;
//   • guest sessions have not passed their expiry.
//
// Tokens minted before this change carry no `tv` claim; they are
// treated as version 0 so existing sessions survive the deploy.
// ============================================================
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const DEFAULT_TTL = '24h';

class AuthError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.status = 401;
  }
}

class SessionService {
  /**
   * @param {import('better-sqlite3').Database} db
   * @param {{ secret: string, ttl?: string, now?: () => number }} options
   */
  constructor(db, options) {
    if (!options?.secret) throw new Error('SessionService requires a secret');
    this.db = db;
    this.secret = options.secret;
    this.ttl = options.ttl || DEFAULT_TTL;
    this.now = options.now || Date.now;
    this.initSchema();
  }

  initSchema() {
    for (const ddl of [
      'ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE users ADD COLUMN is_guest INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE users ADD COLUMN guest_expires_at INTEGER',
    ]) {
      try { this.db.prepare(ddl).run(); } catch (e) {
        if (!/duplicate column/i.test(e.message)) throw e;
      }
    }
    this.db.prepare(`CREATE TABLE IF NOT EXISTS revoked_tokens (
      jti TEXT PRIMARY KEY,
      expires_at INTEGER NOT NULL
    )`).run();
    this.db.prepare('CREATE INDEX IF NOT EXISTS idx_users_guest_exp ON users(is_guest, guest_expires_at)').run();
  }

  /** Mint a session token for a users row. */
  issue(user, { ttl } = {}) {
    const jti = crypto.randomBytes(16).toString('hex');
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        plan: user.plan,
        tv: user.token_version || 0,
        ...(user.is_guest ? { guest: true } : {}),
      },
      this.secret,
      { expiresIn: ttl || this.ttl, jwtid: jti, algorithm: 'HS256' },
    );
    const { exp } = jwt.decode(token);
    return { token, jti, expiresAt: exp * 1000 };
  }

  /**
   * Verify a bearer token and return the current identity.
   * @returns {{ id:number, email:string, plan:string, guest:boolean, jti?:string, exp:number }}
   */
  verify(token) {
    let claims;
    try {
      claims = jwt.verify(token, this.secret, { algorithms: ['HS256'] });
    } catch (err) {
      if (err.name === 'TokenExpiredError') throw new AuthError('Token expired.', 'TOKEN_EXPIRED');
      throw new AuthError('Invalid token.', 'TOKEN_INVALID');
    }
    const row = this.db.prepare(
      'SELECT id, email, plan, token_version, is_guest, guest_expires_at FROM users WHERE id = ?',
    ).get(claims.id);
    if (!row) throw new AuthError('Account no longer exists.', 'ACCOUNT_GONE');
    if ((claims.tv || 0) !== (row.token_version || 0)) {
      throw new AuthError('Session ended. Please sign in again.', 'SESSION_REVOKED');
    }
    if (claims.jti && this.isRevoked(claims.jti)) {
      throw new AuthError('Session ended. Please sign in again.', 'SESSION_REVOKED');
    }
    if (row.is_guest && (!row.guest_expires_at || row.guest_expires_at <= this.now())) {
      throw new AuthError('Guest session expired.', 'GUEST_EXPIRED');
    }
    return {
      id: row.id,
      email: row.email,
      plan: row.plan,
      guest: !!row.is_guest,
      jti: claims.jti,
      exp: claims.exp * 1000,
    };
  }

  isRevoked(jti) {
    return !!this.db.prepare('SELECT 1 FROM revoked_tokens WHERE jti = ?').get(jti);
  }

  /** End one session (logout). */
  revoke(jti, expiresAtMs) {
    if (!jti) return;
    this.db.prepare('INSERT OR IGNORE INTO revoked_tokens (jti, expires_at) VALUES (?, ?)')
      .run(jti, Math.max(expiresAtMs || 0, this.now()));
  }

  /** End every session for a user (password change/reset). */
  revokeAll(userId) {
    this.db.prepare('UPDATE users SET token_version = token_version + 1 WHERE id = ?').run(userId);
  }

  /**
   * Delete expired guest accounts and stale revocation entries.
   * Users rows use AUTOINCREMENT, so a deleted guest id is never reused
   * and any orphaned rows keyed by it cannot surface to a later user.
   */
  purgeExpired() {
    const now = this.now();
    const revoked = this.db.prepare('DELETE FROM revoked_tokens WHERE expires_at < ?').run(now).changes;
    const guests = this.db.prepare(
      'DELETE FROM users WHERE is_guest = 1 AND guest_expires_at IS NOT NULL AND guest_expires_at < ?',
    ).run(now).changes;
    return { revoked, guests };
  }
}

module.exports = { SessionService, AuthError };
