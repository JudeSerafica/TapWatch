/**
 * GET /api/debug
 * Shows which environment variables are configured on Vercel.
 * Does NOT expose actual values — only shows present/missing.
 * DELETE this file after confirming your env vars are correct.
 */
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const checks = {
    VITE_SUPABASE_URL:          !!process.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY:     !!process.env.VITE_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY:  !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    VITE_SUPABASE_SERVICE_ROLE_KEY: !!process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
    GMAIL_USER:                 !!process.env.GMAIL_USER,
    GMAIL_APP_PASSWORD:         !!process.env.GMAIL_APP_PASSWORD,
    OPENAI_API_KEY:             !!process.env.OPENAI_API_KEY,
  }

  const missing = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k)

  return res.status(200).json({
    status: missing.length === 0 ? '✅ All env vars present' : '❌ Missing env vars',
    checks,
    missing,
    hint: missing.length > 0
      ? 'Go to Vercel Dashboard → Your Project → Settings → Environment Variables and add the missing keys.'
      : 'All good! Delete /api/debug.js after verifying.',
  })
}
