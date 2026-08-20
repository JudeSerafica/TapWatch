import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { sendPhoneLoginOTP, verifyPhoneLoginOTP, maskPhone } from '../lib/phoneAuth'
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
   PHONE OTP SCREEN  (shared between Mobile and Desktop)
   Six individual digit boxes, countdown, resend, all error states.
   ═══════════════════════════════════════════════════════════════════════ */
const OTP_RESEND_SECONDS = 60

function PhoneOtpScreen({ pendingPhone, onVerify, onBack, submitting, error }) {
  const [digits, setDigits]           = useState(['', '', '', '', '', ''])
  const [countdown, setCountdown]     = useState(OTP_RESEND_SECONDS)
  const [resending, setResending]     = useState(false)
  const [resendError, setResendError] = useState('')
  const [resendOk, setResendOk]       = useState(false)
  const inputRefs                     = useRef([])
  const timerRef                      = useRef(null)

  // Start countdown
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? (clearInterval(timerRef.current), 0) : prev - 1))
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  // Auto-verify once all 6 digits are filled
  useEffect(() => {
    const code = digits.join('')
    if (code.length === 6 && !submitting) {
      onVerify(code)
    }
  }, [digits]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (idx, val) => {
    // Support paste of full 6-digit code into any box
    const cleaned = val.replace(/\D/g, '')
    if (cleaned.length > 1) {
      const arr = cleaned.slice(0, 6).split('')
      const next = [...digits]
      arr.forEach((ch, i) => { if (idx + i < 6) next[idx + i] = ch })
      setDigits(next)
      const focusIdx = Math.min(idx + arr.length, 5)
      inputRefs.current[focusIdx]?.focus()
      return
    }
    const next = [...digits]
    next[idx] = cleaned.slice(-1)
    setDigits(next)
    if (cleaned && idx < 5) inputRefs.current[idx + 1]?.focus()
  }

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace') {
      if (digits[idx]) {
        const next = [...digits]; next[idx] = ''; setDigits(next)
      } else if (idx > 0) {
        inputRefs.current[idx - 1]?.focus()
      }
    }
  }

  const handleResend = async () => {
    setResending(true)
    setResendError('')
    setResendOk(false)
    const { error: resendErr, waitSeconds } = await sendPhoneLoginOTP(pendingPhone)
    setResending(false)
    if (resendErr) {
      setResendError(resendErr)
    } else {
      setResendOk(true)
      setDigits(['', '', '', '', '', ''])
      setCountdown(OTP_RESEND_SECONDS)
      clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        setCountdown(prev => (prev <= 1 ? (clearInterval(timerRef.current), 0) : prev - 1))
      }, 1000)
      inputRefs.current[0]?.focus()
      // Clear success message after 3 s
      setTimeout(() => setResendOk(false), 3000)
    }
    // If server said wait N seconds, honour that cooldown
    if (waitSeconds) setCountdown(waitSeconds)
  }

  const maskedDisplay = pendingPhone
    ? maskPhone(pendingPhone)
    : ''

  return (
    <div className="flex flex-col items-center w-full">
      {/* Header */}
      <div className="w-full mb-6">
        <h2 className="text-[22px] font-extrabold text-gray-900 mb-1">Enter OTP Code</h2>
        <p className="text-sm text-gray-500">
          We sent a 6-digit code to{' '}
          <span className="font-semibold text-gray-700">{maskedDisplay}</span>
        </p>
      </div>

      {/* Error banner */}
      {(error || resendError) && (
        <div className="w-full mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
          {error || resendError}
        </div>
      )}

      {/* Resend success */}
      {resendOk && (
        <div className="w-full mb-4 p-3 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm">
          New OTP sent successfully!
        </div>
      )}

      {/* Six boxes */}
      <div className="flex gap-2.5 justify-center mb-6 w-full">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={el => inputRefs.current[i] = el}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={d}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onFocus={e => e.target.select()}
            disabled={submitting}
            className={`w-12 h-14 border-2 rounded-xl text-center text-xl font-bold text-gray-900
              focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all
              ${d ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'}
              ${submitting ? 'opacity-60 cursor-not-allowed' : ''}
            `}
          />
        ))}
      </div>

      {/* Loading indicator while auto-verifying */}
      {submitting && (
        <div className="flex items-center gap-2 mb-4 text-sm text-blue-600 font-medium">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Verifying...
        </div>
      )}

      {/* Resend row */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        {countdown > 0 ? (
          <span className="text-gray-500">
            Resend code in{' '}
            <span className="font-semibold text-gray-700 tabular-nums">
              {String(Math.floor(countdown / 60)).padStart(2, '0')}:{String(countdown % 60).padStart(2, '0')}
            </span>
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-blue-600 font-semibold disabled:opacity-60 flex items-center gap-1.5"
          >
            {resending && <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
            {resending ? 'Sending...' : 'Resend OTP'}
          </button>
        )}
      </div>

      {/* Back link */}
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-gray-500 hover:text-gray-700 font-medium"
      >
        ← Use a different number
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   MOBILE LOGIN UI
   ═══════════════════════════════════════════════════════════════════════ */
function MobileLogin({
  form, setForm, error, submitting, showPassword, setShowPassword,
  wrongPortal, suspendedMsg, showOtpScreen, pendingPhone,
  handleSubmit, handleVerifyOtp, handleBackFromOtp,
  navigate, setSuspendedMsg, setWrongPortal,
}) {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Back button */}
      <div className="px-6 pt-12 pb-4">
        <button
          onClick={() => showOtpScreen ? handleBackFromOtp() : navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 active:bg-gray-200"
        >
          ←
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 px-6 pb-8 overflow-y-auto">
        {/* OTP Screen overlay */}
        {showOtpScreen ? (
          <PhoneOtpScreen
            pendingPhone={pendingPhone}
            onVerify={handleVerifyOtp}
            onBack={handleBackFromOtp}
            submitting={submitting}
            error={error}
          />
        ) : (
          <>
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

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 bg-blue-600 text-white font-bold text-[15px] rounded-2xl shadow-lg shadow-blue-200 disabled:opacity-60 active:scale-95 transition-all mt-2 flex items-center justify-center gap-2"
                  >
                    {submitting && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    {submitting
                      ? (form.mode === 'phone' ? 'Sending OTP...' : 'Logging in...')
                      : form.mode === 'phone'
                        ? 'Send OTP'
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
  wrongPortal, suspendedMsg, showOtpScreen, pendingPhone,
  handleSubmit, handleVerifyOtp, handleBackFromOtp,
  navigate, setSuspendedMsg, setWrongPortal,
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

            {/* ── Phone OTP Screen ── */}
            {showOtpScreen ? (
              <PhoneOtpScreen
                pendingPhone={pendingPhone}
                onVerify={handleVerifyOtp}
                onBack={handleBackFromOtp}
                submitting={submitting}
                error={error}
              />
            ) : (
              <>
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
                          <div className="flex">
                            <div className="flex items-center px-3 border border-r-0 border-gray-200 rounded-l bg-gray-50 text-gray-500 text-sm font-medium">
                              🇵🇭 +63
                            </div>
                            <input
                              type="tel"
                              required
                              value={form.phone}
                              onChange={(e) => setForm({ ...form, phone: e.target.value })}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-r focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                              placeholder="09XX XXX XXXX"
                            />
                          </div>
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
                      ) : null}

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-2 bg-blue-700 text-white rounded font-medium hover:bg-blue-800 disabled:opacity-50 mt-6 flex items-center justify-center gap-2"
                      >
                        {submitting && (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        )}
                        {submitting
                          ? (form.mode === 'phone' ? 'Sending OTP...' : 'Logging in...')
                          : form.mode === 'phone'
                            ? 'Send OTP'
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
  const [form, setForm]               = useState({ email: '', phone: '', password: '', mode: 'email', otp: '' })
  const [error, setError]             = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [showOtpScreen, setShowOtpScreen] = useState(false)
  const [pendingPhone, setPendingPhone]   = useState('')
  const [showPassword, setShowPassword]   = useState(false)
  const [wrongPortal, setWrongPortal]     = useState(false)
  const [suspendedMsg, setSuspendedMsg]   = useState('')
  const [isMobile, setIsMobile]           = useState(isMobileScreen)

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

  // ── Phone: step back from OTP screen ─────────────────────────────────────
  const handleBackFromOtp = useCallback(() => {
    setShowOtpScreen(false)
    setPendingPhone('')
    setError('')
    setForm(f => ({ ...f, otp: '' }))
  }, [])

  // ── Phone: verify the 6-digit code (called by PhoneOtpScreen on fill) ────
  const handleVerifyOtp = useCallback(async (code) => {
    setError('')
    setSubmitting(true)
    const { error: verifyErr } = await verifyPhoneLoginOTP(pendingPhone, code)
    setSubmitting(false)
    if (verifyErr) {
      setError(verifyErr)
      return
    }
    // Session is now set in Supabase client — AuthContext will pick it up
    // and redirect via the useEffect above (user + profile → /dashboard)
    sessionStorage.setItem('activeWebSession', '1')
  }, [pendingPhone])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setWrongPortal(false)
    setSuspendedMsg('')
    setSubmitting(true)

    try {
      // ── Phone: Send OTP ────────────────────────────────────────────────────
      if (form.mode === 'phone') {
        const { phone: normalised, error: sendErr } = await sendPhoneLoginOTP(form.phone)
        setSubmitting(false)
        if (sendErr) { setError(sendErr); return }
        setPendingPhone(normalised)
        setShowOtpScreen(true)
        setError('')
        return
      }

      // ── Email login (UNCHANGED) ────────────────────────────────────────────
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
    wrongPortal, suspendedMsg, showOtpScreen, pendingPhone,
    handleSubmit, handleVerifyOtp, handleBackFromOtp,
    navigate, setSuspendedMsg, setWrongPortal,
  }

  return isMobile
    ? <MobileLogin {...sharedProps} />
    : <DesktopLogin {...sharedProps} />
}
