// ─── App Version Config ───────────────────────────────────────────────────────
// IMPORTANT: Bump APP_VERSION every time you build and release a new APK.
// The installed APK has this hardcoded value.
// The server hosts /version.json with the latest version.
// If server version > APP_VERSION, the update banner is shown to the user.

export const APP_VERSION = '1.0.0'

// URL of the version manifest — must be absolute so the APK can reach it
const VERSION_URL = `${import.meta.env.VITE_APP_URL || ''}/version.json`

/**
 * Compares two semver strings.
 * Returns true if `latest` is newer than `current`.
 */
export function isNewerVersion(current, latest) {
  if (!current || !latest) return false
  const parse = (v) => v.replace(/^v/, '').split('.').map(Number)
  const [cMaj, cMin, cPat] = parse(current)
  const [lMaj, lMin, lPat] = parse(latest)
  if (lMaj !== cMaj) return lMaj > cMaj
  if (lMin !== cMin) return lMin > cMin
  return lPat > cPat
}

/**
 * Fetches /version.json from the server.
 * Returns { version, releaseNotes, apkUrl, forceUpdate } or null on failure.
 */
export async function fetchLatestVersion() {
  try {
    // Cache-busting so we always get the freshest version.json
    const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
