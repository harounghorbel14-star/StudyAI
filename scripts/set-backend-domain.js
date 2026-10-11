#!/usr/bin/env node
// ============================================================
// Point the Vercel frontend at the Railway backend.
//
//   node scripts/set-backend-domain.js <backend-host> [--no-probe]
//   e.g. node scripts/set-backend-domain.js studyai-production.up.railway.app
//
// Vercel only reads vercel.json from the project's Root Directory. The
// frontend's asset paths are relative to frontend/, so that is normally
// frontend/vercel.json; the repository-root copy covers a project whose
// Root Directory is the repository itself. Both are written identically.
//
// Before writing, the backend's /health is requested and must answer
// 200 with {"status":"ok"} — so a typo or a sleeping service is caught
// here rather than as a 404 in production. --no-probe skips that.
// ============================================================
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGETS = [path.join(ROOT, 'vercel.json'), path.join(ROOT, 'frontend', 'vercel.json')];
const PLACEHOLDER = 'REPLACE_WITH_RAILWAY_DOMAIN';

function buildConfig(host) {
  return {
    $schema: 'https://openapi.vercel.sh/vercel.json',
    rewrites: [
      { source: '/api/:path*', destination: `https://${host}/api/:path*` },
      { source: '/health', destination: `https://${host}/health` },
    ],
  };
}

function normalizeHost(input) {
  const raw = String(input || '').trim();
  const host = raw.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  if (!host || host.includes(PLACEHOLDER) || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)) {
    throw new Error(`Not a valid backend host: "${raw}"`);
  }
  if (/(^|\.)nexusaitools\.it\.com$/i.test(host)) {
    // The frontend's own domain would rewrite /api to itself forever.
    throw new Error('The backend host must be the Railway domain, not the frontend domain');
  }
  return host;
}

async function probe(host) {
  const res = await fetch(`https://${host}/health`, { signal: AbortSignal.timeout(15000) });
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch (_) { /* reported below */ }
  if (res.status !== 200 || body?.status !== 'ok') {
    throw new Error(`https://${host}/health answered ${res.status}: ${text.slice(0, 200)}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const host = normalizeHost(args.find((a) => !a.startsWith('--')));
  if (!args.includes('--no-probe')) {
    await probe(host);
    console.log(`✅ https://${host}/health is up`);
  }
  const json = JSON.stringify(buildConfig(host), null, 2) + '\n';
  for (const file of TARGETS) {
    fs.writeFileSync(file, json);
    console.log(`✏️  wrote ${path.relative(ROOT, file)}`);
  }
  console.log('Commit both files and redeploy the Vercel project.');
}

if (require.main === module) {
  main().catch((e) => { console.error(`❌ ${e.message}`); process.exit(1); });
}

module.exports = { buildConfig, normalizeHost, PLACEHOLDER, TARGETS };
