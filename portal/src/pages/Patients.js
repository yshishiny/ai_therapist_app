import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import MainLayout from '../components/MainLayout';
import { Card, Button, Badge, Avatar, Input, Table } from '../components/OrganicUI';
import { Plus } from 'lucide-react';
export default function PatientsPage() {
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const mockPatients = [
        {
            id: '1',
            name: 'Sarah Johnson',
            status: 'Active',
            lastSession: '2 days ago',
            risk: 'High',
            primaryClinic: 'Dr. Patel',
            phq9: 14,
        },
        {
            id: '2',
            name: 'Michael Chen',
            status: 'Active',
            lastSession: '5 days ago',
            risk: 'Medium',
            primaryClinic: 'Dr. Smith',
            phq9: 11,
        },
        {
            id: '3',
            name: 'Emma Davis',
            status: 'Active',
            lastSession: '1 week ago',
            risk: 'Low',
            primaryClinic: 'Dr. Patel',
            phq9: 5,
        },
        {
            id: '4',
            name: 'James Wilson',
            status: 'Intake',
            lastSession: 'Never',
            risk: 'High',
            primaryClinic: 'Dr. Johnson',
            phq9: 18,
        },
    ];
    const filteredPatients = mockPatients.filter((p) => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === 'all' || (filterStatus === 'high' && p.risk === 'High') || (filterStatus === 'intake' && p.status === 'Intake');
        return matchesSearch && matchesFilter;
    });
    if (selectedPatientId) {
        const patient = mockPatients.find((p) => p.id === selectedPatientId);
        if (patient) {
            return _jsx(PatientDetailPage, { patient: patient, onBack: () => setSelectedPatientId(null) });
        }
    }
    return (_jsx(MainLayout, { children: _jsx("div", { className: "min-h-screen bg-organic-bg p-8", children: _jsxs("div", { className: "max-w-7xl mx-auto", children: [_jsxs("div", { className: "flex justify-between items-start mb-8", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-5xl font-heading text-organic-text mb-2", children: "Patients" }), _jsx("p", { className: "text-organic-neutral-600", children: "Manage and monitor your caseload" })] }), _jsxs(Button, { variant: "primary", className: "flex items-center gap-2", children: [_jsx(Plus, { size: 18 }), "Register patient"] })] }), _jsxs("div", { className: "flex gap-4 mb-8", children: [_jsx(Input, { placeholder: "Search patients...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), className: "flex-1" }), _jsx("div", { className: "flex gap-2", children: ['all', 'high', 'intake'].map((status) => (_jsx("button", { onClick: () => setFilterStatus(status), className: `px-4 py-2.5 rounded-organic-pill text-sm font-medium transition-colors ${filterStatus === status
                                        ? 'bg-organic-accent text-organic-accent-100'
                                        : 'bg-organic-neutral-200 text-organic-neutral-700 hover:text-organic-text'}`, children: status === 'all' ? 'All' : status === 'high' ? 'High risk' : 'Intake' }, status))) })] }), _jsx(Card, { children: _jsx(Table, { headers: ['Patient', 'Status', 'Primary clinician', 'Last session', 'Risk level'], rows: filteredPatients.map((patient) => [
                                _jsxs("button", { onClick: () => setSelectedPatientId(patient.id), className: "flex items-center gap-3 hover:text-organic-accent transition-colors cursor-pointer group", children: [_jsx(Avatar, { name: patient.name, size: "sm" }), _jsxs("div", { className: "text-left", children: [_jsx("p", { className: "font-medium group-hover:underline", children: patient.name }), _jsxs("p", { className: "text-xs text-organic-neutral-600", children: ["ID: #", patient.id.padStart(4, '0')] })] })] }, patient.id),
                                _jsx(Badge, { variant: "sage", children: patient.status }, `status-${patient.id}`),
                                patient.primaryClinic,
                                patient.lastSession,
                                _jsx(Badge, { variant: patient.risk === 'High' ? 'danger' : patient.risk === 'Medium' ? 'accent' : 'sage', children: patient.risk }, `risk-${patient.id}`),
                            ]) }) })] }) }) }));
}
function PatientDetailPage({ patient, onBack }) {
    return (_jsx(MainLayout, { children: _jsx("div", { className: "min-h-screen bg-organic-bg p-8", children: _jsxs("div", { className: "max-w-7xl mx-auto", children: [_jsxs("div", { className: "mb-8", children: [_jsx("button", { onClick: onBack, className: "text-organic-accent hover:text-organic-accent-600 font-medium mb-4 flex items-center gap-2", children: "\u2190 Back to patients" }), _jsxs("div", { className: "flex items-start gap-6 mb-8", children: [_jsx(Avatar, { name: patient.name, size: "lg" }), _jsxs("div", { className: "flex-1", children: [_jsx("h1", { className: "text-4xl font-heading text-organic-text mb-2", children: patient.name }), _jsxs("div", { className: "flex gap-4 items-center", children: [_jsxs(Badge, { variant: patient.risk === 'High' ? 'danger' : patient.risk === 'Medium' ? 'accent' : 'sage', children: [patient.risk, " risk"] }), _jsxs("p", { className: "text-organic-neutral-600", children: ["Primary clinician: ", _jsx("span", { className: "font-medium text-organic-text", children: patient.primaryClinic })] }), _jsxs("p", { className: "text-organic-neutral-600", children: ["Last session: ", _jsx("span", { className: "font-medium text-organic-text", children: patient.lastSession })] })] })] })] })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-8", children: [_jsxs("div", { className: "lg:col-span-2 space-y-6", children: [_jsxs(Card, { children: [_jsx("h2", { className: "text-2xl font-heading text-organic-text mb-4", children: "Clinical file archive" }), _jsx("div", { className: "flex gap-2 mb-6 border-b border-organic-neutral-200 pb-4", children: ['Intake & raw docs', 'Processed notes', 'AI summaries', 'Patient reports'].map((folder) => (_jsx("button", { className: "px-3 py-2 rounded-organic-pill bg-organic-neutral-200 text-sm font-medium text-organic-neutral-700 hover:bg-organic-accent hover:text-organic-accent-100 transition-colors", children: folder }, folder))) }), _jsx("div", { className: "space-y-2", children: [
                                                    { name: 'Initial Intake Form', date: '2024-07-01', locked: false },
                                                    { name: 'PHQ-9 Assessment', date: '2024-07-15', locked: false },
                                                    { name: 'Clinical Notes - Session 1', date: '2024-07-20', locked: false },
                                                    { name: 'Progress Report', date: '2024-07-25', locked: true },
                                                ].map((file, i) => (_jsxs("div", { className: "flex items-center justify-between p-3 bg-organic-neutral-100 rounded-lg hover:bg-organic-neutral-200 transition-colors cursor-pointer", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-8 h-8 rounded bg-organic-accent-200 flex items-center justify-center text-organic-accent-700", children: "\uD83D\uDCC4" }), _jsxs("div", { children: [_jsx("p", { className: "font-medium text-organic-text", children: file.name }), _jsx("p", { className: "text-xs text-organic-neutral-600", children: file.date })] })] }), file.locked && _jsx("div", { className: "text-organic-accent-2-700", children: "\uD83D\uDD12" })] }, i))) })] }), _jsxs(Card, { children: [_jsx("h3", { className: "text-xl font-heading text-organic-text mb-4", children: "Symptom trajectory" }), _jsxs("svg", { viewBox: "0 0 500 250", className: "w-full h-64", children: [_jsx("line", { x1: "60", y1: "200", x2: "480", y2: "200", stroke: "#dcd3c4", strokeWidth: "1" }), _jsx("line", { x1: "60", y1: "150", x2: "480", y2: "150", stroke: "#dcd3c4", strokeWidth: "1" }), _jsx("line", { x1: "60", y1: "100", x2: "480", y2: "100", stroke: "#dcd3c4", strokeWidth: "1" }), _jsx("line", { x1: "60", y1: "50", x2: "480", y2: "50", stroke: "#dcd3c4", strokeWidth: "1" }), _jsx("polyline", { points: "60,120 140,110 220,80 300,95 380,85 460,95", fill: "none", stroke: "#c67139", strokeWidth: "3" }), _jsx("polyline", { points: "60,140 140,135 220,110 300,120 380,115 460,125", fill: "none", stroke: "#7a8a5e", strokeWidth: "3", strokeDasharray: "5,5" }), _jsx("line", { x1: "60", y1: "20", x2: "60", y2: "200", stroke: "#201e1d", strokeWidth: "2" }), _jsx("line", { x1: "60", y1: "200", x2: "480", y2: "200", stroke: "#201e1d", strokeWidth: "2" }), _jsx("text", { x: "60", y: "230", fontSize: "12", textAnchor: "middle", fill: "#82796a", children: "4w ago" }), _jsx("text", { x: "230", y: "230", fontSize: "12", textAnchor: "middle", fill: "#82796a", children: "2w ago" }), _jsx("text", { x: "400", y: "230", fontSize: "12", textAnchor: "middle", fill: "#82796a", children: "Today" }), _jsx("line", { x1: "60", y1: "15", x2: "90", y2: "15", stroke: "#c67139", strokeWidth: "2" }), _jsx("text", { x: "100", y: "18", fontSize: "12", fill: "#201e1d", children: "PHQ-9" }), _jsx("line", { x1: "180", y1: "15", x2: "210", y2: "15", stroke: "#7a8a5e", strokeWidth: "2", strokeDasharray: "5,5" }), _jsx("text", { x: "220", y: "18", fontSize: "12", fill: "#201e1d", children: "GAD-7" })] })] })] }), _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "bg-gradient-to-br from-organic-accent to-organic-accent-600 text-white rounded-organic-card p-6 shadow-organic-lg", children: [_jsx("h3", { className: "text-lg font-heading mb-3", children: "AI clinical insights" }), _jsxs("ul", { className: "text-sm space-y-2", children: [_jsxs("li", { className: "flex gap-2", children: [_jsx("span", { children: "\u2022" }), _jsx("span", { children: "PHQ-9 trending down, positive trajectory" })] }), _jsxs("li", { className: "flex gap-2", children: [_jsx("span", { children: "\u2022" }), _jsx("span", { children: "Sleep quality improving week-over-week" })] }), _jsxs("li", { className: "flex gap-2", children: [_jsx("span", { children: "\u2022" }), _jsx("span", { children: "Recommend behavioral activation exercises" })] })] })] }), _jsxs(Card, { children: [_jsx("h3", { className: "text-lg font-heading text-organic-text mb-4", children: "Latest assessment scores" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between mb-2", children: [_jsx("p", { className: "font-medium text-organic-text", children: "PHQ-9" }), _jsx("p", { className: "text-2xl font-heading text-organic-accent", children: patient.phq9 })] }), _jsx("div", { className: "w-full bg-organic-neutral-200 rounded-organic-pill h-2", children: _jsx("div", { className: "bg-organic-accent h-full rounded-organic-pill", style: { width: `${(patient.phq9 / 27) * 100}%` } }) }), _jsx("p", { className: "text-xs text-organic-neutral-600 mt-1", children: "Moderate severity" })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex justify-between mb-2", children: [_jsx("p", { className: "font-medium text-organic-text", children: "GAD-7" }), _jsx("p", { className: "text-2xl font-heading text-organic-accent-2-700", children: "11" })] }), _jsx("div", { className: "w-full bg-organic-neutral-200 rounded-organic-pill h-2", children: _jsx("div", { className: "bg-organic-accent-2-700 h-full rounded-organic-pill", style: { width: `${(11 / 21) * 100}%` } }) }), _jsx("p", { className: "text-xs text-organic-neutral-600 mt-1", children: "Moderate anxiety" })] })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Button, { variant: "primary", className: "w-full", children: "View all assessments" }), _jsx(Button, { variant: "secondary", className: "w-full", children: "Schedule follow-up" })] })] })] })] }) }) }));
}
