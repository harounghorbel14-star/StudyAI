// NexusAI v3 — app.js
// Chat interface · Voice · Image attach · Tools sidebar

const API = 'https://nexusai-production-6504.up.railway.app';

// ── TOOLS ────────────────────────────────────
const TOOLS = [
  {id:'summarize',cat:'ai',e:'📝',name:'AI Summary'},
  {id:'eli5',cat:'ai',e:'👶',name:"Explain Like I'm 5"},
  {id:'translate',cat:'ai',e:'🌍',name:'Translate'},
  {id:'rewrite-formal',cat:'ai',e:'🎩',name:'Rewrite Formal'},
  {id:'rewrite-casual',cat:'ai',e:'😎',name:'Rewrite Casual'},
  {id:'grammar',cat:'ai',e:'✏️',name:'Grammar Fix'},
  {id:'quiz-gen',cat:'ai',e:'❓',name:'Quiz Generator'},
  {id:'flashcards',cat:'ai',e:'🃏',name:'Flashcards'},
  {id:'mindmap',cat:'ai',e:'🗺️',name:'Mind Map'},
  {id:'notes-to-summary',cat:'ai',e:'📋',name:'Notes → Summary'},
  {id:'decision-helper',cat:'ai',e:'⚖️',name:'Decision Helper'},
  {id:'idea-to-plan',cat:'ai',e:'💡',name:'Idea → Plan'},
  {id:'daily-plan',cat:'ai',e:'📅',name:'Daily Planner'},
  {id:'ai-coach',cat:'ai',e:'🎯',name:'AI Coach'},
  {id:'youtube-summary',cat:'ai',e:'▶️',name:'YouTube Summary'},
  {id:'study-schedule',cat:'ai',e:'📚',name:'Study Schedule'},
  {id:'exam-questions',cat:'ai',e:'📄',name:'Exam Questions'},
  {id:'lesson-simplifier',cat:'ai',e:'🔆',name:'Lesson Simplifier'},
  {id:'revision-generator',cat:'ai',e:'🔄',name:'Revision Sheet'},
  {id:'code-explain',cat:'code',e:'🔍',name:'Code Explainer'},
  {id:'code-review',cat:'code',e:'👀',name:'Code Review'},
  {id:'code-optimizer',cat:'code',e:'⚡',name:'Code Optimizer'},
  {id:'bug-detector',cat:'code',e:'🐛',name:'Bug Detector'},
  {id:'fix-stack-trace',cat:'code',e:'🔧',name:'Fix Error'},
  {id:'api-generator',cat:'code',e:'🔌',name:'API Generator'},
  {id:'sql-builder',cat:'code',e:'🗄️',name:'SQL Builder'},
  {id:'git-commit',cat:'code',e:'📦',name:'Git Commit'},
  {id:'docs-writer',cat:'code',e:'📖',name:'Docs Writer'},
  {id:'test-generator',cat:'code',e:'🧪',name:'Test Generator'},
  {id:'code-refactor',cat:'code',e:'♻️',name:'Refactor'},
  {id:'readme-generator',cat:'code',e:'📑',name:'README Gen'},
  {id:'ui-generator',cat:'code',e:'🎨',name:'UI Generator'},
  {id:'design-to-code',cat:'code',e:'📐',name:'Design → Code'},
  {id:'deploy-guide',cat:'code',e:'🚀',name:'Deploy Guide'},
  {id:'saas-builder',cat:'code',e:'🏗️',name:'SaaS Builder'},
  {id:'dev-assistant',cat:'code',e:'🤖',name:'Dev Assistant'},
  {id:'startup-idea',cat:'business',e:'💡',name:'Startup Ideas'},
  {id:'business-plan',cat:'business',e:'📊',name:'Business Plan'},
  {id:'pitch-deck',cat:'business',e:'🎤',name:'Pitch Deck'},
  {id:'market-analysis',cat:'business',e:'📈',name:'Market Analysis'},
  {id:'pricing-strategy',cat:'business',e:'💲',name:'Pricing Strategy'},
  {id:'competitor-analysis',cat:'business',e:'🏆',name:'Competitor Analysis'},
  {id:'product-idea-from-trend',cat:'business',e:'🔥',name:'Trend → Product'},
  {id:'offer-generator',cat:'business',e:'🎁',name:'Offer Generator'},
  {id:'funnel-builder',cat:'business',e:'🔽',name:'Sales Funnel'},
  {id:'audience-targeting',cat:'business',e:'🎯',name:'Audience Targeting'},
  {id:'brand-name',cat:'business',e:'✨',name:'Brand Name Gen'},
  {id:'slogan',cat:'business',e:'💬',name:'Slogan Creator'},
  {id:'brand-identity',cat:'business',e:'🎨',name:'Brand Identity'},
  {id:'tiktok-script',cat:'content',e:'🎵',name:'TikTok Script'},
  {id:'hooks-generator',cat:'content',e:'🪝',name:'Hooks Generator'},
  {id:'youtube-ideas',cat:'content',e:'💡',name:'YouTube Ideas'},
  {id:'youtube-title',cat:'content',e:'🎯',name:'YouTube Titles'},
  {id:'instagram-captions',cat:'content',e:'📸',name:'Instagram Captions'},
  {id:'hashtags',cat:'content',e:'#️⃣',name:'Hashtags'},
  {id:'blog-article',cat:'content',e:'📝',name:'Blog Article'},
  {id:'seo-content',cat:'content',e:'🔎',name:'SEO Content'},
  {id:'reel-script',cat:'content',e:'⚡',name:'Reel Script'},
  {id:'content-calendar',cat:'content',e:'📅',name:'Content Calendar'},
  {id:'niche-finder',cat:'content',e:'🔍',name:'Niche Finder'},
  {id:'storytelling',cat:'content',e:'📖',name:'Storytelling'},
  {id:'podcast-script',cat:'content',e:'🎙️',name:'Podcast Script'},
  {id:'image-gen',cat:'media',e:'🖼️',name:'Image Generator'},
  {id:'logo-ideas',cat:'media',e:'✍️',name:'Logo Ideas'},
  {id:'image-to-prompt',cat:'media',e:'🔄',name:'Image → Prompt'},
  {id:'poster-gen',cat:'media',e:'🎪',name:'Poster Generator'},
  {id:'avatar-creator',cat:'media',e:'👤',name:'Avatar Creator'},
  {id:'meme-gen',cat:'media',e:'😂',name:'Meme Generator'},
  {id:'color-palette',cat:'media',e:'🎨',name:'Color Palette'},
  {id:'brand-visual-kit',cat:'media',e:'💼',name:'Brand Visual Kit'},
  {id:'product-mockup-ideas',cat:'media',e:'📦',name:'Product Mockups'},
  {id:'thumbnail-ideas',cat:'media',e:'🖼️',name:'Thumbnail Ideas'},
  {id:'ai-storytelling',cat:'media',e:'📖',name:'AI Storytelling'},
  {id:'script-to-scenes',cat:'video',e:'🎬',name:'Script → Scenes'},
  {id:'storyboard-gen',cat:'video',e:'📋',name:'Storyboard'},
  {id:'short-video-plan',cat:'video',e:'📱',name:'Short Video Plan'},
  {id:'voiceover-script',cat:'video',e:'🎙️',name:'Voiceover Script'},
  {id:'video-hook-analyzer',cat:'video',e:'🪝',name:'Hook Analyzer'},
  {id:'cinematic-prompts',cat:'video',e:'🎥',name:'Cinematic Prompts'},
  {id:'podcast-to-clips',cat:'video',e:'✂️',name:'Podcast → Clips'},
  {id:'subtitle-gen',cat:'video',e:'💬',name:'Subtitles'},
  {id:'tts',cat:'audio',e:'🔊',name:'Text → Speech'},
  {id:'tts-nova',cat:'audio',e:'🔊',name:'TTS Nova'},
  {id:'tts-echo',cat:'audio',e:'🔊',name:'TTS Echo'},
  {id:'tts-fable',cat:'audio',e:'🔊',name:'TTS Fable'},
  {id:'tts-onyx',cat:'audio',e:'🔊',name:'TTS Onyx (Deep)'},
  {id:'stt',cat:'audio',e:'🎤',name:'Voice → Text'},
  {id:'speech-writer',cat:'audio',e:'🗣️',name:'Speech Writer'},
  {id:'motivation-speech',cat:'audio',e:'💪',name:'Motivation Speech'},
  {id:'interview-answers',cat:'audio',e:'💼',name:'Interview Prep'},
  {id:'call-script',cat:'audio',e:'📞',name:'Call Script'},
  {id:'audiobook-gen',cat:'audio',e:'📚',name:'Audiobook Chapter'},
  {id:'smart-todo',cat:'productivity',e:'✅',name:'Smart To-Do'},
  {id:'weekly-planner',cat:'productivity',e:'📅',name:'Weekly Planner'},
  {id:'habit-builder',cat:'productivity',e:'🔄',name:'Habit Builder'},
  {id:'goal-breakdown',cat:'productivity',e:'🎯',name:'Goal Breakdown'},
  {id:'burnout-detector',cat:'productivity',e:'🧯',name:'Burnout Detector'},
  {id:'email-writer',cat:'productivity',e:'✉️',name:'Email Writer'},
  {id:'cold-dm',cat:'productivity',e:'📩',name:'Cold DM'},
  {id:'landing-page-copy',cat:'productivity',e:'🏠',name:'Landing Page Copy'},
  {id:'resume-builder',cat:'productivity',e:'📄',name:'Resume Builder'},
  {id:'sales-script',cat:'productivity',e:'💰',name:'Sales Script'},
  {id:'homework-solver',cat:'students',e:'✏️',name:'Homework Solver'},
  {id:'math-solver',cat:'students',e:'🔢',name:'Math Solver'},
  {id:'essay-writer',cat:'students',e:'📝',name:'Essay Writer'},
  {id:'translate-explain',cat:'students',e:'🌐',name:'Translate + Explain'},
  {id:'summary-by-level',cat:'students',e:'📊',name:'Summary by Level'},
];

