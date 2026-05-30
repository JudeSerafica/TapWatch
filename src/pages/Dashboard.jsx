import { useNavigate } from 'react-router-dom'
import { Clock, X, AlertCircle, Shield, Phone, Mail, User } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import ResidentSidebar from '../components/ResidentSidebar'
import MobileBottomNav from '../components/MobileBottomNav'
import TopBar from '../components/TopBar'
import StatusBadge from '../components/StatusBadge'
import IncidentIcon from '../components/IncidentIcon'

import { useAuth } from '../context/useAuth'
import { getIncidents, subscribeToIncidents } from '../lib/database'
import { supabase } from '../lib/supabase'

import {
  FaMapPin,
  FaMapMarkedAlt,
  FaBell,
} from 'react-icons/fa'

import { MdWavingHand } from 'react-icons/md'
import { BsFillTelephoneFill } from 'react-icons/bs'

/* ─────────────────────────────────────────────
   FIX LEAFLET DEFAULT ICON ISSUE
───────────────────────────────────────────── */

delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',

  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',

  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */

const typeColors = {
  crime: '#9333ea',
  accident: '#f97316',
  fire: '#ef4444',
  flood: '#3b82f6',
  disturbance: '#eab308',
}

/* ─────────────────────────────────────────────
   CREATE COLORED MARKER ICON
───────────────────────────────────────────── */

function createIcon(type) {
  const color = typeColors[type] || '#6b7280'

  return L.divIcon({
    className: 'custom-marker',

    html: `
      <div style="
        width:36px;
        height:45px;
        display:flex;
        align-items:center;
        justify-content:center;
        animation:pulse 2s infinite;
      ">
        <svg width="36" height="45" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C7.58 0 4 3.58 4 8C4 14 12 24 12 24C12 24 20 14 20 8C20 3.58 16.42 0 12 0Z" fill="${color}" stroke="white" stroke-width="1.5"/>
          <circle cx="12" cy="8" r="3" fill="white"/>
        </svg>
      </div>

      <style>
        @keyframes pulse{
          0%,100%{transform:scale(1)}
          50%{transform:scale(1.1)}
        }
      </style>
    `,

    iconSize: [36, 45],
    iconAnchor: [18, 45],
    popupAnchor: [0, -45],
  })
}

/* ─────────────────────────────────────────────
   FLY TO INCIDENT
───────────────────────────────────────────── */

function FlyToIncident({ incident }) {
  const map = useMap()
  const flew = useRef(false)

  useEffect(() => {
    if (
      !flew.current &&
      incident?.latitude &&
      incident?.longitude
    ) {
      map.flyTo(
        [incident.latitude, incident.longitude],
        18,
        { duration: 1.2 }
      )

      flew.current = true
    }
  }, [incident, map])

  return null
}

/* ─────────────────────────────────────────────
   FIX MAP SIZE INSIDE MODAL
───────────────────────────────────────────── */

function ResizeMap() {
  const map = useMap()

  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize()
    }, 300)
  }, [map])

  return null
}

/* ─────────────────────────────────────────────
   INCIDENT MAP MODAL
───────────────────────────────────────────── */

