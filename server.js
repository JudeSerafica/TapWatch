import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import nodemailer from 'nodemailer'
import bcrypt from 'bcryptjs'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import { randomInt } from 'crypto'
 
const app = express()
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
  methods: ['POST'],
  credentials: true,
}))
app.use(express.json())
 
// ── In-memory OTP store ────────────────────────────────────────────────────
const otpStore = new Map()
// ── Rate limiting for OTP requests (prevent spam/double sends) ────────────
const otpRequestCooldown = new Map() // email -> timestamp of last request
// ── Verify attempt tracking (prevent brute force) ────────────────────────
const verifyAttempts = new Map() // email -> { count, resetTime }

// ── Sweep stale entries so Maps don't grow unbounded ─────────────────────
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of otpStore)          if (now > v.expiresAt)    otpStore.delete(k)
  for (const [k, v] of verifyAttempts)    if (now > v.resetTime)    verifyAttempts.delete(k)
  for (const [k, t] of otpRequestCooldown) if (now - t > 60000)     otpRequestCooldown.delete(k)
}, 60000)

// ── Gmail transporter ──────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

// ── Supabase client (service role to bypass RLS) ──────────────────────────
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)
 
// ── POST /api/signup — send OTP ────────────────────────────────────────────
app.post('/api/signup', async (req, res) => {
  const { email, password } = req.body
 
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' })
 
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' })
 
  // Check if OTP was recently sent to this email (prevent spam in 30 seconds)
  const emailLower = email.toLowerCase()
  const lastRequestTime = otpRequestCooldown.get(emailLower)
  const now = Date.now()
  
  if (lastRequestTime && (now - lastRequestTime) < 30000) {
    const waitSeconds = Math.ceil((30000 - (now - lastRequestTime)) / 1000)
    return res.status(429).json({ 
      error: `Please wait ${waitSeconds} seconds before requesting another code.` 
    })
  }
 
  try {
    const passwordHash = await bcrypt.hash(password, 10)
    const code = (100000 + randomInt(900000)).toString()
    const expiresAt = Date.now() + 5 * 60 * 1000
 
    otpStore.set(emailLower, { code, expiresAt, passwordHash })
    otpRequestCooldown.set(emailLower, now)
    console.log(`[OTP] code issued for ${emailLower}`)
 
    const mailResult = await transporter.sendMail({
      from: `"Tap-Watch" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Your Tap-Watch Verification Code',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
          <h2 style="color:#1d4ed8;margin-bottom:8px;">Tap-Watch</h2>
          <p style="color:#374151;font-size:15px;">Your verification code is:</p>
          <div style="font-size:42px;font-weight:bold;letter-spacing:12px;color:#1d4ed8;margin:24px 0;">${code}</div>
          <p style="color:#6b7280;font-size:13px;">This code expires in <strong>5 minutes</strong>.</p>
          <p style="color:#6b7280;font-size:13px;">If you did not request this, you can safely ignore this email.</p>
          <hr style="margin:24px 0;border-color:#e5e7eb;"/>
          <p style="color:#9ca3af;font-size:12px;">Barangay East Tapinac — Community Emergency Monitoring System</p>
        </div>
      `,
    })
    
    console.log(`[EMAIL SENT] ${email} — Message ID: ${mailResult.messageId}`)
    return res.status(200).json({ message: 'Verification code sent to your email.' })
  } catch (err) {
    console.error('[/api/signup ERROR]', err.message, err.code)
    return res.status(500).json({ error: 'Unable to send verification code. Please try again.' })
  }
})
 
// ── POST /api/verify — verify OTP ─────────────────────────────────────────
app.post('/api/verify', async (req, res) => {
  const { email, code, password, name } = req.body
 
  if (!email || !code || !password)
    return res.status(400).json({ error: 'Email, code, and password are required.' })
 
  const emailLower = email.toLowerCase()
  
  // Rate limit: max 5 attempts per 15 minutes
  const now = Date.now()
  const attempts = verifyAttempts.get(emailLower) || { count: 0, resetTime: now + 15 * 60 * 1000 }
  
  if (now > attempts.resetTime) {
    // Reset counter after time window expires
    attempts.count = 0
    attempts.resetTime = now + 15 * 60 * 1000
  }
  
  if (attempts.count >= 5) {
    return res.status(429).json({ 
      error: 'Too many verification attempts. Please try again later.' 
    })
  }
  
  attempts.count++
  verifyAttempts.set(emailLower, attempts)
 
  const record = otpStore.get(emailLower)
 
  if (!record)
    return res.status(400).json({ error: 'No verification code found. Please sign up again.' })
 
  if (Date.now() > record.expiresAt) {
    otpStore.delete(emailLower)
    return res.status(400).json({ error: 'Verification code expired. Please sign up again.' })
  }
 
  if (record.code !== code.trim())
    return res.status(400).json({ error: 'Incorrect verification code. Please try again.' })
 
  // OTP verified — now create the user in Supabase
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: emailLower,
      password: password.trim(),
      user_metadata: {
        full_name: name || emailLower.split('@')[0],
      },
      email_confirm: true, // Auto-confirm email since we verified via OTP
    })

    if (error) {
      console.error('[VERIFY ERROR] Supabase user creation failed:', error)
      // Map known Supabase errors to friendly messages; never return raw error.message
      const msg = error.message || ''
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        return res.status(400).json({ error: 'An account with this email already exists.' })
      }
      return res.status(400).json({ error: 'Unable to create account. Please try again.' })
    }

    otpStore.delete(emailLower)
    verifyAttempts.delete(emailLower)

    console.log(`[VERIFY] User created in Supabase: ${emailLower}`)
    return res.status(200).json({ 
      message: 'Email verified successfully. Account created.', 
      user: data.user 
    })
  } catch (err) {
    console.error('[VERIFY CATCH ERROR]', err.message)
    return res.status(500).json({ error: 'Unable to verify code. Please try again.' })
  }
})

