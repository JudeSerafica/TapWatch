import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, ArrowRight, ArrowLeft, Camera, User } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { supabase } from '../lib/supabase'

function isMobileScreen() {
  return window.innerWidth < 1024
}

/* ═══════════════════════════════════════════════════════════════════════
   MOBILE PROFILE SETUP
   ═══════════════════════════════════════════════════════════════════════ */
function MobileProfileSetup({ form, setForm, error, loading, handleSubmit, navigate, avatarPreview, handleAvatarChange }) {
  const fileRef = useRef(null)

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <div className="px-6 pt-12 pb-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <img
            src="/Tapinac.logo.jpg"
            alt="Tap-Watch"
            className="w-9 h-9 rounded-full object-cover border border-blue-100"
          />
          <span className="font-extrabold text-lg">
            <span className="text-gray-900">Tap</span>
            <span className="text-blue-600">-Watch</span>
          </span>
        </div>

        <h1 className="text-[24px] font-extrabold text-gray-900 mb-1.5">
          Let's set up your profile
        </h1>
        <p className="text-sm text-gray-500">Tell us more about yourself</p>
      </div>

      {/* Avatar */}
      <div className="flex justify-center mt-2 mb-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gray-100 border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={40} className="text-gray-400" />
            )}
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-md active:bg-blue-700"
            aria-label="Upload photo"
          >
            <Camera size={15} className="text-white" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 pb-8 overflow-y-auto">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
            <input
              type="text"
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
              placeholder="Juan Dela Cruz"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Purok / Zone
            </label>
            <input
              type="text"
              value={form.purok}
              onChange={(e) => setForm({ ...form, purok: e.target.value })}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
              placeholder="Purok 2"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
              placeholder="East Tapinac, Olongapo City"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Contact Number
              <span className="text-gray-400 font-normal ml-1">(optional)</span>
            </label>
            <input
              type="tel"
              value={form.contactNumber}
              onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
              placeholder="09123456789"
            />
            <p className="text-xs text-gray-400 mt-1.5">Used for notifications and verification</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white font-bold text-[15px] rounded-2xl shadow-lg shadow-blue-200 disabled:opacity-60 active:scale-95 transition-all mt-2 flex items-center justify-center gap-2"
          >
            {loading
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
              : <>Continue <ArrowRight size={16} /></>}
          </button>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full py-3.5 border border-gray-200 text-gray-600 font-medium text-sm rounded-2xl flex items-center justify-center gap-1"
          >
            <ArrowLeft size={14} /> Skip for now
          </button>
        </form>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   DESKTOP PROFILE SETUP  (original design, preserved)
   ═══════════════════════════════════════════════════════════════════════ */
function DesktopProfileSetup({ form, setForm, error, loading, handleSubmit, navigate }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                <Shield size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Complete Your Profile</h1>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Please fill in your details. Your contact number will be linked to incident reports and used for notifications.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Juan Dela Cruz"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purok / Zone (Optional)</label>
              <input
                type="text"
                value={form.purok}
                onChange={(e) => setForm({ ...form, purok: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Purok 1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address / Purok (Optional)</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="e.g. East Tapinac, Olongapo City"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Number (Optional)
              </label>
              <input
                type="tel"
                value={form.contactNumber}
                onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="09123456789"
              />
              <p className="text-xs text-gray-400 mt-1">This will be used for notifications and verification.</p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Saving...' : 'Continue'}
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════════════════════════ */
export default function ProfileSetup() {
  const navigate = useNavigate()
  const { user, saveProfile } = useAuth()
  const [form, setForm] = useState({
    fullName: user?.name || user?.user_metadata?.full_name || '',
    contactNumber: user?.phone || '',
    address: '',
    purok: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB'); return }
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setAvatarPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Upload avatar if provided
    let avatarUrl = null
    if (avatarFile && user) {
      try {
        const ext = avatarFile.name.split('.').pop()
        const fileName = `${user.id}/avatar_${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { cacheControl: '3600', upsert: true })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
          avatarUrl = urlData.publicUrl
        }
      } catch { /* non-critical */ }
    }

    const payload = {
      fullName: form.fullName,
      phone: form.contactNumber,
      address: form.address,
      purok: form.purok,
    }

    const { error } = await saveProfile(payload)
    setLoading(false)

    if (error) {
      setError(error)
    } else {
      // If avatar was uploaded, update the profile record directly
      if (avatarUrl && user) {
        await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id)
      }
      navigate('/dashboard')
    }
  }

  const isMobile = isMobileScreen()

  const sharedProps = { form, setForm, error, loading, handleSubmit, navigate, avatarPreview, handleAvatarChange }

  return isMobile
    ? <MobileProfileSetup {...sharedProps} />
    : <DesktopProfileSetup {...sharedProps} />
}
