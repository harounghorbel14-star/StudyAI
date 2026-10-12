// ============================================================
// 🧑‍💻 agent/repo-tools.js — Read-only repository tools for the
// Coding specialist
//
//   repo_list     read       list files under a directory of the repository
//   repo_read     read       read a file (or a line range), secrets redacted
//   repo_search   read       literal text search across the repository
//   propose_edit  workspace  record a find/replace change as a unified diff
//                            for human review — it is NEVER applied
//
// Enabled only when AGENT_REPO_ROOT names a directory, and only for
// admin accounts (ADMIN_EMAILS): repository contents describe the
// server itself. Nothing here writes to the repository, runs code,
// runs git, deploys or merges. Paths are confined to the root after
// resolving symlinks, and secret-bearing files are refused.
// ============================================================
const fs = require('fs');
const path = require('path');
const { ToolError } = require('./tools');
const { isAdminEmail } = require('../security/privileged');

const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '.vercel', '.cache']);
// Files whose contents are credentials or private data, whatever directory they are in.
const DENY_FILE = [
  /^\.env(\..*)?$/i, /\.pem$/i, /\.key$/i, /\.p12$/i, /\.pfx$/i, /\.keystore$/i, /^id_(rsa|dsa|ecdsa|ed25519)/i,
  /^\.npmrc$/i, /^\.netrc$/i, /^\.pgpass$/i, /credentials/i, /secret/i, /\.(db|sqlite|sqlite3)(-wal|-shm)?$/i,
];
// Credential-shaped strings are redacted from anything returned.
const REDACT = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /\b(sk|pk|rk)[-_](live|test|proj|ant)?[-_]?[A-Za-z0-9_-]{16,}/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
];
const MAX_FILE_BYTES = 512 * 1024;
const MAX_READ_LINES = 400;

function redact(text) {
  let out = String(text);
  for (const re of REDACT) out = out.replace(re, '[REDACTED]');
  return out;
}

function isDeniedName(name) { return DENY_FILE.some((re) => re.test(name)); }

/** Resolve a repository-relative path, refusing anything outside the root. */
function resolveInside(root, rel = '.') {
  const p = String(rel || '.');
  if (p.includes('\0') || path.isAbsolute(p) || p.split(/[\\/]+/).includes('..')) throw new ToolError('Path must be relative to the repository and stay inside it.', 'INVALID_ARGS');
  const abs = path.resolve(root, p);
  let real;
  try { real = fs.realpathSync(abs); } catch (_) { throw new ToolError(`No such path: ${p}`, 'NOT_FOUND'); }
  if (real !== root && !real.startsWith(root + path.sep)) throw new ToolError('Path resolves outside the repository.', 'FORBIDDEN');
  const parts = path.relative(root, real).split(path.sep).filter(Boolean);
  if (parts.some((seg) => SKIP_DIRS.has(seg))) throw new ToolError('That directory is not readable by the agent.', 'FORBIDDEN');
  if (parts.some(isDeniedName)) throw new ToolError('That path may contain secrets and is not readable by the agent.', 'FORBIDDEN');
  return { abs: real, rel: parts.join('/') || '.' };
}

function* walk(root, dir, limit) {
  let count = 0;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try { entries = fs.readdirSync(cur, { withFileTypes: true }); } catch (_) { continue; }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const e of entries) {
      if (e.isSymbolicLink()) continue;                      // never follow links while walking
      const abs = path.join(cur, e.name);
      if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name) && !isDeniedName(e.name)) stack.push(abs); continue; }
      if (!e.isFile() || isDeniedName(e.name)) continue;
      yield { abs, rel: path.relative(root, abs).split(path.sep).join('/') };
      if (++count >= limit) return;
    }
  }
}

function readText(abs) {
  const st = fs.statSync(abs);
  if (st.size > MAX_FILE_BYTES) throw new ToolError(`File is larger than ${MAX_FILE_BYTES / 1024} KB.`, 'TOO_LARGE');
  const buf = fs.readFileSync(abs);
  if (buf.includes(0)) throw new ToolError('Binary file.', 'UNSUPPORTED');
  return buf.toString('utf8');
}

/** Minimal unified diff for a single contiguous replacement. */
function unifiedDiff(rel, before, after, context = 3) {
  const a = before.split('\n'); const b = after.split('\n');
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length - 1; let endB = b.length - 1;
  while (endA >= start && endB >= start && a[endA] === b[endB]) { endA--; endB--; }
  const from = Math.max(0, start - context);
  const toA = Math.min(a.length - 1, endA + context); const toB = Math.min(b.length - 1, endB + context);
  const lines = [`--- a/${rel}`, `+++ b/${rel}`, `@@ -${from + 1},${toA - from + 1} +${from + 1},${toB - from + 1} @@`];
  for (let i = from; i < start; i++) lines.push(` ${a[i]}`);
  for (let i = start; i <= endA; i++) lines.push(`-${a[i]}`);
  for (let i = start; i <= endB; i++) lines.push(`+${b[i]}`);
  for (let i = endA + 1; i <= toA; i++) lines.push(` ${a[i]}`);
  return lines.join('\n');
}

/**
 * Register the repository tools on a registry, if a root is configured.
 * @returns {boolean} whether they were registered
 */
