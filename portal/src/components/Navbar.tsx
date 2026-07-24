import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { LogOut, Settings } from 'lucide-react'

export default function Navbar() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-8">
        <h1 className="text-2xl font-bold text-indigo-600">AI Therapist</h1>
        <div className="text-sm text-gray-600">
          <span className="capitalize">{user?.role}</span> Portal
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-600">
          {user?.sub && <span>ID: {user.sub.substring(0, 8)}...</span>}
        </div>

        <button
          onClick={() => navigate('/settings')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5 text-gray-600" />
        </button>

        <button
          onClick={handleLogout}
          className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </nav>
  )
}
