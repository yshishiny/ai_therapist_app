import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LayoutDashboard, Users, ClipboardList, Calendar, BarChart3, } from 'lucide-react';
const clinicianLinks = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/patients', label: 'Patients', icon: Users },
    { path: '/assessments', label: 'Assessments', icon: ClipboardList },
    { path: '/workspace', label: 'Workspace', icon: Calendar },
];
const patientLinks = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/my-assessments', label: 'My Assessments', icon: ClipboardList },
    { path: '/homework', label: 'Homework', icon: BarChart3 },
];
export default function Sidebar() {
    const location = useLocation();
    const { user } = useAuthStore();
    const links = user?.role === 'patient' ? patientLinks : clinicianLinks;
    return (_jsx("aside", { className: "w-64 bg-organic-neutral-100 border-r border-organic-neutral-200 p-6", children: _jsx("nav", { className: "space-y-2", children: links.map(({ path, label, icon: Icon }) => (_jsxs(Link, { to: path, className: `flex items-center gap-3 px-4 py-3 rounded-organic-pill transition-colors ${location.pathname === path
                    ? 'bg-organic-accent text-organic-accent-100 font-medium'
                    : 'text-organic-neutral-700 hover:bg-organic-neutral-200'}`, children: [_jsx(Icon, { className: "w-5 h-5" }), label] }, path))) }) }));
}
