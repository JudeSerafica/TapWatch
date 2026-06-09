import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { sendOTP, verifyOTP } from '../lib/otp'
import { FaShieldAlt, FaUsers, FaBell, FaEye, FaEyeSlash } from "react-icons/fa";
 
// API endpoints
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const SEND_OTP_URL = `${API_BASE_URL}/api/signup`
const VERIFY_OTP_URL = `${API_BASE_URL}/api/verify`
 
export default function Signup() {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', confirmPassword: '', mode: 'phone', otp: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [pendingPhone, setPendingPhone] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
 
  // NEW: email verification state
  const [showEmailOtp, setShowEmailOtp] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
 
  // NEW: countdown timer for email OTP expiry
  useEffect(() => {
    let timer
    if (timeRemaining > 0 && form.mode === 'email' && showEmailOtp) {
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setShowEmailOtp(false)
            setError('Verification code expired. Please try again.')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [timeRemaining, showEmailOtp, form.mode])
 
  // NEW: format MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
 
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
 
    // Prevent double submission while request is in progress
    if (loading) {
      console.warn('Form submission already in progress')
      return
    }
 
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
 
    setLoading(true)
 
    if (form.mode === 'phone' && !showOtpInput) {
      // ── Phone: send OTP (unchanged) ──
      const { error } = await sendOTP(form.phone)
      setLoading(false)
      if (error) {
        setError('Failed to send OTP: ' + error.message)
      } else {
        setShowOtpInput(true)
        setPendingPhone(form.phone)
        setError(`✅ OTP sent to ${form.phone}. Check browser console for code! 👀`)
      }
 
    } else if (form.mode === 'phone' && showOtpInput) {
      // ── Phone: verify OTP (unchanged) ──
      const { isValid, error } = await verifyOTP(pendingPhone, form.otp)
      setLoading(false)
      if (error) {
        setError('OTP verification failed: ' + error.message)
      } else if (isValid) {
        setSignupSuccess(true)
        setTimeout(() => navigate('/login'), 2500)
      } else {
        setError('Invalid or expired OTP. Please try again.')
      }
 
    } else if (form.mode === 'email' && !showEmailOtp) {
      // ── Email step 1: send verification code to email ──
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
          console.error('Signup error response:', result)
          // Show specific error messages
          if (response.status === 429) {
            setError(`⏱️ ${result.error}`)
          } else {
            setError(result.error || `Server error (${response.status})`)
          }
        } else {
          console.log('OTP sent successfully to:', form.email)
          setShowEmailOtp(true)
          setTimeRemaining(300)
          setError('')
        }
      } catch (err) {
        setLoading(false)
        console.error('Signup fetch error:', err)
        setError('Could not connect to server. Is backend running on port 5000?')
      }
 
    } else if (form.mode === 'email' && showEmailOtp) {
      // ── Email step 2: verify code and complete signup ──
      try {
        const response = await fetch(VERIFY_OTP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.email.trim(),
            code: form.otp.trim(),
            password: form.password.trim(),
          }),
        })
        const text = await response.text()
        const result = text ? JSON.parse(text) : {}
        if (!response.ok) {
          setLoading(false)
          setError(result.error || `Server error (${response.status}) — check your backend /api/verify route.`)
        } else {
          // OTP verified — now create the user via Supabase Auth
          // Add small delay to avoid rate limiting on rapid clicks
          await new Promise(resolve => setTimeout(resolve, 500))
          
          // Use exact same values that were verified
          const signUpData = {
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password.trim()
          }
          
          console.log('Signing up with:', { email: signUpData.email, name: signUpData.name })
          
          const { error: signUpError } = await signUp(signUpData)
          setLoading(false)
          if (signUpError) {
            // Handle Supabase rate limit errors
            if (signUpError.includes('too many') || signUpError.includes('rate') || signUpError.includes('429')) {
              setError('Too many signup attempts. Please wait a moment and try again.')
            } else if (signUpError.includes('already')) {
              setError('This email is already registered. Please sign in instead.')
            } else if (signUpError.includes('Invalid')) {
              setError('Signup failed. Please try again with different credentials.')
            } else {
              setError(signUpError)
            }
          } else {
            setSignupSuccess(true)
            setTimeout(() => navigate('/login'), 2500)
          }
        }
      } catch (err) {
        setLoading(false)
        setError('Could not connect to server. Is your backend running?')
        console.error('Verify fetch error:', err)
      }
    }
  }
 
  return (
    <div
      className="h-screen w-screen overflow-hidden bg-contain bg-center bg-no-repeat flex items-center justify-center px-4 relative"
      style={{
        backgroundImage: "url('/background.jpg')",
        backgroundSize: "100% 100%",
      }}
    >
      <div className="absolute left-40 top-1/2 -translate-y-1/2 hidden lg:block z-10 scale-90 origin-left">
 
        {/* LOGO */}
        <img
          src="/Tapinac.logo.jpg"
          alt="TapWatch Logo"
          className="w-45 h-45 object-contain mx-auto mb-3 drop-shadow-lg"
        />
 
        {/* TITLE */}
        <h1 className="text-[75px] font-bold leading-none">
          <span className="text-black">Tap</span>
          <span className="text-blue-600">-</span>
          <span className="text-blue-600">Watch</span>
        </h1>
 
        {/* SUBTITLE */}
        <p className="text-[30px] text-center text-black font-semibold mt-1">
          Barangay East Tapinac
        </p>
 
        {/* LINE */}
        <div className="w-[375px] h-[1px] bg-blue-200 mt-3 mb-3 relative">
          <div className="absolute left-1/2 -translate-x-1/2 -top-[1px] w-8 h-[2px] bg-blue-600 rounded-full"></div>
        </div>
 
        {/* DESCRIPTION */}
        <p className="text-[19px] text-center text-blue-600 font-medium mb-6">
          Community Emergency Monitoring System
        </p>
 
        {/* FEATURES */}
        <div className="space-y-5 mb-40">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md">
              <span className="text-white text-lg"><FaShieldAlt /></span>
            </div>
            <div>
              <h3 className="text-[19px] font-semibold text-black">Report Incidents</h3>
              <p className="text-[15px] text-gray-700 leading-6">Quickly report emergencies<br />in your area</p>
            </div>
          </div>
 
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md">
              <span className="text-white text-lg"><FaUsers className="text-white text-xl" /></span>
            </div>
            <div>
              <h3 className="text-[19px] font-semibold text-black">Community Safety</h3>
              <p className="text-[15px] text-gray-700 leading-6">Working together for a<br />safer community</p>
            </div>
          </div>
 
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md">
              <span className="text-white text-lg"><FaBell className="text-white text-xl" /></span>
            </div>
            <div>
              <h3 className="text-[19px] font-semibold text-black">Real-time Updates</h3>
              <p className="text-[15px] text-gray-700 leading-6">Stay informed with live<br />incident updates</p>
            </div>
          </div>
        </div>
      </div>
 
      <div className="w-full max-w-md lg:ml-auto lg:mr-90">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden relative">
          <div className="p-8">
            {/* STEP 1: CREATE ACCOUNT HEADER */}
            {!showEmailOtp && !showOtpInput && (
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Account</h1>
                <p className="text-gray-600 text-sm">Join Tap-Watch to report incidents</p>
              </div>
            )}

            {/* STEP 2: VERIFICATION HEADER */}
            {(showEmailOtp || showOtpInput) && (
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Account</h1>
                <p className="text-gray-600 text-sm">
                  {form.mode === 'email' ? 'Check your email for the verification code' : 'Enter the OTP sent to your phone'}
                </p>
              </div>
            )}
 
            {error && (
              <div className="mb-4 p-3 rounded bg-red-100 text-red-800 text-sm">{error}</div>
            )}
 
            {!signupSuccess && (
              <>
                {/* LOADING OVERLAY - appears while sending verification code */}
                {loading && form.mode === 'email' && !showEmailOtp && (
                  <div className="absolute inset-0 bg-black/30 rounded-lg flex flex-col items-center justify-center z-40 backdrop-blur-sm">
                    <style>{`
                      @keyframes spin {
                        to { transform: rotate(360deg); }
                      }
                      .loader-spinner {
                        width: 50px;
                        height: 50px;
                        border: 4px solid rgba(255, 255, 255, 0.2);
                        border-top-color: white;
                        border-radius: 50%;
                        animation: spin 0.8s linear infinite;
                      }
                    `}</style>
                    <div className="loader-spinner"></div>
                    <p className="text-white font-medium mt-4 text-center">Sending verification code...</p>
                    <p className="text-white/70 text-sm mt-2">Please wait a moment</p>
                  </div>
                )}

                {/* STEP 1: CREATE ACCOUNT FORM - ONLY SHOW BEFORE VERIFICATION */}
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
                        <input
                          type="email"
                          required
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                          placeholder="you@example.com"
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
                      onClick={() => {
                        setForm({ ...form, mode: form.mode === 'email' ? 'phone' : 'email', otp: '' })
                        setShowOtpInput(false)
                        setShowEmailOtp(false)
                        setTimeRemaining(0)
                        setError('')
                      }}
                      className="text-sm text-blue-700 hover:text-blue-800 font-medium"
                    >
                      Use {form.mode === 'email' ? 'phone number' : 'email'} instead
                    </button>
 
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                          placeholder="Create a password"
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
 
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          value={form.confirmPassword}
                          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                          placeholder="Confirm your password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                    </div>
 
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2 bg-blue-700 text-white rounded font-medium hover:bg-blue-800 disabled:opacity-50 mt-6 flex items-center justify-center gap-2"
                    >
                      {loading && (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      )}
                      <span>
                        {loading
                          ? form.mode === 'email' && showEmailOtp
                            ? 'Verifying code...'
                            : 'Sending code...'
                          : form.mode === 'phone' && !showOtpInput
                            ? 'Send OTP'
                            : form.mode === 'phone' && showOtpInput
                              ? 'Verify & Sign Up'
                              : form.mode === 'email' && !showEmailOtp
                                ? 'Send Verification Code'
                                : 'Verify & Create Account'}
                      </span>
                    </button>
                  </form>
                )}

                {/* STEP 2: VERIFICATION FORM - Email OTP */}
                {form.mode === 'email' && showEmailOtp && (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">Verify Your Email</h2>
                      <p className="text-sm text-gray-600">Enter the 6-digit code sent to</p>
                      <p className="text-sm font-medium text-blue-600">{form.email}</p>
                    </div>

                    <div className="mb-4 p-4 rounded bg-blue-50 border border-blue-200">
                      <p className="text-sm text-blue-700">
                        📧 Check your email for the verification code
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Verification Code</label>
                      <input
                        type="text"
                        required
                        value={form.otp}
                        onChange={(e) => setForm({ ...form, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                        className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 text-lg tracking-widest text-center font-semibold"
                        placeholder="000000"
                        maxLength={6}
                      />
                      {timeRemaining > 0 && (
                        <p className="text-xs text-gray-500 mt-2 text-center">
                          Code expires in: {formatTime(timeRemaining)}
                        </p>
                      )}
                      {timeRemaining === 0 && showEmailOtp && (
                        <p className="text-xs text-red-500 mt-2 text-center">
                          Code has expired. Please request a new one.
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading || timeRemaining === 0}
                      className="w-full py-3 bg-blue-700 text-white rounded font-medium hover:bg-blue-800 disabled:opacity-50 mt-6 flex items-center justify-center gap-2"
                    >
                      {loading && (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      )}
                      <span>
                        {loading ? 'Verifying code...' : 'Verify & Create Account'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowEmailOtp(false)
                        setForm({ ...form, otp: '' })
                        setTimeRemaining(0)
                        setError('')
                      }}
                      className="w-full py-2 text-gray-600 font-medium hover:text-gray-800 border border-gray-300 rounded"
                    >
                      ← Back to Create Account
                    </button>
                  </form>
                )}

                {/* STEP 2: VERIFICATION FORM - Phone OTP */}
                {form.mode === 'phone' && showOtpInput && (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">Verify Your Phone</h2>
                      <p className="text-sm text-gray-600">Enter the 6-digit code sent to</p>
                      <p className="text-sm font-medium text-blue-600">{pendingPhone}</p>
                    </div>

                    <div className="mb-4 p-4 rounded bg-blue-50 border border-blue-200">
                      <p className="text-sm text-blue-700">
                        📱 Check your SMS for the verification code
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">OTP Code</label>
                      <input
                        type="text"
                        required
                        value={form.otp}
                        onChange={(e) => setForm({ ...form, otp: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 text-lg tracking-widest text-center font-semibold"
                        placeholder="000000"
                        maxLength={6}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 bg-blue-700 text-white rounded font-medium hover:bg-blue-800 disabled:opacity-50 mt-6 flex items-center justify-center gap-2"
                    >
                      {loading && (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      )}
                      <span>
                        {loading ? 'Verifying code...' : 'Verify & Sign Up'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowOtpInput(false)
                        setForm({ ...form, otp: '' })
                        setError('')
                      }}
                      className="w-full py-2 text-gray-600 font-medium hover:text-gray-800 border border-gray-300 rounded"
                    >
                      ← Back to Create Account
                    </button>
                  </form>
                )}
              </>
            )}
 
            {!signupSuccess && (
              <p className="mt-6 text-center text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="text-blue-700 font-medium hover:text-blue-800"
                >
                  Sign in
                </button>
              </p>
            )}
          {signupSuccess && (
            <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-white rounded-lg flex flex-col items-center justify-center z-50 p-8">
              <style>{`
                @keyframes popIn {
                  0% { transform: scale(0); opacity: 0; }
                  60% { transform: scale(1.15); opacity: 1; }
                  100% { transform: scale(1); opacity: 1; }
                }
                @keyframes fadeUp {
                  0% { opacity: 0; transform: translateY(20px); }
                  100% { opacity: 1; transform: translateY(0); }
                }
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
                .success-circle {
                  width: 100px;
                  height: 100px;
                  border-radius: 50%;
                  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                  box-shadow: 0 10px 40px rgba(37, 99, 235, 0.3);
                }
                .success-check {
                  color: white;
                  font-size: 52px;
                  line-height: 1;
                  font-weight: bold;
                }
                .success-title {
                  animation: fadeUp 0.5s ease 0.3s both;
                  font-size: 32px;
                  font-weight: 700;
                  color: #1f2937;
                  margin-top: 24px;
                  text-align: center;
                }
                .success-sub {
                  animation: fadeUp 0.5s ease 0.5s both;
                  font-size: 15px;
                  color: #9ca3af;
                  text-align: center;
                  margin-top: 12px;
                  line-height: 1.5;
                }
                .success-loader {
                  width: 28px;
                  height: 28px;
                  border: 3px solid #dbeafe;
                  border-top-color: #2563eb;
                  border-radius: 50%;
                  animation: spin 0.8s linear infinite, fadeUp 0.5s ease 0.7s both;
                  opacity: 0;
                  margin-top: 40px;
                }
              `}</style>
              <div className="success-circle">
                <span className="success-check">✓</span>
              </div>
              <h2 className="success-title">
                Sign up successful!
              </h2>
              <p className="success-sub">
                Welcome aboard! Your account has been created.<br />Redirecting to login...
              </p>
              <div className="success-loader"></div>
            </div>
          )}
          </div>
        </div>
        <button
          onClick={() => navigate('/')}
          className="text-sm text-gray-600 hover:text-gray-900 mt-6 mx-auto block"
        >
          ← Back to home
        </button>
      </div>
    </div>
  )
}