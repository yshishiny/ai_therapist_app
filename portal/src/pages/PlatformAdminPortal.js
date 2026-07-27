import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Brain, Plus, LayoutDashboard, Building2, Tag, LibraryBig, TrendingUp, Stethoscope, Sparkles, Pencil, Check, ClipboardList, } from 'lucide-react';
const NAV_ITEMS = [
    { view: 'overview', label: 'Overview', icon: LayoutDashboard },
    { view: 'tenants', label: 'Tenants', icon: Building2 },
    { view: 'plans', label: 'Plans & Pricing', icon: Tag },
    { view: 'catalog', label: 'Global Catalog', icon: LibraryBig },
];
const TITLES = {
    overview: 'Platform overview',
    tenants: 'Tenants',
    plans: 'Plans & pricing',
    catalog: 'Global catalog',
};
const SUBTITLES = {
    overview: 'AI Therapist Platform · all clinics',
    tenants: '48 active clinics · 3 in trial',
    plans: 'Subscription tiers and feature gating',
    catalog: 'Assessments & content available to tenants',
};
const CTAS = {
    overview: 'Export report',
    tenants: 'Add tenant',
    plans: 'New plan',
    catalog: 'Publish item',
};
export default function PlatformAdminPortal() {
    const [view, setView] = useState('overview');
    return (_jsxs("div", { className: "flex min-h-screen items-stretch bg-organic-bg", children: [_jsxs("aside", { className: "flex-none w-[250px] bg-organic-neutral-900 text-organic-neutral-200 py-[22px] px-4 flex flex-col gap-1.5 sticky top-0 h-screen", children: [_jsxs("div", { className: "flex items-center gap-2.5 px-2 pb-5", children: [_jsx("div", { className: "w-[38px] h-[38px] rounded-organic-tile bg-organic-accent grid place-items-center text-organic-accent-100", children: _jsx(Brain, { size: 20 }) }), _jsxs("div", { className: "leading-tight", children: [_jsx("div", { className: "font-heading text-base text-organic-neutral-100", children: "AI Therapist" }), _jsx("div", { className: "text-[11px] text-organic-neutral-500", children: "Platform console" })] })] }), NAV_ITEMS.map(({ view: v, label, icon: Icon }) => (_jsxs("button", { onClick: () => setView(v), className: `flex items-center gap-3 px-3.5 py-2.5 rounded-organic-tile text-[14.5px] transition-colors text-left ${v === view ? 'bg-organic-accent text-organic-neutral-100 font-bold' : 'text-organic-neutral-300 font-semibold hover:bg-white/5'}`, children: [_jsx(Icon, { size: 19 }), label] }, v))), _jsxs("div", { className: "mt-auto flex items-center gap-2.5 pt-2.5 px-2 border-t border-white/10", children: [_jsx("div", { className: "w-[34px] h-[34px] rounded-full bg-organic-accent-500 grid place-items-center font-bold text-xs text-organic-accent-100", children: "YS" }), _jsxs("div", { className: "leading-tight", children: [_jsx("div", { className: "text-[13px] font-semibold text-organic-neutral-100", children: "Y. Shishiny" }), _jsx("div", { className: "text-[11px] text-organic-neutral-500", children: "Platform owner" })] })] })] }), _jsxs("main", { className: "flex-1 min-w-0 px-9 pt-8 pb-16 max-w-[1240px]", children: [_jsxs("header", { className: "flex justify-between items-end gap-5 flex-wrap mb-7", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-[34px] font-heading text-organic-text mb-1", children: TITLES[view] }), _jsx("p", { className: "text-organic-neutral-600 text-sm", children: SUBTITLES[view] })] }), _jsxs("button", { className: "rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-sm px-5 py-2.5 inline-flex items-center gap-2", children: [_jsx(Plus, { size: 16 }), " ", CTAS[view]] })] }), view === 'overview' && _jsx(OverviewView, {}), view === 'tenants' && _jsx(TenantsView, {}), view === 'plans' && _jsx(PlansView, {}), view === 'catalog' && _jsx(CatalogView, {})] })] }));
}
// ─── Overview ───────────────────────────────────────────────────────────────
const STATS = [
    { label: 'Active clinics', value: '48', trend: '+6 this month', icon: Building2 },
    { label: 'MRR', value: '$62.4k', trend: '+14% MoM', icon: TrendingUp },
    { label: 'Total clinicians', value: '412', trend: '+38 this month', icon: Stethoscope },
    { label: 'AI messages / mo', value: '1.9M', trend: '+22%', icon: Sparkles },
];
const PLAN_MIX = [
    { name: 'Basic', count: 21, pct: 44, bar: 'bg-organic-neutral-400' },
    { name: 'Professional', count: 22, pct: 46, bar: 'bg-organic-accent-500' },
    { name: 'Enterprise', count: 5, pct: 10, bar: 'bg-organic-accent-2-500' },
];
function OverviewView() {
    return (_jsxs("div", { children: [_jsx("div", { className: "grid grid-cols-4 gap-4 mb-4", children: STATS.map((st) => (_jsxs("div", { className: "bg-organic-surface rounded-organic-card p-[18px] shadow-organic-sm", children: [_jsxs("div", { className: "flex justify-between items-start", children: [_jsx("span", { className: "text-xs text-organic-neutral-600", children: st.label }), _jsx(st.icon, { size: 17, className: "text-organic-accent-500" })] }), _jsx("div", { className: "font-heading text-[34px] my-1.5", children: st.value }), _jsx("div", { className: "text-xs text-organic-accent-2-700", children: st.trend })] }, st.label))) }), _jsxs("div", { className: "grid grid-cols-[1.6fr_1fr] gap-4", children: [_jsxs("div", { className: "bg-organic-surface rounded-organic-card p-[22px] shadow-organic-sm", children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsx("h3", { className: "text-lg font-heading", children: "Monthly recurring revenue" }), _jsx("span", { className: "text-xs text-organic-neutral-500", children: "Last 8 months" })] }), _jsxs("svg", { viewBox: "0 0 560 200", className: "w-full h-[200px]", children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "platformMrr", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0", stopColor: "#5262ad", stopOpacity: "0.28" }), _jsx("stop", { offset: "1", stopColor: "#5262ad", stopOpacity: "0" })] }) }), _jsx("path", { d: "M0,160 L80,150 L160,138 L240,120 L320,96 L400,84 L480,58 L560,40 L560,200 L0,200 Z", fill: "url(#platformMrr)" }), _jsx("path", { d: "M0,160 L80,150 L160,138 L240,120 L320,96 L400,84 L480,58 L560,40", fill: "none", stroke: "#5262ad", strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" })] })] }), _jsxs("div", { className: "bg-organic-surface rounded-organic-card p-[22px] shadow-organic-sm", children: [_jsx("h3", { className: "text-lg font-heading mb-3.5", children: "Plan mix" }), _jsx("div", { className: "flex flex-col gap-3.5", children: PLAN_MIX.map((p) => (_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between text-[13px] mb-1.5", children: [_jsx("span", { className: "font-semibold", children: p.name }), _jsxs("span", { className: "text-organic-neutral-700", children: [p.count, " clinics"] })] }), _jsx("div", { className: "h-2 rounded-organic-pill bg-organic-neutral-200 overflow-hidden", children: _jsx("div", { className: `h-full ${p.bar}`, style: { width: `${p.pct}%` } }) })] }, p.name))) })] })] })] }));
}
// ─── Tenants ────────────────────────────────────────────────────────────────
const TENANTS = [
    { name: 'Cedar & Sage Psychology', initials: 'CS', plan: 'Professional', seats: '9 / 12', mrr: '$891', status: 'Active' },
    { name: 'Northlight Wellness', initials: 'NW', plan: 'Enterprise', seats: '48', mrr: '$4,200', status: 'Active' },
    { name: 'Harbor Mind Clinic', initials: 'HM', plan: 'Basic', seats: '4 / 5', mrr: '$196', status: 'Active' },
    { name: 'Meridian Therapy Group', initials: 'MT', plan: 'Professional', seats: '14 / 20', mrr: '$1,386', status: 'Active' },
    { name: 'Willow Counselling', initials: 'WC', plan: 'Basic', seats: '3 / 5', mrr: '$147', status: 'Trial' },
    { name: 'Aster Behavioral Health', initials: 'AB', plan: 'Professional', seats: '7 / 12', mrr: '$0', status: 'Past due' },
];
const PLAN_STYLE = {
    Basic: 'bg-organic-neutral-200 text-organic-neutral-700',
    Professional: 'bg-organic-accent-200 text-organic-accent-800',
    Enterprise: 'bg-organic-accent-2-200 text-organic-accent-2-800',
};
const STATUS_DOT = {
    Active: 'bg-organic-accent-2-600',
    Trial: 'bg-organic-accent-600',
    'Past due': 'bg-organic-danger',
};
function TenantsView() {
    return (_jsx("div", { className: "bg-organic-surface rounded-organic-card px-[22px] pt-2 pb-4 shadow-organic-sm", children: _jsxs("table", { className: "w-full border-collapse text-sm", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "text-left text-[11px] tracking-wide uppercase text-organic-neutral-600 px-2 py-3.5 border-b border-organic-neutral-300/60", children: "Clinic" }), _jsx("th", { className: "text-left text-[11px] tracking-wide uppercase text-organic-neutral-600 px-2 py-3.5 border-b border-organic-neutral-300/60", children: "Plan" }), _jsx("th", { className: "text-left text-[11px] tracking-wide uppercase text-organic-neutral-600 px-2 py-3.5 border-b border-organic-neutral-300/60", children: "Seats" }), _jsx("th", { className: "text-left text-[11px] tracking-wide uppercase text-organic-neutral-600 px-2 py-3.5 border-b border-organic-neutral-300/60", children: "MRR" }), _jsx("th", { className: "text-left text-[11px] tracking-wide uppercase text-organic-neutral-600 px-2 py-3.5 border-b border-organic-neutral-300/60", children: "Status" })] }) }), _jsx("tbody", { children: TENANTS.map((t) => (_jsxs("tr", { className: "cursor-pointer", children: [_jsx("td", { className: "px-2 py-3.5 border-b border-organic-text/[0.08]", children: _jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("div", { className: "w-[34px] h-[34px] rounded-organic-tile bg-organic-accent-2-200 grid place-items-center text-xs font-bold text-organic-accent-2-800", children: t.initials }), _jsx("span", { className: "font-semibold", children: t.name })] }) }), _jsx("td", { className: "px-2 py-3.5 border-b border-organic-text/[0.08]", children: _jsx("span", { className: `text-[11px] font-semibold px-2.5 py-0.5 rounded-organic-pill ${PLAN_STYLE[t.plan]}`, children: t.plan }) }), _jsx("td", { className: "px-2 py-3.5 border-b border-organic-text/[0.08] text-organic-neutral-700", children: t.seats }), _jsx("td", { className: "px-2 py-3.5 border-b border-organic-text/[0.08] font-semibold", children: t.mrr }), _jsx("td", { className: "px-2 py-3.5 border-b border-organic-text/[0.08]", children: _jsxs("span", { className: "inline-flex items-center gap-1.5 text-[12.5px]", children: [_jsx("span", { className: `w-2 h-2 rounded-full ${STATUS_DOT[t.status]}` }), t.status] }) })] }, t.name))) })] }) }));
}
// ─── Plans ──────────────────────────────────────────────────────────────────
const PLANS = [
    { name: 'Basic', price: '$49', per: '/seat · mo', border: 'border-organic-neutral-300/60', clinics: 21, mrr: '$8.2k', feats: ['Up to 5 clinicians', 'Core assessments', '2 GB storage', 'Email support'] },
    { name: 'Professional', price: '$99', per: '/seat · mo', border: 'border-organic-accent', clinics: 22, mrr: '$38.1k', feats: ['Unlimited clinicians', 'Full catalog', '50 GB storage', 'AI assistant', 'Priority support'] },
    { name: 'Enterprise', price: 'Custom', per: 'annual', border: 'border-organic-accent-2', clinics: 5, mrr: '$16.1k', feats: ['SSO & audit exports', 'Dedicated storage', 'Custom assessments', 'HIPAA BAA', 'Success manager'] },
];
function PlansView() {
    return (_jsx("div", { className: "grid grid-cols-3 gap-4", children: PLANS.map((pl) => (_jsxs("div", { className: `rounded-organic-card p-6 shadow-organic-sm bg-organic-surface border-2 ${pl.border} flex flex-col`, children: [_jsxs("div", { className: "flex justify-between items-center mb-2", children: [_jsx("div", { className: "font-heading text-xl", children: pl.name }), _jsx(Pencil, { size: 15, className: "text-organic-neutral-500" })] }), _jsxs("div", { className: "flex items-baseline gap-1.5 mb-4", children: [_jsx("span", { className: "font-heading text-[34px] text-organic-accent-700", children: pl.price }), _jsx("span", { className: "text-xs text-organic-neutral-500", children: pl.per })] }), _jsx("div", { className: "flex flex-col gap-2.5 flex-1 mb-[18px]", children: pl.feats.map((f) => (_jsxs("div", { className: "flex items-center gap-2 text-[13px] text-organic-neutral-800", children: [_jsx(Check, { size: 15, className: "text-organic-accent-2-600 flex-none" }), " ", f] }, f))) }), _jsxs("div", { className: "flex justify-between text-xs text-organic-neutral-600 pt-3.5 border-t border-organic-neutral-300/50", children: [_jsxs("span", { children: [pl.clinics, " clinics"] }), _jsxs("span", { children: [pl.mrr, " MRR"] })] })] }, pl.name))) }));
}
// ─── Catalog ────────────────────────────────────────────────────────────────
const CATALOG = [
    { name: 'PHQ-9', desc: 'Depression severity screen', tier: 'Free', deployed: 48, version: 3 },
    { name: 'GAD-7', desc: 'Generalized anxiety screen', tier: 'Free', deployed: 47, version: 2 },
    { name: 'ACE', desc: 'Adverse childhood experiences', tier: 'Pro', deployed: 31, version: 1 },
    { name: 'PCL-5', desc: 'PTSD checklist (DSM-5)', tier: 'Licensed', deployed: 12, version: 2 },
    { name: 'Big Five (short)', desc: 'Personality inventory', tier: 'Pro', deployed: 26, version: 4 },
    { name: 'SCID-II', desc: 'Structured clinical interview', tier: 'Licensed', deployed: 8, version: 1 },
];
const TIER_STYLE = {
    Free: 'bg-organic-neutral-200 text-organic-neutral-700',
    Pro: 'bg-organic-accent-200 text-organic-accent-800',
    Licensed: 'bg-organic-accent-2-200 text-organic-accent-2-800',
};
function CatalogView() {
    return (_jsxs("div", { children: [_jsxs("div", { className: "flex gap-2 mb-4", children: [_jsx("span", { className: "text-xs px-3.5 py-1.5 rounded-organic-pill bg-organic-accent text-organic-accent-100 font-semibold", children: "Assessments" }), _jsx("span", { className: "text-xs px-3.5 py-1.5 rounded-organic-pill bg-organic-surface text-organic-neutral-700 border border-organic-neutral-300/60", children: "Content packs" }), _jsx("span", { className: "text-xs px-3.5 py-1.5 rounded-organic-pill bg-organic-surface text-organic-neutral-700 border border-organic-neutral-300/60", children: "AI flows" })] }), _jsx("div", { className: "grid gap-4", style: { gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }, children: CATALOG.map((c) => (_jsxs("div", { className: "bg-organic-surface rounded-organic-card p-5 shadow-organic-sm flex flex-col gap-3.5", children: [_jsxs("div", { className: "flex justify-between items-start", children: [_jsx("div", { className: "w-[46px] h-[46px] rounded-organic-tile bg-organic-accent-100 grid place-items-center", children: _jsx(ClipboardList, { size: 22, className: "text-organic-accent-700" }) }), _jsx("span", { className: `text-[10.5px] px-2.5 py-0.5 rounded-organic-pill ${TIER_STYLE[c.tier]}`, children: c.tier })] }), _jsxs("div", { children: [_jsx("div", { className: "font-bold text-[15px]", children: c.name }), _jsx("div", { className: "text-xs text-organic-neutral-600 mt-1", children: c.desc })] }), _jsxs("div", { className: "flex justify-between items-center pt-3 border-t border-organic-neutral-300/50 text-xs text-organic-neutral-700", children: [_jsxs("span", { children: [c.deployed, " clinics"] }), _jsxs("span", { className: "font-semibold", children: ["v", c.version] })] })] }, c.name))) })] }));
}
