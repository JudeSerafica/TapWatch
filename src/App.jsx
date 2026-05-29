import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import SplashScreen from './components/SplashScreen'
import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ProfileSetup from './pages/ProfileSetup'
import ReportIncident from './pages/ReportIncident'
import Dashboard from './pages/Dashboard'
import AdminMap from './pages/AdminMap'
import IncidentMap from './pages/IncidentMap'
import AdminDashboard from './pages/AdminDashboard'
import AllReports from './pages/AllReports'
import Analytics from './pages/AnalyticsPage'
import Profile from './pages/Profile'
import EmergencyContacts from './pages/EmergencyContacts'

function App() {
  const [showSplash, setShowSplash] = useState(false)
  const [splashShown, setSplashShown] = useState(false)

  useEffect(() => {
    // Check if we're on mobile/tablet and if splash hasn't been shown this session
    const isMobileOrTablet = window.innerWidth < 1024
    const hasShownSplash = sessionStorage.getItem('splashShown')
    
    if (isMobileOrTablet && !hasShownSplash) {
      setShowSplash(true)
    }
  }, [])

  const handleSplashComplete = () => {
    setShowSplash(false)
    setSplashShown(true)
    sessionStorage.setItem('splashShown', 'true')
  }

  return (
    <AuthProvider>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/profile-setup" element={<ProfileSetup />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/report" element={<ReportIncident />} />
          <Route path="/resident-map" element={<IncidentMap />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin-map" element={<AdminMap />} />
          <Route path="/admin-reports" element={<AllReports />} />
          <Route path="/admin-analytics" element={<Analytics />} />
          <Route path="/admin-contacts" element={<EmergencyContacts />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
