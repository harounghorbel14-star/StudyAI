// check-db.js — inspect both SQLite files
const path = require('path');
const Database = require('better-sqlite3');

const targets = [
  path.join(__dirname, 'studyai.db'),
  path.join(__dirname, 'backend', 'studyai.db'),
];

for (const file of targets) {
  console.log('\n========================================');
  console.log(file);
  console.log('========================================');

  let db;
  try {
    db = new Database(file, { readonly: true });
  } catch (err) {
    console.log('  OPEN FAILED:', err.message);
    continue;
  }

  try {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map(r => r.name);

    console.log('  tables (' + tables.length + '):', tables.join(', ') || '(none)');

    if (!tables.includes('users')) {
      console.log('  -> no users table');
    } else {
      const rows = db
        .prepare('SELECT id, email, plan, created_at FROM users ORDER BY id')
        .all();
      console.log('  users (' + rows.length + '):');
      if (rows.length === 0) {
        console.log('    (empty)');
      } else {
        for (const r of rows) {
          console.log('    #' + r.id, r.email, '| plan:' + r.plan, '| ' + r.created_at);
        }
      }
    }

    if (tables.includes('conversations')) {
      const n = db.prepare('SELECT COUNT(*) AS n FROM conversations').get().n;
      console.log('  conversations:', n);
    }
  } catch (err) {
    console.log('  READ FAILED:', err.message);
  } finally {
    db.close();
  }
}