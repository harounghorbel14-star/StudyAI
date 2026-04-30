// ═══════════════════════════════════════════════
// NexusAI v2 — app.js
// Claude/ChatGPT style interface
// ═══════════════════════════════════════════════

const API = 'https://nexusai-production-6504.up.railway.app';

// ── TOOLS DATA ───────────────────────────────
const TOOLS = [
  // AI
  {id:'summarize',cat:'ai',emoji:'📝',name:'AI Summary',desc:'Summarize any text'},
  {id:'eli5',cat:'ai',emoji:'👶',name:"Explain Like I'm 5",desc:'Simple explanations'},
  {id:'translate',cat:'ai',emoji:'🌍',name:'Translate',desc:'Multi-language translation'},
  {id:'rewrite-formal',cat:'ai',emoji:'🎩',name:'Rewrite Formal',desc:'Professional tone'},
  {id:'rewrite-casual',cat:'ai',emoji:'😎',name:'Rewrite Casual',desc:'Friendly tone'},
  {id:'grammar',cat:'ai',emoji:'✏️',name:'Grammar Fix',desc:'Correct errors'},
  {id:'quiz-gen',cat:'ai',emoji:'❓',name:'Quiz Generator',desc:'Auto MCQ questions'},
  {id:'flashcards',cat:'ai',emoji:'🃏',name:'Flashcards',desc:'Study cards auto'},
  {id:'mindmap',cat:'ai',emoji:'🗺️',name:'Mind Map',desc:'Visual topic map'},
  {id:'notes-to-summary',cat:'ai',emoji:'📋',name:'Notes → Summary',desc:'Organize notes'},
  {id:'decision-helper',cat:'ai',emoji:'⚖️',name:'Decision Helper',desc:'Best choice advisor'},
  {id:'idea-to-plan',cat:'ai',emoji:'💡',name:'Idea → Plan',desc:'Action steps'},
  {id:'daily-plan',cat:'ai',emoji:'📅',name:'Daily Planner',desc:'Optimal schedule'},
  {id:'ai-coach',cat:'ai',emoji:'🎯',name:'AI Coach',desc:'Personal strategy'},
  {id:'youtube-summary',cat:'ai',emoji:'▶️',name:'YouTube Summary',desc:'Video to notes'},
  {id:'study-schedule',cat:'ai',emoji:'📚',name:'Study Schedule',desc:'Exam planner'},
  {id:'exam-questions',cat:'ai',emoji:'📄',name:'Exam Questions',desc:'Auto questions + answers'},
  {id:'lesson-simplifier',cat:'ai',emoji:'🔆',name:'Lesson Simplifier',desc:'Complex → simple'},
  {id:'revision-generator',cat:'ai',emoji:'🔄',name:'Revision Sheet',desc:'Quick recall guide'},
  // CODE
  {id:'code-explain',cat:'code',emoji:'🔍',name:'Code Explainer',desc:'Line-by-line breakdown'},
  {id:'code-review',cat:'code',emoji:'👀',name:'Code Review',desc:'Senior dev feedback'},
  {id:'code-optimizer',cat:'code',emoji:'⚡',name:'Code Optimizer',desc:'Faster & cleaner'},
  {id:'bug-detector',cat:'code',emoji:'🐛',name:'Bug Detector',desc:'Find & fix issues'},
  {id:'fix-stack-trace',cat:'code',emoji:'🔧',name:'Fix Error',desc:'From stack trace'},
  {id:'api-generator',cat:'code',emoji:'🔌',name:'API Generator',desc:'Express routes'},
  {id:'sql-builder',cat:'code',emoji:'🗄️',name:'SQL Builder',desc:'Query generator'},
  {id:'git-commit',cat:'code',emoji:'📦',name:'Git Commit',desc:'Message generator'},
  {id:'docs-writer',cat:'code',emoji:'📖',name:'Docs Writer',desc:'Auto documentation'},
  {id:'test-generator',cat:'code',emoji:'🧪',name:'Test Generator',desc:'Unit tests auto'},
  {id:'code-refactor',cat:'code',emoji:'♻️',name:'Refactor',desc:'Clean code'},
  {id:'readme-generator',cat:'code',emoji:'📑',name:'README Gen',desc:'Pro README.md'},
  {id:'ui-generator',cat:'code',emoji:'🎨',name:'UI Generator',desc:'HTML/React code'},
  {id:'design-to-code',cat:'code',emoji:'📐',name:'Design → Code',desc:'Pixel perfect'},
  {id:'deploy-guide',cat:'code',emoji:'🚀',name:'Deploy Guide',desc:'Step-by-step deploy'},
  {id:'saas-builder',cat:'code',emoji:'🏗️',name:'SaaS Builder',desc:'Full project from prompt'},
  {id:'dev-assistant',cat:'code',emoji:'🤖',name:'Dev Assistant',desc:'Pair programmer AI'},
  // BUSINESS
  {id:'startup-idea',cat:'business',emoji:'💡',name:'Startup Ideas',desc:'Validated concepts'},
  {id:'business-plan',cat:'business',emoji:'📊',name:'Business Plan',desc:'Comprehensive plan'},
  {id:'pitch-deck',cat:'business',emoji:'🎤',name:'Pitch Deck',desc:'Investor script'},
  {id:'market-analysis',cat:'business',emoji:'📈',name:'Market Analysis',desc:'Industry deep-dive'},
  {id:'pricing-strategy',cat:'business',emoji:'💲',name:'Pricing Strategy',desc:'Optimal pricing'},
  {id:'competitor-analysis',cat:'business',emoji:'🏆',name:'Competitor Analysis',desc:'Strategic gaps'},
  {id:'product-idea-from-trend',cat:'business',emoji:'🔥',name:'Trend → Product',desc:'Spot opportunities'},
  {id:'offer-generator',cat:'business',emoji:'🎁',name:'Offer Generator',desc:'Irresistible offers'},
  {id:'funnel-builder',cat:'business',emoji:'🔽',name:'Sales Funnel',desc:'Full funnel design'},
  {id:'audience-targeting',cat:'business',emoji:'🎯',name:'Audience Targeting',desc:'Buyer personas'},
  {id:'brand-name',cat:'business',emoji:'✨',name:'Brand Name Gen',desc:'10 creative names'},
  {id:'slogan',cat:'business',emoji:'💬',name:'Slogan Creator',desc:'Taglines that stick'},
  {id:'brand-identity',cat:'business',emoji:'🎨',name:'Brand Identity',desc:'Complete brand guide'},
  // CONTENT
  {id:'tiktok-script',cat:'content',emoji:'🎵',name:'TikTok Script',desc:'Viral format'},
  {id:'hooks-generator',cat:'content',emoji:'🪝',name:'Hooks Generator',desc:'20 scroll-stoppers'},
  {id:'youtube-ideas',cat:'content',emoji:'💡',name:'YouTube Ideas',desc:'15 video concepts'},
  {id:'youtube-title',cat:'content',emoji:'🎯',name:'YouTube Titles',desc:'SEO optimized'},
  {id:'instagram-captions',cat:'content',emoji:'📸',name:'Instagram Captions',desc:'5 variations'},
  {id:'hashtags',cat:'content',emoji:'#️⃣',name:'Hashtags',desc:'Strategic sets'},
  {id:'blog-article',cat:'content',emoji:'📝',name:'Blog Article',desc:'Full SEO article'},
  {id:'seo-content',cat:'content',emoji:'🔎',name:'SEO Content',desc:'Rank on Google'},
  {id:'reel-script',cat:'content',emoji:'⚡',name:'Reel Script',desc:'Under 15 seconds'},
  {id:'content-calendar',cat:'content',emoji:'📅',name:'Content Calendar',desc:'30-day plan'},
  {id:'niche-finder',cat:'content',emoji:'🔍',name:'Niche Finder',desc:'Perfect niche'},
  {id:'storytelling',cat:'content',emoji:'📖',name:'Storytelling',desc:'Viral narratives'},
  {id:'podcast-script',cat:'content',emoji:'🎙️',name:'Podcast Script',desc:'Full episode'},
  // MEDIA
  {id:'image-gen',cat:'media',emoji:'🖼️',name:'Image Generator',desc:'DALL-E 3'},
  {id:'logo-ideas',cat:'media',emoji:'✍️',name:'Logo Ideas',desc:'+ prompts'},
  {id:'image-to-prompt',cat:'media',emoji:'🔄',name:'Image → Prompt',desc:'Reverse AI'},
  {id:'poster-gen',cat:'media',emoji:'🎪',name:'Poster Generator',desc:'AI poster'},
  {id:'avatar-creator',cat:'media',emoji:'👤',name:'Avatar Creator',desc:'Profile image'},
  {id:'meme-gen',cat:'media',emoji:'😂',name:'Meme Generator',desc:'Ideas + prompts'},
  {id:'color-palette',cat:'media',emoji:'🎨',name:'Color Palette',desc:'Brand colors'},
  {id:'brand-visual-kit',cat:'media',emoji:'💼',name:'Brand Visual Kit',desc:'Full kit'},
  {id:'product-mockup-ideas',cat:'media',emoji:'📦',name:'Product Mockups',desc:'Scene ideas'},
  {id:'thumbnail-ideas',cat:'media',emoji:'🖼️',name:'Thumbnail Ideas',desc:'High-CTR concepts'},
  {id:'ai-storytelling',cat:'media',emoji:'📖',name:'AI Storytelling',desc:'Stories & scenarios'},
  // VIDEO
  {id:'script-to-scenes',cat:'video',emoji:'🎬',name:'Script → Scenes',desc:'Breakdown'},
  {id:'storyboard-gen',cat:'video',emoji:'📋',name:'Storyboard',desc:'Frame by frame'},
  {id:'short-video-plan',cat:'video',emoji:'📱',name:'Short Video Plan',desc:'Production ready'},
  {id:'voiceover-script',cat:'video',emoji:'🎙️',name:'Voiceover Script',desc:'With timing cues'},
  {id:'video-hook-analyzer',cat:'video',emoji:'🪝',name:'Hook Analyzer',desc:'Score + improve'},
  {id:'cinematic-prompts',cat:'video',emoji:'🎥',name:'Cinematic Prompts',desc:'Scene generation'},
  {id:'podcast-to-clips',cat:'video',emoji:'✂️',name:'Podcast → Clips',desc:'Viral moments'},
  {id:'subtitle-gen',cat:'video',emoji:'💬',name:'Subtitles',desc:'SRT format'},
  // AUDIO
  {id:'tts',cat:'audio',emoji:'🔊',name:'Text → Speech',desc:'Alloy voice'},
  {id:'tts-nova',cat:'audio',emoji:'🔊',name:'TTS Nova',desc:'Nova voice'},
  {id:'tts-echo',cat:'audio',emoji:'🔊',name:'TTS Echo',desc:'Echo voice'},
  {id:'tts-fable',cat:'audio',emoji:'🔊',name:'TTS Fable',desc:'Fable voice'},
  {id:'tts-onyx',cat:'audio',emoji:'🔊',name:'TTS Onyx',desc:'Deep male voice'},
  {id:'stt',cat:'audio',emoji:'🎤',name:'Voice → Text',desc:'Transcribe audio'},
  {id:'speech-writer',cat:'audio',emoji:'🗣️',name:'Speech Writer',desc:'Public speaking'},
  {id:'motivation-speech',cat:'audio',emoji:'💪',name:'Motivation Speech',desc:'Inspiring 2 min'},
  {id:'interview-answers',cat:'audio',emoji:'💼',name:'Interview Prep',desc:'STAR answers'},
  {id:'call-script',cat:'audio',emoji:'📞',name:'Call Script',desc:'Sales calls'},
  {id:'audiobook-gen',cat:'audio',emoji:'📚',name:'Audiobook Chapter',desc:'Narration ready'},
  // PRODUCTIVITY
  {id:'smart-todo',cat:'productivity',emoji:'✅',name:'Smart To-Do',desc:'Priority matrix'},
  {id:'weekly-planner',cat:'productivity',emoji:'📅',name:'Weekly Planner',desc:'Peak performance'},
  {id:'habit-builder',cat:'productivity',emoji:'🔄',name:'Habit Builder',desc:'Atomic system'},
  {id:'goal-breakdown',cat:'productivity',emoji:'🎯',name:'Goal Breakdown',desc:'90-day roadmap'},
  {id:'burnout-detector',cat:'productivity',emoji:'🧯',name:'Burnout Detector',desc:'+ recovery plan'},
  {id:'email-writer',cat:'productivity',emoji:'✉️',name:'Email Writer',desc:'High-converting'},
  {id:'cold-dm',cat:'productivity',emoji:'📩',name:'Cold DM',desc:'5 variations'},
  {id:'landing-page-copy',cat:'productivity',emoji:'🏠',name:'Landing Page Copy',desc:'AIDA framework'},
  {id:'resume-builder',cat:'productivity',emoji:'📄',name:'Resume Builder',desc:'ATS optimized'},
  {id:'sales-script',cat:'productivity',emoji:'💰',name:'Sales Script',desc:'High-converting'},
  // STUDENTS
  {id:'homework-solver',cat:'students',emoji:'✏️',name:'Homework Solver',desc:'Step by step'},
  {id:'math-solver',cat:'students',emoji:'🔢',name:'Math Solver',desc:'Detailed workings'},
  {id:'essay-writer',cat:'students',emoji:'📝',name:'Essay Writer',desc:'Academic quality'},
  {id:'translate-explain',cat:'students',emoji:'🌐',name:'Translate + Explain',desc:'Full breakdown'},
  {id:'summary-by-level',cat:'students',emoji:'📊',name:'Summary by Level',desc:'Beginner to advanced'},
];

