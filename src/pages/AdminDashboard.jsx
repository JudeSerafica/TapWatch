import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, Activity, Clock, Zap, CheckCircle, ChevronRight, Image as ImageIcon, Play, X, AlertCircle, Phone } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import AdminSidebar from '../components/AdminSidebar'
import AdminNavTabs from '../components/AdminNavTabs'
import AdminMobileBottomNav from '../components/AdminMobileBottomNav'
import StatusBadge from '../components/StatusBadge'
import IncidentIcon from '../components/IncidentIcon'
import TopBar from '../components/TopBar'
import MediaPreview from '../components/MediaPreview'
import { getIncidents, getIncidentStats, getHotspots, subscribeToIncidents } from '../lib/database'

/* ---------------------------------------------
   FIX LEAFLET DEFAULT ICON ISSUE
--------------------------------------------- */
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

/* ---------------------------------------------
   CONSTANTS
--------------------------------------------- */
const typeColors = {
  crime: '#9333ea',
  accident: '#f97316',
  fire: '#ef4444',
  flood: '#3b82f6',
  disturbance: '#eab308',
}

/* ---------------------------------------------
   CREATE COLORED MARKER ICON
--------------------------------------------- */
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

/* ---------------------------------------------
   FLY TO INCIDENT
--------------------------------------------- */
function FlyToIncident({ incident }) {
  const map = useMap()

  useEffect(() => {
    if (incident?.latitude && incident?.longitude) {
      map.flyTo([incident.latitude, incident.longitude], 18, { duration: 1.2 })
    }
  }, [incident, map])

  return null
}

/* ---------------------------------------------
   FIX MAP SIZE INSIDE MODAL
--------------------------------------------- */
function ResizeMap() {
  const map = useMap()

  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize()
    }, 300)
  }, [map])

  return null
}

