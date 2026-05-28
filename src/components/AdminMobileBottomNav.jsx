import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, MapPin, FileText, BarChart3 } from 'lucide-react'

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin-map', label: 'Admin Map', icon: MapPin },
  { path: '/admin-reports', label: 'All Reports', icon: FileText },
  { path: '/admin-analytics', label: 'Analytics', icon: BarChart3 },
]

export default function AdminMobileBottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin'
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 md:hidden z-40">
      {navItems.map((item) => {
        const active = isActive(item.path)
        const Icon = item.icon
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center w-1/4 h-full transition-colors ${
              active
                ? 'text-blue-600'
                : 'text-gray-500'
            }`}
          >
            <Icon size={24} />
            <span className="text-xs mt-0.5">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
