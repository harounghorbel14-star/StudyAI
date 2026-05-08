// ============================================================
// 📥 queues/queue.js — Job Queue (BullMQ → in-process fallback)
// ============================================================

let BullMQ;
try { BullMQ = require('bullmq'); } catch (_) { BullMQ = null; }

class QueueManager {
  constructor(options = {}) {
    this.logger = options.logger;
    this.redisConfig = options.redisConfig;
    this.queues = new Map();
    this.workers = new Map();
    this.handlers = new Map();
    this.useBullMQ = !!(BullMQ && this.redisConfig);

    // In-process fallback queue
    this.fallbackJobs = []; // {id, queue, data, attempts, scheduledAt}
    this.fallbackId = 0;
    this.fallbackProcessing = false;

    if (!this.useBullMQ) {
      this.startFallbackProcessor();
      this.logger?.info('Queue: using in-process fallback (no Redis configured for BullMQ)');
    } else {
      this.logger?.info('Queue: BullMQ + Redis enabled');
    }
  }

  /**
   * Get or create a queue by name.
   */
  getQueue(queueName) {
    if (this.queues.has(queueName)) return this.queues.get(queueName);

    if (this.useBullMQ) {
      const queue = new BullMQ.Queue(queueName, { connection: this.redisConfig });
      this.queues.set(queueName, queue);
      return queue;
    }

    // Fallback: simple object
    const fallbackQueue = {
      add: async (jobName, data, opts = {}) => {
        const id = ++this.fallbackId;
        this.fallbackJobs.push({
          id,
          queue: queueName,
          name: jobName,
          data,
          attempts: 0,
          maxAttempts: opts.attempts || 3,
          scheduledAt: Date.now() + (opts.delay || 0),
        });
        return { id };
      },
    };
    this.queues.set(queueName, fallbackQueue);
    return fallbackQueue;
  }

  /**
   * Register a handler for a queue.
   */
  registerWorker(queueName, handler, options = {}) {
    this.handlers.set(queueName, handler);

    if (this.useBullMQ) {
      const worker = new BullMQ.Worker(
        queueName,
        async (job) => handler(job.data, { id: job.id, queue: queueName }),
        {
          connection: this.redisConfig,
          concurrency: options.concurrency || 5,
        }
      );
      worker.on('failed', (job, err) => {
        this.logger?.error(`Job failed [${queueName}]`, { id: job?.id, error: err.message });
      });
      worker.on('completed', (job) => {
        this.logger?.debug(`Job completed [${queueName}]`, { id: job?.id });
      });
      this.workers.set(queueName, worker);
    }
  }

  /**
   * Add a job (shorthand).
   */
  async enqueue(queueName, jobName, data, options = {}) {
    const queue = this.getQueue(queueName);
    return queue.add(jobName, data, options);
  }

  /**
   * Fallback in-process processor — runs every 2s.
   */
  startFallbackProcessor() {
    setInterval(async () => {
      if (this.fallbackProcessing) return;
      this.fallbackProcessing = true;
      try {
        const now = Date.now();
        const due = this.fallbackJobs.filter(j => j.scheduledAt <= now);
        if (!due.length) return;

        // Process up to 5 in parallel
        const batch = due.splice(0, 5);
        for (const job of batch) {
          this.fallbackJobs = this.fallbackJobs.filter(j => j.id !== job.id);
        }

        await Promise.allSettled(batch.map(async (job) => {
          const handler = this.handlers.get(job.queue);
          if (!handler) return;
          job.attempts++;
          try {
            await handler(job.data, { id: job.id, queue: job.queue });
          } catch (err) {
            this.logger?.warn(`Fallback job retry [${job.queue}]`, { id: job.id, error: err.message });
            if (job.attempts < job.maxAttempts) {
              job.scheduledAt = Date.now() + (job.attempts * 5000);
              this.fallbackJobs.push(job);
            } else {
              this.logger?.error(`Fallback job failed permanently`, { id: job.id });
            }
          }
        }));
      } finally {
        this.fallbackProcessing = false;
      }
    }, 2000);
  }

  /**
   * Get queue stats.
   */
  async stats(queueName) {
    if (this.useBullMQ) {
      const queue = this.queues.get(queueName);
      if (!queue) return null;
      const counts = await queue.getJobCounts();
      return { type: 'bullmq', ...counts };
    }
    const jobs = this.fallbackJobs.filter(j => j.queue === queueName);
    return {
      type: 'fallback',
      waiting: jobs.length,
      total: this.fallbackJobs.length,
    };
  }

  async close() {
    for (const w of this.workers.values()) {
      try { await w.close(); } catch (_) {}
    }
    for (const q of this.queues.values()) {
      try { await q.close?.(); } catch (_) {}
    }
  }
}

module.exports = { QueueManager };