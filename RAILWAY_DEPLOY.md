# Railway Deployment Guide — Rent Hub

## What Was Fixed (Summary)

| File | Problem | Fix |
|---|---|---|
| `backend/server.js` | Bound to `localhost` — invisible to Railway's router | Changed to `app.listen(PORT, "0.0.0.0")` |
| `backend/railway.toml` | Missing — Railway didn't know start command | Added with `startCommand`, healthcheck |
| `frontend/railway.toml` | Missing — Railway guessed wrong build/start | Added with `npm run build` + `serve -s dist` |
| `backend/package.json` | No `engines` field — Railway picked wrong Node | Added `"engines": { "node": ">=18.0.0" }` |
| `frontend/package.json` | No `serve` dep, no `engines` | Added `serve`, `engines`, and `start` script |
| `backend/db/init.js` | `path.dirname(DB_PATH)` without resolving — breaks relative paths | Wrapped with `path.resolve()` |
| `backend/.env` | Real credentials committed to repo | Added proper `.gitignore` + `.env.example` |
| `frontend/.env` | `VITE_API_URL` pointing to localhost | Must be set as Railway env var before build |
| `backend/server.js` | CORS only accepted one origin string | Now splits `FRONTEND_URL` by comma for flexibility |

---

## Step-by-Step: Local Test Before Deploying

### 1. Clean your `.env` files

Your `backend/.env` has real credentials. Before pushing to GitHub, make sure
`.gitignore` is working:

```bash
# From the project root
git rm --cached backend/.env frontend/.env 2>/dev/null
git status   # these files should now show as untracked/ignored
```

### 2. Test the backend locally

```bash
cd backend
npm install
node server.js
```

Expected output:
```
Database initialized ✓
🏠 Rent Hub API v2.0 running at http://0.0.0.0:3001
   Health: http://0.0.0.0:3001/api/health
```

Then open http://localhost:3001/api/health — you should see:
```json
{ "status": "ok", "timestamp": "...", "version": "2.0.0" }
```

### 3. Test the frontend locally

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — the app should load and connect to the backend
through Vite's dev proxy.

### 4. Test the frontend production build locally

```bash
cd frontend
npm run build        # builds to dist/
npx serve -s dist    # serve as if it were deployed
```

Open http://localhost:3000 — if this works, the Railway deployment will too.

---

## Deploying to Railway

### Deploy the Backend

1. Go to https://railway.app → New Project → Deploy from GitHub → select repo
2. **If monorepo:** in service Settings → set Root Directory to `backend`
3. **Add a Volume** (for SQLite persistence):
   - Service → Volumes tab → Add Volume → Mount Path: `/data`
4. **Add environment variables** (Variables tab):

   | Variable | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `JWT_SECRET` | a long random string (min 32 chars) |
   | `DB_PATH` | `/data/renthub.db` |
   | `FRONTEND_URL` | your frontend Railway URL (add after frontend is deployed) |
   | `BASE_URL` | your backend Railway URL |
   | `CLOUDINARY_CLOUD_NAME` | from cloudinary.com (free tier is fine) |
   | `CLOUDINARY_API_KEY` | from cloudinary.com |
   | `CLOUDINARY_API_SECRET` | from cloudinary.com |
   | `EMAIL_HOST` | `smtp.gmail.com` |
   | `EMAIL_PORT` | `587` |
   | `EMAIL_SECURE` | `false` |
   | `EMAIL_USER` | your Gmail |
   | `EMAIL_PASS` | Gmail App Password |
   | `EMAIL_FROM` | `Rent Hub <you@gmail.com>` |
   | `MPESA_CONSUMER_KEY` | from Daraja |
   | `MPESA_CONSUMER_SECRET` | from Daraja |
   | `MPESA_SHORTCODE` | your shortcode |
   | `MPESA_PASSKEY` | your passkey |
   | `MPESA_CALLBACK_URL` | `https://<backend-url>/api/payments/mpesa/callback` |
   | `MPESA_ENV` | `sandbox` (change to `production` when going live) |

5. Deploy → check logs → confirm: `GET /api/health` returns `200 OK`

---

### Deploy the Frontend

1. Create another Railway service → same repo
2. **If monorepo:** Root Directory → `frontend`
3. **Add environment variables:**

   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | `https://<your-backend-url>/api` |

   > **Critical:** Vite bakes `VITE_*` vars into the JS bundle at build time.
   > This variable MUST be set before the build runs or the frontend will still
   > call `localhost:3001` in production.

4. Deploy → Railway runs `npm install && npm run build` → then serves `dist/`

---

### After Both Are Deployed

1. Copy the **frontend Railway URL** → go to backend service → set `FRONTEND_URL`
   to that URL → **redeploy backend** (CORS won't allow your frontend until this is done)
2. Update `MPESA_CALLBACK_URL` to use the real backend URL if using M-Pesa

---

## Cloudinary Setup (Required for Images)

Without Cloudinary, uploaded images are saved to local disk and lost on every
redeploy. Setup takes 2 minutes:

1. https://cloudinary.com → sign up free
2. Dashboard → copy Cloud Name, API Key, API Secret
3. Add to Railway backend environment variables

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Build passes but service unreachable | Server binding to `127.0.0.1` | Confirm `server.js` uses `"0.0.0.0"` |
| `CORS` errors in browser | `FRONTEND_URL` not set on backend | Set it and redeploy backend |
| API calls 404 or go to localhost | `VITE_API_URL` not set before build | Set the var, trigger a new build |
| Data lost after redeploy | No Volume, or `DB_PATH` not `/data/...` | Add Volume mounted at `/data` |
| Images 404 after redeploy | Cloudinary not configured | Set up Cloudinary credentials |
| M-Pesa callback failing | Callback URL is still `yourdomain.com` | Update `MPESA_CALLBACK_URL` |
| `better-sqlite3` build error | Native module needs Python/make | Railway's Nixpacks handles this; ensure `NODE_ENV=production` |
