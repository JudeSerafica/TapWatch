import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ProfileSetup from './pages/ProfileSetup'
import ReportIncident from './pages/ReportIncident'
import Dashboard from './pages/Dashboard'
import IncidentMap from './pages/IncidentMap'
import AdminDashboard from './pages/AdminDashboard'
import AllReports from './pages/AllReports'
import Analytics from './pages/AnalyticsPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/profile-setup" element={<ProfileSetup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/report" element={<ReportIncident />} />
          <Route path="/map" element={<IncidentMap />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin-map" element={<IncidentMap />} />
          <Route path="/admin-reports" element={<AllReports />} />
          <Route path="/admin-analytics" element={<Analytics />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
