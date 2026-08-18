import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  FaShieldAlt, FaUsers, FaBell, FaMapMarkedAlt,
  FaRobot, FaUserCheck, FaDownload,
  FaAndroid, FaBars, FaTimes, FaLocationArrow,
  FaCheckCircle, FaArrowRight, FaExclamationTriangle,
  FaMap
} from 'react-icons/fa'
import { QRCodeSVG } from 'qrcode.react'
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { eastTapinacGeoJSON } from '../data/EastTapinac'
import { getIncidents, subscribeToIncidents } from '../lib/database'

const APK_URL = import.meta.env.VITE_APK_DOWNLOAD_URL || '/downloads/tap-watch.apk'

/* Full absolute URL for QR code — phone scanners need a complete URL, not a relative path */
const APK_QR_URL = APK_URL.startsWith('http')
  ? APK_URL
  : `${import.meta.env.VITE_APP_URL || window.location.origin}/downloads/tap-watch.apk`

/* Force-download helper — works even without proper Content-Disposition headers */
async function downloadAPK() {
  try {
    const res = await fetch(APK_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'tap-watch.apk'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('APK download failed:', err)
    // Fallback: open directly
    window.open(APK_URL, '_blank')
  }
}

/* ── Incident type config ───────────────────────────────────────────── */
const INCIDENT_TYPES = [
  { key: 'crime',        label: 'Crime',        color: 'red',    badgeBg: 'bg-red-500',    barColor: 'bg-red-500' },
  { key: 'accident',     label: 'Accident',     color: 'orange', badgeBg: 'bg-orange-400', barColor: 'bg-orange-500' },
  { key: 'fire',         label: 'Fire',         color: 'red',    badgeBg: 'bg-red-600',    barColor: 'bg-red-600' },
  { key: 'flood',        label: 'Flood',        color: 'blue',   badgeBg: 'bg-blue-500',   barColor: 'bg-blue-500' },
  { key: 'disturbance',  label: 'Disturbance',  color: 'yellow', badgeBg: 'bg-yellow-500', barColor: 'bg-yellow-500' },
]

/* ── Live stats hook — fetches real data + subscribes to changes ────── */
function useLiveStats() {
  const [stats, setStats] = useState({
    byType: {},
    byStatus: {},
    recentAlert: null,
    loading: true,
  })

  // stable ref so the subscription callback never captures a stale closure
  const statsRef = useRef(stats)

  const compute = (incidents) => {
    const byType = {}
    const byStatus = {}
    let recentAlert = null

    incidents.forEach(inc => {
      const t = (inc.type || '').toLowerCase()
      byType[t] = (byType[t] || 0) + 1

      const s = (inc.status || '').toLowerCase()
      byStatus[s] = (byStatus[s] || 0) + 1

      if (s !== 'resolved') {
        if (!recentAlert || new Date(inc.created_at) > new Date(recentAlert.created_at)) {
          recentAlert = inc
        }
      }
    })

    const next = { byType, byStatus, recentAlert, loading: false }
    statsRef.current = next
    setStats(next)
  }

  useEffect(() => {
    let isMounted = true

    // Initial fetch
    getIncidents().then(({ data }) => {
      if (isMounted) {
        if (data) compute(data)
        else setStats(s => ({ ...s, loading: false }))
      }
    })

    // Real-time: re-fetch once on any incident change
    // Use a single stable channel — don't recreate on every render
    const channel = subscribeToIncidents(() => {
      if (!isMounted) return
      getIncidents().then(({ data }) => {
        if (isMounted && data) compute(data)
      })
    })

    return () => {
      isMounted = false
      try { channel?.unsubscribe() } catch (_) {}
    }
  }, []) // empty deps — run once on mount only

  return stats
}

/* ── Scroll-reveal hook ─────────────────────────────────────────────── */
function useReveal(threshold = 0.12) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, visible]
}

/* ── Active section tracker ─────────────────────────────────────────── */
function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0])
  useEffect(() => {
    const obs = ids.map(id => {
      const el = document.getElementById(id)
      if (!el) return null
      const o = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) setActive(id) },
        { threshold: 0.35 }
      )
      o.observe(el)
      return o
    })
    return () => obs.forEach(o => o && o.disconnect())
  }, []) // eslint-disable-line
  return active
}

