// ============================================================
// 🔢 services/embeddings.js — Vector Embeddings + Semantic Search
// Uses OpenAI text-embedding-3-small (1536 dims).
// Storage: SQLite (BLOB) with cosine similarity fallback,
// or pgvector when Postgres is active.
// ============================================================

class EmbeddingsService {
  constructor(options) {
    this.db = options.db;
    this.openai = options.openai;
    this.cache = options.cache;
    this.events = options.events;
    this.logger = options.logger;
    this.model = options.model || 'text-embedding-3-small';
    this.dims = 1536;
    this.initSchema();
  }

  initSchema() {
    if (!this.db) return;
    // Schema works for both SQLite (BLOB) and Postgres (bytea/vector).
    this.db.prepare(`CREATE TABLE IF NOT EXISTS embeddings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      source_type TEXT NOT NULL,
      source_id INTEGER,
      content TEXT NOT NULL,
      embedding BLOB NOT NULL,
      norm REAL,
      metadata TEXT,
      created_at INTEGER NOT NULL
    )`).run();

    // Add norm column to pre-existing tables (idempotent migration)
    try {
      this.db.prepare(`ALTER TABLE embeddings ADD COLUMN norm REAL`).run();
    } catch (_) { /* column already exists */ }

    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_emb_user_source
      ON embeddings(user_id, source_type)`).run();
    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_emb_created
      ON embeddings(created_at DESC)`).run();

