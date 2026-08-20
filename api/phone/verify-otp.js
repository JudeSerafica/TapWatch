/**
 * POST /api/phone/verify-otp
 *
 * Login flow: verify the 6-digit SMS OTP against Supabase Auth.
 * On success returns the Supabase access_token + refresh_token so the
 * frontend can call supabase.auth.setSession() and get a real session.
 *
 * Security:
 *  - Brute-force protection: max 5 attempts per phone per 15 minutes.
 *  - Service-role key stays on the server.
 *  - Only the sanitised session tokens are returned (no raw user data).
 */

import { createClient } from '@supabase/supabase-js'

// In-memory brute-force guard
const attemptStore = new Map() // e164 → { count, resetAt }

/** Normalise Philippine mobile number to E.164 (+63XXXXXXXXXX) */
function normalizePH(raw) {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('639') && digits.length === 12) return `+${digits}`
  if (digits.startsWith('09')  && digits.length === 11) return `+63${digits.slice(1)}`
  if (digits.startsWith('63')  && digits.length === 12) return `+${digits}`
  return null
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // ── Env check ─────────────────────────────────────────────────────────────
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Server configuration error. Please contact support.' })
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  const { phone, token } = req.body
  if (!phone || !token) return res.status(400).json({ error: 'Phone number and OTP code are required.' })

  const otp = token.replace(/\D/g, '').slice(0, 6)
  if (otp.length !== 6) return res.status(400).json({ error: 'OTP must be exactly 6 digits.' })

  const e164 = normalizePH(phone)
  if (!e164) return res.status(400).json({ error: 'Invalid phone number format.' })

  // ── Brute-force guard ─────────────────────────────────────────────────────
  const now      = Date.now()
  const attempts = attemptStore.get(e164) || { count: 0, resetAt: now + 15 * 60_000 }

  if (now > attempts.resetAt) {
    attempts.count   = 0
    attempts.resetAt = now + 15 * 60_000
  }

  if (attempts.count >= 5) {
    return res.status(429).json({
      error: 'Too many failed attempts. Please request a new OTP and try again.',
    })
  }

  attempts.count++
  attemptStore.set(e164, attempts)

  // ── Verify OTP via Supabase Auth ──────────────────────────────────────────
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await supabase.auth.verifyOtp({
    phone: e164,
    token: otp,
    type: 'sms',
  })

  if (error) {
    console.error('[phone/verify-otp] Supabase error:', error.message)
    const msg = error.message || ''

    if (msg.includes('expired')) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new code.' })
    }
    if (msg.includes('invalid') || msg.includes('incorrect') || msg.includes('Token has')) {
      return res.status(400).json({ error: 'Invalid OTP. Please check the code and try again.' })
    }
    return res.status(400).json({ error: 'OTP verification failed. Please try again.' })
  }

  if (!data?.session) {
    return res.status(400).json({ error: 'OTP verification failed. Please try again.' })
  }

  // Clear brute-force counter on success
  attemptStore.delete(e164)

  console.log(`[phone/verify-otp] Verified: ${e164.slice(0, 5)}***`)

  return res.status(200).json({
    message: 'Phone number verified successfully!',
    session: {
      access_token:  data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in:    data.session.expires_in,
    },
  })
}
