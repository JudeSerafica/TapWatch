/**
 * Incident Assignment & Dispatch System
 * Manages responder assignment and incident dispatch
 */

import { supabase } from './supabase'
import { sendSMS, SMSTemplates } from './smsService'

/**
 * Responder types and their incident specializations
 */
export const ResponderTypes = {
  POLICE: 'police',
  FIRE: 'fire',
  MEDICAL: 'medical',
  TANOD: 'tanod',
  ADMIN: 'admin'
}

export const IncidentTypeToResponder = {
  crime: [ResponderTypes.POLICE, ResponderTypes.TANOD],
  fire: [ResponderTypes.FIRE, ResponderTypes.TANOD],
  accident: [ResponderTypes.MEDICAL, ResponderTypes.POLICE, ResponderTypes.TANOD],
  flood: [ResponderTypes.TANOD, ResponderTypes.ADMIN],
  disturbance: [ResponderTypes.TANOD, ResponderTypes.POLICE]
}

/**
 * Get available responders for incident type
 */
export const getAvailableResponders = async (incidentType, location = null) => {
  try {
    const responderTypes = IncidentTypeToResponder[incidentType] || [ResponderTypes.TANOD]

    const { data, error } = await supabase
      .from('responders')
      .select('*')
      .in('type', responderTypes)
      .eq('is_active', true)
      .eq('is_available', true)
      .order('assigned_count', { ascending: true }) // Least assigned first

    if (error) throw error

    // If location provided, sort by proximity (simplified)
    if (location && data) {
      // In production, implement proper geospatial sorting
      return data
    }

    return data || []
  } catch (error) {
    console.error('Error fetching responders:', error)
    return []
  }
}

/**
 * Auto-assign incident to best available responder
 */