const CAT_LABELS = {
  ai:'AI Essentials',code:'Code & Dev',business:'Business',
  content:'Content',media:'Image & Media',video:'Video & Film',
  audio:'Voice & Audio',productivity:'Productivity',students:'Students',
};

// ── STATE ────────────────────────────────────
const state = {
  token: localStorage.getItem('nx_token')||'',
  user: null,
  currentPage: 'home',
  currentTool: null,
  sessionId: null,
  messages: [],      // [{role,content,type?,data?}]
  authMode: 'login',
};

// ── API ──────────────────────────────────────
async function api(path, opts={}) {
  const isForm = opts.body instanceof FormData;
  const res = await fetch(API+path, {
    ...opts,
    headers:{
      ...(state.token?{Authorization:'Bearer '+state.token}:{}),
      ...(!isForm?{'Content-Type':'application/json'}:{}),
      ...opts.headers,
    },
    body: isForm?opts.body:opts.body?JSON.stringify(opts.body):undefined,
  });
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error||'Request failed');
  return data;
}

// ── AUTH ─────────────────────────────────────
function switchTab(mode) {
  state.authMode = mode;
  document.getElementById('tab-login').classList.toggle('active', mode==='login');
  document.getElementById('tab-signup').classList.toggle('active', mode==='signup');
  document.getElementById('auth-btn').textContent = mode==='login'?'Continue':'Create account';
  document.getElementById('auth-heading').textContent = mode==='login'?'Welcome back':'Create account';
  document.getElementById('auth-subtext').textContent = mode==='login'?'Sign in to continue':'Start for free';
  document.getElementById('auth-error').textContent = '';
}

