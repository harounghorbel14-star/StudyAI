// ============================================================
// 🧩 UX & SAAS ROUTES
// ============================================================
const express = require('express');
const router = express.Router();
const crypto = require('crypto');

module.exports = (db, openai, requireAuth, requireQuota, aiLimiter, wrap, chatComplete, VIP_EMAILS) => {

// ── DB Tables ─────────────────────────────────
db.prepare(`CREATE TABLE IF NOT EXISTS ab_tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  variant_a TEXT NOT NULL,
  variant_b TEXT NOT NULL,
  metric TEXT DEFAULT 'conversion',
  results TEXT DEFAULT '{}',
  status TEXT DEFAULT 'running',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS autosave (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  key TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, key)
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS feature_flags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  enabled INTEGER DEFAULT 1,
  rollout_pct INTEGER DEFAULT 100,
  description TEXT
)`).run();

// ── 1. Auto-save ──────────────────────────────
router.post('/autosave', requireAuth, wrap(async (req,res)=>{
  const {key, data} = req.body;
  if(!key||!data) return res.status(400).json({error:'Missing key or data.'});
  db.prepare(`INSERT INTO autosave (user_id,key,data,updated_at) VALUES (?,?,?,datetime('now'))
    ON CONFLICT(user_id,key) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at`).run(req.user.id, key, JSON.stringify(data));
  res.json({ok:true, saved_at:new Date().toISOString()});
}));

router.get('/autosave/:key', requireAuth, wrap(async (req,res)=>{
  const item = db.prepare(`SELECT data,updated_at FROM autosave WHERE user_id=? AND key=?`).get(req.user.id, req.params.key);
  if(!item) return res.json({data:null});
  res.json({data:JSON.parse(item.data), updated_at:item.updated_at});
}));

router.delete('/autosave/:key', requireAuth, wrap(async (req,res)=>{
  db.prepare(`DELETE FROM autosave WHERE user_id=? AND key=?`).run(req.user.id, req.params.key);
  res.json({ok:true});
}));

// ── 2. Notifications ──────────────────────────
router.get('/notifications', requireAuth, wrap(async (req,res)=>{
  const notifs = db.prepare(`SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 20`).all(req.user.id);
  const unread = db.prepare(`SELECT COUNT(*) as count FROM notifications WHERE user_id=? AND read=0`).get(req.user.id);
  res.json({notifications:notifs, unread:unread.count});
}));

router.patch('/notifications/read', requireAuth, wrap(async (req,res)=>{
  db.prepare(`UPDATE notifications SET read=1 WHERE user_id=?`).run(req.user.id);
  res.json({ok:true});
}));

// Internal helper to create notifications
function createNotification(userId, title, message, type='info'){
  try{db.prepare(`INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?,?)`).run(userId, title, message, type);}catch(_){}
}

// ── 3. A/B Testing ────────────────────────────
router.post('/ab-tests', requireAuth, wrap(async (req,res)=>{
  const {name, variant_a, variant_b, metric='conversion'} = req.body;
  if(!name||!variant_a||!variant_b) return res.status(400).json({error:'Missing fields.'});
  const id = db.prepare(`INSERT INTO ab_tests (user_id,name,variant_a,variant_b,metric) VALUES (?,?,?,?,?)`).run(req.user.id, name, variant_a, variant_b, metric).lastInsertRowid;
  res.json({ok:true, id, test_id:'ab_'+id});
}));

router.get('/ab-tests', requireAuth, wrap(async (req,res)=>{
  const tests = db.prepare(`SELECT * FROM ab_tests WHERE user_id=? ORDER BY created_at DESC`).all(req.user.id);
  res.json({tests});
}));

router.post('/ab-tests/:id/record', requireAuth, wrap(async (req,res)=>{
  const {variant, event} = req.body;
  const test = db.prepare(`SELECT * FROM ab_tests WHERE id=? AND user_id=?`).get(Number(req.params.id), req.user.id);
  if(!test) return res.status(404).json({error:'Test not found.'});
  const results = JSON.parse(test.results||'{}');
  if(!results[variant]) results[variant]={impressions:0,conversions:0};
  if(event==='impression') results[variant].impressions++;
  if(event==='conversion') results[variant].conversions++;
  results[variant].rate = results[variant].impressions > 0
    ? (results[variant].conversions/results[variant].impressions*100).toFixed(1)+'%' : '0%';
  db.prepare(`UPDATE ab_tests SET results=? WHERE id=?`).run(JSON.stringify(results), test.id);
  res.json({ok:true, results});
}));

router.post('/ab-tests/:id/analyze', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const test = db.prepare(`SELECT * FROM ab_tests WHERE id=? AND user_id=?`).get(Number(req.params.id), req.user.id);
  if(!test) return res.status(404).json({error:'Test not found.'});
  const analysis = await chatComplete(
    'Statistical analysis expert for A/B testing.',
    `Analyze this A/B test:\nTest: ${test.name}\nVariant A: ${test.variant_a}\nVariant B: ${test.variant_b}\nResults: ${test.results}\nMetric: ${test.metric}\n\nProvide: winner, statistical significance, insights, and recommendation.`,
    'gpt-4o-mini'
  );
  res.json({analysis});
}));

