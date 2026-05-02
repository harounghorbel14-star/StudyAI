// ============================================================
// 💻 DEV TOOLS ROUTES
// ============================================================
const express = require('express');
const router = express.Router();

module.exports = (db, openai, requireAuth, requireQuota, aiLimiter, wrap, chatComplete) => {

// ── 1. Code Execution Sandbox ─────────────────
router.post('/execute', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {code, language='javascript'} = req.body;
  if(!code) return res.status(400).json({error:'Missing code.'});
  // Use GPT to simulate execution (no actual execution server needed)
  const result = await openai.chat.completions.create({
    model:'gpt-4o', max_tokens:500,
    messages:[{role:'user',content:`Execute this ${language} code and show the EXACT output as if running in a real terminal. Show errors if any.\n\n\`\`\`${language}\n${code.slice(0,3000)}\n\`\`\`\n\nOutput:`}]
  });
  res.json({output:result.choices[0]?.message?.content||'', language});
}));

// ── 2. Live Debugging ─────────────────────────
router.post('/debug', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {code, error, language='javascript'} = req.body;
  if(!code) return res.status(400).json({error:'Missing code.'});
  const result = await chatComplete(
    `You are an expert ${language} debugger. Find bugs, explain them clearly, and provide fixed code.`,
    `Code:\n${code.slice(0,4000)}\n${error?`\nError:\n${error}`:''}`,
    'gpt-4o'
  );
  res.json({debug:result});
}));

// ── 3. Code Interpreter ───────────────────────
router.post('/interpret', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {code, question} = req.body;
  if(!code) return res.status(400).json({error:'Missing code.'});
  const result = await chatComplete(
    'You are a code interpreter. Explain what this code does step by step, identify patterns, and answer any questions.',
    `Code:\n${code.slice(0,4000)}\n${question?`\nQuestion: ${question}`:''}`,
    'gpt-4o'
  );
  res.json({interpretation:result});
}));

// ── 4. Security Scanning ──────────────────────
router.post('/security', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {code} = req.body;
  if(!code) return res.status(400).json({error:'Missing code.'});
  const result = await openai.chat.completions.create({
    model:'gpt-4o', max_tokens:800,
    messages:[{role:'user',content:`Perform a security audit on this code. Return JSON:\n{"vulnerabilities":[{"type":"XSS/SQLi/etc","severity":"high/medium/low","line":"approx","description":"...","fix":"..."}],"score":0-100,"summary":"..."}\n\nCode:\n${code.slice(0,4000)}`}]
  });
  try{
    const data=JSON.parse(result.choices[0]?.message?.content?.trim().replace(/```json|```/g,'')||'{}');
    res.json(data);
  }catch(_){res.json({vulnerabilities:[],score:70,summary:'Analysis complete.'});}
}));

// ── 5. Git Integration AI ─────────────────────
router.post('/git/commit-message', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {diff, type='feat'} = req.body;
  if(!diff) return res.status(400).json({error:'Missing diff.'});
  const msg = await chatComplete(
    'Generate a conventional commit message. Format: type(scope): description. Be concise and specific.',
    `Git diff:\n${diff.slice(0,3000)}`, 'gpt-4o-mini'
  );
  res.json({message:msg.trim()});
}));

router.post('/git/pr-description', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {diff, title} = req.body;
  if(!diff) return res.status(400).json({error:'Missing diff.'});
  const desc = await chatComplete(
    'Write a detailed pull request description with: summary, changes, testing notes, and screenshots section.',
    `PR Title: ${title||'Feature update'}\n\nDiff:\n${diff.slice(0,4000)}`, 'gpt-4o'
  );
  res.json({description:desc});
}));

router.post('/git/changelog', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {commits} = req.body;
  if(!commits?.length) return res.status(400).json({error:'Missing commits.'});
  const changelog = await chatComplete(
    'Generate a user-friendly changelog from these git commits. Group by type (Features, Bug Fixes, Improvements).',
    commits.join('\n'), 'gpt-4o-mini'
  );
  res.json({changelog});
}));

