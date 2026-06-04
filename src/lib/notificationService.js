import { supabase } from './supabase'

/**
 * Create a notification for a specific user
 */
export const createNotification = async ({ userId, title, message, type = 'info', incidentId = null }) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([
        {
          user_id: userId,
          title,
          message,
          type,
          incident_id: incidentId,
          is_read: false
        }
      ])
      .select()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error creating notification:', error)
    return { data: null, error }
  }
}

/**
 * Create notifications for multiple users
 */
export const createBulkNotifications = async ({ userIds, title, message, type = 'info', incidentId = null }) => {
  try {
    const notifications = userIds.map(userId => ({
      user_id: userId,
      title,
      message,
      type,
      incident_id: incidentId,
      is_read: false
    }))

    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error creating bulk notifications:', error)
    return { data: null, error }
  }
}

/**
 * Create notification for all admins
 */
export const notifyAllAdmins = async ({ title, message, type = 'alert', incidentId = null }) => {
  try {
    // Get all admin user IDs
    const { data: admins, error: adminError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')

    if (adminError) throw adminError

    const adminIds = admins.map(admin => admin.id)
    
    return await createBulkNotifications({
      userIds: adminIds,
      title,
      message,
      type,
      incidentId
    })
  } catch (error) {
    console.error('Error notifying admins:', error)
    return { data: null, error }
  }
}

/**
 * Create notification for all users (broadcast)
 */
export const broadcastNotification = async ({ title, message, type = 'info' }) => {
  try {
    // Get all user IDs
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id')

    if (userError) throw userError

    const userIds = users.map(user => user.id)
    
    return await createBulkNotifications({
      userIds,
      title,
      message,
      type
    })
  } catch (error) {
    console.error('Error broadcasting notification:', error)
    return { data: null, error }
  }
}

/**
 * Mark notification as read
 */
export const markAsRead = async (notificationId) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return { data: null, error }
  }
}

/**
 * Mark all notifications as read for a user
 */
export const markAllAsRead = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .select()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error marking all as read:', error)
    return { data: null, error }
  }
}

/**
 * Get user notifications
 */
export const getUserNotifications = async (userId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return { data: null, error }
  }
}

/**
 * Delete notification
 */
export const deleteNotification = async (notificationId) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Error deleting notification:', error)
    return { error }
  }
}