async function handleAuth() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errEl = document.getElementById('auth-error');
  errEl.textContent='';
  if(!email||!password){errEl.textContent='Please fill all fields.';return;}
  const btn=document.getElementById('auth-btn');
  btn.textContent='...';btn.disabled=true;
  try {
    if(state.authMode==='signup'){
      await api('/api/signup',{method:'POST',body:{email,password}});
      toast('Account created!','success');
    }
    const data = await api('/api/login',{method:'POST',body:{email,password}});
    state.token=data.token;
    localStorage.setItem('nx_token',data.token);
    await initApp();
  } catch(e){errEl.textContent=e.message;}
  finally{btn.disabled=false;btn.textContent=state.authMode==='login'?'Continue':'Create account';}
}

function logout(){
  state.token='';state.user=null;
  localStorage.removeItem('nx_token');
  document.getElementById('auth-overlay').style.display='flex';
  document.getElementById('app').style.display='none';
  closeSidebar();
}

// ── INIT ─────────────────────────────────────
async function initApp(){
  try{state.user=await api('/api/me');}catch(e){logout();return;}
  document.getElementById('auth-overlay').style.display='none';
  document.getElementById('app').style.display='block';
  const email=state.user?.email||'';
  const plan=state.user?.plan||'free';
  document.getElementById('sb-avatar').textContent=email[0]?.toUpperCase()||'U';
  document.getElementById('sb-email').textContent=email;
  document.getElementById('sb-plan-label').textContent=`${plan.charAt(0).toUpperCase()+plan.slice(1)} Plan · ${state.user?.requests_today||0}/${state.user?.limit??10}`;
  updateUsageBadge();
  navigate('home');
  loadSidebarHistory();
}

