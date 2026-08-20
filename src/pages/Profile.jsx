import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Mail, Phone, MapPin, Shield, Edit3, LogOut,
  X, Camera, ChevronRight, CreditCard, Calendar,
  CheckCircle, AlertCircle, Clock, XCircle,
} from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { useSidebar } from '../context/SidebarContext'
import { supabase } from '../lib/supabase'
import ResidentSidebar from '../components/ResidentSidebar'
import MobileBottomNav from '../components/MobileBottomNav'
import TopBar from '../components/TopBar'
import ResidentIDCard from '../components/ResidentIDCard'

// ─────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────

/** Green "✓ Verified" chip */
function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500 text-white text-[11px] font-bold flex-shrink-0">
      <CheckCircle size={11} strokeWidth={3} />
      Verified
    </span>
  )
}

/** Dynamic account-status badge */
function StatusBadge({ status, isSuspended }) {
  if (isSuspended) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-[11px] font-semibold border border-red-200">
        <XCircle size={11} />
        Suspended
      </span>
    )
  }
  if (status === 'verified' || status === 'trusted') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-[11px] font-semibold border border-green-200">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        Active
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 text-[11px] font-semibold border border-yellow-200">
        <Clock size={11} />
        Verification Pending
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-[11px] font-semibold border border-gray-200">
      <AlertCircle size={11} />
      Unverified
    </span>
  )
}

/** Single profile info row */
function InfoRow({ icon: Icon, label, value, showVerified = false, onClick, isClickable = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isClickable}
      className={`
        w-full flex items-center gap-3 px-4 py-4
        border-b border-gray-100 last:border-b-0 text-left
        transition-colors
        ${isClickable ? 'hover:bg-blue-50/60 active:bg-blue-50 cursor-pointer' : 'cursor-default'}
      `}
    >
      {/* Icon box */}
      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
        <Icon size={18} className="text-blue-600" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold leading-none mb-1">
          {label}
        </p>
        <p className="text-sm font-semibold text-gray-900 truncate">{value || '—'}</p>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {showVerified && <VerifiedBadge />}
        {isClickable && <ChevronRight size={16} className="text-gray-300" />}
      </div>
    </button>
  )
}

