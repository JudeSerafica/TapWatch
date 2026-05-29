import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet'
import { TrendingUp, MapPin, AlertTriangle, Calendar, Filter } from 'lucide-react'
import AdminSidebar from '../components/AdminSidebar'
import AdminNavTabs from '../components/AdminNavTabs'
import AdminMobileBottomNav from '../components/AdminMobileBottomNav'
import TopBar from '../components/TopBar'
import IncidentIcon from '../components/IncidentIcon'
import { getIncidents } from '../lib/database'

const typeColors = {
  crime: '#9333ea',
  accident: '#f97316',
  fire: '#ef4444',
  flood: '#3b82f6',
  disturbance: '#eab308',
}

export default function HeatMapAnalytics() {
  const [incidents, setIncidents] = useState([])
  const [timeRange, setTimeRange] = useState('7d') // 7d, 30d, 90d, 1y
  const [selectedType, setSelectedType] = useState('all')
  const [hotspots, setHotspots] = useState([])
  const [patterns, setPatterns] = useState({})

  useEffect(() => {
    loadData()
  }, [timeRange, selectedType])

  const loadData = async () => {
    const { data } = await getIncidents()
    if (!data) return

    // Filter by time range
    const now = new Date()
    const filtered = data.filter(inc => {
      const incDate = new Date(inc.created_at)
      const daysDiff = (now - incDate) / (1000 * 60 * 60 * 24)
      
      switch (timeRange) {
        case '7d': return daysDiff <= 7
        case '30d': return daysDiff <= 30
        case '90d': return daysDiff <= 90
        case '1y': return daysDiff <= 365
        default: return true
      }
    })

    // Filter by type
    const typeFiltered = selectedType === 'all'
      ? filtered
      : filtered.filter(inc => inc.type === selectedType)

    setIncidents(typeFiltered)
    analyzeHotspots(typeFiltered)
    analyzePatterns(typeFiltered)
  }

  const analyzeHotspots = (data) => {
    // Group incidents by location (simplified - use clustering in production)
    const locationMap = {}
    
    data.forEach(inc => {
      if (!inc.latitude || !inc.longitude) return
      
      const key = `${inc.latitude.toFixed(3)},${inc.longitude.toFixed(3)}`
      if (!locationMap[key]) {
        locationMap[key] = {
          lat: inc.latitude,
          lng: inc.longitude,
          count: 0,
          types: {}
        }
      }
      locationMap[key].count++
      locationMap[key].types[inc.type] = (locationMap[key].types[inc.type] || 0) + 1
    })

    // Convert to array and sort by count
    const spots = Object.values(locationMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    setHotspots(spots)
  }

  const analyzePatterns = (data) => {
    // Time-based patterns
    const hourCounts = Array(24).fill(0)
    const dayCounts = Array(7).fill(0)
    const typeCounts = {}

    data.forEach(inc => {
      const date = new Date(inc.created_at)
      hourCounts[date.getHours()]++
      dayCounts[date.getDay()]++
      typeCounts[inc.type] = (typeCounts[inc.type] || 0) + 1
    })

    // Find peak hours
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts))
    const peakDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
      dayCounts.indexOf(Math.max(...dayCounts))
    ]

    setPatterns({
      peakHour: `${peakHour}:00 - ${peakHour + 1}:00`,
      peakDay,
      mostCommon: Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A',
      totalIncidents: data.length
    })
  }

  const getRiskLevel = (count) => {
    if (count >= 10) return { level: 'Critical', color: 'bg-red-600', textColor: 'text-red-600' }
    if (count >= 5) return { level: 'High', color: 'bg-orange-500', textColor: 'text-orange-500' }
    if (count >= 3) return { level: 'Medium', color: 'bg-yellow-500', textColor: 'text-yellow-500' }
    return { level: 'Low', color: 'bg-green-500', textColor: 'text-green-500' }
  }

  const getCircleRadius = (count) => {
    return Math.min(count * 50, 500) // Max 500m radius
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 md:ml-60 pb-16 md:pb-0">
        <TopBar title="Heat Map Analytics">
          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">
            Official
          </span>
        </TopBar>
        <AdminNavTabs />

        <main className="p-4 md:p-6 space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp size={24} className="text-blue-600" />
              Crime Heat Map & Analytics
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Visualize incident patterns and identify high-risk areas
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-600" />
                <span className="text-sm font-semibold text-gray-700">Filters:</span>
              </div>

              {/* Time Range */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="1y">Last Year</option>
              </select>

              {/* Incident Type */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="crime">Crime</option>
                <option value="fire">Fire</option>
                <option value="flood">Flood</option>
                <option value="accident">Accident</option>
                <option value="disturbance">Disturbance</option>
              </select>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <div className="text-2xl font-bold text-gray-900">
                {patterns.totalIncidents || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">Total Incidents</div>
            </div>

            <div className="bg-white rounded-xl border p-4">
              <div className="text-2xl font-bold text-orange-600">
                {hotspots.length}
              </div>
              <div className="text-xs text-gray-500 mt-1">Hotspots</div>
            </div>

            <div className="bg-white rounded-xl border p-4">
              <div className="text-lg font-bold text-gray-900">
                {patterns.peakHour || 'N/A'}
              </div>
              <div className="text-xs text-gray-500 mt-1">Peak Hour</div>
            </div>

            <div className="bg-white rounded-xl border p-4">
              <div className="text-lg font-bold text-gray-900 capitalize">
                {patterns.mostCommon || 'N/A'}
              </div>
              <div className="text-xs text-gray-500 mt-1">Most Common</div>
            </div>
          </div>

          {/* Map */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="h-96 md:h-[500px]">
              <MapContainer
                center={[14.835, 120.283]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {/* Heat circles */}
                {hotspots.map((spot, index) => {
                  const risk = getRiskLevel(spot.count)
                  const dominantType = Object.entries(spot.types).sort((a, b) => b[1] - a[1])[0]?.[0]
                  
                  return (
                    <Circle
                      key={index}
                      center={[spot.lat, spot.lng]}
                      radius={getCircleRadius(spot.count)}
                      pathOptions={{
                        color: typeColors[dominantType] || '#ef4444',
                        fillColor: typeColors[dominantType] || '#ef4444',
                        fillOpacity: 0.3,
                        weight: 2
                      }}
                    >
                      <Popup>
                        <div className="p-2">
                          <div className="font-bold text-sm mb-2">
                            Hotspot #{index + 1}
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-gray-600">Incidents:</span>
                              <span className="font-semibold">{spot.count}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-gray-600">Risk Level:</span>
                              <span className={`font-semibold ${risk.textColor}`}>
                                {risk.level}
                              </span>
                            </div>
                            <div className="mt-2 pt-2 border-t">
                              <div className="text-gray-600 mb-1">Types:</div>
                              {Object.entries(spot.types).map(([type, count]) => (
                                <div key={type} className="flex items-center justify-between">
                                  <span className="capitalize">{type}:</span>
                                  <span className="font-semibold">{count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Circle>
                  )
                })}
              </MapContainer>
            </div>
          </div>

          {/* Hotspots List */}
          <div className="bg-white rounded-xl border">
            <div className="px-5 py-4 border-b">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-600" />
                Top Hotspots
              </h3>
            </div>
            <div className="divide-y">
              {hotspots.slice(0, 5).map((spot, index) => {
                const risk = getRiskLevel(spot.count)
                const dominantType = Object.entries(spot.types).sort((a, b) => b[1] - a[1])[0]
                
                return (
                  <div key={index} className="px-5 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                          <span className="text-sm font-bold text-red-600">
                            #{index + 1}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-gray-900">
                            {spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                            <IncidentIcon type={dominantType[0]} size={12} />
                            <span className="capitalize">{dominantType[0]}</span>
                            <span>•</span>
                            <span>{spot.count} incidents</span>
                          </div>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${risk.color} text-white`}>
                        {risk.level} Risk
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Patterns Insights */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" />
              Pattern Insights
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Peak Time</div>
                <div className="text-lg font-bold text-gray-900">
                  {patterns.peakHour}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Most incidents occur during this hour
                </div>
              </div>
              <div className="bg-white rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Peak Day</div>
                <div className="text-lg font-bold text-gray-900">
                  {patterns.peakDay}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Highest incident day of the week
                </div>
              </div>
              <div className="bg-white rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Most Common</div>
                <div className="text-lg font-bold text-gray-900 capitalize">
                  {patterns.mostCommon}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Most frequently reported type
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      <AdminMobileBottomNav />
    </div>
  )
}
