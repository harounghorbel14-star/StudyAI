# Production deployment: Vercel frontend + Railway backend

```
browser ──► nexusaitools.it.com (Vercel, serves frontend/)
                 │  /api/*  and  /health   (rewrite in vercel.json)
                 ▼
            <service>.up.railway.app (Railway, runs backend/)
```

The frontend calls the API with relative URLs (`/api/...`), so every API
request goes to the Vercel domain and must be forwarded to Railway by the
rewrite in `vercel.json`. If the rewrite is missing or points at a dead
host, `/api/*` returns a Vercel `404 NOT_FOUND`.

## 1. Railway (backend)

| Setting | Value |
| --- | --- |
| Root Directory | `backend` |
| Build | `npm ci` then `npm run build` (`tsc` → `backend/dist`) |
| Start | `npm start` (`node server.js`) |
| Health check | `/health` |
| Node | **18.20.8**, from `engines.node` in `backend/package.json` (matched by `backend/.nvmrc`) |

`railway.json` at the repository root sets the build command, start command
and health check. Railway reads it from the repository root even when the
Root Directory is `backend`.

**Node version.** Keep `engines.node` pinned. With a range such as
`>=18.0.0` the builder picks the newest Node (24.x), for which
`better-sqlite3@9` has no prebuilt binary, so npm tries to compile it and
the build fails with `cc: not found`. On 18.20.8 `better-sqlite3` and
`bcrypt` install from prebuilt binaries and no compiler is needed. CI's
*Railway parity* job installs, builds and boots `backend/` on its own
with that Node version on every PR.

**Required variables** (the server exits at boot without them):

```
OPENAI_API_KEY
JWT_SECRET            # long random string, 32+ characters
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

**Recommended variables:**

```
NODE_ENV=production
APP_URL=https://nexusaitools.it.com
ALLOWED_ORIGIN=https://nexusaitools.it.com
ADMIN_EMAILS=you@example.com,other-admin@example.com
VIP_EMAILS=...         # optional; defaults to ADMIN_EMAILS
TRUST_PROXY=2          # if all traffic arrives via the Vercel rewrite; default 1
PORT                   # set by Railway automatically; do not hard-code
```

`ADMIN_EMAILS` grants full admin access by email. Signup does not verify
email ownership, so **every address in that list must already be
registered by its real owner**. Otherwise whoever signs up with it first
becomes an admin.

**SQLite persistence.** The database is a file under `backend/`. Without a
Railway volume mounted there, accounts are lost on every redeploy.

Verify the backend directly before touching Vercel:

```
curl -i https://<service>.up.railway.app/health
curl -i -X POST https://<service>.up.railway.app/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"probe@example.com","password":"invalid-probe"}'
```

`/health` must return `200 {"status":"ok"}`, and the login probe must return
`401` from the app, not a Railway "Application not found" page.

## 2. Vercel (frontend)

Vercel reads `vercel.json` **only from the project's Root Directory**.
The frontend's asset paths are relative to `frontend/`, so the Root
Directory is normally `frontend`, and `frontend/vercel.json` is the file
that applies. A copy at the repository root covers a project whose Root
Directory is the repository itself. CI fails if the two differ.

Point both at the backend with one command. It checks `/health` first
and refuses placeholders:

```
node scripts/set-backend-domain.js <service>.up.railway.app
git add vercel.json frontend/vercel.json && git commit -m "route /api to Railway" && git push
```

Then redeploy the Vercel project.

## 3. End-to-end checks

```
curl -i https://nexusaitools.it.com/health
curl -i https://nexusaitools.it.com/api/health
curl -i -X POST https://nexusaitools.it.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"probe@example.com","password":"invalid-probe"}'
```

- `/health` and `/api/health`: `200` with `{"status":"ok"}`.
- `/api/login`: `401 {"error":"Invalid email or password."}`, not Vercel `NOT_FOUND`.

Then sign up, log in and send a chat in the browser, and confirm in the
Network panel that requests go to `https://nexusaitools.it.com/api/...`
and get JSON from the backend.

## Security notes

Do not put secrets in `vercel.json`, `railway.json`, Git or frontend
JavaScript. The backend binds `0.0.0.0` on Railway's `PORT`.