// ── STATE ─────────────────────────────────────
const S = {
  token: localStorage.getItem('nx_t')||'',
  user: null,
  tool: null,       // active tool
  sessionId: null,
  msgs: [],         // [{role,text,type,data}]
  attachedImg: null,// {file, base64, url}
  recording: false,
  mediaRec: null,
  recChunks: [],
  currentCat: '',
  authMode: 'login',
  page: 'chat',     // chat | projects | pdf | pricing
  webSearch: false, // web search toggle
};

// ── WEB SEARCH TOGGLE ─────────────────────────
function toggleSearch(){
  S.webSearch = !S.webSearch;
  const dot = document.getElementById('search-dot');
  const btn  = document.getElementById('search-btn');
  if(dot) dot.style.display = S.webSearch ? 'block' : 'none';
  if(btn) btn.style.color  = S.webSearch ? 'var(--a1)' : '';
  toast(S.webSearch ? '🔍 Web Search ON' : 'Web Search OFF', 'success');
}

// ── API ───────────────────────────────────────
async function api(path, opts={}) {
  const isForm = opts.body instanceof FormData;
  const r = await fetch(API+path, {
    ...opts,
    headers:{
      ...(S.token?{Authorization:'Bearer '+S.token}:{}),
      ...(!isForm?{'Content-Type':'application/json'}:{}),
      ...opts.headers,
    },
    body:isForm?opts.body:opts.body?JSON.stringify(opts.body):undefined,
  });
  const d = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.error||'Error');
  return d;
}