// ── POST /api/ai/classify — OpenAI text classification proxy ───────────────
app.post('/api/ai/classify', async (req, res) => {
  const { description } = req.body
  if (!description) return res.status(400).json({ error: 'description required' })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY not configured on server' })

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an emergency incident classifier for a barangay in the Philippines. Classify into exactly one of: Crime, Fire, Flood, Accident, Disturbance. Respond with ONLY valid JSON, no markdown.'
          },
          {
            role: 'user',
            content: `Classify this incident: "${description}"\n\nRespond ONLY with this JSON:\n{"type":"Fire","confidence":0.9,"urgency":"critical","keywords":["fire"],"reasoning":"one sentence"}`
          }
        ],
        temperature: 0.2,
        max_tokens: 300,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[AI/classify] OpenAI error:', response.status, err.substring(0, 200))
      return res.status(502).json({ error: 'AI classification unavailable. Please try again.' })
    }

    const data = await response.json()
    res.json({ content: data.choices[0].message.content })
  } catch (err) {
    console.error('[AI/classify] error:', err.message)
    res.status(500).json({ error: 'AI classification unavailable. Please try again.' })
  }
})

// ── POST /api/ai/analyze-image — OpenAI GPT-4o vision proxy ──────────────
app.post('/api/ai/analyze-image', async (req, res) => {
  const { imageDataUrl } = req.body
  if (!imageDataUrl) return res.status(400).json({ error: 'imageDataUrl required' })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY not configured on server' })

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: imageDataUrl, detail: 'low' }
            },
            {
              type: 'text',
              text: `Analyze this image from a Philippine barangay emergency app. Respond with ONLY valid JSON (no markdown):\n{"type":"Fire","confidence":0.95,"urgency":"critical","detected":["flames","smoke"],"hasVictims":false,"environmentalHazards":["fire"],"recommendedAction":"Dispatch fire department","reasoning":"Truck on fire on a road.","isIncidentRelated":true,"nonIncidentReason":"","isAuthentic":true,"authenticityConfidence":0.9,"manipulationDetected":false,"fakeness_indicators":[],"authenticity_reasoning":"Real photo","image_source":"real_photo"}\n\nType rules: Fire=flames/smoke/burning, Flood=water/flooded roads, Crime=robbery/violence, Accident=vehicle crash, Disturbance=fight/riot, Unknown=selfie/food/unrelated`
            }
          ]
        }],
        temperature: 0.2,
        max_tokens: 600,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[AI/analyze-image] OpenAI error:', response.status, err.substring(0, 200))
      return res.status(502).json({ error: 'AI image analysis unavailable. Please try again.' })
    }

    const data = await response.json()
    res.json({ content: data.choices[0].message.content })
  } catch (err) {
    console.error('[AI/analyze-image] error:', err.message)
    res.status(500).json({ error: 'AI image analysis unavailable. Please try again.' })
  }
})

// ── PHONE AUTH ROUTES ─────────────────────────────────────────────────────────
// Shared helper: normalise Philippine mobile number to E.164 (+63XXXXXXXXXX)
function normalizePH(raw) {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('639') && digits.length === 12) return `+${digits}`
  if (digits.startsWith('09')  && digits.length === 11) return `+63${digits.slice(1)}`
  if (digits.startsWith('63')  && digits.length === 12) return `+${digits}`
  return null
}

// In-memory guards (reset on server restart — acceptable for dev)
const phoneSendCooldown = new Map()   // e164 → timestamp
const phoneAttempts     = new Map()   // e164 → { count, resetAt }

