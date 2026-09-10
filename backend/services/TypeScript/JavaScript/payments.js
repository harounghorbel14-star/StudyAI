// ============================================================
// 💳 services/payments.js — Real Stripe Payment Flow
// Checkout sessions · subscriptions · webhooks · idempotency
// Plans: Free · Pro ($19/mo) · Elite ($49/mo) · Team ($99/mo)
// ============================================================

const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    quota_per_day: 10,
    features: ['basic_ai', '1_workspace', 'community_access'],
    stripe_price_id: null,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 19,
    quota_per_day: 500,
    features: ['gpt-4', 'claude', '10_workspaces', 'voice', 'media_gen', 'priority_support'],
    stripe_price_id: process.env.STRIPE_PRICE_PRO || null,
  },
  elite: {
    id: 'elite',
    name: 'Elite',
    price: 49,
    quota_per_day: -1, // unlimited
    features: ['everything_in_pro', 'multi_agent', 'auto_deploy', 'ai_twin', 'memory_fabric', 'unlimited_workspaces'],
    stripe_price_id: process.env.STRIPE_PRICE_ELITE || null,
  },
  team: {
    id: 'team',
    name: 'Team',
    price: 99,
    quota_per_day: -1,
    features: ['everything_in_elite', 'team_workspaces', 'admin_console', 'audit_export', 'sso_ready'],
    stripe_price_id: process.env.STRIPE_PRICE_TEAM || null,
  },
};

class PaymentsService {
  constructor(options) {
    this.db = options.db;
    this.events = options.events;
    this.logger = options.logger;
    this.notifications = options.notifications;
    this.stripeKey = options.stripeKey || process.env.STRIPE_SECRET_KEY;
    this.webhookSecret = options.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;
    this.frontendUrl = options.frontendUrl || process.env.FRONTEND_URL || 'https://nexusai-rust.vercel.app';
    this._stripe = null;
    this.initSchema();
  }

  get stripe() {
    if (this._stripe) return this._stripe;
    if (!this.stripeKey) return null;
    try {
      const Stripe = require('stripe');
      this._stripe = Stripe(this.stripeKey, { apiVersion: '2024-06-20' });
      return this._stripe;
    } catch (e) {
      this.logger?.warn('stripe not installed', { err: e.message });
      return null;
    }
  }

