import { supabase } from './supabase'

/**
 * Sanitize a search string before interpolating it into a PostgREST .or()
 * filter string. PostgREST parses , ) . as filter syntax inside .or(), so
 * those characters must be stripped. Length is also capped to prevent DoS.
 */
function sanitizeSearch(input) {
  if (typeof input !== 'string') return ''
  return input
    .replace(/[,()\\.%]/g, ' ') // strip PostgREST filter metacharacters
    .trim()
    .slice(0, 100)               // bound the length
}

// Incidents
export const getIncidents = async (filters = {}) => {
  let query = supabase
    .from('incidents')
    .select(`
      *,
      profiles:profiles!incidents_user_id_fkey (full_name, phone)
    `)
    .order('created_at', { ascending: false })

  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.type) {
    query = query.eq('type', filters.type)
  }
  if (filters.purok) {
    query = query.eq('purok', filters.purok)
  }
  if (filters.search) {
    // Sanitize before interpolating into a PostgREST filter string.
    const safe = sanitizeSearch(filters.search)
    if (safe) query = query.or(`description.ilike.%${safe}%,location.ilike.%${safe}%`)
  }

  const { data, error } = await query
  return { data, error }
}

export const getIncidentById = async (id) => {
  const { data, error } = await supabase
    .from('incidents')
    .select(`
      *,
      profiles:profiles!incidents_user_id_fkey (full_name, phone),
      responder:profiles!incidents_responder_id_fkey (full_name)
    `)
    .eq('id', id)
    .single()
  
  return { data, error }
}

export const createIncident = async (incidentData) => {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error("AUTH ERROR:", authError)
      return { data: null, error: authError }
    }

    if (!user) {
      return {
        data: null,
        error: { message: "User not authenticated" },
      }
    }

    const payload = {
      ...incidentData,
      user_id: user.id,
      status: incidentData.status || "pending",
      created_at: new Date().toISOString(),
    }

    console.log("INSERT PAYLOAD:", payload)

    const { data, error } = await supabase
      .from("incidents")
      .insert([payload])
      .select()
      .single()

    if (error) {
      console.error("SUPABASE INSERT ERROR:", error)
      return { data: null, error }
    }

    console.log("INCIDENT INSERTED:", data)

    // ✅ Send confirmation notification to user
    if (data && !incidentData.is_sos) {
      const { createNotification } = await import('./notificationService')
      
      await createNotification({
        userId: user.id,
        title: '✅ Report Submitted Successfully',
        message: `Your ${data.type} incident report has been received. Our team will review it shortly and take appropriate action.`,
        type: 'success',
        incidentId: data.id
      })
    } else if (data && incidentData.is_sos) {
      // SOS alerts already have their own notification flow
      const { createNotification } = await import('./notificationService')
      
      await createNotification({
        userId: user.id,
        title: '🚨 SOS Alert Sent',
        message: 'Your emergency SOS alert has been sent to all barangay officials. Help is on the way!',
        type: 'alert',
        incidentId: data.id
      })
    }

    return { data, error: null }

  } catch (err) {
    console.error("CREATE INCIDENT FAILED:", err)

    return {
      data: null,
      error: err,
    }
  }
}

export const updateIncident = async (id, updates) => {
  try {
    // First, get the current incident data to preserve fields like user_id and type
    const { data: currentData } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', id)
      .single()
    
    const { data, error } = await supabase
      .from('incidents')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
    
    // If error is about audit_logs column, ignore it and return success anyway
    if (error && error.message && error.message.includes('audit_logs')) {
      console.warn('⚠️ Audit log error (ignored):', error.message)
      // Still return the data with combined current data and updates
      return { data: { ...currentData, ...updates, id }, error: null }
    }
    
    return { data, error }
  } catch (err) {
    console.error('Error in updateIncident:', err)
    // If it's an audit log error, still return success
    if (err.message && err.message.includes('audit_logs')) {
      // Try to get current data again
      try {
        const { data: currentData } = await supabase
          .from('incidents')
          .select('*')
          .eq('id', id)
          .single()
        return { data: { ...currentData, ...updates, id }, error: null }
      } catch {
        return { data: { id, ...updates }, error: null }
      }
    }
    return { data: null, error: err }
  }
}

export const deleteIncident = async (id) => {
  try {
    // Delete all related data in the correct order
    console.log('🗑️ Starting incident deletion...')
    
    // Delete incident comments
    console.log('🗑️ Deleting incident comments...')
    const { error: commentsError } = await supabase
      .from('incident_comments')
      .delete()
      .eq('incident_id', id)
    
    if (commentsError) {
      console.warn('⚠️ Failed to delete comments:', commentsError)
    } else {
      console.log('✅ Comments deleted')
    }

    // Delete incident votes
    console.log('🗑️ Deleting incident votes...')
    const { error: votesError } = await supabase
      .from('incident_votes')
      .delete()
      .eq('incident_id', id)
    
    if (votesError) {
      console.warn('⚠️ Failed to delete votes:', votesError)
    } else {
      console.log('✅ Votes deleted')
    }

    // Delete all related audit logs (BEFORE trying to create new ones)
    console.log('🗑️ Deleting incident audit logs...')
    const { error: auditDeleteError } = await supabase
      .from('audit_logs')
      .delete()
      .eq('incident_id', id)
    
    if (auditDeleteError) {
      console.warn('⚠️ Failed to delete audit logs:', auditDeleteError)
    } else {
      console.log('✅ Audit logs deleted')
    }

    // Finally, delete the incident
    console.log('🗑️ Deleting incident...')
    const { error } = await supabase
      .from('incidents')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('❌ Failed to delete incident:', error)
    } else {
      console.log('✅ Incident deleted successfully')
    }
    
    return { error }
  } catch (err) {
    console.error('Error in deleteIncident:', err)
    return { error: err }
  }
}

