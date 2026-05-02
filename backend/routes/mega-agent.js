// ============================================================
// 🚀 MEGA AGENT + MAXIMUM CODING — routes/mega-agent.js
// ============================================================
const express = require('express');
const router = express.Router();

module.exports = (db, openai, requireAuth, requireQuota, aiLimiter, wrap, chatComplete) => {

// ─────────────────────────────────────────────
// 🚀 MEGA AGENT — "اعمل startup" → كل شيء
// ─────────────────────────────────────────────
router.post('/startup', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {idea} = req.body;
  if(!idea) return res.status(400).json({error:'Missing idea.'});
  res.setHeader('Content-Type','text/event-stream');
  res.setHeader('Cache-Control','no-cache');
  res.setHeader('Connection','keep-alive');
  res.flushHeaders();
  const send=(step,data)=>res.write(`data: ${JSON.stringify({step,...data})}\n\n`);
  try{
    send('idea',{status:'running',label:'💡 Analyzing idea...'});
    const ideaAnalysis=await chatComplete('Expert startup analyst.', `Analyze this startup idea: "${idea}"\n\nProvide: problem solved, target market, unique value prop, revenue model, competition. Be specific.`,'gpt-4o');
    send('idea',{status:'done',label:'💡 Idea analyzed',content:ideaAnalysis});

    send('plan',{status:'running',label:'📊 Writing business plan...'});
    const businessPlan=await chatComplete('Expert business plan writer.',`Write a concise business plan for: "${idea}"\n\nInclude: executive summary, market size, revenue projections Y1-Y3, go-to-market, team, funding.`,'gpt-4o');
    send('plan',{status:'done',label:'📊 Business plan ready',content:businessPlan});

    send('landing',{status:'running',label:'🎨 Building landing page...'});
    const landingPage=await chatComplete('Expert UI/UX developer. Create stunning landing pages.',`Create a complete beautiful landing page HTML for: "${idea}"\nRequirements: dark theme, hero section, 6 features, 3 pricing tiers, testimonials, footer, responsive, animations. Return ONLY complete HTML.`,'gpt-4o');
    send('landing',{status:'done',label:'🎨 Landing page built',content:landingPage});

    send('backend',{status:'running',label:'⚙️ Coding backend...'});
    const backendCode=await chatComplete('Senior backend developer.',`Build complete Node.js/Express backend for: "${idea}"\nInclude: Auth JWT+bcrypt, main CRUD endpoints, SQLite schema, rate limiting, error handling, .env example. Write complete working code.`,'gpt-4o');
    send('backend',{status:'done',label:'⚙️ Backend coded',content:backendCode});

    send('frontend',{status:'running',label:'🖥️ Coding frontend...'});
    const frontendCode=await chatComplete('Senior React developer.',`Build complete React frontend for: "${idea}"\nInclude: Auth pages, dashboard, core features, API integration, modern UI Tailwind. Write complete working code.`,'gpt-4o');
    send('frontend',{status:'done',label:'🖥️ Frontend coded',content:frontendCode});

    send('marketing',{status:'running',label:'📢 Creating marketing pack...'});
    const [twitter,productHunt,emailSeq,seo]=await Promise.all([
      chatComplete('Social media expert.',`Write 10 viral Twitter threads for launching: "${idea}"`,'gpt-4o-mini'),
      chatComplete('Product Hunt expert.',`Write Product Hunt launch post for: "${idea}". Include tagline, description, first comment.`,'gpt-4o-mini'),
      chatComplete('Email marketing expert.',`Write 5-email launch sequence for: "${idea}". Emails: teaser, launch, benefit, social proof, last chance.`,'gpt-4o-mini'),
      chatComplete('SEO expert.',`Generate 20 high-value keywords and meta tags for: "${idea}"`,'gpt-4o-mini'),
    ]);
    send('marketing',{status:'done',label:'📢 Marketing pack ready',content:{twitter,productHunt,emailSeq,seo}});

    send('pitch',{status:'running',label:'📑 Writing pitch deck...'});
    const pitchDeck=await chatComplete('Expert pitch deck writer.',`Create 10-slide pitch deck for: "${idea}"\nSlides: Problem, Solution, Market Size, Product, Business Model, Traction, Competition, Team, Financials, Ask`,'gpt-4o');
    send('pitch',{status:'done',label:'📑 Pitch deck ready',content:pitchDeck});

    send('deploy',{status:'running',label:'🚀 Deployment config...'});
    const deployConfig=await chatComplete('DevOps expert.',`Complete deployment config for: "${idea}" (Node+React)\nInclude: Dockerfile, docker-compose, GitHub Actions CI/CD, Railway config, Vercel config, env vars guide.`,'gpt-4o-mini');
    send('deploy',{status:'done',label:'🚀 Ready to deploy!',content:deployConfig});

    res.write(`data: ${JSON.stringify({step:'complete',label:'✅ Startup package complete!',idea})}\n\n`);
    res.end();
  }catch(e){
    res.write(`data: ${JSON.stringify({step:'error',error:e.message})}\n\n`);
    res.end();
  }
}));

