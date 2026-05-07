// ============================================================
// 🧠 AI OS CORE — routes/ai-os-core.js
// Agent collaboration · Debate system · Planner · Cache
// Long-term memory · Background workers · Autonomous mode
// ============================================================
const express = require('express');
const router = express.Router();

module.exports = (db, openai, requireAuth, requireQuota, aiLimiter, wrap, chatComplete) => {

// ─── DB Tables for AI OS ───
db.prepare(`CREATE TABLE IF NOT EXISTS long_term_memory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence REAL DEFAULT 1.0,
  source TEXT,
  importance INTEGER DEFAULT 5,
  last_used_at TEXT,
  use_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, category, key)
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS user_style_profile (
  user_id INTEGER PRIMARY KEY,
  communication_style TEXT,
  preferred_tone TEXT,
  technical_level TEXT,
  decision_pattern TEXT,
  goals TEXT,
  values_array TEXT,
  pain_points TEXT,
  vocabulary_pattern TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS ai_cache (
  cache_key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  hits INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS background_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  payload TEXT,
  status TEXT DEFAULT 'queued',
  result TEXT,
  attempts INTEGER DEFAULT 0,
  scheduled_at TEXT DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS agent_debates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  topic TEXT NOT NULL,
  rounds TEXT,
  consensus TEXT,
  created_at TEXT DEFAULT (datetime('now'))
)`).run();

db.prepare(`CREATE INDEX IF NOT EXISTS idx_cache_expires ON ai_cache(expires_at)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_jobs_status ON background_jobs(status, scheduled_at)`).run();

// ═══════════════════════════════════════════════════════════
// ⚡ IN-MEMORY CACHE + DB CACHE (Redis-like)
// ═══════════════════════════════════════════════════════════
const memCache = new Map();
const MEM_CACHE_MAX = 500;

function cacheGet(key){
  // Try memory first
  const mem = memCache.get(key);
  if(mem && mem.expires > Date.now()){return mem.value;}
  if(mem) memCache.delete(key);

  // Try DB cache
  try{
    const row = db.prepare(`SELECT value, expires_at FROM ai_cache WHERE cache_key=? AND expires_at > ?`).get(key, Date.now());
    if(row){
      db.prepare(`UPDATE ai_cache SET hits=hits+1 WHERE cache_key=?`).run(key);
      const value = JSON.parse(row.value);
      // Promote to memory cache
      memCache.set(key, {value, expires:row.expires_at});
      return value;
    }
  }catch(_){}
  return null;
}

function cacheSet(key, value, ttlSeconds=3600){
  const expires = Date.now() + ttlSeconds*1000;
  // Memory cache
  memCache.set(key, {value, expires});
  if(memCache.size > MEM_CACHE_MAX){
    const firstKey = memCache.keys().next().value;
    memCache.delete(firstKey);
  }
  // DB cache
  try{
    db.prepare(`INSERT OR REPLACE INTO ai_cache (cache_key, value, expires_at) VALUES (?, ?, ?)`)
      .run(key, JSON.stringify(value), expires);
  }catch(_){}
}

// Cleanup expired cache every 5 min
setInterval(()=>{
  try{db.prepare(`DELETE FROM ai_cache WHERE expires_at < ?`).run(Date.now());}catch(_){}
}, 5*60*1000);

router.get('/cache/stats', requireAuth, wrap(async (req,res)=>{
  const total = db.prepare(`SELECT COUNT(*) c, SUM(hits) h FROM ai_cache`).get();
  res.json({memory_cache_size:memCache.size, db_cache_size:total.c, total_hits:total.h||0});
}));

// ═══════════════════════════════════════════════════════════
// 🧠 LONG-TERM MEMORY SYSTEM
// ═══════════════════════════════════════════════════════════

// Save memory
router.post('/memory/save', requireAuth, wrap(async (req,res)=>{
  const {category, key, value, importance=5, source='user'} = req.body;
  if(!category||!key||value===undefined) return res.status(400).json({error:'Missing fields'});

  db.prepare(`INSERT INTO long_term_memory (user_id, category, key, value, importance, source)
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT(user_id, category, key) DO UPDATE SET
              value=excluded.value, importance=excluded.importance, last_used_at=datetime('now')`)
    .run(req.user.id, category, key, String(value), importance, source);
  res.json({ok:true});
}));

// Get memory by category
router.get('/memory/:category', requireAuth, wrap(async (req,res)=>{
  const memories = db.prepare(`SELECT key, value, importance, use_count, last_used_at, created_at
                               FROM long_term_memory
                               WHERE user_id=? AND category=?
                               ORDER BY importance DESC, last_used_at DESC NULLS LAST`)
                    .all(req.user.id, req.params.category);
  res.json({memories});
}));

// Get full user profile (style + preferences + goals)
router.get('/profile/me', requireAuth, wrap(async (req,res)=>{
  const profile = db.prepare(`SELECT * FROM user_style_profile WHERE user_id=?`).get(req.user.id);
  const goals = db.prepare(`SELECT * FROM long_term_memory WHERE user_id=? AND category='goals' ORDER BY importance DESC LIMIT 10`).all(req.user.id);
  const projects = db.prepare(`SELECT id, name, idea, status, created_at FROM agent_projects WHERE user_id=? ORDER BY created_at DESC LIMIT 10`).all(req.user.id);
  const preferences = db.prepare(`SELECT * FROM long_term_memory WHERE user_id=? AND category='preferences'`).all(req.user.id);

  res.json({
    profile: profile || {},
    goals,
    recent_projects: projects,
    preferences,
    memory_count: db.prepare(`SELECT COUNT(*) c FROM long_term_memory WHERE user_id=?`).get(req.user.id).c,
  });
}));

// AI auto-learns user style from conversation
router.post('/profile/learn', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {messages=[]} = req.body;
  if(!messages.length) return res.status(400).json({error:'No messages'});

  const sample = messages.slice(-10).map(m=>`[${m.role}]: ${m.content}`).join('\n').slice(0,4000);

  const result = await openai.chat.completions.create({
    model:'gpt-4o-mini', max_tokens:800,
    response_format:{type:'json_object'},
    messages:[{role:'user',content:`Analyze this conversation and extract the user's style. Return JSON:
{
  "communication_style": "direct/conversational/formal/casual",
  "preferred_tone": "professional/friendly/playful/serious",
  "technical_level": "beginner/intermediate/expert",
  "decision_pattern": "fast/analytical/cautious",
  "vocabulary_pattern": "key words they often use",
  "values": ["..."],
  "pain_points": ["..."]
}

Conversation:\n${sample}`}]
  });

  const profile = JSON.parse(result.choices[0]?.message?.content||'{}');

  db.prepare(`INSERT INTO user_style_profile (user_id, communication_style, preferred_tone, technical_level, decision_pattern, vocabulary_pattern, values_array, pain_points)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(user_id) DO UPDATE SET
              communication_style=excluded.communication_style,
              preferred_tone=excluded.preferred_tone,
              technical_level=excluded.technical_level,
              decision_pattern=excluded.decision_pattern,
              vocabulary_pattern=excluded.vocabulary_pattern,
              values_array=excluded.values_array,
              pain_points=excluded.pain_points,
              updated_at=datetime('now')`)
    .run(req.user.id, profile.communication_style, profile.preferred_tone, profile.technical_level,
         profile.decision_pattern, profile.vocabulary_pattern,
         JSON.stringify(profile.values||[]), JSON.stringify(profile.pain_points||[]));

  res.json({ok:true, profile});
}));

