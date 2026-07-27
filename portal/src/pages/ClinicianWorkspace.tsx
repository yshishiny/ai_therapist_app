import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import apiClient from '../services/api'
import { useSampleDataHidden } from '../hooks/useSampleDataHidden'
import { SampleGate } from '../components/SampleGate'
import {
  Brain,
  LayoutGrid,
  FolderOpen,
  Mic,
  ListChecks,
  Search,
  Plus,
  AlertTriangle,
  Calendar,
  UsersRound,
  FileEdit,
  Sparkles,
  FileText,
  PenLine,
  Volume2,
  BookOpen,
  Footprints,
  CheckCircle2,
  Circle,
  Lock,
  Check,
  LayoutDashboard,
  LogOut,
  Eye,
  EyeOff,
} from 'lucide-react'

type WorkspaceView = 'caseload' | 'chart' | 'scribe' | 'plan'

// `ready: false` = design mockup only, no real data behind it yet. Those rail
// entries render dimmed and non-clickable rather than opening a screen of
// invented clinical content. Flip to true as each view gets wired up.
const NAV_ITEMS: { view: WorkspaceView; label: string; short: string; icon: typeof LayoutGrid; ready: boolean }[] = [
  { view: 'caseload', label: 'Caseload', short: 'Home', icon: LayoutGrid, ready: true },
  { view: 'chart', label: 'Patient chart', short: 'Chart', icon: FolderOpen, ready: true },
  { view: 'scribe', label: 'AI Scribe', short: 'Scribe', icon: Mic, ready: false },
  { view: 'plan', label: 'Care plan', short: 'Plan', icon: ListChecks, ready: false },
]

const SUBTITLES: Record<Exclude<WorkspaceView, 'caseload' | 'chart'>, string> = {
  scribe: 'Live documentation assistant',
  plan: 'Phased treatment & homework',
}

type ChartPatientRef = { id: string; name: string }

type ScheduleItem = {
  id: string
  patient_id: string
  patient_name: string
  patient_risk: string
  start_time: string
  end_time: string
  location: string
  status: string
}
type NeedsReviewItem = { patient_id: string; patient_name: string; instrument_name: string; interpretation_text: string | null; taken_at: string }
type NoteDueItem = { note_id: string; patient_id: string; patient_name: string; created_at: string }
type ClinicianDashboard = {
  patients_count: number
  sessions_today_count: number
  notes_due_count: number
  today_schedule: ScheduleItem[]
  needs_review: NeedsReviewItem[]
  notes_due: NoteDueItem[]
}

const TODAY_LABEL = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

