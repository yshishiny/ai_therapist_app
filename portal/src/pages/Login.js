import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
export default function LoginPage() {
    const navigate = useNavigate();
    const { login, isLoading } = useAuthStore();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState(null);
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError(null);
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            await login(formData.email, formData.password);
            navigate('/');
        }
        catch (err) {
            setError(err.response?.data?.detail || 'Invalid credentials');
        }
    };
    return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-lg shadow-xl p-8 w-full max-w-md", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "AI Therapist" }), _jsx("p", { className: "text-gray-600 mt-2", children: "Clinical Practice Portal" })] }), error && (_jsx("div", { className: "mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded", children: error })), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "email", className: "block text-sm font-medium text-gray-700 mb-1", children: "Email Address" }), _jsx("input", { id: "email", type: "email", name: "email", value: formData.email, onChange: handleChange, placeholder: "clinician@example.com", className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500", disabled: isLoading, required: true })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "password", className: "block text-sm font-medium text-gray-700 mb-1", children: "Password" }), _jsx("input", { id: "password", type: "password", name: "password", value: formData.password, onChange: handleChange, placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500", disabled: isLoading, required: true })] }), _jsx("button", { type: "submit", disabled: isLoading, className: "w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 transition-colors", children: isLoading ? 'Logging in...' : 'Login' })] }), _jsx("p", { className: "text-center text-gray-600 text-sm mt-6", children: "For demo: use any email and password" })] }) }));
}
