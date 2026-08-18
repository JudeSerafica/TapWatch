import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

/* ─────────────────────────────────────────────────────────────────────────
   Step 6 — Terms of Use  (mobile full-page, matches reference image)
   Shown ONLY on mobile (<1024px) for new residents who haven't accepted yet.
   Desktop residents still see the existing TermsOfUseModal on the Dashboard.
   ───────────────────────────────────────────────────────────────────────── */

const sections = [
  { number: '1', title: 'Use of the App' },
  { number: '2', title: 'User Responsibilities' },
  { number: '3', title: 'Privacy & Data' },
  { number: '4', title: 'Limitation of Liability' },
  { number: '5', title: 'Termination' },
]

export default function MobileTermsPage() {
  const navigate = useNavigate()
  const { acceptTerms, signOut } = useAuth()
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleAgree = async () => {
    if (!checked) return
    setLoading(true)
    await acceptTerms()
    setLoading(false)
    // Go to the onboarding key-features screen next
    navigate('/onboarding', { replace: true })
  }

  const handleDecline = async () => {
    // User cannot use the app without agreeing — sign them out
    await signOut()
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">

      {/* ── Top bar ── */}
      <div className="px-5 pt-12 pb-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <img
            src="/Tapinac.logo.jpg"
            alt="Tap-Watch"
            className="w-8 h-8 rounded-full object-cover border border-blue-100"
          />
          <span className="font-extrabold text-lg">
            <span className="text-gray-900">Tap</span>
            <span className="text-blue-600">-Watch</span>
          </span>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">

        {/* Illustration */}
        <div className="flex justify-center my-5">
          <div className="w-44 h-44 relative flex items-center justify-center">
            {/* Soft blue background circle */}
            <div className="absolute inset-0 rounded-full bg-blue-50" />
            <svg
              viewBox="0 0 180 180"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="relative z-10 w-40 h-40"
              aria-label="Terms of Use document illustration"
            >
              {/* Document body */}
              <rect x="38" y="25" width="90" height="115" rx="8" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="2" />

              {/* Document lines */}
              <rect x="52" y="48" width="62" height="5" rx="2.5" fill="#BFDBFE" />
              <rect x="52" y="61" width="50" height="5" rx="2.5" fill="#DBEAFE" />
              <rect x="52" y="74" width="62" height="5" rx="2.5" fill="#DBEAFE" />
              <rect x="52" y="87" width="40" height="5" rx="2.5" fill="#DBEAFE" />
              <rect x="52" y="100" width="55" height="5" rx="2.5" fill="#BFDBFE" />
              <rect x="52" y="113" width="35" height="5" rx="2.5" fill="#DBEAFE" />

              {/* Signature line */}
              <rect x="52" y="126" width="45" height="3" rx="1.5" fill="#93C5FD" />

              {/* Pencil / edit icon (bottom-left corner of doc) */}
              <g transform="translate(46, 120)">
                <rect x="0" y="0" width="8" height="18" rx="2" transform="rotate(-30 4 9)" fill="#3B82F6" />
                <polygon points="0,18 8,18 4,26" fill="#60A5FA" transform="rotate(-30 4 9) translate(0, 0)" />
              </g>

              {/* Shield (bottom-right, overlapping document) */}
              <g filter="url(#doc-shadow)">
                <path
                  d="M115 85 L92 95 L92 118 C92 130 103 140 115 143 C127 140 138 130 138 118 L138 95 Z"
                  fill="#2563EB"
                />
                <path
                  d="M115 89 L95 98 L95 118 C95 129 104 138 115 141 C126 138 135 129 135 118 L135 98 Z"
                  fill="#3B82F6"
                />
                {/* Shield checkmark */}
                <path
                  d="M106 116 L112 122 L125 108"
                  stroke="white"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>

              <defs>
                <filter id="doc-shadow">
                  <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#2563EB" floodOpacity="0.3" />
                </filter>
              </defs>
            </svg>
          </div>
        </div>

        {/* Title + subtitle */}
        <h1 className="text-[24px] font-extrabold text-gray-900 text-center mb-2">Terms of Use</h1>
        <p className="text-sm text-gray-500 text-center leading-relaxed mb-5 px-2">
          By using Tap-Watch, you agree to our terms and conditions.
          Please read them carefully.
        </p>

        {/* Section list card */}
        <div className="bg-blue-50 rounded-2xl border border-blue-100 divide-y divide-blue-100 mb-6">
          {sections.map((sec) => (
            <div key={sec.number} className="flex items-center gap-3 px-4 py-3.5">
              <span className="text-sm text-gray-500 font-medium w-5 flex-shrink-0">
                {sec.number}.
              </span>
              <span className="text-sm font-semibold text-gray-800">{sec.title}</span>
            </div>
          ))}
        </div>

        {/* Full section details (scrollable) */}
        <div className="space-y-5 mb-6">
          <Section
            number="1"
            title="Use of the App"
            content="Tap-Watch is a community emergency monitoring system developed for Barangay East Tapinac. It may only be used for its intended purposes: reporting incidents, receiving alerts, and connecting with barangay officials. Misuse, abuse, or submission of false information is strictly prohibited and may result in account suspension or legal action."
          />
          <Section
            number="2"
            title="User Responsibilities"
            bullets={[
              'Provide accurate and truthful information during registration and incident reporting.',
              'Keep your account credentials confidential and do not share them with others.',
              'Report only genuine incidents — do not submit false or misleading reports.',
              'Submit valid identification for account verification when required.',
              'Use Tap-Watch only for lawful, legitimate purposes.',
            ]}
          />
          <Section
            number="3"
            title="Privacy & Data"
            content="Tap-Watch collects personal information (name, contact details, address, and identification documents) solely for account verification and service delivery. Your data is kept confidential, accessible only to authorized barangay personnel, and protected by reasonable security measures. It will not be sold, shared with third parties, or used beyond the stated purposes without your consent or a lawful basis."
          />
          <Section
            number="4"
            title="Limitation of Liability"
            content="Tap-Watch is provided as a community safety tool and does not replace professional emergency services. The barangay and system administrators shall not be held liable for any damages arising from technical errors, service unavailability, delayed response, or user error. Always contact 911 for life-threatening emergencies."
          />
          <Section
            number="5"
            title="Termination"
            content="Your account may be suspended or terminated if you violate these terms, submit false information, or engage in conduct that compromises community safety or system integrity. You may also choose to deactivate your account by contacting the barangay office. Upon termination, your personal data will be retained only for as long as required by applicable law."
          />
        </div>
      </div>

      {/* ── Fixed footer ── */}
      <div className="px-5 pt-4 pb-8 border-t border-gray-100 bg-white space-y-3">
        {/* Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer">
          <div className="flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 border-blue-400 flex items-center justify-center transition-colors"
            style={{ background: checked ? '#2563eb' : 'white', borderColor: checked ? '#2563eb' : '#93c5fd' }}
            onClick={() => setChecked(c => !c)}
          >
            {checked && (
              <svg viewBox="0 0 12 10" fill="none" className="w-3 h-3">
                <path d="M1 5L4.5 8.5L11 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span className="text-sm text-gray-700 leading-snug select-none">
            I have read and agree to the{' '}
            <span className="font-semibold text-blue-600">Terms of Use</span>
            {' '}and{' '}
            <span className="font-semibold text-blue-600">Privacy Policy</span>
          </span>
        </label>

        {/* Agree button */}
        <button
          onClick={handleAgree}
          disabled={!checked || loading}
          className="w-full py-4 bg-blue-600 text-white font-bold text-[15px] rounded-2xl shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          {loading
            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
            : 'Agree and Continue'}
        </button>

        {/* Decline */}
        <button
          onClick={handleDecline}
          className="w-full py-2 text-sm text-gray-400 font-medium"
        >
          Decline & Sign Out
        </button>
      </div>

    </div>
  )
}

/* ── Reusable section component ── */
function Section({ number, title, content, bullets }) {
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-2">
        <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
          {number}
        </span>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      </div>
      {content && (
        <p className="text-sm text-gray-600 leading-relaxed pl-8">{content}</p>
      )}
      {bullets && (
        <ul className="pl-10 space-y-1.5">
          {bullets.map((b, i) => (
            <li key={i} className="text-sm text-gray-600 leading-relaxed list-disc">{b}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
