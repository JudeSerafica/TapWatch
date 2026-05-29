import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, GeoJSON, useMapEvents, Marker, useMap } from 'react-leaflet'
import {
  FiAlertTriangle,
  FiMapPin,
  FiXCircle,
  FiCheckCircle,
  FiUpload,
  FiUser,
  FiPhone,
  FiClock,
  FiFileText,
  FiCamera,
  FiVideo,
  FiChevronDown,
  FiX,
} from 'react-icons/fi'
import { RiSparklingFill } from 'react-icons/ri'
import L from 'leaflet'
import ResidentSidebar from '../components/ResidentSidebar'
import MobileBottomNav from '../components/MobileBottomNav'
import TopBar from '../components/TopBar'
import { useAuth } from '../context/useAuth'
import { eastTapinacGeoJSON } from '../data/EastTapinac'
import { createIncident, checkDuplicateIncident } from '../lib/database'
import { MdLocalPolice } from "react-icons/md";
import { FaExclamationTriangle, FaFire, FaBullhorn } from "react-icons/fa";
import { FaHouseFloodWater } from "react-icons/fa6";
import { supabase } from '../lib/supabase'

const incidentTypes = ['Crime', 'Accident', 'Fire', 'Flood', 'Disturbance']

const typeConfig = {
  Crime:       { color: '#dc2626', bg: '#fef2f2', icon: <MdLocalPolice /> },
  Accident:    { color: '#d97706', bg: '#fffbeb', icon: <FaExclamationTriangle /> },
  Fire:        { color: '#ea580c', bg: '#fff7ed', icon: <FaFire /> },
  Flood:       { color: '#2563eb', bg: '#eff6ff', icon: <FaHouseFloodWater /> },
  Disturbance: { color: '#7c3aed', bg: '#f5f3ff', icon: <FaBullhorn/> },
}

const pinIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -28]
})

function isPointNearBoundary(point, geoJSON) {
  if (!geoJSON.features || geoJSON.features.length === 0) return false
  const allCoords = []
  geoJSON.features.forEach(feature => {
    if (feature.geometry && feature.geometry.coordinates) {
      if (feature.geometry.type === 'LineString') allCoords.push(...feature.geometry.coordinates)
      else if (feature.geometry.type === 'Polygon') allCoords.push(...feature.geometry.coordinates[0])
    }
  })
  if (allCoords.length === 0) return false
  const lngs = allCoords.map(c => c[0])
  const lats = allCoords.map(c => c[1])
  const [lng, lat] = point
  return lng >= Math.min(...lngs) && lng <= Math.max(...lngs) &&
         lat >= Math.min(...lats) && lat <= Math.max(...lats)
}

function MapClickHandler({ onClick, onBoundaryError }) {
  useMapEvents({
    click(e) {
      const point = [e.latlng.lng, e.latlng.lat]
      if (!isPointNearBoundary(point, eastTapinacGeoJSON)) { onBoundaryError(); return }
      onClick(e.latlng)
    }
  })
  return null
}

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
        if (bounds) bounds.extend(layerBounds)
        else bounds = layerBounds
      })
    }
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 19 })
      const currentZoom = map.getZoom()
      map.setMinZoom(currentZoom)
    }
  }, [map])

  return (
    <GeoJSON
      ref={geoJsonRef}
      data={eastTapinacGeoJSON}
      style={{ color: '#1d4ed8', weight: 5, opacity: 0.7, fillColor: '#3b82f6', fillOpacity: 0.12 }}
    />
  )
}

/* ─── Styled sub-components ─────────────────────────── */

function SectionCard({ icon: Icon, label, iconColor = '#2563eb', children }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.04)'
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 20px',
        borderBottom: '1px solid #f3f4f6',
        background: '#fafafa'
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: `${iconColor}14`,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Icon size={15} color={iconColor} strokeWidth={2.2} />
        </div>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: '#111827' }}>
          {label}
        </span>
      </div>
      <div>{children}</div>
    </div>
  )
}

