import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // ── Environment check ─────────────────────────────────────────────────────
  const supabaseUrl    = process.env.VITE_SUPABASE_URL
  const supabaseKey    = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  const resendKey      = process.env.RESEND_API_KEY

  if (!supabaseUrl || !supabaseKey)
    return res.status(500).json({ error: 'Server configuration error: Supabase credentials missing.' })
  if (!resendKey)
    return res.status(500).json({ error: 'Server configuration error: RESEND_API_KEY is missing.' })

  const { email, password } = req.body
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' })
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' })

  const emailLower = email.toLowerCase().trim()
  const supabase   = createClient(supabaseUrl, supabaseKey)

  // ── Rate limit: 30 seconds between requests ───────────────────────────────
  const { data: existing } = await supabase
    .from('otp_codes')
    .select('created_at')
    .eq('email', emailLower)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (existing) {
    const diff = Date.now() - new Date(existing.created_at).getTime()
    if (diff < 30000) {
      const waitSeconds = Math.ceil((30000 - diff) / 1000)
      return res.status(429).json({ error: `Please wait ${waitSeconds} seconds before requesting another code.` })
    }
  }

  // ── Generate OTP and store in Supabase ────────────────────────────────────
  const code      = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

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

  // ── Send email via Resend (HTTPS — works on Vercel) ───────────────────────
  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Tap-Watch <onboarding@resend.dev>',
        to: [email],
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
      }),
    })

    const result = await emailRes.json()

    if (!emailRes.ok) {
      console.error('[RESEND ERROR]', emailRes.status, result)
      await supabase.from('otp_codes').delete().eq('email', emailLower)
      return res.status(500).json({
        error: `Failed to send email: ${result.message || result.name || JSON.stringify(result)}`
      })
    }

    console.log(`[EMAIL SENT] ${emailLower} — Resend ID: ${result.id}`)
    return res.status(200).json({ message: 'Verification code sent to your email.' })

  } catch (err) {
    console.error('[EMAIL FETCH ERROR]', err.message)
    await supabase.from('otp_codes').delete().eq('email', emailLower)
    return res.status(500).json({ error: `Failed to send email: ${err.message}` })
  }
}
