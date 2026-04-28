// ============================================
//  STUDYAI — app.js
//  Handles: AI requests, usage limits,
//  auth modal, tabs, UX interactions
// ============================================

// --- CONFIG ---
// In production, replace this URL with your deployed backend URL
const API_BASE = "http://localhost:3001";
// --- STATE ---
let currentMode = 'study';
let responseData = { summary: '', explanation: '', answer: '' };
let isLoggedIn = false;
let userToken = localStorage.getItem('studyai_token') || null;

// --- USAGE LIMIT (localStorage for guests) ---
function getUsageKey() {
  const today = new Date().toISOString().split('T')[0];
  return `studyai_usage_${today}`;
}
function getUsageCount() {
  return parseInt(localStorage.getItem(getUsageKey()) || '0');
}
function incrementUsage() {
  const key = getUsageKey();
  localStorage.setItem(key, (getUsageCount() + 1).toString());
}
function updateUsageBadge() {
  const used = getUsageCount();
  const remaining = Math.max(0, 3 - used);
  const badge = document.getElementById('usageText');
  if (isLoggedIn) {
    badge.textContent = 'Unlimited requests ✦';
  } else {
    badge.textContent = remaining > 0
      ? `${remaining} free request${remaining !== 1 ? 's' : ''} remaining today`
      : 'Limit reached — upgrade for more';
  }
}

// --- MODE ---
function setMode(mode, el) {
  currentMode = mode;
  document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const placeholders = {
    study: 'Paste your lesson, textbook chapter, or notes here…',
    homework: 'Type your homework question or problem here…',
    summarize: 'Paste any article, document, or long text to summarize…'
  };
  document.getElementById('userInput').placeholder = placeholders[mode];
}

// --- CHAR COUNT ---
document.getElementById('userInput').addEventListener('input', function () {
  document.getElementById('charCount').textContent = `${this.value.length} / 3001`;
});

