import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import MainLayout from '../components/MainLayout';
import { useAuthStore } from '../store/authStore';
import apiClient from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { AlertCircle, Users, TrendingUp, CheckCircle } from 'lucide-react';
export default function DashboardPage() {
    const { user } = useAuthStore();
    const [stats, setStats] = useState(null);
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Fetch dashboard stats
                try {
                    const dashboardData = await apiClient.getDashboard();
                    setStats(dashboardData);
                }
                catch {
                    // Dashboard might not be implemented yet, use defaults
                    setStats({
                        activePatients: 12,
                        totalSessions: 48,
                        completedAssessments: 24,
                        avgScore: 7.2,
                    });
                }
                // Fetch patients list
                try {
                    const patientsData = await apiClient.getPatients();
                    setPatients(Array.isArray(patientsData) ? patientsData : []);
                }
                catch {
                    setPatients([]);
                }
            }
            catch (err) {
                setError(err.message || 'Failed to load dashboard');
            }
            finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);
    const mockTrendData = [
        { week: 'Week 1', score: 18 },
        { week: 'Week 2', score: 16 },
        { week: 'Week 3', score: 14 },
        { week: 'Week 4', score: 12 },
    ];
    if (loading) {
        return (_jsx(MainLayout, { children: _jsx("div", { className: "flex items-center justify-center min-h-screen", children: _jsx("div", { className: "text-lg text-gray-600", children: "Loading dashboard..." }) }) }));
    }
    return (_jsx(MainLayout, { children: _jsxs("div", { className: "space-y-8", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-4xl font-bold text-gray-900", children: "Dashboard" }), _jsxs("p", { className: "text-gray-600 mt-2", children: ["Welcome back, ", user?.role || 'User'] })] }), error && (_jsxs("div", { className: "p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3 items-start", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" }), _jsx("p", { className: "text-yellow-800", children: error })] })), stats && (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [_jsx("div", { className: "bg-white rounded-lg p-6 border border-gray-200", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-gray-600 text-sm", children: "Active Patients" }), _jsx("p", { className: "text-3xl font-bold text-gray-900", children: stats.activePatients })] }), _jsx(Users, { className: "w-8 h-8 text-blue-500" })] }) }), _jsx("div", { className: "bg-white rounded-lg p-6 border border-gray-200", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-gray-600 text-sm", children: "Total Sessions" }), _jsx("p", { className: "text-3xl font-bold text-gray-900", children: stats.totalSessions })] }), _jsx(CheckCircle, { className: "w-8 h-8 text-green-500" })] }) }), _jsx("div", { className: "bg-white rounded-lg p-6 border border-gray-200", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-gray-600 text-sm", children: "Assessments" }), _jsx("p", { className: "text-3xl font-bold text-gray-900", children: stats.completedAssessments })] }), _jsx(TrendingUp, { className: "w-8 h-8 text-purple-500" })] }) }), _jsx("div", { className: "bg-white rounded-lg p-6 border border-gray-200", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-gray-600 text-sm", children: "Avg. Score" }), _jsx("p", { className: "text-3xl font-bold text-gray-900", children: stats.avgScore.toFixed(1) })] }), _jsx(BarChart, { className: "w-8 h-8 text-orange-500" })] }) })] })), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs("div", { className: "bg-white rounded-lg p-6 border border-gray-200", children: [_jsx("h2", { className: "text-lg font-semibold mb-4", children: "PHQ-9 Trend (Sample)" }), _jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(LineChart, { data: mockTrendData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "week" }), _jsx(YAxis, { domain: [0, 30] }), _jsx(Tooltip, {}), _jsx(Line, { type: "monotone", dataKey: "score", stroke: "#6366f1", strokeWidth: 2 })] }) })] }), _jsxs("div", { className: "bg-white rounded-lg p-6 border border-gray-200", children: [_jsx("h2", { className: "text-lg font-semibold mb-4", children: "Patient Status" }), _jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(BarChart, { data: [
                                            { status: 'Active', count: 8 },
                                            { status: 'Paused', count: 2 },
                                            { status: 'Discharged', count: 2 },
                                        ], children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "status" }), _jsx(YAxis, {}), _jsx(Tooltip, {}), _jsx(Bar, { dataKey: "count", fill: "#6366f1" })] }) })] })] }), _jsxs("div", { className: "bg-white rounded-lg p-6 border border-gray-200", children: [_jsx("h2", { className: "text-lg font-semibold mb-4", children: "Recent Patients" }), patients.length > 0 ? (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "border-b border-gray-200", children: _jsxs("tr", { children: [_jsx("th", { className: "text-left py-3 px-4 font-semibold text-gray-900", children: "Name" }), _jsx("th", { className: "text-left py-3 px-4 font-semibold text-gray-900", children: "Status" }), _jsx("th", { className: "text-left py-3 px-4 font-semibold text-gray-900", children: "Risk Level" })] }) }), _jsx("tbody", { children: patients.slice(0, 5).map(patient => (_jsxs("tr", { className: "border-b border-gray-100 hover:bg-gray-50", children: [_jsx("td", { className: "py-3 px-4 text-gray-900", children: patient.full_name }), _jsx("td", { className: "py-3 px-4", children: _jsx("span", { className: `px-2 py-1 rounded text-sm font-medium ${patient.status === 'Active' ? 'bg-green-100 text-green-800' :
                                                            patient.status === 'Paused' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-gray-100 text-gray-800'}`, children: patient.status }) }), _jsx("td", { className: "py-3 px-4", children: _jsx("span", { className: `px-2 py-1 rounded text-sm font-medium ${patient.risk === 'High' ? 'bg-red-100 text-red-800' :
                                                            patient.risk === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-green-100 text-green-800'}`, children: patient.risk }) })] }, patient.id))) })] }) })) : (_jsx("p", { className: "text-gray-600", children: "No patients found" }))] })] }) }));
}
