// ============================================================
// 🔀 services/_resolve.js — Migration Shim
//
// During the TypeScript migration some modules exist as .ts (compiled
// to dist/) and others are still .js. This resolves either form from a
// single call site, so the rest of the codebase does not need to know
// which files have been migrated yet.
//
// Resolution order:
//   1. dist/<path>.js   — compiled TypeScript (preferred, typed)
//   2. ./<path>.js      — original JavaScript (fallback)
//
// Once every module is migrated this file can be deleted and the
// requires switched to plain `require('./name')`.
// ============================================================
const path = require('path');
const fs = require('fs');

// backend/ — both tsconfigs (repo root and backend/) emit to backend/dist,
// so this works whether the app is started from the repo root or with
// backend/ as the deploy root (Railway).
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const cache = new Map();

/**
 * Load a module by its logical path, preferring the compiled
 * TypeScript build when one exists.
 * @param {string} relativePath e.g. 'services/temporal-ux'
 * @returns {any} the resolved module exports
 */
function load(relativePath) {
  if (cache.has(relativePath)) return cache.get(relativePath);

  const compiled = path.join(DIST, `${relativePath}.js`);
  const typescriptCompiled = path.join(
    DIST,
    path.dirname(relativePath),
    'TypeScript',
    `${path.basename(relativePath)}.js`
  );
  const original = path.join(ROOT, `${relativePath}.js`);
  let resolved;
  if (fs.existsSync(compiled)) {
    resolved = require(compiled);
  } else if (fs.existsSync(typescriptCompiled)) {
    resolved = require(typescriptCompiled);
  } else if (fs.existsSync(original)) {
    resolved = require(original);
  } else {
    throw new Error(
      `Cannot resolve module "${relativePath}" — checked:\n` +
      `  ${compiled}\n  ${typescriptCompiled}\n  ${original}`
    );
  }

  cache.set(relativePath, resolved);
  return resolved;
}

/** Report which modules are running compiled TypeScript. */
function migrationStatus(modules) {
  return modules.map((m) => ({
    module: m,
    compiled:
      fs.existsSync(path.join(DIST, `${m}.js`)) ||
      fs.existsSync(path.join(DIST, path.dirname(m), 'TypeScript', `${path.basename(m)}.js`)),
    source: fs.existsSync(path.join(ROOT, `${m}.ts`)) ? 'typescript' : 'javascript',
  }));
}

module.exports = { load, migrationStatus };
