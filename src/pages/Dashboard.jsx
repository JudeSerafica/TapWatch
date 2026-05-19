import { useNavigate } from 'react-router-dom'
import { AlertTriangle, MapPin, Clock, ChevronRight } from 'lucide-react'
import ResidentSidebar from '../components/ResidentSidebar'
import TopBar from '../components/TopBar'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ResidentSidebar />
      <div className="flex-1 ml-60">
        <TopBar title="Dashboard">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-gray-200 bg-white text-xs text-gray-600">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            Live
          </div>
        </TopBar>

        <main className="p-8 space-y-8">
          {/* Welcome Banner */}
          <div className="bg-blue-700 rounded p-8 text-white">
            <div className="text-sm text-blue-100 mb-2">{today}</div>
            <h2 className="text-2xl font-bold mb-2">Welcome, {profile?.full_name || 'Resident'}!</h2>
            <p className="text-blue-100 mb-6">Help keep your barangay safe by reporting incidents you encounter.</p>
            <button
              onClick={() => navigate('/report')}
              className="px-4 py-2 bg-white text-blue-700 rounded font-medium hover:bg-gray-100"
            >
              Report an Incident
            </button>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/report')}
              className="bg-white border border-gray-200 rounded p-6 text-left hover:border-gray-300 hover:bg-gray-50 transition"
            >
              <h3 className="font-semibold text-gray-900 mb-1">Report Incident</h3>
              <p className="text-sm text-gray-600">Drop a pin on the map</p>
            </button>
            <button
              onClick={() => navigate('/map')}
              className="bg-white border border-gray-200 rounded p-6 text-left hover:border-gray-300 hover:bg-gray-50 transition"
            >
              <h3 className="font-semibold text-gray-900 mb-1">View Map</h3>
              <p className="text-sm text-gray-600">See nearby incidents</p>
            </button>
          </div>

          {/* My Reports */}
          <div className="bg-white border border-gray-200 rounded">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">My Reports</h3>
              <span className="text-xs text-gray-500">0 total</span>
            </div>
            <div className="grid grid-cols-3 gap-4 p-6">
              <div className="bg-gray-50 rounded p-4 text-center">
                <div className="text-2xl font-bold text-gray-700">0</div>
                <div className="text-xs text-gray-600 mt-1">Pending</div>
              </div>
              <div className="bg-gray-50 rounded p-4 text-center">
                <div className="text-2xl font-bold text-gray-700">0</div>
                <div className="text-xs text-gray-600 mt-1">Responding</div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-4 text-center">
                <div className="text-xl font-bold text-emerald-600">0</div>
                <div className="text-xs text-emerald-700 mt-1">Resolved</div>
              </div>
            </div>
            <div className="px-5 pb-5 text-center">
              <div className="inline-flex items-center gap-2 text-xs text-gray-400">
                <Clock size={14} className="animate-spin" />
                Loading...
              </div>
            </div>
          </div>

          {/* Recent Community Alerts */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Recent Community Alerts</h3>
              <button
                onClick={() => navigate('/map')}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                View Map
                <ChevronRight size={14} />
              </button>
            </div>
            <div className="p-8 text-center">
              <div className="inline-flex items-center gap-2 text-xs text-gray-400">
                <Clock size={14} className="animate-spin" />
                Loading...
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
