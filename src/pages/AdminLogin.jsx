import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { supabase } from '../lib/supabase'
import { FaShieldAlt, FaEye, FaEyeSlash, FaLock, FaUserCircle } from 'react-icons/fa'

const USER_MESSAGES = {
  'Invalid login credentials': 'Incorrect email or password.',
  'Email not confirmed': 'Please verify your email before signing in.',
  'Too many requests': 'Too many attempts. Please wait a moment and try again.',
}
const friendlyError = (err) => {
  if (!err) return 'Something went wrong. Please try again.'
  const msg = typeof err === 'string' ? err : (err.message || '')
  for (const [key, friendly] of Object.entries(USER_MESSAGES)) {
    if (msg.includes(key)) return friendly
  }
  return 'Something went wrong. Please try again.'
}

export default function AdminLogin() {
  const navigate = useNavigate()
  const { signIn, user, profile, loading } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  // 'wrongPortal' shows the redirect-to-resident banner
  const [wrongPortal, setWrongPortal] = useState(false)

  // Redirect already-signed-in admins to admin dashboard
  useEffect(() => {
    if (!loading && user && profile && profile.role === 'admin') {
      navigate('/admin', { replace: true })
    }
  }, [user, profile, loading, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setWrongPortal(false)
    setSubmitting(true)

    try {
      // Step 1: Check role by email BEFORE creating any session
      const email = form.email.trim().toLowerCase()
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('role')
        .eq('email', email)
        .maybeSingle()

      // If profile exists and is NOT admin, show the redirect banner — no session created
      if (profileRow && profileRow.role !== 'admin') {
        setSubmitting(false)
        setWrongPortal(true)
        return
      }

      // Step 2: Role is admin (or no profile yet) — proceed with sign-in
      const { error } = await signIn({ email, password: form.password.trim() })
      setSubmitting(false)
      if (error) {
        setError(friendlyError(error))
        return
      }
      // On success: AuthContext updates profile → useEffect redirects to /admin

    } catch {
      setSubmitting(false)
      setError('An unexpected error occurred. Please try again.')
    }
  }

  if (loading) return null

  return (
    <div
      className="h-screen w-screen overflow-hidden flex items-center justify-center px-4 bg-gray-900"
      style={{ backgroundImage: "url('/background.jpg')", backgroundSize: '100% 100%' }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md">
        {/* Header badge */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-blue-700 flex items-center justify-center shadow-lg mb-3 border-2 border-blue-400">
            <FaShieldAlt className="text-white text-3xl" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Admin Portal</h1>
          <p className="text-blue-300 text-sm mt-1">TapWatch — Barangay East Tapinac</p>
        </div>

        <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200">
          {/* Top accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-blue-700 via-blue-500 to-blue-700" />

          <div className="p-8">
            <div className="mb-6 flex items-center gap-2">
              <FaLock className="text-blue-700 text-sm" />
              <span className="text-sm font-semibold uppercase tracking-widest text-blue-700">
                Restricted Access
              </span>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-1">Administrator Log In</h2>
            <p className="text-gray-500 text-sm mb-6">
              Authorized personnel only. All access is monitored and logged.
            </p>

            {/* ── Wrong portal banner ── */}
            {wrongPortal ? (
              <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                    <FaUserCircle className="text-white text-lg" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-amber-900 mb-0.5">Resident Account Detected</p>
                    <p className="text-xs text-amber-800 leading-relaxed mb-3">
                      This account is registered as a resident. Please use the Resident Login to access your account.
                    </p>
                    <button
                      onClick={() => navigate('/login')}
                      className="w-full py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 transition"
                    >
                      Go to Resident Login →
                    </button>
                    <button
                      onClick={() => { setWrongPortal(false); setForm({ email: '', password: '' }) }}
                      className="w-full mt-2 py-1.5 text-xs text-amber-700 hover:text-amber-900 font-medium transition"
                    >
                      Use a different account
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                    <span className="mt-0.5">⚠</span>
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Admin Email</label>
                    <input
                      type="email"
                      required
                      autoComplete="username"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm bg-gray-50"
                      placeholder="admin@eastTapinac.gov"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-medium text-gray-700">Password</label>
                      <button
                        type="button"
                        onClick={() => navigate('/forgot-password')}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm bg-gray-50"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        tabIndex={-1}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors mt-2 shadow-md"
                  >
                    {submitting ? 'Signing in…' : 'Log In to Admin Portal'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        {/* Back links */}
        <div className="flex items-center justify-center gap-4 mt-5">
          <button onClick={() => navigate('/')} className="text-sm text-white/70 hover:text-white transition-colors">
            ← Back to Home
          </button>
          <span className="text-white/30">|</span>
          <button onClick={() => navigate('/login')} className="text-sm text-white/70 hover:text-white transition-colors">
            Resident Login
          </button>
        </div>
      </div>
    </div>
  )
}
