import { useState, useEffect, useRef } from 'react'
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  useMap
} from 'react-leaflet'
import { ChevronDown } from 'lucide-react'
import L from 'leaflet'

import AdminSidebar from '../components/AdminSidebar'
import AdminNavTabs from '../components/AdminNavTabs'
import AdminMobileBottomNav from '../components/AdminMobileBottomNav'
import TopBar from '../components/TopBar'
import { eastTapinacGeoJSON } from '../data/EastTapinac'
import { getIncidents, subscribeToIncidents } from '../lib/database'
import IncidentIcon from '../components/IncidentIcon'

const typeColors = {
  crime: '#9333ea',
  accident: '#f97316',
  fire: '#ef4444',
  flood: '#3b82f6',
  disturbance: '#eab308',
}

function createIcon(type) {
  const color = typeColors[type] || '#6b7280'

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width:28px;
        height:35px;
        display:flex;
        align-items:center;
        justify-content:center;
      ">
        <svg width="28" height="35" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C7.58 0 4 3.58 4 8C4 14 12 24 12 24C12 24 20 14 20 8C20 3.58 16.42 0 12 0Z" fill="${color}" stroke="white" stroke-width="1.5"/>
          <circle cx="12" cy="8" r="3" fill="white"/>
        </svg>
      </div>
    `,
    iconSize: [28, 35],
    iconAnchor: [14, 35],
    popupAnchor: [0, -35],
  })
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
        maxZoom: 18,
      })

      const currentZoom = map.getZoom()
      map.setMinZoom(currentZoom)
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

export default function IncidentMap() {

  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [statusFilter, setStatusFilter] = useState('All Status')

  useEffect(() => {
    const loadIncidents = async () => {
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
        setIncidents((prev) => [payload.new, ...prev])
      } else if (payload.eventType === 'UPDATE') {
        setIncidents((prev) =>
          prev.map((i) => (i.id === payload.new.id ? payload.new : i))
        )
      } else if (payload.eventType === 'DELETE') {
        setIncidents((prev) =>
          prev.filter((i) => i.id !== payload.old.id)
        )
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const filtered = incidents.filter((i) => {
    if (
      typeFilter !== 'All Types' &&
      i.type !== typeFilter.toLowerCase()
    )
      return false

    if (
      statusFilter !== 'All Status' &&
      i.status !== statusFilter.toLowerCase()
    )
      return false

    return true
  })

  const Sidebar = AdminSidebar

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />

        <div className="flex-1 md:ml-60 pb-16 md:pb-0">
          <TopBar title="Incident Map" />

          <div className="p-4 md:p-6 flex items-center justify-center">
            <div className="text-gray-500">Loading map...</div>
          </div>
        </div>
        <AdminMobileBottomNav />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 md:ml-60 pb-16 md:pb-0">
        <TopBar title="Incident Map" showUserMenu={true}>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-white text-xs text-gray-600">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Live
          </span>
        </TopBar>

        <AdminNavTabs />

        <main className="p-4 md:p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900">
                Incident Map
              </h2>

              <div className="hidden md:flex items-center gap-3 mt-2">
                {Object.entries(typeColors).map(([type, color]) => (
                  <div
                    key={type}
                    className="flex items-center gap-1.5"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: color }}
                    />

                    <span className="text-xs text-gray-600 capitalize">
                      {type}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              {/* TYPE FILTER */}
              <div className="relative flex-1 md:flex-none">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full md:w-auto appearance-none pl-3 pr-8 py-2 bg-white border rounded-lg text-xs md:text-sm text-gray-700 focus:outline-none"
                >
                  <option>All Types</option>
                  <option>Crime</option>
                  <option>Accident</option>
                  <option>Fire</option>
                  <option>Flood</option>
                  <option>Disturbance</option>
                </select>

                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>

              {/* STATUS FILTER */}
              <div className="relative flex-1 md:flex-none">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full md:w-auto appearance-none pl-3 pr-8 py-2 bg-white border rounded-lg text-xs md:text-sm text-gray-700 focus:outline-none"
                >
                  <option>All Status</option>
                  <option>Pending</option>
                  <option>Responding</option>
                  <option>Resolved</option>
                </select>

                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
            </div>
          </div>

          {/* MAP */}
          <div className="bg-white rounded-xl border overflow-hidden h-96 md:h-[580px]">
            <MapContainer
              center={[14.835, 120.283]}
              zoom={15}
              minZoom={15} /* ✅ bawal zoom out */
              scrollWheelZoom={true}
              className="h-full w-full"
              style={{ zIndex: 1 }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {/* ✅ FIXED MAP BOUNDS */}
              <MapBoundsHandler />

              {/* INCIDENT MARKERS */}
              {filtered.map((i) => {
                if (!i.latitude || !i.longitude) return null

                return (
                  <Marker
                    key={i.id}
                    position={[i.latitude, i.longitude]}
                    icon={createIcon(i.type)}
                  >
                    <Popup>
                      <div className="space-y-1 min-w-[180px]">
                        <div className="flex items-center gap-2">
                          <IncidentIcon
                            type={i.type}
                            size={14}
                          />

                          <span className="font-semibold text-sm capitalize">
                            {i.type}
                          </span>
                        </div>

                        <p className="text-xs text-gray-600">
                          {i.description}
                        </p>

                        <p className="text-xs text-gray-500">
                          {i.location}
                        </p>

                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                            i.status === 'pending'
                              ? 'bg-amber-100 text-amber-700'
                              : i.status === 'responding'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
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
            Showing {filtered.length} of {incidents.length} incidents.
          </p>
        </main>
      </div>
      <AdminMobileBottomNav />
    </div>
  )
}
