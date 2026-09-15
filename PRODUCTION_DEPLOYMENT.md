# Production deployment: Vercel frontend and Express backend

The current production failure is a routing/deployment problem: `nexusaitools.it.com` is served by Vercel, while the previously referenced Railway hostname returns `Application not found`. The frontend therefore loads, but `/api/*` never reaches Express.

## 1. Deploy the backend

Create a new Railway service from this repository and use the repository root as the service root. The included `railway.json` sets the start command to `npm start` and the health check to `/api/health`.

Set these Railway variables before deploying:

```
OPENAI_API_KEY
JWT_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NODE_ENV=production
APP_URL=https://nexusaitools.it.com
PORT              # normally supplied automatically by Railway; do not hard-code it
```

Add any other provider, database, Stripe price, or integration variables required by the features you intend to use. Do not commit secret values.

After deployment, copy the public Railway domain, for example:

```
https://studyai-backend-production.up.railway.app
```

Verify the backend directly before changing Vercel:

```
curl.exe -i https://YOUR-BACKEND-DOMAIN/api/health
curl.exe -i -X POST https://YOUR-BACKEND-DOMAIN/api/login -H "Content-Type: application/json" -d "{\"email\":\"probe@example.com\",\"password\":\"invalid-probe\"}"
```

The health request must return `200`. Login may return `401`, `400`, or another application-level response for the probe, but it must not return a platform `404`.

## 2. Configure the Vercel rewrite

Open `vercel.json` and replace both occurrences of:

```
REPLACE_WITH_BACKEND_DOMAIN
```

with the Railway hostname without a trailing slash. For example:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://studyai-backend-production.up.railway.app/api/:path*"
    },
    {
      "source": "/health",
      "destination": "https://studyai-backend-production.up.railway.app/health"
    }
  ]
}
```

Deploy the Vercel project again. Keep the frontend at `https://nexusaitools.it.com/`; do not change the frontend API origin to localhost.

## 3. External verification

Run these checks after both deployments finish:

```
curl.exe -i https://nexusaitools.it.com/api/health
curl.exe -i -X POST https://nexusaitools.it.com/api/signup -H "Content-Type: application/json" -d "{\"email\":\"probe@example.com\",\"password\":\"invalid-probe\"}"
curl.exe -i -X POST https://nexusaitools.it.com/api/login -H "Content-Type: application/json" -d "{\"email\":\"probe@example.com\",\"password\":\"invalid-probe\"}"
```

Expected results:

- `/api/health`: HTTP `200` with `{ "status": "ok" }`.

- `/api/signup`: an application response such as `400` for validation or `409` for an existing account, but not Vercel `NOT_FOUND`.

- `/api/login`: an application response such as `401` for invalid credentials, but not Vercel `NOT_FOUND`.

Then test signup/login in the browser and send a normal chat request. Inspect the Network panel to confirm that the requests remain on `https://nexusaitools.it.com/api/...` and receive responses from the backend.

## Security notes

The backend binds to `0.0.0.0` and reads Railway's assigned `PORT`. Authentication and CORS middleware remain enabled. Do not put secrets in `vercel.json`, `railway.json`, Git, or frontend JavaScript.