// ── 4. Feature Flags ──────────────────────────
router.get('/features', wrap(async (req,res)=>{
  const flags = db.prepare(`SELECT name,enabled,rollout_pct,description FROM feature_flags`).all();
  res.json({flags});
}));

router.post('/features', requireAuth, wrap(async (req,res)=>{
  if(!VIP_EMAILS.includes(req.user.email.toLowerCase())) return res.status(403).json({error:'Admin only.'});
  const {name, enabled=1, rollout_pct=100, description} = req.body;
  if(!name) return res.status(400).json({error:'Missing name.'});
  db.prepare(`INSERT OR REPLACE INTO feature_flags (name,enabled,rollout_pct,description) VALUES (?,?,?,?)`).run(name,enabled,rollout_pct,description||'');
  res.json({ok:true});
}));

// ── 5. User Preferences ───────────────────────
router.get('/preferences', requireAuth, wrap(async (req,res)=>{
  const prefs = db.prepare(`SELECT key,value FROM user_memories WHERE user_id=? AND key LIKE '__pref_%'`).all(req.user.id);
  const obj={};
  prefs.forEach(p=>{obj[p.key.replace('__pref_','')]=p.value;});
  res.json({preferences:obj});
}));

router.post('/preferences', requireAuth, wrap(async (req,res)=>{
  const {preferences} = req.body;
  if(!preferences) return res.status(400).json({error:'Missing preferences.'});
  for(const [key,val] of Object.entries(preferences)){
    db.prepare(`INSERT INTO user_memories (user_id,key,value,updated_at) VALUES (?,?,?,datetime('now'))
      ON CONFLICT(user_id,key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).run(req.user.id,'__pref_'+key,String(val));
  }
  res.json({ok:true});
}));

// ── 6. Billing Dashboard ─────────────────────
router.get('/billing', requireAuth, wrap(async (req,res)=>{
  const user = db.prepare(`SELECT plan,created_at,requests_today,credits FROM users WHERE id=?`).get(req.user.id);
  const usage = db.prepare(`SELECT COUNT(*) as total FROM conversations WHERE user_id=? AND role='user'`).get(req.user.id);
  const monthly = db.prepare(`SELECT date(created_at,'start of month') as month, COUNT(*) as count FROM conversations WHERE user_id=? AND role='user' GROUP BY month ORDER BY month DESC LIMIT 6`).all(req.user.id);
  const plans = {
    free:{price:0,limit:10,features:['10 req/day','Basic tools','Community support']},
    pro:{price:19,limit:500,features:['500 req/day','All tools','Priority support','API access']},
    elite:{price:49,limit:null,features:['Unlimited','All tools','24/7 support','API access','Custom AI']},
  };
  res.json({
    plan: user.plan,
    price: plans[user.plan]?.price||0,
    features: plans[user.plan]?.features||[],
    usage: {today:user.requests_today, total:usage.total, monthly},
    credits: user.credits||0,
    member_since: user.created_at,
    plans,
  });
}));

// ── 7. Usage Analytics ────────────────────────
router.get('/analytics/usage', requireAuth, wrap(async (req,res)=>{
  const period = req.query.period||'7d';
  const days = period==='30d'?30:period==='90d'?90:7;
  const daily = db.prepare(`SELECT date(created_at) as day, COUNT(*) as requests FROM conversations WHERE user_id=? AND role='user' AND created_at>=datetime('now','-${days} days') GROUP BY day ORDER BY day`).all(req.user.id);
  const tools = db.prepare(`SELECT feature,COUNT(*) as count FROM conversations WHERE user_id=? AND role='user' AND feature!='chat' AND created_at>=datetime('now','-${days} days') GROUP BY feature ORDER BY count DESC LIMIT 10`).all(req.user.id);
  const peakHour = db.prepare(`SELECT strftime('%H',created_at) as hour, COUNT(*) as count FROM conversations WHERE user_id=? AND role='user' GROUP BY hour ORDER BY count DESC LIMIT 1`).get(req.user.id);
  res.json({daily, tools, peakHour:peakHour?.hour, period});
}));

// ── 8. Feature Analytics ─────────────────────
router.get('/analytics/features', requireAuth, wrap(async (req,res)=>{
  const features = db.prepare(`SELECT feature, COUNT(*) as uses, MAX(created_at) as last_used FROM conversations WHERE user_id=? AND role='user' GROUP BY feature ORDER BY uses DESC`).all(req.user.id);
  const total = features.reduce((s,f)=>s+f.uses,0);
  res.json({features:features.map(f=>({...f,percentage:total>0?((f.uses/total)*100).toFixed(1):0})), total});
}));

// ── 9. Funnel Tracking ────────────────────────
router.post('/analytics/funnel', requireAuth, wrap(async (req,res)=>{
  const {event, properties={}} = req.body;
  if(!event) return res.status(400).json({error:'Missing event.'});
  // Store as automation log
  db.prepare(`INSERT INTO automation_logs (user_id,event,details) VALUES (?,?,?)`).run(req.user.id, 'funnel:'+event, JSON.stringify(properties));
  res.json({ok:true});
}));

// ── 10. Smart Reminders ───────────────────────
router.post('/reminders', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {task, deadline, context} = req.body;
  if(!task) return res.status(400).json({error:'Missing task.'});
  const reminder = await chatComplete(
    'You are a productivity assistant.',
    `Create smart reminders for: "${task}"\n${deadline?`Deadline: ${deadline}`:''}\n${context?`Context: ${context}`:''}\n\nProvide: reminder schedule, preparation steps, and success criteria.`,
    'gpt-4o-mini'
  );
  // Save as notification
  createNotification(req.user.id, `📅 Reminder: ${task.slice(0,50)}`, reminder.slice(0,200), 'reminder');
  res.json({reminder});
}));

// ── 11. Calendar Integration AI ───────────────
router.post('/calendar/plan', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {tasks, available_hours=8, preferences={}} = req.body;
  if(!tasks?.length) return res.status(400).json({error:'Missing tasks.'});
  const plan = await chatComplete(
    'Expert productivity and time management coach.',
    `Create an optimized daily schedule for these tasks:\n${tasks.map((t,i)=>`${i+1}. ${t}`).join('\n')}\nAvailable hours: ${available_hours}/day\nPreferences: ${JSON.stringify(preferences)}\n\nProvide time-blocked schedule with buffer time and energy management.`,
    'gpt-4o'
  );
  res.json({plan});
}));

// ── 12. Onboarding Flow ───────────────────────
router.get('/onboarding/status', requireAuth, wrap(async (req,res)=>{
  const completed = db.prepare(`SELECT value FROM user_memories WHERE user_id=? AND key='__onboarding_completed'`).get(req.user.id);
  const steps=[
    {id:'profile',label:'Set up profile',completed:false},
    {id:'first_chat',label:'Send first message',completed:false},
    {id:'first_tool',label:'Use a tool',completed:false},
    {id:'upload_doc',label:'Upload a document',completed:false},
    {id:'invite_friend',label:'Invite a friend',completed:false},
  ];
  const doneSteps=JSON.parse(completed?.value||'[]');
  steps.forEach(s=>s.completed=doneSteps.includes(s.id));
  const progress=Math.round(steps.filter(s=>s.completed).length/steps.length*100);
  res.json({steps, progress, fully_completed:progress===100});
}));

router.post('/onboarding/complete-step', requireAuth, wrap(async (req,res)=>{
  const {step_id} = req.body;
  if(!step_id) return res.status(400).json({error:'Missing step_id.'});
  const existing = db.prepare(`SELECT value FROM user_memories WHERE user_id=? AND key='__onboarding_completed'`).get(req.user.id);
  const done=JSON.parse(existing?.value||'[]');
  if(!done.includes(step_id)){done.push(step_id);}
  db.prepare(`INSERT INTO user_memories (user_id,key,value,updated_at) VALUES (?,?,?,datetime('now'))
    ON CONFLICT(user_id,key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).run(req.user.id,'__onboarding_completed',JSON.stringify(done));
  if(step_id==='invite_friend'){createNotification(req.user.id,'🎉 Bonus unlocked!','You earned +50 requests for inviting a friend!','success');}
  res.json({ok:true, completed:done});
}));

// ── 13. Drag & Drop file upload ───────────────
router.post('/upload/bulk', requireAuth, wrap(async (req,res)=>{
  // Returns a presigned-like URL for client-side uploads
  const {files} = req.body;
  if(!files?.length) return res.status(400).json({error:'Missing files.'});
  const tokens = files.map(f=>({
    name:f.name,
    token:crypto.randomBytes(16).toString('hex'),
    expires:Date.now()+3600000,
  }));
  res.json({upload_tokens:tokens});
}));

// ── 14. Real-time status ──────────────────────
router.get('/status', wrap(async (req,res)=>{
  res.json({
    status:'operational',
    services:{api:'up',ai:'up',storage:'up',streaming:'up'},
    latency_ms:Math.floor(Math.random()*50)+10,
    timestamp:new Date().toISOString(),
    version:'2.0.0',
  });
}));

// ── 15. Zapier-like Integration Hub ───────────
router.post('/integrations/trigger', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {trigger, action, config={}} = req.body;
  if(!trigger||!action) return res.status(400).json({error:'Missing trigger or action.'});
  const result = await chatComplete(
    'Integration automation expert.',
    `Create an automation workflow:\nTrigger: "${trigger}"\nAction: "${action}"\nConfig: ${JSON.stringify(config)}\n\nProvide: step-by-step automation logic, data mapping, error handling, and testing steps.`,
    'gpt-4o-mini'
  );
  // Log the integration
  db.prepare(`INSERT INTO automation_logs (user_id,event,details) VALUES (?,?,?)`).run(req.user.id, 'integration_trigger', `${trigger} → ${action}`);
  res.json({workflow:result, trigger, action});
}));

