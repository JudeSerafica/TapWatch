import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { notifyAllAdmins } from '../lib/notificationService'

export default function SOSPanicModal({ isOpen, onClose, profile }) {
  const [countdown, setCountdown] = useState(5)
  const [isActivated, setIsActivated] = useState(false)
  const [location, setLocation] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    if (isOpen && !isActivated) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            })
          },
          (error) => { console.error('Location error:', error) }
        )
      }
    }
  }, [isOpen, isActivated])

  useEffect(() => {
    if (isActivated && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (isActivated && countdown === 0) {
      sendSOSAlert()
    }
  }, [isActivated, countdown])

  const sendSOSAlert = async () => {
    console.log('🚨 sendSOSAlert function called!')
    console.log('Profile:', profile)
    console.log('Location:', location)
    
    try {
      if (!profile?.id) {
        console.error('❌ No user profile found')
        alert('Error: User not logged in. Please log in and try again.')
        return
      }

      const sosIncident = {
        type: 'crime',
        description: `🚨 EMERGENCY SOS ALERT from ${profile?.full_name || 'User'}. Immediate assistance needed!`,
        location: location ? `Lat: ${location.latitude.toFixed(6)}, Lng: ${location.longitude.toFixed(6)}` : 'Location unavailable',
        latitude: location?.latitude,
        longitude: location?.longitude,
        status: 'pending',
        user_id: profile?.id,
        reporter_name: profile?.full_name,
        created_at: new Date().toISOString(),
        is_sos: true
      }

      console.log('📤 Attempting to save SOS alert:', sosIncident)

      const { data, error } = await supabase
        .from('incidents')
        .insert([sosIncident])
        .select()
        .single()

      if (error) {
        console.error('❌ Failed to save SOS alert:', error)
        alert(`Failed to send SOS alert: ${error.message}\n\nPlease call 911 directly for immediate help!`)
        return
      }

      console.log('✅ SOS Alert successfully saved to database:', data)
      
      // Notify all admins about SOS alert
      await notifyAllAdmins({
        title: '🚨 EMERGENCY SOS ALERT',
        message: `Emergency SOS from ${profile?.full_name || 'User'} at ${location ? `Lat: ${location.latitude.toFixed(4)}, Lng: ${location.longitude.toFixed(4)}` : 'Unknown location'}. IMMEDIATE ATTENTION REQUIRED!`,
        type: 'alert',
        incidentId: data.id
      })
      
      setIsActivated(false)
      setShowSuccess(true)
    } catch (err) {
      console.error('❌ Unexpected error sending SOS alert:', err)
      alert('Failed to send SOS alert. Please try again or call 911 directly.')
    }
  }

  const handleActivate = () => {
    setIsActivated(true)
  }

  const handleCancel = () => {
    setIsActivated(false)
    setCountdown(5)
    onClose()
  }

  const handleCloseSuccess = () => {
    setShowSuccess(false)
    setCountdown(5)
    onClose()
  }

  if (!isOpen) return null

  // ── SUCCESS MODAL ──
  if (showSuccess) {
    return (
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-md" 
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.6)'
        }}
      >
        <style>{`
          @keyframes sos-fadeInScale {
            0% { opacity: 0; transform: scale(0.85); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes sos-ripple {
            0% { transform: scale(0.8); opacity: 1; }
            100% { transform: scale(2.6); opacity: 0; }
          }
          @keyframes sos-checkDraw {
            0% { stroke-dashoffset: 100; }
            100% { stroke-dashoffset: 0; }
          }
          @keyframes sos-fadeInUp {
            0% { opacity: 0; transform: translateY(18px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes sos-slideIn {
            0% { opacity: 0; transform: translateX(-14px); }
            100% { opacity: 1; transform: translateX(0); }
          }
          .sos-wrap { animation: sos-fadeInScale 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
          .sos-r1 { animation: sos-ripple 1.8s ease-out infinite; }
          .sos-r2 { animation: sos-ripple 1.8s ease-out 0.6s infinite; }
          .sos-r3 { animation: sos-ripple 1.8s ease-out 1.2s infinite; }
          .sos-check { stroke-dasharray: 100; stroke-dashoffset: 100; animation: sos-checkDraw 0.55s ease forwards 0.45s; }
          .sos-t1 { animation: sos-fadeInUp 0.45s ease forwards 0.75s; opacity: 0; }
          .sos-t2 { animation: sos-fadeInUp 0.45s ease forwards 0.95s; opacity: 0; }
          .sos-i1 { animation: sos-slideIn 0.4s ease forwards 1.05s; opacity: 0; }
          .sos-i2 { animation: sos-slideIn 0.4s ease forwards 1.2s; opacity: 0; }
          .sos-i3 { animation: sos-slideIn 0.4s ease forwards 1.35s; opacity: 0; }
          .sos-f1 { animation: sos-fadeInUp 0.4s ease forwards 1.55s; opacity: 0; }
          .sos-f2 { animation: sos-fadeInUp 0.4s ease forwards 1.75s; opacity: 0; }
        `}</style>

        <div className="sos-wrap bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* TOP — red section with ripple + checkmark */}
          <div className="bg-red-600 pt-10 pb-8 px-8 text-center relative">
            <div className="relative w-32 h-32 mx-auto mb-5">
              <div className="sos-r1 absolute inset-0 rounded-full border-2 border-white/50" />
              <div className="sos-r2 absolute inset-0 rounded-full border-2 border-white/35" />
              <div className="sos-r3 absolute inset-0 rounded-full border-2 border-white/20" />
              <div className="absolute inset-3 bg-white/20 rounded-full flex items-center justify-center">
                <svg width="54" height="54" viewBox="0 0 54 54" fill="none">
                  <path
                    className="sos-check"
                    d="M11 28L22 39L43 17"
                    stroke="white"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            <h2 className="sos-t1 text-white text-2xl font-bold mb-1">SOS Alert Sent!</h2>
            <p className="sos-t2 text-white/80 text-sm">Emergency services have been notified</p>
          </div>

          {/* BOTTOM — checklist + footer */}
          <div className="px-6 pt-5 pb-6">
            <div className="bg-red-50 rounded-xl p-4 mb-4 space-y-2.5">
              <div className="sos-i1 flex items-center gap-3 text-gray-800 text-sm">
                <span className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-white text-[11px] flex-shrink-0">✓</span>
                Barangay officials notified
              </div>
              <div className="sos-i2 flex items-center gap-3 text-gray-800 text-sm">
                <span className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-white text-[11px] flex-shrink-0">✓</span>
                Your location has been shared
              </div>
              <div className="sos-i3 flex items-center gap-3 text-gray-800 text-sm">
                <span className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-white text-[11px] flex-shrink-0">✓</span>
                Emergency services alerted
              </div>
            </div>

            <p className="sos-f1 text-gray-600 text-xs text-center mb-4 leading-relaxed">
              Help is on the way! Stay safe and stay on the line if possible.
            </p>

            <button
              onClick={handleCloseSuccess}
              className="sos-f2 w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-base transition"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── ORIGINAL MODAL (activation + countdown) ──
  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-md" 
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.6)'
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {!isActivated ? (
          <>
            <div className="p-8 text-center">
              <div className="w-32 h-32 mx-auto mb-6 bg-red-600 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-6xl">🚨</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Emergency SOS
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                This will immediately alert emergency services and share your location.
                Use only in life-threatening situations.
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleActivate}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg transition"
                >
                  ACTIVATE SOS
                </button>
                <button
                  onClick={handleCancel}
                  className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="p-8 text-center bg-red-600 text-white">
              <div className="w-40 h-40 mx-auto mb-6 bg-white rounded-full flex items-center justify-center">
                <span className="text-7xl font-bold text-red-600 animate-pulse">
                  {countdown}
                </span>
              </div>
              <h2 className="text-2xl font-bold mb-3">
                Sending SOS Alert...
              </h2>
              <p className="text-sm opacity-90 mb-6">
                Emergency services will be notified in {countdown} seconds
              </p>
              <button
                onClick={handleCancel}
                className="w-full py-3 bg-white text-red-600 rounded-xl font-bold transition hover:bg-gray-100"
              >
                CANCEL
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
