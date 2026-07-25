import React from 'react'

// Card
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-organic-surface rounded-organic-card p-6 shadow-organic-md border border-organic-neutral-200/30 ${className}`}>
      {children}
    </div>
  )
}

// Button
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  children: React.ReactNode
}

export function Button({ variant = 'primary', children, className = '', ...props }: ButtonProps) {
  const baseClass = 'rounded-organic-pill px-6 py-2.5 font-medium transition-colors text-sm'
  const variants = {
    primary: 'bg-organic-accent text-orange-50 hover:bg-organic-accent-600 active:bg-organic-accent-700',
    secondary: 'border border-organic-neutral-400 bg-transparent hover:bg-organic-neutral-100 text-organic-text',
  }
  return (
    <button className={`${baseClass} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

// Badge/Pill
interface BadgeProps {
  children: React.ReactNode
  variant?: 'neutral' | 'accent' | 'sage' | 'danger'
  className?: string
}

export function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  const variants = {
    neutral: 'bg-organic-neutral-200 text-organic-neutral-800',
    accent: 'bg-organic-accent-200 text-organic-accent-800',
    sage: 'bg-organic-accent-2-200 text-organic-accent-2-800',
    danger: 'bg-red-100 text-organic-danger',
  }
  return (
    <span className={`rounded-organic-pill px-3 py-1 text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}

// Stat Card
interface StatCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  trend?: { direction: 'up' | 'down'; percent: number }
}

export function StatCard({ label, value, icon, trend }: StatCardProps) {
  return (
    <Card className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-xs text-organic-neutral-600 uppercase tracking-wide mb-2">{label}</p>
        <p className="text-4xl font-heading text-organic-text mb-1">{value}</p>
        {trend && (
          <p className={`text-xs ${trend.direction === 'up' ? 'text-organic-accent-2-700' : 'text-organic-accent-700'}`}>
            {trend.direction === 'up' ? '↑' : '↓'} {trend.percent}%
          </p>
        )}
      </div>
      {icon && <div className="text-organic-accent text-3xl">{icon}</div>}
    </Card>
  )
}

// Input
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-organic-text mb-2">{label}</label>}
      <input
        className={`w-full bg-organic-neutral-100 border border-organic-neutral-300 rounded-organic-pill px-4 py-2.5 text-organic-text placeholder-organic-neutral-500 focus:outline-none focus:ring-2 focus:ring-organic-accent focus:ring-offset-2 ${className}`}
        {...props}
      />
    </div>
  )
}

// Select
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}

export function Select({ label, options, className = '', ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-organic-text mb-2">{label}</label>}
      <select
        className={`w-full bg-organic-neutral-100 border border-organic-neutral-300 rounded-organic-pill px-4 py-2.5 text-organic-text focus:outline-none focus:ring-2 focus:ring-organic-accent ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// Segmented Control
interface SegmentedControlProps {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}

export function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  return (
    <div className="inline-flex gap-1 bg-organic-neutral-200 rounded-organic-pill p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-4 py-2 rounded-organic-pill text-sm font-medium transition-colors ${
            value === opt.value
              ? 'bg-organic-accent text-orange-50'
              : 'text-organic-neutral-700 hover:text-organic-text'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// Table
interface TableProps {
  headers: string[]
  rows: (string | React.ReactNode)[][]
  className?: string
}

export function Table({ headers, rows, className = '' }: TableProps) {
  return (
    <Card className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-organic-neutral-200">
            {headers.map((h, i) => (
              <th key={i} className="text-left px-4 py-3 font-semibold text-organic-neutral-700 text-xs uppercase">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-organic-neutral-100 hover:bg-organic-neutral-100/50 transition">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-organic-text">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

// Avatar
interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
  initials?: string
}

export function Avatar({ name, size = 'md', initials }: AvatarProps) {
  const sizeClass = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg',
  }
  const initial = initials || name.split(' ').map((n) => n[0]).join('')
  return (
    <div className={`${sizeClass[size]} rounded-full bg-gradient-accent text-orange-50 flex items-center justify-center font-semibold`}>
      {initial}
    </div>
  )
}

// Progress Bar
interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  variant?: 'accent' | 'sage'
}

export function ProgressBar({ value, max = 100, label, variant = 'accent' }: ProgressBarProps) {
  const percent = (value / max) * 100
  const colorClass = variant === 'accent' ? 'bg-organic-accent' : 'bg-organic-accent-2'
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between mb-1">
          <p className="text-sm font-medium text-organic-text">{label}</p>
          <p className="text-sm text-organic-neutral-600">
            {value}/{max}
          </p>
        </div>
      )}
      <div className="w-full bg-organic-neutral-200 rounded-organic-pill h-2 overflow-hidden">
        <div className={`${colorClass} h-full transition-all`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

// Gradient Card (for hero sections)
interface GradientCardProps {
  children: React.ReactNode
  variant?: 'accent' | 'sage'
  className?: string
}

export function GradientCard({ children, variant = 'accent', className = '' }: GradientCardProps) {
  const gradientClass = variant === 'accent' ? 'gradient-accent' : 'gradient-sage'
  return (
    <div className={`bg-${gradientClass} text-white rounded-organic-card p-6 shadow-organic-lg ${className}`}>
      {children}
    </div>
  )
}
