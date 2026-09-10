// ============================================================
// 🔑 security/secret-rotation.js — Automated Secret Management
// Rotates JWT tokens, API keys, deploy tokens with audit trail
// ============================================================
const crypto = require('crypto');

class SecretRotation {
  constructor(db, options = {}) {
    this.db = db;
    this.audit = options.audit;
    this.events = options.events;
    this.logger = options.logger;
    this.encryptionKey = this._deriveKey(process.env.DEPLOY_KEY || process.env.JWT_SECRET || 'fallback-not-secure');
    this.initSchema();
  }

  _deriveKey(seed) {
    return crypto.scryptSync(seed, 'nexusai-rotation', 32);
  }

  initSchema() {
    this.db.prepare(`CREATE TABLE IF NOT EXISTS secrets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      key_name TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      encrypted_value TEXT NOT NULL,
      iv TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      rotated_at INTEGER,
      expires_at INTEGER,
      status TEXT DEFAULT 'active'
    )`).run();
    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_secrets_user ON secrets(user_id, key_name)`).run();
    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_secrets_active ON secrets(key_name, status)`).run();
  }

  // ─── Encrypt ──────────────────────────────
  _encrypt(plaintext) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    let encrypted = cipher.update(String(plaintext), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();
    return { encrypted: encrypted + ':' + tag.toString('hex'), iv: iv.toString('hex') };
  }

  _decrypt(encryptedWithTag, iv) {
    try {
      const [encrypted, tagHex] = encryptedWithTag.split(':');
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, Buffer.from(iv, 'hex'));
      decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (e) {
      this.logger?.warn('Decryption failed', { error: e.message });
      return null;
    }
  }

  // ─── Store new secret ─────────────────────
  store({ user_id, key_name, value, ttl_days = 90 }) {
    const { encrypted, iv } = this._encrypt(value);
    const now = Date.now();
    const expires_at = ttl_days ? now + ttl_days * 24 * 60 * 60 * 1000 : null;

    // Mark previous as rotated
    this.db.prepare(`UPDATE secrets SET status = 'rotated', rotated_at = ? WHERE user_id IS ? AND key_name = ? AND status = 'active'`)
      .run(now, user_id || null, key_name);

    // Get next version
    const prev = this.db.prepare(`SELECT MAX(version) as v FROM secrets WHERE user_id IS ? AND key_name = ?`)
      .get(user_id || null, key_name);
    const version = (prev?.v || 0) + 1;

    this.db.prepare(`INSERT INTO secrets (user_id, key_name, version, encrypted_value, iv, created_at, expires_at, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`)
      .run(user_id || null, key_name, version, encrypted, iv, now, expires_at);

    this.audit?.log({
      user_id, event_type: 'secret.rotated', severity: 'info',
      action: 'store', resource: key_name, metadata: { version, ttl_days },
    });
    this.events?.emit('secret.stored', { user_id, key_name, version });

    return { version, expires_at };
  }

  // ─── Retrieve current active secret ──────
  retrieve({ user_id, key_name }) {
    try {
      const row = this.db.prepare(`SELECT encrypted_value, iv, version, expires_at FROM secrets WHERE user_id IS ? AND key_name = ? AND status = 'active' ORDER BY version DESC LIMIT 1`)
        .get(user_id || null, key_name);
      if (!row) return null;

      // Check expiration
      if (row.expires_at && row.expires_at < Date.now()) {
        this.audit?.log({
          user_id, event_type: 'secret.rotated', severity: 'warn',
          action: 'expired', resource: key_name,
        });
        return { expired: true, version: row.version };
      }

      const value = this._decrypt(row.encrypted_value, row.iv);
      return value ? { value, version: row.version, expires_at: row.expires_at } : null;
    } catch (_) { return null; }
  }

  // ─── Rotate (generate new value) ─────────
  rotate({ user_id, key_name, generator = () => crypto.randomBytes(32).toString('hex'), ttl_days = 90 }) {
    const newValue = generator();
    return { ...this.store({ user_id, key_name, value: newValue, ttl_days }), value: newValue };
  }

  // ─── List secrets (without values) ───────
  list({ user_id }) {
    try {
      return this.db.prepare(`SELECT key_name, version, status, created_at, expires_at, rotated_at FROM secrets WHERE user_id IS ? ORDER BY key_name, version DESC`)
        .all(user_id || null);
    } catch (_) { return []; }
  }

  // ─── Find expiring secrets ───────────────
  findExpiring({ days_ahead = 7 }) {
    try {
      const cutoff = Date.now() + days_ahead * 24 * 60 * 60 * 1000;
      return this.db.prepare(`SELECT user_id, key_name, version, expires_at FROM secrets WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < ?`)
        .all(cutoff);
    } catch (_) { return []; }
  }

  // ─── Revoke ───────────────────────────────
  revoke({ user_id, key_name, version }) {
    try {
      const result = this.db.prepare(`UPDATE secrets SET status = 'revoked' WHERE user_id IS ? AND key_name = ? AND version = ?`)
        .run(user_id || null, key_name, version);
      this.audit?.log({
        user_id, event_type: 'secret.rotated', severity: 'warn',
        action: 'revoke', resource: key_name, metadata: { version },
      });
      return result.changes > 0;
    } catch (_) { return false; }
  }

  // ─── Cleanup old rotated secrets ─────────
  cleanup({ keep_versions = 3 } = {}) {
    try {
      // Per (user_id, key_name): keep last N rotated versions
      const stmt = this.db.prepare(`
        DELETE FROM secrets WHERE id IN (
          SELECT id FROM secrets WHERE status = 'rotated'
          AND id NOT IN (
            SELECT id FROM secrets WHERE status = 'rotated'
            ORDER BY rotated_at DESC LIMIT ?
          )
        )
      `);
      const result = stmt.run(keep_versions * 100);
      return { deleted: result.changes };
    } catch (_) { return { deleted: 0 }; }
  }

  // ─── Auto-rotation daemon ────────────────
  startAutoRotation({ checkIntervalMs = 24 * 60 * 60 * 1000, daysBeforeExpiry = 7, autoRotateKeys = [] } = {}) {
    const tick = () => {
      try {
        const expiring = this.findExpiring({ days_ahead: daysBeforeExpiry });
        for (const secret of expiring) {
          if (autoRotateKeys.includes(secret.key_name)) {
            this.logger?.info('Auto-rotating secret', { key_name: secret.key_name, user_id: secret.user_id });
            this.rotate({ user_id: secret.user_id, key_name: secret.key_name });
          } else {
            this.events?.emit('secret.expiring', secret);
          }
        }
      } catch (e) {
        this.logger?.error('Auto-rotation failed', { error: e.message });
      }
    };
    this._rotationTimer = setInterval(tick, checkIntervalMs);
    tick();
  }

  stopAutoRotation() {
    if (this._rotationTimer) clearInterval(this._rotationTimer);
  }
}

module.exports = { SecretRotation };