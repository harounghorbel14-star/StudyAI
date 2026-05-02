// ============================================================
// 📂 FILES & KNOWLEDGE ROUTES
// ============================================================
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');

module.exports = (db, openai, requireAuth, requireQuota, aiLimiter, wrap, chatComplete, uploadDir) => {

// ── DB Tables ─────────────────────────────────
db.prepare(`CREATE TABLE IF NOT EXISTS document_embeddings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  doc_id TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding TEXT,
  tags TEXT,
  version INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS doc_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  doc_id TEXT NOT NULL,
  content TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS doc_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  doc_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  UNIQUE(user_id, doc_id, tag)
)`).run();

const fileUpload = multer({ dest: uploadDir, limits:{ fileSize: 20*1024*1024 } });

// ── Helpers ───────────────────────────────────

// Simple cosine similarity for semantic search (no external DB needed)
function cosineSimilarity(a, b){
  if(!a||!b)return 0;
  const va=JSON.parse(a), vb=JSON.parse(b);
  let dot=0, ma=0, mb=0;
  for(let i=0;i<va.length;i++){dot+=va[i]*vb[i];ma+=va[i]**2;mb+=vb[i]**2;}
  return dot/(Math.sqrt(ma)*Math.sqrt(mb)||1);
}

// Generate embedding using OpenAI
async function getEmbedding(text){
  try{
    const r = await openai.embeddings.create({
      model:'text-embedding-3-small',
      input: text.slice(0,8000),
    });
    return JSON.stringify(r.data[0].embedding);
  }catch(_){return null;}
}

// Extract metadata from content
async function extractMetadata(content, title){
  try{
    const r = await openai.chat.completions.create({
      model:'gpt-4o-mini', max_tokens:150,
      messages:[{role:'user',content:`Extract metadata from this document. Return JSON: {"tags":["tag1","tag2"],"summary":"one sentence","type":"article/report/note/code","language":"en"}\n\nTitle: ${title}\nContent: ${content.slice(0,500)}`}]
    });
    return JSON.parse(r.choices[0]?.message?.content?.trim().replace(/```json|```/g,'')||'{}');
  }catch(_){return{tags:[],summary:'',type:'document',language:'en'};}
}

// ── 1. Document Upload & Indexing ─────────────
router.post('/upload', requireAuth, requireQuota, aiLimiter, fileUpload.single('file'), wrap(async (req,res)=>{
  if(!req.file) return res.status(400).json({error:'No file uploaded.'});
  const filePath = req.file.path;
  const filename = req.file.originalname||'document';
  const ext = filename.split('.').pop().toLowerCase();

  try{
    let content = '';
    if(['txt','md','json','csv'].includes(ext)){
      content = fs.readFileSync(filePath,'utf-8').slice(0,50000);
    } else if(ext==='pdf'){
      const pdfParse = require('pdf-parse');
      const buf = fs.readFileSync(filePath);
      const parsed = await pdfParse(buf);
      content = parsed.text.slice(0,50000);
    } else {
      content = fs.readFileSync(filePath,'utf-8','replace').replace(/[^\x20-\x7E\n]/g,' ').slice(0,20000);
    }

    if(!content.trim()) return res.status(422).json({error:'Could not extract content.'});

    const docId = 'doc_'+Date.now()+'_'+Math.random().toString(36).slice(2,6);
    const metadata = await extractMetadata(content, filename);
    const embedding = await getEmbedding(content.slice(0,5000));

    db.prepare(`INSERT INTO document_embeddings (user_id,doc_id,doc_type,title,content,embedding,tags) VALUES (?,?,?,?,?,?,?)`).run(
      req.user.id, docId, metadata.type||ext, filename, content, embedding, JSON.stringify(metadata.tags||[])
    );

    // Save initial version
    db.prepare(`INSERT INTO doc_versions (user_id,doc_id,content,version) VALUES (?,?,?,1)`).run(req.user.id, docId, content);

    // Save tags
    for(const tag of (metadata.tags||[]).slice(0,10)){
      try{db.prepare(`INSERT OR IGNORE INTO doc_tags (user_id,doc_id,tag) VALUES (?,?,?)`).run(req.user.id, docId, tag);}catch(_){}
    }

    res.json({ok:true, doc_id:docId, title:filename, summary:metadata.summary, tags:metadata.tags, type:metadata.type});
  }finally{fs.unlink(filePath,()=>{});}
}));

// ── 2. Semantic Search ────────────────────────
router.get('/search', requireAuth, wrap(async (req,res)=>{
  const q = req.query.q?.trim();
  if(!q) return res.json({results:[]});

  const docs = db.prepare(`SELECT * FROM document_embeddings WHERE user_id=? ORDER BY created_at DESC LIMIT 50`).all(req.user.id);

  // Generate query embedding for semantic search
  const queryEmbedding = await getEmbedding(q);

  let results;
  if(queryEmbedding){
    // Semantic search using cosine similarity
    results = docs.map(doc=>({
      ...doc,
      score: cosineSimilarity(queryEmbedding, doc.embedding),
    })).sort((a,b)=>b.score-a.score).slice(0,10);
  } else {
    // Fallback: keyword search
    results = docs.filter(d=>
      d.title.toLowerCase().includes(q.toLowerCase()) ||
      d.content.toLowerCase().includes(q.toLowerCase())
    ).slice(0,10);
  }

  res.json({results: results.map(r=>({
    doc_id:r.doc_id, title:r.title, type:r.doc_type,
    score:r.score?.toFixed(3)||'N/A',
    preview:r.content.slice(0,200),
    tags:r.tags, created_at:r.created_at
  }))});
}));

// ── 3. List Documents ─────────────────────────
router.get('/list', requireAuth, wrap(async (req,res)=>{
  const docs = db.prepare(`SELECT doc_id,title,doc_type,tags,version,created_at,updated_at FROM document_embeddings WHERE user_id=? ORDER BY updated_at DESC`).all(req.user.id);
  res.json({docs});
}));

// ── 4. Get Document ───────────────────────────
router.get('/:doc_id', requireAuth, wrap(async (req,res)=>{
  const doc = db.prepare(`SELECT * FROM document_embeddings WHERE doc_id=? AND user_id=?`).get(req.params.doc_id, req.user.id);
  if(!doc) return res.status(404).json({error:'Document not found.'});
  res.json({doc:{...doc, embedding:undefined}});
}));

// ── 5. Update Document ────────────────────────
router.patch('/:doc_id', requireAuth, wrap(async (req,res)=>{
  const {content, title} = req.body;
  const doc = db.prepare(`SELECT * FROM document_embeddings WHERE doc_id=? AND user_id=?`).get(req.params.doc_id, req.user.id);
  if(!doc) return res.status(404).json({error:'Not found.'});

  const newVersion = doc.version + 1;
  // Save version history
  db.prepare(`INSERT INTO doc_versions (user_id,doc_id,content,version) VALUES (?,?,?,?)`).run(req.user.id, doc.doc_id, doc.content, doc.version);

  // Update with new embedding
  const embedding = content ? await getEmbedding(content.slice(0,5000)) : doc.embedding;
  db.prepare(`UPDATE document_embeddings SET content=COALESCE(?,content),title=COALESCE(?,title),embedding=?,version=?,updated_at=datetime('now') WHERE doc_id=? AND user_id=?`).run(
    content||null, title||null, embedding, newVersion, doc.doc_id, req.user.id
  );
  res.json({ok:true, version:newVersion});
}));

// ── 6. Version History ────────────────────────
router.get('/:doc_id/versions', requireAuth, wrap(async (req,res)=>{
  const versions = db.prepare(`SELECT id,version,created_at FROM doc_versions WHERE doc_id=? AND user_id=? ORDER BY version DESC`).all(req.params.doc_id, req.user.id);
  res.json({versions});
}));

router.get('/:doc_id/versions/:v', requireAuth, wrap(async (req,res)=>{
  const version = db.prepare(`SELECT * FROM doc_versions WHERE doc_id=? AND user_id=? AND version=?`).get(req.params.doc_id, req.user.id, Number(req.params.v));
  if(!version) return res.status(404).json({error:'Version not found.'});
  res.json({version});
}));

// ── 7. Delete Document ────────────────────────
router.delete('/:doc_id', requireAuth, wrap(async (req,res)=>{
  db.prepare(`DELETE FROM document_embeddings WHERE doc_id=? AND user_id=?`).run(req.params.doc_id, req.user.id);
  db.prepare(`DELETE FROM doc_versions WHERE doc_id=? AND user_id=?`).run(req.params.doc_id, req.user.id);
  res.json({ok:true});
}));

// ── 8. Ask AI about document ──────────────────
router.post('/:doc_id/ask', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {question} = req.body;
  if(!question) return res.status(400).json({error:'Missing question.'});
  const doc = db.prepare(`SELECT title,content FROM document_embeddings WHERE doc_id=? AND user_id=?`).get(req.params.doc_id, req.user.id);
  if(!doc) return res.status(404).json({error:'Not found.'});
  const answer = await chatComplete(
    `You are a document assistant. Answer based ONLY on this document: "${doc.title}". If not in document, say so.`,
    `Document:\n${doc.content.slice(0,8000)}\n\nQuestion: ${question}`, 'gpt-4o'
  );
  res.json({answer});
}));

