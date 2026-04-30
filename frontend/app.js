// ============================================================
// NexusAI — app.js
// Frontend logic: Auth · Navigation · Tools · PDF · Projects
// ============================================================

// ═══════════════════════════════════════════════
// CONFIG — غيّر هذا لرابط backend متاعك
// ═══════════════════════════════════════════════
const API = 'http://localhost:3001';

// ═══════════════════════════════════════════════
// TOOLS DATA
// ═══════════════════════════════════════════════
const TOOLS = [
  // AI
  {id:'summarize',cat:'ai',emoji:'📝',name:'AI Summary',desc:'Summarize any text'},
  {id:'eli5',cat:'ai',emoji:'👶',name:"Explain Like I'm 5",desc:'Any topic, simple'},
  {id:'translate',cat:'ai',emoji:'🌍',name:'Translate',desc:'Multi-language'},
  {id:'rewrite-formal',cat:'ai',emoji:'🎩',name:'Rewrite Formal',desc:'Professional tone'},
  {id:'rewrite-casual',cat:'ai',emoji:'😎',name:'Rewrite Casual',desc:'Friendly tone'},
  {id:'grammar',cat:'ai',emoji:'✏️',name:'Grammar Fix',desc:'Spelling & punctuation'},
  {id:'quiz-gen',cat:'ai',emoji:'❓',name:'Quiz Generator',desc:'MCQ from any text'},
  {id:'flashcards',cat:'ai',emoji:'🃏',name:'Flashcards',desc:'Study cards auto'},
  {id:'mindmap',cat:'ai',emoji:'🗺️',name:'Mind Map',desc:'Visual topic map'},
  {id:'notes-to-summary',cat:'ai',emoji:'📋',name:'Notes → Summary',desc:'Organize raw notes'},
  {id:'decision-helper',cat:'ai',emoji:'⚖️',name:'Decision Helper',desc:'Best choice advisor'},
  {id:'idea-to-plan',cat:'ai',emoji:'💡',name:'Idea → Action Plan',desc:'Turn ideas into steps'},
  {id:'daily-plan',cat:'ai',emoji:'📅',name:'Daily Planner',desc:'Optimal schedule'},
  {id:'ai-coach',cat:'ai',emoji:'🎯',name:'AI Coach',desc:'Personal strategy'},
  {id:'youtube-summary',cat:'ai',emoji:'▶️',name:'YouTube Summary',desc:'Video to notes'},
  {id:'study-schedule',cat:'ai',emoji:'📚',name:'Study Schedule',desc:'Exam-ready planner'},
  {id:'exam-questions',cat:'ai',emoji:'📄',name:'Exam Questions',desc:'Auto-generated + answers'},
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
  ai:'AI Essentials', code:'Code & Dev', business:'Business',
  content:'Content', media:'Media & Image', video:'Video & Film',
  audio:'Voice & Audio', productivity:'Productivity', students:'Students',
};

// ═══════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════
const state = {
  token: localStorage.getItem('nx_token') || '',
  user: null,
  currentPage: 'home',
  currentTool: null,
  sessionId: null,
  sessionHistory: [],
  authMode: 'login',
};

// ═══════════════════════════════════════════════
// API HELPER
// ═══════════════════════════════════════════════
async function api(path, opts = {}) {
  const isForm = opts.body instanceof FormData;
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      ...(state.token ? { Authorization: 'Bearer ' + state.token } : {}),
      ...(!isForm ? { 'Content-Type': 'application/json' } : {}),
      ...opts.headers,
    },
    body: isForm ? opts.body : opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ═══════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════
function switchTab(mode) {
  state.authMode = mode;
  document.querySelectorAll('.auth-tab').forEach((t, i) => {
    t.classList.toggle('active', (i === 0) === (mode === 'login'));
  });
  document.getElementById('auth-btn').textContent = mode === 'login' ? 'Sign In' : 'Create Account';
  document.getElementById('auth-error').textContent = '';
}