  initSchema() {
    if (!this.db) return;

    this.db.prepare(`CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT UNIQUE,
      plan TEXT NOT NULL,
      status TEXT NOT NULL,
      current_period_end INTEGER,
      cancel_at_period_end INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`).run();

    this.db.prepare(`CREATE TABLE IF NOT EXISTS payment_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stripe_event_id TEXT UNIQUE,
      type TEXT NOT NULL,
      user_id INTEGER,
      amount INTEGER,
      currency TEXT,
      status TEXT,
      metadata TEXT,
      created_at INTEGER NOT NULL
    )`).run();

    this.db.prepare(`CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      stripe_invoice_id TEXT UNIQUE,
      amount INTEGER,
      currency TEXT,
      status TEXT,
      hosted_url TEXT,
      pdf_url TEXT,
      created_at INTEGER NOT NULL
    )`).run();

    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_sub_user ON subscriptions(user_id, status)`).run();
  }

  // ─── Create checkout session ──────────────
  async createCheckout({ user_id, user_email, plan, return_url }) {
    if (!this.stripe) throw new Error('Stripe not configured');
    const planConfig = PLANS[plan];
    if (!planConfig || !planConfig.stripe_price_id) throw new Error(`Invalid or unconfigured plan: ${plan}`);

    // Get or create Stripe customer
    let customerId = null;
    try {
      const existing = this.db.prepare(`SELECT stripe_customer_id FROM subscriptions WHERE user_id = ? LIMIT 1`).get(user_id);
      customerId = existing?.stripe_customer_id;
    } catch (_) {}

    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user_email,
        metadata: { user_id: String(user_id) },
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: planConfig.stripe_price_id, quantity: 1 }],
      success_url: `${return_url || this.frontendUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${return_url || this.frontendUrl}?checkout=cancelled`,
      metadata: { user_id: String(user_id), plan },
      allow_promotion_codes: true,
    });

    this.events?.emit('payment.checkout_created', { user_id, plan, session_id: session.id });
    return { url: session.url, session_id: session.id };
  }

  // ─── Handle webhook event ─────────────────
  async handleWebhook({ rawBody, signature }) {
    if (!this.stripe) throw new Error('Stripe not configured');
    if (!this.webhookSecret) throw new Error('Webhook secret not configured');

    let event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch (e) {
      throw new Error(`Webhook signature verification failed: ${e.message}`);
    }

    // Idempotency check
    try {
      const existing = this.db.prepare(`SELECT id FROM payment_events WHERE stripe_event_id = ?`).get(event.id);
      if (existing) return { ok: true, duplicate: true };
    } catch (_) {}

    // Handle event types
    let result = { ok: true, type: event.type };
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          result = await this._handleCheckoutCompleted(event);
          break;
        case 'customer.subscription.updated':
        case 'customer.subscription.created':
          result = await this._handleSubscriptionUpdate(event);
          break;
        case 'customer.subscription.deleted':
          result = await this._handleSubscriptionDeleted(event);
          break;
        case 'invoice.payment_succeeded':
          result = await this._handleInvoicePaid(event);
          break;
        case 'invoice.payment_failed':
          result = await this._handleInvoiceFailed(event);
          break;
      }
    } catch (e) {
      this.logger?.error('webhook handler failed', { type: event.type, err: e.message });
      result = { ok: false, error: e.message };
    }

    // Record event (idempotency)
    try {
      this.db.prepare(
        `INSERT INTO payment_events (stripe_event_id, type, user_id, amount, currency, status, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        event.id,
        event.type,
        result.user_id || null,
        event.data?.object?.amount || event.data?.object?.amount_paid || null,
        event.data?.object?.currency || null,
        result.ok ? 'processed' : 'error',
        JSON.stringify(result),
        Date.now()
      );
    } catch (_) {}

    return result;
  }

  async _handleCheckoutCompleted(event) {
    const session = event.data.object;
    const user_id = Number(session.metadata?.user_id);
    const plan = session.metadata?.plan;
    if (!user_id || !plan) return { ok: false, error: 'missing metadata' };

    // Fetch subscription details
    const sub = await this.stripe.subscriptions.retrieve(session.subscription);

    this._upsertSubscription({
      user_id,
      stripe_customer_id: sub.customer,
      stripe_subscription_id: sub.id,
      plan,
      status: sub.status,
      current_period_end: sub.current_period_end * 1000,
      cancel_at_period_end: sub.cancel_at_period_end ? 1 : 0,
    });

    // Upgrade user plan
    try {
      this.db.prepare(`UPDATE users SET plan = ? WHERE id = ?`).run(plan, user_id);
    } catch (_) {}

    this.events?.emit('payment.subscription_created', { user_id, plan });
    if (this.notifications) {
      await this.notifications.send({
        user_id, type: 'payment_success',
        title: `Welcome to ${PLANS[plan].name}!`,
        message: `Your ${PLANS[plan].name} subscription is now active.`,
      });
    }

    return { ok: true, user_id, plan };
  }

  async _handleSubscriptionUpdate(event) {
    const sub = event.data.object;
    const existing = this.db.prepare(`SELECT user_id, plan FROM subscriptions WHERE stripe_subscription_id = ?`).get(sub.id);
    if (!existing) return { ok: false, error: 'unknown subscription' };

    this._upsertSubscription({
      user_id: existing.user_id,
      stripe_customer_id: sub.customer,
      stripe_subscription_id: sub.id,
      plan: existing.plan,
      status: sub.status,
      current_period_end: sub.current_period_end * 1000,
      cancel_at_period_end: sub.cancel_at_period_end ? 1 : 0,
    });

    // If cancelled, downgrade to free at period end
    if (sub.status === 'canceled') {
      try { this.db.prepare(`UPDATE users SET plan = 'free' WHERE id = ?`).run(existing.user_id); } catch (_) {}
    }

    return { ok: true, user_id: existing.user_id, status: sub.status };
  }

