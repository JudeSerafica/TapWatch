import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { FaEnvelope, FaArrowLeft, FaCheckCircle } from 'react-icons/fa'

function isMobileScreen() {
  return window.innerWidth < 1024
}

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const isMobile = isMobileScreen()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const trimmedEmail = email.trim().toLowerCase()

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('email', trimmedEmail)
      .maybeSingle()

    if (!profileRow) {
      setSubmitting(false)
      setSent(true)
      return
    }

    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin
    const redirectTo = `${appUrl}/reset-password`

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo,
    })

    setSubmitting(false)

    if (resetError) {
      if (resetError.message?.includes('rate limit') || resetError.message?.includes('Too many')) {
        setError('Too many requests. Please wait a few minutes and try again.')
      } else {
        setError('Failed to send reset email. Please try again.')
      }
      return
    }

    setSent(true)
  }

  // ── MOBILE UI ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        {/* Header */}
        <div className="px-6 pt-12 pb-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 active:bg-gray-200"
          >
            ←
          </button>
          <div className="flex items-center gap-2">
            <img src="/Tapinac.logo.jpg" alt="Tap-Watch" className="w-8 h-8 rounded-full object-cover border border-blue-100" />
            <span className="font-extrabold text-lg">
              <span className="text-gray-900">Tap</span>
              <span className="text-blue-600">-Watch</span>
            </span>
          </div>
        </div>

        <div className="flex-1 px-6 pb-8">
          {sent ? (
            <div className="flex flex-col items-center text-center pt-12">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
                <FaCheckCircle className="text-green-500 text-4xl" />
              </div>
              <h1 className="text-[24px] font-extrabold text-gray-900 mb-2">Check your email</h1>
              <p className="text-sm text-gray-500 mb-2 leading-relaxed">
                If an account with{' '}
                <span className="font-semibold text-gray-700">{email}</span>{' '}
                exists, we've sent a password reset link.
              </p>
              <p className="text-xs text-gray-400 mb-8">The link expires in 1 hour.</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-all"
              >
                Back to Log In
              </button>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="mt-3 text-sm text-gray-500"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-[24px] font-extrabold text-gray-900 mb-1 mt-4">Forgot Password?</h1>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                Enter your registered email and we'll send you a reset link.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                    placeholder="yourname@email.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 disabled:opacity-60 active:scale-95 transition-all"
                >
                  {submitting ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── DESKTOP UI (original) ──────────────────────────────────────────────
  return (
    <div
      className="h-screen w-screen overflow-hidden bg-contain bg-center bg-no-repeat flex items-center justify-center px-4 relative"
      style={{ backgroundImage: "url('/background.jpg')", backgroundSize: '100% 100%' }}
    >
      <div className="w-full max-w-md">
        {/* Logo / branding */}
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
            {sent ? (
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <FaCheckCircle className="text-green-600 text-4xl" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                  If an account with <span className="font-semibold text-gray-800">{email}</span> exists,
                  we've sent a password reset link. Check your inbox and spam folder.
                </p>
                <p className="text-xs text-gray-400 mb-6">
                  The link will expire in 1 hour for your security.
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full py-2.5 bg-blue-700 text-white rounded font-medium hover:bg-blue-800 transition"
                >
                  Back to Log In
                </button>
                <button
                  onClick={() => { setSent(false); setEmail('') }}
                  className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition"
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <FaEnvelope className="text-blue-600 text-base" />
                    <h2 className="text-xl font-bold text-gray-900">Forgot your password?</h2>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Enter your registered email address and we'll send you a link to reset your password.
                  </p>
                </div>

                {error && (
                  <div className="mb-4 p-3 rounded bg-red-100 border border-red-200 text-red-800 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      autoFocus
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                      placeholder="yourname@email.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 bg-blue-700 text-white rounded font-semibold hover:bg-blue-800 disabled:opacity-50 transition"
                  >
                    {submitting ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>

                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <button
                    onClick={() => navigate('/login')}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition"
                  >
                    <FaArrowLeft className="text-xs" />
                    Back to Log In
                  </button>
                  <button
                    onClick={() => navigate('/admin-login')}
                    className="text-xs text-gray-400 hover:text-gray-600 transition"
                  >
                    Admin Portal →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
