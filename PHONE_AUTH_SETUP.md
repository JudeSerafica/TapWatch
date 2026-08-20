# Phone Authentication Setup Guide

This document covers everything needed to make real SMS OTP authentication
work in production (Supabase + Twilio).

---

## 1. Enable Phone Auth in Supabase Dashboard

1. Open your project at https://supabase.com/dashboard
2. Go to **Authentication → Providers → Phone**
3. Toggle **Enable phone sign-in** → ON
4. Set **OTP expiry** to `600` (10 minutes)
5. Choose **SMS provider** → select **Twilio** (recommended for the Philippines)
6. Enter your Twilio credentials:
   - **Account SID** — from https://console.twilio.com
   - **Auth Token** — from https://console.twilio.com
   - **Message Service SID or From Number** — your verified Twilio number (`+1XXXXXXXXXX`)
7. Click **Save**

> Supabase automatically sends the OTP SMS. No additional code changes are needed.

---

## 2. Supported Philippine Mobile Networks

The SMS OTP works with all major PH networks via Twilio:

| Network | Prefix |
|---------|--------|
| Globe   | 0917, 0927, 0977, 0978 |
| TM      | 0907, 0912, 0930, 0950 |
| Smart   | 0908, 0919, 0921, 0928 |
| Sun     | 0922, 0923, 0932, 0933 |
| TNT     | 0907, 0912, 0930 |
| DITO    | 0895, 0896, 0897, 0898 |

Number format accepted by the app: `09XX XXX XXXX` or `+639XX XXX XXXX`
Both are normalised to E.164 (`+639XXXXXXXXX`) before sending.

---

## 3. Environment Variables

### Local Development (`.env`)

Already configured — `SUPABASE_SERVICE_ROLE_KEY` is present in `.env`.
The key is used server-side only (`/api/phone/*` endpoints) and is never
exposed to the browser.

### Vercel Production

Add these in the **Vercel Dashboard → Project → Settings → Environment Variables**:

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_SUPABASE_URL` | your Supabase project URL | Already in .env |
| `VITE_SUPABASE_ANON_KEY` | your anon key | Already in .env |
| `SUPABASE_SERVICE_ROLE_KEY` | your service_role key | **Must add manually — no VITE_ prefix** |
| `GMAIL_USER` | Gmail address | For email OTP |
| `GMAIL_APP_PASSWORD` | Gmail app password | For email OTP |

> **Important:** `SUPABASE_SERVICE_ROLE_KEY` does NOT have a `VITE_` prefix.
> Vite only exposes `VITE_*` variables to the browser bundle. This key must
> remain server-side only. Make sure it is added exactly as `SUPABASE_SERVICE_ROLE_KEY`
> in Vercel, not as `VITE_SUPABASE_SERVICE_ROLE_KEY`.

---

## 4. API Endpoints (Server-Side)

All phone auth calls go through these server-side endpoints.
No Supabase service key or SMS provider secret ever touches the frontend.

| Endpoint | Purpose |
|----------|---------|
| `POST /api/phone/signup` | Validate PH number, check not registered, trigger SMS OTP via Supabase Auth |
| `POST /api/phone/verify-signup` | Verify OTP, confirm account, create profile row, return session tokens |
| `POST /api/phone/send-otp` | Send SMS OTP to existing registered number (login) |
| `POST /api/phone/verify-otp` | Verify OTP for login, return session tokens |

---

## 5. Security Properties

- **No OTPs stored in the database** — Supabase Auth manages the full OTP lifecycle
- **No OTPs generated in the frontend** — all generation is done by Supabase
- **Service role key is server-side only** — never in the browser bundle
- **Rate limiting** — 60-second resend cooldown per phone number
- **Brute-force protection** — max 5 verify attempts per phone per 15 minutes
- **OTP expiry** — 10 minutes (configurable in Supabase dashboard)
- **Session hydration** — `supabase.auth.setSession()` called client-side after server returns tokens

---

## 6. Testing

### Local dev with Twilio trial

Twilio trial accounts can send SMS to **verified** numbers only.
Add your test phone number at https://console.twilio.com/verified-callers.

### Supabase phone auth test mode

If you want to test without real SMS charges, enable test mode in
Supabase Dashboard → Authentication → Providers → Phone → Enable test OTPs.
You can register specific numbers with fixed OTP codes there.
**Disable test mode before going to production.**

---

## 7. Flow Summary

```
Phone Sign-Up
─────────────
User enters: name, phone (09XX...), password
  → POST /api/phone/signup
    → normalizePH(phone) → +63XX...
    → check profiles table: phone not already registered
    → supabase.auth.signUp({ phone: e164, password, data.full_name })
    → Supabase triggers SMS OTP via Twilio
  ← { message: 'OTP sent', phone: '+63...' }

User sees PhoneSignupOtpScreen (6 boxes)
  → fills 6 digits (auto-submits on complete)
  → POST /api/phone/verify-signup
    → supabase.auth.verifyOtp({ phone, token, type: 'sms' })
    → upsert profiles row (id, full_name, phone, role: 'resident')
  ← { session: { access_token, refresh_token } }

Frontend: supabase.auth.setSession(tokens)
  → AuthContext detects session → fetches profile
  → navigate('/dashboard')  or  /profile-setup if incomplete


Phone Login
───────────
User enters: phone (09XX...)
  → POST /api/phone/send-otp
    → supabase.auth.signInWithOtp({ phone: e164 })
    → Supabase triggers SMS OTP
  ← { message: 'OTP sent', phone: '+63...' }

User sees PhoneOtpScreen (6 boxes)
  → fills 6 digits (auto-submits)
  → POST /api/phone/verify-otp
    → supabase.auth.verifyOtp({ phone, token, type: 'sms' })
  ← { session: { access_token, refresh_token } }

Frontend: supabase.auth.setSession(tokens)
  → AuthContext detects session → navigate('/dashboard')
```
