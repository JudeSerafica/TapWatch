/**
 * POST /api/phone/send-otp
 *
 * Login flow: send a real SMS OTP to an existing phone number via Supabase Auth.
 * Supabase triggers the configured SMS provider (Twilio, MessageBird, etc.)
 * from the Supabase dashboard — no SMS credentials needed here.
 *
 * Security:
 *  - Rate-limited: 60-second cooldown per phone number.
 *  - Service-role key is NEVER sent to the frontend.
 *  - Phone number is normalised to E.164 before any operation.
 */

import { createClient } from '@supabase/supabase-js'

// In-memory rate-limit store (resets on server restart; fine for serverless cold starts)
// Maps normalised phone → timestamp of last OTP request
const sendCooldown = new Map()

/** Normalise Philippine mobile number to E.164 (+63XXXXXXXXXX) */
function normalizePH(raw) {
  const digits = raw.replace(/\D/g, '')

  // +639XXXXXXXXX  →  strip leading +
  if (digits.startsWith('639') && digits.length === 12) return `+${digits}`

  // 09XXXXXXXXX  →  replace leading 0 with +63
  if (digits.startsWith('09') && digits.length === 11) return `+63${digits.slice(1)}`

  // Already in E.164 without leading +  (639XXXXXXXXX 12 digits)
  if (digits.startsWith('63') && digits.length === 12) return `+${digits}`

  return null // invalid
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
    console.error('[phone/send-otp] Missing Supabase env vars')
    return res.status(500).json({ error: 'Server configuration error. Please contact support.' })
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  const { phone } = req.body
  if (!phone) return res.status(400).json({ error: 'Phone number is required.' })

  const e164 = normalizePH(phone)
  if (!e164) {
    return res.status(400).json({
      error: 'Invalid Philippine mobile number. Please enter a valid 09XX XXX XXXX number.',
    })
  }

  // ── Rate limit: 60-second cooldown ───────────────────────────────────────
  const now      = Date.now()
  const lastSent = sendCooldown.get(e164) || 0
  const elapsed  = now - lastSent

  if (elapsed < 60_000) {
    const wait = Math.ceil((60_000 - elapsed) / 1000)
    return res.status(429).json({
      error: `Please wait ${wait} second${wait !== 1 ? 's' : ''} before requesting another code.`,
      waitSeconds: wait,
    })
  }

  // ── Send OTP via Supabase Auth (triggers configured SMS provider) ─────────
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error } = await supabase.auth.signInWithOtp({ phone: e164 })

  if (error) {
    console.error('[phone/send-otp] Supabase error:', error.message)

    // Map Supabase errors to user-friendly messages
    const msg = error.message || ''
    if (msg.includes('rate limit') || msg.includes('too many')) {
      return res.status(429).json({ error: 'Too many OTP requests. Please wait a moment and try again.' })
    }
    if (msg.includes('not found') || msg.includes('not exist')) {
      return res.status(400).json({ error: 'No account found for this number. Please sign up first.' })
    }
    return res.status(400).json({ error: 'Failed to send OTP. Please check your number and try again.' })
  }

  sendCooldown.set(e164, now)

  // Sweep stale cooldown entries (> 2 min old)
  if (sendCooldown.size > 500) {
    for (const [k, t] of sendCooldown) {
      if (now - t > 120_000) sendCooldown.delete(k)
    }
  }

  console.log(`[phone/send-otp] OTP sent to ${e164.slice(0, 5)}***`)
  return res.status(200).json({
    message: 'OTP sent successfully.',
    phone: e164, // masked display: caller should mask it
  })
}
