#!/usr/bin/env node
// ============================================================
// 🧪 tests/unit.js — Real Unit Tests
// Tests BUSINESS LOGIC CORRECTNESS, not just "does it attach".
// Covers: edge cases, failure modes, boundary conditions,
// concurrency, and the invariants each service must uphold.
// Run: node tests/unit.js
// ============================================================

let passed = 0, failed = 0;
const failures = [];

function assert(condition, name, detail) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    failures.push({ name, detail });
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function assertEqual(actual, expected, name) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  assert(ok, name, ok ? '' : `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function assertThrows(fn, name, expectedMessage) {
  try {
    fn();
    assert(false, name, 'expected a throw but none occurred');
  } catch (e) {
    if (expectedMessage && !e.message.includes(expectedMessage)) {
      assert(false, name, `wrong error: ${e.message}`);
    } else {
      assert(true, name);
    }
  }
}

async function assertRejects(fn, name, expectedMessage) {
  try {
    await fn();
    assert(false, name, 'expected a rejection but none occurred');
  } catch (e) {
    if (expectedMessage && !e.message.includes(expectedMessage)) {
      assert(false, name, `wrong error: ${e.message}`);
    } else {
      assert(true, name);
    }
  }
}

function section(title) {
  console.log(`\n\x1b[36m── ${title} ${'─'.repeat(Math.max(0, 50 - title.length))}\x1b[0m`);
}

// ════════════════════════════════════════════
// 1. VALIDATION — input boundary correctness
// ════════════════════════════════════════════
function testValidation() {
  section('Validation: boundaries & rejection');
  const { v, validate, ValidationError, schemas } = require('../dist/security/validation');

  // String bounds
  assertThrows(
    () => validate({ name: '' }, { name: v.string({ min: 1 }) }),
    'rejects empty string when min=1'
  );
  assertThrows(
    () => validate({ name: 'x'.repeat(200) }, { name: v.string({ max: 100 }) }),
    'rejects string over max length'
  );
  assertEqual(
    validate({ name: '  hello  ' }, { name: v.string({ min: 1 }) }),
    { name: 'hello' },
    'trims whitespace by default'
  );

  // Number bounds
  assertThrows(
    () => validate({ n: 'abc' }, { n: v.number() }),
    'rejects non-numeric string'
  );
  assertThrows(
    () => validate({ n: 1.5 }, { n: v.number({ integer: true }) }),
    'rejects float when integer required'
  );
  assertThrows(
    () => validate({ n: Infinity }, { n: v.number() }),
    'rejects Infinity'
  );
  assertEqual(
    validate({ n: '42' }, { n: v.number() }),
    { n: 42 },
    'coerces numeric string to number'
  );

  // Boundary values are inclusive
  assertEqual(
    validate({ n: 10 }, { n: v.number({ min: 10, max: 10 }) }),
    { n: 10 },
    'min and max boundaries are inclusive'
  );

  // Email
  assertThrows(() => validate({ e: 'not-an-email' }, { e: v.email() }), 'rejects malformed email');
  assertThrows(() => validate({ e: 'a@b' }, { e: v.email() }), 'rejects email without TLD');
  assertEqual(
    validate({ e: '  USER@EXAMPLE.COM ' }, { e: v.email() }),
    { e: 'user@example.com' },
    'normalises email to lowercase and trims'
  );

  // Enum
  assertThrows(
    () => validate({ p: 'enterprise' }, { p: v.plan() }),
    'rejects value outside enum'
  );
  assertEqual(validate({ p: 'pro' }, { p: v.plan() }), { p: 'pro' }, 'accepts valid enum value');

  // Optional + defaults
  assertEqual(
    validate({}, { limit: { validator: v.number(), optional: true, default: 50 } }),
    { limit: 50 },
    'applies default for missing optional field'
  );
  assertEqual(
    validate({ limit: 10 }, { limit: { validator: v.number(), optional: true, default: 50 } }),
    { limit: 10 },
    'provided value overrides default'
  );

  // Required
  assertThrows(
    () => validate({}, { required: v.string() }),
    'rejects missing required field'
  );
  assertThrows(
    () => validate({ required: null }, { required: v.string() }),
    'treats null as missing for required field'
  );

  // Object size guards
  assertThrows(
    () => validate({ o: { huge: 'x'.repeat(600000) } }, { o: v.object({ maxBytes: 1000 }) }),
    'rejects oversized object'
  );
  assertThrows(
    () => validate({ o: [] }, { o: v.object() }),
    'rejects array where object expected'
  );

  // Array element validation
  assertThrows(
    () => validate({ tags: ['ok', 123] }, { tags: v.array({ of: v.string() }) }),
    'rejects array with wrong element type'
  );

  // URL protocol restriction
  assertThrows(
    () => validate({ u: 'javascript:alert(1)' }, { u: v.url() }),
    'rejects javascript: URL (XSS vector)'
  );
  assertThrows(
    () => validate({ u: 'file:///etc/passwd' }, { u: v.url() }),
    'rejects file: URL (LFI vector)'
  );

  // Unknown keys are stripped by default
  assertEqual(
    validate({ name: 'x', evil: 'payload' }, { name: v.string() }),
    { name: 'x' },
    'strips unknown keys (mass-assignment protection)'
  );

  // Real schema
  assertThrows(
    () => validate({ kind: 'malware', title: 'x', content: {} }, schemas.marketplacePublish),
    'marketplace schema rejects invalid kind'
  );
  assertThrows(
    () => validate({ kind: 'workflow', title: 'ab', content: {} }, schemas.marketplacePublish),
    'marketplace schema rejects short title'
  );

  // Error shape is machine-readable
  try {
    validate({}, { a: v.string(), b: v.number() });
  } catch (e) {
    assert(e instanceof ValidationError, 'throws ValidationError instance');
    assert(Array.isArray(e.errors) && e.errors.length === 2, 'reports all failing fields, not just the first');
    assert(e.statusCode === 400, 'carries a 400 status code');
  }
}

// ════════════════════════════════════════════
// 2. CSRF — signature and tamper resistance
// ════════════════════════════════════════════
function testCSRF() {
  section('CSRF: signing & tamper resistance');
  const { CSRFProtection } = require('../dist/security/hardening');
  const csrf = new CSRFProtection({ secret: 'test-secret-for-unit-tests' });

  const token = csrf.issue('user-42');
  assert(typeof token === 'string' && token.split('.').length === 4, 'issues a 4-part token');
  assert(csrf.verify(token, 'user-42'), 'verifies its own valid token');

  // Session binding
  assert(!csrf.verify(token, 'user-99'), 'rejects token used by a different session');

  // Tampering
  const parts = token.split('.');
  const tamperedSig = [parts[0], parts[1], parts[2], 'deadbeef'.repeat(8)].join('.');
  assert(!csrf.verify(tamperedSig, 'user-42'), 'rejects token with forged signature');

  const tamperedExpiry = [parts[0], parts[1], String(Date.now() + 999999999), parts[3]].join('.');
  assert(!csrf.verify(tamperedExpiry, 'user-42'), 'rejects token with extended expiry');

  // Expiry enforcement
  const shortLived = new CSRFProtection({ secret: 'test-secret-for-unit-tests', ttlMs: -1000 });
  const expired = shortLived.issue('user-42');
  assert(!shortLived.verify(expired, 'user-42'), 'rejects expired token');

  // Malformed input never throws
  assert(!csrf.verify(null, 'user-42'), 'handles null token safely');
  assert(!csrf.verify('', 'user-42'), 'handles empty token safely');
  assert(!csrf.verify('a.b', 'user-42'), 'handles truncated token safely');
  assert(!csrf.verify({ evil: true }, 'user-42'), 'handles non-string token safely');

  // Different secrets must not cross-validate
  const other = new CSRFProtection({ secret: 'a-completely-different-secret' });
  assert(!other.verify(token, 'user-42'), 'token from one secret fails under another');

  // Tokens are unique per issue
  const t1 = csrf.issue('user-1');
  const t2 = csrf.issue('user-1');
  assert(t1 !== t2, 'issues a unique nonce each time');
}

// ════════════════════════════════════════════
// 3. RATE LIMITING — the actual limiting logic
// ════════════════════════════════════════════
function testRateLimiter() {
  section('Rate limiting: enforcement & tiers');
  const { TieredRateLimiter, TIER_LIMITS } = require('../dist/security/hardening');
  const rl = new TieredRateLimiter({});

  // Burst protection fires first: it guards the 5-second window,
  // which is a distinct protection from the per-minute allowance.
  const burstLimit = TIER_LIMITS.free.burst;
  let burstResult;
  for (let i = 0; i < burstLimit; i++) {
    burstResult = rl.checkRate({ key: 'test-burst', tier: 'free' });
  }
  assert(burstResult.allowed, `allows exactly ${burstLimit} requests inside the burst window`);
  const overBurst = rl.checkRate({ key: 'test-burst', tier: 'free' });
  assert(!overBurst.allowed, 'blocks the request that exceeds the burst window');
  assertEqual(overBurst.reason, 'burst_limit', 'reports burst_limit as the reason');
  assert(overBurst.retry_after_seconds > 0, 'provides Retry-After guidance');

  // Burst must be lower than the per-minute rate, otherwise it is meaningless;
  // and it must be high enough that a normal page load is not blocked.
  Object.entries(TIER_LIMITS).forEach(([tier, limits]) => {
    assert(
      limits.burst < limits.requests_per_min,
      `${tier}: burst is below the per-minute limit`
    );
  });
  assert(TIER_LIMITS.free.burst >= 10, 'free burst allows a normal dashboard load (>=10 parallel calls)');

  // Per-minute limiting: verified directly against the sliding window,
  // bypassing the burst guard so the two protections are tested independently.
  const minuteTest = new TieredRateLimiter({});
  const perMin = TIER_LIMITS.free.requests_per_min;
  const now = Date.now();
  // Seed the window with timestamps spread across the minute (no burst).
  minuteTest.windows.set(
    'spread',
    Array.from({ length: perMin }, (_, i) => now - 50000 + i * 100)
  );
  const atLimit = minuteTest.checkRate({ key: 'spread', tier: 'free' });
  assert(!atLimit.allowed, `blocks once ${perMin} requests exist in the minute window`);
  assertEqual(atLimit.reason, 'rate_limit', 'reports rate_limit for the per-minute breach');
  minuteTest.stop();

  // Tiers are isolated from one another
  const proResult = rl.checkRate({ key: 'test-pro', tier: 'pro' });
  assert(proResult.allowed, 'pro tier unaffected by free tier exhaustion');
  assert(proResult.limit > TIER_LIMITS.free.requests_per_min, 'pro tier has a strictly higher limit');

  // Keys are isolated
  const otherUser = rl.checkRate({ key: 'test-free-other', tier: 'free' });
  assert(otherUser.allowed, 'one user hitting the limit does not block another');

  // Remaining counts down correctly
  const fresh = new TieredRateLimiter({});
  const r1 = fresh.checkRate({ key: 'k', tier: 'pro' });
  const r2 = fresh.checkRate({ key: 'k', tier: 'pro' });
  assert(r2.remaining === r1.remaining - 1, 'remaining decrements by exactly one per request');

  // Daily quota
  const q = new TieredRateLimiter({});
  const freeQuota = TIER_LIMITS.free.ai_calls_per_day;
  let lastQuota;
  for (let i = 0; i < freeQuota; i++) {
    lastQuota = q.checkDailyQuota({ key: 'quota-test', tier: 'free' });
  }
  assert(lastQuota.allowed, `allows exactly ${freeQuota} AI calls/day on free`);
  const overQuota = q.checkDailyQuota({ key: 'quota-test', tier: 'free' });
  assert(!overQuota.allowed, 'blocks AI call beyond the daily quota');
  assert(overQuota.resets_at > Date.now(), 'quota reset time is in the future');

  // Unlimited tiers never block
  const elite = q.checkDailyQuota({ key: 'elite-test', tier: 'elite' });
  assert(elite.allowed && elite.unlimited, 'elite tier has unlimited AI quota');

  // Unknown tier falls back to the safest limits
  const unknown = q.checkDailyQuota({ key: 'unknown-test', tier: 'nonexistent-tier' });
  assert(unknown.limit === TIER_LIMITS.free.ai_calls_per_day, 'unknown tier defaults to free limits (fail-safe)');

  // Concurrency guard
  const c = new TieredRateLimiter({});
  const slots = [];
  for (let i = 0; i < TIER_LIMITS.free.concurrent; i++) {
    slots.push(c.acquireSlot({ key: 'conc', tier: 'free' }));
  }
  assert(slots.every(s => s.allowed), 'grants concurrent slots up to the limit');
  const denied = c.acquireSlot({ key: 'conc', tier: 'free' });
  assert(!denied.allowed, 'denies a slot beyond the concurrency limit');

  // Releasing frees capacity
  c.releaseSlot('conc');
  const afterRelease = c.acquireSlot({ key: 'conc', tier: 'free' });
  assert(afterRelease.allowed, 'releasing a slot frees capacity');

  // Release below zero must not corrupt state
  const c2 = new TieredRateLimiter({});
  c2.releaseSlot('never-acquired');
  c2.releaseSlot('never-acquired');
  const stillWorks = c2.acquireSlot({ key: 'never-acquired', tier: 'free' });
  assert(stillWorks.allowed, 'over-releasing does not corrupt the counter');

  rl.stop(); fresh.stop(); q.stop(); c.stop(); c2.stop();
}

// ════════════════════════════════════════════
// 4. SEMANTIC CACHE — similarity correctness
// ════════════════════════════════════════════
async function testSemanticCache() {
  section('Semantic cache: similarity & correctness');
  const { SemanticCache } = require('../dist/services/semantic-cache');

  const store = new Map();
  const fakeCache = {
    get: async (k) => store.get(JSON.stringify(k)) ?? null,
    set: async (k, val) => { store.set(JSON.stringify(k), val); },
  };
  const sc = new SemanticCache({ cache: fakeCache, similarityThreshold: 0.85 });

  // Identical strings are perfectly similar
  assert(sc._similarity('the quick brown fox', 'the quick brown fox') === 1, 'identical text scores 1.0');

  // Completely different text scores 0
  assert(sc._similarity('alpha beta gamma', 'xxx yyy zzz') === 0, 'disjoint text scores 0.0');

  // Similarity is symmetric
  const a = sc._similarity('machine learning models', 'learning machine models');
  const b = sc._similarity('learning machine models', 'machine learning models');
  assert(a === b, 'similarity is symmetric');

  // Normalisation ignores case and punctuation
  assert(
    sc._normalize('Hello, World!') === sc._normalize('hello world'),
    'normalisation strips case and punctuation'
  );

  // Different tasks must NOT share a cache key — critical correctness property
  const k1 = sc._exactKey({ prompt: 'summarise this', task: 'summary' });
  const k2 = sc._exactKey({ prompt: 'summarise this', task: 'code' });
  assert(k1 !== k2, 'same prompt under different tasks yields different keys');

  // Different system prompts must not collide
  const k3 = sc._exactKey({ prompt: 'x', system: 'You are helpful' });
  const k4 = sc._exactKey({ prompt: 'x', system: 'You are terse' });
  assert(k3 !== k4, 'different system prompts yield different keys');

  // JSON mode must not collide with text mode
  const k5 = sc._exactKey({ prompt: 'x', json: true });
  const k6 = sc._exactKey({ prompt: 'x', json: false });
  assert(k5 !== k6, 'JSON and text modes yield different keys');

  // Same input is deterministic
  assert(
    sc._exactKey({ prompt: 'stable', task: 'general' }) === sc._exactKey({ prompt: 'stable', task: 'general' }),
    'key generation is deterministic'
  );

  // Non-cacheable requests bypass the cache entirely
  const miss = await sc.lookup({ prompt: 'anything', cacheable: false });
  assert(miss === null, 'non-cacheable request returns null without lookup');

  // Store then retrieve
  await sc.store({ prompt: 'what is the capital of France', task: 'general', cacheable: true }, { output: 'Paris' });
  const hit = await sc.lookup({ prompt: 'what is the capital of France', task: 'general', cacheable: true });
  assert(hit?.output === 'Paris', 'exact match retrieves the stored value');
  assert(hit?.cached === 'exact', 'exact hit is labelled correctly');

  // A cross-task lookup must miss even with identical text
  const crossTask = await sc.lookup({ prompt: 'what is the capital of France', task: 'code', cacheable: true });
  assert(crossTask === null, 'cross-task lookup does not return a stale answer');

  // Stats stay coherent
  const stats = sc.getStats();
  assert(stats.hits + stats.misses === stats.total, 'hits + misses equals total');
  assert(stats.hit_rate >= 0 && stats.hit_rate <= 1, 'hit rate is a valid ratio');

  // Reset clears everything
  sc.reset();
  assert(sc.getStats().total === 0 && sc.getStats().index_size === 0, 'reset clears stats and index');
}

// ════════════════════════════════════════════
// 5. LOCAL LLM — routing decision logic
// ════════════════════════════════════════════
function testLocalLLM() {
  section('Local LLM: routing decisions & fail-safety');
  const { LocalLLM } = require('../dist/services/local-llm');

  const llm = new LocalLLM({ enabled: false });

  // Disabled must never route locally, whatever the input
  assert(!llm.shouldRouteLocal({ task: 'general' }), 'disabled LLM never routes locally');
  assert(!llm.shouldRouteLocal({ task: 'general', forceLocal: true }), 'forceLocal cannot override a disabled LLM');

  // Enabled but unreachable must not route
  llm.enabled = true;
  llm.available = false;
  assert(!llm.shouldRouteLocal({ task: 'general' }), 'unavailable LLM does not route (prevents hangs)');

  // Enabled and available routes only eligible tasks
  llm.available = true;
  assert(llm.shouldRouteLocal({ task: 'summary' }), 'routes an eligible task locally');
  assert(!llm.shouldRouteLocal({ task: 'reasoning-deep' }), 'does not route heavy reasoning to a small local model');

  // forceCloud always wins — the strongest guarantee
  assert(!llm.shouldRouteLocal({ task: 'summary', forceCloud: true }), 'forceCloud overrides local routing');

  // Circuit-breaking after repeated failures
  llm.consecutiveFailures = llm.maxFailures;
  assert(!llm.shouldRouteLocal({ task: 'summary' }), 'stops routing locally after repeated failures');
  llm.consecutiveFailures = 0;

  // forceLocal can route a normally-ineligible task
  assert(llm.shouldRouteLocal({ task: 'reasoning-deep', forceLocal: true }), 'forceLocal routes an ineligible task');

  // Model selection degrades gracefully with nothing installed
  llm.installedModels = [];
  assert(typeof llm.pickModel('general') === 'string', 'pickModel returns a string even with no models installed');

  llm.installedModels = ['qwen2.5-coder:7b'];
  assert(llm.pickModel('code') === 'qwen2.5-coder:7b', 'picks the code-specialised model for code tasks');

  // Status shape is stable for the dashboard
  const status = llm.getStatus();
  assert(typeof status.enabled === 'boolean', 'status.enabled is boolean');
  assert(Array.isArray(status.installed_models), 'status.installed_models is an array');
  assert(status.stats.success_rate >= 0 && status.stats.success_rate <= 1, 'success rate is a valid ratio');
}

// ════════════════════════════════════════════
// 6. TEMPORAL UX — time-block boundaries
// ════════════════════════════════════════════
function testTemporalUX() {
  section('Temporal UX: time-block boundaries');
  const { TemporalUX } = require('../dist/services/temporal-ux');
  const t = new TemporalUX({ db: null });

  const at = (hour) => {
    const d = new Date();
    d.setHours(hour, 0, 0, 0);
    return t.detectContext(1, d.getTime());
  };

  assertEqual(at(3).block, 'late_night', '03:00 is late_night');
  assertEqual(at(7).block, 'morning', '07:00 is morning');
  assertEqual(at(10).block, 'peak_morning', '10:00 is peak_morning');
  assertEqual(at(13).block, 'midday', '13:00 is midday');
  assertEqual(at(16).block, 'afternoon', '16:00 is afternoon');
  assertEqual(at(20).block, 'evening', '20:00 is evening');
  assertEqual(at(23).block, 'late_night', '23:00 is late_night');

  // Every hour of the day must map to a valid block — no gaps
  const validBlocks = ['late_night', 'morning', 'peak_morning', 'midday', 'afternoon', 'evening'];
  let allValid = true;
  for (let h = 0; h < 24; h++) {
    if (!validBlocks.includes(at(h).block)) { allValid = false; break; }
  }
  assert(allValid, 'all 24 hours map to a valid block (no gaps)');

  // Every block must yield a usable config
  let allConfigured = true;
  for (let h = 0; h < 24; h++) {
    const d = new Date(); d.setHours(h, 0, 0, 0);
    const cfg = t.getAdaptiveConfig(1, d.getTime());
    if (!cfg.config?.mode || !Array.isArray(cfg.config?.suggestions)) { allConfigured = false; break; }
  }
  assert(allConfigured, 'every hour produces a complete adaptive config');

  // Deep work is not recommended at 3am — a real product invariant
  const night = (() => { const d = new Date(); d.setHours(3, 0, 0, 0); return t.getAdaptiveConfig(1, d.getTime()); })();
  assert(night.config.deep_work_recommended === false, 'does not recommend deep work at 3am');
}

// ════════════════════════════════════════════
// 7. COMMUNITY — reputation & marketplace rules
// ════════════════════════════════════════════
function testCommunity() {
  section('Community: reputation ranks & marketplace rules');
  const { REPUTATION_RANKS, SEASONS } = require('../services/community');

  // Ranks must be strictly ascending — otherwise lookup breaks
  let ascending = true;
  for (let i = 1; i < REPUTATION_RANKS.length; i++) {
    if (REPUTATION_RANKS[i].min <= REPUTATION_RANKS[i - 1].min) { ascending = false; break; }
  }
  assert(ascending, 'reputation ranks have strictly ascending thresholds');
  assert(REPUTATION_RANKS[0].min === 0, 'lowest rank starts at 0 (every user has a rank)');

  // Rank resolution logic
  const rankFor = (pts) => [...REPUTATION_RANKS].reverse().find(r => pts >= r.min);
  assertEqual(rankFor(0).name, 'Operator', '0 points resolves to Operator');
  assertEqual(rankFor(99).name, 'Operator', '99 points is still Operator');
  assertEqual(rankFor(100).name, 'Builder', '100 points promotes to Builder');
  assertEqual(rankFor(999999).name, 'Legendary', 'very high points resolves to Legendary');

  // Seasons cover the calendar exactly once
  assert(SEASONS.length === 12, 'exactly 12 seasons defined');
  const months = SEASONS.map(s => s.month).sort((a, b) => a - b);
  assertEqual(months, [1,2,3,4,5,6,7,8,9,10,11,12], 'seasons cover months 1-12 with no gaps or duplicates');
  assert(SEASONS.every(s => s.id && s.name && s.theme), 'every season has id, name, and theme');
  assert(new Set(SEASONS.map(s => s.id)).size === 12, 'all season ids are unique');
}

// ════════════════════════════════════════════
// 8. PAYMENTS — plan invariants
// ════════════════════════════════════════════
function testPayments() {
  section('Payments: plan invariants');
  const { PLANS } = require('../services/payments');

  assert(PLANS.free.price === 0, 'free plan costs nothing');
  assert(PLANS.free.stripe_price_id === null, 'free plan has no Stripe price id');

  // Price must increase with tier
  assert(PLANS.pro.price < PLANS.elite.price, 'elite costs more than pro');
  assert(PLANS.elite.price < PLANS.team.price, 'team costs more than elite');

  // Quota must not decrease as price increases
  const quotaOf = (p) => p.quota_per_day === -1 ? Infinity : p.quota_per_day;
  assert(quotaOf(PLANS.free) < quotaOf(PLANS.pro), 'pro quota exceeds free quota');
  assert(quotaOf(PLANS.pro) < quotaOf(PLANS.elite), 'elite quota exceeds pro quota');

  // Every plan is well-formed
  const allValid = Object.values(PLANS).every(p =>
    p.id && p.name && typeof p.price === 'number' && Array.isArray(p.features)
  );
  assert(allValid, 'every plan has id, name, numeric price, and feature list');

  // Paid plans need a configured price id to be purchasable
  const paid = ['pro', 'elite', 'team'];
  assert(
    paid.every(id => 'stripe_price_id' in PLANS[id]),
    'every paid plan declares a stripe_price_id field'
  );
}

// ════════════════════════════════════════════
// 9. EMBEDDINGS — vector maths correctness
// ════════════════════════════════════════════
function testEmbeddings() {
  section('Embeddings: cosine similarity correctness');
  const { EmbeddingsService } = require('../services/embeddings');
  const e = new EmbeddingsService({ db: null, openai: null });

  const vec = (arr) => new Float32Array(arr);
  const norm = (arr) => Math.sqrt(arr.reduce((s, x) => s + x * x, 0));

  // Identical vectors → 1
  const a = [1, 2, 3, 4];
  const sim1 = e._cosineWithNorms(vec(a), vec(a), norm(a), norm(a));
  assert(Math.abs(sim1 - 1) < 1e-6, 'identical vectors have cosine similarity 1');

  // Orthogonal vectors → 0
  const o1 = [1, 0], o2 = [0, 1];
  const sim2 = e._cosineWithNorms(vec(o1), vec(o2), norm(o1), norm(o2));
  assert(Math.abs(sim2) < 1e-6, 'orthogonal vectors have cosine similarity 0');

  // Opposite vectors → -1
  const p = [1, 2, 3], n = [-1, -2, -3];
  const sim3 = e._cosineWithNorms(vec(p), vec(n), norm(p), norm(n));
  assert(Math.abs(sim3 + 1) < 1e-6, 'opposite vectors have cosine similarity -1');

  // Scale invariance — the defining property of cosine similarity
  const base = [1, 2, 3], scaled = [10, 20, 30];
  const sim4 = e._cosineWithNorms(vec(base), vec(scaled), norm(base), norm(scaled));
  assert(Math.abs(sim4 - 1) < 1e-6, 'cosine similarity is scale-invariant');

  // The optimised path must agree with the naive one
  const x = [0.1, 0.5, -0.3, 0.8, 0.2], y = [0.2, 0.4, -0.1, 0.7, 0.3];
  const naive = e._cosine(vec(x), vec(y));
  const optimised = e._cosineWithNorms(vec(x), vec(y), norm(x), norm(y));
  assert(Math.abs(naive - optimised) < 1e-6, 'optimised similarity matches the naive implementation');

  // The unrolled loop must be correct at every length mod 4
  let unrollCorrect = true;
  for (let len = 1; len <= 9; len++) {
    const u = Array.from({ length: len }, (_, i) => Math.sin(i + 1));
    const w = Array.from({ length: len }, (_, i) => Math.cos(i + 1));
    const nv = e._cosine(vec(u), vec(w));
    const op = e._cosineWithNorms(vec(u), vec(w), norm(u), norm(w));
    if (Math.abs(nv - op) > 1e-6) { unrollCorrect = false; break; }
  }
  assert(unrollCorrect, 'unrolled loop is correct for all vector lengths (mod 4 remainders)');

  // Zero vectors must not produce NaN
  const zero = [0, 0, 0];
  const simZero = e._cosine(vec(zero), vec([1, 2, 3]));
  assert(!Number.isNaN(simZero) && simZero === 0, 'zero vector yields 0, not NaN');
}

// ════════════════════════════════════════════
// 10. AI TWIN — pattern key stability
// ════════════════════════════════════════════
function testAITwin() {
  section('AI Twin: pattern key generation');
  const { AITwin } = require('../dist/services/ai-twin');
  const twin = new AITwin({ db: null });

  // Deterministic for identical input
  const k1 = twin._patternKey('ai.call', { feature: 'chat' });
  const k2 = twin._patternKey('ai.call', { feature: 'chat' });
  assert(k1 === k2, 'pattern key is deterministic');

  // Key order in context must not change the result
  const k3 = twin._patternKey('x', { a: 1, b: 2 });
  const k4 = twin._patternKey('x', { b: 2, a: 1 });
  assert(k3 === k4, 'context key order does not affect the pattern key');

  // Different actions produce different keys
  assert(
    twin._patternKey('action.a', {}) !== twin._patternKey('action.b', {}),
    'different actions produce different keys'
  );

  // The key encodes a time block
  const blocks = ['night', 'morning', 'afternoon', 'evening'];
  const key = twin._patternKey('test', {});
  assert(blocks.some(b => key.endsWith(`::${b}`)), 'pattern key encodes a time block');

  // Empty and malformed context must be handled without throwing
  assert(typeof twin._patternKey('a', {}) === 'string', 'handles empty context');
  assert(typeof twin._patternKey('a', undefined) === 'string', 'handles undefined context without throwing');
  assert(typeof twin._patternKey('a', null) === 'string', 'handles null context without throwing');
  assert(typeof twin._patternKey('a', 'not-an-object') === 'string', 'handles non-object context without throwing');
}

// ════════════════════════════════════════════
// 11. OBSERVABILITY — secret scrubbing
// ════════════════════════════════════════════
function testObservability() {
  section('Observability: secret scrubbing before egress');
  const { Observability } = require('../dist/monitoring/observability');
  const obs = new Observability({ logger: null, events: null });

  const event = {
    request: {
      headers: {
        authorization: 'Bearer sk-secret-token-value-here',
        'x-api-key': 'super-secret-key-12345678',
        'user-agent': 'Mozilla/5.0',
      },
      data: {
        password: 'hunter2',
        stripe_key: 'sk_live_abcdefghijklmnop',
        username: 'alice',
      },
    },
    extra: { nested: { api_key: 'nested-secret-value-here' } },
  };

  const scrubbed = obs._scrubEvent(JSON.parse(JSON.stringify(event)));

  assert(scrubbed.request.headers.authorization === '[REDACTED]', 'redacts Authorization header');
  assert(scrubbed.request.headers['x-api-key'] === '[REDACTED]', 'redacts x-api-key header');
  assert(scrubbed.request.headers['user-agent'] === 'Mozilla/5.0', 'preserves non-sensitive headers');
  assert(scrubbed.request.data.password === '[REDACTED]', 'redacts password field');
  assert(scrubbed.request.data.stripe_key === '[REDACTED]', 'redacts stripe key');
  assert(scrubbed.request.data.username === 'alice', 'preserves non-sensitive data');
  assert(scrubbed.extra.nested.api_key === '[REDACTED]', 'redacts nested secrets');

  // Must not crash on odd shapes
  assert(obs._scrubEvent({}) !== undefined, 'handles an empty event');
  assert(obs._scrubEvent({ request: null }) !== undefined, 'handles a null request');

  // Status shape is stable
  const status = obs.getStatus();
  assert(typeof status.sentry.configured === 'boolean', 'reports Sentry configuration state');
  assert(typeof status.posthog.configured === 'boolean', 'reports PostHog configuration state');

  // Tracking without a key must not queue unboundedly
  obs.track({ user_id: 1, event: 'test' });
  assert(obs._posthogQueue.length === 0, 'does not queue events when PostHog is unconfigured');
}

// ════════════════════════════════════════════
// 12. PREDICTIVE — prompt template safety
// ════════════════════════════════════════════
function testPredictive() {
  section('Predictive execution: template safety');
  const { PredictiveExecution } = require('../dist/services/predictive-execution');
  const p = new PredictiveExecution({ db: null, aiTwin: null });

  // Unknown actions must not build a prompt — prevents junk AI calls
  assert(p._buildPromptFor('unknown.action', {}) === null, 'unknown action produces no prompt');

  // Known actions produce a bounded prompt
  const prompt = p._buildPromptFor('ai.call', { task: 'code' });
  assert(typeof prompt === 'string' && prompt.length > 0, 'known action produces a prompt');
  assert(prompt.length < 2000, 'prompt stays within a sane size bound');

  // Huge context must be truncated, not passed through
  const huge = { data: 'x'.repeat(100000) };
  const truncated = p._buildPromptFor('ai.call', huge);
  assert(truncated.length < 2000, 'oversized context is truncated before prompting');
}

// ════════════════════════════════════════════
// 13. EVENT BUS — handler contract
// ════════════════════════════════════════════
function testEventBus() {
  section('Event bus: handler contract');
  const { EventBus, EVENTS } = require('../dist/services/event-bus');
  const bus = new EventBus({});

  // Named handlers must receive the payload directly. Passing the
  // envelope instead silently broke 12 subscribers before this was fixed.
  let received = null;
  bus.on('user.thing', (data) => { received = data; });
  bus.emit('user.thing', { user_id: 42, provider: 'openai' });
  assert(received !== null, 'named handler is invoked');
  assertEqual(received.user_id, 42, 'named handler receives the payload directly, not an envelope');
  assertEqual(received.provider, 'openai', 'all payload fields reach the handler');

  // Destructuring in the handler signature must work — this is how
  // notifications.js subscribes.
  let destructured = null;
  bus.on('workspace.member_added', ({ workspace_id, user_id, role }) => {
    destructured = { workspace_id, user_id, role };
  });
  bus.emit('workspace.member_added', { workspace_id: 7, user_id: 3, role: 'admin' });
  assertEqual(destructured, { workspace_id: 7, user_id: 3, role: 'admin' },
    'destructured handler signature receives real values');

  // Metadata arrives as the second argument
  let meta = null;
  bus.on('meta.check', (_data, m) => { meta = m; });
  bus.emit('meta.check', {});
  assert(meta?.name === 'meta.check', 'meta.name identifies the event');
  assert(typeof meta?.ts === 'number', 'meta.ts is a timestamp');
  assert(typeof meta?.id === 'string', 'meta.id is present');

  // Wildcard handlers need the full envelope to know what fired
  let wildcard = null;
  bus.on('*', (event) => { wildcard = event; });
  bus.emit('some.event', { value: 1 });
  assert(wildcard?.name === 'some.event', 'wildcard receives the event name');
  assertEqual(wildcard?.data?.value, 1, 'wildcard receives the nested payload');

  // Unsubscribe
  let count = 0;
  const off = bus.on('counted', () => { count++; });
  bus.emit('counted', {});
  off();
  bus.emit('counted', {});
  assertEqual(count, 1, 'unsubscribe stops further delivery');

  // Double unsubscribe must not throw
  off();
  assert(true, 'unsubscribing twice is safe');

  // once() fires exactly once
  let onceCount = 0;
  bus.once('single', () => { onceCount++; });
  bus.emit('single', {});
  bus.emit('single', {});
  assertEqual(onceCount, 1, 'once() delivers exactly one time');

  // A throwing handler must not stop the others
  const order = [];
  bus.on('resilient', () => { order.push('first'); });
  bus.on('resilient', () => { throw new Error('handler exploded'); });
  bus.on('resilient', () => { order.push('third'); });
  bus.emit('resilient', {});
  assertEqual(order, ['first', 'third'], 'a throwing handler does not block the rest');

  // Unsubscribing during emit must not corrupt iteration
  const fresh = new EventBus({});
  const seen = [];
  const offA = fresh.on('mutate', () => { seen.push('a'); offA(); });
  fresh.on('mutate', () => { seen.push('b'); });
  fresh.emit('mutate', {});
  assertEqual(seen, ['a', 'b'], 'unsubscribing mid-emit still delivers to remaining handlers');

  // History
  const h = new EventBus({ maxHistory: 3 });
  h.emit('e1', {}); h.emit('e2', {}); h.emit('e3', {}); h.emit('e4', {});
  const recent = h.getRecent();
  assertEqual(recent.length, 3, 'history is capped at maxHistory');
  assertEqual(recent[0].name, 'e2', 'oldest entries are evicted first');

  assertEqual(h.getRecent({ name: 'e3' }).length, 1, 'history filters by name');
  assertEqual(h.getRecent({ limit: 2 }).length, 2, 'history respects a limit');

  // Stats
  const s = h.stats();
  assertEqual(s.total_events, 3, 'stats report the buffered event count');
  assert(typeof s.listeners.wildcard === 'number', 'stats report wildcard listener count');

  // Event name constants are unique — a duplicate would route two
  // different concerns to the same subscribers.
  const values = Object.values(EVENTS);
  assertEqual(new Set(values).size, values.length, 'all EVENTS constants are unique');
}

// ════════════════════════════════════════════
// 14. RBAC — fail-closed authorization
// ════════════════════════════════════════════
function testRBAC() {
  section('RBAC: fail-closed authorization');
  const { RBAC, ROLES, PERMISSIONS, ROLE_HIERARCHY } = require('../dist/security/rbac');

  const rbac = new RBAC({ adminEmails: ['Haroun@Gmail.COM', 'admin@nexus.io'] });

  // Admin matching must be case-insensitive on both sides. Comparing a
  // raw configured value against a lowercased address denied admin to
  // anyone whose configured email contained a capital letter.
  assertEqual(rbac.getRole({ email: 'Haroun@Gmail.com' }), ROLES.ADMIN,
    'admin matched regardless of configured casing');
  assertEqual(rbac.getRole({ email: 'haroun@gmail.com' }), ROLES.ADMIN,
    'admin matched regardless of supplied casing');
  assertEqual(rbac.getRole({ email: '  HAROUN@GMAIL.COM  ' }), ROLES.ADMIN,
    'admin matched with surrounding whitespace');

  // Plan-derived roles
  assertEqual(rbac.getRole(null), ROLES.GUEST, 'no user resolves to guest');
  assertEqual(rbac.getRole({ email: 'a@b.com' }), ROLES.USER, 'unknown plan resolves to user');
  assertEqual(rbac.getRole({ email: 'a@b.com', plan: 'pro' }), ROLES.PRO, 'pro plan resolves to pro');
  assertEqual(rbac.getRole({ email: 'a@b.com', plan: 'elite' }), ROLES.PRO, 'elite plan resolves to pro');
  assertEqual(rbac.getRole({ email: 'a@b.com', plan: 'team' }), ROLES.TEAM, 'team plan resolves to team');

  // Permission inheritance
  const proPerms = rbac.getPermissions({ email: 'a@b.com', plan: 'pro' });
  assert(proPerms.includes(PERMISSIONS.AI_GENERATE), 'pro inherits user permissions');
  assert(proPerms.includes(PERMISSIONS.AI_GENERATE_HEAVY), 'pro has its own permissions');
  assert(!proPerms.includes(PERMISSIONS.ADMIN_BACKUP), 'pro does not receive admin permissions');

  const adminPerms = rbac.getPermissions({ email: 'admin@nexus.io' });
  assert(adminPerms.includes(PERMISSIONS.ADMIN_BACKUP), 'admin has admin permissions');
  assert(adminPerms.includes(PERMISSIONS.AI_GENERATE), 'admin inherits everything below');

  const guestPerms = rbac.getPermissions(null);
  assertEqual(guestPerms.length, 0, 'guest has no permissions');

  // Helper to exercise a middleware and report whether it let the
  // request through.
  const runMiddleware = (mw, user) => {
    let passed = false;
    let status = null;
    mw(
      { user, path: '/x', method: 'GET' },
      { status: (code) => { status = code; return { json: () => {} }; } },
      () => { passed = true; }
    );
    return { passed, status };
  };

  // An unknown role must deny. Comparing against `undefined` was always
  // false, so a typo such as requireRole('administrator') let everyone in.
  const unknownRole = runMiddleware(rbac.requireRole('superuser'), { email: 'a@b.com', plan: 'free' });
  assert(!unknownRole.passed, 'unknown role name denies access (fail-closed)');
  assertEqual(unknownRole.status, 403, 'unknown role returns 403');

  const unknownRoleAdmin = runMiddleware(rbac.requireRole('administrator'), { email: 'admin@nexus.io' });
  assert(!unknownRoleAdmin.passed, 'unknown role denies even an admin');

  // An unknown permission must deny for the same reason.
  const unknownPerm = runMiddleware(rbac.require('made.up.permission'), { email: 'admin@nexus.io' });
  assert(!unknownPerm.passed, 'unknown permission denies access (fail-closed)');

  // Valid checks still behave correctly.
  const validAdmin = runMiddleware(rbac.requireRole(ROLES.ADMIN), { email: 'admin@nexus.io' });
  assert(validAdmin.passed, 'admin satisfies requireRole(admin)');

  const validDenied = runMiddleware(rbac.requireRole(ROLES.ADMIN), { email: 'a@b.com', plan: 'free' });
  assert(!validDenied.passed, 'a free user does not satisfy requireRole(admin)');
  assertEqual(validDenied.status, 403, 'insufficient role returns 403');

  const permOk = runMiddleware(rbac.require(PERMISSIONS.AI_GENERATE), { email: 'a@b.com', plan: 'free' });
  assert(permOk.passed, 'a user with the permission is allowed through');

  const permDenied = runMiddleware(rbac.require(PERMISSIONS.ADMIN_BACKUP), { email: 'a@b.com', plan: 'free' });
  assert(!permDenied.passed, 'a user without the permission is denied');

  // Unauthenticated requests are rejected before any role logic runs.
  const anon = runMiddleware(rbac.requireRole(ROLES.USER), undefined);
  assert(!anon.passed, 'unauthenticated request is denied');
  assertEqual(anon.status, 401, 'unauthenticated request returns 401');

  // The hierarchy must be strictly ordered, otherwise comparisons break.
  assert(ROLE_HIERARCHY[ROLES.GUEST] < ROLE_HIERARCHY[ROLES.USER], 'guest ranks below user');
  assert(ROLE_HIERARCHY[ROLES.USER] < ROLE_HIERARCHY[ROLES.PRO], 'user ranks below pro');
  assert(ROLE_HIERARCHY[ROLES.PRO] < ROLE_HIERARCHY[ROLES.TEAM], 'pro ranks below team');
  assert(ROLE_HIERARCHY[ROLES.TEAM] < ROLE_HIERARCHY[ROLES.ADMIN], 'team ranks below admin');

  // Empty configuration must not accidentally make everyone an admin.
  const noAdmins = new RBAC({ adminEmails: [] });
  assertEqual(noAdmins.getRole({ email: 'anyone@example.com' }), ROLES.USER,
    'empty admin list grants nobody admin');
  assertEqual(noAdmins.getRole({ email: '' }), ROLES.USER, 'empty email does not match');
}

// ════════════════════════════════════════════
// 15. LOGGER — level filtering & resilience
// ════════════════════════════════════════════
function testLogger() {
  section('Logger: level filtering & resilience');
  const { Logger, LEVELS } = require('../dist/services/logger');

  // Capture only while the logger runs, then restore before asserting —
  // otherwise the assertion output is swallowed too.
  const capture = (fn) => {
    const lines = [];
    const original = console.log;
    console.log = (line) => lines.push(String(line));
    try { fn(); } finally { console.log = original; }
    return lines;
  };

  // The console fallback previously printed every level regardless
  // of configuration.
  const warnLines = capture(() => {
    const log = new Logger({ level: 'warn', context: 'T', pino: null });
    log.debug('should not appear');
    log.info('should not appear');
    log.warn('should appear');
    log.error('should appear');
  });
  assertEqual(warnLines.length, 2, 'console fallback filters below the configured level');
  assert(warnLines.every((l) => !l.includes('should not appear')), 'suppressed levels are not printed');

  const debugLines = capture(() => {
    new Logger({ level: 'debug', context: 'T', pino: null }).debug('visible');
  });
  assertEqual(debugLines.length, 1, 'debug level lets debug through');

  // A circular meta object must not crash the caller.
  const circularLines = capture(() => {
    const circular = {};
    circular.self = circular;
    new Logger({ level: 'debug', pino: null }).error('circular', circular);
  });
  assertEqual(circularLines.length, 1, 'circular meta still logs');
  assert(circularLines[0].includes('unserializable'), 'circular meta is reported, not thrown');

  // An invalid level falls back to a sane default rather than
  // silencing everything.
  assertEqual(new Logger({ level: 'not-a-level', pino: null }).level, 'info',
    'invalid level falls back to info');

  // Child loggers carry a dotted context path.
  const parent = new Logger({ context: 'Root', pino: null });
  assertEqual(parent.child('sub').context, 'Root:sub', 'child builds a dotted context');
  assertEqual(parent.child('a').child('b').context, 'Root:a:b', 'nested children keep nesting');
  assertEqual(parent.child('x').level, parent.level, 'child inherits the parent level');

  assertEqual(LEVELS.length, 5, 'five log levels are defined');
}

// ════════════════════════════════════════════
// 16. PRODUCT ARCHITECTURE — IA & safety contracts
// ════════════════════════════════════════════
function testProductArchitecture() {
  section('Product architecture: one shell, no duplicates');
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '..');

  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const shell = fs.readFileSync(path.join(root, 'nexus-shell.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

  // ── One shell ─────────────────────────────
  // Two modules both writing window.NXS is exactly how the duplicate
  // shell arose. This keeps it from happening again.
  assert(!app.includes('window.NXS = window.NXS'),
    'app.js does not define a second shell on window.NXS');
  assert(shell.includes('window.NXS = window.NXS'),
    'nexus-shell.js owns the NXS namespace');

  // ── The shell is actually mounted ─────────
  // The 17 panels and the first shell were both defined and never
  // called. A shell that does not boot is dead code.
  assert(html.includes('nexus-shell.js'), 'the shell is loaded by index.html');
  assert(shell.includes('boot();'), 'the shell boots itself rather than waiting to be called');

  // ── Primary navigation ────────────────────
  for (const area of ['home', 'projects', 'build', 'run', 'grow', 'knowledge']) {
    assert(shell.includes("id: '" + area + "'"), '"' + area + '" is a primary area');
  }

  // ── Advanced systems stay out of primary nav ──
  const advancedBlock = shell.slice(shell.indexOf('const ADVANCED'),
                                    shell.indexOf('const HOME_EXAMPLES'));
  for (const panel of ['renderTwin', 'renderShadow', 'renderDreamspace',
                       'renderPredictive', 'renderTemporal', 'renderRealityMap']) {
    assert(advancedBlock.includes(panel),
      panel + ' sits under Advanced, not primary navigation');
  }

  // ── Community gating ──────────────────────
  assert(shell.includes('COMMUNITY_MIN_ITEMS'),
    'community is gated behind a minimum item count');
  assert(shell.includes('communityUnlocked'),
    'community visibility is resolved at runtime, not assumed');

  // ── Panel routing ─────────────────────────
  // The shell routes to panels; it must never reimplement one.
  const ROUTED = [
    'renderCode', 'renderMedia', 'renderVoice', 'renderBusiness', 'renderPMF',
    'renderKnowledge', 'renderFabric', 'renderWorkspaces', 'renderTwin',
    'renderShadow', 'renderDreamspace', 'renderPredictive', 'renderTemporal',
    'renderAdmin', 'renderMarketplace', 'renderProjects', 'renderProject',
  ];
  for (const panel of ROUTED) {
    const defs = (app.match(new RegExp('NXUI\\.' + panel + '\\s*=', 'g')) || []).length;
    assertEqual(defs, 1, panel + ' is defined exactly once');
    assert(!shell.includes('NXUI.' + panel + ' ='),
      'the shell does not reimplement ' + panel);
  }

  // ── Every routed panel resolves ───────────
  const referenced = [...shell.matchAll(/panel(?:OnOpen)?: '([a-zA-Z]+)'/g)].map((m) => m[1]);
  const missingPanels = referenced.filter((p) => !app.includes('NXUI.' + p + ' ='));
  assertEqual(missingPanels, [], 'every panel the shell routes to exists in app.js');

  // ── Every nav target resolves ─────────────
  const navs = [...shell.matchAll(/nav: '([a-z_]+)'/g)].map((m) => m[1]);
  const brokenNavs = navs.filter((fn) => !new RegExp('function ' + fn + '\\b').test(app));
  assertEqual(brokenNavs, [], 'every navigate_* target the shell calls exists');

  // ── Orchestration is the entry point ──────
  assert(app.includes('NXO.run = function'), 'orchestration run entry exists');
  assert(app.includes('NXO.resume = function'), 'orchestration resume entry exists');
  assert(shell.includes('window.NXO'), 'Home routes the prompt into orchestration');

  // ── Dead code ─────────────────────────────
  assert(!fs.existsSync(path.join(root, 'monitoring/tracing.js')),
    'orphan monitoring/tracing.js is removed (superseded by services/tracer.js)');
  assert(fs.existsSync(path.join(root, 'services/tracer.js')),
    'the tracer that is actually wired remains');
}

// ════════════════════════════════════════════
// 16. PROJECTS — autonomy & approval gating
// ════════════════════════════════════════════
function testProjects() {
  section('Projects: autonomy & approval gating');
  const {
    ProjectsService, AUTONOMY_RANK, DANGEROUS_ACTIONS, isDangerous,
  } = require('../dist/services/projects');

  // Autonomy levels must be strictly ordered, otherwise the
  // canAutoExecute comparison is meaningless.
  assert(AUTONOMY_RANK.suggest < AUTONOMY_RANK.prepare, 'suggest ranks below prepare');
  assert(AUTONOMY_RANK.prepare < AUTONOMY_RANK.execute, 'prepare ranks below execute');
  assert(AUTONOMY_RANK.execute < AUTONOMY_RANK.autonomous, 'execute ranks below autonomous');

  // The dangerous list must cover actions that destroy work,
  // spend money, or reach production.
  ['deploy.production', 'database.drop', 'payment.charge', 'resource.delete']
    .forEach((a) => assert(isDangerous(a), a + ' is classified dangerous'));
  assert(!isDangerous('code.review'), 'ordinary actions are not dangerous');
  assert(!isDangerous(''), 'empty action is not dangerous');
  assert(!isDangerous('deploy.preview'), 'preview deploys are not production');
  assertEqual(new Set(DANGEROUS_ACTIONS).size, DANGEROUS_ACTIONS.length,
    'dangerous action list has no duplicates');

  // Gating, exercised against an in-memory stub so the rules are
  // tested rather than the database.
  const settings = new Map();
  const svc = new ProjectsService({ db: null });
  svc.getAutonomy = (id) => settings.get(id) ?? 'prepare';

  settings.set(1, 'suggest');
  assert(!svc.canAutoExecute(1, 'code.review'), 'suggest cannot auto-run a safe action');
  assert(!svc.canAutoExecute(1, 'deploy.production'), 'suggest cannot deploy');

  settings.set(2, 'prepare');
  assert(!svc.canAutoExecute(2, 'code.review'), 'prepare waits even for safe actions');
  assert(!svc.canAutoExecute(2, 'deploy.production'), 'prepare cannot deploy');

  settings.set(3, 'execute');
  assert(svc.canAutoExecute(3, 'code.review'), 'execute runs safe actions');
  assert(!svc.canAutoExecute(3, 'deploy.production'), 'execute still gates production deploys');
  assert(!svc.canAutoExecute(3, 'database.drop'), 'execute still gates destructive changes');
  assert(!svc.canAutoExecute(3, 'payment.charge'), 'execute still gates payments');

  settings.set(4, 'autonomous');
  assert(svc.canAutoExecute(4, 'code.review'), 'autonomous runs safe actions');
  assert(svc.canAutoExecute(4, 'deploy.production'), 'autonomous may deploy');

  // An unrecognised level must not unlock anything.
  settings.set(5, 'god-mode');
  assert(!svc.canAutoExecute(5, 'deploy.production'),
    'unknown autonomy level cannot deploy (fail-closed)');

  // Every dangerous action is gated at execute level, without exception.
  settings.set(6, 'execute');
  assert(DANGEROUS_ACTIONS.every((a) => !svc.canAutoExecute(6, a)),
    'no dangerous action escapes the gate at execute level');

  // Without a database the service degrades instead of throwing.
  const bare = new ProjectsService({ db: null });
  assertEqual(bare.list(1), [], 'list returns empty without a database');
  assertEqual(bare.getWorkspace(1, 1), null, 'workspace is null without a database');
  assertEqual(bare.listApprovals(1, 1), [], 'approvals empty without a database');
  assertEqual(bare.requestApproval({ project_id: 1, user_id: 1, action: 'x', summary: 'y' }), null,
    'approval request returns null without a database');
  assertEqual(bare.setAutonomy(1, 1, 'execute').ok, false, 'setAutonomy fails safely');
  assertEqual(bare.setAutonomy(1, 1, 'nonsense').ok, false, 'invalid level is rejected');

  const resources = bare.listResources(1, 1);
  assert(Object.keys(resources).length === 6, 'resource buckets cover all six kinds');
  assert(Object.values(resources).every((v) => Array.isArray(v)), 'every bucket is an array');
}


// ════════════════════════════════════════════
// 17. ORCHESTRATION — intent routing & pipelines
// ════════════════════════════════════════════
function testOrchestration() {
  section('Orchestration: intent routing & pipelines');
  const { OrchestrationService, PIPELINES } = require('../dist/services/orchestration');
  const o = new OrchestrationService({ db: null, smartCall: null });

  // Routing decides which agents run, so a wrong intent means the
  // wrong specialists work the problem.
  const cases = [
    ['Build me an AI SaaS for football analytics',                 'build_product'],
    ['Create a startup for dog walking',                           'build_product'],
    ['Analyze my repository and find the biggest problems',        'analyze_code'],
    ['Review this codebase for security issues',                   'analyze_code'],
    ['Research this market and tell me if the idea is worth building', 'research_market'],
    ['Who are my competitors?',                                    'research_market'],
    ['I need more users and better retention',                     'grow_business'],
    ['I need a marketing campaign',                                'grow_business'],
    ['grow my revenue with better marketing',                      'grow_business'],
    ['Analyze the market landscape',                               'research_market'],
    ['Deploy my current project to production',                    'deploy_ship'],
    ['ship it',                                                    'deploy_ship'],
  ];
  cases.forEach(([prompt, expected]) => {
    assertEqual(o.detectIntentByKeyword(prompt).intent, expected,
      'routes: "' + prompt.slice(0, 38) + '"');
  });

  // "marketing" must not be captured by the market-research patterns.
  assertEqual(o.detectIntentByKeyword('I need a marketing campaign').intent, 'grow_business',
    'marketing routes to growth, not market research');
  assertEqual(o.detectIntentByKeyword('research my competitors').intent, 'research_market',
    'competitor research routes to market research');

  // Genuinely ambiguous prompts must score low rather than commit, so
  // detectIntent() escalates them to the AI classifier instead of
  // silently running the wrong pipeline.
  const ambiguous = o.detectIntentByKeyword('Create a marketing strategy for my app');
  assert(ambiguous.confidence < 1,
    'an ambiguous prompt keeps confidence below the escalation threshold');

  // Anything unrecognised falls back rather than guessing a pipeline.
  assertEqual(o.detectIntentByKeyword('what is the weather').intent, 'general',
    'unmatched prompt falls back to general');
  assertEqual(o.detectIntentByKeyword('').intent, 'general', 'empty prompt is general');
  assertEqual(o.detectIntentByKeyword(null).intent, 'general', 'null prompt does not throw');
  assertEqual(o.detectIntentByKeyword('   ').confidence, 0, 'whitespace scores zero confidence');

  // Every intent must have a runnable pipeline.
  Object.keys(PIPELINES).forEach((intent) => {
    const p = PIPELINES[intent];
    assert(p.steps.length > 0, intent + ' pipeline has steps');
    assert(typeof p.headline === 'string' && p.headline.length > 0,
      intent + ' pipeline has a headline');
    assertEqual(p.intent, intent, intent + ' pipeline id matches its key');
  });

  // getPipeline must never return undefined — the runner would crash.
  assert(!!o.getPipeline('build_product'), 'known intent returns a pipeline');
  assertEqual(o.getPipeline('nonexistent').intent, 'general',
    'unknown intent falls back to the general pipeline');

  // Dependencies must reference steps that run earlier, otherwise a
  // step would read output that does not exist yet.
  Object.entries(PIPELINES).forEach(([intent, pipeline]) => {
    const seen = new Set();
    let valid = true;
    for (const step of pipeline.steps) {
      for (const dep of step.uses || []) {
        if (!seen.has(dep)) { valid = false; break; }
      }
      seen.add(step.agent);
    }
    assert(valid, intent + ': every dependency runs before its consumer');
  });

  // Agent keys must exist in the registry, or runAgent throws at runtime.
  const REGISTRY = ['ceo','product','designer','backend','frontend','devops','qa',
                    'security','validator','marketing','analyst','researcher',
                    'planner','supervisor','refiner'];
  const unknown = new Set();
  Object.values(PIPELINES).forEach((p) =>
    p.steps.forEach((s) => { if (!REGISTRY.includes(s.agent)) unknown.add(s.agent); }));
  assertEqual([...unknown], [], 'every pipeline agent exists in the registry');

  // Step labels are user-facing; they must not leak agent keys.
  let leaks = 0;
  Object.values(PIPELINES).forEach((p) =>
    p.steps.forEach((s) => { if (s.step === s.agent) leaks++; }));
  assertEqual(leaks, 0, 'no step label exposes a raw agent key');

  // Context assembly passes only declared dependencies.
  const ctx = o.buildContext('build a shop',
    { agent: 'frontend', step: 'Building the frontend', uses: ['designer', 'backend'] },
    { designer: { layout: 'grid' }, backend: { db: 'postgres' }, marketing: { channel: 'seo' } });
  assert(ctx.includes('build a shop'), 'context carries the goal');
  assert(ctx.includes('DESIGNER'), 'context includes a declared dependency');
  assert(ctx.includes('BACKEND'), 'context includes the second dependency');
  assert(!ctx.includes('marketing'), 'context omits undeclared output');

  // Missing dependencies must not break assembly.
  const partial = o.buildContext('goal',
    { agent: 'qa', step: 'Testing', uses: ['frontend', 'backend'] }, { frontend: 'ok' });
  assert(partial.includes('FRONTEND'), 'available dependency is included');
  assert(typeof partial === 'string', 'missing dependency does not throw');

  // Oversized upstream output is truncated before it reaches a prompt.
  const huge = o.buildContext('g',
    { agent: 'qa', step: 'T', uses: ['backend'] }, { backend: 'x'.repeat(50000) });
  assert(huge.length < 4000, 'oversized dependency output is truncated');

  // ── Approval gating in pipelines (Phase D) ──
  // A step that performs a real action must declare it, so the runner
  // can gate it. A missing action means the gate never fires.
  const gated = [];
  Object.entries(PIPELINES).forEach(([intent, p]) =>
    p.steps.forEach((st) => { if (st.action) gated.push([intent, st.action, st]); }));

  assert(gated.length > 0, 'at least one pipeline step declares a real action');

  gated.forEach(([intent, action, st]) => {
    assert(typeof st.approvalSummary === 'string' && st.approvalSummary.length > 0,
      intent + ': gated step "' + action + '" explains why approval is needed');
    assert(st.approvalSummary !== action,
      intent + ': approval summary is human-readable, not the raw action key');
  });

  // The production release step must be gated, or a run could deploy
  // without asking.
  const deployStep = PIPELINES.deploy_ship.steps.find((st) => st.action === 'deploy.production');
  assert(!!deployStep, 'the deploy pipeline declares a production release action');

  // Advisory steps must NOT declare actions — otherwise planning work
  // would pause for approval it does not need.
  const advisory = PIPELINES.build_product.steps.filter((st) => st.action);
  assertEqual(advisory.length, 0, 'planning-only pipelines declare no real actions');

  // Every declared action must be recognised by the gate, otherwise
  // canAutoExecute would treat it as ordinary and let it run.
  const { DANGEROUS_ACTIONS: DA } = require('../dist/services/projects');
  const unrecognised = gated
    .map(([, action]) => action)
    .filter((a) => !DA.includes(a));
  assertEqual(unrecognised, [], 'every declared action is a recognised dangerous action');

  // ── Resume state ──
  const resumed = o.resumeState(1, PIPELINES.general);
  assertEqual(resumed.startIndex, 0, 'resume starts at zero without a database');
  assertEqual(resumed.completed, {}, 'resume has no completed work without a database');
  assertEqual(resumed.stepIds, [], 'resume has no step ids without a database');
  o.markStep(-1, 'blocked');
  assert(true, 'markStep accepts the blocked status');

  // Without a database, plan declaration degrades instead of throwing.
  const planned = o.declarePlan(1, PIPELINES.general);
  assertEqual(planned.steps.length, PIPELINES.general.steps.length,
    'plan is returned even without a database');
  assert(planned.steps.every((s) => s.id < 0), 'placeholder ids are negative without a database');
  o.markStep(-1, 'done');
  assert(true, 'markStep on a placeholder id is a no-op');
}

// ════════════════════════════════════════════
// 18. DEPRECATION — duplicate consolidation
// ════════════════════════════════════════════
function testDeprecation() {
  section('Deprecation: duplicate consolidation');
  const { DeprecationService, DEPRECATED } = require('../dist/services/deprecation');
  const d = new DeprecationService({ db: null });

  assert(DEPRECATED.length > 0, 'duplicates found by the audit are recorded');

  // Every entry must be actionable: a caller needs to know where to go.
  DEPRECATED.forEach((e) => {
    assert(e.path.startsWith('/api/'), e.path + ' is an API path');
    assert(e.replacement.startsWith('/api/'), e.path + ' names a replacement endpoint');
    assert(e.replacement !== e.path, e.path + ' does not point at itself');
    assert(e.reason.length > 10, e.path + ' explains why it is deprecated');
    assert(!Number.isNaN(Date.parse(e.sunset)), e.path + ' has a parseable sunset date');
  });

  // A replacement must never itself be deprecated, or callers would be
  // sent from one dead endpoint to another.
  const deprecatedPaths = new Set(DEPRECATED.map((e) => e.path));
  const circular = DEPRECATED.filter((e) => deprecatedPaths.has(e.replacement));
  assertEqual(circular.map((e) => e.path), [], 'no replacement is itself deprecated');

  // ── Prefix matching ──
  // A lookalike path must not be caught: /api/billingx is not /api/billing.
  assertEqual(d.match('/api/billing/plans')?.path, '/api/billing', 'matches a sub-path');
  assertEqual(d.match('/api/billing')?.path, '/api/billing', 'matches the exact path');
  assertEqual(d.match('/api/billingx/foo'), null, 'does not match a lookalike prefix');
  assertEqual(d.match('/api/payments/plans'), null, 'the surviving endpoint is not deprecated');
  assertEqual(d.match('/api/admin/users'), null, 'a sibling under the same mount is unaffected');
  assertEqual(d.match(''), null, 'empty path matches nothing');

  // The most specific prefix wins when several could match.
  assertEqual(d.match('/api/admin/audit/log')?.path, '/api/admin/audit',
    'the longest matching prefix is chosen');

  // ── Removal safety ──
  // Without a database there is no usage evidence, so nothing may be
  // declared safe to remove.
  const report = d.report();
  assertEqual(report.length, DEPRECATED.length, 'every deprecation appears in the report');
  assert(report.every((r) => r.safe_to_remove === false),
    'nothing is safe to remove without usage evidence');
  assert(report.every((r) => r.calls === 0), 'call counts default to zero');
  assert(report.every((r) => typeof r.sunset === 'string'), 'each row carries its sunset date');

  // Recording without a database must not throw.
  d.record(DEPRECATED[0], '/api/billing/plans', 'GET', 1);
  assert(true, 'recording usage without a database is a no-op');

  // The known duplicates from the audit are all covered.
  ['/api/billing', '/api/os/memory', '/api/os/cache', '/api/os/jobs',
   '/api/ux/notifications', '/api/admin/audit', '/api/admin/backups']
    .forEach((path) => {
      assert(DEPRECATED.some((e) => e.path === path), path + ' is registered as deprecated');
    });

  // The endpoints that survived the audit must not be deprecated.
  ['/api/payments', '/api/intelligence/memory', '/api/core/cache',
   '/api/notifications', '/api/security/audit', '/api/dr']
    .forEach((path) => {
      assertEqual(d.match(path), null, path + ' survives and is not deprecated');
    });
}

// ════════════════════════════════════════════
// RUNNER
// ════════════════════════════════════════════
async function run() {
  console.log('\n\x1b[1m🧪 NexusAI Unit Tests — business logic correctness\x1b[0m');

  try {
    testValidation();
    testCSRF();
    testRateLimiter();
    await testSemanticCache();
    testLocalLLM();
    testTemporalUX();
    testCommunity();
    testPayments();
    testEmbeddings();
    testAITwin();
    testObservability();
    testPredictive();
    testEventBus();
    testRBAC();
    testLogger();
    testProjects();
    testOrchestration();
    testProductArchitecture();
    testDeprecation();
  } catch (e) {
    console.error('\n\x1b[31mFATAL: test suite crashed\x1b[0m');
    console.error(e.stack);
    process.exit(1);
  }

  console.log('\n' + '─'.repeat(58));
  const total = passed + failed;
  if (failed === 0) {
    console.log(`\x1b[32m✅ ${passed}/${total} unit tests passed\x1b[0m\n`);
    process.exit(0);
  } else {
    console.log(`\x1b[31m❌ ${failed} of ${total} failed:\x1b[0m`);
    failures.forEach(f => console.log(`   • ${f.name}${f.detail ? ` — ${f.detail}` : ''}`));
    console.log('');
    process.exit(1);
  }
}

run();