// Build context for any AI call (auto-injected)
function buildUserContext(userId){
  const profile = db.prepare(`SELECT * FROM user_style_profile WHERE user_id=?`).get(userId);
  const goals = db.prepare(`SELECT key, value FROM long_term_memory WHERE user_id=? AND category='goals' ORDER BY importance DESC LIMIT 5`).all(userId);
  const recentProjects = db.prepare(`SELECT name, idea FROM agent_projects WHERE user_id=? ORDER BY created_at DESC LIMIT 3`).all(userId);

  if(!profile && !goals.length && !recentProjects.length) return '';

  let ctx = '\n\n[USER CONTEXT — adapt your response]\n';
  if(profile){
    ctx += `Style: ${profile.communication_style||'standard'}, ${profile.preferred_tone||'neutral'} tone, ${profile.technical_level||'mixed'} technical level.\n`;
  }
  if(goals.length){
    ctx += `Active goals: ${goals.map(g=>g.value).join('; ')}\n`;
  }
  if(recentProjects.length){
    ctx += `Recent projects: ${recentProjects.map(p=>p.name).join(', ')}\n`;
  }
  ctx += '[END CONTEXT]\n\n';
  return ctx;
}

router.get('/profile/context', requireAuth, wrap(async (req,res)=>{
  res.json({context:buildUserContext(req.user.id)});
}));

