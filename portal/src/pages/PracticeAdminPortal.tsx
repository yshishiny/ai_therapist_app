import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import apiClient from '../services/api'
import {
  Brain,
  Plus,
  Search,
  Bell,
  LayoutDashboard,
  Stethoscope,
  UsersRound,
  ClipboardList,
  LibraryBig,
  ShieldCheck,
  CreditCard,
  Settings as SettingsIcon,
  LogOut,
  UserPlus,
  Upload,
  AlertTriangle,
  ClipboardCheck,
  FileText,
  AudioLines,
  BookOpen,
  PlayCircle,
  Sparkles,
  FileBadge,
  Folder,
  FolderCheck,
  Pencil,
  Check,
  ArrowLeft,
  Lock,
  Calendar,
  FileEdit,
} from 'lucide-react'

type View = 'dashboard' | 'clinicians' | 'patients' | 'patientDetail' | 'assessments' | 'content' | 'access' | 'billing' | 'settings'
type DashLayout = 'a' | 'b' | 'c'

const NAV_ITEMS: { view: View; label: string; icon: typeof LayoutDashboard }[] = [
  { view: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { view: 'clinicians', label: 'Clinicians', icon: Stethoscope },
  { view: 'patients', label: 'Patients', icon: UsersRound },
  { view: 'assessments', label: 'Assessments', icon: ClipboardList },
  { view: 'content', label: 'Content Library', icon: LibraryBig },
  { view: 'access', label: 'Access Control', icon: ShieldCheck },
  { view: 'billing', label: 'Billing & Plan', icon: CreditCard },
  { view: 'settings', label: 'Settings', icon: SettingsIcon },
]

const TITLES: Record<View, string> = {
  dashboard: 'Practice overview',
  clinicians: 'Clinicians',
  patients: 'Patient registry',
  patientDetail: '',
  assessments: 'Assessment library',
  content: 'Content library',
  access: 'Access control',
  billing: 'Billing & plan',
  settings: 'Settings',
}
const SUBTITLES: Record<View, string> = {
  dashboard: 'Cedar & Sage Psychology · Cairo practice',
  clinicians: '9 clinicians · 2 seats available',
  patients: '128 active patients across the practice',
  patientDetail: '',
  assessments: 'Assign, build and review clinical assessments',
  content: 'IP-controlled resources with signed delivery',
  access: 'Role-based & resource-level permissions',
  billing: 'Professional plan · renews Aug 1, 2026',
  settings: 'Practice profile, notifications and integrations',
}

interface Patient {
  id: string
  name: string
  initials: string
  clinician: string
  last: string
  risk: 'High' | 'Med' | 'Low'
  status: string
  next: string
}

const PATIENTS: Patient[] = [
  { id: 'p1', name: 'Maya Okonkwo', initials: 'MO', clinician: 'Dr. Heba Moustafa', last: '2 days ago', risk: 'High', status: 'In treatment', next: 'Review PHQ-9' },
  { id: 'p2', name: 'Sara Farouk', initials: 'SF', clinician: 'Dr. Omar Nasser', last: 'Yesterday', risk: 'High', status: 'In treatment', next: 'Call scheduled' },
  { id: 'p3', name: 'Diego Alvarez', initials: 'DA', clinician: 'Dr. Heba Moustafa', last: '4 days ago', risk: 'Med', status: 'In treatment', next: 'Assign homework' },
  { id: 'p4', name: 'Lena Petrova', initials: 'LP', clinician: 'Dr. Amina Saleh', last: '1 week ago', risk: 'Low', status: 'Maintenance', next: 'GAD-7 due' },
  { id: 'p5', name: 'Tomas Ruiz', initials: 'TR', clinician: 'Dr. Omar Nasser', last: '3 days ago', risk: 'Low', status: 'Intake', next: 'Complete intake' },
  { id: 'p6', name: 'Grace Kim', initials: 'GK', clinician: 'Dr. Amina Saleh', last: 'Today', risk: 'Med', status: 'In treatment', next: 'Session note' },
]

const RISK_STYLE: Record<Patient['risk'], { color: string; bg: string }> = {
  High: { color: 'text-organic-accent-800', bg: 'bg-organic-accent-200' },
  Med: { color: 'text-organic-accent-2-800', bg: 'bg-organic-accent-2-200' },
  Low: { color: 'text-organic-neutral-700', bg: 'bg-organic-neutral-200' },
}

export default function PracticeAdminPortal() {
  const [view, setView] = useState<View>('dashboard')
  const [dash, setDash] = useState<DashLayout>('a')
  const [patientId, setPatientId] = useState('p1')
  const navigate = useNavigate()
  const { logout } = useAuthStore()

  const openPatient = (id: string) => {
    setPatientId(id)
    setView('patientDetail')
  }

  const patient = PATIENTS.find((p) => p.id === patientId) || PATIENTS[0]
  const title = view === 'patientDetail' ? patient.name : TITLES[view]
  const subtitle = view === 'patientDetail' ? `${patient.status} · Primary: ${patient.clinician}` : SUBTITLES[view]

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen items-stretch bg-organic-bg">
      <aside className="flex-none w-[258px] bg-organic-neutral-100 border-r border-organic-neutral-300/50 py-[22px] px-4 flex flex-col gap-1.5 sticky top-0 h-screen">
        <div className="flex items-center gap-2.5 px-2 pb-5">
          <div className="w-[38px] h-[38px] rounded-full bg-organic-accent grid place-items-center text-organic-accent-100">
            <Brain size={20} />
          </div>
          <div className="leading-tight">
            <div className="font-heading text-[17px] text-organic-text">Cedar &amp; Sage</div>
            <div className="text-[11px] text-organic-neutral-600">Practice admin</div>
          </div>
        </div>

        {NAV_ITEMS.map(({ view: v, label, icon: Icon }) => {
          const active = v === view || (v === 'patients' && view === 'patientDetail')
          return (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-organic-pill text-[14.5px] transition-colors text-left ${
                active ? 'bg-organic-accent text-organic-neutral-100 font-bold' : 'text-organic-neutral-800 font-semibold hover:bg-organic-neutral-200'
              }`}
            >
              <Icon size={19} />
              {label}
            </button>
          )
        })}

        <div className="my-1.5 border-t border-organic-neutral-300/50" />
        <button
          onClick={() => navigate('/workspace')}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-organic-pill text-[14.5px] transition-colors text-left text-organic-accent-700 font-semibold hover:bg-organic-neutral-200"
        >
          <Stethoscope size={19} />
          Clinical Workspace
        </button>

        <div className="mt-auto p-3 bg-organic-accent-2-100 rounded-organic-tile">
          <div className="text-xs text-organic-accent-2-800 font-semibold mb-1">Professional plan</div>
          <div className="text-[11px] text-organic-accent-2-700 leading-tight">9 / 12 seats used</div>
          <div className="h-1.5 rounded-organic-pill bg-organic-accent-2-200 mt-2 overflow-hidden">
            <div className="w-3/4 h-full bg-organic-accent-2-500" />
          </div>
        </div>
        <div className="flex items-center gap-2.5 p-2 border-t border-organic-neutral-300/50 mt-1">
          <div className="w-[34px] h-[34px] rounded-full bg-organic-accent-300 grid place-items-center font-bold text-organic-accent-900 text-[13px]">HM</div>
          <div className="leading-tight flex-1 min-w-0">
            <div className="text-[13px] font-semibold truncate">Dr. Heba Moustafa</div>
            <div className="text-[11px] text-organic-neutral-600">Director</div>
          </div>
          <button onClick={handleLogout} title="Log out">
            <LogOut size={17} className="text-organic-neutral-600" />
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 px-9 pt-8 pb-16 max-w-[1240px]">
        <header className="flex justify-between items-end gap-5 flex-wrap mb-7">
          <div>
            <h1 className="text-[34px] font-heading text-organic-text mb-1">{title}</h1>
            <p className="text-organic-neutral-600 text-sm">{subtitle}</p>
          </div>
          <div className="flex gap-2.5 items-center">
            <div className="flex items-center gap-2 bg-organic-surface border border-organic-neutral-300/60 rounded-organic-pill px-3.5 py-2 min-w-[200px]">
              <Search size={16} className="text-organic-neutral-500" />
              <span className="text-sm text-organic-neutral-500">Search patients, notes…</span>
            </div>
            <button className="w-[42px] h-[42px] rounded-full border border-organic-neutral-300/60 bg-organic-surface grid place-items-center relative">
              <Bell size={18} />
              <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-organic-accent" />
            </button>
          </div>
        </header>

        {view === 'dashboard' && <DashboardView dash={dash} setDash={setDash} onOpenPatient={openPatient} />}
        {view === 'clinicians' && <CliniciansView />}
        {view === 'patients' && <PatientsView onOpenPatient={openPatient} />}
        {view === 'patientDetail' && <PatientDetailView patient={patient} onBack={() => setView('patients')} />}
        {view === 'assessments' && <AssessmentsView />}
        {view === 'content' && <ContentView />}
        {view === 'access' && <AccessView />}
        {view === 'billing' && <BillingView />}
        {view === 'settings' && <SettingsView />}
      </main>
    </div>
  )
}

// ─── Dashboard (3 layout variants) ─────────────────────────────────────────

const STATS = [
  { label: 'Active patients', value: '128', trend: '+12 this month', icon: UsersRound },
  { label: 'Clinicians', value: '9', trend: '2 seats open', icon: Stethoscope },
  { label: 'Open risk alerts', value: '3', trend: 'Needs attention', icon: AlertTriangle },
  { label: 'Assessment yield', value: '94%', trend: '+7% vs last mo', icon: ClipboardCheck },
]

const ALERTS = [
  { name: 'M. Okonkwo', detail: 'PHQ-9 item 9 elevated (suicidal ideation)', time: '12m' },
  { name: 'S. Farouk', detail: 'GAD-7 spike to 19 — severe anxiety', time: '2h' },
  { name: 'D. Alvarez', detail: 'Missed 2 consecutive homework tasks', time: '5h', med: true },
]

function DashboardView({ dash, setDash, onOpenPatient }: { dash: DashLayout; setDash: (d: DashLayout) => void; onOpenPatient: (id: string) => void }) {
  return (
    <div>
      <div className="flex justify-between items-center flex-wrap gap-3 mb-5">
        <div className="inline-flex bg-organic-neutral-100 border border-organic-neutral-300/60 rounded-organic-pill p-1">
          {(['a', 'b', 'c'] as DashLayout[]).map((k) => (
            <button
              key={k}
              onClick={() => setDash(k)}
              className={`font-heading text-[13px] px-[18px] py-2 rounded-organic-pill ${dash === k ? 'bg-organic-accent text-organic-neutral-100' : 'text-organic-neutral-700'}`}
            >
              {k === 'a' ? 'Analytics' : k === 'b' ? 'Welcome' : 'Bento'}
            </button>
          ))}
        </div>
        <span className="text-xs text-organic-neutral-500">Three layout directions for the overview</span>
      </div>

      {dash === 'a' && <DashboardAnalytics onOpenPatient={onOpenPatient} />}
      {dash === 'b' && <DashboardWelcome onOpenPatient={onOpenPatient} />}
      {dash === 'c' && <DashboardBento />}
    </div>
  )
}

function DashboardAnalytics({ onOpenPatient }: { onOpenPatient: (id: string) => void }) {
  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-4">
        {STATS.map((st) => (
          <div key={st.label} className="bg-organic-surface rounded-organic-card p-[18px] shadow-organic-sm">
            <div className="flex justify-between items-start">
              <span className="text-xs text-organic-neutral-600">{st.label}</span>
              <st.icon size={17} className="text-organic-accent-500" />
            </div>
            <div className="font-heading text-[36px] my-1.5 text-organic-text">{st.value}</div>
            <div className="text-xs text-organic-accent-2-700">{st.trend}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[1.5fr_1fr] gap-4 mb-4">
        <div className="bg-organic-surface rounded-organic-card p-[22px] shadow-organic-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-heading text-organic-text">Symptom trends</h3>
            <span className="text-xs text-organic-neutral-500">PHQ-9 / GAD-7 practice avg</span>
          </div>
          <svg viewBox="0 0 560 200" className="w-full h-[200px]">
            <defs>
              <linearGradient id="dashTrend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#5262ad" stopOpacity="0.28" />
                <stop offset="1" stopColor="#5262ad" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,70 L80,88 L160,64 L240,96 L320,120 L400,110 L480,140 L560,150 L560,200 L0,200 Z" fill="url(#dashTrend)" />
            <path d="M0,70 L80,88 L160,64 L240,96 L320,120 L400,110 L480,140 L560,150" fill="none" stroke="#5262ad" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            <path d="M0,110 L80,120 L160,100 L240,118 L320,108 L400,130 L480,124 L560,138" fill="none" stroke="#c9903d" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 8" />
          </svg>
          <div className="flex gap-5 mt-2 text-xs text-organic-neutral-600">
            <span className="flex items-center gap-1.5"><span className="w-4 h-[3px] bg-organic-accent rounded-sm" />PHQ-9</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-[3px] bg-organic-accent-2 rounded-sm" />GAD-7</span>
          </div>
        </div>
        <div className="bg-organic-surface rounded-organic-card p-[22px] shadow-organic-sm">
          <h3 className="text-lg font-heading text-organic-text mb-3.5">Risk flags</h3>
          <AlertsList />
        </div>
      </div>
      <div className="bg-organic-surface rounded-organic-card p-[22px] shadow-organic-sm">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-heading text-organic-text">Priority patients</h3>
          <span className="text-sm text-organic-accent-700">View all</span>
        </div>
        <PatientsTable patients={PATIENTS.slice(0, 4)} onOpenPatient={onOpenPatient} showNext />
      </div>
    </div>
  )
}

function DashboardWelcome({ onOpenPatient }: { onOpenPatient: (id: string) => void }) {
  return (
    <div>
      <div className="bg-gradient-to-br from-organic-accent-600 to-organic-accent-800 rounded-[28px] p-9 text-organic-accent-100 flex justify-between items-center gap-6 flex-wrap mb-[18px]">
        <div className="max-w-[520px]">
          <div className="text-[13px] opacity-80 mb-1.5">Thursday, July 24</div>
          <h2 className="text-3xl font-heading text-organic-accent-100 mb-2">Good morning, Dr. Moustafa.</h2>
          <p className="opacity-85 text-[15px]">3 risk alerts need review, 12 sessions are scheduled today, and 2 clinician invitations are pending.</p>
        </div>
        <button className="rounded-organic-pill bg-organic-accent-100 text-organic-accent-800 font-heading text-[15px] px-6 py-3.5 whitespace-nowrap">
          Review alerts
        </button>
      </div>
      <div className="grid grid-cols-4 gap-3.5 mb-[18px]">
        {STATS.map((st) => (
          <div key={st.label} className="bg-organic-surface rounded-organic-tile p-4 flex items-center gap-3 shadow-organic-sm">
            <div className="w-[42px] h-[42px] rounded-organic-tile bg-organic-accent-100 grid place-items-center flex-none">
              <st.icon size={20} className="text-organic-accent-700" />
            </div>
            <div>
              <div className="font-heading text-2xl leading-none">{st.value}</div>
              <div className="text-[11.5px] text-organic-neutral-600">{st.label}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-organic-surface rounded-organic-card p-[22px] shadow-organic-sm">
          <h3 className="text-lg font-heading text-organic-text mb-3.5">Today&apos;s schedule</h3>
          <div className="flex flex-col">
            {PATIENTS.slice(0, 4).map((p) => (
              <button key={p.id} onClick={() => onOpenPatient(p.id)} className="flex items-center gap-3 py-2.5 px-1 border-b border-organic-text/[0.07] last:border-b-0 text-left">
                <span className="text-xs font-bold text-organic-accent-700 w-[52px]">10:00</span>
                <div className="w-[30px] h-[30px] rounded-full bg-organic-accent-200 grid place-items-center text-[10px] font-bold text-organic-accent-800">{p.initials}</div>
                <span className="flex-1 font-semibold text-[13.5px]">{p.name}</span>
                <span className="text-xs text-organic-neutral-600">{p.clinician}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="bg-organic-surface rounded-organic-card p-[22px] shadow-organic-sm">
          <h3 className="text-lg font-heading text-organic-text mb-3.5">Risk flags</h3>
          <AlertsList />
        </div>
      </div>
    </div>
  )
}

function DashboardBento() {
  return (
    <div className="grid grid-cols-4 gap-3.5" style={{ gridAutoRows: 'minmax(120px, auto)' }}>
      <div className="col-span-2 row-span-2 bg-gradient-to-br from-organic-accent-2-600 to-organic-accent-2-800 rounded-organic-card p-6 text-organic-accent-2-100 flex flex-col justify-between">
        <div>
          <div className="text-xs opacity-80">Practice health</div>
          <div className="font-heading text-5xl leading-none mt-2">94%</div>
          <div className="opacity-85 text-[13px] mt-1.5">Assessment completion this month</div>
        </div>
        <svg viewBox="0 0 300 90" className="w-full h-20">
          <path d="M0,70 L50,60 L100,64 L150,44 L200,50 L250,30 L300,24" fill="none" stroke="#fdf3e0" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
        </svg>
      </div>
      {STATS.map((st) => (
        <div key={st.label} className="bg-organic-surface rounded-organic-tile p-[18px] shadow-organic-sm flex flex-col justify-between">
          <st.icon size={19} className="text-organic-accent-500" />
          <div>
            <div className="font-heading text-[28px] leading-none">{st.value}</div>
            <div className="text-[11.5px] text-organic-neutral-600">{st.label}</div>
          </div>
        </div>
      ))}
      <div className="col-span-2 bg-organic-surface rounded-organic-tile p-5 shadow-organic-sm">
        <h3 className="text-[17px] font-heading text-organic-text mb-3">Risk flags</h3>
        <div className="flex flex-col gap-2">
          {ALERTS.map((a) => (
            <div key={a.name} className={`flex items-center gap-2.5 py-2.5 px-2.5 rounded-organic-tile ${a.med ? 'bg-organic-accent-2-100' : 'bg-organic-accent-100'}`}>
              <span className={`w-2 h-2 rounded-full flex-none ${a.med ? 'bg-organic-accent-2-700' : 'bg-organic-accent-700'}`} />
              <div className="flex-1 min-w-0 text-[13px]">
                <span className="font-semibold">{a.name}</span> <span className="text-[11.5px] text-organic-neutral-700">— {a.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AlertsList() {
  return (
    <div className="flex flex-col gap-2.5">
      {ALERTS.map((a) => (
        <div key={a.name} className={`flex items-center gap-3 py-2.5 px-3 rounded-organic-tile ${a.med ? 'bg-organic-accent-2-100' : 'bg-organic-accent-100'}`}>
          <span className={`w-2.5 h-2.5 rounded-full flex-none ${a.med ? 'bg-organic-accent-2-700' : 'bg-organic-accent-700'}`} />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[13.5px]">{a.name}</div>
            <div className="text-[11.5px] text-organic-neutral-700 leading-snug">{a.detail}</div>
          </div>
          <span className="text-xs text-organic-neutral-500 whitespace-nowrap">{a.time}</span>
        </div>
      ))}
    </div>
  )
}

function PatientsTable({ patients, onOpenPatient, showNext }: { patients: Patient[]; onOpenPatient: (id: string) => void; showNext?: boolean }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>
          <th className="text-left text-[11px] tracking-wide uppercase text-organic-neutral-600 px-2 py-2.5 border-b border-organic-neutral-300/60">Patient</th>
          <th className="text-left text-[11px] tracking-wide uppercase text-organic-neutral-600 px-2 py-2.5 border-b border-organic-neutral-300/60">Clinician</th>
          <th className="text-left text-[11px] tracking-wide uppercase text-organic-neutral-600 px-2 py-2.5 border-b border-organic-neutral-300/60">Last session</th>
          <th className="text-left text-[11px] tracking-wide uppercase text-organic-neutral-600 px-2 py-2.5 border-b border-organic-neutral-300/60">Risk</th>
          {showNext && <th className="text-left text-[11px] tracking-wide uppercase text-organic-neutral-600 px-2 py-2.5 border-b border-organic-neutral-300/60">Next action</th>}
        </tr>
      </thead>
      <tbody>
        {patients.map((p) => (
          <tr key={p.id} onClick={() => onOpenPatient(p.id)} className="cursor-pointer">
            <td className="px-2 py-3 border-b border-organic-text/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-organic-accent-200 grid place-items-center text-[11px] font-bold text-organic-accent-800">{p.initials}</div>
                <span className="font-semibold">{p.name}</span>
              </div>
            </td>
            <td className="px-2 py-3 border-b border-organic-text/[0.08] text-organic-neutral-700">{p.clinician}</td>
            <td className="px-2 py-3 border-b border-organic-text/[0.08] text-organic-neutral-700">{p.last}</td>
            <td className="px-2 py-3 border-b border-organic-text/[0.08]">
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-organic-pill ${RISK_STYLE[p.risk].bg} ${RISK_STYLE[p.risk].color}`}>{p.risk}</span>
            </td>
            {showNext && <td className="px-2 py-3 border-b border-organic-text/[0.08] text-organic-neutral-700">{p.next}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── Clinicians ─────────────────────────────────────────────────────────────

const CLINICIANS = [
  { name: 'Dr. Heba Moustafa', initials: 'HM', role: 'Director · Supervisor', specialty: 'Trauma · CBT', patients: 34, status: 'Active' },
  { name: 'Dr. Omar Nasser', initials: 'ON', role: 'Clinician', specialty: 'Anxiety · ACT', patients: 41, status: 'Active' },
  { name: 'Dr. Amina Saleh', initials: 'AS', role: 'Clinician', specialty: 'Mood · DBT', patients: 28, status: 'Active' },
  { name: 'Dr. Youssef Adel', initials: 'YA', role: 'Clinician', specialty: 'Adolescent · IFS', patients: 25, status: 'On leave' },
  { name: 'Nadia Halim', initials: 'NH', role: 'Intern (supervised)', specialty: 'Intake', patients: 0, status: 'Pending' },
]

function CliniciansView() {
  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-sm px-5 py-2.5 inline-flex items-center gap-2">
          <Plus size={16} /> Invite clinician
        </button>
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {CLINICIANS.map((c) => (
          <div key={c.name} className="bg-organic-surface rounded-organic-card p-5 shadow-organic-sm">
            <div className="flex items-center gap-3.5 mb-3.5">
              <div className="w-12 h-12 rounded-full bg-organic-accent-2-200 grid place-items-center font-bold text-organic-accent-2-800">{c.initials}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[15px]">{c.name}</div>
                <div className="text-xs text-organic-neutral-600">{c.role}</div>
              </div>
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-organic-pill ${c.status === 'Active' ? 'bg-organic-accent-2-100 text-organic-accent-2-800' : c.status === 'Pending' ? 'bg-organic-accent-100 text-organic-accent-800' : 'bg-organic-neutral-200 text-organic-neutral-700'}`}>
                {c.status}
              </span>
            </div>
            <div className="flex justify-between pt-3 border-t border-organic-neutral-300/50 text-sm">
              <div>
                <div className="text-organic-neutral-500 text-[11px]">Specialty</div>
                <div className="font-semibold">{c.specialty}</div>
              </div>
              <div className="text-right">
                <div className="text-organic-neutral-500 text-[11px]">Patients</div>
                <div className="font-semibold">{c.patients}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Patients ───────────────────────────────────────────────────────────────

function PatientsView({ onOpenPatient }: { onOpenPatient: (id: string) => void }) {
  const [filter, setFilter] = useState<'All' | 'High risk' | 'Intake'>('All')
  const filtered = PATIENTS.filter((p) => (filter === 'All' ? true : filter === 'High risk' ? p.risk === 'High' : p.status === 'Intake'))

  return (
    <div>
      <div className="flex justify-between items-center gap-3 flex-wrap mb-4">
        <div className="inline-flex gap-2">
          {(['All', 'High risk', 'Intake'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-4 py-1.5 rounded-organic-pill font-semibold ${filter === f ? 'bg-organic-accent text-organic-accent-100' : 'bg-organic-surface text-organic-neutral-700 border border-organic-neutral-300/60'}`}
            >
              {f}
            </button>
          ))}
        </div>
        <button className="rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-sm px-5 py-2.5 inline-flex items-center gap-2">
          <UserPlus size={16} /> Register patient
        </button>
      </div>
      <div className="bg-organic-surface rounded-organic-card p-[22px] pt-2 shadow-organic-sm">
        <PatientsTable patients={filtered} onOpenPatient={onOpenPatient} />
      </div>
    </div>
  )
}

// ─── Patient detail (drill-in) ──────────────────────────────────────────────

const FOLDERS = [
  { key: 'input', label: 'Intake & raw docs', icon: Folder },
  { key: 'processed', label: 'Processed notes', icon: FolderCheck },
  { key: 'output', label: 'AI summaries', icon: Sparkles },
  { key: 'reports', label: 'Patient reports', icon: FileBadge },
] as const

const FOLDER_FILES: Record<string, { n: string; d: string }[]> = {
  input: [{ n: 'Intake form.pdf', d: '2 days ago' }, { n: 'GP referral.pdf', d: '3 weeks ago' }, { n: 'Consent.pdf', d: '3 weeks ago' }],
  processed: [{ n: 'Session 04 note.md', d: 'Yesterday' }, { n: 'Session 03 note.md', d: '1 week ago' }],
  output: [{ n: 'AI summary — wk 4.md', d: 'Yesterday' }, { n: 'Risk digest.md', d: '2 days ago' }],
  reports: [{ n: 'Progress report Q2.pdf', d: '5 days ago' }],
}

function PatientDetailView({ patient, onBack }: { patient: Patient; onBack: () => void }) {
  const [folder, setFolder] = useState<string>('input')

  return (
    <div>
      <div className="flex items-center gap-3 mb-[18px]">
        <button onClick={onBack} className="w-[38px] h-[38px] rounded-full border border-organic-neutral-300/60 bg-organic-surface grid place-items-center">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-3.5">
          <div className="w-[52px] h-[52px] rounded-full bg-organic-accent-200 grid place-items-center font-bold text-base text-organic-accent-800">{patient.initials}</div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-heading text-[22px]">{patient.name}</span>
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-organic-pill ${RISK_STYLE[patient.risk].bg} ${RISK_STYLE[patient.risk].color}`}>{patient.risk} risk</span>
            </div>
            <div className="text-sm text-organic-neutral-600">Primary: {patient.clinician} · Last session {patient.last}</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[2fr_1fr] gap-4">
        <div className="bg-organic-surface rounded-organic-card p-[22px] shadow-organic-sm">
          <div className="flex gap-2.5 mb-[18px] flex-wrap">
            {FOLDERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFolder(f.key)}
                className={`text-xs font-semibold px-3.5 py-2 rounded-organic-pill inline-flex items-center gap-1.5 ${folder === f.key ? 'bg-organic-accent-100 text-organic-accent-800' : 'text-organic-neutral-800'}`}
              >
                <f.icon size={15} /> {f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {(FOLDER_FILES[folder] || []).map((file) => (
              <div key={file.n} className="flex items-center gap-3 py-3.5 px-3.5 bg-organic-neutral-100 rounded-organic-tile">
                <FileText size={18} className="text-organic-accent-600" />
                <span className="flex-1 font-semibold text-[13.5px]">{file.n}</span>
                <span className="text-[11.5px] text-organic-neutral-500">{file.d}</span>
                <Lock size={14} className="text-organic-neutral-400" />
              </div>
            ))}
          </div>
        </div>
        <aside className="flex flex-col gap-3.5">
          <div className="bg-gradient-to-br from-organic-accent-100 to-organic-surface rounded-organic-tile p-5 shadow-organic-sm">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={17} className="text-organic-accent-700" />
              <h4 className="text-base font-heading">AI clinical insights</h4>
            </div>
            <p className="text-[13px] text-organic-neutral-800 leading-relaxed mb-3">
              PHQ-9 trending down over 4 sessions (18 → 14). Sleep and appetite items improving; item 9 remains elevated — continue weekly safety check-ins.
            </p>
            <div className="flex gap-2 flex-wrap">
              <span className="text-[11px] px-2.5 py-1 rounded-organic-pill bg-organic-accent-200 text-organic-accent-800">CBT recommended</span>
              <span className="text-[11px] px-2.5 py-1 rounded-organic-pill bg-organic-accent-2-200 text-organic-accent-2-800">Safety plan active</span>
            </div>
          </div>
          <div className="bg-organic-surface rounded-organic-tile p-5 shadow-organic-sm">
            <h4 className="text-base font-heading mb-3">Latest scores</h4>
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between"><span className="text-sm text-organic-neutral-700">PHQ-9</span><span className="font-bold text-organic-accent-700">14 · Mod. severe</span></div>
              <div className="flex justify-between"><span className="text-sm text-organic-neutral-700">GAD-7</span><span className="font-bold text-organic-accent-2-700">11 · Moderate</span></div>
              <div className="flex justify-between"><span className="text-sm text-organic-neutral-700">ACE</span><span className="font-bold text-organic-neutral-700">4</span></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

// ─── Assessments ────────────────────────────────────────────────────────────

type CatalogEntry = {
  id: string
  template_key: string
  name: string
  template_type: string | null
  category: string | null
  license_status: string | null
  description: string | null
  is_active: boolean
  current_published_version_number: number | null
}

const PHQ_BANDS = [
  { label: 'Minimal', active: false },
  { label: 'Mild', active: false },
  { label: 'Moderate', active: false },
  { label: 'Mod. severe', active: true },
  { label: 'Severe', active: false },
]

function AssessmentsView() {
  const [catalog, setCatalog] = useState<CatalogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [selected, setSelected] = useState<CatalogEntry | null>(null)
  const jsonInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  const reload = () => {
    setLoading(true)
    apiClient
      .getAssessmentCatalog()
      .then((data: CatalogEntry[]) => setCatalog(data))
      .catch(() => setError('Could not load the assessment catalog.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
  }, [])

  const handleJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadStatus('Uploading…')
    try {
      await apiClient.uploadAssessmentJson(file)
      setUploadStatus('Added as a draft — review and publish it below.')
      reload()
    } catch (err: any) {
      setUploadStatus(err?.response?.data?.detail || 'Upload failed — check the JSON matches the expected format.')
    }
  }

  const handlePdfFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadStatus('Uploading and reading the document — this can take a minute or two…')
    try {
      await apiClient.uploadMaterialDocument(file)
      setUploadStatus('Processing in the background. It will appear as a draft below once ready — refresh to check.')
    } catch (err: any) {
      setUploadStatus(err?.response?.data?.detail || 'Upload failed.')
    }
  }

  const reserved = catalog.filter((c) => c.license_status === 'LICENSE_REQUIRED')
  const drafts = catalog.filter((c) => c.license_status !== 'LICENSE_REQUIRED' && !c.current_published_version_number)
  const published = catalog.filter((c) => c.license_status !== 'LICENSE_REQUIRED' && !!c.current_published_version_number)

  const byCategory = published.reduce<Record<string, CatalogEntry[]>>((acc, t) => {
    const cat = t.category || 'Other'
    ;(acc[cat] ||= []).push(t)
    return acc
  }, {})

  return (
    <div className="grid grid-cols-[1fr_1.1fr] gap-4">
      <div>
        <div className="flex justify-between items-center mb-3.5">
          <h3 className="text-lg font-heading">Catalog</h3>
          <div className="flex gap-2">
            <input ref={jsonInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleJsonFile} />
            <input ref={pdfInputRef} type="file" accept="application/pdf,image/png,image/jpeg" className="hidden" onChange={handlePdfFile} />
            <button
              onClick={() => pdfInputRef.current?.click()}
              className="rounded-organic-pill border border-organic-neutral-300/60 text-organic-neutral-700 text-[13px] font-heading px-4 py-2 inline-flex items-center gap-1.5"
            >
              <Upload size={15} /> Upload document
            </button>
            <button
              onClick={() => jsonInputRef.current?.click()}
              className="rounded-organic-pill bg-organic-accent text-organic-accent-100 text-[13px] font-heading px-4 py-2 inline-flex items-center gap-1.5"
            >
              <Plus size={15} /> Upload JSON
            </button>
          </div>
        </div>
        {uploadStatus && <div className="text-sm text-organic-accent-800 px-1 mb-3">{uploadStatus}</div>}
        {loading && <div className="text-sm text-organic-neutral-600 px-1">Loading catalog…</div>}
        {error && <div className="text-sm text-organic-accent-800 px-1">{error}</div>}

        {Object.entries(byCategory).map(([category, items]) => (
          <div key={category} className="mb-5">
            <h4 className="text-[12px] font-heading uppercase tracking-wide text-organic-neutral-500 mb-2 px-1">{category}</h4>
            <div className="flex flex-col gap-3">
              {items.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className="bg-organic-surface rounded-organic-tile p-[18px] shadow-organic-sm flex items-center gap-4 cursor-pointer hover:shadow transition-shadow"
                >
                  <div className="w-12 h-12 rounded-organic-tile bg-organic-accent-100 grid place-items-center flex-none">
                    <ClipboardList size={22} className="text-organic-accent-700" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-[15px]">{t.name}</div>
                    <div className="text-xs text-organic-neutral-600">{t.description || t.template_type || 'Assessment'}</div>
                  </div>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-organic-pill bg-organic-neutral-200 text-organic-neutral-700">{t.template_type || 'FREE'}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {drafts.length > 0 && (
          <>
            <div className="flex items-center gap-2 mt-6 mb-3.5">
              <h3 className="text-lg font-heading text-organic-accent-700">Drafts — awaiting review</h3>
            </div>
            <div className="flex flex-col gap-3">
              {drafts.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className="bg-organic-accent-100/60 rounded-organic-tile p-[18px] shadow-organic-sm flex items-center gap-4 cursor-pointer hover:shadow transition-shadow"
                >
                  <div className="w-12 h-12 rounded-organic-tile bg-organic-accent-200 grid place-items-center flex-none">
                    <FileEdit size={20} className="text-organic-accent-700" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-[15px]">{t.name}</div>
                    <div className="text-xs text-organic-neutral-600">{t.description}</div>
                  </div>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-organic-pill bg-organic-accent-300/60 text-organic-accent-800 font-semibold flex-none">
                    Review
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {reserved.length > 0 && (
          <>
            <div className="flex items-center gap-2 mt-6 mb-3.5">
              <h3 className="text-lg font-heading text-organic-neutral-600">Reserved — awaiting license</h3>
            </div>
            <div className="flex flex-col gap-3">
              {reserved.map((t) => (
                <div key={t.id} className="bg-organic-surface/60 rounded-organic-tile p-[18px] shadow-organic-sm flex items-center gap-4 opacity-75">
                  <div className="w-12 h-12 rounded-organic-tile bg-organic-neutral-200 grid place-items-center flex-none">
                    <Lock size={20} className="text-organic-neutral-500" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-[15px] text-organic-neutral-700">{t.name}</div>
                    <div className="text-xs text-organic-neutral-500">{t.description}</div>
                  </div>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-organic-pill bg-organic-neutral-300/60 text-organic-neutral-700 font-semibold flex-none">
                    License required
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="bg-organic-surface rounded-organic-card p-6 shadow-organic-sm">
        <div className="flex justify-between items-start mb-1.5">
          <h3 className="text-[22px] font-heading">PHQ-9 result</h3>
          <span className="text-[11px] px-3 py-1 rounded-organic-pill bg-organic-accent-200 text-organic-accent-800 font-semibold">Maya Okonkwo</span>
        </div>
        <p className="text-[13px] text-organic-neutral-600 mb-5">Completed 2 days ago · scored automatically</p>
        <div className="flex items-baseline gap-3 mb-[18px]">
          <span className="font-heading text-[56px] text-organic-accent-700 leading-none">14</span>
          <span className="text-[15px] text-organic-neutral-700">/ 27 · <strong>Moderately severe</strong></span>
        </div>
        <div className="flex gap-1.5 mb-2">
          {PHQ_BANDS.map((b) => (
            <div key={b.label} className="flex-1">
              <div className="h-2 rounded-organic-pill bg-organic-neutral-200" />
            </div>
          ))}
        </div>
        <div className="h-2 rounded-organic-pill bg-organic-neutral-200 overflow-hidden mb-1.5">
          <div className="w-[56%] h-full bg-gradient-to-r from-organic-accent-2-400 via-organic-accent-500 to-organic-accent-700" />
        </div>
        <div className="flex justify-between text-[10.5px] text-organic-neutral-500 mb-5">
          {PHQ_BANDS.map((b) => (
            <span key={b.label}>{b.label}</span>
          ))}
        </div>
        <div className="flex items-center gap-3 p-3.5 bg-organic-accent-100 rounded-organic-tile mb-5">
          <AlertTriangle size={22} className="text-organic-accent-700 flex-none" />
          <div>
            <div className="font-bold text-[13.5px] text-organic-accent-800">Risk flag: Item 9 = 2</div>
            <div className="text-xs text-organic-accent-800 opacity-85">Thoughts of self-harm reported — clinician alerted automatically.</div>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button className="flex-1 rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-sm py-3">Assign follow-up</button>
          <button className="rounded-organic-pill border border-organic-neutral-300/60 font-heading text-sm px-[18px] py-3">Export</button>
        </div>
      </div>

      {selected && (
        <AssessmentReviewPanel
          catalogEntry={selected}
          onClose={() => setSelected(null)}
          onPublished={() => {
            setSelected(null)
            reload()
          }}
        />
      )}
    </div>
  )
}

// ─── Assessment review / edit / publish panel ─────────────────────────────

type ReviewQuestion = {
  id: number
  text: string
  text_ar?: string
  type?: string
  options?: { value: number; label: string; label_ar?: string }[]
  reverse_scored?: boolean
}

type ReviewDefinition = {
  instructions?: string
  instructions_ar?: string
  questions: ReviewQuestion[]
}

type ReviewVersion = {
  id: string
  catalog_id: string
  version_number: number
  status: string
  name: string
  definition_json: ReviewDefinition | null
  scoring_rules: any
  interpretation_rules: any
  risk_rules: any
  notes: string | null
}

function AssessmentReviewPanel({
  catalogEntry,
  onClose,
  onPublished,
}: {
  catalogEntry: CatalogEntry
  onClose: () => void
  onPublished: () => void
}) {
  const [version, setVersion] = useState<ReviewVersion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lang, setLang] = useState<'en' | 'ar'>('en')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  useEffect(() => {
    apiClient
      .getAssessmentVersions(catalogEntry.id)
      .then((versions: ReviewVersion[]) => {
        if (versions.length === 0) {
          setError('No content found for this assessment yet.')
          return
        }
        setVersion(versions[0])
      })
      .catch(() => setError('Could not load this assessment.'))
      .finally(() => setLoading(false))
  }, [catalogEntry.id])

  const isEditable = version?.status === 'draft'

  const updateQuestionText = (qid: number, value: string) => {
    if (!version?.definition_json) return
    setDirty(true)
    setVersion({
      ...version,
      definition_json: {
        ...version.definition_json,
        questions: version.definition_json.questions.map((q) =>
          q.id === qid ? { ...q, [lang === 'en' ? 'text' : 'text_ar']: value } : q
        ),
      },
    })
  }

  const updateOptionLabel = (qid: number, optIndex: number, value: string) => {
    if (!version?.definition_json) return
    setDirty(true)
    setVersion({
      ...version,
      definition_json: {
        ...version.definition_json,
        questions: version.definition_json.questions.map((q) => {
          if (q.id !== qid || !q.options) return q
          const options = q.options.map((o, i) =>
            i === optIndex ? { ...o, [lang === 'en' ? 'label' : 'label_ar']: value } : o
          )
          return { ...q, options }
        }),
      },
    })
  }

  const updateInstructions = (value: string) => {
    if (!version?.definition_json) return
    setDirty(true)
    setVersion({
      ...version,
      definition_json: { ...version.definition_json, [lang === 'en' ? 'instructions' : 'instructions_ar']: value },
    })
  }

  const save = async () => {
    if (!version) return
    setSaving(true)
    setSaveMsg(null)
    try {
      await apiClient.updateAssessmentVersion(version.id, { definition_json: version.definition_json })
      setDirty(false)
      setSaveMsg('Saved.')
    } catch (err: any) {
      setSaveMsg(err?.response?.data?.detail || 'Could not save changes.')
    } finally {
      setSaving(false)
    }
  }

  const approveAndPublish = async () => {
    if (!version) return
    setSaving(true)
    setSaveMsg(null)
    try {
      if (dirty) {
        await apiClient.updateAssessmentVersion(version.id, { definition_json: version.definition_json })
        setDirty(false)
      }
      await apiClient.publishAssessmentVersion(version.id)
      onPublished()
    } catch (err: any) {
      setSaveMsg(err?.response?.data?.detail || 'Could not publish.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={onClose}>
      <div
        className="bg-organic-bg w-full max-w-[640px] h-screen overflow-y-auto p-7 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        <div className="flex justify-between items-start mb-1.5">
          <div>
            <h2 className="text-[24px] font-heading text-organic-text">{catalogEntry.name}</h2>
            <p className="text-sm text-organic-neutral-600">{catalogEntry.category || catalogEntry.template_type}</p>
          </div>
          <button onClick={onClose} className="text-organic-neutral-500 hover:text-organic-neutral-800 text-2xl leading-none">
            &times;
          </button>
        </div>

        <div className="inline-flex bg-organic-neutral-100 border border-organic-neutral-300/60 rounded-organic-pill p-1 my-4">
          {(['en', 'ar'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`font-heading text-[13px] px-4 py-1.5 rounded-organic-pill ${lang === l ? 'bg-organic-accent text-organic-neutral-100' : 'text-organic-neutral-700'}`}
            >
              {l === 'en' ? 'English' : 'العربية'}
            </button>
          ))}
        </div>

        {loading && <div className="text-sm text-organic-neutral-600">Loading…</div>}
        {error && <div className="text-sm text-organic-accent-800">{error}</div>}

        {version && !isEditable && (
          <div className="text-xs bg-organic-neutral-100 text-organic-neutral-600 rounded-organic-tile p-3 mb-4">
            This version is already published (view-only here). To revise it, upload a new document or JSON to create a fresh draft.
          </div>
        )}

        {version?.notes && (
          <div className="text-xs bg-organic-accent-100 text-organic-accent-800 rounded-organic-tile p-3 mb-4">{version.notes}</div>
        )}

        {version?.definition_json && (
          <>
            <label className="block text-xs font-semibold text-organic-neutral-600 mb-1.5">Instructions</label>
            <textarea
              disabled={!isEditable}
              value={(lang === 'en' ? version.definition_json.instructions : version.definition_json.instructions_ar) || ''}
              onChange={(e) => updateInstructions(e.target.value)}
              className="w-full bg-organic-surface border border-organic-neutral-300/60 rounded-organic-tile p-3 text-sm mb-5 disabled:opacity-60"
              rows={2}
            />

            <h3 className="text-sm font-heading text-organic-neutral-700 mb-2.5">
              Questions ({version.definition_json.questions.length})
            </h3>
            <div className="flex flex-col gap-3 mb-6">
              {version.definition_json.questions.map((qst) => (
                <div key={qst.id} className="bg-organic-surface rounded-organic-tile p-3.5 shadow-organic-sm">
                  <div className="flex gap-2 items-start mb-2">
                    <span className="text-xs font-bold text-organic-neutral-500 mt-2 flex-none">{qst.id}.</span>
                    <textarea
                      disabled={!isEditable}
                      value={(lang === 'en' ? qst.text : qst.text_ar) || ''}
                      onChange={(e) => updateQuestionText(qst.id, e.target.value)}
                      className="flex-1 bg-organic-bg border border-organic-neutral-300/60 rounded-organic-tile p-2 text-sm disabled:opacity-60"
                      rows={1}
                    />
                  </div>
                  {qst.options && qst.options.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pl-5">
                      {qst.options.map((opt, i) => (
                        <input
                          key={i}
                          disabled={!isEditable}
                          value={(lang === 'en' ? opt.label : opt.label_ar) || ''}
                          onChange={(e) => updateOptionLabel(qst.id, i, e.target.value)}
                          className="bg-organic-neutral-100 border border-organic-neutral-300/50 rounded-organic-pill px-2.5 py-1 text-xs disabled:opacity-60"
                          style={{ width: `${Math.max(60, ((lang === 'en' ? opt.label : opt.label_ar)?.length || 4) * 7 + 20)}px` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {(version.scoring_rules || version.interpretation_rules || version.risk_rules) && (
              <details className="mb-6">
                <summary className="text-xs font-semibold text-organic-neutral-600 cursor-pointer mb-2">
                  Advanced: scoring &amp; interpretation rules (read-only — to change scoring logic, upload a revised JSON)
                </summary>
                <pre className="bg-organic-neutral-100 rounded-organic-tile p-3 text-[11px] overflow-x-auto">
                  {JSON.stringify({ scoring_rules: version.scoring_rules, interpretation_rules: version.interpretation_rules, risk_rules: version.risk_rules }, null, 2)}
                </pre>
              </details>
            )}
          </>
        )}

        {saveMsg && <div className="text-sm text-organic-accent-800 mb-3">{saveMsg}</div>}

        {isEditable && (
          <div className="flex gap-2.5 sticky bottom-0 bg-organic-bg pt-3 pb-1">
            <button
              onClick={save}
              disabled={saving || !dirty}
              className="rounded-organic-pill border border-organic-neutral-300/60 font-heading text-sm px-5 py-2.5 disabled:opacity-50"
            >
              Save changes
            </button>
            <button
              onClick={approveAndPublish}
              disabled={saving}
              className="flex-1 rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-sm py-2.5 disabled:opacity-50"
            >
              {saving ? 'Publishing…' : 'Approve & publish'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Content library ────────────────────────────────────────────────────────

const CONTENT = [
  { title: 'CBT Thought Record Workbook', type: 'PDF', icon: FileText, cat: 'Worksheets', access: 'All clinicians' },
  { title: 'Grounding & Breathing (Audio)', type: 'Audio', icon: AudioLines, cat: 'Mindfulness', access: 'Patients' },
  { title: 'Understanding Trauma — Guide', type: 'eBook', icon: BookOpen, cat: 'Psychoeducation', access: 'Group: Trauma team' },
  { title: 'Sleep Hygiene Handout', type: 'PDF', icon: FileText, cat: 'Handouts', access: 'All clinicians' },
  { title: 'DBT Skills — Distress Tolerance', type: 'Video', icon: PlayCircle, cat: 'Video course', access: 'Licensed only' },
  { title: 'Safety Plan Template', type: 'DOCX', icon: FileText, cat: 'Clinical forms', access: 'Clinicians' },
]

function ContentView() {
  return (
    <div>
      <div className="flex justify-between items-center gap-3 flex-wrap mb-4">
        <div className="inline-flex gap-2 flex-wrap">
          {['All', 'Worksheets', 'Mindfulness', 'Video'].map((f, i) => (
            <span key={f} className={`text-xs px-4 py-1.5 rounded-organic-pill font-semibold ${i === 0 ? 'bg-organic-accent text-organic-accent-100' : 'bg-organic-surface text-organic-neutral-700 border border-organic-neutral-300/60'}`}>
              {f}
            </span>
          ))}
        </div>
        <button className="rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-sm px-5 py-2.5 inline-flex items-center gap-2">
          <Upload size={16} /> Upload content
        </button>
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {CONTENT.map((c) => (
          <div key={c.title} className="bg-organic-surface rounded-organic-card p-5 shadow-organic-sm flex flex-col gap-3.5">
            <div className="flex justify-between items-start">
              <div className="w-[46px] h-[46px] rounded-organic-tile bg-organic-accent-100 grid place-items-center">
                <c.icon size={22} className="text-organic-accent-700" />
              </div>
              <span className="text-[10.5px] px-2.5 py-0.5 rounded-organic-pill bg-organic-neutral-200 text-organic-neutral-700">{c.type}</span>
            </div>
            <div>
              <div className="font-bold text-[15px] leading-tight">{c.title}</div>
              <div className="text-xs text-organic-neutral-600 mt-1">{c.cat}</div>
            </div>
            <div className="flex items-center gap-1.5 pt-3 border-t border-organic-neutral-300/50 text-xs text-organic-neutral-700">
              <ShieldCheck size={14} className="text-organic-accent-2-600" /> {c.access}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Access control ─────────────────────────────────────────────────────────

const CAPS = ['Manage clinicians', 'View all patients', 'Assign assessments', 'Edit content library', 'View billing', 'Manage permissions', 'Use AI assistant']
const ROLE_MATRIX = CAPS.map((cap, i) => ({
  cap,
  admin: true,
  supervisor: [true, true, true, false, false, false, true][i],
  clinician: [false, false, true, false, false, false, true][i],
  patient: [false, false, false, false, false, false, true][i],
}))

const OVERRIDES = [
  { user: 'Dr. Omar Nasser', initials: 'ON', rule: 'Granted: Edit content library' },
  { user: 'Dr. Amina Saleh', initials: 'AS', rule: 'Restricted: Trauma team content only' },
  { user: 'Nadia Halim', initials: 'NH', rule: 'Restricted: No patient PHI export' },
]

function AccessView() {
  return (
    <div className="flex flex-col gap-[18px]">
      <div className="bg-organic-surface rounded-organic-card p-6 shadow-organic-sm">
        <h3 className="text-lg font-heading mb-1">Role permissions</h3>
        <p className="text-[13px] text-organic-neutral-600 mb-4">Baseline capabilities per role. Override per user below.</p>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="text-left text-[11px] tracking-wide uppercase text-organic-neutral-600 px-2 py-2.5 border-b border-organic-neutral-300/60">Capability</th>
              <th className="text-[11px] tracking-wide uppercase text-organic-neutral-600 px-2 py-2.5 border-b border-organic-neutral-300/60">Admin</th>
              <th className="text-[11px] tracking-wide uppercase text-organic-neutral-600 px-2 py-2.5 border-b border-organic-neutral-300/60">Supervisor</th>
              <th className="text-[11px] tracking-wide uppercase text-organic-neutral-600 px-2 py-2.5 border-b border-organic-neutral-300/60">Clinician</th>
              <th className="text-[11px] tracking-wide uppercase text-organic-neutral-600 px-2 py-2.5 border-b border-organic-neutral-300/60">Patient</th>
            </tr>
          </thead>
          <tbody>
            {ROLE_MATRIX.map((r) => (
              <tr key={r.cap}>
                <td className="px-2 py-3 border-b border-organic-text/[0.08] font-semibold">{r.cap}</td>
                {[r.admin, r.supervisor, r.clinician, r.patient].map((granted, i) => (
                  <td key={i} className="px-2 py-3 border-b border-organic-text/[0.08] text-center">
                    {granted && <Check size={17} className="text-organic-accent-2-700 mx-auto" />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-organic-surface rounded-organic-card p-6 shadow-organic-sm">
        <h3 className="text-lg font-heading mb-4">User-level overrides</h3>
        <div className="flex flex-col gap-2.5">
          {OVERRIDES.map((o) => (
            <div key={o.user} className="flex items-center gap-3.5 py-3.5 px-4 bg-organic-neutral-100 rounded-organic-tile">
              <div className="w-9 h-9 rounded-full bg-organic-accent-2-200 grid place-items-center text-[11px] font-bold text-organic-accent-2-800">{o.initials}</div>
              <div className="flex-1">
                <div className="font-semibold text-sm">{o.user}</div>
                <div className="text-[12.5px] text-organic-neutral-700">{o.rule}</div>
              </div>
              <Pencil size={16} className="text-organic-neutral-500" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Billing ─────────────────────────────────────────────────────────────────

const USAGE = [
  { label: 'AI messages', used: '8,420', cap: '15,000', pct: 56 },
  { label: 'Content storage', used: '31', cap: '50 GB', pct: 62 },
  { label: 'Clinician seats', used: '9', cap: '12', pct: 75 },
]

const PLANS = [
  { name: 'Basic', price: '$49', per: '/clinician · mo', feats: ['Up to 5 clinicians', 'Core assessments', '2 GB content storage', 'Email support'], cta: 'Downgrade' },
  { name: 'Professional', price: '$99', per: '/clinician · mo', feats: ['Unlimited clinicians', 'Full assessment catalog', '50 GB content storage', 'AI assistant included', 'Priority support'], cta: 'Current plan' },
  { name: 'Enterprise', price: 'Custom', per: 'annual', feats: ['SSO & audit exports', 'Dedicated storage', 'Custom assessments', 'HIPAA BAA', 'Dedicated success manager'], cta: 'Contact sales' },
]

function BillingView() {
  return (
    <div className="flex flex-col gap-[18px]">
      <div className="grid grid-cols-3 gap-3.5">
        {USAGE.map((u) => (
          <div key={u.label} className="bg-organic-surface rounded-organic-tile p-5 shadow-organic-sm">
            <div className="text-[13px] text-organic-neutral-600 mb-2">{u.label}</div>
            <div className="font-heading text-[26px] mb-2.5">
              {u.used}
              <span className="text-sm text-organic-neutral-500"> / {u.cap}</span>
            </div>
            <div className="h-2 rounded-organic-pill bg-organic-neutral-200 overflow-hidden">
              <div className="h-full bg-organic-accent" style={{ width: `${u.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div>
        <h3 className="text-xl font-heading mb-3.5">Plans</h3>
        <div className="grid grid-cols-3 gap-4">
          {PLANS.map((pl) => (
            <div key={pl.name} className="rounded-organic-card p-6 shadow-organic-sm bg-organic-surface border-2 border-organic-neutral-300/60 flex flex-col">
              <div className="font-heading text-xl mb-0.5">{pl.name}</div>
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
              <button className="w-full rounded-organic-pill font-heading text-sm py-3 border border-organic-neutral-300/60">{pl.cta}</button>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-organic-surface rounded-organic-card p-6 shadow-organic-sm flex justify-between items-center gap-5 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-[52px] h-9 rounded-lg bg-organic-neutral-800 grid place-items-center">
            <CreditCard size={22} className="text-organic-neutral-200" />
          </div>
          <div>
            <div className="font-semibold text-sm">Visa ending 4242</div>
            <div className="text-xs text-organic-neutral-600">Next charge $891 on Aug 1, 2026</div>
          </div>
        </div>
        <button className="rounded-organic-pill border border-organic-neutral-300/60 font-heading text-[13px] px-[18px] py-2.5">Update payment</button>
      </div>
    </div>
  )
}

// ─── Settings ───────────────────────────────────────────────────────────────

function ToggleRow({ label, meta, on }: { label: string; meta: string; on: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-xs text-organic-neutral-600">{meta}</div>
      </div>
      <span className={`w-11 h-[26px] rounded-organic-pill relative flex-none ${on ? 'bg-organic-accent' : 'bg-organic-neutral-300'}`}>
        <span className={`absolute w-5 h-5 rounded-full bg-white top-[3px] ${on ? 'right-[3px]' : 'left-[3px]'}`} />
      </span>
    </div>
  )
}

function SettingsView() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-organic-surface rounded-organic-card p-6 shadow-organic-sm">
        <h3 className="text-lg font-heading mb-[18px]">Practice profile</h3>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs text-organic-neutral-700 mb-1.5">Practice name</label>
            <input defaultValue="Cedar &amp; Sage Psychology" className="w-full min-h-[42px] px-4 text-sm bg-organic-neutral-100 border border-organic-neutral-300/60 rounded-organic-pill" />
          </div>
          <div>
            <label className="block text-xs text-organic-neutral-700 mb-1.5">Contact email</label>
            <input defaultValue="admin@cedarsage.co" className="w-full min-h-[42px] px-4 text-sm bg-organic-neutral-100 border border-organic-neutral-300/60 rounded-organic-pill" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-organic-neutral-700 mb-1.5">Timezone</label>
              <input defaultValue="Africa/Cairo" className="w-full min-h-[42px] px-4 text-sm bg-organic-neutral-100 border border-organic-neutral-300/60 rounded-organic-pill" />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-organic-neutral-700 mb-1.5">Locale</label>
              <input defaultValue="English (US)" className="w-full min-h-[42px] px-4 text-sm bg-organic-neutral-100 border border-organic-neutral-300/60 rounded-organic-pill" />
            </div>
          </div>
          <button className="self-start rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-sm px-6 py-2.5">Save changes</button>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="bg-organic-surface rounded-organic-card p-6 shadow-organic-sm">
          <h3 className="text-lg font-heading mb-4">Notifications</h3>
          <div className="flex flex-col gap-3.5">
            <ToggleRow label="Risk alerts" meta="Email + in-app, immediate" on />
            <ToggleRow label="WhatsApp reminders" meta="Patient appointment reminders" on />
            <ToggleRow label="Weekly digest" meta="Practice summary every Monday" on={false} />
          </div>
        </div>
        <div className="bg-organic-surface rounded-organic-card p-6 shadow-organic-sm">
          <h3 className="text-lg font-heading mb-4">Integrations</h3>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3 py-3 px-3.5 bg-organic-neutral-100 rounded-organic-tile">
              <Calendar size={18} className="text-organic-accent-700" />
              <span className="flex-1 font-semibold text-[13.5px]">Google Calendar</span>
              <span className="text-[11px] font-semibold text-organic-accent-2-700">Connected</span>
            </div>
            <div className="flex items-center gap-3 py-3 px-3.5 bg-organic-neutral-100 rounded-organic-tile">
              <Brain size={18} className="text-organic-accent-700" />
              <span className="flex-1 font-semibold text-[13.5px]">OpenAI (AI assistant)</span>
              <span className="text-[11px] font-semibold text-organic-accent-2-700">Connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
