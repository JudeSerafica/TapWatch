/**
 * Follow-up System
 * Enables communication between reporters and responders
 */

import { supabase } from './supabase'
import { sendSMS, SMSTemplates } from './smsService'
import { createNotification } from './notificationService'

/**
 * Create a follow-up request
 */
export const createFollowUp = async ({
  incidentId,
  userId,
  messageType,
  message,
  requestedInfo = null,
  priority = 'normal'
}) => {
  try {
    const { data, error } = await supabase
      .from('incident_followups')
      .insert([{
        incident_id: incidentId,
        requested_by: userId,
        message_type: messageType,
        message,
        requested_info: requestedInfo,
        priority,
        status: 'pending',
        created_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) throw error

    // Notify reporter
    const { data: incident } = await supabase
      .from('incidents')
      .select('user_id, type, reporter_contact')
      .eq('id', incidentId)
      .single()

    if (incident) {
      // In-app notification
      await createNotification({
        userId: incident.user_id,
        title: 'Follow-up Request',
        message: `Officials need more information about your ${incident.type} report.`,
        type: 'follow_up',
        incidentId
      })

      // SMS notification
      if (incident.reporter_contact) {
        const smsMessage = SMSTemplates.followUpRequest(incident.type)
        await sendSMS(incident.reporter_contact, smsMessage)
      }
    }

    console.log('✅ Follow-up created:', data.id)

    return {
      success: true,
      followUp: data
    }
  } catch (error) {
    console.error('❌ Create follow-up failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Respond to a follow-up request
 */
export const respondToFollowUp = async (followUpId, userId, response, attachments = []) => {
  try {
    // Update follow-up with response
    const { data: followUp, error: updateError } = await supabase
      .from('incident_followups')
      .update({
        response,
        response_attachments: attachments,
        responded_by: userId,
        responded_at: new Date().toISOString(),
        status: 'responded'
      })
      .eq('id', followUpId)
      .select(`
        *,
        incident:incidents (
          user_id,
          type,
          responder_id
        )
      `)
      .single()

    if (updateError) throw updateError

    // Notify requester (admin/responder)
    if (followUp.incident?.responder_id) {
      const { data: responder } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', followUp.incident.responder_id)
        .single()

      // In-app notification
      await createNotification({
        userId: followUp.requested_by,
        title: 'Follow-up Response Received',
        message: `Reporter responded to your follow-up request.`,
        type: 'follow_up_response',
        incidentId: followUp.incident_id
      })

      // SMS to responder
      if (responder?.phone) {
        await sendSMS(
          responder.phone,
          `TapWatch: Reporter responded to your follow-up request for ${followUp.incident.type} incident. Check app for details.`
        )
      }
    }

    console.log('✅ Follow-up responded:', followUpId)

    return {
      success: true,
      followUp
    }
  } catch (error) {
    console.error('❌ Respond to follow-up failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Get follow-ups for an incident
 */
export const getIncidentFollowUps = async (incidentId) => {
  try {
    const { data, error } = await supabase
      .from('incident_followups')
      .select(`
        *,
        requester:profiles!incident_followups_requested_by_fkey (
          full_name,
          role
        ),
        responder:profiles!incident_followups_responded_by_fkey (
          full_name
        )
      `)
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      success: true,
      followUps: data || []
    }
  } catch (error) {
    console.error('Error fetching follow-ups:', error)
    return {
      success: false,
      followUps: []
    }
  }
}

/**
 * Get pending follow-ups for user (reporter)
 */
export const getPendingFollowUps = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('incident_followups')
      .select(`
        *,
        incident:incidents!incident_followups_incident_id_fkey (
          id,
          type,
          location,
          created_at
        ),
        requester:profiles!incident_followups_requested_by_fkey (
          full_name,
          role
        )
      `)
      .eq('incident.user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      success: true,
      followUps: data || []
    }
  } catch (error) {
    console.error('Error fetching pending follow-ups:', error)
    return {
      success: false,
      followUps: []
    }
  }
}

/**
 * Mark follow-up as acknowledged
 */
export const acknowledgeFollowUp = async (followUpId) => {
  try {
    const { data, error } = await supabase
      .from('incident_followups')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', followUpId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      followUp: data
    }
  } catch (error) {
    console.error('Acknowledge failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Close follow-up (mark as resolved)
 */
export const closeFollowUp = async (followUpId, closedBy, closureNotes) => {
  try {
    const { data, error } = await supabase
      .from('incident_followups')
      .update({
        status: 'closed',
        closed_by: closedBy,
        closed_at: new Date().toISOString(),
        closure_notes: closureNotes
      })
      .eq('id', followUpId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      followUp: data
    }
  } catch (error) {
    console.error('Close follow-up failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Send reminder for pending follow-up
 */
export const sendFollowUpReminder = async (followUpId) => {
  try {
    const { data: followUp, error } = await supabase
      .from('incident_followups')
      .select(`
        *,
        incident:incidents!incident_followups_incident_id_fkey (
          user_id,
          type,
          reporter_contact
        )
      `)
      .eq('id', followUpId)
      .single()

    if (error) throw error

    if (followUp.status !== 'pending') {
      return {
        success: false,
        error: 'Follow-up is not pending'
      }
    }

    // Send reminder notification
    await createNotification({
      userId: followUp.incident.user_id,
      title: 'Follow-up Reminder',
      message: `Reminder: Officials are waiting for your response on the ${followUp.incident.type} incident follow-up.`,
      type: 'reminder',
      incidentId: followUp.incident_id
    })

    // SMS reminder
    if (followUp.incident.reporter_contact) {
      await sendSMS(
        followUp.incident.reporter_contact,
        `REMINDER: TapWatch officials need your response on the ${followUp.incident.type} incident. Please check the app.`
      )
    }

    // Update reminder count
    await supabase
      .from('incident_followups')
      .update({
        reminder_count: (followUp.reminder_count || 0) + 1,
        last_reminder_at: new Date().toISOString()
      })
      .eq('id', followUpId)

    return {
      success: true
    }
  } catch (error) {
    console.error('Send reminder failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Get follow-up statistics
 */
export const getFollowUpStatistics = async (timeRange = '30d') => {
  try {
    const now = new Date()
    let startDate = new Date()

    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      default:
        startDate.setDate(now.getDate() - 30)
    }

    const { data, error } = await supabase
      .from('incident_followups')
      .select('*')
      .gte('created_at', startDate.toISOString())

    if (error) throw error

    // Calculate statistics
    const stats = {
      total: data.length,
      pending: data.filter(f => f.status === 'pending').length,
      responded: data.filter(f => f.status === 'responded').length,
      closed: data.filter(f => f.status === 'closed').length,
      avgResponseTime: 0,
      responseRate: 0
    }

    // Calculate average response time
    const responseTimes = data
      .filter(f => f.responded_at)
      .map(f => new Date(f.responded_at) - new Date(f.created_at))

    if (responseTimes.length > 0) {
      const avgMs = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      stats.avgResponseTime = Math.round(avgMs / 1000 / 60) // minutes
    }

    // Response rate
    if (data.length > 0) {
      stats.responseRate = Math.round((stats.responded / data.length) * 100)
    }

    return {
      success: true,
      stats
    }
  } catch (error) {
    console.error('Statistics error:', error)
    return {
      success: false,
      stats: null
    }
  }
}

/**
 * Subscribe to follow-up updates (real-time)
 */
export const subscribeToFollowUps = (incidentId, callback) => {
  const channel = supabase
    .channel(`followups-${incidentId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'incident_followups',
        filter: `incident_id=eq.${incidentId}`
      },
      (payload) => {
        callback(payload)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Quick follow-up templates
 */
export const FollowUpTemplates = {
  MORE_DETAILS: {
    type: 'request_details',
    message: 'We need more information about this incident. Can you provide additional details about what happened?'
  },
  CLARIFICATION: {
    type: 'clarification',
    message: 'Could you clarify some details about your report? We want to ensure we respond appropriately.'
  },
  EVIDENCE_REQUEST: {
    type: 'evidence_request',
    message: 'Do you have any photos or videos of the incident? This would help us take appropriate action.'
  },
  STATUS_UPDATE: {
    type: 'status_update',
    message: 'We are currently addressing your report. Is there any update from your side?'
  },
  VERIFICATION: {
    type: 'verification',
    message: 'We need to verify some information in your report. Please confirm the details you provided.'
  },
  WITNESS_INFO: {
    type: 'witness',
    message: 'Were there any witnesses to this incident? If so, can you provide their contact information?'
  }
}