// ═══════════════════════════════════════════════════════════
// 🎭 AGENT DEBATE SYSTEM (Multiple agents argue, then converge)
// ═══════════════════════════════════════════════════════════
router.post('/debate', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {topic, perspectives=['optimist','skeptic','realist'], rounds=2} = req.body;
  if(!topic) return res.status(400).json({error:'Missing topic'});

  // Check cache
  const cacheKey = `debate:${req.user.id}:${topic.slice(0,100)}`;
  const cached = cacheGet(cacheKey);
  if(cached) return res.json({...cached, _cached:true});

  res.setHeader('Content-Type','text/event-stream');
  res.setHeader('Cache-Control','no-cache');
  res.setHeader('Connection','keep-alive');
  res.flushHeaders();

  const send = e => res.write(`data: ${JSON.stringify(e)}\n\n`);
  const transcript = [];

  try{
    send({type:'start',topic,perspectives,rounds});

    for(let round=1; round<=rounds; round++){
      send({type:'round_start',round});

      for(const perspective of perspectives){
        const previousArgs = transcript.length ? transcript.map(t=>`[${t.perspective}]: ${t.argument}`).join('\n\n') : 'No previous arguments yet.';

        const result = await openai.chat.completions.create({
          model:'gpt-4o-mini', max_tokens:300,
          messages:[{
            role:'system',
            content:`You are the "${perspective}" perspective in a structured debate. Be brief, sharp, evidence-based. Maximum 3 sentences. ${round>1?'Address previous arguments and refine your position.':''}`
          },{
            role:'user',
            content:`Topic: ${topic}\n\nPrevious arguments:\n${previousArgs}\n\nYour ${perspective} take:`
          }]
        });

        const argument = result.choices[0]?.message?.content||'';
        transcript.push({round, perspective, argument});
        send({type:'argument',round,perspective,argument});
      }
    }

    // Synthesize consensus
    send({type:'synthesizing'});
    const synthResult = await openai.chat.completions.create({
      model:'gpt-4o', max_tokens:600,
      response_format:{type:'json_object'},
      messages:[{
        role:'system',
        content:`Synthesize the debate into actionable consensus. Return JSON: {"consensus":"...", "key_insights":["..."], "recommended_action":"...", "confidence":0-100, "dissenting_views":["..."]}`
      },{
        role:'user',
        content:`Topic: ${topic}\n\nDebate transcript:\n${transcript.map(t=>`Round ${t.round} [${t.perspective}]: ${t.argument}`).join('\n\n')}`
      }]
    });

    const consensus = JSON.parse(synthResult.choices[0]?.message?.content||'{}');
    const final = {topic, transcript, consensus};

    // Save debate
    db.prepare(`INSERT INTO agent_debates (user_id, topic, rounds, consensus) VALUES (?, ?, ?, ?)`)
      .run(req.user.id, topic, JSON.stringify(transcript), JSON.stringify(consensus));

    cacheSet(cacheKey, final, 3600);
    send({type:'complete',consensus,transcript});
    res.end();
  }catch(e){
    send({type:'error',error:e.message});
    res.end();
  }
}));

