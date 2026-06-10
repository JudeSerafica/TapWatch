import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, MapPin, FileText, BarChart3, Phone, LogOut, X, AlertTriangle, Shield } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { useState, useEffect } from 'react'
import { getPendingVerifications } from '../lib/userVerification'
import { MdOutlineAdminPanelSettings } from "react-icons/md"
import { supabase } from '../lib/supabase'

const navItems = [
  { path: '/admin', label: 'Officials Dashboard', icon: LayoutDashboard },
  { path: '/admin-map', label: 'Incident Map', icon: MapPin },
  { path: '/admin-reports', label: 'All Reports', icon: FileText },
  { path: '/admin-verification', label: 'Verification Review', icon: Shield },
  { path: '/admin-contacts', label: 'Emergency Contacts', icon: Phone },
  { path: '/admin-analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/admin-settings', label: 'System Settings', icon: MdOutlineAdminPanelSettings},
]

export default function AdminSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    loadPendingCount()
    
    // Subscribe to real-time updates on user_verifications table
    const subscription = supabase
      .channel('public:user_verifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_verifications' },
        () => {
          console.log('🔄 Verification data changed, reloading count...')
          loadPendingCount()
        }
      )
      .subscribe()

    // Also refresh count every 30 seconds as fallback
    const interval = setInterval(loadPendingCount, 30000)

    return () => {
      clearInterval(interval)
      subscription.unsubscribe()
    }
  }, [])

  const loadPendingCount = async () => {
    try {
      const { data } = await getPendingVerifications()
      setPendingCount(data?.length || 0)
    } catch (err) {
      console.error('Error loading pending count:', err)
    }
  }

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
        <div className="px-5 pt-6 pb-5 border-b border-white/30">
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
    const active = isActive(item.path)
    const Icon = item.icon
    const showBadge =
      item.path === '/admin-verification' &&
      pendingCount > 0

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
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        <Icon size={18} className="flex-shrink-0" />

        <span className="flex-1 text-left truncate">{item.label}</span>

        {showBadge && (
          <span
            className="
              absolute
              right-4
              w-5
              h-5
              rounded-full
              bg-red-500
              text-white
              text-[11px]
              flex
              items-center
              justify-center
              font-bold
              flex-shrink-0
            "
          >
            {pendingCount}
          </span>
        )}
      </button>
    )
  })}
</nav>


        <div className="border-t border-white/10 p-5">
  <div className="flex items-center gap-3 mb-5">
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
      "
    >
      {(user?.name || 'A')[0].toUpperCase()}
    </div>

    <div>
      <div className="text-white text-sm font-medium">
        {user?.name || 'Admin'}
      </div>

      <div className="text-blue-100 text-xs">
        Barangay Official
      </div>
    </div>
  </div>

  <button
    onClick={() => setShowSignOutModal(true)}
    className="
      flex items-center gap-3
      text-white
      hover:text-blue-200
      transition
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
