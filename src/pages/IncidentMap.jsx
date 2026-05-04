import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet'
import { MapPin, ChevronDown } from 'lucide-react'
import L from 'leaflet'
import ResidentSidebar from '../components/ResidentSidebar'
import AdminSidebar from '../components/AdminSidebar'
import AdminNavTabs from '../components/AdminNavTabs'
import TopBar from '../components/TopBar'
import { useAuth } from '../context/AuthContext'
import { eastTapinacGeoJSON } from '../data/EastTapinac'
import { getIncidents, subscribeToIncidents } from '../lib/database'
import IncidentIcon from '../components/IncidentIcon'

const typeColors = {
  crime: '#9333ea', accident: '#f97316', fire: '#ef4444', flood: '#3b82f6', disturbance: '#eab308',
}

function createIcon(type) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${typeColors[type]};width:28px;height:28px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px;">${type[0].toUpperCase()}</div>`,
    iconSize: [28,28], iconAnchor:[14,14], popupAnchor:[0,-14]
  })
}

export default function IncidentMap() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [statusFilter, setStatusFilter] = useState('All Status')

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

  const filtered = incidents.filter(i=> {
    if (typeFilter!=='All Types' && i.type!==typeFilter.toLowerCase()) return false
    if (statusFilter!=='All Status' && i.status!==statusFilter.toLowerCase()) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <AdminSidebar />
        <div className="flex-1 ml-60">
          <TopBar title="Incident Map" />
          <div className="p-6 flex items-center justify-center">
            <div className="text-gray-500">Loading map...</div>
          </div>
        </div>
      </div>
    )
  }

  const Sidebar = isAdmin ? AdminSidebar : ResidentSidebar

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-60">
        <TopBar title="Incident Map">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-200 bg-white text-xs text-gray-600">
            <span className="w-2 h-2 rounded-full bg-green-500" />Live
          </span>
        </TopBar>
        {isAdmin && <AdminNavTabs />}

        <main className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Incident Map</h2>
              <div className="flex items-center gap-4 mt-2">
                {Object.entries(typeColors).map(([type,color])=> (
                  <div key={type} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{background:color}} />
                    <span className="text-xs text-gray-600 capitalize">{type}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
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
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-[500px]">
            <MapContainer center={[14.835,120.283]} zoom={15} className="h-full w-full" style={{zIndex:1}}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <GeoJSON data={eastTapinacGeoJSON} style={{color:'#2563eb', weight:2, opacity:0.7, fillColor:'#3b82f6', fillOpacity:0.08}} />
              {filtered.map(i=> {
                if (!i.latitude || !i.longitude) return null
                return (
                  <Marker key={i.id} position={[i.latitude,i.longitude]} icon={createIcon(i.type)}>
                    <Popup>
                      <div className="space-y-1 min-w-[180px]">
                        <div className="flex items-center gap-2">
                          <IncidentIcon type={i.type} size={14} />
                          <span className="font-semibold text-sm capitalize">{i.type}</span>
                        </div>
                        <p className="text-xs text-gray-600">{i.description}</p>
                        <p className="text-xs text-gray-500">{i.location}</p>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${i.status==='pending'?'bg-amber-100 text-amber-700':i.status==='responding'?'bg-blue-100 text-blue-700':'bg-emerald-100 text-emerald-700'}`}>
                          {i.status}
                        </span>
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
            </MapContainer>
          </div>

          <p className="text-center text-xs text-gray-400">
            Click anywhere on the map to drop a pin and report a new incident. Showing {filtered.length} of {incidents.length} incidents.
          </p>
        </main>
      </div>
    </div>
  )
}
