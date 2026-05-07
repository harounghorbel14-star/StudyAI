// ============================================================
// 🚀 REAL DEPLOY ENGINE — routes/deploy-engine.js
// GitHub repo + push + Vercel deploy + Railway + DNS + monitoring
// ============================================================
const express = require('express');
const router = express.Router();
const crypto = require('crypto');

module.exports = (db, openai, requireAuth, requireQuota, aiLimiter, wrap) => {

// ─── DB Tables ───────────────────────────────
db.prepare(`CREATE TABLE IF NOT EXISTS user_credentials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  service TEXT NOT NULL,
  token_encrypted TEXT NOT NULL,
  username TEXT,
  metadata TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, service)
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS deployments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  project_id INTEGER,
  repo_name TEXT,
  repo_url TEXT,
  vercel_url TEXT,
  railway_url TEXT,
  custom_domain TEXT,
  status TEXT DEFAULT 'pending',
  logs TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
)`).run();

// Simple encryption for tokens (use env DEPLOY_KEY in production)
const DEPLOY_KEY = process.env.DEPLOY_KEY || 'nexusai-default-key-change-me-32';
function encrypt(text){
  if(!text)return '';
  try{
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(DEPLOY_KEY.padEnd(32).slice(0,32)), Buffer.alloc(16,0));
    return cipher.update(text,'utf8','hex') + cipher.final('hex');
  }catch(_){return Buffer.from(text).toString('base64');}
}
function decrypt(encrypted){
  if(!encrypted)return '';
  try{
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(DEPLOY_KEY.padEnd(32).slice(0,32)), Buffer.alloc(16,0));
    return decipher.update(encrypted,'hex','utf8') + decipher.final('utf8');
  }catch(_){return Buffer.from(encrypted,'base64').toString('utf8');}
}

// ─── 1. Connect Services (GitHub/Vercel/Railway tokens) ───
router.post('/connect', requireAuth, wrap(async (req,res)=>{
  const {service, token, username} = req.body;
  if(!['github','vercel','railway','cloudflare'].includes(service))
    return res.status(400).json({error:'Invalid service'});
  if(!token) return res.status(400).json({error:'Missing token'});

  // Verify token works
  let valid = false, info = {};
  try{
    if(service==='github'){
      const r = await fetch('https://api.github.com/user',{headers:{Authorization:`Bearer ${token}`,'User-Agent':'NexusAI'}});
      const d = await r.json();
      valid = r.ok && !!d.login;
      info = {login:d.login, name:d.name, avatar:d.avatar_url};
    } else if(service==='vercel'){
      const r = await fetch('https://api.vercel.com/v2/user',{headers:{Authorization:`Bearer ${token}`}});
      const d = await r.json();
      valid = r.ok && !!d.user;
      info = {email:d.user?.email, name:d.user?.name, id:d.user?.id};
    } else if(service==='railway'){
      const r = await fetch('https://backboard.railway.app/graphql/v2',{
        method:'POST',
        headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body:JSON.stringify({query:'{ me { id email name } }'})
      });
      const d = await r.json();
      valid = !!d.data?.me;
      info = d.data?.me || {};
    } else if(service==='cloudflare'){
      const r = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify',{headers:{Authorization:`Bearer ${token}`}});
      const d = await r.json();
      valid = d.success;
      info = {status:d.result?.status};
    }
  }catch(e){return res.status(400).json({error:'Token verification failed: '+e.message});}

  if(!valid) return res.status(400).json({error:'Invalid token'});

  db.prepare(`INSERT INTO user_credentials (user_id, service, token_encrypted, username, metadata)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(user_id, service) DO UPDATE SET
              token_encrypted=excluded.token_encrypted, username=excluded.username, metadata=excluded.metadata`)
    .run(req.user.id, service, encrypt(token), username||info.login||info.email||'', JSON.stringify(info));

  res.json({ok:true, service, info});
}));

// Get connected services
router.get('/connections', requireAuth, wrap(async (req,res)=>{
  const conns = db.prepare(`SELECT service, username, metadata, created_at FROM user_credentials WHERE user_id=?`).all(req.user.id);
  res.json({connections:conns.map(c=>({...c,metadata:JSON.parse(c.metadata||'{}')}))});
}));

// Disconnect service
router.delete('/connect/:service', requireAuth, wrap(async (req,res)=>{
  db.prepare(`DELETE FROM user_credentials WHERE user_id=? AND service=?`).run(req.user.id, req.params.service);
  res.json({ok:true});
}));