  async _handleSubscriptionDeleted(event) {
    const sub = event.data.object;
    const existing = this.db.prepare(`SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ?`).get(sub.id);
    if (!existing) return { ok: false };

    this.db.prepare(`UPDATE subscriptions SET status = 'canceled', updated_at = ? WHERE stripe_subscription_id = ?`)
      .run(Date.now(), sub.id);
    try { this.db.prepare(`UPDATE users SET plan = 'free' WHERE id = ?`).run(existing.user_id); } catch (_) {}

    this.events?.emit('payment.subscription_cancelled', { user_id: existing.user_id });
    return { ok: true, user_id: existing.user_id };
  }

  async _handleInvoicePaid(event) {
    const invoice = event.data.object;
    const customerId = invoice.customer;
    const existing = this.db.prepare(`SELECT user_id FROM subscriptions WHERE stripe_customer_id = ? LIMIT 1`).get(customerId);
    if (!existing) return { ok: false };

    try {
      this.db.prepare(
        `INSERT OR IGNORE INTO invoices (user_id, stripe_invoice_id, amount, currency, status, hosted_url, pdf_url, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(existing.user_id, invoice.id, invoice.amount_paid, invoice.currency,
            'paid', invoice.hosted_invoice_url, invoice.invoice_pdf, Date.now());
    } catch (_) {}

    return { ok: true, user_id: existing.user_id };
  }

  async _handleInvoiceFailed(event) {
    const invoice = event.data.object;
    const existing = this.db.prepare(`SELECT user_id FROM subscriptions WHERE stripe_customer_id = ? LIMIT 1`).get(invoice.customer);
    if (!existing) return { ok: false };

    if (this.notifications) {
      await this.notifications.send({
        user_id: existing.user_id, type: 'payment_failed',
        title: 'Payment failed',
        message: 'We couldn\'t process your recent payment. Please update your billing method.',
        link: '/billing',
      });
    }
    return { ok: true, user_id: existing.user_id };
  }

  _upsertSubscription({ user_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end, cancel_at_period_end }) {
    const now = Date.now();
    const existing = this.db.prepare(`SELECT id FROM subscriptions WHERE stripe_subscription_id = ?`).get(stripe_subscription_id);
    if (existing) {
      this.db.prepare(
        `UPDATE subscriptions SET status = ?, current_period_end = ?, cancel_at_period_end = ?, updated_at = ? WHERE id = ?`
      ).run(status, current_period_end, cancel_at_period_end, now, existing.id);
    } else {
      this.db.prepare(
        `INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end, cancel_at_period_end, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(user_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end, cancel_at_period_end, now, now);
    }
  }

  // ─── Public API ─────────────────────────
  listPlans() {
    return Object.values(PLANS).map(p => ({
      id: p.id, name: p.name, price: p.price,
      quota_per_day: p.quota_per_day, features: p.features,
      available: p.id === 'free' || !!p.stripe_price_id,
    }));
  }

  getSubscription(user_id) {
    return this.db.prepare(
      `SELECT plan, status, current_period_end, cancel_at_period_end FROM subscriptions
       WHERE user_id = ? AND status IN ('active', 'trialing', 'past_due') ORDER BY updated_at DESC LIMIT 1`
    ).get(user_id) || { plan: 'free', status: 'active' };
  }

  getInvoices(user_id, limit = 20) {
    return this.db.prepare(
      `SELECT stripe_invoice_id, amount, currency, status, hosted_url, pdf_url, created_at
       FROM invoices WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
    ).all(user_id, limit);
  }

  async cancelSubscription(user_id) {
    if (!this.stripe) throw new Error('Stripe not configured');
    const sub = this.db.prepare(
      `SELECT stripe_subscription_id FROM subscriptions WHERE user_id = ? AND status = 'active' LIMIT 1`
    ).get(user_id);
    if (!sub) throw new Error('No active subscription');

    await this.stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true });
    this.db.prepare(`UPDATE subscriptions SET cancel_at_period_end = 1, updated_at = ? WHERE stripe_subscription_id = ?`)
      .run(Date.now(), sub.stripe_subscription_id);

    return { ok: true, message: 'Will cancel at period end' };
  }
}

module.exports = { PaymentsService, PLANS };