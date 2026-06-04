/**
 * Push Notifications System for TapWatch
 * Handles browser notifications and in-app alerts
 */

// Request notification permission
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

// Send browser notification
export function sendNotification(title, options = {}) {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/Tapinac.logo.jpg',
      badge: '/Tapinac.logo.jpg',
      ...options
    })

    notification.onclick = () => {
      window.focus()
      if (options.onClick) {
        options.onClick()
      }
      notification.close()
    }

    return notification
  }
}

// Notification templates
export const NotificationTemplates = {
  // Incident status updates
  statusUpdate: (incident, newStatus) => ({
    title: `Incident Status Updated`,
    body: `Your ${incident.type} report is now ${newStatus}`,
    icon: '/Tapinac.logo.jpg',
    tag: `incident-${incident.id}`,
    data: { incidentId: incident.id, type: 'status_update' }
  }),

  // Nearby emergency
  nearbyEmergency: (incident, distance) => ({
    title: `🚨 Emergency Alert Nearby`,
    body: `${incident.type.toUpperCase()} incident ${distance}m from your location`,
    icon: '/Tapinac.logo.jpg',
    tag: `emergency-${incident.id}`,
    requireInteraction: true,
    data: { incidentId: incident.id, type: 'emergency' }
  }),

  // Incident resolved
  incidentResolved: (incident) => ({
    title: `✅ Incident Resolved`,
    body: `Your ${incident.type} report has been resolved`,
    icon: '/Tapinac.logo.jpg',
    tag: `resolved-${incident.id}`,
    data: { incidentId: incident.id, type: 'resolved' }
  }),

  // Admin response
  adminResponse: (incident) => ({
    title: `📝 Official Response`,
    body: `Officials have added notes to your ${incident.type} report`,
    icon: '/Tapinac.logo.jpg',
    tag: `response-${incident.id}`,
    data: { incidentId: incident.id, type: 'admin_response' }
  }),

  // Community warning
  communityWarning: (incident) => ({
    title: `⚠️ Community Warning`,
    body: `${incident.type.toUpperCase()} - ${incident.location}`,
    icon: '/Tapinac.logo.jpg',
    tag: `warning-${incident.id}`,
    requireInteraction: true,
    data: { incidentId: incident.id, type: 'warning' }
  }),

  // SOS Alert
  sosAlert: (user, location) => ({
    title: `🚨 SOS EMERGENCY ALERT`,
    body: `${user.full_name} needs immediate help at ${location}`,
    icon: '/Tapinac.logo.jpg',
    tag: `sos-${user.id}`,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: { userId: user.id, type: 'sos' }
  })
}

// Calculate distance between two coordinates (in meters)
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return Math.round(R * c) // Distance in meters
}

// Check if incident is nearby (within 1km)
export function isNearby(userLat, userLon, incidentLat, incidentLon, radiusMeters = 1000) {
  if (!userLat || !userLon || !incidentLat || !incidentLon) return false
  const distance = calculateDistance(userLat, userLon, incidentLat, incidentLon)
  return distance <= radiusMeters
}

// In-app notification store (for notification center)
class NotificationStore {
  constructor() {
    this.notifications = this.loadFromStorage()
    this.listeners = []
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem('tapwatch_notifications')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem('tapwatch_notifications', JSON.stringify(this.notifications))
    } catch (error) {
      console.error('Failed to save notifications:', error)
    }
  }

  add(notification) {
    const newNotification = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notification
    }
    this.notifications.unshift(newNotification)
    
    // Keep only last 50 notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50)
    }
    
    this.saveToStorage()
    this.notifyListeners()
    return newNotification
  }

  markAsRead(id) {
    const notification = this.notifications.find(n => n.id === id)
    if (notification) {
      notification.read = true
      this.saveToStorage()
      this.notifyListeners()
    }
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.read = true)
    this.saveToStorage()
    this.notifyListeners()
  }

  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length
  }

  getAll() {
    return this.notifications
  }

  clear() {
    this.notifications = []
    this.saveToStorage()
    this.notifyListeners()
  }

  subscribe(listener) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.notifications))
  }
}

export const notificationStore = new NotificationStore()
