/**
 * Offline Queue Manager for TapWatch
 * Manages incident reports and actions when offline
 */

import { openDB } from 'idb'

const DB_NAME = 'tapwatch-offline'
const DB_VERSION = 1
const QUEUE_STORE = 'incident-queue'
const CACHE_STORE = 'cached-data'

/**
 * Initialize IndexedDB
 */
const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Queue for pending actions
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const queueStore = db.createObjectStore(QUEUE_STORE, {
          keyPath: 'id',
          autoIncrement: true
        })
        queueStore.createIndex('timestamp', 'timestamp')
        queueStore.createIndex('type', 'type')
        queueStore.createIndex('synced', 'synced')
      }

      // Cache for offline data
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        const cacheStore = db.createObjectStore(CACHE_STORE, {
          keyPath: 'key'
        })
        cacheStore.createIndex('timestamp', 'timestamp')
      }
    }
  })
}

/**
 * Queue Manager Class
 */
class OfflineQueueManager {
  constructor() {
    this.db = null
    this.syncListeners = []
  }

  async init() {
    this.db = await initDB()
    console.log('✅ Offline queue initialized')
  }

  /**
   * Add incident report to queue
   */
  async queueIncidentReport(incidentData) {
    if (!this.db) await this.init()

    const queueItem = {
      type: 'CREATE_INCIDENT',
      data: incidentData,
      timestamp: new Date().toISOString(),
      synced: false,
      retryCount: 0
    }

    const id = await this.db.add(QUEUE_STORE, queueItem)
    console.log('📥 Incident queued for sync:', id)
    
    return { id, queued: true }
  }

  /**
   * Add incident update to queue
   */
  async queueIncidentUpdate(incidentId, updates) {
    if (!this.db) await this.init()

    const queueItem = {
      type: 'UPDATE_INCIDENT',
      incidentId,
      data: updates,
      timestamp: new Date().toISOString(),
      synced: false,
      retryCount: 0
    }

    const id = await this.db.add(QUEUE_STORE, queueItem)
    console.log('📥 Update queued for sync:', id)
    
    return { id, queued: true }
  }

  /**
   * Add comment to queue
   */
  async queueComment(incidentId, comment) {
    if (!this.db) await this.init()

    const queueItem = {
      type: 'ADD_COMMENT',
      incidentId,
      data: { comment },
      timestamp: new Date().toISOString(),
      synced: false,
      retryCount: 0
    }

    const id = await this.db.add(QUEUE_STORE, queueItem)
    console.log('📥 Comment queued for sync:', id)
    
    return { id, queued: true }
  }

  /**
   * Get all pending items
   */
  async getPendingItems() {
    if (!this.db) await this.init()

    try {
      const tx = this.db.transaction(QUEUE_STORE, 'readonly')
      const store = tx.store
      const allItems = await store.getAll()
      
      // Filter for items that are not synced
      const pendingItems = allItems.filter(item => item.synced === false)
      
      return pendingItems
    } catch (error) {
      console.error('Error getting pending items:', error)
      return []
    }
  }

  /**
   * Get pending count
   */
  async getPendingCount() {
    if (!this.db) await this.init()

    try {
      const items = await this.getPendingItems()
      return items.length
    } catch (error) {
      console.error('Error getting pending count:', error)
      return 0
    }
  }

  /**
   * Sync queued items to server
   */
  async syncQueue() {
    if (!navigator.onLine) {
      console.log('📴 Offline - sync postponed')
      return { success: false, reason: 'offline' }
    }

    const pending = await this.getPendingItems()
    
    if (pending.length === 0) {
      console.log('✅ Queue is empty')
      return { success: true, synced: 0 }
    }

    console.log(`🔄 Syncing ${pending.length} items...`)

    let successCount = 0
    let failCount = 0

    for (const item of pending) {
      try {
        const result = await this.syncItem(item)
        
        if (result.success) {
          // Mark as synced
          await this.markAsSynced(item.id)
          successCount++
          console.log('✅ Synced:', item.type, item.id)
        } else {
          // Increment retry count
          await this.incrementRetry(item.id)
          failCount++
          console.error('❌ Sync failed:', item.type, result.error)
        }
      } catch (error) {
        failCount++
        console.error('❌ Sync error:', error)
        await this.incrementRetry(item.id)
      }
    }

    console.log(`📊 Sync complete: ${successCount} success, ${failCount} failed`)

    // Notify listeners
    this.notifySyncComplete(successCount, failCount)

    return {
      success: true,
      synced: successCount,
      failed: failCount
    }
  }

