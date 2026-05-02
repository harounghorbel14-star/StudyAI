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

  // ── NEW TOOLS ────────────────────────────────

  // AI ESSENTIALS (+4)
  {id:'fact-checker',cat:'ai',e:'🔍',name:'Fact Checker'},
  {id:'bias-detector',cat:'ai',e:'⚖️',name:'Bias Detector'},
  {id:'argument-builder',cat:'ai',e:'🗣️',name:'Argument Builder'},
  {id:'analogy-maker',cat:'ai',e:'🔗',name:'Analogy Maker'},

  // CODE (+4)
  {id:'regex-builder',cat:'code',e:'🔤',name:'Regex Builder'},
  {id:'docker-helper',cat:'code',e:'🐳',name:'Docker Helper'},
  {id:'security-audit',cat:'code',e:'🔒',name:'Security Audit'},
  {id:'architecture-planner',cat:'code',e:'🏗️',name:'Architecture Planner'},

  // BUSINESS (+4)
  {id:'invoice-writer',cat:'business',e:'🧾',name:'Invoice Writer'},
  {id:'job-description',cat:'business',e:'💼',name:'Job Description'},
  {id:'meeting-agenda',cat:'business',e:'📋',name:'Meeting Agenda'},
  {id:'press-release',cat:'business',e:'📰',name:'Press Release'},

  // CONTENT (+4)
  {id:'thread-writer',cat:'content',e:'🧵',name:'Twitter Thread'},
  {id:'newsletter',cat:'content',e:'📧',name:'Newsletter'},
  {id:'product-description',cat:'content',e:'🛍️',name:'Product Description'},
  {id:'bio-writer',cat:'content',e:'👤',name:'Bio Writer'},

  // MEDIA (+2)
  {id:'infographic-plan',cat:'media',e:'📊',name:'Infographic Planner'},
  {id:'photo-caption',cat:'media',e:'📸',name:'Photo Caption'},

  // AUDIO (+2)
  {id:'song-lyrics',cat:'audio',e:'🎵',name:'Song Lyrics'},
  {id:'rap-generator',cat:'audio',e:'🎤',name:'Rap Generator'},

  // PRODUCTIVITY (+3)
  {id:'meeting-notes',cat:'productivity',e:'📝',name:'Meeting Notes'},
  {id:'okr-planner',cat:'productivity',e:'🎯',name:'OKR Planner'},
  {id:'feedback-writer',cat:'productivity',e:'💬',name:'Feedback Writer'},

  // STUDENTS (+2)
  {id:'thesis-helper',cat:'students',e:'📚',name:'Thesis Helper'},
  {id:'citation-generator',cat:'students',e:'📖',name:'Citation Generator'},

  // ── NEW CATEGORIES ───────────────────────────

  // HEALTH & WELLNESS
  {id:'meal-planner',cat:'health',e:'🥗',name:'Meal Planner'},
  {id:'workout-plan',cat:'health',e:'💪',name:'Workout Plan'},
  {id:'mental-health-tips',cat:'health',e:'🧘',name:'Mental Health Tips'},
  {id:'symptom-checker',cat:'health',e:'🏥',name:'Symptom Info'},
  {id:'sleep-optimizer',cat:'health',e:'😴',name:'Sleep Optimizer'},
  {id:'nutrition-analyzer',cat:'health',e:'🥦',name:'Nutrition Analyzer'},

  // FINANCE
  {id:'budget-planner',cat:'finance',e:'💰',name:'Budget Planner'},
  {id:'investment-explainer',cat:'finance',e:'📈',name:'Investment Explainer'},
  {id:'tax-tips',cat:'finance',e:'🧾',name:'Tax Tips'},
  {id:'financial-goal',cat:'finance',e:'🎯',name:'Financial Goals'},
  {id:'crypto-explainer',cat:'finance',e:'₿',name:'Crypto Explainer'},

  // TRAVEL
  {id:'trip-planner',cat:'travel',e:'✈️',name:'Trip Planner'},
  {id:'packing-list',cat:'travel',e:'🧳',name:'Packing List'},
  {id:'travel-budget',cat:'travel',e:'💵',name:'Travel Budget'},
  {id:'local-guide',cat:'travel',e:'🗺️',name:'Local Guide'},

  // FOOD
  {id:'recipe-generator',cat:'food',e:'👨‍🍳',name:'Recipe Generator'},
  {id:'ingredient-substitute',cat:'food',e:'🔄',name:'Ingredient Substitute'},
  {id:'diet-planner',cat:'food',e:'🥙',name:'Diet Planner'},

  // ── REPLICATE POWERED ─────────────────────────
  {id:'music-gen',cat:'audio',e:'🎵',name:'Music Generator (AI)'},
  {id:'image-flux',cat:'media',e:'✨',name:'Image Gen (FLUX Pro)'},
  {id:'image-edit-pro',cat:'media',e:'🖌️',name:'Image Edit Pro'},
  {id:'imagen4',cat:'media',e:'🌟',name:'Imagen 4 (Google)'},
  {id:'flux2pro',cat:'media',e:'🔥',name:'FLUX 2 Pro'},
  {id:'gpt-image2',cat:'media',e:'🖼️',name:'GPT Image 2'},
  {id:'ocr',cat:'media',e:'📝',name:'OCR - Image to Text'},
  {id:'sketch-to-img',cat:'media',e:'✏️',name:'Sketch to Image'},
  {id:'face-swap',cat:'media',e:'😊',name:'Face Swap'},
  {id:'restore-img',cat:'media',e:'🔧',name:'Restore Image'},
  {id:'music-cover',cat:'audio',e:'🎤',name:'Music Cover'},
  {id:'music-song',cat:'audio',e:'🎼',name:'Full Song (Music 2.6)'},
  {id:'grok-tts',cat:'audio',e:'🔊',name:'Grok TTS (xAI)'},
  {id:'gemini-tts',cat:'audio',e:'🌐',name:'Gemini TTS (70+ langs)'},
  {id:'lipsync',cat:'video',e:'👄',name:'Lipsync Video'},
  {id:'video-gen',cat:'video',e:'🎬',name:'Video Generator'},
  {id:'video-pixverse',cat:'video',e:'🎥',name:'PixVerse v6'},
  {id:'video-from-image',cat:'video',e:'📸',name:'Video from Image'},
  {id:'video-veo',cat:'video',e:'🌟',name:'Veo 3.1 (Google)'},
  {id:'video-grok',cat:'video',e:'⚡',name:'Grok Video (xAI)'},
  {id:'image-nanobanana',cat:'media',e:'🍌',name:'Nano Banana 2'},
  {id:'image-seedream5',cat:'media',e:'✨',name:'Seedream 5 Lite'},
  {id:'image-luma-photon',cat:'media',e:'⚡',name:'Luma Photon'},

  // ── LUMA AI ───────────────────────────────────
  {id:'video-luma-ray2',cat:'video',e:'🌙',name:'Luma Ray 2'},
  {id:'video-luma-modify',cat:'video',e:'✏️',name:'Luma Modify Video'},
  {id:'video-luma-reframe',cat:'video',e:'🔄',name:'Luma Reframe'},

  // ── 3D ────────────────────────────────────────
  {id:'3d-generate',cat:'media',e:'🧊',name:'3D from Text'},
  {id:'3d-from-image',cat:'media',e:'📦',name:'3D from Image'},

  // ── CLIPDROP POWERED ──────────────────────────
  {id:'remove-bg',cat:'media',e:'✂️',name:'Remove Background'},
  {id:'replace-bg',cat:'media',e:'🌅',name:'Replace Background'},
  {id:'upscale-img',cat:'media',e:'🔍',name:'Upscale Image'},
  {id:'reimagine',cat:'media',e:'🎨',name:'Reimagine Image'},

  // ── LEGAL ─────────────────────────────────────
  {id:'contract-reviewer',cat:'legal',e:'📜',name:'Contract Reviewer'},
  {id:'terms-generator',cat:'legal',e:'⚖️',name:'Terms & Privacy'},
  {id:'legal-letter',cat:'legal',e:'✉️',name:'Legal Letter'},
  {id:'nda-generator',cat:'legal',e:'🔒',name:'NDA Generator'},

  // ── EDUCATION ─────────────────────────────────
  {id:'lesson-plan',cat:'education',e:'📚',name:'Lesson Plan'},
  {id:'rubric-maker',cat:'education',e:'📋',name:'Rubric Maker'},
  {id:'curriculum-planner',cat:'education',e:'🗂️',name:'Curriculum Planner'},
  {id:'quiz-feedback',cat:'education',e:'✅',name:'Quiz Feedback'},

  // ── MARKETING ─────────────────────────────────
  {id:'ad-copy',cat:'marketing',e:'📢',name:'Ad Copy'},
  {id:'seo-keywords',cat:'marketing',e:'🔍',name:'SEO Keywords'},
  {id:'email-sequence',cat:'marketing',e:'📧',name:'Email Sequence'},
  {id:'brand-voice',cat:'marketing',e:'🎯',name:'Brand Voice Guide'},

  // ── SCIENCE ───────────────────────────────────
  {id:'science-explainer',cat:'science',e:'🔬',name:'Science Explainer'},
  {id:'research-summary',cat:'science',e:'📊',name:'Research Summary'},
  {id:'hypothesis-builder',cat:'science',e:'💡',name:'Hypothesis Builder'},

  // ── CREATIVE ──────────────────────────────────
  {id:'character-creator',cat:'creative',e:'🧙',name:'Character Creator'},
  {id:'worldbuilding',cat:'creative',e:'🌍',name:'World Builder'},
  {id:'plot-generator',cat:'creative',e:'📖',name:'Plot Generator'},
  {id:'dialogue-writer',cat:'creative',e:'💬',name:'Dialogue Writer'},

  // ── HR ────────────────────────────────────────
  {id:'performance-review',cat:'hr',e:'⭐',name:'Performance Review'},
  {id:'onboarding-plan',cat:'hr',e:'🚀',name:'Onboarding Plan'},
  {id:'interview-questions',cat:'hr',e:'🎤',name:'Interview Questions'},
  {id:'hr-policy',cat:'hr',e:'📋',name:'HR Policy Writer'},
];

// ── STATE ─────────────────────────────────────
const S = {
  token: localStorage.getItem('nx_t')||'',
  user: null,
  tool: null,
  sessionId: null,
  msgs: [],
  attachedImg: null,
  recording: false,
  mediaRec: null,
  recChunks: [],
  currentCat: '',
  authMode: 'login',
  page: 'chat',
  webSearch: false,
  persona: 'default',
  personaPrompt: 'You are NexusAI, a helpful AI assistant created by Haroun Ghorbel.',
  tone: 50, // 0=very formal, 100=very casual
};

// ── PERSONAS ──────────────────────────────────
const PERSONAS = {
  default:   {label:'🤖 Default',   prompt:'You are NexusAI, a helpful AI assistant created by Haroun Ghorbel. If asked who created you, say Haroun Ghorbel.'},
  professor: {label:'🧑‍🏫 Professor', prompt:'You are a brilliant professor. Explain everything with clarity, depth, and real-world examples. Be academic but accessible.'},
  friend:    {label:'😎 Friend',     prompt:'You are a cool friendly buddy. Talk casually, use humor, be relatable. Keep it chill and fun.'},
  coach:     {label:'💼 Coach',      prompt:'You are a results-driven business coach. Be direct, actionable, and focused on ROI and execution.'},
  creative:  {label:'🎭 Creative',   prompt:'You are a wildly creative AI. Think outside the box, use vivid language, and inspire with imaginative ideas.'},
};