// ── POST /api/phone/send-otp  (login: send OTP) ───────────────────────────
app.post('/api/phone/send-otp', async (req, res) => {
  const { phone } = req.body
  if (!phone) return res.status(400).json({ error: 'Phone number is required.' })

  const e164 = normalizePH(phone)
  if (!e164) return res.status(400).json({ error: 'Invalid Philippine mobile number. Please enter a valid 09XX XXX XXXX number.' })

  const now      = Date.now()
  const lastSent = phoneSendCooldown.get(e164) || 0
  const elapsed  = now - lastSent

  if (elapsed < 60_000) {
    const wait = Math.ceil((60_000 - elapsed) / 1000)
    return res.status(429).json({ error: `Please wait ${wait} second${wait !== 1 ? 's' : ''} before requesting another code.`, waitSeconds: wait })
  }

  const { error } = await supabase.auth.signInWithOtp({ phone: e164 })

  if (error) {
    console.error('[phone/send-otp]', error.message)
    const msg = error.message || ''
    if (msg.includes('rate limit') || msg.includes('too many')) return res.status(429).json({ error: 'Too many OTP requests. Please wait a moment.' })
    if (msg.includes('not found') || msg.includes('not exist')) return res.status(400).json({ error: 'No account found for this number. Please sign up first.' })
    return res.status(400).json({ error: 'Failed to send OTP. Please check your number and try again.' })
  }

  phoneSendCooldown.set(e164, now)
  console.log(`[phone/send-otp] OTP sent to ${e164.slice(0, 5)}***`)
  return res.status(200).json({ message: 'OTP sent successfully.', phone: e164 })
})

// ── POST /api/phone/verify-otp  (login: verify OTP) ──────────────────────
app.post('/api/phone/verify-otp', async (req, res) => {
  const { phone, token } = req.body
  if (!phone || !token) return res.status(400).json({ error: 'Phone number and OTP code are required.' })

  const otp = token.replace(/\D/g, '').slice(0, 6)
  if (otp.length !== 6) return res.status(400).json({ error: 'OTP must be exactly 6 digits.' })

  const e164 = normalizePH(phone)
  if (!e164) return res.status(400).json({ error: 'Invalid phone number format.' })

  const now      = Date.now()
  const attempts = phoneAttempts.get(`login:${e164}`) || { count: 0, resetAt: now + 15 * 60_000 }
  if (now > attempts.resetAt) { attempts.count = 0; attempts.resetAt = now + 15 * 60_000 }
  if (attempts.count >= 5) return res.status(429).json({ error: 'Too many failed attempts. Please request a new OTP and try again.' })
  attempts.count++
  phoneAttempts.set(`login:${e164}`, attempts)

  const { data, error } = await supabase.auth.verifyOtp({ phone: e164, token: otp, type: 'sms' })

  if (error) {
    console.error('[phone/verify-otp]', error.message)
    const msg = error.message || ''
    if (msg.includes('expired'))  return res.status(400).json({ error: 'OTP has expired. Please request a new code.' })
    if (msg.includes('invalid') || msg.includes('incorrect') || msg.includes('Token has')) return res.status(400).json({ error: 'Invalid OTP. Please check the code and try again.' })
    return res.status(400).json({ error: 'OTP verification failed. Please try again.' })
  }

  if (!data?.session) return res.status(400).json({ error: 'OTP verification failed. Please try again.' })

  phoneAttempts.delete(`login:${e164}`)
  console.log(`[phone/verify-otp] Verified: ${e164.slice(0, 5)}***`)
  return res.status(200).json({
    message: 'Phone number verified successfully!',
    session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token, expires_in: data.session.expires_in },
  })
})

// ── POST /api/phone/signup  (signup: send OTP) ────────────────────────────
app.post('/api/phone/signup', async (req, res) => {
  const { phone, password, name } = req.body
  if (!phone)    return res.status(400).json({ error: 'Phone number is required.' })
  if (!password) return res.status(400).json({ error: 'Password is required.' })
  if (!name)     return res.status(400).json({ error: 'Full name is required.' })
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' })

  const e164 = normalizePH(phone)
  if (!e164) return res.status(400).json({ error: 'Invalid Philippine mobile number. Please enter a valid 09XX XXX XXXX number.' })

  const now      = Date.now()
  const lastSent = phoneSendCooldown.get(`signup:${e164}`) || 0
  const elapsed  = now - lastSent

  if (elapsed < 60_000) {
    const wait = Math.ceil((60_000 - elapsed) / 1000)
    return res.status(429).json({ error: `Please wait ${wait} second${wait !== 1 ? 's' : ''} before requesting another code.`, waitSeconds: wait })
  }

  // Check phone not already registered
  const { data: existingProfile } = await supabase.from('profiles').select('id').eq('phone', e164).maybeSingle()
  if (existingProfile) return res.status(400).json({ error: 'This phone number is already registered. Please log in instead.' })

  const { error } = await supabase.auth.signUp({
    phone: e164,
    password: password.trim(),
    options: { data: { full_name: name.trim() } },
  })

  if (error) {
    console.error('[phone/signup]', error.message)
    const msg = error.message || ''
    if (msg.includes('already registered') || msg.includes('already been registered')) return res.status(400).json({ error: 'This phone number is already registered. Please log in instead.' })
    if (msg.includes('rate limit') || msg.includes('too many')) return res.status(429).json({ error: 'Too many requests. Please wait a moment.' })
    if (msg.includes('Invalid phone')) return res.status(400).json({ error: 'Invalid phone number. Please use a valid Philippine mobile number.' })
    return res.status(400).json({ error: 'Failed to send OTP. Please try again.' })
  }

  phoneSendCooldown.set(`signup:${e164}`, now)
  console.log(`[phone/signup] OTP sent to ${e164.slice(0, 5)}***`)
  return res.status(200).json({ message: 'OTP sent to your phone. Please enter the 6-digit code.', phone: e164 })
})

