import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogOut, Settings } from 'lucide-react';
export default function Navbar() {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };
    return (_jsxs("nav", { className: "bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center", children: [_jsxs("div", { className: "flex items-center gap-8", children: [_jsx("h1", { className: "text-2xl font-bold text-indigo-600", children: "AI Therapist" }), _jsxs("div", { className: "text-sm text-gray-600", children: [_jsx("span", { className: "capitalize", children: user?.role }), " Portal"] })] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsx("div", { className: "text-sm text-gray-600", children: user?.sub && _jsxs("span", { children: ["ID: ", user.sub.substring(0, 8), "..."] }) }), _jsx("button", { onClick: () => navigate('/settings'), className: "p-2 hover:bg-gray-100 rounded-lg transition-colors", title: "Settings", children: _jsx(Settings, { className: "w-5 h-5 text-gray-600" }) }), _jsx("button", { onClick: handleLogout, className: "p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600", title: "Logout", children: _jsx(LogOut, { className: "w-5 h-5" }) })] })] }));
}
