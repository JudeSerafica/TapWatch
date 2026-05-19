import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronDown, X, User, MapPin, Calendar, FileText, Image as ImageIcon, Play } from 'lucide-react'
import AdminSidebar from '../components/AdminSidebar'
import AdminNavTabs from '../components/AdminNavTabs'
import StatusBadge from '../components/StatusBadge'
import IncidentIcon from '../components/IncidentIcon'
import TopBar from '../components/TopBar'
import { getIncidents, updateIncident, subscribeToIncidents } from '../lib/database'

export default function AllReports() {
  const navigate = useNavigate()
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
    fetchIncidents()
    
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

  const fetchIncidents = async () => {
    setLoading(true)
    const { data, error } = await getIncidents()
    if (error) {
      console.error('Error fetching incidents:', error)
    } else {
      setIncidents(data || [])
    }
    setLoading(false)
  }

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
        <div className="flex-1 ml-60">
          <TopBar title="All Reports" />
          <div className="p-6 flex items-center justify-center">
            <div className="text-gray-500">Loading incidents...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 ml-60">
        <TopBar title="All Reports">
          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">Official</span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-200 bg-white text-xs text-gray-600">
            <span className="w-2 h-2 rounded-full bg-blue-500" />Live
          </span>
        </TopBar>
        <AdminNavTabs />

        <main className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">All Reports</h2>
            <span className="text-sm font-semibold text-gray-900 bg-white px-3 py-1.5 rounded-lg border border-gray-200">{incidents.length} records</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e=>setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search incidents..."
              />
            </div>
            <div className="relative">
              <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none">
                <option>All Types</option>
                <option>Crime</option><option>Accident</option><option>Fire</option><option>Flood</option><option>Disturbance</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none">
                <option>All Status</option>
                <option>Pending</option><option>Responding</option><option>Resolved</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Description</th>
                    <th className="px-5 py-3 font-medium">Location</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(i=> (
                    <tr key={i.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <IncidentIcon type={i.type} />
                      </td>
                      <td className="px-5 py-4 text-gray-700 max-w-xs truncate">{i.description}</td>
                      <td className="px-5 py-4 text-gray-500">{i.location}</td>
                      <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{new Date(i.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={i.status} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => openModal(i)}
                          className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length===0 && (
                    <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400 text-sm">No incidents found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {isModalOpen && selectedIncident && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <IncidentIcon type={selectedIncident.type} />
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 capitalize">{selectedIncident.type} Incident</h3>
                  </div>
                </div>
                <button onClick={closeModal} className="p-1.5 hover:bg-gray-100 rounded-md transition">
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">Status</label>
                    <StatusBadge status={selectedIncident.status} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">Date & Time</label>
                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                      <Calendar size={14} className="text-gray-400" />
                      {new Date(selectedIncident.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' })}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">Location</label>
                  <div className="flex items-center gap-1.5 text-sm text-gray-700">
                    <MapPin size={14} className="text-gray-400" />
                    {selectedIncident.location || '—'}
                  </div>
                  {selectedIncident.purok && (
                    <div className="text-sm text-gray-500 mt-0.5 pl-5.5">{selectedIncident.purok}</div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">Reporter</label>
                  <div className="flex items-center gap-1.5 text-sm text-gray-700">
                    <User size={14} className="text-gray-400" />
                    {selectedIncident.reporter_name || selectedIncident.profiles?.full_name || 'Anonymous'}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">Description</label>
                  <div className="bg-gray-50 rounded-lg px-3.5 py-2.5 text-sm text-gray-700 border border-gray-100">
                    {selectedIncident.description}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">AI Classification</label>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                    {selectedIncident.ai_classification || selectedIncident.type}
                  </span>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">Evidence</label>
                  {selectedIncident.media_url ? (
                    <button
                      onClick={() => {
                        setSelectedMedia({ url: selectedIncident.media_url, name: selectedIncident.media_name || 'Media' })
                        setMediaPreviewOpen(true)
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition text-sm text-gray-700"
                    >
                      {selectedIncident.media_url.startsWith('data:video') ? (
                        <Play size={16} className="text-blue-600" />
                      ) : (
                        <ImageIcon size={16} className="text-blue-600" />
                      )}
                      View attached media
                    </button>
                  ) : (
                    <div className="text-sm text-gray-400 bg-gray-50 rounded-lg px-3.5 py-2.5 border border-gray-100">
                      No evidence attached
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">Official Notes</label>
                  <textarea
                    value={officialNotes}
                    onChange={(e) => setOfficialNotes(e.target.value)}
                    onBlur={saveNotes}
                    rows={3}
                    placeholder="Add notes about the response..."
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">Update Status</label>
                  <div className="flex items-center gap-2">
                    {['pending', 'responding', 'resolved'].map((s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus(s)}
                        className={`px-4 py-2 rounded-lg text-xs font-medium border transition capitalize ${
                          selectedIncident.status === s
                            ? s === 'pending'
                              ? 'bg-amber-100 border-amber-200 text-amber-700'
                              : s === 'responding'
                              ? 'bg-blue-100 border-blue-200 text-blue-700'
                              : 'bg-emerald-100 border-emerald-200 text-emerald-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {mediaPreviewOpen && selectedMedia && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  {selectedMedia.url.startsWith('data:video') ? (
                    <Play size={18} className="text-blue-600" />
                  ) : (
                    <ImageIcon size={18} className="text-blue-600" />
                  )}
                  <span className="text-sm font-medium text-gray-700">{selectedMedia.name}</span>
                </div>
                <button
                  onClick={() => setMediaPreviewOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-md transition"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
              <div className="flex items-center justify-center bg-gray-50 p-6">
                {selectedMedia.url.startsWith('data:video') ? (
                  <video src={selectedMedia.url} controls className="max-h-96 max-w-full rounded-lg" />
                ) : (
                  <img src={selectedMedia.url} alt={selectedMedia.name} className="max-h-96 max-w-full rounded-lg object-contain" />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
