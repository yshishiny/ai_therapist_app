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
    return (_jsxs("nav", { className: "bg-organic-surface border-b border-organic-neutral-200 px-8 py-4 flex justify-between items-center", children: [_jsxs("div", { className: "flex items-center gap-8", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-10 h-10 rounded-organic-tile bg-gradient-to-br from-organic-accent to-orange-600 flex items-center justify-center text-white font-heading text-lg", children: "\uD83E\uDDE0" }), _jsx("h1", { className: "text-2xl font-heading text-organic-text", children: "AI Therapist" })] }), _jsxs("div", { className: "text-sm text-organic-neutral-600", children: [_jsx("span", { className: "capitalize font-medium", children: user?.role }), " Portal"] })] }), _jsxs("div", { className: "flex items-center gap-6", children: [_jsx("div", { className: "text-sm text-organic-neutral-600", children: user?.sub && _jsxs("span", { children: ["ID: ", user.sub.substring(0, 8), "..."] }) }), _jsx("button", { onClick: () => navigate('/settings'), className: "p-2 hover:bg-organic-neutral-200 rounded-organic-pill transition-colors", title: "Settings", children: _jsx(Settings, { className: "w-5 h-5 text-organic-accent" }) }), _jsx("button", { onClick: handleLogout, className: "p-2 hover:bg-red-100 rounded-organic-pill transition-colors text-organic-danger", title: "Logout", children: _jsx(LogOut, { className: "w-5 h-5" }) })] })] }));
}