function updateUsageBadge(){
  if(!state.user)return;
  const used=state.user.requests_today||0;
  const limit=state.user.limit??10;
  document.getElementById('usage-label').textContent=limit===null?`${used}/∞`:`${used}/${limit}`;
}

// ── SIDEBAR ───────────────────────────────────
function openSidebar(){
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-backdrop').style.display='block';
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-backdrop').style.display='none';
}

function handleToolSearch(){
  const q=document.getElementById('sb-search-input').value.toLowerCase();
  if(q.length>0){
    navigate('tools');
    // update tools grid with search
    setTimeout(()=>renderToolsGrid('',q),50);
  }
}

async function loadSidebarHistory(){
  try{
    const data=await api('/api/history?limit=8');
    const history=data.history||[];
    const container=document.getElementById('sb-history');
    if(!history.length){container.innerHTML='';return;}
    // group by session
    const seen=new Set();
    const items=[];
    for(const h of history){
      if(h.role==='user'&&!seen.has(h.session_id)){
        seen.add(h.session_id);
        items.push(h);
      }
    }
    container.innerHTML=items.slice(0,6).map(h=>`
      <button class="sb-history-item" onclick="closeSidebar()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        ${escHtml((h.content||'').slice(0,34))}
      </button>
    `).join('');
  }catch(_){}
}

// ── NAVIGATION ────────────────────────────────
function navigate(page){
  state.currentPage=page;
  closeSidebar();
  document.querySelectorAll('.sb-nav-item').forEach(el=>{
    el.classList.toggle('active',el.dataset.page===page);
  });
  const titles={
    home:'NexusAI',tools:'All Tools',pdf:'PDF Chat',
    projects:'Projects',pricing:'Upgrade',
    'cat-ai':'AI Essentials','cat-code':'Code & Dev',
    'cat-business':'Business','cat-content':'Content',
    'cat-media':'Image & Media','cat-video':'Video & Film',
    'cat-audio':'Voice & Audio','cat-productivity':'Productivity',
    'cat-students':'Students',
  };
  document.getElementById('topbar-title').textContent=titles[page]||page;
  const content=document.getElementById('content');
  content.scrollTop=0;
  if(page==='home') renderHome();
  else if(page==='tools') renderTools('');
  else if(page.startsWith('cat-')) renderTools(page.replace('cat-',''));
  else if(page==='projects') renderProjects();
  else if(page==='pdf') renderPDF();
  else if(page==='pricing') renderPricing();
}

function startNewChat(){
  state.currentTool=null;
  state.sessionId=null;
  state.messages=[];
  closeSidebar();
  navigate('home');
}

// ── HOME ──────────────────────────────────────
function renderHome(){
  const hour=new Date().getHours();
  const greeting=hour<12?'Good morning':hour<18?'Good afternoon':'Good evening';
  const name=(state.user?.email||'').split('@')[0];

  const featured=[
    {id:'summarize',emoji:'📝',name:'Summarize text',desc:'Paste any text'},
    {id:'tiktok-script',emoji:'🎵',name:'TikTok script',desc:'Viral content'},
    {id:'bug-detector',emoji:'🐛',name:'Debug code',desc:'Find & fix errors'},
    {id:'business-plan',emoji:'📊',name:'Business plan',desc:'Full strategy'},
  ];

  const quickTools=[
    {id:'translate',emoji:'🌍',name:'Translate'},
    {id:'grammar',emoji:'✏️',name:'Grammar Fix'},
    {id:'email-writer',emoji:'✉️',name:'Write Email'},
    {id:'image-gen',emoji:'🖼️',name:'Generate Image'},
    {id:'tts',emoji:'🔊',name:'Text to Speech'},
    {id:'math-solver',emoji:'🔢',name:'Math Solver'},
  ];

  document.getElementById('content').innerHTML=`
<div class="page">
  <div class="home-wrap">
    <div class="home-greeting">${greeting}, <em>${name}</em> 👋</div>
    <p class="home-sub">What would you like to create today?</p>

    <div class="home-suggestions">
      ${featured.map(t=>`
      <button class="suggestion-card" onclick="openTool('${t.id}')">
        <span class="suggestion-emoji">${t.emoji}</span>
        <div class="suggestion-title">${t.name}</div>
        <div class="suggestion-desc">${t.desc}</div>
      </button>`).join('')}
    </div>

    <div class="quick-row">
      ${quickTools.map(t=>`
      <button class="quick-chip" onclick="openTool('${t.id}')">
        <span>${t.emoji}</span>${t.name}
      </button>`).join('')}
    </div>

    <div class="stats-row">
      <div class="stat-item"><div class="stat-num">150+</div><div class="stat-lbl">AI Tools</div></div>
      <div class="stat-item"><div class="stat-num">${state.user?.limit===null?'∞':state.user?.limit??10}</div><div class="stat-lbl">Daily limit</div></div>
      <div class="stat-item"><div class="stat-num">${(state.user?.requests_today||0)}</div><div class="stat-lbl">Used today</div></div>
    </div>
  </div>
</div>`;
}