  /**
   * Sync individual item
   */
  async syncItem(item) {
    const { createIncident, updateIncident, addComment } = await import('./database')

    try {
      switch (item.type) {
        case 'CREATE_INCIDENT':
          const { data: incident, error: createError } = await createIncident(item.data)
          if (createError) throw createError
          return { success: true, data: incident }

        case 'UPDATE_INCIDENT':
          const { data: updated, error: updateError } = await updateIncident(
            item.incidentId,
            item.data
          )
          if (updateError) throw updateError
          return { success: true, data: updated }

        case 'ADD_COMMENT':
          const { data: comment, error: commentError } = await addComment(
            item.incidentId,
            item.data.comment
          )
          if (commentError) throw commentError
          return { success: true, data: comment }

        default:
          return { success: false, error: 'Unknown item type' }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Mark item as synced
   */
  async markAsSynced(itemId) {
    if (!this.db) await this.init()

    const tx = this.db.transaction(QUEUE_STORE, 'readwrite')
    const item = await tx.store.get(itemId)
    
    if (item) {
      item.synced = true
      item.syncedAt = new Date().toISOString()
      await tx.store.put(item)
    }
    
    await tx.done
  }

  /**
   * Increment retry count
   */
  async incrementRetry(itemId) {
    if (!this.db) await this.init()

    const tx = this.db.transaction(QUEUE_STORE, 'readwrite')
    const item = await tx.store.get(itemId)
    
    if (item) {
      item.retryCount = (item.retryCount || 0) + 1
      item.lastRetry = new Date().toISOString()
      
      // Delete if too many retries
      if (item.retryCount > 5) {
        await tx.store.delete(itemId)
        console.warn('⚠️ Item deleted after 5 failed retries:', itemId)
      } else {
        await tx.store.put(item)
      }
    }
    
    await tx.done
  }

  /**
   * Clear synced items
   */
  async clearSynced() {
    if (!this.db) await this.init()

    const tx = this.db.transaction(QUEUE_STORE, 'readwrite')
    const index = tx.store.index('synced')
    const syncedItems = await index.getAll(true)
    
    for (const item of syncedItems) {
      await tx.store.delete(item.id)
    }
    
    await tx.done
    console.log(`🗑️ Cleared ${syncedItems.length} synced items`)
  }

  /**
   * Cache data for offline use
   */
  async cacheData(key, data, ttl = 3600000) { // 1 hour default
    if (!this.db) await this.init()

    const cacheItem = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    }

    await this.db.put(CACHE_STORE, cacheItem)
    console.log('💾 Data cached:', key)
  }

  /**
   * Get cached data
   */
  async getCachedData(key) {
    if (!this.db) await this.init()

    const item = await this.db.get(CACHE_STORE, key)
    
    if (!item) return null
    
    // Check if expired
    if (item.expiresAt < Date.now()) {
      await this.db.delete(CACHE_STORE, key)
      return null
    }
    
    return item.data
  }

  /**
   * Clear expired cache
   */
  async clearExpiredCache() {
    if (!this.db) await this.init()

    const tx = this.db.transaction(CACHE_STORE, 'readwrite')
    const items = await tx.store.getAll()
    const now = Date.now()
    
    let cleared = 0
    for (const item of items) {
      if (item.expiresAt < now) {
        await tx.store.delete(item.key)
        cleared++
      }
    }
    
    await tx.done
    console.log(`🗑️ Cleared ${cleared} expired cache items`)
  }

  /**
   * Subscribe to sync events
   */
  onSyncComplete(callback) {
    this.syncListeners.push(callback)
    return () => {
      this.syncListeners = this.syncListeners.filter(cb => cb !== callback)
    }
  }

  /**
   * Notify sync listeners
   */
  notifySyncComplete(successCount, failCount) {
    this.syncListeners.forEach(callback => {
      callback({ successCount, failCount })
    })
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueueManager()

// Auto-sync when coming online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('🌐 Connection restored - syncing queue...')
    offlineQueue.syncQueue()
  })

  // Periodic sync every 5 minutes if online
  setInterval(() => {
    if (navigator.onLine) {
      offlineQueue.syncQueue()
      offlineQueue.clearExpiredCache()
    }
  }, 5 * 60 * 1000)
}
