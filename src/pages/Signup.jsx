import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { sendOTP, verifyOTP } from '../lib/otp'
import { FaShieldAlt, FaUsers, FaBell, FaEye, FaEyeSlash, FaEnvelope, FaPhone } from 'react-icons/fa'

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
const strengthColor  = ['bg-red-400', 'bg-red-400', 'bg-yellow-400', 'bg-blue-500', 'bg-green-500']
const strengthText   = ['text-red-500', 'text-red-500', 'text-yellow-600', 'text-blue-600', 'text-green-600']

// API endpoints
import API_BASE_URL from '../config'
const SEND_OTP_URL   = `${API_BASE_URL}/api/signup`
const VERIFY_OTP_URL = `${API_BASE_URL}/api/verify`

const USER_MESSAGES = {
  'User already registered': 'An account with this email already exists.',
  'already registered':      'An account with this email already exists.',
  'Invalid login credentials': 'Incorrect email or password.',
  'Password should be':      'Password must be at least 6 characters.',
  'Too many requests':       'Too many attempts. Please wait a moment and try again.',
}
const friendlyError = (err) => {
  if (!err) return 'Something went wrong. Please try again.'
  const msg = typeof err === 'string' ? err : (err.message || '')
  for (const [key, friendly] of Object.entries(USER_MESSAGES)) {
    if (msg.includes(key)) return friendly
  }
  return 'Something went wrong. Please try again.'
}

function isMobileScreen() {
  return window.innerWidth < 1024
}

/* ──────────────────────────────────────────────────────────────────────
   MOBILE SIGNUP
   ────────────────────────────────────────────────────────────────────── */