// ── 9. Cross-file reasoning ───────────────────
router.post('/compare', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {doc_ids, question} = req.body;
  if(!doc_ids?.length||!question) return res.status(400).json({error:'Missing doc_ids or question.'});
  const docs = doc_ids.slice(0,5).map(id=>
    db.prepare(`SELECT title,content FROM document_embeddings WHERE doc_id=? AND user_id=?`).get(id, req.user.id)
  ).filter(Boolean);
  if(!docs.length) return res.status(404).json({error:'No documents found.'});
  const context = docs.map((d,i)=>`[DOC ${i+1}: ${d.title}]\n${d.content.slice(0,3000)}`).join('\n\n---\n\n');
  const answer = await chatComplete(
    'You are an expert document analyst. Compare and analyze across multiple documents.',
    `${context}\n\n---\nQuestion: ${question}`, 'gpt-4o'
  );
  res.json({answer, documents:docs.map(d=>d.title)});
}));

// ── 10. Smart tagging ─────────────────────────
router.post('/:doc_id/tags', requireAuth, wrap(async (req,res)=>{
  const {tags} = req.body;
  if(!tags?.length) return res.status(400).json({error:'Missing tags.'});
  for(const tag of tags.slice(0,20)){
    try{db.prepare(`INSERT OR IGNORE INTO doc_tags (user_id,doc_id,tag) VALUES (?,?,?)`).run(req.user.id, req.params.doc_id, tag);}catch(_){}
  }
  db.prepare(`UPDATE document_embeddings SET tags=? WHERE doc_id=? AND user_id=?`).run(JSON.stringify(tags), req.params.doc_id, req.user.id);
  res.json({ok:true});
}));