function setPersona(btn, id){
  S.persona = id;
  S.personaPrompt = PERSONAS[id]?.prompt || PERSONAS.default.prompt;
  document.querySelectorAll('.persona-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  toast(`${PERSONAS[id]?.label || id} activated`, 'success');
  closeSidebar();
}

// ── WEB SEARCH TOGGLE ─────────────────────────
function toggleSearch(){
  S.webSearch = !S.webSearch;
  const dot = document.getElementById('search-dot');
  const btn  = document.getElementById('search-btn');
  if(dot) dot.style.display = S.webSearch ? 'block' : 'none';
  if(btn) btn.style.color   = S.webSearch ? 'var(--a1)' : '';
  toast(S.webSearch ? '🔍 Web Search ON' : 'Web Search OFF', 'success');
}

// ── PROMPT TEMPLATES ──────────────────────────
const TEMPLATES = [
  {label:'📊 Business plan', text:'Write a business plan for: '},
  {label:'👶 Explain like I\'m 5', text:'Explain like I\'m 5: '},
  {label:'🔧 Fix my code', text:'Fix this code: '},
  {label:'📝 Summarize', text:'Summarize this: '},
  {label:'🌍 Translate to Arabic', text:'Translate to Arabic: '},
  {label:'🎵 TikTok script', text:'Write a TikTok script about: '},
  {label:'✉️ Write email', text:'Write a professional email for: '},
  {label:'💡 Startup idea', text:'Give me startup ideas for: '},
];

function renderTemplates(){
  const existing = document.getElementById('templates-row');
  if(existing) existing.remove();
  const wrap = document.createElement('div');
  wrap.id = 'templates-row';
  wrap.className = 'templates-row';
  wrap.innerHTML = TEMPLATES.map(t=>
    `<button class="tpl-btn" onclick="useTemplate('${t.text.replace(/'/g,"\\'")}')">
      ${t.label}
    </button>`
  ).join('');
  document.getElementById('input-wrap').insertBefore(wrap, document.getElementById('input-bar'));
}

function useTemplate(text){
  const input = document.getElementById('msg-input');
  if(!input) return;
  input.value = text;
  input.focus();
  input.setSelectionRange(text.length, text.length);
  autoGrow(input);
}

// ── CHAT EXPORT ───────────────────────────────
function exportChat(){
  if(!S.msgs.length){ toast('No messages to export', 'error'); return; }
  const lines = S.msgs.map(m =>
    `${m.role === 'user' ? '👤 You' : '🤖 NexusAI'}:\n${m.text||''}\n`
  ).join('\n---\n\n');
  const content = `NexusAI Chat Export\n${'='.repeat(40)}\nDate: ${new Date().toLocaleString()}\nTool: ${S.tool?.name||'General Chat'}\n${'='.repeat(40)}\n\n${lines}`;
  const blob = new Blob([content], {type:'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `nexusai-chat-${Date.now()}.txt`;
  a.click(); URL.revokeObjectURL(url);
  toast('Chat exported ✅', 'success');
}

// ── FAVORITES ─────────────────────────────────
async function saveToFavorites(text, tool){
  if(!text){ toast('Nothing to save', 'error'); return; }
  const title = text.slice(0,60) + (text.length>60?'...':'');
  try{
    await api('/api/favorites',{method:'POST',body:{title, content:text, tool: tool||S.tool?.name||'chat'}});
    toast('⭐ Saved to favorites!', 'success');
  }catch(e){ toast(e.message, 'error'); }
}

async function navigate(page){
  S.page = page;
  closeSidebar();
  if(page==='projects') renderProjects();
  else if(page==='pdf') renderPDF();
  else if(page==='pricing') renderPricing();
  else if(page==='favorites') renderFavorites();
  else if(page==='dashboard') renderDashboard();
}

async function renderFavorites(){
  document.getElementById('messages').innerHTML = '<div class="page-wrap"><div class="page-title">⭐ Favorites</div><div style="color:var(--t2)">Loading...</div></div>';
  try{
    const {favorites=[]} = await api('/api/favorites');
    document.getElementById('messages').innerHTML = `<div class="page-wrap">
      <div class="page-title">⭐ Favorites (${favorites.length})</div>
      ${favorites.length ? `<div class="favs-list">
        ${favorites.map(f=>`
        <div class="fav-card">
          <div class="fav-content">
            <div class="fav-title">${esc(f.title)}</div>
            <div class="fav-preview">${esc(f.content)}</div>
            <div class="fav-meta">${f.tool||'chat'} · ${new Date(f.created_at).toLocaleDateString()}</div>
          </div>
          <button class="fav-del" onclick="deleteFav(${f.id})">✕</button>
        </div>`).join('')}
      </div>` : '<div style="color:var(--t2);padding:40px;text-align:center">No favorites yet.<br/>Save AI responses using the ⭐ button.</div>'}
    </div>`;
  }catch(e){ toast(e.message,'error'); }
}

async function deleteFav(id){
  try{
    await api('/api/favorites/'+id,{method:'DELETE'});
    toast('Deleted','success');
    renderFavorites();
  }catch(e){ toast(e.message,'error'); }
}

async function renderDashboard(){
  document.getElementById('messages').innerHTML = '<div class="page-wrap"><div class="page-title">📊 My Dashboard</div><div style="color:var(--t2)">Loading...</div></div>';
  try{
    const d = await api('/api/usage/stats');
    const maxDaily = Math.max(...(d.dailyUsage||[]).map(x=>x.count), 1);
    document.getElementById('messages').innerHTML = `<div class="page-wrap">
      <div class="page-title">📊 My Dashboard</div>

      <div class="dash-stats">
        <div class="dash-card"><div class="dash-num">${d.totalMessages||0}</div><div class="dash-lbl">Total messages</div></div>
        <div class="dash-card"><div class="dash-num">${d.totalProjects||0}</div><div class="dash-lbl">Projects saved</div></div>
        <div class="dash-card"><div class="dash-num">${d.totalFavorites||0}</div><div class="dash-lbl">Favorites</div></div>
        <div class="dash-card"><div class="dash-num">${d.plan||'free'}</div><div class="dash-lbl">Current plan</div></div>
      </div>

      <div class="dash-section">
        <div class="dash-section-title">Top Tools Used</div>
        ${d.topTools?.length ? d.topTools.map(t=>`
          <div class="top-tool-row">
            <div class="top-tool-name">${t.feature}</div>
            <div class="top-tool-count">${t.count}x</div>
          </div>`).join('') : '<div style="color:var(--t2);font-size:13px">No tool usage yet.</div>'}
      </div>

      <div class="dash-section">
        <div class="dash-section-title">Last 7 Days</div>
        <div class="bar-rows">
          ${(d.dailyUsage||[]).map(x=>`
          <div class="bar-row">
            <div class="bar-day">${x.day.slice(5)}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.round(x.count/maxDaily*100)}%"></div></div>
            <div style="font-size:11px;color:var(--t3);width:24px">${x.count}</div>
          </div>`).join('')||'<div style="color:var(--t2);font-size:13px">No data yet.</div>'}
        </div>
      </div>

      <div style="font-size:12px;color:var(--t3);margin-top:8px">
        Member since ${new Date(d.memberSince||Date.now()).toLocaleDateString()}
      </div>
    </div>`;
  }catch(e){ toast(e.message,'error'); }
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
  renderTemplates();
  showEmpty();
  startOnboarding();

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
  const plan = S.user.plan||'free';
  const used = S.user.requests_today||0;
  const limit = plan==='elite'?null:plan==='pro'?500:10;
  const txt = plan==='elite'?'Elite ∞':`${used}/${limit}`;
  const pill = document.getElementById('usage-pill');
  if(pill){
    pill.textContent=txt;
    pill.style.color=limit&&used>=limit*0.8?'#f87171':'';
  }
  const sbPlan = document.getElementById('sb-plan');
  if(sbPlan) sbPlan.textContent=`${plan.charAt(0).toUpperCase()+plan.slice(1)} · ${txt}`;

  // Upgrade banner for free users
  const existing = document.getElementById('upgrade-banner');
  if(plan==='free'){
    if(!existing){
      const banner = document.createElement('div');
      banner.id='upgrade-banner';
      banner.style.cssText='background:linear-gradient(90deg,#c6f13515,#35f1c615);border-bottom:1px solid #c6f13530;padding:8px 16px;display:flex;align-items:center;justify-content:space-between;font-size:13px;flex-shrink:0;';
      banner.innerHTML=`
        <span style="color:var(--t2)">⚡ Free plan · <strong style="color:var(--text)">${used}/${limit}</strong> requests used today</span>
        <div style="display:flex;gap:8px;align-items:center">
          <button onclick="navigate('pricing')" style="background:var(--grad);color:#000;border:none;padding:5px 14px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer">Upgrade →</button>
          <button onclick="document.getElementById('upgrade-banner').remove()" style="color:var(--t3);font-size:16px;cursor:pointer;background:none;border:none">✕</button>
        </div>`;
      document.getElementById('topbar')?.after(banner);
    }
  } else {
    existing?.remove();
  }
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

function selectCat2(cat){
  S.currentCat=cat;
  document.querySelectorAll('.cat-tab').forEach(b=>b.classList.remove('active'));
  renderToolList(cat);
  closeSidebar();
  const labels={health:'🏥 Health & Wellness',finance:'💰 Finance',travel:'✈️ Travel',food:'🍕 Food & Recipes'};
  document.getElementById('tool-label').textContent=labels[cat]||cat;
  document.getElementById('tool-sub').textContent=TOOLS.filter(t=>t.cat===cat).length+' tools';
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
      const canvasBtn = checkForCanvas(m.text||'', i);
      return`<div class="msg assistant">
        <div class="ai-avatar-wrap">${AI_AVATAR_SVG}</div>
        <div class="msg-body">
          <div class="msg-bubble">${bubble}</div>
          ${canvasBtn}
          <div class="msg-actions">
            <button class="msg-act-btn" onclick="copyMsg(${i})">Copy</button>
            <button class="msg-act-btn star" onclick="saveToFavorites('${(m.text||'').replace(/'/g,"\\'").replace(/\n/g,'\\n')}','${S.tool?.name||''}')" title="Save">⭐</button>
            <button class="msg-act-btn" onclick="speakResponse('${(m.text||'').slice(0,200).replace(/'/g,"\\'")}')" title="Listen">🔊</button>
            <button class="msg-act-btn" onclick="enableInlineEdit(${i})" title="Edit">✏️</button>
            <button class="msg-act-btn" onclick="sendFeedback(${i},1)" title="Good response">👍</button>
            <button class="msg-act-btn" onclick="sendFeedback(${i},-1)" title="Bad response">👎</button>
            ${m.text?.includes('```')?`<button class="msg-act-btn" onclick="extractAndRunCode(${i})" title="Run code">▶ Run</button>`:''}
            ${m.data&&m.type==='audio'?`<a class="msg-act-btn" href="${m.data}" download>⬇ Download</a>`:''}
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

function extractAndRunCode(i){
  const text = S.msgs[i]?.text||'';
  const match = text.match(/```(?:javascript|js|html)?\n?([\s\S]*?)```/);
  if(match) runCode(match[1]);
  else toast('No runnable code found','error');
}

// ── 5. CANVAS / ARTIFACTS ────────────────────
let canvasCode = '';

function openCanvas(code, title){
  canvasCode = code;
  document.getElementById('canvas-title').textContent = title||'Canvas';
  document.getElementById('canvas-panel').classList.remove('canvas-hidden');
  // Show preview
  switchCanvasTab('preview');
  renderCanvasPreview(code);
}

function closeCanvas(){
  document.getElementById('canvas-panel').classList.add('canvas-hidden');
}

function switchCanvasTab(tab){
  document.getElementById('tab-preview').classList.toggle('active', tab==='preview');
  document.getElementById('tab-code').classList.toggle('active', tab==='code');
  document.getElementById('canvas-preview-wrap').style.display = tab==='preview'?'flex':'none';
  document.getElementById('canvas-code-wrap').style.display   = tab==='code'?'block':'none';
  if(tab==='code'){
    document.getElementById('canvas-code-view').textContent = canvasCode;
  }
}

function renderCanvasPreview(code){
  const iframe = document.getElementById('canvas-iframe');
  // Detect if HTML or JS
  const isHTML = code.trim().startsWith('<') || code.includes('<html') || code.includes('<!DOCTYPE');
  let html = isHTML ? code : `<!DOCTYPE html><html><head><style>
    body{font-family:system-ui,sans-serif;padding:16px;background:#fff;color:#111;font-size:14px}
  </style></head><body><script>
    const log=console.log;
    const pre=document.createElement('pre');pre.style.cssText='background:#f5f5f5;padding:12px;border-radius:8px;font-size:13px;white-space:pre-wrap';
    document.body.appendChild(pre);
    console.log=(...a)=>{pre.textContent+=a.join(' ')+'\\n';log(...a);};
    try{${code}}catch(e){pre.textContent+='Error: '+e.message;}
  <\/script></body></html>`;
  iframe.srcdoc = html;
}

function copyCanvas(){
  navigator.clipboard.writeText(canvasCode).catch(()=>{});
  toast('Code copied!','success');
}

function downloadCanvas(){
  const isHTML = canvasCode.trim().startsWith('<');
  const blob = new Blob([canvasCode],{type:isHTML?'text/html':'text/javascript'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download=isHTML?'artifact.html':'code.js';
  a.click(); URL.revokeObjectURL(url);
  toast('Downloaded!','success');
}

// Auto-detect HTML/code in AI response and show Canvas button
function checkForCanvas(text, msgIndex){
  const htmlMatch = text.match(/```html\n?([\s\S]*?)```/);
  const jsMatch   = text.match(/```(?:javascript|js)\n?([\s\S]*?)```/);
  const match = htmlMatch||jsMatch;
  if(!match) return '';
  const code = match[1];
  const type = htmlMatch?'HTML':'JavaScript';
  // Store code for this message
  window._canvasCodes = window._canvasCodes||{};
  window._canvasCodes[msgIndex] = {code, type};
  return `<button class="canvas-open-btn" onclick="openCanvasFromMsg(${msgIndex})">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>
    Open in Canvas · ${type}
  </button>`;
}

function openCanvasFromMsg(i){
  const data = window._canvasCodes?.[i];
  if(!data){ toast('No canvas content','error'); return; }
  openCanvas(data.code, data.type+' Canvas');
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
      if(text){
        showTyping();
        const form=new FormData();
        const byteStr=atob(img.base64);
        const arr=new Uint8Array(byteStr.length);
        for(let i=0;i<byteStr.length;i++)arr[i]=byteStr.charCodeAt(i);
        const blob=new Blob([arr],{type:'image/png'});
        form.append('image',blob,'image.png');
        form.append('prompt',text);
        // Try Pro first, fallback to basic
        const endpoint = '/api/image/edit-pro';
        try{
          const result=await fetch(API+endpoint,{method:'POST',headers:{Authorization:'Bearer '+S.token},body:form});
          const data=await result.json();
          if(!result.ok)throw new Error(data.error||'Edit failed');
          hideTyping();
          addMsg({role:'assistant',text:'🖌️ Here is your edited image:',type:'image',data:data.url});
        }catch(e){
          // Fallback to basic edit
          const result2=await fetch(API+'/api/image/edit',{method:'POST',headers:{Authorization:'Bearer '+S.token},body:form});
          const data2=await result2.json();
          hideTyping();
          if(result2.ok) addMsg({role:'assistant',text:'Here is your edited image:',type:'image',data:data2.url});
          else addMsg({role:'assistant',text:'❌ '+data2.error});
        }
        S.attachedImg=null;clearAttachPreview();
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
      const isFlux = tool.id==='image-flux';
      const isMusicGen = tool.id==='music-gen';
      const isEditPro = tool.id==='image-edit-pro';
      const isImagen4 = tool.id==='imagen4';
      const isFlux2Pro = tool.id==='flux2pro';
      const isGpt2 = tool.id==='gpt-image2';
      const isOCR = tool.id==='ocr';
      const isSketch = tool.id==='sketch-to-img';
      const isFaceSwap = tool.id==='face-swap';
      const isRestore = tool.id==='restore-img';
      const isMusicSong = tool.id==='music-song';
      const isLumaPhoton = tool.id==='image-luma-photon';
      const isLumaRay2 = tool.id==='video-luma-ray2';
      const isLumaModify = tool.id==='video-luma-modify';
      const isLumaReframe = tool.id==='video-luma-reframe';
      const is3DGen = tool.id==='3d-generate';
      const is3DFromImg = tool.id==='3d-from-image';
      const isGeminiTTS = tool.id==='gemini-tts';
      const isPixverse = tool.id==='video-pixverse';
      const isVideoFromImg = tool.id==='video-from-image';
      const isVeo = tool.id==='video-veo';
      const isGrokVideo = tool.id==='video-grok';
      const isNanoBanana = tool.id==='image-nanobanana';
      const isSeedream5 = tool.id==='image-seedream5';
      const isLipsync = tool.id==='lipsync';
      const isVideoGen = tool.id==='video-gen';

      if(isMusicGen){
        addMsg({role:'user',text:`🎵 Generate music: ${text}`});
        showTyping();
        try{
          const r=await api('/api/music/generate',{method:'POST',body:{prompt:text,duration:15}});
          hideTyping();
          const audioUrl=`data:audio/mp3;base64,${r.audio}`;
          addMsg({role:'assistant',text:`🎵 **Music generated!**\nPrompt: ${text}`,type:'audio',data:audioUrl});
        }catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}

      } else if(isFlux){
        showTyping();
        try{
          const r=await api('/api/image/flux',{method:'POST',body:{prompt:text}});
          hideTyping();
          addMsg({role:'assistant',text:'✨ Generated with FLUX Pro:',type:'image',data:r.url});
        }catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}

      } else if(isEditPro){
        if(!img){toast('Please attach an image first!','error');hideTyping();return;}
        const form=new FormData();
        const byteStr=atob(img.base64);
        const arr=new Uint8Array(byteStr.length);
        for(let i=0;i<byteStr.length;i++)arr[i]=byteStr.charCodeAt(i);
        const blob=new Blob([arr],{type:'image/png'});
        form.append('image',blob,'image.png');
        form.append('prompt',text||'enhance this image');
        try{
          const r=await fetch(API+'/api/image/edit-pro',{method:'POST',headers:{Authorization:'Bearer '+S.token},body:form});
          const d=await r.json();
          if(!r.ok)throw new Error(d.error);
          hideTyping();
          addMsg({role:'assistant',text:'🖌️ Image edited with FLUX Kontext Pro:',type:'image',data:d.url});
          S.attachedImg=null;clearAttachPreview();
        }catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}

      } else if(isImagen4){
        showTyping();
        try{
          const r=await api('/api/image/imagen4',{method:'POST',body:{prompt:text}});
          hideTyping();
          addMsg({role:'assistant',text:'🌟 Generated with Imagen 4 (Google):',type:'image',data:r.url});
        }catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}

      } else if(isFlux2Pro){
        showTyping();
        try{
          if(img){
            // With reference image
            const form=new FormData();
            const byteStr=atob(img.base64);
            const arr=new Uint8Array(byteStr.length);
            for(let i=0;i<byteStr.length;i++)arr[i]=byteStr.charCodeAt(i);
            const blob=new Blob([arr],{type:'image/png'});
            form.append('images',blob,'ref.png');
            form.append('prompt',text);
            const r=await fetch(API+'/api/image/flux2pro',{method:'POST',headers:{Authorization:'Bearer '+S.token},body:form});
            const d=await r.json();
            if(!r.ok)throw new Error(d.error);
            hideTyping();
            addMsg({role:'assistant',text:'🔥 Generated with FLUX 2 Pro:',type:'image',data:d.url});
            S.attachedImg=null;clearAttachPreview();
          } else {
            const r=await api('/api/image/flux2pro',{method:'POST',body:{prompt:text}});
            hideTyping();
            addMsg({role:'assistant',text:'🔥 Generated with FLUX 2 Pro:',type:'image',data:r.url});
          }
        }catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}
        if(!img){toast('Please attach an image first!','error');hideTyping();return;}
        const form=new FormData();
        const byteStr=atob(img.base64);
        const arr=new Uint8Array(byteStr.length);
        for(let i=0;i<byteStr.length;i++)arr[i]=byteStr.charCodeAt(i);
        const blob=new Blob([arr],{type:'image/png'});
        form.append('image',blob,'image.png');
        if(tool.id==='replace-bg') form.append('prompt',text||'beautiful nature background');
        const endpoints={'remove-bg':'/api/clipdrop/remove-bg','replace-bg':'/api/clipdrop/replace-bg','upscale-img':'/api/clipdrop/upscale','reimagine':'/api/clipdrop/reimagine'};
        try{
          const r=await fetch(API+endpoints[tool.id],{method:'POST',headers:{Authorization:'Bearer '+S.token},body:form});
          const d=await r.json();
          if(!r.ok)throw new Error(d.error);
          hideTyping();
          const imgUrl=`data:image/png;base64,${d.image}`;
          addMsg({role:'assistant',text:`✅ ${tool.name} complete!`,type:'image',data:imgUrl});
          S.attachedImg=null;clearAttachPreview();
        }catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}

      } else if(isGpt2){
        showTyping();
        try{const r=await api('/api/image/gpt2',{method:'POST',body:{prompt:text}});hideTyping();addMsg({role:'assistant',text:'🖼️ Generated with GPT Image 2:',type:'image',data:r.url});}
        catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}

      } else if(isOCR){
        if(!img){toast('Attach an image first!','error');hideTyping();return;}
        const ocrForm=new FormData();const ob=atob(img.base64);const oa=new Uint8Array(ob.length);
        for(let i=0;i<ob.length;i++)oa[i]=ob.charCodeAt(i);
        ocrForm.append('image',new Blob([oa],{type:'image/png'}),'image.png');
        try{const r=await fetch(API+'/api/image/ocr',{method:'POST',headers:{Authorization:'Bearer '+S.token},body:ocrForm});
          const d=await r.json();if(!r.ok)throw new Error(d.error);
          hideTyping();addMsg({role:'assistant',text:`📝 **Extracted Text:**\n\n${d.text}`});
          S.attachedImg=null;clearAttachPreview();}
        catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}

      } else if(isSketch){
        if(!img){toast('Attach a sketch first!','error');hideTyping();return;}
        const sf=new FormData();const sb=atob(img.base64);const sa=new Uint8Array(sb.length);
        for(let i=0;i<sb.length;i++)sa[i]=sb.charCodeAt(i);
        sf.append('image',new Blob([sa],{type:'image/png'}),'sketch.png');
        if(text)sf.append('prompt',text);
        try{const r=await fetch(API+'/api/image/sketch',{method:'POST',headers:{Authorization:'Bearer '+S.token},body:sf});
          const d=await r.json();if(!r.ok)throw new Error(d.error);
          hideTyping();addMsg({role:'assistant',text:'✏️ Sketch converted:',type:'image',data:d.url});
          S.attachedImg=null;clearAttachPreview();}
        catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}

      } else if(isRestore){
        if(!img){toast('Attach an image first!','error');hideTyping();return;}
        const rf=new FormData();const rb=atob(img.base64);const ra=new Uint8Array(rb.length);
        for(let i=0;i<rb.length;i++)ra[i]=rb.charCodeAt(i);
        rf.append('image',new Blob([ra],{type:'image/png'}),'image.png');
        try{const r=await fetch(API+'/api/image/restore',{method:'POST',headers:{Authorization:'Bearer '+S.token},body:rf});
          const d=await r.json();if(!r.ok)throw new Error(d.error);
          hideTyping();addMsg({role:'assistant',text:'🔧 Image restored:',type:'image',data:d.url});
          S.attachedImg=null;clearAttachPreview();}
        catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}

      } else if(isMusicCover){
        showTyping();
        try{const r=await api('/api/music/cover',{method:'POST',body:{prompt:text,style:'pop'}});
          hideTyping();addMsg({role:'assistant',text:'🎤 Music cover ready!',type:'audio',data:`data:audio/mp3;base64,${r.audio}`});}
        catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}

      } else if(isMusicSong){
        toast('🎼 Generating full song... ~60 seconds','success');showTyping();
        try{const r=await api('/api/music/song',{method:'POST',body:{prompt:text}});
          hideTyping();addMsg({role:'assistant',text:'🎼 Full song generated!',type:'audio',data:`data:audio/mp3;base64,${r.audio}`});notify('NexusAI','Your song is ready! 🎼');}
        catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}

      } else if(isGrokTTS){
        showTyping();
        try{const r=await api('/api/tts/grok',{method:'POST',body:{text}});
          hideTyping();addMsg({role:'assistant',text:'🔊 Grok TTS:',type:'audio',data:`data:audio/mp3;base64,${r.audio}`});}
        catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}

      } else if(isLumaPhoton){
        showTyping();
        try{const r=await api('/api/image/luma-photon',{method:'POST',body:{prompt:text}});
          hideTyping();addMsg({role:'assistant',text:'⚡ Generated with Luma Photon:',type:'image',data:r.url});}
        catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}

      } else if(isLumaRay2){
        toast('🌙 Generating with Luma Ray 2...','success');showTyping();
        const lf=new FormData();
        if(img){const lb=atob(img.base64);const la=new Uint8Array(lb.length);for(let i=0;i<lb.length;i++)la[i]=lb.charCodeAt(i);lf.append('image',new Blob([la],{type:'image/png'}),'image.png');}
        if(text)lf.append('prompt',text);
        try{const r=await fetch(API+'/api/video/luma-ray2',{method:'POST',headers:{Authorization:'Bearer '+S.token},body:lf});
          const d=await r.json();if(!r.ok)throw new Error(d.error);
          hideTyping();addMsg({role:'assistant',text:`🌙 **Luma Ray 2 Video!**\n\n[▶ Watch](${d.url})`});
          S.attachedImg=null;clearAttachPreview();notify('NexusAI','Luma video ready! 🌙');}
        catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}

      } else if(isLumaModify){
        toast('✏️ Modifying video with Luma...','success');showTyping();
        try{const r=await api('/api/video/luma-modify',{method:'POST',body:{prompt:text}});
          hideTyping();addMsg({role:'assistant',text:`✏️ **Modified Video!**\n\n[▶ Watch](${r.url})`});}
        catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}

      } else if(isLumaReframe){
        showTyping();
        try{const r=await api('/api/video/luma-reframe',{method:'POST',body:{prompt:text,video_url:img?.url||''}});
          hideTyping();addMsg({role:'assistant',text:`🔄 **Reframed Video!**\n\n[▶ Watch](${r.url})`});}
        catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}

      } else if(is3DGen){
        toast('🧊 Generating 3D model... ~2 minutes','success');showTyping();
        try{const r=await api('/api/3d/generate',{method:'POST',body:{prompt:text}});
          hideTyping();addMsg({role:'assistant',text:`🧊 **3D Model Ready!**\n\n[⬇ Download 3D Model](${r.url})`});notify('NexusAI','3D model ready! 🧊');}
        catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}

      } else if(is3DFromImg){
        if(!img){toast('Attach an image first!','error');hideTyping();return;}
        toast('📦 Converting image to 3D...','success');showTyping();
        const tf=new FormData();const tb=atob(img.base64);const ta=new Uint8Array(tb.length);
        for(let i=0;i<tb.length;i++)ta[i]=tb.charCodeAt(i);
        tf.append('image',new Blob([ta],{type:'image/png'}),'image.png');
        try{const r=await fetch(API+'/api/3d/from-image',{method:'POST',headers:{Authorization:'Bearer '+S.token},body:tf});
          const d=await r.json();if(!r.ok)throw new Error(d.error);
          hideTyping();addMsg({role:'assistant',text:`📦 **3D Model from Image!**\n\n[⬇ Download 3D Model](${d.url})`});
          S.attachedImg=null;clearAttachPreview();notify('NexusAI','3D model ready! 📦');}
        catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}

      } else if(isGeminiTTS){
        showTyping();
        try{const r=await api('/api/tts/gemini',{method:'POST',body:{text}});
          hideTyping();addMsg({role:'assistant',text:'🌐 Gemini TTS:',type:'audio',data:`data:audio/mp3;base64,${r.audio}`});}
        catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}

      } else if(isNanoBanana){
        showTyping();
        try{const r=await api('/api/image/nanobanana',{method:'POST',body:{prompt:text}});
          hideTyping();addMsg({role:'assistant',text:'🍌 Generated with Nano Banana 2:',type:'image',data:r.url});}
        catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}

      } else if(isSeedream5){
        showTyping();
        try{const r=await api('/api/image/seedream5',{method:'POST',body:{prompt:text}});
          hideTyping();addMsg({role:'assistant',text:'✨ Generated with Seedream 5:',type:'image',data:r.url});}
        catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}

      } else if(isVideoGen){
        toast('🎬 Generating video... ~60 seconds','success');showTyping();
        try{const r=await api('/api/video/generate',{method:'POST',body:{prompt:text}});
          hideTyping();addMsg({role:'assistant',text:`🎬 **Video ready!**\n\n[▶ Watch](${r.url})`});notify('NexusAI','Video ready! 🎬');}
        catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}

      } else if(isPixverse){
        toast('🎥 Generating cinematic video...','success');showTyping();
        try{const r=await api('/api/video/pixverse',{method:'POST',body:{prompt:text}});
          hideTyping();addMsg({role:'assistant',text:`🎥 **PixVerse Video ready!**\n\n[▶ Watch](${r.url})`});notify('NexusAI','PixVerse video ready! 🎥');}
        catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}

      } else if(isVideoFromImg){
        toast('📸 Animating image... ~60 seconds','success');showTyping();
        const vf=new FormData();
        if(img){const vb=atob(img.base64);const va=new Uint8Array(vb.length);for(let i=0;i<vb.length;i++)va[i]=vb.charCodeAt(i);vf.append('image',new Blob([va],{type:'image/png'}),'image.png');}
        if(text)vf.append('prompt',text);
        try{const r=await fetch(API+'/api/video/from-image',{method:'POST',headers:{Authorization:'Bearer '+S.token},body:vf});
          const d=await r.json();if(!r.ok)throw new Error(d.error);
          hideTyping();addMsg({role:'assistant',text:`📸 **Video from image ready!**\n\n[▶ Watch](${d.url})`});
          S.attachedImg=null;clearAttachPreview();notify('NexusAI','Video ready! 📸');}
        catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}

      } else if(isVeo){
        toast('🌟 Generating with Veo 3.1... ~90 seconds','success');showTyping();
        try{const r=await api('/api/video/veo',{method:'POST',body:{prompt:text}});
          hideTyping();addMsg({role:'assistant',text:`🌟 **Veo 3.1 Video ready!**\n\n[▶ Watch](${r.url})`});notify('NexusAI','Veo video ready! 🌟');}
        catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}

      } else if(isGrokVideo){
        toast('⚡ Generating with Grok...','success');showTyping();
        try{const r=await api('/api/video/grok',{method:'POST',body:{prompt:text}});
          hideTyping();addMsg({role:'assistant',text:`⚡ **Grok Video ready!**\n\n[▶ Watch](${r.url})`});notify('NexusAI','Grok video ready! ⚡');}
        catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}

      } else if(isTTS){
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
      // General chat — streaming mode
      const stylePrompt = STYLES[S.writingStyle]||'';
      const deepThink = S.thinkingMode === 'deep';

      if(deepThink){
        const msgs = document.getElementById('messages');
        const badge = document.createElement('div');
        badge.className='thinking-badge';badge.id='think-badge';
        badge.innerHTML='🧠 Thinking deeply...';
        msgs.appendChild(badge);scrollBottom();
        result=await api('/api/chat',{method:'POST',body:{
          input:text+(stylePrompt?`\n\n[Style: ${stylePrompt}]`:''),
          session_id:S.sessionId||undefined,deep_think:true,
        }});
        document.getElementById('think-badge')?.remove();
        S.sessionId=result.session_id;hideTyping();
        addMsg({role:'assistant',text:result.reply});
        renderLatex();notify('NexusAI','Deep thinking complete! ✅');
      } else {
        // STREAMING
        hideTyping();
        S.msgs.push({role:'assistant',text:'',_streaming:true});
        renderAllMsgs();
        let streamText='';
        try{
          const resp = await fetch(API+'/api/chat/stream',{
            method:'POST',
            headers:{'Content-Type':'application/json','Authorization':'Bearer '+S.token},
            body:JSON.stringify({input:text+(stylePrompt?`\n\n[Style: ${stylePrompt}]`:''),session_id:S.sessionId||undefined})
          });
          const reader = resp.body.getReader();
          const decoder = new TextDecoder();
          while(true){
            const {done,value} = await reader.read();
            if(done) break;
            const lines = decoder.decode(value).split('\n');
            for(const line of lines){
              if(!line.startsWith('data: '))continue;
              try{
                const d = JSON.parse(line.slice(6));
                if(d.token){
                  streamText+=d.token;
                  const last=S.msgs[S.msgs.length-1];
                  if(last?._streaming)last.text=streamText;
                  const msgEls=document.querySelectorAll('.msg.assistant');
                  const lastEl=msgEls[msgEls.length-1];
                  if(lastEl){
                    const bubble=lastEl.querySelector('.msg-bubble');
                    if(bubble)bubble.innerHTML=fmt(streamText)+'<span style="animation:cursorBlink 1s infinite;color:var(--a1)">▋</span>';
                  }
                  scrollBottom();
                }
                if(d.done){
                  S.sessionId=d.session_id;
                  const last=S.msgs[S.msgs.length-1];
                  if(last?._streaming){last.text=streamText;delete last._streaming;}
                  renderAllMsgs();renderLatex();
                }
              }catch(_){}
            }
          }
        }catch(e){
          const last=S.msgs[S.msgs.length-1];
          if(last?._streaming){last.text='❌ '+e.message;delete last._streaming;}
          renderAllMsgs();
        }
      }
    }

    // Refresh user
    try{S.user=await api('/api/me');updateUsage();loadHistory();}catch(_){}

    // Smart Suggestions — generate 3 follow-up questions
    showSmartSuggestions(text);
    renderLatex();

  }catch(e){
    hideTyping();
    addMsg({role:'assistant',text:'❌ '+e.message});
    toast(e.message,'error');
  }finally{
    document.getElementById('send-btn').disabled=false;
  }
}

