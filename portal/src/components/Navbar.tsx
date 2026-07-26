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
    <nav className="bg-organic-surface border-b border-organic-neutral-200 px-8 py-4 flex justify-between items-center">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-organic-tile bg-gradient-to-br from-organic-accent to-organic-accent-600 flex items-center justify-center text-white font-heading text-lg">
            🧠
          </div>
          <h1 className="text-2xl font-heading text-organic-text">AI Therapist</h1>
        </div>
        <div className="text-sm text-organic-neutral-600">
          <span className="capitalize font-medium">{user?.role}</span> Portal
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-sm text-organic-neutral-600">
          {user?.sub && <span>ID: {user.sub.substring(0, 8)}...</span>}
        </div>

        <button
          onClick={() => navigate('/settings')}
          className="p-2 hover:bg-organic-neutral-200 rounded-organic-pill transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5 text-organic-accent" />
        </button>

        <button
          onClick={handleLogout}
          className="p-2 hover:bg-red-100 rounded-organic-pill transition-colors text-organic-danger"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </nav>
  )
}
