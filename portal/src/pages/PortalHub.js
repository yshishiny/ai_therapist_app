import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import { Brain, Building2, ShieldCheck, Stethoscope, HeartHandshake, ArrowRight } from 'lucide-react';
const PORTALS = [
    {
        name: 'Platform Admin',
        layer: 'Layer 1',
        href: '/platform-admin',
        icon: Building2,
        iconBg: 'bg-organic-neutral-900',
        iconColor: 'text-organic-accent-100',
        desc: 'Your company — tenants, plans, global catalog and revenue.',
        tags: ['Tenants', 'MRR', 'Plans', 'Catalog'],
    },
    {
        name: 'Practice Admin',
        layer: 'Layer 2',
        href: '/',
        icon: ShieldCheck,
        iconBg: 'bg-organic-accent',
        iconColor: 'text-organic-accent-100',
        desc: 'Clinic owner — clinicians, patients, permissions and billing.',
        tags: ['Overview', 'Access', 'Billing', 'Content'],
    },
    {
        name: 'Clinician Workspace',
        layer: 'Layer 3',
        href: '/workspace',
        icon: Stethoscope,
        iconBg: 'bg-organic-accent-2-500',
        iconColor: 'text-organic-accent-2-100',
        desc: 'Therapist — caseload, patient charts, AI scribe and care plans.',
        tags: ['Caseload', 'Chart', 'AI Scribe', 'Plan'],
    },
    {
        name: 'Patient App',
        layer: 'Layer 4',
        href: '/patient-app',
        icon: HeartHandshake,
        iconBg: 'bg-organic-accent-200',
        iconColor: 'text-organic-accent-800',
        desc: 'End user — assessments, homework, AI companion and progress.',
        tags: ['Home', 'Aria chat', 'Tasks', 'Progress'],
    },
];
export default function PortalHub() {
    return (_jsx("div", { className: "min-h-screen py-16 px-6", style: { background: 'radial-gradient(circle at 20% -10%, #f7f8fa, #eff0f4)' }, children: _jsxs("div", { className: "max-w-[1080px] mx-auto", children: [_jsxs("div", { className: "flex items-center gap-3.5 mb-11", children: [_jsx("div", { className: "w-[52px] h-[52px] rounded-organic-tile bg-organic-accent grid place-items-center text-organic-accent-100", children: _jsx(Brain, { size: 26 }) }), _jsxs("div", { children: [_jsx("div", { className: "font-heading text-[22px]", children: "AI Therapist Platform" }), _jsx("div", { className: "text-[13px] text-organic-neutral-600", children: "Multi-tenant SaaS for therapists & clinics" })] })] }), _jsx("h1", { className: "text-[52px] max-w-[640px] mb-3.5 font-heading leading-[1.1]", children: "Four connected portals, one warm platform." }), _jsx("p", { className: "text-[17px] text-organic-neutral-700 max-w-[560px] mb-12", children: "Every layer of the system \u2014 from platform ownership down to the patient's phone. Open any portal to explore its screens." }), _jsx("div", { className: "grid grid-cols-2 gap-5", children: PORTALS.map((p) => (_jsx(Link, { to: p.href, className: "block bg-organic-surface rounded-[26px] p-[26px] shadow-organic-sm border border-organic-neutral-300/50 relative overflow-hidden", children: _jsxs("div", { className: "relative", children: [_jsxs("div", { className: "flex items-center justify-between mb-5", children: [_jsx("div", { className: `w-[52px] h-[52px] rounded-organic-tile ${p.iconBg} grid place-items-center`, children: _jsx(p.icon, { size: 25, className: p.iconColor }) }), _jsx("span", { className: "text-[11px] font-semibold tracking-wide uppercase text-organic-neutral-600", children: p.layer })] }), _jsx("h3", { className: "text-2xl font-heading mb-1.5", children: p.name }), _jsx("p", { className: "text-sm text-organic-neutral-700 mb-[18px] min-h-[42px]", children: p.desc }), _jsx("div", { className: "flex gap-1.5 flex-wrap mb-5", children: p.tags.map((t) => (_jsx("span", { className: "text-[11.5px] px-2.5 py-1 rounded-organic-pill bg-organic-neutral-100 text-organic-neutral-700", children: t }, t))) }), _jsxs("span", { className: "inline-flex items-center gap-1.5 font-heading text-sm text-organic-accent-700", children: ["Open portal ", _jsx(ArrowRight, { size: 17 })] })] }) }, p.name))) }), _jsx("p", { className: "mt-10 text-[13px] text-organic-neutral-600", children: "Admin picker \u00B7 sample data throughout" })] }) }));
}
