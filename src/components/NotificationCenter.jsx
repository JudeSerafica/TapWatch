import { useState, useEffect } from 'react'
import { X, Bell, AlertCircle, CheckCircle, Info, AlertTriangle, Clock } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { supabase } from '../lib/supabase'
import { markNotificationRead } from '../lib/database'
import { useNavigate } from 'react-router-dom'

export default function NotificationCenter({ isOpen, onClose, onUpdateUnreadCount }) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' or 'unread'

  useEffect(() => {
    if (!profile?.id || !isOpen) return
    
    fetchNotifications()
    
    // Mark all as read when panel opens (auto-read on view)
    markAllAsReadOnView()
  }, [profile?.id, isOpen, filter])

  const markAllAsReadOnView = async () => {
    try {
      // Get all unread notifications for this user
      const { data: unreadNotifications, error: fetchError } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', profile.id)
        .eq('is_read', false)

      if (fetchError) {
        console.error('❌ Error fetching unread notifications:', fetchError)
        return
      }

      if (!unreadNotifications || unreadNotifications.length === 0) {
        console.log('✅ No unread notifications to mark')
        return
      }

      const unreadIds = unreadNotifications.map(n => n.id)
      console.log(`📝 Auto-marking ${unreadIds.length} notifications as read:`, unreadIds)

      // Mark each notification individually using the database function
      for (const notificationId of unreadIds) {
        const { error } = await markNotificationRead(notificationId)
        if (error) {
          console.error(`❌ Error marking notification ${notificationId} as read:`, error)
        } else {
          console.log(`✅ Auto-marked notification ${notificationId} as read`)
        }
      }

      // Dispatch event to update badge count to 0
      window.dispatchEvent(new CustomEvent('notificationUnreadUpdate', { 
        detail: { count: 0 } 
      }))
      
      console.log(`✅ All ${unreadIds.length} notifications marked as read`)
    } catch (err) {
      console.error('❌ Exception in auto-marking notifications as read:', err)
    }
  }

  const fetchNotifications = async () => {
    setLoading(true)
    
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (filter === 'unread') {
      query = query.eq('is_read', false)
    }

    const { data, error } = await query

    if (!error && data) {
      setNotifications(data)
    }
    
    setLoading(false)
  }

  const markAsRead = async (notificationId) => {
    // Optimistically update UI first
    const notification = notifications.find(n => n.id === notificationId)
    if (!notification || notification.is_read) {
      console.log('⚠️ Notification already read or not found')
      return
    }

    console.log(`📝 Marking notification ${notificationId} as read`)

    // Update local state immediately
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    )
    
    // Calculate new unread count (subtract 1 since we're marking one as read)
    const currentUnreadCount = notifications.filter(n => !n.is_read).length
    const newUnreadCount = Math.max(0, currentUnreadCount - 1)
    
    // Update parent component immediately
    if (onUpdateUnreadCount) {
      onUpdateUnreadCount(newUnreadCount)
    }

    // Dispatch event for NotificationButton to update its count
    window.dispatchEvent(new CustomEvent('notificationUnreadUpdate', { 
      detail: { count: newUnreadCount } 
    }))

    // Then update database using the database function
    const { error } = await markNotificationRead(notificationId)

    if (error) {
      console.error('❌ Error marking as read in database:', error)
      console.error('Error message:', error.message, 'Code:', error.code)
      // Revert on error
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: false } : n)
      )
      if (onUpdateUnreadCount) {
        onUpdateUnreadCount(currentUnreadCount)
      }
      // Revert the event dispatch
      window.dispatchEvent(new CustomEvent('notificationUnreadUpdate', { 
        detail: { count: currentUnreadCount } 
      }))
    } else {
      console.log(`✅ Successfully marked notification ${notificationId} as read in database`)
    }
  }

  const handleNotificationClick = async (notification) => {
    // Mark as read first (if not already)
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }

    // Close the notification panel
    onClose()

    // Navigate based on notification data
    if (notification.incident_id) {
      // If user is admin, go to admin dashboard with incident modal
      if (profile?.role === 'admin' || profile?.role === 'official') {
        navigate('/admin')
        // Wait a bit for navigation, then trigger incident modal
        setTimeout(() => {
          // You can add a query parameter or use state to open specific incident
          const event = new CustomEvent('openIncident', { detail: { incidentId: notification.incident_id } })
          window.dispatchEvent(event)
        }, 300)
      } else {
        // If resident, go to incident map
        navigate(`/resident-map?incident=${notification.incident_id}`)
      }
    } else if (notification.type === 'sos' || notification.type === 'alert') {
      // Navigate to appropriate dashboard
      if (profile?.role === 'admin' || profile?.role === 'official') {
        navigate('/admin')
      } else {
        navigate('/resident-map')
      }
    }
  }

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    
    if (unreadIds.length === 0) {
      console.log('✅ No unread notifications to mark')
      return
    }

    console.log(`📝 Marking all ${unreadIds.length} notifications as read`)

    // Optimistically update UI first
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    
    // Update parent immediately
    if (onUpdateUnreadCount) {
      onUpdateUnreadCount(0)
    }

    // Dispatch event for NotificationButton
    window.dispatchEvent(new CustomEvent('notificationUnreadUpdate', { 
      detail: { count: 0 } 
    }))

    // Then update database - mark each notification individually to ensure it works
    try {
      for (const notificationId of unreadIds) {
        const { error } = await markNotificationRead(notificationId)
        if (error) {
          console.error(`❌ Error marking notification ${notificationId} as read:`, error)
        } else {
          console.log(`✅ Marked notification ${notificationId} as read`)
        }
      }
    } catch (err) {
      console.error('❌ Exception in markAllAsRead:', err)
      // Revert on error
      fetchNotifications()
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'alert':
      case 'sos':
        return <AlertCircle className="text-red-600" size={20} />
      case 'success':
        return <CheckCircle className="text-green-600" size={20} />
      case 'warning':
        return <AlertTriangle className="text-amber-600" size={20} />
      case 'update':
        return <Info className="text-blue-600" size={20} />
      default:
        return <Bell className="text-gray-600" size={20} />
    }
  }

  const formatTimeAgo = (timestamp) => {
    try {
      const now = new Date()
      const notifDate = new Date(timestamp)
      const diffMs = now - notifDate
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)
      
      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m`
      if (diffHours < 24) return `${diffHours}h`
      if (diffDays < 7) return `${diffDays}d`
      return notifDate.toLocaleDateString()
    } catch {
      return 'recently'
    }
  }

  if (!isOpen) return null

  const newNotifications = notifications.filter(n => {
    const hoursSinceCreated = (Date.now() - new Date(n.created_at).getTime()) / (1000 * 60 * 60)
    return hoursSinceCreated < 24
  })

  const earlierNotifications = notifications.filter(n => {
    const hoursSinceCreated = (Date.now() - new Date(n.created_at).getTime()) / (1000 * 60 * 60)
    return hoursSinceCreated >= 24
  })

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />

      {/* Notification Panel */}
      <div className="fixed right-4 top-16 w-[90vw] sm:w-96 max-h-[85vh] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden flex flex-col animate-scale-in">
        
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Unread
            </button>
          </div>
        </div>

        {/* Mark all as read button */}
        {notifications.some(n => !n.is_read) && (
          <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
            <button
              onClick={markAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Mark all as read
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-gray-500">
                <Clock size={18} className="animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <Bell size={28} className="text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm text-center">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
            </div>
          ) : (
            <div>
              {/* New Section */}
              {newNotifications.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 sticky top-0">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">New</h3>
                  </div>
                  {newNotifications.map(notification => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onClick={handleNotificationClick}
                      getIcon={getNotificationIcon}
                      formatTime={formatTimeAgo}
                    />
                  ))}
                </>
              )}

              {/* Earlier Section */}
              {earlierNotifications.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 sticky top-0">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Earlier</h3>
                  </div>
                  {earlierNotifications.map(notification => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onClick={handleNotificationClick}
                      getIcon={getNotificationIcon}
                      formatTime={formatTimeAgo}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <button 
              onClick={onClose}
              className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Close
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out forwards;
        }
      `}</style>
    </>
  )
}

// Notification Item Component
function NotificationItem({ notification, onClick, getIcon, formatTime }) {
  const handleClick = () => {
    onClick(notification)
  }

  return (
    <div
      onClick={handleClick}
      className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition ${
        !notification.is_read ? 'bg-blue-50/30' : ''
      }`}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
          !notification.is_read ? 'bg-white shadow-sm' : 'bg-gray-100'
        }`}>
          {getIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 font-medium leading-snug mb-1">
            {notification.title}
          </p>
          <p className="text-sm text-gray-600 leading-snug mb-1.5">
            {notification.message}
          </p>
          <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
            <Clock size={11} />
            <span>{formatTime(notification.created_at)}</span>
          </div>
        </div>

        {/* Unread Indicator */}
        {!notification.is_read && (
          <div className="flex-shrink-0 pt-1">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
          </div>
        )}
      </div>
    </div>
  )
}
