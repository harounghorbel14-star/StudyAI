// ============================================================
// 🧪 tests/integration.js — Full Service Wiring Test
// Boots the entire services stack against in-memory SQLite
// and exercises each new service end-to-end.
// ============================================================
const Database = require('better-sqlite3');
const { initServices } = require('../services');

let pass = 0, fail = 0;
const log = (ok, name, err) => {
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.error(`  ❌ ${name}${err ? ': ' + err.message : ''}`); }
};

async function run() {
  console.log('\n🧪 NexusAI Integration Test\n' + '─'.repeat(50));

  // ── Setup in-memory db with users table ──
  const db = new Database(':memory:');
  db.prepare(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT, name TEXT, plan TEXT DEFAULT 'free'
  )`).run();
  const alice = db.prepare(`INSERT INTO users (email, name) VALUES (?, ?)`)
    .run('alice@test.com', 'Alice').lastInsertRowid;
  const bob = db.prepare(`INSERT INTO users (email, name) VALUES (?, ?)`)
    .run('bob@test.com', 'Bob').lastInsertRowid;

  // Fake OpenAI client (no actual API calls)
  const openai = {
    chat: { completions: { create: async () => ({
      choices: [{ message: { content: '{"ok":true}' } }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      model: 'gpt-4o-mini',
    }) } },
  };

  // ── 1. Init services ───────────────────────
  let services;
  try {
    services = initServices(db, openai, {
      startWorkers: false, startBackups: false,
      startHealthMonitor: false, startSecretRotation: false,
    });
    log(true, 'initServices() boots without error');
  } catch (e) {
    log(false, 'initServices()', e); return;
  }

  // ── 2. Verify all 6 new services attached ──
  log(!!services.repoIntel, 'repoIntel service attached');
  log(!!services.media, 'media service attached');
  log(!!services.business, 'business service attached');
  log(!!services.workspaces, 'workspaces service attached');
  log(!!services.voice, 'voice service attached');
  log(!!services.secrets, 'secrets service attached');

  // ── 3. Business: record + retrieve metrics ──
  try {
    services.business.recordMetric({
      user_id: alice, metric_type: 'acquisition',
      metric_name: 'signups', value: 100,
    });
    services.business.recordMetric({
      user_id: alice, metric_type: 'acquisition',
      metric_name: 'signups', value: 150,
    });
    const m = services.business.getMetrics({ user_id: alice });
    log(m.length === 2, 'business: 2 metrics recorded + retrieved');
  } catch (e) { log(false, 'business metrics', e); }

  // ── 4. Workspaces: full CRUD ──
  try {
    const ws = services.workspaces.create({
      owner_id: alice, name: 'Team Alpha', description: 'test',
    });
    log(!!ws.id && ws.slug.startsWith('team-alpha'), 'workspace created with slug');

    const lst = services.workspaces.listForUser(alice);
    log(lst.length === 1 && lst[0].role === 'owner', 'owner sees workspace as owner role');

    const added = services.workspaces.addMember(ws.id, bob, 'member');
    log(added, 'member added');

    const canRead = services.workspaces.hasPermission(ws.id, bob, 'read');
    const canManage = services.workspaces.hasPermission(ws.id, bob, 'manage');
    log(canRead && !canManage, 'member can read but not manage');

    const ownerCanManage = services.workspaces.hasPermission(ws.id, alice, 'manage');
    log(ownerCanManage, 'owner can manage');

    const invite = services.workspaces.createInvite({
      workspace_id: ws.id, email: 'new@test.com', role: 'viewer', invited_by: alice,
    });
    log(invite.token && invite.token.length > 30, 'invite created with token');

    const activity = services.workspaces.getActivity({ workspace_id: ws.id });
    log(activity.length >= 2, 'activity feed records events');
  } catch (e) { log(false, 'workspaces flow', e); }

  // ── 5. Secret rotation: encrypt → retrieve → rotate ──
  try {
    const stored = services.secrets.store({
      user_id: alice, key_name: 'api_test', value: 'super-secret-value-123',
    });
    log(stored.version === 1, 'secret stored at version 1');

    const got = services.secrets.retrieve({ user_id: alice, key_name: 'api_test' });
    log(got?.value === 'super-secret-value-123', 'secret decrypts to original value');

    const rot = services.secrets.rotate({ user_id: alice, key_name: 'api_test' });
    log(rot.version === 2 && rot.value !== 'super-secret-value-123', 'rotation creates new version with new value');

    const list = services.secrets.list({ user_id: alice });
    log(list.length === 2, 'list shows both versions');

    const got2 = services.secrets.retrieve({ user_id: alice, key_name: 'api_test' });
    log(got2.version === 2, 'retrieve returns active (rotated) version');
  } catch (e) { log(false, 'secrets flow', e); }

  // ── 6. Media: list models ──
  try {
    const models = services.media.listModels();
    log(!!models.image && !!models.video && !!models.audio, 'media: provider catalog exposed');
  } catch (e) { log(false, 'media listModels', e); }

  // ── 7. Voice: list voices ──
  try {
    const voices = services.voice.listVoices();
    log(voices.length === 6, 'voice: 6 OpenAI voices listed');
  } catch (e) { log(false, 'voice voices', e); }

  // ── 8. RBAC integration ──
  try {
    const adminRole = services.rbac.getRole({
      email: 'harounghorbel14-star@example.com', plan: 'free', isVip: true,
    });
    log(!!adminRole, 'rbac: VIP gets elevated role');
  } catch (e) { log(false, 'rbac', e); }

  // ── 9. Event bus captures cross-service events ──
  try {
    let captured = 0;
    services.events.on('workspace.created', () => captured++);
    services.workspaces.create({ owner_id: alice, name: 'Beta' });
    log(captured === 1, 'event bus: workspace.created fired');
  } catch (e) { log(false, 'event bus', e); }

  // ── 10. Cache works ──
  try {
    await services.cache.set(['test', 'k'], { hello: 'world' });
    const v = await services.cache.get(['test', 'k']);
    log(v?.hello === 'world', 'cache: set + get roundtrip');
  } catch (e) { log(false, 'cache', e); }

  // ── Summary ──
  console.log('─'.repeat(50));
  console.log(`\nResults: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
  db.close();
}

run().catch((e) => {
  console.error('💥 Test runner crashed:', e);
  process.exit(1);
});