async function handleAuth() {
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errEl    = document.getElementById('auth-error');
  errEl.textContent = '';
  if (!email || !password) { errEl.textContent = 'Please fill all fields.'; return; }
  const btn = document.getElementById('auth-btn');
  btn.textContent = '...'; btn.disabled = true;
  try {
    if (state.authMode === 'signup') {
      await api('/api/signup', { method: 'POST', body: { email, password } });
      toast('Account created! Signing in...', 'success');
    }
    const data = await api('/api/login', { method: 'POST', body: { email, password } });
    state.token = data.token;
    localStorage.setItem('nx_token', data.token);
    await initApp();
  } catch (e) {
    errEl.textContent = e.message;
  } finally {
    btn.disabled = false;
    btn.textContent = state.authMode === 'login' ? 'Sign In' : 'Create Account';
  }
}

function logout() {
  state.token = ''; state.user = null;
  localStorage.removeItem('nx_token');
  document.getElementById('auth-overlay').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
async function initApp() {
  try {
    state.user = await api('/api/me');
  } catch (e) {
    logout(); return;
  }
  document.getElementById('auth-overlay').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  const email    = state.user?.email || 'user';
  const plan     = state.user?.plan  || 'free';
  const initials = email[0].toUpperCase();
  document.getElementById('sb-email').textContent     = email;
  document.getElementById('sb-email2').textContent    = email;
  document.getElementById('sb-avatar').textContent    = initials;
  document.getElementById('sb-plan').textContent      = plan.toUpperCase();
  document.getElementById('sb-plan').className        = 'plan-badge' + (plan !== 'free' ? ' pro' : '');
  document.getElementById('sb-plan-text').textContent = plan.charAt(0).toUpperCase() + plan.slice(1) + ' Plan';
  updateUsage();
  navigate('home');
}

function updateUsage() {
  if (!state.user) return;
  const used  = state.user.requests_today || 0;
  const limit = state.user.limit || 10;
  const pct   = limit === null ? 5 : Math.min(100, (used / limit) * 100);
  document.getElementById('usage-text').textContent = limit === null ? used + '/∞' : used + '/' + limit;
  const fill = document.getElementById('usage-fill');
  fill.style.width      = pct + '%';
  fill.style.background = pct > 80 ? 'var(--accent3)' : 'var(--accent)';
}

// ═══════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════
function navigate(page) {
  state.currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  const titles = {
    home:'Dashboard', tools:'All Tools', projects:'Saved Projects',
    history:'History', pdf:'PDF Chat', pricing:'Upgrade Plan',
    'cat-ai':'AI Essentials','cat-code':'Code & Dev','cat-business':'Business',
    'cat-content':'Content','cat-media':'Media & Image','cat-video':'Video & Film',
    'cat-audio':'Voice & Audio','cat-productivity':'Productivity','cat-students':'Students',
  };
  document.getElementById('topbar-title').textContent = titles[page] || page;
  if (page === 'home')              renderHome();
  else if (page === 'tools')        renderTools('');
  else if (page.startsWith('cat-')) renderTools(page.replace('cat-', ''));
  else if (page === 'projects')     renderProjects();
  else if (page === 'history')      renderHistory();
  else if (page === 'pdf')          renderPDF();
  else if (page === 'pricing')      renderPricing();
  else if (page === 'runner')       renderRunner();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ═══════════════════════════════════════════════
// HOME
// ═══════════════════════════════════════════════
function renderHome() {
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const name      = (state.user?.email || '').split('@')[0];
  const used      = state.user?.requests_today || 0;
  const remaining = state.user?.remaining ?? 10;
  const featured  = TOOLS.filter(t => ['ai','code','business','content','media','audio'].includes(t.cat)).slice(0, 12);

  document.getElementById('content').innerHTML = `
<div class="page">
  <div class="home-header">
    <div class="home-greeting">${greeting}, <span class="hi-name">${name}</span> 👋</div>
    <div class="home-sub">You have ${remaining === null ? '∞' : remaining} requests left today.</div>
  </div>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Tools Available</div>
      <div class="stat-value stat-accent">150+</div>
      <div class="stat-sub">Across 9 categories</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Used Today</div>
      <div class="stat-value">${used}</div>
      <div class="stat-sub">Resets at midnight UTC</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Current Plan</div>
      <div class="stat-value stat-accent2">${(state.user?.plan || 'free').toUpperCase()}</div>
      <div class="stat-sub"><a href="#" onclick="navigate('pricing')" style="color:var(--accent)">Upgrade →</a></div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Daily Limit</div>
      <div class="stat-value stat-accent3">${state.user?.limit === null ? '∞' : state.user?.limit || 10}</div>
      <div class="stat-sub">Requests per day</div>
    </div>
  </div>
  <div class="section-header">
    <div class="section-title">🔥 Featured Tools</div>
    <button class="see-all" onclick="navigate('tools')">See all 150+ →</button>
  </div>
  <div class="tools-grid">${featured.map(toolCard).join('')}</div>
  <div style="margin-top:32px">
    <div class="section-header"><div class="section-title">⚡ Quick Actions</div></div>
    <div style="display:flex;gap:12px;flex-wrap:wrap">
      ${[
        {icon:'🔊',label:'Text to Speech',id:'tts'},
        {icon:'📝',label:'Summarize',id:'summarize'},
        {icon:'🐛',label:'Debug Code',id:'bug-detector'},
        {icon:'📱',label:'TikTok Script',id:'tiktok-script'},
        {icon:'💼',label:'Business Plan',id:'business-plan'},
        {icon:'✉️',label:'Write Email',id:'email-writer'},
      ].map(q => `
        <button onclick="openTool('${q.id}')"
          style="background:var(--bg2);border:1px solid var(--border2);border-radius:12px;
                 padding:12px 18px;color:var(--text);font-size:14px;cursor:pointer;
                 transition:.15s;display:flex;align-items:center;gap:8px;"
          onmouseover="this.style.borderColor='var(--accent)'"
          onmouseout="this.style.borderColor='var(--border2)'">
          <span>${q.icon}</span>${q.label}
        </button>`).join('')}
    </div>
  </div>
</div>`;
}

// ═══════════════════════════════════════════════
// TOOLS GRID
// ═══════════════════════════════════════════════
function toolCard(t) {
  return `
<div class="tool-card cat-${t.cat}" onclick="openTool('${t.id}')">
  <span class="tool-emoji">${t.emoji}</span>
  <div class="tool-name">${t.name}</div>
  <div class="tool-cat">${CAT_LABELS[t.cat] || t.cat}</div>
</div>`;
}

function renderTools(cat) {
  const query = document.getElementById('search-input')?.value.toLowerCase() || '';
  const base  = cat ? TOOLS.filter(t => t.cat === cat) : TOOLS;
  // When searching, always search across ALL tools
  const shown = query
    ? TOOLS.filter(t => t.name.toLowerCase().includes(query) || t.desc.toLowerCase().includes(query))
    : base;

  document.getElementById('content').innerHTML = `
<div class="page">
  <div style="margin-bottom:20px">
    ${cat ? `<button class="runner-back" onclick="navigate('tools')">← All Tools</button>` : ''}
    <div class="section-title">${cat ? (CAT_LABELS[cat] || cat) + ' — ' : 'All Tools — '}${shown.length} tools</div>
  </div>
  <div class="tools-grid">
    ${shown.length ? shown.map(toolCard).join('') : '<div style="color:var(--text2);padding:40px;text-align:center">No tools found.</div>'}
  </div>
</div>`;
}

function handleSearch() {
  const q = document.getElementById('search-input')?.value?.toLowerCase() || '';
  // If not already on tools page, navigate there first
  if (state.currentPage !== 'tools' && !state.currentPage.startsWith('cat-')) {
    state.currentPage = 'tools';
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === 'tools');
    });
    document.getElementById('topbar-title').textContent = 'All Tools';
  }
  renderTools('');
}

