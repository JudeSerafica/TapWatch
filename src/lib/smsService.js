/**
 * SMS Service for TapWatch
 * Integrates with Semaphore SMS API (Philippine SMS Provider)
 * Alternative: Twilio can also be used
 */

const SEMAPHORE_API_KEY = import.meta.env.VITE_SEMAPHORE_API_KEY || ''
const SEMAPHORE_API_URL = 'https://api.semaphore.co/api/v4/messages'
const SENDER_NAME = 'TapWatch' // Max 11 characters

/**
 * Send SMS via Semaphore API
 */
export const sendSMS = async (phoneNumber, message) => {
  try {
    // Format phone number (remove +63 if present, ensure starts with 09)
    const formattedPhone = formatPhoneNumber(phoneNumber)
    
    if (!SEMAPHORE_API_KEY) {
      console.warn('⚠️ SMS API Key not configured. SMS not sent.')
      // In development, just log the message
      console.log('📱 [SMS SIMULATION]')
      console.log('To:', formattedPhone)
      console.log('Message:', message)
      return { success: true, simulated: true }
    }

    const response = await fetch(SEMAPHORE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apikey: SEMAPHORE_API_KEY,
        number: formattedPhone,
        message: message,
        sendername: SENDER_NAME,
      }),
    })

    const data = await response.json()

    if (response.ok) {
      console.log('✅ SMS sent successfully:', data)
      return { success: true, data }
    } else {
      console.error('❌ SMS sending failed:', data)
      return { success: false, error: data.message || 'SMS sending failed' }
    }
  } catch (error) {
    console.error('❌ SMS service error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send bulk SMS to multiple recipients
 */
export const sendBulkSMS = async (phoneNumbers, message) => {
  try {
    const results = await Promise.allSettled(
      phoneNumbers.map(phone => sendSMS(phone, message))
    )

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failed = results.length - successful

    console.log(`📊 Bulk SMS: ${successful} sent, ${failed} failed`)

    return {
      success: true,
      successful,
      failed,
      results
    }
  } catch (error) {
    console.error('❌ Bulk SMS error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Format phone number for PH format
 * Input: +639171234567, 639171234567, 09171234567
 * Output: 09171234567
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return ''
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '')
  
  // Remove country code if present
  if (cleaned.startsWith('63')) {
    cleaned = '0' + cleaned.substring(2)
  }
  
  // Ensure starts with 0
  if (!cleaned.startsWith('0')) {
    cleaned = '0' + cleaned
  }
  
  return cleaned
}

/**
 * SMS Templates
 */
export const SMSTemplates = {
  // OTP Verification
  otp: (code) => `TapWatch OTP: ${code}. Valid for 10 minutes. Do not share this code.`,

  // SOS Emergency Alert
  sosAlert: (reporterName, location, contact) => 
    `🚨 EMERGENCY SOS! ${reporterName} needs immediate help at ${location}. Contact: ${contact}. Respond now!`,

  // Incident Status Update
  statusUpdate: (incidentType, status, location) =>
    `TapWatch: Your ${incidentType} report at ${location} is now ${status.toUpperCase()}.`,

  // New Incident Alert (for admins)
  newIncident: (type, location, reporter) =>
    `🚨 NEW ${type.toUpperCase()} at ${location}. Reporter: ${reporter}. Check TapWatch now.`,

  // Incident Assigned
  incidentAssigned: (type, location) =>
    `You've been assigned to ${type} incident at ${location}. Check TapWatch for details.`,

  // Incident Resolved
  incidentResolved: (incidentType) =>
    `✅ Your ${incidentType} report has been resolved. Thank you for reporting!`,

  // Community Alert
  communityAlert: (type, location) =>
    `⚠️ ALERT: ${type.toUpperCase()} incident at ${location}. Stay safe. -TapWatch`,

  // Follow-up Request
  followUpRequest: (incidentType) =>
    `TapWatch: Officials need more info on your ${incidentType} report. Please check the app.`,

  // Responder Dispatch
  responderDispatch: (type, location, urgency) =>
    `🚨 DISPATCH ${urgency.toUpperCase()}: ${type} at ${location}. Respond immediately.`,
}

/**
 * Send OTP via SMS
 */
export const sendOTPSMS = async (phoneNumber, otpCode) => {
  const message = SMSTemplates.otp(otpCode)
  return await sendSMS(phoneNumber, message)
}

/**
 * Send SOS Alert to multiple responders
 */
export const sendSOSAlertSMS = async (responderPhones, reporterName, location, contact) => {
  const message = SMSTemplates.sosAlert(reporterName, location, contact)
  return await sendBulkSMS(responderPhones, message)
}

/**
 * Notify admin of new incident
 */
export const notifyAdminSMS = async (adminPhones, incidentType, location, reporterName) => {
  const message = SMSTemplates.newIncident(incidentType, location, reporterName)
  return await sendBulkSMS(adminPhones, message)
}

/**
 * Send incident status update to reporter
 */
export const sendStatusUpdateSMS = async (reporterPhone, incidentType, status, location) => {
  const message = SMSTemplates.statusUpdate(incidentType, status, location)
  return await sendSMS(reporterPhone, message)
}

/**
 * Send community alert to residents in area
 */
export const sendCommunityAlertSMS = async (residentPhones, incidentType, location) => {
  const message = SMSTemplates.communityAlert(incidentType, location)
  return await sendBulkSMS(residentPhones, message)
}

/**
 * Get admin phone numbers from database
 */
export const getAdminPhoneNumbers = async () => {
  try {
    const { supabase } = await import('./supabase')
    const { data, error } = await supabase
      .from('profiles')
      .select('phone')
      .eq('role', 'admin')
      .not('phone', 'is', null)

    if (error) throw error
    return data.map(profile => profile.phone)
  } catch (error) {
    console.error('Error fetching admin phones:', error)
    return []
  }
}

/**
 * Get responder phone numbers by type
 */
export const getResponderPhones = async (incidentType) => {
  try {
    const { supabase } = await import('./supabase')
    
    // Get responders that handle this incident type
    const { data, error } = await supabase
      .from('responders')
      .select('phone')
      .contains('incident_types', [incidentType])
      .eq('is_active', true)
      .not('phone', 'is', null)

    if (error) throw error
    return data.map(responder => responder.phone)
  } catch (error) {
    console.error('Error fetching responder phones:', error)
    return []
  }
}

/**
 * Check SMS balance (for Semaphore)
 */
export const checkSMSBalance = async () => {
  try {
    if (!SEMAPHORE_API_KEY) {
      return { success: false, error: 'API key not configured' }
    }

    const response = await fetch(
      `https://api.semaphore.co/api/v4/account?apikey=${SEMAPHORE_API_KEY}`
    )

    const data = await response.json()

    if (response.ok) {
      return {
        success: true,
        balance: data.credit_balance,
        account: data.account_name
      }
    } else {
      return { success: false, error: data.message }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