function IncidentMapModal({ incident, onClose }) {

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handler)

    return () => {
      window.removeEventListener('keydown', handler)
    }
  }, [onClose])

  if (!incident) return null

  const typeColor =
    typeColors[incident.type] || '#6b7280'

  const formattedDate = new Date(
    incident.created_at
  ).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  const hasCoords =
    incident.latitude &&
    incident.longitude

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

        {/* HEADER */}

        <div
          className="px-5 py-4 flex items-start justify-between gap-3"
          style={{ background: typeColor }}
        >
          <div className="text-white">

            <div className="flex items-center gap-2 mb-0.5">

              <IncidentIcon
                type={incident.type}
                size={16}
                className="text-white"
              />

              <span className="font-bold text-base capitalize">
                {incident.type} Incident
              </span>

              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize"
                style={{
                  background:
                    'rgba(255,255,255,0.25)',
                  color: 'white',
                }}
              >
                {incident.status}
              </span>
            </div>

            <p className="text-xs opacity-80 flex items-center gap-1">
              <FaMapPin size={9} />

              {incident.location ||
                'Unknown location'}

              <span className="mx-1">·</span>

              <Clock size={9} />

              {formattedDate}
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* MAP */}

        <div
          className="relative"
          style={{
            height: '320px',
            width: '100%',
          }}
        >
          {hasCoords ? (
            <MapContainer
              center={[
                Number(incident.latitude),
                Number(incident.longitude),
              ]}
              zoom={17}
              scrollWheelZoom={true}
              style={{
                height: '100%',
                width: '100%',
              }}
              className="z-0"
            >
              <ResizeMap />

              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <FlyToIncident incident={incident} />

              <Marker
                position={[
                  Number(incident.latitude),
                  Number(incident.longitude),
                ]}
                icon={createIcon(
                  incident.type
                )}
              >
                <Popup>
                  <div className="text-xs font-semibold capitalize">
                    {incident.type} Incident
                  </div>

                  <div className="text-xs text-gray-500 mt-0.5">
                    {incident.location}
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm bg-gray-50">
              <div className="text-center">
                <FaMapPin className="mx-auto mb-2 text-2xl text-gray-300" />

                <p>No location data available</p>
              </div>
            </div>
          )}
        </div>

        {/* DESCRIPTION */}

        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Description
          </p>

          <p className="text-sm text-gray-700 leading-relaxed">
            {incident.description ||
              'No description provided.'}
          </p>

        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   SOS PANIC BUTTON MODAL
───────────────────────────────────────────── */