function registerRepoTools(reg, { db, env = process.env, allow } = {}) {
  const rootRaw = env.AGENT_REPO_ROOT;
  if (!rootRaw) return false;
  let root;
  try { root = fs.realpathSync(path.resolve(rootRaw)); } catch (_) { return false; }
  if (!fs.statSync(root).isDirectory()) return false;
  const permitted = allow || ((user) => !user.guest && isAdminEmail(user.email));

  db.prepare(`CREATE TABLE IF NOT EXISTS agent_run_patches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    path TEXT NOT NULL, reason TEXT, diff TEXT NOT NULL, base_sha256 TEXT NOT NULL, created_at INTEGER NOT NULL
  )`).run();

  reg.register({
    name: 'repo_list', risk: 'read', guest: false, timeoutMs: 5000, allow: permitted, specialistOnly: 'coding',
    description: 'List files in the NexusAI repository (read-only). Optional directory and name filter.',
    params: { dir: { type: 'string', maxLength: 300, default: '.' }, contains: { type: 'string', maxLength: 100 } },
    async handler({ dir, contains }) {
      const base = resolveInside(root, dir);
      if (!fs.statSync(base.abs).isDirectory()) throw new ToolError('Not a directory.', 'INVALID_ARGS');
      const files = [];
      for (const f of walk(root, base.abs, 5000)) {
        if (contains && !f.rel.toLowerCase().includes(contains.toLowerCase())) continue;
        files.push(f.rel);
        if (files.length >= 300) break;
      }
      return { dir: base.rel, files, truncated: files.length >= 300 };
    },
  });

  reg.register({
    name: 'repo_read', risk: 'read', guest: false, timeoutMs: 5000, allow: permitted, specialistOnly: 'coding',
    description: `Read a file of the NexusAI repository (read-only, at most ${MAX_READ_LINES} lines per call, secrets redacted).`,
    params: { path: { type: 'string', required: true, maxLength: 300 }, start_line: { type: 'number', default: 1 }, end_line: { type: 'number' } },
    async handler({ path: rel, start_line: s, end_line: e }) {
      const f = resolveInside(root, rel);
      const lines = readText(f.abs).split('\n');
      const from = Math.max(1, Math.floor(s));
      const to = Math.min(lines.length, Math.floor(e || from + MAX_READ_LINES - 1), from + MAX_READ_LINES - 1);
      const text = lines.slice(from - 1, to).map((l, i) => `${from + i}\t${l}`).join('\n');
      return { path: f.rel, start_line: from, end_line: to, total_lines: lines.length, text: redact(text), untrusted: true };
    },
  });

  reg.register({
    name: 'repo_search', risk: 'read', guest: false, timeoutMs: 15_000, allow: permitted, specialistOnly: 'coding',
    description: 'Search the NexusAI repository for literal text (case-insensitive). Returns file:line matches.',
    params: { query: { type: 'string', required: true, maxLength: 200 }, dir: { type: 'string', maxLength: 300, default: '.' } },
    async handler({ query, dir }, ctx) {
      const base = resolveInside(root, dir);
      const q = query.toLowerCase();
      const matches = []; let scanned = 0;
      for (const f of walk(root, base.abs, 4000)) {
        if (ctx.signal?.aborted) break;
        let text; try { text = readText(f.abs); } catch (_) { continue; }
        scanned++;
        const lines = text.split('\n');
        for (let i = 0; i < lines.length && matches.length < 100; i++) {
          if (lines[i].toLowerCase().includes(q)) matches.push({ path: f.rel, line: i + 1, text: redact(lines[i].trim().slice(0, 240)) });
        }
        if (matches.length >= 100) break;
      }
      return { query, files_scanned: scanned, matches, truncated: matches.length >= 100, untrusted: true };
    },
  });

  reg.register({
    name: 'propose_edit', risk: 'workspace', guest: false, timeoutMs: 5000, allow: permitted, specialistOnly: 'coding',
    description: 'Propose a change to one repository file: replace text that occurs EXACTLY once. Produces a unified diff saved '
      + 'with this run for human review. The repository is not modified.',
    params: {
      path: { type: 'string', required: true, maxLength: 300 },
      find: { type: 'string', required: true, maxLength: 8000 },
      replace: { type: 'string', maxLength: 8000, default: '' },
      reason: { type: 'string', required: true, maxLength: 500 },
    },
    async handler({ path: rel, find, replace, reason }, ctx) {
      const f = resolveInside(root, rel);
      const before = readText(f.abs);
      const count = before.split(find).length - 1;
      if (count !== 1) throw new ToolError(`The text to replace occurs ${count} times in ${f.rel}; it must occur exactly once.`, 'INVALID_ARGS');
      if (find === replace) throw new ToolError('The replacement is identical to the original.', 'INVALID_ARGS');
      const after = before.replace(find, () => replace);
      const diff = redact(unifiedDiff(f.rel, before, after));
      const sha = require('crypto').createHash('sha256').update(before).digest('hex');
      const id = db.prepare('INSERT INTO agent_run_patches (run_id, path, reason, diff, base_sha256, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(ctx.runId, f.rel, reason, diff, sha, Date.now()).lastInsertRowid;
      return { patch_id: id, path: f.rel, applied: false, base_sha256: sha, diff, note: 'Proposed only. Apply and test it in a branch, then open a pull request for review.' };
    },
  });
  return true;
}

module.exports = { registerRepoTools, resolveInside, unifiedDiff, redact, isDeniedName };
