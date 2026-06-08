import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, MapPin, FileText, LogOut, User, X, AlertTriangle, Shield } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { useState } from 'react'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/report', label: 'Report Incident', icon: FileText },
  { path: '/resident-map', label: 'Incident Map', icon: MapPin },
  { path: '/verification', label: 'Verification', icon: Shield },
  { path: '/profile', label: 'My Profile', icon: User },
]

export default function ResidentSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const [showSignOutModal, setShowSignOutModal] = useState(false)

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Resident'
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const handleSignOut = async () => {
    setShowSignOutModal(false)
    await signOut()
    // signOut will handle the redirect
  }

  return (
    <>
      <aside
        className="hidden md:flex w-64 min-h-screen fixed left-0 top-0 z-50 flex-col overflow-hidden"
        style={{
          background: `
            linear-gradient(
              180deg,
              #0B4EDB 0%,
              #0A43C4 40%,
              #0838A8 70%,
              #072E8A 100%
            )
          `,
        }}
      >
        {/* Logo Section */}
        <div className="px-5 pt-6 pb-5 border-b border-white/20">
          <div className="flex items-center gap-3">
            <img
              src="/Tapinac.logo.jpg"
              alt="Logo"
              className="w-12 h-12 rounded-full border-2 border-white/30 object-cover"
            />

            <div>
              <h1 className="font-bold text-white text-xl">
                Tap-Watch
              </h1>

              <p className="text-blue-100 text-sm">
                Incident System
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-5 space-y-2">
          {navItems.map((item) => {
            const active = location.pathname === item.path
            const Icon = item.icon
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`
                  w-full flex items-center gap-3
                  px-4 py-3
                  rounded-xl
                  text-sm font-medium
                  transition-all duration-200
                  h-11
                `}
                style={{
                  background: active
                    ? '#FFFFFF'
                    : 'transparent',
                  color: active
                    ? '#0B4EDB'
                    : '#FFFFFF',
                  boxShadow: active
                    ? '0 8px 25px rgba(0,0,0,0.15)'
                    : 'none',
                  lineHeight: '1.5',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.boxShadow = 'none'
                  }
                }}
              >
                <Icon size={18} className="flex-shrink-0" />
                <span className="flex-1 text-left truncate">{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-5">
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-3 mb-5 w-full text-left rounded-lg p-2.5 transition-colors hover:bg-blue-600/30"
          >
            <div
              className="
                w-10 h-10
                rounded-full
                bg-blue-500
                flex
                items-center
                justify-center
                text-white
                font-semibold
                overflow-hidden
                flex-shrink-0
              "
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-semibold">
                  {initials}
                </span>
              )}
            </div>

            <div>
              <div className="text-white text-sm font-medium">
                {displayName}
              </div>

              <div className="text-blue-100 text-xs">
                {profile?.role || 'Resident'}
              </div>
            </div>
          </button>

          <button
            onClick={() => setShowSignOutModal(true)}
            className="
              flex items-center gap-3
              text-white
              hover:text-blue-200
              transition
              w-full
              px-4 py-2
            "
          >
            <LogOut size={18} />
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
                Are you sure you want to sign out? You'll need to log in again to access your account.
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
