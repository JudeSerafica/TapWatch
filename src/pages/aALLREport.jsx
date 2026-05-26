import { useState, useEffect } from 'react'
import { Search, ChevronDown, X, User, MapPin, Calendar, Image as ImageIcon, Play } from 'lucide-react'
import AdminSidebar from '../components/AdminSidebar'
import AdminNavTabs from '../components/AdminNavTabs'
import MobileBottomNav from '../components/MobileBottomNav'
import StatusBadge from '../components/StatusBadge'
import IncidentIcon from '../components/IncidentIcon'
import TopBar from '../components/TopBar'
import { getIncidents, updateIncident, subscribeToIncidents } from '../lib/database'

/* ✅ ADDED: robust video detection helper */
const isVideoFile = (url = '', name = '') => {
  if (!url) return false

  // detect by url extension or supabase storage patterns
  if (
    url.includes('.mp4') ||
    url.includes('.mov') ||
    url.includes('.webm') ||
    url.includes('video')
  ) return true

  // fallback by filename
  if (name) {
    const lower = name.toLowerCase()
    return lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.webm')
  }

  return false
}

export default function AllReports() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedIncident, setSelectedIncident] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [officialNotes, setOfficialNotes] = useState('')
  const [selectedMedia, setSelectedMedia] = useState(null)
  const [mediaPreviewOpen, setMediaPreviewOpen] = useState(false)

  useEffect(() => {
    const loadIncidents = async () => {
      setLoading(true)
      const { data, error } = await getIncidents()
      if (error) {
        console.error('Error fetching incidents:', error)
      } else {
        setIncidents(data || [])
      }
      setLoading(false)
    }
    
    loadIncidents()
    
    const subscription = subscribeToIncidents((payload) => {
      if (payload.eventType === 'INSERT') {
        setIncidents(prev => [payload.new, ...prev])
      } else if (payload.eventType === 'UPDATE') {
        setIncidents(prev => prev.map(i => i.id === payload.new.id ? payload.new : i))
      } else if (payload.eventType === 'DELETE') {
        setIncidents(prev => prev.filter(i => i.id !== payload.old.id))
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const openModal = (incident) => {
    setSelectedIncident(incident)
    setOfficialNotes(incident.official_notes || '')
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedIncident(null)
    setOfficialNotes('')
  }

  const updateStatus = async (newStatus) => {
    const { error } = await updateIncident(selectedIncident.id, { status: newStatus })
    if (error) {
      alert('Failed to update status: ' + error.message)
    } else {
      setSelectedIncident(prev => ({ ...prev, status: newStatus }))
    }
  }

  const saveNotes = async () => {
    const { error } = await updateIncident(selectedIncident.id, { official_notes: officialNotes })
    if (error) {
      alert('Failed to save notes: ' + error.message)
    }
  }

  const filtered = incidents.filter(i=> {
    if (search && !i.description.toLowerCase().includes(search.toLowerCase()) && !i.location.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilter!=='All Types' && i.type!==typeFilter.toLowerCase()) return false
    if (statusFilter!=='All Status' && i.status!==statusFilter.toLowerCase()) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <AdminSidebar />
        <div className="flex-1 md:ml-60 pb-16 md:pb-0">
          <TopBar title="All Reports" />
          <div className="p-4 md:p-6 flex items-center justify-center">
            <div className="text-gray-500">Loading incidents...</div>
          </div>
        </div>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 md:ml-60 pb-16 md:pb-0">
        <TopBar title="All Reports">
          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">Official</span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-200 bg-white text-xs text-gray-600">
            <span className="w-2 h-2 rounded-full bg-blue-500" />Live
          </span>
        </TopBar>

        <AdminNavTabs />

        <main className="p-4 md:p-6 space-y-4 md:space-y-5">

          {/* HEADER */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">All Reports</h2>
            <span className="text-xs md:text-sm font-semibold text-gray-900 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
              {incidents.length} records
            </span>
          </div>

          {/* FILTERS */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e=>setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-white text-xs md:text-sm"
                placeholder="Search incidents..."
              />
            </div>

            <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}
              className="border px-3 py-2 rounded-lg text-sm bg-white">
              <option>All Types</option>
              <option>Crime</option>
              <option>Accident</option>
              <option>Fire</option>
              <option>Flood</option>
              <option>Disturbance</option>
            </select>

            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
              className="border px-3 py-2 rounded-lg text-sm bg-white">
              <option>All Status</option>
              <option>Pending</option>
              <option>Responding</option>
              <option>Resolved</option>
            </select>
          </div>

          {/* TABLE */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="p-3">Type</th>
                  <th>Description</th>
                  <th>Location</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="text-right p-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map(i => (
                  <tr key={i.id} className="border-b hover:bg-gray-50">
                    <td className="p-3"><IncidentIcon type={i.type} /></td>
                    <td>{i.description}</td>
                    <td>{i.location}</td>
                    <td>{new Date(i.created_at).toLocaleDateString()}</td>
                    <td><StatusBadge status={i.status} /></td>
                    <td className="text-right p-3">
                      <button onClick={() => openModal(i)} className="px-3 py-1 border rounded">
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>

        {/* MODAL */}
        {isModalOpen && selectedIncident && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-5">

              <h2 className="font-bold text-lg mb-3">
                {selectedIncident.type} Incident
              </h2>

              {/* DESCRIPTION */}
              <p className="text-sm mb-3">{selectedIncident.description}</p>

              {/* MEDIA (UPDATED FIX) */}
              <div className="mb-3">
                <label className="text-xs font-semibold">Evidence</label>

                {selectedIncident.media_url ? (
                  <button
                    onClick={() => {
                      setSelectedMedia({
                        url: selectedIncident.media_url,
                        name: selectedIncident.media_name || 'Media'
                      })
                      setMediaPreviewOpen(true)
                    }}
                    className="flex items-center gap-2 mt-1 px-3 py-2 border rounded"
                  >
                    {isVideoFile(selectedIncident.media_url, selectedIncident.media_name) ? (
                      <Play size={16} />
                    ) : (
                      <ImageIcon size={16} />
                    )}
                    View Media
                  </button>
                ) : (
                  <p className="text-gray-400 text-sm">No media</p>
                )}
              </div>

              {/* NOTES */}
              <textarea
                value={officialNotes}
                onChange={(e)=>setOfficialNotes(e.target.value)}
                onBlur={saveNotes}
                className="w-full border p-2 rounded"
                rows={3}
              />

              {/* STATUS */}
              <div className="flex gap-2 mt-3">
                {['pending','responding','resolved'].map(s => (
                  <button key={s} onClick={()=>updateStatus(s)}
                    className="border px-3 py-1 rounded text-sm">
                    {s}
                  </button>
                ))}
              </div>

              <button onClick={closeModal} className="mt-4 w-full bg-gray-200 py-2 rounded">
                Close
              </button>
            </div>
          </div>
        )}

        {/* MEDIA PREVIEW MODAL (FIXED VIDEO SUPPORT) */}
        {mediaPreviewOpen && selectedMedia && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl">

              <div className="p-3 border-b flex justify-between">
                <span>{selectedMedia.name}</span>
                <button onClick={()=>setMediaPreviewOpen(false)}>
                  <X />
                </button>
              </div>

              <div className="p-4 flex justify-center bg-gray-50">

                {isVideoFile(selectedMedia.url, selectedMedia.name) ? (
                  <video
                    src={selectedMedia.url}
                    controls
                    playsInline
                    preload="metadata"
                    className="max-h-[500px] w-full rounded bg-black"
                  />
                ) : (
                  <img
                    src={selectedMedia.url}
                    className="max-h-[500px] object-contain rounded"
                  />
                )}

              </div>

            </div>
          </div>
        )}

      </div>
      <MobileBottomNav />
    </div>
  )
}