function SOSPanicModal({ isOpen, onClose, profile }) {
  const [countdown, setCountdown] = useState(5)
  const [isActivated, setIsActivated] = useState(false)
  const [location, setLocation] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)  // ← BAGO

  useEffect(() => {
    if (isOpen && !isActivated) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            })
          },
          (error) => { console.error('Location error:', error) }
        )
      }
    }
  }, [isOpen, isActivated])

  useEffect(() => {
    if (isActivated && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (isActivated && countdown === 0) {
      sendSOSAlert()
    }
  }, [isActivated, countdown])

  const sendSOSAlert = async () => {
    const sosIncident = {
      type: 'crime',
      description: `🚨 EMERGENCY SOS ALERT from ${profile?.full_name || 'User'}. Immediate assistance needed!`,
      location: location ? `${location.latitude}, ${location.longitude}` : 'Location unavailable',
      latitude: location?.latitude,
      longitude: location?.longitude,
      status: 'pending',
      user_id: profile?.id,
      reporter_name: profile?.full_name,
      created_at: new Date().toISOString(),
      is_sos: true
    }
    console.log('SOS Alert Sent:', sosIncident)
    setIsActivated(false)
    setShowSuccess(true)  // ← show success modal instead of alert()
  }

  const handleActivate = () => {
    setIsActivated(true)
  }

  const handleCancel = () => {
    setIsActivated(false)
    setCountdown(5)
    onClose()
  }

  const handleCloseSuccess = () => {
    setShowSuccess(false)
    setCountdown(5)
    onClose()
  }

  if (!isOpen) return null

  // ── SUCCESS MODAL ──
  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <style>{`
          @keyframes sos-fadeInScale {
            0% { opacity: 0; transform: scale(0.85); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes sos-ripple {
            0% { transform: scale(0.8); opacity: 1; }
            100% { transform: scale(2.6); opacity: 0; }
          }
          @keyframes sos-checkDraw {
            0% { stroke-dashoffset: 100; }
            100% { stroke-dashoffset: 0; }
          }
          @keyframes sos-fadeInUp {
            0% { opacity: 0; transform: translateY(18px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes sos-slideIn {
            0% { opacity: 0; transform: translateX(-14px); }
            100% { opacity: 1; transform: translateX(0); }
          }
          .sos-wrap { animation: sos-fadeInScale 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
          .sos-r1 { animation: sos-ripple 1.8s ease-out infinite; }
          .sos-r2 { animation: sos-ripple 1.8s ease-out 0.6s infinite; }
          .sos-r3 { animation: sos-ripple 1.8s ease-out 1.2s infinite; }
          .sos-check { stroke-dasharray: 100; stroke-dashoffset: 100; animation: sos-checkDraw 0.55s ease forwards 0.45s; }
          .sos-t1 { animation: sos-fadeInUp 0.45s ease forwards 0.75s; opacity: 0; }
          .sos-t2 { animation: sos-fadeInUp 0.45s ease forwards 0.95s; opacity: 0; }
          .sos-i1 { animation: sos-slideIn 0.4s ease forwards 1.05s; opacity: 0; }
          .sos-i2 { animation: sos-slideIn 0.4s ease forwards 1.2s; opacity: 0; }
          .sos-i3 { animation: sos-slideIn 0.4s ease forwards 1.35s; opacity: 0; }
          .sos-f1 { animation: sos-fadeInUp 0.4s ease forwards 1.55s; opacity: 0; }
          .sos-f2 { animation: sos-fadeInUp 0.4s ease forwards 1.75s; opacity: 0; }
        `}</style>

        <div className="sos-wrap bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

          {/* TOP — red section with ripple + checkmark */}
          <div className="bg-red-600 pt-10 pb-8 px-8 text-center relative">
            <div className="relative w-32 h-32 mx-auto mb-5">
              <div className="sos-r1 absolute inset-0 rounded-full border-2 border-white/50" />
              <div className="sos-r2 absolute inset-0 rounded-full border-2 border-white/35" />
              <div className="sos-r3 absolute inset-0 rounded-full border-2 border-white/20" />
              <div className="absolute inset-3 bg-white/20 rounded-full flex items-center justify-center">
                <svg width="54" height="54" viewBox="0 0 54 54" fill="none">
                  <path
                    className="sos-check"
                    d="M11 28L22 39L43 17"
                    stroke="white"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            <h2 className="sos-t1 text-white text-2xl font-bold mb-1">SOS Alert Sent!</h2>
            <p className="sos-t2 text-white/80 text-sm">Emergency services have been notified</p>
          </div>

          {/* BOTTOM — checklist + footer */}
          <div className="px-6 pt-5 pb-6">
            <div className="bg-red-50 rounded-xl p-4 mb-4 space-y-2.5">
              <div className="sos-i1 flex items-center gap-3 text-gray-800 text-sm">
                <span className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-white text-[11px] flex-shrink-0">✓</span>
                Barangay officials notified
              </div>
              <div className="sos-i2 flex items-center gap-3 text-gray-800 text-sm">
                <span className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-white text-[11px] flex-shrink-0">✓</span>
                Your location has been shared
              </div>
              <div className="sos-i3 flex items-center gap-3 text-gray-800 text-sm">
                <span className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-white text-[11px] flex-shrink-0">✓</span>
                Emergency services alerted
              </div>
            </div>

            <p className="sos-f1 text-gray-600 text-xs text-center mb-4 leading-relaxed">
              Help is on the way! Stay safe and stay on the line if possible.
            </p>

            <button
              onClick={handleCloseSuccess}
              className="sos-f2 w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-base transition"
            >
              OK
            </button>
          </div>

        </div>
      </div>
    )
  }

  // ── ORIGINAL MODAL (unchanged) ──
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {!isActivated ? (
          <>
            <div className="p-8 text-center">
              <div className="w-32 h-32 mx-auto mb-6 bg-red-600 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-6xl">🚨</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Emergency SOS
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                This will immediately alert emergency services and share your location.
                Use only in life-threatening situations.
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleActivate}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg transition"
                >
                  ACTIVATE SOS
                </button>
                <button
                  onClick={handleCancel}
                  className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="p-8 text-center bg-red-600 text-white">
              <div className="w-40 h-40 mx-auto mb-6 bg-white rounded-full flex items-center justify-center">
                <span className="text-7xl font-bold text-red-600 animate-pulse">
                  {countdown}
                </span>
              </div>
              <h2 className="text-2xl font-bold mb-3">
                Sending SOS Alert...
              </h2>
              <p className="text-sm opacity-90 mb-6">
                Emergency services will be notified in {countdown} seconds
              </p>
              <button
                onClick={handleCancel}
                className="w-full py-3 bg-white text-red-600 rounded-xl font-bold transition hover:bg-gray-100"
              >
                CANCEL
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   COMMUNITY ALERTS MODAL
───────────────────────────────────────────── */

function CommunityAlertsModal({ isOpen, onClose, incidents }) {
  const [filterSeverity, setFilterSeverity] = useState('All')
  const [filterType, setFilterType] = useState('All')

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handler)
    }
    return () => {
      window.removeEventListener('keydown', handler)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Get incidents from last 48 hours
  const now = new Date()
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)
  
  const recentIncidents = incidents.filter(inc => {
    const incidentDate = new Date(inc.created_at)
    return incidentDate >= twoDaysAgo
  })

  // Categorize by severity
  const getSeverity = (incident) => {
    if (incident.status === 'pending' && (incident.type === 'fire' || incident.type === 'crime')) {
      return 'critical'
    }
    if (incident.status === 'responding') {
      return 'warning'
    }
    if (incident.status === 'resolved') {
      return 'resolved'
    }
    return 'info'
  }

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'critical':
        return { label: 'Critical', color: 'bg-red-100 text-red-700 border-red-300', icon: '🚨' }
      case 'warning':
        return { label: 'Warning', color: 'bg-orange-100 text-orange-700 border-orange-300', icon: '⚠️' }
      case 'resolved':
        return { label: 'Resolved', color: 'bg-green-100 text-green-700 border-green-300', icon: '✅' }
      default:
        return { label: 'Info', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: '📢' }
    }
  }

  const getTimeAgo = (date) => {
    const now = new Date()
    const incidentDate = new Date(date)
    const diffMs = now - incidentDate
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${Math.floor(diffHours / 24)}d ago`
  }

  const handleShare = (incident) => {
    const text = `🚨 Community Alert: ${incident.type.toUpperCase()} incident at ${incident.location}. Status: ${incident.status}. Stay safe!`
    
    if (navigator.share) {
      navigator.share({
        title: 'Community Alert',
        text: text,
      }).catch(() => {})
    } else {
      navigator.clipboard.writeText(text)
      alert('Alert copied to clipboard!')
    }
  }

  // Filter incidents
  const filteredIncidents = recentIncidents.filter(inc => {
    const severity = getSeverity(inc)
    if (filterSeverity !== 'All' && severity !== filterSeverity.toLowerCase()) return false
    if (filterType !== 'All' && inc.type !== filterType.toLowerCase()) return false
    return true
  })

  const criticalCount = recentIncidents.filter(i => getSeverity(i) === 'critical').length
  const warningCount = recentIncidents.filter(i => getSeverity(i) === 'warning').length
  const resolvedCount = recentIncidents.filter(i => getSeverity(i) === 'resolved').length

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="px-5 py-4 flex items-start justify-between gap-3 bg-gradient-to-r from-yellow-500 to-orange-500">
          <div className="text-white">
            <div className="flex items-center gap-2 mb-0.5">
              <FaBell className="text-xl" />
              <span className="font-bold text-lg">Community Alerts</span>
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-semibold">
                Last 48 hours
              </span>
            </div>
            <p className="text-xs opacity-90">
              Real-time updates from your community
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* STATS */}
        <div className="px-5 py-3 bg-gray-50 border-b grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-xl font-bold text-red-600">{criticalCount}</div>
            <div className="text-xs text-gray-600">Critical</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-orange-600">{warningCount}</div>
            <div className="text-xs text-gray-600">Warnings</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">{resolvedCount}</div>
            <div className="text-xs text-gray-600">Resolved</div>
          </div>
        </div>

        {/* FILTERS */}
        <div className="px-5 py-3 border-b bg-white flex gap-2 flex-wrap">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            <option>All</option>
            <option>Critical</option>
            <option>Warning</option>
            <option>Resolved</option>
            <option>Info</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            <option>All</option>
            <option>Crime</option>
            <option>Fire</option>
            <option>Flood</option>
            <option>Accident</option>
            <option>Disturbance</option>
          </select>
        </div>

        {/* ALERTS LIST */}
        <div className="overflow-y-auto p-5 space-y-3 flex-1">
          {filteredIncidents.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FaBell className="mx-auto mb-3 text-4xl text-gray-300" />
              <p className="text-sm">No alerts found</p>
            </div>
          ) : (
            filteredIncidents
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
              .map((incident) => {
                const severity = getSeverity(incident)
                const badge = getSeverityBadge(severity)
                
                return (
                  <div
                    key={incident.id}
                    className="border rounded-xl p-4 hover:border-gray-400 transition"
                  >
                    <div className="flex items-start gap-3">
                      <IncidentIcon type={incident.type} size={20} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h3 className="font-bold text-gray-900 text-sm capitalize">
                              {incident.type} Incident
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {getTimeAgo(incident.created_at)}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${badge.color} flex items-center gap-1`}>
                            <span>{badge.icon}</span>
                            {badge.label}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-2">
                          {incident.description}
                        </p>
                        
                        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                          <span className="flex items-center gap-1">
                            <FaMapPin className="text-red-500" size={10} />
                            {incident.location || 'Unknown location'}
                          </span>
                          <StatusBadge status={incident.status} />
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              onClose()
                              // Navigate to map with this incident
                              window.location.href = `/resident-map?incident=${incident.id}`
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
                          >
                            View on Map
                          </button>
                          <button
                            onClick={() => handleShare(incident)}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition"
                          >
                            Share
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
          )}
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 border-t bg-gray-50 text-center">
          <p className="text-xs text-gray-600">
            💡 Stay informed and stay safe. Report incidents to help your community.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   EMERGENCY HOTLINE MODAL
