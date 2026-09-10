#!/usr/bin/env node
// ============================================================
// 🔥 tests/load.js — Load Testing Harness (zero dependencies)
// Answers the question the audit could not: how many concurrent
// users can this actually handle before it degrades?
//
// Usage:
//   node tests/load.js                                  # default profile
//   node tests/load.js --url=https://your-app --users=100 --duration=60
//   node tests/load.js --profile=spike
// ============================================================

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; })
);

const BASE_URL = args.url || process.env.LOAD_TEST_URL || 'http://localhost:3001';
const TOKEN = args.token || process.env.LOAD_TEST_TOKEN || '';

const PROFILES = {
  smoke:    { users: 5,   duration: 10, rampUp: 2 },
  baseline: { users: 25,  duration: 30, rampUp: 5 },
  stress:   { users: 100, duration: 60, rampUp: 15 },
  spike:    { users: 200, duration: 30, rampUp: 1 },
  soak:     { users: 20,  duration: 600, rampUp: 10 },
};

const profile = PROFILES[args.profile || 'baseline'] || PROFILES.baseline;
const USERS = Number(args.users) || profile.users;
const DURATION = Number(args.duration) || profile.duration;
const RAMP_UP = Number(args.rampUp) || profile.rampUp;

// Endpoints exercised, weighted by expected real-world traffic mix
const SCENARIOS = [
  { name: 'health',        weight: 10, method: 'GET',  path: '/api/health',                auth: false },
  { name: 'plans',         weight: 5,  method: 'GET',  path: '/api/payments/plans',        auth: false },
  { name: 'notifications', weight: 20, method: 'GET',  path: '/api/notifications?limit=20', auth: true },
  { name: 'workspaces',    weight: 15, method: 'GET',  path: '/api/workspaces',            auth: true },
  { name: 'reality_map',   weight: 10, method: 'GET',  path: '/api/reality-map',           auth: true },
  { name: 'reputation',    weight: 10, method: 'GET',  path: '/api/community/reputation',  auth: true },
  { name: 'marketplace',   weight: 15, method: 'GET',  path: '/api/community/marketplace', auth: true },
  { name: 'seasons',       weight: 5,  method: 'GET',  path: '/api/community/seasons',     auth: true },
  { name: 'temporal',      weight: 10, method: 'GET',  path: '/api/temporal/config',       auth: true },
];

const weightedPool = SCENARIOS.flatMap(s => Array(s.weight).fill(s));

// ─── Metrics collection ─────────────────────
const metrics = {
  requests: 0,
  successes: 0,
  failures: 0,
  rateLimited: 0,
  timeouts: 0,
  latencies: [],
  byScenario: {},
  byStatus: {},
  errors: {},
  startTime: 0,
  endTime: 0,
};

