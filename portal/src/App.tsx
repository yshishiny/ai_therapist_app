import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/Login'
import PracticeAdminPortal from './pages/PracticeAdminPortal'
import PlatformAdminPortal from './pages/PlatformAdminPortal'
import PortalHub from './pages/PortalHub'
import ClinicianWorkspace from './pages/ClinicianWorkspace'
import PatientApp from './pages/PatientApp'
import { UserRole } from './types/auth'

const STAFF_ROLES: UserRole[] = ['clinician', 'supervisor', 'admin']

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
    <div style={{ minHeight: '100vh', backgroundColor: '#eff0f4' }}>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute requiredRoles={STAFF_ROLES}>
                <PracticeAdminPortal />
              </ProtectedRoute>
            }
          />

          <Route
            path="/platform-admin"
            element={
              <ProtectedRoute requiredRoles={['admin']}>
                <PlatformAdminPortal />
              </ProtectedRoute>
            }
          />

          <Route
            path="/hub"
            element={
              <ProtectedRoute requiredRoles={['admin']}>
                <PortalHub />
              </ProtectedRoute>
            }
          />

          <Route
            path="/workspace"
            element={
              <ProtectedRoute requiredRoles={STAFF_ROLES}>
                <ClinicianWorkspace />
              </ProtectedRoute>
            }
          />

          <Route
            path="/patient-app"
            element={
              <ProtectedRoute>
                <PatientApp />
              </ProtectedRoute>
            }
          />

          {/* Old top-nav pages are now views inside PracticeAdminPortal */}
          <Route path="/patients" element={<Navigate to="/" replace />} />
          <Route path="/assessments" element={<Navigate to="/" replace />} />
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