// ── 1. SMART SUGGESTIONS ─────────────────────
async function showSmartSuggestions(lastInput){
  // Generate 3 follow-up questions in background
  try{
    const res = await openaiSuggest(lastInput);
    if(!res?.length) return;
    // Remove old suggestions
    document.getElementById('suggestions-row')?.remove();
    const wrap = document.createElement('div');
    wrap.id = 'suggestions-row';
    wrap.className = 'suggestions-row';
    wrap.innerHTML = '<div class="sugg-label">💡 You might also ask:</div>' +
      res.map(q=>`<button class="sugg-btn" onclick="useSuggestion('${q.replace(/'/g,"\\'")}')">${q}</button>`).join('');
    document.getElementById('messages').appendChild(wrap);
    scrollBottom();
  }catch(_){}
}

async function openaiSuggest(context){
  try{
    const d = await api('/api/suggest',{method:'POST',body:{context:context.slice(0,200)}});
    return d.suggestions||[];
  }catch(_){return[];}
}

function useSuggestion(text){
  document.getElementById('suggestions-row')?.remove();
  const input = document.getElementById('msg-input');
  if(input){ input.value=text; input.focus(); autoGrow(input); }
}

// ── 2. VOICE RESPONSE ────────────────────────
async function speakResponse(text){
  if(!text) return;
  try{
    const result = await api('/api/tts',{method:'POST',body:{text:text.slice(0,500),voice:'nova'}});
    const audio = new Audio(`data:audio/mp3;base64,${result.audio}`);
    audio.play();
    toast('🔊 Playing response...','success');
  }catch(e){ toast(e.message,'error'); }
}

