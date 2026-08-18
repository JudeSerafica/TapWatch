import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

/* ─────────────────────────────────────────────────────────────────────────
   Step 7 — Onboarding / Key Features  (mobile full-page, matches reference)
   Shown ONLY on mobile after Terms acceptance, before Dashboard.
   ───────────────────────────────────────────────────────────────────────── */

const slides = [
  {
    id: 0,
    headline: 'What you can do\nwith Tap-Watch',
    features: [
      {
        icon: <ReportIcon />,
        title: 'Report Incidents',
        desc: 'Easily report crime, accident, fire, flood, and more.',
      },
      {
        icon: <SOSIcon />,
        title: 'SOS Emergency',
        desc: 'Send SOS alerts with your location instantly.',
      },
      {
        icon: <MapIcon />,
        title: 'Live Incident Map',
        desc: 'View real-time incidents around East Tapinac.',
      },
      {
        icon: <AlertIcon />,
        title: 'Community Alerts',
        desc: 'Stay informed with the latest updates.',
      },
    ],
  },
  {
    id: 1,
    headline: 'Stay Safe &\nStay Connected',
    features: [
      {
        icon: <VerifyIcon />,
        title: 'Account Verification',
        desc: 'Get verified to unlock full access and build trust.',
      },
      {
        icon: <ProfileIcon />,
        title: 'Your Profile',
        desc: 'Manage your info, purok/zone, and contact details.',
      },
      {
        icon: <ShieldIcon />,
        title: 'Barangay Officials',
        desc: 'Quickly reach barangay officials when you need help.',
      },
      {
        icon: <BellIcon />,
        title: 'Real-time Alerts',
        desc: 'Get notified the moment an incident is reported nearby.',
      },
    ],
  },
  {
    id: 2,
    headline: 'Together, We Keep\nEast Tapinac Safe',
    features: [
      {
        icon: <CommunityIcon />,
        title: 'Community-Powered',
        desc: 'Every report helps keep your neighborhood safer.',
      },
      {
        icon: <FastIcon />,
        title: 'Fast Response',
        desc: 'Barangay responders are notified in real time.',
      },
      {
        icon: <PrivacyIcon />,
        title: 'Your Privacy Matters',
        desc: 'Your data is protected and never sold.',
      },
      {
        icon: <OfflineIcon />,
        title: 'Always Available',
        desc: 'Works even with a slow connection.',
      },
    ],
  },
]

const TOTAL = slides.length

