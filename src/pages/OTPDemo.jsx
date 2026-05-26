import { useState } from 'react'
import { sendOTP, verifyOTP } from '../lib/otp'

export default function OTPDemo() {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('') // 'success', 'error', 'info'

  const handleSendOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { otp: generatedOtp, error } = await sendOTP(phone)

      if (error) {
        setMessageType('error')
        setMessage(`❌ Error sending OTP: ${error.message}`)
      } else {
        setMessageType('info')
        setMessage(`✅ OTP sent to ${phone}`)
        setShowOtpInput(true)
        console.log(`📱 Demo: OTP is ${generatedOtp} (check console logs)`)
      }
    } catch (err) {
      setMessageType('error')
      setMessage(`❌ Exception: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { isValid, error } = await verifyOTP(phone, otp)

      if (error) {
        setMessageType('error')
        setMessage(`❌ Verification failed: ${error.message}`)
      } else if (isValid) {
        setMessageType('success')
        setMessage('✅ OTP verified successfully!')
        setShowOtpInput(false)
        setOtp('')
        setPhone('')
      } else {
        setMessageType('error')
        setMessage('❌ Invalid or expired OTP')
      }
    } catch (err) {
      setMessageType('error')
      setMessage(`❌ Exception: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const messageStyles = {
    success: 'bg-green-100 border-green-400 text-green-700',
    error: 'bg-red-100 border-red-400 text-red-700',
    info: 'bg-blue-100 border-blue-400 text-blue-700',
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">🔐 OTP Demo</h1>
        <p className="text-center text-gray-600 mb-6 text-sm">
          Fake/demo OTP system - Check console for generated codes
        </p>

        {message && (
          <div className={`mb-4 p-3 border rounded ${messageStyles[messageType]}`}>
            {message}
          </div>
        )}

        {!showOtpInput ? (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+63 9xx xxx xxxx"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
            >
              {loading ? '⏳ Sending...' : '📱 Send OTP'}
            </button>

            <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800 font-semibold mb-2">💡 Demo Instructions:</p>
              <ul className="text-sm text-amber-700 list-disc list-inside space-y-1">
                <li>Enter any phone number</li>
                <li>Check browser console for generated OTP</li>
                <li>Enter the OTP to verify</li>
              </ul>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Phone: {phone}</p>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enter OTP Code
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="000000"
                maxLength="6"
                className="w-full px-4 py-3 text-center text-2xl font-bold tracking-widest border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                👉 Check console for OTP code
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
              >
                {loading ? '⏳ Verifying...' : '✅ Verify OTP'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowOtpInput(false)
                  setOtp('')
                }}
                className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition duration-200"
              >
                ← Back
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
