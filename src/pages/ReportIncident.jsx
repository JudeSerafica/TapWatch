import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, GeoJSON, useMapEvents, Marker, useMap } from 'react-leaflet'
import { AlertTriangle, Sparkles, MapPin, XCircle, CheckCircle2, Upload, User, Phone, Clock, Tag, FileText } from 'lucide-react'
import L from 'leaflet'
import ResidentSidebar from '../components/ResidentSidebar'
import TopBar from '../components/TopBar'
import { useAuth } from '../context/AuthContext'
import { eastTapinacGeoJSON } from '../data/EastTapinac'
import { createIncident, checkDuplicateIncident } from '../lib/database'
 
const incidentTypes = ['Crime','Accident','Fire','Flood','Disturbance']
 
const typeConfig = {
  Crime:       { color: '#dc2626', bg: '#fef2f2', icon: '🔒' },
  Accident:    { color: '#d97706', bg: '#fffbeb', icon: '⚠️' },
  Fire:        { color: '#ea580c', bg: '#fff7ed', icon: '🔥' },
  Flood:       { color: '#2563eb', bg: '#eff6ff', icon: '🌊' },
  Disturbance: { color: '#7c3aed', bg: '#f5f3ff', icon: '📢' },
}
 
const pinIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [28,28], iconAnchor:[14,28], popupAnchor:[0,-28]
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

    // Get the GeoJSON layer
    const layer = geoJsonRef.current

    // Calculate bounds from all features
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

    // Fit map to bounds with padding - zoom in more and lock it
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 19 })
      // After fitting, set minZoom to prevent zooming out
      const currentZoom = map.getZoom()
      map.setMinZoom(currentZoom)
    }
  }, [map])

  return (
    <GeoJSON
      ref={geoJsonRef}
      data={eastTapinacGeoJSON}
      style={{ color: '#FF0000', weight: 5, opacity: 0.7, fillColor: '#3b82f6', fillOpacity: 0.12 }}
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
 
/* ─── Main Component ─────────────────────────────────── */
 
export default function ReportIncident() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [pin, setPin] = useState(null)
  const [form, setForm] = useState({
    type: '', description: '', date: '', time: '',
    reporterName: profile?.full_name || '', contact: profile?.phone || '',
    mediaUrl: null, mediaName: ''
  })
  const [aiType, setAiType] = useState('')
  const [loadingAI, setLoadingAI] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [boundaryError, setBoundaryError] = useState('')
 
  useEffect(() => {
    const now = new Date()
    setForm(f => ({ ...f, date: now.toISOString().slice(0, 10), time: now.toTimeString().slice(0, 5) }))
  }, [])
 
  const handleMapClick = useCallback((latlng) => { setPin(latlng); setBoundaryError('') }, [])
  const handleBoundaryError = useCallback(() => {
    setBoundaryError('Please place the pin within the barangay boundary (blue shaded area)')
    setTimeout(() => setBoundaryError(''), 3000)
  }, [])
 
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => setForm(f => ({ ...f, mediaUrl: event.target?.result, mediaName: file.name }))
    reader.readAsDataURL(file)
  }
 
  const classifyAI = () => {
    setLoadingAI(true)
    setTimeout(() => {
      const text = form.description.toLowerCase()
      let t = ''
      if (text.includes('sunog')||text.includes('fire')||text.includes('apoy')) t='Fire'
      else if (text.includes('baha')||text.includes('tubig')||text.includes('flood')) t='Flood'
      else if (text.includes('bangga')||text.includes('aksidente')||text.includes('accident')||text.includes('motor')) t='Accident'
      else if (text.includes('nakaw')||text.includes('theft')||text.includes('robbery')||text.includes('crime')) t='Crime'
      else if (text.includes('ingay')||text.includes('away')||text.includes('disturbance')) t='Disturbance'
      else t='Accident'
      setAiType(t); setForm(f => ({...f, type: t})); setLoadingAI(false)
    }, 800)
  }
 
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.type || !form.description) { alert('Please fill in required fields'); return }
    const location = pin ? `${pin.lat.toFixed(6)}, ${pin.lng.toFixed(6)}` : 'Unknown'
    const { isDuplicate, duplicates } = await checkDuplicateIncident(form.description, location)
    if (isDuplicate && duplicates.length > 0) {
      const confirmSubmit = confirm(`This appears to be a duplicate of an existing report:\n\n${duplicates[0].description}\n\nDo you still want to submit?`)
      if (!confirmSubmit) return
    }
    const incidentData = {
      user_id: profile?.id || null, type: form.type.toLowerCase(),
      description: form.description, location, purok: profile?.purok || null,
      latitude: pin?.lat || null, longitude: pin?.lng || null, status: 'pending',
      media_url: form.mediaUrl, media_name: form.mediaName,
      ai_classification: aiType || form.type, ai_confidence: aiType ? 0.85 : 0.5,
      urgency_level: 'medium', reporter_name: form.reporterName || profile?.full_name || 'Anonymous',
      reporter_contact: form.contact || profile?.phone || null,
    }
    const { data, error } = await createIncident(incidentData)
    if (error) { alert('Failed to submit report: ' + error.message); return }
    setSubmitted(true)
    setTimeout(() => navigate('/dashboard'), 1500)
  }
 
  const selectedTypeConfig = form.type ? typeConfig[form.type] : null
 
  return (
    <>
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
      `}</style>
 
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif" }}>
        <ResidentSidebar />
        <div style={{ flex: 1, marginLeft: 240 }}>
          <TopBar title="Report Incident">
            <span style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 20,
              border: '1px solid #e5e7eb', background: '#fff',
              fontSize: 12, color: '#6b7280', fontFamily: "'DM Sans', sans-serif"
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 2px rgba(34,197,94,0.25)' }} />
              Live
            </span>
          </TopBar>
 
          <main style={{ padding: '28px 32px', maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
 
            {/* Page Header */}
            <div style={{ paddingBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.25)'
                }}>
                  <AlertTriangle size={20} color="#fff" strokeWidth={2.2} />
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
                animation: 'fadeIn 0.3s ease'
              }}>
                <CheckCircle2 size={18} color="#16a34a" />
                <span style={{ fontSize: 13.5, fontWeight: 600, color: '#15803d' }}>
                  Incident reported successfully! Redirecting to dashboard…
                </span>
              </div>
            )}
 
            {/* Map Section */}
            <SectionCard icon={MapPin} label="Pin the Location" iconColor="#2563eb">
              <div style={{ height: 500 }}>
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
                  <MapPin size={13} color="#2563eb" />
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
                  <XCircle size={14} color="#dc2626" />
                  <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 500 }}>{boundaryError}</span>
                </div>
              )}
            </SectionCard>
 
            {/* Incident Details */}
            <SectionCard icon={FileText} label="Incident Details" iconColor="#2563eb">
              <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
 
                {/* Description */}
                <div>
                  <FieldLabel required>Description</FieldLabel>
                  <textarea
                    required rows={3}
                    value={form.description}
                    onChange={e => setForm({...form, description: e.target.value})}
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
                    <Sparkles size={13} />
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
                            onClick={() => setForm({...form, type})}
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
                    {/* Hidden select for form validity */}
                    <select required value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                      style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}>
                      <option value="">Select type</option>
                      {incidentTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>
 
                  <div>
                    <FieldLabel>Attach Media</FieldLabel>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 14px', borderRadius: 10,
                      border: '1.5px dashed #cbd5e1', cursor: 'pointer',
                      background: '#f8fafc', transition: 'all 0.15s',
                      fontSize: 13, color: '#64748b', fontWeight: 500
                    }}>
                      <Upload size={14} color="#94a3b8" />
                      {form.mediaName ? form.mediaName : 'Upload photo or video'}
                      <input type="file" onChange={handleFileChange} style={{ display: 'none' }} />
                    </label>
                    {form.mediaName && form.mediaUrl && (
                      <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                        {form.mediaUrl.startsWith('data:image') ? (
                          <img src={form.mediaUrl} alt="preview" style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }} />
                        ) : (
                          <video src={form.mediaUrl} style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }} />
                        )}
                      </div>
                    )}
                  </div>
                </div>
 
                {/* Divider */}
                <div style={{ borderTop: '1px solid #f1f5f9', margin: '2px 0' }} />
 
                {/* Date/Time + Reporter info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div>
                    <FieldLabel>Date & Time</FieldLabel>
                    <div style={{ position: 'relative' }}>
                      <Clock size={13} color="#9ca3af" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                      <input type="datetime-local" value={`${form.date}T${form.time}`} readOnly
                        style={{ ...readOnlyInputStyle, paddingLeft: 32 }} />
                    </div>
                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Auto-filled to current time</p>
                  </div>
 
                  <div>
                    <FieldLabel>Reporter Name</FieldLabel>
                    <div style={{ position: 'relative' }}>
                      <User size={13} color="#9ca3af" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                      <input type="text" value={form.reporterName} readOnly
                        style={{ ...readOnlyInputStyle, paddingLeft: 32 }} />
                    </div>
                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>From your profile</p>
                  </div>
 
                  <div>
                    <FieldLabel>Contact Number</FieldLabel>
                    <div style={{ position: 'relative' }}>
                      <Phone size={13} color="#9ca3af" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                      <input type="tel" value={form.contact} readOnly
                        style={{ ...readOnlyInputStyle, paddingLeft: 32 }} />
                    </div>
                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>From your profile</p>
                  </div>
                </div>
 
                {/* Submit */}
                <button
                  type="submit" disabled={submitted}
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
                    ? <><CheckCircle2 size={16} /> Submitted!</>
                    : <><AlertTriangle size={15} /> Submit Report</>
                  }
                </button>
              </form>
            </SectionCard>
 
          </main>
        </div>
      </div>
    </>
  )
}