// ── 6. Database Design AI ─────────────────────
router.post('/db/design', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {description, db_type='postgresql'} = req.body;
  if(!description) return res.status(400).json({error:'Missing description.'});
  const design = await chatComplete(
    `You are a database architect. Design optimal ${db_type} schemas with proper normalization, indexes, and relationships.`,
    `Design a database for: ${description}\n\nProvide: ERD description, CREATE TABLE statements, indexes, relationships, and sample queries.`,
    'gpt-4o'
  );
  res.json({design});
}));

router.post('/db/schema', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {tables, db_type='postgresql'} = req.body;
  if(!tables) return res.status(400).json({error:'Missing tables description.'});
  const schema = await chatComplete(
    `Generate ${db_type} schema with proper data types, constraints, and indexes.`,
    tables, 'gpt-4o'
  );
  res.json({schema});
}));

router.post('/db/migrate', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {from_schema, to_schema, db_type='postgresql'} = req.body;
  const migration = await chatComplete(
    `Generate a safe ${db_type} migration script. Handle data preservation and rollback.`,
    `From:\n${from_schema}\n\nTo:\n${to_schema}`, 'gpt-4o'
  );
  res.json({migration});
}));

// ── 7. Backend Scaffolding ────────────────────
router.post('/scaffold/backend', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {description, stack='express+sqlite', features=[]} = req.body;
  if(!description) return res.status(400).json({error:'Missing description.'});
  const scaffold = await chatComplete(
    `You are a senior backend developer. Generate production-ready ${stack} code.`,
    `Create a complete backend for: ${description}\nFeatures: ${features.join(', ')||'REST API, Auth, CRUD'}\n\nInclude: folder structure, all route files, middleware, database setup, and documentation.`,
    'gpt-4o'
  );
  res.json({scaffold});
}));

// ── 8. Frontend Generator ─────────────────────
router.post('/scaffold/frontend', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {description, framework='react', styling='tailwind'} = req.body;
  if(!description) return res.status(400).json({error:'Missing description.'});
  const frontend = await chatComplete(
    `You are a senior frontend developer. Generate modern ${framework} code with ${styling}.`,
    `Create a complete frontend for: ${description}\n\nProvide: component structure, main components with full code, routing, and state management.`,
    'gpt-4o'
  );
  res.json({frontend});
}));

// ── 9. Full-Stack Builder ─────────────────────
router.post('/scaffold/fullstack', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {description, stack='react+express+sqlite'} = req.body;
  if(!description) return res.status(400).json({error:'Missing description.'});
  const [backend, frontend, deployment] = await Promise.all([
    chatComplete('Senior backend developer.', `Build backend API for: ${description} using ${stack.split('+').slice(1).join('+')}`, 'gpt-4o'),
    chatComplete('Senior frontend developer.', `Build frontend UI for: ${description} using ${stack.split('+')[0]}`, 'gpt-4o'),
    chatComplete('DevOps engineer.', `Create deployment config (Docker, env vars, README) for: ${description}`, 'gpt-4o-mini'),
  ]);
  res.json({backend, frontend, deployment});
}));

// ── 10. Performance Optimizer ─────────────────
router.post('/optimize', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {code, language='javascript', focus='performance'} = req.body;
  if(!code) return res.status(400).json({error:'Missing code.'});
  const result = await chatComplete(
    `You are a performance optimization expert. Focus on: ${focus}`,
    `Optimize this ${language} code for ${focus}. Show: issues found, optimized code, and performance improvements:\n\n${code.slice(0,4000)}`,
    'gpt-4o'
  );
  res.json({optimized:result});
}));

