// ============================================================
// 💻 services/repo-intelligence.js — Cursor-level Code Reasoning
// Repo memory · dependency graphs · bug tracing · code review
// ============================================================
const crypto = require('crypto');

class RepoIntelligence {
  constructor(options) {
    this.smartCall = options.smartCall;
    this.cache = options.cache;
    this.memory = options.memory;
    this.logger = options.logger;
    this.db = options.db;
    this.initSchema();
  }

  initSchema() {
    this.db?.prepare(`CREATE TABLE IF NOT EXISTS repo_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      repo_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      content TEXT,
      summary TEXT,
      symbols TEXT,
      imports TEXT,
      exports TEXT,
      language TEXT,
      lines INTEGER DEFAULT 0,
      indexed_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, repo_id, file_path)
    )`).run();

    this.db?.prepare(`CREATE TABLE IF NOT EXISTS repo_deps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      repo_id TEXT NOT NULL,
      from_file TEXT NOT NULL,
      to_file TEXT NOT NULL,
      symbol TEXT,
      relation TEXT
    )`).run();

    this.db?.prepare(`CREATE INDEX IF NOT EXISTS idx_repo_files ON repo_files(user_id, repo_id)`).run();
    this.db?.prepare(`CREATE INDEX IF NOT EXISTS idx_repo_deps ON repo_deps(user_id, repo_id)`).run();
  }

  // ─── Index a single file ──────────────────
  async indexFile(userId, repoId, filePath, content) {
    if (!content || content.length > 200000) return null;

    const hash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
    const language = this._detectLanguage(filePath);
    const lines = content.split('\n').length;

    // Check if already indexed
    const existing = this.db?.prepare(`SELECT content_hash FROM repo_files WHERE user_id=? AND repo_id=? AND file_path=?`)
      .get(userId, repoId, filePath);
    if (existing?.content_hash === hash) {
      return { skipped: true, reason: 'unchanged' };
    }

    // Quick static analysis
    const imports = this._extractImports(content, language);
    const exports = this._extractExports(content, language);
    const symbols = this._extractSymbols(content, language);

    // AI summary (cached by hash)
    let summary = '';
    try {
      const cached = await this.cache?.get(['repo_file_summary', hash]);
      if (cached) summary = cached;
      else {
        const r = await this.smartCall({
          prompt: `Summarize this code file in 1-2 sentences. Focus on what it does and its main responsibilities.\n\nFile: ${filePath}\n\n\`\`\`${language}\n${content.slice(0, 4000)}\n\`\`\``,
          task: 'summarization',
          max_tokens: 150,
          cacheable: false,
        });
        summary = String(r.output || '').slice(0, 500);
        await this.cache?.set(['repo_file_summary', hash], summary, { ttl: 86400 });
      }
    } catch (_) {}

    // Persist
    this.db?.prepare(`INSERT INTO repo_files (user_id, repo_id, file_path, content_hash, content, summary, symbols, imports, exports, language, lines)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON CONFLICT(user_id, repo_id, file_path) DO UPDATE SET
                     content_hash=excluded.content_hash, content=excluded.content, summary=excluded.summary,
                     symbols=excluded.symbols, imports=excluded.imports, exports=excluded.exports,
                     language=excluded.language, lines=excluded.lines, indexed_at=datetime('now')`)
      .run(userId, repoId, filePath, hash, content.slice(0, 100000), summary, JSON.stringify(symbols), JSON.stringify(imports), JSON.stringify(exports), language, lines);

    // Update dependency edges
    this.db?.prepare(`DELETE FROM repo_deps WHERE user_id=? AND repo_id=? AND from_file=?`).run(userId, repoId, filePath);
    for (const imp of imports) {
      this.db?.prepare(`INSERT INTO repo_deps (user_id, repo_id, from_file, to_file, symbol, relation) VALUES (?, ?, ?, ?, ?, ?)`)
        .run(userId, repoId, filePath, imp.from, imp.symbol || null, 'imports');
    }

    return { indexed: true, language, lines, symbols: symbols.length };
  }

  // ─── Index a set of files (a "repo") ──────
  async indexRepo(userId, repoId, files) {
    const results = [];
    for (const { path, content } of files) {
      try {
        const r = await this.indexFile(userId, repoId, path, content);
        results.push({ file: path, ...r });
      } catch (e) {
        results.push({ file: path, error: e.message });
      }
    }
    return { repo_id: repoId, file_count: files.length, results };
  }

  // ─── Search code semantically ─────────────
  async search(userId, repoId, query, limit = 10) {
    if (!this.db) return [];

    // Simple keyword match (production: use FTS5 or vector embeddings)
    const q = `%${String(query).toLowerCase()}%`;
    const rows = this.db.prepare(`SELECT file_path, summary, language, lines, symbols
                                  FROM repo_files
                                  WHERE user_id=? AND repo_id=?
                                  AND (LOWER(content) LIKE ? OR LOWER(summary) LIKE ? OR LOWER(file_path) LIKE ?)
                                  LIMIT ?`)
      .all(userId, repoId, q, q, q, limit);

    return rows.map(r => ({
      ...r,
      symbols: this._safeParse(r.symbols),
    }));
  }

  // ─── Get dependency graph ─────────────────
  graph(userId, repoId) {
    if (!this.db) return { nodes: [], edges: [] };

    const files = this.db.prepare(`SELECT file_path, summary, language FROM repo_files WHERE user_id=? AND repo_id=?`)
      .all(userId, repoId);
    const deps = this.db.prepare(`SELECT from_file, to_file, symbol, relation FROM repo_deps WHERE user_id=? AND repo_id=?`)
      .all(userId, repoId);

    return {
      nodes: files.map(f => ({ id: f.file_path, label: f.file_path.split('/').pop(), summary: f.summary, language: f.language })),
      edges: deps,
    };
  }