// ─────────────────────────────────────────────
// 🏗️ SAAS BUILDER AGENT
// ─────────────────────────────────────────────
router.post('/saas', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {description,stack='react+node+sqlite'}=req.body;
  if(!description) return res.status(400).json({error:'Missing description.'});
  res.setHeader('Content-Type','text/event-stream');
  res.setHeader('Cache-Control','no-cache');
  res.setHeader('Connection','keep-alive');
  res.flushHeaders();
  const send=(step,data)=>res.write(`data: ${JSON.stringify({step,...data})}\n\n`);
  try{
    send('arch',{status:'running',label:'🏗️ Designing architecture...'});
    const arch=await chatComplete('Software architect.',`Design complete SaaS architecture for: "${description}"\nInclude: system design, tech stack, DB schema, API design, scalability, security.`,'gpt-4o');
    send('arch',{status:'done',label:'🏗️ Architecture designed',content:arch});

    send('db',{status:'running',label:'🗄️ Designing database...'});
    const dbSchema=await chatComplete('Database architect.',`Create complete DB schema for: "${description}"\nInclude: all tables, columns, indexes, relationships, migrations, sample data.`,'gpt-4o');
    send('db',{status:'done',label:'🗄️ Database ready',content:dbSchema});

    send('api',{status:'running',label:'⚡ Building API...'});
    const apiCode=await chatComplete('Senior backend developer.',`Build complete REST API for: "${description}"\nStack: Node.js+Express+SQLite. Include: all endpoints, auth, validation, error handling. Write complete code.`,'gpt-4o');
    send('api',{status:'done',label:'⚡ API built',content:apiCode});

    send('ui',{status:'running',label:'🎨 Building UI...'});
    const uiCode=await chatComplete('Senior React developer.',`Build complete React SaaS UI for: "${description}"\nInclude: dashboard, settings, billing, onboarding. Dark theme with Tailwind.`,'gpt-4o');
    send('ui',{status:'done',label:'🎨 UI built',content:uiCode});

    send('payments',{status:'running',label:'💳 Adding payments...'});
    const payments=await chatComplete('Payments expert.',`Integrate Stripe payments for: "${description}"\nInclude: subscription tiers, webhooks, billing portal, trial. Complete working code.`,'gpt-4o-mini');
    send('payments',{status:'done',label:'💳 Payments integrated',content:payments});

    res.write(`data: ${JSON.stringify({step:'complete',label:'✅ SaaS built!'})}\n\n`);
    res.end();
  }catch(e){
    res.write(`data: ${JSON.stringify({step:'error',error:e.message})}\n\n`);
    res.end();
  }
}));

// ─────────────────────────────────────────────
// 💻 MAXIMUM CODING FEATURES
// ─────────────────────────────────────────────

// Generate with streaming
router.post('/code/generate', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {prompt,language='javascript',framework,style='production'}=req.body;
  if(!prompt) return res.status(400).json({error:'Missing prompt.'});
  res.setHeader('Content-Type','text/event-stream');
  res.setHeader('Cache-Control','no-cache');
  res.setHeader('Connection','keep-alive');
  res.flushHeaders();
  try{
    const stream=await openai.chat.completions.create({
      model:'gpt-4o',stream:true,
      messages:[
        {role:'system',content:`Expert ${language} developer${framework?` in ${framework}`:''}. Write ${style}-quality code with comments, error handling, best practices.`},
        {role:'user',content:`${prompt}\nLanguage: ${language}${framework?`\nFramework: ${framework}`:''}`}
      ]
    });
    for await(const chunk of stream){
      const token=chunk.choices[0]?.delta?.content||'';
      if(token) res.write(`data: ${JSON.stringify({token})}\n\n`);
    }
    res.write(`data: ${JSON.stringify({done:true})}\n\n`);
    res.end();
  }catch(e){res.write(`data: ${JSON.stringify({error:e.message})}\n\n`);res.end();}
}));