// ── 11. Search by tag ─────────────────────────
router.get('/tag/:tag', requireAuth, wrap(async (req,res)=>{
  const docs = db.prepare(`SELECT de.doc_id,de.title,de.doc_type,de.created_at FROM doc_tags dt JOIN document_embeddings de ON dt.doc_id=de.doc_id WHERE dt.user_id=? AND dt.tag=?`).all(req.user.id, req.params.tag);
  res.json({docs});
}));

// ── 12. Summarize document ────────────────────
router.post('/:doc_id/summarize', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {level='brief'} = req.body;
  const doc = db.prepare(`SELECT title,content FROM document_embeddings WHERE doc_id=? AND user_id=?`).get(req.params.doc_id, req.user.id);
  if(!doc) return res.status(404).json({error:'Not found.'});
  const prompts={
    brief:`Summarize in 2-3 sentences.`,
    detailed:`Provide a detailed summary with key points, main arguments, and conclusions.`,
    bullets:`Summarize as bullet points covering all main topics.`,
    executive:`Write an executive summary suitable for leadership.`,
  };
  const summary = await chatComplete(prompts[level]||prompts.brief, `Document: ${doc.title}\n\n${doc.content.slice(0,8000)}`, 'gpt-4o');
  res.json({summary, level, title:doc.title});
}));

// ── 13. Extract highlights ────────────────────
router.post('/:doc_id/highlights', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const doc = db.prepare(`SELECT title,content FROM document_embeddings WHERE doc_id=? AND user_id=?`).get(req.params.doc_id, req.user.id);
  if(!doc) return res.status(404).json({error:'Not found.'});
  const result = await openai.chat.completions.create({
    model:'gpt-4o', max_tokens:500,
    messages:[{role:'user',content:`Extract key highlights, important quotes, and critical insights from this document. Return JSON: {"highlights":["..."],"key_quotes":["..."],"insights":["..."]}\n\n${doc.content.slice(0,6000)}`}]
  });
  try{
    const data=JSON.parse(result.choices[0]?.message?.content?.trim().replace(/```json|```/g,'')||'{}');
    res.json({...data, title:doc.title});
  }catch(_){res.json({highlights:[],key_quotes:[],insights:[]});}
}));

// ── 14. Document comparison ───────────────────
router.post('/diff', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {doc_id_1, doc_id_2} = req.body;
  const doc1 = db.prepare(`SELECT title,content FROM document_embeddings WHERE doc_id=? AND user_id=?`).get(doc_id_1, req.user.id);
  const doc2 = db.prepare(`SELECT title,content FROM document_embeddings WHERE doc_id=? AND user_id=?`).get(doc_id_2, req.user.id);
  if(!doc1||!doc2) return res.status(404).json({error:'Documents not found.'});
  const comparison = await chatComplete(
    'Compare these two documents and identify: similarities, differences, contradictions, and which is more comprehensive.',
    `DOC 1: ${doc1.title}\n${doc1.content.slice(0,3000)}\n\nDOC 2: ${doc2.title}\n${doc2.content.slice(0,3000)}`,
    'gpt-4o'
  );
  res.json({comparison, doc1:doc1.title, doc2:doc2.title});
}));

// ── 15. Data cleaning ─────────────────────────
router.post('/:doc_id/clean', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {issues=['formatting','duplicates','noise']} = req.body;
  const doc = db.prepare(`SELECT * FROM document_embeddings WHERE doc_id=? AND user_id=?`).get(req.params.doc_id, req.user.id);
  if(!doc) return res.status(404).json({error:'Not found.'});
  const cleaned = await chatComplete(
    `Clean this data by fixing: ${issues.join(', ')}. Return only the cleaned content.`,
    doc.content.slice(0,8000), 'gpt-4o'
  );
  res.json({cleaned, original_length:doc.content.length, cleaned_length:cleaned.length});
}));

return router;
};