// ── TOOLS ─────────────────────────────────────
function renderTools(cat){
  document.getElementById('content').innerHTML=`
<div class="page">
  <div class="tools-page">
    ${cat?`<button class="runner-back" onclick="navigate('tools')" style="margin-bottom:16px;font-size:13px;color:var(--text-2)">← All Tools</button>`:''}
    <div class="tools-page-header">
      <div class="tools-page-title">${cat?(CAT_LABELS[cat]||cat):'All Tools'}</div>
      <div class="tools-count" id="tools-count"></div>
    </div>
    <div class="tools-grid" id="tools-grid"></div>
  </div>
</div>`;
  renderToolsGrid(cat,'');
}

function renderToolsGrid(cat,query){
  const base=cat?TOOLS.filter(t=>t.cat===cat):TOOLS;
  const shown=query?TOOLS.filter(t=>t.name.toLowerCase().includes(query)||t.desc.toLowerCase().includes(query)):base;
  const grid=document.getElementById('tools-grid');
  const count=document.getElementById('tools-count');
  if(grid) grid.innerHTML=shown.length?shown.map(t=>`
    <button class="tool-card" onclick="openTool('${t.id}')">
      <span class="tool-emoji">${t.emoji}</span>
      <div class="tool-name">${t.name}</div>
      <div class="tool-desc">${t.desc}</div>
    </button>`).join(''):`<div class="empty-state"><p>No tools found.</p></div>`;
  if(count) count.textContent=`${shown.length} tools`;
}

// ── TOOL RUNNER ───────────────────────────────
function openTool(id){
  const tool=TOOLS.find(t=>t.id===id);
  if(!tool)return;
  state.currentTool=tool;
  state.sessionId=null;
  state.messages=[];
  state.currentPage='runner';
  document.getElementById('topbar-title').textContent=tool.name;
  document.querySelectorAll('.sb-nav-item').forEach(el=>el.classList.remove('active'));
  closeSidebar();
  renderRunner();
}

function renderRunner(){
  const t=state.currentTool;
  if(!t){navigate('home');return;}
  const isTTS=['tts','tts-nova','tts-echo','tts-fable','tts-onyx'].includes(t.id);
  const isSTT=t.id==='stt';
  const isImage=['image-gen','poster-gen','avatar-creator'].includes(t.id);

  document.getElementById('content').innerHTML=`
<div class="runner-wrap">
  <div class="runner-header">
    <div class="runner-back" onclick="navigate('tools')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      Back
    </div>
    <div>
      <div class="runner-tool-name">${t.emoji} ${t.name}</div>
      <div class="runner-tool-desc">${t.desc}</div>
    </div>
  </div>

  <div class="runner-thread" id="runner-thread">
    ${renderMessages()}
    ${state.messages.length===0?`
    <div style="text-align:center;padding:40px 20px;color:var(--text-2)">
      <div style="font-size:36px;margin-bottom:12px">${t.emoji}</div>
      <div style="font-size:15px;font-weight:500;margin-bottom:6px">${t.name}</div>
      <div style="font-size:13px">${t.desc}</div>
    </div>`:''}
  </div>

  <div class="runner-input-area">
    <div class="runner-input-box">
      ${isSTT?`
        <input type="file" id="audio-file" accept="audio/*" style="flex:1;background:none;border:none;outline:none;color:var(--text);font-size:13px"/>
      `:`
        <textarea class="runner-textarea" id="tool-input"
          placeholder="${getPlaceholder(t)}"
          rows="1"
          oninput="autoResize(this)"
          onkeydown="handleInputKey(event)"></textarea>
      `}
      <div class="runner-actions-row">
        <button class="send-btn" id="send-btn" onclick="runTool()" title="Send">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
    ${state.sessionId?`<div style="text-align:center;font-size:11px;color:var(--text-3);margin-top:6px">Session active · <button onclick="clearSession()" style="color:var(--text-2);font-size:11px;text-decoration:underline">New session</button></div>`:''}
  </div>
</div>`;

  // Focus textarea
  setTimeout(()=>{
    const ta=document.getElementById('tool-input');
    if(ta)ta.focus();
    const thread=document.getElementById('runner-thread');
    if(thread)thread.scrollTop=thread.scrollHeight;
  },50);
}

function renderMessages(){
  return state.messages.map(m=>{
    if(m.role==='user'){
      return `<div class="msg-row user">
        <div class="msg-bubble">${escHtml(m.content)}</div>
        <div class="msg-avatar user-av">${(state.user?.email||'U')[0].toUpperCase()}</div>
      </div>`;
    } else {
      let content='';
      if(m.type==='image'){
        content=`<img src="${m.content}" alt="Generated image" loading="lazy"/>`;
      } else if(m.type==='audio'){
        content=`<audio controls src="${m.content}"></audio>`;
      } else {
        content=formatOutput(m.content);
      }
      return `<div class="msg-row assistant">
        <div class="msg-avatar ai">N</div>
        <div class="msg-bubble">${content}</div>
      </div>`;
    }
  }).join('');
}

