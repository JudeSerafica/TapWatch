import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FileText, MapPin, BarChart3 } from 'lucide-react'

const tabs = [
  { path: '/admin', label: 'Officials Dashboard', icon: LayoutDashboard },
  { path: '/admin-map', label: 'Incident Map', icon: MapPin },
  { path: '/admin-reports', label: 'All Reports', icon: FileText },
  { path: '/admin-analytics', label: 'Analytics', icon: BarChart3 },
]

export default function AdminNavTabs() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div className="bg-white border-b border-gray-200 px-6">
      <div className="flex gap-1 -mb-px">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path ||
            (tab.path === '/admin' && location.pathname === '/admin')
          const Icon = tab.icon
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                active
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
