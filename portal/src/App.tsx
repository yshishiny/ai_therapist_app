import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/Login'
import DashboardPage from './pages/Dashboard'

export default function App() {
  const { checkAuth } = useAuthStore()

  useEffect(() => {
    // Check if user is already authenticated on app load
    checkAuth()
  }, [checkAuth])

  return (
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

        {/* TODO: Add more routes */}
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
  )
}
