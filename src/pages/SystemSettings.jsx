import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Settings, Bell, Shield, Users, Lock, Database,
  CheckCircle, Clock, HardDrive, X, Save, Plus,
  Trash2, Eye, EyeOff, RefreshCw, Download, Upload,
  ChevronRight, AlertTriangle, ArrowLeft
} from 'lucide-react'
import AdminSidebar from '../components/AdminSidebar'
import TopBar from '../components/TopBar'
import { supabase } from '../lib/supabase'
 
// ── Constants for Supabase tables ─────────────────────────────────
const SETTINGS_TABLE = 'system_settings'
const USERS_TABLE = 'system_users'
 
// ── localStorage helpers ──────────────────────────────────────────
const STORAGE_KEY = 'tapwatch_settings'
const USERS_KEY = 'tapwatch_users'
const BACKUP_KEY = 'tapwatch_last_backup'
 
const defaultSettings = {
  general: {
    barangayName: 'Barangay Tapinac',
    municipality: 'Olongapo City',
    province: 'Zambales',
    contactNumber: '+63 47 222 0000',
    email: 'tapinac@olongapo.gov.ph',
    address: 'Tapinac, Olongapo City, Zambales',
  },
  notifications: {
    emailEnabled: true,
    smsEnabled: true,
    pushEnabled: false,
    emailAddress: 'admin@tapinac.gov.ph',
    smsNumber: '+63 917 000 0000',
    notifyOnNew: true,
    notifyOnUpdate: true,
    notifyOnResolved: false,
  },
  incident: {
    categories: ['Fire', 'Flood', 'Medical', 'Crime', 'Earthquake', 'Accident'],
    priorities: ['Low', 'Medium', 'High', 'Critical'],
    autoAssign: true,
    requirePhoto: false,
    defaultPriority: 'Medium',
  },
  security: {
    sessionTimeout: '30',
    twoFactorEnabled: false,
    passwordExpiry: '90',
    loginAttempts: '5',
  },
}
 
function loadSettings() {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (s) return { ...defaultSettings, ...JSON.parse(s) }
  } catch {}
  return defaultSettings
}
 
function persistSettings(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

// ── Supabase helper functions ─────────────────────────────────────
async function loadSettingsFromSupabase() {
  try {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .select('*')
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    if (data && data.settings) {
      return { ...defaultSettings, ...data.settings }
    }
  } catch (err) {
    console.error('Failed to load settings from Supabase:', err)
  }
  // Fallback to localStorage
  return loadSettings()
}

async function persistSettingsToSupabase(data) {
  try {
    const { error: upsertError } = await supabase
      .from(SETTINGS_TABLE)
      .upsert({ id: 1, settings: data }, { onConflict: 'id' })
    
    if (upsertError) throw upsertError
    persistSettings(data)
    return true
  } catch (err) {
    console.error('Failed to persist settings to Supabase:', err)
    persistSettings(data)
    return false
  }
}

async function fetchUsersFromSupabase() {
  try {
    const { data, error } = await supabase
      .from(USERS_TABLE)
      .select('*')
    
    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Failed to fetch users from Supabase:', err)
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
    } catch {
      return []
    }
  }
}

async function createUserInSupabase(userData) {
  try {
    // Sign up with Supabase Auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
    })
    
    if (signUpError) throw signUpError
    
    // Store user in system_users table
    const { error: insertError } = await supabase
      .from(USERS_TABLE)
      .insert({
        id: authData.user?.id,
        full_name: userData.name,
        email: userData.email,
        role: userData.role,
        created_at: new Date().toISOString(),
      })
    
    if (insertError) throw insertError
    return { success: true, user: authData.user }
  } catch (err) {
    console.error('Failed to create user in Supabase:', err)
    throw err
  }
}

async function deleteUserFromSupabase(userId) {
  try {
    const { error } = await supabase
      .from(USERS_TABLE)
      .delete()
      .eq('id', userId)
    
    if (error) throw error
    return true
  } catch (err) {
    console.error('Failed to delete user from Supabase:', err)
    throw err
  }
}
 
