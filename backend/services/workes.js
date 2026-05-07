// ============================================================
// ⚙️ services/workers.js — Background Job Queue
// Retries, scheduling, multiple handlers
// ============================================================

class WorkerQueue {
  constructor(db, options = {}) {
    this.db = db;
    this.handlers = new Map();
    this.pollIntervalMs = options.pollIntervalMs || 10000;
    this.maxAttempts = options.maxAttempts || 3;
    this.running = false;

    this.initSchema();
  }

  initSchema() {
    this.db.prepare(`CREATE TABLE IF NOT EXISTS bg_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      type TEXT NOT NULL,
      payload TEXT,
      status TEXT DEFAULT 'queued',
      result TEXT,
      attempts INTEGER DEFAULT 0,
      scheduled_at TEXT DEFAULT (datetime('now')),
      started_at TEXT,
      completed_at TEXT,
      error TEXT
    )`).run();

    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_bg_jobs_status ON bg_jobs(status, scheduled_at)`).run();
  }

  register(jobType, handler) {
    this.handlers.set(jobType, handler);
  }

  enqueue(userId, type, payload = {}, scheduleInSeconds = 0) {
    const scheduledAt = new Date(Date.now() + scheduleInSeconds * 1000).toISOString();
    return this.db.prepare(`INSERT INTO bg_jobs (user_id, type, payload, scheduled_at) VALUES (?, ?, ?, ?)`)
      .run(userId, type, JSON.stringify(payload), scheduledAt).lastInsertRowid;
  }

  async processOne() {
    let job;
    try {
      job = this.db.prepare(`SELECT * FROM bg_jobs WHERE status = 'queued' AND scheduled_at <= datetime('now') ORDER BY scheduled_at LIMIT 1`).get();
    } catch (_) { return; }

    if (!job) return;

    this.db.prepare(`UPDATE bg_jobs SET status = 'running', started_at = datetime('now'), attempts = attempts + 1 WHERE id = ?`).run(job.id);

    const handler = this.handlers.get(job.type);
    if (!handler) {
      this.db.prepare(`UPDATE bg_jobs SET status = 'failed', error = ? WHERE id = ?`)
        .run(`No handler for type: ${job.type}`, job.id);
      return;
    }

    try {
      const payload = JSON.parse(job.payload || '{}');
      const result = await handler(payload, { userId: job.user_id, jobId: job.id });
      this.db.prepare(`UPDATE bg_jobs SET status = 'completed', result = ?, completed_at = datetime('now') WHERE id = ?`)
        .run(JSON.stringify(result || { ok: true }), job.id);
    } catch (err) {
      if (job.attempts >= this.maxAttempts) {
        this.db.prepare(`UPDATE bg_jobs SET status = 'failed', error = ? WHERE id = ?`).run(err.message, job.id);
      } else {
        // Re-queue with backoff
        const backoff = Math.min(60 * Math.pow(2, job.attempts), 600);
        const nextAt = new Date(Date.now() + backoff * 1000).toISOString();
        this.db.prepare(`UPDATE bg_jobs SET status = 'queued', scheduled_at = ?, error = ? WHERE id = ?`)
          .run(nextAt, err.message, job.id);
      }
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    const tick = async () => {
      if (!this.running) return;
      try { await this.processOne(); } catch (_) {}
      setTimeout(tick, this.pollIntervalMs);
    };
    tick();
  }

  stop() { this.running = false; }

  getJob(jobId, userId) {
    const job = this.db.prepare(`SELECT * FROM bg_jobs WHERE id = ? AND (user_id = ? OR ? IS NULL)`).get(jobId, userId, userId);
    if (!job) return null;
    return {
      ...job,
      payload: JSON.parse(job.payload || '{}'),
      result: job.result ? JSON.parse(job.result) : null,
    };
  }

  listJobs(userId, limit = 50) {
    const jobs = this.db.prepare(`SELECT * FROM bg_jobs WHERE user_id = ? ORDER BY id DESC LIMIT ?`).all(userId, limit);
    return jobs.map(j => ({
      ...j,
      payload: JSON.parse(j.payload || '{}'),
      result: j.result ? JSON.parse(j.result) : null,
    }));
  }

  stats() {
    const counts = this.db.prepare(`SELECT status, COUNT(*) as c FROM bg_jobs GROUP BY status`).all();
    return counts.reduce((acc, r) => { acc[r.status] = r.c; return acc; }, {});
  }
}

module.exports = { WorkerQueue };