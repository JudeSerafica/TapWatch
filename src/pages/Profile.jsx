import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Phone, MapPin, Shield, ArrowLeft, Edit3, LogOut, X } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import ResidentSidebar from '../components/ResidentSidebar'
import MobileBottomNav from '../components/MobileBottomNav'
import TopBar from '../components/TopBar'

export default function Profile() {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoggingOut(false)
      setShowLogoutModal(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ResidentSidebar />
      <div className="flex-1 md:ml-60 pb-16 md:pb-0">
        <TopBar title="My Profile" />
        <main className="p-4 md:p-6 max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-4 md:p-6 text-white">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-12 md:w-16 h-12 md:h-16 rounded-full bg-white/20 flex items-center justify-center">
                  <User size={24} className="text-white md:w-8 md:h-8" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-bold">{profile?.full_name || user?.user_metadata?.full_name || 'Resident'}</h2>
                  <p className="text-xs md:text-sm text-blue-100 capitalize">{profile?.role || 'Resident'}</p>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="p-4 md:p-6 space-y-3 md:space-y-4">
              <div className="flex items-center gap-2 md:gap-3 p-3 md:p-3 rounded-lg bg-gray-50">
                <Mail size={16} className="text-gray-500 md:w-5 md:h-5" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-xs md:text-sm font-medium text-gray-900">{user?.email || profile?.email || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-3 p-3 md:p-3 rounded-lg bg-gray-50">
                <Phone size={16} className="text-gray-500 md:w-5 md:h-5" />
                <div>
                  <p className="text-xs text-gray-500">Contact Number</p>
                  <p className="text-xs md:text-sm font-medium text-gray-900">{profile?.phone || 'Not set'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-3 p-3 md:p-3 rounded-lg bg-gray-50">
                <MapPin size={16} className="text-gray-500 md:w-5 md:h-5" />
                <div>
                  <p className="text-xs text-gray-500">Address / Purok</p>
                  <p className="text-xs md:text-sm font-medium text-gray-900">{profile?.address || profile?.purok || 'Not set'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-3 p-3 md:p-3 rounded-lg bg-gray-50">
                <Shield size={16} className="text-gray-500 md:w-5 md:h-5" />
                <div>
                  <p className="text-xs text-gray-500">Account Status</p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <p className="text-xs md:text-sm font-medium text-gray-900">Active</p>
                  </div>
                </div>
              </div>

              <div className="pt-3 md:pt-4 border-t border-gray-100 space-y-2">
                <div className="flex gap-2 md:gap-3">
                  <button
                    onClick={() => navigate('/profile-setup')}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg text-xs md:text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    <Edit3 size={14} />
                    Edit Profile
                  </button>
                  <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs md:text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    <ArrowLeft size={14} />
                    Back
                  </button>
                </div>
                
                {/* Sign Out Button - Mobile & Tablet Only */}
                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="lg:hidden w-full flex items-center justify-center gap-2 px-3 md:px-4 py-2.5 bg-red-50 text-red-600 rounded-lg text-xs md:text-sm font-medium hover:bg-red-100 transition-colors border border-red-200"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
      <MobileBottomNav />

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full animate-scale-in">
            {/* Modal Header */}
            <div className="p-4 md:p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base md:text-lg font-semibold text-gray-900">Confirm Logout</h3>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isLoggingOut}
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 md:p-6">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-red-100 flex items-center justify-center">
                  <LogOut size={24} className="text-red-600" />
                </div>
                <div>
                  <p className="text-sm md:text-base text-gray-700 font-medium mb-1">
                    Are you sure you want to logout?
                  </p>
                  <p className="text-xs md:text-sm text-gray-500">
                    You'll need to sign in again to access your account.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 md:p-5 border-t border-gray-100 flex gap-2 md:gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-xs md:text-sm font-medium hover:bg-gray-200 transition-colors"
                disabled={isLoggingOut}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-xs md:text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoggingOut}
              >
                {isLoggingOut ? 'Logging out...' : 'Yes, Logout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
