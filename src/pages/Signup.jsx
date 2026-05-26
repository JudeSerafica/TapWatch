import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { sendOTP, verifyOTP } from '../lib/otp'
import { FaShieldAlt } from "react-icons/fa";
import { FaUsers } from "react-icons/fa";
import { FaBell } from "react-icons/fa";

export default function Signup() {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', confirmPassword: '', mode: 'phone', otp: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [pendingPhone, setPendingPhone] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    setLoading(true)
    
    if (form.mode === 'phone' && !showOtpInput) {
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
      const { isValid, error } = await verifyOTP(pendingPhone, form.otp)
      setLoading(false)
      if (error) {
        setError('OTP verification failed: ' + error.message)
      } else if (isValid) {
        navigate('/profile-setup')
      } else {
        setError('Invalid or expired OTP. Please try again.')
      }
    } else {
      const { error } = await signUp({ name: form.name, email: form.email, password: form.password })
      setLoading(false)
      if (error) {
        if (error.toLowerCase().includes('rate limit') || error.includes('429')) {
          setError('Too many signup attempts. Please wait 1 hour before trying again.')
        } else {
          setError(error)
        }
      } else {
        setEmailSent(true)
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

    {/* FEATURE 1 */}
    <div className="flex items-start gap-3">
      <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md">
        <span className="text-white text-lg"><FaShieldAlt /></span>
      </div>

      <div>
        <h3 className="text-[19px] font-semibold text-black">
          Report Incidents
        </h3>
        <p className="text-[15px] text-gray-700 leading-6">
          Quickly report emergencies<br />
          in your area
        </p>
      </div>
    </div>

    {/* FEATURE 2 */}
    <div className="flex items-start gap-3">
      <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md">
        <span className="text-white text-lg"><FaUsers className="text-white text-xl" /></span>
      </div>

      <div>
        <h3 className="text-[19px] font-semibold text-black">
          Community Safety
        </h3>
        <p className="text-[15px] text-gray-700 leading-6">
          Working together for a<br />
          safer community
        </p>
      </div>
    </div>

    {/* FEATURE 3 */}
    <div className="flex items-start gap-3">
      <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md">
        <span className="text-white text-lg"><FaBell className="text-white text-xl" /></span>
      </div>

      <div>
        <h3 className="text-[19px] font-semibold text-black">
          Real-time Updates
        </h3>
        <p className="text-[15px] text-gray-700 leading-6">
          Stay informed with live<br />
          incident updates
        </p>
      </div>
    </div>
  </div>
</div>

      <div className="w-full max-w-md lg:ml-auto lg:mr-90">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Account</h1>
              <p className="text-gray-600 text-sm">Join Tap-Watch to report incidents</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded bg-red-100 text-red-800 text-sm">{error}</div>
            )}

            {emailSent && (
              <div className="mb-4 p-4 rounded bg-blue-100 border border-blue-300 text-blue-800 text-sm">
                <div className="font-semibold mb-1">Verification email sent!</div>
                <div>Please check your email and click the verification link to activate your account.</div>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="mt-3 text-blue-900 font-medium text-sm underline hover:text-blue-950"
                >
                  Go to Login
                </button>
              </div>
            )}

            {!emailSent && (
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
                    setForm({ ...form, mode: form.mode === 'email' ? 'phone' : 'email' })
                    setShowOtpInput(false)
                    setError('')
                  }}
                  className="text-sm text-blue-700 hover:text-blue-800 font-medium"
                >
                  Use {form.mode === 'email' ? 'phone number' : 'email'} instead
                </button>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                    placeholder="Create a password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                    placeholder="Confirm your password"
                  />
                </div>

                {form.mode === 'phone' && showOtpInput && (
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
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-blue-700 text-white rounded font-medium hover:bg-blue-800 disabled:opacity-50 mt-6"
                >
                  {loading 
                    ? 'Processing...' 
                    : form.mode === 'phone' && !showOtpInput 
                      ? 'Send OTP' 
                      : form.mode === 'phone' && showOtpInput 
                        ? 'Verify & Sign Up' 
                        : 'Sign Up'}
                </button>
              </form>
            )}

            {!emailSent && (
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
