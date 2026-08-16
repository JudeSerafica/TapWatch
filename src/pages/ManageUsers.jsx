import { useState, useEffect, useCallback } from 'react'
import {
  Users, Search, Filter, Shield, CheckCircle, XCircle, AlertTriangle,
  MoreVertical, Eye, FileText, UserCheck, UserX, Trash2, ChevronDown,
  ArrowUpDown, TrendingUp, Clock, Activity, X, RefreshCw,
  Crown, Ban, RotateCcw, Calendar, History,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/useAuth'
import TopBar from '../components/TopBar'
import AdminMobileBottomNav from '../components/AdminMobileBottomNav'

/* ─── helpers ─────────────────────────────────────── */
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-PH', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }) : '—'

const fmtRelative = (d) => {
  if (!d) return 'Never'
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return fmtDate(d)
}

const fmtCountdown = (expiresAt) => {
  if (!expiresAt) return null
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const days = Math.floor(diff / 86400000)
  const hrs  = Math.floor((diff % 86400000) / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  if (days > 0) return `${days}d ${hrs}h remaining`
  if (hrs > 0)  return `${hrs}h ${mins}m remaining`
  return `${mins}m remaining`
}

// Returns true if the user is currently actively suspended
const isActivelySuspended = (u) => {
  if (!u.is_suspended) return false
  if (!u.suspension_expires_at) return true // indefinite
  return new Date(u.suspension_expires_at).getTime() > Date.now()
}

const getInitials = (name = '') => {
  const parts = name.trim().split(' ').filter(Boolean)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (name[0] || '?').toUpperCase()
}

const AVATAR_COLORS = [
  'bg-blue-500','bg-indigo-500','bg-violet-500','bg-emerald-500',
  'bg-amber-500','bg-rose-500','bg-cyan-500','bg-teal-500',
]
const avatarColor = (id = '') => AVATAR_COLORS[(id.charCodeAt(0)||0) % AVATAR_COLORS.length]

const DURATION_OPTIONS = [
  { label: '1 Hour',    hours: 1 },
  { label: '6 Hours',   hours: 6 },
  { label: '12 Hours',  hours: 12 },
  { label: '24 Hours',  hours: 24 },
  { label: '3 Days',    hours: 72 },
  { label: '7 Days',    hours: 168 },
  { label: '30 Days',   hours: 720 },
  { label: 'Custom…',   hours: null },
]

function addHours(h) {
  return new Date(Date.now() + h * 3600000)
}


/* ─── badges ─────────────────────────────────────── */
function RoleBadge({ role }) {
  return role === 'admin' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700 border border-purple-200">
      <Crown size={9}/> Admin
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
      <Users size={9}/> Resident
    </span>
  )
}

function VerifBadge({ status }) {
  const map = {
    verified:   { cls:'bg-emerald-50 text-emerald-700 border-emerald-200', icon:<CheckCircle size={9}/>, label:'Verified' },
    trusted:    { cls:'bg-amber-50 text-amber-700 border-amber-200',       icon:<Shield size={9}/>,       label:'Trusted' },
    pending:    { cls:'bg-yellow-50 text-yellow-700 border-yellow-200',    icon:<Clock size={9}/>,        label:'Pending' },
    unverified: { cls:'bg-gray-100 text-gray-500 border-gray-200',         icon:<XCircle size={9}/>,      label:'Unverified' },
  }
  const cfg = map[status] || map.unverified
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

function AcctBadge({ user }) {
  const active = isActivelySuspended(user)
  if (!active) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
      <Activity size={9}/> Active
    </span>
  )
  const remaining = user.suspension_expires_at ? fmtCountdown(user.suspension_expires_at) : 'Indefinite'
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 border border-red-200" title={remaining}>
      <Ban size={9}/> Suspended
    </span>
  )
}