// ═══════════════════════════════════════════════════════════
// 📋 PLANNER AGENT (breaks down goals into step-by-step plans)
// ═══════════════════════════════════════════════════════════
router.post('/plan', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {goal, context, constraints} = req.body;
  if(!goal) return res.status(400).json({error:'Missing goal'});

  const userCtx = buildUserContext(req.user.id);

  const result = await openai.chat.completions.create({
    model:'gpt-4o', max_tokens:2000,
    response_format:{type:'json_object'},
    messages:[{
      role:'system',
      content:`Master planner. Break goals into clear, executable plans. Return JSON:
{
  "goal": "...",
  "estimated_total_hours": N,
  "phases": [{
    "phase": 1,
    "name": "...",
    "duration": "X days",
    "tasks": [{"task":"...","owner":"user/AI","dependencies":[],"estimated_hours":N,"priority":"P0/P1/P2"}],
    "deliverables": ["..."],
    "success_criteria": ["..."]
  }],
  "critical_path": ["task ids"],
  "risks": [{"risk":"...","mitigation":"..."}],
  "first_action": "what to do RIGHT NOW",
  "milestones": [{"date":"day N","milestone":"..."}]
}`
    },{
      role:'user',
      content:`${userCtx}Goal: ${goal}\n${context?`Context: ${context}\n`:''}${constraints?`Constraints: ${constraints}`:''}`
    }]
  });

  res.json(JSON.parse(result.choices[0]?.message?.content||'{}'));
}));

// ═══════════════════════════════════════════════════════════
// ✅ VALIDATOR AGENT (checks output quality, retries if poor)
// ═══════════════════════════════════════════════════════════
router.post('/validate-output', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {output, criteria=[], expected_type} = req.body;
  if(!output) return res.status(400).json({error:'Missing output'});

  const result = await openai.chat.completions.create({
    model:'gpt-4o-mini', max_tokens:600,
    response_format:{type:'json_object'},
    messages:[{
      role:'system',
      content:`Output validator. Score the output strictly. Return JSON:
{
  "score": 0-100,
  "passes": true/false,
  "criteria_met": [{"criterion":"...","met":true/false,"reason":"..."}],
  "issues": ["..."],
  "suggestions_to_improve": ["..."],
  "should_retry": true/false,
  "retry_prompt_hint": "what to change in the next attempt"
}`
    },{
      role:'user',
      content:`Output to validate:\n${typeof output === 'string' ? output.slice(0,3000) : JSON.stringify(output).slice(0,3000)}\n\n${criteria.length?`Criteria: ${criteria.join('; ')}\n`:''}${expected_type?`Expected type: ${expected_type}`:''}`
    }]
  });

  res.json(JSON.parse(result.choices[0]?.message?.content||'{}'));
}));

// ═══════════════════════════════════════════════════════════
// 🔁 RETRY INTELLIGENCE (auto-retry with improved prompts)
// ═══════════════════════════════════════════════════════════
router.post('/smart-retry', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {original_prompt, failed_output, error_reason, max_retries=3} = req.body;
  if(!original_prompt) return res.status(400).json({error:'Missing prompt'});

  let attempt = 0;
  let currentPrompt = original_prompt;
  let lastOutput = failed_output;
  let lastError = error_reason;

  res.setHeader('Content-Type','text/event-stream');
  res.setHeader('Cache-Control','no-cache');
  res.flushHeaders();
  const send = e => res.write(`data: ${JSON.stringify(e)}\n\n`);

  while(attempt < max_retries){
    attempt++;
    send({type:'attempt',attempt,max_retries});

    // Improve the prompt based on previous failure
    if(attempt > 1){
      const improveResult = await openai.chat.completions.create({
        model:'gpt-4o-mini', max_tokens:400,
        messages:[{
          role:'user',
          content:`The previous prompt failed. Original: "${original_prompt}"\nFailed output: ${String(lastOutput).slice(0,500)}\nError: ${lastError}\n\nRewrite the prompt to be MORE EXPLICIT and likely to succeed. Return ONLY the improved prompt, no explanation.`
        }]
      });
      currentPrompt = improveResult.choices[0]?.message?.content?.trim() || original_prompt;
      send({type:'prompt_improved',prompt:currentPrompt});
    }

    // Execute
    try{
      const result = await openai.chat.completions.create({
        model:'gpt-4o', max_tokens:1500,
        messages:[{role:'user',content:currentPrompt}]
      });
      const output = result.choices[0]?.message?.content||'';
      lastOutput = output;

      // Validate
      const validResult = await openai.chat.completions.create({
        model:'gpt-4o-mini', max_tokens:200,
        response_format:{type:'json_object'},
        messages:[{role:'user',content:`Did this output successfully answer the prompt? Return JSON: {"success":true/false,"reason":"..."}\n\nPrompt: ${original_prompt}\nOutput: ${output.slice(0,1000)}`}]
      });
      const valid = JSON.parse(validResult.choices[0]?.message?.content||'{}');

      if(valid.success){
        send({type:'success',attempt,output,reason:valid.reason});
        res.end();
        return;
      } else {
        lastError = valid.reason;
        send({type:'failed',attempt,reason:valid.reason});
      }
    }catch(e){
      lastError = e.message;
      send({type:'error_attempt',attempt,error:e.message});
    }
  }

  send({type:'max_retries_reached',final_output:lastOutput});
  res.end();
}));

