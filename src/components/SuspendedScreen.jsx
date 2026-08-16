import { Ban, Clock, LogOut, Mail } from 'lucide-react'
import { useAuth } from '../context/useAuth'

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('en-PH', {
        month: 'long', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
      })
    : null

const fmtCountdown = (expiresAt) => {
  if (!expiresAt) return null
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return null
  const days  = Math.floor(diff / 86400000)
  const hrs   = Math.floor((diff % 86400000) / 3600000)
  const mins  = Math.floor((diff % 3600000) / 60000)
  if (days > 0)  return `${days} day${days > 1 ? 's' : ''} and ${hrs} hour${hrs !== 1 ? 's' : ''}`
  if (hrs > 0)   return `${hrs} hour${hrs > 1 ? 's' : ''} and ${mins} minute${mins !== 1 ? 's' : ''}`
  return `${mins} minute${mins !== 1 ? 's' : ''}`
}

export default function SuspendedScreen({ profile }) {
  const { signOut } = useAuth()

  const expiresAt     = profile?.suspension_expires_at
  const reason        = profile?.suspension_reason
  const expiresDisplay = fmtDateTime(expiresAt)
  const countdown     = fmtCountdown(expiresAt)
  const isTemporary   = !!expiresAt

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-red-100 border-4 border-red-200 flex items-center justify-center shadow-lg">
            <Ban size={36} className="text-red-600" />
          </div>
        </div>

        {/* card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* red accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-red-600 via-orange-500 to-red-600" />

          <div className="px-8 py-7 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Account Suspended</h1>
            <p className="text-gray-500 text-sm mb-6">
              Your access to Tap-Watch has been temporarily restricted by a barangay administrator.
            </p>

            {/* details box */}
            <div className="bg-red-50 rounded-xl border border-red-200 p-5 text-left space-y-3 mb-6">
              {reason && (
                <div>
                  <p className="text-[11px] font-semibold text-red-500 uppercase tracking-wider mb-0.5">Reason</p>
                  <p className="text-sm text-red-900 leading-relaxed">{reason}</p>
                </div>
              )}

              {isTemporary ? (
                <>
                  <div>
                    <p className="text-[11px] font-semibold text-red-500 uppercase tracking-wider mb-0.5">Account Restored On</p>
                    <p className="text-sm font-bold text-red-900">{expiresDisplay}</p>
                  </div>
                  {countdown && (
                    <div className="flex items-center gap-2 pt-1 border-t border-red-200">
                      <Clock size={14} className="text-red-400 flex-shrink-0" />
                      <p className="text-xs text-red-700">
                        Approximately <span className="font-semibold">{countdown}</span> remaining
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <p className="text-[11px] font-semibold text-red-500 uppercase tracking-wider mb-0.5">Duration</p>
                  <p className="text-sm text-red-900">Indefinite — until manually restored by an administrator</p>
                </div>
              )}
            </div>

            {/* contact info */}
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 flex items-start gap-3 mb-6 text-left">
              <Mail size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 leading-relaxed">
                If you believe this suspension is a mistake, please contact your barangay administrator directly or visit the Barangay East Tapinac office.
              </p>
            </div>

            {/* sign out */}
            <button
              onClick={signOut}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-gray-800 transition"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>

        {/* branding */}
        <p className="text-center text-xs text-gray-400 mt-5">
          Tap-Watch · Barangay East Tapinac Community Safety System
        </p>
      </div>
    </div>
  )
}