// ═══════════════════════════════════════════════
// TOOL RUNNER
// ═══════════════════════════════════════════════
function openTool(id) {
  const tool = TOOLS.find(t => t.id === id);
  if (!tool) return;
  state.currentTool    = tool;
  state.sessionId      = null;
  state.sessionHistory = [];
  state.currentPage    = 'runner';
  document.getElementById('topbar-title').textContent = tool.name;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  renderRunner();
}

function renderRunner() {
  const t = state.currentTool;
  if (!t) { navigate('tools'); return; }
  const hasHistory = state.sessionHistory.length > 0;

  document.getElementById('content').innerHTML = `
<div class="page tool-runner">
  <div class="runner-back" onclick="navigate('tools')">← Back to Tools</div>
  <div class="runner-header">
    <div class="runner-title">${t.emoji} ${t.name}</div>
    <div class="runner-desc">${t.desc}</div>
  </div>
  ${hasHistory ? `
  <div class="session-thread" id="session-thread">
    ${state.sessionHistory.map(m => `
    <div class="msg ${m.role}">
      <div class="msg-role">${m.role === 'user' ? '👤 You' : '🤖 AI'}</div>
      <div class="msg-bubble">${escapeHtml(m.content)}</div>
    </div>`).join('')}
  </div>` : ''}
  <div class="runner-form">
    <label class="input-label">${getInputLabel(t)}</label>
    ${t.id === 'stt'
      ? `<input type="file" id="audio-file" accept="audio/*"
           style="width:100%;background:var(--bg3);border:1px solid var(--border2);
                  border-radius:12px;padding:14px;color:var(--text);font-size:14px"/>`
      : `<textarea class="runner-textarea" id="tool-input"
           placeholder="${getPlaceholder(t)}" rows="6"></textarea>`}
    <div class="runner-actions">
      <button class="run-btn" id="run-btn" onclick="runTool()"><span>▶</span> Run Tool</button>
      ${state.sessionId ? `<div class="session-badge"><span class="session-dot"></span>Session active — memory ON</div>` : ''}
      <button onclick="newSession()" style="font-size:13px;color:var(--text3);margin-left:auto;cursor:pointer">↺ New Session</button>
    </div>
  </div>
  <div class="output-wrap" id="output-wrap" style="${hasHistory ? '' : 'display:none'}">
    <div class="output-header">
      <span class="output-title">Output</span>
      <div class="output-actions">
        <button class="icon-btn" onclick="copyOutput()">📋 Copy</button>
        <button class="icon-btn" onclick="saveProject()">💾 Save</button>
      </div>
    </div>
    <div class="output-body" id="output-body"></div>
  </div>
