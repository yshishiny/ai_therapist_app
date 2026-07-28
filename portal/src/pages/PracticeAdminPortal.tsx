import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import apiClient from '../services/api'
import type { PracticeSummary, ResourceItem, ResourceReviewStatus } from '../services/api'
import { resourceReviewStatus, resourceLookup, resourceViewer } from '../services/api'
import { sourceMetaOf, addedByLabel } from '../types/patient'
import type { SourceMeta } from '../types/patient'
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
  Ban,
  SearchCheck,
  RotateCcw,
  StickyNote,
  X,
  Download,
  Info,
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
  // Provenance, straight off PatientOut. `origin` is derived from `source`
  // alone; `createdBy` is a clinician UUID that is resolved against the
  // clinician list at render time, never guessed.
  origin: SourceMeta
  createdBy: string | null
  sourceDetail: string | null
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
    origin: sourceMetaOf(api.source),
    createdBy: api.created_by || null,
    sourceDetail: api.source_detail || null,
  }
}

/** Marker shown in the registry's Origin column. */
function OriginCell({ origin }: { origin: SourceMeta }) {
  // Only records that are not people get a chip. Real ones stay quiet: a badge
  // on every row is noise, and noise is what let ten seeded records hide in
  // plain sight in the first place.
  if (origin.kind === 'test') {
    return (
      <span
        title={origin.title}
        className="text-[0.7812rem] font-semibold px-2.5 py-0.5 rounded-organic-pill inline-flex items-center gap-1 bg-organic-neutral-300 text-organic-neutral-800 border border-dashed border-organic-neutral-600"
      >
        <FlaskConical size={13} />
        {origin.label}
      </span>
    )
  }
  if (origin.kind === 'unrecognised') {
    return (
      <span
        title={origin.title}
        className="text-[0.7812rem] font-semibold px-2.5 py-0.5 rounded-organic-pill inline-flex items-center gap-1 bg-organic-neutral-200 text-organic-neutral-700"
      >
        <AlertTriangle size={13} />
        {origin.label}
      </span>
    )
  }
  if (origin.kind === 'unrecorded') {
    return (
      <span title={origin.title} className="text-[0.7812rem] text-organic-neutral-500 italic">
        {origin.label}
      </span>
    )
  }
  // 'real' — MANUAL carries no label at all, BULK_UPLOAD a quiet word.
  if (!origin.label) return null
  return (
    <span title={origin.title} className="text-[0.7812rem] text-organic-neutral-500 inline-flex items-center gap-1">
      <Upload size={12} />
      {origin.label}
    </span>
  )
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
        {view === 'content' && <ContentView clinicians={clinicians} />}
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
          <th className="text-left text-[0.7812rem] tracking-wide uppercase text-organic-neutral-600 px-2 py-2.5 border-b border-organic-neutral-300/60">Origin</th>
        </tr>
      </thead>
      <tbody>
        {patients.map((p) => {
          // A record that is not a person is set apart by more than a chip:
          // the row is tinted and the avatar drops the accent colour, so it
          // reads as different at a glance without having to be read.
          const isTest = p.origin.kind === 'test'
          return (
            <tr key={p.id} onClick={() => onOpenPatient(p.id)} className={`cursor-pointer ${isTest ? 'bg-organic-neutral-200/70' : ''}`}>
              <td className="px-2 py-3 border-b border-organic-text/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-full grid place-items-center text-[0.7812rem] font-bold ${
                      isTest ? 'bg-organic-neutral-300 text-organic-neutral-700' : 'bg-organic-accent-200 text-organic-accent-800'
                    }`}
                  >
                    {p.initials}
                  </div>
                  <span className={`font-semibold ${isTest ? 'text-organic-neutral-700' : ''}`}>{p.name}</span>
                </div>
              </td>
              <td className="px-2 py-3 border-b border-organic-text/[0.08] text-organic-neutral-700">{p.clinician}</td>
              <td className="px-2 py-3 border-b border-organic-text/[0.08] text-organic-neutral-700">{p.last}</td>
              <td className="px-2 py-3 border-b border-organic-text/[0.08]">
                <span className={`text-[0.7812rem] font-semibold px-2.5 py-0.5 rounded-organic-pill ${RISK_STYLE[p.risk].bg} ${RISK_STYLE[p.risk].color}`}>{p.risk}</span>
              </td>
              <td className="px-2 py-3 border-b border-organic-text/[0.08]">
                <OriginCell origin={p.origin} />
              </td>
            </tr>
          )
        })}
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
  const [showRegister, setShowRegister] = useState(false)
  // The record created by the last successful submission, kept only to confirm
  // it happened and to say what it was filed as. Until this existed the button
  // was decorative, so there was no success state to report at all.
  const [registered, setRegistered] = useState<RegisteredPatient | null>(null)
  // Off by default: hiding rows is a decision for the admin to make, and the
  // markers already say which rows are which. Only SEED/SYSTEM are hidden —
  // a `source` value this build does not recognise is never assumed fake, so
  // it stays visible either way.
  const [hideTestRecords, setHideTestRecords] = useState(false)
  const byRiskOrStatus = patients.filter((p) => (filter === 'All' ? true : filter === 'High risk' ? p.risk === 'High' : p.status === 'Intake'))
  const byCaseload = caseloadFilter ? byRiskOrStatus.filter((p) => p.therapistId === caseloadFilter) : byRiskOrStatus
  const filtered = hideTestRecords ? byCaseload.filter((p) => p.origin.kind !== 'test') : byCaseload
  const caseloadClinician = caseloadFilter ? clinicians.find((c) => c.id === caseloadFilter) : null

  // Counted over the whole page rather than the filtered view, so the notice
  // reports what is on the page and not what is left after hiding it.
  const testOnPage = patients.filter((p) => p.origin.kind === 'test').length

  // The risk/status pills, the caseload filter and the test-record filter all
  // run over the rows this page happens to hold — the API has no filter for
  // any of them — so whenever one is on, the counts below have to say so
  // rather than read like practice-wide totals.
  const clientFiltered = filter !== 'All' || caseloadFilter !== null || hideTestRecords

  const first = patients.length === 0 ? 0 : offset + 1
  const last = offset + patients.length
  const hasPrev = offset > 0
  // With a total we know exactly; without one, another page is possible only
  // if this one came back full.
  const hasNext = total === null ? patients.length === pageSize : last < total
  // Whether a newly registered patient could be on a page other than this one.
  // With no total reported we cannot rule it out, so we say so rather than
  // promise the row is here.
  const mayBeOffThisPage = total === null || total > pageSize
  // ...and whether a filter would hide it even if it is. A new patient is filed
  // Low risk / Active unless the admin chose otherwise, and assigned to
  // whoever registered them, so the risk-and-status pills and the caseload
  // filter can each drop the row that was just confirmed. The test-record
  // filter cannot: a manually entered record is never test data.
  const registrationMayBeFiltered = filter !== 'All' || caseloadFilter !== null

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
        <div className="inline-flex gap-2 flex-wrap">
          {(['All', 'High risk', 'Intake'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-4 py-1.5 rounded-organic-pill font-semibold ${filter === f ? 'bg-organic-accent text-organic-accent-100' : 'bg-organic-surface text-organic-neutral-700 border border-organic-neutral-300/60'}`}
            >
              {f}
            </button>
          ))}
          <button
            onClick={() => setHideTestRecords(!hideTestRecords)}
            aria-pressed={hideTestRecords}
            title="Hides records whose origin is a seed script or the system itself. Real patient records — imported or entered by hand — are never hidden by this."
            className={`text-xs px-4 py-1.5 rounded-organic-pill font-semibold inline-flex items-center gap-1.5 ${
              hideTestRecords ? 'bg-organic-accent text-organic-accent-100' : 'bg-organic-surface text-organic-neutral-700 border border-organic-neutral-300/60'
            }`}
          >
            <FlaskConical size={13} /> Hide test &amp; system records
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="rounded-organic-pill border border-organic-neutral-300/60 bg-organic-surface text-organic-neutral-800 font-heading text-sm px-5 py-2.5 inline-flex items-center gap-2"
          >
            <Upload size={16} /> Import from form
          </button>
          <button
            onClick={() => setShowRegister(true)}
            className="rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-sm px-5 py-2.5 inline-flex items-center gap-2"
          >
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
      {showRegister && (
        <RegisterPatientModal
          onClose={() => setShowRegister(false)}
          onCreated={(created) => {
            setShowRegister(false)
            setRegistered(created)
            onReload()
          }}
        />
      )}
      {registered && (
        <div className="flex items-start gap-2 bg-organic-accent-2-100 text-organic-accent-2-800 text-[0.8125rem] rounded-organic-tile px-3.5 py-2 mb-3.5 flex-wrap">
          <Check size={15} className="flex-none mt-0.5" />
          <span className="flex-1 min-w-[260px]">
            {registered.name} has been registered.
            {/* Says what the record now holds for anything the admin did not
                choose. The form warns beforehand; this is the same fact after
                the event, when it has stopped being a warning and become the
                content of a clinical record. */}
            {defaultedNote(registered)}
            {/* The registry is ordered by last session, nulls last, so a patient
                with no sessions yet sorts to the end of it. Reloading the page
                the admin happens to be on will not necessarily show them, and
                claiming otherwise would send someone looking for a record they
                cannot see. */}
            {mayBeOffThisPage &&
              ' Patients are listed most-recent-session first, so one with no sessions yet sits at the end of the registry — check the last page if they are not on this one.'}
            {/* Without this the confirmation is contradicted by the table right
                under it: a filtered view drops the new row, and the admin is
                told the patient exists while looking at a list that does not
                contain them. */}
            {registrationMayBeFiltered &&
              ' The list below is filtered, so the new record may not be shown until the filter is cleared.'}
          </span>
          <button onClick={() => setRegistered(null)} className="ml-auto text-xs underline">
            Dismiss
          </button>
        </div>
      )}
      {/* Only ever states what is on this page — the API cannot filter or count
          by origin, so a practice-wide claim would be a guess. */}
      {!error && !loading && testOnPage > 0 && (
        <div className="flex items-center gap-2 bg-organic-neutral-200 text-organic-neutral-800 text-[0.8125rem] rounded-organic-tile px-3.5 py-2 mb-3.5 flex-wrap">
          <FlaskConical size={15} className="flex-none text-organic-neutral-600" />
          {hideTestRecords ? (
            <span>
              {testOnPage} {testOnPage === 1 ? 'test or system record is' : 'test or system records are'} hidden on this page.
            </span>
          ) : (
            <span>
              {testOnPage} of the {patients.length} {patients.length === 1 ? 'row' : 'rows'} on this page{' '}
              {testOnPage === 1 ? 'is a test or system record, not a real patient' : 'are test or system records, not real patients'}.
            </span>
          )}
          <button onClick={() => setHideTestRecords(!hideTestRecords)} className="ml-auto text-xs underline">
            {hideTestRecords ? 'Show them' : 'Hide them'}
          </button>
        </div>
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
        ) : filtered.length === 0 ? (
          // The page did return rows; the filters in use just hid all of them.
          // Saying "no patients" here would misreport the registry.
          <div className="text-sm text-organic-neutral-600 py-3">
            None of the {patients.length} {patients.length === 1 ? 'row' : 'rows'} on this page match the filters in use.
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

  // `created_by` is a clinician UUID, resolved against the clinician list this
  // page already loaded. An id that is not in that list stays unnamed — it is
  // never matched to the nearest plausible clinician — and if the list itself
  // failed to load, that is reported as a failed lookup rather than as nobody
  // having added the record.
  const addedByName = patient.createdBy ? clinicians.find((c) => c.id === patient.createdBy)?.fullName || null : null
  const addedBy = addedByLabel(patient.createdBy, () => addedByName, clinicians.length > 0)
  const addedByUnresolved = addedByName === null

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
          {/* Same muting as the registry row, so a test record does not look
              like a person here either. */}
          <div
            className={`w-[52px] h-[52px] rounded-full grid place-items-center font-bold text-base ${
              patient.origin.kind === 'test' ? 'bg-organic-neutral-300 text-organic-neutral-700' : 'bg-organic-accent-200 text-organic-accent-800'
            }`}
          >
            {patient.initials}
          </div>
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
      {patient.origin.warning && (
        <div className="flex items-start gap-2.5 bg-organic-neutral-200 border border-dashed border-organic-neutral-600 text-organic-neutral-800 text-sm rounded-organic-tile px-3.5 py-2.5 mb-3.5">
          <FlaskConical size={16} className="mt-0.5 flex-none text-organic-neutral-600" />
          <span>{patient.origin.warning} Nothing recorded against it describes a person on this practice&apos;s caseload.</span>
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
          {/* Read-only. This is a record of what happened to the row, not a
              property of the patient, so there is nothing here to edit. */}
          <div className="bg-organic-surface rounded-organic-tile p-5 shadow-organic-sm">
            <h4 className="text-base font-heading mb-3">Record origin</h4>
            <div className="flex flex-col gap-3">
              <div>
                <div className="text-[0.7812rem] text-organic-neutral-500 mb-0.5">How this record was added</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    title={patient.origin.title}
                    className={`text-[0.8438rem] ${patient.origin.kind === 'unrecorded' ? 'text-organic-neutral-500 italic' : 'text-organic-text'}`}
                  >
                    {patient.origin.detail}
                  </span>
                  {/* The phrase above already says how a real record arrived;
                      the chip is repeated here only where it is a warning. */}
                  {(patient.origin.kind === 'test' || patient.origin.kind === 'unrecognised') && (
                    <OriginCell origin={patient.origin} />
                  )}
                </div>
              </div>
              <div>
                <div className="text-[0.7812rem] text-organic-neutral-500 mb-0.5">Added by</div>
                <div
                  title={patient.createdBy ? `Recorded against clinician ID ${patient.createdBy}` : undefined}
                  className={`text-[0.8438rem] ${addedByUnresolved ? 'text-organic-neutral-500 italic' : 'text-organic-text'}`}
                >
                  {addedBy}
                </div>
              </div>
              {patient.sourceDetail && (
                <div>
                  <div className="text-[0.7812rem] text-organic-neutral-500 mb-0.5">Note recorded with the record</div>
                  <div className="text-[0.8438rem] text-organic-neutral-700 leading-relaxed">{patient.sourceDetail}</div>
                </div>
              )}
            </div>
          </div>
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
 * FastAPI reports a validation failure with `detail` as a LIST of objects, not
 * a string. Assigning that list to error state and rendering it throws "Objects
 * are not valid as a React child", which unmounts the portal to a blank screen:
 * the admin loses the form they just filled in and is shown no reason why.
 *
 * `loc` is included because this form posts eight fields at once and a bare
 * "invalid date format" would not say which one to fix. (Login.tsx carries the
 * same helper for its two fields; neither page can import from the other yet,
 * so the two are duplicated rather than shared — worth lifting into a module
 * the next time a third caller needs it.)
 */
function errorText(err: any, fallback: string): string {
  const detail = err?.response?.data?.detail
  if (typeof detail === 'string' && detail.trim()) return detail
  if (Array.isArray(detail)) {
    const messages = detail
      .map((entry: any) => {
        if (typeof entry === 'string') return entry
        if (typeof entry?.msg !== 'string' || !entry.msg) return null
        const field = Array.isArray(entry.loc) ? entry.loc[entry.loc.length - 1] : null
        return typeof field === 'string' && field !== 'body' ? `${field}: ${entry.msg}` : entry.msg
      })
      .filter((message: any): message is string => typeof message === 'string' && message.length > 0)
    if (messages.length) return messages.join('; ')
  }
  return fallback
}

/**
 * What we can honestly tell the admin happened when the create failed.
 *
 * A 4xx means the server read the request and refused it: no record exists.
 * A 5xx — or no response at all (timeout, dropped connection, the tab losing
 * the network mid-request) — means no such thing. The INSERT may already have
 * run and only the answer went missing. POST /patients has no idempotency key
 * and no duplicate check, so reporting "nothing has been saved" on those
 * invites a retry that files one person twice.
 */
function createFailureText(err: any): string {
  const status = err?.response?.status
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return errorText(err, 'The patient could not be registered. Nothing has been saved.')
  }
  const detail = errorText(err, '')
  const serverSaid = detail && detail !== 'Internal Server Error' ? ` The server said: ${detail}` : ''
  return (
    'The server did not confirm the registration, so it is not known whether the patient was created.' +
    ' Check the registry before trying again — registering twice creates two records for the same person.' +
    serverSaid
  )
}

/** What the server stored, for the confirmation the admin sees afterwards. */
interface RegisteredPatient {
  /** The name on the created record, as the server returned it. */
  name: string
  /**
   * The value the record now carries for a clinical field the admin left
   * unset, or null when they chose one (or the server did not say). Reported
   * because these are defaults, not decisions — nobody assessed this patient
   * as Low risk.
   */
  defaultedRisk: string | null
  defaultedStatus: string | null
}

/**
 * The sentence the confirmation adds when the new record carries a clinical
 * value nobody chose. Risk is the one that matters: a record filed as Low risk
 * is indistinguishable from one assessed and found to be, so the only place the
 * difference survives is what the admin is told at the moment it happens.
 */
function defaultedNote({ defaultedRisk, defaultedStatus }: RegisteredPatient): string {
  if (defaultedRisk && defaultedStatus) {
    return ` Risk was not assessed and status was not set, so the record is filed as ${defaultedRisk} risk and ${defaultedStatus}.`
  }
  if (defaultedRisk) return ` Risk was not assessed, so the record is filed as ${defaultedRisk} risk.`
  if (defaultedStatus) return ` Status was not set, so the record is filed as ${defaultedStatus}.`
  return ''
}

// The vocabularies the rest of the product already stores. They are listed
// rather than free-typed so the registry does not accumulate "F" / "female" /
// "Female" as three different genders, or a risk level no filter matches.
const GENDER_OPTIONS = ['Female', 'Male', 'Non-binary', 'Prefer not to say'] as const
const RISK_OPTIONS = ['Low', 'Med', 'High'] as const
const STATUS_OPTIONS = ['Active', 'Intake', 'Maintenance', 'Discharged'] as const

const FIELD_CLASS =
  'w-full min-h-[42px] px-4 text-sm bg-organic-surface border border-organic-neutral-300/60 rounded-organic-pill disabled:opacity-60'
const LABEL_CLASS = 'block text-xs text-organic-neutral-700 mb-1.5'

/**
 * Today's date where the user is.
 *
 * NOT `new Date().toISOString().slice(0, 10)`: that is the UTC date, which is
 * still yesterday for the first hours of every local day in any timezone ahead
 * of it — so the practice would be told a date of birth of "today" is in the
 * future.
 */
function localDateString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Why this date of birth cannot be sent, or null if it can.
 *
 * A shape check on its own is not enough. `^\d{4}-\d{2}-\d{2}$` happily accepts
 * 1990-02-31, and the server hands the string straight to `date.fromisoformat`
 * with no try/except (patient_repository_db_real.py), so an impossible date is
 * a 500 with no usable message rather than a validation error naming the field.
 * The range is re-checked here rather than left to `min`/`max` on the input,
 * because where the browser has no native date control the field degrades to a
 * plain text box and those attributes stop being enforced — which is the same
 * place a typed year like 2190 would otherwise get through.
 */
function dobProblem(value: string, today: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Enter the date of birth as YYYY-MM-DD.'
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  const isRealDate =
    parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day
  if (!isRealDate) return `${value} is not a real date — check the month and day.`
  if (value > today) return 'The date of birth cannot be in the future.'
  if (value < '1900-01-01') return 'Enter a date of birth from 1900 onwards.'
  return null
}

/**
 * Register a single patient.
 *
 * The counterpart to the bulk import: a practice adding one patient had no way
 * to do it from the portal at all, because the button this opens had no
 * handler.
 *
 * Everything except the name is optional, and an optional field that was left
 * alone is OMITTED from the request rather than sent as ''. The difference is
 * not cosmetic — a stored empty string reads as "asked, and the answer was
 * nothing", which is not what a blank box means — and `dob: ''` would reach
 * `date.fromisoformat` on the server, which does not guard the call.
 *
 * `source` and `created_by` are stamped by the route (MANUAL / the caller), so
 * the client must not send them; therapist_id is likewise fixed to the caller.
 */
function RegisterPatientModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (created: RegisteredPatient) => void
}) {
  const [form, setForm] = useState({
    full_name: '',
    gender: '',
    dob: '',
    phone: '',
    email: '',
    diagnosis: '',
    risk: '',
    status: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The guard that actually holds. `saving` cannot be one: both handlers in a
  // double-fire read it from the same render's closure, where it is still
  // false, so checking it is no better than checking `disabled`. A ref is read
  // at call time.
  const inFlight = useRef(false)

  const set =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { value } = e.target
      setForm((prev) => ({ ...prev, [field]: value }))
      setError(null)
    }

  const fullName = form.full_name.trim()
  const today = localDateString(new Date())

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    // `disabled` on the button is not the whole guard. A double-click can queue
    // two submits before React has re-rendered the disabled state, and POST
    // /patients has no idempotency key and no duplicate-name check: the second
    // one silently creates a second record for the same person, which is then
    // two half-histories of one patient for someone to find later.
    if (inFlight.current || !fullName) return

    // The server parses dob with `date.fromisoformat` and does not catch the
    // ValueError, so anything it cannot read is a 500 with no usable message
    // rather than a validation error. A date input normally yields a valid
    // value; `dobProblem` is the check for when it does not — it rejects a
    // well-shaped impossible date (1990-02-31) too, which a shape test alone
    // would send straight through to that unguarded call.
    if (form.dob) {
      const problem = dobProblem(form.dob, today)
      if (problem) {
        setError(problem)
        return
      }
    }

    const payload: Record<string, string> = { full_name: fullName }
    for (const field of ['gender', 'dob', 'phone', 'email', 'diagnosis', 'risk', 'status'] as const) {
      const value = form[field].trim()
      if (value) payload[field] = value
    }

    inFlight.current = true
    setSaving(true)
    setError(null)
    // The confirmation reports the record the SERVER made, not the form that
    // was typed: risk and status left unset come back carrying the defaults it
    // applied, and the admin is told which value their record now holds.
    let created: RegisteredPatient | null = null
    try {
      const row = await apiClient.createPatient(payload)
      created = {
        name: typeof row?.name === 'string' && row.name ? row.name : fullName,
        defaultedRisk: !form.risk && typeof row?.risk === 'string' ? row.risk : null,
        defaultedStatus: !form.status && typeof row?.status === 'string' ? row.status : null,
      }
    } catch (err: any) {
      setError(createFailureText(err))
      inFlight.current = false
      setSaving(false)
    }

    // Handing off is OUTSIDE the try on purpose. `onCreated` closes this modal
    // and re-fetches the registry; a throw from that re-fetch used to land in
    // the catch above and be reported as a failed registration — telling the
    // admin the patient may not exist, moments after the server confirmed it
    // does, and re-enabling the button for a submit that would file them twice.
    if (created) {
      try {
        onCreated(created)
        // `saving` deliberately stays true: on success the parent unmounts this
        // modal, and leaving the button disabled through that last frame closes
        // the window in which a second click could post again.
      } catch {
        inFlight.current = false
        setSaving(false)
        setError(
          `${created.name} has been registered, but the registry could not be refreshed. Close this and reload the page — do not register them again.`,
        )
      }
    }
  }

  return (
    // Dismissing by backdrop is disabled while the request is in flight: the
    // patient would still be created, with nothing left on screen to say so.
    <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center p-6" onClick={() => !saving && onClose()}>
      <div
        className="bg-organic-bg rounded-organic-card w-full max-w-[620px] max-h-[85vh] overflow-y-auto p-7 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[1.375rem] font-heading text-organic-text mb-1.5">Register patient</h2>
        <p className="text-sm text-organic-neutral-600 mb-5">
          Only the full name is required. Anything left blank stays unrecorded and can be filled in later — except risk
          and status, which every record must carry a value for; those two fall back to the value named on the field.
        </p>

        <form onSubmit={submit}>
          <div className="mb-4">
            <label className={LABEL_CLASS} htmlFor="reg-full-name">
              Full name <span className="text-organic-accent-800">*</span>
            </label>
            <input
              id="reg-full-name"
              value={form.full_name}
              onChange={set('full_name')}
              disabled={saving}
              required
              autoFocus
              autoComplete="off"
              className={FIELD_CLASS}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className={LABEL_CLASS} htmlFor="reg-gender">
                Gender
              </label>
              <select id="reg-gender" value={form.gender} onChange={set('gender')} disabled={saving} className={FIELD_CLASS}>
                <option value="">Not recorded</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="reg-dob">
                Date of birth
              </label>
              <input
                id="reg-dob"
                type="date"
                value={form.dob}
                onChange={set('dob')}
                disabled={saving}
                min="1900-01-01"
                max={today}
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="reg-phone">
                Phone
              </label>
              <input
                id="reg-phone"
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                disabled={saving}
                autoComplete="off"
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="reg-email">
                Email
              </label>
              <input
                id="reg-email"
                type="email"
                value={form.email}
                onChange={set('email')}
                disabled={saving}
                autoComplete="off"
                className={FIELD_CLASS}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className={LABEL_CLASS} htmlFor="reg-diagnosis">
              Diagnosis or presenting problem
            </label>
            <input
              id="reg-diagnosis"
              value={form.diagnosis}
              onChange={set('diagnosis')}
              disabled={saving}
              autoComplete="off"
              className={FIELD_CLASS}
            />
          </div>

          {/* Neither of these is pre-selected. The stored value each one falls
              back to is named on the option itself, because that value is what
              the record will carry and what the registry will show — an unset
              risk is not stored as "unknown", it is stored as Low. */}
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div>
              <label className={LABEL_CLASS} htmlFor="reg-risk">
                Risk level
              </label>
              <select id="reg-risk" value={form.risk} onChange={set('risk')} disabled={saving} className={FIELD_CLASS}>
                <option value="">Not assessed — stored as Low</option>
                {RISK_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="reg-status">
                Status
              </label>
              <select id="reg-status" value={form.status} onChange={set('status')} disabled={saving} className={FIELD_CLASS}>
                <option value="">Not set — stored as Active</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-organic-neutral-600 mb-4 leading-relaxed">
            Risk is a clinical judgement, and the record has nowhere to say it was never made — leaving it unset files
            this patient as Low risk alongside patients who were assessed and found to be. Set it only from an
            assessment, and revise it on the patient&apos;s record once one exists.
          </p>

          <p className="text-xs text-organic-neutral-600 mb-4 leading-relaxed">
            The patient is assigned to you as their clinician. If they belong to a colleague, reassign them from the
            patient&apos;s record after registering.
          </p>

          {error && (
            <div className="text-sm text-organic-accent-800 bg-organic-accent-100 rounded-organic-tile px-3.5 py-2.5 mb-3">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !fullName}
              className="rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-sm px-5 py-2.5 disabled:opacity-50"
            >
              {saving ? 'Registering…' : 'Register patient'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-organic-pill border border-organic-neutral-300/60 text-organic-neutral-700 font-heading text-sm px-5 py-2.5 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
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
// labels. It now reads the real table, and is where the library gets reviewed.
//
// TWO DIFFERENT FACTS LIVE ON EVERY CARD. They are never merged.
//
//   Provenance  — from `tags`. Whether an automated citation audit ever ran
//                 over that topic at all:
//                   verified    an audit re-checked a sample of that topic's
//                               citations against live sources
//                   unverified  that check never ran, so the citations behind
//                               these items have NOT been confirmed
//   Review      — from `review_status`. What a named clinician concluded after
//                 opening the source herself and deciding.
//
// An audit having run is not a verdict, and a verdict is not an audit. An item
// can be citation-checked and still be wrong about its author; an unchecked one
// can be perfectly sound. So confirming an item does not turn its provenance
// marker green, and the marker does not pre-fill the decision.
//
// THE LINK. Only videos carry a `file_url`; every book and paper in the seeded
// library has none. The server therefore returns `lookup_url` together with
// `lookup_kind` saying what that URL is — the item itself, or a search built
// from its title and author. A search is labelled as a search, every time. A
// fabricated citation link inside a citation-checking screen would defeat the
// whole exercise, so nothing here invents a DOI, an ISBN or a publisher page.

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

// ── Review decisions ────────────────────────────────────────────────────────
//
// Deliberately a different visual family from ProvenanceBadge: bordered tiles,
// prefixed "Review", so a reviewer never mistakes "an audit ran" for "someone
// decided". The two badges sit in different blocks on the card for the same
// reason.

const REVIEW_STYLE: Record<
  ResourceReviewStatus,
  { label: string; action: string; verb: string; icon: typeof Check; className: string; title: string }
> = {
  UNREVIEWED: {
    label: 'Not yet reviewed',
    action: 'Clear decision',
    verb: 'Set back to not reviewed',
    icon: FileText,
    className: 'bg-organic-neutral-100 text-organic-neutral-700 border border-dashed border-organic-neutral-400',
    // Not "nobody has ever looked at it": a decision that was made and then
    // cleared lands back here, and the row still carries who cleared it.
    title: 'No review decision is recorded for this entry.',
  },
  CONFIRMED: {
    label: 'Confirmed',
    action: 'Confirm',
    verb: 'Confirmed',
    icon: Check,
    className: 'bg-organic-accent-2-100 text-organic-accent-2-800 border border-organic-accent-2-400',
    title: 'A reviewer opened the source and confirmed this entry as it stands.',
  },
  NEEDS_CORRECTION: {
    label: 'Needs correction',
    action: 'Needs correction',
    verb: 'Marked as needing correction',
    icon: FileEdit,
    className: 'bg-organic-accent-100 text-organic-accent-800 border border-organic-accent-400',
    title: 'A reviewer found something wrong that should be fixed rather than dropped.',
  },
  REJECTED: {
    label: 'Rejected',
    action: 'Reject',
    verb: 'Rejected',
    icon: Ban,
    className: 'bg-organic-danger/10 text-organic-danger border border-organic-danger/40',
    title: 'A reviewer judged this entry unusable — it should not be given to a patient.',
  },
}

function ReviewBadge({ status }: { status: ResourceReviewStatus | null }) {
  if (status === null) {
    return (
      <span
        title="This server build did not return a review state for the entry, so none is shown. It is not the same as “not yet reviewed”."
        className="text-[0.7812rem] font-semibold px-2.5 py-0.5 rounded-organic-tile inline-flex items-center gap-1 bg-organic-neutral-100 text-organic-neutral-600 border border-dashed border-organic-neutral-400"
      >
        <AlertTriangle size={13} /> Review state not reported
      </span>
    )
  }
  const style = REVIEW_STYLE[status]
  const Icon = style.icon
  return (
    <span
      title={style.title}
      className={`text-[0.7812rem] font-semibold px-2.5 py-0.5 rounded-organic-tile inline-flex items-center gap-1 ${style.className}`}
    >
      <Icon size={13} /> Review: {style.label}
    </span>
  )
}

/** Absolute instant → a readable local stamp, or null if it is not a real date. */
function formatReviewedAt(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Hostname of a real URL, shown so the reviewer can see where a link goes. */
function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

const DECISIONS: ResourceReviewStatus[] = ['CONFIRMED', 'NEEDS_CORRECTION', 'REJECTED']

function DecisionButton({
  status,
  active,
  busy,
  disabled,
  onClick,
}: {
  status: ResourceReviewStatus
  active: boolean
  busy: boolean
  disabled: boolean
  onClick: () => void
}) {
  const style = REVIEW_STYLE[status]
  const Icon = style.icon
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={style.title}
      className={`text-[0.7812rem] font-semibold px-3 py-1.5 rounded-organic-pill inline-flex items-center gap-1.5 disabled:opacity-60 ${
        active ? style.className : 'bg-organic-neutral-100 text-organic-neutral-700 border border-organic-neutral-300/60'
      }`}
    >
      <Icon size={13} />
      {busy ? 'Saving…' : style.action}
    </button>
  )
}

/**
 * The link an entry can be opened through, and what that link honestly is.
 *
 * Shared by the card and the viewer panel so the two can never drift into
 * describing the same row differently.
 */
function ResourceLookupBlock({ resource }: { resource: ResourceItem }) {
  const lookup = resourceLookup(resource)
  const host = lookup && lookup.url ? hostOf(lookup.url) : null

  if (!lookup) {
    return (
      <div className="text-[0.7812rem] text-organic-neutral-600 leading-snug">
        No link. This entry has no stored URL and the server returned no lookup for it, so there is nothing to
        open from here.
      </div>
    )
  }

  // Something is stored in the link field, but it is not a web address. No
  // link is rendered for it — a `javascript:` or `data:` value in an href runs
  // in this portal's own origin the moment it is clicked. It is shown as plain
  // text instead, because an entry carrying this is a finding in its own right
  // and silently hiding it would make a poisoned row look like a clean one.
  if (lookup.kind === 'blocked') {
    return (
      <div className="text-[0.7812rem] leading-snug">
        <div className="text-organic-danger font-semibold inline-flex items-center gap-1.5">
          <AlertTriangle size={13} /> Link not opened
        </div>
        <div className="text-organic-neutral-600 mt-1">
          This entry stores something in its link field that is not a web address, so the portal will not open it
          and has not fetched anything from it. Stored value:
        </div>
        <code className="block mt-1 text-organic-neutral-700 bg-organic-neutral-100 rounded-organic-tile px-2 py-1 break-all">
          {lookup.stored}
        </code>
      </div>
    )
  }

  return (
    <>
      <a
        href={lookup.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[0.8125rem] font-semibold text-organic-accent-700 inline-flex items-center gap-1.5"
      >
        {lookup.kind === 'source' ? <ExternalLink size={14} /> : <SearchCheck size={14} />}
        {lookup.kind === 'source' ? 'Open source' : 'Search for this'}
        {host && <span className="font-normal text-organic-neutral-500">· {host}</span>}
      </a>
      <div className="text-[0.7812rem] text-organic-neutral-600 mt-1 leading-snug">
        {lookup.kind === 'source'
          ? 'The link stored with this entry.'
          : 'No link is stored for this entry, so this opens a search built from its title and author. Check that what comes back is really this work before confirming it.'}
      </div>
    </>
  )
}

/**
 * The review decision controls: badge, who and when, note, and the buttons.
 *
 * Nothing optimistic happens here. The controls only ever show what came back
 * from the server: on success the parent swaps in the returned row, and on
 * failure the old state stays put under an error line, so a save that did not
 * happen can never look like one that did.
 *
 * Mounted twice for the same row — once on the card, once in the viewer panel
 * when it is open — so that a decision can be made from either place.
 */
function ResourceReviewControls({
  resource,
  reviewerName,
  reviewerLookupAvailable,
  onSaved,
}: {
  resource: ResourceItem
  reviewerName: (id: string) => string | null
  reviewerLookupAvailable: boolean
  onSaved: (updated: ResourceItem) => void
}) {
  const [note, setNote] = useState(resource.review_note || '')
  const [noteOpen, setNoteOpen] = useState(false)
  const [saving, setSaving] = useState<ResourceReviewStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  // The card and the panel hold the same row. When one of them saves a note,
  // the stored text changes under the other, and the stale copy would otherwise
  // sit in its editor waiting to be re-submitted over the top of the new one.
  // This follows the server's value, which is the only version that exists.
  useEffect(() => {
    setNote(resource.review_note || '')
  }, [resource.review_note])

  const status = resourceReviewStatus(resource)
  const savedNote = resource.review_note || ''
  const noteDirty = note.trim() !== savedNote.trim()

  // The server sends a clinician id, not a name. It is resolved against the
  // clinician list; when that cannot be done it says so rather than printing a
  // raw uuid or, worse, guessing at a person.
  const who = resource.reviewed_by
    ? reviewerLookupAvailable
      ? reviewerName(resource.reviewed_by) || 'someone not in the clinician list'
      : 'someone this portal could not name'
    : null
  const when = formatReviewedAt(resource.reviewed_at)

  const submit = async (next: ResourceReviewStatus) => {
    setSaving(next)
    setError(null)
    try {
      const updated = await apiClient.reviewResource(resource.id, {
        status: next,
        note: note.trim() ? note.trim() : null,
      })
      setNote(updated.review_note || '')
      setNoteOpen(false)
      onSaved(updated)
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      if (typeof detail === 'string') {
        setError(detail)
      } else if (err?.response) {
        // The server answered and refused. Nothing was written.
        setError('That decision was not saved — the server rejected the request. Nothing has changed.')
      } else {
        // No answer came back at all. Whether the write landed is unknown, and
        // this must not claim otherwise in either direction.
        setError(
          'The server could not be reached, so it is not known whether this decision was saved. Reload the page to see what it actually holds before deciding again.',
        )
      }
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <ReviewBadge status={status} />

      {/* Shown for UNREVIEWED too when the row carries a reviewer stamp: that
          only happens when somebody cleared a decision, and hiding it would
          leave the screen claiming nothing was ever recorded. */}
      {status && (status !== 'UNREVIEWED' || who !== null || when !== null) && (
        <div className="text-[0.7812rem] text-organic-neutral-600 leading-snug">
          {REVIEW_STYLE[status].verb}
          {who ? ` by ${who}` : ''}
          {when ? ` · ${when}` : ''}
        </div>
      )}

      {!noteOpen && savedNote && (
        <div className="text-[0.7812rem] text-organic-neutral-700 bg-organic-neutral-100 rounded-organic-tile px-3 py-2 leading-snug whitespace-pre-wrap">
          {savedNote}
        </div>
      )}

      {noteOpen && (
        <div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="What did you find? (optional)"
            className="w-full text-[0.8125rem] p-2.5 bg-organic-neutral-100 border border-organic-neutral-300/60 rounded-organic-tile resize-y"
          />
          <div className="text-[0.7812rem] text-organic-neutral-600 mt-1 leading-snug">
            {status && status !== 'UNREVIEWED'
              ? 'Saved when you pick a decision below, or with “Save note”.'
              : 'Saved when you pick a decision below.'}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {DECISIONS.map((d) => (
          <DecisionButton
            key={d}
            status={d}
            active={status === d}
            busy={saving === d}
            disabled={saving !== null}
            onClick={() => submit(d)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setNoteOpen((v) => !v)}
          className="text-[0.7812rem] font-semibold text-organic-accent-700 inline-flex items-center gap-1"
        >
          <StickyNote size={13} /> {noteOpen ? 'Hide note' : savedNote ? 'Edit note' : 'Add a note'}
        </button>
        {noteOpen && noteDirty && status && status !== 'UNREVIEWED' && (
          <button
            type="button"
            onClick={() => submit(status)}
            disabled={saving !== null}
            className="text-[0.7812rem] font-semibold text-organic-accent-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save note'}
          </button>
        )}
        {status && status !== 'UNREVIEWED' && (
          <button
            type="button"
            onClick={() => submit('UNREVIEWED')}
            disabled={saving !== null}
            className="text-[0.7812rem] text-organic-neutral-600 inline-flex items-center gap-1 disabled:opacity-60"
          >
            <RotateCcw size={12} /> Clear decision
          </button>
        )}
      </div>

      {error && (
        <div className="text-[0.7812rem] text-organic-danger bg-organic-danger/10 border border-organic-danger/30 rounded-organic-tile px-3 py-2 leading-snug">
          <AlertTriangle size={13} className="inline-block mr-1 -mt-0.5" />
          {error}
        </div>
      )}
    </div>
  )
}

/** What the card's "open this" affordance promises, per what the panel can do. */
function openLabelFor(resource: ResourceItem): string {
  const viewer = resourceViewer(resource)
  if (viewer.kind === 'youtube') return 'Watch in the portal'
  if (viewer.kind === 'pdf') return 'Read in the portal'
  return 'Open the reference'
}

/**
 * One library entry: a summary that opens the viewer panel, its link, and its
 * review controls.
 */
function ResourceReviewCard({
  resource,
  reviewerName,
  reviewerLookupAvailable,
  keptAfterFilterChange,
  onOpen,
  onSaved,
}: {
  resource: ResourceItem
  reviewerName: (id: string) => string | null
  reviewerLookupAvailable: boolean
  keptAfterFilterChange: boolean
  onOpen: () => void
  onSaved: (updated: ResourceItem) => void
}) {
  const tags = Array.isArray(resource.tags) ? resource.tags : []
  const Icon = CATEGORY_META[resource.category]?.icon || FileText
  const slug = topicOf(tags)
  const openLabel = openLabelFor(resource)

  return (
    <div className="bg-organic-surface rounded-organic-card p-5 shadow-organic-sm flex flex-col gap-3">
      {/* The summary is the button that opens the viewer. Only phrasing content
          inside it, so it stays a valid — and keyboard-reachable — control. */}
      <button
        type="button"
        onClick={onOpen}
        className="text-left flex flex-col items-start gap-3 group"
        aria-label={`${openLabel}: ${resource.title}`}
      >
        <span className="flex justify-between items-start gap-2 w-full">
          <span className="w-[46px] h-[46px] rounded-organic-tile bg-organic-accent-100 grid place-items-center flex-none">
            <Icon size={22} className="text-organic-accent-700" />
          </span>
          <span className="text-[0.7812rem] px-2.5 py-0.5 rounded-organic-pill bg-organic-neutral-200 text-organic-neutral-700">
            {resource.category}
          </span>
        </span>

        <span className="block">
          <span className="block font-bold text-[0.9375rem] leading-tight group-hover:underline">
            {resource.title}
          </span>
          {resource.author && <span className="block text-xs text-organic-neutral-600 mt-1">{resource.author}</span>}
        </span>

        {resource.description && (
          <span className="block text-[0.8125rem] text-organic-neutral-700 leading-relaxed line-clamp-4">
            {resource.description}
          </span>
        )}

        <span className="text-[0.7812rem] font-semibold text-organic-accent-700 inline-flex items-center gap-1">
          {openLabel} <ChevronRight size={13} />
        </span>
      </button>

      {/* What the ingest recorded: topic, and whether an audit ever ran. */}
      <div className="flex items-center gap-1.5 flex-wrap mt-auto">
        {slug && (
          <span className="text-[0.7812rem] px-2.5 py-0.5 rounded-organic-pill bg-organic-accent-100 text-organic-accent-800">
            {humanTopic(slug)}
          </span>
        )}
        <ProvenanceBadge provenance={provenanceOf(tags)} />
      </div>

      {/* The link. Its label states what it actually is. */}
      <div className="pt-2.5 border-t border-organic-neutral-300/50">
        <ResourceLookupBlock resource={resource} />
      </div>

      {/* What a reviewer concluded. Separate block, separate fact. */}
      <div className="pt-2.5 border-t border-organic-neutral-300/50 flex flex-col gap-2">
        <ResourceReviewControls
          resource={resource}
          reviewerName={reviewerName}
          reviewerLookupAvailable={reviewerLookupAvailable}
          onSaved={onSaved}
        />

        {keptAfterFilterChange && (
          <div className="text-[0.7812rem] text-organic-neutral-500 leading-snug">
            Kept on screen so you can see what was saved — it no longer matches the review filter.
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Viewer panel ───────────────────────────────────────────────────────────

/**
 * A library entry opened for review: the thing itself where that is possible,
 * its metadata, and the review controls, so a decision can be made without
 * leaving the panel.
 *
 * Three cases, and the panel is explicit about which one it is in. The one
 * thing it never does is frame a page that refuses to be framed — Google
 * Books and Scholar both answer `X-Frame-Options: SAMEORIGIN`, so an in-app
 * frame would render an empty box, which reads as a broken screen and teaches
 * the reviewer to distrust everything else on it.
 */
function ResourceViewerPanel({
  resource,
  reviewerName,
  reviewerLookupAvailable,
  onClose,
  onSaved,
}: {
  resource: ResourceItem
  reviewerName: (id: string) => string | null
  reviewerLookupAvailable: boolean
  onClose: () => void
  onSaved: (updated: ResourceItem) => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const tags = Array.isArray(resource.tags) ? resource.tags : []
  const slug = topicOf(tags)
  const Icon = CATEGORY_META[resource.category]?.icon || FileText
  const viewer = resourceViewer(resource)
  const lookup = resourceLookup(resource)

  // Where the viewer above already sends her. The lookup block is only worth
  // repeating when it points somewhere else — but a blocked link (url === null)
  // is a warning, not a destination, so it is never suppressed by matching the
  // viewer's own null.
  const viewerUrl =
    viewer.kind === 'youtube' ? viewer.sourceUrl : viewer.kind === 'pdf' ? viewer.url : null
  const showLookup =
    lookup === null ? viewer.kind === 'reference' : lookup.url === null ? true : lookup.url !== viewerUrl
  // Whether a search is actually on offer below. The reference copy must not
  // point at "the search below" when the server returned no lookup: a promised
  // link that is not there reads as a broken screen, and the honest line is
  // that nothing was computed rather than that something is waiting.
  const lookupIsSearch = lookup !== null && lookup.url !== null && lookup.kind === 'search'

  const facts: [string, string][] = [
    ['Type', categoryLabel(resource.category)],
    ['Topic', slug ? humanTopic(slug) : 'Not recorded'],
    ['Author', resource.author || 'Not recorded'],
  ]

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={resource.title}
        className="bg-organic-bg w-full max-w-[760px] h-screen overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-7">
          <div className="flex justify-between items-start gap-3 mb-5">
            <div className="flex items-start gap-3">
              <div className="w-[46px] h-[46px] rounded-organic-tile bg-organic-accent-100 grid place-items-center flex-none">
                <Icon size={22} className="text-organic-accent-700" />
              </div>
              <div>
                <h2 className="text-[1.5rem] font-heading text-organic-text leading-tight">{resource.title}</h2>
                <p className="text-sm text-organic-neutral-600 mt-0.5">
                  {resource.author || 'Author not recorded'} · {categoryLabel(resource.category)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-organic-neutral-500 hover:text-organic-neutral-800 flex-none"
            >
              <X size={22} />
            </button>
          </div>

          {/* ── 1. Video ─────────────────────────────────────────────────── */}
          {viewer.kind === 'youtube' && (
            <section className="mb-5">
              <div className="rounded-organic-card overflow-hidden bg-organic-neutral-900 aspect-video">
                <iframe
                  key={viewer.videoId}
                  src={viewer.embedUrl}
                  title={`Video: ${resource.title}`}
                  className="w-full h-full block border-0"
                  // Only what playback needs. `allow-same-origin` is scoped to
                  // youtube-nocookie.com, not to this app: a cross-origin frame
                  // still cannot reach this page's DOM, storage or cookies, and
                  // the player will not start without it.
                  sandbox="allow-scripts allow-same-origin allow-presentation"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
              <div className="mt-2.5 text-[0.8125rem] text-organic-neutral-700 leading-relaxed">
                <div className="flex items-start gap-2">
                  <Info size={15} className="text-organic-neutral-500 flex-none mt-0.5" />
                  <div>
                    Playback is served by <strong className="font-semibold">YouTube</strong>, not by this practice: no
                    copy is stored, hosted or proxied here, and loading this panel tells YouTube that someone at this
                    practice opened the video. It is streamed from the host YouTube calls privacy-enhanced, which
                    YouTube states does not record viewing information until playback starts — that is YouTube&apos;s
                    account of its own service, not something this practice can verify. If the player shows an error
                    instead of the video, the embed was refused: usually because the uploader disallowed embedding, but
                    a removed or private video looks the same from here. Open it on YouTube below to see which.
                  </div>
                </div>
                <a
                  href={viewer.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 text-[0.8125rem] font-semibold text-organic-accent-700 inline-flex items-center gap-1.5"
                >
                  <ExternalLink size={14} /> Open on YouTube
                  <span className="font-normal text-organic-neutral-500">· the link stored with this entry</span>
                </a>
              </div>
            </section>
          )}

          {/* ── 2. PDF ───────────────────────────────────────────────────── */}
          {viewer.kind === 'pdf' && (
            <section className="mb-5">
              <div className="relative rounded-organic-card overflow-hidden border border-organic-neutral-300/60 bg-organic-neutral-100 h-[58vh] min-h-[360px]">
                {/* Sits *behind* the frame, so the failure is never a silent
                    grey rectangle. A frame that renders nothing — the host sent
                    Content-Disposition: attachment, or the browser declined to
                    display a PDF inline — stays transparent and this shows
                    through; a PDF that does render paints over it. The page
                    cannot detect either case from the outside (a blocked frame
                    still fires `load`), so the fallback is always mounted
                    rather than switched on by a check that would lie. */}
                <div className="absolute inset-0 grid place-items-center p-6 text-center pointer-events-none">
                  <div className="text-[0.8125rem] text-organic-neutral-600 leading-relaxed max-w-[420px]">
                    <FileText size={26} className="mx-auto mb-2 text-organic-neutral-400" />
                    If you can read this, the document did not open here. That can be the host refusing to be displayed
                    inside another page, your browser declining to render a PDF in a restricted frame, or the file not
                    being reachable at all — this panel cannot tell which. Open it with the links below before drawing
                    any conclusion about the entry.
                  </div>
                </div>
                <iframe
                  src={viewer.url}
                  title={`Document: ${resource.title}`}
                  className="w-full h-full block border-0 relative"
                  // A PDF viewer is a scripted document in every current
                  // browser, so scripts are the one thing it needs. Nothing
                  // else is granted, and without `allow-same-origin` the frame
                  // sits in an opaque origin of its own.
                  sandbox="allow-scripts"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              </div>
              <div className="mt-2.5 text-[0.8125rem] text-organic-neutral-700 leading-relaxed">
                <div className="flex items-start gap-2">
                  <Info size={15} className="text-organic-neutral-500 flex-none mt-0.5" />
                  <div>
                    Some browsers and some hosts refuse to display a PDF inside another page, and this panel frames it
                    under restrictions that some PDF viewers will not run under.{' '}
                    <strong className="font-semibold">
                      If the area above shows a message rather than the document, it did not load here
                    </strong>{' '}
                    — which of those reasons applies is not something this panel can detect from the inside, so it says
                    so in place of the document rather than leaving an empty box, and does not blame the entry. Use one
                    of the links below instead.
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-4">
                  <a
                    href={viewer.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[0.8125rem] font-semibold text-organic-accent-700 inline-flex items-center gap-1.5"
                  >
                    <ExternalLink size={14} /> Open in a new tab
                  </a>
                  <a
                    href={viewer.url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[0.8125rem] font-semibold text-organic-accent-700 inline-flex items-center gap-1.5"
                  >
                    <Download size={14} /> Download a copy
                  </a>
                </div>
                <div className="text-[0.7812rem] text-organic-neutral-600 mt-1.5 leading-snug">
                  Whether it saves or simply opens is decided by your browser and by the host serving it — for a file on
                  another site the download request is usually ignored and it opens instead. Both links go to the URL
                  stored with this entry, {hostOf(viewer.url) || 'an external host'}, and nothing is copied to this
                  practice by using them.
                </div>
              </div>
            </section>
          )}

          {/* ── 3. Reference only ────────────────────────────────────────── */}
          {viewer.kind === 'reference' && (
            <section className="mb-5 bg-organic-surface rounded-organic-card p-5">
              <div className="flex items-start gap-3">
                <LibraryBig size={20} className="text-organic-accent-700 flex-none mt-0.5" />
                <div className="text-[0.8125rem] text-organic-neutral-700 leading-relaxed">
                  {viewer.unviewableFile === null ? (
                    <>
                      <h3 className="font-heading text-[1.0625rem] text-organic-text mb-1.5">
                        A reference, not a copy
                      </h3>
                      <p>
                        The library holds a <strong className="font-semibold">reference</strong> to this work — its
                        title, author, topic and description — and nothing more. It is a commercially published work,
                        so no full text is stored, hosted or proxied by this practice, and there is nothing to play or
                        read inside the app.
                      </p>
                      <p className="mt-2">
                        {lookupIsSearch ? (
                          <>
                            Reach it the way you normally would: through your institutional library, the publisher, or
                            the search below. A search page cannot be shown inside this panel either — the search
                            engines refuse to be embedded in another site, so a frame here would render an empty box
                            rather than results. The search is a way of looking for the work, not the work itself.
                          </>
                        ) : (
                          <>
                            Reach it the way you normally would: through your institutional library or the publisher.
                            No search link is offered for this entry either — the server returned none, and this screen
                            does not invent one.
                          </>
                        )}
                      </p>
                    </>
                  ) : viewer.fileIsWebAddress ? (
                    <>
                      <h3 className="font-heading text-[1.0625rem] text-organic-text mb-1.5">
                        Stored link, not displayable here
                      </h3>
                      <p>
                        This entry has a stored link, but it is neither a video this portal can play nor a PDF it can
                        frame, so there is nothing to show inside the panel. Open it in a new tab to see what it is.
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="font-heading text-[1.0625rem] text-organic-text mb-1.5">
                        The stored link is not a web address
                      </h3>
                      <p>
                        This entry has something in its link field, but it is not an <code>http</code> or{' '}
                        <code>https</code> address. Nothing has been loaded from it and no link to it is offered
                        anywhere on this screen. Treat the entry as unverifiable until the stored value is corrected —
                        it is shown as text below so you can see what it says.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Where the entry can be reached, when the viewer above has not
              already offered it. */}
          {showLookup && (
            <section className="mb-5 bg-organic-surface rounded-organic-card p-5">
              <ResourceLookupBlock resource={resource} />
            </section>
          )}

          {/* ── What the library records about the entry ─────────────────── */}
          <section className="mb-5 bg-organic-surface rounded-organic-card p-5">
            <h3 className="font-heading text-[1.0625rem] mb-3">What the library records</h3>
            <dl className="grid grid-cols-3 gap-x-5 gap-y-2.5 mb-4">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-organic-neutral-600">{label}</dt>
                  <dd className="text-sm text-organic-text">{value}</dd>
                </div>
              ))}
            </dl>
            <div>
              <div className="text-xs text-organic-neutral-600 mb-1">Description</div>
              {resource.description ? (
                <p className="text-[0.8125rem] text-organic-neutral-700 leading-relaxed whitespace-pre-wrap">
                  {resource.description}
                </p>
              ) : (
                <p className="text-[0.8125rem] text-organic-neutral-600 leading-relaxed">
                  No description is stored for this entry.
                </p>
              )}
            </div>
          </section>

          {/* ── The collector's claim. Not the reviewer's decision. ──────── */}
          <section className="mb-5 bg-organic-surface rounded-organic-card p-5">
            <h3 className="font-heading text-[1.0625rem] mb-2.5">Citation audit</h3>
            <ProvenanceBadge provenance={provenanceOf(tags)} />
            <p className="text-[0.8125rem] text-organic-neutral-700 leading-relaxed mt-2.5">
              {PROVENANCE_STYLE[provenanceOf(tags)].title}
            </p>
            <p className="text-[0.7812rem] text-organic-neutral-600 leading-snug mt-1.5">
              This is what was recorded when the entry was collected. It is not a review decision — that is yours, and
              it is below. Neither one sets the other.
            </p>
          </section>

          {/* ── Her decision, in the same place as the thing itself. ─────── */}
          <section className="bg-organic-surface rounded-organic-card p-5">
            <h3 className="font-heading text-[1.0625rem] mb-2.5">Your review</h3>
            <ResourceReviewControls
              resource={resource}
              reviewerName={reviewerName}
              reviewerLookupAvailable={reviewerLookupAvailable}
              onSaved={onSaved}
            />
          </section>
        </div>
      </div>
    </div>
  )
}

type ReviewFilter = 'All' | ResourceReviewStatus

const REVIEW_FILTERS: { key: ReviewFilter; label: string }[] = [
  { key: 'All', label: 'All' },
  { key: 'UNREVIEWED', label: 'Needs review' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'NEEDS_CORRECTION', label: 'Needs correction' },
  { key: 'REJECTED', label: 'Rejected' },
]

function ContentView({ clinicians }: { clinicians: ClinicianRow[] }) {
  const [resources, setResources] = useState<ResourceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<string>('All')
  const [topic, setTopic] = useState<string>('All')
  const [review, setReview] = useState<ReviewFilter>('All')
  // Ids decided during this visit. A card that stops matching the review filter
  // the instant it is saved would hide the very thing the reviewer just did, so
  // it stays on screen (labelled) until the filter is changed again.
  const [justReviewed, setJustReviewed] = useState<string[]>([])
  // The entry open in the viewer panel, held by id rather than by value so the
  // panel always renders the current server row — including one it just saved.
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    apiClient
      .getResources()
      .then(setResources)
      .catch(() => setError('Could not load the content library.'))
      .finally(() => setLoading(false))
  }, [])

  const withTags = resources.map((r) => ({ ...r, tags: Array.isArray(r.tags) ? r.tags : [] }))

  const reviewerName = (id: string) => clinicians.find((c) => c.id === id)?.fullName || null

  const setReviewFilter = (next: ReviewFilter) => {
    setReview(next)
    setJustReviewed([])
  }

  const onSaved = (updated: ResourceItem) => {
    setResources((prev) =>
      prev.map((r) => {
        if (r.id !== updated.id) return r
        const merged = { ...r, ...updated }
        // `lookup_url` is computed, and whether the PATCH response recomputes it
        // is the server's business. If it came back empty, the one GET already
        // sent is kept — losing a card's link as a side effect of reviewing it
        // would be the one thing this screen cannot afford. Nothing is
        // synthesised: an absent lookup stays absent.
        if (!updated.lookup_url) {
          merged.lookup_url = r.lookup_url
          merged.lookup_kind = r.lookup_kind
        }
        return merged
      }),
    )
    setJustReviewed((prev) => (prev.includes(updated.id) ? prev : [...prev, updated.id]))
  }

  const topicMatches = (r: ResourceItem) => topic === 'All' || topicOf(r.tags) === topic
  const categoryMatches = (r: ResourceItem) => category === 'All' || r.category === category
  // Strict membership — what the filter counts mean.
  const reviewMatches = (r: ResourceItem) => review === 'All' || resourceReviewStatus(r) === review
  // What is actually rendered, including anything just decided.
  const reviewVisible = (r: ResourceItem) => reviewMatches(r) || justReviewed.includes(r.id)

  const categories = Array.from(new Set(withTags.map((r) => r.category))).sort()
  const topics = Array.from(
    new Set(withTags.map((r) => topicOf(r.tags)).filter((t): t is string => t !== null)),
  ).sort()

  const visible = withTags.filter((r) => categoryMatches(r) && topicMatches(r) && reviewVisible(r))
  // Everything the Type/Topic filters allow, whatever its review state — the
  // denominator the citation-check line and the progress line are counted over.
  const inScope = withTags.filter((r) => categoryMatches(r) && topicMatches(r))
  // Kept apart on purpose. 'unverified' is a recorded fact — the audit never ran
  // for that topic. 'unrecorded' is the absence of one — nothing was written
  // down either way. Rolling the second into the first would report an absent
  // record as a failed check, which is more than the data says.
  const notChecked = inScope.filter((r) => provenanceOf(r.tags) === 'unverified').length
  const provUnrecorded = inScope.filter((r) => provenanceOf(r.tags) === 'unrecorded').length

  // Progress is counted, never assumed. Rows whose review state the server did
  // not report are excluded from both halves of the fraction and reported
  // separately: "did not say" is not "not reviewed".
  const stated = inScope.filter((r) => resourceReviewStatus(r) !== null)
  const decided = stated.filter((r) => resourceReviewStatus(r) !== 'UNREVIEWED')
  const unstated = inScope.length - stated.length
  const pct = stated.length > 0 ? Math.round((decided.length / stated.length) * 100) : 0
  const countOf = (s: ResourceReviewStatus) => stated.filter((r) => resourceReviewStatus(r) === s).length

  // How many items are reached by a search rather than by a link we actually
  // hold. Counted, not assumed from the media type.
  const searchOnly = inScope.filter((r) => resourceLookup(r)?.kind === 'search').length
  const noLink = inScope.filter((r) => resourceLookup(r) === null).length
  // Rows holding something in the link field that is not a web address. Counted
  // separately rather than folded into `noLink`: "nothing was stored" and "what
  // was stored cannot be opened" are different facts, and leaving the second out
  // of the summary would let a poisoned row pass a skim as a clean one.
  const blockedLink = inScope.filter((r) => resourceLookup(r)?.kind === 'blocked').length

  // Every count above is over `inScope`, which the Review filter deliberately
  // does not narrow: they describe the body of work being checked, not the
  // cards that happen to be on screen. So they must not be captioned "in view"
  // — with a Review filter active that would name a set the reader is not
  // looking at. This says which set they are actually over.
  const scopeLabel =
    category === 'All' && topic === 'All' ? 'in the library' : 'matching the Type and Topic filters'
  const itemWord = (n: number) => (n === 1 ? 'item' : 'items')

  // Grouped by category so a category filter of "All" still reads as a library
  // rather than one undifferentiated wall of cards.
  const grouped = visible.reduce<Record<string, ResourceItem[]>>((acc, r) => {
    ;(acc[r.category] ||= []).push(r)
    return acc
  }, {})
  const groupOrder = Object.keys(grouped).sort()

  // Read from the live list, not from a copy taken when the panel opened.
  const openResource = openId ? withTags.find((r) => r.id === openId) || null : null

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
          <FilterPill
            label="All"
            count={withTags.filter((r) => topicMatches(r) && reviewMatches(r)).length}
            active={category === 'All'}
            onClick={() => setCategory('All')}
          />
          {categories.map((c) => (
            <FilterPill
              key={c}
              label={categoryLabel(c)}
              count={withTags.filter((r) => r.category === c && topicMatches(r) && reviewMatches(r)).length}
              active={category === c}
              onClick={() => setCategory(c)}
            />
          ))}
        </div>
        {topics.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[0.7812rem] uppercase tracking-wide text-organic-neutral-500 w-[62px]">Topic</span>
            <FilterPill
              label="All"
              count={withTags.filter((r) => categoryMatches(r) && reviewMatches(r)).length}
              active={topic === 'All'}
              onClick={() => setTopic('All')}
            />
            {topics.map((t) => (
              <FilterPill
                key={t}
                label={humanTopic(t)}
                count={withTags.filter((r) => topicOf(r.tags) === t && categoryMatches(r) && reviewMatches(r)).length}
                active={topic === t}
                onClick={() => setTopic(t)}
              />
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[0.7812rem] uppercase tracking-wide text-organic-neutral-500 w-[62px]">Review</span>
          {REVIEW_FILTERS.map((f) => (
            <FilterPill
              key={f.key}
              label={f.label}
              count={
                f.key === 'All'
                  ? inScope.length
                  : inScope.filter((r) => resourceReviewStatus(r) === f.key).length
              }
              active={review === f.key}
              onClick={() => setReviewFilter(f.key)}
            />
          ))}
        </div>
      </div>

      {/* Progress. Counted from the rows actually loaded — no target is assumed
          and no number is carried over from anywhere else. */}
      <div className="bg-organic-surface rounded-organic-tile p-4 shadow-organic-sm mb-3">
        {stated.length > 0 ? (
          <>
            <div className="flex justify-between items-baseline gap-3 flex-wrap mb-2">
              <div className="font-heading text-lg">
                {decided.length} of {stated.length} reviewed
              </div>
              <div className="text-[0.7812rem] text-organic-neutral-600">
                Confirmed {countOf('CONFIRMED')} · Needs correction {countOf('NEEDS_CORRECTION')} · Rejected{' '}
                {countOf('REJECTED')} · Not yet reviewed {countOf('UNREVIEWED')}
              </div>
            </div>
            <div className="h-2 rounded-organic-pill bg-organic-neutral-200 overflow-hidden">
              <div className="h-full bg-organic-accent" style={{ width: `${pct}%` }} />
            </div>
            {(category !== 'All' || topic !== 'All') && (
              <div className="text-[0.7812rem] text-organic-neutral-600 mt-1.5">
                Counted over the {inScope.length} {itemWord(inScope.length)} matching the Type and Topic filters, not
                the whole library.
              </div>
            )}
            {review !== 'All' && (
              <div className="text-[0.7812rem] text-organic-neutral-600 mt-1.5">
                The Review filter does not narrow this — progress spans every review state, not only the cards on
                screen.
              </div>
            )}
            {unstated > 0 && (
              <div className="text-[0.7812rem] text-organic-neutral-600 mt-1.5">
                {unstated} more {unstated === 1 ? 'item' : 'items'} came back without a review state, so{' '}
                {unstated === 1 ? 'it is' : 'they are'} not counted here.
              </div>
            )}
          </>
        ) : (
          <div className="text-[0.8125rem] text-organic-neutral-700">
            The server did not return a review state for any of these items, so no review progress can be shown.
          </div>
        )}
      </div>

      <div className="bg-organic-surface rounded-organic-tile p-4 shadow-organic-sm mb-4 text-[0.8125rem] text-organic-neutral-700 leading-relaxed">
        <div className="flex items-start gap-2.5">
          <ShieldCheck size={17} className="text-organic-accent-2-600 flex-none mt-0.5" />
          <div>
            Each card carries two separate facts, and neither one sets the other.{' '}
            <strong className="font-semibold">Citations checked</strong> means an audit independently re-checked a sample
            of that topic&apos;s citations against live sources; <strong className="font-semibold">Citations NOT checked</strong>{' '}
            means that check never ran. <strong className="font-semibold">Review</strong> is what a clinician concluded
            after opening the source herself. Confirming an entry does not make it citation-checked, and a
            citation-checked entry can still be wrong.
            {notChecked > 0 && (
              <div className="mt-1.5 text-organic-accent-800">
                {notChecked} of the {inScope.length} {itemWord(inScope.length)} {scopeLabel}{' '}
                {notChecked === 1 ? 'is marked as never having been' : 'are marked as never having been'} through a
                citation check.
              </div>
            )}
            {provUnrecorded > 0 && (
              <div className="mt-1.5 text-organic-neutral-600">
                A further {provUnrecorded} {itemWord(provUnrecorded)} {provUnrecorded === 1 ? 'carries' : 'carry'} no
                provenance marker at all, so there is no record of whether {provUnrecorded === 1 ? 'it was' : 'they were'}{' '}
                checked — that is not the same as knowing {provUnrecorded === 1 ? 'it was' : 'they were'} not.
              </div>
            )}
            {searchOnly > 0 && (
              <div className="mt-1.5 text-organic-neutral-600">
                {searchOnly} of the {inScope.length} {itemWord(inScope.length)} {scopeLabel}{' '}
                {searchOnly === 1 ? 'has' : 'have'} no stored link, so the button opens a{' '}
                <strong className="font-semibold">search</strong> built from the title and author instead of the item
                itself. A search result is not proof that the entry is real — read what comes back before confirming.
              </div>
            )}
            {noLink > 0 && (
              <div className="mt-1.5 text-organic-neutral-600">
                {noLink} of the {inScope.length} {itemWord(inScope.length)} {scopeLabel}{' '}
                {noLink === 1 ? 'has' : 'have'} nothing to open at all: no stored link, and no lookup returned by the
                server.
              </div>
            )}
            {blockedLink > 0 && (
              <div className="mt-1.5 text-organic-danger">
                {blockedLink} of the {inScope.length} {itemWord(inScope.length)} {scopeLabel}{' '}
                {blockedLink === 1 ? 'holds' : 'hold'} something in the link field that is not a web address, so no
                link is offered for {blockedLink === 1 ? 'it' : 'them'} and nothing has been loaded from{' '}
                {blockedLink === 1 ? 'it' : 'them'}. The stored value is shown as text on the card.
              </div>
            )}
            {review !== 'All' && (
              <div className="mt-1.5 text-organic-neutral-500">
                These counts are not narrowed by the Review filter — they cover every review state, not only the cards
                on screen.
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
            {grouped[cat].map((r) => (
              <ResourceReviewCard
                key={r.id}
                resource={r}
                reviewerName={reviewerName}
                reviewerLookupAvailable={clinicians.length > 0}
                keptAfterFilterChange={!reviewMatches(r)}
                onOpen={() => setOpenId(r.id)}
                onSaved={onSaved}
              />
            ))}
          </div>
        </div>
      ))}

      {openResource && (
        <ResourceViewerPanel
          resource={openResource}
          reviewerName={reviewerName}
          reviewerLookupAvailable={clinicians.length > 0}
          onClose={() => setOpenId(null)}
          onSaved={onSaved}
        />
      )}
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
