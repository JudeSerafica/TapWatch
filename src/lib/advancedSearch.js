/**
 * Advanced Search System
 * Provides comprehensive search and filtering capabilities
 */

import { supabase } from './supabase'

/**
 * Advanced search for incidents
 */
export const advancedSearchIncidents = async (filters = {}) => {
  try {
    let query = supabase
      .from('incidents')
      .select(`
        *,
        reporter:profiles!incidents_user_id_fkey (
          full_name,
          phone,
          purok
        ),
        responder:profiles!incidents_responder_id_fkey (
          full_name
        ),
        evidence:incident_evidence (
          id,
          file_url,
          media_type
        ),
        comments:incident_comments (
          count
        )
      `)

    // Text search (description, location, reporter name)
    if (filters.search) {
      query = query.or(
        `description.ilike.%${filters.search}%,` +
        `location.ilike.%${filters.search}%`
      )
    }

    // Multiple incident types
    if (filters.types && filters.types.length > 0) {
      query = query.in('type', filters.types)
    }

    // Multiple statuses
    if (filters.statuses && filters.statuses.length > 0) {
      query = query.in('status', filters.statuses)
    }

    // Purok filter
    if (filters.purok) {
      query = query.eq('purok', filters.purok)
    }

    // Date range
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate)
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate)
    }

    // Urgency level
    if (filters.urgencyLevel) {
      query = query.eq('urgency_level', filters.urgencyLevel)
    }

    // AI confidence threshold
    if (filters.minConfidence) {
      query = query.gte('ai_confidence', filters.minConfidence)
    }

    // Has evidence
    if (filters.hasEvidence) {
      query = query.not('media_url', 'is', null)
    }

    // Has location
    if (filters.hasLocation) {
      query = query.not('latitude', 'is', null)
    }

    // SOS incidents only
    if (filters.sosOnly) {
      query = query.eq('is_sos', true)
    }

    // Assigned to specific responder
    if (filters.responderId) {
      query = query.eq('responder_id', filters.responderId)
    }

    // Reported by specific user
    if (filters.reporterId) {
      query = query.eq('user_id', filters.reporterId)
    }

    // Geographic bounds (within bounding box)
    if (filters.bounds) {
      const { north, south, east, west } = filters.bounds
      query = query
        .gte('latitude', south)
        .lte('latitude', north)
        .gte('longitude', west)
        .lte('longitude', east)
    }

    // Sorting
    const sortBy = filters.sortBy || 'created_at'
    const sortOrder = filters.sortOrder || 'desc'
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Pagination
    const page = filters.page || 1
    const limit = filters.limit || 20
    const start = (page - 1) * limit
    const end = start + limit - 1

    query = query.range(start, end)

    const { data, error, count } = await query

    if (error) throw error

    return {
      success: true,
      incidents: data || [],
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    }
  } catch (error) {
    console.error('Advanced search error:', error)
    return {
      success: false,
      error: error.message,
      incidents: []
    }
  }
}

/**
 * Search with autocomplete suggestions
 */
export const getSearchSuggestions = async (query, limit = 5) => {
  try {
    if (!query || query.length < 2) {
      return { suggestions: [] }
    }

    // Search locations
    const { data: locations } = await supabase
      .from('incidents')
      .select('location')
      .ilike('location', `%${query}%`)
      .limit(limit)

    // Search descriptions (keywords)
    const { data: descriptions } = await supabase
      .from('incidents')
      .select('description')
      .ilike('description', `%${query}%`)
      .limit(limit)

    // Extract unique suggestions
    const locationSuggestions = [...new Set(locations?.map(l => l.location) || [])]
    const descriptionKeywords = descriptions
      ?.flatMap(d => 
        d.description.toLowerCase().split(' ')
          .filter(word => word.includes(query.toLowerCase()) && word.length > 3)
      )
      .slice(0, limit) || []

    const suggestions = [
      ...locationSuggestions.map(s => ({ type: 'location', value: s })),
      ...descriptionKeywords.map(s => ({ type: 'keyword', value: s }))
    ]

    return {
      success: true,
      suggestions: suggestions.slice(0, limit)
    }
  } catch (error) {
    console.error('Suggestions error:', error)
    return {
      success: false,
      suggestions: []
    }
  }
}

