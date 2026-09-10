// ============================================================
// 🐘 scripts/migrate-to-postgres.js — Real SQLite → PostgreSQL migration
// Migrates data from nexusai.db to Postgres with progress + rollback safety.
// Usage: DATABASE_URL=postgres://... node scripts/migrate-to-postgres.js
// ============================================================
const path = require('path');
const fs = require('fs');

async function migrate() {
  console.log('🐘 NexusAI SQLite → PostgreSQL Migration\n');

  // ─── Verify environment ──────────────────
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set. Export it first.');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL.startsWith('postgres')) {
    console.error('❌ DATABASE_URL must be a postgres:// connection string');
    process.exit(1);
  }

  const sqlitePath = process.env.SQLITE_PATH || 'nexusai.db';
  if (!fs.existsSync(sqlitePath)) {
    console.error(`❌ SQLite database not found: ${sqlitePath}`);
    process.exit(1);
  }

  // ─── Load dependencies ───────────────────
  let Database, Client;
  try {
    Database = require('better-sqlite3');
    Client = require('pg').Client;
  } catch (e) {
    console.error('❌ Missing dependencies. Run: npm install better-sqlite3 pg');
    process.exit(1);
  }

  const sqlite = new Database(sqlitePath, { readonly: true });
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  console.log('✅ Connected to source SQLite and target Postgres\n');

  // ─── Get all tables from SQLite ──────────
  const tables = sqlite.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
  ).all().map(t => t.name);

  console.log(`📋 Found ${tables.length} tables to migrate\n`);

  // ─── Migrate each table ──────────────────
  const stats = {};
  let totalRows = 0;

  for (const table of tables) {
    process.stdout.write(`  Migrating ${table}... `);
    try {
      const count = sqlite.prepare(`SELECT COUNT(*) as c FROM "${table}"`).get().c;
      if (count === 0) {
        console.log('empty');
        stats[table] = 0;
        continue;
      }

      // Read all rows
      const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all();
      if (!rows.length) {
        console.log('empty');
        stats[table] = 0;
        continue;
      }

      // Get column names
      const cols = Object.keys(rows[0]);

      // Batch insert with ON CONFLICT DO NOTHING to be idempotent
      const batchSize = 200;
      let inserted = 0;

      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const values = batch.map((r, idx) => {
          const placeholders = cols.map((_, ci) => `$${idx * cols.length + ci + 1}`).join(',');
          return `(${placeholders})`;
        }).join(',');

        const params = batch.flatMap(r => cols.map(c => r[c]));
        const sql = `INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(',')}) VALUES ${values} ON CONFLICT DO NOTHING`;

        try {
          const result = await pg.query(sql, params);
          inserted += result.rowCount || 0;
        } catch (e) {
          console.log(`\n    ⚠️  Batch error: ${e.message}`);
        }
      }

      console.log(`${inserted}/${count} rows`);
      stats[table] = inserted;
      totalRows += inserted;
    } catch (e) {
      console.log(`❌ ${e.message}`);
      stats[table] = -1;
    }
  }

  // ─── Summary ─────────────────────────────
  console.log(`\n📊 Migration complete: ${totalRows} rows across ${Object.keys(stats).length} tables\n`);
  console.table(stats);

  await pg.end();
  sqlite.close();

  console.log('\n✅ Done. To activate Postgres in production, keep DATABASE_URL set.');
  console.log('   To rollback, unset DATABASE_URL — code will fall back to SQLite.\n');
}

migrate().catch(e => {
  console.error('❌ Fatal:', e.message);
  process.exit(1);
});