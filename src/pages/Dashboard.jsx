import { useNavigate } from 'react-router-dom'
import { Clock, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import ResidentSidebar from '../components/ResidentSidebar'
import MobileBottomNav from '../components/MobileBottomNav'
import TopBar from '../components/TopBar'
import StatusBadge from '../components/StatusBadge'
import IncidentIcon from '../components/IncidentIcon'

import { useAuth } from '../context/useAuth'
import { getIncidents, subscribeToIncidents } from '../lib/database'

import {
  FaMapPin,
  FaMapMarkedAlt,
  FaBell,
} from 'react-icons/fa'

import { MdWavingHand } from 'react-icons/md'
import { BsFillTelephoneFill } from 'react-icons/bs'

/* ─────────────────────────────────────────────
   FIX LEAFLET DEFAULT ICON ISSUE
───────────────────────────────────────────── */

delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',

  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',

  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */

const typeColors = {
  crime: '#9333ea',
  accident: '#f97316',
  fire: '#ef4444',
  flood: '#3b82f6',
  disturbance: '#eab308',
}

/* ─────────────────────────────────────────────
   CREATE COLORED MARKER ICON
───────────────────────────────────────────── */

function createIcon(type) {
  const color = typeColors[type] || '#6b7280'

  return L.divIcon({
    className: 'custom-marker',

    html: `
      <div style="
        background:${color};
        width:36px;
        height:36px;
        border-radius:50%;
        border:3px solid white;
        box-shadow:0 4px 8px rgba(0,0,0,0.3);
        display:flex;
        align-items:center;
        justify-content:center;
        color:white;
        font-weight:bold;
        font-size:16px;
        animation:pulse 2s infinite;
      ">
        ${type[0].toUpperCase()}
      </div>

      <style>
        @keyframes pulse{
          0%,100%{transform:scale(1)}
          50%{transform:scale(1.1)}
        }
      </style>
    `,

    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  })
}

/* ─────────────────────────────────────────────
   FLY TO INCIDENT
───────────────────────────────────────────── */

function FlyToIncident({ incident }) {
  const map = useMap()
  const flew = useRef(false)

  useEffect(() => {
    if (
      !flew.current &&
      incident?.latitude &&
      incident?.longitude
    ) {
      map.flyTo(
        [incident.latitude, incident.longitude],
        18,
        { duration: 1.2 }
      )

      flew.current = true
    }
  }, [incident, map])

  return null
}

/* ─────────────────────────────────────────────
   FIX MAP SIZE INSIDE MODAL
───────────────────────────────────────────── */

function ResizeMap() {
  const map = useMap()

  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize()
    }, 300)
  }, [map])

  return null
}

/* ─────────────────────────────────────────────
   INCIDENT MAP MODAL
───────────────────────────────────────────── */

