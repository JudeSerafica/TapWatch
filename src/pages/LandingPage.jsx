import { useNavigate } from 'react-router-dom'
import { Shield, MapPin, Bell, BarChart3, FileText, ChevronRight } from 'lucide-react'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-base">Tap-Watch</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium mb-6">
          <Shield size={14} />
          Barangay Incident Reporting System
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
          Report Incidents. Protect Your Community.
        </h1>
        <p className="text-gray-500 text-lg max-w-2xl mx-auto mb-8">
          A real-time platform for residents to report incidents and for barangay officials
          to monitor, respond, and analyze community safety.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate('/signup')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <FileText size={18} />
            Report Incident
          </button>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Official Login
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">Key Features</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
              <MapPin size={20} className="text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Map-Based Reporting</h3>
            <p className="text-sm text-gray-500">
              Drop a pin on the barangay map to report incidents with exact location accuracy.
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center mb-4">
              <Bell size={20} className="text-amber-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Real-Time Alerts</h3>
            <p className="text-sm text-gray-500">
              Officials receive instant dashboard notifications, email, and SMS alerts for new incidents.
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-4">
              <BarChart3 size={20} className="text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Analytics & Hotspots</h3>
            <p className="text-sm text-gray-500">
              Track incident trends, identify hotspots, and generate reports for preventive actions.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="bg-blue-600 rounded-2xl p-10 text-center text-white">
          <h2 className="text-2xl font-bold mb-3">Help Keep Your Barangay Safe</h2>
          <p className="text-blue-100 mb-6 max-w-lg mx-auto">
            Join hundreds of residents already using BarangayWatch to report and track incidents in your community.
          </p>
          <button
            onClick={() => navigate('/signup')}
            className="px-6 py-3 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors inline-flex items-center gap-2"
          >
            Get Started
            <ChevronRight size={18} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-gray-400">
          BarangayWatch Incident System. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
