import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AlertTriangle, Activity, Clock, Zap, CheckCircle, ChevronRight, Image as ImageIcon, Play } from 'lucide-react'
import AdminSidebar from '../components/AdminSidebar'
import AdminNavTabs from '../components/AdminNavTabs'
import StatusBadge from '../components/StatusBadge'
import IncidentIcon from '../components/IncidentIcon'
import TopBar from '../components/TopBar'
import MediaPreview from '../components/MediaPreview'
import { getIncidents, getIncidentStats, getHotspots, subscribeToIncidents } from '../lib/database'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [incidents, setIncidents] = useState([])
  const [typeStats, setTypeStats] = useState([])
  const [hotspots, setHotspots] = useState([])
  const [selectedMedia, setSelectedMedia] = useState(null)
  const [mediaPreviewOpen, setMediaPreviewOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    
    const subscription = subscribeToIncidents((payload) => {
      if (payload.eventType === 'INSERT') {
        setIncidents(prev => [payload.new, ...prev].slice(0, 4))
      } else if (payload.eventType === 'UPDATE') {
        setIncidents(prev => prev.map(i => i.id === payload.new.id ? payload.new : i))
      } else if (payload.eventType === 'DELETE') {
        setIncidents(prev => prev.filter(i => i.id !== payload.old.id))
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: incidentsData } = await getIncidents()
    const { data: statsData } = await getIncidentStats('7d')
    const { data: hotspotsData } = await getHotspots()
    
    if (incidentsData) {
      setIncidents(incidentsData.slice(0, 4))
    }
    
    if (statsData && statsData.byType) {
      setTypeStats(Object.entries(statsData.byType).map(([type, count]) => ({ type, count })))
    }
    
    if (hotspotsData) {
      setHotspots(Object.entries(hotspotsData)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 3)
        .map(([location, data]) => ({ location, count: data.count })))
    }
    setLoading(false)
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const pendingCount = incidents.filter(i => i.status === 'pending').length
  const respondingCount = incidents.filter(i => i.status === 'responding').length
  const resolvedCount = incidents.filter(i => i.status === 'resolved').length

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <AdminSidebar />
        <div className="flex-1 ml-60">
          <TopBar title="Officials Dashboard" />
          <div className="p-6 flex items-center justify-center">
            <div className="text-gray-500">Loading dashboard...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 ml-60">
        <TopBar title="Officials Dashboard">
          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">Official</span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-200 bg-white text-xs text-gray-600">
            <span className="w-2 h-2 rounded-full bg-blue-500" />Live
          </span>
        </TopBar>
        <AdminNavTabs />

        <main className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-bold text-gray-900">Officials Dashboard</h2>
                <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-700 text-xs font-medium">Admin View</span>
              </div>
              <p className="text-sm text-gray-500">{today}</p>
            </div>
          </div>

          <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg px-5 py-3">
            <div className="flex items-center gap-3">
              <AlertTriangle size={18} className="text-amber-600" />
              <span className="text-sm text-amber-800 font-medium">{pendingCount} incidents awaiting response.</span>
            </div>
            <button onClick={() => navigate('/admin-reports')} className="px-4 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-md hover:bg-amber-700">Respond</button>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {[
              { icon: Activity, label: "Today's Incidents", val: incidents.length, bg: 'bg-blue-50', ic: 'text-blue-600' },
              { icon: Clock, label: "Pending Action", val: pendingCount, bg: 'bg-amber-50', ic: 'text-amber-600' },
              { icon: Zap, label: "Responding", val: respondingCount, bg: 'bg-blue-50', ic: 'text-blue-600' },
              { icon: CheckCircle, label: "Resolved", val: resolvedCount, bg: 'bg-emerald-50', ic: 'text-emerald-600' },
            ].map((s, i) => {
              const Icon = s.icon
              return (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                    <Icon size={20} className={s.ic} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{s.val}</div>
                    <div className="text-xs text-gray-500">{s.label}</div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 bg-white rounded-xl border border-gray-200">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 text-sm">Recent Incidents</h3>
                <button onClick={() => navigate('/admin-reports')} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">View All<ChevronRight size={14} /></button>
              </div>
              <div className="divide-y divide-gray-50">
                {incidents.map(inc => (
                  <div key={inc.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50">
                    <div className="flex items-center gap-3 flex-1">
                      <IncidentIcon type={inc.type} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 capitalize">{inc.type}</span>
                          <span className="text-sm text-gray-500">{inc.location || 'Unknown'}</span>
                          {inc.media_url && (
                            <button
                              onClick={() => {
                                setSelectedMedia({ url: inc.media_url, name: inc.media_name || 'Media' })
                                setMediaPreviewOpen(true)
                              }}
                              className="ml-2 p-1 hover:bg-blue-100 rounded transition"
                              title="View media"
                            >
                              {inc.media_url.startsWith('data:video') ? (
                                <Play size={14} className="text-blue-600" />
                              ) : (
                                <ImageIcon size={14} className="text-blue-600" />
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

            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 text-sm mb-4">By Type</h3>
                <div className="space-y-3">
                  {typeStats.map(t => (
                    <div key={t.type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IncidentIcon type={t.type} size={14} />
                        <span className="text-sm text-gray-700 capitalize">{t.type}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{t.count}</span>
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

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 text-sm mb-4">Top Hotspots</h3>
                <div className="space-y-3">
                  {hotspots.map((h, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-red-600 w-5">{i + 1}</span>
                        <span className="text-sm text-gray-700">{h.location}</span>
                      </div>
                      <span className="text-xs text-gray-500">{h.count} incidents</span>
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
      </div>
    </div>
  )
}