/* ---------------------------------------------
   INCIDENT MAP MODAL
--------------------------------------------- */
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

  const typeColor = typeColors[incident.type] || '#6b7280'
  const formattedDate = new Date(incident.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  const hasCoords = incident.latitude && incident.longitude

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
              <IncidentIcon type={incident.type} size={16} className="text-white" />
              <span className="font-bold text-base capitalize">{incident.type} Incident</span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize"
                style={{ background: 'rgba(255,255,255,0.25)', color: 'white' }}
              >
                {incident.status}
              </span>
            </div>
            <p className="text-xs opacity-80 flex items-center gap-1">
              {incident.location || 'Unknown location'}
              <span className="mx-1">�</span>
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
        <div className="relative" style={{ height: '320px', width: '100%' }}>
          {hasCoords ? (
            <MapContainer
              center={[Number(incident.latitude), Number(incident.longitude)]}
              zoom={17}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <ResizeMap />
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FlyToIncident incident={incident} />
              <Marker
                position={[Number(incident.latitude), Number(incident.longitude)]}
                icon={createIcon(incident.type)}
              >
                <Popup>
                  <div className="text-xs font-semibold capitalize">{incident.type} Incident</div>
                  <div className="text-xs text-gray-500 mt-0.5">{incident.location}</div>
                </Popup>
              </Marker>
            </MapContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm bg-gray-50">
              <div className="text-center">
                <p>No location data available</p>
              </div>
            </div>
          )}
        </div>

        {/* DESCRIPTION */}
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</p>
          <p className="text-sm text-gray-700 leading-relaxed">
            {incident.description || 'No description provided.'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [incidents, setIncidents] = useState([])
  const [typeStats, setTypeStats] = useState([])
  const [hotspots, setHotspots] = useState([])
  const [selectedMedia, setSelectedMedia] = useState(null)
  const [mediaPreviewOpen, setMediaPreviewOpen] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sosAlerts, setSOSAlerts] = useState([])
  const [showSOSBanner, setShowSOSBanner] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    const loaddata = async () => {
      // Parallel data fetching for faster loading
      const [incidentsResult, statsResult, hotspotsResult] = await Promise.all([
        getIncidents(),
        getIncidentStats('7d'),
        getHotspots()
      ])
      
      if (incidentsResult.data) {
        setIncidents(incidentsResult.data.slice(0, 4))
        
        // Check for active SOS alerts
        const activeSOS = incidentsResult.data.filter(
          inc => inc.is_sos && inc.status === 'pending'
        )
        setSOSAlerts(activeSOS)
        if (activeSOS.length > 0) {
          setShowSOSBanner(true)
        }
      }
      
      if (statsResult.data && statsResult.data.byType) {
        setTypeStats(Object.entries(statsResult.data.byType).map(([type, count]) => ({ type, count })))
      }
      
      if (hotspotsResult.data) {
        setHotspots(Object.entries(hotspotsResult.data)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 3)
          .map(([location, data]) => ({ location, count: data.count })))
      }
      setLoading(false)
    }
    
    loaddata()
    
    const subscription = subscribeToIncidents((payload) => {
      if (payload.eventType === 'INSERT') {
        setIncidents(prev => [payload.new, ...prev].slice(0, 4))
        
        // Check if new incident is SOS
        if (payload.new.is_sos && payload.new.status === 'pending') {
          setSOSAlerts(prev => [payload.new, ...prev])
          setShowSOSBanner(true)
          
          // Play alert sound
          playSOSSound()
          
          // Show browser notification
          if (Notification.permission === 'granted') {
            new Notification('🚨 EMERGENCY SOS ALERT', {
              body: `${payload.new.reporter_name || 'Someone'} needs immediate help at ${payload.new.location}`,
              icon: '/Tapinac.logo.jpg',
              requireInteraction: true,
              tag: 'sos-emergency',
              vibrate: [200, 100, 200, 100, 200]
            })
          }
          
          // Auto-open modal after 1 second
          setTimeout(() => {
            setSelectedIncident(payload.new)
          }, 1000)
          
          // Send SMS notification (simulated)
          sendSMSNotification(payload.new)
        }
      } else if (payload.eventType === 'UPDATE') {
        setIncidents(prev => prev.map(i => i.id === payload.new.id ? payload.new : i))
        // Update selected incident if it's the one being updated
        setSelectedIncident(prev => prev?.id === payload.new.id ? payload.new : prev)
        
        // Remove from SOS alerts if status changed
        if (payload.new.is_sos && payload.new.status !== 'pending') {
          setSOSAlerts(prev => prev.filter(sos => sos.id !== payload.new.id))
        }
      } else if (payload.eventType === 'DELETE') {
        setIncidents(prev => prev.filter(i => i.id !== payload.old.id))
        // Close modal if the deleted incident is currently selected
        setSelectedIncident(prev => prev?.id === payload.old.id ? null : prev)
        setSOSAlerts(prev => prev.filter(sos => sos.id !== payload.old.id))
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Play SOS alert sound
  const playSOSSound = () => {
    // Create audio context for alert sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.2)
    
    // Play 3 beeps
    setTimeout(() => {
      const osc2 = audioContext.createOscillator()
      const gain2 = audioContext.createGain()
      osc2.connect(gain2)
      gain2.connect(audioContext.destination)
      osc2.frequency.value = 800
      osc2.type = 'sine'
      gain2.gain.setValueAtTime(0.3, audioContext.currentTime)
      osc2.start(audioContext.currentTime)
      osc2.stop(audioContext.currentTime + 0.2)
    }, 300)
    
    setTimeout(() => {
      const osc3 = audioContext.createOscillator()
      const gain3 = audioContext.createGain()
      osc3.connect(gain3)
      gain3.connect(audioContext.destination)
      osc3.frequency.value = 800
      osc3.type = 'sine'
      gain3.gain.setValueAtTime(0.3, audioContext.currentTime)
      osc3.start(audioContext.currentTime)
      osc3.stop(audioContext.currentTime + 0.2)
    }, 600)
  }

  // Send SMS notification (simulated)
  const sendSMSNotification = (incident) => {
    console.log('📱 SMS NOTIFICATION SENT:')
    console.log('To: Barangay Officials')
    console.log(`Message: 🚨 EMERGENCY SOS ALERT! ${incident.reporter_name || 'Someone'} needs immediate help at ${incident.location}. Contact: ${incident.reporter_contact}. Respond immediately!`)
    
    // In production, integrate with SMS API like Twilio, Semaphore, etc.
    // Example:
    // await fetch('https://api.semaphore.co/api/v4/messages', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     apikey: 'YOUR_API_KEY',
    //     number: '09171234567',
    //     message: `🚨 EMERGENCY SOS...`
    //   })
    // })
  }

  const dismissSOSBanner = () => {
    setShowSOSBanner(false)
  }

  const viewSOSAlert = (alert) => {
    setSelectedIncident(alert)
    setShowSOSBanner(false)
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const pendingCount = incidents.filter(i => i.status === 'pending').length
  const respondingCount = incidents.filter(i => i.status === 'responding').length
  const resolvedCount = incidents.filter(i => i.status === 'resolved').length

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <AdminSidebar />
        <div className="flex-1 md:ml-60 pb-16 md:pb-0">
          <TopBar title="Officials Dashboard" />
          <div className="p-4 md:p-6 flex items-center justify-center">
            <div className="text-gray-500">Loading dashboard...</div>
          </div>
        </div>
        <AdminMobileBottomNav />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 md:ml-60 pb-16 md:pb-0">
        <TopBar title="Officials Dashboard" showUserMenu={true}>
          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">Official</span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-white text-xs text-gray-600">
            <span className="w-2 h-2 rounded-full bg-green-500" />Live
          </span>
        </TopBar>
        <AdminNavTabs />
        <AdminMobileBottomNav />

        <main className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* SOS PRIORITY ALERT BANNER */}
          {showSOSBanner && sosAlerts.length > 0 && (
            <div className="bg-red-600 border-2 border-red-700 rounded-xl shadow-2xl overflow-hidden animate-pulse">
              <div className="px-4 md:px-6 py-4 md:py-5">
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-full flex items-center justify-center animate-bounce">
                      <span className="text-3xl md:text-4xl">🚨</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="text-white" size={20} />
                      <h3 className="text-white font-bold text-lg md:text-xl">
                        EMERGENCY SOS ALERT - IMMEDIATE ACTION REQUIRED
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {sosAlerts.map((alert, index) => (
                        <div key={alert.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-white font-semibold text-sm md:text-base">
                                {alert.reporter_name || 'Unknown Person'} needs immediate help!
                              </p>
                              <p className="text-white/90 text-xs md:text-sm mt-1">
                                📍 {alert.location || 'Location unavailable'}
                              </p>
                              <p className="text-white/80 text-xs mt-1">
                                ⏰ {new Date(alert.created_at).toLocaleTimeString()} • 
                                📞 {alert.reporter_contact || 'No contact'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {alert.reporter_contact && (
                                <a
                                  href={`tel:${alert.reporter_contact}`}
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition flex items-center gap-2"
                                >
                                  <Phone size={16} />
                                  Call Now
                                </a>
                              )}
                              <button
                                onClick={() => viewSOSAlert(alert)}
                                className="px-4 py-2 bg-white hover:bg-gray-100 text-red-600 rounded-lg font-semibold text-sm transition"
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={dismissSOSBanner}
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition text-white"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Officials Dashboard</h2>
              <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-700 text-xs font-medium">Admin View</span>
            </div>
            <p className="text-xs md:text-sm text-gray-500">{today}</p>
          </div>

          <div className="flex items-center justify-between bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-lg px-4 md:px-5 py-3 md:py-4">
            <div className="flex items-center gap-2 md:gap-3">
              <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
              <span className="text-xs md:text-sm text-amber-800 font-medium">{pendingCount} incidents awaiting response.</span>
            </div>
            <button onClick={() => navigate('/admin-reports')} className="px-3 md:px-4 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-md hover:bg-amber-700 flex-shrink-0">Respond</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { icon: Activity, label: "Today's Incidents", val: incidents.length, bg: 'bg-blue-50', ic: 'text-blue-600' },
              { icon: Clock, label: "Pending Action", val: pendingCount, bg: 'bg-amber-50', ic: 'text-amber-600' },
              { icon: Zap, label: "Responding", val: respondingCount, bg: 'bg-blue-50', ic: 'text-blue-600' },
              { icon: CheckCircle, label: "Resolved", val: resolvedCount, bg: 'bg-emerald-50', ic: 'text-emerald-600' },
            ].map((s, i) => {
              const Icon = s.icon
              return (
                <div key={i} className="bg-white rounded-xl border p-3 md:p-5 flex flex-col md:flex-row md:items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={20} className={s.ic} />
                  </div>
                  <div>
                    <div className="text-xl md:text-2xl font-bold text-gray-900">{s.val}</div>
                    <div className="text-xs text-gray-500">{s.label}</div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border">
              <div className="flex items-center justify-between px-4 md:px-5 py-4 border-b">
                <h3 className="font-bold text-gray-900 text-sm">Recent Incidents</h3>
                <button onClick={() => navigate('/admin-reports')} className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:text-blue-700">View All<ChevronRight size={14} /></button>
              </div>
              <div className="divide-y">
                {incidents.map(inc => (
                  <div 
                    key={inc.id} 
                    className="flex flex-col md:flex-row md:items-center md:justify-between px-4 md:px-5 py-4 hover:bg-gray-50 gap-2 cursor-pointer"
                    onClick={() => setSelectedIncident(inc)}
                  >
                    <div className="flex items-center gap-2 md:gap-3 flex-1">
                      <IncidentIcon type={inc.type} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* SOS BADGE */}
                          {inc.is_sos && (
                            <span className="px-2 py-1 bg-red-600 text-white rounded-md text-xs font-bold flex items-center gap-1 animate-pulse">
                              🚨 SOS EMERGENCY
                            </span>
                          )}
                          <span className="text-xs md:text-sm font-medium text-gray-900 capitalize">{inc.type}</span>
                          <span className="text-xs text-gray-500 truncate">{inc.location || 'Unknown'}</span>
                          {inc.media_url && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedMedia({ url: inc.media_url, name: inc.media_name || 'Media' })
                                setMediaPreviewOpen(true)
                              }}
                              className="ml-auto md:ml-2 p-1 hover:bg-blue-100 rounded transition"
                              title="View media"
                            >
                              {inc.media_url.startsWith('data:video') ? (
                                <Play size={20} className="text-blue-600" />
                              ) : (
                                <ImageIcon size={20} className="text-blue-600" />
                              )}
                            </button>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{inc.description?.substring(0, 50)}{inc.description?.length > 50 ? '...' : ''}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={inc.status} />
                      <div className="text-xs text-gray-400 mt-1">{new Date(inc.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 md:space-y-6">
              <div className="bg-white rounded-xl border p-4 md:p-5">
                <h3 className="font-bold text-gray-900 text-sm mb-4">By Type</h3>
                <div className="space-y-3">
                  {typeStats.map(t => (
                    <div key={t.type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IncidentIcon type={t.type} size={14} />
                        <span className="text-xs md:text-sm text-gray-700 capitalize">{t.type}</span>
                      </div>
                      <span className="text-xs md:text-sm font-semibold text-gray-900">{t.count}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-1.5">
                  {typeStats.map(t => {
                    const maxCount = Math.max(...typeStats.map(s => s.count), 1)
                    return (
                      <div key={t.type} className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${(t.count / maxCount) * 100}%` }} />
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl border p-4 md:p-5">
                <h3 className="font-bold text-gray-900 text-sm mb-4">Top Hotspots</h3>
                <div className="space-y-3">
                  {hotspots.map((h, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-red-600 w-5">{i + 1}</span>
                        <span className="text-xs md:text-sm text-gray-700 truncate">{h.location}</span>
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">{h.count} incidents</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>

        <MediaPreview
          mediaUrl={selectedMedia?.url}
          mediaName={selectedMedia?.name}
          isOpen={mediaPreviewOpen}
          onClose={() => setMediaPreviewOpen(false)}
        />

        {selectedIncident && (
          <IncidentMapModal
            incident={selectedIncident}
            onClose={() => setSelectedIncident(null)}
          />
        )}
      </div>
      <AdminMobileBottomNav />
    </div>
  )
}

