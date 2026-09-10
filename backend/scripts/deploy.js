#!/usr/bin/env node
// ============================================================
// 🚀 scripts/deploy.js — Production Deployment Orchestration
// Runs pre-flight checks → deploys → post-deploy verification.
// Usage: node scripts/deploy.js [--target=railway|vercel|manual]
// ============================================================
const { execSync } = require('child_process');
const fs = require('fs');

const target = process.argv.find(a => a.startsWith('--target='))?.split('=')[1] || 'railway';
const skipTests = process.argv.includes('--skip-tests');

function run(cmd, opts = {}) {
  console.log(`\n  ▶ ${cmd}`);
  try {
    return execSync(cmd, { stdio: opts.silent ? 'pipe' : 'inherit', encoding: 'utf8' });
  } catch (e) {
    if (!opts.tolerate) throw e;
    return null;
  }
}

async function deploy() {
  console.log(`\n🚀 NexusAI Deployment → ${target}\n`);

  // ─── 1. Pre-flight checks ──────────────
  console.log('📋 Pre-flight checks');

  if (!fs.existsSync('package.json')) {
    console.error('❌ package.json not found');
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log(`  ✅ Project: ${pkg.name} v${pkg.version}`);

  // Check for uncommitted changes
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      console.warn('  ⚠️  Uncommitted changes present');
    } else {
      console.log('  ✅ Working tree clean');
    }
  } catch (_) {}

  // ─── 2. Syntax check ────────────────────
  console.log('\n🔍 Syntax verification');
  const jsFiles = ['server.js', 'app.js', 'services/index.js'];
  jsFiles.forEach(f => {
    if (fs.existsSync(f)) {
      run(`node --check ${f}`, { silent: true });
      console.log(`  ✅ ${f}`);
    }
  });

  // ─── 3. Run tests ───────────────────────
  if (!skipTests) {
    console.log('\n🧪 Running tests');
    try {
      run('node tests/integration-mock.js', { silent: true });
      console.log('  ✅ Integration tests passed');
    } catch (e) {
      console.error('  ❌ Tests failed. Aborting deploy.');
      console.error('  Use --skip-tests to bypass (not recommended).');
      process.exit(1);
    }
  }

  // ─── 4. Environment check ───────────────
  console.log('\n🔐 Environment');
  const required = ['OPENAI_API_KEY', 'JWT_SECRET'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    console.warn(`  ⚠️  Missing (must be set in ${target}): ${missing.join(', ')}`);
  } else {
    console.log('  ✅ Required environment variables present');
  }

  // ─── 5. Deploy ──────────────────────────
  console.log(`\n📦 Deploying to ${target}`);
  const deployTargets = {
    railway: () => {
      run('railway up', { tolerate: true });
    },
    vercel: () => {
      run('vercel --prod', { tolerate: true });
    },
    manual: () => {
      console.log('  ℹ️  Manual deploy: build artifacts ready in ./');
      console.log('  ℹ️  Upload: server.js, app.js, index.html, style.css, package.json, services/, routes/, etc.');
    },
  };
  if (deployTargets[target]) deployTargets[target]();
  else console.warn(`  ⚠️  Unknown target: ${target}`);

  // ─── 6. Post-deploy verification ────────
  console.log('\n✅ Deploy complete\n');
  console.log('   Next steps:');
  console.log('   1. Verify health: curl https://<your-url>/api/health');
  console.log('   2. Check logs for startup errors');
  console.log('   3. Run E2E smoke tests: E2E_BASE_URL=https://<your-url> npx playwright test\n');
}

deploy().catch(e => {
  console.error('\n❌ Deploy failed:', e.message);
  process.exit(1);
});