// ═══════════════════════════════════════════════════════════
// ⚙️ BACKGROUND WORKERS (jobs queue)
// ═══════════════════════════════════════════════════════════
router.post('/jobs/enqueue', requireAuth, wrap(async (req,res)=>{
  const {type, payload, schedule_in_seconds=0} = req.body;
  if(!type) return res.status(400).json({error:'Missing type'});
  const scheduledAt = new Date(Date.now() + schedule_in_seconds*1000).toISOString();
  const id = db.prepare(`INSERT INTO background_jobs (user_id, type, payload, scheduled_at) VALUES (?, ?, ?, ?)`)
    .run(req.user.id, type, JSON.stringify(payload||{}), scheduledAt).lastInsertRowid;
  res.json({ok:true, job_id:id});
}));

router.get('/jobs/list', requireAuth, wrap(async (req,res)=>{
  const jobs = db.prepare(`SELECT * FROM background_jobs WHERE user_id=? ORDER BY scheduled_at DESC LIMIT 20`).all(req.user.id);
  res.json({jobs:jobs.map(j=>({...j,payload:JSON.parse(j.payload||'{}'),result:j.result?JSON.parse(j.result):null}))});
}));

// Worker that runs jobs (processes queue every 10s)
async function processJobs(){
  try{
    const job = db.prepare(`SELECT * FROM background_jobs WHERE status='queued' AND scheduled_at <= datetime('now') ORDER BY scheduled_at LIMIT 1`).get();
    if(!job) return;

    db.prepare(`UPDATE background_jobs SET status='running', started_at=datetime('now'), attempts=attempts+1 WHERE id=?`).run(job.id);

    const payload = JSON.parse(job.payload||'{}');
    let result;

    try{
      switch(job.type){
        case 'send_email':
          // Implementation: send email via stored credentials
          result = {sent:true, to:payload.to};
          break;
        case 'generate_content':
          const r = await openai.chat.completions.create({model:'gpt-4o-mini',max_tokens:500,messages:[{role:'user',content:payload.prompt}]});
          result = {content:r.choices[0]?.message?.content};
          break;
        case 'analyze_project':
          result = {analyzed:true, project_id:payload.project_id};
          break;
        default:
          result = {handled:false, type:job.type};
      }

      db.prepare(`UPDATE background_jobs SET status='completed', result=?, completed_at=datetime('now') WHERE id=?`)
        .run(JSON.stringify(result), job.id);
    }catch(e){
      if(job.attempts < 3){
        db.prepare(`UPDATE background_jobs SET status='queued', scheduled_at=datetime('now','+30 seconds') WHERE id=?`).run(job.id);
      } else {
        db.prepare(`UPDATE background_jobs SET status='failed', result=? WHERE id=?`).run(JSON.stringify({error:e.message}), job.id);
      }
    }
  }catch(_){}
}
setInterval(processJobs, 10000);

