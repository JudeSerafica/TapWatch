import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, MapPin, FileText, BarChart3, Phone } from 'lucide-react'

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin-map', label: 'Map', icon: MapPin },
  { path: '/admin-reports', label: 'Reports', icon: FileText },
  { path: '/admin-analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/admin-contacts', label: 'Contacts', icon: Phone },
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
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              active
                ? 'text-blue-600'
                : 'text-gray-500'
            }`}
          >
            <Icon size={22} />
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