// --- GENERATE ---
async function generate() {
  const input = document.getElementById('userInput').value.trim();
  if (!input) {
    shake(document.querySelector('.input-area'));
    return;
  }

  // Check usage limit
  if (!isLoggedIn && getUsageCount() >= 3) {
    document.getElementById('upgradeBanner').style.display = 'flex';
    return;
  }

  setLoading(true);
  document.getElementById('responseArea').style.display = 'none';
  document.getElementById('upgradeBanner').style.display = 'none';

  try {
    const res = await fetch(`${API_BASE}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userToken ? { Authorization: `Bearer ${userToken}` } : {})
      },
      body: JSON.stringify({ text: input, mode: currentMode })
    });

    if (!res.ok) {
      const err = await res.json();
      if (res.status === 429) {
        document.getElementById('upgradeBanner').style.display = 'flex';
        return;
      }
      throw new Error(err.error || 'Request failed');
    }

    const data = await res.json();
    responseData = data;

    if (!isLoggedIn) incrementUsage();

    showResponse('summary');
    document.getElementById('responseArea').style.display = 'block';
    updateUsageBadge();

  } catch (err) {
    alert('Something went wrong: ' + err.message);
    console.error(err);
  } finally {
    setLoading(false);
  }
}

function setLoading(on) {
  const btn = document.getElementById('generateBtn');
  const spinner = document.getElementById('spinner');
  const btnText = document.getElementById('btnText');
  btn.disabled = on;
  spinner.classList.toggle('active', on);
  btnText.style.display = on ? 'none' : 'inline';
}

// --- RESPONSE TABS ---
function showTab(tab, el) {
  document.querySelectorAll('.resp-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('responseContent').textContent = responseData[tab] || '—';
}

function showResponse(tab) {
  document.querySelectorAll('.resp-tab').forEach((t, i) => {
    t.classList.toggle('active', ['summary','explanation','answer'][i] === tab);
  });
  document.getElementById('responseContent').textContent = responseData[tab] || '—';
}

// --- ACTIONS ---
function copyResponse() {
  navigator.clipboard.writeText(document.getElementById('responseContent').textContent)
    .then(() => showToast('Copied!'));
}

function resetTool() {
  document.getElementById('userInput').value = '';
  document.getElementById('charCount').textContent = '0 / 3001';
  document.getElementById('responseArea').style.display = 'none';
  document.getElementById('upgradeBanner').style.display = 'none';
}

function scrollToTool() {
  document.getElementById('tool').scrollIntoView({ behavior: 'smooth' });
}

// --- AUTH MODAL ---
function openModal(type) {
  const overlay = document.getElementById('modalOverlay');
  overlay.classList.add('open');
  document.getElementById('modalContent').innerHTML = type === 'login'
    ? loginHTML() : signupHTML();
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function loginHTML() {
  return `
    <h2>Welcome back</h2>
    <p>Log in to your StudyAI account.</p>
    <div class="modal-form">
      <input type="email" id="loginEmail" placeholder="Email address" />
      <input type="password" id="loginPass" placeholder="Password" />
      <button class="btn-primary full" onclick="login()">Log In</button>
      <div class="divider">or</div>
      <button class="btn-google" onclick="googleAuth()">
        <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"/></svg>
        Continue with Google
      </button>
    </div>
    <div class="modal-switch">No account? <a onclick="openModal('signup')">Sign up free</a></div>
  `;
}

function signupHTML() {
  return `
    <h2>Get started free</h2>
    <p>3 free requests daily. No credit card needed.</p>
    <div class="modal-form">
      <input type="text" id="signupName" placeholder="Your name" />
      <input type="email" id="signupEmail" placeholder="Email address" />
      <input type="password" id="signupPass" placeholder="Password (min 8 chars)" />
      <button class="btn-primary full" onclick="signup()">Create Account</button>
      <div class="divider">or</div>
      <button class="btn-google" onclick="googleAuth()">
        <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"/></svg>
        Continue with Google
      </button>
    </div>
    <div class="modal-switch">Already have an account? <a onclick="openModal('login')">Log in</a></div>
  `;
}

async function login() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;
  if (!email || !pass) return showToast('Please fill all fields');

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    handleAuthSuccess(data.token, data.user);
  } catch (err) {
    showToast(err.message || 'Login failed');
  }
}

async function signup() {
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const pass = document.getElementById('signupPass').value;
  if (!name || !email || !pass) return showToast('Please fill all fields');
  if (pass.length < 8) return showToast('Password must be at least 8 characters');

  try {
    const res = await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password: pass })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    handleAuthSuccess(data.token, data.user);
  } catch (err) {
    showToast(err.message || 'Signup failed');
  }
}

function googleAuth() {
  // Redirect to backend Google OAuth
  window.location.href = `${API_BASE}/api/auth/google`;
}

function handleAuthSuccess(token, user) {
  userToken = token;
  localStorage.setItem('studyai_token', token);
  isLoggedIn = true;
  closeModal();
  updateUsageBadge();
  updateNavForUser(user);
  showToast(`Welcome, ${user.name}! 👋`);
}

function updateNavForUser(user) {
  const navLinks = document.querySelector('.nav-links');
  const loginBtn = navLinks.querySelector('.btn-outline');
  const signupBtn = navLinks.querySelector('.btn-primary');
  if (loginBtn) loginBtn.style.display = 'none';
  if (signupBtn) signupBtn.textContent = user.name;
}

// --- HELPERS ---
function shake(el) {
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'shake 0.4s ease';
  setTimeout(() => el.style.animation = '', 400);
}

function showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = `
    position:fixed; bottom:2rem; left:50%; transform:translateX(-50%);
    background:#0f0e0c; color:#fff; padding:0.7rem 1.4rem;
    border-radius:50px; font-size:0.9rem; z-index:9999;
    animation:fadeUp 0.3s ease;
  `;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

function toggleMenu() {
  document.querySelector('.nav-links').classList.toggle('open');
}

// Handle Google OAuth callback
const params = new URLSearchParams(window.location.search);
if (params.get('token')) {
  handleAuthSuccess(params.get('token'), { name: params.get('name') || 'User' });
  window.history.replaceState({}, '', '/');
}

// Check existing session
if (userToken) {
  isLoggedIn = true;
  fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${userToken}` }
  }).then(r => r.json()).then(data => {
    if (data.user) updateNavForUser(data.user);
    else { userToken = null; localStorage.removeItem('studyai_token'); isLoggedIn = false; }
  }).catch(() => { isLoggedIn = false; });
}

// Init
updateUsageBadge();

// Add shake keyframe dynamically
const style = document.createElement('style');
style.textContent = `@keyframes shake {
  0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)}
}`;
document.head.appendChild(style);
