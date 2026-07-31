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

  const { email, password, name } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' })
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' })

  const emailLower = email.toLowerCase().trim()

  // Use service role to store pending signup data
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

  // Rate limit: check last OTP sent
  const { data: existing } = await supabaseAdmin
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

  // Store password + name temporarily so verify can use them
  await supabaseAdmin.from('otp_codes').delete().eq('email', emailLower)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
  const { error: insertError } = await supabaseAdmin.from('otp_codes').insert({
    email: emailLower,
    code: 'supabase', // placeholder — actual code sent by Supabase
    password,
    expires_at: expiresAt,
  })

  if (insertError) {
    console.error('[OTP INSERT ERROR]', insertError)
    return res.status(500).json({ error: `Failed to store signup data: ${insertError.message}` })
  }

  // Use anon client to trigger Supabase's built-in OTP email (sends to ANY email for free)
  const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey)
  const { error: otpError } = await supabaseAnon.auth.signInWithOtp({
    email: emailLower,
    options: {
      shouldCreateUser: true, // Supabase creates a temp unconfirmed user to send the OTP
    },
  })

  if (otpError) {
    console.error('[SUPABASE OTP ERROR]', otpError)
    await supabaseAdmin.from('otp_codes').delete().eq('email', emailLower)
    return res.status(500).json({ error: `Failed to send verification code: ${otpError.message}` })
  }

  console.log(`[OTP SENT via Supabase] ${emailLower}`)
  return res.status(200).json({ message: 'Verification code sent to your email.' })
}