/* ── Navbar — white bar, matching reference image exactly ───────────── */
function Navbar({ active }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  /* nav sections – reference image shows: Home · Features · How It Works · Emergency Contacts · About Us */
  const navLinks = [
    { id:'hero',       label:'Home' },
    { id:'features',   label:'Features' },
    { id:'features',   label:'How It Works' },
    { id:'monitoring', label:'Emergency Contacts' },
    { id:'getstarted', label:'About Us' },
  ]
  const go = id => { document.getElementById(id)?.scrollIntoView({ behavior:'smooth' }); setOpen(false) }

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-[68px] flex items-center justify-between">

        {/* Logo — exactly like reference */}
        <button onClick={() => go('hero')} className="flex items-center gap-3 flex-shrink-0">
          <img src="/Tapinac.logo.jpg" alt="Tap-Watch"
            className="w-11 h-11 rounded-full object-cover border-2 border-blue-100 shadow-sm" />
          <div className="text-left">
            <p className="font-extrabold text-xl leading-none tracking-tight">
              <span className="text-gray-900">Tap</span><span className="text-blue-600">-Watch</span>
            </p>
            <p className="text-[10px] text-gray-400 leading-none mt-0.5 font-medium">Barangay East Tapinac</p>
          </div>
        </button>

        {/* Center nav links */}
        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map(({ id, label }) => (
            <button key={label} onClick={() => go(id)}
              className={`relative px-4 py-2 text-sm font-medium transition-colors duration-150
                ${active===id && label==='Home'
                  ? 'text-blue-600'
                  : 'text-gray-700 hover:text-blue-600'}`}>
              {label}
              {active===id && label==='Home' && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[2px] bg-blue-600 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Right actions — Log In (outline) + Sign Up (blue solid) */}
        <div className="hidden lg:flex items-center gap-2">
          <button onClick={() => navigate('/login')}
            className="px-5 py-2 text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-all">
            Log In
          </button>
          <button onClick={() => navigate('/signup')}
            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-sm">
            Sign Up
          </button>
        </div>

        {/* Mobile burger */}
        <button className="lg:hidden p-2 text-gray-600 rounded-md" onClick={() => setOpen(!open)}>
          {open ? <FaTimes size={18}/> : <FaBars size={18}/>}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden bg-white border-t border-gray-100 px-5 py-4 space-y-1 shadow-lg">
          {navLinks.map(({ id, label }) => (
            <button key={label} onClick={() => go(id)}
              className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
              {label}
            </button>
          ))}
          <div className="pt-3 space-y-2 border-t border-gray-100">
            <button onClick={() => navigate('/login')} className="w-full py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg">Log In</button>
            <button onClick={() => navigate('/signup')} className="w-full py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg">Sign Up</button>
            <button onClick={() => { downloadAPK(); setOpen(false) }}
              className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold text-white bg-gray-900 rounded-lg">
              <FaAndroid /> Download APK
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}

/* ── Android-style phone frame with dashboard content ───────────────── */
function DashboardPhone() {
  return (
    <div className="relative mx-auto select-none" style={{width:'270px'}}>
      {/* Outer device shell — thin bezel */}
      <div className="relative rounded-[2.6rem] bg-gray-900 shadow-[0_30px_80px_rgba(0,0,0,0.45)] ring-[2px] ring-gray-700"
        style={{padding:'4px', width:'270px'}}>
        {/* Inner bezel — thin like a modern Android */}
        <div className="rounded-[2.4rem] border-[3px] border-black overflow-hidden bg-black relative" style={{height:'570px'}}>
          {/* Punch-hole camera */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-3 h-3 bg-black rounded-full z-20" />
          {/* Dashboard screenshot fills the screen */}
          <img
            src="/dashboard-frame.jpg"
            alt="Tap-Watch Dashboard"
            className="w-full h-full object-cover object-top"
          />
        </div>
        {/* Side buttons — scaled to match thinner shell */}
        <div className="absolute -right-0.5 top-24 w-[3px] h-9 bg-gray-700 rounded-r-sm" />
        <div className="absolute -left-0.5 top-20 w-[3px] h-6 bg-gray-700 rounded-l-sm" />
        <div className="absolute -left-1 top-32 w-1 h-7 bg-gray-700 rounded-l-sm" />
      </div>
    </div>
  )
}

/* ── SOS Phone Mockup ───────────────────────────────────────────────── */
function SOSPhone() {
  return (
    <div className="relative mx-auto select-none" style={{width:'220px'}}>
      <div className="relative rounded-[2.8rem] bg-gray-900 shadow-[0_25px_60px_rgba(0,0,0,0.5)] ring-[3px] ring-gray-700" style={{padding:'9px'}}>
        <div className="rounded-[2.3rem] border-[7px] border-black overflow-hidden" style={{height:'440px',background:'#0f172a'}}>
          {/* Punch-hole */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-black rounded-full z-20" />
          {/* Status */}
          <div className="bg-red-700 px-3 pt-5 pb-1.5 flex justify-between">
            <span className="text-white text-[8px] font-bold">9:41</span>
            <span className="text-white text-[8px]">🔋 SOS</span>
          </div>
          {/* SOS Header */}
          <div className="bg-red-600 px-4 py-3 text-center">
            <div className="text-white text-[11px] font-black tracking-widest">🚨 SOS EMERGENCY</div>
            <div className="text-red-200 text-[8px] mt-0.5">Tap-Watch Emergency System</div>
          </div>
          {/* Countdown */}
          <div className="bg-red-900/80 px-4 py-2 flex items-center justify-center gap-2">
            <div className="text-[8px] text-red-300">Auto-sending in</div>
            <div className="text-[20px] font-black text-white">5</div>
            <div className="text-[8px] text-red-300">seconds</div>
          </div>
          {/* SOS Button */}
          <div className="flex items-center justify-center py-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping scale-110" />
              <div className="absolute inset-0 rounded-full bg-red-500/15 animate-ping scale-125" style={{animationDelay:'0.3s'}} />
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.6)] relative z-10">
                <span className="text-white font-black text-lg">SOS</span>
              </div>
            </div>
          </div>
          {/* Location */}
          <div className="mx-3 bg-gray-800 rounded-xl p-2 space-y-1.5">
            <div className="flex items-center gap-2">
              <FaLocationArrow className="text-blue-400 text-[9px]" />
              <span className="text-[7.5px] text-gray-300 font-medium">Current Location</span>
            </div>
            <p className="text-[7px] text-blue-300 font-mono">14.5678° N, 120.3456° E</p>
            <p className="text-[7px] text-gray-400">Purok 3, East Tapinac, Olongapo</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-[6.5px] text-green-400">GPS Active • Accuracy: ±5m</span>
            </div>
          </div>
          {/* Contacts notified */}
          <div className="mx-3 mt-2 bg-gray-800 rounded-xl p-2">
            <p className="text-[7px] text-gray-400 mb-1">Notifying:</p>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                <FaShieldAlt className="text-white text-[5px]" />
              </div>
              <div>
                <p className="text-[7px] text-white font-medium">Barangay East Tapinac</p>
                <p className="text-[6px] text-green-400">● Notified</p>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute -right-1 top-20 w-1 h-9 bg-gray-700 rounded-r-sm" />
        <div className="absolute -left-1 top-18 w-1 h-6 bg-gray-700 rounded-l-sm" />
      </div>
    </div>
  )
}

/* ── APK Phone Mockup ───────────────────────────────────────────────── */
function APKPhone() {
  return (
    <div className="relative mx-auto select-none" style={{width:'240px'}}>
      <div className="relative rounded-[3rem] bg-gray-900 shadow-[0_30px_70px_rgba(0,0,0,0.5)] ring-[3px] ring-gray-700" style={{padding:'10px'}}>
        <div className="rounded-[2.5rem] border-[8px] border-black overflow-hidden" style={{height:'490px',background:'linear-gradient(160deg,#1e3a8a,#1d4ed8,#2563eb)'}}>
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-3 h-3 bg-black rounded-full z-20" />
          {/* Header */}
          <div className="px-5 pt-8 pb-4 text-center">
            <img src="/Tapinac.logo.jpg" alt="logo" className="w-14 h-14 rounded-full mx-auto mb-2 border-2 border-white/30 shadow-lg" />
            <p className="text-white font-extrabold text-sm">Tap-Watch</p>
            <p className="text-blue-200 text-[9px]">Community Emergency Monitor</p>
          </div>
          {/* Stats strip */}
          <div className="mx-4 bg-white/10 backdrop-blur rounded-2xl p-3 grid grid-cols-3 gap-2 mb-4">
            {[['500+','Residents'],['24/7','Monitoring'],['Real-time','Alerts']].map(([n,l])=>(
              <div key={l} className="text-center">
                <p className="text-white font-bold text-[12px]">{n}</p>
                <p className="text-blue-200 text-[7px]">{l}</p>
              </div>
            ))}
          </div>
          {/* Feature chips */}
          <div className="mx-4 space-y-1.5 mb-4">
            {[['🛡️','Report Incidents'],['🗺️','Live Incident Map'],['🚨','SOS Emergency'],['🔔','Real-time Alerts'],['🤖','AI Classification']].map(([e,l])=>(
              <div key={l} className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-1.5">
                <span className="text-[10px]">{e}</span>
                <span className="text-white text-[8px] font-medium">{l}</span>
                <FaCheckCircle className="text-green-400 text-[8px] ml-auto" />
              </div>
            ))}
          </div>
          {/* Download button on phone */}
          <div className="mx-4">
            <div className="bg-white rounded-2xl py-2.5 flex items-center justify-center gap-2 shadow-lg">
              <FaAndroid className="text-blue-600 text-sm" />
              <span className="text-blue-700 font-bold text-[10px]">Download for Android</span>
            </div>
          </div>
        </div>
        <div className="absolute -right-1 top-24 w-1 h-10 bg-gray-700 rounded-r-sm" />
        <div className="absolute -left-1 top-20 w-1 h-7 bg-gray-700 rounded-l-sm" />
        <div className="absolute -left-1 top-32 w-1 h-7 bg-gray-700 rounded-l-sm" />
      </div>
    </div>
  )
}

/* ── Wave divider ───────────────────────────────────────────────────── */
function WaveDivider({ flip = false, topColor = '#fff', bottomColor = '#eff6ff' }) {
  return (
    <div className={`w-full overflow-hidden leading-none ${flip ? 'rotate-180' : ''}`}
      style={{background: bottomColor, marginTop:'-2px'}}>
      <svg viewBox="0 0 1440 60" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-12">
        <path d="M0,30 C360,60 1080,0 1440,30 L1440,0 L0,0 Z" fill={topColor} />
      </svg>
    </div>
  )
}

/* ── Landing page incident map preview (real Leaflet map) ───────────── */
const typeColors = {
  crime: '#9333ea',
  accident: '#f97316',
  fire: '#ef4444',
  flood: '#3b82f6',
  disturbance: '#eab308',
}

function createLandingIcon(type) {
  const color = typeColors[type] || '#6b7280'
  const size = 24
  const height = 30
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:${size}px;height:${height}px;display:flex;align-items:center;justify-content:center;">
      <svg width="${size}" height="${height}" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C7.58 0 4 3.58 4 8C4 14 12 24 12 24C12 24 20 14 20 8C20 3.58 16.42 0 12 0Z" fill="${color}" stroke="white" stroke-width="1.5"/>
        <circle cx="12" cy="8" r="3" fill="white"/>
      </svg>
    </div>`,
    iconSize: [size, height],
    iconAnchor: [size / 2, height],
    popupAnchor: [0, -height],
  })
}

// Fits the map view to the East Tapinac GeoJSON boundary
function FitBoundsToGeoJSON() {
  const map = useMap()
  useEffect(() => {
    try {
      const layer = L.geoJSON(eastTapinacGeoJSON)
      const bounds = layer.getBounds()
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [-20, -20] })
      }
    } catch (e) {
      console.warn('FitBounds error:', e)
    }
  }, [map])
  return null
}

function LandingMapPreview() {
  const navigate = useNavigate()
  const [incidents, setIncidents] = useState([])

  useEffect(() => {
    getIncidents().then(({ data }) => {
      if (data) setIncidents(data)
    })
  }, [])

  return (
    <div className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl hover:border-blue-500/40 transition-all">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold text-sm">Live Incident Map</h3>
          <p className="text-slate-400 text-xs mt-0.5">East Tapinac, Olongapo City</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-green-400 text-xs font-semibold">Live</span>
        </div>
      </div>

      {/* Real Leaflet map */}
      <div className="relative h-56 overflow-hidden">
        <MapContainer
          center={[14.835, 120.283]}
          zoom={15}
          zoomControl={false}
          scrollWheelZoom={false}
          dragging={false}
          doubleClickZoom={false}
          touchZoom={false}
          keyboard={false}
          attributionControl={false}
          className="h-full w-full"
          style={{ zIndex: 1 }}
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
          <FitBoundsToGeoJSON />
          <GeoJSON
            data={eastTapinacGeoJSON}
            style={{
              color: '#3b82f6',
              weight: 2,
              opacity: 0.8,
              fillColor: '#3b82f6',
              fillOpacity: 0.1,
            }}
          />
          {incidents.map((i) => {
            if (!i.latitude || !i.longitude) return null
            return (
              <Marker key={i.id} position={[i.latitude, i.longitude]} icon={createLandingIcon(i.type)}>
                <Popup>
                  <div className="text-xs space-y-1 min-w-[160px]">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: typeColors[i.type] || '#6b7280' }}
                      />
                      <p className="font-bold capitalize text-gray-900">{i.type}</p>
                    </div>
                    <p className="text-gray-600 text-[11px] leading-snug">{i.location}</p>
                    <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-semibold capitalize ${
                      i.status === 'pending'    ? 'bg-amber-100 text-amber-700'
                      : i.status === 'responding' ? 'bg-blue-100 text-blue-700'
                      : 'bg-emerald-100 text-emerald-700'
                    }`}>{i.status}</span>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>

        {/* Legend overlay */}
        <div className="absolute bottom-2 left-2 bg-black/70 rounded-lg p-2 space-y-1 z-10 pointer-events-none">
          {[['#ef4444','Pending'],['#f97316','Responding'],['#22c55e','Resolved']].map(([color,label]) => (
            <div key={label} className="flex items-center gap-1.5 text-[9px] text-white">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer button */}
      <div className="px-5 py-3 bg-slate-800">
        <button
          onClick={() => navigate('/resident-map')}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all"
        >
          <FaMap /> View Full Incident Map →
        </button>
      </div>
    </div>
  )
}

/* ── Scroll-reveal wrapper ──────────────────────────────────────────── */
function Reveal({ children, delay = 0, className = '' }) {
  const [ref, visible] = useReveal()
  return (
    <div ref={ref} className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   SCROLL 1 — HERO  (matches reference image exactly)
   Layout:
   ┌─────────────────────────────────────────────────────────────────┐
   │  NAV (white bar, fixed 68px)                                    │
   ├─────────────────────────────────────────────────────────────────┤
   │  HERO BODY — background.jpg fills ~78vh                         │
   │  ┌──── LEFT (text+CTAs+trust) ──┬── CENTER (phone) ──┬─ RIGHT ─┤
   │  │ badge pill                   │  DashboardPhone    │ card    │
   │  │ headline                     │                    │         │
   │  │ description                  │                    │         │
   │  │ [Report] [Map]               │                    │         │
   │  │ trust cards (3)              │                    │         │
   │  └──────────────────────────────┴────────────────────┴─────────┤
   ├─────────────────────────────────────────────────────────────────┤
   │  FEATURE STRIP — white bar, 5 feature icon blocks               │
   └─────────────────────────────────────────────────────────────────┘
═══════════════════════════════════════════════════════════════════ */
function HeroSection() {
  const navigate = useNavigate()
  const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior:'smooth' })
  const liveStats = useLiveStats()

  return (
    <section id="hero" className="flex flex-col">

      {/* ── Hero body with background.jpg ───────────────────────────── */}
      <div className="relative overflow-hidden" style={{ minHeight:'calc(100vh - 68px)' }}>
        {/* Background photo */}
        <div className="absolute inset-0"
          style={{
            backgroundImage: "url('/background.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
          }} />
        {/* Subtle left-side gradient so text stays readable */}
        <div className="absolute inset-0"
          style={{background:'linear-gradient(105deg, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.18) 45%, rgba(0,0,0,0.08) 70%, transparent 100%)'}} />
        {/* Blue wave at the very bottom of the photo area */}
        <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
          style={{background:'linear-gradient(to top, rgba(30,64,175,0.55), transparent)'}} />

        {/* ── Desktop 3-col grid ────────────────────────────────────── */}
        <div className="hidden lg:flex items-center h-full absolute inset-0">
          <div className="w-full max-w-[1280px] mx-auto px-8 grid grid-cols-[420px_1fr_300px] gap-6 items-center pt-6 pb-10">

            {/* LEFT — text + CTAs + trust cards */}
            <div className="flex flex-col gap-5">

              {/* Badge pill */}
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-4 py-1.5 w-fit">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="text-white text-xs font-semibold tracking-wide">
                  A Safer Community. A Stronger East Tapinac.
                </span>
              </div>

              {/* Headline — black + blue, matching reference */}
              <div>
                <h1 className="font-black leading-[1.15] drop-shadow-md" style={{fontSize:'clamp(2rem,3.2vw,2.8rem)'}}>
                  <span className="text-white">Together, We<br />Keep </span>
                  <span className="text-blue-300">East Tapinac</span>
                  <span className="text-white"> Safe.</span>
                </h1>
                <p className="mt-3 text-white/85 text-sm leading-relaxed max-w-sm drop-shadow">
                  Tap-Watch is a community emergency monitoring system that
                  helps residents report incidents, receive real-time alerts,
                  and connect with barangay officials when it matters most.
                </p>
              </div>

              {/* 3 CTA buttons — blue solid + white outline + APK */}
              <div className="flex flex-wrap gap-2.5">
                <button onClick={() => navigate('/report')}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-lg shadow-lg transition-all hover:scale-105 active:scale-95 text-sm">
                  <FaShieldAlt className="text-sm" /> Report an Incident
                </button>
                <button onClick={() => navigate('/resident-map')}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur text-white font-semibold px-5 py-2.5 rounded-lg border border-white/50 transition-all hover:scale-105 text-sm">
                  <FaMap className="text-sm" /> View Incident Map
                </button>
                {/* Download APK button */}
                <button onClick={downloadAPK}
                  className="flex items-center justify-center gap-3 bg-white hover:bg-blue-50 text-blue-700 font-black px-7 py-4 rounded-2xl shadow-lg transition-all hover:scale-105 text-base border border-white w-full">
                  <FaAndroid className="text-xl text-blue-600" />
                  <span>Download Tap-Watch APK</span>
                  <FaDownload className="text-sm text-blue-400" />
                </button>
              </div>

              {/* 3 trust/benefit small cards */}
              <div className="flex gap-2.5 flex-wrap">
                {[
                  [FaUsers,'For Residents','Report & stay informed','blue'],
                  [FaCheckCircle,'For a Safe Community','Verified & trustworthy','green'],
                  [FaBell,'For Faster Response','Real-time alerts to officials','red'],
                ].map(([Icon, title, sub, accent]) => (
                  <div key={title}
                    className="flex items-center gap-2.5 bg-white/90 backdrop-blur-sm rounded-xl px-3.5 py-2.5 shadow hover:shadow-md transition-all hover:-translate-y-0.5 min-w-[120px]">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                      ${accent==='blue' ? 'bg-blue-600' : accent==='green' ? 'bg-green-600' : 'bg-red-500'}`}>
                      <Icon className="text-white text-xs" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-gray-900 leading-tight">{title}</p>
                      <p className="text-[9px] text-gray-500 leading-tight">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CENTER — phone mockup, shifted down a bit */}
            <div className="flex justify-center items-center mt-16">
              <div className="animate-float drop-shadow-2xl">
                <DashboardPhone />
              </div>
            </div>

            {/* RIGHT — "What's Happening" white card */}
            <div className="flex items-center justify-end">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-5 w-full max-w-[290px] border border-white/60">
                <h3 className="font-bold text-gray-900 text-sm leading-snug mb-1">
                  What's Happening<br />Around{' '}
                  <span className="text-blue-600">East Tapinac?</span>
                </h3>
                <div className="flex items-center gap-1.5 mb-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] text-green-600 font-semibold">Live Updates</span>
                </div>
                <div className="space-y-2 mb-4">
                  {INCIDENT_TYPES.map(({ key, label, badgeBg }) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full ${badgeBg} flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0`}>
                        {label[0]}
                      </span>
                      <span className="text-xs text-gray-700 font-medium flex-1">{label}</span>
                      <span className="text-xs font-bold text-gray-900">
                        {liveStats.loading ? '…' : (liveStats.byType[key] || 0)}
                      </span>
                    </div>
                  ))}
                </div>
                <button onClick={() => navigate('/resident-map')}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all">
                  Explore Map <FaArrowRight className="text-[9px]" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Mobile hero is rendered at the LandingPage top level (lg:hidden) ── */}
      </div>

      {/* ── Feature strip — white bar at the bottom, 5 items ─────────── */}
      <div className="hidden lg:block bg-white border-t border-gray-100 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="max-w-[1280px] mx-auto px-8">
          <div className="grid grid-cols-5 divide-x divide-gray-100">
            {[
              [FaShieldAlt,'Report Incidents','Easily report crime, accident, fire, flood, and disturbances with location and evidence.','blue'],
              [FaMapMarkedAlt,'Live Incident Map','View real-time incident updates and hotspots around East Tapinac.','blue'],
              [FaExclamationTriangle,'SOS Emergency','Send emergency alerts with your location to notify barangay officials.','red'],
              [FaBell,'Community Alerts','Stay informed with the latest alerts and important announcements.','blue'],
              [FaRobot,'AI-Powered System','Smart classification and priority detection for faster response.','blue'],
            ].map(([Icon, title, desc, accent]) => (
              <div key={title} className="flex items-start gap-3 px-6 py-5 hover:bg-blue-50/50 transition-colors group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform
                  ${accent==='red' ? 'bg-red-500' : 'bg-blue-600'}`}>
                  <Icon className="text-white text-base" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{title}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll nudge */}
      <div className="hidden lg:flex justify-center py-4 bg-white">
        <button onClick={() => scrollTo('features')}
          className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-blue-600 transition-colors text-[11px]">
          <span>Scroll to explore</span>
          <span className="animate-bounce text-base">↓</span>
        </button>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════════
   SCROLL 2 — FEATURES
═══════════════════════════════════════════════════════════════════ */
const FEATURES = [
  {
    icon: FaShieldAlt, color: 'blue',
    title: 'Report Incidents',
    desc: 'Submit crime, accident, fire, flood, or disturbance reports with photos and location.',
    tags: ['Crime','Accident','Fire','Flood','Disturbance'],
  },
  {
    icon: FaMapMarkedAlt, color: 'indigo',
    title: 'Live Incident Map',
    desc: 'Real-time GIS map showing all active incidents across Barangay East Tapinac.',
    tags: ['Real-time locations','Barangay boundary','Incident markers','Hotspot monitoring'],
  },
  {
    icon: FaExclamationTriangle, color: 'red',
    title: 'SOS Emergency',
    desc: 'One-tap emergency alert with GPS location sent instantly to barangay officials.',
    tags: ['Emergency countdown','GPS location','Admin notification','Emergency assistance'],
  },
  {
    icon: FaBell, color: 'yellow',
    title: 'Community Alerts',
    desc: 'Receive push notifications for incidents, announcements, and updates near you.',
    tags: ['Real-time notifications','Announcements','Incident updates'],
  },
  {
    icon: FaRobot, color: 'purple',
    title: 'AI Classification',
    desc: 'Smart AI automatically classifies and prioritizes incoming incident reports.',
    tags: ['Smart classification','Priority detection','Faster response'],
  },
  {
    icon: FaUserCheck, color: 'green',
    title: 'Resident Verification',
    desc: 'Verified resident badges for more credible and trustworthy incident reports.',
    tags: ['Verified residents','Identity verification','Trustworthy reports'],
  },
]

const colorMap = {
  blue:   { bg:'bg-blue-100',   icon:'bg-blue-600',   text:'text-blue-600',   tag:'bg-blue-50 text-blue-700' },
  indigo: { bg:'bg-indigo-100', icon:'bg-indigo-600', text:'text-indigo-600', tag:'bg-indigo-50 text-indigo-700' },
  red:    { bg:'bg-red-100',    icon:'bg-red-600',    text:'text-red-600',    tag:'bg-red-50 text-red-700' },
  yellow: { bg:'bg-yellow-100', icon:'bg-yellow-500', text:'text-yellow-600', tag:'bg-yellow-50 text-yellow-700' },
  purple: { bg:'bg-purple-100', icon:'bg-purple-600', text:'text-purple-600', tag:'bg-purple-50 text-purple-700' },
  green:  { bg:'bg-green-100',  icon:'bg-green-600',  text:'text-green-600',  tag:'bg-green-50 text-green-700' },
}

function FeaturesSection() {
  const navigate = useNavigate()
  return (
    <section id="features" className="bg-gradient-to-b from-blue-50 to-white py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <Reveal className="text-center mb-14">
          <span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-4 py-1.5 rounded-full mb-4 tracking-wide uppercase">
            02 — Features
          </span>
          <h2 className="text-3xl lg:text-4xl font-black text-gray-900 mb-4">
            Everything You Need for a<br />
            <span className="text-blue-600">Safer Community.</span>
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-base">
            Tap-Watch provides a complete set of tools to report, monitor, and respond to incidents in real time.
          </p>
        </Reveal>

        {/* Feature cards — desktop 3-col grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {FEATURES.map(({ icon: Icon, color, title, desc, tags }, i) => {
            const c = colorMap[color]
            return (
              <Reveal key={title} delay={i * 80}>
                <div className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full">
                  <div className={`w-12 h-12 rounded-2xl ${c.icon} flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform`}>
                    <Icon className="text-white text-xl" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-base mb-2">{title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed mb-4">{desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map(tag => (
                      <span key={tag} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.tag}`}>{tag}</span>
                    ))}
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>

        {/* How It Works */}
        <Reveal>
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-3xl p-8 lg:p-12 shadow-xl">
            <div className="text-center mb-8">
              <h3 className="text-white font-black text-2xl lg:text-3xl">How It Works</h3>
              <p className="text-blue-200 mt-2 text-sm">Three simple steps to a safer community</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              {[
                ['01','Register & Verify','Create your account and verify your identity as an East Tapinac resident.', FaUserCheck],
                ['02','Report or Request Help','Submit incident reports or send an SOS emergency alert with your location.', FaShieldAlt],
                ['03','Barangay Responds','Officials receive real-time alerts and coordinate a rapid response.', FaBell],
              ].map(([num, title, desc, Icon], i) => (
                <div key={num} className="relative flex flex-col items-center text-center lg:text-left lg:items-start">
                  <div className="flex lg:flex-row flex-col items-center gap-4 w-full">
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 rounded-2xl bg-white/15 border-2 border-white/30 flex items-center justify-center">
                        <Icon className="text-white text-xl" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-blue-300 text-xs font-black mb-0.5">{num}</div>
                      <h4 className="text-white font-bold text-sm mb-1">{title}</h4>
                      <p className="text-blue-200 text-xs leading-relaxed">{desc}</p>
                    </div>
                    {/* Connector arrow — desktop only */}
                    {i < 2 && (
                      <div className="hidden lg:flex items-center justify-center w-10 flex-shrink-0">
                        <FaArrowRight className="text-blue-300 text-xl" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <button onClick={() => navigate('/signup')}
                className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold px-8 py-3 rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:scale-105">
                Get Started Free <FaArrowRight className="text-sm" />
              </button>
            </div>
          </div>
        </Reveal>
      </div>
      <WaveDivider topColor="white" bottomColor="#0f172a" />
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════════
   COMMUNITY STATUS PANEL — real-time from Supabase
═══════════════════════════════════════════════════════════════════ */
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function CommunityStatusPanel() {
  const liveStats = useLiveStats()

  const pending    = liveStats.byStatus['pending']    || 0
  const responding = liveStats.byStatus['responding'] || 0
  const resolved   = liveStats.byStatus['resolved']   || 0

  // total for bar widths
  const maxCount = Math.max(...INCIDENT_TYPES.map(t => liveStats.byType[t.key] || 0), 1)

  const statusItems = [
    { n: pending,    label: 'Pending',    textColor: 'text-yellow-400', borderColor: 'border-yellow-700/30', bgColor: 'bg-yellow-900/20' },
    { n: responding, label: 'Responding', textColor: 'text-orange-400', borderColor: 'border-orange-700/30', bgColor: 'bg-orange-900/20' },
    { n: resolved,   label: 'Resolved',   textColor: 'text-green-400',  borderColor: 'border-green-700/30',  bgColor: 'bg-green-900/20' },
  ]

  const barColorMap = {
    red:    'bg-red-500',
    orange: 'bg-orange-500',
    blue:   'bg-blue-500',
    yellow: 'bg-yellow-500',
  }
  const textColorMap = {
    red:    'text-red-400',
    orange: 'text-orange-400',
    blue:   'text-blue-400',
    yellow: 'text-yellow-400',
  }

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl hover:border-blue-500/40 transition-all">
      <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold text-sm">Community Status</h3>
          <p className="text-slate-400 text-xs mt-0.5">What's happening around East Tapinac?</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-green-400 text-[9px] font-semibold">Live</span>
        </div>
      </div>
      <div className="p-5 space-y-4">
        {/* Status counters */}
        <div className="grid grid-cols-3 gap-3">
          {statusItems.map(({ n, label, textColor, borderColor, bgColor }) => (
            <div key={label} className={`${bgColor} border ${borderColor} rounded-xl p-3 text-center`}>
              <div className={`text-xl font-black ${textColor}`}>
                {liveStats.loading ? '—' : n}
              </div>
              <div className="text-[9px] text-slate-400">{label}</div>
            </div>
          ))}
        </div>

        {/* Incident category bars */}
        <div className="space-y-2.5">
          <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide">Incident Categories</p>
          {INCIDENT_TYPES.map(({ key, label, color }) => {
            const count = liveStats.byType[key] || 0
            const pct   = liveStats.loading ? 0 : Math.round((count / maxCount) * 100)
            return (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">{label}</span>
                  <span className={`${textColorMap[color] || 'text-slate-400'} font-bold`}>
                    {liveStats.loading ? '…' : count}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColorMap[color] || 'bg-slate-500'} rounded-full transition-all duration-700`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Recent alert */}
        {liveStats.recentAlert ? (
          <div className="bg-blue-900/30 border border-blue-700/30 rounded-xl p-3">
            <p className="text-blue-300 text-[10px] font-semibold mb-1.5">🔔 Recent Alert</p>
            <p className="text-white text-xs font-medium capitalize">
              {liveStats.recentAlert.type} — {liveStats.recentAlert.location || 'East Tapinac'}
            </p>
            <p className="text-slate-400 text-[10px] mt-0.5 capitalize">
              {timeAgo(liveStats.recentAlert.created_at)} · {liveStats.recentAlert.status}
            </p>
          </div>
        ) : (
          !liveStats.loading && (
            <div className="bg-green-900/20 border border-green-700/30 rounded-xl p-3">
              <p className="text-green-400 text-xs font-semibold">✅ No active incidents right now</p>
            </div>
          )
        )}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   SCROLL 3 — MONITORING
═══════════════════════════════════════════════════════════════════ */
function MonitoringSection() {
  const navigate = useNavigate()
  return (
    <section id="monitoring" className="bg-slate-900 py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <Reveal className="text-center mb-14">
          <span className="inline-block bg-blue-900/60 text-blue-300 text-xs font-bold px-4 py-1.5 rounded-full mb-4 tracking-wide uppercase border border-blue-700">
            03 — Live Monitoring
          </span>
          <h2 className="text-3xl lg:text-4xl font-black text-white mb-4">
            Stay Aware. Stay Connected.<br />
            <span className="text-blue-400">Stay Safe.</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-base">
            Real-time visibility into everything happening across Barangay East Tapinac.
          </p>
        </Reveal>

        {/* Desktop 3-panel grid */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-8 items-start">

          {/* Panel 1 — Live Map */}
          <Reveal delay={0}>
            <LandingMapPreview />
          </Reveal>

          {/* Panel 2 — SOS */}
          <Reveal delay={150}>
            <div className="bg-slate-800 rounded-2xl overflow-hidden border border-red-900/40 shadow-2xl hover:border-red-500/40 transition-all">
              <div className="px-5 py-4 border-b border-red-900/30 bg-red-950/30">
                <h3 className="text-white font-bold text-sm">SOS Emergency</h3>
                <p className="text-red-400 text-xs mt-0.5 font-semibold">When Every Second Matters.</p>
              </div>
              <div className="p-5 flex flex-col items-center gap-4">
                <SOSPhone />
                <p className="text-slate-400 text-xs text-center leading-relaxed">
                  One tap sends your location to Barangay East Tapinac officials instantly.
                  Emergency countdown, GPS tracking, and automatic contact notification.
                </p>
                <button onClick={() => navigate('/signup')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-red-900/30">
                  Learn About SOS →
                </button>
              </div>
            </div>
          </Reveal>

          {/* Panel 3 — Live Status */}
          <Reveal delay={300}>
            <CommunityStatusPanel />
          </Reveal>
        </div>

        {/* Mobile layout — stacked */}
        <div className="lg:hidden space-y-6">
          <div className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-sm">🗺️ Live Incident Map</h3>
                <p className="text-slate-400 text-xs mt-0.5">East Tapinac, Olongapo City</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-400 text-xs font-semibold">Live</span>
              </div>
            </div>
            <div className="relative h-48 overflow-hidden">
              <MapContainer
                center={[14.835, 120.283]}
                zoom={15}
                zoomControl={false}
                scrollWheelZoom={false}
                dragging={false}
                doubleClickZoom={false}
                touchZoom={false}
                keyboard={false}
                attributionControl={false}
                className="h-full w-full"
                style={{ zIndex: 1 }}
              >
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={19}
                />
                <FitBoundsToGeoJSON />
                <GeoJSON
                  data={eastTapinacGeoJSON}
                  style={{ color: '#3b82f6', weight: 2, opacity: 0.8, fillColor: '#3b82f6', fillOpacity: 0.1 }}
                />
              </MapContainer>
            </div>
            <div className="px-5 py-3">
              <button onClick={() => navigate('/resident-map')} className="w-full py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl">View Full Incident Map →</button>
            </div>
          </div>
          <div className="bg-slate-800 rounded-2xl p-5 border border-red-900/40">
            <h3 className="text-white font-bold mb-1">🚨 SOS Emergency</h3>
            <p className="text-red-400 text-xs mb-4">When Every Second Matters.</p>
            <SOSPhone />
            <button onClick={() => navigate('/signup')} className="w-full mt-4 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl">Learn About SOS →</button>
          </div>
        </div>
      </div>
      <div className="mt-12">
        <WaveDivider topColor="#0f172a" bottomColor="white" />
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════════
   SCROLL 4 — GET STARTED / APK / FOOTER
═══════════════════════════════════════════════════════════════════ */
function GetStartedSection() {
  const navigate = useNavigate()
  return (
    <section id="getstarted" className="bg-white py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6">

        {/* Trust intro */}
        <Reveal className="text-center mb-16">
          <span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-4 py-1.5 rounded-full mb-4 tracking-wide uppercase">
            04 — Get Started
          </span>
          <h2 className="text-3xl lg:text-4xl font-black text-gray-900 mb-4">
            A Safer Community Starts With<br />
            <span className="text-blue-600">Connected Residents.</span>
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-base leading-relaxed">
            When residents are verified, reports are reliable, and communication is instant —
            the barangay can respond faster and keep everyone safer.
          </p>
        </Reveal>

        {/* Trust pillars — desktop only */}
        <Reveal className="hidden lg:grid grid-cols-5 gap-4 mb-20">
          {[
            [FaUserCheck,'Verified Residents','Only confirmed East Tapinac residents can submit reports.','blue'],
            [FaShieldAlt,'Reliable Reports','Verified submissions reduce false alarms and improve response.','indigo'],
            [FaBell,'Faster Communication','Real-time alerts reach officials in seconds, not minutes.','purple'],
            [FaMapMarkedAlt,'Real-time Monitoring','Track every incident from submission to resolution.','green'],
            [FaUsers,'Barangay Response','Officials coordinate rapid, informed responses to every report.','teal'],
          ].map(([Icon,title,desc,c])=>(
            <div key={title} className="text-center p-5 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all">
              <div className={`w-12 h-12 rounded-2xl bg-${c}-100 flex items-center justify-center mx-auto mb-3`}>
                <Icon className={`text-${c}-600 text-xl`} />
              </div>
              <h4 className="font-bold text-gray-900 text-sm mb-1.5">{title}</h4>
              <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </Reveal>

        {/* APK Download card — HERO CTA */}
        <Reveal className="mb-16">
          <div className="relative overflow-hidden rounded-3xl shadow-2xl"
            style={{background:'linear-gradient(135deg,#1d4ed8 0%,#2563eb 40%,#1e40af 70%,#1a3a8f 100%)'}}>
            {/* BG decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/5" />
              <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-white/5" />
              <div className="absolute top-1/2 left-1/3 w-40 h-40 rounded-full bg-blue-300/5" />
            </div>

            <div className="relative z-10 p-8 lg:p-12">
              {/* Desktop layout */}
              <div className="hidden lg:flex items-center gap-12">
                {/* Left: phone mockup */}
                <div className="flex-shrink-0">
                  <APKPhone />
                </div>
                {/* Center: copy */}
                <div className="flex-1 space-y-5">
                  <div>
                    <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-1.5 mb-4">
                      <FaAndroid className="text-white text-sm" />
                      <span className="text-white text-xs font-semibold">Android App • Free Download • Official</span>
                    </div>
                    <h3 className="text-white font-black text-3xl xl:text-4xl leading-tight">
                      Take Tap-Watch<br />With You.
                    </h3>
                    <p className="text-blue-200 mt-3 text-base leading-relaxed max-w-md">
                      Download the Tap-Watch Android app and report incidents, receive alerts,
                      and stay connected with your community wherever you are.
                    </p>
                  </div>
                  {/* Feature list */}
                  <div className="grid grid-cols-2 gap-2">
                    {['Report incidents on the go','Receive real-time alerts','One-tap SOS emergency','Live incident map','Offline-capable','Free & official'].map(f=>(
                      <div key={f} className="flex items-center gap-2 text-sm text-blue-100">
                        <FaCheckCircle className="text-green-400 flex-shrink-0 text-xs" />
                        {f}
                      </div>
                    ))}
                  </div>
                  {/* Download button */}
                  <button onClick={downloadAPK}
                    className="inline-flex items-center gap-3 bg-white text-blue-700 font-black px-8 py-4 rounded-2xl text-base hover:bg-blue-50 transition-all shadow-xl hover:scale-105 active:scale-95 hover:shadow-white/20">
                    <FaAndroid className="text-xl text-blue-600" />
                    <div className="text-left">
                      <div className="text-[10px] text-blue-500 font-semibold leading-none">DOWNLOAD FREE</div>
                      <div className="text-blue-700 font-black text-base leading-none mt-0.5">Download Tap-Watch APK</div>
                    </div>
                    <FaDownload className="text-blue-500 text-sm ml-1" />
                  </button>
                  <p className="text-blue-300 text-xs">Android App • Free Download • Tap-Watch Official App</p>
                </div>
                {/* Right: QR code */}
                <div className="flex-shrink-0 text-center">
                  <div className="w-36 h-36 bg-white rounded-2xl flex items-center justify-center mb-2 shadow-lg p-2">
                    <QRCodeSVG
                      value={APK_QR_URL}
                      size={112}
                      bgColor="#ffffff"
                      fgColor="#1d4ed8"
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <p className="text-blue-200 text-[11px] font-medium">Scan to Download</p>
                  <p className="text-blue-300 text-[10px] mt-0.5">Tap-Watch APK</p>
                </div>
              </div>

              {/* Mobile layout */}
              <div className="lg:hidden text-center space-y-5">
                <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-1.5">
                  <FaAndroid className="text-white text-sm" />
                  <span className="text-white text-xs font-semibold">Android App • Free</span>
                </div>
                <h3 className="text-white font-black text-2xl">Take Tap-Watch With You.</h3>
                <p className="text-blue-200 text-sm leading-relaxed">Download the Android app and stay connected with your community.</p>
                <APKPhone />
                <button onClick={downloadAPK} className="flex items-center justify-center gap-2 w-full bg-white text-blue-700 font-black py-4 rounded-2xl text-base hover:bg-blue-50 transition-all">
                  <FaAndroid className="text-xl" /> Download Tap-Watch APK
                </button>
                {/* QR for mobile users who share the screen */}
                <div className="flex flex-col items-center gap-1 pt-2">
                  <div className="w-28 h-28 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-lg">
                    <QRCodeSVG
                      value={APK_QR_URL}
                      size={96}
                      bgColor="#ffffff"
                      fgColor="#1d4ed8"
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <p className="text-blue-300 text-[11px]">Scan to Download</p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Final CTA */}
        <Reveal>
          <div className="text-center bg-gradient-to-b from-blue-50 to-white rounded-3xl border border-blue-100 p-10 lg:p-14 shadow-sm">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-200">
              <FaShieldAlt className="text-white text-2xl" />
            </div>
            <h3 className="text-2xl lg:text-3xl font-black text-gray-900 mb-3">
              Help Keep East Tapinac Safe.
            </h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto text-base leading-relaxed">
              Every report counts. Every alert helps. Together, we build a safer community.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <button onClick={() => navigate('/signup')}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3.5 rounded-xl shadow-lg hover:scale-105 transition-all">
                Get Started <FaArrowRight className="text-sm" />
              </button>
              <button onClick={downloadAPK}
                className="flex items-center gap-2 font-bold px-8 py-3.5 rounded-xl transition-all bg-gray-900 hover:bg-gray-800 text-white hover:scale-105 shadow-lg">
                <FaAndroid /> Download APK
              </button>
              <button onClick={() => navigate('/resident-map')}
                className="flex items-center gap-2 bg-white border-2 border-blue-200 text-blue-700 hover:border-blue-500 font-bold px-8 py-3.5 rounded-xl hover:scale-105 transition-all shadow-sm">
                <FaMap /> Explore Incident Map
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ── Footer ─────────────────────────────────────────────────────────────── */
function Footer() {
  const navigate = useNavigate()
  const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior:'smooth' })
  const year = new Date().getFullYear()

  return (
    <footer className="bg-gray-950 text-gray-400 pt-14 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-10 border-b border-gray-800">

          {/* Brand col */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <img src="/Tapinac.logo.jpg" alt="logo" className="w-10 h-10 rounded-full object-cover shadow" />
              <div>
                <p className="font-extrabold text-white text-lg leading-none">
                  <span className="text-white">Tap</span><span className="text-blue-500">-Watch</span>
                </p>
                <p className="text-[10px] text-gray-500 leading-none mt-0.5">Barangay East Tapinac</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
              Barangay East Tapinac Community Emergency Monitoring System.
              Empowering residents to build a safer community together.
            </p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 text-xs font-semibold">System Online</span>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4">Navigation</h4>
            <ul className="space-y-2.5 text-sm">
              {[['Home','hero'],['Features','features'],['How It Works','features'],['Monitoring','monitoring'],['Get Started','getstarted']].map(([l,id])=>(
                <li key={l}>
                  <button onClick={() => scrollTo(id)} className="hover:text-blue-400 transition-colors text-left">{l}</button>
                </li>
              ))}
              <li><button onClick={() => navigate('/admin-contacts')} className="hover:text-blue-400 transition-colors">Emergency Contacts</button></li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4">Account</h4>
            <ul className="space-y-2.5 text-sm">
              <li><button onClick={() => navigate('/login')} className="hover:text-blue-400 transition-colors">Log In</button></li>
              <li><button onClick={() => navigate('/signup')} className="hover:text-blue-400 transition-colors">Sign Up</button></li>
              <li><button onClick={() => navigate('/verification')} className="hover:text-blue-400 transition-colors">Verify Account</button></li>
              <li><button onClick={() => navigate('/admin-login')} className="hover:text-gray-300 transition-colors text-gray-600 text-xs">Admin Portal</button></li>
            </ul>
            <h4 className="text-white font-bold text-sm mt-6 mb-4">Legal</h4>
            <ul className="space-y-2.5 text-sm">
              <li><button className="hover:text-blue-400 transition-colors">Terms of Use</button></li>
              <li><button className="hover:text-blue-400 transition-colors">Privacy Policy</button></li>
            </ul>
          </div>

          {/* Mobile App */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4">Mobile App</h4>
            <div className="space-y-3">
              <button onClick={downloadAPK}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all w-full bg-blue-600 border-blue-500 text-white hover:bg-blue-700">
                <FaAndroid className="text-base" />
                <div className="text-left">
                  <p className="text-[9px] opacity-70 leading-none">TAP TO DOWNLOAD</p>
                  <p className="text-xs leading-none mt-0.5">Android APK</p>
                </div>
              </button>
              <p className="text-[10px] text-gray-600 leading-relaxed">
                Free for Android devices.<br />Official Tap-Watch release.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-600">
          <p>© {year} Tap-Watch — Barangay East Tapinac. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
            Community Emergency Monitoring System
          </p>
        </div>
      </div>
    </footer>
  )
}

/* ════════════════════════════════════════════════════════════════════
   ROOT EXPORT — Mobile/tablet uses the existing splash-style page.
   Desktop gets the full 4-scroll experience.
═══════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate()
  const SECTION_IDS = ['hero','features','monitoring','getstarted']
  const active = useActiveSection(SECTION_IDS)

  return (
    <>
      {/* ────────────────────────────────────────────────
          MOBILE / TABLET  (< 1024px)
          Full scrollable mobile landing page
      ──────────────────────────────────────────────── */}
      <div className="lg:hidden flex flex-col min-h-screen">

        {/* ── Mobile sticky top bar ── */}
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2.5">
              <img src="/Tapinac.logo.jpg" alt="Tap-Watch" className="w-8 h-8 rounded-full object-cover" />
              <span className="font-extrabold text-lg leading-none">
                <span className="text-gray-900">Tap</span>
                <span className="text-blue-600">-Watch</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/login')}
                className="px-4 py-1.5 text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg">
                Log In
              </button>
              <button onClick={() => navigate('/signup')}
                className="px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg">
                Sign Up
              </button>
            </div>
          </div>
        </div>

        {/* ── Hero ── */}
        <div className="relative overflow-hidden flex-shrink-0"
          style={{ minHeight: '100svh',
            backgroundImage: "url('/background.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center' }}>
          {/* overlay */}
          <div className="absolute inset-0"
            style={{background:'linear-gradient(160deg,rgba(0,0,0,0.45) 0%,rgba(0,0,0,0.2) 60%,rgba(30,64,175,0.5) 100%)'}} />

          <div className="relative z-10 flex flex-col items-center text-center px-5 pt-10 pb-12 gap-5">
            {/* Live badge */}
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur border border-white/30 rounded-full px-4 py-1.5 mt-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-white text-xs font-semibold">Barangay East Tapinac • Live Monitoring</span>
            </div>

            {/* Headline */}
            <h1 className="text-[2.1rem] font-black text-white leading-tight drop-shadow-lg">
              Together, We Keep{' '}
              <span className="text-blue-300">East Tapinac</span> Safe.
            </h1>

            <p className="text-white/85 text-sm leading-relaxed max-w-sm">
              Tap-Watch is a community emergency monitoring system. Report incidents,
              receive real-time alerts, and stay connected with your barangay.
            </p>

            {/* Download APK — primary CTA */}
            <div className="w-full max-w-sm space-y-3">
              <button onClick={downloadAPK}
                className="w-full flex items-center justify-center gap-3 bg-white text-blue-700 font-black py-4 px-5 rounded-2xl text-base shadow-xl shadow-blue-900/30 active:scale-95 transition-transform">
                <FaAndroid className="text-xl text-blue-600" />
                <span>Download Tap-Watch APK</span>
                <FaDownload className="text-blue-400 text-sm" />
              </button>
            </div>

            {/* Phone mockup */}
            <div className="scale-[0.82] origin-top mt-2">
              <DashboardPhone />
            </div>
          </div>
        </div>

        {/* ── Features ── */}
        <div className="bg-white px-5 py-10 space-y-4">
          <h2 className="text-xl font-black text-gray-900 text-center mb-6">
            What you can do with <span className="text-blue-600">Tap-Watch</span>
          </h2>
          {[
            [FaShieldAlt, 'Report Incidents', 'Quickly report crime, accident, fire, flood, and more.', 'bg-blue-600'],
            [FaMapMarkedAlt, 'Live Incident Map', 'View real-time incidents around East Tapinac.', 'bg-indigo-600'],
            [FaExclamationTriangle, 'SOS Emergency', 'Send an SOS alert with your location instantly.', 'bg-red-500'],
            [FaBell, 'Community Alerts', 'Stay informed with the latest barangay updates.', 'bg-amber-500'],
            [FaUserCheck, 'Account Verification', 'Get verified to build community trust.', 'bg-green-600'],
            [FaRobot, 'AI Classification', 'Smart incident detection and prioritization.', 'bg-purple-600'],
          ].map(([Icon, title, desc, bg]) => (
            <div key={title} className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className="text-white text-base" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{title}</p>
                <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Download / Get Started ── */}
        <div id="mobile-getstarted"
          className="px-5 py-10"
          style={{background:'linear-gradient(135deg,#1d4ed8,#2563eb,#1e40af)'}}>
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-1.5 mb-4">
              <FaAndroid className="text-white text-sm" />
              <span className="text-white text-xs font-semibold">Android App • Free • Official</span>
            </span>
            <h2 className="text-2xl font-black text-white leading-tight mb-3">
              Take Tap-Watch<br />With You.
            </h2>
            <p className="text-blue-200 text-sm leading-relaxed">
              Download the Android app and report incidents, receive alerts,
              and stay connected wherever you are.
            </p>
          </div>

          {/* Feature list */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            {['Report on the go','Real-time alerts','One-tap SOS','Live map','Offline-capable','Free & official'].map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-blue-100">
                <FaCheckCircle className="text-green-400 flex-shrink-0 text-xs" />
                {f}
              </div>
            ))}
          </div>

          {/* QR + Download */}
          <div className="flex flex-col items-center gap-4">
            <button onClick={downloadAPK}
              className="w-full flex items-center justify-center gap-3 bg-white text-blue-700 font-black py-4 rounded-2xl text-base shadow-xl active:scale-95 transition-transform">
              <FaAndroid className="text-xl text-blue-600" />
              Download Tap-Watch APK
              <FaDownload className="text-blue-400 text-sm" />
            </button>
            {/* QR code */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-28 h-28 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-lg">
                <QRCodeSVG value={APK_QR_URL} size={96} bgColor="#ffffff" fgColor="#1d4ed8" level="M" includeMargin={false} />
              </div>
              <p className="text-blue-300 text-xs">Scan to Download</p>
            </div>
          </div>

          <p className="text-blue-300 text-xs text-center mt-4">
            Android App • Free Download • Tap-Watch Official App
          </p>
        </div>

        {/* ── Footer ── */}
        <div className="bg-gray-900 px-5 py-8 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/Tapinac.logo.jpg" alt="Tap-Watch" className="w-8 h-8 rounded-full" />
            <span className="text-white font-extrabold text-lg">
              <span>Tap</span><span className="text-blue-400">-Watch</span>
            </span>
          </div>
          <p className="text-gray-400 text-xs leading-relaxed">
            Community Emergency Monitoring System<br />Barangay East Tapinac, Olongapo City
          </p>
          <div className="flex justify-center gap-4 pt-2">
            <button onClick={() => navigate('/login')} className="text-gray-400 text-xs hover:text-white">Log In</button>
            <button onClick={() => navigate('/signup')} className="text-gray-400 text-xs hover:text-white">Sign Up</button>
            <button onClick={() => navigate('/admin-login')} className="text-gray-400 text-xs hover:text-white">Admin</button>
          </div>
          <p className="text-gray-600 text-xs pt-2">© {new Date().getFullYear()} Tap-Watch. All rights reserved.</p>
        </div>
      </div>

      {/* ────────────────────────────────────────────────
          DESKTOP  (lg: ≥ 1024px)
          Full 4-scroll landing page
      ──────────────────────────────────────────────── */}
      <div className="hidden lg:block">
        <style>{`
          html { scroll-behavior: smooth; }
          @keyframes float {
            0%,100% { transform: translateY(0px); }
            50%      { transform: translateY(-12px); }
          }
          .animate-float { animation: float 4s ease-in-out infinite; }
          @keyframes ping-slow {
            0%,100% { transform: scale(1); opacity: 0.6; }
            50%      { transform: scale(1.15); opacity: 0; }
          }
        `}</style>
        <Navbar active={active} />
        <main>
          <HeroSection />
          <FeaturesSection />
          <MonitoringSection />
          <GetStartedSection />
        </main>
        <Footer />
      </div>
    </>
  )
}
