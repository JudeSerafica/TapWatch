import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // ── Environment check ────────────────────────────────────────────────────
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  const gmailUser   = process.env.GMAIL_USER
  const gmailPass   = process.env.GMAIL_APP_PASSWORD

  if (!supabaseUrl || !supabaseKey) {
    console.error('[signup] Missing Supabase env vars')
    return res.status(500).json({ error: 'Server configuration error: Supabase credentials missing. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables.' })
  }
  if (!gmailUser || !gmailPass) {
    console.error('[signup] Missing Gmail env vars')
    return res.status(500).json({ error: 'Server configuration error: Gmail credentials missing. Set GMAIL_USER and GMAIL_APP_PASSWORD in Vercel environment variables.' })
  }

  // ── Init clients inside handler (safe for serverless cold starts) ────────
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Use explicit SMTP settings instead of service shorthand — more reliable on serverless
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // SSL
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  })

  const { email, password } = req.body

  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' })

  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' })

  const emailLower = email.toLowerCase().trim()

  // ── Rate limit: check if OTP was sent in last 30 seconds ─────────────────
  const { data: existing } = await supabase
    .from('otp_codes')
    .select('created_at')
    .eq('email', emailLower)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (existing) {
    const lastSent = new Date(existing.created_at).getTime()
    const diff = Date.now() - lastSent
    if (diff < 30000) {
      const waitSeconds = Math.ceil((30000 - diff) / 1000)
      return res.status(429).json({
        error: `Please wait ${waitSeconds} seconds before requesting another code.`
      })
    }
  }

  const code      = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

  // ── Store OTP in Supabase ─────────────────────────────────────────────────
  await supabase.from('otp_codes').delete().eq('email', emailLower)
  const { error: insertError } = await supabase.from('otp_codes').insert({
    email: emailLower,
    code,
    password,
    expires_at: expiresAt,
  })

  if (insertError) {
    console.error('[OTP INSERT ERROR]', insertError)
    return res.status(500).json({ error: `Failed to store verification code: ${insertError.message}` })
  }

  console.log(`[OTP] ${emailLower} → ${code}`)

  // ── Send email ────────────────────────────────────────────────────────────
  try {
    const mailResult = await transporter.sendMail({
      from: `"Tap-Watch" <${gmailUser}>`,
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
    console.log(`[EMAIL SENT] ${emailLower} — Message ID: ${mailResult.messageId}`)
    return res.status(200).json({ message: 'Verification code sent to your email.' })
  } catch (err) {
    console.error('[EMAIL ERROR]', err.message, err.code, err.responseCode)
    // Clean up OTP record if email failed
    await supabase.from('otp_codes').delete().eq('email', emailLower)

    if (err.code === 'EAUTH' || err.responseCode === 535) {
      return res.status(500).json({
        error: 'Gmail authentication failed. Make sure GMAIL_APP_PASSWORD is a 16-character Google App Password (not your regular Gmail password). Enable 2FA on your Google account first, then generate an App Password at myaccount.google.com/apppasswords.'
      })
    }
    if (err.code === 'ECONNECTION' || err.code === 'ETIMEDOUT') {
      return res.status(500).json({ error: 'Could not connect to Gmail SMTP. Try again.' })
    }
    return res.status(500).json({ error: `Failed to send email: ${err.message}` })
  }
}