// ── AUTH ──────────────────────────────────────
function switchTab(mode){
  S.authMode=mode;
  document.getElementById('tab-login').classList.toggle('active',mode==='login');
  document.getElementById('tab-signup').classList.toggle('active',mode==='signup');
  document.getElementById('auth-btn').textContent=mode==='login'?'Continue':'Create account';
  document.getElementById('auth-heading').textContent=mode==='login'?'Welcome back':'Create account';
  document.getElementById('auth-subtext').textContent=mode==='login'?'Sign in to continue':'Start for free';
  document.getElementById('auth-error').textContent='';
}

async function handleAuth(){
  const email=document.getElementById('auth-email').value.trim();
  const password=document.getElementById('auth-password').value;
  const err=document.getElementById('auth-error');
  err.textContent='';
  if(!email||!password){err.textContent='Please fill all fields.';return;}
  const btn=document.getElementById('auth-btn');
  btn.textContent='...';btn.disabled=true;
  try{
    if(S.authMode==='signup'){
      await api('/api/signup',{method:'POST',body:{email,password}});
      toast('Account created!','success');
    }
    const d=await api('/api/login',{method:'POST',body:{email,password}});
    S.token=d.token;localStorage.setItem('nx_t',d.token);
    await init();
  }catch(e){err.textContent=e.message;}
  finally{btn.disabled=false;btn.textContent=S.authMode==='login'?'Continue':'Create account';}
}

function logout(){
  S.token='';S.user=null;
  localStorage.removeItem('nx_t');
  document.getElementById('auth-overlay').style.display='flex';
  document.getElementById('app').style.display='none';
  closeSidebar();
}

// ── INIT ──────────────────────────────────────
async function init(){
  try{S.user=await api('/api/me');}catch(e){logout();return;}
  document.getElementById('auth-overlay').style.display='none';
  document.getElementById('app').style.display='block';
  const email=S.user?.email||'';
  const plan=S.user?.plan||'free';
  const used=S.user?.requests_today||0;
  const limit=S.user?.limit??10;
  document.getElementById('sb-av').textContent=email[0]?.toUpperCase()||'U';
  document.getElementById('sb-email').textContent=email;
  document.getElementById('sb-plan').textContent=`${plan.charAt(0).toUpperCase()+plan.slice(1)} · ${used}/${limit===null?'∞':limit}`;
  document.getElementById('usage-pill').textContent=`${used}/${limit===null?'∞':limit}`;
  renderToolList('');
  loadHistory();
  showEmpty();

  // Auto greeting
  setTimeout(()=>{
    const hour=new Date().getHours();
    const timeGreet=hour<12?'Good morning':'hour'<18?'Good afternoon':'Good evening';
    const name=(S.user?.email||'').split('@')[0];
    const greetings=[
      `${timeGreet}, **${name}**! 👋\n\nI'm NexusAI — your AI assistant with 150+ tools. What would you like to create today?`,
      `Hey **${name}**! ✨\n\nReady to create something amazing? Choose a tool from the sidebar or just tell me what you need.`,
      `Welcome back, **${name}**! 🚀\n\nI have 150+ AI tools ready. Ask me anything or pick a tool from the sidebar!`,
    ];
    const msg=greetings[Math.floor(Math.random()*greetings.length)];
    S.msgs=[];
    // Type greeting with delay for effect
    showTyping();
    setTimeout(()=>{
      hideTyping();
      addMsg({role:'assistant',text:msg});
    },1200);
  },400);
}

