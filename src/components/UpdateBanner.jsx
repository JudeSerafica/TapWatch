import { useState } from 'react'
import { FaAndroid } from 'react-icons/fa'
import { X, Download, ChevronDown, ChevronUp } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { APP_VERSION } from '../lib/appVersion'
import { useAppUpdate } from '../hooks/useAppUpdate'

/**
 * UpdateBanner — shown at the top of the app when a new APK version is available.
 * - Non-intrusive banner by default
 * - Full modal for forceUpdate
 * - User can dismiss until the NEXT version (stored in localStorage)
 */
export default function UpdateBanner() {
  const { updateAvailable, latestVersion, releaseNotes, apkUrl, forceUpdate, dismissed, dismiss } = useAppUpdate()
  const [expanded, setExpanded] = useState(false)

  // Only show in installed APK/PWA (standalone mode) — never in a regular browser tab
  const isStandalone =
    Capacitor.isNativePlatform() ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  if (!isStandalone) return null

  // Nothing to show
  if (!updateAvailable || (dismissed && !forceUpdate)) return null

  // ── Force update modal (cannot dismiss) ─────────────────────────────────────
  if (forceUpdate) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <FaAndroid className="text-white text-3xl" />
            </div>
            <h2 className="text-white font-bold text-xl">Update Required</h2>
            <p className="text-blue-100 text-sm mt-1">
              Version {latestVersion} is required to continue
            </p>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            <div className="bg-blue-50 rounded-xl p-4 mb-4">
              <p className="text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">What's new</p>
              <p className="text-sm text-gray-700 leading-relaxed">{releaseNotes || 'Bug fixes and improvements.'}</p>
            </div>
            <p className="text-xs text-gray-500 text-center mb-4">
              Current version: {APP_VERSION} → New version: {latestVersion}
            </p>
            <a
              href={apkUrl}
              download
              className="flex items-center justify-center gap-3 w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-200 active:scale-95 text-sm"
            >
              <Download size={18} />
              Download Update (v{latestVersion})
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ── Non-intrusive banner ─────────────────────────────────────────────────────
  return (
    <div
      className="fixed bottom-20 left-3 right-3 md:bottom-6 md:left-auto md:right-6 md:w-96 z-[9998]"
      style={{ animation: 'slideUpBanner 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
    >
      <style>{`
        @keyframes slideUpBanner {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl border border-blue-100 overflow-hidden">
        {/* Main row */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <FaAndroid className="text-white text-lg" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 leading-tight">
              Update Available — v{latestVersion}
            </p>
            <p className="text-xs text-gray-500 truncate">
              New Tap-Watch version is ready to install
            </p>
          </div>

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition flex-shrink-0"
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>

          {/* Dismiss */}
          <button
            onClick={dismiss}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition flex-shrink-0"
            title="Remind me later"
          >
            <X size={16} />
          </button>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-3">
            {releaseNotes && (
              <div className="bg-blue-50 rounded-lg p-3 mb-3">
                <p className="text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">What's new</p>
                <p className="text-xs text-gray-600 leading-relaxed">{releaseNotes}</p>
              </div>
            )}
            <p className="text-xs text-gray-400 mb-3">
              Your version: <span className="font-semibold">{APP_VERSION}</span>
              {' → '}
              Latest: <span className="font-semibold text-blue-600">{latestVersion}</span>
            </p>
            <a
              href={apkUrl}
              download
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all text-sm active:scale-95"
            >
              <Download size={15} />
              Update Now (v{latestVersion})
            </a>
            <button
              onClick={dismiss}
              className="w-full mt-2 py-2 text-xs text-gray-500 hover:text-gray-700 transition font-medium"
            >
              Later
            </button>
          </div>
        )}

        {/* Collapsed CTA strip */}
        {!expanded && (
          <div className="px-4 pb-3">
            <a
              href={apkUrl}
              download
              className="flex items-center justify-center gap-2 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all text-xs active:scale-95"
            >
              <Download size={13} />
              Update Now
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