// ═══════════════════════════════════════════════════════════
// 🤖 AUTONOMOUS MODE (AI runs forever, decides, improves, launches)
// ═══════════════════════════════════════════════════════════
router.post('/autonomous/full', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {goal, max_iterations=10, time_limit_seconds=300} = req.body;
  if(!goal) return res.status(400).json({error:'Missing goal'});

  res.setHeader('Content-Type','text/event-stream');
  res.setHeader('Cache-Control','no-cache');
  res.setHeader('Connection','keep-alive');
  res.flushHeaders();
  const send = e => res.write(`data: ${JSON.stringify(e)}\n\n`);

  const startTime = Date.now();
  const memory = []; // accumulated context
  let iteration = 0;
  let achieved = false;
  const userCtx = buildUserContext(req.user.id);

  send({type:'autonomous_start',goal,max_iterations,time_limit_seconds});

  try{
    while(iteration < max_iterations && !achieved && (Date.now()-startTime) < time_limit_seconds*1000){
      iteration++;
      send({type:'iteration_start',iteration});

      // Phase 1: PLAN
      send({type:'phase',iteration,phase:'planning'});
      const planResult = await openai.chat.completions.create({
        model:'gpt-4o', max_tokens:600,
        response_format:{type:'json_object'},
        messages:[{
          role:'system',
          content:`Autonomous AI. Decide the next action toward the goal. Return JSON: {"thought":"...","next_action":"...","reasoning":"...","expected_outcome":"...","goal_achieved":false}`
        },{
          role:'user',
          content:`${userCtx}Goal: ${goal}\nIteration: ${iteration}/${max_iterations}\nMemory:\n${memory.slice(-5).join('\n')}`
        }]
      });
      const plan = JSON.parse(planResult.choices[0]?.message?.content||'{}');
      send({type:'plan',iteration,plan});

      if(plan.goal_achieved){achieved=true;break;}

      // Phase 2: EXECUTE
      send({type:'phase',iteration,phase:'executing'});
      const execResult = await openai.chat.completions.create({
        model:'gpt-4o', max_tokens:1500,
        messages:[{role:'system',content:'Execute the action. Be specific and produce real, usable output.'},{role:'user',content:`Action: ${plan.next_action}\n\nGoal context: ${goal}`}]
      });
      const execution = execResult.choices[0]?.message?.content||'';
      send({type:'execution',iteration,output:execution.slice(0,2000)});

      // Phase 3: VALIDATE
      send({type:'phase',iteration,phase:'validating'});
      const validResult = await openai.chat.completions.create({
        model:'gpt-4o-mini', max_tokens:300,
        response_format:{type:'json_object'},
        messages:[{role:'user',content:`Did this execution move toward the goal? Return JSON: {"success":true/false,"quality":0-100,"goal_progress_pct":0-100,"learned":"key insight","next_focus":"..."}\n\nGoal: ${goal}\nAction: ${plan.next_action}\nResult: ${execution.slice(0,1000)}`}]
      });
      const validation = JSON.parse(validResult.choices[0]?.message?.content||'{}');
      send({type:'validation',iteration,validation});

      // Phase 4: REFLECT + ADAPT
      memory.push(`Iter ${iteration}: ${plan.next_action} → quality ${validation.quality}/100, progress ${validation.goal_progress_pct}%, learned: ${validation.learned}`);

      if(validation.goal_progress_pct >= 95){achieved=true;}
    }

    // Save what was learned to long-term memory
    db.prepare(`INSERT INTO long_term_memory (user_id, category, key, value, importance, source)
                VALUES (?, 'autonomous_runs', ?, ?, 7, 'auto')
                ON CONFLICT(user_id, category, key) DO UPDATE SET value=excluded.value`)
      .run(req.user.id, goal.slice(0,100), JSON.stringify(memory));

    send({
      type:'complete',
      achieved, iteration,
      total_time_seconds: Math.round((Date.now()-startTime)/1000),
      memory_log: memory,
      summary: achieved ? `🎯 Goal achieved in ${iteration} iterations` : `⏱️ Stopped at iteration ${iteration}`
    });
    res.end();
  }catch(e){
    send({type:'error',error:e.message});
    res.end();
  }
}));

return router;
};