function updateUsage(){
  if(!S.user)return;
  const used=S.user.requests_today||0;
  const limit=S.user.limit??10;
  const txt=`${used}/${limit===null?'∞':limit}`;
  document.getElementById('usage-pill').textContent=txt;
  document.getElementById('sb-plan').textContent=`${(S.user.plan||'free').charAt(0).toUpperCase()+(S.user.plan||'free').slice(1)} · ${txt}`;
}

// ── SIDEBAR ───────────────────────────────────
function openSidebar(){
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('backdrop').style.display='block';
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('backdrop').style.display='none';
}

function selectCat(btn,cat){
  S.currentCat=cat;
  document.querySelectorAll('.cat-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderToolList(cat);
}

function renderToolList(cat){
  const q=document.getElementById('tool-search').value.toLowerCase();
  const base=cat?TOOLS.filter(t=>t.cat===cat):TOOLS;
  const shown=q?TOOLS.filter(t=>t.name.toLowerCase().includes(q)):base;
  document.getElementById('tool-count').textContent=`(${shown.length})`;
  document.getElementById('tool-list').innerHTML=shown.map(t=>`
    <button class="tool-item${S.tool?.id===t.id?' active':''}" onclick="selectTool('${t.id}')">
      <span class="tool-em">${t.e}</span>
      <span class="tool-item-name">${t.name}</span>
    </button>`).join('');
}

function filterTools(){
  renderToolList(S.currentCat);
}

function selectTool(id){
  const tool=TOOLS.find(t=>t.id===id);
  if(!tool)return;
  S.tool=tool;
  S.sessionId=null;
  S.msgs=[];
  S.attachedImg=null;
  clearAttachPreview();
  closeSidebar();
  // Update topbar
  document.getElementById('tool-label').textContent=tool.e+' '+tool.name;
  document.getElementById('tool-sub').textContent='AI Tool';
  // Update tool list active state
  renderToolList(S.currentCat);
  // Focus input
  showEmpty();
  document.getElementById('msg-input')?.focus();
}

async function loadHistory(){
  try{
    const d=await api('/api/history?limit=10');
    const h=d.history||[];
    const seen=new Set();const items=[];
    for(const m of h){if(m.role==='user'&&!seen.has(m.session_id)){seen.add(m.session_id);items.push(m);}}
    document.getElementById('history-list').innerHTML=items.slice(0,5).map(m=>`
      <button class="hist-item">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        ${esc((m.content||'').slice(0,32))}
      </button>`).join('');
  }catch(_){}
}

// ── NEW CHAT ─────────────────────────────────
function newChat(){
  S.tool=null;S.sessionId=null;S.msgs=[];S.attachedImg=null;
  clearAttachPreview();
  document.getElementById('tool-label').textContent='NexusAI';
  document.getElementById('tool-sub').textContent='150+ AI tools';
  renderToolList(S.currentCat);
  closeSidebar();
  showEmpty();
}

function navigate(page){
  S.page=page;
  closeSidebar();
  if(page==='projects')renderProjects();
  else if(page==='pdf')renderPDF();
  else if(page==='pricing')renderPricing();
}

// ── CHAT MESSAGES ─────────────────────────────
function showEmpty(){
  const msgs=document.getElementById('messages');
  if(S.msgs.length>0){renderAllMsgs();return;}
  const tool=S.tool;
  msgs.innerHTML=`
<div class="empty-chat">
  <img src="logo.svg" class="empty-logo" alt=""/>
  <div class="empty-title">${tool?tool.e+' '+tool.name:'What can I help with?'}</div>
  <div class="empty-sub">${tool?'Type your input below':'Choose a tool from the sidebar or just start chatting'}</div>
  <div class="empty-suggestions">
    ${[
      {e:'📝',t:'Summarize this text for me',id:'summarize'},
      {e:'🐛',t:'Debug my code',id:'bug-detector'},
      {e:'🎵',t:'Write a TikTok script',id:'tiktok-script'},
      {e:'🌍',t:'Translate to Arabic',id:'translate'},
    ].map(s=>`<button class="empty-chip" onclick="quickStart('${s.id}','${s.t}')">${s.e} ${s.t}</button>`).join('')}
  </div>
</div>`;
}

function quickStart(toolId,text){
  const tool=TOOLS.find(t=>t.id===toolId);
  if(tool){S.tool=tool;document.getElementById('tool-label').textContent=tool.e+' '+tool.name;renderToolList(S.currentCat);}
  document.getElementById('msg-input').value=text;
  document.getElementById('msg-input').focus();
}

// Logo SVG mini — used as AI avatar
const AI_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="32" height="32">
  <defs>
    <radialGradient id="ag" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1a1d2e"/>
      <stop offset="100%" stop-color="#07080b"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="50" r="50" fill="url(#ag)"/>
  <circle cx="50" cy="50" r="44" fill="none" stroke="#c6f135" stroke-width="1" opacity="0.5"/>
  <rect x="24" y="28" width="8" height="44" rx="2" fill="#c6f135"/>
  <rect x="68" y="28" width="8" height="44" rx="2" fill="#c6f135"/>
  <line x1="32" y1="31" x2="68" y2="69" stroke="#c6f135" stroke-width="8" stroke-linecap="round"/>
  <circle cx="72" cy="74" r="4" fill="#35f1c6" opacity="0.9"/>
  <circle cx="72" cy="74" r="2" fill="#ffffff"/>
</svg>`;

function renderAllMsgs(){
  const msgs=document.getElementById('messages');
  msgs.innerHTML=S.msgs.map((m,i)=>{
    const isUser=m.role==='user';
    let bubble='';
    if(m.attachedImg) bubble+=`<img class="msg-attached-img" src="${m.attachedImg}" alt=""/>`;
    if(m.type==='image') bubble+=`<img class="msg-img" src="${m.data}" alt="Generated image" loading="lazy"/>`;
    else if(m.type==='audio') bubble+=`<audio class="msg-audio" controls src="${m.data}"></audio>`;
    else bubble+=isUser?esc(m.text):fmt(m.text);

    if(isUser){
      return`<div class="msg user">
        <div class="msg-av me">${(S.user?.email||'U')[0].toUpperCase()}</div>
        <div class="msg-body">
          <div class="msg-bubble">${bubble}</div>
        </div>
      </div>`;
    } else {
      return`<div class="msg assistant">
        <div class="ai-avatar-wrap">${AI_AVATAR_SVG}</div>
        <div class="msg-body">
          <div class="msg-bubble">${bubble}</div>
          <div class="msg-actions">
            <button class="msg-act-btn" onclick="copyMsg(${i})">Copy</button>
            ${m.data&&m.type==='audio'?`<a class="msg-act-btn" href="${m.data}" download>Download</a>`:''}
          </div>
        </div>
      </div>`;
    }
  }).join('');
  scrollBottom();
}

function addMsg(msg){
  S.msgs.push(msg);
  renderAllMsgs();
}

function scrollBottom(){
  const area=document.getElementById('chat-area');
  if(area)area.scrollTop=area.scrollHeight;
}

function showTyping(){
  const msgs=document.getElementById('messages');
  const el=document.createElement('div');
  el.className='msg assistant';el.id='typing';
  el.innerHTML=`
    <div class="ai-avatar-wrap is-typing">${AI_AVATAR_SVG}</div>
    <div class="msg-body">
      <div class="msg-bubble">
        <div class="typing-bubble">
          <div class="tbar"></div>
          <div class="tbar"></div>
          <div class="tbar"></div>
          <div class="tbar"></div>
          <div class="tbar"></div>
        </div>
      </div>
    </div>`;
  msgs.appendChild(el);scrollBottom();
}
function hideTyping(){document.getElementById('typing')?.remove();}

function copyMsg(i){
  navigator.clipboard.writeText(S.msgs[i]?.text||'').catch(()=>{});
  toast('Copied!','success');
}

// ── SEND ─────────────────────────────────────
function onKey(e){
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}
}

function autoGrow(el){
  el.style.height='auto';
  el.style.height=Math.min(el.scrollHeight,200)+'px';
}

async function sendMessage(){
  const input=document.getElementById('msg-input');
  const text=input.value.trim();
  const hasImg=!!S.attachedImg;
  if(!text&&!hasImg)return;

  const userMsg={role:'user',text:text||'[Image]',attachedImg:S.attachedImg?.url||null};
  addMsg(userMsg);
  input.value='';input.style.height='auto';
  const img=S.attachedImg;
  S.attachedImg=null;clearAttachPreview();
  document.getElementById('send-btn').disabled=true;
  showTyping();

  try{
    // 🔍 Web Search mode
    if(S.webSearch && text && !img){
      const result = await api('/api/search',{method:'POST',body:{query:text}});
      hideTyping();
      // Format answer with sources
      let answer = result.answer || '';
      if(result.sources?.length){
        answer += '\n\n**Sources:**\n' + result.sources.map((s,i)=>`[${i+1}] [${s.title}](${s.url})`).join('\n');
      }
      addMsg({role:'assistant', text:answer});
      try{S.user=await api('/api/me');updateUsage();}catch(_){}
      return;
    }

    // Auto-select tool if none selected based on keywords
    if(!S.tool){
      const lower=text.toLowerCase();
      if(lower.includes('image')||lower.includes('picture')||lower.includes('صورة')){
        S.tool=TOOLS.find(t=>t.id==='image-gen');
      } else if(lower.includes('summarize')||lower.includes('summary')){
        S.tool=TOOLS.find(t=>t.id==='summarize');
      } else if(lower.includes('translate')||lower.includes('ترجم')){
        S.tool=TOOLS.find(t=>t.id==='translate');
      } else if(lower.includes('code')||lower.includes('bug')){
        S.tool=TOOLS.find(t=>t.id==='bug-detector');
      }
    }

    const tool=S.tool;
    let result;

    // Image attached → edit image with prompt
    if(img&&img.base64){
      if(text){ // has prompt → edit image
        showTyping();
        const form=new FormData();
        // convert base64 to blob
        const byteStr=atob(img.base64);
        const arr=new Uint8Array(byteStr.length);
        for(let i=0;i<byteStr.length;i++)arr[i]=byteStr.charCodeAt(i);
        const blob=new Blob([arr],{type:'image/png'});
        form.append('image',blob,'image.png');
        form.append('prompt',text);
        const result=await fetch(API+'/api/image/edit',{
          method:'POST',
          headers:{Authorization:'Bearer '+S.token},
          body:form,
        });
        const data=await result.json();
        if(!result.ok)throw new Error(data.error||'Edit failed');
        hideTyping();
        addMsg({role:'assistant',text:'✅ Here is your edited image:',type:'image',data:data.url});
      } else { // no prompt → analyze image
        const result=await api('/api/chat',{method:'POST',body:{
          input:'Describe and analyze this image in detail.',
          session_id:S.sessionId||undefined,
        }});
        S.sessionId=result.session_id;
        hideTyping();
        addMsg({role:'assistant',text:result.reply});
      }

    } else if(tool){
      const isTTS=['tts','tts-nova','tts-echo','tts-fable','tts-onyx'].includes(tool.id);
      const isImage=['image-gen','poster-gen','avatar-creator'].includes(tool.id);

      if(isTTS){
        const voices={tts:'alloy','tts-nova':'nova','tts-echo':'echo','tts-fable':'fable','tts-onyx':'onyx'};
        result=await api('/api/tts',{method:'POST',body:{text,voice:voices[tool.id]}});
        const audioUrl=`data:audio/mp3;base64,${result.audio}`;
        hideTyping();
        addMsg({role:'assistant',text:'Here is your audio:',type:'audio',data:audioUrl});

      } else if(isImage){
        result=await api('/api/tool',{method:'POST',body:{tool_id:tool.id,input:text,session_id:S.sessionId||undefined}});
        if(result.session_id)S.sessionId=result.session_id;
        hideTyping();
        if(result.type==='image'){
          addMsg({role:'assistant',text:'Here is your generated image:',type:'image',data:result.output});
        } else {
          addMsg({role:'assistant',text:result.output||''});
        }

      } else {
        result=await api('/api/tool',{method:'POST',body:{tool_id:tool.id,input:text,session_id:S.sessionId||undefined}});
        if(result.session_id)S.sessionId=result.session_id;
        hideTyping();
        if(result.type==='audio'&&result.audio){
          addMsg({role:'assistant',text:'',type:'audio',data:`data:audio/mp3;base64,${result.audio}`});
        } else {
          addMsg({role:'assistant',text:result.output||result.reply||''});
        }
      }

    } else {
      // General chat
      result=await api('/api/chat',{method:'POST',body:{input:text,session_id:S.sessionId||undefined}});
      S.sessionId=result.session_id;
      hideTyping();
      addMsg({role:'assistant',text:result.reply});
    }

    // Refresh user
    try{S.user=await api('/api/me');updateUsage();loadHistory();}catch(_){}

  }catch(e){
    hideTyping();
    addMsg({role:'assistant',text:'❌ '+e.message});
    toast(e.message,'error');
  }finally{
    document.getElementById('send-btn').disabled=false;
  }
}

// ── IMAGE ATTACH ──────────────────────────────
function handleImageAttach(input){
  const file=input.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    S.attachedImg={file,base64:e.target.result.split(',')[1],url:e.target.result};
    const preview=document.getElementById('attach-preview');
    preview.style.display='flex';
    preview.innerHTML=`
      <div class="attach-thumb">
        <img src="${e.target.result}" alt=""/>
        <div class="attach-remove" onclick="removeAttach()">✕</div>
      </div>`;
    // hint user to describe edit
    const msgInput=document.getElementById('msg-input');
    if(msgInput){
      msgInput.placeholder='Describe what to edit... (e.g. "make background blue", "remove person")';
      msgInput.focus();
    }
  };
  reader.readAsDataURL(file);
  input.value='';
}

function removeAttach(){
  S.attachedImg=null;
  clearAttachPreview();
  const msgInput=document.getElementById('msg-input');
  if(msgInput) msgInput.placeholder='Message NexusAI...';
}
function clearAttachPreview(){
  const p=document.getElementById('attach-preview');
  if(p){p.style.display='none';p.innerHTML='';}
}

// ── VOICE RECORDING ───────────────────────────
async function toggleVoice(){
  if(S.recording){stopRecording();return;}
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    S.mediaRec=new MediaRecorder(stream);
    S.recChunks=[];
    S.mediaRec.ondataavailable=e=>S.recChunks.push(e.data);
    S.mediaRec.onstop=sendVoice;
    S.mediaRec.start();
    S.recording=true;
    document.getElementById('voice-btn').classList.add('recording');
    document.getElementById('input-hint').textContent='Recording... tap mic to stop';
    toast('Recording started','success');
  }catch(e){toast('Microphone access denied','error');}
}

function stopRecording(){
  if(S.mediaRec&&S.recording){
    S.mediaRec.stop();
    S.mediaRec.stream.getTracks().forEach(t=>t.stop());
  }
  S.recording=false;
  document.getElementById('voice-btn').classList.remove('recording');
  document.getElementById('input-hint').textContent='Press Enter to send · Shift+Enter for new line';
}

async function sendVoice(){
  const blob=new Blob(S.recChunks,{type:'audio/webm'});
  const form=new FormData();
  form.append('audio',blob,'voice.webm');
  addMsg({role:'user',text:'🎤 Voice message'});
  showTyping();
  try{
    const result=await api('/api/transcribe',{method:'POST',body:form});
    hideTyping();
    // Put transcript in input for user to send
    document.getElementById('msg-input').value=result.text;
    document.getElementById('msg-input').focus();
    autoGrow(document.getElementById('msg-input'));
    // Remove the "voice message" user bubble
    S.msgs.pop();
    renderAllMsgs();
    toast('Voice transcribed! Press Enter to send','success');
  }catch(e){hideTyping();toast(e.message,'error');}
}

// ── PROJECTS ──────────────────────────────────
async function renderProjects(){
  const main=document.getElementById('messages');
  main.innerHTML='<div class="page-wrap"><div class="page-title">Saved Projects</div><div style="color:var(--t2)">Loading...</div></div>';
  try{
    const {projects=[]}=await api('/api/projects');
    main.innerHTML=`<div class="page-wrap">
      <div class="page-title">Saved Projects (${projects.length})</div>
      ${projects.length?`<div class="projects-grid">
        ${projects.map(p=>`<button class="proj-card" onclick="viewProj(${p.id})">
          <div class="proj-tag">${p.feature}</div>
          <div class="proj-title">${esc(p.title)}</div>
          <div class="proj-date">${new Date(p.created_at).toLocaleDateString()}</div>
        </button>`).join('')}
      </div>`:'<div style="color:var(--t2);padding:40px;text-align:center">No saved projects yet.</div>'}
    </div>`;
  }catch(e){toast(e.message,'error');}
}

async function viewProj(id){
  try{
    const {project:p}=await api('/api/projects/'+id);
    document.getElementById('messages').innerHTML=`<div class="page-wrap">
      <button onclick="renderProjects()" style="font-size:13px;color:var(--t2);margin-bottom:16px;display:flex;align-items:center;gap:6px">← Back</button>
      <div class="page-title">${esc(p.title)}</div>
      <div style="font-size:11px;color:var(--t3);margin-bottom:16px">${p.feature} · ${new Date(p.created_at).toLocaleString()}</div>
      <div style="display:flex;gap:8px;margin-bottom:16px">
        <button class="sm-btn" onclick="navigator.clipboard.writeText(document.getElementById('pout').innerText);toast('Copied!','success')">Copy</button>
        <button class="sm-btn del" onclick="delProj(${p.id})">Delete</button>
      </div>
      <div id="pout" style="font-size:14px;line-height:1.8;white-space:pre-wrap">${fmt(p.output)}</div>
    </div>`;
  }catch(e){toast(e.message,'error');}
}

async function delProj(id){
  if(!confirm('Delete?'))return;
  try{await api('/api/projects/'+id,{method:'DELETE'});toast('Deleted','success');renderProjects();}
  catch(e){toast(e.message,'error');}
}

// ── PDF ───────────────────────────────────────
async function renderPDF(){
  let docs=[];
  try{const d=await api('/api/pdf/list');docs=d.documents||[];}catch(_){}
  document.getElementById('messages').innerHTML=`<div class="page-wrap">
    <div class="page-title">PDF Chat</div>
    <div class="upload-zone"
      onclick="document.getElementById('pdf-inp').click()"
      ondragover="this.classList.add('dragover');event.preventDefault()"
      ondragleave="this.classList.remove('dragover')"
      ondrop="doPDFDrop(event)">
      <div class="upload-icon">📄</div>
      <div class="upload-text"><strong>Click or drag PDF here</strong><br/>AI reads and summarizes it</div>
      <input type="file" id="pdf-inp" accept="application/pdf" style="display:none" onchange="uploadPDF(this.files[0])"/>
    </div>
    ${docs.length?`<div class="pdf-list">
      ${docs.map(d=>`<div class="pdf-item">
        <div class="pdf-icon">📄</div>
        <div class="pdf-info">
          <div class="pdf-name">${esc(d.filename)}</div>
          <div class="pdf-sum">${esc((d.summary||'').slice(0,120))}</div>
        </div>
        <div class="pdf-btns">
          <button class="sm-btn" onclick="openPDFChat(${d.id},'${esc(d.filename)}')">Chat</button>
          <button class="sm-btn del" onclick="delPDF(${d.id})">✕</button>
        </div>
      </div>`).join('')}
    </div>`:''}
  </div>`;
}

function doPDFDrop(e){
  e.preventDefault();
  e.currentTarget.classList.remove('dragover');
  const f=e.dataTransfer.files[0];
  if(f?.type==='application/pdf')uploadPDF(f);
  else toast('Please drop a PDF file','error');
}

async function uploadPDF(file){
  if(!file)return;
  toast('Uploading PDF...','success');
  const form=new FormData();form.append('pdf',file);
  try{
    const d=await api('/api/pdf/upload',{method:'POST',body:form});
    toast('PDF ready!','success');
    openPDFChat(d.id,d.filename,d.summary);
  }catch(e){toast(e.message,'error');}
}

function openPDFChat(id,name,summary){
  S.msgs=[];
  if(summary) S.msgs.push({role:'assistant',text:`📋 **${name}** — Summary:\n\n${summary}`});
  document.getElementById('tool-label').textContent='📄 '+name;
  document.getElementById('tool-sub').textContent='PDF Chat';
  renderAllMsgs();
  // Override send to ask PDF
  window._pdfId=id;
  window._inPDF=true;
  document.getElementById('msg-input').placeholder='Ask about this document...';
  document.getElementById('msg-input').focus();
}

async function renderPricing(){
  document.getElementById('messages').innerHTML=`<div class="page-wrap" style="text-align:center">
    <div class="page-title" style="font-size:24px;margin-bottom:8px">Simple pricing</div>
    <p style="color:var(--t2);margin-bottom:32px">Upgrade anytime. Cancel anytime.</p>
    <div class="pricing-grid">
      <div class="p-card">
        <div class="p-name">Free</div>
        <div class="p-price"><sup>$</sup>0</div>
        <div class="p-period">forever</div>
        <ul class="p-features"><li>10 requests/day</li><li>All 150+ tools</li><li>PDF chat</li><li>Projects</li></ul>
        <button class="p-btn outline" disabled>Current plan</button>
      </div>
      <div class="p-card pop">
        <div class="p-name">Pro</div>
        <div class="p-price"><sup>$</sup>19</div>
        <div class="p-period">per month</div>
        <ul class="p-features"><li>500 requests/day</li><li>All 150+ tools</li><li>AI memory</li><li>Priority</li><li>Support</li></ul>
        <button class="p-btn primary" onclick="subscribe('pro')">Get Pro →</button>
      </div>
      <div class="p-card">
        <div class="p-name">Elite</div>
        <div class="p-price"><sup>$</sup>49</div>
        <div class="p-period">per month</div>
        <ul class="p-features"><li>Unlimited</li><li>All 150+ tools</li><li>API access</li><li>Priority support</li></ul>
        <button class="p-btn outline" onclick="subscribe('elite')">Get Elite →</button>
      </div>
    </div>
  </div>`;
}

async function subscribe(plan){
  try{
    const d=await api('/api/subscribe',{method:'POST',body:{plan}});
    if(d.checkoutUrl)window.open(d.checkoutUrl,'_blank');
  }catch(e){toast(e.message,'error');}
}

async function delPDF(id){
  if(!confirm('Delete?'))return;
  try{await api('/api/pdf/'+id,{method:'DELETE'});renderPDF();toast('Deleted','success');}
  catch(e){toast(e.message,'error');}
}

// ── HELPERS ───────────────────────────────────
function fmt(t){
  if(!t)return'';
  return t
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/```(\w*)\n?([\s\S]*?)```/g,'<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/^### (.+)$/gm,'<h3>$1</h3>')
    .replace(/^## (.+)$/gm,'<h2>$1</h2>')
    .replace(/^# (.+)$/gm,'<h1>$1</h1>')
    .replace(/\n/g,'<br/>');
}
function esc(t){return(t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function toast(msg,type=''){
  const wrap=document.getElementById('toasts');
  const el=document.createElement('div');
  el.className='toast '+type;el.textContent=msg;
  wrap.appendChild(el);
  setTimeout(()=>{el.style.opacity='0';el.style.transition='opacity .3s';setTimeout(()=>el.remove(),300);},3000);
}

// ── BOOT ─────────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('auth-email')?.addEventListener('keydown',e=>{if(e.key==='Enter')handleAuth();});
  document.getElementById('auth-password')?.addEventListener('keydown',e=>{if(e.key==='Enter')handleAuth();});
  if(S.token)init();
});