// ── 3. AI DEBATE ─────────────────────────────
async function startDebate(topic){
  if(!topic){
    const input = document.getElementById('msg-input')?.value?.trim();
    if(!input){ toast('Enter a topic first','error'); return; }
    topic = input;
    document.getElementById('msg-input').value='';
  }
  addMsg({role:'user', text:`🥊 Debate: ${topic}`});
  showTyping();
  try{
    const [pro, con] = await Promise.all([
      api('/api/chat',{method:'POST',body:{input:`Argue strongly FOR this: "${topic}". Give 3 compelling arguments. Be persuasive.`}}),
      api('/api/chat',{method:'POST',body:{input:`Argue strongly AGAINST this: "${topic}". Give 3 compelling counter-arguments. Be persuasive.`}})
    ]);
    hideTyping();
    addMsg({role:'assistant', text:`**✅ FOR:**\n${pro.reply}\n\n**❌ AGAINST:**\n${con.reply}`});
  }catch(e){ hideTyping(); toast(e.message,'error'); }
}

// ── 4. CODE RUNNER ───────────────────────────
function runCode(code){
  // Run JS code in iframe sandbox
  const html = `<!DOCTYPE html><html><head><style>
    body{font-family:monospace;padding:12px;background:#1a1a2e;color:#ececec;font-size:13px}
    .output{white-space:pre-wrap}
    .error{color:#f87171}
  </style></head><body>
  <div id="out" class="output"></div>
  <script>
    const out=document.getElementById('out');
    const log=console.log;
    console.log=(...a)=>{out.innerHTML+=a.join(' ')+'\\n';log(...a);};
    console.error=(...a)=>{out.innerHTML+='<span class="error">'+a.join(' ')+'</span>\\n';};
    try{${code}}catch(e){out.innerHTML+='<span class="error">Error: '+e.message+'</span>';}
  <\/script></body></html>`;
  const blob = new Blob([html],{type:'text/html'});
  const url  = URL.createObjectURL(blob);
  // Show in modal
  const modal = document.createElement('div');
  modal.style.cssText='position:fixed;inset:0;z-index:999;background:#00000090;display:flex;align-items:center;justify-content:center;';
  modal.innerHTML=`
    <div style="background:#1a1a2e;border:1px solid #383838;border-radius:14px;width:90%;max-width:600px;overflow:hidden">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #383838">
        <span style="font-size:14px;font-weight:500">▶ Code Output</span>
        <button onclick="this.closest('div[style]').remove();URL.revokeObjectURL('${url}')" style="color:#8e8ea0;font-size:16px;cursor:pointer">✕</button>
      </div>
      <iframe src="${url}" style="width:100%;height:300px;border:none"></iframe>
    </div>`;
  document.body.appendChild(modal);
  modal.onclick = e=>{ if(e.target===modal){ modal.remove(); URL.revokeObjectURL(url); }};
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
  if(!t) return '';
  // Escape HTML first (but preserve code blocks)
  const codeBlocks = [];
  t = t.replace(/```(\w*)\n?([\s\S]*?)```/g, (_,lang,code)=>{
    const i = codeBlocks.length;
    const escaped = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const langLabel = lang ? `<div class="code-lang">${lang}</div>` : '';
    const highlighted = highlightCode(escaped, lang);
    codeBlocks.push(`<div class="code-block">
      <div class="code-header">
        ${langLabel}
        <button class="code-copy" onclick="copyCode(this)">Copy</button>
      </div>
      <pre><code class="lang-${lang||'text'}">${highlighted}</code></pre>
    </div>`);
    return `%%CODEBLOCK_${i}%%`;
  });

  // Escape remaining HTML
  t = t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // Inline code
  t = t.replace(/`([^`]+)`/g,'<code class="inline-code">$1</code>');

  // Bold + italic
  t = t.replace(/\*\*\*(.*?)\*\*\*/g,'<strong><em>$1</em></strong>');
  t = t.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
  t = t.replace(/\*(.*?)\*/g,'<em>$1</em>');

  // Headers
  t = t.replace(/^### (.+)$/gm,'<h3>$1</h3>');
  t = t.replace(/^## (.+)$/gm,'<h2>$1</h2>');
  t = t.replace(/^# (.+)$/gm,'<h1>$1</h1>');

  // Horizontal rule
  t = t.replace(/^---+$/gm,'<hr/>');

  // Blockquote
  t = t.replace(/^&gt; (.+)$/gm,'<blockquote>$1</blockquote>');

  // Tables
  t = t.replace(/^\|(.+)\|$/gm, (match) => {
    if(match.includes('---')) return '<tr class="table-divider"></tr>';
    const cells = match.split('|').filter(c=>c.trim());
    return '<tr>' + cells.map(c=>`<td>${c.trim()}</td>`).join('') + '</tr>';
  });
  t = t.replace(/(<tr>[\s\S]*?<\/tr>(\n<tr>[\s\S]*?<\/tr>)*)/g,
    '<div class="md-table"><table>$1</table></div>');

  // Unordered lists
  t = t.replace(/(^[*\-] .+$(\n[*\-] .+$)*)/gm, (match) => {
    const items = match.split('\n').filter(l=>l.trim());
    return '<ul>' + items.map(i=>`<li>${i.replace(/^[*\-] /,'')}</li>`).join('') + '</ul>';
  });

  // Ordered lists
  t = t.replace(/(^\d+\. .+$(\n\d+\. .+$)*)/gm, (match) => {
    const items = match.split('\n').filter(l=>l.trim());
    return '<ol>' + items.map(i=>`<li>${i.replace(/^\d+\. /,'')}</li>`).join('') + '</ol>';
  });

  // Line breaks
  t = t.replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br/>');
  t = `<p>${t}</p>`;

  // Restore code blocks
  codeBlocks.forEach((block,i)=>{
    t = t.replace(`%%CODEBLOCK_${i}%%`, block);
  });

  return t;
}

// Simple syntax highlighting
function highlightCode(code, lang){
  if(!lang) return code;
  const keywords = {
    js:      /\b(const|let|var|function|return|if|else|for|while|class|import|export|async|await|try|catch|new|this|null|undefined|true|false)\b/g,
    python:  /\b(def|class|import|from|return|if|elif|else|for|while|try|except|with|as|pass|lambda|True|False|None)\b/g,
    html:    /(&lt;\/?[\w\s="/.':;#,\-]+&gt;)/g,
    css:     /([a-z-]+)(?=\s*:)/g,
  };
  const strings = /(".*?"|'.*?'|`.*?`)/g;
  const comments = /(\/\/.*$|#.*$|\/\*[\s\S]*?\*\/)/gm;
  const numbers = /\b(\d+\.?\d*)\b/g;

  code = code.replace(comments, '<span class="c-comment">$1</span>');
  code = code.replace(strings, '<span class="c-string">$1</span>');
  if(keywords[lang]) code = code.replace(keywords[lang], '<span class="c-keyword">$1</span>');
  code = code.replace(numbers, '<span class="c-number">$1</span>');
  return code;
}

function copyCode(btn){
  const code = btn.closest('.code-block').querySelector('code').innerText;
  navigator.clipboard.writeText(code).catch(()=>{});
  btn.textContent = 'Copied!';
  setTimeout(()=>btn.textContent='Copy', 2000);
}
function esc(t){return(t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function toast(msg,type=''){
  const wrap=document.getElementById('toasts');
  const el=document.createElement('div');
  el.className='toast '+type;el.textContent=msg;
  wrap.appendChild(el);
  setTimeout(()=>{el.style.opacity='0';el.style.transition='opacity .3s';setTimeout(()=>el.remove(),300);},3000);
}

// ── AI AGENTS ────────────────────────────────
const AGENT_LIST = [
  {id:'research', e:'🔍', name:'Research Agent',    desc:'Search + analyze + report'},
  {id:'code',     e:'💻', name:'Code Agent',         desc:'Plan + write + review code'},
  {id:'content',  e:'📱', name:'Content Agent',      desc:'TikTok + Instagram + Twitter'},
  {id:'business', e:'📈', name:'Business Agent',     desc:'Market + plan + strategy'},
  {id:'seo',      e:'🔎', name:'SEO Agent',          desc:'Keywords + content + report'},
  {id:'study',    e:'📚', name:'Study Agent',        desc:'Plan + flashcards + quiz'},
  {id:'email',    e:'📧', name:'Email Agent',        desc:'7-email sequence'},
  {id:'creative', e:'🎨', name:'Creative Agent',     desc:'Story + characters + prompts'},
  {id:'sales',    e:'🤝', name:'Sales Agent',        desc:'Pitch + script + funnel'},
  {id:'data',     e:'📊', name:'Data Agent',         desc:'Analysis + insights + KPIs'},
];

async function runAgent(agentId, input){
  if(!input){
    const i = document.getElementById('msg-input')?.value?.trim();
    if(!i){ toast('Enter your topic first','error'); return; }
    input = i;
    document.getElementById('msg-input').value='';
  }
  const agent = AGENT_LIST.find(a=>a.id===agentId);
  if(!agent) return;

  addMsg({role:'user', text:`${agent.e} **${agent.name}**: ${input}`});

  // Show steps progress
  const thread = document.getElementById('messages');
  const stepsEl = document.createElement('div');
  stepsEl.className='msg assistant';stepsEl.id='agent-steps';
  stepsEl.innerHTML=`
    <div class="ai-avatar-wrap">${AI_AVATAR_SVG}</div>
    <div class="msg-body">
      <div class="msg-bubble">
        <div class="agent-running">
          <div class="agent-name">${agent.e} ${agent.name} running...</div>
          <div class="agent-steps-list" id="agent-steps-list">
            <div class="agent-step running">⏳ Starting agent...</div>
          </div>
        </div>
      </div>
    </div>`;
  thread.appendChild(stepsEl);
  scrollBottom();

  try{
    const result = await api('/api/agent/run',{method:'POST',body:{agent_id:agentId,input}});
    stepsEl.remove();

    // Show steps summary
    const stepsText = result.steps?.map(s=>`${s.status==='done'?'✅':'⏳'} ${s.step}`).join('\n')||'';
    let finalText = `**${result.agent_emoji} ${result.agent_name} Complete!**\n\n`;
    if(stepsText) finalText += `${stepsText}\n\n---\n\n`;
    finalText += result.result||'';

    if(result.sources?.length){
      finalText += '\n\n**Sources:**\n' + result.sources.map((s,i)=>`[${i+1}] [${s.title}](${s.url})`).join('\n');
    }

    addMsg({role:'assistant', text:finalText});
    renderLatex();
    notify(result.agent_name, 'Agent task complete! ✅');
    try{S.user=await api('/api/me');updateUsage();}catch(_){}

  }catch(e){
    stepsEl.remove();
    addMsg({role:'assistant',text:'❌ Agent error: '+e.message});
    toast(e.message,'error');
  }
}

function navigate_agents(){
  S.page='agents';
  closeSidebar();
  document.getElementById('tool-label').textContent='🤖 AI Agents';
  document.getElementById('tool-sub').textContent='10 specialized agents';
  document.getElementById('messages').innerHTML=`
    <div class="page-wrap">
      <div class="page-title">🤖 AI Agents</div>
      <p style="color:var(--t2);font-size:14px;margin-bottom:20px">Each agent runs multiple steps automatically to complete complex tasks.</p>
      <div class="agents-grid">
        ${AGENT_LIST.map(a=>`
        <div class="agent-card" onclick="promptAgent('${a.id}')">
          <div class="agent-emoji">${a.e}</div>
          <div class="agent-card-name">${a.name}</div>
          <div class="agent-card-desc">${a.desc}</div>
          <button class="agent-run-btn">Run Agent →</button>
        </div>`).join('')}
      </div>
    </div>`;
}

function promptAgent(id){
  const agent = AGENT_LIST.find(a=>a.id===id);
  if(!agent) return;
  const input = prompt(`${agent.e} ${agent.name}\n\nEnter your topic or task:`);
  if(input?.trim()){
    // Go to chat
    document.getElementById('tool-label').textContent=agent.e+' '+agent.name;
    document.getElementById('tool-sub').textContent='AI Agent';
    document.getElementById('messages').innerHTML='';
    runAgent(id, input.trim());
  }
}

// ── AI WORKFLOWS ─────────────────────────────
let workflowSteps = [];

function navigate_workflow(){
  S.page='workflow';
  closeSidebar();
  document.getElementById('tool-label').textContent='🔄 AI Workflows';
  document.getElementById('tool-sub').textContent='Chain tools together';
  renderWorkflowBuilder();
}

function renderWorkflowBuilder(){
  document.getElementById('messages').innerHTML=`
    <div class="page-wrap">
      <div class="page-title">🔄 AI Workflow Builder</div>
      <p style="color:var(--t2);font-size:14px;margin-bottom:20px">Chain multiple AI tools together. Output of each step becomes input for the next.</p>

      <div class="workflow-builder">
        <div class="workflow-input-wrap">
          <label style="font-size:12px;color:var(--t3);text-transform:uppercase;letter-spacing:.5px">Starting input</label>
          <textarea id="wf-input" placeholder="Enter your starting text or topic..." rows="3"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:12px;font-size:14px;color:var(--text);outline:none;resize:none;margin-top:6px"></textarea>
        </div>

        <div style="margin:16px 0">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div style="font-size:13px;font-weight:500">Workflow Steps</div>
            <div style="font-size:11px;color:var(--t3)">Max 5 steps</div>
          </div>
          <div id="wf-steps"></div>
          ${workflowSteps.length<5?`
          <button onclick="addWorkflowStep()" style="width:100%;padding:10px;border:2px dashed var(--border);border-radius:10px;color:var(--t2);font-size:13px;cursor:pointer;transition:.15s;margin-top:8px"
            onmouseover="this.style.borderColor='var(--a1)';this.style.color='var(--text)'"
            onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--t2)'">
            + Add Step
          </button>`:''}
        </div>

        <div style="display:flex;gap:8px">
          <button onclick="runWorkflow()" style="flex:1;padding:12px;background:var(--grad);color:#000;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer">
            ▶ Run Workflow
          </button>
          <button onclick="workflowSteps=[];renderWorkflowBuilder()" style="padding:12px 16px;border:1px solid var(--border);border-radius:10px;color:var(--t2);font-size:13px;cursor:pointer">
            Reset
          </button>
        </div>

        <!-- Presets -->
        <div style="margin-top:20px">
          <div style="font-size:12px;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Quick Presets</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            <button class="tpl-btn" onclick="loadPreset('research')">🔍 Research → Summary → Translate</button>
            <button class="tpl-btn" onclick="loadPreset('content')">📝 Summarize → TikTok → Hashtags</button>
            <button class="tpl-btn" onclick="loadPreset('business')">💼 Idea → Business Plan → Pitch</button>
            <button class="tpl-btn" onclick="loadPreset('code')">💻 Requirements → Code → Review</button>
          </div>
        </div>
      </div>
    </div>`;
  renderWorkflowSteps();
}

function renderWorkflowSteps(){
  const el = document.getElementById('wf-steps');
  if(!el) return;
  el.innerHTML = workflowSteps.map((s,i)=>`
    <div class="wf-step">
      <div class="wf-step-num">${i+1}</div>
      <select class="wf-step-select" onchange="workflowSteps[${i}]=this.value">
        ${TOOLS.slice(0,50).map(t=>`<option value="${t.id}" ${s===t.id?'selected':''}>${t.e} ${t.name}</option>`).join('')}
      </select>
      <button onclick="workflowSteps.splice(${i},1);renderWorkflowBuilder()" style="color:var(--t3);padding:4px 8px;border-radius:5px;font-size:12px">✕</button>
    </div>
    ${i<workflowSteps.length-1?'<div class="wf-arrow">↓</div>':''}`
  ).join('');
}

function addWorkflowStep(){
  if(workflowSteps.length>=5){ toast('Max 5 steps','error'); return; }
  workflowSteps.push('summarize');
  renderWorkflowBuilder();
}

function loadPreset(preset){
  const presets = {
    research: ['summarize','translate','mindmap'],
    content:  ['summarize','tiktok-script','hashtags'],
    business: ['idea-to-plan','business-plan','pitch-deck'],
    code:     ['code-explain','code-review','docs-writer'],
  };
  workflowSteps = presets[preset]||[];
  renderWorkflowBuilder();
  toast('Preset loaded!','success');
}

async function runWorkflow(){
  const input = document.getElementById('wf-input')?.value?.trim();
  if(!input){ toast('Enter starting input','error'); return; }
  if(!workflowSteps.length){ toast('Add at least one step','error'); return; }

  addMsg({role:'user', text:`🔄 **Workflow** (${workflowSteps.length} steps):\n${input}`});
  showTyping();

  try{
    const result = await api('/api/workflow/run',{method:'POST',body:{steps:workflowSteps.map(id=>({tool_id:id})),input}});
    hideTyping();

    let text = `🔄 **Workflow Complete!**\n\n`;
    result.results?.forEach((r,i)=>{
      text += `**Step ${i+1}: ${r.tool_name}**\n${r.output?.slice(0,300)||r.error||''}...\n\n`;
    });
    text += `---\n**Final Output:**\n${result.final_output||''}`;

    addMsg({role:'assistant',text});
    notify('Workflow','All steps complete! ✅');
    try{S.user=await api('/api/me');updateUsage();}catch(_){}
  }catch(e){
    hideTyping();
    addMsg({role:'assistant',text:'❌ '+e.message});
    toast(e.message,'error');
  }
}

// ── VOICE CLONING ─────────────────────────────
async function cloneVoiceTTS(text, voiceId){
  try{
    const result = await api('/api/voice/clone-tts',{method:'POST',body:{text,voice_id:voiceId}});
    const audioUrl = `data:audio/mp3;base64,${result.audio}`;
    const audio = new Audio(audioUrl);
    audio.play();
    toast(`🎤 Playing with ${result.provider==='elevenlabs'?'ElevenLabs':'AI'} voice`,'success');
  }catch(e){ toast(e.message,'error'); }
}
const CAT_META = {
  ai:          {e:'🧠', name:'AI Essentials'},
  code:        {e:'💻', name:'Code & Dev'},
  business:    {e:'📈', name:'Business'},
  content:     {e:'📱', name:'Content'},
  media:       {e:'🎨', name:'Image & Media'},
  video:       {e:'🎬', name:'Video & Film'},
  audio:       {e:'🔊', name:'Voice & Audio'},
  productivity:{e:'⚡', name:'Productivity'},
  students:    {e:'🎓', name:'Students'},
  health:      {e:'🏥', name:'Health & Wellness'},
  finance:     {e:'💰', name:'Finance'},
  travel:      {e:'✈️', name:'Travel'},
  food:        {e:'🍕', name:'Food & Recipes'},
  legal:       {e:'⚖️', name:'Legal'},
  education:   {e:'📚', name:'Education'},
  marketing:   {e:'📢', name:'Marketing'},
  science:     {e:'🔬', name:'Science'},
  creative:    {e:'✨', name:'Creative Writing'},
  hr:          {e:'👥', name:'HR & People'},
};

// ── 🧠 INTELLIGENCE FEATURES UI ──────────────

async function sendFeedback(msgIndex, rating){
  if(!S.sessionId)return;
  try{
    await api('/api/feedback',{method:'POST',body:{session_id:S.sessionId,message_index:msgIndex,rating}});
    toast(rating>0?'👍 Thanks!':'👎 We\'ll improve!','success');
  }catch(_){}
}

async function navigate_goals(){
  S.page='goals';closeSidebar();
  document.getElementById('tool-label').textContent='🎯 Goals';
  document.getElementById('messages').innerHTML='<div class="page-wrap"><div class="page-title">🎯 Goals</div><div style="color:var(--t2)">Loading...</div></div>';
  try{
    const {goals=[]}=await api('/api/goals');
    document.getElementById('messages').innerHTML=`<div class="page-wrap">
      <div class="page-title">🎯 My Goals</div>
      <button onclick="addGoal()" style="background:var(--grad);color:#000;border:none;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;margin-bottom:16px">+ Add Goal</button>
      ${goals.length?goals.map(g=>`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:8px;display:flex;align-items:center;gap:12px">
        <div style="flex:1"><div style="font-size:13px;font-weight:500">${esc(g.goal)}</div><div style="font-size:11px;color:var(--t3)">${g.status} · ${new Date(g.created_at).toLocaleDateString()}</div></div>
        <button onclick="completeGoal(${g.id})" style="font-size:11px;padding:4px 8px;border:1px solid var(--a1);border-radius:5px;color:var(--a1);background:none;cursor:pointer">✓ Done</button>
      </div>`).join(''):'<div style="color:var(--t2);padding:40px;text-align:center">No goals yet. AI auto-detects your goals from conversations!</div>'}
    </div>`;
  }catch(e){toast(e.message,'error');}
}

async function addGoal(){
  const goal=prompt('What is your goal?');if(!goal)return;
  await api('/api/goals',{method:'POST',body:{goal}});
  toast('Goal added! ✅','success');navigate_goals();
}

async function completeGoal(id){
  await api('/api/goals/'+id,{method:'PATCH',body:{status:'completed'}});
  toast('Goal completed! 🎉','success');navigate_goals();
}

async function decomposeInChat(){
  const input=document.getElementById('msg-input')?.value?.trim();
  if(!input){toast('Enter a task first','error');return;}
  document.getElementById('msg-input').value='';
  addMsg({role:'user',text:`🔧 Decompose: ${input}`});showTyping();
  try{
    const d=await api('/api/decompose',{method:'POST',body:{task:input}});
    hideTyping();
    addMsg({role:'assistant',text:`**📋 Task Breakdown:**\n\n${(d.steps||[]).map((s,i)=>`${i+1}. ${s}`).join('\n')}`});
  }catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}
}

async function analyzeDecisionInChat(){
  const input=document.getElementById('msg-input')?.value?.trim();
  if(!input){toast('Enter your decision question','error');return;}
  document.getElementById('msg-input').value='';
  addMsg({role:'user',text:`⚖️ Decision: ${input}`});showTyping();
  try{
    const d=await api('/api/decision',{method:'POST',body:{question:input}});
    hideTyping();
    addMsg({role:'assistant',text:`**⚖️ Decision Analysis**\n\n**✅ Pros:**\n${(d.pros||[]).map(p=>`• ${p}`).join('\n')}\n\n**❌ Cons:**\n${(d.cons||[]).map(c=>`• ${c}`).join('\n')}\n\n**💡 Recommendation:** ${d.recommendation||''}\n\n**Confidence:** ${d.confidence||0}%`});
  }catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}
}

async function parallelThinkingInChat(){
  const input=document.getElementById('msg-input')?.value?.trim();
  if(!input){toast('Enter a topic','error');return;}
  document.getElementById('msg-input').value='';
  addMsg({role:'user',text:`🧩 Perspectives: ${input}`});showTyping();
  try{
    const d=await api('/api/perspectives',{method:'POST',body:{topic:input}});
    hideTyping();
    addMsg({role:'assistant',text:`**🧩 Multiple Perspectives**\n\n😊 **Optimist:**\n${d.perspectives.optimist}\n\n😟 **Pessimist:**\n${d.perspectives.pessimist}\n\n🎯 **Realist:**\n${d.perspectives.realist}\n\n💡 **Creative:**\n${d.perspectives.creative}`});
  }catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}
}

async function simulateScenarioInChat(){
  const input=document.getElementById('msg-input')?.value?.trim();
  if(!input){toast('Describe your scenario','error');return;}
  document.getElementById('msg-input').value='';
  addMsg({role:'user',text:`🎲 Simulate: ${input}`});showTyping();
  try{
    const d=await api('/api/simulate',{method:'POST',body:{scenario:input}});
    hideTyping();addMsg({role:'assistant',text:`**🎲 Scenario Simulation:**\n\n${d.simulation}`});
  }catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}
}

async function navigate_insights(){
  S.page='insights';closeSidebar();
  document.getElementById('tool-label').textContent='🧠 Insights';
  document.getElementById('messages').innerHTML='<div class="page-wrap"><div class="page-title">🧠 Insights</div><div style="color:var(--t2)">Loading...</div></div>';
  try{
    const d=await api('/api/insights');
    document.getElementById('messages').innerHTML=`<div class="page-wrap">
      <div class="page-title">🧠 AI Insights About You</div>
      <div class="dash-stats" style="margin-bottom:20px">
        <div class="dash-card"><div class="dash-num">${d.positiveRatings||0}</div><div class="dash-lbl">👍 Good</div></div>
        <div class="dash-card"><div class="dash-num">${d.negativeRatings||0}</div><div class="dash-lbl">👎 Improved</div></div>
        <div class="dash-card"><div class="dash-num">${d.goals?.length||0}</div><div class="dash-lbl">🎯 Goals</div></div>
        <div class="dash-card"><div class="dash-num">${d.intents?.length||0}</div><div class="dash-lbl">💡 Topics</div></div>
      </div>
      ${(d.intents||[]).map(i=>`<div style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;margin-bottom:6px">
        <span style="font-size:13px;flex:1">${i.intent}</span>
        <span style="font-size:12px;color:var(--a1);font-weight:600">${i.count}x</span>
      </div>`).join('')}
    </div>`;
  }catch(e){toast(e.message,'error');}
}

// ── 🤖 AGENTS & AUTOMATION UI ─────────────────

async function navigate_automation(){
  S.page='automation';closeSidebar();
  document.getElementById('tool-label').textContent='⚡ Automation';
  document.getElementById('messages').innerHTML=`<div class="page-wrap">
    <div class="page-title">⚡ Automation Hub</div>
    <p style="color:var(--t2);font-size:14px;margin-bottom:20px">Automate repetitive tasks with AI.</p>
    <div class="agents-grid">
      <div class="agent-card" onclick="autoEmail()">
        <div class="agent-emoji">📧</div>
        <div class="agent-card-name">Email Generator</div>
        <div class="agent-card-desc">Generate professional emails automatically</div>
        <button class="agent-run-btn">Run →</button>
      </div>
      <div class="agent-card" onclick="autoSocial()">
        <div class="agent-emoji">📱</div>
        <div class="agent-card-name">Social Media</div>
        <div class="agent-card-desc">Create posts for all platforms at once</div>
        <button class="agent-run-btn">Run →</button>
      </div>
      <div class="agent-card" onclick="autoCRM()">
        <div class="agent-emoji">💼</div>
        <div class="agent-card-name">CRM Automation</div>
        <div class="agent-card-desc">Qualify leads and generate outreach</div>
        <button class="agent-run-btn">Run →</button>
      </div>
      <div class="agent-card" onclick="autoScrape()">
        <div class="agent-emoji">🕷️</div>
        <div class="agent-card-name">Web Scraper</div>
        <div class="agent-card-desc">Extract data from any website</div>
        <button class="agent-run-btn">Run →</button>
      </div>
      <div class="agent-card" onclick="autoLeads()">
        <div class="agent-emoji">🎯</div>
        <div class="agent-card-name">Lead Generation</div>
        <div class="agent-card-desc">Generate lead strategies and lists</div>
        <button class="agent-run-btn">Run →</button>
      </div>
      <div class="agent-card" onclick="navigate_tasks()">
        <div class="agent-emoji">⏰</div>
        <div class="agent-card-name">Scheduled Tasks</div>
        <div class="agent-card-desc">Automate recurring AI tasks</div>
        <button class="agent-run-btn">View →</button>
      </div>
      <div class="agent-card" onclick="navigate_queue()">
        <div class="agent-emoji">📋</div>
        <div class="agent-card-name">Job Queue</div>
        <div class="agent-card-desc">Monitor background AI jobs</div>
        <button class="agent-run-btn">View →</button>
      </div>
      <div class="agent-card" onclick="navigate_logs()">
        <div class="agent-emoji">📊</div>
        <div class="agent-card-name">Automation Logs</div>
        <div class="agent-card-desc">Track all automation activity</div>
        <button class="agent-run-btn">View →</button>
      </div>
    </div>
  </div>`;
}

async function autoEmail(){
  const subject=prompt('Email subject topic:');if(!subject)return;
  const body=prompt('Email body/purpose:');if(!body)return;
  const tone=prompt('Tone (professional/friendly/formal):',)||'professional';
  document.getElementById('tool-label').textContent='📧 Email Generator';
  document.getElementById('messages').innerHTML='';
  addMsg({role:'user',text:`Generate email:\nSubject: ${subject}\nBody: ${body}\nTone: ${tone}`});showTyping();
  try{
    const d=await api('/api/automation/email',{method:'POST',body:{subject_prompt:subject,body_prompt:body,tone}});
    hideTyping();
    addMsg({role:'assistant',text:`**📧 Generated Email:**\n\n**Subject:** ${d.subject}\n\n**Body:**\n${d.body}`});
  }catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}
}

async function autoSocial(){
  const topic=prompt('Topic for social media posts:');if(!topic)return;
  addMsg({role:'user',text:`Create social media posts about: ${topic}`});showTyping();
  try{
    const d=await api('/api/automation/social',{method:'POST',body:{topic,platforms:['twitter','linkedin','instagram','tiktok']}});
    hideTyping();
    let text='**📱 Social Media Posts:**\n\n';
    for(const [platform,post] of Object.entries(d.posts)){
      text+=`**${platform.toUpperCase()}:**\n${post}\n\n`;
    }
    addMsg({role:'assistant',text});
  }catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}
}

async function autoCRM(){
  const lead=prompt('Describe the lead (name, company, role, context):');if(!lead)return;
  const action=prompt('Action (qualify/email/followup/proposal):',)||'qualify';
  addMsg({role:'user',text:`CRM: ${action} lead: ${lead}`});showTyping();
  try{
    const d=await api('/api/automation/crm',{method:'POST',body:{lead_info:lead,action}});
    hideTyping();addMsg({role:'assistant',text:`**💼 CRM ${action}:**\n\n${d.result}`});
  }catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}
}

async function autoScrape(){
  const url=prompt('Website URL to scrape:');if(!url)return;
  const extract=prompt('What to extract:','main content')||'main content';
  addMsg({role:'user',text:`🕷️ Scrape: ${url}\nExtract: ${extract}`});showTyping();
  try{
    const d=await api('/api/automation/scrape',{method:'POST',body:{url,extract}});
    hideTyping();addMsg({role:'assistant',text:`**🕷️ Extracted from ${url}:**\n\n${d.extracted}`});
  }catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}
}

async function autoLeads(){
  const industry=prompt('Industry:');if(!industry)return;
  const target=prompt('Target audience:','decision makers')||'decision makers';
  addMsg({role:'user',text:`🎯 Lead generation for ${industry} targeting ${target}`});showTyping();
  try{
    const d=await api('/api/automation/leads',{method:'POST',body:{industry,target}});
    hideTyping();addMsg({role:'assistant',text:`**🎯 Lead Generation Strategy:**\n\n${d.strategy}`});
  }catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}
}

async function navigate_tasks(){
  S.page='tasks';
  document.getElementById('messages').innerHTML='<div class="page-wrap"><div class="page-title">⏰ Scheduled Tasks</div><div style="color:var(--t2)">Loading...</div></div>';
  try{
    const {tasks=[]}=await api('/api/tasks');
    document.getElementById('messages').innerHTML=`<div class="page-wrap">
      <div class="page-title">⏰ Scheduled Tasks</div>
      <button onclick="createTask()" style="background:var(--grad);color:#000;border:none;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;margin-bottom:16px">+ Create Task</button>
      ${tasks.length?tasks.map(t=>`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:8px;display:flex;align-items:center;gap:12px">
        <div style="flex:1">
          <div style="font-size:13px;font-weight:500">${esc(t.name)}</div>
          <div style="font-size:11px;color:var(--t3)">${t.task_type} · ${t.schedule} · ${t.status}</div>
        </div>
        <span style="font-size:11px;padding:3px 8px;border-radius:99px;background:${t.status==='active'?'#c6f13520':'var(--bg3)'};color:${t.status==='active'?'var(--a1)':'var(--t3)'}">${t.status}</span>
      </div>`).join(''):'<div style="color:var(--t2);padding:40px;text-align:center">No scheduled tasks yet.</div>'}
    </div>`;
  }catch(e){toast(e.message,'error');}
}

async function createTask(){
  const name=prompt('Task name:');if(!name)return;
  const type=prompt('Task type (ai_chat/summarize/translate):','ai_chat')||'ai_chat';
  const schedule=prompt('Schedule (daily/weekly/hourly):','daily')||'daily';
  const input=prompt('Task input/prompt:');if(!input)return;
  await api('/api/tasks',{method:'POST',body:{name,task_type:type,config:{input},schedule}});
  toast('Task created! ✅','success');navigate_tasks();
}

async function navigate_queue(){
  S.page='queue';
  document.getElementById('messages').innerHTML='<div class="page-wrap"><div class="page-title">📋 Job Queue</div><div style="color:var(--t2)">Loading...</div></div>';
  try{
    const {jobs=[]}=await api('/api/queue');
    document.getElementById('messages').innerHTML=`<div class="page-wrap">
      <div class="page-title">📋 Background Jobs</div>
      ${jobs.length?jobs.map(j=>`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:12px">
        <div style="flex:1">
          <div style="font-size:13px;font-weight:500">${j.job_type}</div>
          <div style="font-size:11px;color:var(--t3)">${j.status} · ${new Date(j.created_at).toLocaleString()}</div>
          ${j.result?`<div style="font-size:12px;color:var(--t2);margin-top:4px">${esc(j.result.slice(0,80))}</div>`:''}
        </div>
        <span style="font-size:11px;padding:3px 8px;border-radius:99px;background:${j.status==='done'?'#c6f13520':j.status==='failed'?'#f8717120':'var(--bg3)'};color:${j.status==='done'?'var(--a1)':j.status==='failed'?'#f87171':'var(--t3)'}">${j.status}</span>
        ${j.status==='failed'?`<button onclick="retryJob(${j.id})" style="font-size:11px;padding:3px 8px;border:1px solid var(--border);border-radius:5px;cursor:pointer;background:none;color:var(--t2)">Retry</button>`:''}
      </div>`).join(''):'<div style="color:var(--t2);padding:40px;text-align:center">No jobs yet.</div>'}
    </div>`;
  }catch(e){toast(e.message,'error');}
}

async function retryJob(id){
  await api('/api/queue/'+id+'/retry',{method:'POST'});
  toast('Job retrying...','success');navigate_queue();
}

async function navigate_logs(){
  S.page='logs';
  document.getElementById('messages').innerHTML='<div class="page-wrap"><div class="page-title">📊 Automation Logs</div><div style="color:var(--t2)">Loading...</div></div>';
  try{
    const {logs=[]}=await api('/api/logs');
    document.getElementById('messages').innerHTML=`<div class="page-wrap">
      <div class="page-title">📊 Automation Logs</div>
      ${logs.length?logs.map(l=>`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:6px;display:flex;align-items:center;gap:10px">
        <span style="font-size:11px;background:var(--bg3);padding:2px 8px;border-radius:99px;color:var(--a2);flex-shrink:0">${l.event}</span>
        <span style="font-size:12px;color:var(--t2);flex:1">${esc(l.details||'')}</span>
        <span style="font-size:11px;color:var(--t3)">${new Date(l.created_at).toLocaleTimeString()}</span>
      </div>`).join(''):'<div style="color:var(--t2);padding:40px;text-align:center">No automation logs yet.</div>'}
    </div>`;
  }catch(e){toast(e.message,'error');}
}

function toggleCatGrid(){
  const overlay = document.getElementById('cat-overlay');
  const btn = document.getElementById('cat-grid-btn');
  if(overlay.style.display==='none'||!overlay.style.display){
    overlay.style.display='block';
    btn.classList.add('active');
    showCatsGrid();
  } else {
    closeCatGrid();
  }
}

function closeCatGrid(){
  document.getElementById('cat-overlay').style.display='none';
  document.getElementById('cat-grid-btn').classList.remove('active');
}

function showCatsGrid(){
  document.getElementById('cat-panel-title').textContent='Browse Tools';
  // Get unique cats with counts
  const cats = {};
  TOOLS.forEach(t=>{
    if(!cats[t.cat]) cats[t.cat]={count:0,...(CAT_META[t.cat]||{e:'🔧',name:t.cat})};
    cats[t.cat].count++;
  });
  document.getElementById('cat-panel-body').innerHTML=`
    <div class="cats-grid">
      ${Object.entries(cats).map(([cat,info])=>`
        <button class="cat-card" onclick="showCatTools('${cat}','${info.name}')">
          <span class="cat-card-emoji">${info.e}</span>
          <div class="cat-card-name">${info.name}</div>
          <div class="cat-card-count">${info.count} tools</div>
        </button>`).join('')}
    </div>`;
}

function showCatTools(cat, name){
  document.getElementById('cat-panel-title').textContent=name;
  const tools = TOOLS.filter(t=>t.cat===cat);
  document.getElementById('cat-panel-body').innerHTML=`
    <button class="cat-back-btn" onclick="showCatsGrid()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      All Categories
    </button>
    <div class="tools-grid-panel">
      ${tools.map(t=>`
        <button class="tool-grid-card" onclick="selectToolFromGrid('${t.id}')">
          <span class="tool-grid-emoji">${t.e}</span>
          <div class="tool-grid-name">${t.name}</div>
        </button>`).join('')}
    </div>`;
}

function selectToolFromGrid(id){
  closeCatGrid();
  selectTool(id);
}

// Close when clicking overlay background
document.addEventListener('click', e=>{
  const overlay = document.getElementById('cat-overlay');
  const panel = document.getElementById('cat-panel');
  if(overlay && overlay.style.display!=='none' && !panel?.contains(e.target) && e.target===overlay){
    closeCatGrid();
  }
});
S.darkMode = localStorage.getItem('nx_dark') !== 'false';

function initTheme(){
  document.documentElement.setAttribute('data-theme', S.darkMode?'dark':'light');
  const btn = document.getElementById('theme-btn');
  if(btn) btn.textContent = S.darkMode ? '☀️' : '🌙';
}

function toggleTheme(){
  S.darkMode = !S.darkMode;
  localStorage.setItem('nx_dark', S.darkMode);
  initTheme();
  toast(S.darkMode?'Dark mode':'Light mode','success');
}

// ── NOTIFICATIONS ─────────────────────────────
function notify(title, body){
  // Browser notification
  if(Notification.permission === 'granted'){
    new Notification(title, {body, icon:'/logo.svg'});
  } else if(Notification.permission !== 'denied'){
    Notification.requestPermission().then(p=>{
      if(p==='granted') new Notification(title, {body, icon:'/logo.svg'});
    });
  }
  // Always show toast too
  toast(`🔔 ${title}: ${body}`, 'success');
}
const STYLES = {
  default:    '',
  formal:     'Write in a formal, professional tone. Use proper grammar and structure.',
  casual:     'Write in a casual, friendly, conversational tone. Use simple language.',
  academic:   'Write in an academic style with citations approach, structured arguments, and scholarly language.',
  persuasive: 'Write in a persuasive, compelling style. Use rhetorical techniques and strong arguments.',
  simple:     'Write as simply as possible. Use short sentences. Avoid jargon. ELI5 approach.',
};
S.writingStyle = 'default';

function setStyle(btn, style){
  S.writingStyle = style;
  document.querySelectorAll('.style-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  toast(`Style: ${btn.textContent.trim()}`, 'success');
}

// ── THINKING MODE ─────────────────────────────
S.thinkingMode = 'fast';

function setThinking(btn, mode){
  S.thinkingMode = mode;
  document.querySelectorAll('.think-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  toast(mode==='deep' ? '🧠 Deep Think ON — slower but smarter' : '⚡ Fast mode', 'success');
}

// ── LATEX RENDERER ────────────────────────────
function renderLatex(){
  if(window.renderMathInElement){
    setTimeout(()=>{
      const msgs = document.getElementById('messages');
      if(msgs) renderMathInElement(msgs,{
        delimiters:[
          {left:'$$',right:'$$',display:true},
          {left:'$',right:'$',display:false},
          {left:'\\[',right:'\\]',display:true},
          {left:'\\(',right:'\\)',display:false},
        ],
        throwOnError:false,
      });
    },100);
  }
}
async function handleFileAnalysis(input){
  const file=input.files[0];
  if(!file)return;
  input.value='';
  const question=document.getElementById('msg-input')?.value?.trim()||'';
  document.getElementById('msg-input').value='';
  addMsg({role:'user',text:`📎 **${file.name}**${question?'\n'+question:'\nAnalyze this file'}`});
  showTyping();
  const form=new FormData();
  form.append('file',file);
  if(question)form.append('question',question);
  try{
    const r=await fetch(API+'/api/file/analyze',{method:'POST',headers:{Authorization:'Bearer '+S.token},body:form});
    const d=await r.json();
    if(!r.ok)throw new Error(d.error||'Analysis failed');
    hideTyping();
    addMsg({role:'assistant',text:d.analysis});
    try{S.user=await api('/api/me');updateUsage();}catch(_){}
  }catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});toast(e.message,'error');}
}

// ── SHARE CHAT ────────────────────────────────
async function shareChat(){
  if(!S.msgs.length){toast('No messages to share','error');return;}
  try{
    const msgs=S.msgs.map(m=>({role:m.role,text:m.text||'',type:m.type||'text'}));
    const d=await api('/api/share',{method:'POST',body:{messages:msgs,title:S.tool?.name||'NexusAI Chat'}});
    await navigator.clipboard.writeText(d.url).catch(()=>{});
    toast('🔗 Share link copied!','success');
    addMsg({role:'assistant',text:`🔗 **Share link created!**\n\n${d.url}\n\n_Link expires in 7 days_`});
  }catch(e){toast(e.message,'error');}
}

// ── CUSTOM INSTRUCTIONS ───────────────────────
async function openInstructions(){
  const modal=document.getElementById('instructions-modal');
  modal.style.display='flex';
  try{
    const d=await api('/api/instructions');
    document.getElementById('inst-about').value=d.about_user||'';
    document.getElementById('inst-style').value=d.response_style||'';
  }catch(_){}
}
function closeInstructions(){
  document.getElementById('instructions-modal').style.display='none';
}
async function saveInstructions(){
  const about=document.getElementById('inst-about').value.trim();
  const style=document.getElementById('inst-style').value.trim();
  try{
    await api('/api/instructions',{method:'POST',body:{about_user:about,response_style:style}});
    closeInstructions();
    toast('✅ Instructions saved!','success');
  }catch(e){toast(e.message,'error');}
}

// ── KNOWLEDGE BASE ────────────────────────────
async function navigate_kb(){
  S.page='kb';closeSidebar();
  document.getElementById('tool-label').textContent='📚 Knowledge Base';
  document.getElementById('messages').innerHTML='<div class="page-wrap"><div class="page-title">📚 Knowledge Base</div><div style="color:var(--t2)">Loading...</div></div>';
  try{
    const {items=[]}=await api('/api/kb');
    document.getElementById('messages').innerHTML=`<div class="page-wrap">
      <div class="page-title">📚 Knowledge Base</div>
      <div style="display:flex;gap:8px;margin-bottom:16px">
        <input id="kb-search" placeholder="Search..." style="flex:1;background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px;color:var(--text);outline:none" oninput="searchKB(this.value)"/>
        <button onclick="addKBItem()" style="background:var(--grad);color:#000;border:none;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">+ Add</button>
      </div>
      <div id="kb-list">
        ${items.length?items.map(i=>`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:8px;display:flex;align-items:center;gap:12px">
          <div style="flex:1">
            <div style="font-size:13px;font-weight:500">${esc(i.title)}</div>
            <div style="font-size:11px;color:var(--t3)">${i.tags||''} · ${new Date(i.created_at).toLocaleDateString()}</div>
          </div>
          <button onclick="askKB(${i.id},'${esc(i.title)}')" style="font-size:12px;padding:4px 10px;border:1px solid var(--border);border-radius:6px;color:var(--t2);cursor:pointer;background:none">Ask AI</button>
          <button onclick="deleteKBItem(${i.id})" style="color:var(--t3);font-size:14px;background:none;border:none;cursor:pointer">✕</button>
        </div>`).join(''):'<div style="color:var(--t2);padding:40px;text-align:center">No knowledge base items yet.<br/>Add documents, notes, or any text you want AI to remember.</div>'}
      </div>
    </div>`;
  }catch(e){toast(e.message,'error');}
}

async function addKBItem(){
  const title=prompt('Title:');if(!title)return;
  const content=prompt('Content (paste your text):');if(!content)return;
  const tags=prompt('Tags (optional, comma-separated):');
  try{
    await api('/api/kb',{method:'POST',body:{title,content,tags}});
    toast('✅ Added to knowledge base!','success');
    navigate_kb();
  }catch(e){toast(e.message,'error');}
}

async function deleteKBItem(id){
  if(!confirm('Delete?'))return;
  await api('/api/kb/'+id,{method:'DELETE'});
  toast('Deleted','success');navigate_kb();
}

function askKB(id,title){
  const question=prompt(`Ask a question about "${title}":`);
  if(!question)return;
  S.page='chat';
  document.getElementById('tool-label').textContent='📚 '+title;
  document.getElementById('messages').innerHTML='';
  addMsg({role:'user',text:question});showTyping();
  api('/api/kb/'+id+'/ask',{method:'POST',body:{question}}).then(r=>{
    hideTyping();addMsg({role:'assistant',text:r.answer});
  }).catch(e=>{hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});});
}

// ── API KEYS PAGE ──────────────────────────────
async function navigate_apikeys(){
  S.page='apikeys';closeSidebar();
  document.getElementById('tool-label').textContent='🔑 API Access';
  document.getElementById('messages').innerHTML='<div class="page-wrap"><div class="page-title">🔑 API Access</div><div style="color:var(--t2)">Loading...</div></div>';
  try{
    const {keys=[]}=await api('/api/keys');
    document.getElementById('messages').innerHTML=`<div class="page-wrap">
      <div class="page-title">🔑 API Access</div>
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px;font-size:13px;color:var(--t2)">
        Use NexusAI in your own apps.<br/>
        <code style="background:var(--bg3);padding:4px 8px;border-radius:5px;color:var(--a2)">POST https://nexusai-production-6504.up.railway.app/v1/chat</code><br/>
        <code style="background:var(--bg3);padding:4px 8px;border-radius:5px;color:var(--a2);display:block;margin-top:6px">Authorization: Bearer YOUR_KEY</code>
      </div>
      <button onclick="createApiKey()" style="background:var(--grad);color:#000;border:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;margin-bottom:16px">+ Create API Key</button>
      <div>
        ${keys.length?keys.map(k=>`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:12px">
          <div style="flex:1">
            <div style="font-size:13px;font-weight:500">${esc(k.name)}</div>
            <div style="font-size:11px;color:var(--t3)">${k.requests} requests · Last used: ${k.last_used?new Date(k.last_used).toLocaleDateString():'Never'}</div>
          </div>
          <button onclick="deleteApiKey(${k.id})" style="color:var(--t3);font-size:14px;background:none;border:none;cursor:pointer">✕</button>
        </div>`).join(''):'<div style="color:var(--t2);font-size:13px">No API keys yet.</div>'}
      </div>
    </div>`;
  }catch(e){
    document.getElementById('messages').innerHTML=`<div class="page-wrap"><div class="page-title">🔑 API Access</div><div style="color:var(--t2);padding:20px;background:var(--bg2);border-radius:10px">API access requires <strong style="color:var(--a1)">Pro or Elite</strong> plan. <button onclick="navigate('pricing')" style="background:var(--grad);color:#000;border:none;padding:5px 12px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600;margin-left:8px">Upgrade →</button></div></div>`;
  }
}

async function createApiKey(){
  const name=prompt('Key name (e.g. "My App"):');if(!name)return;
  try{
    const d=await api('/api/keys',{method:'POST',body:{name}});
    alert(`✅ Your API Key:\n\n${d.key}\n\nSave this — it won't be shown again!`);
    navigate_apikeys();
  }catch(e){toast(e.message,'error');}
}