export const updateIncidentStatus = async (id, status, responderId = null) => {
  const updates = { status }
  
  if (status === 'responding' && responderId) {
    updates.responder_id = responderId
    updates.responder_assigned_at = new Date().toISOString()
  } else if (status === 'resolved') {
    updates.resolved_at = new Date().toISOString()
  }

  const result = await updateIncident(id, updates)

  // ✅ Send notification to incident reporter about status change
  if (result.data && result.data.user_id) {
    const { createNotification } = await import('./notificationService')
    
    let title = ''
    let message = ''
    let type = 'update'

    if (status === 'responding') {
      title = '🚨 Responders On The Way!'
      message = `Your ${result.data.type} incident report is now being responded to. Help is on the way!`
      type = 'alert'
    } else if (status === 'resolved') {
      title = '✅ Incident Resolved'
      message = `Your ${result.data.type} incident report has been marked as resolved. Thank you for reporting!`
      type = 'success'
    } else if (status === 'pending') {
      title = '📋 Report Received'
      message = `Your ${result.data.type} incident report is pending review by our team.`
      type = 'info'
    }

    if (title && message) {
      await createNotification({
        userId: result.data.user_id,
        title,
        message,
        type,
        incidentId: id
      })
    }
  }

  return result
}

// Real-time subscriptions
export const subscribeToIncidents = (callback) => {
  // Use a unique channel name to avoid "cannot add callbacks after subscribe()" errors
  // when the component mounts multiple times (dev StrictMode / HMR)
  const channelName = `incidents-channel-${Date.now()}-${Math.random().toString(36).slice(2)}`
  return supabase
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, (payload) => {
      callback(payload)
    })
    .subscribe()
}

