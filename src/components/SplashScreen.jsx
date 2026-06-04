import { useEffect, useState } from 'react';
import { Shield, Bell, Users, MapPin } from 'lucide-react';
import './SplashScreen.css';

const SplashScreen = ({ onComplete }) => {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [showReady, setShowReady] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return Math.min(prev + 2, 100);
      });
    }, 60);

    const contentTimer = setTimeout(() => {
      setShowContent(true);
    }, 3000);

    const readyTimer = setTimeout(() => {
      setShowReady(true);
    }, 4000);

    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 6000);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 7000);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(contentTimer);
      clearTimeout(readyTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className={`splash-screen ${fadeOut ? 'fade-out' : ''}`}>
      <div className="splash-background" />

      <div className="splash-content">

        {/* ── STAGE 1: Loading ── */}
        {!showContent && (
          <div className="loading-stage">

            <div className="logo-wrapper">
              {/* floating icons */}
              <div className="icon-circle icon-top">
                <Bell size={25} className="icon-blue" />
              </div>
              <div className="icon-circle icon-left">
                <Shield size={25} className="icon-blue" />
              </div>
              <div className="icon-circle icon-right">
                <Users size={25} className="icon-blue" />
              </div>
              <div className="icon-circle icon-bottom">
                <MapPin size={25} className="icon-blue" />
              </div>

              {/* circle + logo */}
              <div className="logo-ring">
                <div className="logo-glow" />
                <img
                  src="/Tapinac.logo.jpg"
                  alt="Tap-Watch Logo"
                  className="splash-logo"
                />
              </div>
            </div>

            <h1 className="app-title">
              <span className="text-dark">Tap</span>
              <span className="text-blue">-Watch</span>
            </h1>
            <p className="barangay-text">Barangay East Tapinac</p>

            <div className="progress-section">
              <p className="progress-label">
                Fast Response.<br />
                <span className="text-blue">Safer Community.</span>
              </p>
              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <p className="progress-percentage">{Math.round(loadingProgress)}%</p>
            </div>

          </div>
        )}

        {/* ── STAGE 2 & 3: System Ready ── */}
        {showContent && (
          <div className="content-stage">

            <div className="logo-wrapper">
              <div className="icon-circle icon-top">
                <Bell size={25} className="icon-blue" />
              </div>
              <div className="icon-circle icon-left">
                <Shield size={25} className="icon-blue" />
              </div>
              <div className="icon-circle icon-right">
                <Users size={25} className="icon-blue" />
              </div>
              <div className="icon-circle icon-bottom">
                <MapPin size={25} className="icon-blue" />
              </div>

              <div className="logo-ring">
                <div className="logo-glow" />
                <img
                  src="/Tapinac.logo.jpg"
                  alt="Tap-Watch Logo"
                  className="splash-logo"
                />
              </div>
            </div>

            <h1 className="app-title">
              <span className="text-dark">Tap</span>
              <span className="text-blue">-Watch</span>
            </h1>
            <p className="barangay-text">Barangay East Tapinac</p>

            <div className="tagline-section">
              <p className="tagline-text">
                Fast Response.<br />
                <span className="text-blue">Safer Community.</span>
              </p>
            </div>

            {showReady && (
              <div className="ready-section fade-in">
                <div className="check-icon-container">
                  <svg className="check-icon" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#2563eb" className="check-circle" />
                    <path
                      d="M8 12.5l2.5 2.5L16 9"
                      stroke="white"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="check-mark"
                    />
                  </svg>
                </div>
                <p className="ready-text">System Ready!</p>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};

export default SplashScreen;