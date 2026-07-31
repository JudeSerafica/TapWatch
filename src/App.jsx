import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SidebarProvider } from './context/SidebarContext'
import { useAuth } from './context/useAuth'
import { OrbitProgress } from 'react-loading-indicators'
import SplashScreen from './components/SplashScreen'
import AdminLayout from './components/AdminLayout'
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
import VerificationCenter from './pages/VerificationCenter'
import AdminVerificationReview from './pages/AdminVerificationReview'
import SystemSettings from './pages/SystemSettings'
import OfflineIndicator from './components/OfflineIndicator'

// Loading Component
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <OrbitProgress color="#2563eb" size="medium" />
    </div>
  )
}

// Detect if running as installed PWA/APK (standalone mode)
function isStandaloneApp() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true // iOS Safari PWA
  )
}

// Protected Route Component - redirects to dashboard if logged in
function ProtectedLanding() {
  const { user, profile, loading } = useAuth()
  
  if (loading) return <LoadingScreen />

  if (user && profile) {
    // On installed PWA/APK: always go straight to dashboard
    if (isStandaloneApp()) {
      return <Navigate to={profile.role === 'admin' ? '/admin' : '/dashboard'} replace />
    }
    // On web browser: only redirect if user is actively in the same tab session
    // (sessionStorage is cleared when the tab is closed/reopened)
    const activeSession = sessionStorage.getItem('activeWebSession')
    if (activeSession) {
      return <Navigate to={profile.role === 'admin' ? '/admin' : '/dashboard'} replace />
    }
    // Tab was freshly opened — show landing page even if logged in
    return <LandingPage />
  }
  
  return <LandingPage />
}

// Auth Route Component - redirects to dashboard if already logged in
function AuthRoute({ children }) {
  const { user, profile, loading } = useAuth()
  
  if (loading) return <LoadingScreen />
  
  // If user is logged in, redirect to appropriate dashboard
  // (reaching /login or /signup means they are intentionally in a session)
  if (user && profile) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/dashboard'} replace />
  }
  
  return children
}

// Stamp the session when user is on any protected route within the same tab.
// This ensures navigating back to "/" within the same tab still redirects to dashboard.
function SessionStamp() {
  const { user } = useAuth()
  const location = useLocation()
  useEffect(() => {
    if (user) sessionStorage.setItem('activeWebSession', '1')
  }, [user, location.pathname])
  return null
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
    return <LoadingScreen />
  }

  return (
    <>
      <SessionStamp />
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
      <Route path="/verification" element={<VerificationCenter />} />
      
      {/* Admin routes with AdminLayout */}
      <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
      <Route path="/admin-map" element={<AdminLayout><AdminMap /></AdminLayout>} />
      <Route path="/admin-reports" element={<AdminLayout><AllReports /></AdminLayout>} />
      <Route path="/admin-analytics" element={<AdminLayout><Analytics /></AdminLayout>} />
      <Route path="/admin-contacts" element={<AdminLayout><EmergencyContacts /></AdminLayout>} />
      <Route path="/admin-verification" element={<AdminLayout><AdminVerificationReview /></AdminLayout>} />
      <Route path="/admin-settings" element={<AdminLayout><SystemSettings /></AdminLayout>} />
    </Routes>
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <SidebarProvider>
          <AppRoutes />
          <OfflineIndicator />
        </SidebarProvider>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
