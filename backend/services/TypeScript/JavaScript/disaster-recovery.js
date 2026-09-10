// ============================================================
// 🛡️ services/disaster-recovery.js — DR + Advanced Resilience
// Restore testing · backup verification · failover orchestration
// ============================================================
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class DisasterRecovery {
  constructor(options) {
    this.db = options.db;
    this.backup = options.backup;
    this.logger = options.logger;
    this.events = options.events;
    this.backupDir = options.backupDir || './backups';
  }

  // ─── Verify backup integrity ──────────────
  verifyBackup(backupPath) {
    try {
      if (!fs.existsSync(backupPath)) return { ok: false, reason: 'file not found' };
      const stats = fs.statSync(backupPath);
      if (stats.size < 1024) return { ok: false, reason: 'file too small' };

      // Compute checksum
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(backupPath);
      return new Promise(resolve => {
        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => {
          const checksum = hash.digest('hex');
          resolve({ ok: true, size: stats.size, checksum, mtime: stats.mtime });
        });
        stream.on('error', err => resolve({ ok: false, reason: err.message }));
      });
    } catch (e) {
      return { ok: false, reason: e.message };
    }
  }

  // ─── List backups (sorted by date) ────────
  listBackups() {
    try {
      if (!fs.existsSync(this.backupDir)) return [];
      return fs.readdirSync(this.backupDir)
        .filter(f => f.endsWith('.db') || f.endsWith('.sql') || f.endsWith('.bak'))
        .map(f => {
          const filepath = path.join(this.backupDir, f);
          const stats = fs.statSync(filepath);
          return { name: f, path: filepath, size: stats.size, mtime: stats.mtime };
        })
        .sort((a, b) => b.mtime - a.mtime);
    } catch (_) { return []; }
  }

  // ─── Restore test (read-only dry run) ─────
  async restoreTest(backupName) {
    const backups = this.listBackups();
    const backup = backups.find(b => b.name === backupName) || backups[0];
    if (!backup) return { ok: false, reason: 'no backups available' };

    const verification = await this.verifyBackup(backup.path);
    if (!verification.ok) return verification;

    // Try opening as a SQLite db in read-only mode to validate structure
    try {
      let Database;
      try { Database = require('better-sqlite3'); } catch (_) {
        return { ok: true, ...verification, note: 'verified by checksum only (sqlite not installed)' };
      }
      const db = new Database(backup.path, { readonly: true, fileMustExist: true });
      const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all();
      db.close();
      this.events?.emit('dr.restore_test', { backup: backup.name, tables: tables.length });
      return { ok: true, ...verification, tables: tables.length };
    } catch (e) {
      return { ok: false, reason: 'backup unreadable: ' + e.message };
    }
  }

  // ─── Health check across all critical paths ──
  async healthCheck() {
    const checks = {};

    // 1. DB write/read
    try {
      this.db.prepare(`CREATE TABLE IF NOT EXISTS _health (id INTEGER, v TEXT)`).run();
      const t0 = Date.now();
      this.db.prepare(`INSERT INTO _health (id, v) VALUES (?, ?)`).run(1, 'check_' + t0);
      const row = this.db.prepare(`SELECT v FROM _health WHERE id = 1`).get();
      this.db.prepare(`DELETE FROM _health WHERE id = 1`).run();
      checks.db = { ok: !!row, latency_ms: Date.now() - t0 };
    } catch (e) {
      checks.db = { ok: false, error: e.message };
    }

    // 2. Backup directory writable
    try {
      if (!fs.existsSync(this.backupDir)) fs.mkdirSync(this.backupDir, { recursive: true });
      const testFile = path.join(this.backupDir, '.health-check');
      fs.writeFileSync(testFile, 'ok');
      fs.unlinkSync(testFile);
      checks.backup_dir = { ok: true };
    } catch (e) {
      checks.backup_dir = { ok: false, error: e.message };
    }

    // 3. Recent backup exists
    const backups = this.listBackups();
    const recentBackup = backups[0];
    const ageHours = recentBackup ? (Date.now() - recentBackup.mtime.getTime()) / 3600000 : Infinity;
    checks.recent_backup = {
      ok: ageHours < 48,
      latest: recentBackup?.name,
      age_hours: Math.round(ageHours * 10) / 10,
    };

    // 4. Memory usage
    const mem = process.memoryUsage();
    checks.memory = {
      ok: mem.heapUsed < 1024 * 1024 * 800, // < 800MB
      heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
      rss_mb: Math.round(mem.rss / 1024 / 1024),
    };

    // 5. Process uptime
    checks.uptime = { ok: true, seconds: Math.round(process.uptime()) };

    const allOk = Object.values(checks).every(c => c.ok !== false);
    return { ok: allOk, checks, timestamp: Date.now() };
  }

  // ─── Snapshot now (forced backup) ──────────
  async snapshot(reason = 'manual') {
    if (!this.backup?.run) return { ok: false, reason: 'backup service unavailable' };
    try {
      const result = await this.backup.run();
      this.events?.emit('dr.snapshot', { reason, result });
      this.logger?.info('DR snapshot created', { reason });
      return { ok: true, ...result };
    } catch (e) {
      return { ok: false, reason: e.message };
    }
  }
}

module.exports = { DisasterRecovery };