async function deleteApiKey(id){
  if(!confirm('Delete API key?'))return;
  await api('/api/keys/'+id,{method:'DELETE'});
  toast('Deleted','success');navigate_apikeys();
}

// ── TEAMS PAGE ────────────────────────────────
async function navigate_teams(){
  S.page='teams';closeSidebar();
  document.getElementById('tool-label').textContent='👥 Teams';
  document.getElementById('messages').innerHTML='<div class="page-wrap"><div class="page-title">👥 Teams</div><div style="color:var(--t2)">Loading...</div></div>';
  try{
    const {teams=[]}=await api('/api/teams');
    document.getElementById('messages').innerHTML=`<div class="page-wrap">
      <div class="page-title">👥 Team Collaboration</div>
      <div style="display:flex;gap:8px;margin-bottom:16px">
        <button onclick="createTeam()" style="background:var(--grad);color:#000;border:none;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">+ Create Team</button>
        <button onclick="joinTeam()" style="background:var(--bg2);border:1px solid var(--border);color:var(--text);padding:10px 16px;border-radius:8px;font-size:13px;cursor:pointer">Join with Code</button>
      </div>
      ${teams.length?teams.map(t=>`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:8px">
        <div style="font-size:14px;font-weight:500;margin-bottom:4px">${esc(t.name)}</div>
        <div style="font-size:12px;color:var(--t3)">Role: ${t.role} · Invite code: <code style="background:var(--bg3);padding:2px 6px;border-radius:4px;color:var(--a1)">${t.invite_code}</code></div>
        <button onclick="navigator.clipboard.writeText('${t.invite_code}');toast('Code copied!','success')" style="margin-top:8px;font-size:12px;padding:4px 10px;border:1px solid var(--border);border-radius:6px;color:var(--t2);background:none;cursor:pointer">Copy Invite Code</button>
      </div>`).join(''):'<div style="color:var(--t2);font-size:13px">No teams yet. Create one or join with an invite code.</div>'}
    </div>`;
  }catch(e){toast(e.message,'error');}
}

