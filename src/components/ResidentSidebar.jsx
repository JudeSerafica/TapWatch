import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, MapPin, FileText, LogOut, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/report', label: 'Report Incident', icon: FileText },
  { path: '/map', label: 'Incident Map', icon: MapPin },
  { path: '/profile', label: 'My Profile', icon: User },
]

export default function ResidentSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Resident'
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <aside className="w-60 min-h-screen bg-gray-900 text-gray-50 flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6 border-b border-gray-800">
        <div className="font-bold text-lg">Tap-Watch</div>
        <div className="text-xs text-gray-400">Incident System</div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = location.pathname === item.path
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
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-3 mb-3 w-full text-left hover:bg-gray-800 rounded p-2 -mx-2 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center">
            <span className="text-xs font-semibold text-white">
              {initials}
            </span>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-50">{displayName}</div>
            <div className="text-xs text-gray-400">{profile?.role || 'Resident'}</div>
          </div>
        </button>
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
