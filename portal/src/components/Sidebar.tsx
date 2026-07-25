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
  { path: '/workspace', label: 'Workspace', icon: Calendar },
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
    <aside className="w-64 bg-organic-neutral-100 border-r border-organic-neutral-200 p-6">
      <nav className="space-y-2">
        {links.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className={`flex items-center gap-3 px-4 py-3 rounded-organic-pill transition-colors ${
              location.pathname === path
                ? 'bg-organic-accent text-orange-50 font-medium'
                : 'text-organic-neutral-700 hover:bg-organic-neutral-200'
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
