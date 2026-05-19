import { useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'

export default function LandingPage() {
  const navigate = useNavigate()
  const heroRef = useRef(null)

  useEffect(() => {
    const els = document.querySelectorAll('.fade-up')

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
          }
        })
      },
      { threshold: 0.1 }
    )

    els.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        :root {
          --navy: #F8FAFC;
          --navy-mid: #FFFFFF;
          --navy-card: #FFFFFF;

          --accent: #2563EB;
          --accent-light: #3B82F6;
          --accent-glow: rgba(37,99,235,0.12);

          --gold: #F59E0B;

          --white: #0F172A;
          --muted: #64748B;

          --border: rgba(15,23,42,0.08);
        }

        body {
          background: #F8FAFC;
        }

        .lp-root {
          font-family: 'DM Sans', sans-serif;
          background:
            radial-gradient(circle at top, rgba(59,130,246,0.05), transparent 30%),
            #F8FAFC;
          color: var(--white);
          min-height: 100vh;
          overflow-x: hidden;
        }

        /* ───────── NAV ───────── */

        .lp-nav {
          position: sticky;
          top: 0;
          z-index: 100;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 0 1.25rem;
          height: 60px;

          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(16px);

          border-bottom: 1px solid var(--border);
        }

        .lp-nav-brand {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .lp-nav-brand img {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--accent);
        }

        .lp-nav-brand span {
          font-family: 'Sora', sans-serif;
          font-weight: 700;
          font-size: 1rem;
          letter-spacing: -0.02em;
          color: #0F172A;
        }

        .lp-nav-actions {
          display: flex;
          gap: 0.5rem;
        }

        .btn-ghost {
          padding: 0.45rem 1rem;

          font-size: 0.85rem;
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;

          color: var(--muted);

          background: transparent;
          border: none;
          border-radius: 8px;

          cursor: pointer;

          transition: color 0.2s;
        }

        .btn-ghost:hover {
          color: #0F172A;
        }

        .btn-primary {
          padding: 0.45rem 1.1rem;

          font-size: 0.85rem;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;

          color: #fff;
          background: var(--accent);

          border: none;
          border-radius: 8px;

          cursor: pointer;

          transition:
            background 0.2s,
            transform 0.15s,
            box-shadow 0.2s;

          box-shadow: 0 0 0 0 var(--accent-glow);
        }

        .btn-primary:hover {
          background: var(--accent-light);
          transform: translateY(-1px);
          box-shadow: 0 4px 20px var(--accent-glow);
        }

        /* ───────── HERO ───────── */

        .lp-hero {
          position: relative;

          display: flex;
          flex-direction: column;
          align-items: center;

          text-align: center;

          padding: 5rem 1.25rem 4rem;

          overflow: hidden;
        }

        .lp-hero-glow {
          position: absolute;
          top: -80px;
          left: 50%;

          transform: translateX(-50%);

          width: 500px;
          height: 400px;

          background: radial-gradient(
            ellipse at center,
            rgba(59,130,246,0.10) 0%,
            transparent 70%
          );

          pointer-events: none;
        }

        .lp-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;

          padding: 0.3rem 0.9rem;

          background: rgba(59,130,246,0.08);

          border: 1px solid rgba(59,130,246,0.2);
          border-radius: 999px;

          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;

          color: var(--accent-light);

          margin-bottom: 1.5rem;
        }

        .lp-badge-dot {
          width: 6px;
          height: 6px;

          background: var(--accent-light);

          border-radius: 50%;

          animation: pulse-dot 2s infinite;
        }

        @keyframes pulse-dot {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }

          50% {
            opacity: 0.5;
            transform: scale(0.7);
          }
        }

        .lp-hero h1 {
          font-family: 'Sora', sans-serif;
          font-size: clamp(2rem, 6vw, 3.6rem);
          font-weight: 800;

          line-height: 1.1;
          letter-spacing: -0.03em;

          color: #0F172A;

          max-width: 680px;

          margin-bottom: 1.25rem;
        }

        .lp-hero h1 em {
          font-style: normal;
          color: var(--accent-light);
        }

        .lp-hero p {
          font-size: clamp(0.95rem, 2.5vw, 1.1rem);
          line-height: 1.7;
          font-weight: 300;

          color: #475569;

          max-width: 520px;

          margin-bottom: 2.25rem;
        }

        .lp-hero-btns {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.75rem;
        }

        .btn-hero-primary {
          padding: 0.8rem 1.75rem;

          font-size: 0.95rem;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;

          color: #fff;
          background: var(--accent);

          border: none;
          border-radius: 10px;

          cursor: pointer;

          transition: all 0.2s;

          box-shadow: 0 8px 24px rgba(59,130,246,0.2);
        }

        .btn-hero-primary:hover {
          background: var(--accent-light);
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(59,130,246,0.3);
        }

        .btn-hero-outline {
          padding: 0.8rem 1.75rem;

          font-size: 0.95rem;
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;

          color: #334155;
          background: #FFFFFF;

          border: 1px solid rgba(15,23,42,0.08);
          border-radius: 10px;

          cursor: pointer;

          transition: all 0.2s;
        }

        .btn-hero-outline:hover {
          color: #0F172A;
          background: #F1F5F9;
        }

        /* ───────── STATS ───────── */

        .lp-stats {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;

          margin: 0 1.25rem;

          background: #FFFFFF;

          border: 1px solid var(--border);
          border-radius: 14px;

          overflow: hidden;

          box-shadow: 0 10px 30px rgba(15,23,42,0.06);
        }

        .lp-stat {
          flex: 1;
          min-width: 120px;

          padding: 1.4rem 1rem;

          text-align: center;

          border-right: 1px solid var(--border);
        }

        .lp-stat:last-child {
          border-right: none;
        }

        .lp-stat-num {
          font-family: 'Sora', sans-serif;
          font-size: 1.6rem;
          font-weight: 700;

          color: #0F172A;

          line-height: 1;

          margin-bottom: 0.3rem;
        }

        .lp-stat-label {
          font-size: 0.72rem;
          font-weight: 500;

          color: #64748B;

          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        /* ───────── FEATURES ───────── */

        .lp-features {
          padding: 5rem 1.25rem;

          max-width: 1000px;
          margin: 0 auto;
        }

        .lp-section-label {
          text-align: center;

          font-size: 0.72rem;
          font-weight: 600;

          letter-spacing: 0.1em;
          text-transform: uppercase;

          color: var(--accent-light);

          margin-bottom: 0.75rem;
        }

        .lp-section-title {
          font-family: 'Sora', sans-serif;
          font-size: clamp(1.6rem, 4vw, 2.4rem);
          font-weight: 700;

          text-align: center;

          color: #0F172A;

          letter-spacing: -0.02em;
          line-height: 1.2;

          margin-bottom: 3rem;
        }

        .lp-cards {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }

        @media (min-width: 600px) {
          .lp-cards {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .lp-card {
          position: relative;
          overflow: hidden;

          background: #FFFFFF;

          border: 1px solid rgba(15,23,42,0.08);
          border-radius: 16px;

          padding: 1.75rem 1.5rem;

          box-shadow: 0 4px 20px rgba(15,23,42,0.04);

          transition:
            border-color 0.25s,
            transform 0.25s,
            box-shadow 0.25s;
        }

        .lp-card::before {
          content: '';

          position: absolute;
          inset: 0;

          background: radial-gradient(
            circle at top left,
            var(--accent-glow),
            transparent 60%
          );

          opacity: 0;

          transition: opacity 0.3s;
        }

        .lp-card:hover::before {
          opacity: 1;
        }

        .lp-card:hover {
          border-color: rgba(37,99,235,0.22);
          transform: translateY(-4px);
          box-shadow: 0 14px 40px rgba(37,99,235,0.10);
        }

        .lp-card-icon {
          width: 44px;
          height: 44px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 12px;

          background: rgba(59,130,246,0.08);

          border: 1px solid rgba(59,130,246,0.15);

          font-size: 1.25rem;

          margin-bottom: 1.1rem;
        }

        .lp-card h3 {
          font-family: 'Sora', sans-serif;
          font-size: 1rem;
          font-weight: 600;

          color: #0F172A;

          letter-spacing: -0.01em;

          margin-bottom: 0.5rem;
        }

        .lp-card p {
          font-size: 0.875rem;
          line-height: 1.65;
          font-weight: 300;

          color: #64748B;
        }

        /* ───────── CTA ───────── */

        .lp-cta {
          position: relative;
          overflow: hidden;

          margin: 0 1.25rem 4rem;

          padding: 3.5rem 1.5rem;

          text-align: center;

          border-radius: 20px;

          background: linear-gradient(
            135deg,
            #2563EB 0%,
            #1D4ED8 100%
          );

          border: 1px solid rgba(59,130,246,0.2);
        }

        .lp-cta::before {
          content: '';

          position: absolute;
          top: -60px;
          left: 50%;

          transform: translateX(-50%);

          width: 300px;
          height: 200px;

          background: radial-gradient(
            ellipse,
            rgba(255,255,255,0.18),
            transparent 70%
          );
        }

        .lp-cta h2 {
          position: relative;

          font-family: 'Sora', sans-serif;
          font-size: clamp(1.5rem, 4vw, 2.2rem);
          font-weight: 700;

          color: #FFFFFF;

          letter-spacing: -0.02em;

          margin-bottom: 0.75rem;
        }

        .lp-cta p {
          position: relative;

          font-size: 0.95rem;
          font-weight: 300;

          color: rgba(255,255,255,0.8);

          margin-bottom: 2rem;
        }

        .btn-cta {
          position: relative;

          display: inline-block;

          padding: 0.85rem 2rem;

          background: #FFFFFF;
          color: #2563EB;

          font-family: 'Sora', sans-serif;
          font-size: 0.95rem;
          font-weight: 700;

          border: none;
          border-radius: 10px;

          cursor: pointer;

          transition: all 0.2s;
        }

        .btn-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.18);
        }

        /* ───────── FOOTER ───────── */

        .lp-footer {
          border-top: 1px solid var(--border);

          background: #FFFFFF;

          padding: 1.75rem 1.25rem;

          text-align: center;

          font-size: 0.8rem;
          font-weight: 300;

          color: #64748B;
        }

        /* ───────── ANIMATIONS ───────── */

        .fade-up {
          opacity: 0;
          transform: translateY(28px);

          transition:
            opacity 0.6s ease,
            transform 0.6s ease;
        }

        .fade-up.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .delay-1 {
          transition-delay: 0.1s;
        }

        .delay-2 {
          transition-delay: 0.2s;
        }

        .delay-3 {
          transition-delay: 0.3s;
        }

        .delay-4 {
          transition-delay: 0.4s;
        }
      `}</style>

      <div className="lp-root">
        {/* NAV */}

        <nav className="lp-nav">
          <div className="lp-nav-brand">
            <img src="/Tapinac.logo.jpg" alt="Tapinac Logo" />
            <span>Tap-Watch</span>
          </div>

          <div className="lp-nav-actions">
            <button
              className="btn-ghost"
              onClick={() => navigate('/login')}
            >
              Sign In
            </button>

            <button
              className="btn-primary"
              onClick={() => navigate('/signup')}
            >
              Sign Up
            </button>
          </div>
        </nav>

        {/* HERO */}

        <section className="lp-hero" ref={heroRef}>
          <div className="lp-hero-glow" />

          <div className="lp-badge fade-up visible">
            <span className="lp-badge-dot" />
            Community Safety Platform
          </div>

          <h1 className="fade-up visible delay-1">
            Report Incidents.
            <br />
            <em>Protect</em> Your Community.
          </h1>

          <p className="fade-up visible delay-2">
            A simple platform for residents to report incidents and
            for barangay officials to monitor and respond to
            community safety issues — fast.
          </p>

          <div className="lp-hero-btns fade-up visible delay-3">
            <button
              className="btn-hero-primary"
              onClick={() => navigate('/signup')}
            >
              Report an Incident
            </button>

            <button
              className="btn-hero-outline"
              onClick={() => navigate('/login')}
            >
              Official Sign In
            </button>
          </div>
        </section>

        {/* STATS */}

        <div className="lp-stats fade-up visible delay-4">
          <div className="lp-stat">
            <div className="lp-stat-num">Fast</div>
            <div className="lp-stat-label">Response Time</div>
          </div>

          <div className="lp-stat">
            <div className="lp-stat-num">24/7</div>
            <div className="lp-stat-label">Monitoring</div>
          </div>

          <div className="lp-stat">
            <div className="lp-stat-num">Live</div>
            <div className="lp-stat-label">Map Tracking</div>
          </div>
        </div>

        {/* FEATURES */}

        <section className="lp-features">
          <p className="lp-section-label fade-up">
            Features
          </p>

          <h2 className="lp-section-title fade-up delay-1">
            Everything your barangay needs
          </h2>

          <div className="lp-cards">
            <div className="lp-card fade-up delay-1">
              <div className="lp-card-icon">📍</div>

              <h3>Map-Based Reporting</h3>

              <p>
                Drop a pin on the barangay map to report
                incidents with exact location accuracy in
                seconds.
              </p>
            </div>

            <div className="lp-card fade-up delay-2">
              <div className="lp-card-icon">🔔</div>

              <h3>Real-Time Alerts</h3>

              <p>
                Officials receive instant notifications for new
                incidents so they can respond quickly.
              </p>
            </div>

            <div className="lp-card fade-up delay-3">
              <div className="lp-card-icon">📊</div>

              <h3>Analytics & Reports</h3>

              <p>
                Track incident trends and identify patterns to
                help prevent future incidents effectively.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}

        <section className="lp-cta fade-up">
          <h2>Help Keep Your Barangay Safe</h2>

          <p>
            Start reporting incidents today and contribute
            to community safety.
          </p>

          <button
            className="btn-cta"
            onClick={() => navigate('/signup')}
          >
            Get Started — It's Free
          </button>
        </section>

        {/* FOOTER */}

        <footer className="lp-footer">
          © 2024 Tap-Watch · A community incident reporting
          system for Barangay Tapinac
        </footer>
      </div>
    </>
  )
}