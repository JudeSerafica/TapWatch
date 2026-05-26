import { useNavigate } from 'react-router-dom'
import { Clock } from 'lucide-react'
import ResidentSidebar from '../components/ResidentSidebar'
import MobileBottomNav from '../components/MobileBottomNav'
import TopBar from '../components/TopBar'
import { useAuth } from '../context/useAuth'
import { FaMapPin, FaMapMarkedAlt, FaBell  } from "react-icons/fa";
import { color } from 'chart.js/helpers'
import { MdWavingHand } from "react-icons/md";
import { BsFillTelephoneFill } from "react-icons/bs";

export default function Dashboard() {
  const navigate = useNavigate()
  const { profile } = useAuth()

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

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
          <div className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -ml-8 -mb-8"></div>
            <div className="relative z-10">
              <div className="text-xs md:text-sm text-blue-100 mb-3 font-medium">{today}</div>
              <h2 className="text-2xl md:text-4xl font-bold mb-3">Hello, {profile?.full_name || 'Resident'}!{" "}
                <MdWavingHand className="inline text-yellow-400" />
              </h2> 
              <p className="text-sm md:text-base text-blue-100 mb-6 leading-relaxed">Help keep your barangay safe by reporting incidents you encounter.</p>
              <button
                onClick={() => navigate('/report')}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-50 transition-colors shadow-md"
              >
                <FaMapPin style={{ color: 'red' }} /> Report an Incident
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">⚡ Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <button
                onClick={() => navigate('/report')}
                className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 text-left hover:border-red-300 hover:bg-red-50 transition flex flex-col items-start"
              >
                <div className="text-2xl mb-2"><FaMapPin style={{ color: 'red' }} /></div>
                <h3 className="font-semibold text-gray-900 text-sm">Report Incident</h3>
                <p className="text-xs text-gray-600">Submit a report</p>
              </button>
              <button
                onClick={() => navigate('/map')}
                className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 text-left hover:border-blue-300 hover:bg-blue-50 transition flex flex-col items-start"
              >
                <div className="text-2xl mb-2"><FaMapMarkedAlt style={{ color: 'blue' }} /></div>
                <h3 className="font-semibold text-gray-900 text-sm">View Map</h3>
                <p className="text-xs text-gray-600">See nearby incidents</p>
              </button>
              <button
                onClick={() => navigate('/map')}
                className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 text-left hover:border-green-300 hover:bg-green-50 transition flex flex-col items-start"
              >
                <div className="text-2xl mb-2"><FaBell className="text-yellow-500" /></div>
                <h3 className="font-semibold text-gray-900 text-sm">Community Alerts</h3>
                <p className="text-xs text-gray-600">Latest updates</p>
              </button>
              <button
                onClick={() => {}}
                className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 text-left hover:border-orange-300 hover:bg-orange-50 transition flex flex-col items-start"
              >
                <div className="text-2xl mb-2"><BsFillTelephoneFill className="text-red-400" /></div>
                <h3 className="font-semibold text-gray-900 text-sm">Emergency Hotline</h3>
                <p className="text-xs text-gray-600">Call for immediate help</p>
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">📋 My Reports</h3>
              <a href="#" className="text-xs text-blue-600 font-semibold hover:text-blue-700">View All →</a>
            </div>
            <div className="grid grid-cols-3 gap-3 p-4 md:p-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 text-center">
                <div className="text-2xl md:text-3xl font-bold text-blue-600">0</div>
                <div className="text-xs text-blue-700 mt-2 font-medium">⏱️ Pending</div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 text-center">
                <div className="text-2xl md:text-3xl font-bold text-amber-600">0</div>
                <div className="text-xs text-amber-700 mt-2 font-medium">🔄 Responding</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 text-center">
                <div className="text-2xl md:text-3xl font-bold text-green-600">0</div>
                <div className="text-xs text-green-700 mt-2 font-medium">✓ Resolved</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">🚨 Recent Community Alerts</h3>
              <button
                onClick={() => navigate('/map')}
                className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:text-blue-700"
              >
                View all →
              </button>
            </div>
            <div className="p-4 md:p-5 space-y-3">
              <div className="inline-flex items-center gap-2 text-xs text-gray-400">
                <Clock size={14} className="animate-spin" />
                Loading alerts...
              </div>
            </div>
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  )
}