function addTypingIndicator(){
  const thread=document.getElementById('runner-thread');
  if(!thread)return;
  const el=document.createElement('div');
  el.className='msg-row assistant';
  el.id='typing-indicator';
  el.innerHTML=`<div class="msg-avatar ai">N</div><div class="msg-bubble"><div class="typing-dots"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>`;
  thread.appendChild(el);
  thread.scrollTop=thread.scrollHeight;
}

function removeTypingIndicator(){
  document.getElementById('typing-indicator')?.remove();
}

function handleInputKey(e){
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();runTool();}
}

function autoResize(el){
  el.style.height='auto';
  el.style.height=Math.min(el.scrollHeight,200)+'px';
}

function getPlaceholder(t){
  const map={
    summarize:'Paste any text to summarize...',
    translate:'Enter text (e.g. "Translate to Arabic: Hello")',
    'code-explain':'Paste your code here...',
    'bug-detector':'Paste your code here...',
    'tiktok-script':'Your topic or idea...',
    'business-plan':'Describe your business idea...',
    'image-gen':'Describe the image you want...',
    tts:'Enter text to convert to speech...',
    'math-solver':'e.g. Solve: 2x² + 5x - 3 = 0',
  };
  return map[t.id]||`Type your ${t.name.toLowerCase()} here...`;
}

async function runTool(){
  const t=state.currentTool;
  if(!t)return;

  let input;
  if(t.id==='stt'){
    const file=document.getElementById('audio-file')?.files?.[0];
    if(!file){toast('Please select an audio file','error');return;}
    input=file;
  } else {
    input=document.getElementById('tool-input')?.value?.trim();
    if(!input){return;}
  }

  // Add user message
  if(t.id!=='stt'){
    state.messages.push({role:'user',content:input});
  }
  // Clear input
  const ta=document.getElementById('tool-input');
  if(ta){ta.value='';ta.style.height='auto';}

  // Disable send button
  const btn=document.getElementById('send-btn');
  if(btn)btn.disabled=true;

  addTypingIndicator();

  try{
    if(t.id==='stt'){
      const form=new FormData();
      form.append('audio',input);
      const result=await api('/api/transcribe',{method:'POST',body:form});
      state.messages.push({role:'user',content:'[Audio file]'});
      state.messages.push({role:'assistant',content:'📝 Transcription:\n\n'+result.text});

    } else if(['tts','tts-nova','tts-echo','tts-fable','tts-onyx'].includes(t.id)){
      const voices={tts:'alloy','tts-nova':'nova','tts-echo':'echo','tts-fable':'fable','tts-onyx':'onyx'};
      const result=await api('/api/tts',{method:'POST',body:{text:input,voice:voices[t.id]}});
      const audioUrl=`data:audio/mp3;base64,${result.audio}`;
      state.messages.push({role:'assistant',content:audioUrl,type:'audio'});

    } else if(['image-gen','poster-gen','avatar-creator'].includes(t.id)){
      const result=await api('/api/tool',{method:'POST',body:{tool_id:t.id,input,session_id:state.sessionId||undefined}});
      if(result.session_id)state.sessionId=result.session_id;
      state.messages.push({role:'assistant',content:result.output,type:'image'});

    } else {
      const result=await api('/api/tool',{method:'POST',body:{tool_id:t.id,input,session_id:state.sessionId||undefined}});
      if(result.session_id)state.sessionId=result.session_id;
      const output=result.output||result.result||result.reply||'';
      if(result.type==='audio'&&result.audio){
        const audioUrl=`data:audio/mp3;base64,${result.audio}`;
        state.messages.push({role:'assistant',content:audioUrl,type:'audio'});
      } else {
        state.messages.push({role:'assistant',content:output});
      }
    }

    // Refresh user stats
    try{state.user=await api('/api/me');updateUsageBadge();}catch(_){}
    loadSidebarHistory();

  } catch(e){
    state.messages.push({role:'assistant',content:'❌ '+e.message});
    toast(e.message,'error');
  } finally {
    removeTypingIndicator();
    if(btn)btn.disabled=false;
  }

  renderRunner();
}

function clearSession(){
  state.sessionId=null;
  state.messages=[];
  renderRunner();
  toast('New session started','success');
}

// ── PROJECTS ──────────────────────────────────
async function renderProjects(){
  document.getElementById('content').innerHTML=`<div class="page"><div class="projects-wrap"><div class="tools-page-title" style="margin-bottom:16px">Projects</div><div style="color:var(--text-2);font-size:14px">Loading...</div></div></div>`;
  try{
    const {projects=[]}=await api('/api/projects');
    document.getElementById('content').innerHTML=`
<div class="page">
  <div class="projects-wrap">
    <div class="tools-page-title" style="margin-bottom:16px">Saved Projects (${projects.length})</div>
    ${projects.length?`<div class="projects-grid">
      ${projects.map(p=>`
      <button class="project-card" onclick="viewProject(${p.id})">
        <div class="project-tag">${p.feature}</div>
        <div class="project-title">${escHtml(p.title)}</div>
        <div class="project-date">${new Date(p.created_at).toLocaleDateString()}</div>
      </button>`).join('')}
    </div>`:`<div class="empty-state"><div class="empty-icon">📁</div><p>No saved projects yet.<br/>Run a tool and save the output.</p></div>`}
  </div>
</div>`;
  }catch(e){toast(e.message,'error');}
}