export const subscribeToIncident = (id, callback) => {
  return supabase
    .channel(`incident-${id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents', filter: `id=eq.${id}` }, (payload) => {
      callback(payload)
    })
    .subscribe()
}

// Analytics
export const getIncidentStats = async (timeRange = '7d') => {
  const now = new Date()
  let startDate = new Date()
  
  switch (timeRange) {
    case '1d':
      startDate.setDate(now.getDate() - 1)
      break
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
    .from('incidents')
    .select('type, status, purok, created_at')
    .gte('created_at', startDate.toISOString())
  
  if (error) return { data: null, error }

  // Calculate stats
  const stats = {
    total: data.length,
    byType: {},
    byStatus: {},
    byPurok: {},
    trend: [],
  }

  data.forEach(incident => {
    // By type
    stats.byType[incident.type] = (stats.byType[incident.type] || 0) + 1
    
    // By status
    stats.byStatus[incident.status] = (stats.byStatus[incident.status] || 0) + 1
    
    // By purok
    if (incident.purok) {
      stats.byPurok[incident.purok] = (stats.byPurok[incident.purok] || 0) + 1
    }
  })

  return { data: stats, error: null }
}

export const getHotspots = async () => {
  const { data, error } = await supabase
    .from('incidents')
    .select('purok, type, latitude, longitude, created_at')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) return { data: null, error }

  // Calculate hotspot density
  const hotspots = {}
  data.forEach(incident => {
    if (incident.purok) {
      if (!hotspots[incident.purok]) {
        hotspots[incident.purok] = { count: 0, types: {}, coordinates: [] }
      }
      hotspots[incident.purok].count++
      hotspots[incident.purok].types[incident.type] = (hotspots[incident.purok].types[incident.type] || 0) + 1
      if (incident.latitude && incident.longitude) {
        hotspots[incident.purok].coordinates.push({ lat: incident.latitude, lng: incident.longitude })
      }
    }
  })

  return { data: hotspots, error: null }
}

// Duplicate detection
export const checkDuplicateIncident = async (description, location, timeThresholdMinutes = 30) => {
  const threshold = new Date(Date.now() - timeThresholdMinutes * 60 * 1000).toISOString()
  
  const safeDesc = sanitizeSearch(description.substring(0, 50))
  const safeLoc  = sanitizeSearch(location)

  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .gte('created_at', threshold)
    .or(`description.ilike.%${safeDesc}%,location.ilike.%${safeLoc}%`)
    .limit(10)

  if (error) return { isDuplicate: false, error }
  
  // Simple similarity check
  const potentialDuplicates = data.filter(incident => {
    const descSimilarity = calculateSimilarity(description, incident.description)
    const locSimilarity = calculateSimilarity(location, incident.location)
    return descSimilarity > 0.7 || locSimilarity > 0.8
  })

  return { 
    isDuplicate: potentialDuplicates.length > 0, 
    duplicates: potentialDuplicates,
    error: null 
  }
}

// Normalise to lowercase, collapse whitespace — fixes case and whitespace
// sensitivity, and handles NULL descriptions (the || '' guards the crash).
const normalize = s => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()

const calculateSimilarity = (str1, str2) => {
  const a = normalize(str1)
  const b = normalize(str2)
  const longer  = a.length > b.length ? a : b
  const shorter = a.length > b.length ? b : a

  if (longer.length === 0) return 1.0

  return (longer.length - levenshteinDistance(longer, shorter)) / longer.length
}

const levenshteinDistance = (str1, str2) => {
  const matrix = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

// Community validation
export const voteIncident = async (incidentId, voteType) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('incident_votes')
    .upsert([{
      incident_id: incidentId,
      user_id: user.id,
      vote_type: voteType,
    }], { onConflict: 'incident_id,user_id' })
    .select()
    .single()

  return { data, error }
}

export const getIncidentVotes = async (incidentId) => {
  const { data, error } = await supabase
    .from('incident_votes')
    .select('*')
    .eq('incident_id', incidentId)

  return { data, error }
}

// Comments
export const addComment = async (incidentId, comment, isOfficial = false) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('incident_comments')
    .insert([{
      incident_id: incidentId,
      user_id: user.id,
      comment,
      is_official: isOfficial,
    }])
    .select(`
      *,
      profiles:profiles!incident_comments_user_id_fkey (full_name)
    `)
    .single()

  // ✅ Send notification to incident reporter if an official commented
  if (data && isOfficial) {
    // Get the incident to find the reporter
    const { data: incident } = await supabase
      .from('incidents')
      .select('user_id, type')
      .eq('id', incidentId)
      .single()

    if (incident && incident.user_id && incident.user_id !== user.id) {
      const { createNotification } = await import('./notificationService')
      
      await createNotification({
        userId: incident.user_id,
        title: '💬 New Update on Your Report',
        message: `An official has added a comment to your ${incident.type} incident report. Check it out!`,
        type: 'update',
        incidentId: incidentId
      })
    }
  }

  return { data, error }
}

export const getComments = async (incidentId) => {
  const { data, error } = await supabase
    .from('incident_comments')
    .select(`
      *,
      profiles:profiles!incident_comments_user_id_fkey (full_name)
    `)
    .eq('incident_id', incidentId)
    .order('created_at', { ascending: true })

  return { data, error }
}

// Notifications
export const getNotifications = async (userId) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  return { data, error }
}

export const markNotificationRead = async (notificationId) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ 
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('id', notificationId)
    .select()

  return { data, error }
}

export const subscribeToNotifications = (userId, callback) => {
  return supabase
    .channel(`notifications-${userId}`)
    .on('postgres_changes', { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    }, callback)
    .subscribe()
}

// Predictive Analytics
export const getPredictiveInsights = async () => {
  const { data: incidents, error } = await supabase
    .from('incidents')
    .select('purok, type, created_at')
    .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())

  if (error) return { data: null, error }

  const insights = {
    highRiskPuroks: [],
    peakHours: {},
    weeklyPatterns: {},
    predictions: [],
  }

  // Analyze by purok
  const purokCounts = {}
  incidents.forEach(inc => {
    if (inc.purok) {
      purokCounts[inc.purok] = (purokCounts[inc.purok] || 0) + 1
    }
  })

  const avgCount = incidents.length / Object.keys(purokCounts).length
  insights.highRiskPuroks = Object.entries(purokCounts)
    .filter(([, count]) => count > avgCount * 1.5)
    .map(([purok, count]) => ({ purok, count, risk: count > avgCount * 2 ? 'high' : 'medium' }))

  // Analyze by hour
  incidents.forEach(inc => {
    const hour = new Date(inc.created_at).getHours()
    insights.peakHours[hour] = (insights.peakHours[hour] || 0) + 1
  })

  // Analyze by day of week
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  incidents.forEach(inc => {
    const day = days[new Date(inc.created_at).getDay()]
    insights.weeklyPatterns[day] = (insights.weeklyPatterns[day] || 0) + 1
  })

  // Generate predictions
  const topPurok = insights.highRiskPuroks[0]
  const peakHour = Object.entries(insights.peakHours).sort((a, b) => b[1] - a[1])[0]
  const peakDay = Object.entries(insights.weeklyPatterns).sort((a, b) => b[1] - a[1])[0]

  if (topPurok && peakHour && peakDay) {
    insights.predictions.push({
      type: 'hotspot',
      message: `${topPurok.purok} has high incident activity, especially on ${peakDay[0]} around ${peakHour[0]}:00`,
      confidence: Math.min(0.9, topPurok.count / incidents.length + 0.5),
    })
  }

  return { data: insights, error: null }
}
