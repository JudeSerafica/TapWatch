import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

/* ─── Inline SVG illustration — community/safety/map scene ───────────── */
function WelcomeIllustration() {
  return (
    <svg
      viewBox="0 0 320 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-xs mx-auto"
      aria-hidden="true"
    >
      {/* Background circle */}
      <circle cx="160" cy="110" r="90" fill="#EFF6FF" />
      <circle cx="160" cy="110" r="70" fill="#DBEAFE" opacity="0.6" />

      {/* Map / location pin base */}
      <rect x="100" y="80" width="120" height="85" rx="12" fill="white" stroke="#BFDBFE" strokeWidth="1.5" />

      {/* Map grid lines */}
      <line x1="115" y1="100" x2="205" y2="100" stroke="#DBEAFE" strokeWidth="1" />
      <line x1="115" y1="116" x2="205" y2="116" stroke="#DBEAFE" strokeWidth="1" />
      <line x1="115" y1="132" x2="205" y2="132" stroke="#DBEAFE" strokeWidth="1" />
      <line x1="140" y1="87" x2="140" y2="158" stroke="#DBEAFE" strokeWidth="1" />
      <line x1="170" y1="87" x2="170" y2="158" stroke="#DBEAFE" strokeWidth="1" />

      {/* Road */}
      <path d="M100 124 Q130 118 160 122 Q190 126 220 120" stroke="#93C5FD" strokeWidth="5" strokeLinecap="round" />

      {/* Location pin — blue */}
      <ellipse cx="160" cy="157" rx="8" ry="3" fill="#93C5FD" opacity="0.5" />
      <path d="M160 105 C155 105 151 109 151 114 C151 121 160 130 160 130 C160 130 169 121 169 114 C169 109 165 105 160 105Z" fill="#2563EB" />
      <circle cx="160" cy="114" r="4" fill="white" />

      {/* Person left */}
      <circle cx="120" cy="88" r="10" fill="#93C5FD" />
      <circle cx="120" cy="78" r="7" fill="#DBEAFE" />
      <path d="M113 88 Q120 96 127 88" stroke="#2563EB" strokeWidth="1.5" fill="none" />
      {/* Phone in hand */}
      <rect x="125" y="84" width="9" height="14" rx="2" fill="#2563EB" opacity="0.85" />
      <circle cx="129.5" cy="97" r="1.2" fill="white" opacity="0.8" />

      {/* Person right */}
      <circle cx="200" cy="88" r="10" fill="#60A5FA" />
      <circle cx="200" cy="78" r="7" fill="#DBEAFE" />
      <path d="M193 88 Q200 96 207 88" stroke="#1D4ED8" strokeWidth="1.5" fill="none" />

      {/* Shield badge top-right */}
      <g transform="translate(195,55)">
        <circle cx="12" cy="12" r="13" fill="#2563EB" />
        <path d="M12 4L5 7v5c0 4.4 3.1 8.5 7 9.8C16 20.5 19 16.4 19 12V7L12 4Z" fill="white" opacity="0.25" />
        <path d="M12 3L4 6.5v5.5c0 4.7 3.4 9.1 8 10.5 4.6-1.4 8-5.8 8-10.5V6.5L12 3Z" stroke="white" strokeWidth="1.2" fill="none" />
        <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Alert bell top-left */}
      <g transform="translate(88,50)">
        <circle cx="12" cy="12" r="13" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="1.5" />
        <path d="M12 5a5 5 0 00-5 5v3l-1 2h12l-1-2v-3a5 5 0 00-5-5z" fill="#2563EB" opacity="0.8" />
        <path d="M10 15a2 2 0 004 0" stroke="#2563EB" strokeWidth="1.2" fill="none" />
        <circle cx="12" cy="5.5" r="1.5" fill="#60A5FA" />
      </g>

      {/* Small pulse rings around pin */}
      <circle cx="160" cy="114" r="18" stroke="#2563EB" strokeWidth="1" opacity="0.2" strokeDasharray="3 2" />
      <circle cx="160" cy="114" r="28" stroke="#3B82F6" strokeWidth="0.8" opacity="0.12" strokeDasharray="3 3" />
    </svg>
  )
}

/* ─── Dot indicator ──────────────────────────────────────────────────── */
function DotIndicator({ total = 3, active = 0 }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === active
              ? 'w-6 h-2.5 bg-blue-600'
              : 'w-2.5 h-2.5 bg-blue-200'
          }`}
        />
      ))}
    </div>
  )
}

/* ─── Main MobileWelcome component ──────────────────────────────────── */
export default function MobileWelcome({ onGetStarted }) {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-hidden">
      {/* Top area — illustration */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-10 pb-4">

        {/* Brand pill */}
        <div className="mb-6 flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100">
          <img
            src="/Tapinac.logo.jpg"
            alt="Tap-Watch"
            className="w-6 h-6 rounded-full object-cover"
          />
          <span className="text-xs font-bold text-blue-700 tracking-wide">Tap-Watch · Barangay East Tapinac</span>
        </div>

        {/* Illustration */}
        <WelcomeIllustration />

        {/* Dot indicator */}
        <div className="mt-5 mb-6">
          <DotIndicator total={3} active={0} />
        </div>

        {/* Headline */}
        <h2 className="text-2xl font-extrabold text-gray-900 text-center leading-tight mb-3">
          Report. Alert. Protect.
        </h2>

        {/* Supporting text */}
        <p className="text-sm text-gray-500 text-center leading-relaxed max-w-xs">
          Report incidents, receive real-time alerts, and help keep our community safe.
        </p>
      </div>

      {/* Bottom actions */}
      <div className="px-6 pb-10 pt-4 flex flex-col gap-3">
        {/* Get Started — blue solid */}
        <button
          onClick={onGetStarted}
          className="w-full py-4 bg-blue-600 text-white font-bold text-base rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all"
        >
          Get Started
        </button>

        {/* Log In — ghost */}
        <button
          onClick={() => navigate('/login')}
          className="w-full py-3.5 text-blue-600 font-semibold text-base rounded-2xl border-2 border-blue-200 hover:bg-blue-50 active:scale-[0.98] transition-all"
        >
          Log In
        </button>
      </div>
    </div>
  )
}
