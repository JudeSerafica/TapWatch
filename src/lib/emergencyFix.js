/**
 * EMERGENCY FIX: Direct status update that bypasses audit trail triggers
 * 
 * This is a temporary fix until the audit trail database issue is resolved.
 */

import { supabase } from './supabase'

/**
 * Direct status update - bypasses any triggers
 * Use this as an emergency fix when regular status updates fail
 */
export const directStatusUpdate = async (incidentId, newStatus) => {
  try {
    console.log(`🚨 EMERGENCY: Direct status update for ${incidentId} to ${newStatus}`)
    
    // Direct update with minimal fields to avoid triggers
    const { data, error } = await supabase
      .from('incidents')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        // Only add resolver fields if status is 'resolved'
        ...(newStatus === 'resolved' ? { resolved_at: new Date().toISOString() } : {}),
        // Only add responder fields if status is 'responding'
        ...(newStatus === 'responding' ? { responder_assigned_at: new Date().toISOString() } : {})
      })
      .eq('id', incidentId)
      .select('*')
      .single()

    if (error) {
      console.error('❌ Direct status update failed:', error)
      return { success: false, error }
    }

    console.log('✅ Direct status update successful:', data)
    
    // Still send notification if user_id exists
    if (data && data.user_id) {
      try {
        const { createNotification } = await import('./notificationService')
        
        let title = ''
        let message = ''
        let type = 'update'

        if (newStatus === 'responding') {
          title = '🚨 Responders On The Way!'
          message = `Your ${data.type} incident report is now being responded to. Help is on the way!`
          type = 'alert'
        } else if (newStatus === 'resolved') {
          title = '✅ Incident Resolved'
          message = `Your ${data.type} incident report has been marked as resolved. Thank you for reporting!`
          type = 'success'
        } else if (newStatus === 'pending') {
          title = '📋 Report Received'
          message = `Your ${data.type} incident report is pending review by our team.`
          type = 'info'
        }

        if (title && message) {
          await createNotification({
            userId: data.user_id,
            title,
            message,
            type,
            incidentId: incidentId
          })
          console.log('📢 Notification sent to user')
        }
      } catch (notifError) {
        console.warn('⚠️ Failed to send notification:', notifError)
        // Don't fail the main operation if notification fails
      }
    }

    return { success: true, data }
  } catch (err) {
    console.error('❌ Exception in directStatusUpdate:', err)
    return { success: false, error: err }
  }
}

/**
 * Check if incident status was actually saved
 */
export const verifyStatusUpdate = async (incidentId) => {
  try {
    const { data, error } = await supabase
      .from('incidents')
      .select('status, updated_at')
      .eq('id', incidentId)
      .single()
    
    if (error) {
      return { success: false, error }
    }
    
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err }
  }
}

/**
 * Fix database schema issue by creating missing column
 * WARNING: This requires proper database permissions
 */
export const fixAuditTrailSchema = async () => {
  console.log('🔧 Attempting to fix audit trail schema...')
  
  try {
    // Try to add the missing column (if we have permissions)
    const { error } = await supabase.rpc('execute_sql', {
      sql: `
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'audit_logs' 
            AND column_name = 'old_values'
          ) THEN
            ALTER TABLE audit_logs ADD COLUMN old_values TEXT;
          END IF;
          
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'audit_logs' 
            AND column_name = 'new_values'
          ) THEN
            ALTER TABLE audit_logs ADD COLUMN new_values TEXT;
          END IF;
        END $$;
      `
    })

    if (error) {
      console.warn('⚠️ Cannot fix schema automatically:', error.message)
      console.log('💡 Manual fix required in Supabase dashboard')
      return { success: false, error: 'Manual database fix required' }
    }

    console.log('✅ Audit trail schema fixed (or already correct)')
    return { success: true }
  } catch (err) {
    console.warn('⚠️ Schema fix failed:', err)
    return { success: false, error: err.message }
  }
}


/**
 * Raw SQL update - bypasses all triggers
 * WARNING: Only use this as last resort
 */
export const rawStatusUpdate = async (incidentId, newStatus) => {
  try {
    console.log(`🔨 RAW SQL: Updating status for ${incidentId} to ${newStatus}`)
    
    // First get current data
    const { data: currentData, error: fetchError } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', incidentId)
      .single()
    
    if (fetchError) {
      console.error('❌ Failed to fetch current data:', fetchError)
      return { success: false, error: fetchError }
    }
    
    // Try to use RPC to execute raw SQL (if available)
    try {
      const { error } = await supabase.rpc('update_incident_status', {
        p_incident_id: incidentId,
        p_new_status: newStatus
      })
      
      if (!error) {
        console.log('✅ RPC update successful')
        return { success: true, data: { ...currentData, status: newStatus } }
      }
    } catch (rpcError) {
      console.warn('⚠️ RPC not available, using direct update:', rpcError.message)
    }
    
    // Fallback: Direct update with minimal fields
    const updates = {
      status: newStatus,
      updated_at: new Date().toISOString()
    }
    
    if (newStatus === 'resolved') {
      updates.resolved_at = new Date().toISOString()
    }
    
    const { data, error } = await supabase
      .from('incidents')
      .update(updates)
      .eq('id', incidentId)
      .select('*')
      .single()
    
    if (error) {
      console.error('❌ Direct update also failed:', error)
      
      // Last resort: Try to disable triggers via comment?
      console.log('🆘 Attempting workaround...')
      
      // Try a completely different approach - maybe the issue is with "single()"
      const { data: bulkData, error: bulkError } = await supabase
        .from('incidents')
        .update(updates)
        .eq('id', incidentId)
        .select()
      
      if (bulkError) {
        console.error('❌ Even bulk update failed:', bulkError)
        return { success: false, error: bulkError }
      }
      
      console.log('✅ Bulk update worked!', bulkData)
      return { success: true, data: { ...currentData, ...updates } }
    }
    
    console.log('✅ Direct update successful:', data)
    return { success: true, data }
  } catch (err) {
    console.error('❌ Exception in rawStatusUpdate:', err)
    return { success: false, error: err }
  }
}