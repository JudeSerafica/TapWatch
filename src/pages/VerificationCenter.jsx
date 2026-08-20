import { useState, useEffect } from 'react'
import { useAuth } from '../context/useAuth'
import { useSidebar } from '../context/SidebarContext'
import {
  getUserVerificationStatus,
  submitIDVerification,
  getUserReputation,
  uploadVerificationDocument,
  ID_TYPES,
  VERIFICATION_LEVELS,
} from '../lib/userVerification'
import ResidentSidebar from '../components/ResidentSidebar'
import MobileBottomNav from '../components/MobileBottomNav'
import TopBar from '../components/TopBar'
import {
  Shield, CheckCircle, Clock, XCircle, Upload,
  Camera, X, ThumbsUp, ThumbsDown, FileText,
  TrendingUp, Star, Info, AlertCircle,
} from 'lucide-react'

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Stat box used in the reputation card */
function StatBox({ value, label, color, icon: Icon }) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-4 px-2">
      <span className={`text-2xl font-extrabold ${color}`}>{value ?? 0}</span>
      <span className="text-[11px] text-gray-400 font-medium">{label}</span>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
        color === 'text-blue-600' ? 'bg-blue-50' :
        color === 'text-green-500' ? 'bg-green-50' : 'bg-red-50'
      }`}>
        <Icon size={15} className={color} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
export default function VerificationCenter() {
  const { profile } = useAuth()
  const { isCollapsed } = useSidebar()

  const [verificationStatus, setVerificationStatus] = useState(null)
  const [reputation, setReputation]                 = useState(null)
  const [loading, setLoading]                       = useState(true)
  const [submitting, setSubmitting]                 = useState(false)
  const [showSubmitForm, setShowSubmitForm]         = useState(false)
  const [showSuccessModal, setShowSuccessModal]     = useState(false)
  const [showHowItWorks, setShowHowItWorks]         = useState(false)

  const [formData, setFormData] = useState({
    idType:      ID_TYPES.NATIONAL_ID,
    idNumber:    '',
    idPhoto:     null,
    selfiePhoto: null,
  })

  useEffect(() => {
    loadVerificationData()
  }, [profile?.id, profile?.verification_status])

  const loadVerificationData = async () => {
    if (!profile?.id) return
    setLoading(true)
    try {
      const [verificationData, reputationData] = await Promise.all([
        getUserVerificationStatus(profile.id),
        getUserReputation(profile.id),
      ])

      const profileStatus = profile?.verification_status
      const verRecord     = verificationData.data

      if (verRecord) {
        if (
          profileStatus &&
          profileStatus !== verRecord.status &&
          ['verified', 'unverified', 'trusted'].includes(profileStatus)
        ) {
          setVerificationStatus({ ...verRecord, status: profileStatus })
        } else {
          setVerificationStatus(verRecord)
        }
      } else {
        if (profileStatus === 'verified' || profileStatus === 'trusted') {
          setVerificationStatus({ status: profileStatus })
        } else {
          setVerificationStatus(null)
        }
      }

      setReputation(reputationData)
    } catch (err) {
      console.error('Error loading verification data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e, field) => {
    const file = e.target.files?.[0]
    if (file) setFormData(f => ({ ...f, [field]: file }))
  }

  const handleSubmitVerification = async (e) => {
    e.preventDefault()
    if (!formData.idPhoto || !formData.selfiePhoto) {
      alert('Please upload both ID photo and selfie.')
      return
    }
    setSubmitting(true)
    try {
      const [idUpload, selfieUpload] = await Promise.all([
        uploadVerificationDocument(profile.id, formData.idPhoto,     'id'),
        uploadVerificationDocument(profile.id, formData.selfiePhoto, 'selfie'),
      ])
      if (idUpload.error || selfieUpload.error) throw new Error('Failed to upload documents')

      const { error } = await submitIDVerification(profile.id, {
        idType:     formData.idType,
        idNumber:   formData.idNumber,
        idPhotoUrl: idUpload.url,
        selfieUrl:  selfieUpload.url,
      })
      if (error) throw error

      setShowSubmitForm(false)
      setShowSuccessModal(true)
      loadVerificationData()
      setTimeout(() => setShowSuccessModal(false), 5000)
    } catch (err) {
      console.error('Verification submission error:', err)
      alert('Failed to submit verification: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Derived status ──
  const status         = verificationStatus?.status || profile?.verification_status || VERIFICATION_LEVELS.UNVERIFIED
  const isVerified     = status === VERIFICATION_LEVELS.VERIFIED || status === VERIFICATION_LEVELS.TRUSTED
  const isPending      = status === VERIFICATION_LEVELS.PENDING
  const isUnverified   = !isVerified && !isPending

  // ─────────────────────────────────────────────
  // Loading screen
  // ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <ResidentSidebar />
        <div className={`flex-1 pb-20 md:pb-0 transition-all duration-300 ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
          <TopBar title="Verification Center" showNotifications={true} />
          <main className="p-4 md:p-6 max-w-2xl mx-auto">
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Loading verification data…</p>
            </div>
          </main>
        </div>
        <MobileBottomNav />
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-gray-50">
      <ResidentSidebar />

      <div className={`flex-1 pb-20 md:pb-0 transition-all duration-300 ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        <TopBar title="Verification Center" showNotifications={true} />

        <main className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto space-y-4">

          {/* ══════════════════════════════════════
              STATUS BANNER CARD
          ══════════════════════════════════════ */}
          <div className="rounded-2xl overflow-hidden shadow-sm">

            {/* Gradient top section */}
            <div className={`relative p-5 md:p-6 overflow-hidden ${
              isVerified  ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
              isPending   ? 'bg-gradient-to-br from-amber-400 to-amber-500'  :
                            'bg-gradient-to-br from-blue-600 to-blue-700'
            }`}>
              {/* Shield watermark */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.12] pointer-events-none">
                {isVerified
                  ? <CheckCircle size={110} strokeWidth={1} className="text-white" />
                  : <Shield      size={110} strokeWidth={1} className="text-white" />
                }
              </div>

              <div className="relative z-10 flex items-center gap-4">
                {/* Icon circle */}
                <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center flex-shrink-0">
                  {isVerified
                    ? <CheckCircle size={28} className="text-white" strokeWidth={2.5} />
                    : isPending
                    ? <Clock       size={28} className="text-white" strokeWidth={2.5} />
                    : <Shield      size={28} className="text-white" strokeWidth={2.5} />
                  }
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-white text-2xl font-extrabold leading-tight">
                      {isVerified ? 'Verified' : isPending ? 'Under Review' : 'Not Verified'}
                    </h2>
                    {isVerified && (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-white text-xs font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-300" />
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-white/80 text-sm mt-0.5">
                    {isVerified
                      ? 'Your identity has been verified.'
                      : isPending
                      ? 'Your documents are being reviewed.'
                      : 'Get verified to unlock all features.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom info strip */}
            <div className={`px-5 py-4 border-t flex items-start gap-3 ${
              isVerified ? 'bg-green-50 border-green-100' :
              isPending  ? 'bg-amber-50 border-amber-100' :
                           'bg-blue-50 border-blue-100'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                isVerified ? 'bg-green-500' : isPending ? 'bg-amber-400' : 'bg-blue-500'
              }`}>
                {isVerified
                  ? <CheckCircle size={16} className="text-white" strokeWidth={2.5} />
                  : isPending
                  ? <Clock size={16} className="text-white" strokeWidth={2.5} />
                  : <AlertCircle size={16} className="text-white" strokeWidth={2.5} />
                }
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {isVerified
                  ? <><span className="font-bold">Your account is verified.</span> This helps build trust within the community.</>
                  : isPending
                  ? <><span className="font-bold">Verification pending.</span> An admin will review your documents and notify you shortly.</>
                  : <><span className="font-bold">Identity not yet verified.</span> Submit a valid ID to access all features like incident reporting and SOS alerts.</>
                }
              </p>
            </div>

            {/* CTA for unverified */}
            {isUnverified && (
              <div className="px-5 pb-5 bg-white border-t border-gray-100">
                <button
                  onClick={() => setShowSubmitForm(true)}
                  className="mt-4 w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Shield size={16} />
                  Start Verification Process
                </button>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════
              COMMUNITY REPUTATION CARD
          ══════════════════════════════════════ */}
          {reputation && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

              {/* Card header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                    <Shield size={16} className="text-blue-600" />
                  </div>
                  <h3 className="text-base font-extrabold text-gray-900">Community Reputation</h3>
                </div>
                <button
                  onClick={() => setShowHowItWorks(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition"
                >
                  <Info size={12} />
                  How it works
                </button>
              </div>

              {/* Score circle */}
              <div className="flex flex-col items-center py-4">
                <div className="w-20 h-20 rounded-full bg-blue-50 border-4 border-blue-100 flex items-center justify-center mb-3 shadow-inner">
                  <Star size={30} className="text-blue-500" strokeWidth={1.8} />
                </div>
                <span className="text-4xl font-extrabold text-blue-600 leading-none">
                  {reputation.score ?? 0}
                </span>
                <span className="text-xs text-gray-400 font-medium mt-1">Reputation Score</span>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
                <StatBox
                  value={reputation.stats?.totalReports}
                  label={<><span className="block">Reports</span><span className="block">Submitted</span></>}
                  color="text-blue-600"
                  icon={FileText}
                />
                <StatBox
                  value={reputation.stats?.upvotes}
                  label="Upvotes"
                  color="text-green-500"
                  icon={ThumbsUp}
                />
                <StatBox
                  value={reputation.stats?.downvotes}
                  label="Downvotes"
                  color="text-red-500"
                  icon={ThumbsDown}
                />
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════
              HOW TO IMPROVE REPUTATION
          ══════════════════════════════════════ */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 relative overflow-hidden">
            {/* Trophy decorative */}
            <div className="absolute right-4 bottom-3 opacity-10 pointer-events-none">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                <path d="M8 21h8M12 17v4M5 3H3v4a4 4 0 004 4h1M19 3h2v4a4 4 0 01-4 4h-1M5 3h14v6a7 7 0 01-7 7A7 7 0 015 9V3z"
                  stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <TrendingUp size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-extrabold text-gray-900 mb-2">
                  How to improve your reputation
                </h4>
                <ul className="space-y-1.5">
                  {[
                    'Report incidents accurately and honestly.',
                    'Include helpful details, photos, and videos.',
                    'Be polite and respectful in interactions.',
                    'Help others and engage in community activities.',
                  ].map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

        </main>
      </div>

      <MobileBottomNav />

      {/* ════════════════════════════════════════
          SUBMIT ID VERIFICATION MODAL
      ════════════════════════════════════════ */}
      {showSubmitForm && (
        <div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowSubmitForm(false) }}
        >
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl max-h-[95vh] overflow-y-auto">

            {/* Header */}
            <div className="sticky top-0 bg-white px-5 py-4 border-b border-gray-100 flex items-center justify-between z-10 rounded-t-3xl sm:rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-blue-600" />
                <h3 className="text-base font-bold text-gray-900">Submit ID Verification</h3>
              </div>
              <button
                onClick={() => setShowSubmitForm(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                aria-label="Close"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmitVerification} className="p-5 space-y-4">

              {/* ID Type */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  ID Type *
                </label>
                <select
                  required
                  value={formData.idType}
                  onChange={e => setFormData(f => ({ ...f, idType: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value={ID_TYPES.NATIONAL_ID}>National ID</option>
                  <option value={ID_TYPES.DRIVERS_LICENSE}>Driver's License</option>
                  <option value={ID_TYPES.PASSPORT}>Passport</option>
                  <option value={ID_TYPES.VOTERS_ID}>Voter's ID</option>
                  <option value={ID_TYPES.SSS_ID}>SSS ID</option>
                  <option value={ID_TYPES.POSTAL_ID}>Postal ID</option>
                  <option value={ID_TYPES.BARANGAY_ID}>Barangay ID</option>
                </select>
              </div>

              {/* ID Number */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  ID Number *
                </label>
                <input
                  type="text"
                  required
                  value={formData.idNumber}
                  onChange={e => setFormData(f => ({ ...f, idNumber: e.target.value }))}
                  placeholder="Enter your ID number"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* ID Photo */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Upload ID Photo *
                </label>
                <input
                  type="file"
                  required
                  accept="image/*"
                  id="id-photo-upload"
                  className="sr-only"
                  onChange={e => handleFileChange(e, 'idPhoto')}
                />
                <label
                  htmlFor="id-photo-upload"
                  className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer transition ${
                    formData.idPhoto
                      ? 'border-blue-400 bg-blue-50 text-blue-600'
                      : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <Upload size={18} />
                  <span className="text-sm font-medium truncate">
                    {formData.idPhoto ? formData.idPhoto.name : 'Choose ID photo'}
                  </span>
                </label>
              </div>

              {/* Selfie */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Upload Selfie *
                </label>
                <input
                  type="file"
                  required
                  accept="image/*"
                  capture="user"
                  id="selfie-upload"
                  className="sr-only"
                  onChange={e => handleFileChange(e, 'selfiePhoto')}
                />
                <label
                  htmlFor="selfie-upload"
                  className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer transition ${
                    formData.selfiePhoto
                      ? 'border-blue-400 bg-blue-50 text-blue-600'
                      : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <Camera size={18} />
                  <span className="text-sm font-medium truncate">
                    {formData.selfiePhoto ? formData.selfiePhoto.name : 'Take selfie / Choose photo'}
                  </span>
                </label>
              </div>

              <p className="text-[11px] text-gray-400 text-center">
                Your documents are kept private and only reviewed by barangay administrators.
              </p>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowSubmitForm(false)}
                  disabled={submitting}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-bold text-white transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting…
                    </>
                  ) : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          HOW IT WORKS MODAL
      ════════════════════════════════════════ */}
      {showHowItWorks && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowHowItWorks(false) }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">How Reputation Works</h3>
              <button onClick={() => setShowHowItWorks(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {[
                { icon: FileText,   color: 'bg-blue-50 text-blue-600',  title: '+5 pts per report',        desc: 'Every incident report you submit adds 5 points.' },
                { icon: ThumbsUp,   color: 'bg-green-50 text-green-600', title: '+10 pts per upvote',       desc: 'Community upvotes on your reports earn 10 points each.' },
                { icon: ThumbsDown, color: 'bg-red-50 text-red-600',    title: '-5 pts per downvote',      desc: 'Inaccurate reports that get downvoted lose 5 points.' },
                { icon: Shield,     color: 'bg-purple-50 text-purple-600', title: '+50 pts for verification', desc: 'Getting your identity verified gives a one-time bonus.' },
              ].map(({ icon: Icon, color, title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon size={15} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={() => setShowHowItWorks(false)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-bold text-white transition"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          SUCCESS MODAL
      ════════════════════════════════════════ */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">

            {/* Green header */}
            <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 px-6 pt-8 pb-6 text-center overflow-hidden">
              <div className="absolute inset-0 bg-radial-gradient opacity-20 pointer-events-none" />
              <div className="relative z-10">
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg">
                    <CheckCircle size={40} className="text-green-500" strokeWidth={2} />
                  </div>
                </div>
                <h2 className="text-white text-2xl font-extrabold">Submitted!</h2>
                <p className="text-green-100 text-sm mt-1">Your verification request has been sent.</p>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3">
              <div className="bg-green-50 border border-green-100 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-green-700 text-center uppercase tracking-wider">What happens next</p>
                {[
                  'Admin will review your documents.',
                  "You'll receive a notification once approved.",
                  'Start reporting incidents after verification.',
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </div>
                    <p className="text-xs text-green-800">{step}</p>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-gray-400 text-center">Usually takes less than 24 hours ⏱️</p>

              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-3.5 bg-green-500 hover:bg-green-600 rounded-xl text-sm font-bold text-white transition"
              >
                Got It!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