/* ─── stat card ──────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 min-w-0">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={18} className="text-white"/>
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{label}</p>
      </div>
    </div>
  )
}


/* ─── SUSPEND MODAL ──────────────────────────────── */
function SuspendModal({ user, onClose, onConfirm, loading }) {
  const [step, setStep]         = useState('configure') // 'configure' | 'confirm'
  const [selectedDuration, setSelectedDuration] = useState(DURATION_OPTIONS[3]) // 24h default
  const [customDate, setCustomDate] = useState('')
  const [customTime, setCustomTime] = useState('')
  const [reason, setReason]     = useState('')

  if (!user) return null

  const getExpiresAt = () => {
    if (!selectedDuration.hours) {
      if (!customDate) return null
      const dt = customTime ? `${customDate}T${customTime}` : `${customDate}T23:59`
      return new Date(dt)
    }
    return addHours(selectedDuration.hours)
  }

  const expiresAt = getExpiresAt()
  const durationLabel = selectedDuration.hours
    ? selectedDuration.label
    : customDate ? `Until ${fmtDateTime(expiresAt)}` : 'Custom (date required)'

  const canConfirm = selectedDuration.hours !== null || (customDate !== '')

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-500 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Ban size={20} className="text-white"/>
              </div>
              <div>
                <h3 className="text-white font-bold text-base">Suspend Account</h3>
                <p className="text-red-100 text-xs mt-0.5">Temporarily restrict user access</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition">
              <X size={18} className="text-white"/>
            </button>
          </div>
        </div>

        {/* user info strip */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${avatarColor(user.id)}`}>
            {getInitials(user.full_name)}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{user.full_name || 'Unknown'}</p>
            <p className="text-xs text-gray-500">{user.email || user.phone || '—'}</p>
          </div>
          <div className="ml-auto flex gap-1.5">
            <RoleBadge role={user.role}/>
            <VerifBadge status={user.verification_status}/>
          </div>
        </div>

        {step === 'configure' ? (
          <div className="px-6 py-5 space-y-5">
            {/* duration picker */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                Suspension Duration *
              </label>
              <div className="grid grid-cols-4 gap-2">
                {DURATION_OPTIONS.map(opt => (
                  <button key={opt.label}
                    onClick={() => setSelectedDuration(opt)}
                    className={`px-2 py-2 rounded-xl text-xs font-semibold border transition
                      ${selectedDuration.label === opt.label
                        ? 'bg-red-600 text-white border-red-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-red-300 hover:text-red-600'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* custom date/time */}
            {!selectedDuration.hours && (
              <div className="grid grid-cols-2 gap-3 p-4 bg-orange-50 rounded-xl border border-orange-200">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">End Date *</label>
                  <input type="date"
                    value={customDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setCustomDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">End Time</label>
                  <input type="time"
                    value={customTime}
                    onChange={e => setCustomTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"/>
                </div>
              </div>
            )}

            {/* expiry preview */}
            {expiresAt && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 rounded-xl border border-red-200">
                <Calendar size={15} className="text-red-500 flex-shrink-0"/>
                <div>
                  <p className="text-xs font-semibold text-red-700">Suspended until</p>
                  <p className="text-sm font-bold text-red-900">{fmtDateTime(expiresAt)}</p>
                </div>
              </div>
            )}

            {/* reason */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                Reason <span className="text-gray-400 font-normal normal-case">(optional)</span>
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Violation of reporting guidelines, spamming false reports…"
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"/>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                Cancel
              </button>
              <button
                onClick={() => setStep('confirm')}
                disabled={!canConfirm}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition disabled:opacity-40">
                Review →
              </button>
            </div>
          </div>
        ) : (
          /* confirm step */
          <div className="px-6 py-5 space-y-4">
            <div className="bg-red-50 rounded-xl border border-red-200 p-4">
              <p className="text-sm font-bold text-red-800 mb-3">⚠ Confirm Suspension</p>
              <p className="text-xs text-red-700 leading-relaxed mb-4">
                This user will temporarily lose all access to Tap-Watch until the suspension period expires.
              </p>
              <div className="space-y-2.5 text-sm">
                {[
                  { label: 'User',       value: user.full_name },
                  { label: 'Duration',   value: durationLabel },
                  { label: 'Expires',    value: expiresAt ? fmtDateTime(expiresAt) : 'Never (indefinite)' },
                  { label: 'Reason',     value: reason || 'No reason provided' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-[11px] font-semibold text-red-600 uppercase tracking-wide w-16 flex-shrink-0">{label}</span>
                    <span className="text-red-900 text-right text-xs">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('configure')}
                className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                ← Back
              </button>
              <button
                onClick={() => onConfirm({ expiresAt, reason, durationLabel })}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50">
                {loading ? 'Suspending…' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


/* ─── suspension details modal ───────────────────── */
function SuspensionDetailsModal({ user, onClose, onUnsuspend, onExtend, loading }) {
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('suspension_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      setHistory(data || [])
      setLoadingHistory(false)
    }
    load()
  }, [user.id])

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Ban size={20} className="text-white"/>
            </div>
            <div>
              <h3 className="text-white font-bold text-base">Suspension Details</h3>
              <p className="text-orange-100 text-xs">{user.full_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition">
            <X size={18} className="text-white"/>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* current suspension */}
          <div className="bg-red-50 rounded-xl border border-red-200 p-4 space-y-2.5">
            <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Current Suspension</p>
            {[
              { label: 'Started',  value: fmtDateTime(user.suspension_started_at) },
              { label: 'Expires',  value: user.suspension_expires_at ? fmtDateTime(user.suspension_expires_at) : 'Indefinite' },
              { label: 'Remaining',value: user.suspension_expires_at ? fmtCountdown(user.suspension_expires_at) : 'Until manually lifted' },
              { label: 'Reason',   value: user.suspension_reason || 'No reason provided' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-start gap-4">
                <span className="text-[11px] font-semibold text-red-600 uppercase tracking-wide w-20 flex-shrink-0">{label}</span>
                <span className="text-sm text-red-900 text-right">{value}</span>
              </div>
            ))}
          </div>

          {/* action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={onExtend}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100 transition text-sm font-medium">
              <Clock size={15}/> Extend
            </button>
            <button onClick={onUnsuspend} disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition text-sm font-medium disabled:opacity-50">
              <RotateCcw size={15}/> {loading ? 'Restoring…' : 'Unsuspend Now'}
            </button>
          </div>

          {/* suspension history */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <History size={15} className="text-gray-400"/>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Suspension History</p>
            </div>
            {loadingHistory ? (
              <div className="text-center py-6 text-gray-400 text-sm">Loading…</div>
            ) : history.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">No history found</div>
            ) : (
              <div className="space-y-2">
                {history.map(h => (
                  <div key={h.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        h.action === 'suspend' ? 'bg-red-100 text-red-700' :
                        h.action === 'unsuspend' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {h.action.toUpperCase()}
                      </span>
                      <span className="text-[11px] text-gray-400">{fmtDateTime(h.created_at)}</span>
                    </div>
                    {h.duration_label && <p className="text-xs text-gray-600">Duration: {h.duration_label}</p>}
                    {h.expires_at && <p className="text-xs text-gray-500">Expired: {fmtDateTime(h.expires_at)}</p>}
                    {h.reason && <p className="text-xs text-gray-500 mt-1">Reason: {h.reason}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


/* ─── generic confirm modal ──────────────────────── */
function ConfirmModal({ open, onClose, onConfirm, title, description, confirmLabel='Confirm', danger=false, loading }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${danger?'bg-red-100':'bg-amber-100'}`}>
              <AlertTriangle size={20} className={danger?'text-red-600':'text-amber-600'}/>
            </div>
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <X size={18} className="text-gray-500"/>
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t flex gap-3">
          <button onClick={onClose} disabled={loading}
            className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition disabled:opacity-50 ${danger?'bg-red-600 hover:bg-red-700':'bg-blue-600 hover:bg-blue-700'}`}>
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── user profile drawer ────────────────────────── */
function UserProfileDrawer({ user, onClose, onAction }) {
  if (!user) return null
  const isVerified = user.verification_status==='verified'||user.verification_status==='trusted'
  const suspended  = isActivelySuspended(user)

  return (
    <div className="fixed inset-0 z-[999] flex">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className="w-full max-w-sm bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="bg-gradient-to-br from-blue-700 to-blue-500 px-5 py-6">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-white font-bold text-base">User Profile</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition">
              <X size={16} className="text-white"/>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold border-4 border-white/30 flex-shrink-0 ${avatarColor(user.id)}`}>
              {getInitials(user.full_name)}
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-base leading-tight truncate">{user.full_name||'Unknown'}</p>
              <p className="text-blue-100 text-xs mt-0.5 truncate">{user.email||user.phone||'—'}</p>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <RoleBadge role={user.role}/>
                <VerifBadge status={user.verification_status}/>
                {suspended && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700 border border-red-300"><Ban size={9}/> Suspended</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3 flex-1">
          {suspended && (
            <div className="bg-red-50 rounded-xl border border-red-200 p-3 text-xs text-red-700 space-y-1">
              <p className="font-bold text-red-800">⚠ Account Suspended</p>
              {user.suspension_expires_at && <p>Expires: {fmtDateTime(user.suspension_expires_at)}</p>}
              {user.suspension_reason && <p>Reason: {user.suspension_reason}</p>}
              {user.suspension_expires_at && <p className="font-semibold">{fmtCountdown(user.suspension_expires_at)}</p>}
            </div>
          )}
          {[
            { label:'Email',      value: user.email||'—' },
            { label:'Phone',      value: user.phone||'—' },
            { label:'Purok',      value: user.purok?`Purok ${user.purok}`:'—' },
            { label:'Address',    value: user.address||'—' },
            { label:'Registered', value: fmtDate(user.created_at) },
            { label:'Last Active',value: fmtRelative(user.updated_at) },
          ].map(({label,value}) => (
            <div key={label} className="flex justify-between items-start border-b border-gray-100 pb-2.5">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
              <span className="text-sm text-gray-800 text-right max-w-[60%] break-words">{value}</span>
            </div>
          ))}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              {label:'Reports', value:user.totalReports??0,   color:'text-blue-600'},
              {label:'Resolved',value:user.resolvedReports??0,color:'text-emerald-600'},
              {label:'SOS',     value:user.sosCount??0,       color:'text-red-600'},
            ].map(({label,value,color}) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 py-4 border-t space-y-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Actions</p>
          {user.role!=='admin' && <button onClick={()=>onAction('promote',user)} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 transition text-sm font-medium"><Crown size={15}/> Promote to Admin</button>}
          {user.role==='admin'  && <button onClick={()=>onAction('demote',user)}  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition text-sm font-medium"><Users size={15}/> Demote to Resident</button>}
          {!isVerified ? (
            <button onClick={()=>onAction('verify',user)} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition text-sm font-medium"><UserCheck size={15}/> Grant Verification</button>
          ) : (
            <button onClick={()=>onAction('revoke',user)} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 transition text-sm font-medium"><UserX size={15}/> Revoke Verification</button>
          )}
          {!suspended ? (
            <button onClick={()=>onAction('suspend',user)} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition text-sm font-medium"><Ban size={15}/> Suspend Account</button>
          ) : (
            <>
              <button onClick={()=>onAction('suspension_details',user)} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 transition text-sm font-medium"><Eye size={15}/> View Suspension Details</button>
              <button onClick={()=>onAction('unsuspend',user)} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition text-sm font-medium"><RotateCcw size={15}/> Unsuspend Now</button>
            </>
          )}
          <button onClick={()=>onAction('delete',user)} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 transition text-sm font-medium"><Trash2 size={15}/> Delete Account</button>
        </div>
      </div>
    </div>
  )
}


/* ─── row action menu ────────────────────────────── */
function ActionMenu({ user, onAction, onViewProfile }) {
  const [open, setOpen] = useState(false)
  const isVerified = user.verification_status==='verified'||user.verification_status==='trusted'
  const suspended  = isActivelySuspended(user)

  const items = [
    { icon:Eye,       label:'View Profile',        key:'view',               cls:'text-gray-700' },
    !isVerified
      ? { icon:UserCheck, label:'Grant Verification',  key:'verify',          cls:'text-emerald-600' }
      : { icon:UserX,     label:'Revoke Verification', key:'revoke',          cls:'text-amber-600' },
    user.role!=='admin'
      ? { icon:Crown,  label:'Promote to Admin',    key:'promote',            cls:'text-purple-600' }
      : { icon:Users,  label:'Demote to Resident',  key:'demote',             cls:'text-blue-600' },
    ...(!suspended ? [
      { icon:Ban,     label:'Suspend Account',      key:'suspend',            cls:'text-red-600' },
    ] : [
      { icon:Eye,     label:'Suspension Details',   key:'suspension_details', cls:'text-orange-600' },
      { icon:RotateCcw,label:'Unsuspend Now',        key:'unsuspend',          cls:'text-blue-600' },
    ]),
    { icon:Trash2,    label:'Delete Account',       key:'delete',             cls:'text-red-700' },
  ]

  return (
    <div className="relative">
      <button onClick={()=>setOpen(v=>!v)}
        className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-500 hover:text-gray-700">
        <MoreVertical size={15}/>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={()=>setOpen(false)}/>
          <div className="absolute right-0 top-8 z-50 bg-white rounded-xl shadow-2xl border border-gray-100 w-52 py-1.5 overflow-hidden">
            {items.map(({icon:Icon,label,key,cls})=>(
              <button key={key}
                onClick={()=>{ setOpen(false); key==='view' ? onViewProfile(user) : onAction(key,user) }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition ${cls}`}>
                <Icon size={14} className="flex-shrink-0"/> {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ─── top active users strip ─────────────────────── */
function TopActiveUsers({ users }) {
  const top = [...users].sort((a,b)=>(b.totalReports??0)-(a.totalReports??0)).slice(0,5)
  if (!top.length) return null
  const medals = ['🥇','🥈','🥉','','']
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
        <TrendingUp size={15} className="text-blue-600"/>
        <h3 className="font-bold text-gray-900 text-sm">Top Active Users</h3>
        <span className="ml-auto text-xs text-gray-400">by reports submitted</span>
      </div>
      <div className="divide-y divide-gray-50">
        {top.map((u,i)=>(
          <div key={u.id} className="flex items-center gap-3 px-5 py-3">
            <span className="w-5 text-center text-sm">{medals[i]||`#${i+1}`}</span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(u.id)}`}>{getInitials(u.full_name)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{u.full_name||'Unknown'}</p>
              <p className="text-[11px] text-gray-400">{u.purok?`Purok ${u.purok}`:(u.email||'—')}</p>
            </div>
            <div className="text-right flex-shrink-0 mr-2">
              <p className="text-sm font-bold text-blue-600">{u.totalReports}</p>
              <p className="text-[10px] text-gray-400">reports</p>
            </div>
            <VerifBadge status={u.verification_status}/>
          </div>
        ))}
      </div>
    </div>
  )
}


/* ─── main page ──────────────────────────────────── */
export default function ManageUsers() {
  const { profile: adminProfile } = useAuth()
  const [users,      setUsers]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search,     setSearch]     = useState('')
  const [filter,     setFilter]     = useState('all')
  const [sort,       setSort]       = useState('newest')
  const [drawerUser, setDrawerUser] = useState(null)
  const [toast,      setToast]      = useState(null)
  const [confirm,    setConfirm]    = useState({ open:false })

  // suspend modal
  const [suspendTarget,  setSuspendTarget]  = useState(null)
  const [suspendLoading, setSuspendLoading] = useState(false)

  // suspension details modal
  const [detailsUser,  setDetailsUser]  = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  const showToast = (msg, type='success') => {
    setToast({msg,type})
    setTimeout(()=>setToast(null),3500)
  }

  /* ── auto-expire: check on load and mark expired suspensions active=false ── */
  const checkExpiredSuspensions = useCallback(async (profiles) => {
    const now = new Date()
    const expired = (profiles||[]).filter(p =>
      p.is_suspended &&
      p.suspension_expires_at &&
      new Date(p.suspension_expires_at) <= now
    )
    if (!expired.length) return
    for (const p of expired) {
      await supabase.from('profiles').update({
        is_suspended: false,
        suspension_started_at: null,
        suspension_expires_at: null,
        suspension_reason: null,
      }).eq('id', p.id)
      // log expiry
      try {
        await supabase.from('suspension_history').insert({
          user_id: p.id,
          suspended_by: adminProfile?.id || p.id,
          action: 'expire',
          expires_at: p.suspension_expires_at,
          reason: 'Suspension period expired automatically',
        })
      } catch (_) {}
    }
  }, [adminProfile?.id])

  const fetchUsers = useCallback(async (silent=false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, purok, address, role, verification_status, created_at, updated_at, is_suspended, suspension_started_at, suspension_expires_at, suspension_reason, suspended_by')
        .order('created_at', { ascending: false })

      if (profErr) throw profErr

      // Auto-expire before display
      await checkExpiredSuspensions(profiles)

      const { data: incidents } = await supabase.from('incidents').select('user_id, status, is_sos')
      const countMap = {}
      ;(incidents||[]).forEach(({user_id,status,is_sos})=>{
        if (!user_id) return
        if (!countMap[user_id]) countMap[user_id]={totalReports:0,resolvedReports:0,sosCount:0}
        countMap[user_id].totalReports++
        if (status==='resolved') countMap[user_id].resolvedReports++
        if (is_sos) countMap[user_id].sosCount++
      })

      const enriched = (profiles||[]).map(p => ({
        ...p,
        is_suspended: p.is_suspended ?? false,
        totalReports:    countMap[p.id]?.totalReports    ?? 0,
        resolvedReports: countMap[p.id]?.resolvedReports ?? 0,
        sosCount:        countMap[p.id]?.sosCount        ?? 0,
      }))
      setUsers(enriched)
    } catch (err) {
      console.error('ManageUsers fetch error:', err)
      showToast('Failed to load users.', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [checkExpiredSuspensions])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  /* ── derived stats ── */
  const stats = {
    total:        users.length,
    verified:     users.filter(u=>u.verification_status==='verified'||u.verification_status==='trusted').length,
    active:       users.filter(u=>!isActivelySuspended(u)).length,
    admins:       users.filter(u=>u.role==='admin').length,
    totalReports: users.reduce((s,u)=>s+u.totalReports,0),
    suspended:    users.filter(u=>isActivelySuspended(u)).length,
  }

  /* ── filtered + sorted ── */
  const visible = users
    .filter(u => {
      if (filter==='verified')   return u.verification_status==='verified'||u.verification_status==='trusted'
      if (filter==='unverified') return !u.verification_status||u.verification_status==='unverified'||u.verification_status==='pending'
      if (filter==='admins')     return u.role==='admin'
      if (filter==='residents')  return u.role!=='admin'
      if (filter==='active')     return !isActivelySuspended(u)
      if (filter==='suspended')  return isActivelySuspended(u)
      return true
    })
    .filter(u => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return u.full_name?.toLowerCase().includes(q)||u.email?.toLowerCase().includes(q)||u.phone?.toLowerCase().includes(q)||u.purok?.toLowerCase().includes(q)
    })
    .sort((a,b) => {
      if (sort==='oldest')        return new Date(a.created_at)-new Date(b.created_at)
      if (sort==='most_reports')  return b.totalReports-a.totalReports
      if (sort==='most_resolved') return b.resolvedReports-a.resolvedReports
      if (sort==='name')          return (a.full_name||'').localeCompare(b.full_name||'')
      return new Date(b.created_at)-new Date(a.created_at)
    })

  const FILTERS = [
    { key:'all',       label:'All Users',  count:users.length },
    { key:'verified',  label:'Verified',   count:stats.verified },
    { key:'unverified',label:'Unverified', count:users.length-stats.verified },
    { key:'admins',    label:'Admins',     count:stats.admins },
    { key:'residents', label:'Residents',  count:users.length-stats.admins },
    { key:'active',    label:'Active',     count:stats.active },
    { key:'suspended', label:'Suspended',  count:stats.suspended },
  ]
  const SORTS = [
    { key:'newest',        label:'Newest First'  },
    { key:'oldest',        label:'Oldest First'  },
    { key:'name',          label:'Name A–Z'      },
    { key:'most_reports',  label:'Most Reports'  },
    { key:'most_resolved', label:'Most Resolved' },
  ]


  /* ── action handler ── */
  const handleAction = (action, user) => {
    if (action === 'suspend') {
      setSuspendTarget(user)
      return
    }
    if (action === 'suspension_details') {
      setDetailsUser(user)
      return
    }
    const map = {
      verify:    { title:'Grant Verification',  description:`Grant verified status to ${user.full_name}? They will gain access to all verified-resident features.`,            confirmLabel:'Grant Verification', danger:false },
      revoke:    { title:'Revoke Verification', description:`Revoke verification for ${user.full_name}? They will lose access to verified-only features.`,                      confirmLabel:'Revoke',             danger:false },
      promote:   { title:'Promote to Admin',    description:`Promote ${user.full_name} to administrator? They will get full access to the admin panel.`,                       confirmLabel:'Promote to Admin',   danger:false },
      demote:    { title:'Demote to Resident',  description:`Demote ${user.full_name} to resident? They will lose admin access immediately.`,                                  confirmLabel:'Demote',             danger:true  },
      unsuspend: { title:'Unsuspend Now',       description:`Restore ${user.full_name}'s account? They will regain full access to Tap-Watch immediately.`,                    confirmLabel:'Unsuspend Now',      danger:false },
      delete:    { title:'Delete Account',      description:`Permanently delete ${user.full_name}'s account? This CANNOT be undone. Profile data will be removed permanently.`,confirmLabel:'Delete Permanently', danger:true  },
    }
    if (map[action]) setConfirm({ open:true, action, user, loading:false, ...map[action] })
  }

  /* ── execute suspend ── */
  const handleSuspendConfirm = async ({ expiresAt, reason, durationLabel }) => {
    setSuspendLoading(true)
    const user = suspendTarget
    try {
      const now = new Date().toISOString()
      await supabase.from('profiles').update({
        is_suspended: true,
        suspension_started_at: now,
        suspension_expires_at: expiresAt?.toISOString() || null,
        suspension_reason: reason || null,
        suspended_by: adminProfile?.id || null,
      }).eq('id', user.id)

      // Write audit history
      try {
        await supabase.from('suspension_history').insert({
          user_id: user.id,
          suspended_by: adminProfile?.id || user.id,
          action: 'suspend',
          duration_label: durationLabel,
          started_at: now,
          expires_at: expiresAt?.toISOString() || null,
          reason: reason || null,
        })
      } catch (_) {}

      setSuspendTarget(null)
      setSuspendLoading(false)
      showToast(`${user.full_name} has been suspended.`, 'warn')
      fetchUsers(true)
    } catch (err) {
      console.error('Suspend error:', err)
      showToast('Failed to suspend user.', 'error')
      setSuspendLoading(false)
    }
  }

  /* ── execute unsuspend (from details modal) ── */
  const handleUnsuspendFromDetails = async () => {
    if (!detailsUser) return
    setDetailsLoading(true)
    const user = detailsUser
    try {
      await supabase.from('profiles').update({
        is_suspended: false,
        suspension_started_at: null,
        suspension_expires_at: null,
        suspension_reason: null,
      }).eq('id', user.id)
      try {
        await supabase.from('suspension_history').insert({
          user_id: user.id,
          suspended_by: adminProfile?.id || user.id,
          action: 'unsuspend',
          reason: 'Manually unsuspended by administrator',
        })
      } catch (_) {}
      setDetailsUser(null)
      setDetailsLoading(false)
      showToast(`${user.full_name} has been restored.`)
      fetchUsers(true)
    } catch (err) {
      showToast('Failed to restore account.', 'error')
      setDetailsLoading(false)
    }
  }

  /* ── execute generic confirmed action ── */
  const executeAction = async () => {
    setConfirm(c=>({...c,loading:true}))
    const { action, user } = confirm
    try {
      if (action==='verify') {
        await supabase.from('profiles').update({ verification_status:'verified' }).eq('id',user.id)
        const { data:ev } = await supabase.from('user_verifications').select('id').eq('user_id',user.id).order('submitted_at',{ascending:false}).limit(1).maybeSingle()
        if (ev?.id) await supabase.from('user_verifications').update({ status:'verified', reviewed_at:new Date().toISOString(), review_notes:'Manually verified by administrator' }).eq('id',ev.id)
        else await supabase.from('user_verifications').insert({ user_id:user.id, status:'verified', submitted_at:new Date().toISOString(), reviewed_at:new Date().toISOString(), review_notes:'Manually verified by administrator' })
      }
      if (action==='revoke') {
        await supabase.from('profiles').update({ verification_status:'unverified' }).eq('id',user.id)
        await supabase.from('user_verifications').update({ status:'unverified', reviewed_at:new Date().toISOString(), review_notes:'Verification revoked by administrator' }).eq('user_id',user.id)
      }
      if (action==='promote')   await supabase.from('profiles').update({ role:'admin' }).eq('id',user.id)
      if (action==='demote')    await supabase.from('profiles').update({ role:'resident' }).eq('id',user.id)
      if (action==='unsuspend') {
        await supabase.from('profiles').update({ is_suspended:false, suspension_started_at:null, suspension_expires_at:null, suspension_reason:null }).eq('id',user.id)
        try { await supabase.from('suspension_history').insert({ user_id:user.id, suspended_by:adminProfile?.id||user.id, action:'unsuspend', reason:'Manually unsuspended by administrator' }) } catch (_) {}
      }
      if (action==='delete') {
        await supabase.from('profiles').delete().eq('id',user.id)
        if (drawerUser?.id===user.id) setDrawerUser(null)
      }
      const msgs = { verify:`${user.full_name} verified.`, revoke:`Verification revoked.`, promote:`${user.full_name} promoted to Admin.`, demote:`${user.full_name} demoted.`, unsuspend:`${user.full_name} restored.`, delete:`${user.full_name} deleted.` }
      showToast(msgs[action]||'Done.', action==='delete'?'error':action==='demote'?'warn':'success')
      setConfirm({open:false})
      fetchUsers(true)
    } catch (err) {
      console.error('Action error:', err)
      showToast('Action failed. Please try again.', 'error')
      setConfirm(c=>({...c,loading:false}))
    }
  }


  /* ── render ── */
  return (
    <div className="pb-16 md:pb-0 min-h-screen bg-gray-50">
      <TopBar title="Manage Users" showNotifications showUserMenu>
        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200 hidden sm:inline-flex">Admin</span>
      </TopBar>

      {/* toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[99999] px-4 py-3 rounded-xl shadow-xl text-sm font-medium flex items-center gap-2
          ${toast.type==='error'?'bg-red-600 text-white':toast.type==='warn'?'bg-amber-500 text-white':'bg-emerald-600 text-white'}`}>
          {toast.type==='error'?<XCircle size={15}/>:<CheckCircle size={15}/>} {toast.msg}
        </div>
      )}

      <div className="p-4 md:p-6 space-y-5 w-full">
        {/* heading */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Manage Users</h2>
            <p className="text-sm text-gray-500 mt-0.5">View, monitor, and manage all registered residents and administrators.</p>
          </div>
          <button onClick={()=>fetchUsers(true)} disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50 shadow-sm">
            <RefreshCw size={14} className={refreshing?'animate-spin':''}/> <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
          <StatCard icon={Users}       label="Total Users"     value={stats.total}        color="bg-blue-600"/>
          <StatCard icon={CheckCircle} label="Verified"        value={stats.verified}     color="bg-emerald-500"/>
          <StatCard icon={Activity}    label="Active Accounts" value={stats.active}       color="bg-cyan-500"/>
          <StatCard icon={Crown}       label="Administrators"  value={stats.admins}       color="bg-purple-500"/>
          <StatCard icon={Ban}         label="Suspended"       value={stats.suspended}    color="bg-red-500"/>
        </div>

        {!loading && <TopActiveUsers users={users}/>}

        {/* search + sort */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search by name, email, phone, or purok…"
              className="w-full pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"/>
            {search && <button onClick={()=>setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13}/></button>}
          </div>
          <div className="relative flex-shrink-0">
            <ArrowUpDown size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
            <select value={sort} onChange={e=>setSort(e.target.value)}
              className="appearance-none pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-gray-700 shadow-sm w-full sm:w-48">
              {SORTS.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {FILTERS.map(f=>(
            <button key={f.key} onClick={()=>setFilter(f.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition
                ${filter===f.key?'bg-blue-600 text-white border-blue-600 shadow-sm':'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600 shadow-sm'}`}>
              <Filter size={10}/> {f.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${filter===f.key?'bg-white/25 text-white':'bg-gray-100 text-gray-500'}`}>{f.count}</span>
            </button>
          ))}
        </div>

        {/* user table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden w-full">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-gray-400 text-sm gap-2">
              <RefreshCw size={16} className="animate-spin"/> Loading users…
            </div>
          ) : visible.length===0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <Users size={44} className="mb-3 opacity-20"/>
              <p className="font-semibold text-sm">No users found</p>
              <p className="text-xs mt-1">Try adjusting your search or filter.</p>
            </div>
          ) : (
            <>
              {/* desktop table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['User','Contact','Purok','Role','Verification','Status','Expires','Reports','Resolved','Registered',''].map(h=>(
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap first:pl-5 last:pr-5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {visible.map(u=>{
                      const susp = isActivelySuspended(u)
                      return (
                        <tr key={u.id} className={`hover:bg-blue-50/30 transition ${susp?'bg-red-50/30':''}`}>
                          <td className="px-4 py-3 pl-5">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(u.id)} ${susp?'opacity-60':''}`}>{getInitials(u.full_name)}</div>
                              <button onClick={()=>setDrawerUser(u)} className="font-semibold text-gray-900 hover:text-blue-600 transition text-left text-sm">{u.full_name||'Unknown'}</button>
                            </div>
                          </td>
                          <td className="px-4 py-3"><div className="text-xs text-gray-700 truncate max-w-[140px]">{u.email||'—'}</div>{u.phone&&<div className="text-[11px] text-gray-400 mt-0.5">{u.phone}</div>}</td>
                          <td className="px-4 py-3 text-xs text-gray-600">{u.purok?`Purok ${u.purok}`:'—'}</td>
                          <td className="px-4 py-3"><RoleBadge role={u.role}/></td>
                          <td className="px-4 py-3"><VerifBadge status={u.verification_status}/></td>
                          <td className="px-4 py-3"><AcctBadge user={u}/></td>
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                            {susp && u.suspension_expires_at ? (
                              <span className="text-red-600 font-medium">{fmtCountdown(u.suspension_expires_at)}</span>
                            ) : susp ? '—' : '—'}
                          </td>
                          <td className="px-4 py-3 text-center"><span className="font-bold text-blue-600">{u.totalReports}</span></td>
                          <td className="px-4 py-3 text-center"><span className="font-bold text-emerald-600">{u.resolvedReports}</span></td>
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(u.created_at)}</td>
                          <td className="px-4 py-3 pr-5"><ActionMenu user={u} onAction={handleAction} onViewProfile={setDrawerUser}/></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* mobile cards */}
              <div className="lg:hidden divide-y divide-gray-50">
                {visible.map(u=>{
                  const susp = isActivelySuspended(u)
                  return (
                    <div key={u.id} className={`p-4 ${susp?'bg-red-50/40':''}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${avatarColor(u.id)} ${susp?'opacity-60':''}`}>{getInitials(u.full_name)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <button onClick={()=>setDrawerUser(u)} className="font-semibold text-gray-900 text-sm text-left hover:text-blue-600 transition">{u.full_name||'Unknown'}</button>
                            <ActionMenu user={u} onAction={handleAction} onViewProfile={setDrawerUser}/>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{u.email||u.phone||'—'}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <RoleBadge role={u.role}/>
                            <VerifBadge status={u.verification_status}/>
                            <AcctBadge user={u}/>
                          </div>
                          {susp && u.suspension_expires_at && (
                            <p className="text-[11px] text-red-600 font-semibold mt-1.5">{fmtCountdown(u.suspension_expires_at)}</p>
                          )}
                          {susp && u.suspension_reason && (
                            <p className="text-[11px] text-gray-500 mt-0.5 truncate">Reason: {u.suspension_reason}</p>
                          )}
                          <div className="grid grid-cols-3 gap-2 mt-2.5">
                            <div className="bg-blue-50 rounded-lg px-2 py-1.5 text-center"><p className="text-sm font-bold text-blue-600">{u.totalReports}</p><p className="text-[10px] text-gray-500">Reports</p></div>
                            <div className="bg-emerald-50 rounded-lg px-2 py-1.5 text-center"><p className="text-sm font-bold text-emerald-600">{u.resolvedReports}</p><p className="text-[10px] text-gray-500">Resolved</p></div>
                            <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-center"><p className="text-sm font-bold text-gray-600">{u.sosCount}</p><p className="text-[10px] text-gray-500">SOS</p></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {!loading && visible.length>0 && (
            <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400 bg-gray-50 flex items-center justify-between">
              <span>Showing {visible.length} of {users.length} users</span>
              {search && <button onClick={()=>setSearch('')} className="text-blue-500 hover:text-blue-700 font-medium">Clear search</button>}
            </div>
          )}
        </div>
      </div>

      {/* modals & drawer */}
      <UserProfileDrawer user={drawerUser} onClose={()=>setDrawerUser(null)}
        onAction={(action,user)=>{ setDrawerUser(null); handleAction(action,user) }}/>

      {suspendTarget && (
        <SuspendModal
          user={suspendTarget}
          loading={suspendLoading}
          onClose={()=>setSuspendTarget(null)}
          onConfirm={handleSuspendConfirm}/>
      )}

      {detailsUser && (
        <SuspensionDetailsModal
          user={detailsUser}
          loading={detailsLoading}
          onClose={()=>setDetailsUser(null)}
          onUnsuspend={handleUnsuspendFromDetails}
          onExtend={()=>{ setDetailsUser(null); setSuspendTarget(detailsUser) }}/>
      )}

      <ConfirmModal
        open={confirm.open}
        onClose={()=>setConfirm({open:false})}
        onConfirm={executeAction}
        title={confirm.title}
        description={confirm.description}
        confirmLabel={confirm.confirmLabel}
        danger={confirm.danger}
        loading={confirm.loading}/>

      <AdminMobileBottomNav/>
    </div>
  )
}
