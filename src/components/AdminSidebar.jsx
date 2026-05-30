import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, MapPin, FileText, BarChart3, Phone, LogOut, X, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { useState } from 'react'

const navItems = [
  { path: '/admin', label: 'Officials Dashboard', icon: LayoutDashboard },
  { path: '/admin-map', label: 'Incident Map', icon: MapPin },
  { path: '/admin-reports', label: 'All Reports', icon: FileText },
  { path: '/admin-contacts', label: 'Emergency Contacts', icon: Phone },
  { path: '/admin-analytics', label: 'Analytics', icon: BarChart3 },
  ,
]

export default function AdminSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [showSignOutModal, setShowSignOutModal] = useState(false)

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin'
    return location.pathname.startsWith(path)
  }

  const handleSignOut = async () => {
    setShowSignOutModal(false)
    await signOut()
    // signOut will handle the redirect
  }

  return (
    <>
      <aside className="hidden md:flex w-60 min-h-screen bg-gray-900 text-gray-50 flex-col fixed left-0 top-0 z-50">
        <div className="p-6 border-b border-gray-800">
          <div className="font-bold text-lg">Tap-Watch</div>
          <div className="text-xs text-gray-400">Incident System</div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.path)
            const Icon = item.icon
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-700 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center">
              <span className="text-xs font-semibold text-white">
                {(user?.name || 'A')[0].toUpperCase()}
              </span>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-50">{user?.name || 'Admin'}</div>
              <div className="text-xs text-gray-400">Barangay Official</div>
            </div>
          </div>
          <button
            onClick={() => setShowSignOutModal(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-800 transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Sign Out Confirmation Modal */}
      {showSignOutModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Sign Out</h3>
              </div>
              <button
                onClick={() => setShowSignOutModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              <p className="text-gray-700 text-sm leading-relaxed">
                Are you sure you want to sign out? You'll need to log in again to access the admin panel.
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowSignOutModal(false)}
                className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
