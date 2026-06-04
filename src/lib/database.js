import { supabase } from './supabase'

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
    query = query.or(`description.ilike.%${filters.search}%,location.ilike.%${filters.search}%`)
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
  const { data, error } = await supabase
    .from('incidents')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  
  return { data, error }
}

export const deleteIncident = async (id) => {
  const { error } = await supabase
    .from('incidents')
    .delete()
    .eq('id', id)
  
  return { error }
}

export const updateIncidentStatus = async (id, status, responderId = null) => {
  const updates = { status }
  
  if (status === 'responding' && responderId) {
    updates.responder_id = responderId
    updates.responder_assigned_at = new Date().toISOString()
  } else if (status === 'resolved') {
    updates.resolved_at = new Date().toISOString()
  }

  return updateIncident(id, updates)
}

// Real-time subscriptions
export const subscribeToIncidents = (callback) => {
  return supabase
    .channel('incidents-channel')
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
  
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .gte('created_at', threshold)
    .or(`description.ilike.%${description.substring(0, 50)}%,location.ilike.%${location}%`)
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

const calculateSimilarity = (str1, str2) => {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  const editDistance = levenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
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
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  return { error }
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