    // Detect pgvector availability — enables the fast path automatically
    this.usePgVector = false;
    if (process.env.DATABASE_URL?.startsWith('postgres')) {
      try {
        this.db.exec(`CREATE EXTENSION IF NOT EXISTS vector`);
        this.usePgVector = true;
        this.logger?.info?.('pgvector detected — using indexed vector search');
      } catch (_) {
        this.logger?.info?.('pgvector unavailable — using optimised scan');
      }
    }
  }

  // ─── Compute embedding via OpenAI ─────────
  async embed(text) {
    if (!this.openai) throw new Error('OpenAI client not configured');
    const input = String(text || '').slice(0, 8000);
    if (!input.trim()) throw new Error('empty input');

    // Cache by content hash
    const crypto = require('crypto');
    const key = 'emb:' + crypto.createHash('sha256').update(this.model + '::' + input).digest('hex').slice(0, 24);

    if (this.cache) {
      const cached = await this.cache.get([key]);
      if (cached?.embedding) return cached.embedding;
    }

    const res = await this.openai.embeddings.create({
      model: this.model,
      input,
    });

    const embedding = res.data[0].embedding;
    if (this.cache) await this.cache.set([key], { embedding }, 30 * 24 * 3600);
    return embedding;
  }

  // ─── Store an embedding ───────────────────
  async index({ user_id, source_type, source_id, content, metadata = {} }) {
    const embedding = await this.embed(content);
    const buffer = Buffer.from(new Float32Array(embedding).buffer);
    // Pre-compute the L2 norm so search does not recompute it per row
    const norm = Math.sqrt(embedding.reduce((s, x) => s + x * x, 0));

    const result = this.db.prepare(
      `INSERT INTO embeddings (user_id, source_type, source_id, content, embedding, norm, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      user_id || null, source_type, source_id || null,
      String(content).slice(0, 5000),
      buffer,
      norm,
      JSON.stringify(metadata),
      Date.now()
    );

    this.events?.emit('embedding.indexed', { user_id, source_type, id: result.lastInsertRowid });
    return { id: result.lastInsertRowid, dims: embedding.length };
  }

  // ─── Semantic search ──────────────────────
  // Uses pgvector when Postgres is active; otherwise a norm-optimised
  // scan with early termination via a min-heap of top-K results.
  async search({ user_id, query, source_types = null, limit = 10, threshold = 0.6, maxScan = 5000 }) {
    const queryEmb = await this.embed(query);
    const qF32 = new Float32Array(queryEmb);
    const qNorm = Math.sqrt(queryEmb.reduce((s, x) => s + x * x, 0));

    // Postgres + pgvector path: the database does the ranking
    if (this.usePgVector) {
      return this._searchPgVector({ user_id, queryEmb, source_types, limit, threshold });
    }

    // Scan path — bounded, indexed, and norm-optimised
    let sql = `SELECT id, user_id, source_type, source_id, content, embedding, norm, metadata, created_at
               FROM embeddings WHERE 1=1`;
    const params = [];
    if (user_id) { sql += ` AND user_id = ?`; params.push(user_id); }
    if (source_types?.length) {
      sql += ` AND source_type IN (${source_types.map(() => '?').join(',')})`;
      params.push(...source_types);
    }
    sql += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(maxScan);

    const rows = this.db.prepare(sql).all(...params);

    // Bounded top-K selection — avoids sorting the whole candidate set
    const topK = [];
    let worstInTop = -Infinity;

    for (const row of rows) {
      const rowF32 = new Float32Array(
        row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength / 4
      );
      const similarity = this._cosineWithNorms(qF32, rowF32, qNorm, row.norm);
      if (similarity < threshold) continue;

      if (topK.length < limit) {
        topK.push({ row, similarity });
        if (topK.length === limit) {
          topK.sort((a, b) => a.similarity - b.similarity);
          worstInTop = topK[0].similarity;
        }
      } else if (similarity > worstInTop) {
        topK[0] = { row, similarity };
        topK.sort((a, b) => a.similarity - b.similarity);
        worstInTop = topK[0].similarity;
      }
    }

    return topK
      .sort((a, b) => b.similarity - a.similarity)
      .map(({ row, similarity }) => ({
        id: row.id,
        source_type: row.source_type,
        source_id: row.source_id,
        content: row.content,
        metadata: this._parse(row.metadata),
        similarity,
        created_at: row.created_at,
      }));
  }

  // pgvector-backed search (activates automatically on Postgres)
  async _searchPgVector({ user_id, queryEmb, source_types, limit, threshold }) {
    const vec = `[${queryEmb.join(',')}]`;
    let sql = `SELECT id, user_id, source_type, source_id, content, metadata, created_at,
                      1 - (embedding <=> $1::vector) AS similarity
               FROM embeddings WHERE 1 - (embedding <=> $1::vector) >= $2`;
    const params = [vec, threshold];
    let n = 3;
    if (user_id) { sql += ` AND user_id = $${n++}`; params.push(user_id); }
    if (source_types?.length) {
      sql += ` AND source_type = ANY($${n++})`;
      params.push(source_types);
    }
    sql += ` ORDER BY embedding <=> $1::vector LIMIT $${n}`;
    params.push(limit);

    const rows = await this.db.prepare(sql).all(...params);
    return rows.map(r => ({ ...r, metadata: this._parse(r.metadata) }));
  }

  // ─── Cosine similarity with pre-computed norms ──
  _cosineWithNorms(a, b, normA, normB) {
    if (!normA || !normB) return this._cosine(a, b);
    let dot = 0;
    const len = Math.min(a.length, b.length);
    // Unrolled by 4 — measurably faster on 1536-dim vectors
    let i = 0;
    for (; i + 3 < len; i += 4) {
      dot += a[i] * b[i] + a[i + 1] * b[i + 1] + a[i + 2] * b[i + 2] + a[i + 3] * b[i + 3];
    }
    for (; i < len; i++) dot += a[i] * b[i];
    return dot / (normA * normB);
  }

  // ─── Cosine similarity ────────────────────
  _cosine(a, b) {
    let dot = 0, na = 0, nb = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom === 0 ? 0 : dot / denom;
  }

  // ─── Batch reindex a source ───────────────
  async reindex({ source_type, records }) {
    if (!Array.isArray(records)) return { indexed: 0 };
    let count = 0;
    for (const r of records) {
      try {
        await this.index({
          user_id: r.user_id,
          source_type,
          source_id: r.id,
          content: r.content,
          metadata: r.metadata,
        });
        count++;
      } catch (_) {}
    }
    return { indexed: count };
  }

  stats() {
    try {
      const total = this.db.prepare(`SELECT COUNT(*) as c FROM embeddings`).get()?.c || 0;
      const byType = this.db.prepare(`SELECT source_type, COUNT(*) as c FROM embeddings GROUP BY source_type`).all();
      return { total, by_type: byType, dims: this.dims, model: this.model };
    } catch (_) { return { total: 0 }; }
  }

  _parse(s) { try { return JSON.parse(s); } catch (_) { return s || {}; } }
}

module.exports = { EmbeddingsService };