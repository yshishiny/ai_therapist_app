import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
export default function ProtectedRoute({ children, requiredRoles }) {
    const { isAuthenticated, user } = useAuthStore();
    if (!isAuthenticated || !user) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    if (requiredRoles && !requiredRoles.includes(user.role)) {
        return _jsx(Navigate, { to: user.role === 'patient' ? '/patient-app' : '/', replace: true });
    }
    return _jsx(_Fragment, { children: children });
}