async function viewProject(id){
  try{
    const {project:p}=await api('/api/projects/'+id);
    document.getElementById('content').innerHTML=`
<div class="page">
  <div class="projects-wrap">
    <button class="runner-back" onclick="renderProjects()" style="margin-bottom:16px;font-size:13px;color:var(--text-2);display:flex;align-items:center;gap:6px">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      Back
    </button>
    <div class="tools-page-title" style="margin-bottom:4px">${escHtml(p.title)}</div>
    <div style="font-size:12px;color:var(--text-3);margin-bottom:20px">${p.feature} · ${new Date(p.created_at).toLocaleString()}</div>
    <div style="display:flex;gap:8px;margin-bottom:16px">
      <button class="small-btn" onclick="navigator.clipboard.writeText(document.getElementById('proj-output').innerText);toast('Copied!','success')">Copy</button>
      <button class="small-btn danger" onclick="deleteProject(${p.id})">Delete</button>
    </div>
    <div id="proj-output" style="font-size:14px;line-height:1.8;white-space:pre-wrap;color:var(--text)">${formatOutput(p.output)}</div>
  </div>
</div>`;
  }catch(e){toast(e.message,'error');}
}

async function deleteProject(id){
  if(!confirm('Delete this project?'))return;
  try{await api('/api/projects/'+id,{method:'DELETE'});toast('Deleted','success');renderProjects();}
  catch(e){toast(e.message,'error');}
}

// ── PDF ───────────────────────────────────────
async function renderPDF(){
  let docs=[];
  try{const d=await api('/api/pdf/list');docs=d.documents||[];}catch(_){}
  document.getElementById('content').innerHTML=`
<div class="page">
  <div class="pdf-wrap">
    <div class="tools-page-title" style="margin-bottom:16px">PDF Chat</div>
    <div class="upload-zone" id="upload-zone"
      onclick="document.getElementById('pdf-input').click()"
      ondragover="this.classList.add('dragover');event.preventDefault()"
      ondragleave="this.classList.remove('dragover')"
      ondrop="handlePDFDrop(event)">
      <div class="upload-icon">📄</div>
      <div class="upload-text"><strong>Click or drag a PDF here</strong><br/>Max 10 MB · AI reads and summarizes it</div>
      <input type="file" id="pdf-input" accept="application/pdf" style="display:none" onchange="uploadPDF(this.files[0])"/>
    </div>
    <div id="upload-loading" style="display:none;text-align:center;padding:16px;color:var(--text-2);font-size:14px">
      <div class="typing-dots" style="justify-content:center;margin-bottom:8px"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>
      Extracting text...
    </div>
    ${docs.length?`
    <div class="section-hd"><div class="section-title">Your Documents (${docs.length})</div></div>
    <div class="pdf-list">
      ${docs.map(d=>`
      <div class="pdf-item">
        <div class="pdf-icon">📄</div>
        <div class="pdf-info">
          <div class="pdf-name">${escHtml(d.filename)}</div>
          <div class="pdf-summary">${escHtml((d.summary||'').slice(0,120))}</div>
        </div>
        <div class="pdf-actions">
          <button class="small-btn" onclick="openPDFChat(${d.id},'${escHtml(d.filename)}')">Chat</button>
          <button class="small-btn danger" onclick="deletePDF(${d.id})">✕</button>
        </div>
      </div>`).join('')}
    </div>`:''}
  </div>
</div>`;
}

function handlePDFDrop(e){
  e.preventDefault();
  document.getElementById('upload-zone').classList.remove('dragover');
  const file=e.dataTransfer.files[0];
  if(file?.type==='application/pdf')uploadPDF(file);
  else toast('Please drop a PDF file','error');
}

async function uploadPDF(file){
  if(!file)return;
  document.getElementById('upload-loading').style.display='block';
  const form=new FormData();
  form.append('pdf',file);
  try{
    const data=await api('/api/pdf/upload',{method:'POST',body:form});
    toast('PDF uploaded!','success');
    openPDFChat(data.id,data.filename,data.summary);
  }catch(e){toast(e.message,'error');}
  finally{const el=document.getElementById('upload-loading');if(el)el.style.display='none';}
}

function openPDFChat(id,filename,summary){
  // Reuse runner-style chat for PDF
  state.messages=[];
  if(summary){
    state.messages.push({role:'assistant',content:`📋 **Summary of "${filename}"**\n\n${summary}`});
  }
  document.getElementById('topbar-title').textContent=filename;
  document.getElementById('content').innerHTML=`
<div class="runner-wrap">
  <div class="runner-header">
    <div class="runner-back" onclick="renderPDF()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      Back
    </div>
    <div>
      <div class="runner-tool-name">📄 ${escHtml(filename)}</div>
      <div class="runner-tool-desc">Ask anything about this document</div>
    </div>
  </div>
  <div class="runner-thread" id="runner-thread">
    ${renderPDFMessages(summary,filename)}
  </div>
  <div class="runner-input-area">
    <div class="runner-input-box">
      <textarea class="runner-textarea" id="pdf-question"
        placeholder="Ask a question about this document..."
        rows="1" oninput="autoResize(this)"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();askPDF(${id});}"></textarea>
      <div class="runner-actions-row">
        <button class="send-btn" id="pdf-send-btn" onclick="askPDF(${id})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  </div>
</div>`;
  setTimeout(()=>{
    const thread=document.getElementById('runner-thread');
    if(thread)thread.scrollTop=thread.scrollHeight;
    document.getElementById('pdf-question')?.focus();
  },50);
}

