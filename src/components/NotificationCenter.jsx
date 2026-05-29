import { useState, useEffect } from 'react'
import { Bell, X, Check, MapPin, Clock } from 'lucide-react'
import { notificationStore } from '../lib/notifications'
import { useNavigate } from 'react-router-dom'

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    // Load initial notifications
    setNotifications(notificationStore.getAll())
    setUnreadCount(notificationStore.getUnreadCount())

    // Subscribe to changes
    const unsubscribe = notificationStore.subscribe((newNotifications) => {
      setNotifications(newNotifications)
      setUnreadCount(notificationStore.getUnreadCount())
    })

    return unsubscribe
  }, [])

  const handleNotificationClick = (notification) => {
    notificationStore.markAsRead(notification.id)
    
    // Navigate based on notification type
    if (notification.data?.incidentId) {
      navigate(`/resident-map?incident=${notification.data.incidentId}`)
    }
    
    setIsOpen(false)
  }

  const handleMarkAllRead = () => {
    notificationStore.markAllAsRead()
  }

  const handleClearAll = () => {
    if (confirm('Clear all notifications?')) {
      notificationStore.clear()
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'emergency':
      case 'sos':
        return '🚨'
      case 'warning':
        return '⚠️'
      case 'resolved':
        return '✅'
      case 'admin_response':
        return '📝'
      default:
        return '📢'
    }
  }

  const getTimeAgo = (timestamp) => {
    const now = new Date()
    const notifDate = new Date(timestamp)
    const diffMs = now - notifDate
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${Math.floor(diffHours / 24)}d ago`
  }

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition"
      >
        <Bell size={20} className="text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Panel */}
          <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-xl shadow-2xl border z-50 max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">Notifications</h3>
                <p className="text-xs text-gray-500">
                  {unreadCount} unread
                </p>
              </div>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <>
                    <button
                      onClick={handleMarkAllRead}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                      title="Mark all as read"
                    >
                      <Check size={16} className="text-gray-600" />
                    </button>
                    <button
                      onClick={handleClearAll}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                      title="Clear all"
                    >
                      <X size={16} className="text-gray-600" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Bell size={48} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`px-4 py-3 border-b hover:bg-gray-50 cursor-pointer transition ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notification.data?.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-gray-900 mb-1">
                          {notification.title}
                        </h4>
                        <p className="text-xs text-gray-600 mb-2">
                          {notification.body}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock size={10} />
                          {getTimeAgo(notification.timestamp)}
                        </div>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
