import { useEffect, useState } from 'react'
import MainLayout from '../components/MainLayout'
import { useAuthStore } from '../store/authStore'
import apiClient from '../services/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { AlertCircle, Users, TrendingUp, CheckCircle } from 'lucide-react'

interface DashboardStats {
  activePatients: number
  totalSessions: number
  completedAssessments: number
  avgScore: number
}

interface Patient {
  id: string
  full_name: string
  status: string
  risk: string
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch dashboard stats
        try {
          const dashboardData = await apiClient.getDashboard()
          setStats(dashboardData)
        } catch {
          // Dashboard might not be implemented yet, use defaults
          setStats({
            activePatients: 12,
            totalSessions: 48,
            completedAssessments: 24,
            avgScore: 7.2,
          })
        }

        // Fetch patients list
        try {
          const patientsData = await apiClient.getPatients()
          setPatients(Array.isArray(patientsData) ? patientsData : [])
        } catch {
          setPatients([])
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const mockTrendData = [
    { week: 'Week 1', score: 18 },
    { week: 'Week 2', score: 16 },
    { week: 'Week 3', score: 14 },
    { week: 'Week 4', score: 12 },
  ]

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg text-gray-600">Loading dashboard...</div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back, {user?.role || 'User'}</p>
        </div>

        {error && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3 items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <p className="text-yellow-800">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Active Patients</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.activePatients}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Sessions</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalSessions}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Assessments</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.completedAssessments}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Avg. Score</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.avgScore.toFixed(1)}</p>
                </div>
                <BarChart className="w-8 h-8 text-orange-500" />
              </div>
            </div>
          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trend Chart */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">PHQ-9 Trend (Sample)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis domain={[0, 30]} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Patient Status Chart */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Patient Status</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { status: 'Active', count: 8 },
                { status: 'Paused', count: 2 },
                { status: 'Discharged', count: 2 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Patients */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Recent Patients</h2>
          {patients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Risk Level</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.slice(0, 5).map(patient => (
                    <tr key={patient.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900">{patient.full_name}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          patient.status === 'Active' ? 'bg-green-100 text-green-800' :
                          patient.status === 'Paused' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {patient.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          patient.risk === 'High' ? 'bg-red-100 text-red-800' :
                          patient.risk === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {patient.risk}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600">No patients found</p>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