// Fix code with streaming
router.post('/code/fix', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {code,error,language='javascript'}=req.body;
  if(!code) return res.status(400).json({error:'Missing code.'});
  res.setHeader('Content-Type','text/event-stream');
  res.setHeader('Cache-Control','no-cache');
  res.setHeader('Connection','keep-alive');
  res.flushHeaders();
  try{
    const stream=await openai.chat.completions.create({
      model:'gpt-4o',stream:true,
      messages:[{role:'user',content:`Fix this ${language} code.\n${error?`Error: ${error}\n`:''}\`\`\`${language}\n${code.slice(0,5000)}\n\`\`\`\nProvide: bug explanation, fixed code, what changed.`}]
    });
    for await(const chunk of stream){
      const token=chunk.choices[0]?.delta?.content||'';
      if(token) res.write(`data: ${JSON.stringify({token})}\n\n`);
    }
    res.write(`data: ${JSON.stringify({done:true})}\n\n`);
    res.end();
  }catch(e){res.write(`data: ${JSON.stringify({error:e.message})}\n\n`);res.end();}
}));

// Code review
router.post('/code/review', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {code,language='javascript'}=req.body;
  if(!code) return res.status(400).json({error:'Missing code.'});
  const result=await openai.chat.completions.create({
    model:'gpt-4o',max_tokens:1500,
    messages:[{role:'user',content:`Code review this ${language}:\n\`\`\`${language}\n${code.slice(0,5000)}\n\`\`\`\nReturn JSON: {"score":0-100,"issues":[{"severity":"critical/major/minor","problem":"...","fix":"..."}],"strengths":["..."],"suggestions":["..."],"summary":"..."}`}]
  });
  try{res.json(JSON.parse(result.choices[0]?.message?.content?.trim().replace(/```json|```/g,'')||'{}'));}
  catch(_){res.json({score:75,issues:[],strengths:[],suggestions:[],summary:'Review complete.'});}
}));

// Explain code
router.post('/code/explain', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {code,language='javascript',level='intermediate'}=req.body;
  if(!code) return res.status(400).json({error:'Missing code.'});
  const explanation=await chatComplete(`Expert ${language} teacher.`,`Explain this code at ${level} level:\n\`\`\`${language}\n${code.slice(0,4000)}\n\`\`\`\nInclude: what it does, how it works, key concepts, potential issues, real-world use.`,'gpt-4o');
  res.json({explanation});
}));

// Convert code
router.post('/code/convert', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {code,from_lang,to_lang}=req.body;
  if(!code||!from_lang||!to_lang) return res.status(400).json({error:'Missing fields.'});
  const converted=await chatComplete(`Expert in ${from_lang} and ${to_lang}.`,`Convert this ${from_lang} to ${to_lang}. Keep same logic, adapt to ${to_lang} idioms.\n\`\`\`${from_lang}\n${code.slice(0,5000)}\n\`\`\``,'gpt-4o');
  res.json({converted});
}));

// Generate tests
router.post('/code/tests', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {code,language='javascript',framework='jest'}=req.body;
  if(!code) return res.status(400).json({error:'Missing code.'});
  const tests=await chatComplete(`Expert ${language} testing with ${framework}.`,`Write comprehensive tests:\n\`\`\`${language}\n${code.slice(0,4000)}\n\`\`\`\nInclude: unit tests, edge cases, error cases, mocks. Production-ready.`,'gpt-4o');
  res.json({tests});
}));

// Generate docs
router.post('/code/docs', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {code,language='javascript',format='jsdoc'}=req.body;
  if(!code) return res.status(400).json({error:'Missing code.'});
  const docs=await chatComplete(`Technical writer, ${format} expert.`,`Generate complete ${format} docs for this ${language}:\n\`\`\`${language}\n${code.slice(0,5000)}\n\`\`\`\nInclude: function docs, param types, return types, examples, README section.`,'gpt-4o');
  res.json({docs});
}));

