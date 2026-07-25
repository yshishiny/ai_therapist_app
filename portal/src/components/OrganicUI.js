import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Card({ children, className = '', ...props }) {
    return (_jsx("div", { className: `bg-organic-surface rounded-organic-card p-6 shadow-organic-md border border-organic-neutral-200/30 ${className}`, ...props, children: children }));
}
export function Button({ variant = 'primary', children, className = '', ...props }) {
    const baseClass = 'rounded-organic-pill px-6 py-2.5 font-medium transition-colors text-sm';
    const variants = {
        primary: 'bg-organic-accent text-orange-50 hover:bg-organic-accent-600 active:bg-organic-accent-700',
        secondary: 'border border-organic-neutral-400 bg-transparent hover:bg-organic-neutral-100 text-organic-text',
    };
    return (_jsx("button", { className: `${baseClass} ${variants[variant]} ${className}`, ...props, children: children }));
}
export function Badge({ children, variant = 'neutral', className = '' }) {
    const variants = {
        neutral: 'bg-organic-neutral-200 text-organic-neutral-800',
        accent: 'bg-organic-accent-200 text-organic-accent-800',
        sage: 'bg-organic-accent-2-200 text-organic-accent-2-800',
        danger: 'bg-red-100 text-organic-danger',
    };
    return (_jsx("span", { className: `rounded-organic-pill px-3 py-1 text-xs font-medium ${variants[variant]} ${className}`, children: children }));
}
export function StatCard({ label, value, icon, trend }) {
    return (_jsxs(Card, { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-xs text-organic-neutral-600 uppercase tracking-wide mb-2", children: label }), _jsx("p", { className: "text-4xl font-heading text-organic-text mb-1", children: value }), trend && (_jsxs("p", { className: `text-xs ${trend.direction === 'up' ? 'text-organic-accent-2-700' : 'text-organic-accent-700'}`, children: [trend.direction === 'up' ? '↑' : '↓', " ", trend.percent, "%"] }))] }), icon && _jsx("div", { className: "text-organic-accent text-3xl", children: icon })] }));
}
export function Input({ label, className = '', ...props }) {
    return (_jsxs("div", { className: "w-full", children: [label && _jsx("label", { className: "block text-sm font-medium text-organic-text mb-2", children: label }), _jsx("input", { className: `w-full bg-organic-neutral-100 border border-organic-neutral-300 rounded-organic-pill px-4 py-2.5 text-organic-text placeholder-organic-neutral-500 focus:outline-none focus:ring-2 focus:ring-organic-accent focus:ring-offset-2 ${className}`, ...props })] }));
}
export function Select({ label, options, className = '', ...props }) {
    return (_jsxs("div", { className: "w-full", children: [label && _jsx("label", { className: "block text-sm font-medium text-organic-text mb-2", children: label }), _jsx("select", { className: `w-full bg-organic-neutral-100 border border-organic-neutral-300 rounded-organic-pill px-4 py-2.5 text-organic-text focus:outline-none focus:ring-2 focus:ring-organic-accent ${className}`, ...props, children: options.map((opt) => (_jsx("option", { value: opt.value, children: opt.label }, opt.value))) })] }));
}
export function SegmentedControl({ options, value, onChange }) {
    return (_jsx("div", { className: "inline-flex gap-1 bg-organic-neutral-200 rounded-organic-pill p-1", children: options.map((opt) => (_jsx("button", { onClick: () => onChange(opt.value), className: `px-4 py-2 rounded-organic-pill text-sm font-medium transition-colors ${value === opt.value
                ? 'bg-organic-accent text-orange-50'
                : 'text-organic-neutral-700 hover:text-organic-text'}`, children: opt.label }, opt.value))) }));
}
export function Table({ headers, rows, className = '' }) {
    return (_jsx(Card, { className: `overflow-x-auto ${className}`, children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsx("tr", { className: "border-b border-organic-neutral-200", children: headers.map((h, i) => (_jsx("th", { className: "text-left px-4 py-3 font-semibold text-organic-neutral-700 text-xs uppercase", children: h }, i))) }) }), _jsx("tbody", { children: rows.map((row, i) => (_jsx("tr", { className: "border-b border-organic-neutral-100 hover:bg-organic-neutral-100/50 transition", children: row.map((cell, j) => (_jsx("td", { className: "px-4 py-3 text-organic-text", children: cell }, j))) }, i))) })] }) }));
}
export function Avatar({ name, size = 'md', initials }) {
    const sizeClass = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-12 h-12 text-sm',
        lg: 'w-16 h-16 text-lg',
    };
    const initial = initials || name.split(' ').map((n) => n[0]).join('');
    return (_jsx("div", { className: `${sizeClass[size]} rounded-full bg-gradient-accent text-orange-50 flex items-center justify-center font-semibold`, children: initial }));
}
export function ProgressBar({ value, max = 100, label, variant = 'accent' }) {
    const percent = (value / max) * 100;
    const colorClass = variant === 'accent' ? 'bg-organic-accent' : 'bg-organic-accent-2';
    return (_jsxs("div", { className: "w-full", children: [label && (_jsxs("div", { className: "flex justify-between mb-1", children: [_jsx("p", { className: "text-sm font-medium text-organic-text", children: label }), _jsxs("p", { className: "text-sm text-organic-neutral-600", children: [value, "/", max] })] })), _jsx("div", { className: "w-full bg-organic-neutral-200 rounded-organic-pill h-2 overflow-hidden", children: _jsx("div", { className: `${colorClass} h-full transition-all`, style: { width: `${percent}%` } }) })] }));
}
export function GradientCard({ children, variant = 'accent', className = '' }) {
    const gradientClass = variant === 'accent' ? 'gradient-accent' : 'gradient-sage';
    return (_jsx("div", { className: `bg-${gradientClass} text-white rounded-organic-card p-6 shadow-organic-lg ${className}`, children: children }));
}
