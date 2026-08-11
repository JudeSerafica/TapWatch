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
import { OrbitProgress } from 'react-loading-indicators'
import L from 'leaflet'
import { useTranslation } from '../lib/i18n'
import ResidentSidebar from '../components/ResidentSidebar'
import MobileBottomNav from '../components/MobileBottomNav'
import TopBar from '../components/TopBar'
import SOSPanicModal from '../components/SOSPanicModal'
// ImageAuthenticityModal removed - only used by admins now
import { useAuth } from '../context/useAuth'
import { useSidebar } from '../context/SidebarContext'
import { eastTapinacGeoJSON } from '../data/EastTapinac'
import { createIncident, checkDuplicateIncident } from '../lib/database'
import { notifyAllAdmins } from '../lib/notificationService'
import { playReportAlarm } from '../lib/alarmService'
import { analyzeIncident, isEmergency, getRecommendedActions, checkImageAuthenticity } from '../lib/aiService'
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
      border: '1px solid #000',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.04)'
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 20px',
        borderBottom: '1px solid #e5e7eb',
        background: '#fafafa'
      }} className="section-card-header">
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: `${iconColor}14`,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} className="section-card-icon">
          <Icon size={15} color={iconColor} strokeWidth={2.2} />
        </div>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: '#111827' }} className="section-card-label">
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

/* ─── Main Component ─────────────────────────────────── */

export default function ReportIncident() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { profile } = useAuth()
  const { isCollapsed } = useSidebar()
  const [pin, setPin] = useState(null)
  const [reportMapSatellite, setReportMapSatellite] = useState(true)
  const [aiType, setAiType] = useState('')
  const [aiAnalysis, setAiAnalysis] = useState(null) // Store full AI analysis
  const [aiRecommendations, setAiRecommendations] = useState([]) // Store recommendations
  const [imageAuthenticity, setImageAuthenticity] = useState(null) // Store for database, admin reviews
  // showAuthenticityModal removed - only admins see this modal
  const [loadingAI, setLoadingAI] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [mismatchBlocked, setMismatchBlocked] = useState(false) // Blocks submit when description ≠ photo
  const aiDebounceTimer = useRef(null) // For debouncing auto-classification
  const [submitting, setSubmitting] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [sosModalOpen, setSOSModalOpen] = useState(false)
  const [notification, setNotification] = useState(null)
  const [boundaryError, setBoundaryError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [showInvalidImageModal, setShowInvalidImageModal] = useState(false)
  const [invalidImageData, setInvalidImageData] = useState(null)

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

  // Reset mismatch when a new file is uploaded
  setMismatchBlocked(false)
  setAiAnalysis(null)

  setForm(f => ({
    ...f,
    mediaFile: file,
    mediaName: file.name
  }))

  const reader = new FileReader()
  reader.onload = async (event) => {
    const dataUrl = event.target?.result
    
    // Update form state first
    setForm(f => ({ ...f, mediaUrl: dataUrl }))
    
    // 🤖 AUTO-ANALYZE when BOTH description AND image are ready
    if (file.type.startsWith('image/')) {
      console.log('📸 Image uploaded')
      
      // Capture description at this moment (avoid stale closure in setTimeout)
      const capturedDescription = form.description || ''
      
      setTimeout(() => {
        const hasDescription = capturedDescription.trim().length > 10
        
        if (hasDescription) {
          console.log('🤖 Both description and image ready - analyzing together...')
          showNotification('🤖 AI analyzing description + image...', 'success')
          analyzeImageDirectly(dataUrl, capturedDescription)
        } else {
          console.log('⏳ Image uploaded, waiting for description...')
          showNotification('✅ Image uploaded. Add description to analyze.', 'success')
        }
      }, 500)
    }
  }

  reader.readAsDataURL(file)
  e.target.value = ''
}

