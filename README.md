# 🏠 Rent Hub — Express + SQLite Edition

A full-stack property rental platform. This version replaces Supabase with a self-hosted **Express.js** backend and **SQLite** database (via `better-sqlite3`). The frontend is identical to the original Vite + React app — only the data layer has changed.

---

## Project Structure

```
rent-hub/
├── frontend/          # Vite + React + TypeScript + Tailwind + shadcn/ui
│   ├── src/
│   │   ├── services/api.ts      ← all API calls (replaces Supabase client)
│   │   ├── contexts/AuthContext.tsx
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── components/
│   ├── .env.example
│   └── package.json
│
└── backend/           # Express.js + SQLite
    ├── server.js            ← entry point
    ├── db/init.js           ← schema + seed data
    ├── middleware/auth.js   ← JWT middleware
    ├── routes/
    │   ├── auth.js          ← register, login, profile
    │   ├── properties.js    ← CRUD + approve + featured
    │   ├── conversations.js ← messaging
    │   ├── payments.js      ← M-Pesa STK push + callback
    │   ├── wallet.js        ← wallet + transactions
    │   ├── admin.js         ← admin endpoints
    │   ├── upload.js        ← image upload
    │   └── misc.js          ← categories, locations, agents, stats, favorites, inquiries
    ├── .env.example
    └── package.json
```

---

## Quick Start

### 1. Backend

```bash
cd backend

# Install dependencies
npm install

# Create your .env file
cp .env.example .env
# Edit .env — set JWT_SECRET to a long random string

# Start the server (database is auto-created on first run)
npm run dev       # development (with nodemon)
# or
npm start         # production
```

The server starts at **http://localhost:3001**  
Check it: `http://localhost:3001/api/health`

---

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create your .env file
cp .env.example .env
# VITE_API_URL=http://localhost:3001/api  (default, no changes needed for local dev)

# Start dev server
npm run dev
```

The app starts at **http://localhost:5173**

> **Note:** The Vite dev server proxies `/api/*` → `http://localhost:3001` automatically, so you don't need to change `VITE_API_URL` during development.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `JWT_SECRET` | Secret for signing JWTs — **change this!** | — |
| `DB_PATH` | Path to SQLite database file | `./data/renthub.db` |
| `UPLOADS_DIR` | Directory for uploaded images | `./uploads` |
| `FRONTEND_URL` | Frontend origin (for CORS) | `http://localhost:5173` |
| `MPESA_CONSUMER_KEY` | Daraja API consumer key | — |
| `MPESA_CONSUMER_SECRET` | Daraja API consumer secret | — |
| `MPESA_SHORTCODE` | M-Pesa business shortcode | `174379` |
| `MPESA_PASSKEY` | M-Pesa passkey | — |
| `MPESA_CALLBACK_URL` | Public URL for M-Pesa callbacks | — |
| `MPESA_ENV` | `sandbox` or `production` | `sandbox` |
| `BASE_URL` | Public base URL (used in upload URLs) | `http://localhost:3001` |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Express backend URL | `http://localhost:3001/api` |

---

## Making Yourself an Admin

After registering your account, run this in a Node REPL or add a one-time script:

```js
const db = require("./db/init");
const { v4: uuidv4 } = require("uuid");

const user = db.prepare("SELECT id FROM users WHERE email = ?").get("your@email.com");
db.prepare("UPDATE user_roles SET role = 'admin' WHERE user_id = ?").run(user.id);
console.log("Done! You are now an admin.");
```

Or run it directly from the backend folder:

```bash
node -e "
const db = require('./db/init');
const user = db.prepare('SELECT id FROM users WHERE email = ?').get('your@email.com');
db.prepare('UPDATE user_roles SET role = ?WHERE user_id = ?').run('admin', user.id);
console.log('Admin role set!');
"
```

---

## API Reference

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login, get JWT |
| GET | `/api/auth/me` | Yes | Get current user |
| PUT | `/api/auth/profile` | Yes | Update profile |

### Properties
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/properties` | Optional | List properties (with filters) |
| GET | `/api/properties/mine` | Yes | My listings |
| GET | `/api/properties/:id` | Optional | Get single property |
| POST | `/api/properties` | Yes | Create property |
| PUT | `/api/properties/:id` | Yes | Update property |
| DELETE | `/api/properties/:id` | Yes | Delete property |
| PUT | `/api/properties/:id/approve` | Admin | Approve property |
| PUT | `/api/properties/:id/featured` | Admin | Toggle featured |

### Other Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/categories` | No | Property categories |
| GET | `/api/locations` | No | Locations |
| GET | `/api/agents` | No | Verified agents |
| GET | `/api/stats` | No | Platform stats |
| GET/POST/DELETE | `/api/favorites` | Yes | Manage favorites |
| POST | `/api/inquiries` | No | Submit inquiry |
| GET/POST | `/api/conversations` | Yes | Messaging |
| GET/POST/PUT | `/api/conversations/:id/messages` | Yes | Messages |
| POST | `/api/payments/mpesa/stk-push` | Yes | Initiate M-Pesa payment |
| POST | `/api/payments/mpesa/callback` | No | M-Pesa callback (Safaricom) |
| GET | `/api/wallet` | Yes | My wallet |
| GET | `/api/wallet/transactions` | Yes | My transactions |
| POST | `/api/upload/image` | Yes | Upload image |
| GET | `/api/admin/*` | Admin | All admin endpoints |

---

## Deployment

### Backend (e.g. Railway, Render, VPS)

1. Set all environment variables in your host dashboard
2. Set `MPESA_CALLBACK_URL` to your public backend URL + `/api/payments/mpesa/callback`
3. Set `MPESA_ENV=production` when going live
4. Run `npm start`

### Frontend (e.g. Vercel, Netlify)

1. Set `VITE_API_URL` to your deployed backend URL (e.g. `https://api.yourdomain.com/api`)
2. Run `npm run build` — deploy the `dist/` folder

---

## Key Differences from Supabase Version

| Feature | Supabase version | This version |
|---------|-----------------|--------------|
| Auth | Supabase Auth (magic links, sessions) | JWT in localStorage |
| Database | PostgreSQL (Supabase hosted) | SQLite (local file) |
| Realtime | Supabase Realtime subscriptions | HTTP polling every 3s |
| Storage | Supabase Storage buckets | Local disk (`/uploads`) |
| Edge Functions | Supabase Edge Functions (Deno) | Express routes (Node.js) |
| M-Pesa | Called from Edge Function | Called from Express route |
