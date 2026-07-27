import { useState } from 'react'
import {
  Brain,
  Plus,
  LayoutDashboard,
  Building2,
  Tag,
  LibraryBig,
  TrendingUp,
  Stethoscope,
  Sparkles,
  Pencil,
  Check,
  ClipboardList,
} from 'lucide-react'

type View = 'overview' | 'tenants' | 'plans' | 'catalog'

const NAV_ITEMS: { view: View; label: string; icon: typeof LayoutDashboard }[] = [
  { view: 'overview', label: 'Overview', icon: LayoutDashboard },
  { view: 'tenants', label: 'Tenants', icon: Building2 },
  { view: 'plans', label: 'Plans & Pricing', icon: Tag },
  { view: 'catalog', label: 'Global Catalog', icon: LibraryBig },
]

const TITLES: Record<View, string> = {
  overview: 'Platform overview',
  tenants: 'Tenants',
  plans: 'Plans & pricing',
  catalog: 'Global catalog',
}
const SUBTITLES: Record<View, string> = {
  overview: 'AI Therapist Platform · all clinics',
  tenants: '48 active clinics · 3 in trial',
  plans: 'Subscription tiers and feature gating',
  catalog: 'Assessments & content available to tenants',
}
const CTAS: Record<View, string> = {
  overview: 'Export report',
  tenants: 'Add tenant',
  plans: 'New plan',
  catalog: 'Publish item',
}

