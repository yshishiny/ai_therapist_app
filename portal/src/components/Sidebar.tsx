import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Calendar,
  BarChart3,
} from 'lucide-react'

const clinicianLinks = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/patients', label: 'Patients', icon: Users },
  { path: '/assessments', label: 'Assessments', icon: ClipboardList },
  { path: '/sessions', label: 'Sessions', icon: Calendar },
]

const patientLinks = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/my-assessments', label: 'My Assessments', icon: ClipboardList },
  { path: '/homework', label: 'Homework', icon: BarChart3 },
]

export default function Sidebar() {
  const location = useLocation()
  const { user } = useAuthStore()

  const links = user?.role === 'patient' ? patientLinks : clinicianLinks

  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 p-4">
      <nav className="space-y-2">
        {links.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              location.pathname === path
                ? 'bg-indigo-100 text-indigo-700 font-medium'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