</div>`;
  if (hasHistory) scrollThread();
}

function getInputLabel(t) {
  const map = {
    stt:'Upload audio file','image-gen':'Describe your image',
    'poster-gen':'Describe your poster','avatar-creator':'Describe your avatar',
    tts:'Text to convert','tts-nova':'Text to convert',
    'tts-echo':'Text to convert','tts-fable':'Text to convert','tts-onyx':'Text to convert',
  };
  return map[t.id] || 'Your input';
}

function getPlaceholder(t) {
  const map = {
    summarize:'Paste any text to summarize...',
    translate:'Enter text + target language...',
    'code-explain':'Paste your code here...',
    'bug-detector':'Paste your code here...',
    'tiktok-script':'Your TikTok topic or idea...',
    'business-plan':'Describe your business idea...',
    'image-gen':'A futuristic city at sunset, cyberpunk style...',
    tts:'Enter text to convert to speech...',
    'math-solver':'e.g. Solve: 2x² + 5x - 3 = 0',
  };
  return map[t.id] || `Enter your ${t.id.replace(/-/g, ' ')} here...`;
}

async function runTool() {
  const t = state.currentTool;
  if (!t) return;
  let input;
  if (t.id === 'stt') {
    const file = document.getElementById('audio-file')?.files?.[0];
    if (!file) { toast('Please select an audio file', 'error'); return; }
    input = file;
  } else {
    input = document.getElementById('tool-input')?.value?.trim();
    if (!input) { toast('Please enter some input', 'error'); return; }
  }
  const btn = document.getElementById('run-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loader-dots"><span class="loader-dot"></span><span class="loader-dot"></span><span class="loader-dot"></span></span> Running...';
  showOutputLoading();
  try {
    if (t.id === 'stt') {
      const form = new FormData();
      form.append('audio', input);
      const result = await api('/api/transcribe', { method:'POST', body: form });
      addToSession('user', '[audio file]');
      addToSession('assistant', result.text);
      showOutput('📝 Transcription:\n\n' + result.text);

    } else if (['tts','tts-nova','tts-echo','tts-fable','tts-onyx'].includes(t.id)) {
      const voices = { tts:'alloy','tts-nova':'nova','tts-echo':'echo','tts-fable':'fable','tts-onyx':'onyx' };
      const result = await api('/api/tts', {
        method:'POST',
        body:{ text: input, voice: voices[t.id] },
      });
      // backend returns base64
      const audioUrl = `data:audio/mp3;base64,${result.audio}`;
      showAudioOutput(audioUrl);

    } else if (['image-gen','poster-gen','avatar-creator'].includes(t.id)) {
      const result = await api('/api/agent', { method:'POST', body:{ input:'image: '+input } });
      showImageOutput(result.data);

    } else {
      const result = await api('/api/tool', {
        method:'POST',
        body:{ tool_id: t.id, input, session_id: state.sessionId || undefined },
      });
      if (result.session_id) state.sessionId = result.session_id;
      // Handle different response types
      if (result.type === 'audio' && result.audio) {
        const audioUrl = `data:audio/mp3;base64,${result.audio}`;
        showAudioOutput(audioUrl);
      } else if (result.type === 'image' && result.output) {
        showImageOutput(result.output);
      } else {
        const output = result.output || result.result || result.reply || JSON.stringify(result, null, 2);
        addToSession('user', input);
        addToSession('assistant', output);
        showOutput(output);
      }
    }
    try { state.user = await api('/api/me'); updateUsage(); } catch (_) {}
  } catch (e) {
    showOutput('❌ Error: ' + e.message);
    toast(e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>▶</span> Run Tool';
  }
}

function showOutputLoading() {
  const wrap = document.getElementById('output-wrap');
  const body = document.getElementById('output-body');
  if (wrap) wrap.style.display = '';
  if (body) {
    body.className = 'output-body loading';
    body.innerHTML = `<div class="loader-dots">
      <div class="loader-dot"></div><div class="loader-dot"></div><div class="loader-dot"></div>
    </div> Generating...`;
  }
}

function showOutput(text) {
  renderRunner();
  setTimeout(() => {
    const body = document.getElementById('output-body');
    const wrap = document.getElementById('output-wrap');
    if (body) { body.className = 'output-body'; body.innerHTML = formatOutput(text); }
    if (wrap) wrap.style.display = '';
    scrollThread();
  }, 50);
}

function showImageOutput(url) {
  const wrap = document.getElementById('output-wrap');
  const body = document.getElementById('output-body');
  if (wrap) wrap.style.display = '';
  if (body) {
    body.className = 'output-body';
    body.innerHTML = `<img class="output-image" src="${url}" alt="Generated" loading="lazy"/>`;
  }
}

function showAudioOutput(url) {
  const wrap = document.getElementById('output-wrap');
  const body = document.getElementById('output-body');
  if (wrap) wrap.style.display = '';
  if (body) {
    body.className = 'output-body';
    body.innerHTML = `
      <audio class="output-audio" controls src="${url}"></audio>
      <div style="margin-top:12px;font-size:13px;color:var(--text2)">
        <a href="${url}" download style="color:var(--accent)">⬇ Download</a>
      </div>`;
  }
}

function formatOutput(text) {
  if (!text) return '';
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

function escapeHtml(t) {
  return (t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function addToSession(role, content) { state.sessionHistory.push({ role, content }); }
function scrollThread() { const el = document.getElementById('session-thread'); if (el) el.scrollTop = el.scrollHeight; }
function newSession() { state.sessionId = null; state.sessionHistory = []; renderRunner(); toast('New session','success'); }

async function copyOutput() {
  const body = document.getElementById('output-body');
  if (!body) return;
  await navigator.clipboard.writeText(body.innerText).catch(()=>{});
  toast('Copied!','success');
}

async function saveProject() {
  const body = document.getElementById('output-body');
  const t    = state.currentTool;
  if (!body || !t) return;
  try {
    await api('/api/projects/save', { method:'POST', body:{ title:t.name, feature:t.id, input:'', output:body.innerText } });
    toast('Project saved!','success');
  } catch (e) { toast('Could not save: '+e.message,'error'); }
}

// ═══════════════════════════════════════════════
// PROJECTS
// ═══════════════════════════════════════════════
async function renderProjects() {
  document.getElementById('content').innerHTML = `<div class="page"><div style="color:var(--text2);padding:40px;text-align:center">Loading...</div></div>`;
  try {
    const { projects = [] } = await api('/api/projects');
    document.getElementById('content').innerHTML = `
