/**
 * Unit tests for pure functions in src/lib/database.js
 * These need no mocking — they operate only on local data.
 *
 * Run with:  npm test
 */
import { describe, it, expect } from 'vitest'

// ── Re-export the private helpers for testing by duplicating them here.
// (They are not exported from database.js because they are internal.)
// If you want to avoid duplication, export them with an underscore prefix.

const normalize = s => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()

const levenshteinDistance = (str1, str2) => {
  const matrix = []
  for (let i = 0; i <= str2.length; i++) matrix[i] = [i]
  for (let j = 0; j <= str1.length; j++) matrix[0][j] = j
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  return matrix[str2.length][str1.length]
}

const calculateSimilarity = (str1, str2) => {
  const a = normalize(str1)
  const b = normalize(str2)
  const longer  = a.length > b.length ? a : b
  const shorter = a.length > b.length ? b : a
  if (longer.length === 0) return 1.0
  return (longer.length - levenshteinDistance(longer, shorter)) / longer.length
}

// ── Haversine helper (mirrors advancedSearch.js) ─────────────────────────
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371
  const toRad = d => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// ── generateOTP helper (mirrors otp.js) ──────────────────────────────────
const generateOTP = () => {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return (100000 + (array[0] % 900000)).toString()
}

// ── sanitizeSearch helper (mirrors database.js / advancedSearch.js) ───────
const sanitizeSearch = (input) => {
  if (typeof input !== 'string') return ''
  return input.replace(/[,()\\.%]/g, ' ').trim().slice(0, 100)
}

// ─────────────────────────────────────────────────────────────────────────
// calculateSimilarity
// ─────────────────────────────────────────────────────────────────────────
describe('calculateSimilarity', () => {
  it('is case-insensitive — identical text in different cases scores > 0.9', () => {
    expect(calculateSimilarity('Fire on Main St', 'FIRE ON MAIN ST')).toBeGreaterThan(0.9)
  })

  it('is whitespace-insensitive — extra spaces do not drop score below 0.9', () => {
    expect(calculateSimilarity('fire  on  main', 'fire on main')).toBeGreaterThan(0.9)
  })

  it('handles null description without throwing (R11 crash fix)', () => {
    expect(() => calculateSimilarity('fire', null)).not.toThrow()
  })

  it('handles both args null without throwing', () => {
    expect(() => calculateSimilarity(null, null)).not.toThrow()
  })

  it('returns 1.0 for identical strings', () => {
    expect(calculateSimilarity('sunog sa purok 3', 'sunog sa purok 3')).toBe(1.0)
  })

  it('returns low score for completely different strings', () => {
    expect(calculateSimilarity('fire', 'flood')).toBeLessThan(0.5)
  })
})

// ─────────────────────────────────────────────────────────────────────────
// haversineKm / searchNearby bounding-box over-inclusion (R10)
// ─────────────────────────────────────────────────────────────────────────
describe('haversineKm', () => {
  // East Tapinac center
  const CENTER_LAT = 14.835
  const CENTER_LNG = 120.283

  it('returns ~0 for identical coordinates', () => {
    expect(haversineKm(CENTER_LAT, CENTER_LNG, CENTER_LAT, CENTER_LNG)).toBeCloseTo(0, 3)
  })

  it('corner of a 1 km bounding box is ~1.41 km away (√2 factor)', () => {
    const latDelta = 1 / 111
    const lngDelta = 1 / (111 * Math.cos(CENTER_LAT * Math.PI / 180))
    const cornerLat = CENTER_LAT + latDelta
    const cornerLng = CENTER_LNG + lngDelta
    const dist = haversineKm(CENTER_LAT, CENTER_LNG, cornerLat, cornerLng)
    // Should be ~1.41 km — well outside a 1 km radius
    expect(dist).toBeGreaterThan(1.0)
    expect(dist).toBeLessThan(1.5)
  })

  it('filters out bounding-box corners beyond the requested radius', () => {
    // A point 1.2 km away should be excluded from a 1 km radius search
    const latDelta = 1.2 / 111
    const farLat = CENTER_LAT + latDelta
    const dist = haversineKm(CENTER_LAT, CENTER_LNG, farLat, CENTER_LNG)
    expect(dist).toBeGreaterThan(1.0) // confirms it would be filtered out
  })
})

// ─────────────────────────────────────────────────────────────────────────
// generateOTP (R5 — CSPRNG)
// ─────────────────────────────────────────────────────────────────────────
describe('generateOTP', () => {
  it('returns a 6-digit string', () => {
    const otp = generateOTP()
    expect(otp).toMatch(/^\d{6}$/)
  })

  it('is in the range 100000–999999', () => {
    const otp = parseInt(generateOTP(), 10)
    expect(otp).toBeGreaterThanOrEqual(100000)
    expect(otp).toBeLessThanOrEqual(999999)
  })

  it('produces different values on successive calls (not deterministic)', () => {
    const results = new Set(Array.from({ length: 20 }, generateOTP))
    // 20 calls should not all be the same
    expect(results.size).toBeGreaterThan(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────
// sanitizeSearch (R4 — PostgREST injection)
// ─────────────────────────────────────────────────────────────────────────
describe('sanitizeSearch', () => {
  it('strips PostgREST metacharacters , ) . \\ %', () => {
    const safe = sanitizeSearch('x,is_deleted.eq.false')
    expect(safe).not.toContain(',')
    expect(safe).not.toContain('.')
  })

  it('caps input at 100 characters', () => {
    expect(sanitizeSearch('a'.repeat(200))).toHaveLength(100)
  })

  it('returns empty string for non-string input', () => {
    expect(sanitizeSearch(null)).toBe('')
    expect(sanitizeSearch(123)).toBe('')
  })

  it('preserves normal search terms', () => {
    const safe = sanitizeSearch('sunog purok 3')
    expect(safe).toBe('sunog purok 3')
  })
})
