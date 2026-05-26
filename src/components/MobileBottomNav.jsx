import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Plus, MapPin, User } from 'lucide-react'

const navItems = [
  { path: '/dashboard', label: 'Home', icon: Home },
  { path: '/report', label: 'Report', icon: Plus },
  { path: '/map', label: 'Map', icon: MapPin },
  { path: '/profile', label: 'Profile', icon: User },
]

export default function MobileBottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 md:hidden z-40">
      {navItems.map((item) => {
        const active = location.pathname === item.path
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
