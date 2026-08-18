import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { sendOTP, verifyOTP } from '../lib/otp'
import { supabase } from '../lib/supabase'
import {
  FaShieldAlt, FaUsers, FaBell, FaEye, FaEyeSlash, FaBan,
  FaEnvelope, FaPhone,
} from 'react-icons/fa'

/* ── Friendly error mapping ── */
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

/* ── Detect mobile (<1024px) ── */
function isMobileScreen() {
  return window.innerWidth < 1024
}

/* ═══════════════════════════════════════════════════════════════════════
   MOBILE LOGIN UI
   ═══════════════════════════════════════════════════════════════════════ */
function MobileLogin({
  form, setForm, error, submitting, showPassword, setShowPassword,
  wrongPortal, suspendedMsg, showOtpInput,
  handleSubmit, navigate, setSuspendedMsg, setWrongPortal,
}) {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Back button */}
      <div className="px-6 pt-12 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 active:bg-gray-200"
        >
          ←
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 px-6 pb-8 overflow-y-auto">
        <h1 className="text-[26px] font-extrabold text-gray-900 mb-1">Welcome Back!</h1>
        <p className="text-sm text-gray-500 mb-6">Login to continue</p>

        {/* ── Suspended banner ── */}
        {suspendedMsg ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                <FaBan className="text-white text-sm" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-red-900 mb-1">Account Suspended</p>
                <p className="text-xs text-red-700 leading-relaxed mb-3">{suspendedMsg}</p>
                <button
                  onClick={() => { setSuspendedMsg(''); setForm(f => ({ ...f, email: '', password: '' })) }}
                  className="w-full py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition"
                >
                  Use a different account
                </button>
              </div>
            </div>
          </div>
        ) : wrongPortal ? (
          /* ── Wrong portal banner ── */
          <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-700 flex items-center justify-center flex-shrink-0">
                <FaShieldAlt className="text-white text-sm" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-blue-900 mb-0.5">Administrator Account Detected</p>
                <p className="text-xs text-blue-700 leading-relaxed mb-3">
                  This account belongs to an administrator. Please use the Admin Portal to log in.
                </p>
                <button
                  onClick={() => navigate('/admin-login')}
                  className="w-full py-2 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition"
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
          /* ── Main form ── */
          <>
            {/* Error */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Method toggle tabs */}
            <div className="flex rounded-xl bg-gray-100 p-1 mb-5">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, mode: 'email', otp: '' }))}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  form.mode === 'email'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                <FaEnvelope className="text-xs" /> Email
              </button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, mode: 'phone', otp: '' }))}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  form.mode === 'phone'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                <FaPhone className="text-xs" /> Phone Number
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email / Phone field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {form.mode === 'email' ? 'Email' : 'Phone Number'}
                </label>
                {form.mode === 'email' ? (
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm transition-all"
                    placeholder="you@example.com"
                  />
                ) : (
                  <div className="flex">
                    <div className="flex items-center px-3 border border-r-0 border-gray-200 rounded-l-xl bg-gray-50 text-gray-500 text-sm font-medium">
                      🇵🇭 +63
                    </div>
                    <input
                      type="tel"
                      required
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="flex-1 px-4 py-3.5 border border-gray-200 rounded-r-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm transition-all"
                      placeholder="09XX XXX XXXX"
                    />
                  </div>
                )}
              </div>

              {/* Password (email mode only) */}
              {form.mode === 'email' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold text-gray-700">Password</label>
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="text-xs text-blue-600 font-semibold"
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
                      className="w-full px-4 py-3.5 pr-11 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm transition-all"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                      tabIndex={-1}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
              )}

              {/* OTP input (phone mode, after send) */}
              {form.mode === 'phone' && showOtpInput && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">OTP Code</label>
                  <input
                    type="text"
                    required
                    value={form.otp}
                    onChange={(e) => setForm({ ...form, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-xl tracking-[0.4em] font-bold"
                    placeholder="000000"
                    maxLength={6}
                    inputMode="numeric"
                  />
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-blue-600 text-white font-bold text-[15px] rounded-2xl shadow-lg shadow-blue-200 disabled:opacity-60 active:scale-95 transition-all mt-2"
              >
                {submitting
                  ? 'Processing...'
                  : form.mode === 'phone' && !showOtpInput
                    ? 'Send OTP'
                    : form.mode === 'phone' && showOtpInput
                      ? 'Verify OTP'
                      : 'Log In'}
              </button>
            </form>

            {/* Sign up link */}
            <p className="mt-5 text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/signup')}
                className="text-blue-600 font-bold"
              >
                Sign Up
              </button>
            </p>

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Continue with OTP (shortcut for phone) */}
            <button
              type="button"
              onClick={() => {
                setForm(f => ({ ...f, mode: 'phone', otp: '' }))
              }}
              className="w-full py-3.5 border border-blue-200 text-blue-600 font-semibold text-sm rounded-2xl active:bg-blue-50 transition-colors"
            >
              Continue with OTP
            </button>

            {/* Terms */}
            <p className="mt-5 text-center text-xs text-gray-400 leading-relaxed">
              By continuing, you agree to our{' '}
              <button className="underline text-gray-500">Terms of Use</button>
              {' '}and{' '}
              <button className="underline text-gray-500">Privacy Policy</button>
            </p>

            {/* Admin link */}
            <div className="mt-4 text-center">
              <button
                onClick={() => navigate('/admin-login')}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Admin Portal →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   DESKTOP LOGIN UI  (original design, preserved)
   ═══════════════════════════════════════════════════════════════════════ */
function DesktopLogin({
  form, setForm, error, submitting, showPassword, setShowPassword,
  wrongPortal, suspendedMsg, showOtpInput,
  handleSubmit, navigate, setSuspendedMsg, setWrongPortal,
}) {
  return (
    <div
      className="h-screen w-screen overflow-hidden bg-contain bg-center bg-no-repeat flex items-center justify-center px-4 relative"
      style={{ backgroundImage: "url('/background.jpg')", backgroundSize: '100% 100%' }}
    >
      {/* Left branding panel */}
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
          {[
            [FaShieldAlt, 'Report Incidents', 'Quickly report emergencies\nin your area'],
            [FaUsers, 'Community Safety', 'Working together for a\nsafer community'],
            [FaBell, 'Real-time Updates', 'Stay informed with live\nincident updates'],
          ].map(([Icon, title, desc]) => (
            <div key={title} className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md">
                <Icon className="text-white text-lg" />
              </div>
              <div>
                <h3 className="text-[19px] font-semibold text-black">{title}</h3>
                <p className="text-[15px] text-gray-700 leading-6 whitespace-pre-line">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-md lg:ml-auto lg:mr-90">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Resident Log In</h1>
              <p className="text-gray-600 text-sm">Enter your credentials to access your account</p>
            </div>

            {/* ── Suspended account banner ── */}
            {suspendedMsg ? (
              <div className="mb-2 rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
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
                      This account belongs to an administrator. Please use the Admin Portal to log in.
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
                    onClick={() => { setForm({ ...form, mode: form.mode === 'email' ? 'phone' : 'email' }); }}
                    className="text-sm text-blue-700 hover:text-blue-800 font-medium"
                  >
                    Use {form.mode === 'email' ? 'phone number' : 'email'} instead
                  </button>

                  {form.mode === 'email' ? (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <button
                          type="button"
                          onClick={() => navigate('/forgot-password')}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Forgot password?
                        </button>
                      </div>
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
                          : 'Log In'}
                  </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
                  Don't have an account?{' '}
                  <button onClick={() => navigate('/signup')} className="text-blue-700 font-medium hover:text-blue-800">
                    Sign up
                  </button>
                </p>

                <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                  <button onClick={() => navigate('/admin-login')} className="text-xs text-gray-400 hover:text-gray-600">
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

/* ═══════════════════════════════════════════════════════════════════════
   MAIN EXPORT — shared logic, conditional UI
   ═══════════════════════════════════════════════════════════════════════ */
export default function Login() {
  const navigate = useNavigate()
  const { signIn, user, profile, loading } = useAuth()
  const [form, setForm] = useState({ email: '', phone: '', password: '', mode: 'email', otp: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [pendingPhone, setPendingPhone] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [wrongPortal, setWrongPortal] = useState(false)
  const [suspendedMsg, setSuspendedMsg] = useState('')
  const [isMobile, setIsMobile] = useState(isMobileScreen)

  // Responsive detection
  useEffect(() => {
    const handler = () => setIsMobile(isMobileScreen())
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Redirect already-signed-in residents to dashboard
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
        else { setShowOtpInput(true); setPendingPhone(form.phone); setError('') }
        return
      }

      // ── OTP: Verify ────────────────────────────────────────
      if (form.mode === 'phone' && showOtpInput) {
        const { isValid, error } = await verifyOTP(pendingPhone, form.otp)
        setSubmitting(false)
        if (error) { setError(friendlyError(error)); return }
        if (!isValid) { setError('Invalid or expired OTP. Please try again.'); return }
        return
      }

      // ── Email login ────────────────────────────────────────
      const email = form.email.trim().toLowerCase()
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('role, is_suspended, suspension_expires_at, suspension_reason')
        .eq('email', email)
        .maybeSingle()

      if (profileRow?.role === 'admin') {
        setSubmitting(false)
        setWrongPortal(true)
        return
      }

      if (profileRow?.is_suspended) {
        const expiresAt = profileRow.suspension_expires_at
        const stillActive = !expiresAt || new Date(expiresAt).getTime() > Date.now()
        if (stillActive) {
          setSubmitting(false)
          const expiryMsg = expiresAt
            ? `Your account will be automatically restored on ${new Date(expiresAt).toLocaleString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}.`
            : 'Please contact your barangay administrator to restore access.'
          const reasonMsg = profileRow.suspension_reason ? ` Reason: ${profileRow.suspension_reason}.` : ''
          setSuspendedMsg(`Your account has been temporarily suspended.${reasonMsg} ${expiryMsg}`)
          return
        }
      }

      const { error } = await signIn({ email, password: form.password.trim() })
      setSubmitting(false)
      if (error) setError(friendlyError(error))

    } catch {
      setSubmitting(false)
      setError('An unexpected error occurred. Please try again.')
    }
  }

  if (loading) return null

  const sharedProps = {
    form, setForm, error, submitting, showPassword, setShowPassword,
    wrongPortal, suspendedMsg, showOtpInput,
    handleSubmit, navigate, setSuspendedMsg, setWrongPortal,
  }

  return isMobile
    ? <MobileLogin {...sharedProps} />
    : <DesktopLogin {...sharedProps} />
}
