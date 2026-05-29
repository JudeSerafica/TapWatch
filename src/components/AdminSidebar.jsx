import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, MapPin, FileText, BarChart3, Phone, LogOut } from 'lucide-react'
import { useAuth } from '../context/useAuth'

const navItems = [
  { path: '/admin', label: 'Officials Dashboard', icon: LayoutDashboard },
  { path: '/admin-map', label: 'Incident Map', icon: MapPin },
  { path: '/admin-reports', label: 'All Reports', icon: FileText },
  { path: '/admin-analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/admin-contacts', label: 'Emergency Contacts', icon: Phone },
]

export default function AdminSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin'
    return location.pathname.startsWith(path)
  }

  return (
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
          onClick={() => { signOut(); navigate('/login') }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-800 transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
