/**
 * Audit Trail System
 * Tracks all changes and actions in the system
 */

import { supabase } from './supabase'

/**
 * Audit event types
 */
export const AuditEventTypes = {
  // Incident events
  INCIDENT_CREATED: 'incident_created',
  INCIDENT_UPDATED: 'incident_updated',
  INCIDENT_STATUS_CHANGED: 'incident_status_changed',
  INCIDENT_ASSIGNED: 'incident_assigned',
  INCIDENT_REASSIGNED: 'incident_reassigned',
  INCIDENT_DELETED: 'incident_deleted',
  
  // Evidence events
  EVIDENCE_UPLOADED: 'evidence_uploaded',
  EVIDENCE_DELETED: 'evidence_deleted',
  EVIDENCE_VERIFIED: 'evidence_verified',
  
  // User events
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_REGISTERED: 'user_registered',
  USER_PROFILE_UPDATED: 'user_profile_updated',
  USER_ROLE_CHANGED: 'user_role_changed',
  
  // Admin events
  ADMIN_ACTION: 'admin_action',
  SETTINGS_CHANGED: 'settings_changed',
  RESPONDER_ADDED: 'responder_added',
  RESPONDER_REMOVED: 'responder_removed',
  
  // Comment events
  COMMENT_ADDED: 'comment_added',
  COMMENT_EDITED: 'comment_edited',
  COMMENT_DELETED: 'comment_deleted',
  
  // SOS events
  SOS_TRIGGERED: 'sos_triggered',
  SOS_RESPONDED: 'sos_responded',
  SOS_CANCELLED: 'sos_cancelled',
}

/**
 * Log audit event
 */