export default function MobileOnboardingPage() {
  const navigate = useNavigate()
  const [current, setCurrent] = useState(0)

  const handleNext = () => {
    if (current < TOTAL - 1) {
      setCurrent(c => c + 1)
    } else {
      navigate('/dashboard', { replace: true })
    }
  }

  const slide = slides[current]

  return (
    <div className="flex flex-col min-h-screen bg-white">

      {/* ── Skip button (top-right) ── */}
      <div className="px-5 pt-12 flex justify-end">
        <button
          onClick={() => navigate('/dashboard', { replace: true })}
          className="text-sm text-gray-400 font-medium px-3 py-1"
        >
          Skip
        </button>
      </div>

      {/* ── Headline ── */}
      <div className="px-6 pt-4 pb-6">
        <h1 className="text-[26px] font-extrabold text-gray-900 leading-tight whitespace-pre-line">
          {slide.headline}
        </h1>
      </div>

      {/* ── Feature list ── */}
      <div className="flex-1 px-5 space-y-4 overflow-y-auto">
        {slide.features.map((feat, i) => (
          <div key={i} className="flex items-start gap-4">
            {/* Icon box */}
            <div className="flex-shrink-0">{feat.icon}</div>
            {/* Text */}
            <div>
              <p className="text-[15px] font-bold text-gray-900 leading-snug">{feat.title}</p>
              <p className="text-sm text-gray-500 leading-relaxed mt-0.5">{feat.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Footer: dots + Next ── */}
      <div className="px-5 pt-6 pb-10">
        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-2 mb-5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all ${
                i === current
                  ? 'w-6 h-2.5 bg-blue-600'
                  : 'w-2.5 h-2.5 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Next / Get Started */}
        <button
          onClick={handleNext}
          className="w-full py-4 bg-blue-600 text-white font-bold text-[15px] rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-all"
        >
          {current < TOTAL - 1 ? 'Next' : 'Get Started'}
        </button>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────
   Feature icon components — each is a colored rounded square with an SVG
   ────────────────────────────────────────────────────────────────────── */

function FeatureBox({ bg, children }) {
  return (
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${bg}`}>
      {children}
    </div>
  )
}

function ReportIcon() {
  return (
    <FeatureBox bg="bg-blue-600">
      <svg viewBox="0 0 28 28" fill="none" className="w-7 h-7">
        <rect x="5" y="3" width="18" height="22" rx="3" stroke="white" strokeWidth="1.8" />
        <path d="M9 9h10M9 13h10M9 17h6" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="20" cy="20" r="5" fill="#1D4ED8" />
        <path d="M18.5 20l1.2 1.2 2-2" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </FeatureBox>
  )
}

function SOSIcon() {
  return (
    <FeatureBox bg="bg-red-500">
      <svg viewBox="0 0 28 28" fill="none" className="w-7 h-7">
        <circle cx="14" cy="14" r="9" stroke="white" strokeWidth="1.8" />
        <path d="M14 10v4" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="14" cy="18.5" r="1.2" fill="white" />
      </svg>
    </FeatureBox>
  )
}

function MapIcon() {
  return (
    <FeatureBox bg="bg-green-600">
      <svg viewBox="0 0 28 28" fill="none" className="w-7 h-7">
        <path d="M5 8l7-3 6 3 5-3v15l-5 3-6-3-7 3V8z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M12 5v15M18 8v15" stroke="white" strokeWidth="1.4" strokeDasharray="2 2" />
      </svg>
    </FeatureBox>
  )
}

function AlertIcon() {
  return (
    <FeatureBox bg="bg-blue-500">
      <svg viewBox="0 0 28 28" fill="none" className="w-7 h-7">
        <path d="M14 5C10.13 5 7 8.13 7 12v6l-2 2h18l-2-2v-6c0-3.87-3.13-7-7-7z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M11.5 20.5a2.5 2.5 0 005 0" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="20" cy="8" r="3.5" fill="#EF4444" stroke="white" strokeWidth="1.5" />
      </svg>
    </FeatureBox>
  )
}

function VerifyIcon() {
  return (
    <FeatureBox bg="bg-blue-600">
      <svg viewBox="0 0 28 28" fill="none" className="w-7 h-7">
        <path d="M14 4L6 7.5v7c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11v-7L14 4z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M10 14l2.5 2.5L18 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </FeatureBox>
  )
}

function ProfileIcon() {
  return (
    <FeatureBox bg="bg-indigo-500">
      <svg viewBox="0 0 28 28" fill="none" className="w-7 h-7">
        <circle cx="14" cy="10" r="5" stroke="white" strokeWidth="1.8" />
        <path d="M5 24c0-4.4 4-8 9-8s9 3.6 9 8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </FeatureBox>
  )
}

function ShieldIcon() {
  return (
    <FeatureBox bg="bg-blue-700">
      <svg viewBox="0 0 28 28" fill="none" className="w-7 h-7">
        <path d="M14 4L6 7.5v7c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11v-7L14 4z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M14 11v4M14 17.5v1" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </FeatureBox>
  )
}

function BellIcon() {
  return (
    <FeatureBox bg="bg-amber-500">
      <svg viewBox="0 0 28 28" fill="none" className="w-7 h-7">
        <path d="M14 5C10.13 5 7 8.13 7 12v6l-2 2h18l-2-2v-6c0-3.87-3.13-7-7-7z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M11.5 20.5a2.5 2.5 0 005 0" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </FeatureBox>
  )
}

function CommunityIcon() {
  return (
    <FeatureBox bg="bg-teal-600">
      <svg viewBox="0 0 28 28" fill="none" className="w-7 h-7">
        <circle cx="10" cy="10" r="3.5" stroke="white" strokeWidth="1.7" />
        <circle cx="19" cy="10" r="3.5" stroke="white" strokeWidth="1.7" />
        <path d="M4 22c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="white" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M19 16a6 6 0 016 6" stroke="white" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    </FeatureBox>
  )
}

function FastIcon() {
  return (
    <FeatureBox bg="bg-orange-500">
      <svg viewBox="0 0 28 28" fill="none" className="w-7 h-7">
        <path d="M5 14h9l-3 3m3-3l-3-3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 7a8 8 0 110 14" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </FeatureBox>
  )
}

function PrivacyIcon() {
  return (
    <FeatureBox bg="bg-purple-600">
      <svg viewBox="0 0 28 28" fill="none" className="w-7 h-7">
        <rect x="7" y="13" width="14" height="10" rx="2" stroke="white" strokeWidth="1.8" />
        <path d="M10 13v-3a4 4 0 018 0v3" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="14" cy="18" r="1.5" fill="white" />
      </svg>
    </FeatureBox>
  )
}

function OfflineIcon() {
  return (
    <FeatureBox bg="bg-blue-400">
      <svg viewBox="0 0 28 28" fill="none" className="w-7 h-7">
        <path d="M14 20a2 2 0 100 4 2 2 0 000-4z" fill="white" />
        <path d="M8.5 15.5A7.5 7.5 0 0114 13.5c2.1 0 4 .85 5.5 2.2" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M5 11.5a12 12 0 0118 0" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M3 8a16 16 0 0122 0" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </FeatureBox>
  )
}
