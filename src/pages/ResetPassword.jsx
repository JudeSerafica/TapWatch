import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { FaEye, FaEyeSlash, FaLock, FaCheckCircle, FaTimesCircle } from 'react-icons/fa'

// Password strength checker
function getStrength(password) {
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return score // 0-4
}

const strengthLabel = ['Too short', 'Weak', 'Fair', 'Good', 'Strong']
const strengthColor = ['bg-red-400', 'bg-red-400', 'bg-yellow-400', 'bg-blue-500', 'bg-green-500']
const strengthText  = ['text-red-500', 'text-red-500', 'text-yellow-600', 'text-blue-600', 'text-green-600']

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword]           = useState('')
  const [confirm, setConfirm]             = useState('')
  const [showPassword, setShowPassword]   = useState(false)
  const [showConfirm, setShowConfirm]     = useState(false)
  const [submitting, setSubmitting]       = useState(false)
  const [success, setSuccess]             = useState(false)
  const [error, setError]                 = useState('')
  const [sessionReady, setSessionReady]   = useState(false)
  const [invalidLink, setInvalidLink]     = useState(false)

  // Supabase sends the recovery token in the URL hash.
  // We must wait for onAuthStateChange to fire with SIGNED_IN / PASSWORD_RECOVERY
  // before the session is set and updateUser will work.
  useEffect(() => {
    // Parse the hash ourselves to detect recovery tokens early
    const hash = window.location.hash
    const params = new URLSearchParams(hash.replace('#', ''))
    const type = params.get('type')
    const accessToken = params.get('access_token')

    // If no token at all — link is invalid / already used
    if (!accessToken && !hash.includes('access_token')) {
      // Give Supabase a moment to handle the session from a previous navigation
      const timer = setTimeout(() => {
        supabase.auth.getSession().then(({ data }) => {
          if (data?.session) {
            setSessionReady(true)
          } else {
            setInvalidLink(true)
          }
        })
      }, 500)
      return () => clearTimeout(timer)
    }

    // Listen for auth state — Supabase SDK will exchange the token automatically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        if (session) {
          setSessionReady(true)
        }
      }
    })

    // Also check immediately in case the event already fired
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setSessionReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  const strength = getStrength(password)
  const passwordsMatch = password && confirm && password === confirm

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        setSubmitting(false)
        if (updateError.message?.includes('same password')) {
          setError('New password must be different from your current password.')
        } else if (updateError.message?.includes('expired') || updateError.message?.includes('invalid')) {
          setError('This reset link has expired or already been used. Please request a new one.')
        } else {
          setError('Failed to update password. Please try again.')
        }
        return
      }

      // Show success immediately — don't wait for signOut to finish
      setSuccess(true)
      setSubmitting(false)

      // Sign out in the background so the user starts a fresh session
      supabase.auth.signOut().catch(() => {})

    } catch {
      setSubmitting(false)
      setError('An unexpected error occurred. Please try again.')
    }
  }

  // ── Invalid / expired link ──────────────────────────────────────────────
  if (invalidLink) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center px-4"
        style={{ backgroundImage: "url('/background.jpg')", backgroundSize: '100% 100%' }}
      >
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <FaTimesCircle className="text-red-500 text-4xl" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Link Invalid or Expired</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            This password reset link has expired or already been used. Reset links are only valid for 1 hour.
          </p>
          <button
            onClick={() => navigate('/forgot-password')}
            className="w-full py-2.5 bg-blue-700 text-white rounded font-semibold hover:bg-blue-800 transition mb-3"
          >
            Request a New Link
          </button>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-800 transition"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    )
  }

  // ── Loading — waiting for Supabase session ──────────────────────────────
  if (!sessionReady) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center px-4"
        style={{ backgroundImage: "url('/background.jpg')", backgroundSize: '100% 100%' }}
      >
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 w-full max-w-md text-center">
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="text-sm">Verifying reset link…</span>
          </div>
        </div>
      </div>
    )
  }

  // ── Success state ───────────────────────────────────────────────────────
  if (success) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center px-4"
        style={{ backgroundImage: "url('/background.jpg')", backgroundSize: '100% 100%' }}
      >
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <FaCheckCircle className="text-green-600 text-4xl" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Password Updated!</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Your password has been changed successfully. You can now sign in with your new password.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-2.5 bg-blue-700 text-white rounded font-semibold hover:bg-blue-800 transition"
          >
            Sign In Now
          </button>
        </div>
      </div>
    )
  }

  // ── Reset form ──────────────────────────────────────────────────────────
  return (
    <div
      className="h-screen w-screen flex items-center justify-center px-4"
      style={{ backgroundImage: "url('/background.jpg')", backgroundSize: '100% 100%' }}
    >
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="flex flex-col items-center mb-6">
          <img
            src="/Tapinac.logo.jpg"
            alt="TapWatch Logo"
            className="w-16 h-16 object-contain rounded-full shadow mb-2"
          />
          <h1 className="text-2xl font-bold">
            <span className="text-black">Tap</span>
            <span className="text-blue-600">-Watch</span>
          </h1>
          <p className="text-sm text-gray-600 mt-0.5">Barangay East Tapinac</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-8">
            <div className="flex items-center gap-2 mb-1">
              <FaLock className="text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Set New Password</h2>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Choose a strong password for your account.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded bg-red-100 border border-red-200 text-red-800 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                    placeholder="Minimum 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>

                {/* Strength meter */}
                {password.length > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map((bar) => (
                        <div
                          key={bar}
                          className={`h-1.5 flex-1 rounded-full transition-all ${
                            strength >= bar ? strengthColor[strength] : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs font-medium ${strengthText[strength]}`}>
                      {strengthLabel[strength]}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={`w-full px-4 py-2.5 pr-10 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm ${
                      confirm.length > 0
                        ? passwordsMatch
                          ? 'border-green-400 bg-green-50'
                          : 'border-red-300 bg-red-50'
                        : 'border-gray-300'
                    }`}
                    placeholder="Re-enter your new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showConfirm ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {confirm.length > 0 && !passwordsMatch && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
                {passwordsMatch && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <FaCheckCircle className="text-xs" /> Passwords match
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || password.length < 8}
                className="w-full py-2.5 bg-blue-700 text-white rounded font-semibold hover:bg-blue-800 disabled:opacity-50 transition mt-2"
              >
                {submitting ? 'Updating Password…' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