<div class="page">
  <div style="margin-bottom:24px"><div class="section-title">Saved Projects (${projects.length})</div></div>
  ${projects.length ? `<div class="projects-grid">
    ${projects.map(p=>`
    <div class="project-card" onclick="viewProject(${p.id})">
      <div class="project-feature-tag">${p.feature}</div>
      <div class="project-title">${escapeHtml(p.title)}</div>
      <div class="project-date">${new Date(p.created_at).toLocaleDateString()}</div>
    </div>`).join('')}
  </div>` : `<div style="text-align:center;padding:60px;color:var(--text2)"><div style="font-size:40px;margin-bottom:12px">📁</div><div>No saved projects yet.</div></div>`}
</div>`;
  } catch (e) { toast(e.message,'error'); }
}

async function viewProject(id) {
  try {
    const { project: p } = await api('/api/projects/'+id);
    document.getElementById('content').innerHTML = `
<div class="page">
  <div class="runner-back" onclick="renderProjects()">← Back to Projects</div>
  <div class="runner-header">
    <div class="runner-title">${escapeHtml(p.title)}</div>
    <div class="runner-desc">${p.feature} · ${new Date(p.created_at).toLocaleString()}</div>
  </div>
  <div class="output-wrap">
    <div class="output-header">
      <span class="output-title">Saved Output</span>
      <div class="output-actions">
        <button class="icon-btn" onclick="navigator.clipboard.writeText(document.getElementById('proj-body').innerText);toast('Copied!','success')">📋 Copy</button>
        <button class="icon-btn" onclick="deleteProject(${p.id})" style="color:var(--accent3)">🗑 Delete</button>
      </div>
    </div>
    <div class="output-body" id="proj-body">${formatOutput(p.output)}</div>
  </div>