  // ─── Architecture summary ─────────────────
  async architecture(userId, repoId) {
    if (!this.db) return null;

    const files = this.db.prepare(`SELECT file_path, summary, language, lines FROM repo_files WHERE user_id=? AND repo_id=? LIMIT 100`)
      .all(userId, repoId);
    if (!files.length) return null;

    const result = await this.smartCall({
      prompt: `Analyze this codebase structure and produce a high-level architecture summary.

Files (${files.length}):
${files.map(f => `- ${f.file_path} (${f.language}, ${f.lines} lines): ${f.summary || 'no summary'}`).join('\n').slice(0, 6000)}

Return JSON: {"architecture":"...","main_layers":["..."],"key_modules":[{"name":"...","role":"..."}],"tech_stack":["..."],"observations":["..."],"potential_issues":["..."]}`,
      task: 'reasoning-deep',
      json: true,
      max_tokens: 1500,
      cacheable: false,
    });

    return result.output;
  }

  // ─── Bug tracing ──────────────────────────
  async traceBug(userId, repoId, errorMessage, stackTrace) {
    if (!this.db) return null;

    // Find files mentioned in stack trace
    const stackFiles = [...String(stackTrace || '').matchAll(/(\S+\.(js|ts|jsx|tsx|py|rb|go|rs)):?\d*/g)]
      .map(m => m[1])
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 8);

    const relatedFiles = stackFiles.length
      ? this.db.prepare(`SELECT file_path, summary, content FROM repo_files
                         WHERE user_id=? AND repo_id=? AND file_path IN (${stackFiles.map(() => '?').join(',')})`)
          .all(userId, repoId, ...stackFiles)
      : [];

    const result = await this.smartCall({
      prompt: `Diagnose this bug. Provide root cause, affected components, and fix.

ERROR: ${errorMessage}

STACK TRACE:
${String(stackTrace || '').slice(0, 2000)}

RELATED FILES (from your indexed repo):
${relatedFiles.map(f => `\n=== ${f.file_path} ===\n${String(f.content).slice(0, 1500)}`).join('\n')}

Return JSON: {"root_cause":"...","affected_files":["..."],"fix_strategy":"...","code_changes":[{"file":"...","change":"..."}],"confidence":0-100}`,
      task: 'reasoning-deep',
      json: true,
      max_tokens: 1500,
      cacheable: false,
    });

    return result.output;
  }

  // ─── Code review ──────────────────────────
  async review(content, language, focus = 'general') {
    const result = await this.smartCall({
      prompt: `Review this ${language} code. Focus: ${focus}.

\`\`\`${language}
${String(content).slice(0, 6000)}
\`\`\`

Return JSON: {"score":0-100,"issues":[{"severity":"critical|warn|info","line":N,"issue":"...","fix":"..."}],"strengths":["..."],"suggestions":["..."]}`,
      task: 'reasoning-deep',
      json: true,
      max_tokens: 1500,
      cacheable: false,
    });

    return result.output;
  }

  // ─── Helpers ──────────────────────────────
  _detectLanguage(filePath) {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const map = { js:'javascript', jsx:'javascript', ts:'typescript', tsx:'typescript', py:'python', rb:'ruby', go:'go', rs:'rust', java:'java', kt:'kotlin', php:'php', cs:'csharp', cpp:'cpp', c:'c', html:'html', css:'css', md:'markdown', json:'json', yaml:'yaml', yml:'yaml', sql:'sql', sh:'bash' };
    return map[ext] || 'text';
  }

  _extractImports(content, language) {
    const imports = [];
    if (language === 'javascript' || language === 'typescript') {
      const re = /(?:import\s+(?:[\w*\s{},]+)\s+from\s+['"]([^'"]+)['"])|(?:require\(['"]([^'"]+)['"]\))/g;
      let m; while ((m = re.exec(content)) !== null) {
        imports.push({ from: m[1] || m[2], symbol: null });
      }
    } else if (language === 'python') {
      const re = /(?:from\s+(\S+)\s+import\s+(\S+))|(?:import\s+(\S+))/g;
      let m; while ((m = re.exec(content)) !== null) {
        imports.push({ from: m[1] || m[3], symbol: m[2] || null });
      }
    }
    return imports.slice(0, 50);
  }

  _extractExports(content, language) {
    const exports = [];
    if (language === 'javascript' || language === 'typescript') {
      const re = /export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)/g;
      let m; while ((m = re.exec(content)) !== null) exports.push(m[1]);
    }
    return exports.slice(0, 50);
  }

  _extractSymbols(content, language) {
    const symbols = [];
    if (language === 'javascript' || language === 'typescript') {
      const re = /(?:function\s+(\w+)|class\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\())/g;
      let m; while ((m = re.exec(content)) !== null) symbols.push(m[1] || m[2] || m[3]);
    } else if (language === 'python') {
      const re = /(?:def\s+(\w+)|class\s+(\w+))/g;
      let m; while ((m = re.exec(content)) !== null) symbols.push(m[1] || m[2]);
    }
    return [...new Set(symbols)].slice(0, 100);
  }

  _safeParse(s) { try { return JSON.parse(s); } catch (_) { return s; } }
}

module.exports = { RepoIntelligence };