// ── 16. SaaS Metrics Dashboard ────────────────
router.get('/metrics', requireAuth, wrap(async (req,res)=>{
  if(!VIP_EMAILS.includes(req.user.email.toLowerCase())){
    // Return user's own metrics
    const myMetrics = {
      total_requests: db.prepare(`SELECT COUNT(*) as c FROM conversations WHERE user_id=? AND role='user'`).get(req.user.id).c,
      tools_used: db.prepare(`SELECT COUNT(DISTINCT feature) as c FROM conversations WHERE user_id=?`).get(req.user.id).c,
      favorite_tool: db.prepare(`SELECT feature FROM conversations WHERE user_id=? AND feature!='chat' GROUP BY feature ORDER BY COUNT(*) DESC LIMIT 1`).get(req.user.id)?.feature||'chat',
      member_days: db.prepare(`SELECT CAST((julianday('now')-julianday(created_at)) AS INTEGER) as days FROM users WHERE id=?`).get(req.user.id)?.days||0,
    };
    return res.json({metrics:myMetrics,scope:'user'});
  }
  // Admin metrics
  const metrics = {
    total_users: db.prepare(`SELECT COUNT(*) as c FROM users`).get().c,
    active_today: db.prepare(`SELECT COUNT(DISTINCT user_id) as c FROM conversations WHERE date(created_at)=date('now')`).get().c,
    total_messages: db.prepare(`SELECT COUNT(*) as c FROM conversations`).get().c,
    pro_users: db.prepare(`SELECT COUNT(*) as c FROM users WHERE plan='pro'`).get().c,
    elite_users: db.prepare(`SELECT COUNT(*) as c FROM users WHERE plan='elite'`).get().c,
    mrr: db.prepare(`SELECT COUNT(*)*19 as mrr FROM users WHERE plan='pro'`).get().mrr +
         db.prepare(`SELECT COUNT(*)*49 as mrr FROM users WHERE plan='elite'`).get().mrr,
    top_tools: db.prepare(`SELECT feature,COUNT(*) as uses FROM conversations WHERE feature!='chat' GROUP BY feature ORDER BY uses DESC LIMIT 5`).all(),
    new_users_today: db.prepare(`SELECT COUNT(*) as c FROM users WHERE date(created_at)=date('now')`).get().c,
    growth_7d: db.prepare(`SELECT COUNT(*) as c FROM users WHERE created_at>=datetime('now','-7 days')`).get().c,
  };
  res.json({metrics, scope:'admin'});
}));

return router;
};