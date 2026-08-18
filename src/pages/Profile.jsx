import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Phone, MapPin, Shield, Edit3, LogOut, X, Save, Camera } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { useSidebar } from '../context/SidebarContext'
import { supabase } from '../lib/supabase'
import ResidentSidebar from '../components/ResidentSidebar'
import MobileBottomNav from '../components/MobileBottomNav'
import TopBar from '../components/TopBar'
 
export default function Profile() {
  const navigate = useNavigate()
  const { user, profile, signOut, saveProfile } = useAuth()
  const { isCollapsed } = useSidebar()
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    address: '',
    purok: '',
  })
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
 
  // Simulate loading state resolved when profile is available
  useEffect(() => {
    if (profile !== undefined) {
      setIsLoading(false)
    }
  }, [profile])
 
  // Initialize form when profile loads or modal opens
  useEffect(() => {
    if (showEditModal && profile) {
      setForm({
        fullName: profile.full_name || '',
        phone: profile.phone || '',
        address: profile.address || '',
        purok: profile.purok || '',
      })
      setError('')
      setAvatarPreview(profile.avatar_url || null)
      setAvatarFile(null)
    }
  }, [showEditModal, profile])
 
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB')
        return
      }
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }
 
  const uploadAvatar = async () => {
    if (!avatarFile) return profile?.avatar_url
 
    setUploadingAvatar(true)
    try {
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${user.id}/avatar_${Date.now()}.${fileExt}`
 
      // Delete old avatar if exists — extract path correctly from full public URL
      if (profile?.avatar_url) {
        try {
          const url = new URL(profile.avatar_url)
          // Path after /object/public/avatars/ is the storage path
          const parts = url.pathname.split('/object/public/avatars/')
          if (parts.length > 1) {
            const oldStoragePath = parts[1]
            await supabase.storage.from('avatars').remove([oldStoragePath])
          }
        } catch {
          // Non-critical: if old avatar deletion fails, still proceed
          console.warn('Could not delete old avatar, continuing with upload.')
        }
      }
 
      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, {
          cacheControl: '3600',
          upsert: true,
        })
 
      if (uploadError) throw uploadError
 
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)
 
      return urlData.publicUrl
    } catch (err) {
      console.error('Avatar upload error:', err)
      throw new Error('Failed to upload avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }
 
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setError('')
    setIsSaving(true)
 
    try {
      // Upload avatar first if changed
      let avatarUrl = profile?.avatar_url
      if (avatarFile) {
        avatarUrl = await uploadAvatar()
      }
 
      const updates = {
        full_name: form.fullName,
        phone: form.phone,
        address: form.address,
        purok: form.purok,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      }
 
      // Update Supabase
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
 
      if (updateError) throw updateError
 
      // Update context state instead of hard reload
      if (typeof saveProfile === 'function') {
        await saveProfile({ ...profile, ...updates })
      }
 
      setShowEditModal(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }
 
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
 
  // Combined address display: show purok + address if both exist
  const displayAddress = [profile?.purok, profile?.address]
    .filter(Boolean)
    .join(', ') || 'Not set'
 
  const isVerified = profile?.verification_status === 'verified'
 
  const VerifiedBadge = () => (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg flex-shrink-0">
      <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">✓</span>
      <span className="text-xs font-semibold text-green-700">Verified</span>
    </div>
  )
 
  // Skeleton loader row
  const SkeletonRow = () => (
    <div className="flex items-center gap-3 pb-4 border-b border-gray-100 animate-pulse">
      <div className="p-2.5 bg-gray-100 rounded-lg">
        <div className="w-[18px] h-[18px] bg-gray-200 rounded" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="h-2.5 bg-gray-200 rounded w-24" />
        <div className="h-4 bg-gray-200 rounded w-48" />
      </div>
    </div>
  )
 
  return (
    <div className="flex min-h-screen bg-gray-50">
      <ResidentSidebar />
      <div className={`
        flex-1 pb-16 md:pb-0 transition-all duration-300
        ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}
      `}>
        <TopBar title="My Profile" showNotifications={true} />
        <main className="p-4 md:p-6 max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
 
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-4 md:p-6 text-white">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-12 md:w-16 h-12 md:h-16 rounded-full bg-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {isLoading ? (
                    <div className="w-full h-full bg-white/30 animate-pulse rounded-full" />
                  ) : profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={24} className="text-white md:w-8 md:h-8" />
                  )}
                </div>
                <div>
                  {isLoading ? (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-5 bg-white/30 rounded w-36" />
                      <div className="h-3.5 bg-white/20 rounded w-20" />
                    </div>
                  ) : (
                    <>
                      <h2 className="text-lg md:text-xl font-bold">
                        {profile?.full_name || user?.user_metadata?.full_name || 'Resident'}
                      </h2>
                      {/* Role + Active badge — matches image design */}
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs md:text-sm text-blue-100 capitalize">
                          {profile?.role || 'Resident'}
                        </p>
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 border border-green-400/40 rounded-full text-xs font-semibold text-green-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                          Active
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
 
            {/* Details */}
            <div className="p-4 md:p-6 space-y-4">
              {isLoading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : (
                <>
                  {/* Email Address */}
                  <div className="flex items-start justify-between gap-3 pb-4 border-b border-gray-100">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2.5 bg-blue-100 rounded-lg mt-0.5">
                        <Mail size={18} className="text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Email Address</p>
                        <p className="text-sm md:text-base font-medium text-gray-900 mt-1">
                          {user?.email || profile?.email || 'N/A'}
                        </p>
                      </div>
                    </div>
                    {isVerified && <VerifiedBadge />}
                  </div>
 
                  {/* Contact Number */}
                  <div className="flex items-start justify-between gap-3 pb-4 border-b border-gray-100">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2.5 bg-blue-100 rounded-lg mt-0.5">
                        <Phone size={18} className="text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Contact Number</p>
                        <p className="text-sm md:text-base font-medium text-gray-900 mt-1">
                          {profile?.phone || 'Not set'}
                        </p>
                      </div>
                    </div>
                    {isVerified && <VerifiedBadge />}
                  </div>
 
                  {/* Address / Zone — shows purok + address combined */}
                  <div className="flex items-start justify-between gap-3 pb-4 border-b border-gray-100">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2.5 bg-blue-100 rounded-lg mt-0.5">
                        <MapPin size={18} className="text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Address / Zone</p>
                        <p className="text-sm md:text-base font-medium text-gray-900 mt-1">
                          {displayAddress}
                        </p>
                      </div>
                    </div>
                    {isVerified && <VerifiedBadge />}
                  </div>
 
                  {/* Account Status */}
                  <div className="flex items-start justify-between gap-3 pb-4 border-b border-gray-100">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2.5 bg-blue-100 rounded-lg mt-0.5">
                        <Shield size={18} className="text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Account Status</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          <p className="text-sm md:text-base font-medium text-gray-900">Active</p>
                        </div>
                      </div>
                    </div>
                    {isVerified && <VerifiedBadge />}
                  </div>
 
                  {/* Status Message */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                    <Shield size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Your account is active and in good standing.</p>
                      <p className="text-xs text-gray-600 mt-1">Thank you for helping keep our community safe.</p>
                    </div>
                  </div>
 
                  {/* Buttons */}
                  <div className="pt-2 space-y-2">
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                    >
                      <Edit3 size={16} />
                      Edit Profile
                    </button>
 
                    {/* Sign Out — visible on mobile & tablet only (desktop uses sidebar) */}
                    <button
                      onClick={() => setShowLogoutModal(true)}
                      className="lg:hidden w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors border border-red-200"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
      <MobileBottomNav />
 
      {/* ── Edit Profile Modal ── */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scale-in">
 
            {/* Modal Header */}
            <div className="sticky top-0 bg-white p-4 md:p-5 border-b border-gray-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Edit3 size={20} className="text-blue-600" />
                <h3 className="text-base md:text-lg font-semibold text-gray-900">Edit Profile</h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isSaving}
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
 
            {/* Modal Body */}
            <form onSubmit={handleSaveProfile} className="p-4 md:p-6">
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                  {error}
                </div>
              )}
 
              {/* Avatar Upload */}
              <div className="mb-6 flex flex-col items-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={40} className="text-gray-400" />
                    )}
                  </div>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition shadow-lg"
                  >
                    <Camera size={16} className="text-white" />
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    disabled={isSaving}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">Click the camera icon to change photo</p>
              </div>
 
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Juan Dela Cruz"
                    disabled={isSaving}
                  />
                </div>
 
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="09123456789"
                    disabled={isSaving}
                  />
                  <p className="text-xs text-gray-400 mt-1">This will be used for notifications</p>
                </div>
 
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purok</label>
                  <input
                    type="text"
                    value={form.purok}
                    onChange={(e) => setForm({ ...form, purok: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Purok 1"
                    disabled={isSaving}
                  />
                </div>
 
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                    placeholder="e.g. East Tapinac, Olongapo City"
                    rows={3}
                    disabled={isSaving}
                  />
                </div>
              </div>
 
              {/* Modal Footer */}
              <div className="mt-6 flex gap-2 md:gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-xs md:text-sm font-medium hover:bg-gray-200 transition-colors"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-xs md:text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={isSaving || uploadingAvatar}
                >
                  {isSaving || uploadingAvatar ? (
                    <span>{uploadingAvatar ? 'Uploading...' : 'Saving...'}</span>
                  ) : (
                    <>
                      <Save size={14} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
 
      {/* ── Logout Confirmation Modal ── */}
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
                    You'll need to log in again to access your account.
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