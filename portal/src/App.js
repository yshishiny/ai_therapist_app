import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import PatientsPage from './pages/Patients';
import AssessmentsPage from './pages/Assessments';
import ClinicianWorkspace from './pages/ClinicianWorkspace';
import PatientApp from './pages/PatientApp';
export default function App() {
    const { checkAuth } = useAuthStore();
    useEffect(() => {
        try {
            checkAuth();
        }
        catch (error) {
            console.error('Auth check failed:', error);
        }
    }, [checkAuth]);
    return (_jsx("div", { style: { minHeight: '100vh', backgroundColor: '#f5ead8' }, children: _jsx(Router, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/", element: _jsx(ProtectedRoute, { children: _jsx(DashboardPage, {}) }) }), _jsx(Route, { path: "/patients", element: _jsx(ProtectedRoute, { children: _jsx(PatientsPage, {}) }) }), _jsx(Route, { path: "/assessments", element: _jsx(ProtectedRoute, { children: _jsx(AssessmentsPage, {}) }) }), _jsx(Route, { path: "/workspace", element: _jsx(ProtectedRoute, { children: _jsx(ClinicianWorkspace, {}) }) }), _jsx(Route, { path: "/patient-app", element: _jsx(ProtectedRoute, { children: _jsx(PatientApp, {}) }) }), _jsx(Route, { path: "/sessions", element: _jsx(Navigate, { to: "/", replace: true }) }), _jsx(Route, { path: "/settings", element: _jsx(Navigate, { to: "/", replace: true }) }), _jsx(Route, { path: "/my-assessments", element: _jsx(Navigate, { to: "/", replace: true }) }), _jsx(Route, { path: "/homework", element: _jsx(Navigate, { to: "/", replace: true }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) }) }));
}
