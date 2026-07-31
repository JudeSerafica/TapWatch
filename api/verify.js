import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Server configuration error: Missing Supabase env vars.' })
  }

  const { email, code, name } = req.body
  if (!email || !code) return res.status(400).json({ error: 'Email and code are required.' })

  const emailLower = email.toLowerCase().trim()
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
  const supabaseAnon  = createClient(supabaseUrl, supabaseAnonKey)

  // Retrieve stored password from otp_codes
  const { data: record, error: fetchError } = await supabaseAdmin
    .from('otp_codes')
    .select('*')
    .eq('email', emailLower)
    .single()

  if (fetchError || !record) {
    return res.status(400).json({ error: 'No pending signup found. Please start signup again.' })
  }

  if (new Date(record.expires_at).getTime() < Date.now()) {
    await supabaseAdmin.from('otp_codes').delete().eq('email', emailLower)
    return res.status(400).json({ error: 'Verification session expired. Please sign up again.' })
  }

  // Verify the OTP code with Supabase (this validates the 6-digit code they received by email)
  const { data: verifyData, error: verifyError } = await supabaseAnon.auth.verifyOtp({
    email: emailLower,
    token: code.trim(),
    type: 'email',
  })

  if (verifyError) {
    console.error('[VERIFY OTP ERROR]', verifyError)
    return res.status(400).json({ error: 'Incorrect or expired verification code. Please try again.' })
  }

  // OTP confirmed — now create the real user account with the stored password
  const password = record.password
  const fullName = name || record.name || emailLower.split('@')[0]

  // Sign out the temporary OTP session first
  if (verifyData?.session) {
    await supabaseAnon.auth.signOut()
  }

  // Create the actual user via admin API
  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: emailLower,
    password: password.trim(),
    user_metadata: { full_name: fullName },
    email_confirm: true,
  })

  if (createError) {
    // If user already exists (e.g. duplicate signup), that's still ok — just clean up
    if (createError.message?.includes('already been registered') || createError.message?.includes('already exists')) {
      await supabaseAdmin.from('otp_codes').delete().eq('email', emailLower)
      return res.status(400).json({ error: 'An account with this email already exists. Please log in instead.' })
    }
    console.error('[CREATE USER ERROR]', createError)
    return res.status(500).json({ error: `Failed to create account: ${createError.message}` })
  }

  // Clean up OTP record
  await supabaseAdmin.from('otp_codes').delete().eq('email', emailLower)

  console.log(`[VERIFY] User created: ${emailLower}`)
  return res.status(200).json({
    message: 'Email verified. Account created successfully.',
    user: userData.user,
  })
}
