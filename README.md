# StudyAI — Complete Deployment Guide

A full-stack AI study assistant. Built with HTML/CSS/JS frontend + Node.js/Express backend + SQLite + OpenAI API.

---

## 📁 Project Structure

```
studyai/
├── frontend/
│   ├── index.html      ← Main page
│   ├── style.css       ← All styles
│   └── app.js          ← Frontend logic
└── backend/
    ├── server.js       ← Express API server
    ├── db.js           ← SQLite database
    ├── package.json    ← Dependencies
    └── .env.example    ← Environment template
```

---

## ⚡ Quick Start (Local Development)

### Step 1 — Get your OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create a new key
3. Copy it — you'll need it in Step 3

### Step 2 — Set up the Backend
```bash
cd studyai/backend
npm install
cp .env.example .env
```

### Step 3 — Configure .env
Open `backend/.env` and fill in:
```
OPENAI_API_KEY=sk-your-actual-key-here
JWT_SECRET=any-long-random-string-here
BACKEND_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5500
```

### Step 4 — Start the Backend
```bash
npm run dev
# Server starts at http://localhost:3001
```

### Step 5 — Open the Frontend
Open `frontend/index.html` directly in your browser,
OR use VS Code Live Server (port 5500).

That's it! The app is running locally.

---

## 🚀 Production Deployment

### Option A: Deploy to Render (Recommended — Free Tier)

**Backend on Render:**
1. Push your code to GitHub
2. Go to https://render.com → New → Web Service
3. Connect your GitHub repo
4. Settings:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Add Environment Variables (from .env):
   - `OPENAI_API_KEY`
   - `JWT_SECRET`
   - `BACKEND_URL` = your Render URL (e.g. https://studyai-backend.onrender.com)
   - `FRONTEND_URL` = your frontend URL
6. Deploy — Render gives you a URL like `https://studyai-backend.onrender.com`

**Frontend on Netlify/Vercel:**
1. Before deploying, update `app.js` line 7:
   ```js
   const API_BASE = 'https://studyai-backend.onrender.com';
   ```
2. Go to https://netlify.com → Drag & drop your `frontend/` folder
3. Your site is live instantly!

---

### Option B: Deploy to Railway

**Backend:**
```bash
npm install -g @railway/cli
railway login
cd backend
railway init
railway add
railway vars set OPENAI_API_KEY=sk-...
railway vars set JWT_SECRET=your-secret
railway up
```

**Frontend:** Deploy to Vercel:
```bash
npm i -g vercel
cd frontend
vercel
```

---

### Option C: Deploy to a VPS (DigitalOcean / Hetzner)

```bash
# On your server:
git clone your-repo
cd studyai/backend
npm install
cp .env.example .env
nano .env  # fill in your values

# Install PM2 to keep server running
npm install -g pm2
pm2 start server.js --name studyai
pm2 save
pm2 startup

# Serve frontend with nginx
# Create /etc/nginx/sites-available/studyai:
server {
    listen 80;
    server_name yourdomain.com;
    
    # Frontend
    root /var/www/studyai/frontend;
    index index.html;
    
    # Backend API proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
    }
}
```

---

## 💳 Adding Payments (Stripe)

1. Create account at https://stripe.com
2. Install Stripe: `npm install stripe`
3. Add to `.env`:
   ```
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRO_PRICE_ID=price_...
   ```
4. Add to `server.js`:
   ```js
   const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
   
   app.post('/api/create-checkout', authMiddleware, async (req, res) => {
     const session = await stripe.checkout.sessions.create({
       payment_method_types: ['card'],
       line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
       mode: 'subscription',
       success_url: `${process.env.FRONTEND_URL}?upgraded=true`,
       cancel_url: process.env.FRONTEND_URL,
       customer_email: req.user.email
     });
     res.json({ url: session.url });
   });
   
   // Webhook to update plan after payment
   app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
     const sig = req.headers['stripe-signature'];
     const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
     if (event.type === 'checkout.session.completed') {
       const email = event.data.object.customer_email;
       db.prepare("UPDATE users SET plan = 'pro' WHERE email = ?").run(email);
     }
     res.json({ received: true });
   });
   ```

---

## 🔐 Setting Up Google Login (Optional)

1. Go to https://console.cloud.google.com
2. Create a project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID (Web Application)
4. Add Authorized redirect URIs:
   ```
   http://localhost:3001/api/auth/google/callback
   https://your-backend.onrender.com/api/auth/google/callback
   ```
5. Add to `.env`:
   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-secret
   ```

---

## 📊 Scaling to PostgreSQL (When You Grow)

Replace SQLite with PostgreSQL:
1. `npm install pg` (remove better-sqlite3)
2. Change `db.js` to use `pg` Pool
3. Use `DATABASE_URL` env variable
4. Deploy free PostgreSQL on Render, Railway, or Supabase

---

## 💰 Cost Estimates

| Service       | Cost              |
|---------------|-------------------|
| OpenAI gpt-4o-mini | ~$0.002/request |
| Render (backend) | Free tier available |
| Netlify (frontend) | Free |
| Stripe        | 2.9% + 30¢/transaction |

**At 100 users × 3 requests/day = ~$0.60/day in OpenAI costs.**
Pro plan at $7/month = pays for itself with just 1 subscriber.

---

## 🛠️ Customization Tips

- **Change AI model**: Edit `gpt-4o-mini` in server.js to `gpt-4o` for better quality (higher cost)
- **Change daily limit**: Edit the `limit` variable in `checkAndIncrementUsage()`  
- **Add more modes**: Add entries to `buildPrompt()` in server.js and `mode-tabs` in index.html
- **Change pricing**: Edit the `$7` in index.html pricing section

---

## 📞 Support

Questions? Email: your@email.com
