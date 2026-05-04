import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { signIn, verifyOtp, profile } = useAuth()
  const [form, setForm] = useState({ email: '', phone: '', password: '', mode: 'email', otp: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [pendingPhone, setPendingPhone] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    if (form.mode === 'phone' && !showOtpInput) {
      const { user, error } = await signIn({ phone: form.phone })
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
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft size={16} />
          Back to home
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Welcome back</h1>
              <p className="text-sm text-gray-500">Sign in to your account</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {form.mode === 'email' ? 'Email' : 'Phone Number'}
              </label>
              {form.mode === 'email' ? (
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="you@example.com"
                />
              ) : (
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="09123456789"
                />
              )}
            </div>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setForm({ ...form, mode: form.mode === 'email' ? 'phone' : 'email' })
                  setShowOtpInput(false)
                  setError('')
                }}
                className="text-blue-600 hover:text-blue-700"
              >
                Use {form.mode === 'email' ? 'phone number' : 'email'} instead
              </button>
            </div>

            {form.mode === 'email' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Enter your password"
                />
              </div>
            ) : showOtpInput ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
                <input
                  type="text"
                  required
                  value={form.otp}
                  onChange={(e) => setForm({ ...form, otp: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                />
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
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

          <p className="mt-4 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/signup')}
              className="text-blue-600 font-medium hover:text-blue-700"
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
