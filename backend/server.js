// ============================================
// STUDYAI - server.js
// Express backend: AI generation, auth, limits
// ============================================

const OpenAI = require('openai');
require('dotenv').config({ path: __dirname + '/.env' });

const express        = require('express');
const cors           = require('cors');
const rateLimit      = require('express-rate-limit');
const jwt            = require('jsonwebtoken');
const bcrypt         = require('bcryptjs');
const passport       = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const db             = require('./db');

// ---- INIT ----
const app    = express();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); // single instance

// ---- MIDDLEWARE ----
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());
app.use(passport.initialize());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use(globalLimiter);

// ---- JWT HELPERS ----
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, plan: user.plan },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(); // guest
  try {
    req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
  } catch (e) {}
  next();
}

// ---- GOOGLE OAUTH ----
passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  `${process.env.BACKEND_URL}/api/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      db.prepare('INSERT INTO users (name, email, plan) VALUES (?, ?, ?)').run(profile.displayName, email, 'free');
      user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    }
    done(null, user);
  } catch (e) { done(e); }
}));

app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/api/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}?error=auth` }),
  (req, res) => {
    const token = signToken(req.user);
    res.redirect(`${process.env.FRONTEND_URL}/frontend/index.html?token=${token}&name=${encodeURIComponent(req.user.name)}`);
  }
);

// ---- AUTH ROUTES ----
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password too short' });

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(400).json({ error: 'Email already registered' });

  const hash = await bcrypt.hash(password, 10);
  db.prepare('INSERT INTO users (name, email, password_hash, plan) VALUES (?, ?, ?, ?)').run(name, email, hash, 'free');
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  res.json({ token: signToken(user), user: { id: user.id, name: user.name, plan: user.plan } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !user.password_hash) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  res.json({ token: signToken(user), user: { id: user.id, name: user.name, plan: user.plan } });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const user = db.prepare('SELECT id, name, email, plan FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(401).json({ error: 'User not found' });
  res.json({ user });
});

// ---- USAGE TRACKING ----
function checkAndIncrementUsage(userId) {
  const today  = new Date().toISOString().split('T')[0];
  let record   = db.prepare('SELECT * FROM usage WHERE user_id = ? AND date = ?').get(userId, today);

  if (!record) {
    db.prepare('INSERT INTO usage (user_id, date, count) VALUES (?, ?, 1)').run(userId, today);
    return { allowed: true, count: 1 };
  }

  const user  = db.prepare('SELECT plan FROM users WHERE id = ?').get(userId);
  const limit = user.plan === 'pro' ? Infinity : 3;

  if (record.count >= limit) return { allowed: false, count: record.count };
  db.prepare('UPDATE usage SET count = count + 1 WHERE user_id = ? AND date = ?').run(userId, today);
  return { allowed: true, count: record.count + 1 };
}

// ---- AI PROMPTS ----
function buildPrompt(text, mode) {
  const prompts = {
    study: `You are an expert teacher. Analyze the following text and provide:
1. **SUMMARY**: A concise 3-5 bullet point summary of the key points.
2. **EXPLANATION**: A simplified explanation as if teaching a 14-year-old.
3. **ANSWER**: If there's a question in the text, answer it. Otherwise, state the main takeaway.

Text:
${text}

Respond in this exact JSON format:
{ "summary": "...", "explanation": "...", "answer": "..." }`,

    homework: `You are a helpful tutor. For the following homework question:
1. **SUMMARY**: Identify what type of problem this is and what's being asked.
2. **EXPLANATION**: Explain the concept/method needed to solve it step by step.
3. **ANSWER**: Provide the complete, correct answer with working shown.

Question:
${text}

Respond in this exact JSON format:
{ "summary": "...", "explanation": "...", "answer": "..." }`,

    summarize: `You are an expert at condensing information. For the following text:
1. **SUMMARY**: A crisp bullet-point summary of the 5 most important points.
2. **EXPLANATION**: A short paragraph explaining what this text is about, in plain English.
3. **ANSWER**: The single most important takeaway from this text.

Text:
${text}

Respond in this exact JSON format:
{ "summary": "...", "explanation": "...", "answer": "..." }`
  };
  return prompts[mode] || prompts.study;
}

// ---- AI GENERATION ----
app.post('/api/generate', async (req, res) => {
  const { text, mode } = req.body;
  if (!text || text.trim().length < 5) return res.status(400).json({ error: 'Text too short' });
  if (text.length > 3001) return res.status(400).json({ error: 'Text too long (max 3001 chars)' });

  if (req.user) {
    const usage = checkAndIncrementUsage(req.user.id);
    if (!usage.allowed) return res.status(429).json({ error: 'Daily limit reached. Upgrade for unlimited access.' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',   // ~$0.00015/1K tokens — very cheap
      messages: [{ role: 'user', content: buildPrompt(text, mode || 'study') }],
      temperature: 0.6,
      max_tokens: 800
    });

    const raw = completion.choices[0].message.content;
    let parsed;
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { summary: raw, explanation: 'See summary above.', answer: 'See summary above.' };
    }
    res.json(parsed);
  } catch (err) {
    console.error('OpenAI error:', err);
    res.status(500).json({ error: 'AI generation failed. Please try again.' });
  }
});

// ---- START ----
const PORT = 3001;
app.listen(PORT, () => console.log(`StudyAI backend running on port ${PORT}`));