function MobileSignup({ navigate, formState }) {
  const {
    form, setForm, error, loading,
    showOtpInput, setShowOtpInput,
    showEmailOtp, setShowEmailOtp,
    timeRemaining, pendingPhone,
    signupSuccess,
    showPassword, setShowPassword,
    showConfirmPassword, setShowConfirmPassword,
    handleSubmit,
    formatTime,
  } = formState

  const isVerifyStep = showOtpInput || showEmailOtp

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Back button */}
      <div className="px-6 pt-12 pb-4">
        <button
          onClick={() => {
            if (isVerifyStep) {
              setShowOtpInput(false)
              setShowEmailOtp(false)
            } else {
              navigate(-1)
            }
          }}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 active:bg-gray-200"
        >
          ←
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 px-6 pb-8 overflow-y-auto">

        {!isVerifyStep ? (
          <>
            <h1 className="text-[24px] font-extrabold text-gray-900 mb-1">Create Your Account</h1>
            <p className="text-sm text-gray-500 mb-5">Choose your preferred registration method</p>

            {/* Method toggle tabs */}
            <div className="flex rounded-xl bg-gray-100 p-1 mb-5">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, mode: 'email', otp: '' }))}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  form.mode === 'email' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
                }`}
              >
                <FaEnvelope className="text-xs" /> Email
              </button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, mode: 'phone', otp: '' }))}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  form.mode === 'phone' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
                }`}
              >
                <FaPhone className="text-xs" /> Phone Number
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-[24px] font-extrabold text-gray-900 mb-1">
              {form.mode === 'email' ? 'Verify Your Email' : 'Verify Your Phone'}
            </h1>
            <p className="text-sm text-gray-500 mb-5">
              {form.mode === 'email'
                ? `We sent a 6-digit code to ${form.email}`
                : `We sent a 6-digit code to ${pendingPhone}`}
            </p>
          </>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* ── SUCCESS OVERLAY ── */}
        {signupSuccess && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center mb-5 shadow-lg shadow-blue-200">
              <span className="text-white text-4xl font-bold">✓</span>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Account Created!</h2>
            <p className="text-gray-500 text-sm">Welcome aboard! Redirecting to login...</p>
          </div>
        )}

        {!signupSuccess && (
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ── STEP 1: Registration form ── */}
            {!isVerifyStep && (
              <>
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                    placeholder="Juan Dela Cruz"
                  />
                </div>

                {/* Email or Phone */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {form.mode === 'email' ? 'Email Address' : 'Phone Number'}
                  </label>
                  {form.mode === 'email' ? (
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-4 py-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
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
                        className="flex-1 px-4 py-3.5 border border-gray-200 rounded-r-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                        placeholder="09XX XXX XXXX"
                      />
                    </div>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full px-4 py-3.5 pr-11 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                      placeholder="Create a password"
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
                  {form.password.length > 0 && (() => {
                    const strength = getStrength(form.password)
                    return (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[1, 2, 3, 4].map((bar) => (
                            <div
                              key={bar}
                              className={`h-1.5 flex-1 rounded-full transition-all ${strength >= bar ? strengthColor[strength] : 'bg-gray-200'}`}
                            />
                          ))}
                        </div>
                        <p className={`text-xs font-medium ${strengthText[getStrength(form.password)]}`}>
                          {strengthLabel[getStrength(form.password)]}
                        </p>
                      </div>
                    )
                  })()}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                      className="w-full px-4 py-3.5 pr-11 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-blue-600 text-white font-bold text-[15px] rounded-2xl shadow-lg shadow-blue-200 disabled:opacity-60 active:scale-95 transition-all mt-2 flex items-center justify-center gap-2"
                >
                  {loading && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {loading
                    ? 'Sending code...'
                    : form.mode === 'phone'
                      ? 'Send OTP'
                      : 'Send Verification Code'}
                </button>

                <p className="text-center text-sm text-gray-600">
                  Already have an account?{' '}
                  <button type="button" onClick={() => navigate('/login')} className="text-blue-600 font-bold">
                    Log in
                  </button>
                </p>
              </>
            )}

            {/* ── STEP 2: OTP / Verification ── */}
            {isVerifyStep && (
              <>
                {/* OTP boxes */}
                <MobileOtpInput
                  value={form.otp}
                  onChange={(val) => setForm({ ...form, otp: val })}
                />

                {/* Timer */}
                {form.mode === 'email' && timeRemaining > 0 && (
                  <p className="text-center text-sm text-gray-500">
                    Resend code in{' '}
                    <span className="font-semibold text-gray-700">{formatTime(timeRemaining)}</span>
                  </p>
                )}
                {form.mode === 'email' && timeRemaining === 0 && showEmailOtp && (
                  <p className="text-center text-sm text-red-500">Code expired. Please request a new one.</p>
                )}

                {/* Verify button */}
                <button
                  type="submit"
                  disabled={loading || (form.mode === 'email' && timeRemaining === 0)}
                  className="w-full py-4 bg-blue-600 text-white font-bold text-[15px] rounded-2xl shadow-lg shadow-blue-200 disabled:opacity-60 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {loading && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {loading ? 'Verifying...' : 'Verify & Create Account'}
                </button>

                {/* Back */}
                <button
                  type="button"
                  onClick={() => {
                    setShowOtpInput(false)
                    setShowEmailOtp(false)
                    setForm(f => ({ ...f, otp: '' }))
                  }}
                  className="w-full py-3.5 border border-gray-200 text-gray-600 font-medium text-sm rounded-2xl"
                >
                  ← Back
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

/* Six individual OTP digit boxes */
function MobileOtpInput({ value, onChange }) {
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '')

  const handleChange = (idx, char) => {
    const cleaned = char.replace(/\D/g, '').slice(-1)
    const arr = digits.map((d, i) => (i === idx ? cleaned : d))
    onChange(arr.join(''))
    // auto-focus next
    if (cleaned && idx < 5) {
      const next = document.getElementById(`otp-box-${idx + 1}`)
      next?.focus()
    }
  }

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      const prev = document.getElementById(`otp-box-${idx - 1}`)
      prev?.focus()
    }
  }

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          id={`otp-box-${i}`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="w-12 h-14 border-2 border-gray-200 rounded-xl text-center text-xl font-bold text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 transition-all"
        />
      ))}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────
   DESKTOP SIGNUP  (original design, preserved)
   ────────────────────────────────────────────────────────────────────── */
function DesktopSignup({ navigate, formState }) {
  const {
    form, setForm, error, loading,
    showOtpInput, setShowOtpInput,
    showEmailOtp, setShowEmailOtp,
    timeRemaining, pendingPhone,
    signupSuccess,
    showPassword, setShowPassword,
    showConfirmPassword, setShowConfirmPassword,
    handleSubmit,
    formatTime,
  } = formState

  return (
    <div
      className="h-screen w-screen overflow-hidden bg-contain bg-center bg-no-repeat flex items-center justify-center px-4 relative"
      style={{ backgroundImage: "url('/background.jpg')", backgroundSize: '100% 100%' }}
    >
      <div className="absolute left-40 top-1/2 -translate-y-1/2 hidden lg:block z-10 scale-90 origin-left">
        <img src="/Tapinac.logo.jpg" alt="TapWatch Logo" className="w-45 h-45 object-contain mx-auto mb-3 drop-shadow-lg" />
        <h1 className="text-[75px] font-bold leading-none">
          <span className="text-black">Tap</span>
          <span className="text-blue-600">-Watch</span>
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
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden relative">
          <div className="p-8">
            {!showEmailOtp && !showOtpInput && (
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Account</h1>
                <p className="text-gray-600 text-sm">Join Tap-Watch to report incidents</p>
              </div>
            )}
            {(showEmailOtp || showOtpInput) && (
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Account</h1>
                <p className="text-gray-600 text-sm">
                  {form.mode === 'email' ? 'Check your email for the verification code' : 'Enter the OTP sent to your phone'}
                </p>
              </div>
            )}

            {error && <div className="mb-4 p-3 rounded bg-red-100 text-red-800 text-sm">{error}</div>}

            {!signupSuccess && (
              <>
                {loading && form.mode === 'email' && !showEmailOtp && (
                  <div className="absolute inset-0 bg-black/30 rounded-lg flex flex-col items-center justify-center z-40 backdrop-blur-sm">
                    <style>{`@keyframes spin{to{transform:rotate(360deg)}}.loader-spinner{width:50px;height:50px;border:4px solid rgba(255,255,255,.2);border-top-color:white;border-radius:50%;animation:spin .8s linear infinite}`}</style>
                    <div className="loader-spinner" />
                    <p className="text-white font-medium mt-4 text-center">Sending verification code...</p>
                  </div>
                )}

                {!showEmailOtp && !showOtpInput && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                        placeholder="Juan Dela Cruz"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {form.mode === 'email' ? 'Email' : 'Phone Number'}
                      </label>
                      {form.mode === 'email' ? (
                        <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" placeholder="you@example.com" />
                      ) : (
                        <input type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" placeholder="09123456789" />
                      )}
                    </div>
                    <button type="button"
                      onClick={() => { setForm({ ...form, mode: form.mode === 'email' ? 'phone' : 'email', otp: '' }); setShowOtpInput(false); setShowEmailOtp(false) }}
                      className="text-sm text-blue-700 hover:text-blue-800 font-medium">
                      Use {form.mode === 'email' ? 'phone number' : 'email'} instead
                    </button>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} required value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" placeholder="Create a password" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                          {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                      {form.password.length > 0 && (() => {
                        const s = getStrength(form.password)
                        return (
                          <div className="mt-2">
                            <div className="flex gap-1 mb-1">
                              {[1,2,3,4].map(b => <div key={b} className={`h-1.5 flex-1 rounded-full transition-all ${s >= b ? strengthColor[s] : 'bg-gray-200'}`} />)}
                            </div>
                            <p className={`text-xs font-medium ${strengthText[s]}`}>{strengthLabel[s]}</p>
                          </div>
                        )
                      })()}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                      <div className="relative">
                        <input type={showConfirmPassword ? 'text' : 'password'} required value={form.confirmPassword}
                          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" placeholder="Confirm your password" />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                          {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                    </div>
                    <button type="submit" disabled={loading}
                      className="w-full py-2 bg-blue-700 text-white rounded font-medium hover:bg-blue-800 disabled:opacity-50 mt-6 flex items-center justify-center gap-2">
                      {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      <span>{loading ? 'Sending code...' : form.mode === 'phone' ? 'Send OTP' : 'Send Verification Code'}</span>
                    </button>
                  </form>
                )}

                {form.mode === 'email' && showEmailOtp && (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">Verify Your Email</h2>
                      <p className="text-sm text-gray-600">Enter the 6-digit code sent to</p>
                      <p className="text-sm font-medium text-blue-600">{form.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Verification Code</label>
                      <input type="text" required value={form.otp}
                        onChange={(e) => setForm({ ...form, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                        className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 text-lg tracking-widest text-center font-semibold"
                        placeholder="000000" maxLength={6} />
                      {timeRemaining > 0 && <p className="text-xs text-gray-500 mt-2 text-center">Expires in: {formatTime(timeRemaining)}</p>}
                    </div>
                    <button type="submit" disabled={loading || timeRemaining === 0}
                      className="w-full py-3 bg-blue-700 text-white rounded font-medium hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2">
                      {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      {loading ? 'Verifying...' : 'Verify & Create Account'}
                    </button>
                    <button type="button" onClick={() => { setShowEmailOtp(false); setForm({ ...form, otp: '' }) }}
                      className="w-full py-2 text-gray-600 font-medium hover:text-gray-800 border border-gray-300 rounded">
                      ← Back to Create Account
                    </button>
                  </form>
                )}

                {form.mode === 'phone' && showOtpInput && (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">Verify Your Phone</h2>
                      <p className="text-sm text-gray-600">Enter the 6-digit code sent to</p>
                      <p className="text-sm font-medium text-blue-600">{pendingPhone}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">OTP Code</label>
                      <input type="text" required value={form.otp}
                        onChange={(e) => setForm({ ...form, otp: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 text-lg tracking-widest text-center font-semibold"
                        placeholder="000000" maxLength={6} />
                    </div>
                    <button type="submit" disabled={loading}
                      className="w-full py-3 bg-blue-700 text-white rounded font-medium hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2">
                      {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      {loading ? 'Verifying...' : 'Verify & Sign Up'}
                    </button>
                    <button type="button" onClick={() => { setShowOtpInput(false); setForm({ ...form, otp: '' }) }}
                      className="w-full py-2 text-gray-600 font-medium hover:text-gray-800 border border-gray-300 rounded">
                      ← Back to Create Account
                    </button>
                  </form>
                )}
              </>
            )}

            {!signupSuccess && (
              <p className="mt-6 text-center text-sm text-gray-600">
                Already have an account?{' '}
                <button onClick={() => navigate('/login')} className="text-blue-700 font-medium hover:text-blue-800">Log in</button>
              </p>
            )}

            {signupSuccess && (
              <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-white rounded-lg flex flex-col items-center justify-center z-50 p-8">
                <style>{`@keyframes popIn{0%{transform:scale(0);opacity:0}60%{transform:scale(1.15);opacity:1}100%{transform:scale(1);opacity:1}}@keyframes fadeUp{0%{opacity:0;transform:translateY(20px)}100%{opacity:1;transform:translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}.success-circle{width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,#2563eb,#1d4ed8);display:flex;align-items:center;justify-content:center;animation:popIn .6s cubic-bezier(.175,.885,.32,1.275) forwards;box-shadow:0 10px 40px rgba(37,99,235,.3)}.success-check{color:white;font-size:52px;line-height:1;font-weight:bold}.success-title{animation:fadeUp .5s ease .3s both;font-size:32px;font-weight:700;color:#1f2937;margin-top:24px;text-align:center}.success-sub{animation:fadeUp .5s ease .5s both;font-size:15px;color:#9ca3af;text-align:center;margin-top:12px;line-height:1.5}.success-loader{width:28px;height:28px;border:3px solid #dbeafe;border-top-color:#2563eb;border-radius:50%;animation:spin .8s linear infinite,fadeUp .5s ease .7s both;opacity:0;margin-top:40px}`}</style>
                <div className="success-circle"><span className="success-check">✓</span></div>
                <h2 className="success-title">Sign up successful!</h2>
                <p className="success-sub">Welcome aboard!<br />Redirecting to login...</p>
                <div className="success-loader" />
              </div>
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
export default function Signup() {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', confirmPassword: '', mode: 'phone', otp: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [pendingPhone, setPendingPhone] = useState('')
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showEmailOtp, setShowEmailOtp] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isMobile, setIsMobile] = useState(isMobileScreen)

  useEffect(() => {
    const handler = () => setIsMobile(isMobileScreen())
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Countdown timer for email OTP
  useEffect(() => {
    let timer
    if (timeRemaining > 0 && form.mode === 'email' && showEmailOtp) {
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) { setShowEmailOtp(false); setError('Verification code expired. Please try again.'); return 0 }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [timeRemaining, showEmailOtp, form.mode])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (loading) return

    if (!showOtpInput && !showEmailOtp && form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    if (form.mode === 'phone' && !showOtpInput) {
      const { error } = await sendOTP(form.phone)
      setLoading(false)
      if (error) { setError(friendlyError(error)) }
      else { setShowOtpInput(true); setPendingPhone(form.phone); setError('') }

    } else if (form.mode === 'phone' && showOtpInput) {
      const { isValid, error } = await verifyOTP(pendingPhone, form.otp)
      setLoading(false)
      if (error) { setError(friendlyError(error)) }
      else if (isValid) { setSignupSuccess(true); setTimeout(() => navigate('/login'), 2500) }
      else { setError('Invalid or expired OTP. Please try again.') }

    } else if (form.mode === 'email' && !showEmailOtp) {
      try {
        const response = await fetch(SEND_OTP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email.trim(), password: form.password.trim() }),
        })
        const text = await response.text()
        const result = text ? JSON.parse(text) : {}
        setLoading(false)
        if (!response.ok) {
          setError(response.status === 429 ? 'Please wait before requesting another code.' : friendlyError(result.error))
        } else {
          setShowEmailOtp(true); setTimeRemaining(300); setError('')
        }
      } catch { setLoading(false); setError('Unable to connect to server. Please try again.') }

    } else if (form.mode === 'email' && showEmailOtp) {
      try {
        const response = await fetch(VERIFY_OTP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email.trim(), code: form.otp.trim(), password: form.password.trim(), name: form.name.trim() }),
        })
        const text = await response.text()
        const result = text ? JSON.parse(text) : {}
        setLoading(false)
        if (!response.ok) { setError(friendlyError(result.error)) }
        else { setSignupSuccess(true); setTimeout(() => navigate('/login'), 2500) }
      } catch { setLoading(false); setError('Unable to connect to server. Please try again.') }
    }
  }

  const formState = {
    form, setForm, error, loading,
    showOtpInput, setShowOtpInput,
    showEmailOtp, setShowEmailOtp,
    timeRemaining, pendingPhone,
    signupSuccess,
    showPassword, setShowPassword,
    showConfirmPassword, setShowConfirmPassword,
    handleSubmit, formatTime,
  }

  return isMobile
    ? <MobileSignup navigate={navigate} formState={formState} />
    : <DesktopSignup navigate={navigate} formState={formState} />
}
