import { supabase } from './supabase'

/**
 * Generate a random 6-digit OTP code
 * @returns {string} 6-digit OTP code
 */
export const generateOTP = () => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  console.log('🔐 [OTP Generated]', otp) // Dev mode display
  return otp
}

/**
 * Save OTP to Supabase
 * @param {string} phone - Phone number or identifier
 * @param {string} otp - OTP code
 * @param {number} expiryMinutes - Expiry time in minutes (default: 10)
 * @returns {Promise<{data, error}>}
 */
export const saveOTP = async (phone, otp, expiryMinutes = 10) => {
  try {
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString()
    
    console.log('💾 [Saving OTP to Supabase]', {
      phone,
      otp,
      expiresAt,
      expiryMinutes
    })

    const { data, error } = await supabase
      .from('otp_codes')
      .insert([{
        phone,
        code: otp,
        expires_at: expiresAt,
        is_used: false,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single()

    if (error) {
      console.error('❌ [OTP Save Error]', error)
      return { data: null, error }
    }

    console.log('✅ [OTP Saved Successfully]', data)
    return { data, error: null }
  } catch (err) {
    console.error('❌ [OTP Exception]', err)
    return { data: null, error: err }
  }
}

/**
 * Verify OTP code
 * @param {string} phone - Phone number or identifier
 * @param {string} code - OTP code to verify
 * @returns {Promise<{isValid, error}>}
 */
export const verifyOTP = async (phone, code) => {
  try {
    console.log('🔍 [Verifying OTP]', { phone, code })

    const { data, error } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('phone', phone)
      .eq('code', code)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.error('❌ [OTP Verification Failed]', error)
      return { isValid: false, error }
    }

    // Mark OTP as used
    const { error: updateError } = await supabase
      .from('otp_codes')
      .update({ is_used: true })
      .eq('id', data.id)

    if (updateError) {
      console.error('❌ [OTP Mark as Used Error]', updateError)
    }

    console.log('✅ [OTP Verified Successfully]', data)
    return { isValid: true, error: null, data }
  } catch (err) {
    console.error('❌ [OTP Verification Exception]', err)
    return { isValid: false, error: err }
  }
}

/**
 * Send OTP (Generate + Save)
 * @param {string} phone - Phone number or identifier
 * @returns {Promise<{otp, data, error}>}
 */
export const sendOTP = async (phone) => {
  try {
    // Generate OTP
    const otp = generateOTP()

    // Save to Supabase
    const { data, error } = await saveOTP(phone, otp)

    if (error) {
      return { otp: null, data: null, error }
    }

    // In a real app, you would send SMS here
    console.log('📱 [SMS Would Be Sent]', `OTP ${otp} sent to ${phone}`)

    return { otp, data, error: null }
  } catch (err) {
    console.error('❌ [Send OTP Exception]', err)
    return { otp: null, data: null, error: err }
  }
}

/**
 * Clear expired OTP codes
 * @returns {Promise<{deletedCount, error}>}
 */
export const cleanupExpiredOTPs = async () => {
  try {
    console.log('🧹 [Cleaning Up Expired OTPs]')

    const { data, error } = await supabase
      .from('otp_codes')
      .delete()
      .lt('expires_at', new Date().toISOString())

    console.log('✅ [Cleanup Complete]')
    return { deletedCount: data?.length || 0, error }
  } catch (err) {
    console.error('❌ [Cleanup Exception]', err)
    return { deletedCount: 0, error: err }
  }
}
