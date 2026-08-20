import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, Activity, Clock, Zap, CheckCircle, ChevronRight, Image as ImageIcon, Play, X, AlertCircle, Phone } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTranslation } from '../lib/i18n'
import AdminNavTabs from '../components/AdminNavTabs'
import AdminMobileBottomNav from '../components/AdminMobileBottomNav'
import StatusBadge from '../components/StatusBadge'
import IncidentIcon from '../components/IncidentIcon'
import TopBar from '../components/TopBar'
import MediaPreview from '../components/MediaPreview'
import { getIncidents, getIncidentStats, getHotspots, subscribeToIncidents } from '../lib/database'
import { supabase } from '../lib/supabase'
import { eastTapinacGeoJSON } from '../data/EastTapinac'
import { playSOSAlarm, playReportAlarm } from '../lib/alarmService'
import { useCallManager } from '../hooks/useCallManager'
import CallOptionsModal from '../components/CallOptionsModal'
import CallModal from '../components/CallModal'

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
   MAP BOUNDS HANDLER FOR GEOJSON BOUNDARIES
--------------------------------------------- */
function MapBoundsHandler() {
  const map = useMap()
  const geoJsonRef = useRef(null)

  useEffect(() => {
    if (!map || !geoJsonRef.current) return

    const layer = geoJsonRef.current

    let bounds = null

    if (layer.getLayers) {
      layer.getLayers().forEach((geoLayer) => {
        const layerBounds = geoLayer.getBounds()

        if (bounds) {
          bounds.extend(layerBounds)
        } else {
          bounds = layerBounds
        }
      })
    }

    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [20, 20],
      })
    }
  }, [map])

  return (
    <GeoJSON
      ref={geoJsonRef}
      data={eastTapinacGeoJSON}
      style={{
        color: '#1d4ed8',
        weight: 5,
        opacity: 0.7,
        fillColor: '#3b82f6',
        fillOpacity: 0.08,
      }}
    />
  )
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

  const [isSatellite, setIsSatellite] = useState(false)

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
              zoom={15}
              scrollWheelZoom={true}
              dragging={true}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <ResizeMap />
              {isSatellite ? (
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution="Tiles &copy; Esri"
                  maxZoom={19}
                />
              ) : (
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              )}
              <MapBoundsHandler />
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

          {/* Satellite/Street Toggle */}
          {hasCoords && (
            <div style={{
              position: 'absolute', top: 10, right: 10, zIndex: 1000,
              display: 'flex', borderRadius: 8, overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.3)'
            }}>
              <button
                onClick={() => setIsSatellite(false)}
                style={{
                  padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: 'none', transition: 'all 0.2s',
                  background: !isSatellite ? '#2563eb' : 'rgba(255,255,255,0.9)',
                  color: !isSatellite ? '#fff' : '#374151',
                }}
              >Street</button>
              <button
                onClick={() => setIsSatellite(true)}
                style={{
                  padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: 'none', transition: 'all 0.2s',
                  background: isSatellite ? '#2563eb' : 'rgba(255,255,255,0.9)',
                  color: isSatellite ? '#fff' : '#374151',
                }}
              >Satellite</button>
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
  console.log('AdminDashboard: Component starting to render')
  
  const navigate = useNavigate()
  const { t } = useTranslation()
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

  console.log('AdminDashboard: State initialized')

  // Calling System Integration
  const [showCallOptions, setShowCallOptions] = useState(false)
  const [selectedReporter, setSelectedReporter] = useState(null)
  
  const {
    activeCall,
    incomingCall,
    localStream,
    remoteStream,
    initiateCall,
    answerCall,
    declineCall,
    endCall
  } = useCallManager()

  useEffect(() => {
    const loaddata = async () => {
      try {
        console.log('AdminDashboard: Starting to load data...')
        
        // Parallel data fetching for faster loading
        const [incidentsResult, statsResult, hotspotsResult] = await Promise.all([
          getIncidents(),
          getIncidentStats('7d'),
          getHotspots()
        ])
        
        console.log('AdminDashboard: Data loaded:', {
          incidents: incidentsResult.data?.length || 0,
          stats: statsResult.data ? 'loaded' : 'empty',
          hotspots: hotspotsResult.data ? 'loaded' : 'empty'
        })
        
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
        
        console.log('AdminDashboard: Finished loading data')
        setLoading(false)
      } catch (error) {
        console.error('AdminDashboard: Error loading data:', error)
        setLoading(false)
      }
    }
    
    loaddata()
    
    const subscription = subscribeToIncidents((payload) => {
      if (payload.eventType === 'INSERT') {
        setIncidents(prev => [payload.new, ...prev].slice(0, 4))
        
        // Check if new incident is SOS
        if (payload.new.is_sos && payload.new.status === 'pending') {
          setSOSAlerts(prev => [payload.new, ...prev])
          setShowSOSBanner(true)
          
          // 🚨 Play SOS alarm sound (urgent emergency alert)
          playSOSSound()
        } else {
          // 🔔 Play regular report alarm for non-SOS incidents
          playReportAlarm()
        }
        
        // Continue with existing SOS-specific logic
        if (payload.new.is_sos && payload.new.status === 'pending') {
          
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

  // Listen for notification clicks to open incidents
  useEffect(() => {
    const handleOpenIncident = async (event) => {
      const { incidentId } = event.detail
      
      // Fetch the incident details
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', incidentId)
        .single()
      
      if (!error && data) {
        setSelectedIncident(data)
      }
    }

    window.addEventListener('openIncident', handleOpenIncident)
    
    return () => {
      window.removeEventListener('openIncident', handleOpenIncident)
    }
  }, [])

  // Check URL for incident parameter on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const incidentId = searchParams.get('incident')
    
    if (incidentId) {
      // Fetch and open the incident
      const fetchIncident = async () => {
        const { data, error } = await supabase
          .from('incidents')
          .select('*')
          .eq('id', incidentId)
          .single()
        
        if (!error && data) {
          setSelectedIncident(data)
        }
      }
      
      fetchIncident()
      
      // Clean up URL
      window.history.replaceState({}, '', '/admin')
    }
  }, [])

  // Play SOS alert sound - using enhanced alarm service
  const playSOSSound = () => {
    console.log('🚨 Playing SOS alarm for admin...')
    playSOSAlarm()
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

  // Handle Call Button Click for SOS Alerts
  const handleCallReporter = async (alert) => {
    if (!alert.user_id) {
      // Fallback to phone dialer if no user_id
      if (alert.reporter_contact) {
        window.location.href = `tel:${alert.reporter_contact}`
      }
      return
    }

    // Fetch reporter details
    const { data: reporterData } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .eq('id', alert.user_id)
      .single()

    if (reporterData) {
      setSelectedReporter({
        id: reporterData.id,
        name: reporterData.full_name || alert.reporter_name || 'Reporter',
        phone: reporterData.phone || alert.reporter_contact,
      })
      setShowCallOptions(true)
    }
  }

  // Handle Call Type Selection
  const handleCallTypeSelected = async (callType, isVideo) => {
    if (!selectedReporter) return

    await initiateCall(
      selectedReporter.id,
      selectedReporter.name,
      selectedReporter.phone,
      callType,
      isVideo
    )
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const pendingCount = incidents.filter(i => i.status === 'pending').length
  const respondingCount = incidents.filter(i => i.status === 'responding').length
  const resolvedCount = incidents.filter(i => i.status === 'resolved').length

  console.log('AdminDashboard: About to render, loading:', loading)

  if (loading) {
  console.log('AdminDashboard: Rendering loading state')
  return (
    <div className="pb-16 md:pb-0">
      <TopBar
        title="Officials Dashboard"
        showNotifications={true}
        showUserMenu={true}
      >
        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">
          Official
        </span>
      </TopBar>

      <div className="p-4 md:p-6 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>

      <AdminMobileBottomNav />
    </div>
  )
}

  console.log('AdminDashboard: Rendering main content')

  return (
    <div className="pb-16 md:pb-0">
      <TopBar title="Officials Dashboard" showUserMenu={true} showNotifications={true}>
        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">Official</span>
      </TopBar>
      <AdminNavTabs />

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
                                <button
                                  onClick={() => handleCallReporter(alert)}
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition flex items-center gap-2"
                                >
                                  <Phone size={16} />
                                  Call Now
                                </button>
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
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">{t('adminDashboard')}</h2>
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
              { icon: Activity, label: t('allIncidents'), val: incidents.length, bg: 'bg-blue-50', ic: 'text-blue-600' },
              { icon: Clock, label: t('pending'), val: pendingCount, bg: 'bg-amber-50', ic: 'text-amber-600' },
              { icon: Zap, label: t('responding'), val: respondingCount, bg: 'bg-blue-50', ic: 'text-blue-600' },
              { icon: CheckCircle, label: t('resolved'), val: resolvedCount, bg: 'bg-emerald-50', ic: 'text-emerald-600' },
            ].map((s, i) => {
              const Icon = s.icon
              return (
                <div key={i} className="bg-white rounded-xl shadow-sm p-3 md:p-5 flex flex-col md:flex-row md:items-center gap-3">
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
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm">
              <div className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-sm">{t('recentIncidents')}</h3>
                <button onClick={() => navigate('/admin-reports')} className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:text-blue-700">{t('viewAll')}<ChevronRight size={14} /></button>
              </div>
              <div className="divide-y divide-gray-100">
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
              <div className="bg-white rounded-xl shadow-sm p-4 md:p-5">
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
                {/* Color-coded progress bars */}
                <div className="mt-4 space-y-1.5">
                  {typeStats.map(t => {
                    const maxCount = Math.max(...typeStats.map(s => s.count), 1)
                    const color = typeColors[t.type] || '#3b82f6'
                    return (
                      <div key={t.type} className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-300" 
                          style={{ 
                            width: `${(t.count / maxCount) * 100}%`,
                            backgroundColor: color
                          }} 
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4 md:p-5">
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

        {/* Call Options Modal */}
        <CallOptionsModal
          isOpen={showCallOptions}
          onClose={() => setShowCallOptions(false)}
          recipient={selectedReporter}
          onSelectOption={handleCallTypeSelected}
        />

        {/* Incoming Call Modal */}
        {incomingCall && (
          <CallModal
            isOpen={true}
            onClose={() => {}}
            callData={incomingCall}
            isIncoming={true}
            onAnswer={answerCall}
            onDecline={declineCall}
            localStream={localStream}
            remoteStream={remoteStream}
          />
        )}

        {/* Active Call Modal */}
        {activeCall && (
          <CallModal
            isOpen={true}
            onClose={() => {}}
            callData={activeCall}
            isIncoming={false}
            onEnd={endCall}
            localStream={localStream}
            remoteStream={remoteStream}
          />
        )}
      
      <AdminMobileBottomNav />
    </div>
  )
}

