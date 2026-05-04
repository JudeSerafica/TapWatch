import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, MapPin, FileText, LogOut, Shield } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { path: '/dashboard', label: 'My Dashboard', icon: LayoutDashboard },
  { path: '/report', label: 'Report Incident', icon: FileText },
  { path: '/map', label: 'Incident Map', icon: MapPin },
]

export default function ResidentSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  return (
    <aside className="w-60 min-h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 z-50">
      <div className="p-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center">
          <Shield size={18} className="text-white" />
        </div>
        <div>
          <div className="font-bold text-gray-900 text-sm leading-tight">Tap-Watch</div>
          <div className="text-xs text-gray-500">Incident System</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const active = location.pathname === item.path
          const Icon = item.icon
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-xs font-semibold text-blue-700">
              {(user?.name || 'U')[0].toUpperCase()}
            </span>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{user?.name || 'Resident'}</div>
            <div className="text-xs text-gray-500">Resident</div>
          </div>
        </div>
        <button
          onClick={() => { signOut(); navigate('/login') }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          System Active
        </div>
      </div>
    </aside>
  )
}