</div>`;
  } catch(e) { toast(e.message,'error'); }
}

async function deleteProject(id) {
  if (!confirm('Delete?')) return;
  try { await api('/api/projects/'+id,{method:'DELETE'}); toast('Deleted','success'); renderProjects(); }
  catch(e){ toast(e.message,'error'); }
}

// ═══════════════════════════════════════════════
// HISTORY
// ═══════════════════════════════════════════════
async function renderHistory() {
  document.getElementById('content').innerHTML = `<div class="page"><div style="color:var(--text2);padding:40px;text-align:center">Loading...</div></div>`;
  try {
    const { history = [] } = await api('/api/history?limit=60');
    document.getElementById('content').innerHTML = `
<div class="page">
  <div style="margin-bottom:24px"><div class="section-title">History (${history.length})</div></div>
  ${history.length ? `<div class="history-list">
    ${history.map(h=>`
    <div class="history-item">
      <div class="history-content">
        <div class="history-title">${escapeHtml((h.content||'').slice(0,80))}</div>
        <div class="history-preview">${escapeHtml((h.content||'').slice(80,140))}</div>
      </div>
      <div class="history-meta">
        <div class="history-badge">${h.role}</div>
        <div>${new Date(h.created_at).toLocaleDateString()}</div>
      </div>
    </div>`).join('')}
  </div>` : `<div style="text-align:center;padding:60px;color:var(--text2)"><div style="font-size:40px;margin-bottom:12px">🕐</div><div>No history yet.</div></div>`}
