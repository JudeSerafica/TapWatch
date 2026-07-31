/**
 * GET /api/debug
 * Shows env var status + tests Supabase + Resend connections.
 * DELETE this file after confirming everything works.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const env = {
    VITE_SUPABASE_URL:              !!process.env.VITE_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY:      !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    VITE_SUPABASE_SERVICE_ROLE_KEY: !!process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
    VITE_SUPABASE_ANON_KEY:         !!process.env.VITE_SUPABASE_ANON_KEY,
    RESEND_API_KEY:                 !!process.env.RESEND_API_KEY,
    RESEND_API_KEY_prefix:          process.env.RESEND_API_KEY
                                      ? process.env.RESEND_API_KEY.substring(0, 8) + '...'
                                      : 'NOT SET',
    GMAIL_USER:                     !!process.env.GMAIL_USER,
    GMAIL_APP_PASSWORD:             !!process.env.GMAIL_APP_PASSWORD,
    OPENAI_API_KEY:                 !!process.env.OPENAI_API_KEY,
  }

  const missing = Object.entries(env)
    .filter(([k, v]) => !k.includes('prefix') && v === false)
    .map(([k]) => k)

  // Test Resend API key validity
  let resendTest = 'skipped (no key)'
  if (process.env.RESEND_API_KEY) {
    try {
      const r = await fetch('https://api.resend.com/domains', {
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` }
      })
      const body = await r.json()
      resendTest = r.ok
        ? `✅ Valid key — ${JSON.stringify(body).substring(0, 100)}`
        : `❌ Invalid key (${r.status}): ${JSON.stringify(body).substring(0, 200)}`
    } catch (e) {
      resendTest = `❌ Fetch failed: ${e.message}`
    }
  }

  // Test Supabase connection
  let supabaseTest = 'skipped (no key)'
  if (process.env.VITE_SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY)) {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
      )
      const { data, error } = await supabase.from('otp_codes').select('count').limit(1)
      supabaseTest = error
        ? `❌ ${error.message}`
        : `✅ otp_codes table accessible`
    } catch (e) {
      supabaseTest = `❌ ${e.message}`
    }
  }

  return res.status(200).json({
    env,
    missing,
    resendTest,
    supabaseTest,
    hint: missing.length > 0
      ? `Add these to Vercel env vars: ${missing.join(', ')}`
      : 'All env vars present — check resendTest and supabaseTest for connection issues.',
  })
}
