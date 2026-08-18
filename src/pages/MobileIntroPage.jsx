import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

/* ─────────────────────────────────────────────────────────────────────────
   Mobile Welcome / Intro Page  — swipeable 3-slide carousel
   ───────────────────────────────────────────────────────────────────────── */

const slides = [
  {
    image: '/location.png',
    headline: 'Report. Alert. Protect.',
    sub: 'Report incidents, receive real-time alerts, and help keep our community safe.',
    align: 'bottom',   // stick to bottom edge, close to text
  },
  {
    image: '/alwaysready.png',
    headline: 'Always Ready to Help.',
    sub: 'Tap-Watch connects you with barangay officials the moment an emergency happens.',
    align: 'center',
  },
  {
    image: '/together.png',
    headline: 'Together, We Keep\nEast Tapinac Safe.',
    sub: 'Join your neighbors in building a safer, stronger community every day.',
    align: 'center',
  },
]

export default function MobileIntroPage() {
  const navigate = useNavigate()
  const [current, setCurrent] = useState(0)

  // Touch / swipe state
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const isDragging  = useRef(false)

  const goTo = (idx) => setCurrent(Math.max(0, Math.min(slides.length - 1, idx)))

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isDragging.current  = false
  }

  const handleTouchMove = (e) => {
    if (touchStartX.current === null) return
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current
    // Only treat as horizontal swipe if horizontal movement dominates
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
      isDragging.current = true
    }
  }

  const handleTouchEnd = (e) => {
    if (!isDragging.current || touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (dx < -40) goTo(current + 1)   // swipe left → next
    if (dx >  40) goTo(current - 1)   // swipe right → prev
    touchStartX.current = null
    isDragging.current  = false
  }

  const slide = slides[current]
  const isLast = current === slides.length - 1

  return (
    <div
      className="flex flex-col min-h-screen bg-white overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Illustration area ── */}
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #EEF2FF 0%, #F0F4FF 65%, #ffffff 100%)',
          minHeight: '52vh',
          flexShrink: 0,
        }}
      >
        {/* Slides */}
        <div className="relative w-full flex items-center justify-center" style={{ height: '50vh' }}>
          {slides.map((s, i) => (
            <img
              key={i}
              src={s.image}
              alt={s.headline}
              draggable="false"
              className="absolute object-contain"
              style={{
                width: '96%',
                maxWidth: '420px',
                maxHeight: '48vh',
                // slide-specific vertical alignment
                ...(s.align === 'bottom'
                  ? { bottom: 0, top: 'auto' }
                  : { top: '50%', transform: i === current
                      ? 'translate(-50%, -50%) translateX(0)'
                      : i < current
                        ? 'translate(-50%, -50%) translateX(-60px)'
                        : 'translate(-50%, -50%) translateX(60px)',
                      left: '50%',
                    }
                ),
                opacity: i === current ? 1 : 0,
                // for bottom-aligned slides the transform is X-only
                ...(s.align === 'bottom' ? {
                  transform: i === current
                    ? 'translateX(0)'
                    : i < current
                      ? 'translateX(-60px)'
                      : 'translateX(60px)',
                  left: '50%',
                  marginLeft: '-48%',
                } : {}),
                pointerEvents: i === current ? 'auto' : 'none',
                transitionProperty: 'opacity, transform',
                transitionDuration: '350ms',
                transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)',
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Text + actions ── */}
      <div className="flex flex-col flex-1 px-6 pt-4 pb-10">

        {/* Headline */}
        <h1
          key={current + '-h'}
          className="text-[26px] font-extrabold text-gray-900 text-center leading-tight mb-3 whitespace-pre-line"
          style={{ animation: 'fadeUp 0.35s ease both' }}
        >
          {slide.headline}
        </h1>

        {/* Supporting text */}
        <p
          key={current + '-p'}
          className="text-[15px] text-gray-500 text-center leading-relaxed mb-6"
          style={{ animation: 'fadeUp 0.35s ease 0.05s both' }}
        >
          {slide.sub}
        </p>

        {/* Dot indicators — tappable */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Slide ${i + 1}`}
              style={{
                display: 'block',
                width:      i === current ? 24 : 10,
                height:     10,
                borderRadius: 999,
                background: i === current ? '#2563eb' : '#D1D5DB',
                flexShrink: 0,
                padding: 0,
                border: 'none',
                cursor: 'pointer',
                transition: 'width 0.3s, background 0.3s',
              }}
            />
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Get Started / Next */}
        <button
          onClick={() => isLast ? navigate('/signup') : goTo(current + 1)}
          className="w-full py-4 bg-blue-600 text-white font-bold text-[16px] rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-transform mb-3"
        >
          {isLast ? 'Get Started' : 'Next'}
        </button>

        {/* Log In */}
        <button
          onClick={() => navigate('/login')}
          className="w-full py-3 text-blue-600 font-bold text-[15px]"
        >
          Log In
        </button>
      </div>

      {/* Inline keyframe for text fade-up */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
