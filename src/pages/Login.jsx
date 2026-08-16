import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { sendOTP, verifyOTP } from '../lib/otp'
import { supabase } from '../lib/supabase'
import { FaShieldAlt, FaUsers, FaBell, FaEye, FaEyeSlash, FaBan } from 'react-icons/fa'

const USER_MESSAGES = {
  'Invalid login credentials': 'Incorrect email or password.',
  'Email not confirmed': 'Please verify your email before signing in.',
  'User already registered': 'An account with this email already exists.',
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

export default function Login() {
  const navigate = useNavigate()
  const { signIn, user, profile, loading } = useAuth()
  const [form, setForm] = useState({ email: '', phone: '', password: '', mode: 'email', otp: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [pendingPhone, setPendingPhone] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // 'wrongPortal' shows the redirect-to-admin banner instead of a plain error
  const [wrongPortal, setWrongPortal] = useState(false)
  // 'suspendedMsg' shows the suspended account banner
  const [suspendedMsg, setSuspendedMsg] = useState('')

  // Redirect already-signed-in residents to dashboard
  // Do NOT redirect admins here — they should not be on this page
  useEffect(() => {
    if (!loading && user && profile && profile.role !== 'admin') {
      navigate('/dashboard', { replace: true })
    }
  }, [user, profile, loading, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setWrongPortal(false)
    setSuspendedMsg('')
    setSubmitting(true)

    try {
      // ── OTP: Send ──────────────────────────────────────────
      if (form.mode === 'phone' && !showOtpInput) {
        const { error } = await sendOTP(form.phone)
        setSubmitting(false)
        if (error) setError(friendlyError(error))
        else { setShowOtpInput(true); setPendingPhone(form.phone); setError('OTP sent to your phone number.') }
        return
      }

      // ── OTP: Verify ────────────────────────────────────────
      if (form.mode === 'phone' && showOtpInput) {
        const { isValid, error } = await verifyOTP(pendingPhone, form.otp)
        setSubmitting(false)
        if (error) { setError(friendlyError(error)); return }
        if (!isValid) { setError('Invalid or expired OTP. Please try again.'); return }
        // useEffect above will redirect resident to /dashboard
        return
      }

      // ── Email login ────────────────────────────────────────
      // Step 1: Check the role AND suspension status by email BEFORE creating any session.
      const email = form.email.trim().toLowerCase()
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('role, is_suspended, suspension_expires_at, suspension_reason')
        .eq('email', email)
        .maybeSingle()

      if (profileRow?.role === 'admin') {
        // Admin trying the wrong portal — show the redirect banner, no session created
        setSubmitting(false)
        setWrongPortal(true)
        return
      }

      // Step 1b: Check if account is actively suspended
      if (profileRow?.is_suspended) {
        const expiresAt = profileRow.suspension_expires_at
        const stillActive = !expiresAt || new Date(expiresAt).getTime() > Date.now()
        if (stillActive) {
          setSubmitting(false)
          const expiryMsg = expiresAt
            ? `Your account will be automatically restored on ${new Date(expiresAt).toLocaleString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}.`
            : 'Please contact your barangay administrator to restore access.'
          const reasonMsg = profileRow.suspension_reason
            ? ` Reason: ${profileRow.suspension_reason}.`
            : ''
          setSuspendedMsg(`Your account has been temporarily suspended.${reasonMsg} ${expiryMsg}`)
          return
        }
      }

      // Step 2: Role is resident and not suspended — proceed with sign-in
      const { error } = await signIn({ email, password: form.password.trim() })
      setSubmitting(false)
      if (error) setError(friendlyError(error))
      // On success: AuthContext updates profile → useEffect redirects to /dashboard

    } catch {
      setSubmitting(false)
      setError('An unexpected error occurred. Please try again.')
    }
  }

  if (loading) return null

  return (
    <div
      className="h-screen w-screen overflow-hidden bg-contain bg-center bg-no-repeat flex items-center justify-center px-4 relative"
      style={{ backgroundImage: "url('/background.jpg')", backgroundSize: '100% 100%' }}
    >
      <div className="absolute left-40 top-1/2 -translate-y-1/2 hidden lg:block z-10 scale-90 origin-left">
        <img src="/Tapinac.logo.jpg" alt="TapWatch Logo" className="w-45 h-45 object-contain mx-auto mb-3 drop-shadow-lg" />
        <h1 className="text-[75px] font-bold leading-none">
          <span className="text-black">Tap</span>
          <span className="text-blue-600">-</span>
          <span className="text-blue-600">Watch</span>
        </h1>
        <p className="text-[30px] text-center text-black font-semibold mt-1">Barangay East Tapinac</p>
        <div className="w-[375px] h-[1px] bg-blue-200 mt-3 mb-3 relative">
          <div className="absolute left-1/2 -translate-x-1/2 -top-[1px] w-8 h-[2px] bg-blue-600 rounded-full" />
        </div>
        <p className="text-[19px] text-center text-blue-600 font-medium mb-6">Community Emergency Monitoring System</p>
        <div className="space-y-5 mb-40">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md">
              <FaShieldAlt className="text-white text-lg" />
            </div>
            <div>
              <h3 className="text-[19px] font-semibold text-black">Report Incidents</h3>
              <p className="text-[15px] text-gray-700 leading-6">Quickly report emergencies<br />in your area</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md">
              <FaUsers className="text-white text-xl" />
            </div>
            <div>
              <h3 className="text-[19px] font-semibold text-black">Community Safety</h3>
              <p className="text-[15px] text-gray-700 leading-6">Working together for a<br />safer community</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md">
              <FaBell className="text-white text-xl" />
            </div>
            <div>
              <h3 className="text-[19px] font-semibold text-black">Real-time Updates</h3>
              <p className="text-[15px] text-gray-700 leading-6">Stay informed with live<br />incident updates</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-md lg:ml-auto lg:mr-90">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Resident Sign In</h1>
              <p className="text-gray-600 text-sm">Enter your credentials to access your account</p>
            </div>

            {/* ── Suspended account banner ── */}
            {suspendedMsg ? (
              <div className="mb-2 rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0 flex-shrink-0">
                    <FaBan className="text-white text-sm" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-red-900 mb-1">Account Suspended</p>
                    <p className="text-xs text-red-700 leading-relaxed mb-3">{suspendedMsg}</p>
                    <button
                      onClick={() => { setSuspendedMsg(''); setForm(f => ({ ...f, email: '', password: '' })) }}
                      className="w-full py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition"
                    >
                      Use a different account
                    </button>
                  </div>
                </div>
              </div>

            ) : wrongPortal ? (
              <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-700 flex items-center justify-center flex-shrink-0">
                    <FaShieldAlt className="text-white text-sm" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-blue-900 mb-0.5">Administrator Account Detected</p>
                    <p className="text-xs text-blue-700 leading-relaxed mb-3">
                      This account belongs to an administrator. Please use the Admin Portal to sign in.
                    </p>
                    <button
                      onClick={() => navigate('/admin-login')}
                      className="w-full py-2 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition"
                    >
                      Go to Admin Portal →
                    </button>
                    <button
                      onClick={() => { setWrongPortal(false); setForm(f => ({ ...f, email: '', password: '' })) }}
                      className="w-full mt-2 py-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition"
                    >
                      Use a different account
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-4 p-3 rounded bg-red-100 text-red-800 text-sm">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-0">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {form.mode === 'email' ? 'Email' : 'Phone Number'}
                    </label>
                    {form.mode === 'email' ? (
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                        placeholder="resident@gmail.com"
                      />
                    ) : (
                      <input
                        type="tel"
                        required
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                        placeholder="09123456789"
                      />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => { setForm({ ...form, mode: form.mode === 'email' ? 'phone' : 'email' }); setShowOtpInput(false); setError('') }}
                    className="text-sm text-blue-700 hover:text-blue-800 font-medium"
                  >
                    Use {form.mode === 'email' ? 'phone number' : 'email'} instead
                  </button>

                  {form.mode === 'email' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                          placeholder="Enter your password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                    </div>
                  ) : showOtpInput ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Enter OTP</label>
                      <input
                        type="text"
                        required
                        value={form.otp}
                        onChange={(e) => setForm({ ...form, otp: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                      />
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2 bg-blue-700 text-white rounded font-medium hover:bg-blue-800 disabled:opacity-50 mt-6"
                  >
                    {submitting
                      ? 'Processing...'
                      : form.mode === 'phone' && !showOtpInput
                        ? 'Send OTP'
                        : form.mode === 'phone' && showOtpInput
                          ? 'Verify OTP'
                          : 'Sign In'}
                  </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
                  Don't have an account?{' '}
                  <button onClick={() => navigate('/signup')} className="text-blue-700 font-medium hover:text-blue-800">
                    Sign up
                  </button>
                </p>

                <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                  <button onClick={() => navigate('/admin-login')} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                    Admin Portal →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <button onClick={() => navigate('/')} className="text-sm text-gray-600 hover:text-gray-900 mt-6 mx-auto block">
          ← Back to home
        </button>
      </div>
    </div>
  )
}