async function createTeam(){
  const name=prompt('Team name:');if(!name)return;
  try{
    const d=await api('/api/teams',{method:'POST',body:{name}});
    toast(`Team created! Invite code: ${d.invite_code}`,'success');navigate_teams();
  }catch(e){toast(e.message,'error');}
}

async function joinTeam(){
  const code=prompt('Enter invite code:');if(!code)return;
  try{
    const d=await api('/api/teams/join',{method:'POST',body:{invite_code:code}});
    toast(`Joined "${d.team_name}"! ✅`,'success');navigate_teams();
  }catch(e){toast(e.message,'error');}
}

// ── INLINE EDITING ────────────────────────────
function enableInlineEdit(msgIndex){
  const msgEls=document.querySelectorAll('.msg.assistant');
  const el=msgEls[msgIndex];if(!el)return;
  const bubble=el.querySelector('.msg-bubble');if(!bubble)return;
  const original=S.msgs[msgIndex]?.text||'';
  bubble.contentEditable='true';
  bubble.style.outline='1px solid var(--a1)';
  bubble.style.borderRadius='8px';
  bubble.style.padding='8px';
  bubble.focus();
  // Save on blur
  bubble.onblur=()=>{
    bubble.contentEditable='false';
    bubble.style.outline='';
    const newText=bubble.innerText;
    if(S.msgs[msgIndex])S.msgs[msgIndex].text=newText;
    toast('✅ Edited','success');
  };
}