function FieldLabel({ children, required }) {
  return (
    <label style={{
      display: 'block', fontFamily: "'DM Sans', sans-serif",
      fontSize: 12, fontWeight: 600, color: '#6b7280',
      letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6
    }}>
      {children}
      {required && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
    </label>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 14px',
  border: '1.5px solid #e5e7eb', borderRadius: 10,
  fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, color: '#111827',
  background: '#fff', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

const readOnlyInputStyle = {
  ...inputStyle,
  background: '#f9fafb', color: '#9ca3af', cursor: 'not-allowed',
  border: '1.5px solid #f3f4f6'
}

/* ─── Camera Capture Menu ────────────────────────────── */

function CameraMenu({ onFileChange }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const photoInputRef = useRef(null)
  const videoInputRef = useRef(null)

  // Close when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handlePhotoCapture = () => {
    setOpen(false)
    // Small delay so menu closes before file dialog opens
    setTimeout(() => photoInputRef.current?.click(), 50)
  }

  const handleVideoCapture = () => {
    setOpen(false)
    setTimeout(() => videoInputRef.current?.click(), 50)
  }

  return (
    <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>

      {/* Trigger button */}
      <button
        type="button"
        className="camera-btn"
        title="Take photo or record video"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          width: 'auto', padding: '0 10px', height: 42,
          borderRadius: 10,
          border: open ? '1.5px solid #93c5fd' : '1.5px dashed #cbd5e1',
          cursor: 'pointer',
          background: open ? '#eff6ff' : '#f8fafc',
          transition: 'all 0.15s',
          color: open ? '#2563eb' : '#64748b',
        }}>
        <FiCamera size={15} />
        <FiChevronDown
          size={11}
          style={{
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        />
      </button>

      {/* Dropdown menu */}
      {open && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          right: 0,
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          minWidth: 170,
          zIndex: 50,
          animation: 'popIn 0.15s ease',
        }}>
          {/* Arrow pointer */}
          <div style={{
            position: 'absolute', bottom: -6, right: 14,
            width: 12, height: 12,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderTop: 'none', borderLeft: 'none',
            transform: 'rotate(45deg)',
          }} />

          <div style={{ padding: 6 }}>

            {/* Take Photo option */}
            <button
              type="button"
              onClick={handlePhotoCapture}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '9px 12px',
                border: 'none', borderRadius: 8,
                background: 'transparent', cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13, fontWeight: 500, color: '#111827',
                transition: 'background 0.1s',
                textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{
                width: 28, height: 28, borderRadius: 8,
                background: '#eff6ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <FiCamera size={13} color="#2563eb" />
              </span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 12.5 }}>Take Photo</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>Opens camera</div>
              </div>
            </button>

            {/* Record Video option */}
            <button
              type="button"
              onClick={handleVideoCapture}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '9px 12px',
                border: 'none', borderRadius: 8,
                background: 'transparent', cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13, fontWeight: 500, color: '#111827',
                transition: 'background 0.1s',
                textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#fdf4ff'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{
                width: 28, height: 28, borderRadius: 8,
                background: '#fdf4ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <FiVideo size={13} color="#9333ea" />
              </span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 12.5 }}>Record Video</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>Opens camera</div>
              </div>
            </button>

          </div>
        </div>
      )}

      {/* Hidden inputs — these trigger the actual camera/video recorder */}
      {/* capture="environment" = rear camera; "user" = front camera */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => { onFileChange(e); setOpen(false) }}
        style={{ display: 'none' }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        onChange={(e) => { onFileChange(e); setOpen(false) }}
        style={{ display: 'none' }}
      />
    </div>
  )
}

/* ─── Main Component ─────────────────────────────────── */