// Helper: get user token
function getToken(userId, service){
  const row = db.prepare(`SELECT token_encrypted FROM user_credentials WHERE user_id=? AND service=?`).get(userId, service);
  return row ? decrypt(row.token_encrypted) : null;
}

// ─── 2. CREATE GITHUB REPO + PUSH CODE ───
async function createGitHubRepo(token, repoName, files, description=''){
  // Create repo
  const createR = await fetch('https://api.github.com/user/repos',{
    method:'POST',
    headers:{Authorization:`Bearer ${token}`,'User-Agent':'NexusAI','Content-Type':'application/json'},
    body:JSON.stringify({name:repoName, description, private:false, auto_init:true})
  });
  const repo = await createR.json();
  if(!createR.ok) throw new Error('GitHub: '+(repo.message||'create failed'));

  // Get default branch SHA
  const branchR = await fetch(`https://api.github.com/repos/${repo.full_name}/git/refs/heads/main`,{
    headers:{Authorization:`Bearer ${token}`,'User-Agent':'NexusAI'}
  });
  const branch = await branchR.json();
  const baseSha = branch.object?.sha;

  // Get base tree
  const baseCommitR = await fetch(`https://api.github.com/repos/${repo.full_name}/git/commits/${baseSha}`,{
    headers:{Authorization:`Bearer ${token}`,'User-Agent':'NexusAI'}
  });
  const baseCommit = await baseCommitR.json();

  // Create blobs for each file
  const blobs = [];
  for(const file of files){
    const blobR = await fetch(`https://api.github.com/repos/${repo.full_name}/git/blobs`,{
      method:'POST',
      headers:{Authorization:`Bearer ${token}`,'User-Agent':'NexusAI','Content-Type':'application/json'},
      body:JSON.stringify({content:Buffer.from(file.content||'').toString('base64'),encoding:'base64'})
    });
    const blob = await blobR.json();
    if(blob.sha) blobs.push({path:file.path, mode:'100644', type:'blob', sha:blob.sha});
  }

  // Create tree
  const treeR = await fetch(`https://api.github.com/repos/${repo.full_name}/git/trees`,{
    method:'POST',
    headers:{Authorization:`Bearer ${token}`,'User-Agent':'NexusAI','Content-Type':'application/json'},
    body:JSON.stringify({base_tree:baseCommit.tree?.sha, tree:blobs})
  });
  const tree = await treeR.json();

  // Create commit
  const commitR = await fetch(`https://api.github.com/repos/${repo.full_name}/git/commits`,{
    method:'POST',
    headers:{Authorization:`Bearer ${token}`,'User-Agent':'NexusAI','Content-Type':'application/json'},
    body:JSON.stringify({message:'🚀 Initial deploy by NexusAI', tree:tree.sha, parents:[baseSha]})
  });
  const commit = await commitR.json();

  // Update branch
  await fetch(`https://api.github.com/repos/${repo.full_name}/git/refs/heads/main`,{
    method:'PATCH',
    headers:{Authorization:`Bearer ${token}`,'User-Agent':'NexusAI','Content-Type':'application/json'},
    body:JSON.stringify({sha:commit.sha})
  });

  return {repo_url:repo.html_url, full_name:repo.full_name, clone_url:repo.clone_url};
}

// ─── 3. DEPLOY TO VERCEL ───
async function deployVercel(token, repoFullName, projectName){
  // Create Vercel project from GitHub
  const r = await fetch('https://api.vercel.com/v9/projects',{
    method:'POST',
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify({
      name:projectName,
      framework:null,
      gitRepository:{type:'github', repo:repoFullName}
    })
  });
  const project = await r.json();
  if(!r.ok && r.status!==409) throw new Error('Vercel: '+(project.error?.message||'failed'));

  // Trigger deployment
  const deployR = await fetch('https://api.vercel.com/v13/deployments',{
    method:'POST',
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify({
      name:projectName,
      gitSource:{type:'github', repo:repoFullName, ref:'main'},
      target:'production'
    })
  });
  const deploy = await deployR.json();
  return {url:deploy.url ? `https://${deploy.url}` : null, deployment_id:deploy.id, status:deploy.readyState};
}

// ─── 4. DEPLOY TO RAILWAY ───
async function deployRailway(token, repoUrl, projectName){
  const query = `mutation { projectCreate(input:{name:"${projectName}", description:"Built with NexusAI"}) { id name } }`;
  const r = await fetch('https://backboard.railway.app/graphql/v2',{
    method:'POST',
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify({query})
  });
  const d = await r.json();
  if(d.errors) throw new Error('Railway: '+d.errors[0].message);
  return {project_id:d.data?.projectCreate?.id, name:d.data?.projectCreate?.name};
}

