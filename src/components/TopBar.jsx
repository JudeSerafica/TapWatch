import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, User, X, AlertTriangle, ChevronDown, Settings } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import NotificationButton from './NotificationButton'
import LanguageSwitch from './LanguageSwitch'

export default function TopBar({ title, mobileTitle, children, showUserMenu = false, showNotifications = false, onNotificationClick }) {
  const [showMenu, setShowMenu] = useState(false)
  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const handleSignOut = async () => {
    setShowSignOutModal(false)
    setShowMenu(false)
    await signOut()
  }

  return (
    <>
      <header className="h-14 md:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
        <h1 className="text-base md:text-lg font-semibold text-gray-900 md:hidden">{mobileTitle || title}</h1>
        <h1 className="hidden md:block text-lg font-semibold text-gray-900">{title}</h1>
        <div className="flex items-center gap-2 md:gap-3">
          {/* Language Switch */}
          <LanguageSwitch />
          
          {/* Notification Button */}
          {showNotifications && (
            <NotificationButton onNotificationClick={onNotificationClick} />
          )}
          
          {children}

          {/* Mobile avatar — residents go to /profile, admins get a sign-out dropdown */}
          {profile?.role === 'admin' ? (
            <div className="relative flex-shrink-0 md:hidden">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="relative"
              >
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center border-2 border-blue-200">
                  <span className="text-xs font-semibold text-white">{initials}</span>
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-white">{initials}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{displayName}</div>
                          <div className="text-xs text-gray-500 capitalize">{profile?.role || 'Admin'}</div>
                        </div>
                      </div>
                    </div>
                    {/* Sign Out */}
                    <div className="py-1">
                      <button
                        onClick={() => { setShowMenu(false); setShowSignOutModal(true) }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                      >
                        <LogOut size={16} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => navigate('/profile')}
              className="relative flex-shrink-0 md:hidden"
            >
              <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden border-2 border-gray-200">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <User size={18} className="text-gray-500" />
                )}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
            </button>
          )}
          
          {/* User Menu Button - Only show on desktop when showUserMenu is true */}
          {showUserMenu && (
            <div className="relative hidden md:block">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-xs font-semibold text-white">{initials}</span>
                </div>
                <ChevronDown size={16} className="text-gray-600" />
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowMenu(false)}
                  />
                  
                  {/* Menu */}
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                          <span className="text-sm font-semibold text-white">{initials}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{displayName}</div>
                          <div className="text-xs text-gray-500 capitalize">{profile?.role || 'User'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      {/* System Settings Button */}
                      <button
                        onClick={() => {
                          setShowMenu(false)
                          navigate('/admin-settings')
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                      >
                        <Settings size={18} />
                        <span>System Settings</span>
                      </button>

                      {/* Sign Out Button */}
                      <button
                        onClick={() => {
                          setShowMenu(false)
                          setShowSignOutModal(true)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                      >
                        <LogOut size={18} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

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
