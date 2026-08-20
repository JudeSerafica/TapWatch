/**
 * POST /api/phone/signup
 *
 * Sign-up flow step 1: validate a PH mobile number, check it isn't
 * already registered, then trigger an SMS OTP via Supabase Auth.
 *
 * The OTP is sent by Supabase (via configured provider — Twilio, etc.)
 * We never generate or store the OTP ourselves.
 *
 * Security:
 *  - 60-second resend cooldown per phone.
 *  - Service-role key never leaves the server.
 *  - Phone normalised to E.164 before storage lookup.
 */

import { createClient } from '@supabase/supabase-js'

const sendCooldown = new Map() // e164 → timestamp

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
  const { phone, password, name } = req.body

  if (!phone)    return res.status(400).json({ error: 'Phone number is required.' })
  if (!password) return res.status(400).json({ error: 'Password is required.' })
  if (!name)     return res.status(400).json({ error: 'Full name is required.' })

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' })
  }

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

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── Check if phone is already registered ─────────────────────────────────
  // We query the profiles table (phone column stores normalised numbers)
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone', e164)
    .maybeSingle()

  if (existingProfile) {
    return res.status(400).json({
      error: 'This phone number is already registered. Please log in instead.',
    })
  }

  // ── Send OTP via Supabase Auth ────────────────────────────────────────────
  // signUp with phone triggers a real SMS OTP from the configured provider.
  // Supabase creates an unconfirmed user; it is confirmed after OTP verification.
  const { error } = await supabase.auth.signUp({
    phone: e164,
    password: password.trim(),
    options: {
      data: { full_name: name.trim() },
    },
  })

  if (error) {
    console.error('[phone/signup] Supabase error:', error.message)
    const msg = error.message || ''

    if (msg.includes('already registered') || msg.includes('already been registered')) {
      return res.status(400).json({
        error: 'This phone number is already registered. Please log in instead.',
      })
    }
    if (msg.includes('rate limit') || msg.includes('too many')) {
      return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' })
    }
    if (msg.includes('Invalid phone')) {
      return res.status(400).json({ error: 'Invalid phone number. Please use a valid Philippine mobile number.' })
    }
    return res.status(400).json({ error: 'Failed to send OTP. Please try again.' })
  }

  sendCooldown.set(e164, now)

  // Sweep stale entries
  if (sendCooldown.size > 500) {
    for (const [k, t] of sendCooldown) {
      if (now - t > 120_000) sendCooldown.delete(k)
    }
  }

  console.log(`[phone/signup] OTP sent to ${e164.slice(0, 5)}***`)
  return res.status(200).json({
    message: 'OTP sent to your phone. Please enter the 6-digit code.',
    phone: e164,
  })
}
