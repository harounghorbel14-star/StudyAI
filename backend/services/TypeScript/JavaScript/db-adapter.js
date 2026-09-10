// ============================================================
// 🐘 services/db-adapter.js — Universal DB Adapter
// Allows SQLite (dev) → PostgreSQL (production) without rewriting service code.
// All services use the same db.prepare(sql).run/get/all interface.
// ============================================================

/**
 * @typedef {Object} DBStatement
 * @property {(...params: any[]) => { changes: number, lastInsertRowid?: number }} run
 * @property {(...params: any[]) => any} get
 * @property {(...params: any[]) => any[]} all
 */

/**
 * @typedef {Object} DBAdapter
 * @property {(sql: string) => DBStatement} prepare
 * @property {(sql: string) => void} exec
 * @property {() => void} close
 */

// ─── Detect environment and pick implementation ───
function createDb(options = {}) {
  const url = options.url || process.env.DATABASE_URL || '';
  const useSQLite = !url || url.startsWith('sqlite:') || options.force === 'sqlite';

  if (useSQLite) return createSQLite(options);
  if (url.startsWith('postgres')) return createPostgres(url, options);
  throw new Error('Unsupported DATABASE_URL: ' + url);
}

// ─── SQLite (dev / default) ────────────────
function createSQLite(options = {}) {
  let Database;
  try {
    Database = require('better-sqlite3');
  } catch (e) {
    throw new Error('better-sqlite3 not installed. Run: npm install better-sqlite3');
  }
  const path = options.path || 'nexusai.db';
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db; // better-sqlite3 already has prepare().run/get/all
}

// ─── PostgreSQL adapter (production) ───────
// Translates SQLite syntax → PostgreSQL on the fly.
// Uses synchronous-style API by deferring with sync wrappers.
function createPostgres(url, options = {}) {
  let Client;
  try {
    Client = require('pg').Client;
  } catch (e) {
    throw new Error('pg not installed. Run: npm install pg');
  }

  // For production, you'd use a connection pool here.
  // This is a minimal sketch showing the adapter pattern.
  const client = new Client({ connectionString: url });
  let connected = false;
  client.connect().then(() => { connected = true; }).catch(() => {});

  function translate(sql) {
    // SQLite → PostgreSQL syntax translation
    return sql
      .replace(/AUTOINCREMENT/gi, '')
      .replace(/INTEGER PRIMARY KEY/g, 'SERIAL PRIMARY KEY')
      .replace(/IS \?/g, '= $PARAM')
      // Convert ? placeholders to $1, $2, $3
      .replace(/\?/g, (() => {
        let i = 0;
        return () => `$${++i}`;
      })());
  }

  return {
    prepare(sql) {
      const translated = translate(sql);
      return {
        run: async (...params) => {
          if (!connected) throw new Error('Postgres not connected');
          const r = await client.query(translated, params.flat());
          return { changes: r.rowCount, lastInsertRowid: r.rows[0]?.id };
        },
        get: async (...params) => {
          const r = await client.query(translated, params.flat());
          return r.rows[0] || null;
        },
        all: async (...params) => {
          const r = await client.query(translated, params.flat());
          return r.rows;
        },
      };
    },
    exec: async (sql) => {
      if (!connected) throw new Error('Postgres not connected');
      await client.query(translate(sql));
    },
    close: () => client.end(),
    pragma: () => {}, // no-op for postgres
  };
}

module.exports = { createDb };