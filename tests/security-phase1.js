// ============================================================
// Security regression checks. Each block pins a fix for a confirmed
// vulnerability; a failure here means the hole is open again.
// ============================================================
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { isBlockedAddress, safeRequest } = require('../backend/security/safe-http');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function ok(cond, msg) { assert.ok(cond, msg); passed += 1; }

(async () => {
  // ── SSRF: address classification ────────────────────────────
  for (const address of [
    '127.0.0.1', '10.0.0.2', '172.16.0.1', '192.168.1.1', '169.254.169.254', '::1', 'fd00::1',
    '0.0.0.0', '100.64.0.1', '224.0.0.1', '255.255.255.255',
    '::ffff:127.0.0.1', '::ffff:7f00:1', '::127.0.0.1', '64:ff9b::a9fe:a9fe', 'fe80::1',
  ]) {
    ok(isBlockedAddress(address) === true, `${address} must be blocked`);
  }
  for (const address of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) {
    ok(isBlockedAddress(address) === false, `${address} should not be classified as private`);
  }
  await assert.rejects(() => safeRequest('file:///etc/passwd'), /Only http and https/); passed += 1;
  await assert.rejects(() => safeRequest('http://127.0.0.1/'), /private|not allowed/); passed += 1;
  await assert.rejects(() => safeRequest('http://169.254.169.254/latest/meta-data/'), /private|not allowed/); passed += 1;
  await assert.rejects(() => safeRequest('http://[::1]:3001/health'), /private|not allowed|ENOTFOUND|EAI_AGAIN/); passed += 1;

  // ── SSRF: the API tester must use the guarded client ────────
  const devtools = fs.readFileSync(path.join(ROOT, 'backend/routes/devtools.js'), 'utf8');
  const apiTest = devtools.slice(devtools.indexOf("'/api-test'"), devtools.indexOf("'/docker'"));
  ok(apiTest.includes('safeRequest('), '/api/dev/api-test fetches through safeRequest');
  ok(!/\bfetch\(/.test(apiTest), '/api/dev/api-test does not call raw fetch()');

  // ── Admin identity: one configurable source ─────────────────
  const priv = require('../backend/security/privileged');
  ok(priv.isAdminEmail('a@x.com', { ADMIN_EMAILS: 'A@x.com, b@y.com' }), 'ADMIN_EMAILS is case-insensitive');
  ok(!priv.isAdminEmail('c@x.com', { ADMIN_EMAILS: 'a@x.com' }), 'unlisted email is not admin');
  ok(!priv.isAdminEmail('', { ADMIN_EMAILS: '' }), 'empty email is never admin');
  ok(priv.adminEmails({ ADMIN_EMAILS: '' }).length === 0, 'ADMIN_EMAILS="" disables admin access');
  ok(priv.isVipEmail('v@x.com', { ADMIN_EMAILS: 'a@x.com', VIP_EMAILS: 'v@x.com' }), 'VIP_EMAILS is honoured');
  ok(priv.isVipEmail('a@x.com', { ADMIN_EMAILS: 'a@x.com' }), 'VIP defaults to the admin list');
  ok(!priv.isAdminEmail('harounghorbel14-star@gmail.com', {}),
    'the unowned fallback address from routes/admin.js is no longer an admin');
  for (const file of ['backend/server.js', 'backend/routes/admin.js', 'backend/routes/ux-saas.js']) {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    ok(!/@gmail\.com['"]/.test(src), `${file} carries no hard-coded privileged address`);
  }

  // ── Backups: no path traversal through filename or label ────
  const { BackupService } = require('../backend/services/backup');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nx-backup-'));
  const dbPath = path.join(tmp, 'live.db');
  fs.writeFileSync(dbPath, 'sqlite-bytes');
  const victim = path.join(tmp, 'victim.txt');
  fs.writeFileSync(victim, 'keep me');
  const backup = new BackupService({ dbPath, backupDir: path.join(tmp, 'backups') });
  fs.mkdirSync(backup.backupDir, { recursive: true });
  const del = backup.delete('../victim.txt');
  ok(del.ok === false && fs.existsSync(victim), 'delete() refuses ../ traversal');
  ok(backup.delete('..%2Fvictim.txt').ok === false && fs.existsSync(victim), 'delete() refuses encoded names');
  ok(backup.verify('../../etc/passwd').ok === false, 'verify() refuses traversal');
  const made = backup.createBackup('../../escape');
  ok(made.ok && path.dirname(made.fullPath) === path.resolve(backup.backupDir),
    'createBackup() keeps a hostile label inside the backup directory');
  ok(backup.verify(made.filename).ok === true, 'a genuine backup still verifies');
  ok(backup.delete(made.filename).ok === true && !fs.existsSync(made.fullPath), 'a genuine backup still deletes');
  fs.rmSync(tmp, { recursive: true, force: true });

  // ── Workspaces: role hierarchy is enforced ──────────────────
  const Database = require('better-sqlite3');
  const { WorkspacesService } = require('../backend/services/workspaces');
  const db = new Database(':memory:');
  db.prepare('CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT, name TEXT)').run();
  const ws = new WorkspacesService(db);
  const [OWNER, ADMIN, MEMBER, OUTSIDER] = [1, 2, 3, 4];
  const w = ws.create({ owner_id: OWNER, name: 'Team' });
  ws.addMember(w.id, ADMIN, 'admin');
  ws.addMember(w.id, MEMBER, 'member');

  assert.throws(() => ws.updateMemberRole(w.id, ADMIN, 'owner', ADMIN)); passed += 1;
  ok(ws.getMemberRole(w.id, ADMIN) === 'admin', 'an admin cannot promote themselves to owner');
  assert.throws(() => ws.updateMemberRole(w.id, OWNER, 'viewer', ADMIN)); passed += 1;
  ok(ws.getMemberRole(w.id, OWNER) === 'owner', 'an admin cannot demote the owner');
  assert.throws(() => ws.updateMemberRole(w.id, MEMBER, 'admin', ADMIN)); passed += 1;
  ok(ws.getMemberRole(w.id, MEMBER) === 'member', 'only the owner can grant admin');
  assert.throws(() => ws.createInvite({ workspace_id: w.id, email: 'x@y.z', role: 'owner', invited_by: ADMIN })); passed += 1;
  assert.throws(() => ws.createInvite({ workspace_id: w.id, email: 'x@y.z', role: 'superuser', invited_by: OWNER })); passed += 1;
  assert.throws(() => ws.updateMemberRole(w.id, OUTSIDER, 'member', OWNER)); passed += 1;
  assert.throws(() => ws.removeMember(w.id, OWNER, ADMIN)); passed += 1;
  ok(ws.getMemberRole(w.id, OWNER) === 'owner', 'the owner cannot be removed');

  // Legitimate flows keep working.
  ok(ws.updateMemberRole(w.id, MEMBER, 'viewer', ADMIN) === true, 'an admin can change a member to viewer');
  ok(ws.updateMemberRole(w.id, MEMBER, 'admin', OWNER) === true, 'the owner can grant admin');
  ok(!!ws.createInvite({ workspace_id: w.id, email: 'n@y.z', role: 'member', invited_by: ADMIN }).token,
    'an admin can invite members');
  ok(ws.removeMember(w.id, MEMBER, OWNER) === true, 'the owner can remove an admin');

  // ── Vercel routing config ───────────────────────────────────
  const rootCfg = fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8');
  const feCfg = fs.readFileSync(path.join(ROOT, 'frontend/vercel.json'), 'utf8');
  ok(rootCfg === feCfg, 'vercel.json and frontend/vercel.json are identical');
  const rewrites = JSON.parse(feCfg).rewrites || [];
  ok(rewrites.some((r) => r.source === '/api/:path*' && /\/api\/:path\*$/.test(r.destination)),
    'vercel.json forwards /api/* to the backend');
  const { normalizeHost } = require('../scripts/set-backend-domain');
  assert.throws(() => normalizeHost('REPLACE_WITH_RAILWAY_DOMAIN')); passed += 1;
  assert.throws(() => normalizeHost('nexusaitools.it.com')); passed += 1;
  ok(normalizeHost('https://api-x.up.railway.app/') === 'api-x.up.railway.app', 'host is normalised');

  console.log(`✅ ${passed} security regression checks passed`);
})().catch((e) => {
  console.error('❌ security check failed:', e.message);
  process.exit(1);
});