</div>`;
  } catch(e){ toast(e.message,'error'); }
}

// ═══════════════════════════════════════════════
// PDF CHAT
// ═══════════════════════════════════════════════
async function renderPDF() {
  let docs = [];
  try { const d = await api('/api/pdf/list'); docs = d.documents||[]; } catch(_){}
  document.getElementById('content').innerHTML = `
<div class="page" style="max-width:800px;margin:0 auto">
  <div class="runner-header">
    <div class="runner-title">📁 PDF Chat</div>
    <div class="runner-desc">Upload a PDF and chat with it using AI</div>
  </div>
  <div class="upload-zone" id="upload-zone"
    onclick="document.getElementById('pdf-file').click()"
    ondragover="this.classList.add('dragover');event.preventDefault()"
    ondragleave="this.classList.remove('dragover')"
    ondrop="handlePDFDrop(event)">
    <div class="upload-icon">📄</div>
    <div class="upload-text"><strong>Click or drag a PDF here</strong><br/>Max 10 MB</div>
    <input type="file" id="pdf-file" accept="application/pdf" style="display:none" onchange="uploadPDF(this.files[0])"/>
  </div>
  <div id="upload-status" style="display:none;padding:16px;border-radius:12px;background:var(--bg2);border:1px solid var(--border2);margin-bottom:20px;color:var(--text2)">
    <div class="loader-dots"><div class="loader-dot"></div><div class="loader-dot"></div><div class="loader-dot"></div></div> Uploading...
  </div>
  ${docs.length ? `
  <div class="section-header" style="margin-top:8px">
    <div class="section-title">Your Documents (${docs.length})</div>
  </div>
  <div class="pdf-list">
    ${docs.map(d=>`
    <div class="pdf-item">
      <div class="pdf-icon">📄</div>
      <div class="pdf-info">
        <div class="pdf-name">${escapeHtml(d.filename)}</div>
        <div class="pdf-summary">${escapeHtml((d.summary||'').slice(0,150))}</div>
      </div>
      <div class="pdf-actions">
        <button class="icon-btn" onclick="openPDFChat(${d.id},'${escapeHtml(d.filename)}')">💬 Chat</button>
        <button class="icon-btn" onclick="deletePDF(${d.id})" style="color:var(--accent3)">🗑</button>
      </div>
    </div>`).join('')}
  </div>` : ''}
</div>`;
}

function handlePDFDrop(e) {
  e.preventDefault();
  document.getElementById('upload-zone').classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file?.type==='application/pdf') uploadPDF(file);
  else toast('Please drop a PDF file','error');
}

async function uploadPDF(file) {
  if (!file) return;
  document.getElementById('upload-status').style.display = 'flex';
  const form = new FormData();
  form.append('pdf', file);
  try {
    const data = await api('/api/pdf/upload',{method:'POST',body:form});
    toast('PDF uploaded!','success');
    openPDFChat(data.id, data.filename, data.summary);
  } catch(e){ toast(e.message,'error'); }
  finally { document.getElementById('upload-status').style.display='none'; }
}

function openPDFChat(id, filename, summary) {
  document.getElementById('content').innerHTML = `
<div class="page" style="max-width:800px;margin:0 auto">
  <div class="runner-back" onclick="renderPDF()">← Back to PDFs</div>
  <div class="runner-header">
    <div class="runner-title">📄 ${escapeHtml(filename)}</div>
    <div class="runner-desc">Ask anything about this document</div>
  </div>
  ${summary?`<div style="background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:20px;margin-bottom:20px">
    <div style="font-size:12px;color:var(--accent);font-weight:600;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">AI Summary</div>
    <div style="font-size:14px;color:var(--text2);line-height:1.7">${formatOutput(summary)}</div>
  </div>`:''}
  <div class="session-thread" id="pdf-thread" style="max-height:400px;overflow-y:auto;margin-bottom:16px"></div>
  <div class="runner-form">
    <label class="input-label">Ask a question</label>
    <textarea class="runner-textarea" id="pdf-question" placeholder="What are the main conclusions?..." rows="3"></textarea>
    <div class="runner-actions">
      <button class="run-btn" id="pdf-ask-btn" onclick="askPDF(${id})"><span>▶</span> Ask AI</button>
    </div>
  </div>
