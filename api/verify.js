// Store in memory (in production, should match signup store)
const otpStore = new Map()
const verifyAttempts = new Map()

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, code, password } = req.body

  if (!email || !code || !password) {
    return res.status(400).json({ error: 'Email, code, and password are required.' })
  }

  const emailLower = email.toLowerCase()

  // Rate limit: max 5 attempts per 15 minutes
  const now = Date.now()
  const attempts = verifyAttempts.get(emailLower) || { count: 0, resetTime: now + 15 * 60 * 1000 }

  if (now > attempts.resetTime) {
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

  if (!record) {
    return res.status(400).json({ error: 'No verification code found. Please sign up again.' })
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(emailLower)
    return res.status(400).json({ error: 'Verification code expired. Please sign up again.' })
  }

  if (record.code !== code.trim()) {
    return res.status(400).json({ error: 'Incorrect verification code. Please try again.' })
  }

  otpStore.delete(emailLower)
  verifyAttempts.delete(emailLower)

  console.log(`[VERIFY] OTP verified for: ${email}`)
  return res.status(200).json({ message: 'OTP verified successfully.' })
}