export default function ClinicianWorkspace() {
  const [view, setView] = useState<WorkspaceView>('caseload')
  const navigate = useNavigate()
  const { logout, user } = useAuthStore()
  const [showNewSession, setShowNewSession] = useState(false)
  const [activeSession, setActiveSession] = useState<SessionData | null>(null)
  const [dashboard, setDashboard] = useState<ClinicianDashboard | null>(null)
  const [myName, setMyName] = useState<string | null>(null)
  const [chartPatient, setChartPatient] = useState<ChartPatientRef | null>(null)

  const openPatient = (p: ChartPatientRef) => {
    setChartPatient(p)
    setView('chart')
  }

  const loadDashboard = () => apiClient.getClinicianDashboard().then(setDashboard)

  useEffect(() => {
    loadDashboard()
    apiClient.getClinicians().then((rows: any[]) => {
      const me = rows.find((r) => r.id === user?.sub)
      if (me) setMyName(me.full_name)
    })
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const title =
    view === 'caseload'
      ? `Good morning, ${myName || '…'}`
      : view === 'chart'
      ? chartPatient?.name || 'Patient chart'
      : { scribe: 'AI Scribe', plan: 'Care plan' }[view]
  const subtitle =
    view === 'caseload'
      ? `${TODAY_LABEL} · ${dashboard ? dashboard.sessions_today_count : '…'} sessions today`
      : view === 'chart'
      ? chartPatient
        ? 'Clinical record'
        : 'Choose a patient to open their record'
      : SUBTITLES[view]

  return (
    <div className="min-h-screen bg-organic-bg flex items-stretch">
      <IconRail view={view} onChange={setView} onOpenAdmin={() => navigate('/')} onLogout={handleLogout} />

      <main className="flex-1 min-w-0 px-9 pt-8 pb-16 max-w-[1240px]">
        <header className="flex justify-between items-end gap-5 flex-wrap mb-7">
          <div>
            <h1 className="text-[34px] font-heading text-organic-text mb-1">{title}</h1>
            <p className="text-organic-neutral-600 text-sm">{subtitle}</p>
          </div>
          <div className="flex gap-2.5 items-center">
            <div className="flex items-center gap-2 bg-organic-surface border border-organic-neutral-300/60 rounded-organic-pill px-3.5 py-2 min-w-[190px]">
              <Search size={16} className="text-organic-neutral-500" />
              <span className="text-sm text-organic-neutral-500">Find patient…</span>
            </div>
            <button
              onClick={() => setShowNewSession(true)}
              className="rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-sm px-[18px] py-2.5 inline-flex items-center gap-1.5 hover:bg-organic-accent-600 transition-colors"
            >
              <Plus size={16} /> New session
            </button>
          </div>
        </header>

        {view === 'caseload' && <CaseloadView dashboard={dashboard} onOpenPatient={openPatient} />}
        {view === 'chart' && <ChartView patient={chartPatient} onPickPatient={setChartPatient} />}
        {view === 'scribe' && <ScribeView />}
        {view === 'plan' && <PlanView />}
      </main>

      {showNewSession && (
        <NewSessionModal
          onClose={() => setShowNewSession(false)}
          onStarted={(session) => {
            setShowNewSession(false)
            setActiveSession(session)
          }}
        />
      )}

      {activeSession && (
        <SessionRunner
          session={activeSession}
          onClose={() => {
            setActiveSession(null)
            loadDashboard()
          }}
          onFinished={() => {
            setActiveSession(null)
            setView('chart')
            loadDashboard()
          }}
        />
      )}
    </div>
  )
}

// ─── New session: pick patient + assessments ───────────────────────────────

type SimplePatient = { id: string; name: string; status: string; risk: string }
type TemplateOption = { id: string; name: string; name_ar?: string | null; template_type: string | null }
type SessionAssessment = {
  template_key: string
  name: string
  name_ar?: string | null
  definition_json: { instructions?: string; instructions_ar?: string; questions: any[] } | null
  completed: boolean
}
type SessionData = {
  id: string
  patient_id: string
  patient_name: string
  status: string
  assessments: SessionAssessment[]
}

function NewSessionModal({ onClose, onStarted }: { onClose: () => void; onStarted: (s: SessionData) => void }) {
  const [patients, setPatients] = useState<SimplePatient[]>([])
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<SimplePatient | null>(null)
  const [autoDetected, setAutoDetected] = useState(false)
  const [currentAppointment, setCurrentAppointment] = useState<{ patient_id: string } | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([apiClient.getPatients({ mine: true }), apiClient.getAssessmentTemplates()])
      .then(([p, t]: [SimplePatient[], TemplateOption[]]) => {
        setPatients(p)
        setTemplates(t)
      })
      .catch(() => setError('Could not load patients or assessments.'))
      .finally(() => setLoading(false))

    // Best-effort: pre-fill from an in-progress appointment. Never blocks
    // the modal or falls back to anything but the manual picker below.
    apiClient
      .getCurrentAppointment()
      .then((appt: { patient_id: string } | null) => setCurrentAppointment(appt))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (loading || selectedPatient || !currentAppointment) return
    const match = patients.find((p) => p.id === currentAppointment.patient_id)
    if (match) {
      setSelectedPatient(match)
      setAutoDetected(true)
    }
  }, [loading, currentAppointment, patients, selectedPatient])

  const filteredPatients = patients.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const start = async () => {
    if (!selectedPatient) return
    setStarting(true)
    setError(null)
    try {
      const session = await apiClient.createClinicianSession(selectedPatient.id, selectedKeys)
      onStarted(session)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not start the session.')
      setStarting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-organic-bg w-full max-w-[560px] max-h-[85vh] overflow-y-auto rounded-organic-card p-7 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-[22px] font-heading text-organic-text">New session</h2>
          <button onClick={onClose} className="text-organic-neutral-500 hover:text-organic-neutral-800 text-2xl leading-none">
            &times;
          </button>
        </div>

        {loading && <div className="text-sm text-organic-neutral-600">Loading…</div>}
        {error && <div className="text-sm text-organic-accent-800 mb-3">{error}</div>}

        {!loading && !selectedPatient && (
          <>
            <label className="block text-xs font-semibold text-organic-neutral-600 mb-1.5">With whom?</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patients…"
              className="w-full bg-organic-surface border border-organic-neutral-300/60 rounded-organic-pill px-3.5 py-2 text-sm mb-3"
            />
            <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto">
              {filteredPatients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPatient(p)}
                  className="text-left flex items-center justify-between bg-organic-surface hover:bg-organic-accent-100 rounded-organic-tile px-3.5 py-2.5 text-sm"
                >
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-xs text-organic-neutral-500">{p.status}</span>
                </button>
              ))}
              {filteredPatients.length === 0 && <div className="text-sm text-organic-neutral-500 px-1">No patients found.</div>}
            </div>
          </>
        )}

        {!loading && selectedPatient && (
          <>
            <div className="flex items-center justify-between bg-organic-accent-100 rounded-organic-tile px-3.5 py-2.5 mb-4">
              <div>
                {autoDetected && (
                  <div className="text-[11px] uppercase tracking-wide text-organic-accent-700 mb-0.5">
                    From your current appointment
                  </div>
                )}
                <span className="font-semibold text-sm text-organic-accent-800">{selectedPatient.name}</span>
              </div>
              <button
                onClick={() => {
                  setSelectedPatient(null)
                  setAutoDetected(false)
                }}
                className="text-xs text-organic-accent-700 underline"
              >
                Change
              </button>
            </div>

            <label className="block text-xs font-semibold text-organic-neutral-600 mb-1.5">
              Which assessments will you administer this session? (optional)
            </label>
            <div className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto mb-5">
              {templates.map((t) => (
                <label
                  key={t.id}
                  className="flex items-center gap-2.5 bg-organic-surface rounded-organic-tile px-3.5 py-2.5 text-sm cursor-pointer"
                >
                  <input type="checkbox" checked={selectedKeys.includes(t.id)} onChange={() => toggleKey(t.id)} />
                  <span className="flex-1">{t.name}</span>
                  {t.name_ar && (
                    <span dir="rtl" className="text-xs text-organic-neutral-500">
                      {t.name_ar}
                    </span>
                  )}
                </label>
              ))}
            </div>

            <button
              onClick={start}
              disabled={starting}
              className="w-full rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-sm py-3 disabled:opacity-50"
            >
              {starting ? 'Starting…' : 'Start session'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Active session runner ──────────────────────────────────────────────────

function SessionRunner({
  session,
  onClose,
  onFinished,
}: {
  session: SessionData
  onClose: () => void
  onFinished: () => void
}) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number | string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [lang, setLang] = useState<'en' | 'ar'>('en')

  const assessments = session.assessments
  const current = assessments[index]
  const done = index >= assessments.length

  const submitCurrent = async () => {
    if (!current) return
    setSubmitting(true)
    try {
      const result = await apiClient.submitAssessment(session.patient_id, current.template_key, answers, session.id)
      setResults((prev) => [...prev, { name: current.name, ...result }])
      setAnswers({})
      setIndex((i) => i + 1)
    } catch {
      // leave the clinician on the same assessment to retry
    } finally {
      setSubmitting(false)
    }
  }

  const finish = async () => {
    try {
      await apiClient.completeClinicianSession(session.id)
    } finally {
      onFinished()
    }
  }

  const questions = current?.definition_json?.questions || []
  const allAnswered =
    questions.length > 0 &&
    questions.every((q: any) => {
      const a = answers[q.id]
      return typeof a === 'string' ? a.trim().length > 0 : a !== undefined
    })

  return (
    <div className="fixed inset-0 bg-organic-bg z-50 overflow-y-auto">
      <div className="max-w-[720px] mx-auto px-8 py-10" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex justify-between items-start mb-2">
          <div>
            <h2 className="text-[26px] font-heading text-organic-text">Session with {session.patient_name}</h2>
            <p className="text-sm text-organic-neutral-600">
              {assessments.length === 0
                ? 'No assessments queued — close whenever you\'re done.'
                : done
                ? 'All assessments completed'
                : `Assessment ${index + 1} of ${assessments.length}: ${
                    (lang === 'ar' && current.name_ar) || current.name
                  }`}
            </p>
          </div>
          <button onClick={onClose} className="text-organic-neutral-500 hover:text-organic-neutral-800 text-2xl leading-none">
            &times;
          </button>
        </div>

        {current?.definition_json?.instructions_ar && (
          <div className="inline-flex bg-organic-neutral-100 border border-organic-neutral-300/60 rounded-organic-pill p-1 my-3">
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
        )}

        {!done && current && (
          <div className="mt-5">
            {current.definition_json?.instructions && (
              <p className="text-sm text-organic-neutral-600 mb-5">
                {lang === 'en' ? current.definition_json.instructions : current.definition_json.instructions_ar || current.definition_json.instructions}
              </p>
            )}
            <div className="flex flex-col gap-4">
              {questions.map((q: any, qi: number) => (
                <div key={q.id} className="bg-organic-surface rounded-organic-tile p-4 shadow-organic-sm">
                  <div className="text-sm font-semibold mb-2.5">
                    {qi + 1}. {(lang === 'en' ? q.text : q.text_ar) || q.text}
                  </div>
                  {q.options && q.options.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {q.options.map((opt: any) => (
                        <button
                          key={opt.value}
                          onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.value }))}
                          className={`text-xs px-3 py-1.5 rounded-organic-pill border transition-colors ${
                            answers[q.id] === opt.value
                              ? 'bg-organic-accent text-organic-accent-100 border-organic-accent'
                              : 'bg-organic-bg border-organic-neutral-300/60 text-organic-neutral-700'
                          }`}
                        >
                          {(lang === 'en' ? opt.label : opt.label_ar) || opt.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      value={typeof answers[q.id] === 'string' ? (answers[q.id] as any) : ''}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value as any }))}
                      placeholder="Record the answer…"
                      className="w-full bg-organic-bg border border-organic-neutral-300/60 rounded-organic-tile px-3 py-2 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={submitCurrent}
              disabled={!allAnswered || submitting}
              className="w-full mt-6 rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-sm py-3 disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : index === assessments.length - 1 ? 'Submit & finish' : 'Submit & next assessment'}
            </button>
          </div>
        )}

        {(done || assessments.length === 0) && (
          <div className="mt-6">
            {results.length > 0 && (
              <div className="flex flex-col gap-3 mb-6">
                {results.map((r, i) => (
                  <div key={i} className="bg-organic-surface rounded-organic-tile p-4 shadow-organic-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-sm">{r.name}</span>
                      <span className="font-heading text-lg text-organic-accent-700">{r.raw_score ?? '—'}</span>
                    </div>
                    <div className="text-xs text-organic-neutral-600">{r.interpretation}</div>
                    {r.risk_flags?.length > 0 && (
                      <div className="mt-2 flex items-center gap-2 bg-organic-accent-100 rounded-organic-tile px-3 py-2">
                        <AlertTriangle size={16} className="text-organic-accent-700 flex-none" />
                        <span className="text-xs text-organic-accent-800">{r.risk_flags[0].message}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <button onClick={finish} className="w-full rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-sm py-3">
              Finish session
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Icon rail ────────────────────────────────────────────────────────────

function IconRail({
  view,
  onChange,
  onOpenAdmin,
  onLogout,
}: {
  view: WorkspaceView
  onChange: (v: WorkspaceView) => void
  onOpenAdmin: () => void
  onLogout: () => void
}) {
  const [hideSampleData, setHideSampleData] = useSampleDataHidden()
  return (
    <aside className="flex-none w-[84px] bg-organic-neutral-100 border-r border-organic-neutral-300/50 py-[22px] flex flex-col items-center gap-2 sticky top-0 h-screen">
      <div className="w-11 h-11 rounded-organic-tile bg-organic-accent grid place-items-center text-organic-accent-100 mb-3.5">
        <Brain size={22} />
      </div>
      {NAV_ITEMS.map(({ view: v, label, short, icon: Icon, ready }) => {
        const active = v === view
        if (!ready) {
          return (
            <div
              key={v}
              title={`${label} — not built yet`}
              aria-disabled="true"
              className="w-[54px] h-[54px] rounded-2xl flex flex-col items-center justify-center gap-0.5 text-organic-neutral-500 opacity-40 cursor-not-allowed select-none"
            >
              <Icon size={21} />
              <span className="text-[9px] font-semibold">{short}</span>
            </div>
          )
        }
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            title={label}
            className={`w-[54px] h-[54px] rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-colors ${
              active ? 'bg-organic-accent text-organic-neutral-100' : 'text-organic-neutral-700 hover:bg-organic-neutral-200'
            }`}
          >
            <Icon size={21} />
            <span className="text-[9px] font-semibold">{short}</span>
          </button>
        )
      })}

      <div className="mt-auto flex flex-col items-center gap-2">
        <button
          onClick={() => setHideSampleData(!hideSampleData)}
          title={hideSampleData ? 'Sample data hidden — click to show' : 'Sample data shown — click to hide'}
          aria-pressed={hideSampleData}
          className={`w-[54px] h-[44px] rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-colors ${
            hideSampleData ? 'bg-organic-accent-100 text-organic-accent-700' : 'text-organic-neutral-700 hover:bg-organic-neutral-200'
          }`}
        >
          {hideSampleData ? <EyeOff size={18} /> : <Eye size={18} />}
          <span className="text-[9px] font-semibold">Samples</span>
        </button>
        <button
          onClick={onOpenAdmin}
          title="Practice admin"
          className="w-[54px] h-[54px] rounded-2xl flex flex-col items-center justify-center gap-0.5 text-organic-neutral-700 hover:bg-organic-neutral-200 transition-colors"
        >
          <LayoutDashboard size={21} />
          <span className="text-[9px] font-semibold">Admin</span>
        </button>
        <button
          onClick={onLogout}
          title="Log out"
          className="w-[54px] h-[44px] rounded-2xl flex flex-col items-center justify-center gap-0.5 text-organic-neutral-700 hover:bg-organic-neutral-200 transition-colors"
        >
          <LogOut size={19} />
          <span className="text-[9px] font-semibold">Log out</span>
        </button>
      </div>
    </aside>
  )
}

// ─── Caseload ─────────────────────────────────────────────────────────────

const RISK_STYLE: Record<string, { color: string; bg: string }> = {
  High: { color: 'text-organic-accent-800', bg: 'bg-organic-accent-200' },
  Crisis: { color: 'text-organic-accent-800', bg: 'bg-organic-accent-200' },
  Med: { color: 'text-organic-accent-2-800', bg: 'bg-organic-accent-2-200' },
  Medium: { color: 'text-organic-accent-2-800', bg: 'bg-organic-accent-2-200' },
  Low: { color: 'text-organic-neutral-700', bg: 'bg-organic-neutral-200' },
}

function riskStyle(risk: string) {
  return RISK_STYLE[risk] || RISK_STYLE.Low
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.length ? (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase() : '?'
}

function CaseloadView({
  dashboard,
  onOpenPatient,
}: {
  dashboard: ClinicianDashboard | null
  onOpenPatient: (p: ChartPatientRef) => void
}) {
  const stats = [
    { label: 'Today', value: dashboard ? String(dashboard.sessions_today_count) : '…', icon: Calendar },
    { label: 'My patients', value: dashboard ? String(dashboard.patients_count) : '…', icon: UsersRound },
    { label: 'Notes due', value: dashboard ? String(dashboard.notes_due_count) : '…', icon: FileEdit },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-4">
      <div>
        <div className="grid grid-cols-3 gap-3.5 mb-4">
          {stats.map((st) => (
            <div key={st.label} className="bg-organic-surface rounded-organic-card p-4 shadow-organic-sm">
              <div className="flex justify-between">
                <span className="text-xs text-organic-neutral-600">{st.label}</span>
                <st.icon size={16} className="text-organic-accent-500" />
              </div>
              <div className="font-heading text-[28px] mt-1.5 text-organic-text">{st.value}</div>
            </div>
          ))}
        </div>

        <div className="bg-organic-surface rounded-organic-card p-[22px] shadow-organic-sm">
          <h3 className="text-[19px] font-heading text-organic-text mb-3">Today&apos;s schedule</h3>
          <div className="flex flex-col">
            {!dashboard && <div className="text-sm text-organic-neutral-600 py-2">Loading…</div>}
            {dashboard && dashboard.today_schedule.length === 0 && (
              <div className="text-sm text-organic-neutral-600 py-2">No appointments scheduled for today.</div>
            )}
            {dashboard?.today_schedule.map((s) => (
              <button
                key={s.id}
                onClick={() => onOpenPatient({ id: s.patient_id, name: s.patient_name })}
                className="flex items-center gap-3.5 py-3 px-1 border-b border-organic-text/[0.07] last:border-b-0 text-left"
              >
                <span className="text-sm font-bold text-organic-accent-700 w-14">{formatTime(s.start_time)}</span>
                <div className="w-9 h-9 rounded-full bg-organic-accent-200 grid place-items-center text-[11px] font-bold text-organic-accent-800">
                  {initialsOf(s.patient_name)}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-organic-text">{s.patient_name}</div>
                  <div className="text-xs text-organic-neutral-600">{s.location === 'ONLINE' ? 'Video' : 'In person'} · {s.status}</div>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-organic-pill ${riskStyle(s.patient_risk).bg} ${riskStyle(s.patient_risk).color}`}>
                  {s.patient_risk}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="bg-organic-accent-100 rounded-organic-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={17} className="text-organic-accent-700" />
            <h3 className="text-[17px] font-heading text-organic-accent-800">Needs review</h3>
          </div>
          <div className="flex flex-col gap-2.5">
            {dashboard && dashboard.needs_review.length === 0 && (
              <div className="text-xs text-organic-accent-700">Nothing flagged in the last 14 days.</div>
            )}
            {dashboard?.needs_review.map((f) => (
              <button
                key={`${f.patient_id}-${f.taken_at}`}
                onClick={() => onOpenPatient({ id: f.patient_id, name: f.patient_name })}
                className="bg-organic-bg rounded-organic-tile p-3 text-left w-full"
              >
                <div className="font-semibold text-[13.5px] text-organic-text">{f.patient_name}</div>
                <div className="text-xs text-organic-neutral-700">
                  {f.instrument_name}{f.interpretation_text ? ` — ${f.interpretation_text}` : ' flagged'}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-organic-surface rounded-organic-card p-5 shadow-organic-sm">
          <h3 className="text-[17px] font-heading text-organic-text mb-3">Tasks</h3>
          <div className="flex flex-col gap-2.5">
            {dashboard && dashboard.notes_due.length === 0 && (
              <div className="text-[13.5px] text-organic-neutral-600">All session notes are signed off.</div>
            )}
            {dashboard?.notes_due.map((n) => (
              <div key={n.note_id} className="flex items-center gap-2.5 text-[13.5px] text-organic-text">
                <span className="w-5 h-5 rounded-[6px] border-2 border-organic-neutral-400 flex-none" />
                Sign session note · {n.patient_name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Patient chart (real data) ──────────────────────────────────────────────

type PatientDetail = {
  id: string
  name: string
  status: string
  risk: string
  diagnosis: string
  last_seen: string | null
  therapist_id: string | null
  dob: string | null
  gender: string | null
  phone: string | null
  email: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  consent_ai_analysis: boolean
  wellbeing_status: string | null
}
type SessionNote = {
  id: string
  patient_id: string
  template: string
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
  free_text: string | null
  created_at: string
}
type AssessmentRecord = {
  id: string
  assessment_id: string
  raw_score: number | null
  severity: string | null
  interpretation: string | null
  flagged: boolean
  created_at: string
}

function notePreview(n: SessionNote): string {
  const text = n.free_text || [n.subjective, n.objective, n.assessment, n.plan].filter(Boolean).join(' · ')
  return text ? (text.length > 160 ? text.slice(0, 160) + '…' : text) : '(empty note)'
}

// dob arrives as a plain calendar date ("1998-04-12"). Parsing it with the Date
// constructor would read it as UTC midnight and shift it a day back for viewers
// west of Greenwich, so the parts are pulled out by hand instead.
function parseDateOnly(value: string | null): { year: number; month: number; day: number } | null {
  const parts = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null
  if (!parts) return null
  const year = Number(parts[1])
  const month = Number(parts[2])
  const day = Number(parts[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return { year, month, day }
}

// Value shape the native <input type="date"> expects, and the shape the PATCH sends back.
function toDateInputValue(dob: string | null): string {
  const p = parseDateOnly(dob)
  return p ? `${String(p.year).padStart(4, '0')}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}` : ''
}

function formatDob(dob: string | null): string | null {
  const p = parseDateOnly(dob)
  if (!p) return null
  return new Date(p.year, p.month - 1, p.day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function ageFrom(dob: string | null): string | null {
  const p = parseDateOnly(dob)
  if (!p) return null
  const now = new Date()
  let years = now.getFullYear() - p.year
  const month = now.getMonth() + 1
  if (month < p.month || (month === p.month && now.getDate() < p.day)) years -= 1
  return years >= 0 && years < 130 ? `${years}` : null
}

// ─── Patient profile card ───────────────────────────────────────────────────

const GENDER_OPTIONS = ['Female', 'Male', 'Non-binary', 'Prefer not to say']
const STATUS_OPTIONS = ['Active', 'Intake', 'Maintenance', 'Discharged']
const RISK_OPTIONS = ['Low', 'Med', 'High', 'Crisis']
const WELLBEING_OPTIONS = ['GREEN', 'AMBER', 'RED']

const WELLBEING_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  GREEN: { label: 'Green · stable', color: 'text-organic-neutral-700', bg: 'bg-organic-neutral-200' },
  AMBER: { label: 'Amber · watch', color: 'text-organic-accent-2-800', bg: 'bg-organic-accent-2-200' },
  RED: { label: 'Red · concern', color: 'text-organic-accent-800', bg: 'bg-organic-accent-200' },
}

// Never silently rewrite a stored value the dropdown doesn't know about.
function withCurrent(options: string[], current: string): string[] {
  return current && !options.includes(current) ? [current, ...options] : options
}

type ProfileDraft = {
  name: string
  dob: string
  gender: string
  diagnosis: string
  phone: string
  email: string
  emergency_contact_name: string
  emergency_contact_phone: string
  status: string
  risk: string
  wellbeing_status: string
  consent_ai_analysis: boolean
}

// Every text-ish key that PatientUpdateIn accepts; dob and the consent flag are
// handled separately because they are not strings on the wire.
const PROFILE_TEXT_FIELDS = [
  'name',
  'gender',
  'diagnosis',
  'phone',
  'email',
  'emergency_contact_name',
  'emergency_contact_phone',
  'status',
  'risk',
  'wellbeing_status',
] as const

function draftFrom(d: PatientDetail): ProfileDraft {
  return {
    name: d.name || '',
    dob: toDateInputValue(d.dob),
    gender: d.gender || '',
    diagnosis: d.diagnosis || '',
    phone: d.phone || '',
    email: d.email || '',
    emergency_contact_name: d.emergency_contact_name || '',
    emergency_contact_phone: d.emergency_contact_phone || '',
    status: d.status || '',
    risk: d.risk || '',
    wellbeing_status: d.wellbeing_status || '',
    consent_ai_analysis: !!d.consent_ai_analysis,
  }
}

// PatientOut declares name/status/risk as non-nullable strings. PATCHing one of
// them to null still commits the UPDATE and only then fails response validation,
// which leaves a NULL in the row that makes every later GET /patients and
// GET /patients/{id} fail too. So these are never sent empty; save() rejects the
// empty case up front instead.
const PROFILE_REQUIRED_FIELDS: readonly string[] = ['name', 'status', 'risk']

// Only the fields that actually changed, and only fields PatientUpdateIn allows.
function profilePatch(detail: PatientDetail, draft: ProfileDraft): Record<string, string | boolean | null> {
  const patch: Record<string, string | boolean | null> = {}
  for (const key of PROFILE_TEXT_FIELDS) {
    const trimmed = draft[key].trim()
    if (!trimmed && PROFILE_REQUIRED_FIELDS.includes(key)) continue
    const next = trimmed || null
    if (next !== (detail[key] || null)) patch[key] = next
  }
  const nextDob = draft.dob || null
  if (nextDob !== (toDateInputValue(detail.dob) || null)) patch.dob = nextDob
  if (draft.consent_ai_analysis !== !!detail.consent_ai_analysis) {
    patch.consent_ai_analysis = draft.consent_ai_analysis
  }
  return patch
}

const DT_CLASS = 'text-[11px] font-semibold tracking-wide uppercase text-organic-neutral-600 mb-0.5'
const INPUT_CLASS = 'w-full bg-organic-bg border border-organic-neutral-300/60 rounded-organic-tile px-3 py-2 text-sm'
const FORM_LABEL_CLASS = 'block text-xs font-semibold text-organic-neutral-600 mb-1.5'

function ProfileField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className={DT_CLASS}>{label}</dt>
      <dd className={`text-[13.5px] ${value ? 'text-organic-text' : 'text-organic-neutral-500 italic'}`}>
        {value || 'Not recorded'}
      </dd>
    </div>
  )
}

function PatientProfileCard({
  detail,
  onUpdated,
}: {
  detail: PatientDetail | null
  onUpdated: (next: PatientDetail) => void
}) {
  const [draft, setDraft] = useState<ProfileDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startEdit = () => {
    if (!detail) return
    setDraft(draftFrom(detail))
    setError(null)
  }

  // Dropping the draft restores the pre-edit values, which live on `detail`.
  const cancelEdit = () => {
    setDraft(null)
    setError(null)
  }

  const set = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) =>
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev))

  const save = async () => {
    if (!detail || !draft) return
    if (!draft.name.trim()) {
      setError('Full name cannot be empty.')
      return
    }
    if (!draft.status.trim() || !draft.risk.trim()) {
      setError('Status and risk are required — choose a value for both.')
      return
    }
    const patch = profilePatch(detail, draft)
    if (Object.keys(patch).length === 0) {
      cancelEdit()
      return
    }
    setSaving(true)
    setError(null)
    try {
      const updated = (await apiClient.updatePatient(detail.id, patch)) as Partial<PatientDetail> | null
      const next: PatientDetail = { ...detail, ...(updated || {}) }
      next.consent_ai_analysis = !!next.consent_ai_analysis
      onUpdated(next)
      setDraft(null)
    } catch {
      setError('Could not save the profile — please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-organic-surface rounded-organic-card p-[22px] shadow-organic-sm">
      <div className="flex justify-between items-center gap-3 mb-3.5">
        <h3 className="text-lg font-heading text-organic-text">Patient profile</h3>
        {detail && !draft && (
          <button
            onClick={startEdit}
            className="rounded-organic-pill border border-organic-neutral-300/70 bg-transparent font-heading text-[12.5px] px-3.5 py-1.5 text-organic-text hover:bg-organic-neutral-100 transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      {error && <div className="text-sm text-organic-accent-800 mb-3">{error}</div>}

      {!detail && <div className="text-sm text-organic-neutral-600">Loading…</div>}

      {detail && !draft && (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3.5">
          <ProfileField label="Full name" value={detail.name} />
          <ProfileField
            label="Date of birth"
            value={(() => {
              const formatted = formatDob(detail.dob)
              const age = ageFrom(detail.dob)
              if (!formatted) return null
              return age ? `${formatted} · ${age} yrs` : formatted
            })()}
          />
          <ProfileField label="Gender" value={detail.gender} />
          <ProfileField label="Diagnosis" value={detail.diagnosis} />
          <ProfileField label="Contact phone" value={detail.phone} />
          <ProfileField label="Contact email" value={detail.email} />
          <ProfileField label="Emergency contact" value={detail.emergency_contact_name} />
          <ProfileField label="Emergency phone" value={detail.emergency_contact_phone} />
          <ProfileField label="Status" value={detail.status} />
          <div>
            <dt className={DT_CLASS}>Risk</dt>
            <dd>
              {detail.risk ? (
                <span
                  className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-organic-pill ${riskStyle(detail.risk).bg} ${riskStyle(detail.risk).color}`}
                >
                  {detail.risk}
                </span>
              ) : (
                <span className="text-[13.5px] text-organic-neutral-500 italic">Not recorded</span>
              )}
            </dd>
          </div>
          <div>
            <dt className={DT_CLASS}>Wellbeing</dt>
            <dd>
              {detail.wellbeing_status ? (
                <span
                  className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-organic-pill ${
                    (WELLBEING_STYLE[detail.wellbeing_status] || WELLBEING_STYLE.GREEN).bg
                  } ${(WELLBEING_STYLE[detail.wellbeing_status] || WELLBEING_STYLE.GREEN).color}`}
                >
                  {(WELLBEING_STYLE[detail.wellbeing_status] || { label: detail.wellbeing_status }).label}
                </span>
              ) : (
                <span className="text-[13.5px] text-organic-neutral-500 italic">Not recorded</span>
              )}
            </dd>
          </div>
          <div>
            <dt className={DT_CLASS}>AI analysis consent</dt>
            <dd>
              <span
                className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-organic-pill ${
                  detail.consent_ai_analysis
                    ? 'bg-organic-accent-2-200 text-organic-accent-2-800'
                    : 'bg-organic-neutral-200 text-organic-neutral-700'
                }`}
              >
                {detail.consent_ai_analysis ? 'Granted' : 'Not granted'}
              </span>
            </dd>
          </div>
        </dl>
      )}

      {detail && draft && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <label className={FORM_LABEL_CLASS}>Full name</label>
              <input value={draft.name} onChange={(e) => set('name', e.target.value)} className={INPUT_CLASS} />
            </div>
            <div>
              <label className={FORM_LABEL_CLASS}>Date of birth</label>
              <input type="date" value={draft.dob} onChange={(e) => set('dob', e.target.value)} className={INPUT_CLASS} />
            </div>
            <div>
              <label className={FORM_LABEL_CLASS}>Gender</label>
              <select value={draft.gender} onChange={(e) => set('gender', e.target.value)} className={INPUT_CLASS}>
                <option value="">Not recorded</option>
                {withCurrent(GENDER_OPTIONS, draft.gender).map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={FORM_LABEL_CLASS}>Diagnosis</label>
              <input
                value={draft.diagnosis}
                onChange={(e) => set('diagnosis', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={FORM_LABEL_CLASS}>Contact phone</label>
              <input
                type="tel"
                value={draft.phone}
                onChange={(e) => set('phone', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={FORM_LABEL_CLASS}>Contact email</label>
              <input
                type="email"
                value={draft.email}
                onChange={(e) => set('email', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={FORM_LABEL_CLASS}>Emergency contact</label>
              <input
                value={draft.emergency_contact_name}
                onChange={(e) => set('emergency_contact_name', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={FORM_LABEL_CLASS}>Emergency phone</label>
              <input
                type="tel"
                value={draft.emergency_contact_phone}
                onChange={(e) => set('emergency_contact_phone', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={FORM_LABEL_CLASS}>Status</label>
              <select value={draft.status} onChange={(e) => set('status', e.target.value)} className={INPUT_CLASS}>
                {/* Required by PatientOut — selectable only as a placeholder for an already-empty row. */}
                <option value="" disabled>
                  Choose a status
                </option>
                {withCurrent(STATUS_OPTIONS, draft.status).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={FORM_LABEL_CLASS}>Risk</label>
              <select value={draft.risk} onChange={(e) => set('risk', e.target.value)} className={INPUT_CLASS}>
                {/* Required by PatientOut — selectable only as a placeholder for an already-empty row. */}
                <option value="" disabled>
                  Choose a risk level
                </option>
                {withCurrent(RISK_OPTIONS, draft.risk).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={FORM_LABEL_CLASS}>Wellbeing</label>
              <select
                value={draft.wellbeing_status}
                onChange={(e) => set('wellbeing_status', e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">Not recorded</option>
                {withCurrent(WELLBEING_OPTIONS, draft.wellbeing_status).map((w) => (
                  <option key={w} value={w}>
                    {(WELLBEING_STYLE[w] || { label: w }).label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2.5 bg-organic-bg rounded-organic-tile px-3.5 py-2.5 text-sm cursor-pointer sm:col-span-2 self-end">
              <input
                type="checkbox"
                checked={draft.consent_ai_analysis}
                onChange={(e) => set('consent_ai_analysis', e.target.checked)}
              />
              <span className="flex-1">Patient consents to AI analysis of their clinical data</span>
            </label>
          </div>

          <div className="flex gap-2.5 mt-4">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-sm px-5 py-2 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save profile'}
            </button>
            <button
              onClick={cancelEdit}
              disabled={saving}
              className="rounded-organic-pill border border-organic-neutral-300/70 bg-transparent font-heading text-sm px-4 py-2 text-organic-text hover:bg-organic-neutral-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function ChartView({
  patient,
  onPickPatient,
}: {
  patient: ChartPatientRef | null
  onPickPatient: (p: ChartPatientRef | null) => void
}) {
  const [myPatients, setMyPatients] = useState<SimplePatient[]>([])
  const [detail, setDetail] = useState<PatientDetail | null>(null)
  const [notes, setNotes] = useState<SessionNote[] | null>(null)
  const [records, setRecords] = useState<AssessmentRecord[] | null>(null)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!patient) {
      apiClient.getPatients({ mine: true }).then(setMyPatients).catch(() => setMyPatients([]))
      return
    }
    setDetail(null)
    setNotes(null)
    setRecords(null)
    setError(null)
    Promise.all([
      apiClient.getPatient(patient.id),
      apiClient.getPatientSessions(patient.id),
      apiClient.getPatientAssessments(patient.id),
    ])
      .then(([d, n, a]) => {
        setDetail(d)
        setNotes(n)
        setRecords(a)
      })
      .catch(() => setError('Could not load this patient\'s record.'))
  }, [patient?.id])

  const saveNote = async () => {
    if (!patient || !noteText.trim()) return
    setSavingNote(true)
    try {
      const created = await apiClient.createSession(patient.id, { template: 'FREE', free_text: noteText.trim() })
      setNotes((prev) => [created, ...(prev || [])])
      setNoteText('')
    } catch {
      setError('Could not save the note — try again.')
    } finally {
      setSavingNote(false)
    }
  }

  if (!patient) {
    return (
      <div className="max-w-[560px]">
        <h3 className="text-lg font-heading text-organic-text mb-3">Open a patient record</h3>
        <div className="flex flex-col gap-1.5">
          {myPatients.map((p) => (
            <button
              key={p.id}
              onClick={() => onPickPatient({ id: p.id, name: p.name })}
              className="text-left flex items-center justify-between bg-organic-surface hover:bg-organic-accent-100 rounded-organic-tile px-3.5 py-2.5 text-sm"
            >
              <span className="font-semibold">{p.name}</span>
              <span className="text-xs text-organic-neutral-500">{p.status}</span>
            </button>
          ))}
          {myPatients.length === 0 && (
            <div className="text-sm text-organic-neutral-600">No patients assigned to you yet.</div>
          )}
        </div>
      </div>
    )
  }

  const age = ageFrom(detail?.dob || null)
  const openRef = patient

  const handleProfileUpdated = (next: PatientDetail) => {
    setDetail(next)
    // Keep the chart header and page title in step with a renamed patient.
    if (next.name && next.name !== openRef.name) onPickPatient({ id: openRef.id, name: next.name })
  }

  return (
    <div>
      <div className="flex items-center gap-3.5 mb-[18px]">
        <div className="w-[52px] h-[52px] rounded-full bg-organic-accent-200 grid place-items-center font-bold text-base text-organic-accent-800">
          {initialsOf(patient.name)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2.5">
            <span className="font-heading text-[22px] text-organic-text">{patient.name}</span>
            {detail && (
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-organic-pill ${riskStyle(detail.risk).bg} ${riskStyle(detail.risk).color}`}>
                {detail.risk} risk
              </span>
            )}
          </div>
          <div className="text-sm text-organic-neutral-600">
            {[age && `${age} yrs`, detail?.gender, detail?.status, detail?.diagnosis].filter(Boolean).join(' · ') || 'Loading…'}
          </div>
        </div>
        <button onClick={() => onPickPatient(null)} className="text-xs text-organic-accent-700 underline">
          Change patient
        </button>
      </div>

      {error && <div className="text-sm text-organic-accent-800 mb-3">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <div className="flex flex-col gap-4">
          <PatientProfileCard detail={detail} onUpdated={handleProfileUpdated} />

          <div className="bg-organic-surface rounded-organic-card p-[22px] shadow-organic-sm">
            <h3 className="text-lg font-heading text-organic-text mb-3">Add session note</h3>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write the session note…"
              rows={4}
              className="w-full bg-organic-bg border border-organic-neutral-300/60 rounded-organic-tile px-3.5 py-2.5 text-sm mb-2.5 resize-y"
            />
            <button
              onClick={saveNote}
              disabled={savingNote || !noteText.trim()}
              className="rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-sm px-5 py-2 disabled:opacity-50"
            >
              {savingNote ? 'Saving…' : 'Save note'}
            </button>
          </div>

          <div className="bg-organic-surface rounded-organic-card p-[22px] shadow-organic-sm">
            <h3 className="text-lg font-heading text-organic-text mb-3">Session history</h3>
            <div className="flex flex-col">
              {notes === null && <div className="text-sm text-organic-neutral-600 py-2">Loading…</div>}
              {notes && notes.length === 0 && (
                <div className="text-sm text-organic-neutral-600 py-2">No session notes yet — the note you write above will be the first.</div>
              )}
              {notes?.map((n) => (
                <div key={n.id} className="flex items-start gap-3.5 py-3 px-1 border-b border-organic-text/[0.07] last:border-b-0">
                  <FileText size={17} className="text-organic-accent-600 mt-0.5 flex-none" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] text-organic-text">{notePreview(n)}</div>
                    <div className="text-xs text-organic-neutral-600 mt-0.5">
                      {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · {n.template}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-3.5">
          <div className="bg-organic-surface rounded-organic-card p-5 shadow-organic-sm">
            <h4 className="text-base font-heading text-organic-text mb-3">Assessment results</h4>
            <div className="flex flex-col gap-2.5">
              {records === null && <div className="text-sm text-organic-neutral-600">Loading…</div>}
              {records && records.length === 0 && (
                <div className="text-sm text-organic-neutral-600">No assessments recorded yet.</div>
              )}
              {records?.map((r) => (
                <div key={r.id} className="border-b border-organic-text/[0.07] last:border-b-0 pb-2.5 last:pb-0">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-sm font-semibold text-organic-text uppercase">{r.assessment_id}</span>
                    <span className="font-bold text-organic-accent-700 text-sm">
                      {r.raw_score !== null ? r.raw_score : '—'}
                      {r.severity ? ` · ${r.severity}` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-organic-neutral-600 mt-0.5">
                    <span>{new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    {r.flagged && (
                      <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-organic-pill bg-organic-accent-200 text-organic-accent-800">
                        Flagged
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

// ─── AI Scribe ──────────────────────────────────────────────────────────────

const TRANSCRIPT = [
  { who: 'CLINICIAN', text: 'How have things been since we last spoke about the sleep routine?' },
  { who: 'PATIENT', text: 'The breathing before bed actually helped a few nights. Still wake up around 3am worrying though.' },
  { who: 'CLINICIAN', text: "That's real progress. When you wake at 3am, what's the first thought?" },
  { who: 'PATIENT', text: 'Usually that I forgot something at work and it will all fall apart.' },
]

const SOAP = [
  { k: 'Subjective', v: 'Reports improved sleep onset with breathing homework; residual 3am waking with catastrophic work-related cognitions.' },
  { k: 'Objective', v: 'Bright affect, engaged. PHQ-9 14 (↓ from 18). No acute SI voiced; item 9 monitored.' },
  { k: 'Assessment', v: 'MDD, moderate — improving. Anxiety maintaining. Good homework adherence.' },
  { k: 'Plan', v: 'Continue CBT; add thought record for nighttime cognitions. Weekly safety check-in. GAD-7 next session.' },
]

function ScribeView() {
  const [hideSampleData] = useSampleDataHidden()
  return (
    <SampleGate
      hidden={hideSampleData}
      placeholder={
        <div className="text-sm text-organic-neutral-600 py-8">
          Live transcript and AI session notes will appear here once a recording session starts.
        </div>
      }
    >
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-organic-surface rounded-organic-card p-[22px] shadow-organic-sm">
        <div className="flex justify-between items-center mb-3.5">
          <h3 className="text-lg font-heading text-organic-text">Session transcript</h3>
          <span className="inline-flex items-center gap-1.5 text-xs text-organic-accent-700">
            <span className="w-2 h-2 rounded-full bg-organic-accent animate-pulse" />
            Recording 24:11
          </span>
        </div>
        <div className="flex flex-col gap-3">
          {TRANSCRIPT.map((t, i) => (
            <div key={i}>
              <div className={`text-[11px] font-bold mb-0.5 ${t.who === 'CLINICIAN' ? 'text-organic-accent-700' : 'text-organic-accent-2-700'}`}>
                {t.who}
              </div>
              <div className="text-[13.5px] text-organic-neutral-800 leading-relaxed">{t.text}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        <div className="bg-gradient-to-br from-organic-accent-100 to-organic-surface rounded-organic-card p-[22px] shadow-organic-sm">
          <div className="flex items-center gap-2 mb-3.5">
            <Sparkles size={18} className="text-organic-accent-700" />
            <h3 className="text-lg font-heading text-organic-text">AI session note (SOAP)</h3>
          </div>
          <div className="flex flex-col gap-3">
            {SOAP.map((s) => (
              <div key={s.k}>
                <div className="text-[11px] font-bold tracking-wide uppercase text-organic-accent-700 mb-0.5">{s.k}</div>
                <div className="text-[13px] text-organic-neutral-800 leading-relaxed">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2.5">
          <button className="flex-1 rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-sm py-3.5 hover:bg-organic-accent-600 transition-colors">
            Save to chart
          </button>
          <button className="rounded-organic-pill border border-organic-neutral-300/70 bg-transparent font-heading text-sm px-[18px] py-3.5 text-organic-text hover:bg-organic-neutral-100 transition-colors">
            Edit
          </button>
        </div>
      </div>
    </div>
    </SampleGate>
  )
}

// ─── Care plan ──────────────────────────────────────────────────────────────

const PHASES = [
  { title: 'Phase 1 · Stabilize', detail: 'Weeks 1–3 · psychoeducation, safety plan', state: 'done' as const },
  { title: 'Phase 2 · Skills', detail: 'Weeks 4–7 · CBT reframing, sleep hygiene', state: 'done' as const },
  { title: 'Phase 3 · Exposure', detail: 'Weeks 8–10 · behavioral activation (current)', state: 'current' as const },
  { title: 'Phase 4 · Consolidate', detail: 'Weeks 11–12 · relapse prevention', state: 'upcoming' as const },
]

const HOMEWORK = [
  { icon: PenLine, title: 'CBT thought record', meta: 'Daily · this week', done: true },
  { icon: Volume2, title: 'Evening breathing', meta: 'Nightly · audio', done: true },
  { icon: BookOpen, title: 'Read: Understanding worry', meta: 'By Friday', done: false },
  { icon: Footprints, title: 'Morning walk log', meta: '3× this week', done: false },
]

function PlanView() {
  const [hideSampleData] = useSampleDataHidden()
  return (
    <SampleGate
      hidden={hideSampleData}
      placeholder={
        <div className="text-sm text-organic-neutral-600 py-8">
          Care plan details will appear here once a treatment plan is created for this patient.
        </div>
      }
    >
    <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4">
      <div className="bg-organic-surface rounded-organic-card p-[22px] shadow-organic-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[19px] font-heading text-organic-text">Treatment plan · Maya O.</h3>
          <span className="text-[11px] px-3 py-1 rounded-organic-pill bg-organic-accent-2-100 text-organic-accent-2-800 font-semibold">
            CBT · 12 weeks
          </span>
        </div>
        <div className="flex flex-col">
          {PHASES.map((p, i) => (
            <div key={p.title} className="flex gap-3.5">
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full grid place-items-center flex-none ${
                    p.state === 'done'
                      ? 'bg-organic-accent-2-500 text-organic-accent-100'
                      : p.state === 'current'
                        ? 'bg-organic-accent text-organic-accent-100'
                        : 'bg-organic-neutral-200 text-organic-neutral-500'
                  }`}
                >
                  {p.state === 'done' ? (
                    <Check size={14} />
                  ) : p.state === 'current' ? (
                    <span className="w-2 h-2 rounded-full bg-organic-accent-100" />
                  ) : (
                    <Lock size={14} />
                  )}
                </div>
                {i < PHASES.length - 1 && <div className="w-0.5 flex-1 bg-organic-divider min-h-[18px] bg-organic-neutral-300" />}
              </div>
              <div className="pb-[18px]">
                <div className="font-bold text-sm text-organic-text">{p.title}</div>
                <div className="text-[12.5px] text-organic-neutral-600">{p.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-organic-surface rounded-organic-card p-[22px] shadow-organic-sm">
        <div className="flex justify-between items-center mb-3.5">
          <h3 className="text-lg font-heading text-organic-text">Assign homework</h3>
          <button className="rounded-organic-pill bg-organic-accent text-organic-accent-100 text-[12.5px] font-heading px-3.5 py-2 hover:bg-organic-accent-600 transition-colors">
            + Add
          </button>
        </div>
        <div className="flex flex-col gap-2.5">
          {HOMEWORK.map((h) => (
            <div key={h.title} className="flex items-center gap-3 bg-organic-neutral-100 rounded-organic-tile p-3.5">
              <div className="w-[38px] h-[38px] rounded-organic-tile bg-organic-accent-100 grid place-items-center flex-none">
                <h.icon size={18} className="text-organic-accent-700" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-[13.5px] text-organic-text">{h.title}</div>
                <div className="text-[11.5px] text-organic-neutral-600">{h.meta}</div>
              </div>
              {h.done ? (
                <CheckCircle2 size={17} className="text-organic-accent-2-600" />
              ) : (
                <Circle size={17} className="text-organic-neutral-400" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
    </SampleGate>
  )
}
