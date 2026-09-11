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
  {id:'video-kling',cat:'video',e:'🎬',name:'Kling v2.1 Master'},
  {id:'video-wan25',cat:'video',e:'🌊',name:'WAN 2.5 Video'},
  {id:'video-kling-img',cat:'video',e:'📸',name:'Kling Animate Photo'},

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

// ── STYLES ────────────────────────────────────
const STYLES = {
  default:    '',
  formal:     'Write in a formal, professional tone. Use proper grammar and structure.',
  casual:     'Write in a casual, friendly, conversational tone. Use simple language.',
  academic:   'Write in an academic style with citations approach, structured arguments, and scholarly language.',
  persuasive: 'Write in a persuasive, compelling style. Use rhetorical techniques and strong arguments.',
  simple:     'Write as simply as possible. Use short sentences. Avoid jargon. ELI5 approach.',
};

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
  tone: 50,
  writingStyle: localStorage.getItem('nx_style')||'default',
  thinkingMode: localStorage.getItem('nx_think')||'fast',
  rememberedEmail: localStorage.getItem('nx_email')||'',
};

// ─── Shared auth token accessor ─────────────
// Login stores the JWT as `nx_t` and mirrors it on S.token. Modules
// added later read `token`/`jwt`, which are never written, so their
// requests went out with no Authorization header and returned 401.
// Every module now resolves through this one function.
function getAuthToken() {
  try {
    return (typeof S !== 'undefined' && S.token) || localStorage.getItem('nx_t') || '';
  } catch (_) {
    return '';
  }
}
window.getAuthToken = getAuthToken;

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
    S.token=d.token;
    localStorage.setItem('nx_t',d.token);
    localStorage.setItem('nx_email',email); // ✅ remember email
    S.rememberedEmail=email;
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
  const limit=plan==='elite'?'∞':plan==='pro'?500:10;
  document.getElementById('sb-av').textContent=email[0]?.toUpperCase()||'U';
  document.getElementById('sb-email').textContent=email;
  document.getElementById('sb-plan').textContent=`${plan.charAt(0).toUpperCase()+plan.slice(1)} · ${used}/${limit}`;
  document.getElementById('usage-pill').textContent=`${used}/${limit}`;
  // Remember email for next visit
  localStorage.setItem('nx_email',email);
  renderToolList('');
  loadHistory();
  renderTemplates();
  showEmpty();
  updateUsage();
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
      const isKling = tool.id==='video-kling';
      const isWan25 = tool.id==='video-wan25';
      const isKlingImg = tool.id==='video-kling-img';
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

      } else if(isKling){
        toast('🎬 Generating with Kling v2.1 Master...','success');showTyping();
        try{const r=await api('/api/video/kling',{method:'POST',body:{prompt:text}});
          hideTyping();addMsg({role:'assistant',text:`🎬 **Kling v2.1 Master** — Cinematic Quality!\n\n[▶ Watch](${r.url})`});notify('NexusAI','Kling video ready! 🎬');}
        catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}

      } else if(isWan25){
        toast('🌊 Generating with WAN 2.5...','success');showTyping();
        try{const r=await api('/api/video/wan25',{method:'POST',body:{prompt:text}});
          hideTyping();addMsg({role:'assistant',text:`🌊 **WAN 2.5 Video** ready!\n\n[▶ Watch](${r.url})`});notify('NexusAI','WAN 2.5 video ready! 🌊');}
        catch(e){hideTyping();addMsg({role:'assistant',text:'❌ '+e.message});}

      } else if(isKlingImg){
        if(!img){toast('Attach a photo first!','error');hideTyping();return;}
        toast('📸 Animating with Kling v2.1...','success');showTyping();
        const kf=new FormData();const kb=atob(img.base64);const ka=new Uint8Array(kb.length);
        for(let i=0;i<kb.length;i++)ka[i]=kb.charCodeAt(i);
        kf.append('image',new Blob([ka],{type:'image/png'}),'image.png');
        if(text)kf.append('prompt',text);
        try{const r=await fetch(API+'/api/video/kling-img',{method:'POST',headers:{Authorization:'Bearer '+S.token},body:kf});
          const d=await r.json();if(!r.ok)throw new Error(d.error);
          hideTyping();addMsg({role:'assistant',text:`📸 **Kling Animated!**\n\n[▶ Watch](${d.url})`});
          S.attachedImg=null;clearAttachPreview();notify('NexusAI','Kling animation ready! 📸');}
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

// ── 💰 PRICING PAGE ───────────────────────────
async function navigate_pricing(){
  S.page='pricing';closeSidebar();
  document.getElementById('tool-label').textContent='💰 Pricing';
  document.getElementById('tool-sub').textContent='Choose your plan';

  let currentPlan='free';
  try{const d=await api('/api/payments/subscription');currentPlan=d.current_plan;}catch(_){}

  document.getElementById('messages').innerHTML=`<div class="page-wrap">
    <div class="page-title gradient-text">Choose Your Plan</div>
    <p style="color:var(--t2);font-size:14px;margin-bottom:32px;text-align:center">Unlock the full power of NexusAI</p>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;max-width:900px;margin:0 auto">
      <!-- FREE -->
      <div class="pricing-card ${currentPlan==='free'?'featured':''}">
        <div style="font-size:13px;color:var(--t3);margin-bottom:6px">FREE</div>
        <div style="font-size:36px;font-weight:700;margin-bottom:4px">$0</div>
        <div style="font-size:12px;color:var(--t3);margin-bottom:20px">Forever free</div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:24px">
          <div style="font-size:13px">✅ 10 requests/day</div>
          <div style="font-size:13px">✅ Basic AI tools</div>
          <div style="font-size:13px">✅ Web search</div>
          <div style="font-size:13px;color:var(--t3)">❌ Multi-Agent System</div>
          <div style="font-size:13px;color:var(--t3)">❌ Auto-deploy</div>
        </div>
        <button onclick="${currentPlan==='free'?'':'cancelPlan()'}" style="width:100%;padding:12px;background:var(--bg3);border:1px solid var(--border);color:var(--text);border-radius:10px;font-size:14px;font-weight:600;cursor:${currentPlan==='free'?'default':'pointer'}">${currentPlan==='free'?'✓ Current Plan':'Downgrade'}</button>
      </div>

      <!-- PRO -->
      <div class="pricing-card ${currentPlan==='pro'?'featured':''}">
        <div style="font-size:13px;color:var(--a2);margin-bottom:6px">PRO</div>
        <div style="font-size:36px;font-weight:700;margin-bottom:4px">$19<span style="font-size:14px;color:var(--t3);font-weight:400">/mo</span></div>
        <div style="font-size:12px;color:var(--t3);margin-bottom:20px">For builders</div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:24px">
          <div style="font-size:13px">✅ <strong>500 requests/day</strong></div>
          <div style="font-size:13px">✅ All AI tools (200+)</div>
          <div style="font-size:13px">✅ Mega Agent</div>
          <div style="font-size:13px">✅ Priority support</div>
          <div style="font-size:13px">✅ API access</div>
        </div>
        <button onclick="${currentPlan==='pro'?'':"upgradeTo('pro')"}" style="width:100%;padding:12px;background:${currentPlan==='pro'?'var(--bg3)':'linear-gradient(135deg,#a855f7,#6366f1)'};border:none;color:#fff;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">${currentPlan==='pro'?'✓ Current Plan':'Upgrade to Pro →'}</button>
      </div>

      <!-- ELITE -->
      <div class="pricing-card ${currentPlan==='elite'?'featured':''}">
        <div style="font-size:13px;background:linear-gradient(135deg,var(--a1),var(--a2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:700;margin-bottom:6px">ELITE</div>
        <div style="font-size:36px;font-weight:700;margin-bottom:4px">$49<span style="font-size:14px;color:var(--t3);font-weight:400">/mo</span></div>
        <div style="font-size:12px;color:var(--t3);margin-bottom:20px">For founders</div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:24px">
          <div style="font-size:13px">✅ <strong>Unlimited requests</strong></div>
          <div style="font-size:13px">✅ Multi-Agent System (12 agents)</div>
          <div style="font-size:13px">✅ Auto-deploy</div>
          <div style="font-size:13px">✅ Custom AI personality</div>
          <div style="font-size:13px">✅ 24/7 priority support</div>
          <div style="font-size:13px">✅ White-label option</div>
        </div>
        <button onclick="${currentPlan==='elite'?'':"upgradeTo('elite')"}" style="width:100%;padding:12px;background:${currentPlan==='elite'?'var(--bg3)':'linear-gradient(135deg,var(--a1),var(--a2))'};border:none;color:#000;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">${currentPlan==='elite'?'✓ Current Plan':'Upgrade to Elite ⚡'}</button>
      </div>
    </div>

    <div style="text-align:center;margin-top:32px;color:var(--t3);font-size:12px">
      💳 Secure payment by Stripe · Cancel anytime · Money-back guarantee
    </div>
  </div>`;
}

async function upgradeTo(plan){
  toast('🚀 Redirecting to checkout...','success');
  try{
    const d=await api('/api/payments/checkout',{method:'POST',body:{plan}});
    if(d.checkout_url){
      window.location.href=d.checkout_url;
    } else {
      toast('Checkout failed','error');
    }
  }catch(e){
    toast('💳 Stripe not configured yet. Contact support!','error');
  }
}

async function cancelPlan(){
  if(!confirm('Cancel subscription? You will be downgraded to Free.'))return;
  try{
    await api('/api/payments/cancel',{method:'POST'});
    toast('✅ Subscription cancelled','success');
    setTimeout(()=>navigate_pricing(),1000);
  }catch(e){toast(e.message,'error');}
}

// ── 🤖 4 NEW AGENTS UI ────────────────────────
async function runQAAgent(){
  const projectId=window._teamProjectId;
  const code=projectId?null:prompt('Paste code to QA:');
  if(!projectId&&!code)return;
  addMsg({role:'user',text:'🔍 QA Analysis'});showTyping();
  try{
    const d=await api('/api/billing/qa-agent',{method:'POST',body:{project_id:projectId,code}});
    hideTyping();
    let text=`**🔍 QA Analysis — Score: ${d.quality_score}/100**\n\n**Verdict:** ${d.verdict}\n**Production Ready:** ${d.production_readiness}/100\n\n`;
    if(d.critical_issues?.length){
      text+=`**⚠️ Critical Issues:**\n${d.critical_issues.map(i=>`• [${i.severity?.toUpperCase()}] ${i.issue}\n  → ${i.fix}`).join('\n')}\n\n`;
    }
    if(d.edge_cases_missed?.length){
      text+=`**🎯 Missing Edge Cases:**\n${d.edge_cases_missed.map(e=>'• '+e).join('\n')}\n\n`;
    }
    if(d.test_recommendations?.length){
      text+=`**🧪 Tests to Add:**\n${d.test_recommendations.map(t=>'• '+t).join('\n')}`;
    }
    addMsg({role:'assistant',text});
  }catch(e){hideTyping();toast(e.message,'error');}
}

async function runSecurityAgent(){
  const projectId=window._teamProjectId;
  const code=projectId?null:prompt('Paste code to security-audit:');
  if(!projectId&&!code)return;
  addMsg({role:'user',text:'🔒 Security Audit'});showTyping();
  try{
    const d=await api('/api/billing/security-agent',{method:'POST',body:{project_id:projectId,code}});
    hideTyping();
    let text=`**🔒 Security Audit — Score: ${d.security_score}/100**\n\n**Production Safe:** ${d.production_safe?'✅ YES':'❌ NO'}\n\n`;
    if(d.critical_vulnerabilities?.length){
      text+=`**🚨 Critical Vulnerabilities:**\n${d.critical_vulnerabilities.map(v=>`• **${v.type}** at ${v.location}\n  Impact: ${v.impact}\n  Fix: ${v.fix}`).join('\n')}\n\n`;
    }
    if(d.owasp_issues?.length){
      const found=d.owasp_issues.filter(o=>o.found);
      if(found.length){
        text+=`**📋 OWASP Issues Found:**\n${found.map(o=>`• ${o.category}\n  ${o.details}`).join('\n')}\n\n`;
      }
    }
    if(d.compliance_gaps?.length){
      text+=`**📜 Compliance Gaps:**\n${d.compliance_gaps.map(c=>'• '+c).join('\n')}`;
    }
    addMsg({role:'assistant',text});
  }catch(e){hideTyping();toast(e.message,'error');}
}

async function runGrowthAgent(){
  const idea=document.getElementById('team-idea')?.value?.trim()||prompt('What product?');
  if(!idea)return;
  addMsg({role:'user',text:`📈 Growth Strategy: ${idea}`});showTyping();
  try{
    const d=await api('/api/billing/growth-agent',{method:'POST',body:{idea}});
    hideTyping();
    let text=`**📈 Growth Strategy — Score: ${d.growth_score}/100**\n\n**Viral Potential:** ${d.viral_potential?.toUpperCase()}\n**North Star:** ${d.north_star_metric}\n\n`;
    if(d.growth_loops?.length){
      text+=`**🔁 Growth Loops:**\n${d.growth_loops.map(l=>`• **${l.name}** (k=${l.expected_k_factor})\n  ${l.mechanism}`).join('\n')}\n\n`;
    }
    if(d.acquisition_channels?.length){
      text+=`**🎯 Acquisition Channels:**\n${d.acquisition_channels.map(c=>`• **${c.channel}** — CAC: ${c.estimated_cac} · LTV: ${c.expected_ltv}\n  ${(c.tactics||[]).join(', ')}`).join('\n')}\n\n`;
    }
    if(d.referral_program){
      text+=`**🎁 Referral Program:**\nReward: ${d.referral_program.reward}\nIncentive: ${d.referral_program.incentive}\nViral Coefficient: ${d.referral_program.viral_coefficient}\n\n`;
    }
    if(d['30_day_action_plan']?.length){
      text+=`**📅 30-Day Action Plan:**\n${d['30_day_action_plan'].map(a=>'• '+a).join('\n')}`;
    }
    addMsg({role:'assistant',text});
  }catch(e){hideTyping();toast(e.message,'error');}
}

async function runAnalyticsAgent(){
  const idea=document.getElementById('team-idea')?.value?.trim()||prompt('What product?');
  if(!idea)return;
  addMsg({role:'user',text:`📊 Analytics Plan: ${idea}`});showTyping();
  try{
    const d=await api('/api/billing/analytics-agent',{method:'POST',body:{idea}});
    hideTyping();
    let text=`**📊 Analytics Strategy**\n\n**🎯 North Star:** ${d.north_star}\n\n`;
    if(d.key_metrics?.length){
      text+=`**📈 Key Metrics:**\n${d.key_metrics.slice(0,8).map(m=>`• **${m.metric}** → Target: ${m.target}\n  Why: ${m.why_important}`).join('\n')}\n\n`;
    }
    if(d.conversion_funnel?.length){
      text+=`**🚀 Conversion Funnel:**\n${d.conversion_funnel.map(s=>`• ${s.step}: ${s.expected_conversion}`).join('\n')}\n\n`;
    }
    if(d.experiments_to_run?.length){
      text+=`**🧪 Experiments to Run:**\n${d.experiments_to_run.map(e=>`• ${e.hypothesis}\n  Metric: ${e.metric} · Duration: ${e.duration}`).join('\n')}\n\n`;
    }
    if(d.tools_recommended?.length){
      text+=`**🛠️ Tools:** ${d.tools_recommended.join(', ')}`;
    }
    addMsg({role:'assistant',text});
  }catch(e){hideTyping();toast(e.message,'error');}
}

// ════════════════════════════════════════════
// 🧠 INTELLIGENCE HUB — Compound AI Features
// ════════════════════════════════════════════
async function navigate_intelligence(){
  S.page='intelligence';closeSidebar();
  document.getElementById('tool-label').textContent='🧠 Intelligence Hub';
  document.getElementById('tool-sub').textContent='Compound AI · Multi-model · Validation · Refinement';

  document.getElementById('messages').innerHTML=`<div class="page-wrap ai-os-bg">
    <div class="page-title gradient-text">🧠 Intelligence Hub</div>
    <p style="color:var(--t2);font-size:14px;margin-bottom:24px">Compound intelligence — multiple models reasoning together with auto-validation</p>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:24px">
      <button onclick="intelMode('multi')" class="intel-mode-card" data-mode="multi">
        <div style="font-size:28px;margin-bottom:8px">🎭</div>
        <div style="font-size:13px;font-weight:600;margin-bottom:4px">Multi-Model</div>
        <div style="font-size:11px;color:var(--t3)">Multiple perspectives → synthesis</div>
      </button>
      <button onclick="intelMode('chain')" class="intel-mode-card" data-mode="chain">
        <div style="font-size:28px;margin-bottom:8px">🌳</div>
        <div style="font-size:13px;font-weight:600;margin-bottom:4px">Reasoning Chain</div>
        <div style="font-size:11px;color:var(--t3)">Decompose → solve → synthesize</div>
      </button>
      <button onclick="intelMode('execute')" class="intel-mode-card" data-mode="execute">
        <div style="font-size:28px;margin-bottom:8px">🎯</div>
        <div style="font-size:13px;font-weight:600;margin-bottom:4px">Execute w/ Confidence</div>
        <div style="font-size:11px;color:var(--t3)">Auto validate + refine</div>
      </button>
      <button onclick="intelMode('contradictions')" class="intel-mode-card" data-mode="contradictions">
        <div style="font-size:28px;margin-bottom:8px">🔍</div>
        <div style="font-size:13px;font-weight:600;margin-bottom:4px">Contradiction Check</div>
        <div style="font-size:11px;color:var(--t3)">Detect inconsistencies</div>
      </button>
    </div>

    <div id="intel-form"></div>
    <div id="intel-output"></div>
  </div>
  <style>
    .intel-mode-card{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:18px;text-align:left;cursor:pointer;color:var(--text);transition:.2s}
    .intel-mode-card:hover{border-color:var(--a1);transform:translateY(-2px)}
    .intel-mode-card.active{border-color:var(--a1);background:linear-gradient(135deg,var(--bg2),#c6f13510);box-shadow:0 0 0 1px var(--a1)40}
  </style>`;

  intelMode('multi');
}

function intelMode(mode){
  document.querySelectorAll('.intel-mode-card').forEach(c=>{
    c.classList.toggle('active',c.dataset.mode===mode);
  });

  const form=document.getElementById('intel-form');
  document.getElementById('intel-output').innerHTML='';

  const forms={
    multi:`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:20px">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">🎭 Multi-Model Reasoning</div>
      <div style="font-size:12px;color:var(--t3);margin-bottom:14px">3 different perspectives reason on the same question, then a synthesizer combines them</div>
      <textarea id="intel-prompt" placeholder="e.g. Should we build B2B or B2C first?" rows="3"
        style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:12px;font-size:14px;color:var(--text);outline:none;resize:vertical;box-sizing:border-box;font-family:inherit"></textarea>
      <input id="intel-perspectives" placeholder="analytical,pragmatic,creative" value="analytical,pragmatic,creative"
        style="margin-top:10px;width:100%;background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:10px;border-radius:8px;font-size:12px;outline:none;box-sizing:border-box"/>
      <button onclick="runMultiModel()" style="margin-top:12px;width:100%;background:var(--grad);color:#000;border:none;padding:12px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">🎭 Run Multi-Model</button>
    </div>`,
    chain:`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:20px">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">🌳 Reasoning Chain</div>
      <div style="font-size:12px;color:var(--t3);margin-bottom:14px">AI decomposes the goal into steps, solves each, then synthesizes the final answer</div>
      <textarea id="intel-prompt" placeholder="e.g. Design a complete go-to-market strategy for an AI productivity tool" rows="3"
        style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:12px;font-size:14px;color:var(--text);outline:none;resize:vertical;box-sizing:border-box;font-family:inherit"></textarea>
      <select id="intel-steps" style="margin-top:10px;width:100%;background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:10px;border-radius:8px;font-size:12px;outline:none;box-sizing:border-box">
        <option value="4">4 steps</option>
        <option value="6" selected>6 steps</option>
        <option value="8">8 steps</option>
      </select>
      <button onclick="runReasoningChain()" style="margin-top:12px;width:100%;background:var(--grad);color:#000;border:none;padding:12px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">🌳 Run Reasoning Chain</button>
    </div>`,
    execute:`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:20px">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">🎯 Execute with Confidence</div>
      <div style="font-size:12px;color:var(--t3);margin-bottom:14px">AI generates → auto-validates → auto-refines if score is low</div>
      <textarea id="intel-prompt" placeholder="e.g. Write a compelling pitch for our seed round" rows="3"
        style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:12px;font-size:14px;color:var(--text);outline:none;resize:vertical;box-sizing:border-box;font-family:inherit"></textarea>
      <input id="intel-criteria" placeholder="Criteria (comma-separated)" value="specific, evidence-based, compelling"
        style="margin-top:10px;width:100%;background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:10px;border-radius:8px;font-size:12px;outline:none;box-sizing:border-box"/>
      <div style="display:flex;gap:8px;margin-top:10px">
        <input id="intel-min-score" type="number" value="80" min="50" max="100" placeholder="Min score"
          style="flex:1;background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:10px;border-radius:8px;font-size:12px;outline:none"/>
        <input id="intel-max-refine" type="number" value="2" min="1" max="5" placeholder="Max refinements"
          style="flex:1;background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:10px;border-radius:8px;font-size:12px;outline:none"/>
      </div>
      <button onclick="runExecute()" style="margin-top:12px;width:100%;background:var(--grad);color:#000;border:none;padding:12px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">🎯 Execute</button>
    </div>`,
    contradictions:`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:20px">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">🔍 Contradiction Check</div>
      <div style="font-size:12px;color:var(--t3);margin-bottom:14px">Paste 2+ claims (one per line) — AI detects contradictions</div>
      <textarea id="intel-claims" placeholder="The market is too crowded&#10;The market is wide open for newcomers&#10;Existing tools fail at user retention" rows="6"
        style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:12px;font-size:14px;color:var(--text);outline:none;resize:vertical;box-sizing:border-box;font-family:inherit"></textarea>
      <button onclick="runContradictions()" style="margin-top:12px;width:100%;background:var(--grad);color:#000;border:none;padding:12px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">🔍 Check Contradictions</button>
    </div>`,
  };
  form.innerHTML=forms[mode]||'';
}

async function runMultiModel(){
  const prompt=document.getElementById('intel-prompt')?.value?.trim();
  if(!prompt){toast('Enter a question','error');return;}
  const perspectives=document.getElementById('intel-perspectives').value.split(',').map(s=>s.trim()).filter(Boolean);

  const out=document.getElementById('intel-output');
  out.innerHTML='<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:20px;text-align:center"><div class="thinking-wave" style="display:inline-flex;margin-bottom:8px"><div class="thinking-bar"></div><div class="thinking-bar"></div><div class="thinking-bar"></div><div class="thinking-bar"></div><div class="thinking-bar"></div></div><div style="font-size:12px;color:var(--t2)">'+perspectives.length+' perspectives reasoning in parallel...</div></div>';

  try{
    const d=await api('/api/intelligence/multi-model',{method:'POST',body:{prompt,perspectives,synthesize:true}});
    let html='<div style="background:linear-gradient(135deg,#c6f13520,#35f1c620);border:1px solid var(--a1);border-radius:14px;padding:20px;margin-bottom:14px">';
    html+='<div style="font-size:11px;color:var(--a1);text-transform:uppercase;font-weight:700;margin-bottom:8px">🎯 Synthesized Answer</div>';
    html+='<div style="font-size:14px;line-height:1.6;white-space:pre-wrap">'+esc(String(d.synthesis||''))+'</div>';
    html+='<div style="font-size:11px;color:var(--t3);margin-top:10px">Models: '+(d.models_used||[]).join(', ')+' · '+d.duration_ms+'ms</div>';
    html+='</div>';
    html+='<div style="font-size:13px;font-weight:600;margin-bottom:10px">🎭 Individual Perspectives</div>';
    (d.perspectives||[]).forEach(p=>{
      html+='<div style="background:var(--bg2);border-left:3px solid var(--a2);border-radius:8px;padding:12px;margin-bottom:8px">';
      html+='<div style="font-size:11px;color:var(--a2);text-transform:uppercase;font-weight:700;margin-bottom:6px">'+esc(p.perspective)+' · '+esc(p.model)+'</div>';
      html+='<div style="font-size:13px;line-height:1.5;white-space:pre-wrap">'+esc(String(p.output).slice(0,800))+(String(p.output).length>800?'...':'')+'</div>';
      html+='</div>';
    });
    out.innerHTML=html;
  }catch(e){out.innerHTML='<div style="color:#f44;padding:20px">'+esc(e.message)+'</div>';}
}

async function runReasoningChain(){
  const goal=document.getElementById('intel-prompt')?.value?.trim();
  if(!goal){toast('Enter a goal','error');return;}
  const max_steps=+document.getElementById('intel-steps').value;

  const out=document.getElementById('intel-output');
  out.innerHTML='<div id="chain-progress" style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:14px"><div class="thinking-wave"><div class="thinking-bar"></div><div class="thinking-bar"></div><div class="thinking-bar"></div><div class="thinking-bar"></div><div class="thinking-bar"></div></div><div id="chain-status" style="font-size:12px;color:var(--t2);margin-top:8px">Starting...</div></div><div id="chain-final"></div>';

  try{
    const resp=await fetch(API+'/api/intelligence/reasoning-chain',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+S.token},
      body:JSON.stringify({goal,max_steps})
    });
    const reader=resp.body.getReader();
    const decoder=new TextDecoder();
    let buffer='';

    while(true){
      const {done,value}=await reader.read();if(done)break;
      buffer+=decoder.decode(value,{stream:true});
      const lines=buffer.split('\n');buffer=lines.pop()||'';
      for(const line of lines){
        if(!line.startsWith('data: '))continue;
        try{
          const d=JSON.parse(line.slice(6));
          const status=document.getElementById('chain-status');
          if(d.type==='start'&&status)status.textContent='🧠 Decomposing goal into steps...';
          if(d.type==='plan'&&status){
            status.textContent='📋 Plan ready: '+(d.plan.steps||[]).length+' steps. Executing...';
          }
          if(d.type==='steps_executed'&&status){
            status.textContent='✓ Executed '+d.count+' steps. Synthesizing...';
          }
          if(d.type==='done'){
            const final=document.getElementById('chain-final');
            const cp=document.getElementById('chain-progress');
            if(cp)cp.style.display='none';
            let html='<div style="background:linear-gradient(135deg,#c6f13520,#35f1c620);border:1px solid var(--a1);border-radius:14px;padding:20px;margin-bottom:14px">';
            html+='<div style="font-size:11px;color:var(--a1);text-transform:uppercase;font-weight:700;margin-bottom:8px">🎯 Final Answer</div>';
            html+='<div style="font-size:14px;line-height:1.6;white-space:pre-wrap">'+esc(String(d.final_answer||''))+'</div>';
            html+='</div>';
            html+='<div style="font-size:13px;font-weight:600;margin:14px 0 10px">🌳 Reasoning Steps</div>';
            (d.plan?.steps||[]).forEach((s,i)=>{
              const result=d.step_results?.[s.id]||'';
              html+='<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:8px">';
              html+='<div style="display:flex;gap:10px;align-items:center;margin-bottom:8px"><div style="width:24px;height:24px;border-radius:50%;background:var(--grad);color:#000;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px">'+s.id+'</div><div style="font-size:13px;font-weight:600">'+esc(s.task)+'</div></div>';
              html+='<div style="background:var(--bg3);border-radius:6px;padding:10px;font-size:12px;color:var(--t2);max-height:200px;overflow:auto;white-space:pre-wrap">'+esc(String(result).slice(0,1500))+(String(result).length>1500?'...':'')+'</div>';
              html+='</div>';
            });
            if(final)final.innerHTML=html;
          }
          if(d.type==='error'){toast('❌ '+d.message,'error');}
        }catch(_){}
      }
    }
  }catch(e){toast('❌ '+e.message,'error');}
}

async function runExecute(){
  const prompt=document.getElementById('intel-prompt')?.value?.trim();
  if(!prompt){toast('Enter prompt','error');return;}
  const criteria=document.getElementById('intel-criteria').value.split(',').map(s=>s.trim()).filter(Boolean);
  const min_score=+document.getElementById('intel-min-score').value;
  const max_refinements=+document.getElementById('intel-max-refine').value;

  const out=document.getElementById('intel-output');
  out.innerHTML='<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:20px;text-align:center"><div class="thinking-wave" style="display:inline-flex"><div class="thinking-bar"></div><div class="thinking-bar"></div><div class="thinking-bar"></div><div class="thinking-bar"></div><div class="thinking-bar"></div></div><div style="font-size:12px;color:var(--t2);margin-top:8px">Generating → validating → refining if needed...</div></div>';

  try{
    const d=await api('/api/intelligence/execute',{method:'POST',body:{prompt,criteria,min_score,max_refinements}});
    let html='<div style="background:linear-gradient(135deg,#c6f13520,#35f1c620);border:1px solid var(--a1);border-radius:14px;padding:20px;margin-bottom:14px">';
    html+='<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">';
    html+='<div style="font-size:11px;color:var(--a1);text-transform:uppercase;font-weight:700">🎯 Final Output</div>';
    html+='<div style="margin-left:auto;display:flex;gap:8px"><span style="font-size:11px;background:var(--bg2);padding:3px 8px;border-radius:99px">Confidence: <strong style="color:var(--a1)">'+d.confidence+'/100</strong></span>';
    if(d.refined)html+='<span style="font-size:11px;background:var(--bg2);padding:3px 8px;border-radius:99px">🔁 Refined '+d.refinement_iterations+'x</span>';
    html+='<span style="font-size:11px;background:var(--bg2);padding:3px 8px;border-radius:99px">'+d.model+'</span></div></div>';
    html+='<div style="font-size:14px;line-height:1.6;white-space:pre-wrap">'+esc(typeof d.output==='string'?d.output:JSON.stringify(d.output,null,2))+'</div>';
    html+='</div>';
    if(d.validation){
      html+='<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px">';
      html+='<div style="font-size:13px;font-weight:600;margin-bottom:8px">📊 Validation Report</div>';
      if(d.validation.strengths?.length)html+='<div style="margin-bottom:8px"><div style="font-size:11px;color:var(--a1);font-weight:700;margin-bottom:4px">✅ STRENGTHS</div>'+d.validation.strengths.map(s=>'<div style="font-size:12px;padding:2px 0">• '+esc(s)+'</div>').join('')+'</div>';
      if(d.validation.weaknesses?.length)html+='<div style="margin-bottom:8px"><div style="font-size:11px;color:#fbbf24;font-weight:700;margin-bottom:4px">⚠️ WEAKNESSES</div>'+d.validation.weaknesses.map(s=>'<div style="font-size:12px;padding:2px 0">• '+esc(s)+'</div>').join('')+'</div>';
      html+='</div>';
    }
    out.innerHTML=html;
  }catch(e){out.innerHTML='<div style="color:#f44;padding:20px">'+esc(e.message)+'</div>';}
}

async function runContradictions(){
  const text=document.getElementById('intel-claims')?.value?.trim();
  if(!text){toast('Enter claims','error');return;}
  const claims=text.split('\n').map(s=>s.trim()).filter(Boolean);
  if(claims.length<2){toast('Need at least 2 claims','error');return;}

  const out=document.getElementById('intel-output');
  out.innerHTML='<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:20px;text-align:center"><div class="thinking-wave" style="display:inline-flex"><div class="thinking-bar"></div><div class="thinking-bar"></div><div class="thinking-bar"></div><div class="thinking-bar"></div><div class="thinking-bar"></div></div></div>';

  try{
    const d=await api('/api/intelligence/contradictions',{method:'POST',body:{claims}});
    let html='<div style="background:'+(d.has_contradictions?'#f4444420':'#c6f13520')+';border:1px solid '+(d.has_contradictions?'#f44':'var(--a1)')+';border-radius:14px;padding:20px;margin-bottom:14px">';
    html+='<div style="font-size:16px;font-weight:700;margin-bottom:8px">'+(d.has_contradictions?'⚠️ Contradictions Found':'✅ No Contradictions')+'</div>';
    if(d.resolution)html+='<div style="font-size:13px;color:var(--t2);line-height:1.5">'+esc(d.resolution)+'</div>';
    html+='</div>';
    if(d.contradictions?.length){
      html+='<div style="font-size:13px;font-weight:600;margin-bottom:10px">🔍 Conflicts</div>';
      d.contradictions.forEach(c=>{
        html+='<div style="background:var(--bg2);border-left:3px solid #f44;border-radius:8px;padding:12px;margin-bottom:8px">';
        html+='<div style="font-size:12px;font-weight:600;margin-bottom:6px">Claim '+c.claim_a+' ↔ Claim '+c.claim_b+'</div>';
        html+='<div style="font-size:12px;color:var(--t2);line-height:1.4">'+esc(c.explanation)+'</div>';
        html+='</div>';
      });
    }
    if(d.consistent_claims?.length){
      html+='<div style="font-size:13px;font-weight:600;margin:14px 0 10px">✅ Consistent</div>';
      html+='<div style="background:var(--bg2);border-radius:8px;padding:12px"><div style="font-size:12px;color:var(--t2)">Claims: '+d.consistent_claims.join(', ')+'</div></div>';
    }
    out.innerHTML=html;
  }catch(e){out.innerHTML='<div style="color:#f44;padding:20px">'+esc(e.message)+'</div>';}
}

// ════════════════════════════════════════════
// 🤖 AI WORKFORCE — 16 specialized agents
// ════════════════════════════════════════════
async function navigate_workforce(){
  S.page='workforce';closeSidebar();
  document.getElementById('tool-label').textContent='🤖 AI Workforce';
  document.getElementById('tool-sub').textContent='16 specialized AI employees';

  let agents=[];
  try{const d=await api('/api/intelligence/agents');agents=d.agents||[];}catch(_){}

  document.getElementById('messages').innerHTML=`<div class="page-wrap ai-os-bg">
    <div class="page-title gradient-text">🤖 AI Workforce</div>
    <p style="color:var(--t2);font-size:14px;margin-bottom:24px">Your team of ${agents.length} specialized AI employees — pick one or let the system decide</p>

    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:20px">
      <div style="font-size:13px;font-weight:600;margin-bottom:10px">🎯 Auto-Pick Mode</div>
      <div style="font-size:12px;color:var(--t3);margin-bottom:12px">Describe the task — system picks the best agent</div>
      <input id="wf-task" placeholder="e.g. Write a React login component"
        style="width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:12px;border-radius:10px;font-size:13px;outline:none;box-sizing:border-box;margin-bottom:10px"/>
      <button onclick="autoPickAgent()" style="width:100%;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:#fff;border:none;padding:12px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer">🎯 Auto-Pick & Run</button>
    </div>

    <div style="font-size:13px;font-weight:600;margin-bottom:10px;color:var(--t2)">👥 ALL AGENTS</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-bottom:24px">
      ${agents.map(a=>`<button class="wf-agent-card" onclick="openAgent('${a.key}','${esc(a.name).replace(/'/g,'')}')">
        <div style="font-size:28px;margin-bottom:6px">${a.emoji||'🤖'}</div>
        <div style="font-size:12px;font-weight:600;margin-bottom:2px">${esc(a.name)}</div>
        <div style="font-size:10px;color:var(--t3);line-height:1.3">${esc(a.role)}</div>
      </button>`).join('')}
    </div>

    <div id="wf-output"></div>
  </div>
  <style>
    .wf-agent-card{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center;cursor:pointer;color:var(--text);transition:.2s}
    .wf-agent-card:hover{border-color:var(--a1);transform:translateY(-2px);box-shadow:0 6px 20px var(--a1)20}
  </style>`;
}

function openAgent(agentKey, agentName){
  const out=document.getElementById('wf-output');
  out.innerHTML=`<div style="background:var(--bg2);border:1px solid var(--a1);border-radius:14px;padding:20px;margin-bottom:14px">
    <div style="font-size:14px;font-weight:600;margin-bottom:12px">💼 Working with: ${esc(agentName)}</div>
    <textarea id="wf-prompt" rows="4" placeholder="What do you want this agent to do?"
      style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:12px;font-size:14px;color:var(--text);outline:none;resize:vertical;box-sizing:border-box;font-family:inherit"></textarea>
    <button onclick="runWorkforceAgent('${agentKey}','${esc(agentName).replace(/'/g,'')}')" style="margin-top:12px;width:100%;background:var(--grad);color:#000;border:none;padding:12px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">⚡ Run Agent</button>
  </div>
  <div id="wf-result"></div>`;
  document.getElementById('wf-prompt')?.focus();
}

async function runWorkforceAgent(agentKey, agentName){
  const prompt=document.getElementById('wf-prompt')?.value?.trim();
  if(!prompt){toast('Enter a task','error');return;}

  const result=document.getElementById('wf-result');
  result.innerHTML='<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:20px;text-align:center"><div class="thinking-wave" style="display:inline-flex"><div class="thinking-bar"></div><div class="thinking-bar"></div><div class="thinking-bar"></div><div class="thinking-bar"></div><div class="thinking-bar"></div></div><div style="font-size:12px;color:var(--t2);margin-top:8px">'+esc(agentName)+' is working...</div></div>';

  try{
    const d=await api('/api/intelligence/agent/'+agentKey,{method:'POST',body:{prompt}});
    let html='<div style="background:linear-gradient(135deg,var(--bg2),var(--bg3));border:1px solid var(--a1);border-radius:14px;padding:20px;margin-bottom:14px">';
    html+='<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">';
    html+='<div style="font-size:32px">'+esc(d.emoji||'🤖')+'</div>';
    html+='<div style="flex:1"><div style="font-size:14px;font-weight:600">'+esc(d.name)+'</div><div style="font-size:11px;color:var(--t3)">'+esc(d.role)+'</div></div>';
    html+='<div style="font-size:11px;color:var(--t3)">'+(d.duration_ms||0)+'ms · '+esc(d.provider||'')+'/'+esc(d.model||'')+'</div></div>';
    html+='<div style="background:var(--bg);border-radius:10px;padding:14px;font-size:13px;line-height:1.6;white-space:pre-wrap;max-height:600px;overflow:auto">';
    html+=esc(typeof d.output==='string'?d.output:JSON.stringify(d.output,null,2));
    html+='</div></div>';
    result.innerHTML=html;
  }catch(e){result.innerHTML='<div style="color:#f44;padding:20px">'+esc(e.message)+'</div>';}
}

async function autoPickAgent(){
  const task=document.getElementById('wf-task')?.value?.trim();
  if(!task){toast('Describe the task','error');return;}

  try{
    const d=await api('/api/intelligence/agent-pick',{method:'POST',body:{task_description:task}});
    toast('🎯 Picked: '+(d.details?.name||d.agent),'success');
    openAgent(d.agent, d.details?.name || d.agent);
    document.getElementById('wf-prompt').value=task;
    setTimeout(()=>runWorkforceAgent(d.agent, d.details?.name || d.agent),200);
  }catch(e){toast(e.message,'error');}
}

// ════════════════════════════════════════════
// 📊 OBSERVATORY — Live system monitoring
// ════════════════════════════════════════════
let _observatoryInterval=null;

async function navigate_observatory(){
  S.page='observatory';closeSidebar();
  document.getElementById('tool-label').textContent='📊 Observatory';
  document.getElementById('tool-sub').textContent='Live system observability';

  document.getElementById('messages').innerHTML=`<div class="page-wrap ai-os-bg">
    <div class="page-title gradient-text">📊 Observatory</div>
    <p style="color:var(--t2);font-size:14px;margin-bottom:24px">Live metrics · Circuit breakers · Memory · Cache</p>

    <div id="obs-overview" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:24px"></div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;grid-template-areas:'a b' 'c d'" id="obs-grid"></div>

    <div style="margin-top:24px">
      <div style="font-size:13px;font-weight:600;margin-bottom:10px;color:var(--t2)">🔌 PROVIDER ANALYTICS</div>
      <div id="obs-providers"></div>
    </div>

    <div style="margin-top:24px">
      <div style="font-size:13px;font-weight:600;margin-bottom:10px;color:var(--t2)">🔬 RECENT TRACES</div>
      <div id="obs-traces"></div>
    </div>

    <div style="text-align:center;margin-top:18px">
      <button onclick="refreshObservatory()" style="background:var(--bg2);border:1px solid var(--border);color:var(--text);padding:8px 16px;border-radius:8px;font-size:12px;cursor:pointer">🔄 Refresh</button>
      <button onclick="toggleObsAuto()" id="obs-auto-btn" style="margin-left:8px;background:var(--bg2);border:1px solid var(--border);color:var(--text);padding:8px 16px;border-radius:8px;font-size:12px;cursor:pointer">▶️ Auto-refresh</button>
    </div>
  </div>
  <style>
    .obs-card{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px}
    .obs-card-title{font-size:13px;font-weight:600;margin-bottom:12px;display:flex;align-items:center;gap:8px}
    .obs-stat{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)}
    .obs-stat:last-child{border-bottom:none}
    .obs-stat-name{font-size:12px;color:var(--t3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:60%}
    .obs-stat-value{font-size:12px;color:var(--text);font-weight:600}
    .obs-mini{background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center}
    .obs-mini-num{font-size:22px;font-weight:700;color:var(--a1);margin-bottom:4px}
    .obs-mini-lbl{font-size:11px;color:var(--t3)}
    .breaker-state{display:inline-block;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;text-transform:uppercase}
    .breaker-state.CLOSED{background:#c6f13520;color:#c6f135}
    .breaker-state.OPEN{background:#f4444420;color:#f44}
    .breaker-state.HALF_OPEN{background:#fbbf2420;color:#fbbf24}
  </style>`;

  refreshObservatory();
}

async function viewTrace(traceId){
  try{
    const d=await api('/api/system/traces/'+encodeURIComponent(traceId));
    const spans=d.spans||[];
    if(!spans.length){toast('No spans in trace','error');return;}

    const rootStart=Math.min(...spans.map(s=>s.start));
    const totalDuration=Math.max(...spans.map(s=>(s.end||Date.now()))) - rootStart;

    let html=`<div style="position:fixed;inset:0;background:#000c;backdrop-filter:blur(8px);z-index:9999;padding:24px;overflow:auto" onclick="if(event.target===this)this.remove()">
      <div style="max-width:900px;margin:0 auto;background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:20px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <div>
            <div style="font-size:16px;font-weight:700">🔬 Trace Details</div>
            <div style="font-size:11px;color:var(--t3);font-family:monospace">${esc(traceId)}</div>
          </div>
          <button onclick="this.closest('[style*=fixed]').remove()" style="background:var(--bg3);border:none;color:var(--text);width:32px;height:32px;border-radius:50%;cursor:pointer">✕</button>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:10px;margin-bottom:14px;font-size:11px;color:var(--t3)">
          ${spans.length} spans · ${totalDuration}ms total
        </div>
        <div class="trace-timeline" style="cursor:default">`;

    spans.forEach(s=>{
      const startPct=((s.start-rootStart)/(totalDuration||1))*100;
      const widthPct=Math.max(((s.duration_ms||10)/(totalDuration||1))*100, 2);
      const cached=s.attrs?.cache_hit;
      const status=s.status==='error'?'error':(cached?'cached':'ok');
      html+=`<div class="trace-span">
        <div class="trace-span-label">${esc(s.operation)}${s.attrs?.provider?` · ${esc(s.attrs.provider)}`:''}</div>
        <div class="trace-span-bar">
          <div class="trace-span-fill" data-status="${status}" style="left:${startPct}%;width:${widthPct}%"></div>
        </div>
        <div class="trace-span-duration">${s.duration_ms||0}ms</div>
      </div>`;
      if(s.attrs?.model){
        html+=`<div style="font-size:10px;color:var(--t3);padding-left:120px;margin-bottom:4px">model: ${esc(s.attrs.model)}${s.attrs.input_tokens?` · ${s.attrs.input_tokens}→${s.attrs.output_tokens||'?'} tokens`:''}${cached?' · cached':''}</div>`;
      }
    });

    html+='</div></div></div>';
    document.body.insertAdjacentHTML('beforeend',html);
  }catch(e){toast(e.message,'error');}
}

async function refreshObservatory(){
  try{
    const [health,metrics,breakers,memStats,cacheStats,traces,providers,events] = await Promise.all([
      api('/api/core/health').catch(()=>({})),
      api('/api/intelligence/metrics').catch(()=>({counters:{},histograms:{},gauges:{}})),
      api('/api/intelligence/breakers').catch(()=>({breakers:[]})),
      api('/api/intelligence/memory/stats').catch(()=>({})),
      api('/api/core/cache/stats').catch(()=>({})),
      api('/api/system/traces?limit=20').catch(()=>({traces:[]})),
      api('/api/system/adaptive/provider-stats').catch(()=>({providers:[]})),
      api('/api/system/events/stats').catch(()=>({})),
    ]);

    // Overview
    const ov=document.getElementById('obs-overview');
    if(ov){
      const aiCalls=Object.entries(metrics.counters||{}).filter(([k])=>k.startsWith('ai_calls_total')).reduce((s,[,v])=>s+v,0);
      const aiCached=metrics.counters?.ai_calls_cached||0;
      const errors=metrics.counters?.errors_total||0;
      ov.innerHTML=`
        <div class="obs-mini"><div class="obs-mini-num">${health.uptime_seconds?Math.floor(health.uptime_seconds/60)+'m':'?'}</div><div class="obs-mini-lbl">Uptime</div></div>
        <div class="obs-mini"><div class="obs-mini-num">${health.memory?.heap_used_mb||'?'}</div><div class="obs-mini-lbl">Heap MB</div></div>
        <div class="obs-mini"><div class="obs-mini-num">${aiCalls}</div><div class="obs-mini-lbl">AI calls</div></div>
        <div class="obs-mini"><div class="obs-mini-num">${aiCached}</div><div class="obs-mini-lbl">Cache hits</div></div>
        <div class="obs-mini"><div class="obs-mini-num" style="color:${errors>0?'#f44':'var(--a1)'}">${errors}</div><div class="obs-mini-lbl">Errors</div></div>
        <div class="obs-mini"><div class="obs-mini-num">${cacheStats.hit_rate||'0%'}</div><div class="obs-mini-lbl">Hit rate</div></div>
      `;
    }

    // Grid: 4 cards + tracing + provider stats
    const grid=document.getElementById('obs-grid');
    if(grid){
      const cacheCard=`<div class="obs-card">
        <div class="obs-card-title">⚡ Cache</div>
        <div class="obs-stat"><span class="obs-stat-name">Memory size</span><span class="obs-stat-value">${cacheStats.memory_size||0}/${cacheStats.max_memory||500}</span></div>
        <div class="obs-stat"><span class="obs-stat-name">Total hits</span><span class="obs-stat-value">${cacheStats.hits||0}</span></div>
        <div class="obs-stat"><span class="obs-stat-name">Total misses</span><span class="obs-stat-value">${cacheStats.misses||0}</span></div>
        <div class="obs-stat"><span class="obs-stat-name">Hit rate</span><span class="obs-stat-value" style="color:var(--a1)">${cacheStats.hit_rate||'0%'}</span></div>
        <div class="obs-stat"><span class="obs-stat-name">Redis</span><span class="obs-stat-value">${cacheStats.redis_available?'✅ connected':'⚠️ memory only'}</span></div>
      </div>`;

      const memCard=`<div class="obs-card">
        <div class="obs-card-title">🧠 Memory</div>
        <div class="obs-stat"><span class="obs-stat-name">Long-term memories</span><span class="obs-stat-value">${memStats.memories||0}</span></div>
        <div class="obs-stat"><span class="obs-stat-name">Graph nodes</span><span class="obs-stat-value">${memStats.graph_nodes||0}</span></div>
        <div class="obs-stat"><span class="obs-stat-name">Graph edges</span><span class="obs-stat-value">${memStats.graph_edges||0}</span></div>
        <div class="obs-stat"><span class="obs-stat-name">Workflows</span><span class="obs-stat-value">${memStats.workflows||0}</span></div>
      </div>`;

      const breakersList=(breakers.breakers||[]).map(b=>`<div class="obs-stat">
        <span class="obs-stat-name">${esc(b.name)}</span>
        <span><span class="breaker-state ${b.state}">${b.state}</span> <span class="obs-stat-value">${b.success_rate||'N/A'}</span></span>
      </div>`).join('');
      const brCard=`<div class="obs-card">
        <div class="obs-card-title">🛡️ Circuit Breakers</div>
        ${breakersList||'<div class="obs-stat-name">No breakers</div>'}
      </div>`;

      const histRows=Object.entries(metrics.histograms||{}).slice(0,5).map(([k,v])=>`<div class="obs-stat">
        <span class="obs-stat-name">${esc(k.split('{')[0])}</span>
        <span class="obs-stat-value">p95: ${Math.round(v.p95)}ms · avg: ${Math.round(v.avg)}ms</span>
      </div>`).join('');
      const metCard=`<div class="obs-card">
        <div class="obs-card-title">📊 Latency (p95)</div>
        ${histRows||'<div class="obs-stat-name">No data yet — make some calls</div>'}
      </div>`;

      grid.innerHTML=cacheCard+memCard+brCard+metCard;
    }

    // Provider analytics
    const provDiv=document.getElementById('obs-providers');
    if(provDiv){
      const provs=providers.providers||{};
      const provHtml=Object.entries(provs).map(([name,p])=>`
        <div class="provider-card">
          <div class="provider-header">
            <div style="font-size:18px">${name==='openai'?'🤖':name==='anthropic'?'🧠':name==='deepseek'?'⚡':'🔌'}</div>
            <div class="provider-name">${esc(name)}</div>
            <div class="provider-stat">${p.calls} calls · ${p.avg_ms}ms avg · <span style="color:${p.errors>0?'#f44':'var(--a1)'}">${p.error_rate}</span></div>
          </div>
          <div class="provider-models">
            ${Object.entries(p.models||{}).map(([m,mStats])=>`<div class="provider-model">
              <span style="color:var(--t3)">${esc(m)}</span>
              <span>${mStats.calls} · ${mStats.avg_ms}ms · ${mStats.error_rate}</span>
            </div>`).join('')}
          </div>
        </div>`).join('');
      provDiv.innerHTML=provHtml||'<div style="color:var(--t3);text-align:center;padding:14px;font-size:12px">No provider data yet</div>';
    }

    // Recent traces
    const tracesDiv=document.getElementById('obs-traces');
    if(tracesDiv){
      const tracesList=(traces.traces||[]).slice(0,10).map(t=>`
        <div class="trace-timeline" onclick="viewTrace('${esc(t.trace_id)}')" style="cursor:pointer;transition:.2s" onmouseover="this.style.borderColor='var(--a1)'" onmouseout="this.style.borderColor='var(--border)'">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span style="font-size:12px;color:var(--text);font-weight:600">${esc(t.operation||'unknown')}</span>
            <span style="font-size:10px;color:var(--t3)">${t.spans} spans · ${t.total_duration_ms}ms${t.errors>0?` · <span style="color:#f44">${t.errors} err</span>`:''}</span>
          </div>
          <div style="font-size:10px;color:var(--t3)">${esc(t.trace_id)}</div>
        </div>`).join('');
      tracesDiv.innerHTML=tracesList||'<div style="color:var(--t3);text-align:center;padding:14px;font-size:12px">No traces yet</div>';
    }
  }catch(e){toast(e.message,'error');}
}

function toggleObsAuto(){
  const btn=document.getElementById('obs-auto-btn');
  if(_observatoryInterval){
    clearInterval(_observatoryInterval);
    _observatoryInterval=null;
    if(btn)btn.textContent='▶️ Auto-refresh';
  }else{
    _observatoryInterval=setInterval(refreshObservatory,5000);
    if(btn)btn.textContent='⏸️ Stop';
  }
}

// ── 📊 SYSTEM HEALTH (Production monitoring) ──
async function navigate_health(){
  S.page='health';closeSidebar();
  document.getElementById('tool-label').textContent='📊 System Health';
  document.getElementById('tool-sub').textContent='Production monitoring';

  document.getElementById('messages').innerHTML=`<div class="page-wrap ai-os-bg">
    <div class="page-title">📊 System Health</div>
    <div id="health-stats" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:24px"></div>
    <div id="health-detail"></div>
  </div>`;

  refreshHealth();
}

async function refreshHealth(){
  try{
    const h=await api('/api/core/health');
    const stats=document.getElementById('health-stats');
    if(stats){
      stats.innerHTML=`
        <div class="dash-card"><div class="dash-num" style="color:var(--a1)">✓</div><div class="dash-lbl">${esc(h.status)}</div></div>
        <div class="dash-card"><div class="dash-num">${Math.floor(h.uptime_seconds/60)}m</div><div class="dash-lbl">Uptime</div></div>
        <div class="dash-card"><div class="dash-num">${h.memory.rss_mb}</div><div class="dash-lbl">RAM (MB)</div></div>
        <div class="dash-card"><div class="dash-num">${h.cache.memory_size||0}</div><div class="dash-lbl">Cache (mem)</div></div>
        <div class="dash-card"><div class="dash-num">${h.cache.db_size||0}</div><div class="dash-lbl">Cache (DB)</div></div>
        <div class="dash-card"><div class="dash-num">${h.cache.total_hits||0}</div><div class="dash-lbl">Cache hits</div></div>
        <div class="dash-card"><div class="dash-num">${h.workers?.queued||0}</div><div class="dash-lbl">Jobs queued</div></div>
        <div class="dash-card"><div class="dash-num">${h.workers?.running||0}</div><div class="dash-lbl">Jobs running</div></div>
      `;
    }
    const detail=document.getElementById('health-detail');
    if(detail){
      detail.innerHTML=`
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:14px">
          <div style="font-size:13px;font-weight:600;margin-bottom:10px">⚙️ Workers (last hour)</div>
          ${Object.entries(h.workers||{}).map(([k,v])=>`<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid var(--border)"><span>${esc(k)}</span><span style="color:var(--a1)">${v}</span></div>`).join('')||'<div style="color:var(--t3);font-size:12px">No worker activity</div>'}
        </div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:14px">
          <div style="font-size:13px;font-weight:600;margin-bottom:10px">🎼 Orchestrations (24h)</div>
          ${Object.entries(h.orchestrations_24h||{}).map(([k,v])=>`<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid var(--border)"><span>${esc(k)}</span><span style="color:var(--a1)">${v}</span></div>`).join('')||'<div style="color:var(--t3);font-size:12px">No orchestrations yet</div>'}
        </div>
        <button onclick="clearAppCache()" style="background:var(--bg2);border:1px solid var(--border);color:var(--text);padding:10px 16px;border-radius:8px;font-size:13px;cursor:pointer">🗑️ Clear Cache</button>
        <button onclick="refreshHealth()" style="background:var(--bg2);border:1px solid var(--border);color:var(--text);padding:10px 16px;border-radius:8px;font-size:13px;cursor:pointer;margin-left:8px">🔄 Refresh</button>
      `;
    }
  }catch(e){toast(e.message,'error');}
}

async function clearAppCache(){
  if(!confirm('Clear all cache? Subsequent requests will be slower until cache rebuilds.'))return;
  try{
    await api('/api/core/cache/clear',{method:'DELETE'});
    toast('Cache cleared','success');
    refreshHealth();
  }catch(e){toast(e.message,'error');}
}

// ── ⚡ ONE-PROMPT KILLER EXPERIENCE ──────────
async function navigate_oneprompt(){
  S.page='oneprompt';closeSidebar();
  document.getElementById('tool-label').textContent='⚡ One-Prompt';
  document.getElementById('tool-sub').textContent='Just describe — AI executes everything';

  document.getElementById('messages').innerHTML=`<div class="page-wrap ai-os-bg">
    <div style="text-align:center;padding:32px 0 24px">
      <div class="gradient-text" style="font-size:48px;font-weight:300;letter-spacing:-1px;margin-bottom:8px">One Prompt.</div>
      <div class="gradient-text" style="font-size:48px;font-weight:700;letter-spacing:-1px;margin-bottom:14px">Real Outcome.</div>
      <div style="color:var(--t2);font-size:14px;max-width:520px;margin:0 auto">Describe what you want. AI plans, designs, codes, deploys, and launches it for you.</div>
    </div>

    <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:18px;padding:24px;margin-bottom:24px;box-shadow:0 12px 60px var(--a1)10">
      <textarea id="op-prompt" placeholder="e.g. Build me a SaaS for restaurants to manage reservations and orders" rows="3"
        style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:14px;font-size:15px;color:var(--text);outline:none;resize:vertical;box-sizing:border-box;font-family:inherit;line-height:1.5"></textarea>
      <button onclick="runOnePrompt()" style="margin-top:14px;width:100%;background:var(--grad);color:#000;border:none;padding:16px;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;letter-spacing:.3px">⚡ Execute</button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;margin-bottom:24px">
      ${[
        'Build a SaaS for gym owners',
        'Build a fitness tracking app',
        'Build a freelancer invoicing tool',
        'Build an AI writing assistant',
        'Research the AI productivity market',
      ].map(s=>`<button onclick="document.getElementById('op-prompt').value='${esc(s)}';document.getElementById('op-prompt').focus()"
        style="background:var(--bg2);border:1px solid var(--border);color:var(--t2);padding:10px 12px;border-radius:8px;font-size:11px;cursor:pointer;text-align:left">💡 ${esc(s)}</button>`).join('')}
    </div>

    <div id="op-output"></div>
  </div>`;
}

async function runOnePrompt(){
  const prompt=document.getElementById('op-prompt')?.value?.trim();
  if(!prompt){toast('Describe what you want!','error');return;}

  const out=document.getElementById('op-output');
  out.innerHTML=`
    <div style="background:linear-gradient(135deg,var(--bg2),var(--bg3));border:1px solid var(--a1);border-radius:14px;padding:20px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
        <div class="thinking-wave"><div class="thinking-bar"></div><div class="thinking-bar"></div><div class="thinking-bar"></div><div class="thinking-bar"></div><div class="thinking-bar"></div></div>
        <div style="font-size:14px;font-weight:600">AI is thinking...</div>
      </div>
      <div id="op-phase" style="font-size:12px;color:var(--t2)">Initializing</div>
    </div>
    <div id="op-dag-canvas" class="dag-canvas" style="display:none;margin-bottom:14px"></div>
    <div id="op-nodes" style="display:flex;flex-direction:column;gap:8px"></div>
    <div id="op-final"></div>
  `;

  const nodeStates={};
  const nodeIcons={
    strategy:'👔', product_spec:'📦', design:'🎨',
    backend:'💻', frontend:'🖥️', marketing:'📢', deploy_config:'🚀',
    research:'🔬', analysis:'📊', report:'📝',
    plan:'📋', code:'💻', tests:'🧪', response:'💬',
  };
  let dagShown=false;
  let projectId=null;

  function ensureDag(){
    if(dagShown)return;
    const canvas=document.getElementById('op-dag-canvas');
    if(canvas){canvas.style.display='block';dagShown=true;}
  }

  function renderNode(node, status){
    nodeStates[node]=status;
    const canvas=document.getElementById('op-dag-canvas');
    if(!canvas)return;

    let nodeEl=document.getElementById('dag-'+node);
    if(!nodeEl){
      // Group nodes into a single layer for now — can be enhanced with topological detection
      let layer=canvas.querySelector('.dag-layer');
      if(!layer){
        layer=document.createElement('div');
        layer.className='dag-layer';
        canvas.appendChild(layer);
      }
      nodeEl=document.createElement('div');
      nodeEl.id='dag-'+node;
      nodeEl.className='dag-node';
      nodeEl.innerHTML=`<div class="dag-node-pulse"></div>
        <div class="dag-node-icon">${nodeIcons[node]||'⚡'}</div>
        <div class="dag-node-name">${esc(node.replace(/_/g,' '))}</div>
        <div class="dag-node-status" id="dag-status-${node}">${status}</div>`;
      layer.appendChild(nodeEl);
    }
    nodeEl.dataset.status=status;
    const st=document.getElementById('dag-status-'+node);
    if(st)st.textContent=status;
  }

  try{
    const resp=await fetch(API+'/api/core/one-prompt',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+S.token},
      body:JSON.stringify({prompt})
    });
    const reader=resp.body.getReader();
    const decoder=new TextDecoder();
    let buffer='';

    while(true){
      const {done,value}=await reader.read();if(done)break;
      buffer+=decoder.decode(value,{stream:true});
      const lines=buffer.split('\n');
      buffer=lines.pop()||'';

      for(const line of lines){
        if(!line.startsWith('data: '))continue;
        try{
          const d=JSON.parse(line.slice(6));

          if(d.type==='phase'){
            const ph=document.getElementById('op-phase');
            if(ph)ph.textContent=d.label||d.name;
          }

          if(d.type==='intent_detected'){
            const ph=document.getElementById('op-phase');
            if(ph)ph.innerHTML=`Intent: <strong>${esc(d.intent.intent)}</strong> · ${esc(d.intent.domain||'')} · Confidence: ${d.intent.confidence}%`;
          }

          if(d.type==='graph_ready'){
            const ph=document.getElementById('op-phase');
            if(ph)ph.textContent=`📋 Plan ready: ${d.node_count} agents will execute`;
          }

          if(d.type==='execution'){
            const e=d.event;
            const nodes=document.getElementById('op-nodes');

            if(e.type==='node_start'){
              ensureDag();
              renderNode(e.node,'running');
              if(!nodeStates['_card_'+e.node]){
                nodeStates['_card_'+e.node]=true;
                const card=document.createElement('div');
                card.id='op-node-'+e.node;
                card.style.cssText='background:var(--bg2);border:1px solid var(--a2);border-radius:10px;padding:12px;display:flex;align-items:center;gap:12px;animation:msgIn .3s ease';
                card.innerHTML=`<div id="op-icon-${e.node}" style="font-size:18px">⚡</div>
                  <div style="flex:1"><div style="font-size:13px;font-weight:600">${esc(e.node.replace(/_/g,' '))}</div>
                  <div id="op-meta-${e.node}" style="font-size:11px;color:var(--t3)">running...</div></div>`;
                nodes.appendChild(card);
              }
            }

            if(e.type==='node_done'){
              renderNode(e.node, e.cached?'cached':'done');
              const icon=document.getElementById('op-icon-'+e.node);
              const meta=document.getElementById('op-meta-'+e.node);
              const card=document.getElementById('op-node-'+e.node);
              if(icon)icon.textContent=e.cached?'⚡':'✅';
              if(meta)meta.innerHTML=`<span style="color:var(--a1)">${e.cached?'cached':'completed'}</span> · ${esc(e.provider||'')+'/'+esc(e.model||'')} · ${e.duration_ms}ms`;
              if(card)card.style.borderColor=e.cached?'#7c3aed':'var(--a1)';
            }

            if(e.type==='node_error'){
              renderNode(e.node,'error');
              const meta=document.getElementById('op-meta-'+e.node);
              if(meta)meta.innerHTML=`<span style="color:#fbbf24">retry ${e.attempt}: ${esc(e.error)}</span>`;
            }
          }

          if(d.type==='complete'){
            projectId=d.project_id;
            const final=document.getElementById('op-final');
            const designHtml=d.results?.design?.landing_html;
            window._opResults=d.results;

            if(final){
              final.innerHTML=`
                <div style="background:linear-gradient(135deg,#c6f13520,#35f1c620);border:1px solid var(--a1);border-radius:16px;padding:20px;margin-top:14px">
                  <div style="font-size:18px;font-weight:700;margin-bottom:6px">🎉 ${esc(d.summary)}</div>
                  <div style="font-size:13px;color:var(--t2);margin-bottom:14px">All ${Object.keys(d.results||{}).length} agents completed</div>
                  <div style="display:flex;gap:8px;flex-wrap:wrap">
                    ${designHtml?`<button onclick="opPreview()" style="background:var(--grad);color:#000;border:none;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">🎨 Preview Landing</button>`:''}
                    ${projectId?`<button onclick="navigate_team();setTimeout(()=>viewProject(${projectId}),300)" style="background:var(--bg2);border:1px solid var(--border);color:var(--text);padding:10px 16px;border-radius:8px;font-size:13px;cursor:pointer">📁 Open Project</button>`:''}
                    ${projectId?`<button onclick="navigate_deploy()" style="background:var(--bg2);border:1px solid var(--border);color:var(--text);padding:10px 16px;border-radius:8px;font-size:13px;cursor:pointer">🚀 Deploy</button>`:''}
                    <button onclick="opShowResults()" style="background:var(--bg2);border:1px solid var(--border);color:var(--text);padding:10px 16px;border-radius:8px;font-size:13px;cursor:pointer">📋 View All</button>
                  </div>
                </div>
              `;
            }
            toast('🎉 Done!','success');
            notify('NexusAI', d.summary);
          }

          if(d.type==='error'){toast('❌ '+d.error,'error');}
        }catch(_){}
      }
    }
  }catch(e){toast('❌ '+e.message,'error');}
}

function opPreview(){
  const html=window._opResults?.design?.landing_html;
  if(!html){toast('No landing page','error');return;}
  openCanvas(html,'Landing Page');
}

function opShowResults(){
  const r=window._opResults||{};
  const text=Object.entries(r).map(([k,v])=>`## ${k}\n\n\`\`\`json\n${JSON.stringify(v,null,2).slice(0,1500)}\n\`\`\``).join('\n\n');
  addMsg({role:'assistant',text});
}

// ── 🚀 DEPLOY CENTER (Real GitHub + Vercel + Railway) ──────
async function navigate_deploy(){
  S.page='deploy';closeSidebar();
  document.getElementById('tool-label').textContent='🚀 Deploy Center';
  document.getElementById('tool-sub').textContent='Real GitHub + Vercel + Railway deploy';

  let connections=[];
  try{const d=await api('/api/deploy/connections');connections=d.connections||[];}catch(_){}
  const has = s => connections.find(c=>c.service===s);

  let deployments=[];
  try{const d=await api('/api/deploy/deployments');deployments=d.deployments||[];}catch(_){}

  document.getElementById('messages').innerHTML=`<div class="page-wrap ai-os-bg">
    <div class="page-title gradient-text">🚀 Deploy Center</div>
    <p style="color:var(--t2);font-size:14px;margin-bottom:24px">Connect once, deploy any project to production with one click</p>

    <div style="font-size:13px;font-weight:600;margin-bottom:12px;color:var(--t2)">🔗 CONNECTED SERVICES</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-bottom:32px">
      ${[
        {s:'github',e:'⚡',n:'GitHub',d:'Repo creation + push',url:'https://github.com/settings/tokens/new?scopes=repo,workflow&description=NexusAI'},
        {s:'vercel',e:'▲',n:'Vercel',d:'Frontend deploy',url:'https://vercel.com/account/tokens'},
        {s:'railway',e:'🚂',n:'Railway',d:'Backend deploy',url:'https://railway.app/account/tokens'},
        {s:'cloudflare',e:'☁️',n:'Cloudflare',d:'DNS + Custom domains',url:'https://dash.cloudflare.com/profile/api-tokens'},
      ].map(svc=>{
        const conn=has(svc.s);
        return `<div class="connect-card ${conn?'connected':''}" onclick="${conn?`disconnectService('${svc.s}')`:`connectService('${svc.s}','${svc.url}')`}">
          <div class="connect-icon">${svc.e}</div>
          <div class="connect-name">${svc.n}</div>
          <div class="connect-status">${conn?`✓ ${conn.username||'Connected'}`:svc.d}</div>
        </div>`;
      }).join('')}
    </div>

    <div style="font-size:13px;font-weight:600;margin-bottom:12px;color:var(--t2)">📦 DEPLOY A PROJECT</div>
    <div id="deploy-projects" style="display:flex;flex-direction:column;gap:10px;margin-bottom:32px"></div>

    ${deployments.length?`<div style="font-size:13px;font-weight:600;margin-bottom:12px;color:var(--t2)">🌐 LIVE DEPLOYMENTS</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${deployments.map(d=>`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px;display:flex;align-items:center;gap:12px">
        <div style="font-size:20px">🌐</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600">${esc(d.repo_name)}</div>
          <div style="font-size:11px;color:var(--t3)">${new Date(d.created_at).toLocaleString()}</div>
        </div>
        ${d.repo_url?`<a href="${d.repo_url}" target="_blank" class="sm-btn">GitHub</a>`:''}
        ${d.vercel_url?`<a href="${d.vercel_url}" target="_blank" class="sm-btn" style="color:var(--a1);border-color:var(--a1)">Live →</a>`:''}
      </div>`).join('')}
    </div>`:''}

    <div id="deploy-output"></div>
  </div>`;

  // Load user's projects
  try{
    const {projects=[]}=await api('/api/agents/projects');
    const completed=projects.filter(p=>p.status==='completed');
    document.getElementById('deploy-projects').innerHTML=
      completed.length ? completed.slice(0,10).map(p=>`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px;display:flex;align-items:center;gap:12px">
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600">${esc(p.name)}</div>
          <div style="font-size:11px;color:var(--t3)">${new Date(p.created_at).toLocaleDateString()}</div>
        </div>
        <button onclick="deployProject(${p.id},'${esc(p.name).toLowerCase().replace(/[^a-z0-9]/g,'-').slice(0,30)}')" style="background:var(--grad);color:#000;border:none;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">🚀 Deploy</button>
      </div>`).join('') : '<div style="color:var(--t3);text-align:center;padding:24px;font-size:13px">No projects yet. Build one with AI Team first.</div>';
  }catch(_){}
}

async function connectService(service, helpUrl){
  const token = prompt(`Get your ${service} token from:\n${helpUrl}\n\nPaste here:`);
  if(!token) return;
  toast('🔄 Verifying...', 'success');
  try{
    const d = await api('/api/deploy/connect',{method:'POST',body:{service,token}});
    toast(`✅ ${service} connected as ${d.info?.login||d.info?.email||'user'}!`, 'success');
    navigate_deploy();
  }catch(e){toast('❌ '+e.message,'error');}
}

async function disconnectService(service){
  if(!confirm(`Disconnect ${service}?`))return;
  await api('/api/deploy/connect/'+service,{method:'DELETE'});
  toast(`Disconnected from ${service}`,'success');
  navigate_deploy();
}

async function deployProject(projectId, repoName){
  const finalName = prompt('Repository name:', repoName);
  if(!finalName)return;

  const output = document.getElementById('deploy-output');
  if(output){
    output.innerHTML=`<div style="margin-top:24px">
      <div style="font-size:13px;font-weight:600;margin-bottom:10px">🚀 Deploying ${esc(finalName)}...</div>
      <div class="live-progress" style="margin-bottom:14px"><div id="dep-bar" class="live-progress-fill" style="width:0%"></div></div>
      <div class="deploy-console" id="dep-console"></div>
    </div>`;
  }

  const log = (line, type='info')=>{
    const c = document.getElementById('dep-console');
    if(c){
      const d = document.createElement('div');
      d.className='log-line log-'+type;
      d.textContent='> '+line;
      c.appendChild(d);
      c.scrollTop = c.scrollHeight;
    }
  };

  log('Starting deployment pipeline...','info');

  try{
    const resp = await fetch(API+'/api/deploy/deploy/full',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+S.token},
      body:JSON.stringify({project_id:projectId, repo_name:finalName})
    });

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer='';

    while(true){
      const {done,value} = await reader.read();
      if(done)break;
      buffer += decoder.decode(value,{stream:true});
      const lines = buffer.split('\n');
      buffer = lines.pop()||'';

      for(const line of lines){
        if(!line.startsWith('data: '))continue;
        try{
          const d = JSON.parse(line.slice(6));
          if(d.type==='step'){
            log(d.message, d.status==='done'?'success':d.status==='error'?'error':'step');
            const bar = document.getElementById('dep-bar');
            if(bar && d.progress)bar.style.width=d.progress+'%';
          }
          if(d.type==='complete'){
            log('🎉 Deployment complete!','success');
            const bar = document.getElementById('dep-bar');
            if(bar)bar.style.width='100%';
            if(d.live_url){
              log('Live URL: '+d.live_url,'success');
              setTimeout(()=>{
                if(confirm('🎉 Deployed!\n\nOpen live site?\n'+d.live_url)){
                  window.open(d.live_url,'_blank');
                }
              },500);
            }
            notify('NexusAI','🚀 Project deployed!');
          }
          if(d.type==='error'){log('ERROR: '+d.message,'error');}
        }catch(_){}
      }
    }
  }catch(e){log('FATAL: '+e.message,'error');}
}

// ── 🌍 PUBLIC SHOWCASE ────────────────────────
async function navigate_showcase(){
  S.page='showcase';closeSidebar();
  document.getElementById('tool-label').textContent='🌍 Showcase';
  document.getElementById('tool-sub').textContent='Built with NexusAI';

  let projects=[];
  try{const d=await api('/api/agents/projects');projects=d.projects.filter(p=>p.status==='completed');}catch(_){}

  document.getElementById('messages').innerHTML=`<div class="page-wrap ai-os-bg">
    <div class="page-title gradient-text">🌍 Public Showcase</div>
    <p style="color:var(--t2);font-size:14px;margin-bottom:24px">Share your AI-built startups with the world</p>

    ${projects.length?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px">
      ${projects.map(p=>`<div class="showcase-card" onclick="window.open('${window.location.origin}/share.html?id=${p.share_id}','_blank')">
        <div class="showcase-thumb">🚀</div>
        <div class="showcase-meta">
          <div class="showcase-title">${esc(p.name)}</div>
          <div class="showcase-desc">${esc(p.idea.slice(0,100))}${p.idea.length>100?'...':''}</div>
          <div class="showcase-stats">
            <span>📅 ${new Date(p.created_at).toLocaleDateString()}</span>
            <span>✓ ${p.status}</span>
          </div>
        </div>
      </div>`).join('')}
    </div>`:'<div style="text-align:center;padding:40px;color:var(--t3)">No completed projects yet. Build one with AI Team!</div>'}
  </div>`;
}

// ── 🎤 VOICE INTERACTION ──────────────────────
let voiceRec = null;
let voiceListening = false;

async function navigate_voice(){
  S.page='voice';closeSidebar();
  document.getElementById('tool-label').textContent='🎤 Voice AI';
  document.getElementById('tool-sub').textContent='Talk to NexusAI';

  document.getElementById('messages').innerHTML=`<div class="page-wrap ai-os-bg" style="text-align:center;padding-top:80px">
    <div style="margin-bottom:32px">
      <button class="voice-orb" id="voice-orb-btn" onclick="toggleVoiceListening()">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
        </svg>
      </button>
    </div>
    <div id="voice-status" style="font-size:14px;color:var(--t2);margin-bottom:24px">Tap to speak</div>
    <div id="voice-transcript" style="max-width:600px;margin:0 auto;font-size:18px;font-weight:300;line-height:1.5;color:var(--text);min-height:60px"></div>
    <div id="voice-response" style="max-width:600px;margin:24px auto;text-align:left"></div>
  </div>`;
}

async function toggleVoiceListening(){
  if(voiceListening){
    voiceRec?.stop();
    voiceListening=false;
    document.getElementById('voice-status').textContent='Tap to speak';
    return;
  }

  if(!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)){
    toast('Voice not supported in this browser','error');return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  voiceRec = new SR();
  voiceRec.continuous = false;
  voiceRec.interimResults = true;
  voiceRec.lang = 'en-US';

  voiceRec.onstart = ()=>{
    voiceListening = true;
    document.getElementById('voice-status').textContent='🎙️ Listening...';
  };

  voiceRec.onresult = (e)=>{
    let interim='', final='';
    for(let i=e.resultIndex; i<e.results.length; i++){
      const t = e.results[i][0].transcript;
      if(e.results[i].isFinal) final += t;
      else interim += t;
    }
    document.getElementById('voice-transcript').textContent = (final||interim);
    if(final) processVoiceCommand(final);
  };

  voiceRec.onerror = (e)=>{
    document.getElementById('voice-status').textContent='Error: '+e.error;
    voiceListening=false;
  };

  voiceRec.onend = ()=>{
    voiceListening=false;
    if(document.getElementById('voice-status'))
      document.getElementById('voice-status').textContent='Tap to speak';
  };

  voiceRec.start();
}

async function processVoiceCommand(text){
  document.getElementById('voice-status').textContent='💭 Thinking...';
  const responseEl = document.getElementById('voice-response');
  if(responseEl) responseEl.innerHTML = '<div class="thinking-wave"><div class="thinking-bar"></div><div class="thinking-bar"></div><div class="thinking-bar"></div><div class="thinking-bar"></div><div class="thinking-bar"></div></div>';

  try{
    const r = await api('/api/chat',{method:'POST',body:{message:text}});
    if(responseEl) responseEl.innerHTML = `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px;font-size:14px;line-height:1.5">${esc(r.reply||'')}</div>`;

    // Speak the response
    if('speechSynthesis' in window && r.reply){
      const utt = new SpeechSynthesisUtterance(r.reply.slice(0,500));
      utt.rate = 1.05;
      window.speechSynthesis.speak(utt);
    }
  }catch(e){
    if(responseEl) responseEl.innerHTML = `<div style="color:#f44">Error: ${esc(e.message)}</div>`;
  }
  document.getElementById('voice-status').textContent='Tap to speak again';
}

// ── 🤖 AUTONOMOUS MODE FULL ───────────────────
async function navigate_autonomous(){
  S.page='autonomous';closeSidebar();
  document.getElementById('tool-label').textContent='🤖 Autonomous AI';
  document.getElementById('tool-sub').textContent='AI works on its own';

  document.getElementById('messages').innerHTML=`<div class="page-wrap ai-os-bg">
    <div class="page-title gradient-text">🤖 Autonomous Mode</div>
    <p style="color:var(--t2);font-size:14px;margin-bottom:20px">Set a goal — AI plans, executes, validates, and iterates by itself</p>

    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:24px">
      <div style="font-size:13px;font-weight:600;margin-bottom:10px">🎯 Your goal</div>
      <textarea id="auto-full-goal" placeholder="e.g. Research the top 5 AI productivity tools, compare them, and write a launch strategy for a competitor"
        rows="3" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:12px;font-size:14px;color:var(--text);outline:none;resize:vertical;box-sizing:border-box;font-family:inherit"></textarea>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;align-items:center">
        <select id="auto-iter" style="background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:8px 10px;border-radius:8px;font-size:12px">
          <option value="5">5 iterations</option>
          <option value="10" selected>10 iterations</option>
          <option value="15">15 iterations</option>
          <option value="20">20 iterations</option>
        </select>
        <select id="auto-time" style="background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:8px 10px;border-radius:8px;font-size:12px">
          <option value="180">3 min</option>
          <option value="300" selected>5 min</option>
          <option value="600">10 min</option>
        </select>
        <button onclick="startAutonomousFull()" style="flex:1;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:#fff;border:none;padding:12px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">🚀 Start Autonomous AI</button>
      </div>
    </div>

    <div id="auto-progress"></div>
  </div>`;
}

async function startAutonomousFull(){
  const goal = document.getElementById('auto-full-goal')?.value?.trim();
  if(!goal){toast('Set a goal first!','error');return;}
  const max_iterations = +document.getElementById('auto-iter').value;
  const time_limit_seconds = +document.getElementById('auto-time').value;

  const container = document.getElementById('auto-progress');
  container.innerHTML = `<div style="background:var(--bg2);border:1px solid var(--a1);border-radius:14px;padding:20px;margin-bottom:14px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <div class="thinking-wave"><div class="thinking-bar"></div><div class="thinking-bar"></div><div class="thinking-bar"></div><div class="thinking-bar"></div><div class="thinking-bar"></div></div>
      <div style="font-size:14px;font-weight:600">AI is working...</div>
      <div id="auto-iter-num" style="margin-left:auto;font-size:12px;color:var(--a1)">Iteration 0</div>
    </div>
    <div style="font-size:12px;color:var(--t2)">${esc(goal)}</div>
  </div>
  <div id="auto-iterations" style="display:flex;flex-direction:column;gap:10px"></div>`;

  try{
    const resp = await fetch(API+'/api/os/autonomous/full',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+S.token},
      body:JSON.stringify({goal,max_iterations,time_limit_seconds})
    });
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer='';

    while(true){
      const {done,value} = await reader.read();
      if(done)break;
      buffer += decoder.decode(value,{stream:true});
      const lines = buffer.split('\n');
      buffer = lines.pop()||'';

      for(const line of lines){
        if(!line.startsWith('data: '))continue;
        try{
          const d = JSON.parse(line.slice(6));
          const iters = document.getElementById('auto-iterations');
          if(!iters)continue;

          if(d.type==='iteration_start'){
            const num=document.getElementById('auto-iter-num');
            if(num)num.textContent=`Iteration ${d.iteration}`;
            const card = document.createElement('div');
            card.id='iter-card-'+d.iteration;
            card.style.cssText='background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px';
            card.innerHTML=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <div style="width:28px;height:28px;border-radius:50%;background:var(--grad);color:#000;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px">${d.iteration}</div>
              <div style="font-size:13px;font-weight:600">Iteration ${d.iteration}</div>
              <div id="iter-phase-${d.iteration}" style="margin-left:auto;font-size:11px;color:var(--a2)">starting...</div>
            </div>
            <div id="iter-content-${d.iteration}"></div>`;
            iters.appendChild(card);
            card.scrollIntoView({behavior:'smooth',block:'end'});
          }

          if(d.type==='phase'){
            const p = document.getElementById('iter-phase-'+d.iteration);
            if(p)p.textContent=d.phase;
          }

          if(d.type==='plan'){
            const c = document.getElementById('iter-content-'+d.iteration);
            if(c)c.innerHTML += `<div style="background:var(--bg3);border-radius:8px;padding:10px;margin-bottom:6px">
              <div style="font-size:11px;color:var(--t3);text-transform:uppercase;margin-bottom:4px">💭 Thought</div>
              <div style="font-size:12px;color:var(--t2);margin-bottom:8px">${esc(d.plan.thought||'')}</div>
              <div style="font-size:11px;color:var(--a1);text-transform:uppercase;margin-bottom:4px">⚡ Action</div>
              <div style="font-size:12px;font-weight:500">${esc(d.plan.next_action||'')}</div>
            </div>`;
          }

          if(d.type==='execution'){
            const c = document.getElementById('iter-content-'+d.iteration);
            if(c)c.innerHTML += `<div style="background:var(--bg3);border-radius:8px;padding:10px;margin-bottom:6px">
              <div style="font-size:11px;color:var(--t3);text-transform:uppercase;margin-bottom:4px">✅ Result</div>
              <div style="font-size:12px;color:var(--t2);max-height:200px;overflow:auto;white-space:pre-wrap">${esc(d.output||'')}</div>
            </div>`;
          }

          if(d.type==='validation'){
            const c = document.getElementById('iter-content-'+d.iteration);
            if(c)c.innerHTML += `<div style="background:var(--bg3);border-radius:8px;padding:10px">
              <div style="display:flex;gap:12px;font-size:11px;color:var(--t3)">
                <span>Quality: <strong style="color:var(--a1)">${d.validation.quality}/100</strong></span>
                <span>Progress: <strong style="color:var(--a2)">${d.validation.goal_progress_pct}%</strong></span>
              </div>
              <div style="font-size:11px;color:var(--t3);margin-top:4px">📚 ${esc(d.validation.learned||'')}</div>
            </div>`;
            const p = document.getElementById('iter-phase-'+d.iteration);
            if(p)p.textContent='✓ done';
          }

          if(d.type==='complete'){
            const final = document.createElement('div');
            final.style.cssText='background:linear-gradient(135deg,#c6f13520,#35f1c620);border:1px solid var(--a1);border-radius:14px;padding:20px;text-align:center;margin-top:14px';
            final.innerHTML=`<div style="font-size:32px;margin-bottom:8px">${d.achieved?'🎯':'⏱️'}</div>
              <div style="font-size:16px;font-weight:700">${esc(d.summary||'')}</div>
              <div style="font-size:12px;color:var(--t2);margin-top:6px">Time: ${d.total_time_seconds}s · Iterations: ${d.iteration}</div>`;
            iters.appendChild(final);
            toast(d.achieved?'🎯 Goal achieved!':'⏱️ Stopped','success');
            notify('NexusAI', d.summary);
          }

          if(d.type==='error'){toast('❌ '+d.error,'error');}
        }catch(_){}
      }
    }
  }catch(e){toast('❌ '+e.message,'error');}
}

// ── 🎭 DEBATE SYSTEM UI ───────────────────────
async function navigate_debate(){
  S.page='debate';closeSidebar();
  document.getElementById('tool-label').textContent='🎭 AI Debate';
  document.getElementById('tool-sub').textContent='Multiple agents debate, then converge';

  document.getElementById('messages').innerHTML=`<div class="page-wrap ai-os-bg">
    <div class="page-title gradient-text">🎭 AI Debate System</div>
    <p style="color:var(--t2);font-size:14px;margin-bottom:20px">Multiple AI perspectives debate your topic, then synthesize a consensus</p>

    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:24px">
      <div style="font-size:13px;font-weight:600;margin-bottom:10px">🎯 Topic to debate</div>
      <textarea id="debate-topic" placeholder="e.g. Should we build a B2B or B2C product first?" rows="2"
        style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:12px;font-size:14px;color:var(--text);outline:none;resize:vertical;box-sizing:border-box;font-family:inherit"></textarea>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <input id="debate-perspectives" placeholder="optimist,skeptic,realist" value="optimist,skeptic,realist" style="flex:1;background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:10px;border-radius:8px;font-size:12px;outline:none"/>
        <button onclick="startDebateAI()" style="background:var(--grad);color:#000;border:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">🥊 Debate</button>
      </div>
    </div>

    <div id="debate-output"></div>
  </div>`;
}

async function startDebateAI(){
  const topic = document.getElementById('debate-topic')?.value?.trim();
  if(!topic){toast('Enter topic','error');return;}
  const perspectives = document.getElementById('debate-perspectives').value.split(',').map(p=>p.trim()).filter(Boolean);

  const out = document.getElementById('debate-output');
  out.innerHTML = `<div id="debate-rounds" style="display:flex;flex-direction:column;gap:10px"></div>`;

  try{
    const resp = await fetch(API+'/api/os/debate',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+S.token},
      body:JSON.stringify({topic,perspectives,rounds:2})
    });
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer='';

    while(true){
      const {done,value} = await reader.read();
      if(done)break;
      buffer += decoder.decode(value,{stream:true});
      const lines = buffer.split('\n');
      buffer = lines.pop()||'';

      for(const line of lines){
        if(!line.startsWith('data: '))continue;
        try{
          const d = JSON.parse(line.slice(6));
          const rounds = document.getElementById('debate-rounds');

          if(d.type==='argument'){
            const colors = {optimist:'#c6f135',skeptic:'#f44',realist:'#35f1c6'};
            const c = colors[d.perspective] || 'var(--a1)';
            rounds.innerHTML += `<div style="background:var(--bg2);border-left:3px solid ${c};border-radius:8px;padding:12px">
              <div style="font-size:11px;color:${c};text-transform:uppercase;font-weight:700;margin-bottom:6px">Round ${d.round} · ${d.perspective}</div>
              <div style="font-size:13px;line-height:1.5">${esc(d.argument)}</div>
            </div>`;
            rounds.scrollIntoView({behavior:'smooth',block:'end'});
          }

          if(d.type==='complete'){
            const cons = d.consensus || {};
            rounds.innerHTML += `<div style="background:linear-gradient(135deg,#c6f13520,#35f1c620);border:1px solid var(--a1);border-radius:14px;padding:18px;margin-top:14px">
              <div style="font-size:14px;font-weight:700;margin-bottom:10px">🎯 Consensus (${cons.confidence||0}% confidence)</div>
              <div style="font-size:13px;line-height:1.5;margin-bottom:12px">${esc(cons.consensus||'')}</div>
              ${cons.recommended_action?`<div style="background:var(--bg2);border-radius:8px;padding:12px;margin-top:10px">
                <div style="font-size:11px;color:var(--a1);font-weight:700;margin-bottom:4px">⚡ RECOMMENDED ACTION</div>
                <div style="font-size:13px">${esc(cons.recommended_action)}</div>
              </div>`:''}
              ${cons.key_insights?.length?`<div style="margin-top:10px"><div style="font-size:11px;color:var(--t3);margin-bottom:6px">KEY INSIGHTS</div>${cons.key_insights.map(i=>`<div style="font-size:12px;padding:3px 0">• ${esc(i)}</div>`).join('')}</div>`:''}
            </div>`;
            toast('🎯 Consensus reached!','success');
          }
        }catch(_){}
      }
    }
  }catch(e){toast('❌ '+e.message,'error');}
}

// ── 📋 PLANNER UI ─────────────────────────────
async function navigate_planner(){
  S.page='planner';closeSidebar();
  document.getElementById('tool-label').textContent='📋 AI Planner';
  document.getElementById('tool-sub').textContent='Break any goal into executable plan';

  document.getElementById('messages').innerHTML=`<div class="page-wrap ai-os-bg">
    <div class="page-title gradient-text">📋 AI Planner</div>
    <p style="color:var(--t2);font-size:14px;margin-bottom:20px">Turn any goal into a phase-by-phase executable plan</p>

    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:24px">
      <textarea id="plan-goal" placeholder="e.g. Launch my SaaS to first 100 paying users in 60 days" rows="2"
        style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:12px;font-size:14px;color:var(--text);outline:none;resize:vertical;box-sizing:border-box;font-family:inherit"></textarea>
      <input id="plan-constraints" placeholder="Constraints (e.g. budget $500, solo founder)" style="width:100%;background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:10px;border-radius:8px;font-size:12px;margin-top:10px;outline:none;box-sizing:border-box"/>
      <button onclick="generatePlan()" style="margin-top:12px;width:100%;background:var(--grad);color:#000;border:none;padding:12px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">📋 Generate Plan</button>
    </div>

    <div id="plan-output"></div>
  </div>`;
}

async function generatePlan(){
  const goal = document.getElementById('plan-goal')?.value?.trim();
  if(!goal){toast('Set goal','error');return;}
  const constraints = document.getElementById('plan-constraints')?.value?.trim();

  const out = document.getElementById('plan-output');
  out.innerHTML = '<div style="text-align:center;padding:24px"><div class="thinking-wave" style="display:inline-flex"><div class="thinking-bar"></div><div class="thinking-bar"></div><div class="thinking-bar"></div><div class="thinking-bar"></div><div class="thinking-bar"></div></div></div>';

  try{
    const d = await api('/api/os/plan',{method:'POST',body:{goal,constraints}});
    out.innerHTML = `
      <div style="background:linear-gradient(135deg,var(--bg2),var(--bg3));border:1px solid var(--a1);border-radius:14px;padding:20px;margin-bottom:14px">
        <div style="font-size:11px;color:var(--a1);text-transform:uppercase;margin-bottom:6px">⚡ DO THIS NOW</div>
        <div style="font-size:14px;font-weight:600">${esc(d.first_action||'')}</div>
        <div style="font-size:11px;color:var(--t3);margin-top:8px">Total estimated: ${d.estimated_total_hours||'?'}h</div>
      </div>
      ${(d.phases||[]).map(p=>`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <div style="width:28px;height:28px;border-radius:50%;background:var(--grad);color:#000;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px">${p.phase}</div>
          <div style="font-size:14px;font-weight:600;flex:1">${esc(p.name)}</div>
          <div style="font-size:11px;color:var(--t3)">${esc(p.duration||'')}</div>
        </div>
        ${(p.tasks||[]).map(t=>`<div style="background:var(--bg3);border-radius:8px;padding:10px;margin-bottom:6px;display:flex;gap:10px;align-items:start">
          <div style="font-size:10px;background:${t.priority==='P0'?'#f44':t.priority==='P1'?'#fbbf24':'var(--bg)'};color:#fff;padding:2px 6px;border-radius:4px;font-weight:700">${t.priority||''}</div>
          <div style="flex:1">
            <div style="font-size:13px">${esc(t.task)}</div>
            <div style="font-size:10px;color:var(--t3);margin-top:2px">${t.owner||'?'} · ${t.estimated_hours||'?'}h</div>
          </div>
        </div>`).join('')}
      </div>`).join('')}
      ${d.milestones?.length?`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px"><div style="font-size:13px;font-weight:600;margin-bottom:8px">🏁 Milestones</div>${d.milestones.map(m=>`<div style="font-size:12px;padding:4px 0">• <strong>${esc(m.date)}:</strong> ${esc(m.milestone)}</div>`).join('')}</div>`:''}
    `;
  }catch(e){out.innerHTML='<div style="color:#f44">'+esc(e.message)+'</div>';}
}

// ── 🤖 AI TEAM (Multi-Agent System) ───────────
async function navigate_team(){
  S.page='team';closeSidebar();
  document.getElementById('tool-label').textContent='🤖 AI Team';
  document.getElementById('tool-sub').textContent='6 agents working together';

  let projects=[];
  try{const d=await api('/api/agents/projects');projects=d.projects||[];}catch(_){}

  document.getElementById('messages').innerHTML=`<div class="page-wrap">
    <div class="page-title">🤖 AI Team — Multi-Agent System</div>
    <p style="color:var(--t2);font-size:14px;margin-bottom:20px">6 specialized agents collaborate: <strong>CEO → Product → Design → Dev → Marketing → Deploy</strong></p>

    <div style="background:linear-gradient(135deg,var(--bg2),var(--bg3));border:1px solid var(--a1)40;border-radius:16px;padding:20px;margin-bottom:20px">
      <div style="font-size:14px;font-weight:600;margin-bottom:10px">💡 What do you want to build?</div>
      <textarea id="team-idea" placeholder="e.g. An AI tool that helps doctors write patient reports 5x faster..." rows="3"
        style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:12px;font-size:14px;color:var(--text);outline:none;resize:vertical;box-sizing:border-box;font-family:inherit"></textarea>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <button onclick="runTeam()" style="flex:1;min-width:160px;background:var(--grad);color:#000;border:none;padding:14px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">🚀 Launch AI Team</button>
        <button onclick="validateIdea()" style="background:var(--bg);border:1px solid var(--border);color:var(--text);padding:14px 16px;border-radius:10px;font-size:13px;cursor:pointer">💡 Validate</button>
        <button onclick="competitorAnalysis()" style="background:var(--bg);border:1px solid var(--border);color:var(--text);padding:14px 16px;border-radius:10px;font-size:13px;cursor:pointer">🔍 Competitors</button>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
        <button onclick="predictRevenue()" style="flex:1;min-width:140px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:10px 16px;border-radius:10px;font-size:12px;cursor:pointer">💰 Revenue Forecast</button>
        <button onclick="detectTrends()" style="flex:1;min-width:140px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:10px 16px;border-radius:10px;font-size:12px;cursor:pointer">📈 Detect Trends</button>
        <button onclick="autonomousMode()" style="flex:1;min-width:140px;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:#fff;border:none;padding:10px 16px;border-radius:10px;font-size:12px;cursor:pointer;font-weight:600">🤖 Autonomous</button>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
        <button onclick="runQAAgent()" style="flex:1;min-width:120px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:10px 14px;border-radius:10px;font-size:12px;cursor:pointer">🔍 QA</button>
        <button onclick="runSecurityAgent()" style="flex:1;min-width:120px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:10px 14px;border-radius:10px;font-size:12px;cursor:pointer">🔒 Security</button>
        <button onclick="runGrowthAgent()" style="flex:1;min-width:120px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:10px 14px;border-radius:10px;font-size:12px;cursor:pointer">📈 Growth</button>
        <button onclick="runAnalyticsAgent()" style="flex:1;min-width:120px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:10px 14px;border-radius:10px;font-size:12px;cursor:pointer">📊 Analytics</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-bottom:20px">
      ${[{e:'👔',n:'CEO',d:'Strategy'},{e:'📦',n:'Product',d:'Specs'},{e:'🎨',n:'Design',d:'UI/UX'},{e:'💻',n:'Dev',d:'Code'},{e:'📢',n:'Marketing',d:'Growth'},{e:'🚀',n:'Deploy',d:'Launch'}].map(a=>`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center"><div style="font-size:24px;margin-bottom:4px">${a.e}</div><div style="font-size:12px;font-weight:600">${a.n}</div><div style="font-size:10px;color:var(--t3)">${a.d}</div></div>`).join('')}
    </div>

    ${projects.length?`<div style="font-size:13px;font-weight:600;margin-bottom:10px">📁 Your Projects</div><div style="display:flex;flex-direction:column;gap:8px">
      ${projects.slice(0,10).map(p=>`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px;display:flex;align-items:center;gap:12px;cursor:pointer" onclick="viewProject(${p.id})">
        <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:500">${esc(p.name)}</div><div style="font-size:11px;color:var(--t3)">${p.status} · ${new Date(p.created_at).toLocaleDateString()}</div></div>
        <span style="font-size:11px;padding:3px 8px;border-radius:99px;background:${p.status==='completed'?'var(--a1)20':'var(--bg3)'};color:${p.status==='completed'?'var(--a1)':'var(--t2)'}">${p.status}</span>
        <button onclick="event.stopPropagation();shareProject('${p.share_id}')" style="background:none;border:1px solid var(--border);color:var(--t2);padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer">Share</button>
      </div>`).join('')}
    </div>`:''}
  </div>`;
}

async function runTeam(){
  const idea=document.getElementById('team-idea')?.value?.trim();
  if(!idea){toast('Enter your startup idea first!','error');return;}

  const agents=[
    {key:'CEO_AGENT',e:'👔',n:'CEO Agent'},{key:'PRODUCT_AGENT',e:'📦',n:'Product Agent'},
    {key:'DESIGN_AGENT',e:'🎨',n:'Design Agent'},{key:'DEV_AGENT',e:'💻',n:'Dev Agent'},
    {key:'MARKETING_AGENT',e:'📢',n:'Marketing Agent'},{key:'DEPLOY_AGENT',e:'🚀',n:'Deploy Agent'},
  ];

  document.getElementById('messages').innerHTML=`<div class="page-wrap">
    <div class="page-title">🤖 Building: "${esc(idea)}"</div>
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
        <div style="font-size:14px;font-weight:600;flex:1">Pipeline Progress</div>
        <div id="team-pct" style="font-size:13px;color:var(--a1);font-weight:700">0%</div>
      </div>
      <div style="background:var(--bg3);border-radius:99px;height:6px;overflow:hidden"><div id="team-bar" style="height:100%;background:var(--grad);width:0%;transition:width .3s"></div></div>
    </div>
    <div id="team-agents" style="display:grid;gap:10px">
      ${agents.map(a=>`<div id="agent-${a.key}" style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px;display:flex;align-items:center;gap:12px;transition:.3s">
        <div id="icon-${a.key}" style="font-size:24px">⚪</div>
        <div style="flex:1"><div style="font-size:13px;font-weight:600">${a.e} ${a.n}</div><div id="status-${a.key}" style="font-size:11px;color:var(--t3)">waiting...</div></div>
        <div id="time-${a.key}" style="font-size:11px;color:var(--t3)"></div>
      </div>`).join('')}
    </div>
    <div id="team-results" style="margin-top:20px"></div>
  </div>`;

  const results={};
  let projectId, shareId;

  try{
    const resp=await fetch(API+'/api/agents/orchestrate',{
      method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+S.token},
      body:JSON.stringify({idea}),
    });

    const reader=resp.body.getReader();
    const decoder=new TextDecoder();
    let buffer='';

    while(true){
      const {done,value}=await reader.read();if(done)break;
      buffer+=decoder.decode(value,{stream:true});
      const lines=buffer.split('\n');
      buffer=lines.pop()||'';

      for(const line of lines){
        if(!line.startsWith('data: '))continue;
        try{
          const d=JSON.parse(line.slice(6));
          if(d.type==='project_created'){projectId=d.project_id;shareId=d.share_id;}
          if(d.type==='agent_started'){
            const icon=document.getElementById('icon-'+d.agent);
            const status=document.getElementById('status-'+d.agent);
            const card=document.getElementById('agent-'+d.agent);
            if(icon)icon.textContent='⚡';
            if(status){status.textContent='working...';status.style.color='var(--a2)';}
            if(card)card.style.borderColor='var(--a2)';
          }
          if(d.type==='agent_completed'){
            const icon=document.getElementById('icon-'+d.agent);
            const status=document.getElementById('status-'+d.agent);
            const card=document.getElementById('agent-'+d.agent);
            const time=document.getElementById('time-'+d.agent);
            if(icon)icon.textContent=d.success?'✅':'❌';
            if(status){status.textContent=d.success?'completed':'failed';status.style.color=d.success?'var(--a1)':'#f44';}
            if(card)card.style.borderColor=d.success?'var(--a1)':'#f44';
            if(time)time.textContent=Math.round(d.duration_ms/1000)+'s';
            results[d.agent]=d.output;
            const pct=document.getElementById('team-pct');
            const bar=document.getElementById('team-bar');
            if(pct)pct.textContent=d.progress+'%';
            if(bar)bar.style.width=d.progress+'%';
          }
          if(d.type==='complete'){
            renderTeamResults(results, d.share_id, d.project_id);
            toast('🎉 Your AI team finished!','success');
            notify('NexusAI','Your startup is ready! 🚀');
          }
          if(d.type==='error'){toast('❌ '+d.error,'error');}
        }catch(_){}
      }
    }
  }catch(e){toast('❌ '+e.message,'error');}
}

function renderTeamResults(results, shareId, projectId){
  const container=document.getElementById('team-results');
  if(!container)return;
  const designHtml=results.DESIGN_AGENT?.landing_page_html;
  window._teamResults=results;
  window._teamProjectId=projectId;
  window._teamShareId=shareId;

  container.innerHTML=`
    <div style="background:linear-gradient(135deg,#c6f13520,#35f1c620);border:1px solid var(--a1);border-radius:16px;padding:20px;margin-bottom:16px">
      <div style="font-size:18px;font-weight:700;margin-bottom:8px">🎉 Your Startup is Ready!</div>
      <div style="font-size:13px;color:var(--t2);margin-bottom:14px">All 6 agents completed</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${designHtml?`<button onclick="previewLanding()" style="background:var(--grad);color:#000;border:none;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">🎨 Preview Landing</button>`:''}
        <button onclick="shareProject('${shareId}')" style="background:var(--bg2);border:1px solid var(--border);color:var(--text);padding:10px 16px;border-radius:8px;font-size:13px;cursor:pointer">🔗 Share</button>
        <button onclick="exportProject(${projectId})" style="background:var(--bg2);border:1px solid var(--border);color:var(--text);padding:10px 16px;border-radius:8px;font-size:13px;cursor:pointer">📤 Export</button>
        <button onclick="improveProject(${projectId})" style="background:var(--bg2);border:1px solid var(--border);color:var(--text);padding:10px 16px;border-radius:8px;font-size:13px;cursor:pointer">🔄 Improve</button>
        <button onclick="generateSocialContent(${projectId})" style="background:var(--bg2);border:1px solid var(--border);color:var(--text);padding:10px 16px;border-radius:8px;font-size:13px;cursor:pointer">📢 Viral Content</button>
      </div>
    </div>
    ${Object.entries(results).map(([key,data])=>{
      const a={CEO_AGENT:{e:'👔',n:'CEO'},PRODUCT_AGENT:{e:'📦',n:'Product'},DESIGN_AGENT:{e:'🎨',n:'Design'},DEV_AGENT:{e:'💻',n:'Dev'},MARKETING_AGENT:{e:'📢',n:'Marketing'},DEPLOY_AGENT:{e:'🚀',n:'Deploy'}}[key];
      if(!data||!a)return '';
      return `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <div style="font-size:24px">${a.e}</div>
          <div style="flex:1"><div style="font-size:13px;font-weight:600">${a.n} Agent</div></div>
          <button onclick="copyAgentOutput('${key}')" class="sm-btn">Copy</button>
        </div>
        <pre style="background:var(--bg3);padding:12px;border-radius:8px;font-size:11px;color:var(--t2);overflow:auto;max-height:200px;white-space:pre-wrap;word-break:break-word">${esc(JSON.stringify(data,null,2).slice(0,1500))}${JSON.stringify(data).length>1500?'...':''}</pre>
      </div>`;
    }).join('')}
  `;
}

function previewLanding(){
  const html=window._teamResults?.DESIGN_AGENT?.landing_page_html;
  if(!html){toast('No landing page','error');return;}
  openCanvas(html,'Landing Page Preview');
}

function copyAgentOutput(key){
  const data=window._teamResults?.[key];
  if(!data)return;
  navigator.clipboard.writeText(JSON.stringify(data,null,2));
  toast('Copied!','success');
}

async function shareProject(shareId){
  const url=`${window.location.origin}/share/${shareId}`;
  await navigator.clipboard.writeText(url).catch(()=>{});
  toast('🔗 Share link copied!','success');
  if(window._teamProjectId){
    api('/api/agents/projects/'+window._teamProjectId+'/analytics',{method:'POST',body:{event:'share'}}).catch(()=>{});
  }
}

async function exportProject(projectId){
  try{
    const d=await api('/api/agents/projects/'+projectId+'/export');
    const blob=new Blob([d.markdown],{type:'text/markdown'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=`${d.project.name.replace(/[^a-z0-9]/gi,'_')}.md`;
    a.click();URL.revokeObjectURL(url);
    toast(`✅ Exported ${d.files.length} files!`,'success');
    api('/api/agents/projects/'+projectId+'/analytics',{method:'POST',body:{event:'export'}}).catch(()=>{});
  }catch(e){toast(e.message,'error');}
}

async function improveProject(projectId){
  const focus=prompt('What to improve? (or leave blank for full analysis)','');
  toast('🔄 Analyzing...','success');
  try{
    const d=await api('/api/agents/improve',{method:'POST',body:{project_id:projectId,focus_area:focus||null}});
    addMsg({role:'user',text:`🔄 Improve ${focus||'all'}`});
    let text=`**🔄 Improvement Analysis**\n\n📊 **Scores:**\n• Viral: ${d.viral_score}/100\n• Monetization: ${d.monetization_score}/100\n• Tech: ${d.tech_quality_score}/100\n\n`;
    if(d.analysis){
      text+=`**✅ Strengths:**\n${(d.analysis.strengths||[]).map(s=>'• '+s).join('\n')}\n\n`;
      text+=`**⚠️ Weaknesses:**\n${(d.analysis.weaknesses||[]).map(w=>'• '+w).join('\n')}\n\n`;
    }
    if(d.improvements?.length){
      text+=`**🔥 Top Improvements:**\n${d.improvements.slice(0,5).map(i=>`\n**${i.priority?.toUpperCase()} - ${i.agent}:**\n${i.area}: ${i.improved_state}`).join('\n')}`;
    }
    addMsg({role:'assistant',text});
  }catch(e){toast(e.message,'error');}
}

async function generateSocialContent(projectId){
  toast('📢 Generating viral content...','success');
  try{
    const d=await api('/api/agents/social-content',{method:'POST',body:{project_id:projectId}});
    addMsg({role:'user',text:'📢 Generate viral content'});
    let text=`**📢 Viral Content for ${d.project}**\n\n`;
    if(d.content.twitter){text+=`**🐦 Twitter:**\n*Hook:* ${d.content.twitter.hook}\n${(d.content.twitter.thread||[]).join('\n')}\n${(d.content.twitter.hashtags||[]).map(h=>'#'+h).join(' ')}\n\n`;}
    if(d.content.tiktok){text+=`**🎵 TikTok:**\n*Hook:* ${d.content.tiktok.hook}\n${d.content.tiktok.script}\n\n`;}
    if(d.content.linkedin){text+=`**💼 LinkedIn:**\n${d.content.linkedin.post}\n\n`;}
    if(d.content.producthunt){text+=`**🚀 Product Hunt:**\n*Tagline:* ${d.content.producthunt.tagline}\n*Description:* ${d.content.producthunt.description}\n*Comment:*\n${d.content.producthunt.first_comment}\n\n`;}
    if(d.content.reddit){text+=`**👽 Reddit:**\nSubreddits: ${(d.content.reddit.subreddit_suggestions||[]).join(', ')}\n*Title:* ${d.content.reddit.title}\n${d.content.reddit.post}\n`;}
    addMsg({role:'assistant',text});
  }catch(e){toast(e.message,'error');}
}

async function validateIdea(){
  const idea=document.getElementById('team-idea')?.value?.trim();
  if(!idea){toast('Enter idea first!','error');return;}
  addMsg({role:'user',text:`💡 Validate: ${idea}`});showTyping();
  try{
    const d=await api('/api/agents/validate',{method:'POST',body:{idea}});
    hideTyping();
    let text=`**💡 Validation — Score: ${d.overall_score}/100**\n\n**Verdict:** ${d.verdict}\n\n**📊 Scores:**\n${Object.entries(d.scores||{}).map(([k,v])=>`• ${k.replace(/_/g,' ')}: ${v}/10`).join('\n')}\n\n**⚠️ Risks:**\n${(d.biggest_risks||[]).map(r=>'• '+r).join('\n')}\n\n**🎯 Opportunities:**\n${(d.biggest_opportunities||[]).map(o=>'• '+o).join('\n')}\n\n`;
    if(d.similar_failed_startups?.length)text+=`**❌ Failures:**\n${d.similar_failed_startups.map(s=>`• ${s.name}: ${s.why_failed}`).join('\n')}\n\n`;
    if(d.similar_successful_startups?.length)text+=`**✅ Wins:**\n${d.similar_successful_startups.map(s=>`• ${s.name}: ${s.why_won}`).join('\n')}\n\n`;
    text+=`**🚀 First 100 users:**\n${d.first_100_users_strategy||''}`;
    addMsg({role:'assistant',text});
  }catch(e){hideTyping();toast(e.message,'error');}
}

async function competitorAnalysis(){
  const idea=document.getElementById('team-idea')?.value?.trim();
  if(!idea){toast('Enter idea first!','error');return;}
  addMsg({role:'user',text:`🔍 Competitors: ${idea}`});showTyping();
  try{
    const d=await api('/api/agents/competitor-analysis',{method:'POST',body:{idea}});
    hideTyping();
    let text=`**🔍 Competitive Analysis**\n\n**📊 Market:** ${d.market_size}\n\n**🏆 Advantage Score:** ${d.competitive_advantage_score}/100\n\n`;
    if(d.direct_competitors?.length)text+=`**🎯 Competitors:**\n${d.direct_competitors.map(c=>`\n**${c.name}** (${c.pricing||'?'})\n*+:* ${(c.strengths||[]).join(', ')}\n*-:* ${(c.weaknesses||[]).join(', ')}`).join('\n')}\n\n`;
    text+=`**🎁 Gaps:**\n${(d.market_gaps||[]).map(g=>'• '+g).join('\n')}\n\n**🏆 Strategy:**\n${d.winning_strategy||''}`;
    addMsg({role:'assistant',text});
  }catch(e){hideTyping();toast(e.message,'error');}
}

async function viewProject(projectId){
  try{
    const {project,steps}=await api('/api/agents/projects/'+projectId);
    document.getElementById('messages').innerHTML=`<div class="page-wrap">
      <div class="page-title">${esc(project.name)}</div>
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:16px">
        <div style="font-size:12px;color:var(--t3);margin-bottom:6px">Idea</div>
        <div style="font-size:13px">${esc(project.idea)}</div>
      </div>
      <button onclick="navigate_team()" style="background:none;border:1px solid var(--border);color:var(--t2);padding:6px 12px;border-radius:6px;font-size:12px;cursor:pointer;margin-bottom:16px">← Back</button>
      ${steps.map(s=>{
        const out=JSON.parse(s.output||'{}');
        return `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:8px">
          <div style="font-size:13px;font-weight:600;margin-bottom:8px">${esc(s.agent_name)}</div>
          <pre style="background:var(--bg3);padding:10px;border-radius:6px;font-size:11px;color:var(--t2);overflow:auto;max-height:200px;white-space:pre-wrap">${esc(JSON.stringify(out,null,2).slice(0,2000))}</pre>
        </div>`;
      }).join('')}
    </div>`;
  }catch(e){toast(e.message,'error');}
}

async function predictRevenue(){
  const idea=document.getElementById('team-idea')?.value?.trim();
  if(!idea){toast('Enter idea first!','error');return;}
  addMsg({role:'user',text:`💰 Revenue forecast: ${idea}`});showTyping();
  try{
    const d=await api('/api/agents/revenue-prediction',{method:'POST',body:{idea}});
    hideTyping();
    let text=`**💰 Revenue Forecast**\n\n`;
    if(d.pricing_recommendation){
      text+=`**💵 Recommended Pricing:**\n`;
      Object.entries(d.pricing_recommendation).forEach(([tier,price])=>{
        text+=`• ${tier}: ${price}\n`;
      });
      text+='\n';
    }
    if(d.year_1){
      text+=`**📊 Year 1:** ${d.year_1.users} users · ${d.year_1.paying_users} paying · ${d.year_1.mrr} MRR · ${d.year_1.arr} ARR\n`;
    }
    if(d.year_2){text+=`**📊 Year 2:** ${d.year_2.users} users · ${d.year_2.mrr} MRR · ${d.year_2.arr} ARR\n`;}
    if(d.year_3){text+=`**📊 Year 3:** ${d.year_3.users} users · ${d.year_3.mrr} MRR · ${d.year_3.arr} ARR\n\n`;}
    text+=`**📈 Unit Economics:**\n• LTV: ${d.ltv_estimate}\n• CAC: ${d.cac_estimate}\n• LTV/CAC: ${d.ltv_cac_ratio}\n• Burn: ${d.burn_rate}\n• Runway needed: ${d.runway_required}\n\n`;
    if(d.realistic_scenario){
      text+=`**🎯 Scenarios:**\n• Pessimistic: ${d.pessimistic_scenario?.y1_arr} → ${d.pessimistic_scenario?.y3_arr}\n• Realistic: ${d.realistic_scenario.y1_arr} → ${d.realistic_scenario.y3_arr}\n• Optimistic: ${d.optimistic_scenario?.y1_arr} → ${d.optimistic_scenario?.y3_arr}\n\n`;
    }
    if(d.comparable_companies?.length){
      text+=`**📚 Comparable Companies:**\n${d.comparable_companies.map(c=>`• ${c.name}: ${c.their_arr} (${c.trajectory})`).join('\n')}\n\n`;
    }
    if(d.growth_levers?.length){
      text+=`**🚀 Growth Levers:**\n${d.growth_levers.map(g=>'• '+g).join('\n')}`;
    }
    addMsg({role:'assistant',text});
  }catch(e){hideTyping();toast(e.message,'error');}
}

async function detectTrends(){
  const industry=prompt('What industry/niche?','AI tools');
  if(!industry)return;
  addMsg({role:'user',text:`📈 Trends: ${industry}`});showTyping();
  try{
    const d=await api('/api/agents/trends',{method:'POST',body:{industry}});
    hideTyping();
    let text=`**📈 Trend Analysis: ${d.industry}**\n\n`;
    text+=`**🎯 Key Thesis:**\n${d.key_thesis}\n\n`;
    if(d.rising_trends?.length){
      text+=`**📈 Rising Trends:**\n${d.rising_trends.map(t=>`\n• **${t.trend}** (${t.growth_rate})\n  Score: ${t.opportunity_score}/10\n  Evidence: ${t.evidence}`).join('\n')}\n\n`;
    }
    if(d.startup_opportunities?.length){
      text+=`**💡 Startup Opportunities:**\n${d.startup_opportunities.map(o=>`\n• **${o.idea}**\n  Market: ${o.market_size} · Difficulty: ${o.difficulty} · Timing: ${o.timing}`).join('\n')}\n\n`;
    }
    if(d.tech_to_watch?.length){
      text+=`**🔬 Tech to Watch:**\n${d.tech_to_watch.map(t=>'• '+t).join('\n')}\n\n`;
    }
    if(d.action_items?.length){
      text+=`**✅ Action Items:**\n${d.action_items.map(a=>'• '+a).join('\n')}`;
    }
    addMsg({role:'assistant',text});
  }catch(e){hideTyping();toast(e.message,'error');}
}

async function autonomousMode(){
  const goal=document.getElementById('team-idea')?.value?.trim()||prompt('What goal should AI pursue?');
  if(!goal)return;

  document.getElementById('messages').innerHTML=`<div class="page-wrap">
    <div class="page-title">🤖 Autonomous Mode</div>
    <p style="color:var(--t2);font-size:14px;margin-bottom:16px">AI is working towards: <strong>${esc(goal)}</strong></p>
    <div id="auto-iterations" style="display:flex;flex-direction:column;gap:10px"></div>
  </div>`;

  try{
    const resp=await fetch(API+'/api/agents/autonomous',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+S.token},
      body:JSON.stringify({goal,max_iterations:5}),
    });

    const reader=resp.body.getReader();
    const decoder=new TextDecoder();
    let buffer='';

    while(true){
      const {done,value}=await reader.read();if(done)break;
      buffer+=decoder.decode(value,{stream:true});
      const lines=buffer.split('\n');
      buffer=lines.pop()||'';

      for(const line of lines){
        if(!line.startsWith('data: '))continue;
        try{
          const d=JSON.parse(line.slice(6));
          const container=document.getElementById('auto-iterations');
          if(!container)continue;

          if(d.type==='iteration'){
            const div=document.createElement('div');
            div.id='iter-'+d.iteration;
            div.style.cssText='background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px';
            div.innerHTML=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
              <div style="background:var(--grad);color:#000;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px">${d.iteration}</div>
              <div style="font-size:13px;font-weight:600">Iteration ${d.iteration}/${d.max_iterations}</div>
              <div id="iter-status-${d.iteration}" style="margin-left:auto;font-size:11px;color:var(--a2)">thinking...</div>
            </div>
            <div id="iter-body-${d.iteration}"></div>`;
            container.appendChild(div);
            container.scrollIntoView({behavior:'smooth',block:'end'});
          }

          if(d.type==='thinking'){
            const body=document.getElementById('iter-body-'+d.iteration);
            if(body){
              body.innerHTML=`
                <div style="background:var(--bg3);border-radius:8px;padding:12px;margin-bottom:8px">
                  <div style="font-size:11px;color:var(--t3);text-transform:uppercase;margin-bottom:4px">💭 Thought</div>
                  <div style="font-size:12px;color:var(--t2)">${esc(d.thought)}</div>
                </div>
                <div style="background:var(--bg3);border-radius:8px;padding:12px;margin-bottom:8px">
                  <div style="font-size:11px;color:var(--a1);text-transform:uppercase;margin-bottom:4px">⚡ Action</div>
                  <div style="font-size:12px;color:var(--text);font-weight:500">${esc(d.action)}</div>
                </div>
              `;
            }
          }

          if(d.type==='executed'){
            const body=document.getElementById('iter-body-'+d.iteration);
            const status=document.getElementById('iter-status-'+d.iteration);
            if(status){status.textContent='completed';status.style.color='var(--a1)';}
            if(body){
              body.insertAdjacentHTML('beforeend',`
                <div style="background:var(--bg3);border-radius:8px;padding:12px">
                  <div style="font-size:11px;color:var(--t3);text-transform:uppercase;margin-bottom:4px">✅ Result</div>
                  <div style="font-size:12px;color:var(--t2);white-space:pre-wrap;max-height:200px;overflow:auto">${esc(d.result)}</div>
                </div>
              `);
            }
          }

          if(d.type==='goal_achieved'){
            const div=document.createElement('div');
            div.style.cssText='background:linear-gradient(135deg,#c6f13520,#35f1c620);border:1px solid var(--a1);border-radius:12px;padding:20px;text-align:center;margin-top:10px';
            div.innerHTML=`<div style="font-size:24px;margin-bottom:8px">🎉</div><div style="font-size:16px;font-weight:700">Goal Achieved!</div><div style="font-size:12px;color:var(--t2);margin-top:4px">${esc(d.summary)}</div>`;
            container.appendChild(div);
            toast('🎉 Goal achieved!','success');
          }

          if(d.type==='complete'){
            notify('NexusAI','Autonomous mode complete!');
          }

          if(d.type==='error'){toast('❌ '+d.error,'error');}
        }catch(_){}
      }
    }
  }catch(e){toast('❌ '+e.message,'error');}
}

// ── 🚀 MEGA AGENT UI ─────────────────────────
async function navigate_mega(){
  S.page='mega';closeSidebar();
  document.getElementById('tool-label').textContent='🚀 Mega Agent';
  document.getElementById('messages').innerHTML=`<div class="page-wrap">
    <div class="page-title">🚀 Mega Agent</div>
    <p style="color:var(--t2);font-size:14px;margin-bottom:24px">Tell AI what you want to build — it handles everything automatically.</p>
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:24px">
      <div style="font-size:13px;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Your idea</div>
      <textarea id="mega-idea" placeholder="e.g. A SaaS platform for remote team management with time tracking and invoicing" rows="4"
        style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:12px;font-size:14px;color:var(--text);outline:none;resize:none;margin-bottom:16px"></textarea>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="runMegaAgent('startup')" style="flex:1;min-width:140px;padding:12px;background:var(--grad);color:#000;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">
          🚀 Build Startup
        </button>
        <button onclick="runMegaAgent('saas')" style="flex:1;min-width:140px;padding:12px;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">
          ⚡ Build SaaS
        </button>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-top:20px">
      ${[
        {e:'💡',t:'Startup Kit',d:'Full startup in 8 steps',ex:'AI writing assistant SaaS'},
        {e:'🏗️',t:'SaaS Builder',d:'Complete SaaS codebase',ex:'Project management tool'},
        {e:'🎨',t:'Landing Page',d:'Beautiful HTML page',ex:'My new product'},
        {e:'📊',t:'Business Plan',d:'Investor-ready plan',ex:'Food delivery app'},
      ].map(c=>`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px;cursor:pointer" onclick="document.getElementById('mega-idea').value='${c.ex}';document.getElementById('mega-idea').focus()">
        <div style="font-size:20px;margin-bottom:6px">${c.e}</div>
        <div style="font-size:13px;font-weight:500">${c.t}</div>
        <div style="font-size:11px;color:var(--t3)">${c.d}</div>
      </div>`).join('')}
    </div>
  </div>`;
}

async function runMegaAgent(type){
  const idea = document.getElementById('mega-idea')?.value?.trim();
  if(!idea){toast('Enter your idea first!','error');return;}

  S.page='chat';
  document.getElementById('messages').innerHTML='';
  addMsg({role:'user',text:`🚀 ${type==='saas'?'Build SaaS':'Build Startup'}: ${idea}`});

  // Show steps container
  const stepsEl=document.createElement('div');
  stepsEl.className='msg assistant';stepsEl.id='mega-steps';
  stepsEl.innerHTML=`<div class="ai-avatar-wrap">${AI_AVATAR_SVG}</div>
    <div class="msg-body"><div class="msg-bubble">
      <div style="font-size:14px;font-weight:600;margin-bottom:12px">🚀 ${idea}</div>
      <div id="mega-steps-list" style="display:flex;flex-direction:column;gap:8px"></div>
    </div></div>`;
  document.getElementById('messages').appendChild(stepsEl);
  scrollBottom();

  const results={};

  try{
    const resp=await fetch(API+'/api/mega/'+type,{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+S.token},
      body:JSON.stringify(type==='saas'?{description:idea}:{idea}),
    });

    const reader=resp.body.getReader();
    const decoder=new TextDecoder();

    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      const lines=decoder.decode(value).split('\n');
      for(const line of lines){
        if(!line.startsWith('data: '))continue;
        try{
          const d=JSON.parse(line.slice(6));
          if(d.step==='step'){
            const list=document.getElementById('mega-steps-list');
            if(list){
              // Update or add step
              let stepEl=document.getElementById('mega-step-'+d.id);
              if(!stepEl){
                stepEl=document.createElement('div');
                stepEl.id='mega-step-'+d.id;
                list.appendChild(stepEl);
              }
              stepEl.innerHTML=`<div style="display:flex;align-items:center;gap:8px;font-size:13px">
                <span>${d.status==='done'?'✅':d.status==='running'?'⏳':'⭕'}</span>
                <span style="color:${d.status==='done'?'var(--a4)':d.status==='running'?'var(--a1)':'var(--t2)'}">${d.label}</span>
              </div>`;
              if(d.data)results[d.id]=d.data;
              scrollBottom();
            }
          }
          if(d.step==='done'){
            stepsEl.remove();
            // Show results
            let finalText=`# 🚀 ${idea}\n\n`;
            finalText+=`**✅ ${d.steps_completed} steps completed!**\n\n---\n\n`;
            if(results[2]?.plan)finalText+=`## 📊 Business Plan\n${results[2].plan}\n\n---\n\n`;
            if(results[3]?.html){
              finalText+=`## 🎨 Landing Page\n*Click "Open in Canvas" to preview your landing page.*\n\n`;
              window._megaHTML=results[3].html;
            }
            if(results[4]?.code)finalText+=`## 💻 Backend Code\n${results[4].code.slice(0,500)}...\n\n---\n\n`;
            if(results[7]?.deck)finalText+=`## 🎯 Pitch Deck\n${results[7].deck}\n\n`;
            addMsg({role:'assistant',text:finalText});
            if(window._megaHTML){
              setTimeout(()=>{openCanvas(window._megaHTML,'Landing Page Preview');},500);
            }
            notify('NexusAI',`🚀 "${idea}" is ready!`);
            try{S.user=await api('/api/me');updateUsage();}catch(_){}
          }
          if(d.step==='error'){
            stepsEl.remove();
            addMsg({role:'assistant',text:'❌ Error: '+d.message});
          }
        }catch(_){}
      }
    }
  }catch(e){
    stepsEl.remove();
    addMsg({role:'assistant',text:'❌ '+e.message});
  }
}

// ── 💻 CODING ASSISTANT UI ────────────────────
async function navigate_coding(){
  S.page='coding';closeSidebar();
  document.getElementById('tool-label').textContent='💻 Coding Assistant';
  document.getElementById('messages').innerHTML=`<div class="page-wrap">
    <div class="page-title">💻 AI Coding Assistant</div>
    <p style="color:var(--t2);font-size:14px;margin-bottom:20px">Maximum coding power — generate, fix, review, convert, and more.</p>
    <div class="agents-grid">
      ${[
        {e:'✨',n:'Generate Code',d:'Describe → get full code',fn:"codingGenerate()"},
        {e:'🐛',n:'Fix & Debug',d:'Paste error → get fix',fn:"codingFix()"},
        {e:'👀',n:'Code Review',d:'Deep quality analysis',fn:"codingReview()"},
        {e:'📖',n:'Explain Code',d:'Understand any code',fn:"codingExplain()"},
        {e:'🔄',n:'Convert Language',d:'JS→Python, etc.',fn:"codingConvert()"},
        {e:'🧪',n:'Generate Tests',d:'Full test suite',fn:"codingTests()"},
        {e:'📝',n:'Add Docs',d:'JSDoc, comments',fn:"codingDocs()"},
        {e:'⚡',n:'Optimize',d:'Speed + memory',fn:"codingOptimize()"},
        {e:'🔒',n:'Security Audit',d:'Find vulnerabilities',fn:"codingSecAudit()"},
        {e:'🤝',n:'Pair Program',d:'Step by step build',fn:"codingPair()"},
        {e:'🧮',n:'Algorithm',d:'Optimal solutions',fn:"codingAlgo()"},
        {e:'📚',n:'Snippets',d:'Ready-to-use code',fn:"codingSnippets()"},
      ].map(t=>`<div class="agent-card" onclick="${t.fn}">
        <div class="agent-emoji">${t.e}</div>
        <div class="agent-card-name">${t.n}</div>
        <div class="agent-card-desc">${t.d}</div>
        <button class="agent-run-btn">Run →</button>
      </div>`).join('')}
    </div>
  </div>`;
}

async function streamToChat(url, body, userMsg){
  addMsg({role:'user',text:userMsg});
  S.msgs.push({role:'assistant',text:'',_streaming:true});
  renderAllMsgs();
  let streamText='';
  try{
    const resp=await fetch(API+url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+S.token},body:JSON.stringify(body)});
    const reader=resp.body.getReader();const decoder=new TextDecoder();
    while(true){
      const {done,value}=await reader.read();if(done)break;
      const lines=decoder.decode(value).split('\n');
      for(const line of lines){
        if(!line.startsWith('data: '))continue;
        try{
          const d=JSON.parse(line.slice(6));
          if(d.token){
            streamText+=d.token;
            const last=S.msgs[S.msgs.length-1];
            if(last?._streaming)last.text=streamText;
            const msgEls=document.querySelectorAll('.msg.assistant');
            const lastEl=msgEls[msgEls.length-1];
            if(lastEl){const bubble=lastEl.querySelector('.msg-bubble');if(bubble)bubble.innerHTML=fmt(streamText)+'<span style="animation:cursorBlink 1s infinite;color:var(--a1)">▋</span>';}
            scrollBottom();
          }
          if(d.done){const last=S.msgs[S.msgs.length-1];if(last?._streaming){last.text=streamText;delete last._streaming;}renderAllMsgs();renderLatex();}
        }catch(_){}
      }
    }
  }catch(e){const last=S.msgs[S.msgs.length-1];if(last?._streaming){last.text='❌ '+e.message;delete last._streaming;}renderAllMsgs();}
}

async function codingGenerate(){
  const desc=prompt('Describe what code you need:');if(!desc)return;
  const lang=prompt('Language:','javascript')||'javascript';
  S.page='chat';document.getElementById('messages').innerHTML='';
  await streamToChat('/api/mega/code/generate',{description:desc,language:lang},`✨ Generate: ${desc}`);
}

async function codingFix(){
  const code=prompt('Paste your code:');if(!code)return;
  const error=prompt('Error message (optional):');
  const lang=prompt('Language:','javascript')||'javascript';
  S.page='chat';document.getElementById('messages').innerHTML='';
  await streamToChat('/api/mega/code/fix',{code,error,language:lang},`🐛 Fix code`);
}

async function codingReview(){
  const code=prompt('Paste code to review:');if(!code)return;
  S.page='chat';document.getElementById('messages').innerHTML='';
  addMsg({role:'user',text:'👀 Code review'});showTyping();
  api('/api/mega/code/review',{method:'POST',body:{code}}).then(r=>{hideTyping();addMsg({role:'assistant',text:r.review});}).catch(e=>{hideTyping();toast(e.message,'error');});
}

async function codingExplain(){
  const code=prompt('Paste code to explain:');if(!code)return;
  const level=prompt('Level (beginner/intermediate/expert):','intermediate')||'intermediate';
  S.page='chat';document.getElementById('messages').innerHTML='';
  addMsg({role:'user',text:'📖 Explain code'});showTyping();
  api('/api/mega/code/explain',{method:'POST',body:{code,level}}).then(r=>{hideTyping();addMsg({role:'assistant',text:r.explanation});}).catch(e=>{hideTyping();toast(e.message,'error');});
}

async function codingConvert(){
  const code=prompt('Paste code to convert:');if(!code)return;
  const from=prompt('From language:','javascript')||'javascript';
  const to=prompt('To language:','python')||'python';
  S.page='chat';document.getElementById('messages').innerHTML='';
  addMsg({role:'user',text:`🔄 Convert ${from}→${to}`});showTyping();
  api('/api/mega/code/convert',{method:'POST',body:{code,from,to}}).then(r=>{hideTyping();addMsg({role:'assistant',text:r.converted});}).catch(e=>{hideTyping();toast(e.message,'error');});
}

async function codingTests(){
  const code=prompt('Paste code to test:');if(!code)return;
  const framework=prompt('Test framework (jest/mocha/pytest):','jest')||'jest';
  S.page='chat';document.getElementById('messages').innerHTML='';
  addMsg({role:'user',text:'🧪 Generate tests'});showTyping();
  api('/api/mega/code/tests',{method:'POST',body:{code,framework}}).then(r=>{hideTyping();addMsg({role:'assistant',text:r.tests});}).catch(e=>{hideTyping();toast(e.message,'error');});
}

async function codingDocs(){
  const code=prompt('Paste code to document:');if(!code)return;
  S.page='chat';document.getElementById('messages').innerHTML='';
  addMsg({role:'user',text:'📝 Add documentation'});showTyping();
  api('/api/mega/code/docs',{method:'POST',body:{code}}).then(r=>{hideTyping();addMsg({role:'assistant',text:r.documented});}).catch(e=>{hideTyping();toast(e.message,'error');});
}

async function codingOptimize(){
  const code=prompt('Paste code to optimize:');if(!code)return;
  S.page='chat';document.getElementById('messages').innerHTML='';
  addMsg({role:'user',text:'⚡ Optimize code'});showTyping();
  api('/api/dev/optimize',{method:'POST',body:{code}}).then(r=>{hideTyping();addMsg({role:'assistant',text:r.optimized});}).catch(e=>{hideTyping();toast(e.message,'error');});
}

async function codingSecAudit(){
  const code=prompt('Paste code for security audit:');if(!code)return;
  S.page='chat';document.getElementById('messages').innerHTML='';
  addMsg({role:'user',text:'🔒 Security audit'});showTyping();
  api('/api/dev/security',{method:'POST',body:{code}}).then(r=>{
    hideTyping();
    const text=`**🔒 Security Score: ${r.score}/100**\n\n${r.summary}\n\n${(r.vulnerabilities||[]).map(v=>`**${v.severity?.toUpperCase()} - ${v.type}:**\n${v.description}\n**Fix:** ${v.fix}`).join('\n\n')}`;
    addMsg({role:'assistant',text});
  }).catch(e=>{hideTyping();toast(e.message,'error');});
}

async function codingPair(){
  const task=prompt('What are you building?');if(!task)return;
  S.page='chat';document.getElementById('messages').innerHTML='';
  addMsg({role:'user',text:`🤝 Pair program: ${task}`});showTyping();
  api('/api/mega/code/pair',{method:'POST',body:{task,step:1}}).then(r=>{
    hideTyping();addMsg({role:'assistant',text:`**Step 1/${r.total_steps}: Planning**\n\n${r.result}\n\n${r.next_step?`*Reply "continue" for Step 2*`:''}`});
  }).catch(e=>{hideTyping();toast(e.message,'error');});
}

async function codingAlgo(){
  const problem=prompt('Describe the algorithm problem:');if(!problem)return;
  const lang=prompt('Language:','javascript')||'javascript';
  S.page='chat';document.getElementById('messages').innerHTML='';
  addMsg({role:'user',text:`🧮 Algorithm: ${problem}`});showTyping();
  api('/api/mega/code/algorithm',{method:'POST',body:{problem,language:lang}}).then(r=>{hideTyping();addMsg({role:'assistant',text:r.algorithm});}).catch(e=>{hideTyping();toast(e.message,'error');});
}

async function codingSnippets(){
  S.page='chat';document.getElementById('messages').innerHTML='';
  const {snippets={}}=await api('/api/mega/code/snippets');
  let text='**📚 Code Snippet Library:**\n\n';
  for(const [cat,data] of Object.entries(snippets)){
    text+=`**${data.label}:**\n${data.items.map(i=>`• **${i.name}** — ${i.desc}`).join('\n')}\n\n`;
  }
  text+='\n*Tell me which snippet you want and I\'ll generate it for you!*';
  addMsg({role:'assistant',text});
}

// ── 📂 DOCUMENTS UI ──────────────────────────
async function navigate_docs(){
  S.page='docs';closeSidebar();
  document.getElementById('tool-label').textContent='📂 Documents';
  document.getElementById('messages').innerHTML='<div class="page-wrap"><div class="page-title">📂 Documents</div><div style="color:var(--t2)">Loading...</div></div>';
  try{
    const {docs=[]}=await api('/api/docs/list');
    document.getElementById('messages').innerHTML=`<div class="page-wrap">
      <div class="page-title">📂 Documents & Knowledge</div>
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <button onclick="document.getElementById('doc-upload').click()" style="background:var(--grad);color:#000;border:none;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">+ Upload</button>
        <input id="doc-upload" type="file" style="display:none" accept=".txt,.md,.pdf,.json,.csv" onchange="uploadDoc(this)"/>
        <input id="doc-search" placeholder="Semantic search..." style="flex:1;min-width:150px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px;color:var(--text);outline:none" onkeydown="if(event.key==='Enter')searchDocs(this.value)"/>
        <button onclick="searchDocs(document.getElementById('doc-search').value)" style="background:var(--bg2);border:1px solid var(--border);color:var(--text);padding:8px 14px;border-radius:8px;font-size:13px;cursor:pointer">Search</button>
      </div>
      <div id="docs-list">
        ${docs.length?docs.map(d=>`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:8px;display:flex;align-items:center;gap:12px">
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:500">${esc(d.title)}</div>
            <div style="font-size:11px;color:var(--t3)">${d.doc_type} · v${d.version} · ${new Date(d.created_at).toLocaleDateString()}</div>
            <div style="font-size:11px;color:var(--a2);margin-top:2px">${JSON.parse(d.tags||'[]').join(', ')}</div>
          </div>
          <button onclick="askDoc('${d.doc_id}','${esc(d.title)}')" style="font-size:12px;padding:4px 10px;border:1px solid var(--border);border-radius:6px;color:var(--t2);background:none;cursor:pointer">Ask AI</button>
          <button onclick="compareDoc('${d.doc_id}')" style="font-size:12px;padding:4px 10px;border:1px solid var(--border);border-radius:6px;color:var(--t2);background:none;cursor:pointer">Compare</button>
          <button onclick="deleteDoc('${d.doc_id}')" style="color:var(--t3);font-size:14px;background:none;border:none;cursor:pointer">✕</button>
        </div>`).join(''):'<div style="color:var(--t2);padding:40px;text-align:center">No documents yet. Upload to enable semantic search and AI analysis.</div>'}
      </div>
    </div>`;
  }catch(e){toast(e.message,'error');}
}

async function uploadDoc(input){
  const file=input.files[0];if(!file)return;input.value='';
  toast('Uploading and indexing...','success');
  const form=new FormData();form.append('file',file);
  try{
    const r=await fetch(API+'/api/docs/upload',{method:'POST',headers:{Authorization:'Bearer '+S.token},body:form});
    const d=await r.json();if(!r.ok)throw new Error(d.error);
    toast(`✅ "${d.title}" indexed with ${d.tags?.join(', ')||'no tags'}`,'success');
    navigate_docs();
  }catch(e){toast(e.message,'error');}
}

async function searchDocs(q){
  if(!q)return;
  try{
    const {results=[]}=await api('/api/docs/search?q='+encodeURIComponent(q));
    const el=document.getElementById('docs-list');
    if(!el)return;
    el.innerHTML=`<div style="font-size:12px;color:var(--t3);margin-bottom:8px">🔍 Semantic search results for "${q}"</div>`+
    (results.length?results.map(r=>`<div style="background:var(--bg2);border:1px solid var(--a1)30;border-radius:10px;padding:14px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <div style="font-size:13px;font-weight:500">${esc(r.title)}</div>
        <div style="font-size:11px;color:var(--a1)">Score: ${r.score}</div>
      </div>
      <div style="font-size:12px;color:var(--t2)">${esc(r.preview)}</div>
      <button onclick="askDoc('${r.doc_id}','${esc(r.title)}')" style="margin-top:8px;font-size:11px;padding:4px 10px;border:1px solid var(--border);border-radius:5px;color:var(--t2);background:none;cursor:pointer">Ask AI</button>
    </div>`).join(''):'<div style="color:var(--t2);padding:20px;text-align:center">No results found.</div>');
  }catch(e){toast(e.message,'error');}
}

async function askDoc(docId, title){
  const q=prompt(`Ask about "${title}":`);if(!q)return;
  S.page='chat';
  document.getElementById('messages').innerHTML='';
  addMsg({role:'user',text:q});showTyping();
  api('/api/docs/'+docId+'/ask',{method:'POST',body:{question:q}}).then(r=>{
    hideTyping();addMsg({role:'assistant',text:r.answer});
  }).catch(e=>{hideTyping();toast(e.message,'error');});
}

async function deleteDoc(docId){
  if(!confirm('Delete document?'))return;
  await api('/api/docs/'+docId,{method:'DELETE'});
  toast('Deleted','success');navigate_docs();
}

async function compareDoc(docId){
  const other=prompt('Enter second doc ID to compare with:');if(!other)return;
  const q=prompt('What to compare?','Compare main themes and differences')||'Compare main themes and differences';
  addMsg({role:'user',text:`📊 Compare documents`});showTyping();
  api('/api/docs/compare',{method:'POST',body:{doc_ids:[docId,other],question:q}}).then(r=>{
    hideTyping();addMsg({role:'assistant',text:`**📊 Document Comparison:**\n\n${r.answer}`});
  }).catch(e=>{hideTyping();toast(e.message,'error');});
}

// ── 💻 DEV TOOLS UI ───────────────────────────
async function navigate_devtools(){
  S.page='devtools';closeSidebar();
  document.getElementById('tool-label').textContent='💻 Dev Tools';
  document.getElementById('messages').innerHTML=`<div class="page-wrap">
    <div class="page-title">💻 Dev Tools</div>
    <div class="agents-grid">
      ${[
        {e:'▶',n:'Code Executor',d:'Run code in sandbox',fn:'devExecute()'},
        {e:'🐛',n:'Debugger',d:'Find and fix bugs',fn:'devDebug()'},
        {e:'🔒',n:'Security Scan',d:'Audit for vulnerabilities',fn:'devSecurity()'},
        {e:'📝',n:'Git Commit',d:'AI commit messages',fn:'devCommit()'},
        {e:'🗄️',n:'DB Designer',d:'Design database schemas',fn:'devDB()'},
        {e:'⚡',n:'Scaffolding',d:'Full-stack code generator',fn:'devScaffold()'},
        {e:'🚀',n:'CI/CD',d:'Generate pipelines',fn:'devCICD()'},
        {e:'🐳',n:'Docker',d:'Containerize your app',fn:'devDocker()'},
        {e:'⚙️',n:'Optimizer',d:'Improve performance',fn:'devOptimize()'},
        {e:'🔄',n:'Refactor',d:'Clean up your code',fn:'devRefactor()'},
        {e:'🧪',n:'API Tester',d:'Test any endpoint',fn:'devAPITest()'},
        {e:'🎨',n:'UI Preview',d:'Generate UI from description',fn:'devUIPreview()'},
      ].map(t=>`<div class="agent-card" onclick="${t.fn}">
        <div class="agent-emoji">${t.e}</div>
        <div class="agent-card-name">${t.n}</div>
        <div class="agent-card-desc">${t.d}</div>
        <button class="agent-run-btn">Run →</button>
      </div>`).join('')}
    </div>
  </div>`;
}

async function devExecute(){
  const code=prompt('Paste code to execute:');if(!code)return;
  const lang=prompt('Language:','javascript')||'javascript';
  addMsg({role:'user',text:`▶ Execute ${lang} code`});showTyping();
  api('/api/dev/execute',{method:'POST',body:{code,language:lang}}).then(r=>{
    hideTyping();addMsg({role:'assistant',text:`**▶ Output:**\n\`\`\`\n${r.output}\n\`\`\``});
  }).catch(e=>{hideTyping();toast(e.message,'error');});
}

async function devDebug(){
  const code=document.getElementById('msg-input')?.value||prompt('Paste code with bug:');
  if(!code)return;
  const error=prompt('Error message (optional):');
  addMsg({role:'user',text:`🐛 Debug code`});showTyping();
  api('/api/dev/debug',{method:'POST',body:{code,error,language:'javascript'}}).then(r=>{
    hideTyping();addMsg({role:'assistant',text:r.debug});
  }).catch(e=>{hideTyping();toast(e.message,'error');});
}

async function devSecurity(){
  const code=prompt('Paste code to audit:');if(!code)return;
  addMsg({role:'user',text:'🔒 Security audit'});showTyping();
  api('/api/dev/security',{method:'POST',body:{code}}).then(r=>{
    hideTyping();
    const text=`**🔒 Security Audit Score: ${r.score}/100**\n\n${r.summary}\n\n${(r.vulnerabilities||[]).map(v=>`**${v.severity?.toUpperCase()} - ${v.type}:**\n${v.description}\n**Fix:** ${v.fix}`).join('\n\n')}`;
    addMsg({role:'assistant',text});
  }).catch(e=>{hideTyping();toast(e.message,'error');});
}

async function devCommit(){
  const diff=prompt('Paste git diff:');if(!diff)return;
  const r=await api('/api/dev/git/commit-message',{method:'POST',body:{diff}});
  addMsg({role:'assistant',text:`**📝 Commit Message:**\n\`${r.message}\``});
}

async function devDB(){
  const desc=prompt('Describe your database needs:');if(!desc)return;
  addMsg({role:'user',text:`🗄️ Design DB for: ${desc}`});showTyping();
  api('/api/dev/db/design',{method:'POST',body:{description:desc}}).then(r=>{
    hideTyping();addMsg({role:'assistant',text:r.design});
  }).catch(e=>{hideTyping();toast(e.message,'error');});
}

async function devScaffold(){
  const desc=prompt('Describe your app:');if(!desc)return;
  const stack=prompt('Stack (react+express+sqlite):','react+express+sqlite')||'react+express+sqlite';
  addMsg({role:'user',text:`🚀 Scaffold: ${desc}`});showTyping();
  api('/api/dev/scaffold/fullstack',{method:'POST',body:{description:desc,stack}}).then(r=>{
    hideTyping();addMsg({role:'assistant',text:`**Frontend:**\n${r.frontend}\n\n**Backend:**\n${r.backend}\n\n**Deployment:**\n${r.deployment}`});
  }).catch(e=>{hideTyping();toast(e.message,'error');});
}

async function devCICD(){
  const lang=prompt('Language/framework:','node')||'node';
  const target=prompt('Deploy target:','vercel')||'vercel';
  addMsg({role:'user',text:`🚀 CI/CD for ${lang} → ${target}`});showTyping();
  api('/api/dev/cicd',{method:'POST',body:{language:lang,deploy_target:target}}).then(r=>{
    hideTyping();addMsg({role:'assistant',text:r.pipeline});
  }).catch(e=>{hideTyping();toast(e.message,'error');});
}

async function devDocker(){
  const desc=prompt('Describe your app:');if(!desc)return;
  const lang=prompt('Language:','node')||'node';
  addMsg({role:'user',text:`🐳 Docker for: ${desc}`});showTyping();
  api('/api/dev/docker',{method:'POST',body:{description:desc,language:lang}}).then(r=>{
    hideTyping();addMsg({role:'assistant',text:r.docker});
  }).catch(e=>{hideTyping();toast(e.message,'error');});
}

async function devOptimize(){
  const code=prompt('Paste code to optimize:');if(!code)return;
  addMsg({role:'user',text:'⚙️ Optimize code'});showTyping();
  api('/api/dev/optimize',{method:'POST',body:{code}}).then(r=>{
    hideTyping();addMsg({role:'assistant',text:r.optimized});
  }).catch(e=>{hideTyping();toast(e.message,'error');});
}

async function devRefactor(){
  const code=prompt('Paste code to refactor:');if(!code)return;
  addMsg({role:'user',text:'🔄 Refactor code'});showTyping();
  api('/api/dev/refactor',{method:'POST',body:{code}}).then(r=>{
    hideTyping();addMsg({role:'assistant',text:r.refactored});
  }).catch(e=>{hideTyping();toast(e.message,'error');});
}

async function devAPITest(){
  const url=prompt('API endpoint URL:');if(!url)return;
  const method=prompt('Method:','GET')||'GET';
  addMsg({role:'user',text:`🧪 Test: ${method} ${url}`});showTyping();
  api('/api/dev/api-test',{method:'POST',body:{endpoint:url,method}}).then(r=>{
    hideTyping();
    const text=`**🧪 API Test Result:**\n\nStatus: ${r.status} ${r.statusText}\nTime: ${r.elapsed_ms}ms\n\n\`\`\`json\n${JSON.stringify(r.data,null,2).slice(0,1000)}\n\`\`\``;
    addMsg({role:'assistant',text});
  }).catch(e=>{hideTyping();toast(e.message,'error');});
}

async function devUIPreview(){
  const desc=prompt('Describe the UI you want:');if(!desc)return;
  addMsg({role:'user',text:`🎨 Generate UI: ${desc}`});showTyping();
  api('/api/dev/ui-preview',{method:'POST',body:{description:desc}}).then(r=>{
    hideTyping();
    addMsg({role:'assistant',text:`🎨 UI generated! Open in Canvas to preview.`,type:'text'});
    // Open in canvas
    const htmlMatch=r.html.match(/```html\n?([\s\S]*?)```/);
    openCanvas(htmlMatch?htmlMatch[1]:r.html, 'UI Preview');
  }).catch(e=>{hideTyping();toast(e.message,'error');});
}

// ── 💳 BILLING UI ─────────────────────────────
async function navigate_billing(){
  S.page='billing';closeSidebar();
  document.getElementById('tool-label').textContent='💳 Billing';
  document.getElementById('messages').innerHTML='<div class="page-wrap"><div class="page-title">💳 Billing</div><div style="color:var(--t2)">Loading...</div></div>';
  try{
    const d=await api('/api/ux/billing');
    document.getElementById('messages').innerHTML=`<div class="page-wrap">
      <div class="page-title">💳 Billing & Usage</div>
      <div class="dash-stats" style="margin-bottom:20px">
        <div class="dash-card"><div class="dash-num" style="-webkit-text-fill-color:var(--a1)">${d.plan}</div><div class="dash-lbl">Current Plan</div></div>
        <div class="dash-card"><div class="dash-num">$${d.price}</div><div class="dash-lbl">Per Month</div></div>
        <div class="dash-card"><div class="dash-num">${d.usage?.today||0}</div><div class="dash-lbl">Requests Today</div></div>
        <div class="dash-card"><div class="dash-num">${d.usage?.total||0}</div><div class="dash-lbl">Total Requests</div></div>
      </div>
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px">
        <div style="font-size:13px;font-weight:500;margin-bottom:10px">Plan Features</div>
        ${(d.features||[]).map(f=>`<div style="font-size:13px;color:var(--t2);padding:4px 0">✅ ${f}</div>`).join('')}
      </div>
      ${d.plan!=='elite'?`<button onclick="navigate('pricing')" style="width:100%;padding:12px;background:var(--grad);color:#000;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer">⚡ Upgrade Plan →</button>`:'<div style="text-align:center;color:var(--a1);font-size:13px;padding:12px">✨ You\'re on the best plan!</div>'}
    </div>`;
  }catch(e){toast(e.message,'error');}
}

// ── 📈 METRICS UI ─────────────────────────────
async function navigate_metrics(){
  S.page='metrics';closeSidebar();
  document.getElementById('tool-label').textContent='📈 Metrics';
  document.getElementById('messages').innerHTML='<div class="page-wrap"><div class="page-title">📈 Metrics</div><div style="color:var(--t2)">Loading...</div></div>';
  try{
    const {metrics={},scope}=await api('/api/ux/metrics');
    if(scope==='admin'){
      document.getElementById('messages').innerHTML=`<div class="page-wrap">
        <div class="page-title">📈 Platform Metrics</div>
        <div class="dash-stats" style="margin-bottom:20px">
          <div class="dash-card"><div class="dash-num">${metrics.total_users||0}</div><div class="dash-lbl">Total Users</div></div>
          <div class="dash-card"><div class="dash-num">${metrics.active_today||0}</div><div class="dash-lbl">Active Today</div></div>
          <div class="dash-card"><div class="dash-num">$${metrics.mrr||0}</div><div class="dash-lbl">MRR</div></div>
          <div class="dash-card"><div class="dash-num">${metrics.new_users_today||0}</div><div class="dash-lbl">New Today</div></div>
          <div class="dash-card"><div class="dash-num">${metrics.pro_users||0}</div><div class="dash-lbl">Pro Users</div></div>
          <div class="dash-card"><div class="dash-num">${metrics.elite_users||0}</div><div class="dash-lbl">Elite Users</div></div>
          <div class="dash-card"><div class="dash-num">${metrics.total_messages||0}</div><div class="dash-lbl">Total Messages</div></div>
          <div class="dash-card"><div class="dash-num">${metrics.growth_7d||0}</div><div class="dash-lbl">New (7 days)</div></div>
        </div>
        <div style="font-size:13px;font-weight:500;margin-bottom:10px">Top Tools</div>
        ${(metrics.top_tools||[]).map(t=>`<div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;margin-bottom:6px">
          <span style="font-size:13px">${t.feature}</span>
          <span style="font-size:12px;color:var(--a1);font-weight:600">${t.uses}x</span>
        </div>`).join('')}
      </div>`;
    } else {
      document.getElementById('messages').innerHTML=`<div class="page-wrap">
        <div class="page-title">📈 My Usage Stats</div>
        <div class="dash-stats">
          <div class="dash-card"><div class="dash-num">${metrics.total_requests||0}</div><div class="dash-lbl">Total Requests</div></div>
          <div class="dash-card"><div class="dash-num">${metrics.tools_used||0}</div><div class="dash-lbl">Tools Used</div></div>
          <div class="dash-card"><div class="dash-num">${metrics.member_days||0}</div><div class="dash-lbl">Days as Member</div></div>
          <div class="dash-card"><div class="dash-num" style="font-size:14px">${metrics.favorite_tool||'-'}</div><div class="dash-lbl">Fav Tool</div></div>
        </div>
      </div>`;
    }
  }catch(e){toast(e.message,'error');}
}

// ── ⚡ AUTOMATION UI ──────────────────────────
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
    <div style="font-size:12px;color:var(--t3);padding:4px 8px 8px">${tools.length} tools — tap to activate instantly</div>
    <div class="tools-grid-panel">
      ${tools.map(t=>`
        <button class="tool-grid-card ${S.tool?.id===t.id?'active':''}" onclick="selectToolFromGrid('${t.id}')">
          <span class="tool-grid-emoji">${t.e}</span>
          <div class="tool-grid-name">${t.name}</div>
        </button>`).join('')}
    </div>`;
}

function selectToolFromGrid(id){
  closeCatGrid();
  selectTool(id);
  showActiveToolBar();
  // Auto focus input
  setTimeout(()=>document.getElementById('msg-input')?.focus(),100);
  toast(`✅ ${S.tool?.name||'Tool'} activated — start typing!`,'success');
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

function setStyle(btn, style){
  S.writingStyle = style;
  localStorage.setItem('nx_style', style);
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
// ============================================================
// 🌟 ELITE ONBOARDING — Goal-first, cinematic, AI-guided
// ============================================================
function startOnboarding(){
  if(localStorage.getItem('nx_onboarded_v2'))return;

  // Inject styles once
  if(!document.getElementById('nx-onboard-styles')){
    const s=document.createElement('style');
    s.id='nx-onboard-styles';
    s.textContent=`
      .nx-onb-overlay{position:fixed;inset:0;z-index:9999;background:radial-gradient(ellipse at 50% 30%,rgba(20,30,60,.92),rgba(0,0,0,.96));backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;animation:nxFade .6s ease-out;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif}
      .nx-onb-panel{max-width:560px;width:90%;padding:48px 40px;text-align:center;animation:nxRise .8s cubic-bezier(.2,.8,.2,1)}
      .nx-onb-logo{font-size:42px;font-weight:200;letter-spacing:8px;background:linear-gradient(135deg,#7df,#a8f,#f7a);-webkit-background-clip:text;background-clip:text;color:transparent;margin-bottom:8px;animation:nxGlow 3s ease-in-out infinite}
      .nx-onb-tag{color:#89a;font-size:13px;letter-spacing:3px;text-transform:uppercase;margin-bottom:40px;opacity:.7}
      .nx-onb-q{color:#fff;font-size:24px;font-weight:300;margin-bottom:32px;line-height:1.4}
      .nx-onb-goals{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px}
      .nx-onb-goal{padding:18px 16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;cursor:pointer;transition:all .25s cubic-bezier(.2,.8,.2,1);text-align:left;color:#cde;font-size:14px;display:flex;align-items:center;gap:12px;backdrop-filter:blur(8px)}
      .nx-onb-goal:hover{background:rgba(120,200,255,.08);border-color:rgba(120,200,255,.4);transform:translateY(-2px);box-shadow:0 8px 24px rgba(120,200,255,.15)}
      .nx-onb-goal .ico{font-size:22px;flex-shrink:0}
      .nx-onb-goal .nm{font-weight:500;color:#fff;display:block;margin-bottom:2px}
      .nx-onb-goal .ds{font-size:11px;color:#789;letter-spacing:.3px}
      .nx-onb-skip{margin-top:24px;background:none;border:none;color:#567;font-size:12px;cursor:pointer;letter-spacing:1px;transition:color .2s}
      .nx-onb-skip:hover{color:#9ab}
      .nx-onb-progress{height:2px;width:80px;background:rgba(255,255,255,.1);border-radius:2px;margin:0 auto 32px;overflow:hidden}
      .nx-onb-progress div{height:100%;width:33%;background:linear-gradient(90deg,#7df,#a8f);animation:nxBar 2s ease-in-out infinite}
      .nx-onb-confirm{padding:32px;background:rgba(255,255,255,.03);border-radius:16px;color:#cde;line-height:1.6;border:1px solid rgba(120,200,255,.15)}
      .nx-onb-confirm h3{color:#fff;font-weight:400;margin-bottom:12px;font-size:20px}
      .nx-onb-confirm p{font-size:14px;color:#89a;margin-bottom:20px}
      .nx-onb-go{padding:12px 32px;background:linear-gradient(135deg,#7df,#a8f);border:none;border-radius:10px;color:#000;font-weight:600;font-size:14px;cursor:pointer;letter-spacing:.5px;transition:transform .15s;box-shadow:0 6px 20px rgba(120,200,255,.3)}
      .nx-onb-go:hover{transform:translateY(-1px) scale(1.02)}
      @keyframes nxFade{from{opacity:0}to{opacity:1}}
      @keyframes nxRise{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      @keyframes nxGlow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.2)}}
      @keyframes nxBar{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}
      @media(max-width:520px){.nx-onb-goals{grid-template-columns:1fr}.nx-onb-panel{padding:32px 20px}.nx-onb-q{font-size:20px}}
    `;
    document.head.appendChild(s);
  }

  const goals=[
    {id:'startup',ico:'🚀',nm:'Build a startup',ds:'Idea → launch → growth'},
    {id:'code',ico:'💻',nm:'Code & debug',ds:'Repo intelligence, reviews'},
    {id:'create',ico:'🎨',nm:'Create content',ds:'Images, video, voice, 3D'},
    {id:'study',ico:'📚',nm:'Learn & research',ds:'Knowledge with citations'},
    {id:'analyze',ico:'📊',nm:'Analyze business',ds:'Growth, metrics, strategy'},
    {id:'team',ico:'👥',nm:'Collaborate',ds:'Shared workspaces'},
  ];

  const overlay=document.createElement('div');
  overlay.className='nx-onb-overlay';
  overlay.innerHTML=`
    <div class="nx-onb-panel">
      <div class="nx-onb-logo">NEXUS</div>
      <div class="nx-onb-tag">AI Operating System</div>
      <div class="nx-onb-progress"><div></div></div>
      <div class="nx-onb-q">What do you want to do today?</div>
      <div class="nx-onb-goals">
        ${goals.map(g=>`<div class="nx-onb-goal" data-goal="${g.id}"><span class="ico">${g.ico}</span><div><span class="nm">${g.nm}</span><span class="ds">${g.ds}</span></div></div>`).join('')}
      </div>
      <button class="nx-onb-skip">Skip for now</button>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelector('.nx-onb-skip').onclick=()=>{
    localStorage.setItem('nx_onboarded_v2','skipped');
    overlay.style.animation='nxFade .4s reverse';
    setTimeout(()=>overlay.remove(),400);
  };

  overlay.querySelectorAll('.nx-onb-goal').forEach(el=>{
    el.onclick=()=>{
      const goal=el.dataset.goal;
      localStorage.setItem('nx_onboarded_v2',goal);
      localStorage.setItem('nx_user_goal',goal);
      const goalData=goals.find(g=>g.id===goal);
      const panel=overlay.querySelector('.nx-onb-panel');
      panel.style.animation='nxRise .5s reverse';
      setTimeout(()=>{
        panel.innerHTML=`
          <div class="nx-onb-logo">${goalData.ico}</div>
          <div class="nx-onb-tag">Configured for ${goalData.nm.toLowerCase()}</div>
          <div class="nx-onb-confirm">
            <h3>Ready to operate</h3>
            <p>NexusAI will adapt workflows, recommendations, and AI behavior around ${goalData.nm.toLowerCase()}. You can change this anytime in settings.</p>
            <button class="nx-onb-go">Enter Nexus →</button>
          </div>`;
        panel.style.animation='nxRise .6s cubic-bezier(.2,.8,.2,1)';
        panel.querySelector('.nx-onb-go').onclick=()=>{
          overlay.style.animation='nxFade .5s reverse';
          setTimeout(()=>{
            overlay.remove();
            // Hook for downstream personalization
            window.dispatchEvent(new CustomEvent('nx:onboarded',{detail:{goal}}));
          },500);
        };
      },500);
    };
  });
}

// cursor blink
const _cs=document.createElement('style');
_cs.textContent='@keyframes cursorBlink{0%,100%{opacity:1}50%{opacity:0}} @keyframes fadeIn{from{opacity:0;transform:translateX(-50%) translateY(6px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
document.head?.appendChild(_cs);

// ── ➕ QUICK TOOLS MENU ───────────────────────
let quickToolsOpen=false;

function toggleQuickTools(){
  quickToolsOpen=!quickToolsOpen;
  const menu=document.getElementById('quick-tools-menu');
  if(!menu)return;
  menu.style.display=quickToolsOpen?'block':'none';
  const btn=document.getElementById('plus-btn');
  if(btn)btn.style.color=quickToolsOpen?'var(--a2)':'var(--a1)';
  if(quickToolsOpen){
    renderQuickToolsGrid('');
    // Add search input if not exists
    if(!document.getElementById('qt-search')){
      const s=document.createElement('div');
      s.style.cssText='margin-bottom:10px';
      s.innerHTML=`<input id="qt-search" placeholder="🔍 Search tools..." autofocus
        style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px;color:var(--text);outline:none"
        oninput="renderQuickToolsGrid(this.value)"/>`;
      menu.insertBefore(s,menu.querySelector('#quick-tools-grid'));
      setTimeout(()=>document.getElementById('qt-search')?.focus(),50);
    }
  }
}

function renderQuickToolsGrid(q){
  const grid=document.getElementById('quick-tools-grid');if(!grid)return;
  const lq=q.toLowerCase();
  const tools=lq?TOOLS.filter(t=>t.name.toLowerCase().includes(lq)||(t.cat||'').includes(lq)):TOOLS;
  grid.innerHTML=tools.slice(0,30).map(t=>`
    <button class="quick-tool-btn" onclick="selectQuickTool('${t.id}')">
      <span class="qt-emoji">${t.e}</span>
      <span class="qt-name">${esc(t.name)}</span>
    </button>`).join('');
}

function selectQuickTool(id){
  selectTool(id);
  quickToolsOpen=false;
  const menu=document.getElementById('quick-tools-menu');
  if(menu)menu.style.display='none';
  const btn=document.getElementById('plus-btn');
  if(btn)btn.style.color='var(--a1)';
  showActiveToolBar();
  document.getElementById('msg-input')?.focus();
}

function showActiveToolBar(){
  let bar=document.getElementById('active-tool-bar');
  if(!bar){
    bar=document.createElement('div');bar.id='active-tool-bar';
    bar.style.cssText='display:none;align-items:center;gap:8px;padding:5px 10px;background:var(--a1)15;border:1px solid var(--a1)30;border-radius:8px;margin:0 12px 6px;font-size:12px;color:var(--a1)';
    document.getElementById('input-wrap')?.insertBefore(bar,document.getElementById('input-bar'));
  }
  if(!S.tool){bar.style.display='none';return;}
  bar.style.display='flex';
  bar.innerHTML=`<span>${S.tool.e||'🔧'} Using: <strong>${S.tool.name}</strong></span><button onclick="clearActiveTool()" style="margin-left:auto;background:none;border:none;color:var(--t3);font-size:14px;cursor:pointer">✕</button>`;
}

function clearActiveTool(){
  S.tool=null;
  const bar=document.getElementById('active-tool-bar');
  if(bar)bar.style.display='none';
  document.getElementById('tool-label').textContent='NexusAI';
}

// Close on outside click
document.addEventListener('click',e=>{
  if(quickToolsOpen&&!e.target.closest('#quick-tools-menu')&&!e.target.closest('#plus-btn')){
    quickToolsOpen=false;
    const menu=document.getElementById('quick-tools-menu');
    if(menu)menu.style.display='none';
    const btn=document.getElementById('plus-btn');
    if(btn)btn.style.color='var(--a1)';
  }
});

// ── AUTO TOOL DETECTION ───────────────────────
function autoDetectTool(input){
  if(S.tool)return; // already has tool
  const lower=input.toLowerCase();
  const map=[
    {keys:['generate image','create image','draw','make image','imagine'],id:'dalle3'},
    {keys:['generate video','make video','create video'],id:'video-gen'},
    {keys:['generate music','create song','make music'],id:'music-gen'},
    {keys:['remove background','remove bg','transparent background'],id:'remove-bg'},
    {keys:['translate to','translate this','in arabic','in french','in english'],id:'translator'},
    {keys:['write email','draft email','compose email'],id:'email-writer'},
    {keys:['fix code','debug','syntax error','bug in'],id:'code-fixer'},
    {keys:['summarize','tldr','summary of this'],id:'summarizer'},
  ];
  for(const {keys,id} of map){
    if(keys.some(k=>lower.includes(k))){
      const tool=TOOLS.find(t=>t.id===id);
      if(tool){
        // Show soft suggestion bubble
        showToolSuggestion(tool);
        break;
      }
    }
  }
}

function showToolSuggestion(tool){
  document.getElementById('tool-suggestion')?.remove();
  const el=document.createElement('div');
  el.id='tool-suggestion';
  el.style.cssText='position:absolute;bottom:76px;left:50%;transform:translateX(-50%);background:var(--bg2);border:1px solid var(--a1)50;border-radius:99px;padding:5px 14px;font-size:12px;color:var(--a1);cursor:pointer;white-space:nowrap;z-index:40;animation:fadeIn .2s ease;box-shadow:0 4px 20px #0006';
  el.innerHTML=`${tool.e} Switch to <strong>${tool.name}</strong>? <span style="color:var(--t3);margin-left:6px">Tap to use</span>`;
  el.onclick=()=>{selectTool(tool.id);showActiveToolBar();el.remove();};
  document.getElementById('input-wrap')?.appendChild(el);
  setTimeout(()=>el?.remove(),4000);
}

// Hook into input for auto-detect
document.addEventListener('DOMContentLoaded',()=>{
  const inp=document.getElementById('msg-input');
  if(inp){
    let t;
    inp.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(()=>autoDetectTool(inp.value),700);});
  }
  // ✅ Auto-fill remembered email
  const savedEmail=localStorage.getItem('nx_email');
  if(savedEmail){
    const emailInput=document.getElementById('auth-email');
    if(emailInput){
      emailInput.value=savedEmail;
      setTimeout(()=>document.getElementById('auth-password')?.focus(),100);
    }
  }
  // 🎬 Cinematic intro on first visit
  if(!localStorage.getItem('nx_intro_seen')){
    const intro=document.createElement('div');
    intro.className='cinematic-onboarding';
    intro.innerHTML=`<div class="cinematic-text">NexusAI<br/><span style="font-size:.4em;opacity:.6">The AI that builds startups</span></div>`;
    document.body.appendChild(intro);
    setTimeout(()=>{intro.remove();localStorage.setItem('nx_intro_seen','1');},4000);
  }
  initTheme();
  if(S.token)init();
});

function selectToolFromGrid(id){
  selectTool(id);closeCatGrid();showActiveToolBar();
}


// ============================================================
// 📦 MERGED FRONTEND BUNDLES (was: 4 separate files)
// design-system.js · cinematic.js · visual-components.js · ui-panels.js
// ============================================================

// ============================================================
// 🌌 NexusAI Design System Runtime
// AI presence · cinematic transitions · adaptive atmospheres
// magnetic interactions · continuity · momentum protection
// ============================================================
(function () {
  'use strict';

  const NX = window.NX = window.NX || {};

  // ─── 1. Bootstrap ambient layer ─────────────────
  function mountAmbient() {
    if (document.querySelector('.nx-ambient-particles')) return;
    const p = document.createElement('div');
    p.className = 'nx-ambient-particles';
    p.setAttribute('aria-hidden', 'true');
    document.body.prepend(p);
    requestAnimationFrame(() => document.body.classList.add('nx-ready'));
  }

  // ─── 2. Operational mode (adapts atmosphere) ────
  const MODES = ['calm', 'focus', 'creator', 'strategy'];
  NX.setMode = function (mode) {
    if (!MODES.includes(mode)) mode = 'calm';
    document.body.setAttribute('data-mode', mode);
    try { localStorage.setItem('nx_mode', mode); } catch (_) {}
    window.dispatchEvent(new CustomEvent('nx:mode', { detail: { mode } }));
  };
  NX.getMode = function () {
    return document.body.getAttribute('data-mode') || 'calm';
  };
  // Restore last mode
  try {
    const saved = localStorage.getItem('nx_mode');
    if (saved) NX.setMode(saved);
  } catch (_) {}

  // ─── 3. Focus mode toggle ───────────────────────
  NX.toggleFocus = function (on) {
    const enabled = on === undefined ? !document.body.classList.contains('nx-focus') : !!on;
    document.body.classList.toggle('nx-focus', enabled);
    try { localStorage.setItem('nx_focus', enabled ? '1' : '0'); } catch (_) {}
    return enabled;
  };
  try {
    if (localStorage.getItem('nx_focus') === '1') document.body.classList.add('nx-focus');
  } catch (_) {}

  // ─── 4. AI Presence indicator API ───────────────
  // Usage: <span class="nx-ai-presence"></span>  → renders living dot
  // Programmatic: NX.aiPresence.thinking(true|false) → adds .thinking on all
  NX.aiPresence = {
    thinking(on) {
      document.querySelectorAll('.nx-ai-presence')
        .forEach(el => el.classList.toggle('thinking', !!on));
    },
    mount(parent) {
      const el = document.createElement('span');
      el.className = 'nx-ai-presence';
      (parent || document.body).appendChild(el);
      return el;
    },
  };

  // ─── 5. Thinking wave inline ────────────────────
  // NX.thinking.show(targetEl) → injects animated bars
  NX.thinking = {
    show(target, label) {
      if (!target) return null;
      const w = document.createElement('div');
      w.className = 'nx-thinking-wrap';
      w.style.cssText = 'display:inline-flex;align-items:center;gap:10px;color:#89a;font-size:12px;letter-spacing:.5px';
      w.innerHTML = `
        <span class="nx-thinking"><span></span><span></span><span></span><span></span><span></span></span>
        ${label ? `<span>${label}</span>` : ''}
      `;
      target.appendChild(w);
      return w;
    },
    hide(node) { node?.remove(); },
  };

  // ─── 6. Magnetic button effect ──────────────────
  // Add data-magnetic to any element → mouse-tracking glow
  function bindMagnetic(el) {
    if (el.__nxMagBound) return;
    el.__nxMagBound = true;
    el.classList.add('nx-btn-magnetic');
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      el.style.setProperty('--mx', x + '%');
      el.style.setProperty('--my', y + '%');
    });
  }
  function scanMagnetic() {
    document.querySelectorAll('[data-magnetic],.nx-magnetic-target').forEach(bindMagnetic);
  }

  // ─── 7. Cinematic enter — stagger reveal ────────
  // NX.enter(container) → adds .nx-enter-stagger to fade children in
  NX.enter = function (container) {
    if (!container) return;
    container.classList.remove('nx-enter-stagger');
    void container.offsetWidth; // reflow
    container.classList.add('nx-enter-stagger');
  };

  // ─── 8. Continuity / Resume toast ───────────────
  // NX.resume({ text, action, onClick })
  NX.resume = function (opts) {
    const { text = 'Welcome back', action = 'Resume →', onClick } = opts || {};
    document.querySelectorAll('.nx-resume').forEach(n => n.remove());
    const node = document.createElement('div');
    node.className = 'nx-resume';
    node.innerHTML = `
      <span class="nx-ai-presence"></span>
      <span>${text}</span>
      <span class="nx-chip" style="background:rgba(120,200,255,.12);border-color:rgba(120,200,255,.3);color:#cde">${action}</span>
    `;
    if (onClick) node.addEventListener('click', () => { onClick(); node.classList.remove('show'); setTimeout(() => node.remove(), 500); });
    document.body.appendChild(node);
    requestAnimationFrame(() => node.classList.add('show'));
    setTimeout(() => { node.classList.remove('show'); setTimeout(() => node.remove(), 500); }, 12000);
    return node;
  };

  // ─── 9. Last-seen / session continuity ──────────
  NX.session = {
    markActivity() {
      try { localStorage.setItem('nx_last_seen', String(Date.now())); } catch (_) {}
    },
    lastSeen() {
      try { return Number(localStorage.getItem('nx_last_seen') || 0); } catch (_) { return 0; }
    },
    awayMinutes() {
      const t = this.lastSeen();
      if (!t) return 0;
      return Math.floor((Date.now() - t) / 60000);
    },
    isResuming() {
      const m = this.awayMinutes();
      return m >= 5 && m < 60 * 24 * 7; // between 5min and 7 days
    },
  };

  // Auto-track activity
  ['click', 'keydown', 'visibilitychange'].forEach(ev =>
    window.addEventListener(ev, () => NX.session.markActivity(), { passive: true })
  );

  // ─── 10. AI thinking lifecycle — global hook ────
  // Any code can do: window.dispatchEvent(new CustomEvent('nx:ai-start'))
  //                  window.dispatchEvent(new CustomEvent('nx:ai-end'))
  let _aiInflight = 0;
  window.addEventListener('nx:ai-start', () => {
    _aiInflight++;
    NX.aiPresence.thinking(true);
  });
  window.addEventListener('nx:ai-end', () => {
    _aiInflight = Math.max(0, _aiInflight - 1);
    if (_aiInflight === 0) NX.aiPresence.thinking(false);
  });

  // ─── 11. Cinematic AI loader (replaces spinners) ─
  NX.loader = function (target) {
    if (!target) return null;
    const el = document.createElement('div');
    el.className = 'nx-loader';
    target.appendChild(el);
    return el;
  };

  // ─── 12. Auto-stagger on page change ────────────
  // If your app uses ?page=... or similar SPA pattern,
  // call NX.enter(mainContainer) on every page swap.

  // ─── 13. Boot ───────────────────────────────────
  function boot() {
    mountAmbient();
    scanMagnetic();

    // Observer for dynamically added [data-magnetic]
    const mo = new MutationObserver(() => scanMagnetic());
    mo.observe(document.body, { childList: true, subtree: true });

    // Continuity check after first paint
    setTimeout(() => {
      const minutes = NX.session.awayMinutes();
      if (NX.session.isResuming()) {
        const goal = (() => { try { return localStorage.getItem('nx_user_goal') || ''; } catch (_) { return ''; } })();
        const goalLabels = {
          startup: 'your startup workflow',
          code: 'your code session',
          create: 'your creative session',
          study: 'your research',
          analyze: 'your analysis',
          team: 'your workspace',
        };
        const label = goalLabels[goal] || 'where you left off';
        NX.resume({
          text: `Resume ${label}`,
          action: `Continue →`,
        });
      }
      NX.session.markActivity();
    }, 1500);

    // Listen for onboarding completion → set mode based on goal
    window.addEventListener('nx:onboarded', (e) => {
      const goal = e.detail?.goal;
      const goalToMode = {
        startup: 'strategy',
        code: 'focus',
        create: 'creator',
        study: 'focus',
        analyze: 'strategy',
        team: 'calm',
      };
      NX.setMode(goalToMode[goal] || 'calm');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();

// ============================================================
// 🎬 cinematic.js — Documents 22 + 24 + 25 + 26 Runtime
// Wires cinematic UX into the existing app without rewrite.
// AI typing · portal transitions · deep work · operational pulse
// ============================================================
(function () {
  'use strict';

  const Cine = window.Cine = window.Cine || {};

  // ─── Mode color mapping (matches design-system) ─────
  const MODE_COLORS = {
    calm:     '#35f1c6',
    focus:    '#5b8def',
    creator:  '#c87bef',
    strategy: '#c6f135',
  };

  // ─── 1. "Into the system" portal transition ─────
  Cine.portal = function (onComplete) {
    const overlay = document.createElement('div');
    overlay.className = 'cine-portal active';
    document.body.appendChild(overlay);
    setTimeout(() => {
      onComplete?.();
      setTimeout(() => overlay.remove(), 100);
    }, 400);
  };

  // ─── 2. Operational mode bar (top-right) ────────
  Cine.mountModeBar = function () {
    if (document.querySelector('.cine-mode-bar')) return;
    const bar = document.createElement('div');
    bar.className = 'cine-mode-bar';
    document.body.appendChild(bar);
    updateModeBar();
  };
  function updateModeBar() {
    const bar = document.querySelector('.cine-mode-bar');
    if (!bar) return;
    const mode = (window.NX?.getMode?.() || 'calm');
    bar.style.setProperty('--mode-color', MODE_COLORS[mode] || '#35f1c6');
    bar.textContent = mode;
    bar.title = `Operational mode: ${mode}`;
    bar.onclick = () => Cine.cycleMode();
  }
  Cine.cycleMode = function () {
    const modes = ['calm', 'focus', 'creator', 'strategy'];
    const current = window.NX?.getMode?.() || 'calm';
    const next = modes[(modes.indexOf(current) + 1) % modes.length];
    window.NX?.setMode?.(next);
    updateModeBar();
  };

  // ─── 3. Deep work mode toggle (keyboard: Ctrl/Cmd+Shift+D) ─
  Cine.toggleDeepWork = function (on) {
    const enabled = on === undefined
      ? !document.body.classList.contains('cine-deep-work')
      : !!on;
    document.body.classList.toggle('cine-deep-work', enabled);
    try { localStorage.setItem('cine_deep_work', enabled ? '1' : '0'); } catch (_) {}
    return enabled;
  };
  try {
    if (localStorage.getItem('cine_deep_work') === '1') {
      document.body.classList.add('cine-deep-work');
    }
  } catch (_) {}

  // ─── 4. AI cinematic typing (replaces basic typing) ─
  Cine.typeInto = function (element, text, options = {}) {
    if (!element) return;
    const speed = options.speed || 20; // chars per ~16ms
    const onDone = options.onDone || (() => {});
    element.textContent = '';
    element.classList.add('cine-typing');
    let i = 0;
    function tick() {
      if (i >= text.length) {
        element.classList.remove('cine-typing');
        onDone();
        return;
      }
      const chunk = text.slice(i, i + speed);
      const span = document.createElement('span');
      span.className = 'cine-stream';
      span.textContent = chunk;
      element.appendChild(span);
      i += speed;
      requestAnimationFrame(tick);
    }
    tick();
  };

  // ─── 5. AI thinking indicator (use in chat) ─────
  Cine.thinking = function (target, label = 'Thinking') {
    if (!target) return null;
    const node = document.createElement('div');
    node.className = 'cine-ai-pulse';
    node.textContent = label;
    target.appendChild(node);
    return {
      update(newLabel) { node.textContent = newLabel; },
      remove() { node.remove(); },
    };
  };

  // ─── 6. Timeline / orchestration replay ─────────
  Cine.renderTimeline = function (target, events) {
    if (!target || !Array.isArray(events)) return;
    target.classList.add('cine-timeline');
    target.innerHTML = '';
    events.forEach((e, i) => {
      const item = document.createElement('div');
      item.className = 'cine-timeline-item';
      if (e.status) item.classList.add(e.status);
      item.style.animationDelay = (i * 80) + 'ms';
      item.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px">
          <strong style="color:#fff;font-size:13px;font-weight:500">${escapeHtml(e.label || e.type)}</strong>
          <span style="color:#789;font-size:11px">${e.time || ''}</span>
        </div>
        ${e.detail ? `<div style="color:#89a;font-size:12px;margin-top:4px">${escapeHtml(e.detail)}</div>` : ''}
      `;
      target.appendChild(item);
    });
  };

  // ─── 7. Apply hologram material to selector ─────
  Cine.applyHologram = function (selector) {
    document.querySelectorAll(selector).forEach(el => el.classList.add('cine-hologram'));
  };

  // ─── 8. Page enter animation ────────────────────
  Cine.pageEnter = function (container) {
    if (!container) return;
    container.classList.remove('cine-page-transition');
    void container.offsetWidth;
    container.classList.add('cine-page-transition');
  };

  // ─── 9. Hook into AI thinking events ────────────
  let _aiBadge = null;
  window.addEventListener('nx:ai-start', () => {
    if (_aiBadge) return;
    const target = document.querySelector('#chat-messages') || document.querySelector('.chat-content') || document.body;
    if (target && target !== document.body) {
      _aiBadge = Cine.thinking(target, 'AI processing');
    }
  });
  window.addEventListener('nx:ai-end', () => {
    _aiBadge?.remove();
    _aiBadge = null;
  });

  // ─── 10. Keyboard shortcuts ─────────────────────
  document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl + Shift + D = deep work
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      Cine.toggleDeepWork();
    }
    // Cmd/Ctrl + Shift + M = cycle mode
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'M') {
      e.preventDefault();
      Cine.cycleMode();
    }
  });

  // ─── 11. Listen for mode changes ────────────────
  window.addEventListener('nx:mode', updateModeBar);

  // ─── Helpers ────────────────────────────────────
  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c]);
  }

  // ─── Boot ───────────────────────────────────────
  function boot() {
    Cine.mountModeBar();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();

// ============================================================
// 🎨 visual-components.js — Reusable visual building blocks
// DAG visualizer · Voice waveform · Workflow timeline · Heatmap
// Pure SVG/Canvas, no dependencies, zero framework lock-in.
// ============================================================
(function () {
  'use strict';

  const NXV = window.NXV = window.NXV || {};

  // ─── 1. DAG Visualizer ───────────────────────────
  // Renders orchestration graph as animated SVG nodes + edges
  NXV.renderDAG = function (target, graph, options = {}) {
    if (!target || !graph?.nodes) return null;
    const w = options.width || target.clientWidth || 600;
    const h = options.height || 360;
    const nodes = graph.nodes.map(n => ({ ...n, deps: n.dependsOn || [] }));

    // ── Topological layout: assign each node to a layer ──
    const layers = [];
    const placed = new Map();
    let remaining = [...nodes];
    let safety = 50;
    while (remaining.length && safety--) {
      const next = remaining.filter(n => n.deps.every(d => placed.has(d)));
      if (!next.length) break;
      layers.push(next);
      next.forEach(n => placed.set(n.id, layers.length - 1));
      remaining = remaining.filter(n => !placed.has(n.id));
    }

    const xStep = w / (layers.length + 1);
    const positions = new Map();
    layers.forEach((layer, li) => {
      const yStep = h / (layer.length + 1);
      layer.forEach((n, ni) => {
        positions.set(n.id, { x: xStep * (li + 1), y: yStep * (ni + 1) });
      });
    });

    // ── Render SVG ──
    target.innerHTML = '';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', h);
    svg.style.cssText = 'display:block;background:rgba(0,0,0,.15);border-radius:14px';

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <linearGradient id="nxv-edge" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#c6f135" stop-opacity=".15"/>
        <stop offset="50%" stop-color="#35f1c6" stop-opacity=".7"/>
        <stop offset="100%" stop-color="#c6f135" stop-opacity=".15"/>
      </linearGradient>
      <filter id="nxv-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" />
      </filter>
    `;
    svg.appendChild(defs);

    // Draw edges first (behind nodes)
    nodes.forEach(n => {
      const to = positions.get(n.id);
      n.deps.forEach(depId => {
        const from = positions.get(depId);
        if (!from) return;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const mx = (from.x + to.x) / 2;
        path.setAttribute('d', `M ${from.x} ${from.y} C ${mx} ${from.y}, ${mx} ${to.y}, ${to.x} ${to.y}`);
        path.setAttribute('stroke', 'url(#nxv-edge)');
        path.setAttribute('stroke-width', '1.5');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-dasharray', '4 4');
        path.style.animation = 'nxvFlow 2s linear infinite';
        svg.appendChild(path);
      });
    });

    // Draw nodes
    nodes.forEach(n => {
      const p = positions.get(n.id);
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', `translate(${p.x},${p.y})`);
      g.style.cursor = 'pointer';
      g.dataset.nodeId = n.id;

      // Status-aware fill
      const status = n.status || 'pending';
      const fill = {
        pending: '#3d3d5c',
        running: '#c6f135',
        done: '#35f1c6',
        error: '#ef4444',
      }[status];

      const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      halo.setAttribute('r', '18');
      halo.setAttribute('fill', fill);
      halo.setAttribute('opacity', status === 'running' ? '.4' : '.15');
      halo.setAttribute('filter', 'url(#nxv-glow)');
      if (status === 'running') halo.style.animation = 'nxvPulse 1.4s ease-in-out infinite';
      g.appendChild(halo);

      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('r', '7');
      dot.setAttribute('fill', fill);
      dot.setAttribute('stroke', '#fff');
      dot.setAttribute('stroke-width', '1.5');
      dot.setAttribute('stroke-opacity', '.4');
      g.appendChild(dot);

      const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      lbl.setAttribute('text-anchor', 'middle');
      lbl.setAttribute('y', '32');
      lbl.setAttribute('fill', '#cde');
      lbl.setAttribute('font-size', '11');
      lbl.setAttribute('font-family', 'Inter, sans-serif');
      lbl.textContent = (n.label || n.id).slice(0, 18);
      g.appendChild(lbl);

      if (options.onClick) g.addEventListener('click', () => options.onClick(n));
      svg.appendChild(g);
    });

    target.appendChild(svg);

    // Inject keyframes once
    if (!document.getElementById('nxv-keyframes')) {
      const s = document.createElement('style');
      s.id = 'nxv-keyframes';
      s.textContent = `
        @keyframes nxvFlow { to { stroke-dashoffset: -16; } }
        @keyframes nxvPulse {
          0%,100% { opacity: .25; transform: scale(1); transform-origin: center; }
          50% { opacity: .55; transform: scale(1.15); }
        }
      `;
      document.head.appendChild(s);
    }

    return {
      svg,
      updateStatus(nodeId, status) {
        const g = svg.querySelector(`[data-node-id="${nodeId}"]`);
        if (!g) return;
        const node = nodes.find(n => n.id === nodeId);
        if (node) node.status = status;
        const fill = { pending: '#3d3d5c', running: '#c6f135', done: '#35f1c6', error: '#ef4444' }[status];
        const [halo, dot] = g.children;
        halo.setAttribute('fill', fill);
        dot.setAttribute('fill', fill);
        halo.setAttribute('opacity', status === 'running' ? '.4' : '.15');
        if (status === 'running') halo.style.animation = 'nxvPulse 1.4s ease-in-out infinite';
        else halo.style.animation = 'none';
      },
    };
  };

  // ─── 2. Voice Waveform ───────────────────────────
  // Animated bars while recording / playing audio
  NXV.renderWaveform = function (target, options = {}) {
    if (!target) return null;
    const bars = options.bars || 32;
    target.innerHTML = '';
    target.style.cssText = (target.style.cssText || '') +
      ';display:flex;align-items:center;justify-content:center;gap:2px;height:48px;padding:8px';

    const els = [];
    for (let i = 0; i < bars; i++) {
      const b = document.createElement('div');
      b.style.cssText = `
        width:3px;
        background:linear-gradient(180deg,#c6f135,#35f1c6);
        border-radius:2px;
        height:20%;
        transition:height 80ms cubic-bezier(.2,.8,.2,1);
        opacity:.7;
      `;
      target.appendChild(b);
      els.push(b);
    }

    let raf = null;
    let active = false;
    let analyser = null;
    let dataArr = null;

    function animate() {
      if (!active) return;
      if (analyser) {
        analyser.getByteFrequencyData(dataArr);
        const step = Math.floor(dataArr.length / bars);
        els.forEach((el, i) => {
          const v = dataArr[i * step] || 0;
          el.style.height = Math.max(10, (v / 255) * 100) + '%';
          el.style.opacity = .4 + (v / 255) * .6;
        });
      } else {
        // Synthetic idle animation
        const t = Date.now() / 100;
        els.forEach((el, i) => {
          const v = (Math.sin(t + i * .3) + Math.sin(t * 1.7 + i * .5)) * 25 + 40;
          el.style.height = Math.max(10, v) + '%';
        });
      }
      raf = requestAnimationFrame(animate);
    }

    return {
      start(stream) {
        active = true;
        if (stream && window.AudioContext) {
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const source = ctx.createMediaStreamSource(stream);
            analyser = ctx.createAnalyser();
            analyser.fftSize = 128;
            dataArr = new Uint8Array(analyser.frequencyBinCount);
            source.connect(analyser);
          } catch (_) { analyser = null; }
        }
        animate();
      },
      stop() {
        active = false;
        if (raf) cancelAnimationFrame(raf);
        els.forEach(el => { el.style.height = '20%'; el.style.opacity = '.5'; });
      },
      setLevel(level) {
        // 0..1 manual level (when no stream)
        els.forEach((el, i) => {
          const offset = Math.sin(i * .8) * 20;
          el.style.height = Math.max(10, level * 100 + offset) + '%';
        });
      },
    };
  };

  // ─── 3. Operational Heatmap ──────────────────────
  // GitHub-style activity grid
  NXV.renderHeatmap = function (target, data, options = {}) {
    if (!target) return;
    const days = options.days || 90;
    const cell = options.cellSize || 12;
    const gap = 2;
    const cols = Math.ceil(days / 7);

    target.innerHTML = '';
    target.style.cssText = (target.style.cssText || '') + ';display:flex;gap:2px;align-items:flex-start';

    // Normalize data
    const max = Math.max(...Object.values(data || {}), 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let c = 0; c < cols; c++) {
      const colDiv = document.createElement('div');
      colDiv.style.cssText = `display:flex;flex-direction:column;gap:${gap}px`;
      for (let r = 0; r < 7; r++) {
        const idx = (cols - 1 - c) * 7 + r;
        if (idx >= days) continue;
        const date = new Date(today);
        date.setDate(date.getDate() - idx);
        const key = date.toISOString().slice(0, 10);
        const val = data?.[key] || 0;
        const intensity = val / max;
        const sq = document.createElement('div');
        sq.title = `${key}: ${val}`;
        sq.style.cssText = `
          width:${cell}px;height:${cell}px;border-radius:3px;
          background:rgba(198,241,53,${0.08 + intensity * 0.7});
          border:1px solid rgba(255,255,255,${0.04 + intensity * 0.06});
          cursor:pointer;
          transition:transform .15s;
        `;
        sq.onmouseenter = () => sq.style.transform = 'scale(1.4)';
        sq.onmouseleave = () => sq.style.transform = 'scale(1)';
        colDiv.appendChild(sq);
      }
      target.appendChild(colDiv);
    }
  };

  // ─── 4. Workflow Timeline (replay) ───────────────
  NXV.renderTimeline = function (target, events) {
    if (!target || !events?.length) return;
    target.innerHTML = '';
    target.style.cssText = (target.style.cssText || '') +
      ';position:relative;padding-left:24px;display:flex;flex-direction:column;gap:14px';

    // Vertical spine
    const spine = document.createElement('div');
    spine.style.cssText = 'position:absolute;left:7px;top:0;bottom:0;width:2px;background:linear-gradient(180deg,transparent,#35f1c660 20%,#35f1c660 80%,transparent);border-radius:2px';
    target.appendChild(spine);

    events.forEach((e, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'position:relative;animation:nxvFadeIn .5s cubic-bezier(.2,.8,.2,1) both';
      row.style.animationDelay = (i * 60) + 'ms';

      const dot = document.createElement('div');
      const statusColor = { ok: '#35f1c6', error: '#ef4444', running: '#c6f135', pending: '#3d3d5c' }[e.status] || '#7df';
      dot.style.cssText = `
        position:absolute;left:-21px;top:6px;width:10px;height:10px;border-radius:50%;
        background:${statusColor};box-shadow:0 0 8px ${statusColor}
      `;
      row.appendChild(dot);

      const content = document.createElement('div');
      content.style.cssText = 'background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:10px 14px';
      content.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px">
          <div style="color:#cde;font-size:13px;font-weight:500">${escapeHtml(e.label || e.type)}</div>
          <div style="color:#789;font-size:11px;letter-spacing:.5px">${e.time || ''}</div>
        </div>
        ${e.detail ? `<div style="color:#89a;font-size:12px;margin-top:4px">${escapeHtml(e.detail)}</div>` : ''}
        ${e.duration_ms != null ? `<div style="color:#567;font-size:11px;margin-top:4px">${e.duration_ms}ms</div>` : ''}
      `;
      row.appendChild(content);
      target.appendChild(row);
    });

    if (!document.getElementById('nxv-fadein')) {
      const s = document.createElement('style');
      s.id = 'nxv-fadein';
      s.textContent = '@keyframes nxvFadeIn { from { opacity:0; transform:translateX(-8px) } to { opacity:1; transform:translateX(0) } }';
      document.head.appendChild(s);
    }
  };

  // ─── 5. Inline sparkline ─────────────────────────
  NXV.renderSparkline = function (target, values, options = {}) {
    if (!target || !values?.length) return;
    const w = options.width || 120;
    const h = options.height || 32;
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const step = w / (values.length - 1 || 1);

    const points = values.map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    target.innerHTML = `
      <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="overflow:visible">
        <defs>
          <linearGradient id="nxv-spark-${Math.random().toString(36).slice(2,8)}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#35f1c6" stop-opacity=".4"/>
            <stop offset="100%" stop-color="#35f1c6" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <polyline fill="none" stroke="#35f1c6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" points="${points}"/>
      </svg>
    `;
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c]);
  }
})();

// ============================================================
// 🎛️ ui-panels.js — All 6 service panels
// Knowledge · Media · Code · Business · Workspaces · Voice
// Renders into target containers. Uses NX design system + NXV visuals.
// ============================================================
(function () {
  'use strict';

  const NXUI = window.NXUI = window.NXUI || {};

  // ─── API helper (uses existing auth token) ─────
  async function api(path, opts = {}) {
    const token = (window.getAuthToken ? window.getAuthToken() : '') || localStorage.getItem('nx_t') || '';
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    window.dispatchEvent(new CustomEvent('nx:ai-start'));
    try {
      const r = await fetch(path, { ...opts, headers });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      return data;
    } finally {
      window.dispatchEvent(new CustomEvent('nx:ai-end'));
    }
  }

  // ─── Shared panel chrome ───────────────────────
  function panelShell(title, subtitle, bodyHtml, opts = {}) {
    return `
      <div class="nxui-panel nx-enter" data-magnetic>
        <header class="nxui-head">
          <div>
            <h2 class="nxui-title">${escapeHtml(title)}</h2>
            ${subtitle ? `<p class="nxui-sub">${escapeHtml(subtitle)}</p>` : ''}
          </div>
          ${opts.badge ? `<span class="nx-chip">${escapeHtml(opts.badge)}</span>` : ''}
        </header>
        <div class="nxui-body">${bodyHtml}</div>
      </div>
    `;
  }

  function injectStyles() {
    if (document.getElementById('nxui-styles')) return;
    const s = document.createElement('style');
    s.id = 'nxui-styles';
    s.textContent = `
      .nxui-panel{background:linear-gradient(135deg,rgba(255,255,255,.03),rgba(255,255,255,.01));border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:28px;margin-bottom:16px;backdrop-filter:blur(12px)}
      .nxui-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:24px}
      .nxui-title{font-size:18px;font-weight:500;color:#fff;letter-spacing:-.2px;margin:0}
      .nxui-sub{color:#789;font-size:12px;margin-top:4px;letter-spacing:.3px}
      .nxui-body{display:flex;flex-direction:column;gap:16px}
      .nxui-input{width:100%;padding:12px 14px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#fff;font-size:14px;font-family:inherit;outline:none;transition:border-color .2s}
      .nxui-input:focus{border-color:#35f1c6;box-shadow:0 0 0 3px rgba(53,241,198,.15)}
      .nxui-textarea{min-height:120px;resize:vertical;font-family:inherit}
      .nxui-btn{padding:10px 18px;background:linear-gradient(135deg,#c6f135,#35f1c6);color:#000;font-weight:600;border:none;border-radius:10px;font-size:13px;cursor:pointer;transition:transform .15s;letter-spacing:.3px}
      .nxui-btn:hover{transform:translateY(-1px) scale(1.01)}
      .nxui-btn:disabled{opacity:.5;cursor:wait}
      .nxui-btn-secondary{padding:10px 18px;background:rgba(255,255,255,.05);color:#cde;border:1px solid rgba(255,255,255,.08);border-radius:10px;font-size:13px;cursor:pointer}
      .nxui-btn-secondary:hover{background:rgba(255,255,255,.08)}
      .nxui-result{padding:16px;background:rgba(0,0,0,.2);border-radius:12px;border:1px solid rgba(53,241,198,.15);color:#cde;font-size:13px;line-height:1.6;white-space:pre-wrap;font-family:ui-monospace,monospace}
      .nxui-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      .nxui-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
      .nxui-card{padding:16px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;transition:all .2s}
      .nxui-card:hover{border-color:rgba(53,241,198,.3);transform:translateY(-2px)}
      .nxui-label{font-size:11px;color:#789;letter-spacing:1.5px;text-transform:uppercase;display:block;margin-bottom:6px}
      .nxui-select{padding:10px 14px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#fff;font-size:14px;outline:none}
      .nxui-empty{color:#567;font-size:13px;text-align:center;padding:24px;font-style:italic}
      .nxui-member{display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,.02);border-radius:8px}
      .nxui-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#c6f135,#35f1c6);display:flex;align-items:center;justify-content:center;color:#000;font-weight:700;font-size:13px}
      .nxui-tabs{display:flex;gap:4px;border-bottom:1px solid rgba(255,255,255,.06);margin-bottom:16px;overflow-x:auto}
      .nxui-tab{padding:10px 16px;color:#789;font-size:13px;cursor:pointer;border-bottom:2px solid transparent;transition:all .2s;white-space:nowrap}
      .nxui-tab.active{color:#fff;border-bottom-color:#35f1c6}
      .nxui-tab:hover{color:#cde}
      .nxui-list{display:flex;flex-direction:column;gap:8px;max-height:400px;overflow-y:auto}
      .nxui-list::-webkit-scrollbar{width:6px}
      .nxui-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:3px}
      .nxui-img{max-width:100%;border-radius:12px;display:block}
      .nxui-meta{font-size:11px;color:#567;letter-spacing:.5px}
    `;
    document.head.appendChild(s);
  }
  injectStyles();

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  // ─────────────────────────────────────────
  // 1. KNOWLEDGE HUB
  // ─────────────────────────────────────────
  NXUI.renderKnowledge = function (target) {
    target.innerHTML = panelShell('Knowledge Hub', 'Research with citations — grounded answers from the web', `
      <div class="nxui-row">
        <input class="nxui-input" id="nxui-k-q" placeholder="Ask anything — citations included..."/>
        <button class="nxui-btn" id="nxui-k-go">Search</button>
      </div>
      <div id="nxui-k-out"></div>
    `, { badge: 'RAG' });

    const out = target.querySelector('#nxui-k-out');
    const go = async () => {
      const q = target.querySelector('#nxui-k-q').value.trim();
      if (!q) return;
      out.innerHTML = `<div class="nxui-result"><span class="nx-thinking"><span></span><span></span><span></span><span></span><span></span></span> Researching…</div>`;
      try {
        const r = await api('/api/intelligence/multi-model', {
          method: 'POST',
          body: JSON.stringify({ prompt: q, task: 'reasoning-deep' }),
        });
        out.innerHTML = `
          <div class="nxui-result">
            <div style="color:#35f1c6;font-size:11px;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">Synthesis</div>
            ${escapeHtml(typeof r.synthesis === 'string' ? r.synthesis : JSON.stringify(r.synthesis || r, null, 2))}
          </div>
        `;
      } catch (e) {
        out.innerHTML = `<div class="nxui-result" style="border-color:rgba(239,68,68,.3);color:#fca5a5">${escapeHtml(e.message)}</div>`;
      }
    };
    target.querySelector('#nxui-k-go').onclick = go;
    target.querySelector('#nxui-k-q').addEventListener('keydown', e => e.key === 'Enter' && go());
  };

  // ─────────────────────────────────────────
  // 2. MEDIA STUDIO
  // ─────────────────────────────────────────
  NXUI.renderMedia = function (target) {
    target.innerHTML = panelShell('Media Studio', 'Generate images · video · 3D · audio', `
      <div class="nxui-tabs">
        <div class="nxui-tab active" data-tab="image">Image</div>
        <div class="nxui-tab" data-tab="video">Video</div>
        <div class="nxui-tab" data-tab="3d">3D</div>
        <div class="nxui-tab" data-tab="audio">Audio</div>
      </div>
      <textarea class="nxui-input nxui-textarea" id="nxui-m-prompt" placeholder="Describe what to generate..."></textarea>
      <div class="nxui-row">
        <select class="nxui-select" id="nxui-m-model"></select>
        <button class="nxui-btn" id="nxui-m-go">Generate</button>
      </div>
      <div id="nxui-m-out"></div>
    `, { badge: 'Multimodal' });

    let activeType = 'image';
    let modelsCache = null;

    async function loadModels(type) {
      if (!modelsCache) {
        try { modelsCache = await api('/api/media/models'); } catch (_) { modelsCache = {}; }
      }
      const sel = target.querySelector('#nxui-m-model');
      const models = modelsCache[type] || {};
      sel.innerHTML = Object.keys(models).map(k => `<option value="${k}">${k}</option>`).join('') || '<option value="">No models available</option>';
    }
    loadModels('image');

    target.querySelectorAll('.nxui-tab').forEach(t => {
      t.onclick = () => {
        target.querySelectorAll('.nxui-tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        activeType = t.dataset.tab;
        loadModels(activeType);
      };
    });

    target.querySelector('#nxui-m-go').onclick = async () => {
      const prompt = target.querySelector('#nxui-m-prompt').value.trim();
      const model = target.querySelector('#nxui-m-model').value;
      if (!prompt) return;
      const out = target.querySelector('#nxui-m-out');
      out.innerHTML = `<div class="nxui-result"><span class="nx-thinking"><span></span><span></span><span></span><span></span><span></span></span> Generating ${activeType}...</div>`;
      try {
        const r = await api('/api/media/generate', {
          method: 'POST',
          body: JSON.stringify({ type: activeType, prompt, model }),
        });
        if (r.url && activeType === 'image') {
          out.innerHTML = `<img class="nxui-img" src="${escapeHtml(r.url)}" alt="${escapeHtml(prompt)}"/><div class="nxui-meta" style="margin-top:8px">${escapeHtml(r.model)} · ${r.duration_ms}ms</div>`;
        } else if (r.url && (activeType === 'video' || activeType === '3d')) {
          out.innerHTML = `<video class="nxui-img" controls src="${escapeHtml(r.url)}"></video><div class="nxui-meta" style="margin-top:8px">${escapeHtml(r.model)}</div>`;
        } else if (r.url && activeType === 'audio') {
          out.innerHTML = `<audio controls src="${escapeHtml(r.url)}" style="width:100%"></audio>`;
        } else {
          out.innerHTML = `<div class="nxui-result">${escapeHtml(JSON.stringify(r, null, 2))}</div>`;
        }
      } catch (e) {
        out.innerHTML = `<div class="nxui-result" style="border-color:rgba(239,68,68,.3);color:#fca5a5">${escapeHtml(e.message)}</div>`;
      }
    };
  };

  // ─────────────────────────────────────────
  // 3. CODE INTELLIGENCE
  // ─────────────────────────────────────────
  NXUI.renderCode = function (target) {
    target.innerHTML = panelShell('Code Intelligence', 'Repo-aware analysis · reviews · debugging', `
      <div class="nxui-tabs">
        <div class="nxui-tab active" data-tab="analyze">Analyze</div>
        <div class="nxui-tab" data-tab="review">Review</div>
        <div class="nxui-tab" data-tab="debug">Debug</div>
      </div>
      <textarea class="nxui-input nxui-textarea" id="nxui-c-code" placeholder="Paste code here..." style="font-family:ui-monospace,monospace;min-height:180px"></textarea>
      <textarea class="nxui-input" id="nxui-c-err" placeholder="Error message (for debug only)" style="display:none"></textarea>
      <div class="nxui-row">
        <select class="nxui-select" id="nxui-c-lang">
          <option>javascript</option><option>python</option><option>typescript</option><option>rust</option><option>go</option>
        </select>
        <button class="nxui-btn" id="nxui-c-go">Run Analysis</button>
      </div>
      <div id="nxui-c-out"></div>
    `, { badge: 'Cursor-level' });

    let mode = 'analyze';
    target.querySelectorAll('.nxui-tab').forEach(t => {
      t.onclick = () => {
        target.querySelectorAll('.nxui-tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        mode = t.dataset.tab;
        target.querySelector('#nxui-c-err').style.display = mode === 'debug' ? 'block' : 'none';
      };
    });

    target.querySelector('#nxui-c-go').onclick = async () => {
      const code = target.querySelector('#nxui-c-code').value.trim();
      const language = target.querySelector('#nxui-c-lang').value;
      const error = target.querySelector('#nxui-c-err').value.trim();
      if (!code) return;
      const out = target.querySelector('#nxui-c-out');
      out.innerHTML = `<div class="nxui-result"><span class="nx-thinking"><span></span><span></span><span></span><span></span><span></span></span> Analyzing…</div>`;

      const endpoint = { analyze: '/api/repo/analyze', review: '/api/repo/review', debug: '/api/repo/debug' }[mode];
      const body = mode === 'debug' ? { code, error, language } : { code, language };
      try {
        const r = await api(endpoint, { method: 'POST', body: JSON.stringify(body) });
        out.innerHTML = `<div class="nxui-result">${escapeHtml(JSON.stringify(r, null, 2))}</div>`;
      } catch (e) {
        out.innerHTML = `<div class="nxui-result" style="border-color:rgba(239,68,68,.3);color:#fca5a5">${escapeHtml(e.message)}</div>`;
      }
    };
  };

  // ─────────────────────────────────────────
  // 4. BUSINESS DASHBOARD
  // ─────────────────────────────────────────
  NXUI.renderBusiness = function (target) {
    target.innerHTML = panelShell('Business Operations', 'Metrics · growth intelligence · strategic playbooks', `
      <div class="nxui-tabs">
        <div class="nxui-tab active" data-tab="record">Record</div>
        <div class="nxui-tab" data-tab="analyze">Analyze</div>
        <div class="nxui-tab" data-tab="growth">Growth</div>
        <div class="nxui-tab" data-tab="marketing">Marketing</div>
      </div>
      <div id="nxui-b-body"></div>
      <div id="nxui-b-out"></div>
    `, { badge: 'Ops AI' });

    const body = target.querySelector('#nxui-b-body');
    const out = target.querySelector('#nxui-b-out');

    function showRecord() {
      body.innerHTML = `
        <input class="nxui-input" id="nxui-b-type" placeholder="metric_type (e.g. acquisition)"/>
        <input class="nxui-input" id="nxui-b-name" placeholder="metric_name (e.g. signups)"/>
        <input class="nxui-input" id="nxui-b-val" type="number" placeholder="value"/>
        <div class="nxui-row"><button class="nxui-btn" id="nxui-b-rec">Record metric</button></div>
      `;
      body.querySelector('#nxui-b-rec').onclick = async () => {
        try {
          await api('/api/business/metric', {
            method: 'POST',
            body: JSON.stringify({
              metric_type: body.querySelector('#nxui-b-type').value,
              metric_name: body.querySelector('#nxui-b-name').value,
              value: Number(body.querySelector('#nxui-b-val').value),
            }),
          });
          out.innerHTML = `<div class="nxui-result" style="border-color:rgba(53,241,198,.4)">✓ Recorded</div>`;
        } catch (e) { out.innerHTML = `<div class="nxui-result" style="border-color:rgba(239,68,68,.3);color:#fca5a5">${escapeHtml(e.message)}</div>`; }
      };
    }

    async function runAnalysis(endpoint, payload = {}) {
      out.innerHTML = `<div class="nxui-result"><span class="nx-thinking"><span></span><span></span><span></span><span></span><span></span></span> Analyzing…</div>`;
      try {
        const r = await api(endpoint, { method: 'POST', body: JSON.stringify(payload) });
        out.innerHTML = `<div class="nxui-result">${escapeHtml(JSON.stringify(r, null, 2))}</div>`;
      } catch (e) { out.innerHTML = `<div class="nxui-result" style="border-color:rgba(239,68,68,.3);color:#fca5a5">${escapeHtml(e.message)}</div>`; }
    }

    function showAnalyze() {
      body.innerHTML = `<div class="nxui-row"><button class="nxui-btn" id="nxui-b-ana">Analyze last 7 days</button></div>`;
      body.querySelector('#nxui-b-ana').onclick = () => runAnalysis('/api/business/analyze', { period_days: 7 });
    }
    function showGrowth() {
      body.innerHTML = `<div class="nxui-row"><button class="nxui-btn" id="nxui-b-gr">Run growth intelligence</button></div>`;
      body.querySelector('#nxui-b-gr').onclick = () => runAnalysis('/api/business/growth');
    }
    function showMarketing() {
      body.innerHTML = `
        <input class="nxui-input" id="nxui-mk-prod" placeholder="Product"/>
        <input class="nxui-input" id="nxui-mk-aud" placeholder="Target audience"/>
        <select class="nxui-select" id="nxui-mk-bud"><option>low</option><option>medium</option><option>high</option></select>
        <div class="nxui-row"><button class="nxui-btn" id="nxui-mk-go">Generate strategy</button></div>
      `;
      body.querySelector('#nxui-mk-go').onclick = () => runAnalysis('/api/business/marketing', {
        product: body.querySelector('#nxui-mk-prod').value,
        audience: body.querySelector('#nxui-mk-aud').value,
        budget: body.querySelector('#nxui-mk-bud').value,
      });
    }

    const tabHandlers = { record: showRecord, analyze: showAnalyze, growth: showGrowth, marketing: showMarketing };
    target.querySelectorAll('.nxui-tab').forEach(t => {
      t.onclick = () => {
        target.querySelectorAll('.nxui-tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        tabHandlers[t.dataset.tab]();
      };
    });
    showRecord();
  };

  // ─────────────────────────────────────────
  // 5. WORKSPACES
  // ─────────────────────────────────────────
  NXUI.renderWorkspaces = function (target) {
    target.innerHTML = panelShell('Workspaces', 'Team collaboration with real-time presence', `
      <div class="nxui-row">
        <input class="nxui-input" id="nxui-ws-name" placeholder="Workspace name..." style="flex:1"/>
        <button class="nxui-btn" id="nxui-ws-create">Create</button>
      </div>
      <div id="nxui-ws-list" class="nxui-list"></div>
      <div id="nxui-ws-detail"></div>
    `, { badge: 'Team' });

    const list = target.querySelector('#nxui-ws-list');
    const detail = target.querySelector('#nxui-ws-detail');

    async function loadList() {
      try {
        const r = await api('/api/workspaces');
        if (!r.workspaces?.length) {
          list.innerHTML = `<div class="nxui-empty">No workspaces yet — create one above</div>`;
          return;
        }
        list.innerHTML = r.workspaces.map(ws => `
          <div class="nxui-card" data-ws-id="${ws.id}" style="cursor:pointer">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <div style="color:#fff;font-weight:500;font-size:14px">${escapeHtml(ws.name)}</div>
                <div class="nxui-meta">${escapeHtml(ws.role)} · ${escapeHtml(ws.slug || '')}</div>
              </div>
              <span class="nx-chip">${escapeHtml(ws.role)}</span>
            </div>
          </div>
        `).join('');
        list.querySelectorAll('[data-ws-id]').forEach(el => {
          el.onclick = () => openWs(Number(el.dataset.wsId));
        });
      } catch (e) {
        list.innerHTML = `<div class="nxui-empty">${escapeHtml(e.message)}</div>`;
      }
    }

    async function openWs(id) {
      detail.innerHTML = `<div class="nxui-result"><span class="nx-thinking"><span></span><span></span><span></span><span></span><span></span></span> Loading…</div>`;
      try {
        const ws = await api(`/api/workspaces/${id}`);
        detail.innerHTML = `
          <div class="nxui-card nx-active-glow">
            <h3 style="color:#fff;margin-bottom:8px">${escapeHtml(ws.name)}</h3>
            <p style="color:#789;font-size:13px;margin-bottom:16px">${escapeHtml(ws.description || 'No description')}</p>
            <div class="nxui-label">Members (${ws.members?.length || 0})</div>
            <div class="nxui-list" style="max-height:200px;margin-top:8px">
              ${(ws.members || []).map(m => `
                <div class="nxui-member">
                  <div class="nxui-avatar">${(m.name || m.email || '?').slice(0, 1).toUpperCase()}</div>
                  <div style="flex:1">
                    <div style="color:#fff;font-size:13px">${escapeHtml(m.name || m.email || 'User')}</div>
                    <div class="nxui-meta">${escapeHtml(m.role)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
            <div class="nxui-row" style="margin-top:16px">
              <input class="nxui-input" id="nxui-ws-invite" placeholder="invite@email.com" style="flex:1"/>
              <button class="nxui-btn-secondary" id="nxui-ws-invite-go">Send invite</button>
            </div>
            <div id="nxui-ws-invite-out" style="margin-top:8px"></div>
          </div>
        `;
        detail.querySelector('#nxui-ws-invite-go').onclick = async () => {
          const email = detail.querySelector('#nxui-ws-invite').value.trim();
          if (!email) return;
          try {
            const r = await api(`/api/workspaces/${id}/invite`, {
              method: 'POST', body: JSON.stringify({ email, role: 'member' }),
            });
            detail.querySelector('#nxui-ws-invite-out').innerHTML = `<div class="nxui-result" style="border-color:rgba(53,241,198,.4)">Invite sent: <code>${escapeHtml(r.invite_url)}</code></div>`;
          } catch (e) {
            detail.querySelector('#nxui-ws-invite-out').innerHTML = `<div class="nxui-result" style="border-color:rgba(239,68,68,.3);color:#fca5a5">${escapeHtml(e.message)}</div>`;
          }
        };
      } catch (e) {
        detail.innerHTML = `<div class="nxui-result" style="border-color:rgba(239,68,68,.3);color:#fca5a5">${escapeHtml(e.message)}</div>`;
      }
    }

    target.querySelector('#nxui-ws-create').onclick = async () => {
      const name = target.querySelector('#nxui-ws-name').value.trim();
      if (!name) return;
      try {
        await api('/api/workspaces', { method: 'POST', body: JSON.stringify({ name }) });
        target.querySelector('#nxui-ws-name').value = '';
        loadList();
      } catch (e) { detail.innerHTML = `<div class="nxui-result" style="border-color:rgba(239,68,68,.3);color:#fca5a5">${escapeHtml(e.message)}</div>`; }
    };

    loadList();
  };

  // ─────────────────────────────────────────
  // 6. VOICE CONSOLE
  // ─────────────────────────────────────────
  NXUI.renderVoice = function (target) {
    target.innerHTML = panelShell('Voice Console', 'Transcribe · synthesize · voice chat', `
      <div class="nxui-tabs">
        <div class="nxui-tab active" data-tab="tts">Text → Speech</div>
        <div class="nxui-tab" data-tab="record">Voice chat</div>
      </div>
      <div id="nxui-v-body"></div>
    `, { badge: 'Voice AI' });

    const body = target.querySelector('#nxui-v-body');

    function showTTS() {
      body.innerHTML = `
        <textarea class="nxui-input nxui-textarea" id="nxui-v-text" placeholder="Type text to convert to speech..."></textarea>
        <div class="nxui-row">
          <select class="nxui-select" id="nxui-v-voice">
            <option value="alloy">Alloy</option>
            <option value="echo">Echo</option>
            <option value="fable">Fable</option>
            <option value="onyx">Onyx</option>
            <option value="nova">Nova</option>
            <option value="shimmer">Shimmer</option>
          </select>
          <button class="nxui-btn" id="nxui-v-tts-go">Synthesize</button>
        </div>
        <div id="nxui-v-tts-out"></div>
      `;
      body.querySelector('#nxui-v-tts-go').onclick = async () => {
        const text = body.querySelector('#nxui-v-text').value.trim();
        const voice = body.querySelector('#nxui-v-voice').value;
        if (!text) return;
        const out = body.querySelector('#nxui-v-tts-out');
        out.innerHTML = `<div class="nxui-result"><span class="nx-thinking"><span></span><span></span><span></span><span></span><span></span></span> Synthesizing…</div>`;
        try {
          const r = await api('/api/voice/tts', { method: 'POST', body: JSON.stringify({ text, voice }) });
          out.innerHTML = `<audio controls src="${r.audio_url}" style="width:100%;margin-top:8px"></audio>`;
        } catch (e) { out.innerHTML = `<div class="nxui-result" style="border-color:rgba(239,68,68,.3);color:#fca5a5">${escapeHtml(e.message)}</div>`; }
      };
    }

    function showRecord() {
      body.innerHTML = `
        <div id="nxui-v-wave" style="background:rgba(0,0,0,.3);border-radius:12px;padding:8px"></div>
        <div class="nxui-row">
          <button class="nxui-btn" id="nxui-v-start">● Start recording</button>
          <button class="nxui-btn-secondary" id="nxui-v-stop" disabled>Stop & transcribe</button>
        </div>
        <div id="nxui-v-rec-out"></div>
      `;
      const wave = window.NXV?.renderWaveform?.(body.querySelector('#nxui-v-wave'), { bars: 40 });
      let mediaRecorder = null;
      let chunks = [];
      body.querySelector('#nxui-v-start').onclick = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRecorder = new MediaRecorder(stream);
          chunks = [];
          mediaRecorder.ondataavailable = e => chunks.push(e.data);
          mediaRecorder.start();
          wave?.start(stream);
          body.querySelector('#nxui-v-start').disabled = true;
          body.querySelector('#nxui-v-stop').disabled = false;
        } catch (e) {
          body.querySelector('#nxui-v-rec-out').innerHTML = `<div class="nxui-result" style="border-color:rgba(239,68,68,.3);color:#fca5a5">Microphone access denied</div>`;
        }
      };
      body.querySelector('#nxui-v-stop').onclick = async () => {
        mediaRecorder?.stop();
        wave?.stop();
        body.querySelector('#nxui-v-start').disabled = false;
        body.querySelector('#nxui-v-stop').disabled = true;
        await new Promise(r => mediaRecorder.onstop = r);
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = async () => {
          const audio = reader.result.split(',')[1];
          const out = body.querySelector('#nxui-v-rec-out');
          out.innerHTML = `<div class="nxui-result"><span class="nx-thinking"><span></span><span></span><span></span><span></span><span></span></span> Transcribing…</div>`;
          try {
            const r = await api('/api/voice/transcribe', {
              method: 'POST', body: JSON.stringify({ audio, format: 'webm' }),
            });
            out.innerHTML = `<div class="nxui-result">${escapeHtml(r.text || '(empty)')}</div>`;
          } catch (e) { out.innerHTML = `<div class="nxui-result" style="border-color:rgba(239,68,68,.3);color:#fca5a5">${escapeHtml(e.message)}</div>`; }
        };
        reader.readAsDataURL(blob);
      };
    }

    target.querySelectorAll('.nxui-tab').forEach(t => {
      t.onclick = () => {
        target.querySelectorAll('.nxui-tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        (t.dataset.tab === 'tts' ? showTTS : showRecord)();
      };
    });
    showTTS();
  };

  // ─────────────────────────────────────────
  // 7. Multi-panel router
  // ─────────────────────────────────────────
  NXUI.renderAll = function (container) {
    if (!container) return;
    container.innerHTML = `
      <div class="nxui-tabs" id="nxui-main-tabs">
        <div class="nxui-tab active" data-panel="knowledge">🔍 Knowledge</div>
        <div class="nxui-tab" data-panel="media">🎨 Media</div>
        <div class="nxui-tab" data-panel="code">💻 Code</div>
        <div class="nxui-tab" data-panel="business">📊 Business</div>
        <div class="nxui-tab" data-panel="workspaces">👥 Teams</div>
        <div class="nxui-tab" data-panel="voice">🎤 Voice</div>
      </div>
      <div id="nxui-panel-target"></div>
    `;
    const target = container.querySelector('#nxui-panel-target');
    const renderers = {
      knowledge: NXUI.renderKnowledge,
      media: NXUI.renderMedia,
      code: NXUI.renderCode,
      business: NXUI.renderBusiness,
      workspaces: NXUI.renderWorkspaces,
      voice: NXUI.renderVoice,
    };
    container.querySelectorAll('#nxui-main-tabs .nxui-tab').forEach(t => {
      t.onclick = () => {
        container.querySelectorAll('#nxui-main-tabs .nxui-tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        renderers[t.dataset.panel]?.(target);
      };
    });
    renderers.knowledge(target);
  };
})();

// ============================================================
// 🏆 EXTENDED UI PANELS — Community + PMF + Twin + Fabric + Temporal
// Documents 6, 12, 13, 15, 16, 18, 24, 26
// ============================================================
(function(){
  'use strict';
  const NXUI = window.NXUI = window.NXUI || {};

  async function api(path, opts = {}) {
    const token = (window.getAuthToken ? window.getAuthToken() : '') || localStorage.getItem('nx_t') || '';
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    window.dispatchEvent(new CustomEvent('nx:ai-start'));
    try {
      const r = await fetch(path, { ...opts, headers });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      return data;
    } finally {
      window.dispatchEvent(new CustomEvent('nx:ai-end'));
    }
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  // ─────────────────────────────────────────
  // 🏆 REPUTATION + LEADERBOARD
  // ─────────────────────────────────────────
  NXUI.renderReputation = function (target) {
    target.innerHTML = `
      <div class="nxui-panel nx-enter">
        <header class="nxui-head">
          <div>
            <h2 class="nxui-title">Reputation</h2>
            <p class="nxui-sub">Your standing in the Nexus ecosystem</p>
          </div>
          <span class="nx-chip">Live</span>
        </header>
        <div id="nxui-rep-me"></div>
        <div style="margin-top:24px">
          <span class="nxui-label">Global leaderboard</span>
          <div id="nxui-rep-board" class="nxui-list"></div>
        </div>
      </div>
    `;

    (async () => {
      try {
        const me = await api('/api/community/reputation');
        target.querySelector('#nxui-rep-me').innerHTML = `
          <div class="nxui-card nx-active-glow" style="padding:20px">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:16px">
              <div>
                <div style="color:${me.rank?.color || '#fff'};font-size:20px;font-weight:600;margin-bottom:4px">${escapeHtml(me.rank?.name || 'Operator')}</div>
                <div style="color:#789;font-size:12px">${me.observations || 0} lifetime · ${me.workflows_shared || 0} workflows shared</div>
              </div>
              <div style="text-align:right">
                <div style="color:#fff;font-size:32px;font-weight:300">${me.points || 0}</div>
                <div style="color:#567;font-size:11px;letter-spacing:1px">POINTS</div>
              </div>
            </div>
          </div>
        `;

        const board = await api('/api/community/leaderboard?limit=10');
        const boardEl = target.querySelector('#nxui-rep-board');
        boardEl.innerHTML = (board.leaderboard || []).map((r, i) => `
          <div class="nxui-card" style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px">
            <div style="display:flex;gap:12px;align-items:center">
              <div style="color:${['#c6f135','#35f1c6','#5b8def'][i] || '#789'};font-size:14px;font-weight:600;width:24px">#${i+1}</div>
              <div style="color:#cde;font-size:13px">User ${r.user_id}</div>
            </div>
            <div style="display:flex;gap:12px;align-items:center">
              <span style="color:${r.rank?.color || '#789'};font-size:11px">${r.rank?.name || 'Operator'}</span>
              <span style="color:#fff;font-weight:600">${r.points}</span>
            </div>
          </div>
        `).join('') || `<div class="nxui-empty">No entries yet — be the first!</div>`;
      } catch (e) {
        target.querySelector('#nxui-rep-me').innerHTML = `<div class="nxui-empty">${escapeHtml(e.message)}</div>`;
      }
    })();
  };

  // ─────────────────────────────────────────
  // 🛒 MARKETPLACE
  // ─────────────────────────────────────────
  NXUI.renderMarketplace = function (target) {
    target.innerHTML = `
      <div class="nxui-panel nx-enter">
        <header class="nxui-head">
          <div>
            <h2 class="nxui-title">Workflow Marketplace</h2>
            <p class="nxui-sub">Discover, share, and install proven workflows</p>
          </div>
          <span class="nx-chip">Community</span>
        </header>
        <div class="nxui-tabs">
          <div class="nxui-tab active" data-mp-tab="browse">Browse</div>
          <div class="nxui-tab" data-mp-tab="publish">Publish</div>
        </div>
        <div id="nxui-mp-body"></div>
      </div>
    `;

    const body = target.querySelector('#nxui-mp-body');

    function showBrowse() {
      body.innerHTML = `
        <div class="nxui-row">
          <select class="nxui-select" id="nxui-mp-kind">
            <option value="">All types</option>
            <option value="workflow">Workflow</option>
            <option value="template">Template</option>
            <option value="agent">Agent</option>
            <option value="prompt-pack">Prompt pack</option>
          </select>
          <select class="nxui-select" id="nxui-mp-sort">
            <option value="popular">Most popular</option>
            <option value="newest">Newest</option>
            <option value="stars">Most starred</option>
          </select>
        </div>
        <div id="nxui-mp-list" class="nxui-grid" style="margin-top:16px"></div>
      `;
      const list = body.querySelector('#nxui-mp-list');
      async function load() {
        const kind = body.querySelector('#nxui-mp-kind').value;
        const sort = body.querySelector('#nxui-mp-sort').value;
        list.innerHTML = `<div class="nxui-empty"><span class="nx-thinking"><span></span><span></span><span></span><span></span><span></span></span> Loading marketplace...</div>`;
        try {
          const r = await api(`/api/community/marketplace?${kind ? `kind=${kind}&` : ''}sort=${sort}`);
          if (!r.items?.length) {
            list.innerHTML = `<div class="nxui-empty">No items yet</div>`;
            return;
          }
          list.innerHTML = r.items.map(item => `
            <div class="nxui-card cine-hologram" style="padding:20px">
              <div class="nxui-label" style="color:#35f1c6">${escapeHtml(item.kind)}</div>
              <h3 style="color:#fff;font-size:16px;margin:8px 0">${escapeHtml(item.title)}</h3>
              <p style="color:#789;font-size:12px;margin-bottom:12px;min-height:32px">${escapeHtml(item.description || '')}</p>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div style="color:#567;font-size:11px">⬇ ${item.installs} · ⭐ ${item.stars}</div>
                <button class="nxui-btn" data-install="${item.id}" style="padding:6px 14px;font-size:12px">Install</button>
              </div>
            </div>
          `).join('');
          list.querySelectorAll('[data-install]').forEach(btn => {
            btn.onclick = async () => {
              btn.textContent = '...';
              try {
                await api(`/api/community/marketplace/${btn.dataset.install}/install`, { method: 'POST' });
                btn.textContent = '✓ Installed';
                btn.style.background = 'rgba(53,241,198,.3)';
              } catch (e) { btn.textContent = 'Error'; }
            };
          });
        } catch (e) { list.innerHTML = `<div class="nxui-empty">${escapeHtml(e.message)}</div>`; }
      }
      body.querySelector('#nxui-mp-kind').onchange = load;
      body.querySelector('#nxui-mp-sort').onchange = load;
      load();
    }

    function showPublish() {
      body.innerHTML = `
        <select class="nxui-select" id="nxui-pb-kind">
          <option value="workflow">Workflow</option>
          <option value="template">Template</option>
          <option value="agent">Agent</option>
          <option value="prompt-pack">Prompt pack</option>
        </select>
        <input class="nxui-input" id="nxui-pb-title" placeholder="Title..."/>
        <textarea class="nxui-input nxui-textarea" id="nxui-pb-desc" placeholder="Short description..."></textarea>
        <textarea class="nxui-input nxui-textarea" id="nxui-pb-content" placeholder='JSON content: {"steps": [...]}' style="font-family:ui-monospace,monospace"></textarea>
        <button class="nxui-btn" id="nxui-pb-go">Publish · Earn 25 pts</button>
        <div id="nxui-pb-out"></div>
      `;
      body.querySelector('#nxui-pb-go').onclick = async () => {
        try {
          const content = JSON.parse(body.querySelector('#nxui-pb-content').value || '{}');
          const r = await api('/api/community/marketplace/publish', {
            method: 'POST',
            body: JSON.stringify({
              kind: body.querySelector('#nxui-pb-kind').value,
              title: body.querySelector('#nxui-pb-title').value,
              description: body.querySelector('#nxui-pb-desc').value,
              content,
            }),
          });
          body.querySelector('#nxui-pb-out').innerHTML = `<div class="nxui-result" style="border-color:rgba(53,241,198,.4);color:#35f1c6">✓ Published: <code>${escapeHtml(r.slug)}</code></div>`;
        } catch (e) {
          body.querySelector('#nxui-pb-out').innerHTML = `<div class="nxui-result" style="border-color:rgba(239,68,68,.3);color:#fca5a5">${escapeHtml(e.message)}</div>`;
        }
      };
    }

    target.querySelectorAll('[data-mp-tab]').forEach(t => {
      t.onclick = () => {
        target.querySelectorAll('[data-mp-tab]').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        (t.dataset.mpTab === 'browse' ? showBrowse : showPublish)();
      };
    });
    showBrowse();
  };

  // ─────────────────────────────────────────
  // 🌍 SEASONS
  // ─────────────────────────────────────────
  NXUI.renderSeasons = function (target) {
    target.innerHTML = `
      <div class="nxui-panel nx-enter">
        <header class="nxui-head">
          <div>
            <h2 class="nxui-title">Operational Seasons</h2>
            <p class="nxui-sub">Monthly themes · Compete · Level up</p>
          </div>
          <span class="nx-chip">This month</span>
        </header>
        <div id="nxui-ss-current"></div>
        <div style="margin-top:24px">
          <span class="nxui-label">All 12 seasons</span>
          <div id="nxui-ss-all" class="nxui-grid" style="margin-top:8px"></div>
        </div>
      </div>
    `;

    (async () => {
      try {
        const r = await api('/api/community/seasons');
        const current = r.current;
        target.querySelector('#nxui-ss-current').innerHTML = `
          <div class="nxui-card cine-hologram" style="padding:24px">
            <div class="nxui-label" style="color:#c6f135">${escapeHtml(current.name)}</div>
            <p style="color:#cde;font-size:14px;margin-top:8px">${escapeHtml(current.theme)}</p>
            <div style="margin-top:16px;display:flex;gap:8px">
              <button class="nxui-btn" id="nxui-ss-view">View submissions</button>
              <button class="nxui-btn-secondary" id="nxui-ss-submit">Submit entry</button>
            </div>
            <div id="nxui-ss-body"></div>
          </div>
        `;

        target.querySelector('#nxui-ss-all').innerHTML = (r.seasons || []).map(s => `
          <div class="nxui-card" style="padding:12px 16px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <div style="color:#fff;font-size:13px;font-weight:500">${escapeHtml(s.name)}</div>
                <div style="color:#567;font-size:11px;margin-top:2px">Month ${s.month}</div>
              </div>
              ${s.id === current.id ? '<span class="nx-chip" style="background:rgba(198,241,53,.15);color:#c6f135">LIVE</span>' : ''}
            </div>
          </div>
        `).join('');

        target.querySelector('#nxui-ss-view').onclick = async () => {
          const body = target.querySelector('#nxui-ss-body');
          body.innerHTML = `<div class="nxui-empty"><span class="nx-thinking"><span></span><span></span><span></span><span></span><span></span></span></div>`;
          try {
            const lb = await api(`/api/community/seasons/${current.id}/leaderboard`);
            body.innerHTML = `<div style="margin-top:16px" class="nxui-list">${(lb.leaderboard || []).map((s, i) => `
              <div class="nxui-card" style="padding:10px 14px;display:flex;justify-content:space-between">
                <div><strong style="color:#fff">#${i+1}</strong> ${escapeHtml(s.title)}</div>
                <div style="color:#35f1c6">${s.votes} votes</div>
              </div>
            `).join('') || '<div class="nxui-empty">No submissions yet</div>'}</div>`;
          } catch (e) { body.innerHTML = `<div class="nxui-empty">${escapeHtml(e.message)}</div>`; }
        };

        target.querySelector('#nxui-ss-submit').onclick = () => {
          const body = target.querySelector('#nxui-ss-body');
          body.innerHTML = `
            <div style="margin-top:16px">
              <input class="nxui-input" id="ss-title" placeholder="Entry title"/>
              <textarea class="nxui-input nxui-textarea" id="ss-desc" placeholder="Description"></textarea>
              <button class="nxui-btn" id="ss-go">Submit · Earn 50 pts</button>
              <div id="ss-out" style="margin-top:8px"></div>
            </div>
          `;
          body.querySelector('#ss-go').onclick = async () => {
            try {
              await api(`/api/community/seasons/${current.id}/submit`, {
                method: 'POST',
                body: JSON.stringify({
                  title: body.querySelector('#ss-title').value,
                  description: body.querySelector('#ss-desc').value,
                  content: { submitted: true },
                }),
              });
              body.querySelector('#ss-out').innerHTML = `<div class="nxui-result" style="border-color:rgba(53,241,198,.4);color:#35f1c6">✓ Submitted!</div>`;
            } catch (e) { body.querySelector('#ss-out').innerHTML = `<div class="nxui-result" style="border-color:rgba(239,68,68,.3);color:#fca5a5">${escapeHtml(e.message)}</div>`; }
          };
        };
      } catch (e) {
        target.querySelector('#nxui-ss-current').innerHTML = `<div class="nxui-empty">${escapeHtml(e.message)}</div>`;
      }
    })();
  };

  // ─────────────────────────────────────────
  // 📊 PMF DASHBOARD (admin)
  // ─────────────────────────────────────────
  NXUI.renderPMF = function (target) {
    target.innerHTML = `
      <div class="nxui-panel nx-enter">
        <header class="nxui-head">
          <div>
            <h2 class="nxui-title">PMF Analytics</h2>
            <p class="nxui-sub">Retention · Adoption · Friction · Funnel</p>
          </div>
          <span class="nx-chip">Admin</span>
        </header>
        <div id="nxui-pmf-body"></div>
      </div>
    `;

    (async () => {
      const body = target.querySelector('#nxui-pmf-body');
      try {
        const [retention, features, friction, funnel] = await Promise.all([
          api('/api/pmf/retention?days=30').catch(() => ({})),
          api('/api/pmf/features?days=30').catch(() => ({ features: [] })),
          api('/api/pmf/friction?days=7').catch(() => ({ friction: [] })),
          api('/api/pmf/funnel').catch(() => ({ steps: [] })),
        ]);

        body.innerHTML = `
          <div class="nxui-grid">
            <div class="nxui-card"><div class="nxui-label">Signups (30d)</div><div style="color:#fff;font-size:24px;font-weight:300;margin-top:4px">${retention.signups || 0}</div></div>
            <div class="nxui-card"><div class="nxui-label">Activation</div><div style="color:#c6f135;font-size:24px;font-weight:300;margin-top:4px">${((retention.activation_rate || 0) * 100).toFixed(1)}%</div></div>
            <div class="nxui-card"><div class="nxui-label">DAU</div><div style="color:#35f1c6;font-size:24px;font-weight:300;margin-top:4px">${retention.dau || 0}</div></div>
            <div class="nxui-card"><div class="nxui-label">Stickiness</div><div style="color:#5b8def;font-size:24px;font-weight:300;margin-top:4px">${((retention.stickiness || 0) * 100).toFixed(1)}%</div></div>
          </div>

          <div style="margin-top:24px">
            <span class="nxui-label">Activation funnel</span>
            <div class="cine-timeline" style="margin-top:12px">
              ${(funnel.steps || []).map(s => `<div class="cine-timeline-item"><strong style="color:#fff">${escapeHtml(s.name)}</strong><div style="color:#89a;font-size:12px">${s.users} users</div></div>`).join('')}
            </div>
          </div>

          <div style="margin-top:24px">
            <span class="nxui-label">Top features (30d)</span>
            <div class="nxui-list" style="margin-top:12px">
              ${(features.features || []).slice(0, 10).map(f => `
                <div class="nxui-card" style="padding:10px 14px;display:flex;justify-content:space-between">
                  <div style="color:#cde">${escapeHtml(f.feature)}</div>
                  <div style="color:#789;font-size:12px">${f.uses} uses · ${f.unique_users} users · ${(f.success_rate * 100).toFixed(0)}% ok</div>
                </div>
              `).join('') || '<div class="nxui-empty">No data yet</div>'}
            </div>
          </div>

          <div style="margin-top:24px">
            <span class="nxui-label">Friction points (7d)</span>
            <div class="nxui-list" style="margin-top:12px">
              ${(friction.friction || []).map(f => `
                <div class="nxui-card" style="padding:10px 14px;display:flex;justify-content:space-between;border-color:rgba(239,68,68,.2)">
                  <div style="color:#fca5a5">${escapeHtml(f.feature)} · ${escapeHtml(f.action || '')}</div>
                  <div style="color:#ef4444;font-size:12px">${f.failures} failures</div>
                </div>
              `).join('') || '<div class="nxui-empty">✓ No friction detected</div>'}
            </div>
          </div>
        `;
      } catch (e) {
        body.innerHTML = `<div class="nxui-empty">${escapeHtml(e.message)}</div>`;
      }
    })();
  };

  // ─────────────────────────────────────────
  // 🧠 AI TWIN
  // ─────────────────────────────────────────
  NXUI.renderTwin = function (target) {
    target.innerHTML = `
      <div class="nxui-panel nx-enter">
        <header class="nxui-head">
          <div>
            <h2 class="nxui-title">AI Operational Twin</h2>
            <p class="nxui-sub">Your AI mirror — learning your patterns</p>
          </div>
          <span class="nx-chip">Learning</span>
        </header>
        <div id="nxui-twin-body"></div>
      </div>
    `;

    (async () => {
      try {
        const id = await api('/api/twin/identity');
        const body = target.querySelector('#nxui-twin-body');
        if (!id.formed) {
          body.innerHTML = `<div class="cine-hologram" style="padding:24px;text-align:center;color:#cde"><div style="font-size:32px;margin-bottom:12px">🧠</div><p style="font-size:14px">${escapeHtml(id.message || 'Your twin is still learning your patterns')}</p><p style="color:#789;font-size:12px;margin-top:8px">Use the app more — the twin observes silently.</p></div>`;
          return;
        }
        body.innerHTML = `
          <div class="nxui-grid">
            <div class="nxui-card"><div class="nxui-label">Observations</div><div style="color:#fff;font-size:24px;font-weight:300">${id.total_observations}</div></div>
            <div class="nxui-card"><div class="nxui-label">Confidence</div><div style="color:#c6f135;font-size:24px;font-weight:300">${(id.avg_confidence * 100).toFixed(0)}%</div></div>
            <div class="nxui-card"><div class="nxui-label">Active time</div><div style="color:#35f1c6;font-size:16px;font-weight:500;text-transform:capitalize;padding-top:6px">${escapeHtml(id.active_time)}</div></div>
          </div>
          <div style="margin-top:24px">
            <span class="nxui-label">Your typical actions</span>
            <div class="nxui-list" style="margin-top:12px">
              ${(id.top_actions || []).map(a => `
                <div class="nxui-card" style="padding:10px 14px;display:flex;justify-content:space-between">
                  <div style="color:#cde">${escapeHtml(a.action)}</div>
                  <div style="color:#35f1c6;font-size:12px">${a.count} times</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      } catch (e) {
        target.querySelector('#nxui-twin-body').innerHTML = `<div class="nxui-empty">${escapeHtml(e.message)}</div>`;
      }
    })();
  };

  // ─────────────────────────────────────────
  // 🕸️ MEMORY FABRIC
  // ─────────────────────────────────────────
  NXUI.renderFabric = function (target) {
    target.innerHTML = `
      <div class="nxui-panel nx-enter">
        <header class="nxui-head">
          <div>
            <h2 class="nxui-title">Memory Fabric</h2>
            <p class="nxui-sub">Interconnected memory graph — recall by context</p>
          </div>
          <span class="nx-chip">Graph</span>
        </header>
        <div class="nxui-row">
          <input class="nxui-input" id="nxui-fab-q" placeholder="Recall memories..." style="flex:1"/>
          <button class="nxui-btn" id="nxui-fab-recall">Recall</button>
        </div>
        <div id="nxui-fab-stats" style="margin-top:16px"></div>
        <div id="nxui-fab-results" style="margin-top:16px"></div>
      </div>
    `;

    (async () => {
      try {
        const stats = await api('/api/fabric/stats');
        target.querySelector('#nxui-fab-stats').innerHTML = `
          <div class="nxui-grid">
            <div class="nxui-card"><div class="nxui-label">Memory nodes</div><div style="color:#fff;font-size:24px;font-weight:300">${stats.nodes}</div></div>
            <div class="nxui-card"><div class="nxui-label">Connections</div><div style="color:#35f1c6;font-size:24px;font-weight:300">${stats.edges}</div></div>
            <div class="nxui-card"><div class="nxui-label">Density</div><div style="color:#c6f135;font-size:24px;font-weight:300">${stats.density.toFixed(2)}</div></div>
          </div>
        `;
      } catch (_) {}
    })();

    target.querySelector('#nxui-fab-recall').onclick = async () => {
      const q = target.querySelector('#nxui-fab-q').value;
      const out = target.querySelector('#nxui-fab-results');
      out.innerHTML = `<div class="nxui-empty"><span class="nx-thinking"><span></span><span></span><span></span><span></span><span></span></span></div>`;
      try {
        const r = await api(`/api/fabric/recall?query=${encodeURIComponent(q)}`);
        if (!r.memories?.length) { out.innerHTML = `<div class="nxui-empty">No memories match</div>`; return; }
        out.innerHTML = `<div class="nxui-list">${r.memories.map(m => `
          <div class="nxui-card cine-hologram" style="padding:14px">
            <div class="nxui-label">${escapeHtml(m.node_type)} · relevance: ${((m.relevance || 0) * 100).toFixed(0)}%</div>
            <div style="color:#cde;font-size:13px;margin-top:6px">${escapeHtml(m.content).slice(0, 200)}</div>
          </div>
        `).join('')}</div>`;
      } catch (e) { out.innerHTML = `<div class="nxui-empty">${escapeHtml(e.message)}</div>`; }
    };
  };

  // ─────────────────────────────────────────
  // ⏰ TEMPORAL UX
  // ─────────────────────────────────────────
  NXUI.renderTemporal = function (target) {
    target.innerHTML = `
      <div class="nxui-panel nx-enter">
        <header class="nxui-head">
          <div>
            <h2 class="nxui-title">Temporal UX</h2>
            <p class="nxui-sub">Time-adaptive workspace based on your rhythm</p>
          </div>
          <span class="nx-chip">Adaptive</span>
        </header>
        <div id="nxui-temporal-body"></div>
      </div>
    `;

    (async () => {
      try {
        const t = await api('/api/temporal/config');
        target.querySelector('#nxui-temporal-body').innerHTML = `
          <div class="nxui-card cine-hologram" style="padding:24px">
            <div class="nxui-label">Right now</div>
            <div style="color:#fff;font-size:22px;text-transform:capitalize;margin:8px 0">${escapeHtml(t.block?.replace(/_/g, ' '))}</div>
            <div style="color:#789;font-size:13px">Energy: ${escapeHtml(t.energy)} · Tone: ${escapeHtml(t.tone)}</div>
          </div>
          <div style="margin-top:16px">
            <span class="nxui-label">Recommendations</span>
            <div class="nxui-list" style="margin-top:8px">
              ${(t.config?.suggestions || []).map(s => `<div class="nxui-card" style="padding:12px 14px"><div style="color:#cde;font-size:13px">${escapeHtml(s)}</div></div>`).join('')}
            </div>
          </div>
          <div style="margin-top:16px" class="nxui-card">
            <div class="nxui-label">Suggested mode</div>
            <div style="color:#fff;text-transform:capitalize;font-size:16px;margin-top:6px">${escapeHtml(t.config?.mode)}</div>
            <button class="nxui-btn" id="nxui-temp-apply" style="margin-top:12px">Apply now</button>
          </div>
        `;
        target.querySelector('#nxui-temp-apply').onclick = () => {
          window.NX?.setMode?.(t.config?.mode || 'calm');
        };
      } catch (e) {
        target.querySelector('#nxui-temporal-body').innerHTML = `<div class="nxui-empty">${escapeHtml(e.message)}</div>`;
      }
    })();
  };

  // ─────────────────────────────────────────
  // Extend renderAll with the new panels
  // ─────────────────────────────────────────
  const originalRenderAll = NXUI.renderAll;
  NXUI.renderAllExtended = function (container) {
    if (!container) return;
    container.innerHTML = `
      <div class="nxui-tabs" id="nxui-main-tabs" style="overflow-x:auto">
        <div class="nxui-tab active" data-panel="knowledge">🔍 Knowledge</div>
        <div class="nxui-tab" data-panel="media">🎨 Media</div>
        <div class="nxui-tab" data-panel="code">💻 Code</div>
        <div class="nxui-tab" data-panel="business">📊 Business</div>
        <div class="nxui-tab" data-panel="workspaces">👥 Teams</div>
        <div class="nxui-tab" data-panel="voice">🎤 Voice</div>
        <div class="nxui-tab" data-panel="reputation">🏆 Reputation</div>
        <div class="nxui-tab" data-panel="marketplace">🛒 Market</div>
        <div class="nxui-tab" data-panel="seasons">🌍 Seasons</div>
        <div class="nxui-tab" data-panel="twin">🧠 Twin</div>
        <div class="nxui-tab" data-panel="fabric">🕸️ Fabric</div>
        <div class="nxui-tab" data-panel="temporal">⏰ Temporal</div>
        <div class="nxui-tab" data-panel="pmf">📊 PMF</div>
      </div>
      <div id="nxui-panel-target"></div>
    `;
    const target = container.querySelector('#nxui-panel-target');
    const renderers = {
      knowledge: NXUI.renderKnowledge,
      media: NXUI.renderMedia,
      code: NXUI.renderCode,
      business: NXUI.renderBusiness,
      workspaces: NXUI.renderWorkspaces,
      voice: NXUI.renderVoice,
      reputation: NXUI.renderReputation,
      marketplace: NXUI.renderMarketplace,
      seasons: NXUI.renderSeasons,
      twin: NXUI.renderTwin,
      fabric: NXUI.renderFabric,
      temporal: NXUI.renderTemporal,
      pmf: NXUI.renderPMF,
    };
    container.querySelectorAll('#nxui-main-tabs .nxui-tab').forEach(t => {
      t.onclick = () => {
        container.querySelectorAll('#nxui-main-tabs .nxui-tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        renderers[t.dataset.panel]?.(target);
      };
    });
    renderers.knowledge(target);
  };
})();

// ============================================================
// 🎓 ONBOARDING TOUR — Feature 3
// Post-goal guided tour showing key features + notifications bell
// ============================================================
(function(){
  'use strict';

  const TOUR_STEPS = {
    startup: [
      { title: 'Your operations hub', body: 'This is where every AI action, workflow, and team activity comes together.', target: 'body', position: 'center' },
      { title: 'Ask AI anything', body: 'Type here to get started. Every question shapes your operational twin over time.', target: '#ai-input, .chat-input, textarea', position: 'top' },
      { title: 'Track your growth', body: 'The Business panel records metrics and surfaces growth insights automatically.', target: 'body', position: 'center' },
      { title: 'Ready to build?', body: 'Your workspace adapts as you use it. Explore, experiment, and let NexusAI learn your way.', target: 'body', position: 'center' },
    ],
    code: [
      { title: 'Your coding companion', body: 'Paste any code — NexusAI analyzes, reviews, and debugs with repo-level context.', target: 'body', position: 'center' },
      { title: 'Repository intelligence', body: 'Open the Code panel to run deep analysis on your projects.', target: 'body', position: 'center' },
      { title: 'Ready to code?', body: 'Get started by asking a coding question or pasting code below.', target: 'body', position: 'center' },
    ],
    create: [
      { title: 'Creative studio', body: 'Generate images, videos, and audio — all from natural language prompts.', target: 'body', position: 'center' },
      { title: 'Media pipeline', body: 'Open the Media panel to access image, video, 3D, and audio generation.', target: 'body', position: 'center' },
      { title: 'Ready to create?', body: 'Start describing what you want to make.', target: 'body', position: 'center' },
    ],
    study: [
      { title: 'Research grounded in facts', body: 'Every AI answer includes citations you can verify. No hallucinations.', target: 'body', position: 'center' },
      { title: 'Knowledge Hub', body: 'The Knowledge panel searches the web and synthesizes findings for you.', target: 'body', position: 'center' },
      { title: 'Ready to learn?', body: 'Ask any research question below.', target: 'body', position: 'center' },
    ],
    analyze: [
      { title: 'Strategic AI', body: 'NexusAI turns your business data into growth insights and recommendations.', target: 'body', position: 'center' },
      { title: 'Business dashboard', body: 'The Business panel tracks metrics and delivers weekly analysis.', target: 'body', position: 'center' },
      { title: 'Ready to analyze?', body: 'Ask a strategic question or record your first metric.', target: 'body', position: 'center' },
    ],
    team: [
      { title: 'Collaborative workspaces', body: 'Create workspaces to share AI conversations, workflows, and results with your team.', target: 'body', position: 'center' },
      { title: 'Real-time collaboration', body: 'Team members see each other\'s presence, and AI responses stream live to everyone.', target: 'body', position: 'center' },
      { title: 'Ready to collaborate?', body: 'Create your first workspace to get started.', target: 'body', position: 'center' },
    ],
  };

  function injectStyles() {
    if (document.getElementById('nx-tour-styles')) return;
    const s = document.createElement('style');
    s.id = 'nx-tour-styles';
    s.textContent = `
      .nx-tour-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);backdrop-filter:blur(6px);z-index:9997;animation:nxTourFade .4s ease-out}
      .nx-tour-card{position:fixed;max-width:420px;width:calc(100% - 32px);padding:24px;background:linear-gradient(135deg,rgba(20,30,50,.98),rgba(10,20,40,.98));border:1px solid rgba(120,200,255,.2);border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.6),0 0 40px rgba(120,200,255,.1);z-index:9998;animation:nxTourRise .5s cubic-bezier(.16,1,.3,1)}
      .nx-tour-step-num{color:#35f1c6;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px}
      .nx-tour-title{color:#fff;font-size:20px;font-weight:500;letter-spacing:-.3px;margin-bottom:8px}
      .nx-tour-body{color:#cde;font-size:14px;line-height:1.6;margin-bottom:20px}
      .nx-tour-actions{display:flex;justify-content:space-between;align-items:center;gap:12px}
      .nx-tour-dots{display:flex;gap:6px}
      .nx-tour-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.15);transition:all .3s}
      .nx-tour-dot.active{background:linear-gradient(135deg,#c6f135,#35f1c6);width:20px;border-radius:100px}
      .nx-tour-btn{padding:10px 18px;border:none;border-radius:10px;font-size:13px;font-weight:500;cursor:pointer;transition:transform .15s;letter-spacing:.3px}
      .nx-tour-btn-primary{background:linear-gradient(135deg,#c6f135,#35f1c6);color:#000}
      .nx-tour-btn-primary:hover{transform:translateY(-1px) scale(1.02)}
      .nx-tour-btn-skip{background:none;color:#789;padding:10px 12px}
      .nx-tour-btn-skip:hover{color:#cde}
      .nx-tour-highlight{position:relative;z-index:9997;box-shadow:0 0 0 4px rgba(53,241,198,.4),0 0 40px rgba(53,241,198,.5);border-radius:12px;animation:nxTourPulse 2s ease-in-out infinite}
      @keyframes nxTourFade{from{opacity:0}to{opacity:1}}
      @keyframes nxTourRise{from{opacity:0;transform:translateY(20px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
      @keyframes nxTourPulse{0%,100%{box-shadow:0 0 0 4px rgba(53,241,198,.4),0 0 40px rgba(53,241,198,.5)}50%{box-shadow:0 0 0 8px rgba(53,241,198,.2),0 0 60px rgba(53,241,198,.7)}}
    `;
    document.head.appendChild(s);
  }

  function positionCard(card, target, position) {
    if (position === 'center' || target === 'body' || !target) {
      card.style.left = '50%';
      card.style.top = '50%';
      card.style.transform = 'translate(-50%, -50%)';
      return;
    }
    const el = document.querySelector(target);
    if (!el) {
      card.style.left = '50%';
      card.style.top = '50%';
      card.style.transform = 'translate(-50%, -50%)';
      return;
    }
    const rect = el.getBoundingClientRect();
    const cardW = 420;
    const cardH = card.offsetHeight || 200;

    if (position === 'top') {
      card.style.left = Math.max(16, Math.min(window.innerWidth - cardW - 16, rect.left + rect.width/2 - cardW/2)) + 'px';
      card.style.top = Math.max(16, rect.top - cardH - 16) + 'px';
    } else if (position === 'bottom') {
      card.style.left = Math.max(16, Math.min(window.innerWidth - cardW - 16, rect.left + rect.width/2 - cardW/2)) + 'px';
      card.style.top = (rect.bottom + 16) + 'px';
    } else {
      card.style.left = '50%';
      card.style.top = '50%';
      card.style.transform = 'translate(-50%, -50%)';
    }

    // Highlight the target
    document.querySelectorAll('.nx-tour-highlight').forEach(el => el.classList.remove('nx-tour-highlight'));
    el.classList.add('nx-tour-highlight');
  }

  function startTour(goal) {
    const steps = TOUR_STEPS[goal] || TOUR_STEPS.startup;
    if (!steps.length) return;

    injectStyles();

    const overlay = document.createElement('div');
    overlay.className = 'nx-tour-overlay';
    document.body.appendChild(overlay);

    const card = document.createElement('div');
    card.className = 'nx-tour-card';
    document.body.appendChild(card);

    let currentStep = 0;

    function render() {
      const step = steps[currentStep];
      const dots = steps.map((_, i) => `<div class="nx-tour-dot${i === currentStep ? ' active' : ''}"></div>`).join('');
      card.innerHTML = `
        <div class="nx-tour-step-num">Step ${currentStep + 1} of ${steps.length}</div>
        <div class="nx-tour-title">${step.title}</div>
        <div class="nx-tour-body">${step.body}</div>
        <div class="nx-tour-actions">
          <button class="nx-tour-btn nx-tour-btn-skip">Skip tour</button>
          <div class="nx-tour-dots">${dots}</div>
          <button class="nx-tour-btn nx-tour-btn-primary">${currentStep < steps.length - 1 ? 'Next →' : 'Get started ✓'}</button>
        </div>
      `;
      positionCard(card, step.target, step.position);

      card.querySelector('.nx-tour-btn-skip').onclick = end;
      card.querySelector('.nx-tour-btn-primary').onclick = () => {
        if (currentStep < steps.length - 1) {
          currentStep++;
          render();
        } else {
          end();
        }
      };
    }

    function end() {
      document.querySelectorAll('.nx-tour-highlight').forEach(el => el.classList.remove('nx-tour-highlight'));
      overlay.style.animation = 'nxTourFade .3s reverse';
      card.style.animation = 'nxTourRise .3s reverse';
      setTimeout(() => {
        overlay.remove();
        card.remove();
      }, 300);
      try { localStorage.setItem('nx_tour_completed', '1'); } catch(_) {}
    }

    render();
  }

  // Hook into onboarding completion event
  window.addEventListener('nx:onboarded', (e) => {
    const goal = e.detail?.goal;
    if (!goal) return;
    if (localStorage.getItem('nx_tour_completed') === '1') return;
    // Small delay after portal transition
    setTimeout(() => startTour(goal), 1200);
  });

  // Manual trigger for settings
  window.NX = window.NX || {};
  window.NX.startTour = (goal) => startTour(goal || localStorage.getItem('nx_user_goal') || 'startup');
})();

// ============================================================
// 🔔 NOTIFICATION BELL — Feature 2 UI
// ============================================================
(function(){
  'use strict';

  async function api(path, opts = {}) {
    const token = (window.getAuthToken ? window.getAuthToken() : '') || localStorage.getItem('nx_t') || '';
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(path, { ...opts, headers });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  function timeAgo(ts) {
    const d = Date.now() - ts;
    if (d < 60000) return 'just now';
    if (d < 3600000) return Math.floor(d / 60000) + 'm ago';
    if (d < 86400000) return Math.floor(d / 3600000) + 'h ago';
    return Math.floor(d / 86400000) + 'd ago';
  }

  function injectStyles() {
    if (document.getElementById('nx-bell-styles')) return;
    const s = document.createElement('style');
    s.id = 'nx-bell-styles';
    s.textContent = `
      .nx-bell{position:fixed;top:16px;right:80px;z-index:501;width:36px;height:36px;
        background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.08);border-radius:50%;
        backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;
        cursor:pointer;font-size:16px}
      .nx-bell-badge{position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;
        padding:0 4px;background:#ef4444;color:#fff;border-radius:100px;font-size:10px;
        font-weight:600;display:flex;align-items:center;justify-content:center;
        box-shadow:0 0 8px rgba(239,68,68,.6)}
      .nx-bell-badge.hidden{display:none}
      .nx-notif-panel{position:fixed;top:60px;right:16px;width:360px;
        max-width:calc(100vw - 32px);max-height:70vh;
        background:linear-gradient(135deg,rgba(20,30,50,.98),rgba(10,20,40,.98));
        border:1px solid rgba(120,200,255,.2);border-radius:14px;
        box-shadow:0 20px 60px rgba(0,0,0,.6);z-index:502;display:none;
        flex-direction:column;overflow:hidden;backdrop-filter:blur(20px)}
      .nx-notif-panel.open{display:flex}
      .nx-notif-header{padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.06);
        display:flex;justify-content:space-between;align-items:center}
      .nx-notif-title{color:#fff;font-weight:500;font-size:14px;letter-spacing:.3px}
      .nx-notif-mark{color:#35f1c6;font-size:11px;cursor:pointer;
        text-transform:uppercase;letter-spacing:1px}
      .nx-notif-mark:hover{color:#c6f135}
      .nx-notif-list{overflow-y:auto;flex:1;max-height:60vh}
      .nx-notif-item{padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.04);
        cursor:pointer;transition:background .2s}
      .nx-notif-item:hover{background:rgba(120,200,255,.04)}
      .nx-notif-item.unread{background:rgba(120,200,255,.05);border-left:2px solid #35f1c6}
      .nx-notif-item-title{color:#fff;font-size:13px;font-weight:500;margin-bottom:4px}
      .nx-notif-item-msg{color:#89a;font-size:12px;line-height:1.4}
      .nx-notif-item-time{color:#567;font-size:10px;letter-spacing:.5px;margin-top:6px}
      .nx-notif-empty{padding:40px 20px;text-align:center;color:#567;font-size:13px}
    `;
    document.head.appendChild(s);
  }

  function mount() {
    injectStyles();
    if (document.querySelector('.nx-bell')) return;

    const bell = document.createElement('div');
    bell.className = 'nx-bell';
    bell.title = 'Notifications';
    bell.innerHTML = `🔔<span class="nx-bell-badge hidden">0</span>`;
    document.body.appendChild(bell);

    const panel = document.createElement('div');
    panel.className = 'nx-notif-panel';
    panel.innerHTML = `
      <div class="nx-notif-header">
        <div class="nx-notif-title">Notifications</div>
        <div class="nx-notif-mark">Mark all read</div>
      </div>
      <div class="nx-notif-list"></div>`;
    document.body.appendChild(panel);

    const badge = bell.querySelector('.nx-bell-badge');
    const list = panel.querySelector('.nx-notif-list');

    function renderList(items) {
      if (!items.length) {
        list.innerHTML = `<div class="nx-notif-empty">No notifications yet</div>`;
        return;
      }
      list.innerHTML = items.map(n => `
        <div class="nx-notif-item ${n.read ? '' : 'unread'}"
             data-id="${n.id}" data-link="${esc(n.link || '')}">
          <div class="nx-notif-item-title">${esc(n.title)}</div>
          ${n.message ? `<div class="nx-notif-item-msg">${esc(n.message)}</div>` : ''}
          <div class="nx-notif-item-time">${timeAgo(n.created_at)}</div>
        </div>`).join('');

      list.querySelectorAll('.nx-notif-item').forEach(item => {
        item.onclick = async () => {
          const id = Number(item.dataset.id);
          const link = item.dataset.link;
          if (item.classList.contains('unread')) {
            try { await api(`/api/notifications/${id}/read`, { method: 'POST' }); } catch (_) {}
            item.classList.remove('unread');
          }
          if (link) window.location.href = link;
          refresh();
        };
      });
    }

    async function refresh() {
      try {
        const r = await api('/api/notifications?limit=20');
        const count = r.count?.unread || 0;
        if (count > 0) {
          badge.textContent = count > 99 ? '99+' : count;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
        if (panel.classList.contains('open')) renderList(r.notifications || []);
      } catch (_) {
        // The bell must never break the page when the API is unreachable.
      }
    }

    bell.onclick = async () => {
      const isOpen = panel.classList.toggle('open');
      if (!isOpen) return;
      try {
        const r = await api('/api/notifications?limit=20');
        renderList(r.notifications || []);
      } catch (e) {
        list.innerHTML = `<div class="nx-notif-empty">${esc(e.message)}</div>`;
      }
    };

    document.addEventListener('click', (e) => {
      if (!panel.contains(e.target) && !bell.contains(e.target)) {
        panel.classList.remove('open');
      }
    });

    panel.querySelector('.nx-notif-mark').onclick = async (e) => {
      e.stopPropagation();
      try { await api('/api/notifications/all/read', { method: 'POST' }); refresh(); } catch (_) {}
    };

    refresh();
    setInterval(refresh, 60000);
    window.addEventListener('nx:notification', refresh);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(mount, 1500), { once: true });
  } else {
    setTimeout(mount, 1500);
  }
})();

// ============================================================
// 🖱️ REAL-TIME COLLABORATION UI — Feature 5
// Live cursors · Presence avatars · Shared AI · Typing indicators
// ============================================================
(function(){
  'use strict';

  const NXRT = window.NXRT = window.NXRT || {};

  function injectStyles() {
    if (document.getElementById('nx-rt-styles')) return;
    const s = document.createElement('style');
    s.id = 'nx-rt-styles';
    s.textContent = `
      .nx-cursor{position:fixed;width:20px;height:20px;pointer-events:none;z-index:9000;transition:transform .08s linear;transform-origin:top left}
      .nx-cursor svg{display:block}
      .nx-cursor-label{position:absolute;top:20px;left:12px;padding:3px 8px;background:var(--cursor-color,#35f1c6);color:#000;font-size:10px;font-weight:600;border-radius:0 8px 8px 8px;white-space:nowrap;letter-spacing:.5px;box-shadow:0 4px 8px rgba(0,0,0,.3)}
      .nx-presence-bar{position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:498;display:flex;gap:-8px;padding:6px 10px;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.08);border-radius:100px;backdrop-filter:blur(20px);align-items:center}
      .nx-presence-bar.hidden{display:none}
      .nx-presence-avatar{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--av-1,#c6f135),var(--av-2,#35f1c6));display:flex;align-items:center;justify-content:center;color:#000;font-weight:700;font-size:12px;border:2px solid rgba(20,30,50,.98);margin-left:-8px;position:relative;cursor:default}
      .nx-presence-avatar:first-child{margin-left:0}
      .nx-presence-avatar[data-typing="1"]::after{content:"";position:absolute;bottom:-2px;right:-2px;width:8px;height:8px;background:#c6f135;border-radius:50%;border:2px solid rgba(20,30,50,.98);animation:nxRtPulse 1.4s ease-in-out infinite}
      .nx-presence-count{color:#89a;font-size:11px;letter-spacing:1px;margin-left:8px;padding-left:8px;border-left:1px solid rgba(255,255,255,.08);text-transform:uppercase}
      .nx-shared-ai{position:fixed;bottom:24px;right:24px;padding:14px 18px;background:linear-gradient(135deg,rgba(53,241,198,.15),rgba(198,241,53,.1));border:1px solid rgba(53,241,198,.4);border-radius:14px;color:#cde;font-size:13px;z-index:499;max-width:320px;box-shadow:0 8px 30px rgba(0,0,0,.4);animation:nxRtRise .4s cubic-bezier(.16,1,.3,1)}
      .nx-shared-ai-title{color:#35f1c6;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px}
      .nx-shared-ai-who{color:#fff;font-weight:600;margin-bottom:4px}
      .nx-shared-ai-preview{color:#89a;font-size:12px;line-height:1.4;max-height:60px;overflow:hidden}
      @keyframes nxRtPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.4);opacity:.5}}
      @keyframes nxRtRise{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    `;
    document.head.appendChild(s);
  }

  function colorForUser(id) {
    const colors = ['#c6f135','#35f1c6','#5b8def','#c87bef','#f59e0b','#ef4444','#8b5cf6','#ec4899'];
    return colors[Math.abs(String(id).split('').reduce((a,c) => a + c.charCodeAt(0), 0)) % colors.length];
  }

  function initials(name) {
    return String(name || 'U').trim().slice(0, 2).toUpperCase();
  }

  class RealtimeClient {
    constructor(options = {}) {
      this.ws = null;
      this.workspaceId = null;
      this.user = null;
      this.cursors = new Map();
      this.presence = [];
      this.presenceBar = null;
      this.reconnectDelay = 1000;
      this.reconnectTimer = null;
      this.throttleTimer = null;
      this.lastCursor = null;
      this.onMessage = options.onMessage || (() => {});
      this.wsUrl = options.wsUrl || (location.origin.replace(/^http/, 'ws') + '/ws');
    }

    connect(user) {
      this.user = user;
      try {
        this.ws = new WebSocket(this.wsUrl);
        this.ws.onopen = () => this._onOpen();
        this.ws.onmessage = (e) => this._onMessage(e);
        this.ws.onclose = () => this._onClose();
        this.ws.onerror = () => {};
      } catch (e) {
        console.warn('WebSocket unavailable', e);
      }
    }

    _onOpen() {
      this.reconnectDelay = 1000;
      this._send({ type: 'auth', user_id: this.user.id, email: this.user.email, name: this.user.name });
    }

    _onMessage(e) {
      let msg;
      try { msg = JSON.parse(e.data); } catch (_) { return; }
      switch (msg.type) {
        case 'auth.ok':
          if (this.workspaceId) this._joinWorkspace();
          break;
        case 'join.ok':
          this.presence = msg.presence || [];
          this._renderPresence();
          break;
        case 'presence.join':
          this.presence.push(msg.user);
          this._renderPresence();
          break;
        case 'presence.leave':
          this.presence = this.presence.filter(u => u.id !== msg.user_id);
          this._renderPresence();
          this._removeCursor(msg.user_id);
          break;
        case 'cursor':
          this._renderCursor(msg);
          break;
        case 'typing':
          this._renderTyping(msg);
          break;
        case 'ai.thinking':
          this._renderSharedAI(msg, 'thinking');
          break;
        case 'ai.result':
          this._renderSharedAI(msg, 'result');
          break;
      }
      this.onMessage(msg);
      window.dispatchEvent(new CustomEvent('nx:rt-message', { detail: msg }));
    }

    _onClose() {
      if (this.reconnectTimer) return;
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
        if (this.user) this.connect(this.user);
      }, this.reconnectDelay);
    }

    _send(payload) {
      if (this.ws?.readyState === 1) {
        try { this.ws.send(JSON.stringify(payload)); } catch (_) {}
      }
    }

    joinWorkspace(workspaceId) {
      this.workspaceId = workspaceId;
      this._joinWorkspace();
      this._trackCursor();
    }

    _joinWorkspace() {
      if (this.workspaceId && this.ws?.readyState === 1) {
        this._send({ type: 'join', workspace_id: this.workspaceId });
      }
    }

    leave() {
      if (this.workspaceId) {
        this._send({ type: 'leave' });
        this.workspaceId = null;
      }
      document.querySelectorAll('.nx-cursor').forEach(el => el.remove());
      this.cursors.clear();
      if (this.presenceBar) { this.presenceBar.remove(); this.presenceBar = null; }
    }

    _trackCursor() {
      document.addEventListener('mousemove', (e) => {
        if (!this.workspaceId) return;
        const now = Date.now();
        if (this.throttleTimer && now - this.throttleTimer < 60) return;
        this.throttleTimer = now;
        this.lastCursor = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
        this._send({ type: 'cursor', ...this.lastCursor, user: this.user });
      });
    }

    _renderPresence() {
      injectStyles();
      if (!this.presenceBar) {
        this.presenceBar = document.createElement('div');
        this.presenceBar.className = 'nx-presence-bar';
        document.body.appendChild(this.presenceBar);
      }
      const others = this.presence.filter(u => u.id !== this.user?.id);
      if (!others.length) {
        this.presenceBar.classList.add('hidden');
        return;
      }
      this.presenceBar.classList.remove('hidden');
      const shown = others.slice(0, 5);
      this.presenceBar.innerHTML = shown.map(u => `
        <div class="nx-presence-avatar" style="--av-1:${colorForUser(u.id)};--av-2:${colorForUser(u.id + 1)}" title="${u.name || u.email}">${initials(u.name || u.email)}</div>
      `).join('') + (others.length > 5 ? `<div class="nx-presence-count">+${others.length - 5} more</div>` : `<div class="nx-presence-count">${others.length} online</div>`);
    }

    _renderCursor(msg) {
      if (!msg.user || msg.user.id === this.user?.id) return;
      injectStyles();
      let cursor = this.cursors.get(msg.user.id);
      if (!cursor) {
        cursor = document.createElement('div');
        cursor.className = 'nx-cursor';
        const color = colorForUser(msg.user.id);
        cursor.style.setProperty('--cursor-color', color);
        cursor.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 0 L0 14 L4 11 L7 18 L10 17 L7 10 L12 10 Z" fill="${color}" stroke="#000" stroke-width=".5"/>
          </svg>
          <span class="nx-cursor-label">${initials(msg.user.name || msg.user.email)}</span>
        `;
        document.body.appendChild(cursor);
        this.cursors.set(msg.user.id, cursor);
      }
      const x = msg.x * window.innerWidth;
      const y = msg.y * window.innerHeight;
      cursor.style.transform = `translate(${x}px, ${y}px)`;
    }

    _removeCursor(user_id) {
      const c = this.cursors.get(user_id);
      if (c) { c.remove(); this.cursors.delete(user_id); }
    }

    _renderTyping(msg) {
      if (!msg.user || msg.user.id === this.user?.id) return;
      const avatar = this.presenceBar?.querySelector(`.nx-presence-avatar[title="${msg.user.name || msg.user.email}"]`);
      if (avatar) {
        avatar.setAttribute('data-typing', '1');
        clearTimeout(avatar._typingTimer);
        avatar._typingTimer = setTimeout(() => avatar.removeAttribute('data-typing'), 3000);
      }
    }

    _renderSharedAI(msg, kind) {
      injectStyles();
      document.querySelectorAll('.nx-shared-ai').forEach(el => el.remove());
      const box = document.createElement('div');
      box.className = 'nx-shared-ai';
      if (kind === 'thinking') {
        box.innerHTML = `
          <div class="nx-shared-ai-title">Shared AI · Thinking</div>
          <div class="nx-shared-ai-who">${msg.by?.name || 'Someone'} asked...</div>
          <div class="nx-shared-ai-preview">${(msg.prompt || '').slice(0, 120)}</div>
        `;
      } else {
        const output = typeof msg.output === 'string' ? msg.output : JSON.stringify(msg.output);
        box.innerHTML = `
          <div class="nx-shared-ai-title">Shared AI · Result</div>
          <div class="nx-shared-ai-who">${msg.by?.name || 'Someone'}'s response ready</div>
          <div class="nx-shared-ai-preview">${output.slice(0, 200)}</div>
        `;
      }
      document.body.appendChild(box);
      setTimeout(() => box.remove(), kind === 'thinking' ? 30000 : 15000);
    }

    // Public API
    sendChat(text) { this._send({ type: 'chat', text }); }
    sendTyping() { this._send({ type: 'typing', user: this.user }); }
    sendAIQuery(prompt) { this._send({ type: 'ai', prompt }); }
  }

  NXRT.Client = RealtimeClient;
  NXRT.createClient = (options) => new RealtimeClient(options);
})();

// ============================================================
// 🛡️ ADMIN DASHBOARD UI — Feature 4
// Users · Audit · Threats · Cost · System health · Billing
// ============================================================
(function(){
  'use strict';
  const NXUI = window.NXUI = window.NXUI || {};

  async function api(path, opts = {}) {
    const token = (window.getAuthToken ? window.getAuthToken() : '') || localStorage.getItem('nx_t') || '';
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(path, { ...opts, headers });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  }

  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }

  function fmt(n) {
    if (n == null) return '-';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(n);
  }

  function timeAgo(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
    return Math.floor(diff / 86400000) + 'd';
  }

  NXUI.renderAdmin = function (container) {
    if (!container) return;
    container.innerHTML = `
      <div class="nxui-tabs" id="nx-adm-tabs" style="overflow-x:auto">
        <div class="nxui-tab active" data-adm-tab="overview">📊 Overview</div>
        <div class="nxui-tab" data-adm-tab="users">👥 Users</div>
        <div class="nxui-tab" data-adm-tab="audit">📜 Audit</div>
        <div class="nxui-tab" data-adm-tab="threats">🛡️ Threats</div>
        <div class="nxui-tab" data-adm-tab="cost">💰 Cost</div>
        <div class="nxui-tab" data-adm-tab="system">⚙️ System</div>
        <div class="nxui-tab" data-adm-tab="billing">💳 Billing</div>
      </div>
      <div id="nx-adm-panel"></div>
    `;
    const target = container.querySelector('#nx-adm-panel');
    const renderers = {
      overview: renderOverview,
      users: renderUsers,
      audit: renderAudit,
      threats: renderThreats,
      cost: renderCost,
      system: renderSystem,
      billing: renderBilling,
    };
    container.querySelectorAll('#nx-adm-tabs .nxui-tab').forEach(t => {
      t.onclick = () => {
        container.querySelectorAll('#nx-adm-tabs .nxui-tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        renderers[t.dataset.admTab]?.(target);
      };
    });
    renderOverview(target);
  };

  async function renderOverview(target) {
    target.innerHTML = `<div class="nxui-panel nx-enter"><div class="nxui-empty"><span class="nx-thinking"><span></span><span></span><span></span><span></span><span></span></span></div></div>`;
    try {
      const [health, retention, cost, funnel] = await Promise.all([
        api('/api/dr/health').catch(() => ({ ok: false })),
        api('/api/pmf/retention?days=30').catch(() => ({})),
        api('/api/cost/semantic-cache').catch(() => ({})),
        api('/api/pmf/funnel').catch(() => ({ steps: [] })),
      ]);
      target.innerHTML = `
        <div class="nxui-panel nx-enter">
          <header class="nxui-head">
            <div>
              <h2 class="nxui-title">System Overview</h2>
              <p class="nxui-sub">Real-time platform metrics</p>
            </div>
            <span class="nx-chip" style="background:${health.ok ? 'rgba(53,241,198,.15)' : 'rgba(239,68,68,.15)'};color:${health.ok ? '#35f1c6' : '#ef4444'}">${health.ok ? 'HEALTHY' : 'DEGRADED'}</span>
          </header>
          <div class="nxui-grid">
            <div class="nxui-card cine-hologram"><div class="nxui-label">Signups (30d)</div><div style="color:#fff;font-size:28px;font-weight:300;margin-top:4px">${fmt(retention.signups)}</div></div>
            <div class="nxui-card cine-hologram"><div class="nxui-label">DAU</div><div style="color:#35f1c6;font-size:28px;font-weight:300;margin-top:4px">${fmt(retention.dau)}</div></div>
            <div class="nxui-card cine-hologram"><div class="nxui-label">Activation</div><div style="color:#c6f135;font-size:28px;font-weight:300;margin-top:4px">${((retention.activation_rate || 0) * 100).toFixed(1)}%</div></div>
            <div class="nxui-card cine-hologram"><div class="nxui-label">Stickiness</div><div style="color:#5b8def;font-size:28px;font-weight:300;margin-top:4px">${((retention.stickiness || 0) * 100).toFixed(1)}%</div></div>
            <div class="nxui-card cine-hologram"><div class="nxui-label">Cache hit rate</div><div style="color:#c87bef;font-size:28px;font-weight:300;margin-top:4px">${((cost.hit_rate || 0) * 100).toFixed(1)}%</div></div>
            <div class="nxui-card cine-hologram"><div class="nxui-label">Memory (MB)</div><div style="color:#fff;font-size:28px;font-weight:300;margin-top:4px">${health.checks?.memory?.heap_used_mb || '-'}</div></div>
          </div>

          <div style="margin-top:24px">
            <span class="nxui-label">Activation funnel</span>
            <div class="cine-timeline" style="margin-top:12px">
              ${(funnel.steps || []).map(s => `<div class="cine-timeline-item"><strong style="color:#fff">${esc(s.name)}</strong><div style="color:#89a;font-size:12px">${fmt(s.users)} users</div></div>`).join('') || '<div class="nxui-empty">No data yet</div>'}
            </div>
          </div>
        </div>
      `;
    } catch (e) {
      target.innerHTML = `<div class="nxui-panel"><div class="nxui-empty">${esc(e.message)}</div></div>`;
    }
  }

  async function renderUsers(target) {
    target.innerHTML = `
      <div class="nxui-panel nx-enter">
        <header class="nxui-head">
          <div>
            <h2 class="nxui-title">Users</h2>
            <p class="nxui-sub">Manage roles, plans, and access</p>
          </div>
        </header>
        <div class="nxui-row">
          <input class="nxui-input" id="nx-adm-usr-search" placeholder="Search email..." style="flex:1"/>
          <select class="nxui-select" id="nx-adm-usr-plan"><option value="">All plans</option><option>free</option><option>pro</option><option>elite</option><option>team</option></select>
        </div>
        <div id="nx-adm-usr-list" class="nxui-list" style="margin-top:16px"><div class="nxui-empty">Loading...</div></div>
      </div>
    `;
    const list = target.querySelector('#nx-adm-usr-list');
    async function load() {
      const q = target.querySelector('#nx-adm-usr-search').value;
      const plan = target.querySelector('#nx-adm-usr-plan').value;
      try {
        const r = await api(`/api/admin/users?${q ? `q=${encodeURIComponent(q)}&` : ''}${plan ? `plan=${plan}` : ''}`);
        if (!r.users?.length) { list.innerHTML = `<div class="nxui-empty">No users match</div>`; return; }
        list.innerHTML = r.users.map(u => `
          <div class="nxui-card" style="padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="color:#fff;font-size:13px;font-weight:500">${esc(u.email)}</div>
              <div style="color:#567;font-size:11px;margin-top:2px">ID ${u.id} · ${esc(u.name || 'no name')} · joined ${timeAgo(u.created_at)}</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <span class="nx-chip" style="background:${u.plan === 'elite' ? 'rgba(245,158,11,.15)' : u.plan === 'pro' ? 'rgba(53,241,198,.15)' : 'rgba(255,255,255,.05)'};color:${u.plan === 'elite' ? '#f59e0b' : u.plan === 'pro' ? '#35f1c6' : '#89a'}">${esc(u.plan)}</span>
            </div>
          </div>
        `).join('');
      } catch (e) { list.innerHTML = `<div class="nxui-empty">${esc(e.message)}</div>`; }
    }
    let timer;
    target.querySelector('#nx-adm-usr-search').oninput = () => { clearTimeout(timer); timer = setTimeout(load, 400); };
    target.querySelector('#nx-adm-usr-plan').onchange = load;
    load();
  }

  async function renderAudit(target) {
    target.innerHTML = `
      <div class="nxui-panel nx-enter">
        <header class="nxui-head">
          <div>
            <h2 class="nxui-title">Audit Log</h2>
            <p class="nxui-sub">Tamper-evident chain of security-sensitive events</p>
          </div>
          <button class="nxui-btn-secondary" id="nx-adm-audit-verify">Verify chain</button>
        </header>
        <div id="nx-adm-audit-list" class="nxui-list"><div class="nxui-empty">Loading...</div></div>
        <div id="nx-adm-audit-verify-out"></div>
      </div>
    `;
    const list = target.querySelector('#nx-adm-audit-list');
    try {
      const r = await api('/api/security/audit?limit=50');
      if (!r.events?.length) { list.innerHTML = `<div class="nxui-empty">No audit events</div>`; return; }
      list.innerHTML = r.events.map(e => `
        <div class="nxui-card" style="padding:12px 14px;border-left:3px solid ${e.severity === 'critical' ? '#ef4444' : e.severity === 'warn' ? '#f59e0b' : '#35f1c6'}">
          <div style="display:flex;justify-content:space-between;gap:12px">
            <div>
              <div style="color:#fff;font-size:13px;font-weight:500">${esc(e.action)}</div>
              <div style="color:#789;font-size:11px;margin-top:2px">User ${e.user_id || 'system'} · ${esc(e.resource || '')} · ${timeAgo(e.created_at)}</div>
            </div>
            <span class="nx-chip" style="background:rgba(${e.severity === 'critical' ? '239,68,68' : e.severity === 'warn' ? '245,158,11' : '53,241,198'},.15);color:${e.severity === 'critical' ? '#ef4444' : e.severity === 'warn' ? '#f59e0b' : '#35f1c6'}">${esc(e.severity)}</span>
          </div>
        </div>
      `).join('');
    } catch (e) { list.innerHTML = `<div class="nxui-empty">${esc(e.message)}</div>`; }

    target.querySelector('#nx-adm-audit-verify').onclick = async () => {
      const out = target.querySelector('#nx-adm-audit-verify-out');
      out.innerHTML = `<div class="nxui-result"><span class="nx-thinking"><span></span><span></span><span></span><span></span><span></span></span> Verifying...</div>`;
      try {
        const r = await api('/api/security/audit/verify', { method: 'POST' });
        out.innerHTML = `<div class="nxui-result" style="border-color:${r.valid ? 'rgba(53,241,198,.4)' : 'rgba(239,68,68,.4)'};color:${r.valid ? '#35f1c6' : '#fca5a5'}">${r.valid ? '✓ Chain intact — no tampering detected' : '✗ Chain broken at ' + r.broken_at}</div>`;
      } catch (e) { out.innerHTML = `<div class="nxui-result" style="border-color:rgba(239,68,68,.3);color:#fca5a5">${esc(e.message)}</div>`; }
    };
  }

  async function renderThreats(target) {
    target.innerHTML = `
      <div class="nxui-panel nx-enter">
        <header class="nxui-head">
          <div>
            <h2 class="nxui-title">Threat Monitor</h2>
            <p class="nxui-sub">Bot detection · abuse patterns · rate limit hits</p>
          </div>
        </header>
        <div id="nx-adm-threats"><div class="nxui-empty">Loading...</div></div>
      </div>
    `;
    try {
      const r = await api('/api/security/threats');
      const body = target.querySelector('#nx-adm-threats');
      body.innerHTML = `
        <div class="nxui-grid">
          <div class="nxui-card"><div class="nxui-label">Bots blocked (24h)</div><div style="color:#ef4444;font-size:24px;font-weight:300;margin-top:4px">${fmt(r.bots_blocked || 0)}</div></div>
          <div class="nxui-card"><div class="nxui-label">Rate limit hits</div><div style="color:#f59e0b;font-size:24px;font-weight:300;margin-top:4px">${fmt(r.rate_limits || 0)}</div></div>
          <div class="nxui-card"><div class="nxui-label">Failed logins</div><div style="color:#c87bef;font-size:24px;font-weight:300;margin-top:4px">${fmt(r.failed_logins || 0)}</div></div>
          <div class="nxui-card"><div class="nxui-label">Active sessions</div><div style="color:#35f1c6;font-size:24px;font-weight:300;margin-top:4px">${fmt(r.active_sessions || 0)}</div></div>
        </div>
        ${r.recent_alerts?.length ? `
        <div style="margin-top:20px">
          <span class="nxui-label">Recent alerts</span>
          <div class="nxui-list" style="margin-top:8px">
            ${r.recent_alerts.map(a => `
              <div class="nxui-card" style="padding:10px 14px;border-left:2px solid #ef4444">
                <div style="color:#fca5a5;font-size:13px">${esc(a.type)}: ${esc(a.detail || '')}</div>
                <div style="color:#789;font-size:11px;margin-top:2px">${timeAgo(a.created_at)}</div>
              </div>
            `).join('')}
          </div>
        </div>` : ''}
      `;
    } catch (e) { target.querySelector('#nx-adm-threats').innerHTML = `<div class="nxui-empty">${esc(e.message)}</div>`; }
  }

  async function renderCost(target) {
    target.innerHTML = `
      <div class="nxui-panel nx-enter">
        <header class="nxui-head">
          <div>
            <h2 class="nxui-title">Cost & Usage</h2>
            <p class="nxui-sub">Token consumption · provider mix · savings</p>
          </div>
        </header>
        <div id="nx-adm-cost"><div class="nxui-empty">Loading...</div></div>
      </div>
    `;
    try {
      const [sc, cost] = await Promise.all([
        api('/api/cost/semantic-cache'),
        api('/api/security/cost').catch(() => ({})),
      ]);
      target.querySelector('#nx-adm-cost').innerHTML = `
        <div class="nxui-grid">
          <div class="nxui-card"><div class="nxui-label">Cache hit rate</div><div style="color:#35f1c6;font-size:24px;font-weight:300;margin-top:4px">${((sc.hit_rate || 0) * 100).toFixed(1)}%</div><div style="color:#789;font-size:11px;margin-top:4px">${sc.hits || 0} hits / ${sc.total || 0} total</div></div>
          <div class="nxui-card"><div class="nxui-label">Exact matches</div><div style="color:#c6f135;font-size:24px;font-weight:300;margin-top:4px">${sc.exact || 0}</div></div>
          <div class="nxui-card"><div class="nxui-label">Similar matches</div><div style="color:#5b8def;font-size:24px;font-weight:300;margin-top:4px">${sc.similar || 0}</div></div>
          <div class="nxui-card"><div class="nxui-label">Index size</div><div style="color:#fff;font-size:24px;font-weight:300;margin-top:4px">${fmt(sc.index_size || 0)}</div></div>
        </div>
        ${cost.total_cost_usd != null ? `
        <div style="margin-top:20px">
          <div class="nxui-card cine-hologram" style="padding:20px">
            <div class="nxui-label">Estimated spend (30d)</div>
            <div style="color:#fff;font-size:32px;font-weight:300;margin-top:8px">$${(cost.total_cost_usd || 0).toFixed(2)}</div>
          </div>
        </div>` : ''}
      `;
    } catch (e) { target.querySelector('#nx-adm-cost').innerHTML = `<div class="nxui-empty">${esc(e.message)}</div>`; }
  }

  async function renderSystem(target) {
    target.innerHTML = `
      <div class="nxui-panel nx-enter">
        <header class="nxui-head">
          <div>
            <h2 class="nxui-title">System Health</h2>
            <p class="nxui-sub">DB · backups · uptime · resources</p>
          </div>
          <button class="nxui-btn-secondary" id="nx-adm-sys-snap">📸 Snapshot now</button>
        </header>
        <div id="nx-adm-sys-body"><div class="nxui-empty">Loading...</div></div>
      </div>
    `;
    async function load() {
      try {
        const [health, backups] = await Promise.all([
          api('/api/dr/health'),
          api('/api/dr/backups').catch(() => ({ backups: [] })),
        ]);
        const body = target.querySelector('#nx-adm-sys-body');
        const checks = health.checks || {};
        body.innerHTML = `
          <div class="nxui-grid">
            ${Object.entries(checks).map(([k, v]) => `
              <div class="nxui-card">
                <div class="nxui-label">${esc(k)}</div>
                <div style="color:${v.ok !== false ? '#35f1c6' : '#ef4444'};font-size:20px;font-weight:400;margin-top:4px">${v.ok !== false ? '✓ OK' : '✗ FAIL'}</div>
                <div style="color:#789;font-size:11px;margin-top:4px">${Object.entries(v).filter(([k2]) => k2 !== 'ok').map(([k2, v2]) => `${k2}: ${v2}`).join(' · ')}</div>
              </div>
            `).join('')}
          </div>
          <div style="margin-top:20px">
            <span class="nxui-label">Backups (${backups.backups?.length || 0})</span>
            <div class="nxui-list" style="margin-top:8px">
              ${(backups.backups || []).slice(0, 8).map(b => `
                <div class="nxui-card" style="padding:10px 14px;display:flex;justify-content:space-between">
                  <div style="color:#cde;font-family:ui-monospace,monospace;font-size:12px">${esc(b.name)}</div>
                  <div style="color:#789;font-size:11px">${(b.size / 1024).toFixed(1)}KB · ${timeAgo(new Date(b.mtime).getTime())}</div>
                </div>
              `).join('') || '<div class="nxui-empty">No backups yet</div>'}
            </div>
          </div>
        `;
      } catch (e) { target.querySelector('#nx-adm-sys-body').innerHTML = `<div class="nxui-empty">${esc(e.message)}</div>`; }
    }
    target.querySelector('#nx-adm-sys-snap').onclick = async () => {
      try { await api('/api/dr/snapshot', { method: 'POST' }); load(); } catch (_) {}
    };
    load();
  }

  async function renderBilling(target) {
    target.innerHTML = `
      <div class="nxui-panel nx-enter">
        <header class="nxui-head">
          <div>
            <h2 class="nxui-title">Billing</h2>
            <p class="nxui-sub">Subscriptions · plans · payment events</p>
          </div>
        </header>
        <div id="nx-adm-bill-plans"></div>
        <div id="nx-adm-bill-body" style="margin-top:20px"><div class="nxui-empty">Loading...</div></div>
      </div>
    `;
    try {
      const plans = await api('/api/payments/plans');
      target.querySelector('#nx-adm-bill-plans').innerHTML = `
        <div class="nxui-grid">
          ${(plans.plans || []).map(p => `
            <div class="nxui-card cine-hologram">
              <div class="nxui-label">${esc(p.name)}</div>
              <div style="color:#fff;font-size:24px;font-weight:300;margin-top:4px">$${p.price}<span style="color:#789;font-size:12px">/mo</span></div>
              <div style="color:#789;font-size:11px;margin-top:8px">${p.quota_per_day === -1 ? 'Unlimited' : p.quota_per_day + '/day'}</div>
              <div style="color:${p.available ? '#35f1c6' : '#f59e0b'};font-size:10px;margin-top:6px;text-transform:uppercase;letter-spacing:1px">${p.available ? 'Available' : 'Not configured'}</div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (e) {
      target.querySelector('#nx-adm-bill-plans').innerHTML = `<div class="nxui-empty">${esc(e.message)}</div>`;
    }

    try {
      const events = await api('/api/admin/payment-events').catch(() => ({ events: [] }));
      const body = target.querySelector('#nx-adm-bill-body');
      body.innerHTML = `
        <span class="nxui-label">Recent payment events</span>
        <div class="nxui-list" style="margin-top:8px">
          ${(events.events || []).slice(0, 20).map(e => `
            <div class="nxui-card" style="padding:10px 14px;display:flex;justify-content:space-between">
              <div>
                <div style="color:#cde;font-size:13px">${esc(e.type)}</div>
                <div style="color:#789;font-size:11px;margin-top:2px">User ${e.user_id || '-'} · ${timeAgo(e.created_at)}</div>
              </div>
              ${e.amount ? `<div style="color:#35f1c6">${(e.amount / 100).toFixed(2)} ${(e.currency || 'usd').toUpperCase()}</div>` : ''}
            </div>
          `).join('') || '<div class="nxui-empty">No payment events yet</div>'}
        </div>
      `;
    } catch (_) {}
  }
})();

// ============================================================
// 🗺️ REALITY MAP + SHADOW + DREAMSPACE UI — Features 7-10
// ============================================================
(function(){
  'use strict';
  const NXUI = window.NXUI = window.NXUI || {};

  async function api(path, opts = {}) {
    const token = (window.getAuthToken ? window.getAuthToken() : '') || localStorage.getItem('nx_t') || '';
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(path, { ...opts, headers });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  }

  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }

  function fmt(n) {
    if (n == null) return '-';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(n);
  }

  function timeAgo(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
    return Math.floor(diff / 86400000) + 'd';
  }

  // ─────────────────────────────────────────
  // 🗺️ REALITY MAP — the unified snapshot
  // ─────────────────────────────────────────
  NXUI.renderRealityMap = function (target) {
    target.innerHTML = `
      <div class="nxui-panel nx-enter">
        <header class="nxui-head">
          <div>
            <h2 class="nxui-title">Operational Reality Map</h2>
            <p class="nxui-sub">Your entire operational state at a glance</p>
          </div>
          <button class="nxui-btn-secondary" id="nx-rm-refresh">Refresh</button>
        </header>
        <div id="nx-rm-body"><div class="nxui-empty"><span class="nx-thinking"><span></span><span></span><span></span><span></span><span></span></span> Generating map...</div></div>
      </div>
    `;

    async function load() {
      const body = target.querySelector('#nx-rm-body');
      body.innerHTML = `<div class="nxui-empty"><span class="nx-thinking"><span></span><span></span><span></span><span></span><span></span></span></div>`;
      try {
        const map = await api('/api/reality-map');
        body.innerHTML = `
          <div class="cine-hologram" style="padding:20px;margin-bottom:20px">
            <div class="nxui-label">Summary</div>
            <div style="color:#fff;font-size:15px;line-height:1.6;margin-top:8px">${esc(map.summary || 'No data yet')}</div>
          </div>

          <div class="nxui-grid">
            <div class="nxui-card">
              <div class="nxui-label">Identity</div>
              <div style="color:#fff;font-size:15px;margin-top:6px">${esc(map.identity?.name || map.identity?.email || 'User')}</div>
              <div style="color:#789;font-size:11px;margin-top:4px">${esc(map.identity?.plan || 'free')} · ${map.identity?.member_since_days || 0} days</div>
              ${map.identity?.reputation ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.06)"><span class="nx-chip">${esc(map.identity.reputation.rank)}</span> <span style="color:#c6f135;margin-left:6px">${map.identity.reputation.points} pts</span></div>` : ''}
            </div>

            <div class="nxui-card">
              <div class="nxui-label">Momentum</div>
              <div style="color:${map.momentum?.direction === 'accelerating' ? '#35f1c6' : map.momentum?.direction === 'slowing' ? '#f59e0b' : '#cde'};font-size:20px;font-weight:400;margin-top:6px;text-transform:capitalize">${esc(map.momentum?.direction || 'steady')}</div>
              <div style="color:#789;font-size:11px;margin-top:4px">${map.momentum?.week_current || 0} this week · ${map.momentum?.week_previous || 0} last week</div>
              ${map.momentum?.active_streak_days ? `<div style="color:#c6f135;font-size:12px;margin-top:6px">🔥 ${map.momentum.active_streak_days}-day streak</div>` : ''}
            </div>

            <div class="nxui-card">
              <div class="nxui-label">Right now</div>
              <div style="color:#fff;font-size:15px;text-transform:capitalize;margin-top:6px">${esc((map.temporal?.block || 'unknown').replace(/_/g, ' '))}</div>
              <div style="color:#789;font-size:11px;margin-top:4px">Energy: ${esc(map.temporal?.energy || '-')}</div>
              <div style="color:#35f1c6;font-size:11px;margin-top:6px;text-transform:capitalize">Recommended: ${esc(map.temporal?.recommended_mode || 'calm')}</div>
            </div>

            <div class="nxui-card">
              <div class="nxui-label">Connections</div>
              <div style="color:#fff;font-size:20px;font-weight:400;margin-top:6px">${map.connections?.workspaces?.length || 0} workspaces</div>
              <div style="color:#789;font-size:11px;margin-top:4px">${map.connections?.collaborators || 0} collaborators</div>
            </div>
          </div>

          ${map.systems ? `
          <div style="margin-top:20px">
            <span class="nxui-label">Subsystems</span>
            <div class="nxui-grid" style="margin-top:8px">
              ${map.systems.memory_fabric ? `<div class="nxui-card"><div class="nxui-label">Memory Fabric</div><div style="color:#fff;font-size:16px;margin-top:6px">${map.systems.memory_fabric.nodes} nodes</div><div style="color:#789;font-size:11px">${map.systems.memory_fabric.edges} connections</div></div>` : ''}
              ${map.systems.dreamspace ? `<div class="nxui-card"><div class="nxui-label">Dreamspace</div><div style="color:#fff;font-size:16px;margin-top:6px">${map.systems.dreamspace.total_runs || 0} runs</div><div style="color:#789;font-size:11px">${map.systems.dreamspace.total_artifacts || 0} artifacts</div></div>` : ''}
              ${map.systems.predictive ? `<div class="nxui-card"><div class="nxui-label">Predictive</div><div style="color:#fff;font-size:16px;margin-top:6px">${((map.systems.predictive.hit_rate || 0) * 100).toFixed(0)}% hit</div><div style="color:#789;font-size:11px">${map.systems.predictive.predictions_made || 0} made</div></div>` : ''}
              ${map.systems.shadow ? `<div class="nxui-card"><div class="nxui-label">Shadow AI</div><div style="color:#fff;font-size:16px;margin-top:6px">${((map.systems.shadow.acceptance_rate || 0) * 100).toFixed(0)}% accepted</div><div style="color:#789;font-size:11px">${map.systems.shadow.total || 0} suggestions</div></div>` : ''}
            </div>
          </div>` : ''}

          ${map.insights?.pending ? `
          <div style="margin-top:20px">
            <span class="nxui-label">${map.insights.pending} pending insights</span>
            <div class="cine-timeline" style="margin-top:12px">
              ${(map.insights.items || []).slice(0, 5).map(i => `
                <div class="cine-timeline-item">
                  <div style="display:flex;justify-content:space-between;gap:12px">
                    <div>
                      <div class="nxui-label" style="color:${i.source === 'dreamspace' ? '#c87bef' : '#35f1c6'}">${esc(i.source)} · ${esc(i.kind || '')}</div>
                      <div style="color:#fff;font-size:13px;margin-top:4px">${esc(i.summary)}</div>
                      ${i.details ? `<div style="color:#89a;font-size:12px;margin-top:4px">${esc(i.details)}</div>` : ''}
                    </div>
                    <div style="color:#567;font-size:11px">${timeAgo(i.created_at)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>` : ''}

          ${map.identity?.twin?.formed ? `
          <div style="margin-top:20px">
            <span class="nxui-label">AI Twin</span>
            <div class="nxui-card" style="margin-top:8px">
              <div style="display:flex;justify-content:space-between;gap:12px;align-items:center">
                <div>
                  <div style="color:#fff">${map.identity.twin.total_observations} observations</div>
                  <div style="color:#789;font-size:11px;margin-top:2px">Active time: ${esc(map.identity.twin.active_time)}</div>
                </div>
                <div style="color:#c6f135;font-size:20px;font-weight:300">${(map.identity.twin.avg_confidence * 100).toFixed(0)}%</div>
              </div>
            </div>
          </div>` : ''}
        `;
      } catch (e) {
        body.innerHTML = `<div class="nxui-empty">${esc(e.message)}</div>`;
      }
    }

    target.querySelector('#nx-rm-refresh').onclick = load;
    load();
  };

  // ─────────────────────────────────────────
  // 👤 SHADOW SUGGESTIONS
  // ─────────────────────────────────────────
  NXUI.renderShadow = function (target) {
    target.innerHTML = `
      <div class="nxui-panel nx-enter">
        <header class="nxui-head">
          <div>
            <h2 class="nxui-title">Shadow AI</h2>
            <p class="nxui-sub">AI observes silently — suggests without executing</p>
          </div>
          <button class="nxui-btn-secondary" id="nx-sh-prefs">Preferences</button>
        </header>
        <div id="nx-sh-stats" class="nxui-grid" style="margin-bottom:16px"></div>
        <div class="nxui-tabs">
          <div class="nxui-tab active" data-sh-tab="pending">Pending</div>
          <div class="nxui-tab" data-sh-tab="accepted">Accepted</div>
          <div class="nxui-tab" data-sh-tab="dismissed">Dismissed</div>
        </div>
        <div id="nx-sh-list" class="nxui-list" style="margin-top:16px"></div>
      </div>
    `;

    async function loadStats() {
      try {
        const s = await api('/api/shadow/stats');
        target.querySelector('#nx-sh-stats').innerHTML = `
          <div class="nxui-card"><div class="nxui-label">Total</div><div style="color:#fff;font-size:20px;font-weight:400;margin-top:4px">${s.total || 0}</div></div>
          <div class="nxui-card"><div class="nxui-label">Pending</div><div style="color:#f59e0b;font-size:20px;font-weight:400;margin-top:4px">${s.pending || 0}</div></div>
          <div class="nxui-card"><div class="nxui-label">Accepted</div><div style="color:#35f1c6;font-size:20px;font-weight:400;margin-top:4px">${s.accepted || 0}</div></div>
          <div class="nxui-card"><div class="nxui-label">Acceptance rate</div><div style="color:#c6f135;font-size:20px;font-weight:400;margin-top:4px">${((s.acceptance_rate || 0) * 100).toFixed(0)}%</div></div>
        `;
      } catch (_) {}
    }

    async function loadList(status) {
      const list = target.querySelector('#nx-sh-list');
      list.innerHTML = `<div class="nxui-empty"><span class="nx-thinking"><span></span><span></span><span></span><span></span><span></span></span></div>`;
      try {
        const r = await api(`/api/shadow/suggestions?status=${status}&limit=30`);
        if (!r.suggestions?.length) { list.innerHTML = `<div class="nxui-empty">No ${status} suggestions</div>`; return; }
        list.innerHTML = r.suggestions.map(s => `
          <div class="nxui-card cine-hologram" style="padding:14px" data-sug-id="${s.id}">
            <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
              <div style="flex:1">
                <div class="nxui-label" style="color:#c87bef">${esc(s.suggestion_type)} · confidence ${((s.confidence || 0) * 100).toFixed(0)}%</div>
                <div style="color:#fff;font-size:14px;margin-top:6px;font-weight:500">${esc(s.title)}</div>
                ${s.body ? `<div style="color:#89a;font-size:12px;margin-top:4px">${esc(s.body)}</div>` : ''}
                <div style="color:#567;font-size:11px;margin-top:6px">${timeAgo(s.created_at)}</div>
              </div>
              ${status === 'pending' ? `
                <div style="display:flex;flex-direction:column;gap:6px">
                  <button class="nxui-btn" data-respond="accepted" style="padding:6px 12px;font-size:11px">Accept</button>
                  <button class="nxui-btn-secondary" data-respond="dismissed" style="padding:6px 12px;font-size:11px">Dismiss</button>
                </div>
              ` : ''}
            </div>
          </div>
        `).join('');

        list.querySelectorAll('[data-respond]').forEach(btn => {
          btn.onclick = async () => {
            const card = btn.closest('[data-sug-id]');
            const id = card.dataset.sugId;
            const response = btn.dataset.respond;
            try {
              await api(`/api/shadow/suggestions/${id}/respond`, {
                method: 'POST', body: JSON.stringify({ response }),
              });
              card.style.opacity = '.3';
              setTimeout(() => card.remove(), 400);
              loadStats();
            } catch (_) {}
          };
        });
      } catch (e) { list.innerHTML = `<div class="nxui-empty">${esc(e.message)}</div>`; }
    }

    target.querySelectorAll('[data-sh-tab]').forEach(t => {
      t.onclick = () => {
        target.querySelectorAll('[data-sh-tab]').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        loadList(t.dataset.shTab);
      };
    });

    target.querySelector('#nx-sh-prefs').onclick = async () => {
      try {
        const prefs = await api('/api/shadow/prefs');
        const enabled = confirm(`Shadow AI is currently ${prefs.enabled ? 'ON' : 'OFF'}.\nClick OK to toggle.`);
        if (enabled) {
          await api('/api/shadow/prefs', {
            method: 'PUT',
            body: JSON.stringify({ enabled: !prefs.enabled ? 1 : 0 }),
          });
        }
      } catch (_) {}
    };

    loadStats();
    loadList('pending');
  };

  // ─────────────────────────────────────────
  // 💤 DREAMSPACE
  // ─────────────────────────────────────────
  NXUI.renderDreamspace = function (target) {
    target.innerHTML = `
      <div class="nxui-panel nx-enter">
        <header class="nxui-head">
          <div>
            <h2 class="nxui-title">Dreamspace</h2>
            <p class="nxui-sub">Background AI that runs while you're away</p>
          </div>
          <span class="nx-chip">Passive</span>
        </header>
        <div id="nx-ds-stats" class="nxui-grid" style="margin-bottom:20px"></div>
        <div>
          <span class="nxui-label">Recent insights</span>
          <div id="nx-ds-insights" class="nxui-list" style="margin-top:8px"></div>
        </div>
        <div style="margin-top:20px">
          <span class="nxui-label">Dream runs</span>
          <div id="nx-ds-runs" class="nxui-list" style="margin-top:8px"></div>
        </div>
      </div>
    `;

    (async () => {
      try {
        const [stats, insights, runs] = await Promise.all([
          api('/api/dreamspace/stats'),
          api('/api/dreamspace/insights?limit=10'),
          api('/api/dreamspace/runs?limit=10'),
        ]);

        target.querySelector('#nx-ds-stats').innerHTML = `
          <div class="nxui-card cine-hologram"><div class="nxui-label">Total runs</div><div style="color:#fff;font-size:24px;font-weight:300;margin-top:6px">${stats.total_runs || 0}</div></div>
          <div class="nxui-card cine-hologram"><div class="nxui-label">Artifacts created</div><div style="color:#c87bef;font-size:24px;font-weight:300;margin-top:6px">${stats.total_artifacts || 0}</div></div>
          <div class="nxui-card cine-hologram"><div class="nxui-label">Status</div><div style="color:${stats.enabled ? '#35f1c6' : '#789'};font-size:16px;margin-top:6px">${stats.enabled ? 'Active' : 'Paused'}</div></div>
        `;

        const iList = target.querySelector('#nx-ds-insights');
        iList.innerHTML = insights.insights?.length ? insights.insights.map(i => `
          <div class="nxui-card cine-hologram" style="padding:14px">
            <div class="nxui-label" style="color:#c87bef">${esc(i.kind)} · importance ${((i.importance || 0) * 100).toFixed(0)}%</div>
            <div style="color:#fff;font-size:14px;margin-top:6px">${esc(i.summary)}</div>
            ${i.details ? `<div style="color:#89a;font-size:12px;margin-top:4px">${esc(i.details)}</div>` : ''}
            <div style="color:#567;font-size:11px;margin-top:6px">${timeAgo(i.created_at)}</div>
          </div>
        `).join('') : '<div class="nxui-empty">No insights yet — leave the app idle for 15+ min</div>';

        const rList = target.querySelector('#nx-ds-runs');
        rList.innerHTML = runs.runs?.length ? runs.runs.map(r => `
          <div class="nxui-card" style="padding:10px 14px;display:flex;justify-content:space-between">
            <div>
              <div style="color:#cde;font-size:13px">${esc(r.run_type)}</div>
              <div style="color:#789;font-size:11px;margin-top:2px">${r.artifacts_created} artifacts · ${r.duration_ms}ms</div>
            </div>
            <div style="color:#567;font-size:11px">${timeAgo(r.created_at)}</div>
          </div>
        `).join('') : '<div class="nxui-empty">No runs yet</div>';
      } catch (e) {
        target.querySelector('#nx-ds-insights').innerHTML = `<div class="nxui-empty">${esc(e.message)}</div>`;
      }
    })();
  };

  // ─────────────────────────────────────────
  // 🔮 PREDICTIVE (stats view)
  // ─────────────────────────────────────────
  NXUI.renderPredictive = function (target) {
    target.innerHTML = `
      <div class="nxui-panel nx-enter">
        <header class="nxui-head">
          <div>
            <h2 class="nxui-title">Predictive Execution</h2>
            <p class="nxui-sub">AI pre-computes what you'll likely ask next</p>
          </div>
        </header>
        <div id="nx-pr-body"></div>
      </div>
    `;

    (async () => {
      try {
        const s = await api('/api/predictive/stats');
        target.querySelector('#nx-pr-body').innerHTML = `
          <div class="nxui-grid">
            <div class="nxui-card cine-hologram"><div class="nxui-label">Predictions made</div><div style="color:#fff;font-size:28px;font-weight:300;margin-top:6px">${fmt(s.predictions_made || 0)}</div></div>
            <div class="nxui-card cine-hologram"><div class="nxui-label">Hits (used)</div><div style="color:#35f1c6;font-size:28px;font-weight:300;margin-top:6px">${fmt(s.predictions_hit || 0)}</div></div>
            <div class="nxui-card cine-hologram"><div class="nxui-label">Hit rate</div><div style="color:#c6f135;font-size:28px;font-weight:300;margin-top:6px">${((s.hit_rate || 0) * 100).toFixed(1)}%</div></div>
          </div>
          <div style="margin-top:20px;padding:16px;background:rgba(120,200,255,.05);border-radius:12px;color:#89a;font-size:13px;line-height:1.6">
            💡 The more you use the app, the smarter predictions get.
            Predictions expire after 30 minutes if unused.
          </div>
        `;
      } catch (e) {
        target.querySelector('#nx-pr-body').innerHTML = `<div class="nxui-empty">${esc(e.message)}</div>`;
      }
    })();
  };
})();


// ============================================================
// 📁 PROJECT WORKSPACE UI — Phase B
// Answers, at a glance: what Nexus is doing, why, what is done,
// what needs approval, and what happens next.
// ============================================================
(function(){
  'use strict';
  const NXUI = window.NXUI = window.NXUI || {};

  async function api(path, opts = {}) {
    const token = (window.getAuthToken ? window.getAuthToken() : '') || localStorage.getItem('nx_t') || '';
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(path, { ...opts, headers });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  function ago(ts) {
    const t = typeof ts === 'string' ? Date.parse(ts.replace(' ', 'T') + 'Z') : ts;
    if (!t || Number.isNaN(t)) return '';
    const d = Date.now() - t;
    if (d < 60000) return 'just now';
    if (d < 3600000) return Math.floor(d/60000) + 'm ago';
    if (d < 86400000) return Math.floor(d/3600000) + 'h ago';
    return Math.floor(d/86400000) + 'd ago';
  }

  const STEP_STYLE = {
    done:    { dot:'#35f1c6', label:'Done' },
    running: { dot:'#c6f135', label:'Running' },
    failed:  { dot:'#ef4444', label:'Failed' },
    pending: { dot:'#3d4a5c', label:'Queued' },
    skipped: { dot:'#5d6b80', label:'Skipped' },
  };

  const AUTONOMY = [
    { id:'suggest',    label:'Suggest',    desc:'Recommends only' },
    { id:'prepare',    label:'Prepare',    desc:'Prepares, waits for approval' },
    { id:'execute',    label:'Execute',    desc:'Runs safe actions automatically' },
    { id:'autonomous', label:'Autonomous', desc:'Runs the full workflow' },
  ];

  function injectStyles() {
    if (document.getElementById('nxp-styles')) return;
    const s = document.createElement('style');
    s.id = 'nxp-styles';
    s.textContent = `
      .nxp-head{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;margin-bottom:22px}
      .nxp-name{color:#fff;font-size:21px;font-weight:500;letter-spacing:-.3px}
      .nxp-goal{color:#6b7a90;font-size:13px;margin-top:5px;max-width:640px;line-height:1.5}
      .nxp-status{padding:5px 11px;border-radius:100px;font-size:10.5px;letter-spacing:1.2px;
        text-transform:uppercase;white-space:nowrap}
      .nxp-bar{height:3px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden;margin:16px 0 6px}
      .nxp-bar span{display:block;height:100%;background:linear-gradient(90deg,#c6f135,#35f1c6);
        border-radius:3px;transition:width .5s cubic-bezier(.16,1,.3,1)}
      .nxp-bar-meta{display:flex;justify-content:space-between;color:#5d6b80;font-size:11px}
      .nxp-now{padding:15px 17px;border-radius:13px;margin:20px 0;
        background:linear-gradient(135deg,rgba(198,241,53,.06),rgba(53,241,198,.05));
        border:1px solid rgba(53,241,198,.18)}
      .nxp-now-lbl{color:#35f1c6;font-size:9.5px;letter-spacing:1.6px;text-transform:uppercase;margin-bottom:6px}
      .nxp-now-t{color:#fff;font-size:14.5px}
      .nxp-now-s{color:#6b7a90;font-size:11.5px;margin-top:3px}
      .nxp-appr{padding:15px 17px;border-radius:13px;margin-bottom:10px;
        background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.28)}
      .nxp-appr.high{background:rgba(239,68,68,.06);border-color:rgba(239,68,68,.32)}
      .nxp-appr-a{color:#f59e0b;font-size:9.5px;letter-spacing:1.4px;text-transform:uppercase}
      .nxp-appr.high .nxp-appr-a{color:#ef4444}
      .nxp-appr-s{color:#fff;font-size:14px;margin:6px 0 12px;line-height:1.45}
      .nxp-btn{padding:7px 15px;border:none;border-radius:9px;font-size:12.5px;
        font-weight:500;cursor:pointer;font-family:inherit;transition:transform .14s}
      .nxp-btn:hover{transform:translateY(-1px)}
      .nxp-btn-ok{background:linear-gradient(135deg,#c6f135,#35f1c6);color:#000}
      .nxp-btn-no{background:rgba(255,255,255,.06);color:#aebbcc;border:1px solid rgba(255,255,255,.1)}
      .nxp-sec{color:#4a586b;font-size:9.5px;letter-spacing:1.5px;text-transform:uppercase;
        margin:26px 0 11px}
      .nxp-step{display:flex;gap:13px;padding:11px 14px;border-radius:10px;margin-bottom:5px;
        background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05)}
      .nxp-step-dot{width:8px;height:8px;border-radius:50%;margin-top:5px;flex-shrink:0}
      .nxp-step-n{color:#dbe4ef;font-size:13px}
      .nxp-step-m{color:#5d6b80;font-size:11px;margin-top:2px}
      .nxp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:9px}
      .nxp-tile{padding:13px 15px;background:rgba(255,255,255,.025);
        border:1px solid rgba(255,255,255,.06);border-radius:11px}
      .nxp-tile-n{color:#fff;font-size:19px;font-weight:300}
      .nxp-tile-l{color:#5d6b80;font-size:10.5px;letter-spacing:1.1px;text-transform:uppercase;margin-top:3px}
      .nxp-log{padding:8px 13px;border-left:2px solid rgba(255,255,255,.08);margin-bottom:3px}
      .nxp-log.error{border-left-color:#ef4444}
      .nxp-log.warn{border-left-color:#f59e0b}
      .nxp-log-m{color:#aebbcc;font-size:12px}
      .nxp-log-t{color:#4a586b;font-size:10px;margin-top:2px}
      .nxp-auto{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}
      .nxp-auto-b{padding:8px 13px;border-radius:9px;border:1px solid rgba(255,255,255,.08);
        background:rgba(255,255,255,.02);color:#8494a8;font-size:12px;cursor:pointer;
        font-family:inherit;text-align:left;transition:all .18s}
      .nxp-auto-b:hover{background:rgba(255,255,255,.05);color:#dbe4ef}
      .nxp-auto-b.on{border-color:rgba(53,241,198,.4);background:rgba(53,241,198,.08);color:#fff}
      .nxp-auto-d{display:block;color:#5d6b80;font-size:10px;margin-top:2px}
      .nxp-card{padding:15px 17px;background:rgba(255,255,255,.025);
        border:1px solid rgba(255,255,255,.06);border-radius:12px;margin-bottom:8px;
        cursor:pointer;transition:all .2s}
      .nxp-card:hover{border-color:rgba(53,241,198,.28);transform:translateY(-1px)}
      .nxp-empty{padding:40px 20px;text-align:center;color:#5d6b80;font-size:13px}
    `;
    document.head.appendChild(s);
  }

  function statusStyle(status) {
    if (status === 'awaiting_approval') return 'background:rgba(245,158,11,.14);color:#f59e0b';
    if (status === 'completed')         return 'background:rgba(53,241,198,.14);color:#35f1c6';
    if (status === 'failed')            return 'background:rgba(239,68,68,.14);color:#ef4444';
    if (status === 'building')          return 'background:rgba(198,241,53,.14);color:#c6f135';
    return 'background:rgba(255,255,255,.06);color:#8494a8';
  }

  // ─── Project list ─────────────────────────
  NXUI.renderProjects = function (target) {
    injectStyles();
    target.innerHTML = `
      <div class="nxui-panel nx-enter">
        <header class="nxui-head">
          <div>
            <h2 class="nxui-title">Projects</h2>
            <p class="nxui-sub">Every serious task lives here</p>
          </div>
        </header>
        <div id="nxp-list"><div class="nxp-empty">Loading…</div></div>
      </div>`;

    const list = target.querySelector('#nxp-list');
    api('/api/project-workspace').then(data => {
      const projects = data.projects || [];
      if (!projects.length) {
        list.innerHTML = `<div class="nxp-empty">No projects yet.<br>
          Describe what you want to build on Home and Nexus will create one.</div>`;
        return;
      }
      list.innerHTML = projects.map(p => `
        <div class="nxp-card" data-open="${p.id}">
          <div style="display:flex;justify-content:space-between;gap:14px;align-items:flex-start">
            <div style="flex:1;min-width:0">
              <div style="color:#fff;font-size:14.5px;font-weight:500">${esc(p.name)}</div>
              <div style="color:#5d6b80;font-size:11.5px;margin-top:3px;overflow:hidden;
                text-overflow:ellipsis;white-space:nowrap">${esc(p.goal)}</div>
            </div>
            <span class="nxp-status" style="${statusStyle(p.status)}">${esc(p.status.replace(/_/g,' '))}</span>
          </div>
          <div class="nxp-bar"><span style="width:${p.percent}%"></span></div>
          <div class="nxp-bar-meta"><span>${p.percent}% complete</span><span>${ago(p.updated_at)}</span></div>
        </div>`).join('');

      list.querySelectorAll('[data-open]').forEach(card => {
        card.onclick = () => NXUI.renderProject(target, Number(card.dataset.open));
      });
    }).catch(e => {
      list.innerHTML = `<div class="nxp-empty">${esc(e.message)}</div>`;
    });
  };

  // ─── Single project workspace ─────────────
  NXUI.renderProject = function (target, projectId) {
    injectStyles();
    target.innerHTML = `<div class="nxui-panel nx-enter"><div class="nxp-empty">Loading workspace…</div></div>`;

    let refreshTimer = null;

    function stopPolling() {
      if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
    }

    // Stop polling as soon as the workspace leaves the DOM, so a
    // closed panel cannot keep hitting the API forever.
    function stillMounted() {
      return document.body.contains(target);
    }

    async function load() {
      if (!stillMounted()) { stopPolling(); return; }
      try {
        const w = await api(`/api/project-workspace/${projectId}`);
        render(w);
        // Only poll while work is actually moving.
        if (w.project.status !== 'building' || w.blocked) stopPolling();
      } catch (e) {
        stopPolling();
        target.innerHTML = `<div class="nxui-panel"><div class="nxp-empty">${esc(e.message)}</div></div>`;
      }
    }

    function render(w) {
      const p = w.project;
      const pr = w.progress;

      const approvals = w.pendingApprovals.length ? `
        <div class="nxp-sec">Needs your approval</div>
        ${w.pendingApprovals.map(a => `
          <div class="nxp-appr ${a.risk === 'high' ? 'high' : ''}">
            <div class="nxp-appr-a">${esc(a.action)} · ${esc(a.risk)} risk</div>
            <div class="nxp-appr-s">${esc(a.summary)}</div>
            <div style="display:flex;gap:7px">
              <button class="nxp-btn nxp-btn-ok" data-appr="${a.id}" data-dec="approved">Approve</button>
              <button class="nxp-btn nxp-btn-no" data-appr="${a.id}" data-dec="rejected">Reject</button>
            </div>
          </div>`).join('')}` : '';

      const now = w.currentStep ? `
        <div class="nxp-now">
          <div class="nxp-now-lbl">Nexus is working</div>
          <div class="nxp-now-t">${esc(w.currentStep.step)}</div>
          <div class="nxp-now-s">${esc(w.currentStep.agent)} · started ${ago(w.currentStep.since)}</div>
        </div>` : (w.nextStep ? `
        <div class="nxp-now">
          <div class="nxp-now-lbl">Up next</div>
          <div class="nxp-now-t">${esc(w.nextStep.step)}</div>
          <div class="nxp-now-s">${esc(w.nextStep.agent)}</div>
        </div>` : '');

      const resourceCount = Object.values(w.resources).reduce((n, arr) => n + arr.length, 0);
      const resources = resourceCount ? `
        <div class="nxp-sec">Resources</div>
        <div class="nxp-grid">
          ${Object.entries(w.resources).filter(([, arr]) => arr.length).map(([kind, arr]) => `
            <div class="nxp-tile">
              <div class="nxp-tile-n">${arr.length}</div>
              <div class="nxp-tile-l">${esc(kind)}</div>
            </div>`).join('')}
        </div>` : '';

      target.innerHTML = `
        <div class="nxui-panel nx-enter">
          <button class="nxui-btn-secondary" id="nxp-back"
            style="padding:6px 13px;font-size:12px;margin-bottom:16px">← All projects</button>

          <div class="nxp-head">
            <div style="flex:1;min-width:0">
              <div class="nxp-name">${esc(p.name)}</div>
              <div class="nxp-goal">${esc(p.goal)}</div>
            </div>
            <span class="nxp-status" style="${statusStyle(p.status)}">${esc(p.status.replace(/_/g,' '))}</span>
          </div>

          <div class="nxp-bar"><span style="width:${pr.percent}%"></span></div>
          <div class="nxp-bar-meta">
            <span>${pr.done} of ${pr.total} steps</span>
            <span>${pr.failed ? pr.failed + ' failed · ' : ''}${pr.percent}%</span>
          </div>

          ${approvals}
          ${now}

          <div class="nxp-sec">Plan</div>
          ${w.plan.length ? w.plan.map(s => {
            const st = STEP_STYLE[s.status] || STEP_STYLE.pending;
            return `<div class="nxp-step">
              <div class="nxp-step-dot" style="background:${st.dot}"></div>
              <div style="flex:1;min-width:0">
                <div class="nxp-step-n">${esc(s.step)}</div>
                <div class="nxp-step-m">${esc(s.agent)} · ${st.label}${s.duration_ms ? ' · ' + s.duration_ms + 'ms' : ''}</div>
              </div>
            </div>`;
          }).join('') : '<div class="nxp-empty">No steps recorded yet</div>'}

          ${w.agents.length ? `
            <div class="nxp-sec">Agents involved</div>
            <div class="nxp-grid">
              ${w.agents.map(a => `
                <div class="nxp-tile">
                  <div class="nxp-tile-n">${a.steps}</div>
                  <div class="nxp-tile-l">${esc(a.name)}${a.failed ? ' · ' + a.failed + ' failed' : ''}</div>
                </div>`).join('')}
            </div>` : ''}

          ${resources}

          <div class="nxp-sec">Autonomy</div>
          <div class="nxp-auto">
            ${AUTONOMY.map(a => `
              <button class="nxp-auto-b ${p.autonomy === a.id ? 'on' : ''}" data-auto="${a.id}">
                ${esc(a.label)}<span class="nxp-auto-d">${esc(a.desc)}</span>
              </button>`).join('')}
          </div>
          <div style="color:#4a586b;font-size:11px;margin-top:9px">
            Production deploys, database changes, payments and deletions always
            ask first unless autonomy is set to Autonomous.
          </div>

          <div class="nxp-sec">Activity</div>
          ${w.activity.length ? w.activity.slice(0, 15).map(l => `
            <div class="nxp-log ${esc(l.level)}">
              <div class="nxp-log-m">${esc(l.message)}</div>
              <div class="nxp-log-t">${l.agent ? esc(l.agent) + ' · ' : ''}${ago(l.at)}</div>
            </div>`).join('') : '<div class="nxp-empty">No activity yet</div>'}
        </div>`;

      target.querySelector('#nxp-back').onclick = () => {
        stopPolling();
        NXUI.renderProjects(target);
      };

      target.querySelectorAll('[data-appr]').forEach(btn => {
        btn.onclick = async () => {
          btn.disabled = true;
          try {
            await api(`/api/project-workspace/approvals/${btn.dataset.appr}/${btn.dataset.dec}`, { method:'POST' });
            load();
          } catch (e) {
            btn.disabled = false;
            btn.textContent = e.message.slice(0, 24);
          }
        };
      });

      target.querySelectorAll('[data-auto]').forEach(btn => {
        btn.onclick = async () => {
          try {
            await api(`/api/project-workspace/${projectId}/autonomy`, {
              method:'PUT', body: JSON.stringify({ level: btn.dataset.auto }),
            });
            load();
          } catch (_) {}
        };
      });
    }

    load();
    refreshTimer = setInterval(load, 5000);
  };
})();

// ============================================================
// 🎼 LIVE ORCHESTRATION UI — Phase C
// The user describes an outcome; Nexus picks and runs the agents.
// They never choose from a list of fifteen.
// ============================================================
(function(){
  'use strict';
  const NXO = window.NXO = window.NXO || {};

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  function injectStyles() {
    if (document.getElementById('nxo-styles')) return;
    const s = document.createElement('style');
    s.id = 'nxo-styles';
    s.textContent = `
      .nxo-wrap{max-width:660px;margin:0 auto}
      .nxo-head{text-align:center;margin-bottom:28px}
      .nxo-headline{color:#fff;font-size:23px;font-weight:400;letter-spacing:-.3px}
      .nxo-goal{color:#6b7a90;font-size:13px;margin-top:7px;line-height:1.5}
      .nxo-bar{height:3px;background:rgba(255,255,255,.06);border-radius:3px;
        overflow:hidden;margin:22px 0 7px}
      .nxo-bar span{display:block;height:100%;width:0;
        background:linear-gradient(90deg,#c6f135,#35f1c6);border-radius:3px;
        transition:width .55s cubic-bezier(.16,1,.3,1)}
      .nxo-meta{display:flex;justify-content:space-between;color:#5d6b80;font-size:11px}
      .nxo-step{display:flex;gap:13px;padding:12px 15px;border-radius:11px;margin-bottom:5px;
        background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);
        transition:all .3s cubic-bezier(.16,1,.3,1)}
      .nxo-step.running{background:linear-gradient(135deg,rgba(198,241,53,.07),rgba(53,241,198,.05));
        border-color:rgba(53,241,198,.24)}
      .nxo-step.done{opacity:.62}
      .nxo-step.failed{border-color:rgba(239,68,68,.3);background:rgba(239,68,68,.04)}
      .nxo-step.blocked{border-color:rgba(245,158,11,.34);background:rgba(245,158,11,.05)}
      .nxo-step.blocked .nxo-dot{background:#f59e0b}
      .nxo-gate{margin-top:20px;padding:18px;border-radius:13px;
        background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.3)}
      .nxo-gate.high{background:rgba(239,68,68,.06);border-color:rgba(239,68,68,.34)}
      .nxo-gate-l{color:#f59e0b;font-size:9.5px;letter-spacing:1.5px;text-transform:uppercase}
      .nxo-gate.high .nxo-gate-l{color:#ef4444}
      .nxo-gate-t{color:#fff;font-size:15px;margin:8px 0 5px}
      .nxo-gate-d{color:#8494a8;font-size:12px;margin-bottom:14px;line-height:1.5}
      .nxo-dot{width:8px;height:8px;border-radius:50%;margin-top:5px;flex-shrink:0;
        background:#3d4a5c;transition:background .3s}
      .nxo-step.running .nxo-dot{background:#c6f135;animation:nxoPulse 1.3s ease-in-out infinite}
      .nxo-step.done .nxo-dot{background:#35f1c6}
      .nxo-step.failed .nxo-dot{background:#ef4444}
      @keyframes nxoPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.5);opacity:.55}}
      .nxo-name{color:#dbe4ef;font-size:13.5px}
      .nxo-sub{color:#5d6b80;font-size:11px;margin-top:2px}
      .nxo-out{margin-top:9px;padding:11px 13px;background:rgba(0,0,0,.24);
        border-radius:9px;color:#8fa3ba;font-size:11.5px;line-height:1.55;
        max-height:150px;overflow:auto;white-space:pre-wrap;
        font-family:ui-monospace,SFMono-Regular,monospace}
      .nxo-toggle{background:none;border:none;color:#4a586b;font-size:10.5px;
        cursor:pointer;padding:4px 0;font-family:inherit;letter-spacing:.4px}
      .nxo-toggle:hover{color:#8494a8}
      .nxo-done{margin-top:26px;padding:19px;border-radius:13px;text-align:center;
        background:linear-gradient(135deg,rgba(198,241,53,.07),rgba(53,241,198,.06));
        border:1px solid rgba(53,241,198,.24)}
      .nxo-done-t{color:#fff;font-size:16px;margin-bottom:12px}
      .nxo-btn{padding:9px 18px;border:none;border-radius:10px;font-size:13px;
        font-weight:600;cursor:pointer;font-family:inherit;
        background:linear-gradient(135deg,#c6f135,#35f1c6);color:#000;transition:transform .14s}
      .nxo-btn:hover{transform:translateY(-1px)}
      .nxo-btn-ghost{background:rgba(255,255,255,.05);color:#aebbcc;
        border:1px solid rgba(255,255,255,.1);font-weight:500}
      .nxo-err{padding:15px 17px;border-radius:12px;margin-top:16px;
        background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.28);color:#fca5a5;font-size:13px}
    `;
    document.head.appendChild(s);
  }

  // Render a step's output as something a person reads, not raw JSON.
  function summarize(output) {
    if (output == null) return '';
    if (typeof output === 'string') return output.slice(0, 900);
    if (typeof output !== 'object') return String(output);

    const lines = [];
    for (const [key, value] of Object.entries(output)) {
      if (lines.length >= 8) break;
      const label = key.replace(/_/g, ' ');
      if (Array.isArray(value)) {
        lines.push(`${label}: ${value.slice(0, 4).map(v =>
          typeof v === 'string' ? v : JSON.stringify(v)).join(', ')}`);
      } else if (value && typeof value === 'object') {
        lines.push(`${label}: ${JSON.stringify(value).slice(0, 160)}`);
      } else {
        lines.push(`${label}: ${String(value).slice(0, 220)}`);
      }
    }
    return lines.join('\n').slice(0, 900);
  }

  /**
   * Runs a prompt end to end and streams progress into `target`.
   * Returns a handle so the caller can stop it.
   */
  NXO.run = function (target, prompt, options = {}) {
    return startStream(target, {
      url: '/api/orchestrate/run',
      body: { prompt },
      headline: 'Working out the plan…',
      goal: prompt,
    }, options);
  };

  /** Continues a run that stopped at an approval gate. */
  NXO.resume = function (target, projectId, options = {}) {
    return startStream(target, {
      url: `/api/orchestrate/resume/${projectId}`,
      body: {},
      headline: 'Continuing…',
      goal: 'Resuming after approval',
      projectId,
    }, options);
  };

  // Shared by run and resume so both paths behave identically.
  function startStream(target, cfg, options = {}) {
    injectStyles();
    const token = (window.getAuthToken ? window.getAuthToken() : '') || localStorage.getItem('nx_t') || '';
    const prompt = cfg.goal;

    target.innerHTML = `
      <div class="nxo-wrap">
        <div class="nxo-head">
          <div class="nxo-headline" id="nxo-headline">${esc(cfg.headline)}</div>
          <div class="nxo-goal">${esc(cfg.goal)}</div>
        </div>
        <div class="nxo-bar"><span id="nxo-fill"></span></div>
        <div class="nxo-meta">
          <span id="nxo-count">Preparing</span>
          <span id="nxo-pct">0%</span>
        </div>
        <div id="nxo-steps" style="margin-top:18px"></div>
        <div id="nxo-final"></div>
      </div>`;

    const els = {
      headline: target.querySelector('#nxo-headline'),
      fill:     target.querySelector('#nxo-fill'),
      count:    target.querySelector('#nxo-count'),
      pct:      target.querySelector('#nxo-pct'),
      steps:    target.querySelector('#nxo-steps'),
      final:    target.querySelector('#nxo-final'),
    };

    const controller = new AbortController();
    let projectId = cfg.projectId ?? null;
    let total = 0;

    function setProgress(pct, doneCount) {
      els.fill.style.width = pct + '%';
      els.pct.textContent = pct + '%';
      if (total) els.count.textContent = `${doneCount} of ${total} steps`;
    }

    function stepNode(id) {
      return els.steps.querySelector(`[data-step="${id}"]`);
    }

    function handle(evt) {
      switch (evt.type) {
        case 'plan': {
          projectId = evt.project_id;
          total = evt.steps.length;
          els.headline.textContent = evt.headline;
          els.count.textContent = `0 of ${total} steps`;
          els.steps.innerHTML = evt.steps.map(s => `
            <div class="nxo-step" data-step="${s.id}">
              <div class="nxo-dot"></div>
              <div style="flex:1;min-width:0">
                <div class="nxo-name">${esc(s.step)}</div>
                <div class="nxo-sub" data-sub>Queued</div>
              </div>
            </div>`).join('');
          options.onPlan?.(evt);
          break;
        }
        case 'step_started': {
          const node = stepNode(evt.step_id);
          if (node) {
            node.className = 'nxo-step running';
            node.querySelector('[data-sub]').textContent = 'Working…';
            node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
          setProgress(evt.progress, Math.round((evt.progress / 100) * total));
          break;
        }
        case 'step_done': {
          const node = stepNode(evt.step_id);
          if (node) {
            node.className = 'nxo-step done';
            node.querySelector('[data-sub]').textContent =
              `Done${evt.duration_ms ? ' · ' + (evt.duration_ms / 1000).toFixed(1) + 's' : ''}`;

            const summary = summarize(evt.output);
            if (summary) {
              const body = node.querySelector('div[style]');
              const toggle = document.createElement('button');
              toggle.className = 'nxo-toggle';
              toggle.textContent = 'Show result';
              const pre = document.createElement('div');
              pre.className = 'nxo-out';
              pre.style.display = 'none';
              pre.textContent = summary;
              toggle.onclick = () => {
                const open = pre.style.display === 'none';
                pre.style.display = open ? 'block' : 'none';
                toggle.textContent = open ? 'Hide result' : 'Show result';
              };
              body.appendChild(toggle);
              body.appendChild(pre);
            }
          }
          setProgress(evt.progress, Math.round((evt.progress / 100) * total));
          break;
        }
        case 'step_failed': {
          const node = stepNode(evt.step_id);
          if (node) {
            node.className = 'nxo-step failed';
            node.querySelector('[data-sub]').textContent = esc(evt.error || 'Failed');
          }
          break;
        }
        case 'resumed': {
          els.headline.textContent = evt.headline;
          projectId = evt.project_id;
          total = evt.total;
          break;
        }
        case 'approval_required': {
          projectId = evt.project_id;
          const node = stepNode(evt.step_id);
          if (node) {
            node.className = 'nxo-step blocked';
            node.querySelector('[data-sub]').textContent = 'Waiting for your approval';
          }
          els.headline.textContent = 'Paused — needs your approval';
          els.count.textContent = `${evt.completed} of ${evt.total} steps`;

          // The gate is the decision point, so it is shown here rather
          // than leaving the user to find it in the project page.
          const high = /deploy\.production|database\.|payment\./.test(evt.action || '');
          els.final.innerHTML = `
            <div class="nxo-gate ${high ? 'high' : ''}">
              <div class="nxo-gate-l">${esc(evt.action)} · approval required</div>
              <div class="nxo-gate-t">${esc(evt.summary)}</div>
              <div class="nxo-gate-d">Nexus has stopped before this step because the
                project's autonomy level does not allow it to run unattended.</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="nxo-btn" id="nxo-approve">Approve and continue</button>
                <button class="nxo-btn nxo-btn-ghost" id="nxo-reject">Reject</button>
              </div>
              <div id="nxo-gate-msg" style="margin-top:10px;color:#8494a8;font-size:11.5px"></div>
            </div>`;

          const msg = els.final.querySelector('#nxo-gate-msg');
          const decide = async (decision) => {
            if (!evt.approval_id) { msg.textContent = 'Approval could not be recorded.'; return; }
            els.final.querySelectorAll('button').forEach(b => { b.disabled = true; });
            try {
              await fetch(`/api/project-workspace/approvals/${evt.approval_id}/${decision}`, {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              if (decision === 'rejected') {
                msg.textContent = 'Rejected. The run stays paused.';
                return;
              }
              els.final.innerHTML = '';
              NXO.resume(target, projectId, options);
            } catch (err) {
              msg.textContent = err.message;
              els.final.querySelectorAll('button').forEach(b => { b.disabled = false; });
            }
          };
          els.final.querySelector('#nxo-approve').onclick = () => decide('approved');
          els.final.querySelector('#nxo-reject').onclick = () => decide('rejected');
          options.onApprovalRequired?.(evt);
          break;
        }
        case 'complete': {
          els.headline.textContent =
            evt.status === 'completed' ? 'Done' : 'Finished with issues';
          setProgress(100, evt.completed);
          els.final.innerHTML = `
            <div class="nxo-done">
              <div class="nxo-done-t">${evt.completed} of ${evt.total} steps completed</div>
              <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
                <button class="nxo-btn" id="nxo-open">Open project</button>
                <button class="nxo-btn nxo-btn-ghost" id="nxo-again">Start something else</button>
              </div>
            </div>`;
          els.final.querySelector('#nxo-open').onclick = () => {
            if (window.NXUI?.renderProject && projectId) {
              window.NXUI.renderProject(target, projectId);
            }
          };
          els.final.querySelector('#nxo-again').onclick = () => window.NXS?.open('home');
          options.onComplete?.(evt);
          break;
        }
        case 'error': {
          els.headline.textContent = 'Could not finish';
          els.final.innerHTML = `<div class="nxo-err">${esc(evt.error)}</div>`;
          options.onError?.(evt);
          break;
        }
      }
    }

    (async () => {
      try {
        const res = await fetch(cfg.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(cfg.body || {}),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const detail = await res.json().catch(() => ({}));
          throw new Error(detail.error || `HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // SSE frames are separated by a blank line.
          const frames = buffer.split('\n\n');
          buffer = frames.pop() || '';
          for (const frame of frames) {
            const line = frame.split('\n').find(l => l.startsWith('data: '));
            if (!line) continue;
            try { handle(JSON.parse(line.slice(6))); }
            catch (_) { /* skip malformed frame */ }
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        handle({ type: 'error', error: err.message });
      }
    })();

    return {
      stop() { controller.abort(); },
      get projectId() { return projectId; },
    };
  }

  /** Preview the plan without spending anything. */
  NXO.preview = async function (prompt) {
    const token = (window.getAuthToken ? window.getAuthToken() : '') || localStorage.getItem('nx_t') || '';
    const res = await fetch('/api/orchestrate/plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };
})();