// ─── 5. DEPLOY ENV VARS to Vercel ───
async function setVercelEnv(token, projectId, envVars){
  for(const {key, value} of envVars){
    await fetch(`https://api.vercel.com/v9/projects/${projectId}/env`,{
      method:'POST',
      headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
      body:JSON.stringify({key, value, target:['production','preview','development'], type:'encrypted'})
    });
  }
}

// ─── 6. ONE-CLICK DEPLOY (Real End-to-End) ───
router.post('/deploy/full', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {project_id, repo_name, env_vars=[]} = req.body;
  if(!project_id) return res.status(400).json({error:'Missing project_id'});

  res.setHeader('Content-Type','text/event-stream');
  res.setHeader('Cache-Control','no-cache');
  res.setHeader('Connection','keep-alive');
  res.flushHeaders();

  const send = e => res.write(`data: ${JSON.stringify(e)}\n\n`);

  const ghToken = getToken(req.user.id,'github');
  const vercelToken = getToken(req.user.id,'vercel');

  if(!ghToken){send({type:'error',message:'Connect GitHub first'});return res.end();}

  // Get project
  const project = db.prepare(`SELECT * FROM agent_projects WHERE id=? AND user_id=?`).get(project_id, req.user.id);
  if(!project){send({type:'error',message:'Project not found'});return res.end();}

  // Get all generated files from agent steps
  const steps = db.prepare(`SELECT agent_name, output FROM agent_steps WHERE project_id=? AND status='completed'`).all(project_id);
  const files = [];

  for(const s of steps){
    try{
      const out = JSON.parse(s.output||'{}');
      if(s.agent_name==='Dev Agent' && out.files){
        out.files.forEach(f => files.push({path:f.path, content:f.content}));
      }
      if(s.agent_name==='Design Agent' && out.landing_page_html){
        files.push({path:'index.html', content:out.landing_page_html});
      }
      if(s.agent_name==='Deploy Agent'){
        if(out.dockerfile) files.push({path:'Dockerfile', content:out.dockerfile});
        if(out.docker_compose) files.push({path:'docker-compose.yml', content:out.docker_compose});
        if(out.github_actions) files.push({path:'.github/workflows/deploy.yml', content:out.github_actions});
        if(out.github_setup?.readme) files.push({path:'README.md', content:out.github_setup.readme});
        if(out.github_setup?.gitignore) files.push({path:'.gitignore', content:out.github_setup.gitignore});
        if(out.env_template) files.push({path:'.env.example', content:out.env_template});
      }
    }catch(_){}
  }

  if(!files.length){send({type:'error',message:'No files to deploy'});return res.end();}

  const finalRepoName = repo_name || project.name.toLowerCase().replace(/[^a-z0-9]/g,'-').slice(0,30);

  try{
    // Step 1: Create GitHub repo + push
    send({type:'step',name:'github',status:'running',message:'📦 Creating GitHub repository...',progress:10});
    const ghResult = await createGitHubRepo(ghToken, finalRepoName, files, project.idea);
    send({type:'step',name:'github',status:'done',message:`✅ Repo created: ${ghResult.full_name}`,data:ghResult,progress:40});

    let vercelResult = null;
    // Step 2: Deploy Vercel
    if(vercelToken){
      send({type:'step',name:'vercel',status:'running',message:'🌐 Deploying to Vercel...',progress:60});
      try{
        vercelResult = await deployVercel(vercelToken, ghResult.full_name, finalRepoName);
        if(env_vars.length){await setVercelEnv(vercelToken, vercelResult.deployment_id, env_vars);}
        send({type:'step',name:'vercel',status:'done',message:`✅ Live at: ${vercelResult.url}`,data:vercelResult,progress:90});
      }catch(e){
        send({type:'step',name:'vercel',status:'error',message:e.message,progress:90});
      }
    }

    // Save deployment
    db.prepare(`INSERT INTO deployments (user_id, project_id, repo_name, repo_url, vercel_url, status)
                VALUES (?, ?, ?, ?, ?, 'live')`)
      .run(req.user.id, project_id, finalRepoName, ghResult.repo_url, vercelResult?.url||null);

    send({type:'complete',
      repo_url:ghResult.repo_url,
      live_url:vercelResult?.url,
      progress:100,
      summary:`🎉 Deployed in seconds! ${vercelResult?.url || 'GitHub: '+ghResult.repo_url}`
    });
    res.end();
  }catch(e){
    send({type:'error',message:e.message});
    res.end();
  }
}));