export const autoAssignIncident = async (incidentId, incidentType, location, urgency = 'medium') => {
  try {
    console.log(`🎯 Auto-assigning incident ${incidentId}...`)

    // Get available responders
    const responders = await getAvailableResponders(incidentType, location)

    if (responders.length === 0) {
      console.warn('⚠️ No available responders')
      return {
        success: false,
        error: 'No available responders',
        fallback: 'admin'
      }
    }

    // Select best responder (first in list = least assigned + active)
    const selectedResponder = responders[0]

    // Create assignment
    const { data: assignment, error: assignError } = await supabase
      .from('incident_assignments')
      .insert([{
        incident_id: incidentId,
        responder_id: selectedResponder.id,
        assigned_at: new Date().toISOString(),
        status: 'assigned',
        urgency_level: urgency
      }])
      .select()
      .single()

    if (assignError) throw assignError

    // Update incident
    const { error: updateError } = await supabase
      .from('incidents')
      .update({
        responder_id: selectedResponder.id,
        status: 'responding',
        responder_assigned_at: new Date().toISOString()
      })
      .eq('id', incidentId)

    if (updateError) throw updateError

    // Update responder stats
    await supabase.rpc('increment_responder_assignments', {
      responder_id: selectedResponder.id
    })

    // Send SMS notification to responder
    if (selectedResponder.phone) {
      const message = SMSTemplates.incidentAssigned(incidentType, location)
      await sendSMS(selectedResponder.phone, message)
    }

    console.log(`✅ Incident assigned to ${selectedResponder.name}`)

    return {
      success: true,
      assignment,
      responder: selectedResponder
    }
  } catch (error) {
    console.error('❌ Auto-assignment failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Manually assign incident to specific responder
 */
export const manualAssignIncident = async (incidentId, responderId, assignedBy) => {
  try {
    // Check if responder is available
    const { data: responder, error: responderError } = await supabase
      .from('responders')
      .select('*')
      .eq('id', responderId)
      .single()

    if (responderError) throw responderError

    if (!responder.is_active) {
      return {
        success: false,
        error: 'Responder is not active'
      }
    }

    // Create assignment
    const { data: assignment, error: assignError } = await supabase
      .from('incident_assignments')
      .insert([{
        incident_id: incidentId,
        responder_id: responderId,
        assigned_by: assignedBy,
        assigned_at: new Date().toISOString(),
        status: 'assigned'
      }])
      .select()
      .single()

    if (assignError) throw assignError

    // Update incident
    const { error: updateError } = await supabase
      .from('incidents')
      .update({
        responder_id: responderId,
        status: 'responding',
        responder_assigned_at: new Date().toISOString()
      })
      .eq('id', incidentId)

    if (updateError) throw updateError

    // Update responder stats
    await supabase.rpc('increment_responder_assignments', {
      responder_id: responderId
    })

    // Send SMS notification
    if (responder.phone) {
      const { data: incident } = await supabase
        .from('incidents')
        .select('type, location')
        .eq('id', incidentId)
        .single()

      if (incident) {
        const message = SMSTemplates.incidentAssigned(incident.type, incident.location)
        await sendSMS(responder.phone, message)
      }
    }

    console.log(`✅ Incident manually assigned to ${responder.name}`)

    return {
      success: true,
      assignment,
      responder
    }
  } catch (error) {
    console.error('❌ Manual assignment failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Reassign incident to different responder
 */
export const reassignIncident = async (incidentId, newResponderId, reason, reassignedBy) => {
  try {
    // Get current assignment
    const { data: currentAssignment } = await supabase
      .from('incident_assignments')
      .select('*')
      .eq('incident_id', incidentId)
      .eq('status', 'assigned')
      .single()

    if (currentAssignment) {
      // Update old assignment status
      await supabase
        .from('incident_assignments')
        .update({
          status: 'reassigned',
          reassigned_at: new Date().toISOString(),
          reassign_reason: reason
        })
        .eq('id', currentAssignment.id)
    }

    // Create new assignment
    return await manualAssignIncident(incidentId, newResponderId, reassignedBy)
  } catch (error) {
    console.error('❌ Reassignment failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Get responder's current assignments
 */
export const getResponderAssignments = async (responderId, status = 'assigned') => {
  try {
    const { data, error } = await supabase
      .from('incident_assignments')
      .select(`
        *,
        incident:incidents (
          id,
          type,
          location,
          description,
          status,
          urgency_level,
          created_at
        )
      `)
      .eq('responder_id', responderId)
      .eq('status', status)
      .order('assigned_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching assignments:', error)
    return []
  }
}

/**
 * Update assignment status
 */
export const updateAssignmentStatus = async (assignmentId, status, notes = null) => {
  try {
    const updates = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'accepted') {
      updates.accepted_at = new Date().toISOString()
    } else if (status === 'completed') {
      updates.completed_at = new Date().toISOString()
    } else if (status === 'declined') {
      updates.declined_at = new Date().toISOString()
      updates.decline_reason = notes
    }

    if (notes) {
      updates.notes = notes
    }

    const { data, error } = await supabase
      .from('incident_assignments')
      .update(updates)
      .eq('id', assignmentId)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error updating assignment:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get assignment analytics
 */
export const getAssignmentAnalytics = async (timeRange = '7d') => {
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
        startDate.setDate(now.getDate() - 7)
    }

    const { data, error } = await supabase
      .from('incident_assignments')
      .select('*')
      .gte('assigned_at', startDate.toISOString())

    if (error) throw error

    // Calculate analytics
    const analytics = {
      total: data.length,
      byStatus: {},
      byResponder: {},
      avgResponseTime: 0,
      completionRate: 0
    }

    let totalResponseTime = 0
    let responseTimeCount = 0

    data.forEach(assignment => {
      // Count by status
      analytics.byStatus[assignment.status] = 
        (analytics.byStatus[assignment.status] || 0) + 1

      // Count by responder
      analytics.byResponder[assignment.responder_id] = 
        (analytics.byResponder[assignment.responder_id] || 0) + 1

      // Calculate response time
      if (assignment.accepted_at) {
        const responseTime = new Date(assignment.accepted_at) - new Date(assignment.assigned_at)
        totalResponseTime += responseTime
        responseTimeCount++
      }
    })

    // Average response time in minutes
    if (responseTimeCount > 0) {
      analytics.avgResponseTime = Math.round(
        (totalResponseTime / responseTimeCount) / 1000 / 60
      )
    }

    // Completion rate
    const completed = analytics.byStatus['completed'] || 0
    analytics.completionRate = data.length > 0 
      ? Math.round((completed / data.length) * 100)
      : 0

    return analytics
  } catch (error) {
    console.error('Error getting analytics:', error)
    return null
  }
}

/**
 * Dispatch incident to multiple responders (for urgent cases)
 */
export const dispatchToMultiple = async (incidentId, incidentType, location, urgency = 'high') => {
  try {
    const responders = await getAvailableResponders(incidentType, location)

    if (responders.length === 0) {
      return {
        success: false,
        error: 'No available responders'
      }
    }

    // Dispatch to top 3 responders for urgent cases
    const selectedResponders = responders.slice(0, 3)
    const assignments = []

    for (const responder of selectedResponders) {
      const { data: assignment } = await supabase
        .from('incident_assignments')
        .insert([{
          incident_id: incidentId,
          responder_id: responder.id,
          assigned_at: new Date().toISOString(),
          status: 'dispatched',
          urgency_level: urgency
        }])
        .select()
        .single()

      assignments.push(assignment)

      // Send SMS
      if (responder.phone) {
        const message = SMSTemplates.responderDispatch(incidentType, location, urgency)
        await sendSMS(responder.phone, message)
      }
    }

    console.log(`🚨 Dispatched to ${selectedResponders.length} responders`)

    return {
      success: true,
      assignments,
      responders: selectedResponders
    }
  } catch (error) {
    console.error('❌ Dispatch failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