export default function ReportIncident() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [pin, setPin] = useState(null)
  const [aiType, setAiType] = useState('')
  const [loadingAI, setLoadingAI] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [notification, setNotification] = useState(null)
  const [boundaryError, setBoundaryError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)

  const [form, setForm] = useState({
    type: '', description: '', date: new Date().toISOString().slice(0, 10), time: new Date().toTimeString().slice(0, 5),
    reporterName: profile?.full_name || '', contact: profile?.phone || '',
    mediaUrl: null, mediaName: ''
  })

  const handleMapClick = useCallback((latlng) => { setPin(latlng); setBoundaryError('') }, [])
  const handleBoundaryError = useCallback(() => {
    setBoundaryError('Please place the pin within the barangay boundary (blue shaded area)')
    setTimeout(() => setBoundaryError(''), 3000)
  }, [])

  const MAX_SIZE = 50 * 1024 * 1024 // 50MB

const handleFileChange = (e) => {
  const file = e.target.files?.[0]
  if (!file) return

  // ❌ block oversized videos/images
  if (file.size > MAX_SIZE) {
    showNotification('File too large (max 50MB)', 'error')
    return
  }

  setForm(f => ({
    ...f,
    mediaFile: file,
    mediaName: file.name
  }))

  const reader = new FileReader()
  reader.onload = (event) =>
    setForm(f => ({ ...f, mediaUrl: event.target?.result }))

  reader.readAsDataURL(file)
  e.target.value = ''
}



  const clearMedia = () => setForm(f => ({ ...f, mediaUrl: null, mediaName: '' }))

  const classifyAI = () => {
    setLoadingAI(true)
    setTimeout(() => {
      const text = form.description.toLowerCase()
      let t = ''
      if (text.includes('sunog') || text.includes('fire') || text.includes('apoy')) t = 'Fire'
      else if (text.includes('baha') || text.includes('tubig') || text.includes('flood')) t = 'Flood'
      else if (text.includes('bangga') || text.includes('aksidente') || text.includes('accident') || text.includes('motor')) t = 'Accident'
      else if (text.includes('nakaw') || text.includes('theft') || text.includes('robbery') || text.includes('crime')) t = 'Crime'
      else if (text.includes('ingay') || text.includes('away') || text.includes('disturbance')) t = 'Disturbance'
      else t = 'Accident'
      setAiType(t); setForm(f => ({ ...f, type: t })); setLoadingAI(false)
    }, 800)
  }

  const notifyAdmin = (incident) => {
    console.log('ADMIN NOTIFICATION: New incident reported:', incident)
  }

  const notifyUser = () => {
    alert('Thank you! Your report has been submitted and the admin has been notified.')
  }

  const showNotification = (message, type = 'success') => {
  setNotification({ message, type })

  setTimeout(() => {
    setNotification(null)
  }, 3000)
}