</div>`;
}

async function askPDF(id) {
  const q = document.getElementById('pdf-question')?.value?.trim();
  if (!q) { toast('Enter a question','error'); return; }
  const btn    = document.getElementById('pdf-ask-btn');
  btn.disabled = true;
  const thread = document.getElementById('pdf-thread');
  thread.innerHTML += `<div class="msg user"><div class="msg-role">👤 You</div><div class="msg-bubble">${escapeHtml(q)}</div></div>`;
  try {
    const data = await api('/api/pdf/'+id+'/ask',{method:'POST',body:{question:q}});
    thread.innerHTML += `<div class="msg assistant"><div class="msg-role">🤖 AI</div><div class="msg-bubble">${formatOutput(data.answer)}</div></div>`;
    document.getElementById('pdf-question').value = '';
    thread.scrollTop = thread.scrollHeight;
  } catch(e){ toast(e.message,'error'); }
  finally { btn.disabled=false; }
}

async function deletePDF(id) {
  if (!confirm('Delete?')) return;
  try { await api('/api/pdf/'+id,{method:'DELETE'}); renderPDF(); toast('Deleted','success'); }
  catch(e){ toast(e.message,'error'); }
}

// ═══════════════════════════════════════════════
// PRICING
// ═══════════════════════════════════════════════
function renderPricing() {
  document.getElementById('content').innerHTML = `
<div class="page">
  <div style="text-align:center;margin-bottom:40px">
    <div class="home-greeting" style="font-size:36px">Simple pricing</div>
    <div style="color:var(--text2);margin-top:8px">Upgrade anytime. Cancel anytime.</div>
  </div>
  <div class="pricing-grid">
    <div class="price-card">
      <div class="price-name">Free</div>
      <div class="price-amount"><sup>$</sup>0</div>
      <div class="price-period">forever</div>
      <ul class="price-features">
        <li>10 requests / day</li><li>All 150+ tools</li>
        <li>PDF upload & chat</li><li>Project saving</li>
      </ul>
      <button class="price-btn secondary" disabled style="cursor:default">Current Plan</button>
    </div>
    <div class="price-card featured">
      <div class="price-name">Pro</div>
      <div class="price-amount"><sup>$</sup>19</div>
      <div class="price-period">per month</div>
      <ul class="price-features">
        <li>500 requests / day</li><li>All 150+ tools</li>
        <li>AI Memory</li><li>Priority processing</li><li>Email support</li>
      </ul>
      <button class="price-btn primary" onclick="subscribe('pro')">Get Pro →</button>
    </div>
    <div class="price-card">
      <div class="price-name">Elite</div>
      <div class="price-amount"><sup>$</sup>49</div>
      <div class="price-period">per month</div>
      <ul class="price-features">
        <li>Unlimited requests</li><li>All 150+ tools</li>
        <li>API access</li><li>Priority support</li>
      </ul>
      <button class="price-btn secondary" onclick="subscribe('elite')">Get Elite →</button>
    </div>
  </div>
</div>`;
}

async function subscribe(plan) {
  try {
    const data = await api('/api/subscribe',{method:'POST',body:{plan}});
    if (data.checkoutUrl) window.open(data.checkoutUrl,'_blank');
    else toast('Redirecting...','success');
  } catch(e){ toast(e.message,'error'); }
}

// ═══════════════════════════════════════════════
// TOASTS
// ═══════════════════════════════════════════════
function toast(msg, type='') {
  const wrap = document.getElementById('toast-wrap');
  const el   = document.createElement('div');
  el.className   = 'toast '+type;
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(()=>el.remove(),300); },3000);
}

// ═══════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('auth-email')   ?.addEventListener('keydown', e => { if(e.key==='Enter') handleAuth(); });
  document.getElementById('auth-password')?.addEventListener('keydown', e => { if(e.key==='Enter') handleAuth(); });
  if (state.token) initApp();
});