/**
 * Search by proximity (near a coordinate)
 */
export const searchNearby = async (latitude, longitude, radiusKm = 1, filters = {}) => {
  try {
    // Use PostGIS for proper geospatial search
    // For now, simple bounding box approach
    const latDelta = radiusKm / 111 // 1 degree ≈ 111km
    const lngDelta = radiusKm / (111 * Math.cos(latitude * Math.PI / 180))

    const bounds = {
      north: latitude + latDelta,
      south: latitude - latDelta,
      east: longitude + lngDelta,
      west: longitude - lngDelta
    }

    return await advancedSearchIncidents({
      ...filters,
      bounds
    })
  } catch (error) {
    console.error('Nearby search error:', error)
    return {
      success: false,
      error: error.message,
      incidents: []
    }
  }
}

/**
 * Get popular search terms
 */
export const getPopularSearches = async (limit = 10) => {
  try {
    // Get most common incident types and locations
    const { data: incidents } = await supabase
      .from('incidents')
      .select('type, location')
      .order('created_at', { ascending: false })
      .limit(100)

    if (!incidents) return { searches: [] }

    // Count occurrences
    const typeCounts = {}
    const locationCounts = {}

    incidents.forEach(inc => {
      typeCounts[inc.type] = (typeCounts[inc.type] || 0) + 1
      if (inc.location) {
        locationCounts[inc.location] = (locationCounts[inc.location] || 0) + 1
      }
    })

    // Sort and combine
    const topTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([term, count]) => ({ term, count, type: 'incident_type' }))

    const topLocations = Object.entries(locationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([term, count]) => ({ term, count, type: 'location' }))

    return {
      success: true,
      searches: [...topTypes, ...topLocations].slice(0, limit)
    }
  } catch (error) {
    console.error('Popular searches error:', error)
    return {
      success: false,
      searches: []
    }
  }
}

/**
 * Save search for history
 */
export const saveSearch = async (userId, searchQuery, filters) => {
  try {
    const { data, error } = await supabase
      .from('search_history')
      .insert([{
        user_id: userId,
        search_query: searchQuery,
        filters: JSON.stringify(filters),
        created_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Save search error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get user's search history
 */
export const getSearchHistory = async (userId, limit = 10) => {
  try {
    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return {
      success: true,
      history: data || []
    }
  } catch (error) {
    console.error('Get search history error:', error)
    return {
      success: false,
      history: []
    }
  }
}

/**
 * Export search results to CSV
 */
export const exportSearchResults = async (filters) => {
  try {
    const { incidents } = await advancedSearchIncidents({
      ...filters,
      limit: 1000 // Max export
    })

    // Generate CSV
    const headers = [
      'ID',
      'Type',
      'Description',
      'Location',
      'Status',
      'Reporter',
      'Created At',
      'Urgency'
    ]

    const rows = incidents.map(inc => [
      inc.id,
      inc.type,
      inc.description,
      inc.location || '-',
      inc.status,
      inc.reporter?.full_name || 'Anonymous',
      new Date(inc.created_at).toLocaleString(),
      inc.urgency_level || 'medium'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    return {
      success: true,
      csv: csvContent,
      count: incidents.length
    }
  } catch (error) {
    console.error('Export error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Get filter options (for UI dropdowns)
 */
export const getFilterOptions = async () => {
  try {
    // Get unique puroks
    const { data: puroks } = await supabase
      .from('incidents')
      .select('purok')
      .not('purok', 'is', null)

    // Get unique incident types
    const incidentTypes = ['crime', 'fire', 'flood', 'accident', 'disturbance']

    // Get unique statuses
    const statuses = ['pending', 'responding', 'resolved', 'cancelled']

    // Get urgency levels
    const urgencyLevels = ['low', 'medium', 'high', 'critical']

    return {
      success: true,
      options: {
        puroks: [...new Set(puroks?.map(p => p.purok))],
        incidentTypes,
        statuses,
        urgencyLevels
      }
    }
  } catch (error) {
    console.error('Get filter options error:', error)
    return {
      success: false,
      options: {}
    }
  }
}
