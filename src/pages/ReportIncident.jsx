import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, GeoJSON, useMapEvents, Marker } from 'react-leaflet'
import { AlertTriangle, Sparkles, MapPin } from 'lucide-react'
import L from 'leaflet'
import ResidentSidebar from '../components/ResidentSidebar'
import TopBar from '../components/TopBar'
import { useAuth } from '../context/AuthContext'
import { eastTapinacGeoJSON } from '../data/EastTapinac'

const incidentTypes = ['Crime','Accident','Fire','Flood','Disturbance']

const pinIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [28,28], iconAnchor:[14,28], popupAnchor:[0,-28]
})

function MapClickHandler({ onClick }) {
  useMapEvents({ click(e) { onClick(e.latlng) } })
  return null
}

export default function ReportIncident() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [pin, setPin] = useState(null)
  const [form, setForm] = useState({
    type: '', description: '', date: '', time: '',
    reporterName: profile?.fullName || '', contact: profile?.contactNumber || '',
    mediaUrl: null, mediaName: ''
  })
  const [aiType, setAiType] = useState('')
  const [loadingAI, setLoadingAI] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleMapClick = useCallback((latlng) => { setPin(latlng) }, [])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result
      setForm(f => ({
        ...f,
        mediaUrl: base64,
        mediaName: file.name
      }))
    }
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
      setAiType(t)
      setForm(f=> ({...f, type:t}))
      setLoadingAI(false)
    }, 800)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!form.type || !form.description) {
      alert('Please fill in required fields')
      return
    }

    // Check for duplicates
    const location = pin ? `${pin.lat.toFixed(6)}, ${pin.lng.toFixed(6)}` : 'Unknown'
    const { isDuplicate, duplicates } = await checkDuplicateIncident(form.description, location)
    
    if (isDuplicate && duplicates.length > 0) {
      const confirmSubmit = confirm(
        `This appears to be a duplicate of an existing report:\n\n${duplicates[0].description}\n\nDo you still want to submit?`
      )
      if (!confirmSubmit) return
    }

    const incidentData = {
      user_id: profile?.id || null,
      type: form.type.toLowerCase(),
      description: form.description,
      location: location,
      purok: profile?.purok || null,
      latitude: pin?.lat || null,
      longitude: pin?.lng || null,
      status: 'pending',
      media_url: form.mediaUrl,
      media_name: form.mediaName,
      ai_classification: aiType || form.type,
      ai_confidence: aiType ? 0.85 : 0.5,
      urgency_level: 'medium',
      reporter_name: form.reporterName || profile?.full_name || 'Anonymous',
      reporter_contact: form.contact || profile?.phone || null,
    }

    const { error } = await createIncident(incidentData)
    
    if (error) {
      alert('Failed to submit report: ' + error.message)
      return
    }

    setSubmitted(true)
    setTimeout(() => navigate('/dashboard'), 1500)
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ResidentSidebar />
      <div className="flex-1 ml-60">
        <TopBar title="Report Incident">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-200 bg-white text-xs text-gray-600">
            <span className="w-2 h-2 rounded-full bg-green-500" />Live
          </span>
        </TopBar>

        <main className="p-6 max-w-4xl mx-auto space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Report an Incident</h2>
            <p className="text-sm text-gray-500 mt-1">Drop a pin on the map, then fill in the details below.</p>
          </div>

          {submitted && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 text-sm font-medium">
              Incident reported successfully! Redirecting...
            </div>
          )}

          {/* Map Section */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <MapPin size={16} className="text-blue-600" />
              <h3 className="font-semibold text-gray-900 text-sm">Pin the Location</h3>
            </div>
            <div className="h-80">
              <MapContainer center={[14.835,120.283]} zoom={15} className="h-full w-full" style={{zIndex:1}}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <GeoJSON data={eastTapinacGeoJSON} style={{color:'#2563eb', weight:2, opacity:0.7, fillColor:'#3b82f6', fillOpacity:0.1}} />
                <MapClickHandler onClick={handleMapClick} />
                {pin && <Marker position={pin} icon={pinIcon} />}
              </MapContainer>
            </div>
          </div>

          {/* Form Section */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <AlertTriangle size={16} className="text-blue-600" />
              <h3 className="font-semibold text-gray-900 text-sm">Incident Details</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
                <textarea
                  required rows={3}
                  value={form.description}
                  onChange={e=> setForm({...form,description:e.target.value})}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Describe what happened... (e.g. May banggaan ng motor sa highway)"
                />
              </div>
              <button type="button" onClick={classifyAI} disabled={loadingAI||!form.description}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-xs font-medium transition-colors disabled:opacity-50">
                <Sparkles size={14} /> {loadingAI ? 'Classifying...' : 'AI Classify'}
              </button>
              {aiType && <div className="text-xs text-blue-600 font-medium">AI detected: {aiType}</div>}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Incident Type <span className="text-red-500">*</span></label>
                  <select required value={form.type} onChange={e=> setForm({...form,type:e.target.value})}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white">
                    <option value="">Select type</option>
                  </select>
                </div>
                <div>
                  <input type="file" onChange={handleFileChange}
                  className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                {form.mediaName && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="text-xs text-blue-700 font-medium">📎 {form.mediaName}</div>
                    {form.mediaUrl && (
                      <div className="mt-2">
                        {form.mediaUrl.startsWith('data:image') ? (
                          <img src={form.mediaUrl} alt="preview" className="max-w-xs h-24 object-cover rounded-md" />
                        ) : (
                          <video src={form.mediaUrl} className="max-w-xs h-24 object-cover rounded-md" />
                        )}
                      </div>
                    )}
                  </div>
                )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                  <input type="datetime-local" value={form.date} onChange={e=> setForm({...form,date:e.target.value})}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reporter Name</label>
                  <input type="text" value={form.reporterName} onChange={e=> setForm({...form,reporterName:e.target.value})}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                  <input type="tel" value={form.contact} onChange={e=> setForm({...form,contact:e.target.value})}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
              </div>

              <button type="submit" disabled={submitted}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                Submit Report
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}
