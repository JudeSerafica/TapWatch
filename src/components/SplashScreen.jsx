import { useEffect, useState } from 'react';
import './SplashScreen.css';

const SplashScreen = ({ onComplete }) => {
  const [phase, setPhase] = useState('logo');   // 'logo' → 'tagline' → 'shield' → 'done'
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Phase timeline:
    // 0ms   — logo fades/scales in (CSS)
    // 900ms — tagline appears
    // 1800ms — shield check animates in
    // 3200ms — start fade-out
    // 3900ms — call onComplete

    const t1 = setTimeout(() => setPhase('tagline'), 900);
    const t2 = setTimeout(() => setPhase('shield'), 1800);
    const t3 = setTimeout(() => setFadeOut(true), 3200);
    const t4 = setTimeout(() => onComplete(), 3900);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <div className={`splash-screen ${fadeOut ? 'fade-out' : ''}`}>
      {/* Blue gradient background */}
      <div className="splash-bg-gradient" />

      <div className="splash-content">

        {/* ── Logo ring with glow ── */}
        <div className={`splash-logo-container ${phase !== 'logo' ? 'splash-logo-up' : ''}`}>
          <div className="splash-glow-ring" />
          <div className="splash-logo-ring">
            <img
              src="/Tapinac.logo.jpg"
              alt="Tap-Watch Logo"
              className="splash-logo"
            />
          </div>
        </div>

        {/* ── Title ── */}
        <h1 className={`app-title splash-fade-in`}>
          <span className="text-dark">Tap</span>
          <span className="text-blue">-Watch</span>
        </h1>

        {/* ── Barangay sub-title ── */}
        <p className={`barangay-text splash-fade-in`} style={{ animationDelay: '0.2s' }}>
          Barangay East Tapinac
        </p>

        {/* ── Tagline ── */}
        {(phase === 'tagline' || phase === 'shield') && (
          <div className="splash-tagline-block fade-in">
            <p className="splash-tagline-line1">Together, We Keep</p>
            <p className="splash-tagline-line2">
              <span className="text-blue font-bold">East Tapinac</span> Safe.
            </p>
          </div>
        )}

        {/* ── Shield + checkmark ── */}
        {phase === 'shield' && (
          <div className="splash-shield-block fade-in">
            <svg viewBox="0 0 60 70" fill="none" className="splash-shield-svg">
              <path
                d="M30 4L8 13v18c0 13.5 9.5 26.2 22 29.4C42.5 57.2 52 44.5 52 31V13L30 4z"
                fill="#2563eb"
                opacity="0.15"
              />
              <path
                d="M30 2L6 12v19c0 14 10 27 24 30.5C44 58 54 45 54 31V12L30 2z"
                stroke="#2563eb"
                strokeWidth="2.5"
                fill="none"
                className="splash-shield-path"
              />
              <path
                d="M20 34l7 7 14-14"
                stroke="#2563eb"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="splash-check-path"
              />
            </svg>
          </div>
        )}

      </div>
    </div>
  );
};

export default SplashScreen;