function renderPDFMessages(summary,filename){
  if(!summary)return'';
  return`<div class="msg-row assistant">
    <div class="msg-avatar ai">N</div>
    <div class="msg-bubble">${formatOutput(`📋 **Summary of "${filename}"**\n\n${summary}`)}</div>
  </div>`;
}

const pdfMessages=[];
async function askPDF(id){
  const q=document.getElementById('pdf-question')?.value?.trim();
  if(!q)return;
  const thread=document.getElementById('runner-thread');
  const btn=document.getElementById('pdf-send-btn');
  if(btn)btn.disabled=true;
  document.getElementById('pdf-question').value='';

  thread.innerHTML+=`<div class="msg-row user">
    <div class="msg-bubble">${escHtml(q)}</div>
    <div class="msg-avatar user-av">${(state.user?.email||'U')[0].toUpperCase()}</div>
  </div>`;

  const typingEl=document.createElement('div');
  typingEl.className='msg-row assistant';
  typingEl.id='pdf-typing';
  typingEl.innerHTML=`<div class="msg-avatar ai">N</div><div class="msg-bubble"><div class="typing-dots"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>`;
  thread.appendChild(typingEl);
  thread.scrollTop=thread.scrollHeight;

  try{
    const data=await api('/api/pdf/'+id+'/ask',{method:'POST',body:{question:q}});
    typingEl.remove();
    thread.innerHTML+=`<div class="msg-row assistant">
      <div class="msg-avatar ai">N</div>
      <div class="msg-bubble">${formatOutput(data.answer)}</div>
    </div>`;
    thread.scrollTop=thread.scrollHeight;
  }catch(e){
    typingEl.remove();
    toast(e.message,'error');
  }finally{if(btn)btn.disabled=false;}
}

async function deletePDF(id){
  if(!confirm('Delete?'))return;
  try{await api('/api/pdf/'+id,{method:'DELETE'});renderPDF();toast('Deleted','success');}
  catch(e){toast(e.message,'error');}
}

// ── PRICING ───────────────────────────────────
function renderPricing(){
  document.getElementById('content').innerHTML=`
<div class="page">
  <div class="pricing-wrap">
    <div class="pricing-title">Simple, transparent pricing</div>
    <p class="pricing-sub">Upgrade anytime. Cancel anytime.</p>
    <div class="pricing-grid">
      <div class="price-card">
        <div class="price-name">Free</div>
        <div class="price-amount"><sup>$</sup>0</div>
        <div class="price-period">forever</div>
        <ul class="price-features">
          <li>10 requests / day</li>
          <li>All 150+ tools</li>
          <li>PDF chat</li>
          <li>Project saving</li>
        </ul>
        <button class="price-btn outline" disabled>Current plan</button>
      </div>
      <div class="price-card featured">
        <div class="price-name">Pro</div>
        <div class="price-amount"><sup>$</sup>19</div>
        <div class="price-period">per month</div>
        <ul class="price-features">
          <li>500 requests / day</li>
          <li>All 150+ tools</li>
          <li>AI memory</li>
          <li>Priority processing</li>
          <li>Email support</li>
        </ul>
        <button class="price-btn primary" onclick="subscribe('pro')">Get Pro →</button>
      </div>
      <div class="price-card">
        <div class="price-name">Elite</div>
        <div class="price-amount"><sup>$</sup>49</div>
        <div class="price-period">per month</div>
        <ul class="price-features">
          <li>Unlimited requests</li>
          <li>All 150+ tools</li>
          <li>API access</li>
          <li>Priority support</li>
        </ul>
        <button class="price-btn outline" onclick="subscribe('elite')">Get Elite →</button>
      </div>
    </div>
  </div>
</div>`;
}

async function subscribe(plan){
  try{
    const data=await api('/api/subscribe',{method:'POST',body:{plan}});
    if(data.checkoutUrl)window.open(data.checkoutUrl,'_blank');
    else toast('Redirecting...','success');
  }catch(e){toast(e.message,'error');}
}

// ── HELPERS ───────────────────────────────────
function formatOutput(text){
  if(!text)return'';
  return text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/```(\w*)\n?([\s\S]*?)```/g,'<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/^### (.+)$/gm,'<h3>$1</h3>')
    .replace(/^## (.+)$/gm,'<h2>$1</h2>')
    .replace(/^# (.+)$/gm,'<h1>$1</h1>')
    .replace(/\n/g,'<br/>');
}

function escHtml(t){
  return(t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function toast(msg,type=''){
  const wrap=document.getElementById('toast-wrap');
  const el=document.createElement('div');
  el.className='toast '+type;
  el.textContent=msg;
  wrap.appendChild(el);
  setTimeout(()=>{el.style.opacity='0';el.style.transition='opacity .3s';setTimeout(()=>el.remove(),300);},3000);
}

// ── BOOT ─────────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('auth-email')?.addEventListener('keydown',e=>{if(e.key==='Enter')handleAuth();});
  document.getElementById('auth-password')?.addEventListener('keydown',e=>{if(e.key==='Enter')handleAuth();});
  if(state.token)initApp();
});