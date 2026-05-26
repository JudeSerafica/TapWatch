import { useNavigate } from 'react-router-dom'
import { User, Mail, Phone, MapPin, Shield, ArrowLeft, Edit3 } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import ResidentSidebar from '../components/ResidentSidebar'
import MobileBottomNav from '../components/MobileBottomNav'
import TopBar from '../components/TopBar'

export default function Profile() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()

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

              <div className="pt-3 md:pt-4 border-t border-gray-100 flex gap-2 md:gap-3">
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
            </div>
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  )
}
