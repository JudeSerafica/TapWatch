import { useState, useEffect } from 'react'
import { IoMdNotificationsOutline } from 'react-icons/io'
import { useAuth } from '../context/useAuth'
import { supabase } from '../lib/supabase'
import NotificationCenter from './NotificationCenter'

export default function NotificationButton({ onNotificationClick }) {
  const { profile } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!profile?.id) return

    // Fetch initial unread notifications count
    const fetchUnreadCount = async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_read', false)

      if (!error && count !== null) {
        setUnreadCount(count)
      }
    }

    fetchUnreadCount()

    // Subscribe to new notifications
    const subscription = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`
        },
        () => {
          fetchUnreadCount()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [profile?.id])

  const handleClick = () => {
    setIsOpen(!isOpen)
    if (onNotificationClick) {
      onNotificationClick()
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`relative flex items-center justify-center w-9 h-9 rounded-full font-bold transition-all shadow-sm ${
          isOpen
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
        }`}
        title="Notifications"
      >
        <IoMdNotificationsOutline size={20} />
        
        {/* Badge counter */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-bold rounded-full shadow-md">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      <NotificationCenter 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
        onUpdateUnreadCount={setUnreadCount}
      />
    </>
  )
}
