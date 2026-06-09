import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import nodemailer from 'nodemailer'
import bcrypt from 'bcryptjs'
import cors from 'cors'
 
const app = express()
app.use(cors())
app.use(express.json())
 
// ── In-memory OTP store ────────────────────────────────────────────────────
const otpStore = new Map()
// ── Rate limiting for OTP requests (prevent spam/double sends) ────────────
const otpRequestCooldown = new Map() // email -> timestamp of last request
// ── Verify attempt tracking (prevent brute force) ────────────────────────
const verifyAttempts = new Map() // email -> { count, resetTime }

// ── Gmail transporter ──────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})
 
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
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = Date.now() + 5 * 60 * 1000
 
    otpStore.set(emailLower, { code, expiresAt, passwordHash })
    otpRequestCooldown.set(emailLower, now)
    console.log(`[OTP] ${email} → ${code}`)
 
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
    if (err.code === 'EAUTH')
      return res.status(500).json({ error: 'Gmail auth failed. Check GMAIL_USER and GMAIL_APP_PASSWORD in .env' })
    if (err.message.includes('Invalid login'))
      return res.status(500).json({ error: 'Gmail credentials invalid. Check .env file.' })
    return res.status(500).json({ error: `Failed to send email: ${err.message}` })
  }
})
 
// ── POST /api/verify — verify OTP ─────────────────────────────────────────
app.post('/api/verify', async (req, res) => {
  const { email, code, password } = req.body
 
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
 
  otpStore.delete(emailLower)
  verifyAttempts.delete(emailLower) // Clear attempts on success
 
  console.log(`[VERIFY] OTP verified for: ${email}`)
  return res.status(200).json({ message: 'OTP verified successfully.' })
})
 
// ── Start server ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`))