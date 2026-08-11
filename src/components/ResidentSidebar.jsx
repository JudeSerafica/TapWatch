import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, MapPin, FileText, LogOut, User, X, AlertTriangle, Shield, Menu } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { useSidebar } from '../context/SidebarContext'
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
  const { isCollapsed, setIsCollapsed } = useSidebar()
  const [showSignOutModal, setShowSignOutModal] = useState(false)

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Resident'
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const handleSignOut = async () => {
    setShowSignOutModal(false)
    await signOut()
  }

  return (
    <>
      <aside
        className={`
          hidden md:flex min-h-screen fixed left-0 top-0 z-50 flex-col overflow-hidden
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-16' : 'w-64'}
        `}
        onMouseEnter={() => setIsCollapsed(false)}
        onMouseLeave={() => setIsCollapsed(true)}
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
        <div className={`
          px-3 pt-6 pb-5 border-b border-white/30 
          transition-all duration-300
          ${isCollapsed ? 'px-2' : 'px-5'}
        `}>
          <div className="flex items-center gap-3 relative">
            {/* Logo Button with Hover Tooltip */}
            <div className="relative group w-full">
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`
                  flex items-center gap-3 w-full
                  transition-all duration-300
                  rounded-xl hover:bg-white/10
                  ${isCollapsed ? 'p-2 justify-center' : 'p-2'}
                  relative
                `}
              >
                {/* Logo/Icon container with transition */}
                <div className="relative flex-shrink-0">
                  {/* Original Logo */}
                  <img
                    src="/Tapinac.logo.jpg"
                    alt="Logo"
                    className={`
                      rounded-full border-2 border-white/30
                      transition-all duration-300
                      ${isCollapsed ? 'w-9 h-9 group-hover:opacity-0' : 'w-12 h-12'}
                    `}
                    style={{ objectFit: 'cover' }}
                  />
                  
                  {/* Panel Icon (shows on hover when collapsed) */}
                  {isCollapsed && (
                    <div 
                      className="
                        absolute inset-0 flex items-center justify-center
                        opacity-0 group-hover:opacity-100
                        transition-opacity duration-300
                      "
                    >
                      <div className="w-9 h-9 rounded-xl bg-white/20 border-2 border-white/30 flex items-center justify-center">
                        <svg 
                          width="18" 
                          height="18" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2.5"
                          className="text-white"
                        >
                          <rect x="3" y="3" width="7" height="18" rx="1" />
                          <rect x="14" y="3" width="7" height="18" rx="1" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                {/* "Open sidebar" text - shows on hover when collapsed */}
                {isCollapsed && (
                  <span 
                    className="
                      absolute left-14 text-white text-xs font-medium
                      opacity-0 group-hover:opacity-100
                      transition-opacity duration-300
                      whitespace-nowrap
                    "
                  >
                    Open sidebar
                  </span>
                )}

                {!isCollapsed && (
                  <div className="transition-opacity duration-200">
                    <h1 className="font-bold text-white text-xl">
                      Tap-Watch
                    </h1>
                    <p className="text-blue-100 text-sm">
                      Incident System
                    </p>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        <nav className={`
          flex-1 py-5 space-y-2 transition-all duration-300
          ${isCollapsed ? 'px-2' : 'px-4'}
        `}>
          {navItems.map((item) => {
            const active = location.pathname === item.path
            const Icon = item.icon
            return (
              <div key={item.path} className="relative group">
                <button
                  onClick={() => navigate(item.path)}
                  className={`
                    w-full flex items-center
                    ${isCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-4 py-3'}
                    rounded-xl
                    text-sm font-medium
                    transition-all duration-200
                    relative
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
                    overflow: 'visible',
                  }}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {!isCollapsed && (
                    <span className="flex-1 text-left truncate">{item.label}</span>
                  )}
                </button>

                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div
                    className="
                      absolute left-16 top-1/2 -translate-y-1/2
                      bg-gray-900 text-white text-sm
                      px-3 py-2 rounded-lg
                      opacity-0 group-hover:opacity-100
                      pointer-events-none
                      transition-opacity duration-200
                      z-50
                      whitespace-nowrap
                      shadow-lg
                    "
                  >
                    {item.label}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className={`
          border-t border-white/10 transition-all duration-300
          ${isCollapsed ? 'p-2' : 'p-5'}
        `}>
          {!isCollapsed && (
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
          )}

          {/* Sign Out Button */}
          <div className="relative group">
            <button
              onClick={() => setShowSignOutModal(true)}
              className={`
                flex items-center
                text-white
                hover:text-blue-200
                transition
                w-full
                ${isCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-4 py-3'}
              `}
            >
              <LogOut size={18} />
              {!isCollapsed && <span>Sign Out</span>}
            </button>

            {/* Tooltip for collapsed state */}
            {isCollapsed && (
              <div
                className="
                  absolute left-16 top-1/2 -translate-y-1/2
                  bg-gray-900 text-white text-sm
                  px-3 py-2 rounded-lg
                  opacity-0 group-hover:opacity-100
                  pointer-events-none
                  transition-opacity duration-200
                  z-50
                  whitespace-nowrap
                  shadow-lg
                "
              >
                Sign Out
              </div>
            )}
          </div>
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