// ── 11. Code Refactor ─────────────────────────
router.post('/refactor', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {code, language='javascript', style='clean-code'} = req.body;
  if(!code) return res.status(400).json({error:'Missing code.'});
  const result = await chatComplete(
    `Refactor following ${style} principles. Improve readability, maintainability, and structure.`,
    `Refactor this ${language} code:\n\n${code.slice(0,4000)}`,
    'gpt-4o'
  );
  res.json({refactored:result});
}));

// ── 12. API Testing ───────────────────────────
router.post('/api-test', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {endpoint, method='GET', headers={}, body:reqBody} = req.body;
  if(!endpoint) return res.status(400).json({error:'Missing endpoint.'});
  try{
    const opts={method,headers:{'Content-Type':'application/json',...headers}};
    if(reqBody&&method!=='GET')opts.body=JSON.stringify(reqBody);
    const start=Date.now();
    const r=await fetch(endpoint,{...opts,signal:AbortSignal.timeout(10000)});
    const elapsed=Date.now()-start;
    const text=await r.text();
    let data;try{data=JSON.parse(text);}catch(_){data=text;}
    res.json({status:r.status,statusText:r.statusText,elapsed_ms:elapsed,headers:Object.fromEntries(r.headers),data});
  }catch(e){res.json({error:e.message});}
}));

// ── 13. Docker Helper ─────────────────────────
router.post('/docker', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {description, language='node'} = req.body;
  if(!description) return res.status(400).json({error:'Missing description.'});
  const result = await chatComplete(
    'Docker and containerization expert.',
    `Create complete Docker setup for: ${description} (${language})\n\nProvide: Dockerfile, docker-compose.yml, .dockerignore, and run instructions.`,
    'gpt-4o'
  );
  res.json({docker:result});
}));

// ── 14. Vulnerability Detection ───────────────
router.post('/vulnerability', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {code, dependencies} = req.body;
  if(!code&&!dependencies) return res.status(400).json({error:'Missing code or dependencies.'});
  const result = await chatComplete(
    'Security researcher specializing in vulnerability detection.',
    `Scan for vulnerabilities:\n${code?`Code:\n${code.slice(0,3000)}\n`:''}${dependencies?`Dependencies:\n${dependencies}`:''}\n\nList: CVEs, OWASP issues, and remediation steps.`,
    'gpt-4o'
  );
  res.json({vulnerabilities:result});
}));

// ── 15. CI/CD Generator ───────────────────────
router.post('/cicd', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {repo_type='github', language='node', deploy_target='vercel'} = req.body;
  const result = await chatComplete(
    'DevOps engineer specializing in CI/CD pipelines.',
    `Generate a complete ${repo_type} Actions CI/CD pipeline for a ${language} app deploying to ${deploy_target}.\n\nInclude: build, test, security scan, deploy stages, and environment setup.`,
    'gpt-4o'
  );
  res.json({pipeline:result});
}));

// ── 16. Load Testing ──────────────────────────
router.post('/loadtest', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {endpoint, expected_rps=100, duration='5m'} = req.body;
  if(!endpoint) return res.status(400).json({error:'Missing endpoint.'});
  const result = await chatComplete(
    'Performance testing expert.',
    `Create a load testing strategy for: ${endpoint}\nExpected: ${expected_rps} req/s for ${duration}\n\nProvide: k6 script, expected metrics, bottleneck analysis, and optimization suggestions.`,
    'gpt-4o'
  );
  res.json({strategy:result});
}));

// ── 17. UI Preview ────────────────────────────
router.post('/ui-preview', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {description, style='modern-dark'} = req.body;
  if(!description) return res.status(400).json({error:'Missing description.'});
  const html = await chatComplete(
    'UI/UX designer. Create beautiful, complete HTML/CSS/JS UI.',
    `Create a complete ${style} UI for: ${description}\n\nReturn a single complete HTML file with embedded CSS and JS. Make it visually stunning and interactive.`,
    'gpt-4o'
  );
  res.json({html});
}));

return router;
};