function IncidentMapModal({ incident, onClose }) {

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

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

  const typeColor =
    typeColors[incident.type] || '#6b7280'

  const formattedDate = new Date(
    incident.created_at
  ).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  const hasCoords =
    incident.latitude &&
    incident.longitude

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

              <IncidentIcon
                type={incident.type}
                size={16}
                className="text-white"
              />

              <span className="font-bold text-base capitalize">
                {incident.type} Incident
              </span>

              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize"
                style={{
                  background:
                    'rgba(255,255,255,0.25)',
                  color: 'white',
                }}
              >
                {incident.status}
              </span>
            </div>

            <p className="text-xs opacity-80 flex items-center gap-1">
              <FaMapPin size={9} />

              {incident.location ||
                'Unknown location'}

              <span className="mx-1">·</span>

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

        <div
          className="relative"
          style={{
            height: '320px',
            width: '100%',
          }}
        >
          {hasCoords ? (
            <MapContainer
              center={[
                Number(incident.latitude),
                Number(incident.longitude),
              ]}
              zoom={17}
              scrollWheelZoom={true}
              style={{
                height: '100%',
                width: '100%',
              }}
              className="z-0"
            >
              <ResizeMap />

              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <FlyToIncident incident={incident} />

              <Marker
                position={[
                  Number(incident.latitude),
                  Number(incident.longitude),
                ]}
                icon={createIcon(
                  incident.type
                )}
              >
                <Popup>
                  <div className="text-xs font-semibold capitalize">
                    {incident.type} Incident
                  </div>

                  <div className="text-xs text-gray-500 mt-0.5">
                    {incident.location}
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm bg-gray-50">
              <div className="text-center">
                <FaMapPin className="mx-auto mb-2 text-2xl text-gray-300" />

                <p>No location data available</p>
              </div>
            </div>
          )}
        </div>

        {/* DESCRIPTION */}

        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Description
          </p>

          <p className="text-sm text-gray-700 leading-relaxed">
            {incident.description ||
              'No description provided.'}
          </p>

        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   MAIN DASHBOARD
───────────────────────────────────────────── */

export default function Dashboard() {

  const navigate = useNavigate()

  const { profile } = useAuth()

  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)

  const [myReports, setMyReports] =
    useState({
      pending: 0,
      responding: 0,
      resolved: 0,
    })

  const [selectedIncident, setSelectedIncident] =
    useState(null)

  const today = new Date().toLocaleDateString(
    'en-US',
    {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }
  )

  /* LOAD INCIDENTS */

  useEffect(() => {

    const loadIncidents = async () => {

      setLoading(true)

      const { data, error } =
        await getIncidents()

      if (error) {
        console.error(
          'Error fetching incidents:',
          error
        )
      } else {

        setIncidents(data || [])

        if (profile?.id) {

          const userIncidents =
            (data || []).filter(
              (i) => i.user_id === profile.id
            )

          setMyReports({
            pending:
              userIncidents.filter(
                (i) => i.status === 'pending'
              ).length,

            responding:
              userIncidents.filter(
                (i) => i.status === 'responding'
              ).length,

            resolved:
              userIncidents.filter(
                (i) => i.status === 'resolved'
              ).length,
          })
        }
      }

      setLoading(false)
    }

    loadIncidents()

    const subscription =
      subscribeToIncidents((payload) => {

        if (payload.eventType === 'INSERT') {

          setIncidents((prev) => [
            payload.new,
            ...prev,
          ])

        } else if (
          payload.eventType === 'UPDATE'
        ) {

          setIncidents((prev) =>
            prev.map((i) =>
              i.id === payload.new.id
                ? payload.new
                : i
            )
          )

          setSelectedIncident((prev) =>
            prev?.id === payload.new.id
              ? payload.new
              : prev
          )

        } else if (
          payload.eventType === 'DELETE'
        ) {

          setIncidents((prev) =>
            prev.filter(
              (i) => i.id !== payload.old.id
            )
          )

          setSelectedIncident((prev) =>
            prev?.id === payload.old.id
              ? null
              : prev
          )
        }
      })

    return () => subscription.unsubscribe()

  }, [profile?.id])

  /* UPDATE REPORTS */

  useEffect(() => {

    if (profile?.id) {

      const userIncidents =
        incidents.filter(
          (i) => i.user_id === profile.id
        )

      setMyReports({
        pending:
          userIncidents.filter(
            (i) => i.status === 'pending'
          ).length,

        responding:
          userIncidents.filter(
            (i) => i.status === 'responding'
          ).length,

        resolved:
          userIncidents.filter(
            (i) => i.status === 'resolved'
          ).length,
      })
    }

  }, [incidents, profile?.id])

  const recentAlerts = incidents
    .sort(
      (a, b) =>
        new Date(b.created_at) -
        new Date(a.created_at)
    )
    .slice(0, 5)

  return (
    <div className="flex min-h-screen bg-gray-50">

      <ResidentSidebar />

      <div className="flex-1 md:ml-60 pb-16 md:pb-0">

        <TopBar title="Dashboard">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-gray-200 bg-white text-xs text-gray-600">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            Live
          </div>
        </TopBar>

        <main className="p-4 md:p-8 space-y-6 md:space-y-8">

          {/* HERO */}

          <div className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">

            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>

            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -ml-8 -mb-8"></div>

            <div className="relative z-10">

              <div className="text-xs md:text-sm text-blue-100 mb-3 font-medium">
                {today}
              </div>

              <h2 className="text-2xl md:text-4xl font-bold mb-3">
                Hello, {profile?.full_name || 'Resident'}{' '}
                <MdWavingHand className="inline text-yellow-400" />
              </h2>

              <p className="text-sm md:text-base text-blue-100 mb-6 leading-relaxed">
                Help keep your barangay safe by reporting incidents you encounter.
              </p>

              <button
                onClick={() => navigate('/report')}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-50 transition-colors shadow-md"
              >
                <FaMapPin style={{ color: 'red' }} />
                Report an Incident
              </button>

            </div>
          </div>

          {/* QUICK ACTIONS */}

          <div>

            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              ⚡ Quick Actions
            </h3>

            <div className="grid grid-cols-2 gap-3 md:gap-4">

              <button
                onClick={() => navigate('/report')}
                className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 text-left hover:border-red-300 hover:bg-red-50 transition flex flex-col items-start"
              >
                <div className="text-2xl mb-2">
                  <FaMapPin style={{ color: 'red' }} />
                </div>

                <h3 className="font-semibold text-gray-900 text-sm">
                  Report Incident
                </h3>

                <p className="text-xs text-gray-600">
                  Submit a report
                </p>
              </button>

              <button
                onClick={() => navigate('/resident-map')}
                className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 text-left hover:border-blue-300 hover:bg-blue-50 transition flex flex-col items-start"
              >
                <div className="text-2xl mb-2">
                  <FaMapMarkedAlt style={{ color: 'blue' }} />
                </div>

                <h3 className="font-semibold text-gray-900 text-sm">
                  View Map
                </h3>

                <p className="text-xs text-gray-600">
                  See nearby incidents
                </p>
              </button>

              <button
                className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 text-left hover:border-green-300 hover:bg-green-50 transition flex flex-col items-start"
              >
                <div className="text-2xl mb-2">
                  <FaBell className="text-yellow-500" />
                </div>

                <h3 className="font-semibold text-gray-900 text-sm">
                  Community Alerts
                </h3>

                <p className="text-xs text-gray-600">
                  Latest updates
                </p>
              </button>

              <button
                className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 text-left hover:border-orange-300 hover:bg-orange-50 transition flex flex-col items-start"
              >
                <div className="text-2xl mb-2">
                  <BsFillTelephoneFill className="text-red-400" />
                </div>

                <h3 className="font-semibold text-gray-900 text-sm">
                  Emergency Hotline
                </h3>

                <p className="text-xs text-gray-600">
                  Call for immediate help
                </p>
              </button>

            </div>
          </div>

          {/* MY REPORTS */}

          <div className="bg-white border border-gray-200 rounded-xl">

            <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-200">

              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                📋 My Reports
              </h3>

            </div>

            <div className="grid grid-cols-3 gap-3 p-4 md:p-6">

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 text-center">

                <div className="text-2xl md:text-3xl font-bold text-blue-600">
                  {loading ? '...' : myReports.pending}
                </div>

                <div className="text-xs text-blue-700 mt-2 font-medium">
                  ⏱️ Pending
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 text-center">

                <div className="text-2xl md:text-3xl font-bold text-amber-600">
                  {loading ? '...' : myReports.responding}
                </div>

                <div className="text-xs text-amber-700 mt-2 font-medium">
                  🔄 Responding
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 text-center">

                <div className="text-2xl md:text-3xl font-bold text-green-600">
                  {loading ? '...' : myReports.resolved}
                </div>

                <div className="text-xs text-green-700 mt-2 font-medium">
                  ✓ Resolved
                </div>
              </div>

            </div>
          </div>

          {/* RECENT ALERTS */}

          <div className="bg-white rounded-xl border border-gray-200">

            <div className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-gray-100">

              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                🚨 Recent Community Alerts
              </h3>

            </div>

            <div className="p-4 md:p-5 space-y-3">

              {loading ? (

                <div className="inline-flex items-center gap-2 text-xs text-gray-400">
                  <Clock size={14} className="animate-spin" />
                  Loading alerts...
                </div>

              ) : recentAlerts.length === 0 ? (

                <div className="text-center py-8 text-gray-400 text-sm">

                  <FaBell className="mx-auto mb-2 text-2xl text-gray-300" />

                  <p>No community alerts yet</p>

                </div>

              ) : (

                recentAlerts.map((incident) => (

                  <div
                    key={incident.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition cursor-pointer"
                    onClick={() =>
                      setSelectedIncident(incident)
                    }
                  >

                    <div className="flex-shrink-0 mt-0.5">
                      <IncidentIcon type={incident.type} />
                    </div>

                    <div className="flex-1 min-w-0">

                      <div className="flex items-start justify-between gap-2 mb-1">

                        <h4 className="text-sm font-semibold text-gray-900 capitalize truncate">
                          {incident.type} Incident
                        </h4>

                        <StatusBadge status={incident.status} />

                      </div>

                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                        {incident.description}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-gray-500">

                        <span className="flex items-center gap-1">
                          <FaMapPin className="text-red-500" size={10} />
                          {incident.location || 'Unknown location'}
                        </span>

                        <span className="flex items-center gap-1">
                          <Clock size={10} />

                          {new Date(
                            incident.created_at
                          ).toLocaleDateString(
                            'en-US',
                            {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            }
                          )}
                        </span>

                      </div>
                    </div>

                    <div className="flex-shrink-0 self-center text-gray-300">
                      <FaMapMarkedAlt size={14} />
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>

        </main>
      </div>

      <MobileBottomNav />

      {/* MAP MODAL */}

      {selectedIncident && (
        <IncidentMapModal
          incident={selectedIncident}
          onClose={() =>
            setSelectedIncident(null)
          }
        />
      )}
    </div>
  )
}