import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '../lib/supabase'
import { notifyAllAdmins } from '../lib/notificationService'
import { useNavigate } from 'react-router-dom'
import { eastTapinacGeoJSON } from '../data/EastTapinac'
import { playSOSAlarm } from '../lib/alarmService'

// Color mapping for incident types
const typeColors = {
  crime: '#9333ea',
  accident: '#f97316',
  fire: '#ef4444',
  flood: '#3b82f6',
  disturbance: '#eab308',
}

// Create colored marker icon
function createSOSIcon() {
  const color = typeColors['crime']
  const size = 36
  const height = 45

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width:${size}px;
        height:${height}px;
        display:flex;
        align-items:center;
        justify-content:center;
        animation: pulse 2s infinite;
      ">
        <svg width="${size}" height="${height}" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C7.58 0 4 3.58 4 8C4 14 12 24 12 24C12 24 20 14 20 8C20 3.58 16.42 0 12 0Z" fill="${color}" stroke="white" stroke-width="1.5"/>
          <circle cx="12" cy="8" r="3" fill="white"/>
        </svg>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      </style>
    `,
    iconSize: [size, height],
    iconAnchor: [size / 2, height],
    popupAnchor: [0, -height],
  })
}

// Map Bounds Handler Component for displaying GeoJSON boundaries
function MapBoundsHandler() {
  const map = useMap()
  const geoJsonRef = useRef(null)

  useEffect(() => {
    if (!map || !geoJsonRef.current) return

    const layer = geoJsonRef.current

    let bounds = null

    if (layer.getLayers) {
      layer.getLayers().forEach((geoLayer) => {
        const layerBounds = geoLayer.getBounds()

        if (bounds) {
          bounds.extend(layerBounds)
        } else {
          bounds = layerBounds
        }
      })
    }

    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [20, 20],
      })
    }
  }, [map])

  return (
    <GeoJSON
      ref={geoJsonRef}
      data={eastTapinacGeoJSON}
      style={{
        color: '#1d4ed8',
        weight: 5,
        opacity: 0.7,
        fillColor: '#3b82f6',
        fillOpacity: 0.08,
      }}
    />
  )
}

// Fly to SOS location component
function FlyToLocationModal({ location }) {
  const map = useMap()

  useEffect(() => {
    if (location && location.latitude && location.longitude) {
      map.flyTo([location.latitude, location.longitude], 18, {
        duration: 1.2,
      })
    }
  }, [location, map])

  return null
}

export default function SOSPanicModal({ isOpen, onClose, profile }) {
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(5)
  const [isActivated, setIsActivated] = useState(false)
  const [location, setLocation] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [isRequestingPermission, setIsRequestingPermission] = useState(false)
  const [locationWarning, setLocationWarning] = useState(null)
  const [isSatellite, setIsSatellite] = useState(true)
  const [sosError, setSosError] = useState('')

  // Get location with proper permission handling
  const requestLocationPermission = () => {
    console.log('🔴 USER CLICKED ACTIVATE SOS - REQUESTING LOCATION')
    setIsRequestingPermission(true)
    
    if (!navigator.geolocation) {
      console.error('❌ CRITICAL: Geolocation API not available on this device')
      setIsRequestingPermission(false)
      setIsActivated(true)
      return
    }

    console.log('📍 Calling navigator.geolocation.getCurrentPosition()...')
    console.log('   This should trigger a permission dialog on the device')

    // Detect device type for appropriate timeout
    const userAgent = navigator.userAgent.toLowerCase()
    const isMobile = /android|webos|iphone|ipad|ipot|blackberry|iemobile|opera mini/i.test(userAgent)
    const timeoutDuration = isMobile ? 120000 : 60000  // Extended timeout: 120s for mobile, 60s for desktop to allow GPS lock
    
    console.log(`📱 Device type: ${isMobile ? 'MOBILE' : 'DESKTOP'} - Timeout: ${timeoutDuration}ms`)
    console.log('🎯 HIGH ACCURACY MODE ENABLED - Waiting for GPS lock...')

    // Timeout for location request
    const timeoutId = setTimeout(() => {
      console.warn(`⚠️ Location request timed out after ${timeoutDuration/1000} seconds`)
      setIsRequestingPermission(false)
      setIsActivated(true)
    }, timeoutDuration)

    // This will trigger the browser's/device's NATIVE permission dialog
    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId)
        // SUCCESS - User allowed location
        console.log('✅✅✅ LOCATION PERMISSION GRANTED AND CAPTURED ✅✅✅')
        console.log('Position object:', position)
        
        let lat = position.coords.latitude
        let lng = position.coords.longitude
        const accuracy = position.coords.accuracy
        const altitude = position.coords.altitude
        const altitudeAccuracy = position.coords.altitudeAccuracy
        const heading = position.coords.heading
        const speed = position.coords.speed
        
        console.log(`📊 FULL POSITION DATA:`)
        console.log(`    Latitude:  ${lat}`)
        console.log(`    Longitude: ${lng}`)
        console.log(`    Accuracy:  ${accuracy}m`)
        console.log(`    Altitude:  ${altitude}m`)
        console.log(`    Heading:   ${heading}°`)
        console.log(`    Speed:     ${speed}m/s`)
        
        // 🎯 CRITICAL VALIDATION: Check if coordinates are swapped
        // East Tapinac, Imus, Cavite coordinates should be around:
        // Latitude: 14.83-14.84 (should be in 14-15 range for Philippines)
        // Longitude: 120.28-120.29 (should be in 120-121 range for Cavite)
        if (lat > 100 && lng < 50) {
          console.warn('⚠️⚠️⚠️ COORDINATE SWAP DETECTED! Swapping lat/lng...')
          const temp = lat
          lat = lng
          lng = temp
          console.log(`    CORRECTED Latitude:  ${lat}`)
          console.log(`    CORRECTED Longitude: ${lng}`)
        }
        
        // VALIDATION: Check if coordinates are within valid ranges
        const isValidCoordinate = (lat, lng) => {
          return (
            typeof lat === 'number' && typeof lng === 'number' &&
            !isNaN(lat) && !isNaN(lng) &&
            lat >= -90 && lat <= 90 &&  // Valid latitude range
            lng >= -180 && lng <= 180    // Valid longitude range
          )
        }
        
        if (!isValidCoordinate(lat, lng)) {
          console.error('❌ INVALID COORDINATES RECEIVED')
          console.error(`    Latitude:  ${lat} (type: ${typeof lat})`)
          console.error(`    Longitude: ${lng} (type: ${typeof lng})`)
          setIsRequestingPermission(false)
          setIsActivated(true)
          return
        }
        
        // Ensure coordinates are numbers with proper precision (8 decimal places = ~1.1mm accuracy)
        lat = parseFloat(lat.toFixed(8))
        lng = parseFloat(lng.toFixed(8))
        
        console.log(`📍📍 COORDINATES VALIDATED AND FORMATTED:`)
        console.log(`    Latitude:  ${lat}`)
        console.log(`    Longitude: ${lng}`)
        console.log(`    Accuracy:  ±${Math.round(accuracy)}m margin of error`)
        
        // 🎯 AREA VALIDATION: Check if location is near East Tapinac, Imus, Cavite
        const expectedLat = 14.835   // East Tapinac center
        const expectedLng = 120.283  // East Tapinac center
        const distanceLat = Math.abs(lat - expectedLat)
        const distanceLng = Math.abs(lng - expectedLng)
        
        // Assess accuracy quality and area validation
        if (accuracy > 100) {
          console.warn(`⚠️ WARNING: Location accuracy is moderate (±${Math.round(accuracy)}m)`)
        } else if (accuracy <= 20) {
          console.log(`✅ EXCELLENT: High precision GPS location (±${Math.round(accuracy)}m)`)
        } else if (accuracy <= 50) {
          console.log(`✅ GOOD: Good GPS accuracy (±${Math.round(accuracy)}m)`)
        }
        
        // If more than 10km away (~0.1 degrees), warn user
        if (distanceLat > 0.1 || distanceLng > 0.1) {
          console.warn(`⚠️⚠️⚠️ WARNING: Location seems FAR from East Tapinac, Imus, Cavite!`)
          console.warn(`    Expected: Lat ~14.835, Lng ~120.283`)
          console.warn(`    Received: Lat ${lat}, Lng ${lng}`)
          console.warn(`    Distance: ${(distanceLat * 111).toFixed(2)}km N/S, ${(distanceLng * 111).toFixed(2)}km E/W`)
          console.warn(`    This may be correct if you're testing outside the barangay`)
          setLocationWarning(`Location is ${(Math.max(distanceLat, distanceLng) * 111).toFixed(1)}km from East Tapinac`)
        } else {
          console.log(`✅ LOCATION VALIDATED: Within East Tapinac area`)
          console.log(`    Distance from center: ${(distanceLat * 111 * 1000).toFixed(0)}m N/S, ${(distanceLng * 111 * 1000).toFixed(0)}m E/W`)
          setLocationWarning(null)
        }
        
        setLocation({
          latitude: lat,
          longitude: lng,
          accuracy: accuracy,
          altitude: altitude,
          timestamp: new Date().toISOString()
        })
        
        setIsRequestingPermission(false)
        setIsActivated(true)
      },
      (error) => {
        clearTimeout(timeoutId)
        // ERROR - Location failed
        console.error('❌ GEOLOCATION ERROR')
        console.error('Error Code:', error.code)
        console.error('Error Message:', error.message)
        
        const errorMsg = (() => {
          switch(error.code) {
            case 1:
              return 'PERMISSION_DENIED - User clicked "Deny" OR location is turned OFF'
            case 2:
              return 'POSITION_UNAVAILABLE - Location services not available'
            case 3:
              return 'TIMEOUT - Location request took too long'
            default:
              return `UNKNOWN_ERROR (code: ${error.code})`
          }
        })()
        
        console.error(`Details: ${errorMsg}`)
        console.log('⚠️ NO FALLBACK - Location unavailable because user has location disabled or denied permission')
        
        // DO NOT use fallback - just proceed without location
        setIsRequestingPermission(false)
        setIsActivated(true)
      },
      { 
        enableHighAccuracy: true,     // Request high accuracy GPS (will use more battery on mobile)
        timeout: timeoutDuration,     // Wait for specified timeout to get GPS lock
        maximumAge: 0                 // CRITICAL: Don't use cached location - always get fresh data
      }
    )
  }

  useEffect(() => {
    if (isActivated && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (isActivated && countdown === 0) {
      sendSOSAlert()
    }
  }, [isActivated, countdown])

  const sendSOSAlert = async () => {
    console.log('🚨 SENDING SOS ALERT...')
    console.log('Current location state:', location)
    console.log('Current profile state:', profile)
    
    try {
      if (!profile?.id) {
        console.error('❌ No user profile found')
        setSosError('You must be logged in to send an SOS alert.')
        setIsActivated(false)
        setCountdown(5)
        return
      }

      // Fetch the latest profile data to ensure we have the phone number
      const { data: latestProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile.id)
        .single()

      if (profileError) {
        console.error('❌ Could not fetch latest profile:', profileError)
      } else if (latestProfile) {
        console.log('✅ Latest profile fetched:', latestProfile)
      }

      // Use latest profile if available, otherwise fall back to passed profile
      const profileToUse = latestProfile || profile

      // Validate coordinates if they exist
      let validLat = null
      let validLng = null
      let locationString = 'Location unavailable'
      
      if (location?.latitude && location?.longitude) {
        // Extra validation before saving
        validLat = Number(location.latitude)
        validLng = Number(location.longitude)
        
        const isValidCoord = (lat, lng) => {
          return (
            !isNaN(lat) && !isNaN(lng) &&
            lat >= -90 && lat <= 90 &&
            lng >= -180 && lng <= 180
          )
        }
        
        if (isValidCoord(validLat, validLng)) {
          // Use 8 decimal places for maximum precision (~1.1mm accuracy)
          validLat = parseFloat(validLat.toFixed(8))
          validLng = parseFloat(validLng.toFixed(8))
          locationString = `Lat: ${validLat.toFixed(8)}, Lng: ${validLng.toFixed(8)}`
          console.log('✅ Location coordinates validated successfully')
          console.log(`📍 FINAL COORDINATES TO SAVE: Lat=${validLat}, Lng=${validLng}`)
        } else {
          console.error('❌ Invalid coordinates detected, clearing location data')
          validLat = null
          validLng = null
        }
      }

      const sosIncident = {
        type: 'crime',
        description: `from ${profileToUse?.full_name || 'User'}. Immediate assistance needed!`,
        location: locationString,
        latitude: validLat,
        longitude: validLng,
        status: 'pending',
        user_id: profileToUse?.id,
        reporter_name: profileToUse?.full_name,
        reporter_contact: profileToUse?.phone || null,
        created_at: new Date().toISOString(),
        is_sos: true
      }

      console.log('📤 SOS Incident object:', sosIncident)
      console.log(`📍 Location values - Latitude: ${sosIncident.latitude}, Longitude: ${sosIncident.longitude}`)
      console.log(`📱 Contact: ${sosIncident.reporter_contact}`)
      if (location?.accuracy) {
        console.log(`📡 Location Accuracy: ${Math.round(location.accuracy)}m`)
      }

      const { data, error } = await supabase
        .from('incidents')
        .insert([sosIncident])
        .select()
        .single()

      if (error) {
        console.error('❌ Database error:', error)
        setSosError('Unable to send SOS alert. Please call 911 directly for immediate help!')
        setIsActivated(false)
        setCountdown(5)
        return
      }

      console.log('✅ SOS Alert saved successfully:', data)
      
      // 🔊 Play SOS alarm sound
      playSOSAlarm()
      
      // Notify all admins about SOS alert
      await notifyAllAdmins({
        title: '🚨 EMERGENCY SOS ALERT',
        message: `Emergency SOS from ${profileToUse?.full_name || 'User'} (${profileToUse?.phone || 'No contact'}) at ${validLat && validLng ? `Lat: ${validLat.toFixed(4)}, Lng: ${validLng.toFixed(4)}` : 'Unknown location'}. IMMEDIATE ATTENTION REQUIRED!`,
        type: 'alert',
        incidentId: data.id
      })
      
      setIsActivated(false)
      setShowSuccess(true)
    } catch (err) {
      console.error('❌ Unexpected error:', err)
      setSosError('Unable to send SOS alert. Please try again or call 911 directly.')
      setIsActivated(false)
      setCountdown(5)
    }
  }

  const handleActivate = () => {
    // ✅ CHECK VERIFICATION STATUS FIRST
    if (!profile?.verification_status || profile.verification_status === 'unverified') {
      setShowVerificationModal(true)
      return
    }

    console.log('🔴 ACTIVATE SOS button clicked - requesting location permission...')
    // Request location permission from device when user activates SOS
    // The permission dialog will appear on the user's device
    requestLocationPermission()
  }

  const handleCancel = () => {
    setIsActivated(false)
    setCountdown(5)
    onClose()
  }

  const handleCloseSuccess = () => {
    setShowSuccess(false)
    setCountdown(5)
    onClose()
  }

  if (!isOpen) return null

  // ── VERIFICATION MODAL ──
  if (showVerificationModal) {
    return (
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-md" 
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sos-verify-title"
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="bg-amber-50 p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
              <span className="text-4xl" aria-hidden="true">⚠️</span>
            </div>
            <h2 id="sos-verify-title" className="text-xl font-bold text-gray-900 mb-3">
              Verification Required
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              You need to verify your account before sending an SOS alert. This helps us ensure the safety of all residents.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowVerificationModal(false)
                  onClose()
                  navigate('/verification')
                }}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold transition"
              >
                <span style={{ fontSize: 18 }}>🛡️</span>
                  Get Verified Now
              </button>
              <button
                onClick={() => {
                  setShowVerificationModal(false)
                  onClose()
                }}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── SUCCESS MODAL ──
  if (showSuccess) {
    return (
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-md" 
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sos-success-title"
      >
        <style>{`
          @keyframes sos-fadeInScale {
            0% { opacity: 0; transform: scale(0.85); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes sos-ripple {
            0% { transform: scale(0.8); opacity: 1; }
            100% { transform: scale(2.6); opacity: 0; }
          }
          @keyframes sos-checkDraw {
            0% { stroke-dashoffset: 100; }
            100% { stroke-dashoffset: 0; }
          }
          @keyframes sos-fadeInUp {
            0% { opacity: 0; transform: translateY(18px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes sos-slideIn {
            0% { opacity: 0; transform: translateX(-14px); }
            100% { opacity: 1; transform: translateX(0); }
          }
          .sos-wrap { animation: sos-fadeInScale 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
          .sos-r1 { animation: sos-ripple 1.8s ease-out infinite; }
          .sos-r2 { animation: sos-ripple 1.8s ease-out 0.6s infinite; }
          .sos-r3 { animation: sos-ripple 1.8s ease-out 1.2s infinite; }
          .sos-check { stroke-dasharray: 100; stroke-dashoffset: 100; animation: sos-checkDraw 0.55s ease forwards 0.45s; }
          .sos-t1 { animation: sos-fadeInUp 0.45s ease forwards 0.75s; opacity: 0; }
          .sos-t2 { animation: sos-fadeInUp 0.45s ease forwards 0.95s; opacity: 0; }
          .sos-i1 { animation: sos-slideIn 0.4s ease forwards 1.05s; opacity: 0; }
          .sos-i2 { animation: sos-slideIn 0.4s ease forwards 1.2s; opacity: 0; }
          .sos-i3 { animation: sos-slideIn 0.4s ease forwards 1.35s; opacity: 0; }
          .sos-f1 { animation: sos-fadeInUp 0.4s ease forwards 1.55s; opacity: 0; }
          .sos-f2 { animation: sos-fadeInUp 0.4s ease forwards 1.75s; opacity: 0; }
          .sos-m1 { animation: sos-fadeInUp 0.4s ease forwards 1.95s; opacity: 0; }
        `}</style>

        <div className="sos-wrap bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[85vh] flex flex-col">
          {/* TOP — red section with ripple + checkmark */}
          <div className="bg-red-600 pt-10 pb-8 px-8 text-center relative shrink-0">
            <div className="relative w-32 h-32 mx-auto mb-5">
              <div className="sos-r1 absolute inset-0 rounded-full border-2 border-white/50" />
              <div className="sos-r2 absolute inset-0 rounded-full border-2 border-white/35" />
              <div className="sos-r3 absolute inset-0 rounded-full border-2 border-white/20" />
              <div className="absolute inset-3 bg-white/20 rounded-full flex items-center justify-center">
                <svg width="54" height="54" viewBox="0 0 54 54" fill="none">
                  <path
                    className="sos-check"
                    d="M11 28L22 39L43 17"
                    stroke="white"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            <h2 className="sos-t1 text-white text-2xl font-bold mb-1" id="sos-success-title">SOS Alert Sent!</h2>
            <p className="sos-t2 text-white/80 text-sm">Emergency services have been notified</p>
          </div>

          {/* SCROLLABLE BOTTOM — map + checklist + footer */}
          <div className="overflow-y-auto flex-1">
            <div className="px-4 sm:px-6 pt-5 pb-6 space-y-4">
              {/* MAP DISPLAY */}
              {location?.latitude && location?.longitude && (
                <div className="sos-m1 relative rounded-xl border border-red-200 overflow-hidden bg-gray-100" style={{ height: 'min(256px, 40vh)' }}>
                  <MapContainer
                    center={[location.latitude, location.longitude]}
                    zoom={15}
                    scrollWheelZoom={true}
                    dragging={true}
                    className="h-full w-full"
                    style={{ zIndex: 1 }}
                  >
                    {isSatellite ? (
                      <TileLayer
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        attribution="Tiles &copy; Esri"
                        maxZoom={19}
                      />
                    ) : (
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    )}
                    <MapBoundsHandler />
                    <FlyToLocationModal location={location} />
                    <Marker
                      position={[location.latitude, location.longitude]}
                      icon={createSOSIcon()}
                    >
                      <Popup>
                        <div className="space-y-1">
                          <p className="font-semibold text-sm">🚨 SOS Alert Location</p>
                          <p className="text-xs text-gray-600 font-mono">Lat: {location.latitude.toFixed(8)}</p>
                          <p className="text-xs text-gray-600 font-mono">Lng: {location.longitude.toFixed(8)}</p>
                          {location?.accuracy && (
                            <p className="text-xs text-gray-600 bg-green-50 px-2 py-1 rounded mt-1">
                              GPS Accuracy: ±{Math.round(location.accuracy)}m
                            </p>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  </MapContainer>

                  {/* Satellite/Street Toggle */}
                  <div style={{
                    position: 'absolute', top: 8, right: 8, zIndex: 1000,
                    display: 'flex', borderRadius: 8, overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.3)'
                  }}>
                    <button
                      onClick={() => setIsSatellite(false)}
                      style={{
                        padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        border: 'none', transition: 'all 0.2s',
                        background: !isSatellite ? '#2563eb' : 'rgba(255,255,255,0.9)',
                        color: !isSatellite ? '#fff' : '#374151',
                      }}
                    >Street</button>
                    <button
                      onClick={() => setIsSatellite(true)}
                      style={{
                        padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        border: 'none', transition: 'all 0.2s',
                        background: isSatellite ? '#2563eb' : 'rgba(255,255,255,0.9)',
                        color: isSatellite ? '#fff' : '#374151',
                      }}
                    >Satellite</button>
                  </div>
                  
                  {/* Coordinates Badge */}
                  <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-red-200 shadow-lg">
                    <div className="text-[9px] sm:text-[10px] font-mono text-red-700 space-y-0.5">
                      <div className="font-semibold text-[10px] sm:text-[11px] text-center mb-0.5">GPS Coordinates</div>
                      <div>Lat: {location.latitude.toFixed(8)}</div>
                      <div>Lng: {location.longitude.toFixed(8)}</div>
                      {location?.accuracy && (
                        <div className="text-[8px] text-gray-600 mt-1 text-center">
                          ±{Math.round(location.accuracy)}m accuracy
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-red-50 rounded-xl p-3 sm:p-4 space-y-2 sm:space-y-2.5">
                <div className="sos-i1 flex items-center gap-2 sm:gap-3 text-gray-800 text-xs sm:text-sm">
                  <span className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-white text-[11px] flex-shrink-0">✓</span>
                  <span>Barangay officials notified</span>
                </div>
                <div className="sos-i2 flex items-center gap-2 sm:gap-3 text-gray-800 text-xs sm:text-sm">
                  <span className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-white text-[11px] flex-shrink-0">✓</span>
                  <span>Your location has been shared</span>
                </div>
                <div className="sos-i3 flex items-center gap-2 sm:gap-3 text-gray-800 text-xs sm:text-sm">
                  <span className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-white text-[11px] flex-shrink-0">✓</span>
                  <span>Emergency services alerted</span>
                </div>
              </div>

              <p className="sos-f1 text-gray-600 text-xs text-center leading-relaxed">
                Help is on the way! Stay safe and stay on the line if possible.
              </p>
            </div>
          </div>

          {/* FOOTER */}
          <div className="border-t border-red-100 bg-white p-3 sm:p-4 shrink-0">
            <button
              onClick={handleCloseSuccess}
              className="sos-f2 w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-base transition"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── ORIGINAL MODAL (activation + countdown) ──
  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-md" 
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sos-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {!isActivated ? (
          <>
            <div className="p-6 sm:p-8 text-center">
              <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-4 sm:mb-6 bg-red-600 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-4xl sm:text-6xl" aria-hidden="true">🚨</span>
              </div>
              <h2 id="sos-title" className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
                Emergency SOS
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-4">
                This will immediately alert emergency services and share your location.
                Use only in life-threatening situations.
              </p>

              {/* Location Info Preview */}
              <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-900 font-semibold mb-1">📍 Your Location Will Be Shared</p>
                <p className="text-[10px] text-blue-700">
                  GPS will capture your exact coordinates and send them to barangay officials for immediate response.
                </p>
              </div>

              {/* SOS send error — shown instead of alert() */}
              {sosError && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="mb-4 p-3 bg-red-50 border border-red-300 rounded-lg text-red-800 text-xs font-medium"
                >
                  🚨 {sosError}
                </div>
              )}

              <div className="space-y-2.5 sm:space-y-3">
                <button
                  onClick={handleActivate}
                  className="w-full py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition bg-red-600 hover:bg-red-700 text-white active:scale-95"
                >
                  ACTIVATE SOS
                </button>
                <button
                  onClick={handleCancel}
                  className="w-full py-2.5 sm:py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="p-6 sm:p-8 text-center bg-red-600 text-white">
              <div className="w-32 h-32 sm:w-40 sm:h-40 mx-auto mb-4 sm:mb-6 bg-white rounded-full flex items-center justify-center">
                <span className="text-5xl sm:text-7xl font-bold text-red-600 animate-pulse">
                  {countdown}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">
                Sending SOS Alert...
              </h2>
              <p className="text-xs sm:text-sm opacity-90 mb-2">
                Emergency services will be notified in {countdown} {countdown === 1 ? 'second' : 'seconds'}
              </p>
              {isRequestingPermission && (
                <div className="mb-3 space-y-1">
                  <p className="text-xs opacity-75 animate-pulse">
                    📍 Acquiring GPS location...
                  </p>
                  <p className="text-[10px] opacity-60">
                    Waiting for accurate GPS lock
                  </p>
                </div>
              )}
              {location && (
                <div className="mb-4 space-y-1">
                  <p className="text-xs text-green-200 flex items-center justify-center gap-1">
                    <span>✓</span>
                    <span>GPS Location Captured</span>
                  </p>
                  <p className="text-[10px] opacity-75">
                    Accuracy: ±{Math.round(location.accuracy || 0)}m
                  </p>
                  <p className="text-[9px] opacity-60 font-mono">
                    {location.latitude?.toFixed(6)}, {location.longitude?.toFixed(6)}
                  </p>
                  {locationWarning && (
                    <p
                      role="alert"
                      aria-live="assertive"
                      className="text-[10px] opacity-90 text-yellow-200 bg-yellow-900/30 px-2 py-1 rounded mt-1"
                    >
                      ⚠️ {locationWarning}
                    </p>
                  )}
                </div>
              )}
              <button
                onClick={handleCancel}
                className="w-full py-3 bg-white text-red-600 rounded-xl font-bold transition hover:bg-gray-100 active:scale-95"
              >
                CANCEL
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