/** Skeleton pulse row */
function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-2.5 bg-gray-100 rounded w-20" />
        <div className="h-4 bg-gray-100 rounded w-40" />
      </div>
      <div className="h-6 w-20 bg-gray-100 rounded-full" />
    </div>
  )
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
export default function Profile() {
  const navigate = useNavigate()
  const { user, profile, signOut, saveProfile, refreshProfile } = useAuth()
  const { isCollapsed } = useSidebar()

  // UI state
  const [isLoading, setIsLoading]           = useState(true)
  const [showEditModal, setShowEditModal]   = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showIDCard, setShowIDCard]         = useState(false)
  const [isSaving, setIsSaving]             = useState(false)
  const [isLoggingOut, setIsLoggingOut]     = useState(false)
  const [error, setError]                   = useState('')

  // Edit form state
  const [form, setForm] = useState({
    fullName: '',
    address: '',
    purok: '',
  })
  const [avatarFile, setAvatarFile]         = useState(null)
  const [avatarPreview, setAvatarPreview]   = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Resolve loading once profile is available from context
  useEffect(() => {
    if (profile !== undefined) setIsLoading(false)
  }, [profile])

  // On mount, force a fresh profile fetch so we always have the latest DB
  // values — including resident_id assigned by the DB trigger after admin
  // verification. This ensures existing verified accounts see their ID
  // immediately without needing a hard page refresh.
  useEffect(() => {
    if (user?.id) refreshProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Pre-fill edit form when modal opens
  useEffect(() => {
    if (showEditModal && profile) {
      setForm({
        fullName: profile.full_name || '',
        address:  profile.address  || '',
        purok:    profile.purok    || '',
      })
      setError('')
      setAvatarPreview(profile.avatar_url || null)
      setAvatarFile(null)
    }
  }, [showEditModal, profile])

  // ── Derived values ──
  const isVerified    = profile?.verification_status === 'verified' || profile?.verification_status === 'trusted'
  const isSuspended   = profile?.is_suspended && (
    !profile.suspension_expires_at ||
    new Date(profile.suspension_expires_at).getTime() > Date.now()
  )
  const displayName   = profile?.full_name || user?.user_metadata?.full_name || 'Resident'
  const emailDisplay  = user?.email || profile?.email || 'Not set'
  const phoneDisplay  = profile?.phone || user?.phone || 'Not set'
  const locationLine  = [profile?.purok, profile?.address].filter(Boolean).join(', ') || 'East Tapinac, Olongapo City'
  const memberSince   = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A'
  const initials      = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  // resident_id comes directly from the refreshed profile context
  const residentId = profile?.resident_id || null

  // Account security card copy
  const securityStatus = () => {
    if (isSuspended) return {
      icon: <XCircle size={22} className="text-red-500" />,
      title: 'Your account is suspended.',
      sub: 'Please contact the barangay office for assistance.',
      bg: 'bg-red-50 border-red-100',
    }
    if (profile?.verification_status === 'verified' || profile?.verification_status === 'trusted') return {
      icon: <Shield size={22} className="text-blue-600" />,
      title: 'Your account is active and secure.',
      sub: 'Thank you for helping keep our community safe.',
      bg: 'bg-blue-50 border-blue-100',
    }
    if (profile?.verification_status === 'pending') return {
      icon: <Clock size={22} className="text-yellow-500" />,
      title: 'Verification is pending.',
      sub: 'An admin will review your documents shortly.',
      bg: 'bg-yellow-50 border-yellow-100',
    }
    return {
      icon: <AlertCircle size={22} className="text-gray-400" />,
      title: 'Your account is not yet verified.',
      sub: 'Submit your ID to unlock all features.',
      bg: 'bg-gray-50 border-gray-100',
    }
  }

  // ── Avatar helpers ──
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5 MB.')
      return
    }
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setAvatarPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const uploadAvatar = async () => {
    if (!avatarFile) return profile?.avatar_url

    setUploadingAvatar(true)
    try {
      const ext      = avatarFile.name.split('.').pop()
      const fileName = `${user.id}/avatar_${Date.now()}.${ext}`

      // Remove old avatar
      if (profile?.avatar_url) {
        try {
          const url   = new URL(profile.avatar_url)
          const parts = url.pathname.split('/object/public/avatars/')
          if (parts.length > 1) {
            await supabase.storage.from('avatars').remove([parts[1]])
          }
        } catch {
          // Non-critical — continue
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, { cacheControl: '3600', upsert: true })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
      return urlData.publicUrl
    } finally {
      setUploadingAvatar(false)
    }
  }

  // ── Save profile ──
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setError('')
    setIsSaving(true)
    try {
      let avatarUrl = profile?.avatar_url
      if (avatarFile) avatarUrl = await uploadAvatar()

      const updates = {
        full_name:  form.fullName,
        address:    form.address,
        purok:      form.purok,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
      if (updateError) throw updateError

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

  // ── Sign out ──
  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOut()
      navigate('/login')
    } catch {
      // signOut already redirects via window.location.replace
    } finally {
      setIsLoggingOut(false)
      setShowLogoutModal(false)
    }
  }

  const sec = securityStatus()

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-gray-50">
      <ResidentSidebar />

      {/* Main content — offset for sidebar on md+ */}
      <div className={`
        flex-1 pb-20 md:pb-0 transition-all duration-300
        ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}
      `}>
        <TopBar title="My Profile" showNotifications={true} />

        {/* Page body — centred, max-width cap for desktop */}
        <main className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">

          {/* ── Profile Header Card ── */}
          <div
            className="relative rounded-2xl overflow-hidden mb-4 shadow-md"
            style={{ background: 'linear-gradient(135deg, #1B4FD8 0%, #2563EB 60%, #1D4ED8 100%)' }}
          >
            {/* Shield watermark */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.10] pointer-events-none">
              <Shield size={130} strokeWidth={1} className="text-white" />
            </div>

            <div className="relative z-10 p-5 md:p-6 lg:p-8">
              <div className="flex items-center gap-4 md:gap-5">

                {/* Avatar with camera overlay */}
                <div className="relative flex-shrink-0">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white/30 bg-blue-400/40 flex items-center justify-center overflow-hidden shadow-lg">
                    {isLoading ? (
                      <div className="w-full h-full bg-white/20 animate-pulse rounded-full" />
                    ) : profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-2xl font-bold select-none">{initials}</span>
                    )}
                  </div>

                  {/* Camera button — opens Edit Profile for avatar change */}
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center border-2 border-blue-200 hover:scale-110 transition-transform"
                    aria-label="Change profile photo"
                  >
                    <Camera size={13} className="text-blue-600" />
                  </button>
                </div>

                {/* Name / role / location */}
                <div className="flex-1 min-w-0">
                  {isLoading ? (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-5 bg-white/30 rounded w-36" />
                      <div className="h-3.5 bg-white/20 rounded w-24" />
                      <div className="h-3 bg-white/20 rounded w-40 mt-1" />
                    </div>
                  ) : (
                    <>
                      <h2 className="text-xl md:text-2xl font-extrabold text-white leading-tight truncate">
                        {displayName}
                      </h2>

                      {/* Role + Active pills */}
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/15 border border-white/25 text-white text-xs font-semibold">
                          <Shield size={10} />
                          Resident
                        </span>
                        <StatusBadge status={profile?.verification_status} isSuspended={isSuspended} />
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <MapPin size={12} className="text-blue-200 flex-shrink-0" />
                        <span className="text-blue-100 text-xs truncate">{locationLine}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Info cards — desktop: 2-col grid, mobile: single col ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

            {/* Left column on desktop */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {isLoading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : (
                <>
                  <InfoRow
                    icon={Mail}
                    label="Email Address"
                    value={emailDisplay}
                    showVerified={isVerified}
                  />
                  <InfoRow
                    icon={Phone}
                    label="Phone Number"
                    value={phoneDisplay}
                    showVerified={isVerified}
                  />
                  <InfoRow
                    icon={Shield}
                    label="Account Type"
                    value="Resident"
                    showVerified={isVerified}
                  />
                </>
              )}
            </div>

            {/* Right column on desktop */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {isLoading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : (
                <>
                  {/* Resident ID — clickable, opens ID card */}
                  <InfoRow
                    icon={CreditCard}
                    label="Resident ID"
                    value={
                      residentId
                        ? residentId
                        : isVerified
                          ? 'Contact barangay office'
                          : 'Assigned upon verification'
                    }
                    showVerified={isVerified && !!residentId}
                    isClickable={isVerified && !!residentId}
                    onClick={() => {
                      if (isVerified && residentId) setShowIDCard(true)
                    }}
                  />
                  <InfoRow
                    icon={Calendar}
                    label="Member Since"
                    value={memberSince}
                    showVerified={isVerified}
                  />
                </>
              )}
            </div>
          </div>

          {/* ── Account Security Card ── */}
          {!isLoading && (
            <div className={`relative rounded-2xl border p-5 mb-4 overflow-hidden shadow-sm ${sec.bg}`}>
              {/* Background shield watermark */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-[0.07] pointer-events-none">
                <Shield size={90} strokeWidth={1} className="text-gray-500" />
              </div>
              <div className="relative z-10 flex items-center gap-4">
                <div className="flex-shrink-0">{sec.icon}</div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{sec.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{sec.sub}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Action buttons ── */}
          {!isLoading && (
            <div className="space-y-3">
              <button
                onClick={() => setShowEditModal(true)}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-md transition-colors"
              >
                <Edit3 size={16} />
                Edit Profile
              </button>

              <button
                onClick={() => setShowLogoutModal(true)}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-red-200 bg-white hover:bg-red-50 active:bg-red-100 text-red-600 font-bold text-sm transition-colors"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          )}
        </main>
      </div>

      <MobileBottomNav />

      {/* ════════════════════════════════════════
          Resident ID Card Modal
      ════════════════════════════════════════ */}
      {showIDCard && (
        <ResidentIDCard
          profile={profile}
          user={user}
          onClose={() => setShowIDCard(false)}
        />
      )}

      {/* ════════════════════════════════════════
          Edit Profile Modal
      ════════════════════════════════════════ */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">

            {/* Modal header */}
            <div className="sticky top-0 bg-white px-5 py-4 border-b border-gray-100 flex items-center justify-between z-10 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Edit3 size={18} className="text-blue-600" />
                <h3 className="text-base font-bold text-gray-900">Edit Profile</h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                disabled={isSaving}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                aria-label="Close"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-5 space-y-5">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Avatar picker */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-blue-100 overflow-hidden border-4 border-blue-200 flex items-center justify-center">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-blue-600 text-2xl font-bold">{initials}</span>
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center cursor-pointer shadow border-2 border-white hover:bg-blue-700 transition">
                    <Camera size={13} className="text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleAvatarChange}
                      disabled={isSaving}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-400">Tap the camera icon to change photo</p>
              </div>

              {/* Full name */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  placeholder="Juan Dela Cruz"
                  required
                  disabled={isSaving}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
                />
              </div>

              {/* Purok */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Purok / Zone
                </label>
                <input
                  type="text"
                  value={form.purok}
                  onChange={e => setForm(f => ({ ...f, purok: e.target.value }))}
                  placeholder="e.g. Purok 4"
                  disabled={isSaving}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Address
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="East Tapinac, Olongapo City"
                  disabled={isSaving}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
                />
              </div>

              {/* Read-only notice */}
              <p className="text-[11px] text-gray-400 text-center">
                Resident ID, verification status, and account status are managed by the system.
              </p>

              {/* Save button */}
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {uploadingAvatar ? 'Uploading photo…' : 'Saving…'}
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          Sign Out Confirmation Modal
      ════════════════════════════════════════ */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">

            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <LogOut size={16} className="text-red-600" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Sign Out</h3>
              </div>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                aria-label="Close"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm text-gray-600 leading-relaxed">
                Are you sure you want to sign out? You'll need to log in again to access your account.
              </p>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoggingOut ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Sign Out'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
