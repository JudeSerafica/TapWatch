import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey)
    return res.status(500).json({ error: 'Server configuration error: Supabase credentials missing.' })

  const { email, code, password, name } = req.body
  if (!email || !code || !password)
    return res.status(400).json({ error: 'Email, code, and password are required.' })

  const emailLower = email.toLowerCase().trim()
  const supabase   = createClient(supabaseUrl, supabaseKey)

  // ── Look up OTP record ────────────────────────────────────────────────────
  const { data: record, error: fetchError } = await supabase
    .from('otp_codes')
    .select('*')
    .eq('email', emailLower)
    .single()

  if (fetchError || !record)
    return res.status(400).json({ error: 'No verification code found. Please sign up again.' })

  if (new Date(record.expires_at).getTime() < Date.now()) {
    await supabase.from('otp_codes').delete().eq('email', emailLower)
    return res.status(400).json({ error: 'Verification code expired. Please sign up again.' })
  }

  if (record.code !== code.trim())
    return res.status(400).json({ error: 'Incorrect verification code. Please try again.' })

  // ── OTP valid — create user in Supabase Auth ──────────────────────────────
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: emailLower,
      password: password.trim(),
      user_metadata: {
        full_name: name || emailLower.split('@')[0],
      },
      email_confirm: true,
    })

    if (error) {
      console.error('[VERIFY ERROR] Supabase user creation failed:', error)
      // If user already exists, tell them to log in instead
      if (error.message?.includes('already been registered') || error.message?.includes('already exists')) {
        await supabase.from('otp_codes').delete().eq('email', emailLower)
        return res.status(400).json({ error: 'An account with this email already exists. Please log in instead.' })
      }
      return res.status(400).json({ error: error.message || 'Failed to create user account.' })
    }

    // Clean up OTP record
    await supabase.from('otp_codes').delete().eq('email', emailLower)

    console.log(`[VERIFY] User created: ${emailLower}`)
    return res.status(200).json({
      message: 'Email verified successfully. Account created.',
      user: data.user,
    })
  } catch (err) {
    console.error('[VERIFY CATCH ERROR]', err.message)
    return res.status(500).json({ error: `Failed to verify: ${err.message}` })
  }
}
