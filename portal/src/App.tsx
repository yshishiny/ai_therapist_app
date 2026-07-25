import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/Login'
import DashboardPage from './pages/Dashboard'
import PatientsPage from './pages/Patients'
import AssessmentsPage from './pages/Assessments'
import ClinicianWorkspace from './pages/ClinicianWorkspace'

export default function App() {
  const { checkAuth } = useAuthStore()

  useEffect(() => {
    try {
      checkAuth()
    } catch (error) {
      console.error('Auth check failed:', error)
    }
  }, [checkAuth])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5ead8' }}>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/patients"
            element={
              <ProtectedRoute>
                <PatientsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/assessments"
            element={
              <ProtectedRoute>
                <AssessmentsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/workspace"
            element={
              <ProtectedRoute>
                <ClinicianWorkspace />
              </ProtectedRoute>
            }
          />

          <Route path="/sessions" element={<Navigate to="/" replace />} />
          <Route path="/settings" element={<Navigate to="/" replace />} />
          <Route path="/my-assessments" element={<Navigate to="/" replace />} />
          <Route path="/homework" element={<Navigate to="/" replace />} />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </div>
  )
}