function record({ scenario, status, ms, error }) {
  metrics.requests++;
  metrics.latencies.push(ms);

  metrics.byScenario[scenario] = metrics.byScenario[scenario] || { count: 0, totalMs: 0, failures: 0, max: 0 };
  const s = metrics.byScenario[scenario];
  s.count++;
  s.totalMs += ms;
  if (ms > s.max) s.max = ms;

  if (status) {
    metrics.byStatus[status] = (metrics.byStatus[status] || 0) + 1;
    if (status === 429) metrics.rateLimited++;
    else if (status >= 200 && status < 400) metrics.successes++;
    else { metrics.failures++; s.failures++; }
  } else {
    metrics.failures++;
    s.failures++;
    if (error === 'timeout') metrics.timeouts++;
    metrics.errors[error] = (metrics.errors[error] || 0) + 1;
  }
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

// ─── Single request ─────────────────────────
async function fireRequest(scenario) {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (scenario.auth && TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

    const res = await fetch(`${BASE_URL}${scenario.path}`, {
      method: scenario.method,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timer);
    // Drain the body so the connection is properly released
    await res.text().catch(() => {});
    record({ scenario: scenario.name, status: res.status, ms: Date.now() - start });
  } catch (e) {
    clearTimeout(timer);
    const error = e.name === 'AbortError' ? 'timeout' : (e.cause?.code || e.message || 'unknown');
    record({ scenario: scenario.name, status: null, ms: Date.now() - start, error });
  }
}

// ─── Virtual user loop ──────────────────────
async function virtualUser(stopAt) {
  while (Date.now() < stopAt) {
    const scenario = weightedPool[Math.floor(Math.random() * weightedPool.length)];
    await fireRequest(scenario);
    // Think time — real users pause between actions
    await new Promise(r => setTimeout(r, 200 + Math.random() * 800));
  }
}

// ─── Live progress ──────────────────────────
function startProgress(stopAt) {
  let lastRequests = 0;
  return setInterval(() => {
    const elapsed = ((Date.now() - metrics.startTime) / 1000).toFixed(0);
    const remaining = Math.max(0, ((stopAt - Date.now()) / 1000)).toFixed(0);
    const rps = metrics.requests - lastRequests;
    lastRequests = metrics.requests;
    const errRate = metrics.requests ? ((metrics.failures / metrics.requests) * 100).toFixed(1) : '0.0';
    process.stdout.write(
      `\r  ⏱  ${elapsed}s elapsed · ${remaining}s left · ${rps} req/s · ` +
      `${metrics.requests} total · ${errRate}% errors · ${metrics.rateLimited} rate-limited   `
    );
  }, 1000);
}

// ─── Report ─────────────────────────────────
function report() {
  const durationSec = (metrics.endTime - metrics.startTime) / 1000;
  const sorted = [...metrics.latencies].sort((a, b) => a - b);
  const rps = metrics.requests / durationSec;
  const errorRate = metrics.requests ? metrics.failures / metrics.requests : 0;

  const p50 = percentile(sorted, 50);
  const p95 = percentile(sorted, 95);
  const p99 = percentile(sorted, 99);
  const avg = sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0;

  console.log('\n\n' + '═'.repeat(62));
  console.log('  LOAD TEST RESULTS');
  console.log('═'.repeat(62));
  console.log(`  Target:       ${BASE_URL}`);
  console.log(`  Virtual users: ${USERS} (ramped over ${RAMP_UP}s)`);
  console.log(`  Duration:     ${durationSec.toFixed(1)}s`);
  console.log(`  Authenticated: ${TOKEN ? 'yes' : 'NO — auth routes will 401'}`);
  console.log('');
  console.log('  THROUGHPUT');
  console.log(`    Requests:      ${metrics.requests}`);
  console.log(`    Throughput:    ${rps.toFixed(1)} req/s`);
  console.log(`    Successes:     ${metrics.successes}`);
  console.log(`    Failures:      ${metrics.failures} (${(errorRate * 100).toFixed(2)}%)`);
  console.log(`    Rate limited:  ${metrics.rateLimited}`);
  console.log(`    Timeouts:      ${metrics.timeouts}`);
  console.log('');
  console.log('  LATENCY');
  console.log(`    Average:  ${avg.toFixed(0)}ms`);
  console.log(`    p50:      ${p50}ms`);
  console.log(`    p95:      ${p95}ms`);
  console.log(`    p99:      ${p99}ms`);
  console.log(`    Max:      ${sorted[sorted.length - 1] || 0}ms`);
  console.log('');

  console.log('  BY ENDPOINT');
  Object.entries(metrics.byScenario)
    .sort((a, b) => (b[1].totalMs / b[1].count) - (a[1].totalMs / a[1].count))
    .forEach(([name, s]) => {
      const avgMs = (s.totalMs / s.count).toFixed(0);
      const flag = avgMs > 1000 ? ' ⚠️  SLOW' : '';
      console.log(`    ${name.padEnd(16)} ${String(s.count).padStart(5)} reqs · avg ${String(avgMs).padStart(5)}ms · max ${String(s.max).padStart(5)}ms · ${s.failures} failed${flag}`);
    });

  if (Object.keys(metrics.byStatus).length) {
    console.log('\n  STATUS CODES');
    Object.entries(metrics.byStatus).sort().forEach(([code, count]) => {
      console.log(`    ${code}: ${count}`);
    });
  }

  if (Object.keys(metrics.errors).length) {
    console.log('\n  NETWORK ERRORS');
    Object.entries(metrics.errors).forEach(([err, count]) => {
      console.log(`    ${err}: ${count}`);
    });
  }

  // ─── Verdict against explicit thresholds ──
  console.log('\n' + '─'.repeat(62));
  console.log('  VERDICT');
  const checks = [
    { name: 'Error rate under 1%',   pass: errorRate < 0.01,  actual: `${(errorRate * 100).toFixed(2)}%` },
    { name: 'p95 latency under 500ms', pass: p95 < 500,       actual: `${p95}ms` },
    { name: 'p99 latency under 2s',    pass: p99 < 2000,      actual: `${p99}ms` },
    { name: 'No timeouts',             pass: metrics.timeouts === 0, actual: `${metrics.timeouts}` },
  ];
  checks.forEach(c => {
    console.log(`    ${c.pass ? '✅' : '❌'} ${c.name.padEnd(28)} (${c.actual})`);
  });

  const allPass = checks.every(c => c.pass);
  console.log('');
  if (allPass) {
    console.log(`  \x1b[32m✅ HEALTHY at ${USERS} concurrent users (${rps.toFixed(0)} req/s)\x1b[0m`);
  } else {
    console.log(`  \x1b[33m⚠️  DEGRADED at ${USERS} concurrent users — see failed checks above\x1b[0m`);
    console.log('     Try a lower --users value to find the safe ceiling.');
  }
  console.log('═'.repeat(62) + '\n');

  return allPass;
}

// ─── Main ───────────────────────────────────
async function main() {
  console.log('\n\x1b[1m🔥 NexusAI Load Test\x1b[0m');
  console.log(`   ${USERS} users · ${DURATION}s · ramping over ${RAMP_UP}s → ${BASE_URL}\n`);

  // Fail fast if the target is not reachable
  try {
    const probe = await fetch(`${BASE_URL}/api/payments/plans`, { signal: AbortSignal.timeout(5000) });
    console.log(`   Target reachable (HTTP ${probe.status})\n`);
  } catch (e) {
    console.error(`\x1b[31m❌ Cannot reach ${BASE_URL} — is the server running?\x1b[0m`);
    console.error(`   ${e.message}\n`);
    process.exit(1);
  }

  if (!TOKEN) {
    console.log('   \x1b[33m⚠️  No token supplied — authenticated endpoints will return 401.\x1b[0m');
    console.log('   \x1b[33m   Pass --token=<jwt> for a realistic run.\x1b[0m\n');
  }

  metrics.startTime = Date.now();
  const stopAt = metrics.startTime + DURATION * 1000;
  const progress = startProgress(stopAt);

  // Ramp users in gradually rather than all at once
  const workers = [];
  const rampDelay = (RAMP_UP * 1000) / USERS;
  for (let i = 0; i < USERS; i++) {
    workers.push(
      new Promise(resolve => {
        setTimeout(() => virtualUser(stopAt).then(resolve), i * rampDelay);
      })
    );
  }

  await Promise.all(workers);
  clearInterval(progress);
  metrics.endTime = Date.now();

  const healthy = report();
  process.exit(healthy ? 0 : 1);
}

main().catch(e => {
  console.error('\n❌ Load test crashed:', e.message);
  process.exit(1);
});