// ── Toggle ────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}
    >
      <span className={`inline-block w-4 h-4 bg-white rounded-full shadow transform transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}
 
// ── Panel wrapper ─────────────────────────────────────────────────
function Panel({ title, onClose, onSave, saving, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition">Cancel</button>
          <button onClick={onSave} disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2">
            <Save size={15} />{saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
 
function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
 
const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
 
// ─────────────────────────────────────────────────────────────────
export default function SystemSettings() {
  const [settings, setSettings] = useState(defaultSettings)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [activePanel, setActivePanel] = useState(null)
  const [draft, setDraft] = useState({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [newCategory, setNewCategory] = useState('')
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Staff', password: '' })
  const [userError, setUserError] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [lastBackup, setLastBackup] = useState(() => localStorage.getItem(BACKUP_KEY) || 'June 7, 2026 10:30 PM')

  // Load settings and users from Supabase on mount
  useEffect(() => {
    const initializeData = async () => {
      try {
        const loadedSettings = await loadSettingsFromSupabase()
        setSettings(loadedSettings)
        setSettingsLoaded(true)
        
        const loadedUsers = await fetchUsersFromSupabase()
        setUsers(loadedUsers)
      } catch (err) {
        console.error('Failed to initialize data:', err)
        setSettingsLoaded(true)
      }
    }
    
    initializeData()
  }, [])
 
  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }
 
  function openPanel(id) {
    setDraft(JSON.parse(JSON.stringify(settings[id] || {})))
    setActivePanel(id)
    setNewCategory('')
    setUserError('')
    setNewUser({ name: '', email: '', role: 'Staff', password: '' })
  }
 
  function closePanel() { setActivePanel(null); setDraft({}) }
 
  function setF(key, val) { setDraft(d => ({ ...d, [key]: val })) }
 
  function handleSave(section) {
    setSaving(true)
    const updated = { ...settings, [section]: draft }
    
    // Persist to Supabase
    persistSettingsToSupabase(updated).then(() => {
      setSettings(updated)
      setSaving(false)
      closePanel()
      showToast('Settings saved successfully!')
    }).catch(err => {
      console.error('Error saving settings:', err)
      setSaving(false)
      showToast('Failed to save settings.', 'error')
    })
  }
 
  function handleBackup() {
    const data = { settings, users, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'tapwatch_backup.json'; a.click()
    URL.revokeObjectURL(url)
    const now = new Date().toLocaleString('en-PH')
    localStorage.setItem(BACKUP_KEY, now)
    setLastBackup(now)
    closePanel()
    showToast('Backup downloaded successfully!')
  }
 
  function handleRestore(e) {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result)
        if (parsed.settings) { setSettings(parsed.settings); persistSettings(parsed.settings) }
        if (parsed.users) { setUsers(parsed.users); localStorage.setItem(USERS_KEY, JSON.stringify(parsed.users)) }
        closePanel(); showToast('Backup restored successfully!')
      } catch { showToast('Invalid backup file.', 'error') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }
 
  async function handleAddUser() {
    setUserError('')
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      return setUserError('All fields are required.')
    }
    if (users.find(u => u.email === newUser.email)) {
      return setUserError('Email already exists.')
    }

    try {
      setUsersLoading(true)
      const result = await createUserInSupabase(newUser)
      
      if (result.error) {
        throw result.error
      }

      // Reload users from Supabase
      const loadedUsers = await fetchUsersFromSupabase()
      setUsers(loadedUsers)
      setNewUser({ name: '', email: '', role: 'Staff', password: '' })
      showToast('User added successfully!')
    } catch (err) {
      console.error('Error adding user:', err)
      setUserError(err.message || 'Failed to add user.')
    } finally {
      setUsersLoading(false)
    }
  }
 
  async function handleDeleteUser(id) {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      setUsersLoading(true)
      await deleteUserFromSupabase(id)
      
      // Reload users from Supabase
      const loadedUsers = await fetchUsersFromSupabase()
      setUsers(loadedUsers)
      showToast('User removed successfully.')
    } catch (err) {
      console.error('Error deleting user:', err)
      showToast('Failed to delete user.', 'error')
    } finally {
      setUsersLoading(false)
    }
  }
 
  const cats = [
    { id: 'general',       title: 'General Settings',   description: 'Manage barangay information, contact details and basic settings.',         icon: Settings, bgColor: '#E8EDFB', iconColor: '#4A6FA5' },
    { id: 'notifications', title: 'Notifications',       description: 'Configure alert preferences, SMS and email notification settings.',         icon: Bell,     bgColor: '#FEF9EC', iconColor: '#F59E0B' },
    { id: 'incident',      title: 'Incident Settings',   description: 'Manage incident categories, priorities and reporting configurations.',       icon: Shield,   bgColor: '#EDFAF4', iconColor: '#10B981' },
    { id: 'users',         title: 'User Management',     description: 'Manage user accounts, roles, permissions and access levels.',               icon: Users,    bgColor: '#F3EFFE', iconColor: '#A855F7' },
    { id: 'security',      title: 'Security Settings',   description: 'Configure security preferences, authentication and session settings.',       icon: Lock,     bgColor: '#FEF0F0', iconColor: '#EF4444' },
    { id: 'backup',        title: 'Backup & Restore',    description: 'Backup system data and restore from previous backups.',                      icon: Database, bgColor: '#EAF4FB', iconColor: '#3B82F6' },
  ]

  const navigate = useNavigate()
 
  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 md:ml-60">
        <TopBar />
        <main className="p-4 md:p-6 lg:p-8 w-full">
 
          {/* Back Button - Mobile & Desktop */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 md:mb-6 transition-colors group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back</span>
          </button>

          {/* Hero Banner */}
          <div className="relative mb-6 md:mb-8 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #dce8f8 0%, #e6eef8 50%, #edf2fb 100%)', minHeight: '160px' }}>
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px),linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)`, backgroundSize: '32px 32px' }} />
            <div className="relative flex items-center justify-between px-6 md:px-10 py-6 md:py-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">System Settings</h1>
                <p className="text-gray-600 text-sm max-w-xs leading-relaxed">Manage and configure your Tap-Watch system settings and preferences.</p>
              </div>
              <div className="hidden sm:block" style={{ width: 200, height: 180 }}>
                <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="leafL" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#90c8f8"/><stop offset="100%" stopColor="#bde0ff"/></linearGradient>
                    <linearGradient id="leafR" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#aed6f9"/><stop offset="100%" stopColor="#c8e8ff"/></linearGradient>
                    <linearGradient id="shOuter" x1="0%" y1="0%" x2="60%" y2="100%"><stop offset="0%" stopColor="#4f9cf6"/><stop offset="100%" stopColor="#1d4ed8"/></linearGradient>
                    <linearGradient id="shInner" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#60a5fa"/><stop offset="100%" stopColor="#2563eb"/></linearGradient>
                    <filter id="dShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#1e40af" floodOpacity="0.35"/></filter>
                  </defs>
                  <ellipse cx="52" cy="118" rx="28" ry="52" fill="url(#leafL)" opacity="0.75" transform="rotate(-35 52 118)"/>
                  <ellipse cx="150" cy="128" rx="24" ry="46" fill="url(#leafR)" opacity="0.8" transform="rotate(30 150 128)"/>
                  <ellipse cx="100" cy="182" rx="36" ry="8" fill="#1e40af" opacity="0.18"/>
                  <path d="M100 18 L148 42 L148 108 C148 158 100 188 100 188 C100 188 52 158 52 108 L52 42 Z" fill="url(#shOuter)" filter="url(#dShadow)"/>
                  <path d="M100 32 L136 52 L136 108 C136 150 100 175 100 175 C100 175 64 150 64 108 L64 52 Z" fill="url(#shInner)" opacity="0.7"/>
                  <path d="M100 32 L136 52 L136 72 C120 68 80 68 64 72 L64 52 Z" fill="white" opacity="0.18"/>
                  <path d="M82 108 L94 122 L122 90" stroke="white" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
 
          {/* Settings Categories */}
          <div className="mb-8">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Settings Categories</h2>
              <div className="w-10 h-0.5 rounded-full bg-blue-600" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cats.map(cat => {
                const Icon = cat.icon
                return (
                  <button key={cat.id} onClick={() => openPanel(cat.id)}
                    className="bg-white rounded-xl border border-gray-100 flex items-center gap-4 px-5 py-4 cursor-pointer group transition-shadow hover:shadow-md text-left w-full">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: cat.bgColor }}>
                      <Icon size={22} style={{ color: cat.iconColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 mb-0.5">{cat.title}</h3>
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{cat.description}</p>
                    </div>
                    <ChevronRight size={16} className="flex-shrink-0 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </button>
                )
              })}
            </div>
          </div>
 
          {/* System Status Bar */}
          <div className="bg-white rounded-xl border border-gray-100 px-6 py-4 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:divide-x divide-gray-100 gap-4 md:gap-0">
              <div className="flex items-center gap-3 md:pr-8">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EAF4FB' }}><Shield size={18} style={{ color: '#3B82F6' }} /></div>
                <div><p className="text-xs font-bold text-gray-900">System Status</p><p className="text-xs text-gray-500">Your system is running smoothly.</p></div>
              </div>
              <div className="flex items-center gap-3 md:px-8">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EAF4FB' }}><HardDrive size={18} style={{ color: '#3B82F6' }} /></div>
                <div><p className="text-xs font-bold text-gray-900">Last Backup</p><p className="text-xs text-gray-500">{lastBackup}</p></div>
              </div>
              <div className="flex items-center gap-3 md:px-8">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EAF4FB' }}><Clock size={18} style={{ color: '#3B82F6' }} /></div>
                <div><p className="text-xs font-bold text-gray-900">System Uptime</p><p className="text-xs text-gray-500">15 days, 7 hours</p></div>
              </div>
              <div className="md:ml-auto md:pl-8">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
                  <CheckCircle size={13} />All Systems Operational
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
 
      {/* ══ GENERAL SETTINGS ══ */}
      {activePanel === 'general' && (
        <Panel title="General Settings" onClose={closePanel} onSave={() => handleSave('general')} saving={saving}>
          <Field label="Barangay Name"><input className={inp} value={draft.barangayName||''} onChange={e=>setF('barangayName',e.target.value)}/></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Municipality / City"><input className={inp} value={draft.municipality||''} onChange={e=>setF('municipality',e.target.value)}/></Field>
            <Field label="Province"><input className={inp} value={draft.province||''} onChange={e=>setF('province',e.target.value)}/></Field>
          </div>
          <Field label="Contact Number"><input className={inp} value={draft.contactNumber||''} onChange={e=>setF('contactNumber',e.target.value)}/></Field>
          <Field label="Email Address"><input className={inp} type="email" value={draft.email||''} onChange={e=>setF('email',e.target.value)}/></Field>
          <Field label="Complete Address"><textarea className={inp} rows={2} value={draft.address||''} onChange={e=>setF('address',e.target.value)}/></Field>
          {/* Preview */}
          <div className="mt-4 bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-xs font-semibold text-blue-700 mb-2">Preview</p>
            <p className="text-sm font-bold text-gray-800">{draft.barangayName || '—'}</p>
            <p className="text-xs text-gray-500">{draft.municipality}, {draft.province}</p>
            <p className="text-xs text-gray-500">{draft.contactNumber} · {draft.email}</p>
          </div>
        </Panel>
      )}
 
      {/* ══ NOTIFICATIONS ══ */}
      {activePanel === 'notifications' && (
        <Panel title="Notification Settings" onClose={closePanel} onSave={() => handleSave('notifications')} saving={saving}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Channels</p>
          {[
            { key: 'emailEnabled', label: 'Email Notifications',   sub: 'Send alerts via email' },
            { key: 'smsEnabled',   label: 'SMS Notifications',     sub: 'Send alerts via SMS' },
            { key: 'pushEnabled',  label: 'Push Notifications',    sub: 'Browser push alerts' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-100">
              <div><p className="text-sm font-semibold text-gray-800">{item.label}</p><p className="text-xs text-gray-500">{item.sub}</p></div>
              <Toggle checked={!!draft[item.key]} onChange={v=>setF(item.key,v)} />
            </div>
          ))}
          <div className="mt-4 mb-1">
            <Field label="Notification Email"><input className={inp} type="email" value={draft.emailAddress||''} onChange={e=>setF('emailAddress',e.target.value)}/></Field>
            <Field label="SMS Number"><input className={inp} value={draft.smsNumber||''} onChange={e=>setF('smsNumber',e.target.value)}/></Field>
          </div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-2">Triggers</p>
          {[
            { key: 'notifyOnNew',      label: 'New incident reported' },
            { key: 'notifyOnUpdate',   label: 'Incident status updated' },
            { key: 'notifyOnResolved', label: 'Incident resolved' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-100">
              <p className="text-sm text-gray-700">{item.label}</p>
              <Toggle checked={!!draft[item.key]} onChange={v=>setF(item.key,v)} />
            </div>
          ))}
        </Panel>
      )}
 
      {/* ══ INCIDENT SETTINGS ══ */}
      {activePanel === 'incident' && (
        <Panel title="Incident Settings" onClose={closePanel} onSave={() => handleSave('incident')} saving={saving}>
          <Field label="Default Priority">
            <select className={inp} value={draft.defaultPriority||'Medium'} onChange={e=>setF('defaultPriority',e.target.value)}>
              {(draft.priorities||['Low','Medium','High','Critical']).map(p=><option key={p}>{p}</option>)}
            </select>
          </Field>
          {[
            { key: 'autoAssign',   label: 'Auto-assign incidents',       sub: 'Automatically assign to available responder' },
            { key: 'requirePhoto', label: 'Require photo on report',     sub: 'Make photo attachment mandatory' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-100 mb-1">
              <div><p className="text-sm font-semibold text-gray-800">{item.label}</p><p className="text-xs text-gray-500">{item.sub}</p></div>
              <Toggle checked={!!draft[item.key]} onChange={v=>setF(item.key,v)} />
            </div>
          ))}
          <Field label="Incident Categories">
            <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
              {(draft.categories||[]).map((cat,i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                  {cat}
                  <button onClick={()=>setF('categories',draft.categories.filter((_,j)=>j!==i))} className="hover:text-red-500 transition"><X size={11}/></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input className={inp} placeholder="Type and press Enter or +" value={newCategory} onChange={e=>setNewCategory(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter'&&newCategory.trim()){setF('categories',[...(draft.categories||[]),newCategory.trim()]);setNewCategory('')}}}/>
              <button onClick={()=>{if(newCategory.trim()){setF('categories',[...(draft.categories||[]),newCategory.trim()]);setNewCategory('')}}}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition flex-shrink-0">
                <Plus size={15}/>
              </button>
            </div>
          </Field>
        </Panel>
      )}
 
      {/* ══ USER MANAGEMENT ══ */}
      {activePanel === 'users' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">User Management</h3>
              <button onClick={closePanel} className="p-1.5 hover:bg-gray-100 rounded-lg transition"><X size={18} className="text-gray-500"/></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Add New User</p>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <input className={inp} placeholder="Full Name" value={newUser.name} onChange={e=>setNewUser(u=>({...u,name:e.target.value}))}/>
                <input className={inp} placeholder="Email Address" value={newUser.email} onChange={e=>setNewUser(u=>({...u,email:e.target.value}))}/>
                <select className={inp} value={newUser.role} onChange={e=>setNewUser(u=>({...u,role:e.target.value}))}>
                  <option>Admin</option><option>Official</option><option>Staff</option><option>Responder</option>
                </select>
                <div className="relative">
                  <input className={inp} placeholder="Password" type={showPw?'text':'password'} value={newUser.password} onChange={e=>setNewUser(u=>({...u,password:e.target.value}))}/>
                  <button type="button" onClick={()=>setShowPw(v=>!v)} className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
              </div>
              {userError && <p className="text-xs text-red-500 mb-2 flex items-center gap-1"><AlertTriangle size={12}/>{userError}</p>}
              <button 
                onClick={handleAddUser} 
                disabled={usersLoading}
                className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2 mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={15}/>{usersLoading ? 'Adding...' : 'Add User'}
              </button>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">System Users ({users.length})</p>
              {usersLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-xs text-gray-500 mt-2">Loading users...</p>
                </div>
              ) : users.length === 0
                ? <p className="text-sm text-gray-400 text-center py-8">No users added yet.</p>
                : users.map(u => (
                  <div key={u.id} className="flex items-center gap-3 py-2.5 border-b border-gray-100">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-purple-700">{(u.full_name || u.email)?.[0]?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{u.full_name || u.email}</p>
                      <p className="text-xs text-gray-500 truncate">{u.email}</p>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex-shrink-0 capitalize">{u.role}</span>
                    <button onClick={()=>handleDeleteUser(u.id)} disabled={usersLoading} className="p-1 hover:text-red-500 text-gray-400 transition flex-shrink-0 disabled:opacity-50"><Trash2 size={14}/></button>
                  </div>
                ))
              }
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={closePanel} className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition">Close</button>
            </div>
          </div>
        </div>
      )}
 
      {/* ══ SECURITY SETTINGS ══ */}
      {activePanel === 'security' && (
        <Panel title="Security Settings" onClose={closePanel} onSave={() => handleSave('security')} saving={saving}>
          <div className="flex items-center justify-between py-3 border-b border-gray-100 mb-4">
            <div><p className="text-sm font-semibold text-gray-800">Two-Factor Authentication</p><p className="text-xs text-gray-500">Require 2FA on every login</p></div>
            <Toggle checked={!!draft.twoFactorEnabled} onChange={v=>setF('twoFactorEnabled',v)} />
          </div>
          <Field label="Session Timeout">
            <select className={inp} value={draft.sessionTimeout||'30'} onChange={e=>setF('sessionTimeout',e.target.value)}>
              {['15','30','60','120','240'].map(v=><option key={v} value={v}>{v} minutes</option>)}
            </select>
          </Field>
          <Field label="Password Expiry">
            <select className={inp} value={draft.passwordExpiry||'90'} onChange={e=>setF('passwordExpiry',e.target.value)}>
              {['30','60','90','180','365','Never'].map(v=><option key={v} value={v}>{v === 'Never' ? 'Never expire' : `${v} days`}</option>)}
            </select>
          </Field>
          <Field label="Max Failed Login Attempts">
            <select className={inp} value={draft.loginAttempts||'5'} onChange={e=>setF('loginAttempts',e.target.value)}>
              {['3','5','10'].map(v=><option key={v} value={v}>{v} attempts before lockout</option>)}
            </select>
          </Field>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2 mt-3">
            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5"/>
            <p className="text-xs text-amber-700">Security changes take effect on the next login session.</p>
          </div>
        </Panel>
      )}
 
      {/* ══ BACKUP & RESTORE ══ */}
      {activePanel === 'backup' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Backup & Restore</h3>
              <button onClick={closePanel} className="p-1.5 hover:bg-gray-100 rounded-lg transition"><X size={18} className="text-gray-500"/></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Backup */}
              <div className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0"><Download size={18} className="text-blue-600"/></div>
                  <div><p className="text-sm font-bold text-gray-900">Create Backup</p><p className="text-xs text-gray-500">Download all settings & user data as JSON</p></div>
                </div>
                <button onClick={handleBackup} className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2">
                  <Download size={15}/>Download Backup File
                </button>
              </div>
              {/* Restore */}
              <div className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0"><Upload size={18} className="text-green-600"/></div>
                  <div><p className="text-sm font-bold text-gray-900">Restore Backup</p><p className="text-xs text-gray-500">Restore from a .json backup file</p></div>
                </div>
                <label className="w-full py-2.5 border border-dashed border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition flex items-center justify-center gap-2 cursor-pointer">
                  <Upload size={15}/>Choose Backup File (.json)
                  <input type="file" accept=".json" className="hidden" onChange={handleRestore}/>
                </label>
              </div>
              {/* Reset */}
              <div className="border border-red-100 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0"><RefreshCw size={18} className="text-red-500"/></div>
                  <div><p className="text-sm font-bold text-gray-900">Reset to Defaults</p><p className="text-xs text-gray-500">Wipe all settings and restore factory defaults</p></div>
                </div>
                <button onClick={()=>{persistSettings(defaultSettings);setSettings(defaultSettings);closePanel();showToast('Settings reset to defaults.')}}
                  className="w-full py-2.5 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition flex items-center justify-center gap-2">
                  <RefreshCw size={15}/>Reset All Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
 
      {/* ══ TOAST ══ */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-bounce-in ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'
        }`}>
          {toast.type === 'error' ? <AlertTriangle size={16}/> : <CheckCircle size={16}/>}
          {toast.msg}
        </div>
      )}
    </div>
  )
}