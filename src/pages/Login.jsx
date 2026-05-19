import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const { signIn, signUp, verifyOtp, profile } = useAuth()
  const [form, setForm] = useState({ email: '', phone: '', password: '', mode: 'email', otp: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [pendingPhone, setPendingPhone] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    const timeoutId = setTimeout(() => {
      setLoading(false)
      setError('Login timed out. Please check your connection and try again.')
    }, 10000)
    
    try {
      if (form.mode === 'phone' && !showOtpInput) {
        const { user, error } = await signIn({ phone: form.phone })
        clearTimeout(timeoutId)
        setLoading(false)
        if (error) {
          setError(error)
        } else {
          setShowOtpInput(true)
          setPendingPhone(form.phone)
          setError('OTP sent to your phone. Please enter the code.')
        }
      } else if (form.mode === 'phone' && showOtpInput) {
        const { user, error } = await verifyOtp(pendingPhone, form.otp)
        clearTimeout(timeoutId)
        setLoading(false)
        if (error) {
          setError(error)
        } else {
          if (profile?.role === 'admin') {
            navigate('/admin')
          } else {
            navigate('/dashboard')
          }
        }
      } else {
        const { user, error } = await signIn({ email: form.email, password: form.password })
        clearTimeout(timeoutId)
        setLoading(false)
        if (error) {
          setError(error)
        } else {
          if (profile?.role === 'admin') {
            navigate('/admin')
          } else {
            navigate('/dashboard')
          }
        }
      }
    } catch (err) {
      clearTimeout(timeoutId)
      setLoading(false)
      setError('An unexpected error occurred. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          {/* Logo */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex justify-center">
            <img src="/Tapinac.logo.jpg" alt="Tap-Watch Logo" className="h-16 w-16 object-contain" />
          </div>

          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign In</h1>
              <p className="text-gray-600 text-sm">Enter your credentials to access your account</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded bg-red-100 text-red-800 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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

              {form.mode === 'email' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                    placeholder="Enter your password"
                  />
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
                disabled={loading}
                className="w-full py-2 bg-blue-700 text-white rounded font-medium hover:bg-blue-800 disabled:opacity-50 mt-6"
              >
                {loading 
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
              <button
                onClick={() => navigate('/signup')}
                className="text-blue-700 font-medium hover:text-blue-800"
              >
                Sign up
              </button>
            </p>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-center text-xs text-gray-500 mb-3">Demo Accounts (for testing)</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    setLoading(true)
                    setError('')
                    try {
                      const { user, error } = await signIn({ email: 'demo@tapwatch.com', password: 'demo123' })
                      setLoading(false)
                      if (error) {
                        setError('Demo resident error: ' + error)
                      } else if (user) {
                        navigate('/dashboard')
                      }
                    } catch (err) {
                      setLoading(false)
                      setError('Error: ' + err.message)
                    }
                  }}
                  disabled={loading}
                  className="py-2 px-3 bg-blue-50 border border-blue-200 text-blue-700 rounded text-sm font-medium hover:bg-blue-100 disabled:opacity-50"
                >
                  Demo Resident
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setLoading(true)
                    setError('')
                    try {
                      const { user, error } = await signIn({ email: 'admin@tapwatch.com', password: 'admin123' })
                      setLoading(false)
                      if (error) {
                        setError('Demo admin error: ' + error)
                      } else if (user) {
                        navigate('/admin')
                      }
                    } catch (err) {
                      setLoading(false)
                  setError('Error: ' + err.message)
                }
              }}
              disabled={loading}
              className="py-2 px-3 bg-blue-50 border border-blue-200 text-blue-700 rounded text-sm font-medium hover:bg-blue-100 disabled:opacity-50"
            >
              Demo Admin
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-3">If buttons don't work, create demo accounts in Supabase first</p>
            </div>
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