const uploadMedia = async () => {
  if (!form.mediaFile) return null

  const file = form.mediaFile
  const filePath = `${profile.id}/${Date.now()}-${file.name}`

  setUploadProgress(10)

  const { error } = await supabase.storage
    .from('incident-media')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) throw error

  setUploadProgress(80)

  const { data } = supabase.storage
    .from('incident-media')
    .getPublicUrl(filePath)

  setUploadProgress(100)

  return data.publicUrl
}

  const handleSubmit = async (e) => {
  e.preventDefault()

  if (!form.type || !form.description) {
    showNotification('Please fill in required fields.', 'error')
    return
  }

  try {
    setSubmitting(true)
    setUploadProgress(0)

    const location = pin
      ? `${pin.lat.toFixed(6)}, ${pin.lng.toFixed(6)}`
      : 'Unknown'

    console.log('Submitting report...')

    const { isDuplicate, duplicates } =
      await checkDuplicateIncident(form.description, location)

    if (isDuplicate && duplicates.length > 0) {
      const confirmSubmit = confirm(
        `This appears to be a duplicate report:\n\n${duplicates[0].description}\n\nSubmit anyway?`
      )

      if (!confirmSubmit) {
        setSubmitting(false)
        return
      }
    }

    // ✅ UPLOAD MEDIA FIRST (IMPORTANT FIX)
    let mediaUrl = null

    try {
      if (form.mediaFile) {
        mediaUrl = await uploadMedia()
      }
    } catch (uploadErr) {
      console.error(uploadErr)
      showNotification('Media upload failed', 'error')
      setSubmitting(false)
      return
    }

    const incidentData = {
      user_id: profile?.id || null,
      type: form.type.toLowerCase(),
      description: form.description,
      location,
      purok: profile?.purok || null,
      latitude: pin?.lat || null,
      longitude: pin?.lng || null,
      status: 'pending',

      // ✅ FIXED: use uploaded URL
      media_url: mediaUrl,
      media_name: form.mediaName,

      ai_classification: aiType || form.type,
      ai_confidence: aiType ? 0.85 : 0.5,
      urgency_level: 'medium',

      reporter_name:
        form.reporterName || profile?.full_name || 'Anonymous',

      reporter_contact:
        form.contact || profile?.phone || null,
    }

    console.log('Incident data:', incidentData)

    const { data, error } = await createIncident(incidentData)

    if (error) {
      console.error(error)
      showNotification(
        'Failed to submit report: ' + error.message,
        'error'
      )
      setSubmitting(false)
      return
    }

    console.log('Report submitted:', data)

    showNotification(
      'Report successfully sent to admin!',
      'success'
    )

    notifyAdmin(data)

    setSubmitted(true)

    setTimeout(() => {
      navigate('/dashboard')
    }, 2000)

  } catch (err) {
    console.error(err)

    showNotification(
      'Unexpected error: ' + err.message,
      'error'
    )
  } finally {
    setSubmitting(false)
  }
}

  return (
    
    <>
    {uploadProgress > 0 && uploadProgress < 100 && (
  <div style={{
    marginTop: 10,
    height: 6,
    background: '#e5e7eb',
    borderRadius: 999,
    overflow: 'hidden'
  }}>
    <div style={{
      width: `${uploadProgress}%`,
      height: '100%',
      background: '#2563eb',
      transition: 'width 0.2s'
    }} />
  </div>
)}

    {notification && (
  <div
    style={{
      position: 'fixed',
      top: 20,
      right: 20,
      zIndex: 9999,
      padding: '14px 18px',
      borderRadius: 12,
      color: '#fff',
      fontWeight: 600,
      fontSize: 13,
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      background:
        notification.type === 'success'
          ? '#16a34a'
          : '#dc2626',
      animation: 'popIn 0.2s ease',
    }}
  >
    {notification.message}
  </div>
)}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');
        .ri-textarea:focus { border-color: #2563eb !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
        .ri-input:focus { border-color: #2563eb !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
        .ri-select:focus { border-color: #2563eb !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
        .type-pill { transition: all 0.15s ease; cursor: pointer; }
        .type-pill:hover { transform: translateY(-1px); }
        .submit-btn { transition: all 0.2s ease; }
        .submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 25px rgba(37,99,235,0.3); }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .ai-btn { transition: all 0.15s ease; }
        .ai-btn:hover:not(:disabled) { background: #ede9fe !important; color: #6d28d9 !important; }
        .media-btn:hover { background: #f1f5f9 !important; border-color: #94a3b8 !important; }
        .camera-btn:hover { background: #eff6ff !important; border-color: #93c5fd !important; color: #2563eb !important; }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.92) translateY(4px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif" }}>
        <ResidentSidebar />
        <div style={{ flex: 1, marginLeft: 0, paddingBottom: 64 }} className="md:ml-60 md:pb-0">
          <TopBar title="Report Incident">
            <button
              onClick={() => window.location.href = '/dashboard'}
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
                  border: 2px solid #dc2626;
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

          <main style={{ padding: '16px', maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }} className="md:p-7">

            {/* Page Header */}
            <div style={{ paddingBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.25)'
                }}>
                  <FiAlertTriangle size={20} color="#fff" strokeWidth={2.2} />
                </div>
                <div>
                  <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
                    Report an Incident
                  </h2>
                  <p style={{ fontSize: 13, color: '#94a3b8', margin: '3px 0 0', fontWeight: 400 }}>
                    Drop a pin on the map, then fill in the details below.
                  </p>
                </div>
              </div>
            </div>

            {/* Success Banner */}
            {submitted && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 18px',
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '1px solid #bbf7d0', borderRadius: 12,
              }}>
                <FiCheckCircle size={18} color="#16a34a" />
                <span style={{ fontSize: 13.5, fontWeight: 600, color: '#15803d' }}>
                  Incident reported successfully! Redirecting to dashboard…
                </span>
              </div>
            )}

            {/* Map Section */}
            <SectionCard icon={FiMapPin} label="Pin the Location" iconColor="#2563eb">
              <div style={{ height: '300px' }} className="md:h-full md:min-h-500">
                <MapContainer center={[14.835, 120.283]} zoom={16} style={{ height: '100%', width: '100%', zIndex: 1 }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapBoundsHandler />
                  <MapClickHandler onClick={handleMapClick} onBoundaryError={handleBoundaryError} />
                  {pin && <Marker position={pin} icon={pinIcon} />}
                </MapContainer>
              </div>

              {pin && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 18px',
                  background: '#eff6ff', borderTop: '1px solid #dbeafe'
                }}>
                  <FiMapPin size={13} color="#2563eb" />
                  <span style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 500 }}>
                    Pin placed at {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
                  </span>
                </div>
              )}

              {boundaryError && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 18px',
                  background: '#fef2f2', borderTop: '1px solid #fecaca'
                }}>
                  <FiXCircle size={14} color="#dc2626" />
                  <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 500 }}>{boundaryError}</span>
                </div>
              )}
            </SectionCard>

            {/* Incident Details */}
            <SectionCard icon={FiFileText} label="Incident Details" iconColor="#2563eb">
              <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* Description */}
                <div>
                  <FieldLabel required>Description</FieldLabel>
                  <textarea
                    required rows={3}
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    className="ri-textarea"
                    placeholder="Describe what happened… (e.g. May banggaan ng motor sa highway)"
                    style={{
                      ...inputStyle, resize: 'vertical', minHeight: 88,
                      lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif"
                    }}
                  />
                </div>

                {/* AI Classify row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button" onClick={classifyAI}
                    disabled={loadingAI || !form.description}
                    className="ai-btn"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '7px 14px', borderRadius: 8, border: 'none',
                      background: '#f5f3ff', color: '#7c3aed',
                      fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                      fontFamily: "'DM Sans', sans-serif",
                      opacity: (loadingAI || !form.description) ? 0.5 : 1
                    }}>
                    <RiSparklingFill size={13} />
                    {loadingAI ? 'Classifying…' : 'AI Classify'}
                  </button>

                  {aiType && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '5px 10px', borderRadius: 20,
                      background: typeConfig[aiType]?.bg || '#f3f4f6',
                      border: `1px solid ${typeConfig[aiType]?.color || '#e5e7eb'}22`,
                      fontSize: 12, fontWeight: 600,
                      color: typeConfig[aiType]?.color || '#374151'
                    }}>
                      {typeConfig[aiType]?.icon} AI detected: {aiType}
                    </span>
                  )}
                </div>

                {/* Type Pills + File Upload row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }} className="md:grid-cols-2">
                  <div>
                    <FieldLabel required>Incident Type</FieldLabel>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 4 }}>
                      {incidentTypes.map(type => {
                        const cfg = typeConfig[type]
                        const selected = form.type === type
                        return (
                          <button
                            key={type} type="button"
                            className="type-pill"
                            onClick={() => setForm({ ...form, type })}
                            style={{
                              padding: '6px 13px', borderRadius: 20,
                              border: selected ? `1.5px solid ${cfg.color}` : '1.5px solid #e5e7eb',
                              background: selected ? cfg.bg : '#fff',
                              color: selected ? cfg.color : '#6b7280',
                              fontSize: 12.5, fontWeight: selected ? 700 : 500,
                              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                              boxShadow: selected ? `0 0 0 3px ${cfg.color}18` : 'none'
                            }}>
                            {cfg.icon} {type}
                          </button>
                        )
                      })}
                    </div>
                    <select required value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                      style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}>
                      <option value="">Select type</option>
                      {incidentTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>

                  {/* ── Attach Media: Upload + Camera ── */}
                  <div>
                    <FieldLabel>Attach Media</FieldLabel>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>

                      {/* Upload from gallery/files */}
                      <label
                        className="media-btn"
                        style={{
                          flex: 1,
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '10px 14px', borderRadius: 10,
                          border: '1.5px dashed #cbd5e1', cursor: 'pointer',
                          background: '#f8fafc', transition: 'all 0.15s',
                          fontSize: 13, color: '#64748b', fontWeight: 500,
                          overflow: 'hidden', whiteSpace: 'nowrap',
                        }}>
                        <FiUpload size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {form.mediaName ? form.mediaName : 'Upload photo or video'}
                        </span>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          onChange={handleFileChange}
                          style={{ display: 'none' }}
                        />
                      </label>

                      {/* Camera / Video capture dropdown */}
                      <CameraMenu onFileChange={handleFileChange} />

                    </div>

                    {/* Media preview with remove button */}
                    {form.mediaName && form.mediaUrl && (
                      <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb', position: 'relative' }}>
                        {form.mediaUrl.startsWith('data:image') ? (
                          <img src={form.mediaUrl} alt="preview" style={{ width: '100%', height: 500, objectFit: 'cover', display: 'block' }} />
                        ) : (
                          <video src={form.mediaUrl} controls style={{ width: '100%', height: 500, objectFit: 'cover', display: 'block' }} />
                        )}
                        {/* Remove media button */}
                        <button
                          type="button"
                          onClick={clearMedia}
                          title="Remove"
                          style={{
                            position: 'absolute', top: 6, right: 6,
                            width: 22, height: 22,
                            borderRadius: '50%',
                            background: 'rgba(0,0,0,0.55)',
                            border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff',
                          }}>
                          <FiX size={11} />
                        </button>
                        {/* File name badge */}
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0,
                          padding: '4px 8px',
                          background: 'rgba(0,0,0,0.45)',
                          fontSize: 10.5, color: '#fff', fontWeight: 500,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {form.mediaName}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div style={{ borderTop: '1px solid #f1f5f9', margin: '2px 0' }} />

                {/* Date/Time + Reporter info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }} className="md:grid-cols-3">
                  <div>
                    <FieldLabel>Date & Time</FieldLabel>
                    <div style={{ position: 'relative' }}>
                      <FiClock size={13} color="#9ca3af" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                      <input type="datetime-local" value={`${form.date}T${form.time}`} readOnly
                        style={{ ...readOnlyInputStyle, paddingLeft: 32 }} />
                    </div>
                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Auto-filled to current time</p>
                  </div>

                  <div>
                    <FieldLabel>Reporter Name</FieldLabel>
                    <div style={{ position: 'relative' }}>
                      <FiUser size={13} color="#9ca3af" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                      <input type="text" value={form.reporterName} readOnly
                        style={{ ...readOnlyInputStyle, paddingLeft: 32 }} />
                    </div>
                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>From your profile</p>
                  </div>

                  <div>
                    <FieldLabel>Contact Number</FieldLabel>
                    <div style={{ position: 'relative' }}>
                      <FiPhone size={13} color="#9ca3af" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                      <input type="tel" value={form.contact} readOnly
                        style={{ ...readOnlyInputStyle, paddingLeft: 32 }} />
                    </div>
                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>From your profile</p>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit" disabled={submitted || submitting}
                  className="submit-btn"
                  style={{
                    marginTop: 4,
                    padding: '13px 0',
                    background: submitted
                      ? '#22c55e'
                      : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#fff', border: 'none', borderRadius: 12,
                    fontSize: 14, fontWeight: 700,
                    cursor: submitted ? 'not-allowed' : 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: '0.01em',
                    boxShadow: submitted ? 'none' : '0 4px 14px rgba(37,99,235,0.22)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                  }}>
                  {submitted
                    ? <><FiCheckCircle size={16} /> Submitted!</>
                    : <><FiAlertTriangle size={15} /> Submit Report</>
                  }
                </button>
              </form>
            </SectionCard>

          </main>
        </div>
        <MobileBottomNav />
      </div>
    </>
  )
}