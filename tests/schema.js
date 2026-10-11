// ============================================================
// Schema consistency: a table created in two places with different
// columns breaks whichever module runs second (CREATE TABLE IF NOT
// EXISTS silently keeps the first definition). This happened with
// agent_steps; it fails the suite if it happens again.
// ============================================================
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const BACKEND = path.join(__dirname, '..', 'backend');
// Known duplicates whose richer definition adds its missing columns with
// ALTER TABLE, verified below by building them in the worst order.
const RECONCILED = { subscriptions: ['cancel_at_period_end'], notifications: ['link', 'metadata', 'priority'] };

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (/node_modules|[\\/]dist([\\/]|$)/.test(p)) continue;
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(js|ts)$/.test(f)) files.push(p);
  }
}(BACKEND));

const defs = {};
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\)\s*[`'"]/g)) {
    const cols = m[2].split('\n').map((l) => l.trim().split(/\s+/)[0])
      .filter((c) => /^[a-z_]+$/.test(c)).sort().join(',');
    (defs[m[1]] = defs[m[1]] || []).push({ file: path.relative(BACKEND, f), cols });
  }
}

let failed = 0;
for (const [table, list] of Object.entries(defs)) {
  if (list.length < 2 || new Set(list.map((x) => x.cols)).size === 1) continue;
  if (RECONCILED[table]) continue;
  failed++;
  console.error(`❌ table "${table}" is defined with different columns in:\n   ${list.map((x) => `${x.file} [${x.cols}]`).join('\n   ')}`);
}

// Worst order for the reconciled tables: route version first, then the service.
const db = new Database(':memory:');
db.prepare('CREATE TABLE subscriptions (id INTEGER PRIMARY KEY, user_id INTEGER, stripe_customer_id TEXT, stripe_subscription_id TEXT, plan TEXT, status TEXT, current_period_end INTEGER, created_at INTEGER, updated_at INTEGER)').run();
db.prepare('CREATE TABLE notifications (id INTEGER PRIMARY KEY, user_id INTEGER, type TEXT, title TEXT, message TEXT, read INTEGER, created_at INTEGER)').run();
const { PaymentsService } = require('../backend/services/payments');
const { NotificationService } = require('../backend/services/notifications');
try { new PaymentsService({ db }); } catch (_) { /* constructor may need more deps; schema runs first */ }
try { new NotificationService({ db }); } catch (_) { /* same */ }
for (const [table, needed] of Object.entries(RECONCILED)) {
  const have = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  const missing = needed.filter((c) => !have.includes(c));
  if (missing.length) { failed++; console.error(`❌ ${table} created by the route first is missing ${missing.join(', ')} after the service starts`); }
}

if (failed) { console.error(`\n${failed} schema problem(s)`); process.exit(1); }
console.log(`✅ schema: ${Object.keys(defs).length} tables, no conflicting definitions; reconciled tables migrate correctly`);
