# TapWatch — Barangay East Tapinac Community Emergency Monitoring System

A Progressive Web App (PWA) for reporting, tracking, and responding to incidents in Barangay East Tapinac, Imus, Cavite.

---

## Architecture

```
Browser (React PWA)
  └── Vite build → dist/          Static assets served by Vercel CDN
  └── /api/* routes               Vercel Serverless Functions (Node.js)
        ├── /api/signup           Send OTP verification email
        ├── /api/verify           Verify OTP + create Supabase user
        ├── /api/ai/classify      Proxy → OpenAI GPT-4o-mini (text)
        └── /api/ai/analyze-image Proxy → OpenAI GPT-4o (vision)

Supabase (PostgreSQL + Auth + Storage)
  ├── incidents table             Core incident reports + SOS alerts
  ├── profiles table              User profiles + roles (resident / admin)
  ├── emergency_contacts table    Barangay officials directory
  ├── notifications table         In-app notification feed
  └── emergency-contacts bucket   Official profile photos
```

---

## Environment Variables

**Never commit real values.** Copy `.env.example` (or set these in Vercel dashboard):

| Variable | Used by | Description |
|----------|---------|-------------|
| `VITE_SUPABASE_URL` | Client | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Client | Supabase anonymous key (safe to expose) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Supabase service role (never VITE_ prefix) |
| `OPENAI_API_KEY` | Server only | OpenAI API key (never VITE_ prefix) |
| `GMAIL_USER` | Server only | Gmail address for OTP emails |
| `GMAIL_APP_PASSWORD` | Server only | Gmail app password |
| `RESEND_API_KEY` | Server only | Resend API key (alternative mailer) |
| `ALLOWED_ORIGIN` | Server only | Allowed CORS origin (production URL) |

> **Rule:** Any variable prefixed `VITE_` is inlined into the browser bundle by Vite. Never put secrets there.

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in values
cp .env.example .env   # then edit .env

# 3. Run database migrations (Supabase SQL Editor)
#    docs/EMERGENCY_CONTACTS_MIGRATION.sql

# 4. Start development server + Express API
npm run dev            # Vite on :5173
node server.js         # Express on :5000 (proxied via vite.config.js)

# 5. Run tests
npm test

# 6. Lint
npm run lint
```

---

## Deployment (Vercel)

1. Push to GitHub
2. Connect repo in Vercel dashboard
3. Set all environment variables (non-`VITE_` ones) in Vercel → Settings → Environment Variables
4. Deploy — `vercel.json` handles SPA rewrites, security headers, and API routing

---

## Key Pages

| Route | Role | Description |
|-------|------|-------------|
| `/` | Public | Landing page |
| `/login` | Public | Sign in |
| `/signup` | Public | Register with email OTP |
| `/dashboard` | Resident | Incident feed + SOS button |
| `/report` | Resident | Submit incident report |
| `/resident-map` | Resident | Live incident map |
| `/verification` | Resident | ID verification center |
| `/admin` | Admin | Admin dashboard |
| `/admin-reports` | Admin | All reports management |
| `/admin-map` | Admin | Admin incident map |
| `/admin-analytics` | Admin | Analytics + heatmap |
| `/admin-contacts` | Admin | Barangay officials directory |
| `/admin-settings` | Admin | System settings |

---

## Docs

Additional documentation is in the `/docs` folder:

- `SOS_LOCATION_FLOW.md` — SOS GPS flow explanation
- `EMERGENCY_LOCATION_FIX.md` — Location fix notes
- `GPS_DIAGNOSTIC_GUIDE.md` — GPS troubleshooting
- `TEST_CALLING_SYSTEM.md` — WebRTC calling system notes
