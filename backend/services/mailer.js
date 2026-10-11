// ============================================================
// ✉️ services/mailer.js — Transactional email
//
// Transports:
//   resend  — RESEND_API_KEY + MAIL_FROM (the provider the deploy
//             engine already uses). Real delivery.
//   outbox  — writes each message as JSON to MAIL_OUTBOX_DIR. Only
//             honoured when NODE_ENV=test, so automated tests can
//             follow a real reset link without a mail provider. It
//             refuses to start in any other environment.
//   none    — nothing configured. send() reports delivered:false; it
//             never pretends a message went out.
// ============================================================
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class Mailer {
  constructor({ env = process.env, logger, fetchImpl } = {}) {
    this.logger = logger;
    this.fetch = fetchImpl || ((...a) => fetch(...a));
    this.from = env.MAIL_FROM || '';
    if (env.MAIL_TRANSPORT === 'outbox') {
      if (env.NODE_ENV !== 'test') {
        throw new Error('MAIL_TRANSPORT=outbox is a test-only transport and requires NODE_ENV=test');
      }
      this.transport = 'outbox';
      this.outboxDir = env.MAIL_OUTBOX_DIR || path.join(process.cwd(), 'mail-outbox');
      fs.mkdirSync(this.outboxDir, { recursive: true });
    } else if (env.RESEND_API_KEY && this.from) {
      this.transport = 'resend';
      this.apiKey = env.RESEND_API_KEY;
    } else {
      this.transport = 'none';
    }
  }

  isConfigured() {
    return this.transport !== 'none';
  }

  /** Names of the settings still missing for real delivery. */
  missingConfig(env = process.env) {
    if (this.isConfigured()) return [];
    return ['RESEND_API_KEY', 'MAIL_FROM'].filter((k) => !env[k]);
  }

  /**
   * @returns {Promise<{ delivered: boolean, id?: string, reason?: string }>}
   */
  async send({ to, subject, text, html }) {
    if (this.transport === 'none') {
      return { delivered: false, reason: 'EMAIL_NOT_CONFIGURED' };
    }
    if (this.transport === 'outbox') {
      const id = crypto.randomBytes(6).toString('hex');
      fs.writeFileSync(
        path.join(this.outboxDir, `${Date.now()}-${id}.json`),
        JSON.stringify({ to, subject, text, html }, null, 2),
      );
      return { delivered: true, id };
    }
    const res = await this.fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: this.from, to: [to], subject, text, html }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      // Status only: the body can echo the recipient.
      throw new Error(`Email provider responded ${res.status}`);
    }
    const data = await res.json().catch(() => ({}));
    return { delivered: true, id: data.id };
  }
}

module.exports = { Mailer };