// 🆕 Analyze image + description together — accepts both as params to avoid stale closures
const analyzeImageDirectly = async (imageDataUrl, descriptionText) => {
  setLoadingAI(true)
  
  try {
    const currentDescription = descriptionText ?? form.description ?? ''
    console.log('🤖 Analyzing BOTH description + image with Gemini...')
    console.log('📝 Description:', currentDescription.substring(0, 50) + '...')
    console.log('📸 Image: Present (base64 data URL)')

    // Gemini 1.5 Flash accepts base64 data URLs natively — no upload needed
    const analysis = await analyzeIncident(currentDescription, imageDataUrl)

    console.log('✅ Combined Analysis Result:', analysis)

    // 🚫 CHECK IF IMAGE IS INCIDENT-RELATED
    const detectedType = analysis.combined.type
    const confidence = analysis.combined.confidence
    const detected = analysis.image?.detected || []
    const isIncidentRelated = analysis.image?.isIncidentRelated !== false // Use AI's determination
    const nonIncidentReason = analysis.image?.nonIncidentReason || ''
    
    // Additional fallback check: Look for non-incident keywords in detected objects
    const nonIncidentKeywords = ['selfie', 'face', 'portrait', 'food', 'meal', 'restaurant', 'party', 'celebration', 'vacation', 'travel', 'pet', 'animal', 'toy', 'game', 'person smiling', 'group photo']
    const hasNonIncidentContent = detected.some(item => 
      nonIncidentKeywords.some(keyword => item.toLowerCase().includes(keyword))
    )
    
    // 🔍 CHECK FOR MISMATCH between description and photo
    // Use INDIVIDUAL confidences from text and image analysis, not combined
    const textType = analysis.text?.type || 'Unknown'
    const imageType = analysis.image?.type || 'Unknown'
    const textConfidence = analysis.text?.confidence || 0
    const imageConfidence = analysis.image?.confidence || 0

    // Mismatch = both have a known type, both have decent confidence, but they disagree
    const hasMismatch = (
      textType !== 'Unknown' &&
      imageType !== 'Unknown' &&
      textType !== imageType &&
      textConfidence >= 0.4 &&   // text analysis is reasonably confident
      imageConfidence >= 0.4     // image analysis is reasonably confident
    )
    
    // 🔍 CHECK FOR MISMATCH — runs FIRST, before non-incident check
    // A fire photo is incident-related, but if description says "flood" it should still be blocked
    if (hasMismatch) {
      console.warn('⚠️ Mismatch detected! Text:', textType, '| Image:', imageType)
      console.warn('Text confidence:', textConfidence, '| Image confidence:', imageConfidence)
      
      showNotification('⚠️ Description and photo do not match — submission blocked', 'error')
      
      // Block submit and show modal
      setMismatchBlocked(true)
      setInvalidImageData({
        reason: `Description says "${textType}" but photo shows "${imageType}"`,
        detected: detected.slice(0, 5),
        mismatch: true,
        textType: textType,
        imageType: imageType,
        textAnalysis: analysis.text,
        imageAnalysis: analysis.image
      })
      setShowInvalidImageModal(true)
      
      setLoadingAI(false)
      return
    }

    // 🚫 BLOCK INAPPROPRIATE / NON-INCIDENT IMAGES (runs after mismatch check)
    if (!isIncidentRelated || hasNonIncidentContent || (detectedType === 'Unknown' && confidence < 0.4)) {
      console.warn('⚠️ Non-incident image detected!')
      
      const reason = nonIncidentReason || 
                     (hasNonIncidentContent ? detected.filter(item => 
                       nonIncidentKeywords.some(keyword => item.toLowerCase().includes(keyword))
                     ).join(', ') : 'Not an emergency/incident')
      
      showNotification('❌ This image does not appear to be incident-related', 'error')
      
      setInvalidImageData({
        reason: reason,
        detected: detected.slice(0, 5),
        mismatch: false
      })
      setShowInvalidImageModal(true)
      
      clearMedia()
      setLoadingAI(false)
      return
    }

    // ✅ IMAGE IS VALID - Continue with normal processing
    setMismatchBlocked(false) // Clear any previous mismatch block
    setAiType(analysis.combined.type)
    setAiAnalysis(analysis.combined)
    setForm(f => ({ ...f, type: analysis.combined.type }))

    // Get recommended actions
    const recommendations = getRecommendedActions(analysis.combined)
    setAiRecommendations(recommendations)

    // 📝 Store authenticity data in state (for admin review later)
    if (analysis.image) {
      const authenticityCheck = checkImageAuthenticity(analysis.image)
      console.log('🔍 Authenticity data stored (admin will review):', authenticityCheck)
      setImageAuthenticity(authenticityCheck)
    }

    // Show notification based on urgency
    if (analysis.combined.urgency === 'critical') {
      showNotification(`🚨 AI: ${analysis.combined.type} detected - CRITICAL!`, 'error')
    } else if (analysis.combined.urgency === 'high') {
      showNotification(`⚠️ AI: ${analysis.combined.type} - High Priority`, 'success')
    } else {
      showNotification(`✅ AI classified as ${analysis.combined.type}`, 'success')
    }

  } catch (error) {
    console.error('❌ Image Analysis error:', error)
    showNotification('Image analysis failed', 'error')
  } finally {
    setLoadingAI(false)
  }
}



  const clearMedia = () => {
    setForm(f => ({ ...f, mediaUrl: null, mediaName: '', mediaFile: null }))
    // Clear AI analysis when media is removed
    setAiAnalysis(null)
    setAiRecommendations([])
    setImageAuthenticity(null)
    setMismatchBlocked(false) // Allow submit again after photo is removed/replaced
  }

  // 🤖 AUTOMATIC AI Classification (no button click needed!)
  const classifyAI = async (silent = false) => {
    // Minimum requirements for analysis
    const hasEnoughData = (form.description && form.description.trim().length > 10) || form.mediaUrl
    
    if (!hasEnoughData) {
      return // Not enough data to analyze yet
    }

    setLoadingAI(true)
    
    try {
      console.log('🤖 Auto-analyzing incident...')
      console.log('- Description:', form.description?.substring(0, 50) + '...')
      console.log('- Has Image:', !!form.mediaUrl)

      // Analyze both text and image
      const analysis = await analyzeIncident(
        form.description,
        form.mediaUrl // Pass image if available
      )

      console.log('✅ AI Analysis Result:', analysis)

      // Update state with AI results
      setAiType(analysis.combined.type)
      setAiAnalysis(analysis.combined)
      setForm(f => ({ ...f, type: analysis.combined.type }))

      // Get recommended actions
      const recommendations = getRecommendedActions(analysis.combined)
      setAiRecommendations(recommendations)

      // 🔍 Store image authenticity if image was analyzed (no modal for users)
      if (analysis.image && form.mediaUrl) {
        const authenticityCheck = checkImageAuthenticity(analysis.image)
        setImageAuthenticity(authenticityCheck)
        
        console.log('🔍 Image Authenticity stored (admin will review):', authenticityCheck)
        
        // ❌ NO MODAL for users - only admins see this in All Reports page
      }

      // Show notification based on urgency (unless silent)
      if (!silent) {
        if (analysis.combined.urgency === 'critical') {
          showNotification(`🚨 AI: ${analysis.combined.type} detected - CRITICAL!`, 'error')
        } else if (analysis.combined.urgency === 'high') {
          showNotification(`⚠️ AI: ${analysis.combined.type} - High Priority`, 'success')
        } else {
          showNotification(`✅ AI classified as ${analysis.combined.type}`, 'success')
        }
      }

    } catch (error) {
      console.error('❌ AI Classification error:', error)
      
      // Fallback to simple keyword matching (silent fallback)
      const text = (form.description || '').toLowerCase()
      let t = ''
      if (text.includes('sunog') || text.includes('fire') || text.includes('apoy')) t = 'Fire'
      else if (text.includes('baha') || text.includes('tubig') || text.includes('flood')) t = 'Flood'
      else if (text.includes('bangga') || text.includes('aksidente') || text.includes('accident') || text.includes('motor')) t = 'Accident'
      else if (text.includes('nakaw') || text.includes('theft') || text.includes('robbery') || text.includes('crime')) t = 'Crime'
      else if (text.includes('ingay') || text.includes('away') || text.includes('disturbance')) t = 'Disturbance'
      else t = 'Accident'
      
      if (t) {
        setAiType(t)
        setForm(f => ({ ...f, type: t }))
      }
    } finally {
      setLoadingAI(false)
    }
  }

  // 🎯 AUTO-CLASSIFY: Only trigger when image is uploaded AND description is ready.
  // Does NOT re-run on every keystroke to avoid burning API quota.
  // Re-runs only when mediaUrl changes (new image uploaded).
  useEffect(() => {
    if (aiDebounceTimer.current) {
      clearTimeout(aiDebounceTimer.current)
    }

    const hasImage = !!form.mediaUrl
    const hasDescription = form.description && form.description.trim().length > 15

    if (hasImage && hasDescription && !loadingAI) {
      const capturedDescription = form.description
      const capturedMediaUrl = form.mediaUrl

      // 3 second debounce — fires once after image upload settles
      aiDebounceTimer.current = setTimeout(() => {
        console.log('🤖 Image uploaded + description ready — running AI analysis once...')
        showNotification('🤖 AI analyzing description + image...', 'success')
        analyzeImageDirectly(capturedMediaUrl, capturedDescription)
      }, 3000)
    }

    return () => {
      if (aiDebounceTimer.current) clearTimeout(aiDebounceTimer.current)
    }
  }, [form.mediaUrl]) // ← Only fires when the IMAGE changes, not every keystroke

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

  // ✅ CHECK VERIFICATION STATUS FIRST
  if (!profile?.verification_status || profile.verification_status === 'unverified') {
    setShowVerificationModal(true)
    return
  }

  // 🚫 BLOCK SUBMISSION IF MISMATCH IS DETECTED
  if (mismatchBlocked) {
    showNotification('⚠️ Fix the description-photo mismatch before submitting', 'error')
    return
  }

  // ✅ REQUIRED FIELDS VALIDATION
  if (!form.type || !form.description) {
    showNotification('Please fill in required fields.', 'error')
    return
  }

  // 🗺️ REQUIRED: Map pin location
  if (!pin) {
    showNotification('📍 Please pin the incident location on the map', 'error')
    setBoundaryError('Please place a pin on the map to mark the incident location')
    setTimeout(() => setBoundaryError(''), 3000)
    return
  }

  // 📸 REQUIRED: Photo evidence
  if (!form.mediaFile && !form.mediaUrl) {
    showNotification('📸 Photo evidence is required', 'error')
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

      // 🤖 AI Analysis Data - COMMENTED OUT until database columns are added
      // These fields need to be added to the database schema first
      // ai_classification: aiAnalysis?.type || aiType || form.type || null,
      // ai_confidence: aiAnalysis?.confidence ? Number(aiAnalysis.confidence) : (aiType ? 0.85 : null),
      // urgency_level: aiAnalysis?.urgency || null,
      // ai_detected_objects: aiAnalysis?.detected?.length > 0 ? aiAnalysis.detected.join(', ') : null,
      // ai_reasoning: aiAnalysis?.reasoning || null,
      // ai_source: aiAnalysis?.source || null,
      
      // 🔍 Image Authenticity Data - COMMENTED OUT until database columns are added
      // Uncomment after running the SQL migration in AUTHENTICITY_DATABASE_SETUP.md
      // image_is_authentic: imageAuthenticity?.isAuthentic !== false,
      // image_authenticity_confidence: imageAuthenticity?.confidence || null,
      // image_source_type: imageAuthenticity?.imageSource || null,
      // manipulation_detected: imageAuthenticity?.manipulationDetected || false,
      // fakeness_indicators: imageAuthenticity?.indicators?.join(', ') || null,
      // requires_manual_review: imageAuthenticity && !imageAuthenticity.isAuthentic,

      reporter_name:
        form.reporterName || profile?.full_name || 'Anonymous',

      reporter_contact:
        form.contact || profile?.phone || null,
    }

    console.log('Incident data:', incidentData)
    
    // 📝 Log AI Classification data separately (not saved to DB yet - awaiting schema update)
    if (aiAnalysis || aiType) {
      console.log('🤖 AI Classification (not saved to DB - awaiting schema update):', {
        type: aiAnalysis?.type || aiType || form.type,
        confidence: aiAnalysis?.confidence || (aiType ? 0.85 : 0),
        urgency: aiAnalysis?.urgency || 'medium',
        detected: aiAnalysis?.detected || [],
        reasoning: aiAnalysis?.reasoning || 'Manual classification',
        source: aiAnalysis?.source || 'manual'
      })
    }
    
    // 📝 Log authenticity data separately (not saved to DB yet - awaiting schema update)
    if (imageAuthenticity) {
      console.log('🔍 Image Authenticity (not saved to DB - awaiting schema update):', {
        isAuthentic: imageAuthenticity.isAuthentic,
        confidence: imageAuthenticity.confidence,
        imageSource: imageAuthenticity.imageSource,
        manipulationDetected: imageAuthenticity.manipulationDetected,
        indicators: imageAuthenticity.indicators,
        requiresReview: !imageAuthenticity.isAuthentic
      })
    }

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

    // 🔊 Play report alarm sound for admin notification
    playReportAlarm()

    // Notify admins about new incident
    await notifyAllAdmins({
      title: `New ${form.type} Incident`,
      message: `A new ${form.type} incident has been reported at ${location}. Reporter: ${incidentData.reporter_name}`,
      type: 'alert',
      incidentId: data.id
    })

    notifyAdmin(data)

    setSubmitted(true)
    setShowSuccessModal(true)

    setTimeout(() => {
      navigate('/dashboard')
    }, 3000)

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
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        
        /* ── RESPONSIVE: Tablet (768px to 1023px) ── */
        @media (min-width: 768px) and (max-width: 1023px) {
          .report-content-wrapper {
            margin-left: 0 !important;
            width: 100% !important;
            padding-bottom: 100px !important;
          }
          .report-grid {
            grid-template-columns: 1fr !important;
          }
          .report-map-container {
            height: 300px !important;
          }
          main {
            padding: 16px 16px !important;
          }
          .report-header h2 {
            font-size: 18px !important;
          }
          /* Desktop/Tablet: Single line for reporter info */
          .reporter-info-grid {
            grid-template-columns: 1fr 1fr 1fr !important;
            gap: 12px !important;
          }
        }
        
        /* ── RESPONSIVE: Desktop (min-width: 1024px) ── */
        @media (min-width: 1024px) {
          /* Desktop: Single line for reporter info */
          .reporter-info-grid {
            grid-template-columns: 1fr 1fr 1fr !important;
            gap: 12px !important;
          }
        }
        
        /* ── RESPONSIVE: Mobile (max-width: 768px) ── */
        @media (max-width: 767px) {
          .report-content-wrapper {
            margin-left: 0 !important;
            width: 100% !important;
            padding-bottom: 100px !important;
          }
          .report-grid {
            grid-template-columns: 1fr !important;
          }
          main {
            padding: 12px 12px !important;
          }
          .report-map-container {
            height: 280px !important;
          }
          .report-header h2 {
            font-size: 16px !important;
          }
          .report-header {
            gap: 8px !important;
          }
          .report-header-icon {
            width: 36px !important;
            height: 36px !important;
          }
          .report-header-icon svg {
            width: 16px !important;
            height: 16px !important;
          }
          /* Mobile: Keep stacked layout (default single column) */
          .reporter-info-grid {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }
          /* Mobile: Keep incident type buttons in single line, allow horizontal scroll */
          .incident-type-grid {
            grid-template-columns: repeat(5, 1fr) !important;
            gap: 4px !important;
          }
          .type-pill {
            font-size: 10.5px !important;
            padding: 6px 6px !important;
            gap: 3px !important;
          }
          /* Mobile: Smaller section card headers */
          .section-card-header {
            padding: 10px 14px !important;
            gap: 8px !important;
          }
          .section-card-icon {
            width: 24px !important;
            height: 24px !important;
          }
          .section-card-icon svg {
            width: 12px !important;
            height: 12px !important;
          }
          .section-card-label {
            font-size: 11px !important;
          }
          /* Mobile: Smaller text inside Incident Details container */
          .ri-textarea {
            font-size: 12px !important;
            padding: 8px 12px !important;
            min-height: 80px !important;
          }
          .ri-input {
            font-size: 12px !important;
            padding: 8px 12px !important;
          }
          label {
            font-size: 10px !important;
            margin-bottom: 4px !important;
          }
          input[type="text"],
          input[type="tel"],
          input[type="datetime-local"],
          textarea {
            font-size: 11px !important;
            padding: 8px 10px !important;
          }
          /* Fix icon overlap - ensure proper spacing for inputs with icons */
          .input-with-icon {
            padding-left: 30px !important;
            font-size: 11px !important;
          }
          /* Make icons slightly smaller on mobile */
          .input-icon {
            left: 10px !important;
          }
          .input-icon svg {
            width: 11px !important;
            height: 11px !important;
          }
          input[type="text"] + p,
          input[type="tel"] + p,
          input[type="datetime-local"] + p {
            font-size: 9px !important;
            margin-top: 2px !important;
          }
          .media-btn {
            font-size: 11px !important;
            padding: 8px 12px !important;
          }
          button[type="submit"] {
            font-size: 12px !important;
            padding: 11px 0 !important;
          }
        }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif" }}>
        <ResidentSidebar />
        <div className={`
          report-content-wrapper transition-all duration-300
          ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}
        `} style={{ flex: 1, paddingBottom: 0 }}>
           <TopBar title="Incident Report" showNotifications={true}
            onNotificationClick={() => {
              // Handle notification click - you can open a modal or navigate
              console.log('Notification clicked')
            }}
          >
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

          {/* SOS Modal */}
          <SOSPanicModal 
            isOpen={sosModalOpen} 
            onClose={() => setSOSModalOpen(false)} 
            profile={profile}
          />

          {/* Image Authenticity Modal removed from user page - only for admins */}

          <main style={{ 
  padding: '24px 28px', 
  maxWidth: 1500, 
  margin: '0 auto', 
  display: 'flex', 
  flexDirection: 'column', 
  gap: 20 
}}>
  

  {/* Page Header */}
  <div style={{ paddingBottom: 0, marginBottom: -20  }} className="report-header">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div>
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

  {/* AI Auto-Classification Status Banner */}
  {/* AI WAITING Indicator - Both description and photo needed */}
  {!loadingAI && !aiAnalysis && form.description && form.description.trim().length > 10 && !form.mediaUrl && (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 18px',
      background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
      border: '1px solid #fbbf24',
      borderRadius: 12,
      marginBottom: 8
    }}>
      <FiCamera size={18} color="#d97706" />
      <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>
        📸 Add photo evidence to begin AI analysis...
      </span>
    </div>
  )}

  {!loadingAI && !aiAnalysis && form.mediaUrl && (!form.description || form.description.trim().length < 10) && (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 18px',
      background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
      border: '1px solid #fbbf24',
      borderRadius: 12,
      marginBottom: 8
    }}>
      <FiFileText size={18} color="#d97706" />
      <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>
        📝 Add description (10+ chars) to begin AI analysis...
      </span>
    </div>
  )}

  {/* AI ANALYZING Indicator */}
  {loadingAI && (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 18px',
      background: 'linear-gradient(135deg, #ede9fe 0%, #f3e8ff 100%)',
      border: '1px solid #d8b4fe', borderRadius: 12,
      animation: 'pulse 2s ease-in-out infinite'
    }}>
      <RiSparklingFill size={18} color="#7c3aed" className="animate-spin" />
      <span style={{ fontSize: 13, fontWeight: 600, color: '#6d28d9' }}>
        🤖 AI analyzing description + image together...
      </span>
    </div>
  )}

  {/* AI Classification Result Banner */}
  {aiAnalysis && !loadingAI && (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 18px',
      background: aiAnalysis.urgency === 'critical' 
        ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)'
        : aiAnalysis.urgency === 'high'
        ? 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)'
        : 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
      border: aiAnalysis.urgency === 'critical'
        ? '1px solid #fca5a5'
        : aiAnalysis.urgency === 'high'
        ? '1px solid #fb923c'
        : '1px solid #93c5fd',
      borderRadius: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <RiSparklingFill size={18} color={
          aiAnalysis.urgency === 'critical' ? '#dc2626' :
          aiAnalysis.urgency === 'high' ? '#ea580c' : '#2563eb'
        } />
        <div>
          <span style={{ 
            fontSize: 13, 
            fontWeight: 600, 
            color: aiAnalysis.urgency === 'critical' ? '#991b1b' :
                   aiAnalysis.urgency === 'high' ? '#9a3412' : '#1e40af'
          }}>
            ✅ AI Classified: {aiAnalysis.type}
          </span>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
            Confidence: {Math.round(aiAnalysis.confidence * 100)}% • 
            Urgency: {aiAnalysis.urgency.toUpperCase()}
            {aiAnalysis.source && ` • Source: ${aiAnalysis.source}`}
          </div>
        </div>
      </div>
    </div>
  )}

  {/* Image Authenticity Warning Banner - REMOVED (admin only feature) */}

  {/* Image Authenticity Success Banner - REMOVED (admin only feature) */}

  {/* ── Two-column layout: Map LEFT | Incident Details RIGHT ── */}
  <div style={{
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
    alignItems: 'start',   /* tops aligned */
  }} className="report-grid">

    {/* LEFT — Map Section (unchanged) */}
    <SectionCard icon={FiMapPin} label="Pin the Location" iconColor="#2563eb">
      <div style={{ height: '560px', position: 'relative' }} className="report-map-container">
        <MapContainer center={[14.835, 120.283]} zoom={16} style={{ height: '100%', width: '100%', zIndex: 1 }}>
          {reportMapSatellite ? (
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
              maxZoom={19}
            />
          ) : (
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          )}
          <MapBoundsHandler />
          <MapClickHandler onClick={handleMapClick} onBoundaryError={handleBoundaryError} />
          {pin && <Marker position={pin} icon={pinIcon} />}
        </MapContainer>

        {/* Satellite/Street Toggle */}
        <div style={{
          position: 'absolute', top: 10, right: 10, zIndex: 1000,
          display: 'flex', borderRadius: 8, overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.3)'
        }}>
          <button
            type="button"
            onClick={() => setReportMapSatellite(false)}
            style={{
              padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: 'none', transition: 'all 0.2s',
              background: !reportMapSatellite ? '#2563eb' : 'rgba(255,255,255,0.9)',
              color: !reportMapSatellite ? '#fff' : '#374151',
            }}
          >Street</button>
          <button
            type="button"
            onClick={() => setReportMapSatellite(true)}
            style={{
              padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: 'none', transition: 'all 0.2s',
              background: reportMapSatellite ? '#2563eb' : 'rgba(255,255,255,0.9)',
              color: reportMapSatellite ? '#fff' : '#374151',
            }}
          >Satellite</button>
        </div>
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

    {/* RIGHT — Incident Details */}
    <SectionCard icon={FiFileText} label="Incident Details" iconColor="#2563eb">
      <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Description */}
        <div>
          <FieldLabel required>Description</FieldLabel>
          <textarea
            required rows={4}
            value={form.description}
            onChange={e => {
              setForm({ ...form, description: e.target.value })
              // If user edits description after a mismatch, allow re-analysis
              if (mismatchBlocked) setMismatchBlocked(false)
            }}
            className="ri-textarea"
            placeholder="Describe what happened… (e.g. May banggaan ng motor sa highway)"
            style={{
              ...inputStyle, resize: 'vertical', minHeight: 80,
              lineHeight: 1.0, fontFamily: "'DM Sans', sans-serif",
              borderColor: mismatchBlocked ? '#f59e0b' : undefined,
              boxShadow: mismatchBlocked ? '0 0 0 3px rgba(245,158,11,0.15)' : undefined
            }}
          />
          {mismatchBlocked && (
            <p style={{ fontSize: 11, color: '#d97706', marginTop: 4, fontWeight: 600 }}>
              ✏️ Edit description to match your photo, then click{' '}
              <button
                type="button"
                onClick={() => {
                  if (form.mediaUrl && form.description?.trim().length > 10) {
                    setMismatchBlocked(false)
                    showNotification('🤖 Re-analyzing...', 'success')
                    analyzeImageDirectly(form.mediaUrl, form.description)
                  }
                }}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  color: '#d97706', fontWeight: 700, cursor: 'pointer',
                  textDecoration: 'underline', fontSize: 11
                }}
              >
                Re-analyze
              </button>
            </p>
          )}
        </div>

        {/* Incident Type */}
        <div>
          <FieldLabel required>Incident Type</FieldLabel>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(5, 1fr)', 
            gap: 8, 
            marginTop: 4 
          }} className="incident-type-grid">
            {incidentTypes.map(type => {
              const cfg = typeConfig[type]
              const selected = form.type === type
              return (
                <button
                  key={type} type="button"
                  className="type-pill"
                  onClick={() => setForm({ ...form, type })}
                  style={{
                    padding: '8px 10px', 
                    borderRadius: 20,
                    border: selected ? `1.5px solid ${cfg.color}` : '1.5px solid #e5e7eb',
                    background: selected ? cfg.bg : '#fff',
                    color: selected ? cfg.color : '#6b7280',
                    fontSize: 12.5, 
                    fontWeight: selected ? 700 : 500,
                    cursor: 'pointer', 
                    fontFamily: "'DM Sans', sans-serif",
                    boxShadow: selected ? `0 0 0 3px ${cfg.color}18` : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    whiteSpace: 'nowrap'
                  }}>
                  {cfg.icon} {type}
                </button>
              )
            })}
          </div>
          {/* hidden select for form validation */}
          <select required value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}>
            <option value="">Select type</option>
            {incidentTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>

        {/* Attach Media — full width on right panel */}
        <div>
          <FieldLabel>Attach Media</FieldLabel>
          <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
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
              <input type="file" accept="image/*,video/*" onChange={handleFileChange} style={{ display: 'none' }} />
            </label>
            <CameraMenu onFileChange={handleFileChange} />
          </div>

          {form.mediaName && form.mediaUrl && (
            <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb', position: 'relative' }}>
              {form.mediaUrl.startsWith('data:image') ? (
                <img src={form.mediaUrl} alt="preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
              ) : (
                <video src={form.mediaUrl} controls style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
              )}
              <button type="button" onClick={clearMedia} title="Remove" style={{
                position: 'absolute', top: 6, right: 6, width: 22, height: 22,
                borderRadius: '50%', background: 'rgba(0,0,0,0.55)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
              }}>
                <FiX size={11} />
              </button>
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '4px 8px', background: 'rgba(0,0,0,0.45)',
                fontSize: 10.5, color: '#fff', fontWeight: 500,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {form.mediaName}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #f1f5f9', margin: '2px 0' }} />

        {/* MISMATCH WARNING BANNER - Shown inline when blocked */}
        {mismatchBlocked && (
          <div style={{
            padding: '14px 18px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            border: '2px solid #f59e0b',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            animation: 'slideDown 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <FiAlertTriangle size={22} color="#d97706" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#92400e',
                  fontFamily: "'DM Sans', sans-serif"
                }}>
                  ⚠️ Submission Blocked - Mismatch Detected
                </p>
                <p style={{
                  margin: '2px 0 0',
                  fontSize: 12,
                  color: '#78350f',
                  fontFamily: "'DM Sans', sans-serif"
                }}>
                  Your description and photo do not match
                </p>
              </div>
            </div>

            <div style={{
              background: '#fff',
              borderRadius: 10,
              padding: '12px 14px',
              border: '1px solid #fbbf24'
            }}>
              <p style={{
                margin: '0 0 8px',
                fontSize: 12,
                fontWeight: 600,
                color: '#92400e',
                fontFamily: "'DM Sans', sans-serif"
              }}>
                To proceed, please do ONE of the following:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'start', gap: 8 }}>
                  <span style={{ color: '#d97706', fontWeight: 700, fontSize: 13 }}>1.</span>
                  <span style={{ fontSize: 12, color: '#78350f' }}>
                    <strong>Edit your description</strong> to match the photo, then click{' '}
                    <button
                      type="button"
                      onClick={() => {
                        if (form.mediaUrl && form.description?.trim().length > 10) {
                          setMismatchBlocked(false)
                          showNotification('🤖 Re-analyzing...', 'success')
                          analyzeImageDirectly(form.mediaUrl, form.description)
                        }
                      }}
                      style={{
                        background: 'none', border: 'none', padding: 0,
                        color: '#d97706', fontWeight: 700, cursor: 'pointer',
                        textDecoration: 'underline', fontSize: 12
                      }}
                    >
                      Re-analyze
                    </button>
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'start', gap: 8 }}>
                  <span style={{ color: '#d97706', fontWeight: 700, fontSize: 13 }}>2.</span>
                  <span style={{ fontSize: 12, color: '#78350f' }}>
                    <strong>Replace the photo</strong> with one that matches your description
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Date/Time + Reporter info — single line on desktop/tablet, stacked on mobile */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }} className="reporter-info-grid">
          <div>
            <FieldLabel>Date & Time</FieldLabel>
            <div style={{ position: 'relative' }}>
              <FiClock size={13} color="#9ca3af" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} className="input-icon" />
              <input type="datetime-local" value={`${form.date}T${form.time}`} readOnly
                style={{ ...readOnlyInputStyle, paddingLeft: 32 }} className="input-with-icon" />
            </div>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Auto-filled to current time</p>
          </div>

          <div>
            <FieldLabel>Reporter Name</FieldLabel>
            <div style={{ position: 'relative' }}>
              <FiUser size={13} color="#9ca3af" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} className="input-icon" />
              <input type="text" value={form.reporterName} readOnly
                style={{ ...readOnlyInputStyle, paddingLeft: 32 }} className="input-with-icon" />
            </div>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>From your profile</p>
          </div>

          <div>
            <FieldLabel>Contact Number</FieldLabel>
            <div style={{ position: 'relative' }}>
              <FiPhone size={13} color="#9ca3af" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} className="input-icon" />
              <input type="tel" value={form.contact} readOnly
                style={{ ...readOnlyInputStyle, paddingLeft: 32 }} className="input-with-icon" />
            </div>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>From your profile</p>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit" 
          disabled={submitted || submitting || !pin || !form.mediaUrl || mismatchBlocked}
          className="submit-btn"
          style={{
            marginTop: 4,
            padding: '13px 0',
            background: submitted ? '#22c55e' : 
                       mismatchBlocked ? '#f59e0b' :
                       (!pin || !form.mediaUrl) ? '#9ca3af' :
                       'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: '#fff', border: 'none', borderRadius: 12,
            fontSize: 14, fontWeight: 700,
            cursor: (submitted || submitting || !pin || !form.mediaUrl || mismatchBlocked) ? 'not-allowed' : 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            letterSpacing: '0.01em',
            boxShadow: submitted ? 'none' : mismatchBlocked ? '0 4px 14px rgba(245,158,11,0.3)' : (!pin || !form.mediaUrl) ? 'none' : '0 4px 14px rgba(37,99,235,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: (submitted || submitting || !pin || !form.mediaUrl || mismatchBlocked) ? 0.75 : 1
          }}>
          {submitting
            ? 'Submitting...'
            : submitted
            ? <><FiCheckCircle size={16} /> Submitted!</>
            : mismatchBlocked
            ? <><FiAlertTriangle size={15} /> Fix Mismatch to Submit</>
            : (!pin || !form.mediaUrl)
            ? <><FiXCircle size={15} /> {!pin && !form.mediaUrl ? 'Pin Location & Add Photo Required' : !pin ? 'Pin Location Required' : 'Photo Required'}</>
            : <><FiAlertTriangle size={15} /> Submit Report</>
          }
        </button>

        {/* Requirements Helper Text */}
        {(!pin || !form.mediaUrl || mismatchBlocked) && !submitted && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-semibold text-amber-800 mb-2">📋 Required before submitting:</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {pin ? (
                  <FiCheckCircle size={14} className="text-green-600" />
                ) : (
                  <FiXCircle size={14} className="text-red-600" />
                )}
                <span className={`text-xs ${pin ? 'text-green-700' : 'text-red-700'}`}>
                  Pin incident location on map
                </span>
              </div>
              <div className="flex items-center gap-2">
                {form.mediaUrl ? (
                  <FiCheckCircle size={14} className="text-green-600" />
                ) : (
                  <FiXCircle size={14} className="text-red-600" />
                )}
                <span className={`text-xs ${form.mediaUrl ? 'text-green-700' : 'text-red-700'}`}>
                  Upload photo evidence
                </span>
              </div>
              {mismatchBlocked && (
                <div className="flex items-center gap-2">
                  <FiAlertTriangle size={14} color="#d97706" />
                  <span className="text-xs text-amber-700 font-semibold">
                    Fix description-photo mismatch (edit description or replace photo)
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

      </form>
    </SectionCard>

  </div>{/* end two-column grid */}

</main>
        </div>
        <MobileBottomNav />
      </div>

      {/* VERIFICATION REQUIRED MODAL */}
      {showVerificationModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          padding: 16,
          animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 20,
            maxWidth: 480,
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            animation: 'scaleIn 0.3s ease',
            overflow: 'hidden',
          }}>
            {/* Header with gradient */}
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              padding: '24px',
              textAlign: 'center',
              position: 'relative',
            }}>
              <div style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                animation: 'bounce 1s infinite',
              }}>
                <span style={{ fontSize: 40 }}>🛡️</span>
              </div>
              <h2 style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 700,
                color: '#fff',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                Verification Required
              </h2>
            </div>

            {/* Body */}
            <div style={{
              padding: '32px 24px',
              textAlign: 'center',
            }}>
              <p style={{
                margin: '0 0 24px',
                fontSize: 16,
                lineHeight: 1.6,
                color: '#374151',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                You need to <strong style={{ color: '#f59e0b' }}>verify your identity</strong> before you can submit incident reports. This helps us maintain trust and credibility in our community.
              </p>

              {/* Benefits list */}
              <div style={{
                background: '#fffbeb',
                border: '1px solid #fbbf24',
                borderRadius: 12,
                padding: '16px',
                marginBottom: 24,
                textAlign: 'left',
              }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#92400e',
                  marginBottom: 12,
                  textAlign: 'center',
                }}>
                  ✨ Verification Benefits:
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>✅</span>
                    <span style={{ fontSize: 13, color: '#78350f' }}>Submit incident reports</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🏆</span>
                    <span style={{ fontSize: 13, color: '#78350f' }}>Earn reputation points</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🎖️</span>
                    <span style={{ fontSize: 13, color: '#78350f' }}>Get verified badge</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🤝</span>
                    <span style={{ fontSize: 13, color: '#78350f' }}>Build community trust</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}>
                <button
                  onClick={() => {
                    setShowVerificationModal(false)
                    navigate('/verification')
                  }}
                  style={{
                    width: '100%',
                    padding: '14px 24px',
                    border: 'none',
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.5)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.4)'
                  }}
                >
                  <span style={{ fontSize: 18 }}>🛡️</span>
                  Get Verified Now
                </button>

                <button
                  onClick={() => setShowVerificationModal(false)}
                  style={{
                    width: '100%',
                    padding: '12px 24px',
                    border: '1.5px solid #e5e7eb',
                    borderRadius: 12,
                    background: '#fff',
                    color: '#6b7280',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f9fafb'
                    e.currentTarget.style.borderColor = '#d1d5db'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fff'
                    e.currentTarget.style.borderColor = '#e5e7eb'
                  }}
                >
                  Maybe Later
                </button>
              </div>

              <p style={{
                margin: '16px 0 0',
                fontSize: 12,
                color: '#9ca3af',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                Verification takes less than 2 minutes
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { 
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to { 
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>

      {/* LOADING MODAL */}
      {submitting && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4">
            <OrbitProgress color="#2563eb" size="medium" />
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Submitting Report</h3>
              <p className="text-sm text-gray-500">Please wait...</p>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL (CENTER) */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <style>{`
            @keyframes report-fadeInScale {
              0% { opacity: 0; transform: scale(0.85); }
              100% { opacity: 1; transform: scale(1); }
            }
            @keyframes report-ripple {
              0% { transform: scale(0.8); opacity: 1; }
              100% { transform: scale(2.6); opacity: 0; }
            }
            @keyframes report-checkDraw {
              0% { stroke-dashoffset: 100; }
              100% { stroke-dashoffset: 0; }
            }
            @keyframes report-fadeInUp {
              0% { opacity: 0; transform: translateY(18px); }
              100% { opacity: 1; transform: translateY(0); }
            }
            @keyframes report-slideIn {
              0% { opacity: 0; transform: translateX(-14px); }
              100% { opacity: 1; transform: translateX(0); }
            }
            .report-wrap { animation: report-fadeInScale 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
            .report-r1 { animation: report-ripple 1.8s ease-out infinite; }
            .report-r2 { animation: report-ripple 1.8s ease-out 0.6s infinite; }
            .report-r3 { animation: report-ripple 1.8s ease-out 1.2s infinite; }
            .report-check { stroke-dasharray: 100; stroke-dashoffset: 100; animation: report-checkDraw 0.55s ease forwards 0.45s; }
            .report-t1 { animation: report-fadeInUp 0.45s ease forwards 0.75s; opacity: 0; }
            .report-t2 { animation: report-fadeInUp 0.45s ease forwards 0.95s; opacity: 0; }
            .report-i1 { animation: report-slideIn 0.4s ease forwards 1.05s; opacity: 0; }
            .report-i2 { animation: report-slideIn 0.4s ease forwards 1.2s; opacity: 0; }
            .report-i3 { animation: report-slideIn 0.4s ease forwards 1.35s; opacity: 0; }
            .report-f1 { animation: report-fadeInUp 0.4s ease forwards 1.55s; opacity: 0; }
          `}</style>

          <div className="report-wrap bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* TOP — green section with ripple + checkmark */}
            <div className="bg-green-600 pt-10 pb-8 px-8 text-center relative">
              <div className="relative w-32 h-32 mx-auto mb-5">
                <div className="report-r1 absolute inset-0 rounded-full border-2 border-white/50" />
                <div className="report-r2 absolute inset-0 rounded-full border-2 border-white/35" />
                <div className="report-r3 absolute inset-0 rounded-full border-2 border-white/20" />
                <div className="absolute inset-3 bg-white/20 rounded-full flex items-center justify-center">
                  <svg width="54" height="54" viewBox="0 0 54 54" fill="none">
                    <path
                      className="report-check"
                      d="M11 28L22 39L43 17"
                      stroke="white"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              <h2 className="report-t1 text-white text-2xl font-bold mb-1">Report Submitted!</h2>
              <p className="report-t2 text-white/80 text-sm">Admin has been notified</p>
            </div>

            {/* BOTTOM — checklist + footer */}
            <div className="px-6 pt-5 pb-6">
              <div className="bg-green-50 rounded-xl p-4 mb-4 space-y-2.5">
                <div className="report-i1 flex items-center gap-3 text-gray-800 text-sm">
                  <span className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center text-white text-[11px] flex-shrink-0">✓</span>
                  Report successfully submitted
                </div>
                <div className="report-i2 flex items-center gap-3 text-gray-800 text-sm">
                  <span className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center text-white text-[11px] flex-shrink-0">✓</span>
                  Barangay admin notified
                </div>
                <div className="report-i3 flex items-center gap-3 text-gray-800 text-sm">
                  <span className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center text-white text-[11px] flex-shrink-0">✓</span>
                  You will receive updates
                </div>
              </div>

              <p className="report-f1 text-gray-600 text-xs text-center mb-4 leading-relaxed">
                Redirecting to dashboard...
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* SOS PANIC BUTTON MODAL */}
      <SOSPanicModal
        isOpen={sosModalOpen}
        onClose={() => setSOSModalOpen(false)}
        profile={profile}
      />

      {/* INVALID IMAGE MODAL - NOT INCIDENT-RELATED OR MISMATCH */}
      {showInvalidImageModal && invalidImageData && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => {
            setShowInvalidImageModal(false)
            // Only clear media if it's not a mismatch (user might want to fix description instead)
            if (!invalidImageData.mismatch) {
              clearMedia()
            }
          }}
        >
          <div 
            className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border-2"
            style={{ 
              borderColor: invalidImageData.mismatch ? '#f59e0b' : '#ef4444',
              animation: 'scaleIn 0.3s ease' 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div 
              className="px-6 py-5 flex items-center gap-4"
              style={{
                background: invalidImageData.mismatch 
                  ? 'linear-gradient(to right, #f59e0b, #d97706)'
                  : 'linear-gradient(to right, #ef4444, #dc2626)'
              }}
            >
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
                {invalidImageData.mismatch ? (
                  <FiAlertTriangle size={32} className="text-white" />
                ) : (
                  <FiXCircle size={32} className="text-white" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-xl">
                  {invalidImageData.mismatch ? 'DESCRIPTION & PHOTO MISMATCH' : 'NOT INCIDENT-RELATED'}
                </h3>
                <p className="text-white/90 text-sm">
                  {invalidImageData.mismatch 
                    ? 'Description and photo do not match' 
                    : 'This image cannot be used for reporting'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowInvalidImageModal(false)
                  if (!invalidImageData.mismatch) {
                    clearMedia()
                  }
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition"
              >
                <FiX size={20} className="text-white" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              
              {/* MISMATCH DETAILS */}
              {invalidImageData.mismatch && (
                <div className="space-y-4">
                  {/* Comparison Box */}
                  <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-lg p-4">
                    <p className="text-sm font-semibold text-amber-400 mb-3">
                      What we detected:
                    </p>
                    
                    <div className="space-y-3">
                      {/* Description Analysis */}
                      <div className="bg-gray-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <FiFileText size={14} className="text-blue-400" />
                          <span className="text-xs font-semibold text-gray-400">YOUR DESCRIPTION SAYS:</span>
                        </div>
                        <p className="text-white font-bold text-base">{invalidImageData.textType}</p>
                        {invalidImageData.textAnalysis?.keywords && (
                          <p className="text-gray-400 text-xs mt-1">
                            Keywords: {invalidImageData.textAnalysis.keywords.join(', ')}
                          </p>
                        )}
                      </div>

                      {/* Photo Analysis */}
                      <div className="bg-gray-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <FiCamera size={14} className="text-purple-400" />
                          <span className="text-xs font-semibold text-gray-400">YOUR PHOTO SHOWS:</span>
                        </div>
                        <p className="text-white font-bold text-base">{invalidImageData.imageType}</p>
                        {invalidImageData.detected.length > 0 && (
                          <p className="text-gray-400 text-xs mt-1">
                            Detected: {invalidImageData.detected.slice(0, 3).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Required */}
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-white font-semibold text-sm mb-3">
                      ⚠️ Please fix one of the following:
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5">1.</span>
                        <span className="text-gray-300 text-sm">
                          Update your description to match the photo (shows {invalidImageData.imageType})
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5">2.</span>
                        <span className="text-gray-300 text-sm">
                          Upload a different photo that matches your description ({invalidImageData.textType})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* NON-INCIDENT DETAILS */}
              {!invalidImageData.mismatch && (
                <>
                  {/* Reason Box */}
                  <div className="bg-red-500/10 border-2 border-red-500/30 rounded-lg p-4">
                    <p className="text-sm font-semibold text-red-400 mb-2">
                      Reason:
                    </p>
                    <p className="text-white text-sm leading-relaxed">
                      {invalidImageData.reason}
                    </p>
                  </div>

                  {/* Detected Content */}
                  {invalidImageData.detected.length > 0 && (
                    <div className="bg-gray-800 rounded-lg p-4">
                      <p className="text-sm font-semibold text-gray-300 mb-3">
                        Detected content:
                      </p>
                      <ul className="space-y-2">
                        {invalidImageData.detected.map((item, idx) => (
                          <li key={idx} className="text-gray-400 text-sm flex items-start gap-2">
                            <span className="text-red-400 mt-1">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Instructions */}
                  <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                    <p className="text-white font-semibold text-sm">
                      Please upload a photo of the actual incident:
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <FiCheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-300 text-sm">Fire, Flood, Crime scene, Accident, or Disturbance</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <FiXCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-300 text-sm">No selfies, food pics, party photos, or random images</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-800/50 border-t border-gray-700">
              <button
                onClick={() => {
                  setShowInvalidImageModal(false)
                  if (!invalidImageData.mismatch) {
                    clearMedia()
                  }
                }}
                className="w-full py-3 text-white font-bold rounded-xl transition-all shadow-lg"
                style={{
                  background: invalidImageData.mismatch
                    ? 'linear-gradient(to right, #f59e0b, #d97706)'
                    : 'linear-gradient(to right, #ef4444, #dc2626)'
                }}
              >
                {invalidImageData.mismatch ? 'I Will Fix This' : 'I Understand'}
              </button>
            </div>
          </div>

          <style>{`
            @keyframes scaleIn {
              from {
                opacity: 0;
                transform: scale(0.9) translateY(20px);
              }
              to {
                opacity: 1;
                transform: scale(1) translateY(0);
              }
            }
          `}</style>
        </div>
      )}
    </>
  )
}