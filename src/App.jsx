import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
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

// Protected Route Component - redirects to dashboard if logged in
function ProtectedLanding() {
  const { user, profile, loading } = useAuth()
  
  if (loading) return <div>Loading...</div>
  
  // If user is logged in, redirect to appropriate dashboard
  if (user && profile) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/dashboard'} replace />
  }
  
  return <LandingPage />
}

// Auth Route Component - redirects to dashboard if already logged in
function AuthRoute({ children }) {
  const { user, profile, loading } = useAuth()
  
  if (loading) return <div>Loading...</div>
  
  // If user is logged in, redirect to appropriate dashboard
  if (user && profile) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/dashboard'} replace />
  }
  
  return children
}

function AppRoutes() {
  const [showSplash, setShowSplash] = useState(false)
  const { user, profile, loading } = useAuth()

  useEffect(() => {
    // Check if we're on mobile/tablet
    const isMobileOrTablet = window.innerWidth < 1024
    const hasShownSplash = sessionStorage.getItem('splashShown')
    
    // Show splash IMMEDIATELY on mobile, even before auth check
    if (isMobileOrTablet && !hasShownSplash) {
      setShowSplash(true)
    }
  }, [])

  const handleSplashComplete = () => {
    setShowSplash(false)
    sessionStorage.setItem('splashShown', 'true')
  }

  // Show splash screen FIRST, before anything else
  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />
  }

  // Show loading while checking auth
  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <Routes>
      {/* Landing page - redirects to dashboard if logged in */}
      <Route path="/" element={<ProtectedLanding />} />
      
      {/* Auth routes - redirects to dashboard if already logged in */}
      <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
      <Route path="/signup" element={<AuthRoute><Signup /></AuthRoute>} />
      
      {/* Protected routes */}
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
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
