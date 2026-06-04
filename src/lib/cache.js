/**
 * Simple in-memory cache for faster page loads
 * Cache expires after 30 seconds to keep data fresh
 */

const cache = new Map()
const CACHE_DURATION = 30000 // 30 seconds

export function getCached(key) {
  const item = cache.get(key)
  if (!item) return null
  
  const now = Date.now()
  if (now - item.timestamp > CACHE_DURATION) {
    cache.delete(key)
    return null
  }
  
  return item.data
}

export function setCache(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  })
}

export function clearCache(key) {
  if (key) {
    cache.delete(key)
  } else {
    cache.clear()
  }
}

export function invalidateIncidentCache() {
  // Clear all incident-related caches when data changes
  clearCache('incidents')
  clearCache('stats')
  clearCache('hotspots')
}
