import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, password } = req.body

  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' })

  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' })

  const emailLower = email.toLowerCase()
  const now = new Date()

  // Rate limit: check if OTP was sent in last 30 seconds
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

  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

  // Delete any previous OTPs for this email, then insert new one
  await supabase.from('otp_codes').delete().eq('email', emailLower)
  const { error: insertError } = await supabase.from('otp_codes').insert({
    email: emailLower,
    code,
    password, // stored temporarily, deleted after verify
    expires_at: expiresAt,
  })

  if (insertError) {
    console.error('[OTP INSERT ERROR]', insertError)
    return res.status(500).json({ error: 'Failed to store verification code.' })
  }

  console.log(`[OTP] ${emailLower} → ${code}`)

  try {
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
    console.log(`[EMAIL SENT] ${emailLower} — Message ID: ${mailResult.messageId}`)
    return res.status(200).json({ message: 'Verification code sent to your email.' })
  } catch (err) {
    console.error('[EMAIL ERROR]', err.message, err.code)
    await supabase.from('otp_codes').delete().eq('email', emailLower)
    if (err.code === 'EAUTH')
      return res.status(500).json({ error: 'Gmail auth failed. Check GMAIL_USER and GMAIL_APP_PASSWORD in Vercel environment variables.' })
    return res.status(500).json({ error: `Failed to send email: ${err.message}` })
  }
}
