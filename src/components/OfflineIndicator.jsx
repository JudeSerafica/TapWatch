import { useState, useEffect } from 'react'
import { WifiOff, Wifi, Cloud, CloudOff } from 'lucide-react'
import { offlineQueue } from '../lib/offlineQueue'

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      syncQueue()
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check pending count
    updatePendingCount()

    // Subscribe to sync events
    const unsubscribe = offlineQueue.onSyncComplete((result) => {
      setIsSyncing(false)
      updatePendingCount()
      
      if (result.successCount > 0) {
        console.log(`✅ Synced ${result.successCount} items`)
      }
    })

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      unsubscribe()
    }
  }, [])

  const updatePendingCount = async () => {
    const count = await offlineQueue.getPendingCount()
    setPendingCount(count)
  }

  const syncQueue = async () => {
    setIsSyncing(true)
    await offlineQueue.syncQueue()
  }

  if (isOnline && pendingCount === 0) {
    return null // Don't show indicator when online and nothing pending
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOnline ? (
        // Offline Mode
        <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-pulse">
          <WifiOff size={20} className="text-orange-400" />
          <div>
            <div className="text-sm font-semibold">Offline Mode</div>
            {pendingCount > 0 && (
              <div className="text-xs text-gray-400">
                {pendingCount} report{pendingCount > 1 ? 's' : ''} queued
              </div>
            )}
          </div>
        </div>
      ) : isSyncing ? (
        // Syncing
        <div className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3">
          <div className="animate-spin">
            <Cloud size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold">Syncing...</div>
            <div className="text-xs text-blue-200">
              {pendingCount} item{pendingCount > 1 ? 's' : ''} remaining
            </div>
          </div>
        </div>
      ) : pendingCount > 0 ? (
        // Pending Items (online but not synced yet)
        <button
          onClick={syncQueue}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 transition"
        >
          <CloudOff size={20} />
          <div>
            <div className="text-sm font-semibold">
              {pendingCount} Pending
            </div>
            <div className="text-xs text-green-200">
              Tap to sync now
            </div>
          </div>
        </button>
      ) : null}
    </div>
  )
}
