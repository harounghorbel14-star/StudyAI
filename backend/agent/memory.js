// ============================================================
// 🧠 agent/memory.js — Episodic memory and reviewed lessons
//
// Layers (all scoped to one user; no query here can return another
// user's rows):
//   working memory  lives in the runner for the current run only
//   episodes        agent_runs rows: goal, outcome, verification,
//                   failure category. Summaries of similar past runs
//                   are offered to the planner as context.
//   evidence        agent_evidence: quotes with their source URLs from
//                   verified research. Knowledge with provenance; never
//                   promoted to "fact" without a source.
//   lessons         agent_lessons: short strategy notes. The agent may
//                   only PROPOSE them. A lesson influences later runs
//                   only after the user approves it (or writes it
//                   themselves). Rejected or deleted lessons are never
//                   used. Nothing here trains or fine-tunes a model.
//
// Poisoning controls: lessons are length-limited, refused if they read
// like injected instructions, de-duplicated, and always presented to
// the planner as advisory notes, never as instructions.
// ============================================================
const { INJECTION_RE, tokenize, relevance } = require('../research/engine');

const MAX_LESSON = 300;

function similarity(a, b) {
  const A = new Set(tokenize(a)); const B = new Set(tokenize(b));
  if (!A.size || !B.size) return 0;
  let n = 0; for (const x of A) if (B.has(x)) n++;
  return n / (A.size + B.size - n);
}

class AgentMemory {
  constructor(db, { now = Date.now } = {}) {
    this.db = db;
    this.now = now;
    db.prepare(`CREATE TABLE IF NOT EXISTS agent_lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      applies_when TEXT,
      status TEXT NOT NULL CHECK (status IN ('proposed','approved','rejected')),
      origin TEXT NOT NULL CHECK (origin IN ('agent','user')),
      source_run_id TEXT,
      uses INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      reviewed_at INTEGER
    )`).run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_agent_lessons_user ON agent_lessons(user_id, status)').run();
    db.prepare(`CREATE TABLE IF NOT EXISTS agent_evidence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      title TEXT,
      quote TEXT NOT NULL,
      claim TEXT,
      published_at TEXT,
      retrieved_at INTEGER NOT NULL
    )`).run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_agent_evidence_run ON agent_evidence(run_id)').run();
  }

  /** Validate lesson text. Returns an error message or null. */
  checkLesson(text) {
    const t = String(text || '').trim();
    if (t.length < 10) return 'Lesson is too short.';
    if (t.length > MAX_LESSON) return `Lesson must be at most ${MAX_LESSON} characters.`;
    if (INJECTION_RE.test(t)) return 'Lesson looks like an instruction to the AI rather than a strategy note.';
    return null;
  }

  _duplicateOf(userId, text) {
    const rows = this.db.prepare("SELECT id, text FROM agent_lessons WHERE user_id = ? AND status != 'rejected'").all(userId);
    return rows.find((r) => similarity(r.text, text) >= 0.8) || null;
  }

  propose(userId, { text, applies_when, run_id }) {
    if (this.checkLesson(text)) return null;
    if (this._duplicateOf(userId, text)) return null;
    const id = this.db.prepare(`INSERT INTO agent_lessons (user_id, text, applies_when, status, origin, source_run_id, created_at)
      VALUES (?, ?, ?, 'proposed', 'agent', ?, ?)`).run(userId, String(text).trim(), String(applies_when || '').slice(0, 200), run_id || null, this.now()).lastInsertRowid;
    return this.get(userId, id);
  }

  /** A lesson written by the user is reviewed by definition. */
  addByUser(userId, text, applies_when = '') {
    const err = this.checkLesson(text);
    if (err) return { error: err };
    const dup = this._duplicateOf(userId, text);
    if (dup) return { error: 'A very similar lesson already exists.', duplicate_of: dup.id };
    const id = this.db.prepare(`INSERT INTO agent_lessons (user_id, text, applies_when, status, origin, created_at, reviewed_at)
      VALUES (?, ?, ?, 'approved', 'user', ?, ?)`).run(userId, String(text).trim(), String(applies_when).slice(0, 200), this.now(), this.now()).lastInsertRowid;
    return { lesson: this.get(userId, id) };
  }

  review(userId, id, status) {
    if (!['approved', 'rejected'].includes(status)) return null;
    const r = this.db.prepare('UPDATE agent_lessons SET status = ?, reviewed_at = ? WHERE id = ? AND user_id = ?')
      .run(status, this.now(), id, userId);
    return r.changes ? this.get(userId, id) : null;
  }

  remove(userId, id) {
    return this.db.prepare('DELETE FROM agent_lessons WHERE id = ? AND user_id = ?').run(id, userId).changes > 0;
  }

  get(userId, id) {
    return this.db.prepare('SELECT * FROM agent_lessons WHERE id = ? AND user_id = ?').get(id, userId) || null;
  }

  list(userId, status) {
    return status
      ? this.db.prepare('SELECT * FROM agent_lessons WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT 100').all(userId, status)
      : this.db.prepare('SELECT * FROM agent_lessons WHERE user_id = ? ORDER BY created_at DESC LIMIT 100').all(userId);
  }

  /** Approved lessons relevant to a goal, most relevant first. Marks them used. */
  relevantLessons(userId, goal, limit = 3) {
    const terms = tokenize(goal);
    const rows = this.db.prepare("SELECT * FROM agent_lessons WHERE user_id = ? AND status = 'approved'").all(userId)
      .map((l) => ({ ...l, score: relevance(terms, `${l.text} ${l.applies_when || ''}`) }))
      .filter((l) => l.score > 0.15)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    for (const l of rows) this.db.prepare('UPDATE agent_lessons SET uses = uses + 1 WHERE id = ?').run(l.id);
    return rows;
  }

  /** Short summaries of this user's similar finished runs. */
  similarEpisodes(userId, goal, excludeRunId, limit = 3) {
    const rows = this.db.prepare(`SELECT id, goal, status, result, error, finished_at FROM agent_runs
      WHERE user_id = ? AND id != ? AND status IN ('succeeded','failed','stopped') ORDER BY finished_at DESC LIMIT 50`).all(userId, excludeRunId || '');
    return rows.map((r) => ({ ...r, sim: similarity(goal, r.goal) }))
      .filter((r) => r.sim >= 0.3).sort((a, b) => b.sim - a.sim).slice(0, limit)
      .map((r) => {
        let verification = null;
        try { verification = JSON.parse(r.result || '{}').verification?.passed; } catch (_) { /* ignore */ }
        return { run_id: r.id, goal: r.goal, outcome: r.status, verified: verification, error: r.error ? String(r.error).slice(0, 120) : null };
      });
  }

  recordEvidence(userId, runId, citations) {
    const ins = this.db.prepare(`INSERT INTO agent_evidence (run_id, user_id, url, title, quote, claim, published_at, retrieved_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const c of citations || []) {
      for (const q of c.quotes || []) ins.run(runId, userId, c.url, c.title || null, q, null, c.published_at || null, this.now());
    }
  }
}

module.exports = { AgentMemory, similarity, MAX_LESSON };