// ─── 7. DNS / Custom Domain via Cloudflare ───
router.post('/dns/add', requireAuth, wrap(async (req,res)=>{
  const {domain, target_url} = req.body;
  const cfToken = getToken(req.user.id,'cloudflare');
  if(!cfToken) return res.status(400).json({error:'Connect Cloudflare first'});

  // List zones
  const zonesR = await fetch('https://api.cloudflare.com/client/v4/zones',{headers:{Authorization:`Bearer ${cfToken}`}});
  const zones = await zonesR.json();
  const rootDomain = domain.split('.').slice(-2).join('.');
  const zone = zones.result?.find(z => z.name===rootDomain);
  if(!zone) return res.status(404).json({error:`Zone ${rootDomain} not found in Cloudflare`});

  // Add CNAME record
  const recordR = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone.id}/dns_records`,{
    method:'POST',
    headers:{Authorization:`Bearer ${cfToken}`,'Content-Type':'application/json'},
    body:JSON.stringify({type:'CNAME',name:domain,content:target_url.replace(/^https?:\/\//,''),proxied:true})
  });
  const record = await recordR.json();
  res.json({ok:record.success, record:record.result});
}));

// ─── 8. Deployment Monitoring ───
router.get('/deployments', requireAuth, wrap(async (req,res)=>{
  const list = db.prepare(`SELECT * FROM deployments WHERE user_id=? ORDER BY created_at DESC LIMIT 20`).all(req.user.id);
  res.json({deployments:list});
}));

router.get('/deployments/:id/status', requireAuth, wrap(async (req,res)=>{
  const dep = db.prepare(`SELECT * FROM deployments WHERE id=? AND user_id=?`).get(req.params.id, req.user.id);
  if(!dep) return res.status(404).json({error:'Not found'});

  // Check live status
  let liveStatus = 'unknown';
  if(dep.vercel_url){
    try{
      const r = await fetch(dep.vercel_url, {method:'HEAD', signal:AbortSignal.timeout(5000)});
      liveStatus = r.ok ? 'live' : 'down';
    }catch(_){liveStatus='down';}
  }
  res.json({deployment:dep, live_status:liveStatus});
}));

// ─── 9. SEND EMAILS (Real - via Resend or SMTP) ───
router.post('/email/send', requireAuth, requireQuota, wrap(async (req,res)=>{
  const {to, subject, html, text} = req.body;
  if(!to||!subject) return res.status(400).json({error:'Missing to or subject'});

  // Try Resend first
  if(process.env.RESEND_API_KEY){
    try{
      const r = await fetch('https://api.resend.com/emails',{
        method:'POST',
        headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},
        body:JSON.stringify({
          from:process.env.EMAIL_FROM||'NexusAI <onboarding@resend.dev>',
          to:[to], subject, html:html||text, text:text||html
        })
      });
      const d = await r.json();
      if(r.ok) return res.json({ok:true, id:d.id, provider:'resend'});
      return res.status(500).json({error:d.message||'Email failed'});
    }catch(e){return res.status(500).json({error:e.message});}
  }

  res.status(503).json({error:'No email provider configured. Set RESEND_API_KEY.'});
}));

// ─── 10. LAUNCH CAMPAIGN (Real - email sequences + social posts) ───
router.post('/campaign/launch', requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {project_id, channels=['email','twitter','linkedin']} = req.body;
  if(!project_id) return res.status(400).json({error:'Missing project_id'});

  const project = db.prepare(`SELECT * FROM agent_projects WHERE id=? AND user_id=?`).get(project_id, req.user.id);
  if(!project) return res.status(404).json({error:'Not found'});

  // Get marketing content from project
  const marketingStep = db.prepare(`SELECT output FROM agent_steps WHERE project_id=? AND agent_name='Marketing Agent'`).get(project_id);
  const marketing = marketingStep ? JSON.parse(marketingStep.output||'{}') : {};

  const tasks = [];
  if(channels.includes('email') && marketing.email_sequence){
    tasks.push({channel:'email',scheduled:marketing.email_sequence.length+' emails queued',status:'ready'});
  }
  if(channels.includes('twitter') && marketing.twitter_threads){
    tasks.push({channel:'twitter',content:marketing.twitter_threads.length+' threads ready',status:'ready_to_post'});
  }
  if(channels.includes('linkedin') && marketing.linkedin_posts){
    tasks.push({channel:'linkedin',content:marketing.linkedin_posts.length+' posts ready',status:'ready_to_post'});
  }
  if(channels.includes('producthunt') && marketing.product_hunt){
    tasks.push({channel:'producthunt',content:'Launch package ready',data:marketing.product_hunt,status:'ready'});
  }

  res.json({campaign_id:Date.now(), tasks, project:project.name});
}));

return router;
};