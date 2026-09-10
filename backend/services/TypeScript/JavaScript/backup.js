// ============================================================
// 💾 services/backup.js — Disaster Recovery & Backups
// Automated DB snapshots, rotation, integrity checks, restore.
// ============================================================
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class BackupService {
  constructor(options) {
    this.dbPath = options.dbPath;
    this.backupDir = options.backupDir || path.join(path.dirname(options.dbPath || '.'), 'backups');
    this.maxBackups = options.maxBackups || 14;     // keep 14 days
    this.intervalMs = options.intervalMs || 24 * 60 * 60 * 1000; // daily
    this.logger = options.logger;
    this.timer = null;

    if (!fs.existsSync(this.backupDir)) {
      try { fs.mkdirSync(this.backupDir, { recursive: true }); } catch (_) {}
    }
  }

  // ─── Create a new backup ───────────────────
  createBackup(label = 'auto') {
    if (!this.dbPath || !fs.existsSync(this.dbPath)) {
      return { ok: false, error: 'DB file not found' };
    }
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `nexusai_${label}_${ts}.db`;
      const fullPath = path.join(this.backupDir, filename);

      fs.copyFileSync(this.dbPath, fullPath);
      const checksum = this._checksum(fullPath);
      const size = fs.statSync(fullPath).size;

      // Save metadata
      fs.writeFileSync(fullPath + '.meta.json', JSON.stringify({
        created_at: new Date().toISOString(),
        original: this.dbPath,
        checksum,
        size,
        label,
      }, null, 2));

      this.logger?.info('Backup created', { filename, size_kb: (size / 1024).toFixed(1) });
      this._rotate();

      return { ok: true, filename, fullPath, size, checksum };
    } catch (e) {
      this.logger?.error('Backup failed', { error: e.message });
      return { ok: false, error: e.message };
    }
  }

  // ─── List all backups ─────────────────────
  list() {
    try {
      if (!fs.existsSync(this.backupDir)) return [];
      const files = fs.readdirSync(this.backupDir)
        .filter(f => f.endsWith('.db'))
        .map(f => {
          const fullPath = path.join(this.backupDir, f);
          const stat = fs.statSync(fullPath);
          let meta = {};
          try { meta = JSON.parse(fs.readFileSync(fullPath + '.meta.json', 'utf8')); } catch (_) {}
          return {
            filename: f,
            size: stat.size,
            size_kb: (stat.size / 1024).toFixed(1),
            created_at: meta.created_at || stat.birthtime.toISOString(),
            checksum: meta.checksum,
            label: meta.label || 'unknown',
          };
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return files;
    } catch (e) {
      this.logger?.warn('Backup list failed', { error: e.message });
      return [];
    }
  }

  // ─── Verify a backup ──────────────────────
  verify(filename) {
    try {
      const fullPath = path.join(this.backupDir, filename);
      if (!fs.existsSync(fullPath)) return { ok: false, error: 'Not found' };
      const meta = JSON.parse(fs.readFileSync(fullPath + '.meta.json', 'utf8'));
      const currentChecksum = this._checksum(fullPath);
      const valid = currentChecksum === meta.checksum;
      return { ok: valid, expected: meta.checksum, actual: currentChecksum };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // ─── Delete a backup ──────────────────────
  delete(filename) {
    try {
      const fullPath = path.join(this.backupDir, filename);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      if (fs.existsSync(fullPath + '.meta.json')) fs.unlinkSync(fullPath + '.meta.json');
      this.logger?.info('Backup deleted', { filename });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // ─── Rotate old backups ───────────────────
  _rotate() {
    const all = this.list();
    if (all.length > this.maxBackups) {
      const toDelete = all.slice(this.maxBackups);
      for (const b of toDelete) this.delete(b.filename);
    }
  }

  _checksum(filePath) {
    const hash = crypto.createHash('sha256');
    hash.update(fs.readFileSync(filePath));
    return hash.digest('hex');
  }

  // ─── Start automatic backups ──────────────
  startAuto() {
    if (this.timer) return;
    // Take an initial backup if none exist
    if (!this.list().length) this.createBackup('initial');
    this.timer = setInterval(() => this.createBackup('scheduled'), this.intervalMs);
    this.logger?.info('Auto-backup started', { interval_hours: this.intervalMs / 3600000 });
  }

  stopAuto() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  // ─── Stats ────────────────────────────────
  stats() {
    const all = this.list();
    const totalSize = all.reduce((s, b) => s + b.size, 0);
    return {
      total_backups: all.length,
      total_size_mb: (totalSize / 1024 / 1024).toFixed(2),
      oldest: all[all.length - 1]?.created_at,
      newest: all[0]?.created_at,
      auto_active: !!this.timer,
      max_backups: this.maxBackups,
    };
  }
}

module.exports = { BackupService };