───────────────────────────────────────────── */

function EmergencyHotlineModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('emergency') // 'emergency' or 'officials'
  const [barangayContacts, setBarangayContacts] = useState([])
  const [loadingContacts, setLoadingContacts] = useState(true)

  // Emergency hotline numbers
  const emergencyNumbers = [
    {
      id: 1,
      name: 'National Emergency Hotline',
      number: '911',
      description: 'Police, Fire, Medical Emergency',
      icon: '🚨',
      color: 'red'
    },
    {
      id: 2,
      name: 'PNP Hotline',
      number: '117',
      description: 'Philippine National Police',
      icon: '👮',
      color: 'blue'
    },
    {
      id: 3,
      name: 'NDRRMC',
      number: '(02) 8911-1406',
      description: 'Disaster Response',
      icon: '🆘',
      color: 'orange'
    },
    {
      id: 4,
      name: 'Red Cross',
      number: '143',
      description: 'Emergency Medical Services',
      icon: '🏥',
      color: 'red'
    },
    {
      id: 5,
      name: 'BFP Fire Emergency',
      number: '(02) 8426-0219',
      description: 'Bureau of Fire Protection',
      icon: '🚒',
      color: 'orange'
    },
    {
      id: 6,
      name: 'Coast Guard',
      number: '(02) 8527-8481',
      description: 'Maritime Emergency',
      icon: '⚓',
      color: 'blue'
    }
  ]

  // Fetch barangay officials from database
  useEffect(() => {
    if (isOpen) {
      fetchBarangayContacts()
    }
  }, [isOpen])

  const fetchBarangayContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (error) throw error
      setBarangayContacts(data || [])
    } catch (error) {
      console.error('Error fetching barangay contacts:', error)
    } finally {
      setLoadingContacts(false)
    }
  }

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handler)
    }
    return () => {
      window.removeEventListener('keydown', handler)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="px-5 py-4 flex items-start justify-between gap-3 bg-red-600">
          <div className="text-white">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-2xl">🚨</span>
              <span className="font-bold text-lg">Emergency Contacts</span>
            </div>
            <p className="text-xs opacity-90">
              Quick access to emergency services
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* TABS */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setActiveTab('emergency')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition ${
              activeTab === 'emergency'
                ? 'text-red-600 border-b-2 border-red-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <AlertCircle size={18} />
              Emergency Hotlines
            </div>
          </button>
          <button
            onClick={() => setActiveTab('officials')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition ${
              activeTab === 'officials'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Shield size={18} />
              Barangay Officials
            </div>
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Emergency Numbers Tab */}
          {activeTab === 'emergency' && (
            <div className="space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-800 font-medium">
                  🚨 For life-threatening emergencies, call 911 immediately
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {emergencyNumbers.map((emergency) => (
                  <a
                    key={emergency.id}
                    href={`tel:${emergency.number}`}
                    className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-red-300 hover:shadow-md transition group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{emergency.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 text-sm mb-1">
                          {emergency.name}
                        </h4>
                        <p className="text-xs text-gray-600 mb-2">
                          {emergency.description}
                        </p>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                          <Phone size={14} className="text-red-600" />
                          <span className="text-sm font-bold text-red-600">
                            {emergency.number}
                          </span>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Barangay Officials Tab */}
          {activeTab === 'officials' && (
            <div>
              {loadingContacts ? (
                <div className="text-center py-12 text-gray-500">
                  Loading contacts...
                </div>
              ) : barangayContacts.length === 0 ? (
                <div className="text-center py-12">
                  <User size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No barangay officials available</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {barangayContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                    >
                      <div className="flex flex-col items-center text-center mb-3">
                        {contact.photo_url ? (
                          <img
                            src={contact.photo_url}
                            alt={contact.name}
                            className="w-20 h-20 rounded-full object-cover mb-3 border-2 border-gray-200"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-3 border-2 border-gray-200">
                            <User size={32} className="text-blue-600" />
                          </div>
                        )}
                        <h4 className="font-bold text-gray-900">{contact.name}</h4>
                        <p className="text-sm text-blue-600 font-medium">{contact.position}</p>
                      </div>

                      <div className="space-y-2">
                        <a
                          href={`tel:${contact.phone}`}
                          className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-green-50 hover:border-green-300 transition"
                        >
                          <Phone size={16} className="text-green-600" />
                          {contact.phone}
                        </a>
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-blue-50 hover:border-blue-300 transition"
                          >
                            <Mail size={16} className="text-blue-600" />
                            <span className="truncate">{contact.email}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-5 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   MAIN DASHBOARD
───────────────────────────────────────────── */

export default function Dashboard() {

  const navigate = useNavigate()

  const { profile } = useAuth()

  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)

  const [myReports, setMyReports] =
    useState({
      pending: 0,
      responding: 0,
      resolved: 0,
    })

  const [selectedIncident, setSelectedIncident] =
    useState(null)

  const [emergencyModalOpen, setEmergencyModalOpen] =
    useState(false)

  const [alertsModalOpen, setAlertsModalOpen] =
    useState(false)

  const [sosModalOpen, setSOSModalOpen] =
    useState(false)

  const today = new Date().toLocaleDateString(
    'en-US',
    {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }
  )

  /* LOAD INCIDENTS */

  useEffect(() => {

    const loadIncidents = async () => {

      const { data, error } =
        await getIncidents()

      if (error) {
        console.error(
          'Error fetching incidents:',
          error
        )
      } else {

        setIncidents(data || [])

        if (profile?.id) {

          const userIncidents =
            (data || []).filter(
              (i) => i.user_id === profile.id
            )

          setMyReports({
            pending:
              userIncidents.filter(
                (i) => i.status === 'pending'
              ).length,

            responding:
              userIncidents.filter(
                (i) => i.status === 'responding'
              ).length,

            resolved:
              userIncidents.filter(
                (i) => i.status === 'resolved'
              ).length,
          })
        }
      }

      setLoading(false)
    }

    loadIncidents()

    const subscription =
      subscribeToIncidents((payload) => {

        if (payload.eventType === 'INSERT') {

          setIncidents((prev) => [
            payload.new,
            ...prev,
          ])

        } else if (
          payload.eventType === 'UPDATE'
        ) {

          setIncidents((prev) =>
            prev.map((i) =>
              i.id === payload.new.id
                ? payload.new
                : i
            )
          )

          setSelectedIncident((prev) =>
            prev?.id === payload.new.id
              ? payload.new
              : prev
          )

        } else if (
          payload.eventType === 'DELETE'
        ) {

          setIncidents((prev) =>
            prev.filter(
              (i) => i.id !== payload.old.id
            )
          )

          setSelectedIncident((prev) =>
            prev?.id === payload.old.id
              ? null
              : prev
          )
        }
      })

    return () => subscription.unsubscribe()

  }, [profile?.id])

  /* UPDATE REPORTS */

  useEffect(() => {

    if (profile?.id) {

      const userIncidents =
        incidents.filter(
          (i) => i.user_id === profile.id
        )

      setMyReports({
        pending:
          userIncidents.filter(
            (i) => i.status === 'pending'
          ).length,

        responding:
          userIncidents.filter(
            (i) => i.status === 'responding'
          ).length,

        resolved:
          userIncidents.filter(
            (i) => i.status === 'resolved'
          ).length,
      })
    }

  }, [incidents, profile?.id])

  const recentAlerts = incidents
    .sort(
      (a, b) =>
        new Date(b.created_at) -
        new Date(a.created_at)
    )
    .slice(0, 5)

  return (
    <div className="flex min-h-screen bg-gray-50">

      <ResidentSidebar />

      <div className="flex-1 md:ml-60 pb-16 md:pb-0">

        <TopBar title="Dashboard">
          <button
            onClick={() => setSOSModalOpen(true)}
            className="relative flex items-center justify-center w-9 h-9 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold transition-all shadow-lg hover:shadow-xl animate-pulse-slow"
          >
            <style>{`
              @keyframes pulse-slow {
                0%, 100% {
                  opacity: 1;
                  transform: scale(1);
                }
                50% {
                  opacity: 0.7;
                  transform: scale(1.05);
                }
              }
              @keyframes ripple {
                0% {
                  transform: scale(1);
                  opacity: 0.6;
                }
                100% {
                  transform: scale(1.8);
                  opacity: 0;
                }
              }
              .animate-pulse-slow {
                animation: pulse-slow 2s ease-in-out infinite;
              }
              .sos-ripple {
                position: absolute;
                inset: 0;
                border-radius: 50%;
                border: 1px solid #dc2626;
                animation: ripple 2s ease-out infinite;
              }
              .sos-ripple:nth-child(2) {
                animation-delay: 0.7s;
              }
              .sos-ripple:nth-child(3) {
                animation-delay: 1.4s;
              }
            `}</style>
            <span className="sos-ripple"></span>
            <span className="sos-ripple"></span>
            <span className="sos-ripple"></span>
            <span className="relative z-10 text-xl">🚨</span>
          </button>
        </TopBar>

        <main className="p-4 md:p-8 space-y-6 md:space-y-8">

          {/* HERO */}

          <div className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">

            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>

            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -ml-8 -mb-8"></div>

            <div className="relative z-10">

              <div className="text-xs md:text-sm text-blue-100 mb-3 font-medium">
                {today}
              </div>

              <h2 className="text-2xl md:text-4xl font-bold mb-3">
                Hello, {profile?.full_name || 'Resident'}{' '}
                <MdWavingHand className="inline text-yellow-400" />
              </h2>

              <p className="text-sm md:text-base text-blue-100 mb-6 leading-relaxed">
                Help keep your barangay safe by reporting incidents you encounter.
              </p>

              <button
                onClick={() => navigate('/report')}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-50 transition-colors shadow-md"
              >
                <FaMapPin style={{ color: 'red' }} />
                Report an Incident
              </button>

            </div>
          </div>

          {/* QUICK ACTIONS */}

          <div>

            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              ⚡ Quick Actions
            </h3>

            <div className="grid grid-cols-2 gap-3 md:gap-4">

              <button
                onClick={() => navigate('/report')}
                className="bg-white border rounded-xl p-4 md:p-5 text-left hover:border-red-300 hover:bg-red-50 transition flex flex-col items-start"
              >
                <div className="text-2xl mb-2">
                  <FaMapPin style={{ color: 'red' }} />
                </div>

                <h3 className="font-semibold text-gray-900 text-sm">
                  Report Incident
                </h3>

                <p className="text-xs text-gray-600">
                  Submit a report
                </p>
              </button>

              <button
                onClick={() => navigate('/resident-map')}
                className="bg-white border rounded-xl p-4 md:p-5 text-left hover:border-blue-300 hover:bg-blue-50 transition flex flex-col items-start"
              >
                <div className="text-2xl mb-2">
                  <FaMapMarkedAlt style={{ color: 'blue' }} />
                </div>

                <h3 className="font-semibold text-gray-900 text-sm">
                  View Map
                </h3>

                <p className="text-xs text-gray-600">
                  See nearby incidents
                </p>
              </button>

              <button
                onClick={() => setAlertsModalOpen(true)}
                className="bg-white border rounded-xl p-4 md:p-5 text-left hover:border-green-300 hover:bg-green-50 transition flex flex-col items-start cursor-pointer"
              >
                <div className="text-2xl mb-2">
                  <FaBell className="text-yellow-500" />
                </div>

                <h3 className="font-semibold text-gray-900 text-sm">
                  Community Alerts
                </h3>

                <p className="text-xs text-gray-600">
                  Latest updates
                </p>
              </button>

              <button
                onClick={() => setEmergencyModalOpen(true)}
                className="bg-white border rounded-xl p-4 md:p-5 text-left hover:border-orange-300 hover:bg-orange-50 transition flex flex-col items-start cursor-pointer"
              >
                <div className="text-2xl mb-2">
                  <BsFillTelephoneFill className="text-red-400" />
                </div>

                <h3 className="font-semibold text-gray-900 text-sm">
                  Emergency Contacts
                </h3>

                <p className="text-xs text-gray-600">
                  Call for immediate help
                </p>
              </button>

            </div>
          </div>

          {/* MY REPORTS */}

          <div className="bg-white border rounded-xl">

            <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-200">

              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                📋 My Reports
              </h3>

            </div>

            <div className="grid grid-cols-3 gap-3 p-4 md:p-6">

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 text-center">

                <div className="text-2xl md:text-3xl font-bold text-blue-600">
                  {loading ? '...' : myReports.pending}
                </div>

                <div className="text-xs text-blue-700 mt-2 font-medium">
                  ⏱️ Pending
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 text-center">

                <div className="text-2xl md:text-3xl font-bold text-amber-600">
                  {loading ? '...' : myReports.responding}
                </div>

                <div className="text-xs text-amber-700 mt-2 font-medium">
                  🔄 Responding
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 text-center">

                <div className="text-2xl md:text-3xl font-bold text-green-600">
                  {loading ? '...' : myReports.resolved}
                </div>

                <div className="text-xs text-green-700 mt-2 font-medium">
                  ✓ Resolved
                </div>
              </div>

            </div>
          </div>

          {/* RECENT ALERTS */}

          <div className="bg-white rounded-xl border">

            <div className="flex items-center justify-between px-4 md:px-5 py-4 border-b">

              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                🚨 Recent Community Alerts
              </h3>

            </div>

            <div className="p-4 md:p-5 space-y-3">

              {loading ? (

                <div className="inline-flex items-center gap-2 text-xs text-gray-400">
                  <Clock size={14} className="animate-spin" />
                  Loading alerts...
                </div>

              ) : recentAlerts.length === 0 ? (

                <div className="text-center py-8 text-gray-400 text-sm">

                  <FaBell className="mx-auto mb-2 text-2xl text-gray-300" />

                  <p>No community alerts yet</p>

                </div>

              ) : (

                recentAlerts.map((incident) => (

                  <div
                    key={incident.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition cursor-pointer"
                    onClick={() =>
                      setSelectedIncident(incident)
                    }
                  >

                    <div className="flex-shrink-0 mt-0.5">
                      <IncidentIcon type={incident.type} />
                    </div>

                    <div className="flex-1 min-w-0">

                      <div className="flex items-start justify-between gap-2 mb-1">

                        <h4 className="text-sm font-semibold text-gray-900 capitalize truncate">
                          {incident.type} Incident
                        </h4>

                        <StatusBadge status={incident.status} />

                      </div>

                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                        {incident.description}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-gray-500">

                        <span className="flex items-center gap-1">
                          <FaMapPin className="text-red-500" size={10} />
                          {incident.location || 'Unknown location'}
                        </span>

                        <span className="flex items-center gap-1">
                          <Clock size={10} />

                          {new Date(
                            incident.created_at
                          ).toLocaleDateString(
                            'en-US',
                            {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            }
                          )}
                        </span>

                      </div>
                    </div>

                    <div className="flex-shrink-0 self-center text-gray-300">
                      <FaMapMarkedAlt size={14} />
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>

        </main>
      </div>

      <MobileBottomNav />

      {/* MAP MODAL */}

      {selectedIncident && (
        <IncidentMapModal
          incident={selectedIncident}
          onClose={() =>
            setSelectedIncident(null)
          }
        />
      )}

      {/* EMERGENCY HOTLINE MODAL */}

      <EmergencyHotlineModal
        isOpen={emergencyModalOpen}
        onClose={() => setEmergencyModalOpen(false)}
      />

      {/* COMMUNITY ALERTS MODAL */}

      <CommunityAlertsModal
        isOpen={alertsModalOpen}
        onClose={() => setAlertsModalOpen(false)}
        incidents={incidents}
      />

      {/* SOS PANIC BUTTON MODAL */}

      <SOSPanicModal
        isOpen={sosModalOpen}
        onClose={() => setSOSModalOpen(false)}
        profile={profile}
      />
    </div>
  )
}
