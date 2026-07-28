import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import apiClient from '../services/api'
import type { PracticeSummary, ResourceItem } from '../services/api'
import { useSampleDataHidden } from '../hooks/useSampleDataHidden'
import { SampleGate } from '../components/SampleGate'
import { TextSizeControl } from '../components/TextSizeControl'
import { TrialModePanel } from '../components/TrialModePanel'
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
  FlaskConical,
  CreditCard,
  Settings as SettingsIcon,
  LogOut,
  UserPlus,
  Upload,
  AlertTriangle,
  FileText,
  BookOpen,
  PlayCircle,
  Sparkles,
  Pencil,
  Check,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Lock,
  Calendar,
  CalendarClock,
  FileEdit,
} from 'lucide-react'

type View = 'dashboard' | 'clinicians' | 'patients' | 'patientDetail' | 'assessments' | 'content' | 'access' | 'billing' | 'settings'

// `ready: false` marks a view that is still design-mockup only -- no real
// data behind it yet. Those nav entries render dimmed and non-clickable so
// nobody walks into a screen of invented numbers. Flip to true as each one
// gets wired to the API.
const NAV_ITEMS: { view: View; label: string; icon: typeof LayoutDashboard; ready?: boolean }[] = [
  { view: 'dashboard', label: 'Overview', icon: LayoutDashboard, ready: true },
  { view: 'clinicians', label: 'Clinicians', icon: Stethoscope, ready: true },
  { view: 'patients', label: 'Patients', icon: UsersRound, ready: true },
  { view: 'assessments', label: 'Assessments', icon: ClipboardList, ready: true },
  { view: 'content', label: 'Content Library', icon: LibraryBig, ready: true },
  { view: 'access', label: 'Access Control', icon: ShieldCheck, ready: false },
  { view: 'billing', label: 'Billing & Plan', icon: CreditCard, ready: false },
  { view: 'settings', label: 'Settings', icon: SettingsIcon, ready: false },
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
// Static subtitles only. Anything that used to state a quantity -- "9
// clinicians · 2 seats available", "128 active patients across the practice",
// "Professional plan · renews Aug 1, 2026" -- was a hardcoded string that
// never once consulted the API, so it stayed put while the practice grew or
// shrank. Counts now come from the live data in `subtitleFor` below, and where
// there is no source for a number (seat allowances, renewal dates) the claim
// is dropped rather than invented.
const SUBTITLES: Record<View, string> = {
  dashboard: 'Practice-wide activity',
  clinicians: '',
  patients: '',
  patientDetail: '',
  assessments: 'Assign, build and review clinical assessments',
  content: 'Books, papers and videos ingested for clinical reference',
  access: 'Role-based & resource-level permissions',
  billing: 'Plan and usage',
  settings: 'Practice profile, notifications and integrations',
}

/**
 * Subtitles that carry a real, live count. Returns '' when the number is not
 * known yet (still loading, or the server sent no total) — an empty subtitle
 * is honest, a stale one is not.
 */
function subtitleFor(view: View, counts: { patientTotal: number | null; clinicianCount: number }): string {
  if (view === 'patients') {
    if (counts.patientTotal === null) return ''
    return `${counts.patientTotal} ${counts.patientTotal === 1 ? 'patient' : 'patients'} in the registry`
  }
  if (view === 'clinicians') {
    if (counts.clinicianCount === 0) return ''
    return `${counts.clinicianCount} ${counts.clinicianCount === 1 ? 'clinician' : 'clinicians'}`
  }
  return SUBTITLES[view]
}

interface Patient {
  id: string
  name: string
  initials: string
  clinician: string
  last: string
  risk: 'High' | 'Med' | 'Low'
  status: string
  therapistId?: string
}

interface ClinicianRow {
  id: string
  fullName: string
  initials: string
  email: string
  role: string
  active: boolean
  patientCount: number
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

function toRiskLabel(risk: string): Patient['risk'] {
  if (risk === 'High' || risk === 'Crisis') return 'High'
  if (risk === 'Med' || risk === 'Medium') return 'Med'
  return 'Low'
}

function toPatientRow(api: any, clinicians: ClinicianRow[]): Patient {
  const clinician = clinicians.find((c) => c.id === api.therapist_id)
  return {
    id: api.id,
    name: api.name,
    initials: initialsOf(api.name || '?'),
    clinician: clinician ? clinician.fullName : 'Unassigned',
    last: api.last_seen ? new Date(api.last_seen).toLocaleDateString() : 'No sessions yet',
    risk: toRiskLabel(api.risk),
    status: api.status || 'Active',
    therapistId: api.therapist_id,
  }
}

const RISK_STYLE: Record<Patient['risk'], { color: string; bg: string }> = {
  High: { color: 'text-organic-accent-800', bg: 'bg-organic-accent-200' },
  Med: { color: 'text-organic-accent-2-800', bg: 'bg-organic-accent-2-200' },
  Low: { color: 'text-organic-neutral-700', bg: 'bg-organic-neutral-200' },
}

// GET /patients defaults to limit=50 server-side. The old client sent nothing,
// so a practice with more than 50 patients silently saw 50 -- and because the
// query orders by last_seen DESC NULLS LAST, the ones that fell off the end
// were the least recently seen: exactly the patients at risk of being lost to
// follow-up. The page size is now explicit and the rest are reachable.
const PATIENT_PAGE_SIZE = 25

export default function PracticeAdminPortal() {
  const [view, setView] = useState<View>('dashboard')
  const [patientId, setPatientId] = useState<string | null>(null)
  const [realPatients, setRealPatients] = useState<Patient[]>([])
  const [patientTotal, setPatientTotal] = useState<number | null>(null)
  const [patientOffset, setPatientOffset] = useState(0)
  const [patientsLoading, setPatientsLoading] = useState(true)
  const [patientsError, setPatientsError] = useState<string | null>(null)
  const [clinicians, setClinicians] = useState<ClinicianRow[]>([])
  const [caseloadFilter, setCaseloadFilter] = useState<string | null>(null)
  const [hideSampleData, setHideSampleData] = useSampleDataHidden()
  const navigate = useNavigate()
  const { logout, user } = useAuthStore()
  const me = clinicians.find((c) => c.id === user?.sub) || null

  const loadClinicians = (): Promise<ClinicianRow[]> =>
    apiClient.getClinicians().then((rows: any[]) => {
      const mapped: ClinicianRow[] = rows.map((r) => ({
        id: r.id,
        fullName: r.full_name,
        initials: initialsOf(r.full_name),
        email: r.email,
        role: r.role,
        active: r.active,
        patientCount: r.patient_count,
      }))
      setClinicians(mapped)
      return mapped
    })

  const loadPatients = (cliniciansList: ClinicianRow[], offset: number) => {
    setPatientsLoading(true)
    setPatientsError(null)
    return apiClient
      .getPatientsPage({ limit: PATIENT_PAGE_SIZE, offset })
      .then((page) => {
        setRealPatients(page.items.map((r) => toPatientRow(r, cliniciansList)))
        setPatientTotal(page.total)
        setPatientOffset(page.offset)
      })
      .catch(() => {
        setRealPatients([])
        setPatientTotal(null)
        setPatientsError('Could not load the patient registry.')
      })
      .finally(() => setPatientsLoading(false))
  }

  // Clinicians first, because patient rows resolve "Assigned to" through them —
  // but the registry loads either way. Chaining it off a non-empty clinician
  // list meant a practice whose /clinicians call failed or came back empty sat
  // on "Loading…" forever with patients it could have shown.
  useEffect(() => {
    loadClinicians()
      .catch(() => {
        setClinicians([])
        return [] as ClinicianRow[]
      })
      .then((list) => loadPatients(list, 0))
  }, [])

  const refreshPatients = () => loadPatients(clinicians, patientOffset)
  const goToPatientPage = (offset: number) => loadPatients(clinicians, Math.max(0, offset))

  const openPatient = (id: string) => {
    setPatientId(id)
    setView('patientDetail')
  }

  const openCaseload = (clinicianId: string) => {
    setCaseloadFilter(clinicianId)
    setView('patients')
  }

  const patient = realPatients.find((p) => p.id === patientId) || null
  const title = view === 'patientDetail' ? patient?.name || '' : TITLES[view]
  const subtitle =
    view === 'patientDetail'
      ? `${patient?.status} · Primary: ${patient?.clinician}`
      : subtitleFor(view, { patientTotal, clinicianCount: clinicians.length })

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
            <div className="font-heading text-[1.0625rem] text-organic-text">Cedar &amp; Sage</div>
            <div className="text-[0.7812rem] text-organic-neutral-600">Practice admin</div>
          </div>
        </div>

        {NAV_ITEMS.map(({ view: v, label, icon: Icon, ready }) => {
          const active = v === view || (v === 'patients' && view === 'patientDetail')
          if (!ready) {
            return (
              <div
                key={v}
                title={`${label} — not built yet`}
                aria-disabled="true"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-organic-pill text-[0.9062rem] text-left text-organic-neutral-500 font-semibold opacity-50 cursor-not-allowed select-none"
              >
                <Icon size={19} />
                <span className="flex-1">{label}</span>
                <span className="text-[0.7812rem] uppercase tracking-wide bg-organic-neutral-200 text-organic-neutral-600 rounded-organic-pill px-1.5 py-0.5">
                  Soon
                </span>
              </div>
            )
          }
          return (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-organic-pill text-[0.9062rem] transition-colors text-left ${
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
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-organic-pill text-[0.9062rem] transition-colors text-left text-organic-accent-700 font-semibold hover:bg-organic-neutral-200"
        >
          <Stethoscope size={19} />
          Clinical Workspace
        </button>

        {/* The "Professional plan — 9 / 12 seats used" tile that used to sit
            here, progress bar and all, was three hardcoded strings. There is no
            plan or seat-allowance endpoint, so rather than keep a number that
            could never be right the tile is gone; it returns when there is
            something real to read it from. */}
        <div className="mt-auto flex items-center justify-between gap-2 px-2 py-1.5">
          <span className="text-[0.7812rem] font-semibold text-organic-neutral-600">Hide sample data</span>
          <button
            onClick={() => setHideSampleData(!hideSampleData)}
            title={hideSampleData ? 'Sample data hidden — click to show' : 'Sample data shown — click to hide'}
            aria-pressed={hideSampleData}
            className={`w-9 h-5 rounded-organic-pill relative flex-none transition-colors ${hideSampleData ? 'bg-organic-accent' : 'bg-organic-neutral-300'}`}
          >
            <span className={`absolute w-3.5 h-3.5 rounded-full bg-white top-[3px] transition-all ${hideSampleData ? 'right-[3px]' : 'left-[3px]'}`} />
          </button>
        </div>
        <div className="flex items-center gap-2.5 p-2 border-t border-organic-neutral-300/50 mt-1">
          <div className="w-[34px] h-[34px] rounded-full bg-organic-accent-300 grid place-items-center font-bold text-organic-accent-900 text-[0.8125rem]">
            {me ? initialsOf(me.fullName) : '—'}
          </div>
          <div className="leading-tight flex-1 min-w-0">
            <div className="text-[0.8125rem] font-semibold truncate">{me?.fullName || 'Loading…'}</div>
            <div className="text-[0.7812rem] text-organic-neutral-600 capitalize">{me?.role || ''}</div>
          </div>
          <button onClick={handleLogout} title="Log out">
            <LogOut size={17} className="text-organic-neutral-600" />
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 px-9 pt-8 pb-16 max-w-[1240px]">
        <header className="flex justify-between items-end gap-5 flex-wrap mb-7">
          <div>
            <h1 className="text-[2.125rem] font-heading text-organic-text mb-1">{title}</h1>
            <p className="text-organic-neutral-600 text-sm">{subtitle}</p>
          </div>
          <div className="flex gap-2.5 items-center">
            <TextSizeControl />
            <div className="flex items-center gap-2 bg-organic-surface border border-organic-neutral-300/60 rounded-organic-pill px-3.5 py-2 min-w-[200px]">
              <Search size={16} className="text-organic-neutral-500" />
              <span className="text-sm text-organic-neutral-500">Search patients, notes…</span>
            </div>
            {/* No unread dot: nothing feeds it, so it was a permanent claim
                that something needed attention. */}
            <button className="w-[42px] h-[42px] rounded-full border border-organic-neutral-300/60 bg-organic-surface grid place-items-center relative">
              <Bell size={18} />
            </button>
          </div>
        </header>

        {view === 'dashboard' && <DashboardView clinicianCount={clinicians.length} clinicianName={me?.fullName || null} />}
        {view === 'clinicians' && <CliniciansView clinicians={clinicians} onViewCaseload={openCaseload} />}
        {view === 'patients' && (
          <PatientsView
            patients={realPatients}
            clinicians={clinicians}
            onOpenPatient={openPatient}
            caseloadFilter={caseloadFilter}
            onClearCaseloadFilter={() => setCaseloadFilter(null)}
            total={patientTotal}
            offset={patientOffset}
            pageSize={PATIENT_PAGE_SIZE}
            loading={patientsLoading}
            error={patientsError}
            onGoToOffset={goToPatientPage}
            onReload={() => goToPatientPage(patientOffset)}
          />
        )}
        {view === 'patientDetail' &&
          (patient ? (
            <PatientDetailView
              patient={patient}
              clinicians={clinicians}
              onBack={() => setView('patients')}
              onReassigned={refreshPatients}
            />
          ) : (
            <div className="text-sm text-organic-neutral-600">Loading…</div>
          ))}
        {view === 'assessments' && <AssessmentsView />}
        {view === 'content' && <ContentView />}
        {view === 'access' && <AccessView />}
        {view === 'billing' && <BillingView />}
        {view === 'settings' && <SettingsView />}
      </main>
    </div>
  )
}

// ─── Dashboard ──────────────────────────────────────────────────────────────
//
// This screen used to offer three layout variants over two hardcoded arrays:
// STATS ("128 active patients", "94% assessment yield", "3 open risk alerts")
// and ALERTS, which listed named patients against invented clinical findings —
// "PHQ-9 item 9 elevated (suicidal ideation)" among them — beside a symptom
// trend chart whose line was a literal SVG path. None of it ever touched the
// API. All of it is gone.
//
// What replaces it reads GET /dashboard/summary, where every field is a
// COUNT(*) scoped to this org, plus the clinician count already loaded for the
// sidebar. Figures with no source behind them — assessment yield, seat
// allowances, month-over-month deltas — are not shown at all.

type StatTile = { label: string; value: number; note?: string; icon: typeof UsersRound }

function greetingFor(now: Date): string {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function DashboardView({ clinicianCount, clinicianName }: { clinicianCount: number; clinicianName: string | null }) {
  const [summary, setSummary] = useState<PracticeSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient
      .getPracticeSummary()
      .then(setSummary)
      .catch(() => setError('Could not load the practice figures.'))
      .finally(() => setLoading(false))
  }, [])

  const now = new Date()

  const tiles: StatTile[] = []
  if (summary) {
    tiles.push({
      label: 'Active patients',
      value: summary.active_cases,
      note: summary.new_this_month > 0 ? `${summary.new_this_month} registered this month` : undefined,
      icon: UsersRound,
    })
  }
  if (clinicianCount > 0) {
    tiles.push({ label: 'Clinicians', value: clinicianCount, icon: Stethoscope })
  }
  if (summary) {
    tiles.push({
      label: 'Patients flagged high risk',
      value: summary.high_priority,
      note: 'Risk level recorded on the patient record',
      icon: AlertTriangle,
    })
    tiles.push({ label: 'Sessions scheduled today', value: summary.sessions_today, icon: CalendarClock })
    tiles.push({ label: 'Assessments completed', value: summary.assessments_completed, note: 'All time', icon: ClipboardList })
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-organic-accent-600 to-organic-accent-800 rounded-[28px] p-9 text-organic-accent-100 mb-[18px]">
        <div className="text-[0.8125rem] opacity-80 mb-1.5">
          {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
        <h2 className="text-3xl font-heading text-organic-accent-100 mb-2">
          {greetingFor(now)}
          {clinicianName ? `, ${clinicianName}` : ''}.
        </h2>
        {summary && (
          <p className="opacity-85 text-[0.9375rem]">
            {summary.sessions_today} {summary.sessions_today === 1 ? 'session is' : 'sessions are'} scheduled today
            {summary.high_priority > 0 &&
              ` · ${summary.high_priority} ${summary.high_priority === 1 ? 'patient is' : 'patients are'} flagged high risk`}
            .
          </p>
        )}
      </div>

      {loading && <div className="text-sm text-organic-neutral-600 py-6">Loading practice figures…</div>}
      {error && (
        <div className="text-sm text-organic-accent-800 bg-organic-accent-100 rounded-organic-tile px-3.5 py-2.5 mb-4">{error}</div>
      )}

      {tiles.length > 0 && (
        <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(224px, 1fr))' }}>
          {tiles.map((st) => (
            <div key={st.label} className="bg-organic-surface rounded-organic-card p-[18px] shadow-organic-sm">
              <div className="flex justify-between items-start gap-2">
                <span className="text-xs text-organic-neutral-600">{st.label}</span>
                <st.icon size={17} className="text-organic-accent-500 flex-none" />
              </div>
              <div className="font-heading text-[2.25rem] my-1.5 text-organic-text">{st.value}</div>
              {st.note && <div className="text-xs text-organic-neutral-600">{st.note}</div>}
            </div>
          ))}
        </div>
      )}

      <div className="bg-organic-surface rounded-organic-card p-[22px] shadow-organic-sm">
        <h3 className="text-lg font-heading text-organic-text mb-1.5">Risk review</h3>
        <p className="text-[0.8125rem] text-organic-neutral-600 leading-relaxed">
          There is no live risk feed yet — nothing scores an assessment answer against a flag threshold and raises it
          here — so this space is deliberately empty rather than filled with examples. The high-risk figure above counts
          the risk level recorded on each patient record; open the Patient registry and filter by High risk to work
          through those patients.
        </p>
      </div>
    </div>
  )
}

// The "Next action" column is gone with the mock data that fed it: every real
// row carried a literal em dash, because nothing computes a next action.
function PatientsTable({ patients, onOpenPatient }: { patients: Patient[]; onOpenPatient: (id: string) => void }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>
          <th className="text-left text-[0.7812rem] tracking-wide uppercase text-organic-neutral-600 px-2 py-2.5 border-b border-organic-neutral-300/60">Patient</th>
          <th className="text-left text-[0.7812rem] tracking-wide uppercase text-organic-neutral-600 px-2 py-2.5 border-b border-organic-neutral-300/60">Clinician</th>
          <th className="text-left text-[0.7812rem] tracking-wide uppercase text-organic-neutral-600 px-2 py-2.5 border-b border-organic-neutral-300/60">Last session</th>
          <th className="text-left text-[0.7812rem] tracking-wide uppercase text-organic-neutral-600 px-2 py-2.5 border-b border-organic-neutral-300/60">Risk</th>
        </tr>
      </thead>
      <tbody>
        {patients.map((p) => (
          <tr key={p.id} onClick={() => onOpenPatient(p.id)} className="cursor-pointer">
            <td className="px-2 py-3 border-b border-organic-text/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-organic-accent-200 grid place-items-center text-[0.7812rem] font-bold text-organic-accent-800">{p.initials}</div>
                <span className="font-semibold">{p.name}</span>
              </div>
            </td>
            <td className="px-2 py-3 border-b border-organic-text/[0.08] text-organic-neutral-700">{p.clinician}</td>
            <td className="px-2 py-3 border-b border-organic-text/[0.08] text-organic-neutral-700">{p.last}</td>
            <td className="px-2 py-3 border-b border-organic-text/[0.08]">
              <span className={`text-[0.7812rem] font-semibold px-2.5 py-0.5 rounded-organic-pill ${RISK_STYLE[p.risk].bg} ${RISK_STYLE[p.risk].color}`}>{p.risk}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── Clinicians ─────────────────────────────────────────────────────────────

function CliniciansView({ clinicians, onViewCaseload }: { clinicians: ClinicianRow[]; onViewCaseload: (id: string) => void }) {
  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-sm px-5 py-2.5 inline-flex items-center gap-2">
          <Plus size={16} /> Invite clinician
        </button>
      </div>
      {clinicians.length === 0 && <div className="text-sm text-organic-neutral-600">Loading…</div>}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {clinicians.map((c) => (
          <div key={c.id} className="bg-organic-surface rounded-organic-card p-5 shadow-organic-sm">
            <div className="flex items-center gap-3.5 mb-3.5">
              <div className="w-12 h-12 rounded-full bg-organic-accent-2-200 grid place-items-center font-bold text-organic-accent-2-800">{c.initials}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[0.9375rem] truncate">{c.fullName}</div>
                <div className="text-xs text-organic-neutral-600 capitalize">{c.role}</div>
              </div>
              <span className={`text-[0.7812rem] font-semibold px-2.5 py-0.5 rounded-organic-pill ${c.active ? 'bg-organic-accent-2-100 text-organic-accent-2-800' : 'bg-organic-neutral-200 text-organic-neutral-700'}`}>
                {c.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-organic-neutral-300/50 text-sm">
              <div>
                <div className="text-organic-neutral-500 text-[0.7812rem]">Patients</div>
                <div className="font-semibold">{c.patientCount}</div>
              </div>
              <button
                onClick={() => onViewCaseload(c.id)}
                className="text-xs font-semibold text-organic-accent-700 rounded-organic-pill border border-organic-accent-300 px-3 py-1.5 hover:bg-organic-accent-100"
              >
                View caseload
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Patients ───────────────────────────────────────────────────────────────

function PatientsView({
  patients,
  clinicians,
  onOpenPatient,
  caseloadFilter,
  onClearCaseloadFilter,
  total,
  offset,
  pageSize,
  loading,
  error,
  onGoToOffset,
  onReload,
}: {
  patients: Patient[]
  clinicians: ClinicianRow[]
  onOpenPatient: (id: string) => void
  caseloadFilter: string | null
  onClearCaseloadFilter: () => void
  /** Rows behind the filter across every page, or null if the server sent none. */
  total: number | null
  offset: number
  pageSize: number
  loading: boolean
  error: string | null
  onGoToOffset: (offset: number) => void
  /** Re-fetch the current page after an import adds rows. */
  onReload: () => void
}) {
  const [filter, setFilter] = useState<'All' | 'High risk' | 'Intake'>('All')
  const [showImport, setShowImport] = useState(false)
  const byRiskOrStatus = patients.filter((p) => (filter === 'All' ? true : filter === 'High risk' ? p.risk === 'High' : p.status === 'Intake'))
  const filtered = caseloadFilter ? byRiskOrStatus.filter((p) => p.therapistId === caseloadFilter) : byRiskOrStatus
  const caseloadClinician = caseloadFilter ? clinicians.find((c) => c.id === caseloadFilter) : null

  // The risk/status pills and the caseload filter both run over the rows this
  // page happens to hold — the API has no filter for either — so whenever one
  // is on, the counts below have to say so rather than read like practice-wide
  // totals.
  const clientFiltered = filter !== 'All' || caseloadFilter !== null

  const first = patients.length === 0 ? 0 : offset + 1
  const last = offset + patients.length
  const hasPrev = offset > 0
  // With a total we know exactly; without one, another page is possible only
  // if this one came back full.
  const hasNext = total === null ? patients.length === pageSize : last < total

  return (
    <div>
      {caseloadFilter && (
        <div className="flex items-center gap-2 bg-organic-accent-100 text-organic-accent-800 text-sm rounded-organic-tile px-3.5 py-2 mb-3.5 flex-wrap">
          <span>
            Showing {caseloadClinician?.fullName || 'this clinician'}&apos;s patients
            {caseloadClinician ? ` — ${filtered.length} of their ${caseloadClinician.patientCount} on this page` : ''}
          </span>
          <button onClick={onClearCaseloadFilter} className="ml-auto text-xs underline">
            Clear
          </button>
        </div>
      )}
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
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="rounded-organic-pill border border-organic-neutral-300/60 bg-organic-surface text-organic-neutral-800 font-heading text-sm px-5 py-2.5 inline-flex items-center gap-2"
          >
            <Upload size={16} /> Import from form
          </button>
          <button className="rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-sm px-5 py-2.5 inline-flex items-center gap-2">
            <UserPlus size={16} /> Register patient
          </button>
        </div>
      </div>
      {showImport && (
        <ImportPatientsModal
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false)
            onReload()
          }}
        />
      )}
      <div className="bg-organic-surface rounded-organic-card p-[22px] pt-2 shadow-organic-sm">
        {error ? (
          <div className="text-sm text-organic-accent-800 py-3">{error}</div>
        ) : loading ? (
          <div className="text-sm text-organic-neutral-600 py-3">Loading…</div>
        ) : patients.length === 0 ? (
          <div className="text-sm text-organic-neutral-600 py-3">
            {offset > 0 ? 'No patients on this page.' : 'No patients registered yet.'}
          </div>
        ) : (
          <PatientsTable patients={filtered} onOpenPatient={onOpenPatient} />
        )}

        {/* The pager also shows on an empty page reached from a later offset —
            otherwise there is no way back. */}
        {!error && !loading && (patients.length > 0 || offset > 0) && (
          <div className="flex items-center justify-between gap-3 flex-wrap pt-3.5 mt-1 border-t border-organic-neutral-300/50">
            <div className="text-[0.8125rem] text-organic-neutral-600">
              {patients.length === 0 ? (
                <>No rows on this page{total !== null && <> · {total} in the registry</>}</>
              ) : clientFiltered ? (
                <>
                  Showing {filtered.length} of the {patients.length} on this page
                  {total !== null && <> · {total} in the registry</>}
                </>
              ) : total !== null ? (
                <>
                  Showing {first}–{last} of {total}
                </>
              ) : (
                // No total came back, so how many are beyond this page is
                // unknown — say that instead of implying these are all of them.
                <>
                  Showing {first}–{last} · total not reported by the server
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onGoToOffset(offset - pageSize)}
                disabled={!hasPrev}
                className="rounded-organic-pill border border-organic-neutral-300/60 bg-organic-surface text-[0.8125rem] font-semibold px-3.5 py-1.5 inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={15} /> Previous
              </button>
              <button
                onClick={() => onGoToOffset(offset + pageSize)}
                disabled={!hasNext}
                className="rounded-organic-pill border border-organic-neutral-300/60 bg-organic-surface text-[0.8125rem] font-semibold px-3.5 py-1.5 inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Patient detail (drill-in) ──────────────────────────────────────────────

// The four-folder document browser that used to sit here (FOLDERS /
// FOLDER_FILES) listed invented files -- "Intake form.pdf · 2 days ago",
// "Session 04 note.md · Yesterday", "AI summary — wk 4.md", "Risk digest.md" --
// against whichever REAL patient had just been clicked in the registry. It was
// only wrapped in SampleGate, which defaults to showing samples, so those files
// were what an admin saw by default on a named patient's record: a fabricated
// clinical document trail. There is no documents endpoint to read, so the claim
// is dropped rather than faked, and the honest empty state is now unconditional.

function PatientDetailView({
  patient,
  clinicians,
  onBack,
  onReassigned,
}: {
  patient: Patient
  clinicians: ClinicianRow[]
  onBack: () => void
  onReassigned: () => void
}) {
  const [reassigning, setReassigning] = useState(false)
  const [reassignError, setReassignError] = useState<string | null>(null)

  // Transferring a patient between clinicians had no error handling: on a
  // 403/404/500 the promise rejected unhandled, the select snapped back, and
  // nothing told anyone. A failed care transfer looked exactly like a
  // successful one -- meaning a patient could be believed to be on a
  // colleague's caseload while remaining on nobody's.
  const handleReassign = async (newClinicianId: string) => {
    if (!newClinicianId || newClinicianId === patient.therapistId) return
    setReassigning(true)
    setReassignError(null)
    try {
      await apiClient.updatePatient(patient.id, { therapist_id: newClinicianId })
      onReassigned()
    } catch (err: any) {
      setReassignError(
        err?.response?.data?.detail || 'Could not reassign this patient. They remain with their current clinician.',
      )
    } finally {
      setReassigning(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-[18px]">
        <button onClick={onBack} className="w-[38px] h-[38px] rounded-full border border-organic-neutral-300/60 bg-organic-surface grid place-items-center">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-3.5 flex-1">
          <div className="w-[52px] h-[52px] rounded-full bg-organic-accent-200 grid place-items-center font-bold text-base text-organic-accent-800">{patient.initials}</div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-heading text-[1.375rem]">{patient.name}</span>
              <span className={`text-[0.7812rem] font-semibold px-2.5 py-0.5 rounded-organic-pill ${RISK_STYLE[patient.risk].bg} ${RISK_STYLE[patient.risk].color}`}>{patient.risk} risk</span>
            </div>
            <div className="text-sm text-organic-neutral-600">Last session {patient.last}</div>
          </div>
        </div>
        <div className="text-right">
          <label className="block text-[0.7812rem] text-organic-neutral-500 mb-1">Assigned clinician</label>
          <select
            value={patient.therapistId || ''}
            onChange={(e) => handleReassign(e.target.value)}
            disabled={reassigning || clinicians.length === 0}
            className="text-sm font-semibold bg-organic-surface border border-organic-neutral-300/60 rounded-organic-pill px-3 py-1.5 disabled:opacity-50"
          >
            {!patient.therapistId && <option value="">Unassigned</option>}
            {clinicians.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
              </option>
            ))}
          </select>
        </div>
      </div>
      {reassignError && (
        <div className="text-sm text-organic-accent-800 bg-organic-accent-100 rounded-organic-tile px-3.5 py-2.5 mb-3.5">
          {reassignError}
        </div>
      )}
      <div className="grid grid-cols-[2fr_1fr] gap-4">
        <div className="bg-organic-surface rounded-organic-card p-[22px] shadow-organic-sm">
          <h4 className="text-base font-heading mb-2">Documents</h4>
          <p className="text-[0.8125rem] text-organic-neutral-600 leading-relaxed">
            No documents are stored against this patient. Nothing in the product uploads or reads patient files yet, so
            this panel stays empty rather than showing an example of what one would look like.
          </p>
        </div>
        <aside className="flex flex-col gap-3.5">
          <div className="bg-gradient-to-br from-organic-accent-100 to-organic-surface rounded-organic-tile p-5 shadow-organic-sm">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={17} className="text-organic-accent-700" />
              <h4 className="text-base font-heading">AI clinical insights</h4>
            </div>
            <p className="text-[0.8125rem] text-organic-neutral-600 leading-relaxed">
              Generated after enough session and assessment history accumulates for this patient.
            </p>
          </div>
          <div className="bg-organic-surface rounded-organic-tile p-5 shadow-organic-sm">
            <h4 className="text-base font-heading mb-3">Latest scores</h4>
            <p className="text-[0.8125rem] text-organic-neutral-600">No assessments recorded yet.</p>
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
  name_ar: string | null
  template_type: string | null
  category: string | null
  category_ar: string | null
  license_status: string | null
  availability_state: string | null
  requires_governance_approval?: boolean
  description: string | null
  is_active: boolean
  current_published_version_number: number | null
}

function AssessmentsView() {
  const [catalog, setCatalog] = useState<CatalogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [selected, setSelected] = useState<CatalogEntry | null>(null)
  const [trialEntry, setTrialEntry] = useState<CatalogEntry | null>(null)
  const [lang, setLang] = useState<'en' | 'ar'>('en')
  const jsonInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  const displayName = (t: CatalogEntry) => (lang === 'ar' && t.name_ar ? t.name_ar : t.name)

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
          <div className="flex gap-2 items-center">
            <div className="inline-flex bg-organic-neutral-100 border border-organic-neutral-300/60 rounded-organic-pill p-0.5 mr-1">
              {(['en', 'ar'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`text-[0.7812rem] font-heading px-3 py-1.5 rounded-organic-pill ${lang === l ? 'bg-organic-accent text-organic-neutral-100' : 'text-organic-neutral-700'}`}
                >
                  {l === 'en' ? 'EN' : 'عربي'}
                </button>
              ))}
            </div>
            <input ref={jsonInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleJsonFile} />
            <input ref={pdfInputRef} type="file" accept="application/pdf,image/png,image/jpeg" className="hidden" onChange={handlePdfFile} />
            <button
              onClick={() => pdfInputRef.current?.click()}
              className="rounded-organic-pill border border-organic-neutral-300/60 text-organic-neutral-700 text-[0.8125rem] font-heading px-4 py-2 inline-flex items-center gap-1.5"
            >
              <Upload size={15} /> Upload document
            </button>
            <button
              onClick={() => jsonInputRef.current?.click()}
              className="rounded-organic-pill bg-organic-accent text-organic-accent-100 text-[0.8125rem] font-heading px-4 py-2 inline-flex items-center gap-1.5"
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
            <h4
              className="text-[0.7812rem] font-heading uppercase tracking-wide text-organic-neutral-500 mb-2 px-1"
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
            >
              {lang === 'ar' ? items[0]?.category_ar || category : category}
            </h4>
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
                  <div className="flex-1" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    <div className="font-bold text-[0.9375rem]">{displayName(t)}</div>
                    <div className="text-xs text-organic-neutral-600">{t.description || t.template_type || 'Assessment'}</div>
                  </div>
                  <span className="text-[0.7812rem] px-2.5 py-0.5 rounded-organic-pill bg-organic-neutral-200 text-organic-neutral-700">{t.template_type || 'FREE'}</span>
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
                  <div className="flex-1" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    <div className="font-bold text-[0.9375rem]">{displayName(t)}</div>
                    <div className="text-xs text-organic-neutral-600">{t.description}</div>
                  </div>
                  <span className="text-[0.7812rem] px-2.5 py-0.5 rounded-organic-pill bg-organic-accent-300/60 text-organic-accent-800 font-semibold flex-none">
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
              {reserved.map((t) => {
                const st = t.availability_state || 'RESERVED'
                const onTrial = st === 'TRIAL'
                const licensed = st === 'LICENSED_ACTIVE'
                return (
                  <div
                    key={t.id}
                    onClick={() => setTrialEntry(t)}
                    className={`rounded-organic-tile p-[18px] shadow-organic-sm flex items-center gap-4 cursor-pointer hover:shadow transition-shadow ${
                      onTrial ? 'bg-organic-accent-100/60' : licensed ? 'bg-organic-surface' : 'bg-organic-surface/60 opacity-75'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-organic-tile grid place-items-center flex-none ${
                        onTrial ? 'bg-organic-accent-200' : 'bg-organic-neutral-200'
                      }`}
                    >
                      {onTrial ? (
                        <FlaskConical size={20} className="text-organic-accent-700" />
                      ) : licensed ? (
                        <ShieldCheck size={20} className="text-organic-accent-700" />
                      ) : (
                        <Lock size={20} className="text-organic-neutral-500" />
                      )}
                    </div>
                    <div className="flex-1" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                      <div className="font-bold text-[0.9375rem] text-organic-neutral-700">{displayName(t)}</div>
                      <div className="text-xs text-organic-neutral-500">{t.description}</div>
                    </div>
                    <span
                      className={`text-[0.7812rem] px-2.5 py-0.5 rounded-organic-pill font-semibold flex-none ${
                        onTrial
                          ? 'bg-organic-accent-300/60 text-organic-accent-800'
                          : licensed
                          ? 'bg-organic-accent-2-200 text-organic-accent-2-800'
                          : 'bg-organic-neutral-300/60 text-organic-neutral-700'
                      }`}
                    >
                      {onTrial ? 'Trial' : licensed ? 'Licensed' : 'License required'}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
      <div className="bg-organic-surface rounded-organic-card p-6 shadow-organic-sm">
        {/* This panel previously rendered a hardcoded PHQ-9 score of 14/27 for
            an invented patient, complete with a red "Item 9 = 2 — thoughts of
            self-harm" risk flag. It sat on a live screen next to real catalog
            data and was indistinguishable from a genuine result. Fabricated
            clinical findings must never render; a real result viewer belongs
            here, reading from getPatientAssessments. */}
        <h3 className="text-[1.375rem] font-heading mb-1.5">Assessment results</h3>
        <p className="text-[0.8125rem] text-organic-neutral-600">
          Open a patient from the Patients list to see their scored assessments,
          severity bands and any risk flags.
        </p>
      </div>

      {trialEntry && (
        <TrialModePanel
          entry={trialEntry}
          onClose={() => setTrialEntry(null)}
          onChanged={reload}
        />
      )}

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
            <h2 className="text-[1.5rem] font-heading text-organic-text">
              {lang === 'ar' && catalogEntry.name_ar ? catalogEntry.name_ar : catalogEntry.name}
            </h2>
            <p className="text-sm text-organic-neutral-600">
              {lang === 'ar'
                ? catalogEntry.category_ar || catalogEntry.category || catalogEntry.template_type
                : catalogEntry.category || catalogEntry.template_type}
            </p>
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
              className={`font-heading text-[0.8125rem] px-4 py-1.5 rounded-organic-pill ${lang === l ? 'bg-organic-accent text-organic-neutral-100' : 'text-organic-neutral-700'}`}
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
                <pre className="bg-organic-neutral-100 rounded-organic-tile p-3 text-[0.7812rem] overflow-x-auto">
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


/**
 * Bulk patient import.
 *
 * Takes the completed intake workbook (or a CSV/JSON export of it) and posts it
 * to /patients/bulk-upload. The import is partial by design: valid rows are
 * created and invalid ones are reported back with the row number from the
 * source file, so a single bad date does not reject a whole clinic's list.
 */
function ImportPatientsModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ created: number; failed: number; errors: { row: number; error: string }[] } | null>(null)

  const upload = async () => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      setResult(await apiClient.bulkUploadPatients(file))
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'The file could not be imported.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center p-6" onClick={onClose}>
      <div
        className="bg-organic-bg rounded-organic-card w-full max-w-[620px] max-h-[85vh] overflow-y-auto p-7 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[1.375rem] font-heading text-organic-text mb-1.5">Import patients</h2>
        <p className="text-sm text-organic-neutral-600 mb-5">
          Upload the completed intake form. Accepts the .xlsx form directly, or a .csv / .json
          export of it. Up to 200 patients per file.
        </p>

        {!result && (
          <>
            <label className="block bg-organic-surface border border-dashed border-organic-neutral-300 rounded-organic-tile p-6 text-center cursor-pointer mb-4">
              <input
                type="file"
                accept=".xlsx,.xlsm,.csv,.json"
                className="hidden"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null)
                  setError(null)
                }}
              />
              <Upload size={22} className="text-organic-neutral-500 mx-auto mb-2" />
              <div className="text-sm font-semibold text-organic-text">
                {file ? file.name : 'Choose the completed form'}
              </div>
              <div className="text-xs text-organic-neutral-600 mt-0.5">.xlsx, .csv or .json</div>
            </label>

            <p className="text-xs text-organic-neutral-600 mb-4">
              The file contains identifiable patient information. Delete your copy once the
              import has completed.
            </p>

            {error && <div className="text-sm text-organic-accent-800 mb-3">{error}</div>}

            <div className="flex gap-2">
              <button
                onClick={upload}
                disabled={!file || busy}
                className="rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-sm px-5 py-2.5 disabled:opacity-50"
              >
                {busy ? 'Importing…' : 'Import'}
              </button>
              <button
                onClick={onClose}
                className="rounded-organic-pill border border-organic-neutral-300/60 text-organic-neutral-700 font-heading text-sm px-5 py-2.5"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {result && (
          <>
            <div className="bg-organic-surface rounded-organic-tile p-4 mb-4">
              <div className="text-sm text-organic-text">
                <strong>{result.created}</strong> patient{result.created === 1 ? '' : 's'} added
                {result.failed > 0 && (
                  <>
                    {' · '}
                    <strong className="text-organic-accent-800">{result.failed}</strong> row
                    {result.failed === 1 ? '' : 's'} not imported
                  </>
                )}
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-semibold mb-2">
                  These rows were skipped — the rest were imported.
                </div>
                <div className="flex flex-col gap-1.5 max-h-[240px] overflow-y-auto">
                  {result.errors.map((e) => (
                    <div key={e.row} className="text-[0.8125rem] bg-organic-accent-100 rounded-organic-tile px-3 py-2">
                      <span className="font-semibold">Row {e.row}</span> — {e.error}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-organic-neutral-600 mt-2">
                  Row numbers match the form: the header is row 1, so the first patient is row 2.
                  Correct those rows and import the file again — the patients already added are
                  not duplicated by name, so re-importing a corrected file is safe only for the
                  rows that failed. Remove the successful rows before re-uploading.
                </p>
              </div>
            )}

            <button
              onClick={onImported}
              className="rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-sm px-5 py-2.5"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Content library ────────────────────────────────────────────────────────
//
// GET /admin/resources has been serving the ingested knowledge base all along
// and had no caller: this view rendered six invented rows ("Grounding &
// Breathing (Audio)", "DBT Skills — Distress Tolerance") with invented access
// labels. It now reads the real table.
//
// The provenance marker is the part that matters clinically. Each ingested
// topic library is tagged either:
//
//   verified    an audit independently re-checked a sample of that topic's
//               citations against live sources
//   unverified  that check never ran, so the citations behind these items have
//               NOT been independently confirmed
//
// A reading list that was never checked must not look like one that was, so
// every card states which it is and the header counts how many are unchecked.

type Provenance = 'verified' | 'unverified' | 'unrecorded'

// Tags that describe the item rather than its subject: the media word and the
// provenance marker. Whatever is left is the topic.
const NON_TOPIC_TAGS = new Set(['book', 'paper', 'video', 'verified', 'unverified'])

const CATEGORY_META: Record<string, { label: string; icon: typeof BookOpen }> = {
  BOOK: { label: 'Books', icon: BookOpen },
  PAPER: { label: 'Papers', icon: FileText },
  VIDEO: { label: 'Videos', icon: PlayCircle },
}

function categoryLabel(category: string): string {
  return CATEGORY_META[category]?.label || category
}

function provenanceOf(tags: string[]): Provenance {
  if (tags.includes('verified')) return 'verified'
  if (tags.includes('unverified')) return 'unverified'
  return 'unrecorded'
}

function topicOf(tags: string[]): string | null {
  return tags.find((t) => !NON_TOPIC_TAGS.has(t)) || null
}

function humanTopic(slug: string): string {
  return slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const PROVENANCE_STYLE: Record<Provenance, { label: string; title: string; className: string }> = {
  verified: {
    label: 'Citations checked',
    title: 'An audit independently re-checked a sample of this topic’s citations against live sources.',
    className: 'bg-organic-accent-2-100 text-organic-accent-2-800',
  },
  unverified: {
    label: 'Citations NOT checked',
    title: 'No independent citation check was ever run for this topic. Verify anything you rely on before using it with a patient.',
    className: 'bg-organic-accent-200 text-organic-accent-800',
  },
  unrecorded: {
    label: 'Provenance not recorded',
    title: 'This item carries no provenance marker, so there is no record of a citation check either way.',
    className: 'bg-organic-neutral-200 text-organic-neutral-700',
  },
}

function ProvenanceBadge({ provenance }: { provenance: Provenance }) {
  const style = PROVENANCE_STYLE[provenance]
  return (
    <span
      title={style.title}
      className={`text-[0.7812rem] font-semibold px-2.5 py-0.5 rounded-organic-pill inline-flex items-center gap-1 ${style.className}`}
    >
      {provenance === 'verified' ? <ShieldCheck size={13} /> : <AlertTriangle size={13} />}
      {style.label}
    </span>
  )
}

function FilterPill({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-4 py-1.5 rounded-organic-pill font-semibold ${
        active ? 'bg-organic-accent text-organic-accent-100' : 'bg-organic-surface text-organic-neutral-700 border border-organic-neutral-300/60'
      }`}
    >
      {label} <span className="opacity-70">{count}</span>
    </button>
  )
}

function ContentView() {
  const [resources, setResources] = useState<ResourceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<string>('All')
  const [topic, setTopic] = useState<string>('All')

  useEffect(() => {
    apiClient
      .getResources()
      .then(setResources)
      .catch(() => setError('Could not load the content library.'))
      .finally(() => setLoading(false))
  }, [])

  const withTags = resources.map((r) => ({ ...r, tags: Array.isArray(r.tags) ? r.tags : [] }))

  const topicMatches = (r: ResourceItem) => topic === 'All' || topicOf(r.tags) === topic
  const categoryMatches = (r: ResourceItem) => category === 'All' || r.category === category

  const categories = Array.from(new Set(withTags.map((r) => r.category))).sort()
  const topics = Array.from(
    new Set(withTags.map((r) => topicOf(r.tags)).filter((t): t is string => t !== null)),
  ).sort()

  const visible = withTags.filter((r) => categoryMatches(r) && topicMatches(r))
  const unchecked = visible.filter((r) => provenanceOf(r.tags) !== 'verified')

  // Grouped by category so a category filter of "All" still reads as a library
  // rather than one undifferentiated wall of cards.
  const grouped = visible.reduce<Record<string, ResourceItem[]>>((acc, r) => {
    ;(acc[r.category] ||= []).push(r)
    return acc
  }, {})
  const groupOrder = Object.keys(grouped).sort()

  if (loading) return <div className="text-sm text-organic-neutral-600 py-8">Loading the content library…</div>
  if (error) return <div className="text-sm text-organic-accent-800 bg-organic-accent-100 rounded-organic-tile px-3.5 py-2.5">{error}</div>
  if (resources.length === 0) {
    return <div className="text-sm text-organic-neutral-600 py-8">No resources have been ingested for this practice yet.</div>
  }

  return (
    <div>
      <div className="flex flex-col gap-2.5 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[0.7812rem] uppercase tracking-wide text-organic-neutral-500 w-[62px]">Type</span>
          <FilterPill label="All" count={withTags.filter(topicMatches).length} active={category === 'All'} onClick={() => setCategory('All')} />
          {categories.map((c) => (
            <FilterPill
              key={c}
              label={categoryLabel(c)}
              count={withTags.filter((r) => r.category === c && topicMatches(r)).length}
              active={category === c}
              onClick={() => setCategory(c)}
            />
          ))}
        </div>
        {topics.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[0.7812rem] uppercase tracking-wide text-organic-neutral-500 w-[62px]">Topic</span>
            <FilterPill label="All" count={withTags.filter(categoryMatches).length} active={topic === 'All'} onClick={() => setTopic('All')} />
            {topics.map((t) => (
              <FilterPill
                key={t}
                label={humanTopic(t)}
                count={withTags.filter((r) => topicOf(r.tags) === t && categoryMatches(r)).length}
                active={topic === t}
                onClick={() => setTopic(t)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="bg-organic-surface rounded-organic-tile p-4 shadow-organic-sm mb-4 text-[0.8125rem] text-organic-neutral-700 leading-relaxed">
        <div className="flex items-start gap-2.5">
          <ShieldCheck size={17} className="text-organic-accent-2-600 flex-none mt-0.5" />
          <div>
            <strong className="font-semibold">Citations checked</strong> means an audit independently re-checked a sample
            of that topic&apos;s citations against live sources. <strong className="font-semibold">Citations NOT checked</strong>{' '}
            means that check never ran — treat those entries as unconfirmed and verify anything you pass to a patient.
            {unchecked.length > 0 && (
              <div className="mt-1.5 text-organic-accent-800">
                {unchecked.length} of the {visible.length} {visible.length === 1 ? 'item' : 'items'} shown{' '}
                {unchecked.length === 1 ? 'has' : 'have'} not been through a citation check.
              </div>
            )}
          </div>
        </div>
      </div>

      {visible.length === 0 && <div className="text-sm text-organic-neutral-600 py-6">Nothing matches those filters.</div>}

      {groupOrder.map((cat) => (
        <div key={cat} className="mb-6">
          <h3 className="text-[0.7812rem] font-heading uppercase tracking-wide text-organic-neutral-500 mb-2.5 px-1">
            {categoryLabel(cat)} · {grouped[cat].length}
          </h3>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {grouped[cat].map((r) => {
              const Icon = CATEGORY_META[r.category]?.icon || FileText
              const slug = topicOf(r.tags)
              return (
                <div key={r.id} className="bg-organic-surface rounded-organic-card p-5 shadow-organic-sm flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="w-[46px] h-[46px] rounded-organic-tile bg-organic-accent-100 grid place-items-center flex-none">
                      <Icon size={22} className="text-organic-accent-700" />
                    </div>
                    <span className="text-[0.7812rem] px-2.5 py-0.5 rounded-organic-pill bg-organic-neutral-200 text-organic-neutral-700">
                      {r.category}
                    </span>
                  </div>
                  <div>
                    <div className="font-bold text-[0.9375rem] leading-tight">{r.title}</div>
                    {r.author && <div className="text-xs text-organic-neutral-600 mt-1">{r.author}</div>}
                  </div>
                  {r.description && (
                    <p className="text-[0.8125rem] text-organic-neutral-700 leading-relaxed line-clamp-4">{r.description}</p>
                  )}
                  <div className="flex items-center gap-1.5 flex-wrap mt-auto">
                    {slug && (
                      <span className="text-[0.7812rem] px-2.5 py-0.5 rounded-organic-pill bg-organic-accent-100 text-organic-accent-800">
                        {humanTopic(slug)}
                      </span>
                    )}
                    <ProvenanceBadge provenance={provenanceOf(r.tags)} />
                  </div>
                  {r.file_url && (
                    <a
                      href={r.file_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-[0.8125rem] font-semibold text-organic-accent-700 inline-flex items-center gap-1.5 pt-2.5 border-t border-organic-neutral-300/50"
                    >
                      <ExternalLink size={14} /> Open resource
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
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
  const [hideSampleData] = useSampleDataHidden()
  return (
    <SampleGate
      hidden={hideSampleData}
      placeholder={
        <div className="text-sm text-organic-neutral-600 py-8">
          Role and permission details will appear here once access control is configured.
        </div>
      }
    >
    <div className="flex flex-col gap-[18px]">
      <div className="bg-organic-surface rounded-organic-card p-6 shadow-organic-sm">
        <h3 className="text-lg font-heading mb-1">Role permissions</h3>
        <p className="text-[0.8125rem] text-organic-neutral-600 mb-4">Baseline capabilities per role. Override per user below.</p>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="text-left text-[0.7812rem] tracking-wide uppercase text-organic-neutral-600 px-2 py-2.5 border-b border-organic-neutral-300/60">Capability</th>
              <th className="text-[0.7812rem] tracking-wide uppercase text-organic-neutral-600 px-2 py-2.5 border-b border-organic-neutral-300/60">Admin</th>
              <th className="text-[0.7812rem] tracking-wide uppercase text-organic-neutral-600 px-2 py-2.5 border-b border-organic-neutral-300/60">Supervisor</th>
              <th className="text-[0.7812rem] tracking-wide uppercase text-organic-neutral-600 px-2 py-2.5 border-b border-organic-neutral-300/60">Clinician</th>
              <th className="text-[0.7812rem] tracking-wide uppercase text-organic-neutral-600 px-2 py-2.5 border-b border-organic-neutral-300/60">Patient</th>
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
              <div className="w-9 h-9 rounded-full bg-organic-accent-2-200 grid place-items-center text-[0.7812rem] font-bold text-organic-accent-2-800">{o.initials}</div>
              <div className="flex-1">
                <div className="font-semibold text-sm">{o.user}</div>
                <div className="text-[0.7812rem] text-organic-neutral-700">{o.rule}</div>
              </div>
              <Pencil size={16} className="text-organic-neutral-500" />
            </div>
          ))}
        </div>
      </div>
    </div>
    </SampleGate>
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
  const [hideSampleData] = useSampleDataHidden()
  return (
    <SampleGate
      hidden={hideSampleData}
      placeholder={<div className="text-sm text-organic-neutral-600 py-8">Billing and plan details are not available yet.</div>}
    >
    <div className="flex flex-col gap-[18px]">
      <div className="grid grid-cols-3 gap-3.5">
        {USAGE.map((u) => (
          <div key={u.label} className="bg-organic-surface rounded-organic-tile p-5 shadow-organic-sm">
            <div className="text-[0.8125rem] text-organic-neutral-600 mb-2">{u.label}</div>
            <div className="font-heading text-[1.625rem] mb-2.5">
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
                <span className="font-heading text-[2.125rem] text-organic-accent-700">{pl.price}</span>
                <span className="text-xs text-organic-neutral-500">{pl.per}</span>
              </div>
              <div className="flex flex-col gap-2.5 flex-1 mb-[18px]">
                {pl.feats.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-[0.8125rem] text-organic-neutral-800">
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
        <button className="rounded-organic-pill border border-organic-neutral-300/60 font-heading text-[0.8125rem] px-[18px] py-2.5">Update payment</button>
      </div>
    </div>
    </SampleGate>
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
  const [hideSampleData] = useSampleDataHidden()
  return (
    <SampleGate
      hidden={hideSampleData}
      placeholder={<div className="text-sm text-organic-neutral-600 py-8">Practice settings will appear here once they are configured.</div>}
    >
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
              <span className="flex-1 font-semibold text-[0.8438rem]">Google Calendar</span>
              <span className="text-[0.7812rem] font-semibold text-organic-accent-2-700">Connected</span>
            </div>
            <div className="flex items-center gap-3 py-3 px-3.5 bg-organic-neutral-100 rounded-organic-tile">
              <Brain size={18} className="text-organic-accent-700" />
              <span className="flex-1 font-semibold text-[0.8438rem]">OpenAI (AI assistant)</span>
              <span className="text-[0.7812rem] font-semibold text-organic-accent-2-700">Connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </SampleGate>
  )
}