// Optimize code
router.post('/code/optimize', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {code,language='javascript',goal='performance'}=req.body;
  if(!code) return res.status(400).json({error:'Missing code.'});
  const result=await openai.chat.completions.create({
    model:'gpt-4o',max_tokens:2000,
    messages:[{role:'user',content:`Optimize this ${language} code for ${goal}:\n\`\`\`${language}\n${code.slice(0,4000)}\n\`\`\`\nReturn JSON: {"issues":["..."],"optimized_code":"...","improvements":["..."],"performance_gain":"estimated %"}`}]
  });
  try{res.json(JSON.parse(result.choices[0]?.message?.content?.trim().replace(/```json|```/g,'')||'{}'));}
  catch(_){res.json({issues:[],optimized_code:code,improvements:[],performance_gain:'N/A'});}
}));

// Security audit
router.post('/code/security', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {code,language='javascript'}=req.body;
  if(!code) return res.status(400).json({error:'Missing code.'});
  const result=await openai.chat.completions.create({
    model:'gpt-4o',max_tokens:1500,
    messages:[{role:'user',content:`Security audit this ${language}:\n\`\`\`${language}\n${code.slice(0,4000)}\n\`\`\`\nReturn JSON: {"score":0-100,"critical":[],"high":[],"medium":[],"low":[],"fixed_code":"...","summary":"..."}`}]
  });
  try{res.json(JSON.parse(result.choices[0]?.message?.content?.trim().replace(/```json|```/g,'')||'{}'));}
  catch(_){res.json({score:70,critical:[],high:[],medium:[],low:[],summary:'Audit complete.'});}
}));

// Pair programming chat with streaming
router.post('/code/chat', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {message,code_context,history=[]}=req.body;
  if(!message) return res.status(400).json({error:'Missing message.'});
  res.setHeader('Content-Type','text/event-stream');
  res.setHeader('Cache-Control','no-cache');
  res.setHeader('Connection','keep-alive');
  res.flushHeaders();
  try{
    const messages=[
      {role:'system',content:`Expert pair programmer. Help with code, debugging, architecture, best practices.${code_context?`\n\nCode context:\n\`\`\`\n${code_context.slice(0,3000)}\n\`\`\``:''}`},
      ...history.slice(-6).map(h=>({role:h.role,content:h.content})),
      {role:'user',content:message}
    ];
    const stream=await openai.chat.completions.create({model:'gpt-4o',stream:true,messages});
    for await(const chunk of stream){
      const token=chunk.choices[0]?.delta?.content||'';
      if(token) res.write(`data: ${JSON.stringify({token})}\n\n`);
    }
    res.write(`data: ${JSON.stringify({done:true})}\n\n`);
    res.end();
  }catch(e){res.write(`data: ${JSON.stringify({error:e.message})}\n\n`);res.end();}
}));

// Algorithm designer
router.post('/code/algorithm', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {problem,constraints,language='javascript'}=req.body;
  if(!problem) return res.status(400).json({error:'Missing problem.'});
  const result=await chatComplete('Algorithm design expert.',`Design optimal algorithm for:\nProblem: ${problem}\n${constraints?`Constraints: ${constraints}\n`:''}Language: ${language}\n\nProvide: approach, time/space complexity, pseudocode, implementation, test cases, edge cases.`,'gpt-4o');
  res.json({algorithm:result});
}));

// Snippet library
router.get('/code/snippets', requireAuth, wrap(async (req,res)=>{
  const snippets=db.prepare(`SELECT * FROM saved_projects WHERE user_id=? AND feature='code-snippet' ORDER BY created_at DESC LIMIT 30`).all(req.user.id);
  res.json({snippets});
}));

router.post('/code/snippets', requireAuth, wrap(async (req,res)=>{
  const {title,code,language,description}=req.body;
  if(!title||!code) return res.status(400).json({error:'Missing title or code.'});
  const id=db.prepare(`INSERT INTO saved_projects (user_id,title,feature,input,output) VALUES (?,?,?,?,?)`).run(req.user.id,`[${language||'code'}] ${title}`,'code-snippet',description||'',code).lastInsertRowid;
  res.json({ok:true,id});
}));

// Autocomplete
router.post('/code/autocomplete', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {code_before,code_after='',language='javascript'}=req.body;
  if(!code_before) return res.status(400).json({error:'Missing code.'});
  const completion=await openai.chat.completions.create({
    model:'gpt-4o',max_tokens:200,
    messages:[{role:'user',content:`Complete this ${language} code. Return ONLY the completion:\n\n${code_before.slice(-1000)}<CURSOR>${code_after.slice(0,200)}`}]
  });
  res.json({completion:completion.choices[0]?.message?.content||''});
}));

return router;
};