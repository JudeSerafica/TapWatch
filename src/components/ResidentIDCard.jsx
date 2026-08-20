import { useRef } from 'react'
import { X, Download, Shield, MapPin, CheckCircle } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

/**
 * ResidentIDCard
 *
 * A digital barangay resident ID card displayed in a modal.
 * The QR code encodes only the resident_id (e.g. "R-2026-000124")
 * so the backend can look up the resident securely without
 * embedding sensitive personal data in the QR value.
 *
 * Props:
 *   profile  – the full profile object from AuthContext
 *   user     – the Supabase auth user object
 *   onClose  – callback to close the modal
 */
export default function ResidentIDCard({ profile, user, onClose }) {
  const cardRef = useRef(null)

  const fullName    = profile?.full_name || user?.user_metadata?.full_name || 'Resident'
  const residentId  = profile?.resident_id || '—'
  const purok       = profile?.purok   || ''
  const address     = profile?.address || 'East Tapinac, Olongapo City'
  const isVerified  = profile?.verification_status === 'verified' || profile?.verification_status === 'trusted'
  const avatarUrl   = profile?.avatar_url || null

  // Location line — prefer purok + address
  const locationLine = [purok, address].filter(Boolean).join(', ') || 'East Tapinac, Olongapo City'

  // QR value: just the resident_id so the admin scanner can look it up
  const qrValue = residentId !== '—' ? residentId : `TW-USER-${profile?.id || 'unknown'}`

  // Initials fallback for avatar
  const initials = fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm animate-scale-in">

        {/* ── Close button ── */}
        <div className="flex justify-end mb-3">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Card ── */}
        <div
          ref={cardRef}
          className="bg-white rounded-3xl overflow-hidden shadow-2xl select-none"
        >
          {/* Card header — blue gradient with shield watermark */}
          <div
            className="relative px-6 pt-6 pb-5 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #1B4FD8 0%, #2563EB 50%, #1D4ED8 100%)',
            }}
          >
            {/* Watermark shield */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.12] pointer-events-none">
              <Shield size={110} strokeWidth={1} className="text-white" />
            </div>

            {/* Branding */}
            <div className="relative z-10 flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/30 overflow-hidden">
                <img
                  src="/Tapinac.logo.jpg"
                  alt="Tap-Watch"
                  className="w-full h-full object-cover"
                  onError={e => { e.currentTarget.style.display = 'none' }}
                />
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-none">TAP-WATCH</p>
                <p className="text-blue-200 text-[10px] leading-none mt-0.5">Barangay East Tapinac</p>
              </div>
              <div className="ml-auto">
                <span className="text-[9px] font-semibold text-blue-200 uppercase tracking-wider">
                  Digital ID
                </span>
              </div>
            </div>

            {/* Avatar */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg overflow-hidden bg-blue-400 flex items-center justify-center mb-3">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-2xl font-bold">{initials}</span>
                )}
              </div>

              <h2 className="text-white text-xl font-bold text-center leading-tight">
                {fullName}
              </h2>

              {/* Verified status pill */}
              <div className={`mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                isVerified
                  ? 'bg-green-500/20 border-green-400/50 text-green-200'
                  : 'bg-yellow-500/20 border-yellow-400/50 text-yellow-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isVerified ? 'bg-green-400' : 'bg-yellow-400'}`} />
                {isVerified ? 'VERIFIED RESIDENT' : 'PENDING VERIFICATION'}
              </div>
            </div>
          </div>

          {/* Card body */}
          <div className="px-6 py-5 bg-gray-50">

            {/* Resident ID row */}
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-4 border border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-1">
                Resident ID
              </p>
              <p className="text-blue-700 text-lg font-extrabold tracking-wider font-mono">
                {residentId}
              </p>
            </div>

            {/* Location */}
            <div className="flex items-start gap-2 mb-5 px-1">
              <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-gray-600 text-xs leading-relaxed">{locationLine}</p>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center mb-5">
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 inline-block">
                <QRCodeSVG
                  value={qrValue}
                  size={140}
                  bgColor="#ffffff"
                  fgColor="#1B4FD8"
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-2 text-center">
                Scan to verify resident identity
              </p>
            </div>

            {/* Footer verification line */}
            <div className="flex items-center justify-center gap-1.5 py-3 border-t border-gray-100">
              <CheckCircle size={13} className="text-green-500" />
              <p className="text-[11px] text-gray-500 font-medium">
                Issued by Barangay East Tapinac, Olongapo City
              </p>
            </div>
          </div>
        </div>

        {/* ── Close button (bottom) ── */}
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-sm font-semibold transition backdrop-blur-sm border border-white/20"
        >
          Close
        </button>
      </div>
    </div>
  )
}