export const logAudit = async ({
  eventType,
  userId,
  incidentId = null,
  targetId = null,
  targetType = null,
  action,
  changes = null,
  metadata = null,
  ipAddress = null,
  userAgent = null
}) => {
  try {
    // Extract old and new values if changes provided
    let oldValues = null
    let newValues = null
    
    if (changes) {
      oldValues = changes.oldValue || changes.old_value || null
      newValues = changes.newValue || changes.new_value || null
    }

    const { data, error } = await supabase
      .from('audit_logs')
      .insert([{
        event_type: eventType,
        user_id: userId,
        incident_id: incidentId,
        target_id: targetId,
        target_type: targetType,
        action,
        old_values: oldValues,
        new_values: newValues,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) throw error

    console.log('📝 Audit logged:', eventType)

    return { success: true, log: data }
  } catch (error) {
    console.error('❌ Audit logging failed:', error)
    // Don't fail the main operation if audit logging fails
    return { success: false, error: error.message }
  }
}

/**
 * Log incident creation
 */
export const logIncidentCreated = async (userId, incidentId, incidentData) => {
  return await logAudit({
    eventType: AuditEventTypes.INCIDENT_CREATED,
    userId,
    incidentId,
    action: `Created ${incidentData.type} incident at ${incidentData.location}`,
    metadata: {
      type: incidentData.type,
      location: incidentData.location,
      urgency: incidentData.urgency_level
    }
  })
}

/**
 * Log incident status change
 */
export const logStatusChange = async (userId, incidentId, oldStatus, newStatus, reason = null) => {
  return await logAudit({
    eventType: AuditEventTypes.INCIDENT_STATUS_CHANGED,
    userId,
    incidentId,
    action: `Changed status from ${oldStatus} to ${newStatus}`,
    changes: {
      field: 'status',
      oldValue: oldStatus,
      newValue: newStatus,
      reason
    }
  })
}

/**
 * Log incident assignment
 */
export const logIncidentAssignment = async (userId, incidentId, responderId, responderName) => {
  return await logAudit({
    eventType: AuditEventTypes.INCIDENT_ASSIGNED,
    userId,
    incidentId,
    targetId: responderId,
    targetType: 'responder',
    action: `Assigned incident to ${responderName}`,
    metadata: {
      responderId,
      responderName
    }
  })
}

/**
 * Log evidence upload
 */
export const logEvidenceUpload = async (userId, incidentId, evidenceId, fileName) => {
  return await logAudit({
    eventType: AuditEventTypes.EVIDENCE_UPLOADED,
    userId,
    incidentId,
    targetId: evidenceId,
    targetType: 'evidence',
    action: `Uploaded evidence: ${fileName}`,
    metadata: { fileName }
  })
}

/**
 * Log comment added
 */
export const logCommentAdded = async (userId, incidentId, commentId, isOfficial = false) => {
  return await logAudit({
    eventType: AuditEventTypes.COMMENT_ADDED,
    userId,
    incidentId,
    targetId: commentId,
    targetType: 'comment',
    action: isOfficial ? 'Added official comment' : 'Added comment',
    metadata: { isOfficial }
  })
}

/**
 * Log SOS trigger
 */
export const logSOSTriggered = async (userId, incidentId, location) => {
  return await logAudit({
    eventType: AuditEventTypes.SOS_TRIGGERED,
    userId,
    incidentId,
    action: `Triggered SOS alert at ${location}`,
    metadata: {
      location,
      timestamp: new Date().toISOString()
    }
  })
}

/**
 * Get audit logs for incident
 */
export const getIncidentAuditLogs = async (incidentId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        user:profiles!audit_logs_user_id_fkey (
          full_name,
          role
        )
      `)
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return {
      success: true,
      logs: data || []
    }
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return {
      success: false,
      error: error.message,
      logs: []
    }
  }
}

/**
 * Get audit logs for user
 */
export const getUserAuditLogs = async (userId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return {
      success: true,
      logs: data || []
    }
  } catch (error) {
    console.error('Error fetching user logs:', error)
    return {
      success: false,
      error: error.message,
      logs: []
    }
  }
}

/**
 * Get recent audit logs (admin)
 */
export const getRecentAuditLogs = async (limit = 100, eventType = null) => {
  try {
    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        user:profiles!audit_logs_user_id_fkey (
          full_name,
          role
        ),
        incident:incidents (
          type,
          location
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (eventType) {
      query = query.eq('event_type', eventType)
    }

    const { data, error } = await query

    if (error) throw error

    return {
      success: true,
      logs: data || []
    }
  } catch (error) {
    console.error('Error fetching recent logs:', error)
    return {
      success: false,
      error: error.message,
      logs: []
    }
  }
}

/**
 * Get audit statistics
 */
export const getAuditStatistics = async (timeRange = '7d') => {
  try {
    const now = new Date()
    let startDate = new Date()

    switch (timeRange) {
      case '24h':
        startDate.setHours(now.getHours() - 24)
        break
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      default:
        startDate.setDate(now.getDate() - 7)
    }

    const { data, error } = await supabase
      .from('audit_logs')
      .select('event_type, user_id')
      .gte('created_at', startDate.toISOString())

    if (error) throw error

    // Calculate statistics
    const stats = {
      total: data.length,
      byEventType: {},
      byUser: {},
      uniqueUsers: new Set(),
      timeline: []
    }

    data.forEach(log => {
      stats.byEventType[log.event_type] = (stats.byEventType[log.event_type] || 0) + 1
      stats.byUser[log.user_id] = (stats.byUser[log.user_id] || 0) + 1
      stats.uniqueUsers.add(log.user_id)
    })

    stats.uniqueUsers = stats.uniqueUsers.size

    return {
      success: true,
      stats
    }
  } catch (error) {
    console.error('Error calculating audit stats:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Search audit logs
 */
export const searchAuditLogs = async (filters = {}) => {
  try {
    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        user:profiles!audit_logs_user_id_fkey (
          full_name,
          role
        )
      `)

    if (filters.userId) {
      query = query.eq('user_id', filters.userId)
    }

    if (filters.incidentId) {
      query = query.eq('incident_id', filters.incidentId)
    }

    if (filters.eventType) {
      query = query.eq('event_type', filters.eventType)
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate)
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate)
    }

    if (filters.action) {
      query = query.ilike('action', `%${filters.action}%`)
    }

    query = query.order('created_at', { ascending: false })
    query = query.limit(filters.limit || 100)

    const { data, error } = await query

    if (error) throw error

    return {
      success: true,
      logs: data || []
    }
  } catch (error) {
    console.error('Error searching audit logs:', error)
    return {
      success: false,
      error: error.message,
      logs: []
    }
  }
}

/**
 * Export audit logs to CSV
 */
export const exportAuditLogsCSV = async (filters = {}) => {
  try {
    const { logs } = await searchAuditLogs(filters)

    // Generate CSV
    const headers = [
      'Timestamp',
      'Event Type',
      'User',
      'Action',
      'Incident ID',
      'IP Address'
    ]

    const rows = logs.map(log => [
      new Date(log.created_at).toLocaleString(),
      log.event_type,
      log.user?.full_name || 'Unknown',
      log.action,
      log.incident_id || '-',
      log.ip_address || '-'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    return {
      success: true,
      csv: csvContent
    }
  } catch (error) {
    console.error('Error exporting CSV:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