export default function PlatformAdminPortal() {
  const [view, setView] = useState<View>('overview')

  return (
    <div className="flex min-h-screen items-stretch bg-organic-bg">
      <aside className="flex-none w-[250px] bg-organic-neutral-900 text-organic-neutral-200 py-[22px] px-4 flex flex-col gap-1.5 sticky top-0 h-screen">
        <div className="flex items-center gap-2.5 px-2 pb-5">
          <div className="w-[38px] h-[38px] rounded-organic-tile bg-organic-accent grid place-items-center text-organic-accent-100">
            <Brain size={20} />
          </div>
          <div className="leading-tight">
            <div className="font-heading text-base text-organic-neutral-100">AI Therapist</div>
            <div className="text-[11px] text-organic-neutral-500">Platform console</div>
          </div>
        </div>

        {NAV_ITEMS.map(({ view: v, label, icon: Icon }) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-organic-tile text-[14.5px] transition-colors text-left ${
              v === view ? 'bg-organic-accent text-organic-neutral-100 font-bold' : 'text-organic-neutral-300 font-semibold hover:bg-white/5'
            }`}
          >
            <Icon size={19} />
            {label}
          </button>
        ))}

        <div className="mt-auto flex items-center gap-2.5 pt-2.5 px-2 border-t border-white/10">
          <div className="w-[34px] h-[34px] rounded-full bg-organic-accent-500 grid place-items-center font-bold text-xs text-organic-accent-100">YS</div>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold text-organic-neutral-100">Y. Shishiny</div>
            <div className="text-[11px] text-organic-neutral-500">Platform owner</div>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 px-9 pt-8 pb-16 max-w-[1240px]">
        <header className="flex justify-between items-end gap-5 flex-wrap mb-7">
          <div>
            <h1 className="text-[34px] font-heading text-organic-text mb-1">{TITLES[view]}</h1>
            <p className="text-organic-neutral-600 text-sm">{SUBTITLES[view]}</p>
          </div>
          <button className="rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-sm px-5 py-2.5 inline-flex items-center gap-2">
            <Plus size={16} /> {CTAS[view]}
          </button>
        </header>

        {view === 'overview' && <OverviewView />}
        {view === 'tenants' && <TenantsView />}
        {view === 'plans' && <PlansView />}
        {view === 'catalog' && <CatalogView />}
      </main>
    </div>
  )
}

// ─── Overview ───────────────────────────────────────────────────────────────

const STATS = [
  { label: 'Active clinics', value: '48', trend: '+6 this month', icon: Building2 },
  { label: 'MRR', value: '$62.4k', trend: '+14% MoM', icon: TrendingUp },
  { label: 'Total clinicians', value: '412', trend: '+38 this month', icon: Stethoscope },
  { label: 'AI messages / mo', value: '1.9M', trend: '+22%', icon: Sparkles },
]

const PLAN_MIX = [
  { name: 'Basic', count: 21, pct: 44, bar: 'bg-organic-neutral-400' },
  { name: 'Professional', count: 22, pct: 46, bar: 'bg-organic-accent-500' },
  { name: 'Enterprise', count: 5, pct: 10, bar: 'bg-organic-accent-2-500' },
]

function OverviewView() {
  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-4">
        {STATS.map((st) => (
          <div key={st.label} className="bg-organic-surface rounded-organic-card p-[18px] shadow-organic-sm">
            <div className="flex justify-between items-start">
              <span className="text-xs text-organic-neutral-600">{st.label}</span>
              <st.icon size={17} className="text-organic-accent-500" />
            </div>
            <div className="font-heading text-[34px] my-1.5">{st.value}</div>
            <div className="text-xs text-organic-accent-2-700">{st.trend}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[1.6fr_1fr] gap-4">
        <div className="bg-organic-surface rounded-organic-card p-[22px] shadow-organic-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-heading">Monthly recurring revenue</h3>
            <span className="text-xs text-organic-neutral-500">Last 8 months</span>
          </div>
          <svg viewBox="0 0 560 200" className="w-full h-[200px]">
            <defs>
              <linearGradient id="platformMrr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#5262ad" stopOpacity="0.28" />
                <stop offset="1" stopColor="#5262ad" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,160 L80,150 L160,138 L240,120 L320,96 L400,84 L480,58 L560,40 L560,200 L0,200 Z" fill="url(#platformMrr)" />
            <path d="M0,160 L80,150 L160,138 L240,120 L320,96 L400,84 L480,58 L560,40" fill="none" stroke="#5262ad" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="bg-organic-surface rounded-organic-card p-[22px] shadow-organic-sm">
          <h3 className="text-lg font-heading mb-3.5">Plan mix</h3>
          <div className="flex flex-col gap-3.5">
            {PLAN_MIX.map((p) => (
              <div key={p.name}>
                <div className="flex justify-between text-[13px] mb-1.5">
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-organic-neutral-700">{p.count} clinics</span>
                </div>
                <div className="h-2 rounded-organic-pill bg-organic-neutral-200 overflow-hidden">
                  <div className={`h-full ${p.bar}`} style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tenants ────────────────────────────────────────────────────────────────

const TENANTS = [
  { name: 'Cedar & Sage Psychology', initials: 'CS', plan: 'Professional', seats: '9 / 12', mrr: '$891', status: 'Active' },
  { name: 'Northlight Wellness', initials: 'NW', plan: 'Enterprise', seats: '48', mrr: '$4,200', status: 'Active' },
  { name: 'Harbor Mind Clinic', initials: 'HM', plan: 'Basic', seats: '4 / 5', mrr: '$196', status: 'Active' },
  { name: 'Meridian Therapy Group', initials: 'MT', plan: 'Professional', seats: '14 / 20', mrr: '$1,386', status: 'Active' },
  { name: 'Willow Counselling', initials: 'WC', plan: 'Basic', seats: '3 / 5', mrr: '$147', status: 'Trial' },
  { name: 'Aster Behavioral Health', initials: 'AB', plan: 'Professional', seats: '7 / 12', mrr: '$0', status: 'Past due' },
]

const PLAN_STYLE: Record<string, string> = {
  Basic: 'bg-organic-neutral-200 text-organic-neutral-700',
  Professional: 'bg-organic-accent-200 text-organic-accent-800',
  Enterprise: 'bg-organic-accent-2-200 text-organic-accent-2-800',
}
const STATUS_DOT: Record<string, string> = {
  Active: 'bg-organic-accent-2-600',
  Trial: 'bg-organic-accent-600',
  'Past due': 'bg-organic-danger',
}

function TenantsView() {
  return (
    <div className="bg-organic-surface rounded-organic-card px-[22px] pt-2 pb-4 shadow-organic-sm">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="text-left text-[11px] tracking-wide uppercase text-organic-neutral-600 px-2 py-3.5 border-b border-organic-neutral-300/60">Clinic</th>
            <th className="text-left text-[11px] tracking-wide uppercase text-organic-neutral-600 px-2 py-3.5 border-b border-organic-neutral-300/60">Plan</th>
            <th className="text-left text-[11px] tracking-wide uppercase text-organic-neutral-600 px-2 py-3.5 border-b border-organic-neutral-300/60">Seats</th>
            <th className="text-left text-[11px] tracking-wide uppercase text-organic-neutral-600 px-2 py-3.5 border-b border-organic-neutral-300/60">MRR</th>
            <th className="text-left text-[11px] tracking-wide uppercase text-organic-neutral-600 px-2 py-3.5 border-b border-organic-neutral-300/60">Status</th>
          </tr>
        </thead>
        <tbody>
          {TENANTS.map((t) => (
            <tr key={t.name} className="cursor-pointer">
              <td className="px-2 py-3.5 border-b border-organic-text/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="w-[34px] h-[34px] rounded-organic-tile bg-organic-accent-2-200 grid place-items-center text-xs font-bold text-organic-accent-2-800">{t.initials}</div>
                  <span className="font-semibold">{t.name}</span>
                </div>
              </td>
              <td className="px-2 py-3.5 border-b border-organic-text/[0.08]">
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-organic-pill ${PLAN_STYLE[t.plan]}`}>{t.plan}</span>
              </td>
              <td className="px-2 py-3.5 border-b border-organic-text/[0.08] text-organic-neutral-700">{t.seats}</td>
              <td className="px-2 py-3.5 border-b border-organic-text/[0.08] font-semibold">{t.mrr}</td>
              <td className="px-2 py-3.5 border-b border-organic-text/[0.08]">
                <span className="inline-flex items-center gap-1.5 text-[12.5px]">
                  <span className={`w-2 h-2 rounded-full ${STATUS_DOT[t.status]}`} />
                  {t.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Plans ──────────────────────────────────────────────────────────────────

const PLANS = [
  { name: 'Basic', price: '$49', per: '/seat · mo', border: 'border-organic-neutral-300/60', clinics: 21, mrr: '$8.2k', feats: ['Up to 5 clinicians', 'Core assessments', '2 GB storage', 'Email support'] },
  { name: 'Professional', price: '$99', per: '/seat · mo', border: 'border-organic-accent', clinics: 22, mrr: '$38.1k', feats: ['Unlimited clinicians', 'Full catalog', '50 GB storage', 'AI assistant', 'Priority support'] },
  { name: 'Enterprise', price: 'Custom', per: 'annual', border: 'border-organic-accent-2', clinics: 5, mrr: '$16.1k', feats: ['SSO & audit exports', 'Dedicated storage', 'Custom assessments', 'HIPAA BAA', 'Success manager'] },
]

function PlansView() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {PLANS.map((pl) => (
        <div key={pl.name} className={`rounded-organic-card p-6 shadow-organic-sm bg-organic-surface border-2 ${pl.border} flex flex-col`}>
          <div className="flex justify-between items-center mb-2">
            <div className="font-heading text-xl">{pl.name}</div>
            <Pencil size={15} className="text-organic-neutral-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mb-4">
            <span className="font-heading text-[34px] text-organic-accent-700">{pl.price}</span>
            <span className="text-xs text-organic-neutral-500">{pl.per}</span>
          </div>
          <div className="flex flex-col gap-2.5 flex-1 mb-[18px]">
            {pl.feats.map((f) => (
              <div key={f} className="flex items-center gap-2 text-[13px] text-organic-neutral-800">
                <Check size={15} className="text-organic-accent-2-600 flex-none" /> {f}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-organic-neutral-600 pt-3.5 border-t border-organic-neutral-300/50">
            <span>{pl.clinics} clinics</span>
            <span>{pl.mrr} MRR</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Catalog ────────────────────────────────────────────────────────────────

const CATALOG = [
  { name: 'PHQ-9', desc: 'Depression severity screen', tier: 'Free', deployed: 48, version: 3 },
  { name: 'GAD-7', desc: 'Generalized anxiety screen', tier: 'Free', deployed: 47, version: 2 },
  { name: 'ACE', desc: 'Adverse childhood experiences', tier: 'Pro', deployed: 31, version: 1 },
  { name: 'PCL-5', desc: 'PTSD checklist (DSM-5)', tier: 'Licensed', deployed: 12, version: 2 },
  { name: 'Big Five (short)', desc: 'Personality inventory', tier: 'Pro', deployed: 26, version: 4 },
  { name: 'SCID-II', desc: 'Structured clinical interview', tier: 'Licensed', deployed: 8, version: 1 },
]

const TIER_STYLE: Record<string, string> = {
  Free: 'bg-organic-neutral-200 text-organic-neutral-700',
  Pro: 'bg-organic-accent-200 text-organic-accent-800',
  Licensed: 'bg-organic-accent-2-200 text-organic-accent-2-800',
}

function CatalogView() {
  return (
    <div>
      <div className="flex gap-2 mb-4">
        <span className="text-xs px-3.5 py-1.5 rounded-organic-pill bg-organic-accent text-organic-accent-100 font-semibold">Assessments</span>
        <span className="text-xs px-3.5 py-1.5 rounded-organic-pill bg-organic-surface text-organic-neutral-700 border border-organic-neutral-300/60">Content packs</span>
        <span className="text-xs px-3.5 py-1.5 rounded-organic-pill bg-organic-surface text-organic-neutral-700 border border-organic-neutral-300/60">AI flows</span>
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {CATALOG.map((c) => (
          <div key={c.name} className="bg-organic-surface rounded-organic-card p-5 shadow-organic-sm flex flex-col gap-3.5">
            <div className="flex justify-between items-start">
              <div className="w-[46px] h-[46px] rounded-organic-tile bg-organic-accent-100 grid place-items-center">
                <ClipboardList size={22} className="text-organic-accent-700" />
              </div>
              <span className={`text-[10.5px] px-2.5 py-0.5 rounded-organic-pill ${TIER_STYLE[c.tier]}`}>{c.tier}</span>
            </div>
            <div>
              <div className="font-bold text-[15px]">{c.name}</div>
              <div className="text-xs text-organic-neutral-600 mt-1">{c.desc}</div>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-organic-neutral-300/50 text-xs text-organic-neutral-700">
              <span>{c.deployed} clinics</span>
              <span className="font-semibold">v{c.version}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
