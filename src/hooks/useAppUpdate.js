import { useState, useEffect } from 'react'
import { APP_VERSION, fetchLatestVersion, isNewerVersion } from '../lib/appVersion'

const DISMISSED_KEY = 'update_dismissed_version'

/**
 * Checks /version.json on mount (and on app resume) and returns update info.
 *
 * Returns:
 *   updateAvailable  — boolean
 *   latestVersion    — string e.g. "1.0.2"
 *   releaseNotes     — string
 *   apkUrl           — string
 *   forceUpdate      — boolean (cannot be dismissed)
 *   dismissed        — boolean (user clicked "Later")
 *   dismiss()        — hides the banner until the next new version
 */
export function useAppUpdate() {
  const [state, setState] = useState({
    updateAvailable: false,
    latestVersion: null,
    releaseNotes: '',
    apkUrl: '/downloads/tap-watch.apk',
    forceUpdate: false,
    dismissed: false,
  })

  const checkForUpdate = async () => {
    const data = await fetchLatestVersion()
    if (!data) return

    const hasUpdate = isNewerVersion(APP_VERSION, data.version)
    if (!hasUpdate) return

    // Check if user already dismissed THIS specific version
    const dismissedVersion = localStorage.getItem(DISMISSED_KEY)
    const dismissed = dismissedVersion === data.version && !data.forceUpdate

    setState({
      updateAvailable: true,
      latestVersion: data.version,
      releaseNotes: data.releaseNotes || '',
      apkUrl: data.apkUrl || '/downloads/tap-watch.apk',
      forceUpdate: !!data.forceUpdate,
      dismissed,
    })
  }

  useEffect(() => {
    // Check on mount
    checkForUpdate()

    // Re-check when user returns to the app
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkForUpdate()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const dismiss = () => {
    if (state.latestVersion) {
      localStorage.setItem(DISMISSED_KEY, state.latestVersion)
    }
    setState((prev) => ({ ...prev, dismissed: true }))
  }

  return { ...state, dismiss }
}
