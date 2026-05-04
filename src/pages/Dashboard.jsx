import { useNavigate } from 'react-router-dom'
import { FileText, MapPin, AlertTriangle, Clock, CheckCircle, ChevronRight, FileWarning } from 'lucide-react'
import ResidentSidebar from '../components/ResidentSidebar'
import TopBar from '../components/TopBar'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ResidentSidebar />
      <div className="flex-1 ml-60">
        <TopBar title="My Dashboard">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="text-xs text-gray-600">Live</span>
          </div>
        </TopBar>

        <main className="p-6 space-y-6">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-blue-700 to-blue-500 rounded-xl p-6 text-white">
            <div className="text-xs text-blue-100 mb-1">{today}</div>
            <h2 className="text-2xl font-bold mb-1">Welcome!</h2>
            <p className="text-sm text-blue-100 mb-4">Help keep your barangay safe by reporting incidents.</p>
            <button
              onClick={() => navigate('/report')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              <AlertTriangle size={16} />
              Report an Incident
            </button>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/report')}
              className="bg-white rounded-xl border border-gray-200 p-6 text-center hover:shadow-sm transition-shadow"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle size={20} className="text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">Report Incident</h3>
              <p className="text-xs text-gray-500 mt-1">Drop a pin on the map</p>
            </button>
            <button
              onClick={() => navigate('/map')}
              className="bg-white rounded-xl border border-gray-200 p-6 text-center hover:shadow-sm transition-shadow"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mx-auto mb-3">
                <MapPin size={20} className="text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">View Map</h3>
              <p className="text-xs text-gray-500 mt-1">See nearby incidents</p>
            </button>
          </div>

          {/* My Reports */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-gray-500" />
                <h3 className="font-semibold text-gray-900 text-sm">My Reports</h3>
              </div>
              <span className="text-xs text-gray-400">0 total</span>
            </div>
            <div className="grid grid-cols-3 gap-4 p-5">
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <div className="text-xl font-bold text-amber-600">0</div>
                <div className="text-xs text-amber-700 mt-1">Pending</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-xl font-bold text-blue-600">0</div>
                <div className="text-xs text-blue-700 mt-1">Responding</div>
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
