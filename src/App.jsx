import { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SidebarProvider } from './context/SidebarContext'
import { useAuth } from './context/useAuth'
import { OrbitProgress } from 'react-loading-indicators'
import SplashScreen from './components/SplashScreen'
import AdminLayout from './components/AdminLayout'
import OfflineIndicator from './components/OfflineIndicator'
import ErrorBoundary from './components/ErrorBoundary'

// ── Lazy-loaded pages — each becomes its own chunk at build time ──────────
// Resident pages
const LandingPage          = lazy(() => import('./pages/LandingPage'))
const Login                = lazy(() => import('./pages/Login'))
const Signup               = lazy(() => import('./pages/Signup'))
const ProfileSetup         = lazy(() => import('./pages/ProfileSetup'))
const Dashboard            = lazy(() => import('./pages/Dashboard'))
const ReportIncident       = lazy(() => import('./pages/ReportIncident'))
const IncidentMap          = lazy(() => import('./pages/IncidentMap'))
const Profile              = lazy(() => import('./pages/Profile'))
const VerificationCenter   = lazy(() => import('./pages/VerificationCenter'))

// Admin pages — residents never download these chunks
const AdminDashboard          = lazy(() => import('./pages/AdminDashboard'))
const AdminMap                = lazy(() => import('./pages/AdminMap'))
const AllReports              = lazy(() => import('./pages/AllReports'))
const Analytics               = lazy(() => import('./pages/AnalyticsPage'))
const EmergencyContacts       = lazy(() => import('./pages/EmergencyContacts'))
const AdminVerificationReview = lazy(() => import('./pages/AdminVerificationReview'))
const SystemSettings          = lazy(() => import('./pages/SystemSettings'))

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

// Require authenticated user — redirects to /login if not logged in
function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

// Require admin role — redirects to /dashboard if not an admin
function RequireAdmin({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (profile?.role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
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
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
        {/* Landing page - redirects to dashboard if logged in */}
        <Route path="/" element={<ProtectedLanding />} />
        
        {/* Auth routes - redirects to dashboard if already logged in */}
        <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
        <Route path="/signup" element={<AuthRoute><Signup /></AuthRoute>} />
        
        {/* Protected routes — require authenticated user */}
        <Route path="/profile-setup" element={<RequireAuth><ProfileSetup /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/report" element={<RequireAuth><ReportIncident /></RequireAuth>} />
        <Route path="/resident-map" element={<RequireAuth><IncidentMap /></RequireAuth>} />
        <Route path="/verification" element={<RequireAuth><VerificationCenter /></RequireAuth>} />

        {/* Admin routes — require admin role */}
        <Route path="/admin" element={<RequireAdmin><AdminLayout><AdminDashboard /></AdminLayout></RequireAdmin>} />
        <Route path="/admin-map" element={<RequireAdmin><AdminLayout><AdminMap /></AdminLayout></RequireAdmin>} />
        <Route path="/admin-reports" element={<RequireAdmin><AdminLayout><AllReports /></AdminLayout></RequireAdmin>} />
        <Route path="/admin-analytics" element={<RequireAdmin><AdminLayout><Analytics /></AdminLayout></RequireAdmin>} />
        <Route path="/admin-contacts" element={<RequireAdmin><AdminLayout><EmergencyContacts /></AdminLayout></RequireAdmin>} />
        <Route path="/admin-verification" element={<RequireAdmin><AdminLayout><AdminVerificationReview /></AdminLayout></RequireAdmin>} />
        <Route path="/admin-settings" element={<RequireAdmin><AdminLayout><SystemSettings /></AdminLayout></RequireAdmin>} />
      </Routes>
      </Suspense>
    </>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <SidebarProvider>
              <AppRoutes />
              <OfflineIndicator />
            </SidebarProvider>
          </ErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