// ── VERSION HISTORY ───────────────────────────
async function showVersionHistory(){
  if(!S.sessionId){toast('No session to show history for','error');return;}
  try{
    const {versions=[]}=await api('/api/history/versions/'+S.sessionId);
    if(!versions.length){toast('No version history yet','error');return;}
    const modal=document.createElement('div');
    modal.style.cssText='position:fixed;inset:0;z-index:200;background:#00000090;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML=`<div style="background:var(--bg2);border:1px solid var(--border2);border-radius:16px;width:100%;max-width:500px;max-height:80vh;overflow:auto;padding:24px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div style="font-size:15px;font-weight:600">🕐 Version History</div>
        <button onclick="this.closest('div[style]').remove()" style="color:var(--t2);font-size:18px;background:none;border:none;cursor:pointer">✕</button>
      </div>
      ${versions.map(v=>`<div style="background:var(--bg3);border-radius:8px;padding:12px;margin-bottom:8px;font-size:12px">
        <div style="color:var(--t3);margin-bottom:6px">v${v.version} · ${new Date(v.created_at).toLocaleString()}</div>
        <div style="color:var(--t2);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${esc(v.content.slice(0,200))}</div>
      </div>`).join('')}
    </div>`;
    modal.onclick=e=>{if(e.target===modal)modal.remove();};
    document.body.appendChild(modal);
  }catch(e){toast(e.message,'error');}
}

// Auto-save version when session changes
async function autoSaveVersion(){
  if(!S.sessionId||!S.msgs.length)return;
  const content=S.msgs.map(m=>`${m.role}: ${m.text||''}`).join('\n').slice(0,5000);
  api('/api/history/versions',{method:'POST',body:{session_id:S.sessionId,content}}).catch(()=>{});
}
async function navigate_admin(){
  S.page='admin';closeSidebar();
  document.getElementById('tool-label').textContent='👑 Admin Panel';
  document.getElementById('messages').innerHTML='<div class="page-wrap"><div class="page-title">👑 Admin Panel</div><div style="color:var(--t2)">Loading...</div></div>';
  try{
    const {users=[],stats={}}=await api('/api/admin/users');
    document.getElementById('messages').innerHTML=`<div class="page-wrap">
      <div class="page-title">👑 Admin Panel</div>
      <div class="dash-stats" style="margin-bottom:20px">
        <div class="dash-card"><div class="dash-num">${stats.total||0}</div><div class="dash-lbl">Total Users</div></div>
        <div class="dash-card"><div class="dash-num">${stats.today||0}</div><div class="dash-lbl">New Today</div></div>
        <div class="dash-card"><div class="dash-num">${stats.pro||0}</div><div class="dash-lbl">Pro</div></div>
        <div class="dash-card"><div class="dash-num">${stats.elite||0}</div><div class="dash-lbl">Elite</div></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${users.map(u=>`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:12px;display:flex;align-items:center;gap:12px">
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:500">${esc(u.email)}</div>
            <div style="font-size:11px;color:var(--t3)">${u.plan} · ${u.requests_today} today · ${new Date(u.created_at).toLocaleDateString()}</div>
          </div>
          <select onchange="adminSetPlan(${u.id},this.value)" style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:12px;color:var(--text)">
            <option ${u.plan==='free'?'selected':''}>free</option>
            <option ${u.plan==='pro'?'selected':''}>pro</option>
            <option ${u.plan==='elite'?'selected':''}>elite</option>
          </select>
        </div>`).join('')}
      </div>
    </div>`;
  }catch(e){toast('Admin access denied','error');}
}

async function adminSetPlan(id,plan){
  try{await api('/api/admin/users/'+id,{method:'PATCH',body:{plan}});toast('Plan updated ✅','success');}
  catch(e){toast(e.message,'error');}
}

// ── REFERRAL ──────────────────────────────────
async function navigate_referral(){
  S.page='referral';closeSidebar();
  document.getElementById('tool-label').textContent='🔗 Referral';
  document.getElementById('messages').innerHTML='<div class="page-wrap"><div class="page-title">🔗 Referral</div><div style="color:var(--t2)">Loading...</div></div>';
  try{
    const d=await api('/api/referral');
    document.getElementById('messages').innerHTML=`<div class="page-wrap">
      <div class="page-title">🔗 Referral Program</div>
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:24px;margin-bottom:16px">
        <div style="font-size:13px;color:var(--t2);margin-bottom:8px">Your referral link</div>
        <div style="display:flex;gap:8px;align-items:center">
          <div style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px 12px;font-size:12px;word-break:break-all">${d.link}</div>
          <button onclick="navigator.clipboard.writeText('${d.link}');toast('Copied!','success')" style="background:var(--grad);color:#000;border:none;padding:10px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">Copy</button>
        </div>
      </div>
      <div class="dash-stats">
        <div class="dash-card"><div class="dash-num">${d.referrals}</div><div class="dash-lbl">Friends invited</div></div>
        <div class="dash-card"><div class="dash-num">${d.credits}</div><div class="dash-lbl">Bonus requests</div></div>
      </div>
      <div style="font-size:13px;color:var(--t2);margin-top:16px;padding:14px;background:var(--bg2);border-radius:10px;border:1px solid var(--border)">
        💡 For every friend who signs up, you both get <strong style="color:var(--a1)">+50 free requests</strong>!
      </div>
    </div>`;
  }catch(e){toast(e.message,'error');}
}

// ── COMMAND PALETTE (Ctrl+K) ──────────────────
let cmdOpen=false;
function openCommandPalette(){
  if(cmdOpen)return;cmdOpen=true;
  const overlay=document.createElement('div');
  overlay.id='cmd-overlay';
  overlay.style.cssText='position:fixed;inset:0;z-index:300;background:#00000080;backdrop-filter:blur(4px);display:flex;align-items:flex-start;justify-content:center;padding-top:80px';
  overlay.innerHTML=`<div style="background:var(--bg2);border:1px solid var(--border2);border-radius:16px;width:100%;max-width:560px;overflow:hidden;box-shadow:0 24px 80px #000">
    <div style="display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--border)">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input id="cmd-input" placeholder="Search tools, pages..." autofocus style="flex:1;background:none;border:none;outline:none;font-size:15px;color:var(--text)" oninput="filterCmd(this.value)" onkeydown="if(event.key==='Escape')closeCommandPalette()"/>
      <kbd style="font-size:11px;color:var(--t3);background:var(--bg3);padding:2px 6px;border-radius:4px">ESC</kbd>
    </div>
    <div id="cmd-results" style="max-height:360px;overflow-y:auto;padding:6px"></div>
  </div>`;
  overlay.onclick=e=>{if(e.target===overlay)closeCommandPalette();};
  document.body.appendChild(overlay);
  filterCmd('');
  document.getElementById('cmd-input')?.focus();
}
function closeCommandPalette(){cmdOpen=false;document.getElementById('cmd-overlay')?.remove();}
function filterCmd(q){
  const el=document.getElementById('cmd-results');if(!el)return;
  const lq=q.toLowerCase();
  const pages=[
    {e:'➕',n:'New Chat',fn:'newChat()'},
    {e:'📊',n:'Dashboard',fn:"navigate('dashboard')"},
    {e:'⭐',n:'Favorites',fn:"navigate('favorites')"},
    {e:'📁',n:'Projects',fn:"navigate('projects')"},
    {e:'📄',n:'PDF Chat',fn:"navigate('pdf')"},
    {e:'🤖',n:'AI Agents',fn:'navigate_agents()'},
    {e:'🔄',n:'Workflows',fn:'navigate_workflow()'},
    {e:'👑',n:'Admin Panel',fn:'navigate_admin()'},
    {e:'🔗',n:'Referral',fn:'navigate_referral()'},
    {e:'🌙',n:'Toggle Theme',fn:'toggleTheme()'},
    {e:'⚙️',n:'Custom Instructions',fn:'openInstructions()'},
  ];
  const tools=TOOLS.filter(t=>!lq||t.name.toLowerCase().includes(lq)).slice(0,8);
  const filteredPages=pages.filter(p=>!lq||p.n.toLowerCase().includes(lq));
  const all=[...filteredPages,...tools.map(t=>({e:t.e,n:t.name,fn:`selectToolFromGrid('${t.id}')`,type:'tool'}))];
  el.innerHTML=all.slice(0,12).map(item=>`
    <button onclick="${item.fn};closeCommandPalette()" style="width:100%;display:flex;align-items:center;gap:10px;padding:9px 14px;border:none;background:none;color:var(--text);text-align:left;border-radius:8px;cursor:pointer;transition:.1s" onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background='none'">
      <span style="font-size:16px;width:22px;text-align:center">${item.e}</span>
      <span style="font-size:14px">${item.n}</span>
      <span style="margin-left:auto;font-size:11px;color:var(--t3)">${item.type==='tool'?'Tool':'Page'}</span>
    </button>`).join('');
}
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();openCommandPalette();}
  if((e.ctrlKey||e.metaKey)&&e.key==='n'){e.preventDefault();newChat();}
});

// ── ONBOARDING TOUR ───────────────────────────
function startOnboarding(){
  if(localStorage.getItem('nx_onboarded'))return;
  const steps=[
    {sel:'#cat-grid-btn',text:'🔍 Browse 180+ AI tools by category'},
    {sel:'#search-btn',text:'🌐 Enable web search for real-time info'},
    {sel:'#send-btn',text:'⚡ Powered by GPT-4o with streaming'},
  ];
  let i=0;
  function show(idx){
    document.querySelector('.onboard-tip')?.remove();
    if(idx>=steps.length){localStorage.setItem('nx_onboarded','1');return;}
    const el=document.querySelector(steps[idx].sel);
    if(!el){show(idx+1);return;}
    const rect=el.getBoundingClientRect();
    const tip=document.createElement('div');
    tip.className='onboard-tip';
    tip.style.cssText=`position:fixed;z-index:500;background:var(--grad);color:#000;padding:12px 16px;border-radius:12px;font-size:13px;font-weight:500;max-width:220px;box-shadow:0 8px 30px #0008;left:${Math.min(rect.left,window.innerWidth-240)}px;top:${rect.bottom+10}px`;
    tip.innerHTML=`${steps[idx].text}<br/><button onclick="document.querySelector('.onboard-tip')?.remove();show(${idx+1})" style="margin-top:8px;background:#0003;border:none;padding:4px 10px;border-radius:6px;color:#000;font-size:12px;cursor:pointer">${idx<steps.length-1?'Next →':'Done ✓'}</button>`;
    document.body.appendChild(tip);
    i=idx;
  }
  setTimeout(()=>show(0),2000);
}

// cursor blink
const _cs=document.createElement('style');
_cs.textContent='@keyframes cursorBlink{0%,100%{opacity:1}50%{opacity:0}}';
document.head?.appendChild(_cs);

// ── BOOT ─────────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('auth-email')?.addEventListener('keydown',e=>{if(e.key==='Enter')handleAuth();});
  document.getElementById('auth-password')?.addEventListener('keydown',e=>{if(e.key==='Enter')handleAuth();});
  initTheme();
  if(S.token)init();
});