// ── POST /api/phone/verify-signup  (signup: verify OTP + create profile) ──
app.post('/api/phone/verify-signup', async (req, res) => {
  const { phone, token, name } = req.body
  if (!phone || !token) return res.status(400).json({ error: 'Phone number and OTP code are required.' })

  const otp = token.replace(/\D/g, '').slice(0, 6)
  if (otp.length !== 6) return res.status(400).json({ error: 'OTP must be exactly 6 digits.' })

  const e164 = normalizePH(phone)
  if (!e164) return res.status(400).json({ error: 'Invalid phone number format.' })

  const now      = Date.now()
  const attempts = phoneAttempts.get(`signup:${e164}`) || { count: 0, resetAt: now + 15 * 60_000 }
  if (now > attempts.resetAt) { attempts.count = 0; attempts.resetAt = now + 15 * 60_000 }
  if (attempts.count >= 5) return res.status(429).json({ error: 'Too many failed attempts. Please request a new OTP and try again.' })
  attempts.count++
  phoneAttempts.set(`signup:${e164}`, attempts)

  const { data, error } = await supabase.auth.verifyOtp({ phone: e164, token: otp, type: 'sms' })

  if (error) {
    console.error('[phone/verify-signup]', error.message)
    const msg = error.message || ''
    if (msg.includes('expired'))  return res.status(400).json({ error: 'OTP has expired. Please request a new code.' })
    if (msg.includes('invalid') || msg.includes('incorrect') || msg.includes('Token has')) return res.status(400).json({ error: 'Invalid OTP. Please check the code and try again.' })
    return res.status(400).json({ error: 'OTP verification failed. Please try again.' })
  }

  if (!data?.session || !data?.user) return res.status(400).json({ error: 'OTP verification failed. Please try again.' })

  const authUser  = data.user
  const fullName  = (name || '').trim() || authUser.user_metadata?.full_name || 'Resident'

  await supabase.from('profiles').upsert(
    { id: authUser.id, full_name: fullName, phone: e164, role: 'resident', updated_at: new Date().toISOString() },
    { onConflict: 'id', ignoreDuplicates: false }
  )

  phoneAttempts.delete(`signup:${e164}`)
  console.log(`[phone/verify-signup] Signup verified: ${e164.slice(0, 5)}***`)

  return res.status(200).json({
    message: 'Phone number verified successfully! Account created.',
    session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token, expires_in: data.session.expires_in },
  })
})

// ── POST /api/admin/delete-user — permanently delete a user from auth + profile ──
app.post('/api/admin/delete-user', async (req, res) => {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'userId is required.' })

  try {
    // Delete from Supabase Auth (removes auth.users entry completely)
    const { error: authError } = await supabase.auth.admin.deleteUser(userId)
    if (authError) {
      console.error('[DELETE USER] Auth delete error:', authError.message)
      return res.status(500).json({ error: 'Failed to delete user from auth.' })
    }

    // Profile row is deleted automatically via ON DELETE CASCADE on the profiles table
    // but delete explicitly as a safety net in case cascade is not set
    await supabase.from('profiles').delete().eq('id', userId)

    console.log(`[DELETE USER] User ${userId} permanently deleted.`)
    return res.status(200).json({ message: 'User permanently deleted.' })
  } catch (err) {
    console.error('[DELETE USER] Unexpected error:', err.message)
    return res.status(500).json({ error: 'Failed to delete user. Please try again.' })
  }
})

// ── Start server ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`)
  console.log(`🤖 OpenAI API Key: ${process.env.OPENAI_API_KEY ? '✅ Loaded (' + process.env.OPENAI_API_KEY.substring(0, 8) + '...)' : '❌ NOT FOUND'}`)
})