/**
 * phoneAuth.js
 *
 * Frontend-safe phone authentication helpers.
 * All API calls go through the server — no service-role key or SMS
 * provider secret is ever present in this file or in the browser bundle.
 *
 * Usage:
 *   import { sendPhoneLoginOTP, verifyPhoneLoginOTP,
 *            sendPhoneSignupOTP, verifyPhoneSignupOTP,
 *            normalizePH, maskPhone } from '../lib/phoneAuth'
 */

import API_BASE_URL from '../config'
import { supabase }  from './supabase'

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Normalise a Philippine mobile number to E.164 (+63XXXXXXXXXX).
 * Returns null if the number is not a valid PH mobile number.
 *
 * Accepts: 09171234567 | +639171234567 | 639171234567
 */
export function normalizePH(raw) {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('639') && digits.length === 12) return `+${digits}`
  if (digits.startsWith('09')  && digits.length === 11) return `+63${digits.slice(1)}`
  if (digits.startsWith('63')  && digits.length === 12) return `+${digits}`
  return null
}

/**
 * Validate a Philippine mobile number (before normalisation).
 * Returns { valid: true } or { valid: false, message: string }
 */
export function validatePH(raw) {
  const digits = raw.replace(/\D/g, '')
  const e164   = normalizePH(raw)

  if (!raw.trim()) return { valid: false, message: 'Phone number is required.' }
  if (!e164)       return { valid: false, message: 'Invalid Philippine mobile number. Please enter a valid 09XX XXX XXXX number.' }

  // Philippine mobile numbers: 09XX (Globe/TM/Smart/Sun/TNT/DITO)
  const localPart = digits.startsWith('09') ? digits.slice(1) : digits.slice(2) // 9XXXXXXXXX
  if (!/^9\d{9}$/.test(localPart)) {
    return { valid: false, message: 'Invalid Philippine mobile number. Numbers must start with 09.' }
  }

  return { valid: true }
}

/**
 * Mask a phone number for display: +63917****567
 */
export function maskPhone(e164) {
  if (!e164 || e164.length < 6) return e164
  const visible = 3 // show last 3 digits
  return e164.slice(0, -7) + '****' + e164.slice(-3)
}

// ── Generic fetch wrapper ──────────────────────────────────────────────────

async function apiFetch(path, body) {
  const res  = await fetch(`${API_BASE_URL}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : {}
  return { ok: res.ok, status: res.status, data: json }
}

// ── Login flow ─────────────────────────────────────────────────────────────

/**
 * Step 1 — Login: send OTP to an existing registered phone.
 * @param {string} phone  Raw PH number entered by user.
 * @returns {{ phone: string|null, waitSeconds: number|null, error: string|null }}
 */
export async function sendPhoneLoginOTP(phone) {
  const validation = validatePH(phone)
  if (!validation.valid) return { phone: null, waitSeconds: null, error: validation.message }

  try {
    const { ok, data } = await apiFetch('/api/phone/send-otp', { phone })

    if (!ok) {
      return {
        phone:       null,
        waitSeconds: data.waitSeconds || null,
        error:       data.error || 'Failed to send OTP. Please try again.',
      }
    }

    return { phone: data.phone, waitSeconds: null, error: null }
  } catch {
    return { phone: null, waitSeconds: null, error: 'Unable to connect to server. Please try again.' }
  }
}

/**
 * Step 2 — Login: verify the OTP and establish a Supabase session.
 * @param {string} phone  Normalised phone (+63...) returned from sendPhoneLoginOTP.
 * @param {string} token  6-digit OTP entered by user.
 * @returns {{ session: object|null, error: string|null }}
 */
export async function verifyPhoneLoginOTP(phone, token) {
  if (!token || token.replace(/\D/g, '').length !== 6) {
    return { session: null, error: 'Please enter the complete 6-digit code.' }
  }

  try {
    const { ok, data } = await apiFetch('/api/phone/verify-otp', { phone, token })

    if (!ok) return { session: null, error: data.error || 'OTP verification failed. Please try again.' }

    // Hydrate the Supabase client with the returned session so AuthContext
    // picks it up via onAuthStateChange.
    const { error: sessionError } = await supabase.auth.setSession({
      access_token:  data.session.access_token,
      refresh_token: data.session.refresh_token,
    })

    if (sessionError) {
      console.error('[phoneAuth] setSession error:', sessionError.message)
      return { session: null, error: 'Failed to establish session. Please try again.' }
    }

    return { session: data.session, error: null }
  } catch {
    return { session: null, error: 'Unable to connect to server. Please try again.' }
  }
}

// ── Sign-up flow ───────────────────────────────────────────────────────────

/**
 * Step 1 — Sign-up: register a new phone + password and send OTP.
 * @param {string} phone     Raw PH number.
 * @param {string} password  Chosen password.
 * @param {string} name      Full name.
 * @returns {{ phone: string|null, waitSeconds: number|null, error: string|null }}
 */
export async function sendPhoneSignupOTP(phone, password, name) {
  const validation = validatePH(phone)
  if (!validation.valid) return { phone: null, waitSeconds: null, error: validation.message }

  if (!password || password.length < 6) {
    return { phone: null, waitSeconds: null, error: 'Password must be at least 6 characters.' }
  }
  if (!name || !name.trim()) {
    return { phone: null, waitSeconds: null, error: 'Full name is required.' }
  }

  try {
    const { ok, data } = await apiFetch('/api/phone/signup', { phone, password, name })

    if (!ok) {
      return {
        phone:       null,
        waitSeconds: data.waitSeconds || null,
        error:       data.error || 'Failed to send OTP. Please try again.',
      }
    }

    return { phone: data.phone, waitSeconds: null, error: null }
  } catch {
    return { phone: null, waitSeconds: null, error: 'Unable to connect to server. Please try again.' }
  }
}

/**
 * Step 2 — Sign-up: verify OTP, confirm account, establish session.
 * @param {string} phone  Normalised phone (+63...) returned from sendPhoneSignupOTP.
 * @param {string} token  6-digit OTP entered by user.
 * @param {string} name   Full name (stored in profile row).
 * @returns {{ session: object|null, error: string|null }}
 */
export async function verifyPhoneSignupOTP(phone, token, name) {
  if (!token || token.replace(/\D/g, '').length !== 6) {
    return { session: null, error: 'Please enter the complete 6-digit code.' }
  }

  try {
    const { ok, data } = await apiFetch('/api/phone/verify-signup', { phone, token, name })

    if (!ok) return { session: null, error: data.error || 'OTP verification failed. Please try again.' }

    // Hydrate Supabase client — triggers onAuthStateChange → AuthContext update
    const { error: sessionError } = await supabase.auth.setSession({
      access_token:  data.session.access_token,
      refresh_token: data.session.refresh_token,
    })

    if (sessionError) {
      console.error('[phoneAuth] setSession error:', sessionError.message)
      return { session: null, error: 'Failed to establish session. Please try again.' }
    }

    return { session: data.session, error: null }
  } catch {
    return { session: null, error: 'Unable to connect to server. Please try again.' }
  }
}
