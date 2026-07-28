import { Fragment, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import apiClient from '../services/api'
import type { NextAppointmentIn } from '../services/api'
import { sourceMetaOf, addedByLabel } from '../types/patient'
import { useSampleDataHidden } from '../hooks/useSampleDataHidden'
import { SegmentedControl } from '../components/OrganicUI'
import { TextSizeControl } from '../components/TextSizeControl'
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
  CalendarDays,
  CalendarClock,
  CalendarPlus,
  UserX,
  UsersRound,
  FileEdit,
  FileText,
  CheckCircle2,
  Circle,
  Lock,
  LayoutDashboard,
  LogOut,
  Eye,
  EyeOff,
  Clock,
  StickyNote,
  History,
  ClipboardList,
  ArrowRight,
  FlaskConical,
} from 'lucide-react'

type WorkspaceView = 'caseload' | 'scheduler' | 'chart' | 'scribe' | 'plan'

// `ready: false` = design mockup only, no real data behind it yet. Those rail
// entries render dimmed and non-clickable rather than opening a screen of
// invented clinical content. Flip to true as each view gets wired up.
const NAV_ITEMS: { view: WorkspaceView; label: string; short: string; icon: typeof LayoutGrid; ready: boolean }[] = [
  { view: 'caseload', label: 'Caseload', short: 'Home', icon: LayoutGrid, ready: true },
  { view: 'scheduler', label: 'Scheduler', short: 'Week', icon: CalendarDays, ready: true },
  { view: 'chart', label: 'Patient chart', short: 'Chart', icon: FolderOpen, ready: true },
  { view: 'scribe', label: 'AI Scribe', short: 'Scribe', icon: Mic, ready: false },
  { view: 'plan', label: 'Care plan', short: 'Plan', icon: ListChecks, ready: true },
]

const SUBTITLES: Record<Exclude<WorkspaceView, 'caseload' | 'chart' | 'scheduler'>, string> = {
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

// The server caps /patients at 200. A caseload larger than that needs real
// paging here; until then take the maximum rather than the default 50, which
// hid the least-recently-seen patients without saying so.
const CASELOAD_LIMIT = 200

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
  // The Scheduler owns its own week state; it reports the week label back up so
  // the page header subtitle can show it (design §1.2).
  const [schedulerLabel, setSchedulerLabel] = useState<string | null>(null)

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
      : view === 'scheduler'
      ? 'Scheduler'
      : { scribe: 'AI Scribe', plan: 'Care plan' }[view]
  const subtitle =
    view === 'caseload'
      ? `${TODAY_LABEL} · ${dashboard ? dashboard.sessions_today_count : '…'} sessions today`
      : view === 'chart'
      ? chartPatient
        ? 'Clinical record'
        : 'Choose a patient to open their record'
      : view === 'scheduler'
      ? schedulerLabel || 'Week at a glance'
      : SUBTITLES[view]

  return (
    <div className="min-h-screen bg-organic-bg flex items-stretch">
      <IconRail view={view} onChange={setView} onOpenAdmin={() => navigate('/')} onLogout={handleLogout} />

      <main className="flex-1 min-w-0 px-9 pt-8 pb-16 max-w-[1240px]">
        <header className="flex justify-between items-end gap-5 flex-wrap mb-7">
          <div>
            <h1 className="text-[2.125rem] font-heading text-organic-text mb-1">{title}</h1>
            <p className="text-organic-neutral-600 text-sm">{subtitle}</p>
          </div>
          <div className="flex gap-2.5 items-center">
            <TextSizeControl />
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
        {view === 'scheduler' && <SchedulerView onOpenPatient={openPatient} onWeekLabel={setSchedulerLabel} />}
        {view === 'chart' && <ChartView patient={chartPatient} onPickPatient={setChartPatient} />}
        {view === 'scribe' && <ScribeView />}
        {view === 'plan' && <PlanView patient={chartPatient} />}
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
          onFinished={(finished) => {
            setActiveSession(null)
            // Land on the record of the patient who was just seen, not on
            // whichever chart happened to be open before the session.
            openPatient({ id: finished.patient_id, name: finished.patient_name })
            loadDashboard()
          }}
        />
      )}
    </div>
  )
}

// ─── New session: pick patient + assessments ───────────────────────────────

type SimplePatient = { id: string; name: string; status: string; risk: string }
type TemplateOption = {
  id: string
  name: string
  name_ar?: string | null
  template_type: string | null
  definition_json?: { questions?: any[] } | null
}
type SessionAssessment = {
  template_key: string
  name: string
  name_ar?: string | null
  definition_json: { instructions?: string; instructions_ar?: string; questions: any[] } | null
  completed: boolean
  unavailable?: boolean
  unavailable_reason?: string | null
}
// One previously recorded note as it arrives on the session payload. Every body
// field is optional: a note may carry only free text, only SOAP sections, or —
// legitimately — nothing at all.
type HistoryNote = {
  id: string
  created_at: string
  template?: string | null
  subjective?: string | null
  objective?: string | null
  assessment?: string | null
  plan?: string | null
  free_text?: string | null
  therapist_approved?: boolean | null
}

type HistoryAssessment = {
  id?: string
  assessment_id: string
  raw_score: number | null
  severity?: string | null
  interpretation?: string | null
  flagged?: boolean
  created_at: string
}

type SessionData = {
  id: string
  patient_id: string
  patient_name: string
  status: string
  assessments: SessionAssessment[]
  // Everything below arrives with the session contract. All optional on purpose:
  // a session created by an older build simply carries none of them, and the
  // view falls back to what it can prove rather than showing a made-up value.
  started_at?: string | null
  ended_at?: string | null
  duration_minutes?: number | null
  appointment_id?: string | null
  next_appointment_id?: string | null
  recent_notes?: HistoryNote[] | null
  recent_assessments?: HistoryAssessment[] | null
}

function NewSessionModal({ onClose, onStarted }: { onClose: () => void; onStarted: (s: SessionData) => void }) {
  const [patients, setPatients] = useState<SimplePatient[]>([])
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<SimplePatient | null>(null)
  const [autoDetected, setAutoDetected] = useState(false)
  // patient_id is nullable in the widened AppointmentOut (a documentation/admin
  // block has no patient), so /appointments/current can legitimately hand back a
  // row with no patient to pre-fill from.
  const [currentAppointment, setCurrentAppointment] = useState<{ id: string; patient_id: string | null } | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([apiClient.getPatients({ mine: true, limit: CASELOAD_LIMIT }), apiClient.getAssessmentTemplates()])
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
      .then((appt: { id: string; patient_id: string | null } | null) => setCurrentAppointment(appt))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (loading || selectedPatient || !currentAppointment?.patient_id) return
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
      // A session IS an appointment. When the clinician is starting the very
      // appointment that is running right now, link the two rows — but only if
      // that appointment really belongs to the patient they picked, otherwise
      // the link would attach this session to somebody else's slot.
      const linkedAppointmentId =
        currentAppointment && currentAppointment.patient_id === selectedPatient.id ? currentAppointment.id : null
      const session = await apiClient.createClinicianSession(selectedPatient.id, selectedKeys, linkedAppointmentId)
      onStarted(session)
    } catch (err: any) {
      setError(errorText(err, 'Could not start the session.'))
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
          <h2 className="text-[1.375rem] font-heading text-organic-text">New session</h2>
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
                  <div className="text-[0.7812rem] uppercase tracking-wide text-organic-accent-700 mb-0.5">
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
              {templates.map((t) => {
                // Some instruments are published but carry no items. Selecting
                // one used to produce a step with nothing to answer, so the
                // session recorded nothing while appearing to have run.
                const itemCount = t.definition_json?.questions?.length ?? 0
                const administrable = itemCount > 0
                return (
                  <label
                    key={t.id}
                    title={administrable ? undefined : 'This assessment has no questions yet'}
                    className={`flex items-center gap-2.5 rounded-organic-tile px-3.5 py-2.5 text-sm ${
                      administrable
                        ? 'bg-organic-surface cursor-pointer'
                        : 'bg-organic-neutral-200/60 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!administrable}
                      checked={selectedKeys.includes(t.id)}
                      onChange={() => administrable && toggleKey(t.id)}
                    />
                    <span className="flex-1">
                      {t.name}
                      {!administrable && (
                        <span className="block text-xs text-organic-neutral-600">No questions yet</span>
                      )}
                    </span>
                    {t.name_ar && (
                      <span dir="rtl" className="text-xs text-organic-neutral-500">
                        {t.name_ar}
                      </span>
                    )}
                  </label>
                )
              })}
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
//
// A session is the consultation itself: the patient is in the room. The
// clinician needs their history to hand, writes a note as they go, may
// administer assessments, and books the next appointment before the patient
// leaves. Everything except the passage of time is optional — a session with no
// assessments and no follow-up still records a duration and can record a note.

type RunnerPhase = 'assessments' | 'wrapup' | 'recorded'

type NoteDraft = {
  template: 'FREE' | 'SOAP'
  free_text: string
  subjective: string
  objective: string
  assessment: string
  plan: string
}

const EMPTY_NOTE: NoteDraft = {
  template: 'FREE',
  free_text: '',
  subjective: '',
  objective: '',
  assessment: '',
  plan: '',
}

const SOAP_FIELDS: { key: 'subjective' | 'objective' | 'assessment' | 'plan'; label: string; hint: string }[] = [
  { key: 'subjective', label: 'Subjective', hint: 'What the patient reports' },
  { key: 'objective', label: 'Objective', hint: 'What you observed' },
  { key: 'assessment', label: 'Assessment', hint: 'Your clinical impression' },
  { key: 'plan', label: 'Plan', hint: 'What happens next' },
]

// Only the fields belonging to the layout in use are sent, so switching layout
// mid-session never posts leftover text from the layout that was abandoned.
function noteBody(draft: NoteDraft): Record<string, string | null> {
  if (draft.template === 'SOAP') {
    return {
      template: 'SOAP',
      subjective: draft.subjective.trim() || null,
      objective: draft.objective.trim() || null,
      assessment: draft.assessment.trim() || null,
      plan: draft.plan.trim() || null,
    }
  }
  return { template: 'FREE', free_text: draft.free_text.trim() || null }
}

function noteIsEmpty(draft: NoteDraft) {
  return !Object.entries(noteBody(draft)).some(([key, value]) => key !== 'template' && value)
}

// Cheap identity for "has this changed since it was last written to the chart".
function noteFingerprint(draft: NoteDraft) {
  return JSON.stringify(noteBody(draft))
}

// The layout that is NOT on screen. Switching FREE <-> SOAP keeps the abandoned
// layout's text in state but stops `noteBody` from writing it, so that text has
// to be tracked as unsaved work in its own right — otherwise closing or
// finishing discards a fully written note with no warning at all.
function otherLayout(draft: NoteDraft): NoteDraft {
  return { ...draft, template: draft.template === 'SOAP' ? 'FREE' : 'SOAP' }
}

function layoutLabel(template: NoteDraft['template']) {
  return template === 'SOAP' ? 'SOAP' : 'Free text'
}

// FastAPI reports a validation failure with `detail` as a LIST of objects.
// Dropping that straight into JSX throws "Objects are not valid as a React
// child", which unmounts the entire session view — taking the note being
// written with it. Every message shown to the clinician goes through here.
function errorText(err: any, fallback: string): string {
  const detail = err?.response?.data?.detail
  if (typeof detail === 'string' && detail.trim()) return detail
  if (Array.isArray(detail)) {
    const messages = detail
      .map((entry: any) => (typeof entry === 'string' ? entry : entry?.msg))
      .filter((message: any): message is string => typeof message === 'string' && message.length > 0)
    if (messages.length) return messages.join('; ')
  }
  return fallback
}

const DURATION_OPTIONS = [30, 45, 50, 60, 90]

const NEXT_TYPE_OPTIONS = [
  { value: 'FOLLOW_UP', label: 'Follow-up' },
  { value: 'CBT', label: 'CBT' },
  { value: 'ASSESSMENT', label: 'Assessment' },
  { value: 'INTAKE', label: 'Intake' },
  { value: 'GROUP', label: 'Group' },
]

function formatElapsed(totalSeconds: number) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
}

// The pickers are wall-clock in the clinician's timezone; the API takes absolute
// instants. Building the Date from parts (rather than parsing "YYYY-MM-DDTHH:mm")
// is what makes the conversion use the browser's real offset.
function localInstant(dateValue: string, timeValue: string): Date | null {
  const day = parseDateOnly(dateValue)
  const time = /^(\d{1,2}):(\d{2})/.exec(timeValue)
  if (!day || !time) return null
  const hours = Number(time[1])
  const minutes = Number(time[2])
  if (hours > 23 || minutes > 59) return null
  const instant = new Date(day.year, day.month - 1, day.day, hours, minutes, 0, 0)
  return Number.isNaN(instant.getTime()) ? null : instant
}

function formatWhen(instant: Date) {
  const date = instant.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  const time = instant.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return `${date} at ${time}`
}

// What the session actually put on the record, assembled from the responses
// rather than from what was attempted. Each failure is carried separately so the
// summary can admit to a part that did not go through.
type FinishOutcome = {
  elapsedSeconds: number
  durationRecorded: number | null
  notesSaved: number
  noteFailed: boolean
  assessmentsRecorded: number
  assessmentsQueued: number
  signedOff: boolean
  signOffFailed: boolean
  booking: { whenLabel: string; confirmed: boolean } | null
}

function SessionRunner({
  session,
  onClose,
  onFinished,
}: {
  session: SessionData
  onClose: () => void
  onFinished: (session: SessionData) => void
}) {
  const assessments = session.assessments

  // ── Assessment stepper ───────────────────────────────────────────────────
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number | string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [results, setResults] = useState<any[]>([])
  const [lang, setLang] = useState<'en' | 'ar'>('en')
  const [phase, setPhase] = useState<RunnerPhase>(assessments.length ? 'assessments' : 'wrapup')

  const current = assessments[index]

  // ── Patient in context ───────────────────────────────────────────────────
  const [detail, setDetail] = useState<PatientDetail | null>(null)
  const [history, setHistory] = useState<{ notes: HistoryNote[]; assessments: HistoryAssessment[] } | null>(null)
  // Set only when a history fetch actually failed. Without this, a rejected
  // request was flattened into an empty list and the panel rendered "No
  // previous notes for this patient" — a clinical claim the app had no
  // evidence for, made to the clinician's face while the patient sat there.
  const [historyError, setHistoryError] = useState<{ notes: string | null; assessments: string | null }>({
    notes: null,
    assessments: null,
  })
  const [contextError, setContextError] = useState<string | null>(null)
  const [startedAtIso, setStartedAtIso] = useState<string | null>(session.started_at ?? null)
  const [linkedAppointmentId, setLinkedAppointmentId] = useState<string | null>(session.appointment_id ?? null)

  useEffect(() => {
    let dropped = false
    // Demographics are not on the session payload, so the chart record is read
    // alongside it — the same call the chart view makes.
    Promise.all([apiClient.getClinicianSession(session.id).catch(() => null), apiClient.getPatient(session.patient_id)])
      .then(async ([full, patient]: [SessionData | null, PatientDetail]) => {
        if (dropped) return
        setDetail(patient)
        if (full?.started_at) setStartedAtIso(full.started_at)
        if (full?.appointment_id) setLinkedAppointmentId(full.appointment_id)
        // recent_notes / recent_assessments ride along with the session. When the
        // payload does not carry them at all, the patient's own endpoints are read
        // instead: an empty panel would read as "this patient has no history",
        // which is a very different claim from "the session did not include it".
        // `!= null` and not a truthiness test — a genuinely empty [] from the
        // server is an answer, and must not trigger the fallback.
        let notes: HistoryNote[] = []
        let notesFailed: string | null = null
        if (full?.recent_notes != null) {
          notes = Array.isArray(full.recent_notes) ? full.recent_notes : []
        } else {
          try {
            const fetched = await apiClient.getPatientSessions(session.patient_id)
            notes = Array.isArray(fetched) ? fetched : []
          } catch {
            // Deliberately NOT an empty list: a failed read is not evidence
            // that this patient has never been seen before.
            notesFailed = 'Could not load previous notes. This is not a record that there are none.'
          }
        }

        let records: HistoryAssessment[] = []
        let recordsFailed: string | null = null
        if (full?.recent_assessments != null) {
          records = Array.isArray(full.recent_assessments) ? full.recent_assessments : []
        } else {
          try {
            const fetched = await apiClient.getPatientAssessments(session.patient_id)
            records = Array.isArray(fetched) ? fetched : []
          } catch {
            recordsFailed = 'Could not load previous results. This is not a record that there are none.'
          }
        }

        if (dropped) return
        setHistoryError({ notes: notesFailed, assessments: recordsFailed })
        setHistory({ notes, assessments: records })
      })
      .catch(() => {
        if (!dropped) setContextError('Could not load this patient’s record.')
      })
    return () => {
      dropped = true
    }
  }, [session.id, session.patient_id])

  // ── Elapsed time ─────────────────────────────────────────────────────────
  const [openedAt] = useState(() => Date.now())
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [stoppedAtMs, setStoppedAtMs] = useState<number | null>(null)

  useEffect(() => {
    if (stoppedAtMs !== null) return undefined
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [stoppedAtMs])

  // Anchored on the start the server recorded when there is one, so reopening a
  // session shows the real elapsed time rather than time-since-reopened. The
  // moment this view opened is the only fallback — never a guessed duration.
  const parsedStart = startedAtIso ? Date.parse(startedAtIso) : NaN
  const startMs = Number.isFinite(parsedStart) ? parsedStart : openedAt
  const elapsedSeconds = Math.max(0, Math.floor(((stoppedAtMs ?? nowMs) - startMs) / 1000))

  // ── The note written during the session ──────────────────────────────────
  // Held here, at the top of the session, so moving between assessments (or to
  // the wrap-up and back) never unmounts it and never loses a half-written note.
  const [note, setNote] = useState<NoteDraft>(EMPTY_NOTE)
  const [savedNoteIds, setSavedNoteIds] = useState<string[]>([])
  const [savedAt, setSavedAt] = useState<number | null>(null)
  // Every version already written to the chart, not only the most recent one:
  // text that was saved, moved away from and returned to is on the record
  // already, and must not be reported as unsaved nor written a second time.
  const [savedPrints, setSavedPrints] = useState<string[]>([])
  const [savingNote, setSavingNote] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)
  const [signOff, setSignOff] = useState(false)

  const noteEmpty = noteIsEmpty(note)
  const noteDirty = !noteEmpty && !savedPrints.includes(noteFingerprint(note))
  // Text sitting in the layout that is not on screen. A save of the layout in
  // front of the clinician never writes it, so it is unsaved work of its own.
  const otherDraft = otherLayout(note)
  const otherLayoutUnsaved = !noteIsEmpty(otherDraft) && !savedPrints.includes(noteFingerprint(otherDraft))
  const unsavedWork = noteDirty || otherLayoutUnsaved

  const setNoteField = (key: keyof NoteDraft, value: string) =>
    setNote((prev) => ({ ...prev, [key]: value }))

  // A tab closed or reloaded mid-consultation used to take the note with it in
  // silence. The browser's own prompt is the only thing that can intercept that.
  useEffect(() => {
    if (!unsavedWork) return undefined
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [unsavedWork])

  // `ok` and `id` are deliberately separate: a note can be safely on the chart
  // while the response carries no id to sign off with. Conflating the two would
  // let the summary claim the note was lost when it was not.
  const saveNote = async (): Promise<{ ok: boolean; id: string | null }> => {
    if (!noteDirty) return { ok: true, id: null }
    setSavingNote(true)
    setNoteError(null)
    try {
      const created = await apiClient.createSession(session.patient_id, noteBody(note))
      const id = created?.id ? String(created.id) : ''
      if (id) setSavedNoteIds((prev) => [...prev, id])
      setSavedPrints((prev) => [...prev, noteFingerprint(note)])
      setSavedAt(Date.now())
      return { ok: true, id: id || null }
    } catch (err: any) {
      setNoteError(errorText(err, 'Could not save the note. It is still here — try again.'))
      return { ok: false, id: null }
    } finally {
      setSavingNote(false)
    }
  }

  // ── Next appointment ─────────────────────────────────────────────────────
  const [bookNext, setBookNext] = useState(false)
  const [nextDate, setNextDate] = useState('')
  const [nextTime, setNextTime] = useState('')
  const [nextDuration, setNextDuration] = useState(50)
  const [nextType, setNextType] = useState('FOLLOW_UP')
  const [nextLocation, setNextLocation] = useState('IN_PERSON')

  const nextStart = bookNext ? localInstant(nextDate, nextTime) : null
  const nextInPast = nextStart !== null && nextStart.getTime() < Date.now()

  // ── Finishing ────────────────────────────────────────────────────────────
  const [finishing, setFinishing] = useState(false)
  const [finishError, setFinishError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<FinishOutcome | null>(null)
  const [confirmClose, setConfirmClose] = useState(false)

  const submitCurrent = async () => {
    if (!current) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const result = await apiClient.submitAssessment(session.patient_id, current.template_key, answers, session.id)
      setResults((prev) => [...prev, { name: current.name, ...result }])
      setAnswers({})
      advance()
    } catch (err: any) {
      // Stay on the same assessment so it can be retried, and say why.
      setSubmitError(errorText(err, 'Could not record this assessment. Nothing was saved for it.'))
    } finally {
      setSubmitting(false)
    }
  }

  const advance = () => {
    setSubmitError(null)
    if (index + 1 >= assessments.length) {
      setPhase('wrapup')
      setIndex(assessments.length)
    } else {
      setIndex((i) => i + 1)
    }
  }

  const finish = async () => {
    setFinishError(null)

    let nextAppointment: NextAppointmentIn | undefined
    let whenLabel = ''
    if (bookNext) {
      if (!nextStart) {
        setFinishError('Pick a date and a time for the next appointment, or switch the follow-up off.')
        return
      }
      const end = new Date(nextStart.getTime() + nextDuration * 60000)
      nextAppointment = {
        start_time: nextStart.toISOString(),
        end_time: end.toISOString(),
        appointment_type: nextType,
        location: nextLocation,
      }
      whenLabel = formatWhen(nextStart)
    }

    setFinishing(true)
    const stopAt = Date.now()
    const seconds = Math.max(0, Math.floor((stopAt - startMs) / 1000))

    // The note goes first. If completing the session then fails, the clinical
    // text is already on the patient's chart rather than lost with the attempt.
    let noteFailed = false
    let savedNow = 0
    let lastSavedId: string | null = null
    if (noteDirty) {
      const saved = await saveNote()
      noteFailed = !saved.ok
      if (saved.ok) savedNow = 1
      lastSavedId = saved.id
    }
    // Ids are what sign-off needs; the count is what the summary reports, and a
    // note saved without an id still counts as saved.
    const noteIds = lastSavedId ? [...savedNoteIds, lastSavedId] : savedNoteIds
    const notesSaved = savedNoteIds.length + savedNow

    let signedOff = false
    let signOffFailed = false
    if (signOff && noteIds.length > 0) {
      try {
        await Promise.all(
          noteIds.map((id) => apiClient.updatePatientSessionNote(session.patient_id, id, { therapist_approved: true })),
        )
        signedOff = true
      } catch {
        // The note itself is safely on the chart; only the sign-off failed, and
        // the summary says exactly that rather than claiming it is done.
        signOffFailed = true
      }
    }

    let completed: SessionData | null = null
    try {
      completed = await apiClient.completeClinicianSession(session.id, {
        duration_minutes: Math.round(seconds / 60),
        ...(nextAppointment ? { next_appointment: nextAppointment } : {}),
      })
    } catch (err: any) {
      setFinishing(false)
      setFinishError(
        errorText(err, 'Could not close the session. Anything already saved is on the chart — try finishing again.'),
      )
      return
    }

    setStoppedAtMs(stopAt)
    setOutcome({
      elapsedSeconds: seconds,
      durationRecorded: typeof completed?.duration_minutes === 'number' ? completed.duration_minutes : null,
      notesSaved,
      noteFailed,
      assessmentsRecorded: results.length,
      assessmentsQueued: assessments.length,
      signedOff,
      signOffFailed,
      booking: nextAppointment ? { whenLabel, confirmed: !!completed?.next_appointment_id } : null,
    })
    setPhase('recorded')
    setFinishing(false)
  }

  // Saving from the wrap-up or from the post-finish rescue panel has to correct
  // the summary as well, otherwise it goes on telling the clinician the note was
  // lost after they have just put it on the chart.
  const handleSaveNote = async () => {
    const saved = await saveNote()
    if (saved.ok) {
      setOutcome((prev) => (prev ? { ...prev, notesSaved: prev.notesSaved + 1, noteFailed: false } : prev))
    }
    return saved
  }

  // Leaving the runner is `onClose` while the session is live and `onFinished`
  // once it is recorded, so the confirm banner has to close whichever applies —
  // it must never be a dead end that leaves the note stranded on screen.
  const leave = () => (phase === 'recorded' ? onFinished(session) : onClose())

  const requestClose = () => {
    if (unsavedWork) {
      setConfirmClose(true)
      return
    }
    leave()
  }

  const questions = current?.definition_json?.questions || []
  const allAnswered =
    questions.length > 0 &&
    questions.every((q: any) => {
      const a = answers[q.id]
      return typeof a === 'string' ? a.trim().length > 0 : a !== undefined
    })

  const age = ageFrom(detail?.dob || null)
  const identityBits = [age ? `${age} yrs` : null, detail?.gender, detail?.status].filter(Boolean) as string[]

  const timerLabel = stoppedAtMs === null ? 'elapsed' : 'recorded'

  return (
    <div className="fixed inset-0 bg-organic-bg z-50 overflow-y-auto">
      <div className="max-w-[1180px] mx-auto px-8 py-8">
        {/* ── Who is in the room, and how long they have been ── */}
        <div className="flex justify-between items-start gap-4 flex-wrap mb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-[52px] h-[52px] rounded-full bg-organic-accent-200 grid place-items-center font-bold text-base text-organic-accent-800 flex-none">
              {initialsOf(session.patient_name)}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-[1.625rem] font-heading text-organic-text leading-tight">
                  {session.patient_name}
                </h2>
                {detail &&
                  (detail.risk ? (
                    <span
                      className={`text-[0.7812rem] font-semibold px-2.5 py-0.5 rounded-organic-pill ${riskStyle(detail.risk).bg} ${riskStyle(detail.risk).color}`}
                    >
                      {detail.risk} risk
                    </span>
                  ) : (
                    <span className="text-[0.7812rem] font-semibold px-2.5 py-0.5 rounded-organic-pill bg-organic-neutral-200 text-organic-neutral-700">
                      Risk not recorded
                    </span>
                  ))}
                {linkedAppointmentId && (
                  <span className="text-[0.7812rem] font-semibold px-2.5 py-0.5 rounded-organic-pill bg-organic-accent-2-200 text-organic-accent-2-800">
                    Booked appointment
                  </span>
                )}
              </div>
              <div className="text-sm text-organic-neutral-600">
                {detail
                  ? identityBits.length
                    ? identityBits.join(' · ')
                    : 'Age, gender and status not recorded'
                  : contextError
                  ? 'Patient record unavailable'
                  : 'Loading patient record…'}
              </div>
              <div className="text-sm text-organic-neutral-600">
                {detail ? (
                  detail.diagnosis ? (
                    <>Diagnosis: {detail.diagnosis}</>
                  ) : (
                    <span className="italic text-organic-neutral-500">No diagnosis recorded</span>
                  )
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-2 bg-organic-surface border border-organic-neutral-300/60 rounded-organic-pill px-3.5 py-2">
              <Clock size={16} className="text-organic-accent-700" />
              <span className="font-heading text-sm text-organic-text tabular-nums">{formatElapsed(elapsedSeconds)}</span>
              <span className="text-xs text-organic-neutral-600">{timerLabel}</span>
            </span>
            <button
              onClick={requestClose}
              title="Close the session view"
              className="text-organic-neutral-500 hover:text-organic-neutral-800 text-2xl leading-none px-1"
            >
              &times;
            </button>
          </div>
        </div>

        {confirmClose && (
          <div className="mb-4 bg-organic-accent-100 rounded-organic-card p-4 flex items-center gap-3 flex-wrap">
            <AlertTriangle size={18} className="text-organic-accent-700 flex-none" />
            <span className="text-sm text-organic-accent-800 flex-1 min-w-[260px]">
              {noteDirty
                ? 'Your session note has not been saved to the chart. Closing now discards it.'
                : `You have text in the ${layoutLabel(otherDraft.template)} layout that was never saved. Only the layout on screen is written to the chart. Closing now discards it.`}
              {noteDirty && otherLayoutUnsaved
                ? ` You also have text in the ${layoutLabel(otherDraft.template)} layout — saving here does not include it.`
                : ''}
            </span>
            {noteDirty && (
              <button
                onClick={async () => {
                  const saved = await handleSaveNote()
                  // Only leave once the chart really has it, and only if nothing
                  // else is still unwritten.
                  if (saved.ok && !otherLayoutUnsaved) leave()
                }}
                disabled={savingNote}
                className="rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-sm px-4 py-2 disabled:opacity-50"
              >
                {savingNote ? 'Saving…' : 'Save note & close'}
              </button>
            )}
            <button
              onClick={leave}
              className="rounded-organic-pill border border-organic-neutral-300/70 font-heading text-sm px-4 py-2 text-organic-text hover:bg-organic-neutral-100 transition-colors"
            >
              Discard & close
            </button>
            <button onClick={() => setConfirmClose(false)} className="text-sm text-organic-accent-700 underline">
              Keep working
            </button>
          </div>
        )}

        {phase === 'recorded' && outcome ? (
          <div className="flex flex-col gap-4 max-w-[720px]">
            <SessionRecorded outcome={outcome} onDone={requestClose} />
            {/* A note that failed to save at the finish line used to disappear
                with the rest of the session view, leaving the clinician told to
                "write it in the chart" from memory. It stays on screen, and
                stays saveable, until it is actually on the record. */}
            {unsavedWork && (
              <>
                <div className="bg-organic-accent-100 rounded-organic-card p-4 flex items-start gap-2.5">
                  <AlertTriangle size={18} className="text-organic-accent-700 flex-none mt-0.5" />
                  <div className="text-sm text-organic-accent-800">
                    <div className="font-semibold">Your note is still here — it is not on the chart.</div>
                    Nothing you typed has been thrown away. Save it from here, or copy it out, before you close.
                  </div>
                </div>
                <NotePanel
                  note={note}
                  onField={setNoteField}
                  onSave={handleSaveNote}
                  saving={savingNote}
                  error={noteError}
                  savedCount={savedNoteIds.length}
                  savedAt={savedAt}
                  dirty={noteDirty}
                  empty={noteEmpty}
                  otherLayoutUnsaved={otherLayoutUnsaved}
                />
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 items-start">
            {/* ── Main column: assessments, then wrap-up ── */}
            <div className="flex flex-col gap-4">
              {phase === 'assessments' && current && (
                <div className="bg-organic-surface rounded-organic-card p-[22px] shadow-organic-sm">
                  <div className="flex justify-between items-start gap-3 flex-wrap mb-1">
                    <h3 className="text-lg font-heading text-organic-text">
                      Assessment {index + 1} of {assessments.length}: {(lang === 'ar' && current.name_ar) || current.name}
                    </h3>
                    <button
                      onClick={() => setPhase('wrapup')}
                      className="inline-flex items-center gap-1.5 text-sm text-organic-accent-700 underline"
                    >
                      Skip to wrap-up <ArrowRight size={14} />
                    </button>
                  </div>

                  {current.definition_json?.instructions_ar && (
                    <div className="inline-flex bg-organic-neutral-100 border border-organic-neutral-300/60 rounded-organic-pill p-1 my-3">
                      {(['en', 'ar'] as const).map((l) => (
                        <button
                          key={l}
                          onClick={() => setLang(l)}
                          className={`font-heading text-[0.8125rem] px-4 py-1.5 rounded-organic-pill ${
                            lang === l ? 'bg-organic-accent text-organic-neutral-100' : 'text-organic-neutral-700'
                          }`}
                        >
                          {l === 'en' ? 'English' : 'العربية'}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* An instrument that cannot be resolved for this clinician used
                      to render as a step with zero questions -- nothing to answer,
                      nothing saved, and no indication anything was wrong. Say so,
                      and let them move past it rather than stranding the session. */}
                  {current.unavailable ? (
                    <div className="mt-4 bg-organic-accent-100 rounded-organic-card p-5">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle size={18} className="text-organic-accent-700 flex-none mt-0.5" />
                        <div>
                          <h4 className="font-heading text-[1.0625rem] text-organic-accent-800 mb-1">
                            {current.name} is unavailable
                          </h4>
                          <p className="text-sm text-organic-neutral-700 mb-3">
                            {current.unavailable_reason ||
                              'This instrument can no longer be opened. Nothing has been recorded for it.'}
                          </p>
                          <button
                            onClick={advance}
                            className="rounded-organic-pill border border-organic-neutral-300/60 text-organic-neutral-700 font-heading text-sm px-4 py-2"
                          >
                            Skip and continue
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                      {current.definition_json?.instructions && (
                        <p className="text-sm text-organic-neutral-600 mb-5">
                          {lang === 'en'
                            ? current.definition_json.instructions
                            : current.definition_json.instructions_ar || current.definition_json.instructions}
                        </p>
                      )}
                      <div className="flex flex-col gap-4">
                        {questions.map((q: any, qi: number) => (
                          <div key={q.id} className="bg-organic-bg rounded-organic-tile p-4">
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
                                        : 'bg-organic-surface border-organic-neutral-300/60 text-organic-neutral-700'
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
                                className="w-full bg-organic-surface border border-organic-neutral-300/60 rounded-organic-tile px-3 py-2 text-sm"
                              />
                            )}
                          </div>
                        ))}
                      </div>

                      {submitError && <div className="text-sm text-organic-accent-800 mt-4">{submitError}</div>}

                      <button
                        onClick={submitCurrent}
                        disabled={!allAnswered || submitting}
                        className="w-full mt-5 rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-sm py-3 disabled:opacity-50"
                      >
                        {submitting
                          ? 'Recording…'
                          : index === assessments.length - 1
                          ? 'Record & go to wrap-up'
                          : 'Record & next assessment'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {phase === 'wrapup' && (
                <SessionWrapUp
                  assessmentsQueued={assessments.length}
                  assessmentsRecorded={results.length}
                  results={results}
                  elapsedSeconds={elapsedSeconds}
                  noteEmpty={noteEmpty}
                  noteDirty={noteDirty}
                  savedNoteCount={savedNoteIds.length}
                  signOff={signOff}
                  onSignOffChange={setSignOff}
                  bookNext={bookNext}
                  onBookNextChange={setBookNext}
                  nextDate={nextDate}
                  onNextDate={setNextDate}
                  nextTime={nextTime}
                  onNextTime={setNextTime}
                  nextDuration={nextDuration}
                  onNextDuration={setNextDuration}
                  nextType={nextType}
                  onNextType={setNextType}
                  nextLocation={nextLocation}
                  onNextLocation={setNextLocation}
                  nextStart={nextStart}
                  nextInPast={nextInPast}
                  finishing={finishing}
                  finishError={finishError}
                  onFinish={finish}
                  onBackToAssessments={
                    index < assessments.length ? () => setPhase('assessments') : null
                  }
                />
              )}
            </div>

            {/* ── Aside: the note being written, and the history behind it ── */}
            <aside className="flex flex-col gap-3.5">
              <NotePanel
                note={note}
                onField={setNoteField}
                onSave={handleSaveNote}
                saving={savingNote}
                error={noteError}
                savedCount={savedNoteIds.length}
                savedAt={savedAt}
                dirty={noteDirty}
                empty={noteEmpty}
                otherLayoutUnsaved={otherLayoutUnsaved}
              />

              <HistoryPanel
                title="Recent notes"
                icon={<History size={17} className="text-organic-accent-700" />}
                loading={history === null && !contextError}
                error={contextError || historyError.notes}
                empty={history !== null && history.notes.length === 0}
                emptyText="No previous notes for this patient."
                total={history?.notes.length ?? 0}
                shown={history?.notes.length ? Math.min(history.notes.length, 5) : 0}
              >
                {history?.notes.slice(0, 5).map((n) => (
                  <div key={n.id} className="flex items-start gap-2.5 py-2 border-b border-organic-text/[0.07] last:border-b-0">
                    <FileText size={15} className="text-organic-accent-600 mt-0.5 flex-none" />
                    <div className="min-w-0">
                      <div className="text-[0.8438rem] text-organic-text">{notePreview(n)}</div>
                      <div className="text-xs text-organic-neutral-600 mt-0.5">
                        {new Date(n.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                        {n.therapist_approved ? ' · signed off' : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </HistoryPanel>

              <HistoryPanel
                title="Previous results"
                icon={<ClipboardList size={17} className="text-organic-accent-700" />}
                loading={history === null && !contextError}
                error={contextError || historyError.assessments}
                empty={history !== null && history.assessments.length === 0}
                emptyText="No assessments recorded for this patient yet."
                total={history?.assessments.length ?? 0}
                shown={history?.assessments.length ? Math.min(history.assessments.length, 6) : 0}
              >
                {history?.assessments.slice(0, 6).map((r, i) => (
                  <div
                    key={r.id || `${r.assessment_id}-${r.created_at}-${i}`}
                    className="py-2 border-b border-organic-text/[0.07] last:border-b-0"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-sm font-semibold text-organic-text uppercase truncate">{r.assessment_id}</span>
                      <span className="font-bold text-organic-accent-700 text-sm flex-none">
                        {r.raw_score !== null && r.raw_score !== undefined ? r.raw_score : '—'}
                        {r.severity ? ` · ${r.severity}` : ''}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-organic-neutral-600 mt-0.5">
                      <span>
                        {new Date(r.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {r.flagged && (
                        <span className="text-[0.7812rem] font-semibold px-2 py-0.5 rounded-organic-pill bg-organic-accent-200 text-organic-accent-800">
                          Flagged
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </HistoryPanel>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}

// The note being written. Lives outside SessionRunner's markup so the same
// editor — with the same state behind it — can be shown beside the consultation
// AND after the session is recorded, when a note that failed to save would
// otherwise be unreachable and lost on close.
function NotePanel({
  note,
  onField,
  onSave,
  saving,
  error,
  savedCount,
  savedAt,
  dirty,
  empty,
  otherLayoutUnsaved,
}: {
  note: NoteDraft
  onField: (key: keyof NoteDraft, value: string) => void
  onSave: () => void
  saving: boolean
  error: string | null
  savedCount: number
  savedAt: number | null
  dirty: boolean
  empty: boolean
  otherLayoutUnsaved: boolean
}) {
  return (
    <div className="bg-organic-surface rounded-organic-card p-5 shadow-organic-sm">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <StickyNote size={17} className="text-organic-accent-700" />
          <h3 className="text-base font-heading text-organic-text">Session note</h3>
        </div>
        <div className="inline-flex bg-organic-neutral-200 rounded-organic-pill p-1">
          {(['FREE', 'SOAP'] as const).map((t) => (
            <button
              key={t}
              onClick={() => onField('template', t)}
              className={`px-3 py-1 rounded-organic-pill text-xs font-semibold transition-colors ${
                note.template === t
                  ? 'bg-organic-accent text-organic-accent-100'
                  : 'text-organic-neutral-700 hover:text-organic-text'
              }`}
            >
              {t === 'FREE' ? 'Free text' : 'SOAP'}
            </button>
          ))}
        </div>
      </div>

      {note.template === 'SOAP' ? (
        <div className="flex flex-col gap-2.5">
          {SOAP_FIELDS.map((f) => (
            <div key={f.key}>
              <label className={FORM_LABEL_CLASS}>
                {f.label} <span className="font-normal text-organic-neutral-500">· {f.hint}</span>
              </label>
              <textarea
                value={note[f.key]}
                onChange={(e) => onField(f.key, e.target.value)}
                rows={2}
                className="w-full bg-organic-bg border border-organic-neutral-300/60 rounded-organic-tile px-3 py-2 text-sm resize-y"
              />
            </div>
          ))}
        </div>
      ) : (
        <textarea
          value={note.free_text}
          onChange={(e) => onField('free_text', e.target.value)}
          rows={8}
          placeholder="Write as the session goes — it stays here while you move between assessments."
          className="w-full bg-organic-bg border border-organic-neutral-300/60 rounded-organic-tile px-3.5 py-2.5 text-sm resize-y"
        />
      )}

      <div className="flex items-center gap-2.5 mt-3 flex-wrap">
        <button
          onClick={onSave}
          disabled={saving || !dirty}
          className="rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-sm px-4 py-2 disabled:opacity-50"
        >
          {saving ? 'Saving…' : savedCount ? 'Save as a new note' : 'Save to chart'}
        </button>
      </div>
      <div className="text-xs mt-2">
        {error ? (
          <span className="text-organic-accent-800">{error}</span>
        ) : savedCount === 0 ? (
          <span className="text-organic-neutral-600">
            {empty
              ? 'Nothing written yet. It is saved to the chart when you save, or when you finish.'
              : 'Not on the chart yet — it will be saved when you finish the session.'}
          </span>
        ) : dirty ? (
          <span className="text-organic-neutral-600">
            Edited since the last save. Notes are appended, so saving again adds a second note.
          </span>
        ) : (
          <span className="text-organic-neutral-600">
            Saved to the chart{savedAt ? ` at ${new Date(savedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}` : ''}
            {savedCount > 1 ? ` · ${savedCount} notes this session` : ''}.
          </span>
        )}
      </div>
      {/* Only the layout on screen is written. Text left behind in the other one
          would otherwise be discarded on finish without ever being mentioned. */}
      {otherLayoutUnsaved && (
        <div className="text-xs mt-2 text-organic-accent-800">
          You also have unsaved text in the {layoutLabel(otherLayout(note).template)} layout. Only the layout shown here
          is written to the chart — switch back to save it.
        </div>
      )}
    </div>
  )
}

// A history panel is either loading, broken, empty or full — and says which.
// "No previous notes" is a clinical claim, so it is only ever rendered once the
// list is known to have come back empty.
function HistoryPanel({
  title,
  icon,
  loading,
  error,
  empty,
  emptyText,
  total,
  shown,
  children,
}: {
  title: string
  icon: ReactNode
  loading: boolean
  error: string | null
  empty: boolean
  emptyText: string
  total: number
  shown: number
  children: React.ReactNode
}) {
  return (
    <div className="bg-organic-surface rounded-organic-card p-5 shadow-organic-sm">
      <div className="flex items-center gap-2 mb-2.5">
        {icon}
        <h3 className="text-base font-heading text-organic-text">{title}</h3>
      </div>
      {loading && <div className="text-sm text-organic-neutral-600">Loading…</div>}
      {error && <div className="text-sm text-organic-accent-800">{error}</div>}
      {!loading && !error && empty && <div className="text-sm text-organic-neutral-600">{emptyText}</div>}
      {!loading && !error && !empty && <div className="flex flex-col">{children}</div>}
      {!loading && !error && total > shown && (
        <div className="text-xs text-organic-neutral-600 pt-2">
          Showing the {shown} most recent of {total}. The full record is in the patient chart.
        </div>
      )}
    </div>
  )
}

// ─── Wrap-up: what is being recorded, and the next appointment ──────────────

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-organic-text/[0.07] last:border-b-0">
      <span className="text-[0.7812rem] font-semibold tracking-wide uppercase text-organic-neutral-600 w-[112px] flex-none pt-0.5">
        {label}
      </span>
      <div className="text-[0.8438rem] text-organic-text flex-1 min-w-0">{children}</div>
    </div>
  )
}

function SessionWrapUp({
  assessmentsQueued,
  assessmentsRecorded,
  results,
  elapsedSeconds,
  noteEmpty,
  noteDirty,
  savedNoteCount,
  signOff,
  onSignOffChange,
  bookNext,
  onBookNextChange,
  nextDate,
  onNextDate,
  nextTime,
  onNextTime,
  nextDuration,
  onNextDuration,
  nextType,
  onNextType,
  nextLocation,
  onNextLocation,
  nextStart,
  nextInPast,
  finishing,
  finishError,
  onFinish,
  onBackToAssessments,
}: {
  assessmentsQueued: number
  assessmentsRecorded: number
  results: any[]
  elapsedSeconds: number
  noteEmpty: boolean
  noteDirty: boolean
  savedNoteCount: number
  signOff: boolean
  onSignOffChange: (v: boolean) => void
  bookNext: boolean
  onBookNextChange: (v: boolean) => void
  nextDate: string
  onNextDate: (v: string) => void
  nextTime: string
  onNextTime: (v: string) => void
  nextDuration: number
  onNextDuration: (v: number) => void
  nextType: string
  onNextType: (v: string) => void
  nextLocation: string
  onNextLocation: (v: string) => void
  nextStart: Date | null
  nextInPast: boolean
  finishing: boolean
  finishError: string | null
  onFinish: () => void
  onBackToAssessments: (() => void) | null
}) {
  const minutes = Math.round(elapsedSeconds / 60)
  const notAdministered = assessmentsQueued - assessmentsRecorded
  // A note that exists only in the textarea is not on the chart yet, and the
  // summary says so rather than counting it as recorded.
  const willHaveNote = savedNoteCount > 0 || noteDirty

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-organic-surface rounded-organic-card p-[22px] shadow-organic-sm">
        <h3 className="text-lg font-heading text-organic-text mb-1">Wrap up</h3>
        <p className="text-sm text-organic-neutral-600 mb-3">This is what finishing will put on the record.</p>

        <div className="flex flex-col">
          <SummaryRow label="Time">
            {formatElapsed(elapsedSeconds)} — recorded as {minutes} minute{minutes === 1 ? '' : 's'}
            {minutes === 0 ? ' (less than a minute so far)' : ''}
          </SummaryRow>

          <SummaryRow label="Assessments">
            {assessmentsQueued === 0 ? (
              <span className="text-organic-neutral-600">
                None were queued for this session. That is fine — the note and the duration are still recorded.
              </span>
            ) : (
              <>
                <div>
                  {assessmentsRecorded} of {assessmentsQueued} recorded
                  {notAdministered > 0 && (
                    <span className="text-organic-neutral-600">
                      {' '}
                      · {notAdministered} not administered, nothing saved for {notAdministered === 1 ? 'it' : 'them'}
                    </span>
                  )}
                </div>
                {results.length > 0 && (
                  <div className="flex flex-col gap-2 mt-2">
                    {results.map((r, i) => (
                      <div key={i} className="bg-organic-bg rounded-organic-tile p-3">
                        <div className="flex justify-between items-center gap-2">
                          <span className="font-bold text-sm">{r.name}</span>
                          <span className="font-heading text-base text-organic-accent-700">{r.raw_score ?? '—'}</span>
                        </div>
                        {r.interpretation && (
                          <div className="text-xs text-organic-neutral-600 mt-0.5">{r.interpretation}</div>
                        )}
                        {r.risk_flags?.length > 0 && (
                          <div className="mt-2 flex items-center gap-2 bg-organic-accent-100 rounded-organic-tile px-3 py-2">
                            <AlertTriangle size={15} className="text-organic-accent-700 flex-none" />
                            <span className="text-xs text-organic-accent-800">{r.risk_flags[0].message}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </SummaryRow>

          <SummaryRow label="Session note">
            {savedNoteCount > 0 && !noteDirty ? (
              <>
                {savedNoteCount} note{savedNoteCount === 1 ? '' : 's'} already saved to the chart
              </>
            ) : noteDirty ? (
              <>
                {savedNoteCount > 0
                  ? 'Edited since the last save — the new version will be added as another note when you finish.'
                  : 'Not saved yet — it will be written to the chart when you finish.'}
              </>
            ) : noteEmpty ? (
              <span className="text-organic-neutral-600">Nothing written. No note will be recorded.</span>
            ) : (
              <span className="text-organic-neutral-600">Nothing new to save.</span>
            )}
          </SummaryRow>
        </div>

        {willHaveNote && (
          <label className="flex items-center gap-2.5 bg-organic-bg rounded-organic-tile px-3.5 py-2.5 text-sm cursor-pointer mt-3">
            <input type="checkbox" checked={signOff} onChange={(e) => onSignOffChange(e.target.checked)} />
            <span className="flex-1">
              Sign the note off now
              <span className="block text-xs text-organic-neutral-600">
                A signed note drops off your &ldquo;notes due&rdquo; list. Leave this unticked to review it later.
              </span>
            </span>
          </label>
        )}
      </div>

      <div className="bg-organic-surface rounded-organic-card p-[22px] shadow-organic-sm">
        <div className="flex items-center gap-2 mb-1">
          <CalendarPlus size={18} className="text-organic-accent-700" />
          <h3 className="text-lg font-heading text-organic-text">Next appointment</h3>
        </div>
        <p className="text-sm text-organic-neutral-600 mb-3">Optional — book it now while the patient is with you.</p>

        <label className="flex items-center gap-2.5 bg-organic-bg rounded-organic-tile px-3.5 py-2.5 text-sm cursor-pointer">
          <input type="checkbox" checked={bookNext} onChange={(e) => onBookNextChange(e.target.checked)} />
          <span className="flex-1">Book the follow-up now</span>
        </label>

        {bookNext && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 mt-3">
              <div>
                <label className={FORM_LABEL_CLASS}>Date</label>
                <input
                  type="date"
                  value={nextDate}
                  onChange={(e) => onNextDate(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={FORM_LABEL_CLASS}>Start time</label>
                <input
                  type="time"
                  value={nextTime}
                  onChange={(e) => onNextTime(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={FORM_LABEL_CLASS}>Duration</label>
                <select
                  value={String(nextDuration)}
                  onChange={(e) => onNextDuration(Number(e.target.value))}
                  className={INPUT_CLASS}
                >
                  {DURATION_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} minutes
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={FORM_LABEL_CLASS}>Type</label>
                <select value={nextType} onChange={(e) => onNextType(e.target.value)} className={INPUT_CLASS}>
                  {NEXT_TYPE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={FORM_LABEL_CLASS}>Location</label>
                <select value={nextLocation} onChange={(e) => onNextLocation(e.target.value)} className={INPUT_CLASS}>
                  <option value="IN_PERSON">In person</option>
                  <option value="ONLINE">Video</option>
                </select>
              </div>
            </div>

            <div className="text-xs mt-2.5">
              {nextStart ? (
                <span className={nextInPast ? 'text-organic-accent-800' : 'text-organic-neutral-600'}>
                  {nextInPast
                    ? `That is in the past — ${formatWhen(nextStart)}. Check the date before finishing.`
                    : `Books ${formatWhen(nextStart)} for ${nextDuration} minutes.`}
                </span>
              ) : (
                <span className="text-organic-neutral-600">Choose a date and a start time.</span>
              )}
            </div>
          </>
        )}
      </div>

      {finishError && <div className="text-sm text-organic-accent-800">{finishError}</div>}

      <div className="flex items-center gap-2.5 flex-wrap">
        <button
          onClick={onFinish}
          disabled={finishing}
          className="rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-sm px-6 py-3 disabled:opacity-50"
        >
          {finishing ? 'Finishing…' : 'Finish session'}
        </button>
        {onBackToAssessments && (
          <button
            onClick={onBackToAssessments}
            className="rounded-organic-pill border border-organic-neutral-300/70 font-heading text-sm px-4 py-3 text-organic-text hover:bg-organic-neutral-100 transition-colors"
          >
            Back to assessments
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Recorded: what actually landed ─────────────────────────────────────────

function SessionRecorded({ outcome, onDone }: { outcome: FinishOutcome; onDone: () => void }) {
  return (
    <div className="max-w-[720px]">
      <div className="bg-organic-surface rounded-organic-card p-[22px] shadow-organic-sm">
        <div className="flex items-center gap-2.5 mb-3">
          <CheckCircle2 size={20} className="text-organic-accent-2-600" />
          <h3 className="text-lg font-heading text-organic-text">Session recorded</h3>
        </div>

        <div className="flex flex-col">
          <SummaryRow label="Time">
            {formatElapsed(outcome.elapsedSeconds)} in session
            {outcome.durationRecorded !== null
              ? ` · saved as ${outcome.durationRecorded} minute${outcome.durationRecorded === 1 ? '' : 's'}`
              : ''}
          </SummaryRow>

          <SummaryRow label="Assessments">
            {outcome.assessmentsQueued === 0 ? (
              <span className="text-organic-neutral-600">None were administered.</span>
            ) : (
              <>
                {outcome.assessmentsRecorded} of {outcome.assessmentsQueued} recorded
                {outcome.assessmentsQueued > outcome.assessmentsRecorded && (
                  <span className="text-organic-neutral-600">
                    {' '}
                    · nothing was saved for the {outcome.assessmentsQueued - outcome.assessmentsRecorded} not
                    administered
                  </span>
                )}
              </>
            )}
          </SummaryRow>

          <SummaryRow label="Session note">
            {outcome.noteFailed ? (
              <span className="text-organic-accent-800">
                The note could not be saved. Reopen the patient chart and write it there — it was not recorded.
              </span>
            ) : outcome.notesSaved === 0 ? (
              <span className="text-organic-neutral-600">No note was written.</span>
            ) : (
              <>
                {outcome.notesSaved} note{outcome.notesSaved === 1 ? '' : 's'} saved to the chart
                {outcome.signedOff
                  ? ' · signed off'
                  : outcome.signOffFailed
                  ? ' · the sign-off did not go through, so it is still on your notes-due list'
                  : ' · awaiting your sign-off'}
              </>
            )}
          </SummaryRow>

          <SummaryRow label="Next">
            {outcome.booking === null ? (
              <span className="text-organic-neutral-600">No follow-up was booked.</span>
            ) : outcome.booking.confirmed ? (
              <>Booked for {outcome.booking.whenLabel}.</>
            ) : (
              <span className="text-organic-accent-800">
                Requested for {outcome.booking.whenLabel}, but the server did not confirm it. Check the scheduler
                before the patient leaves.
              </span>
            )}
          </SummaryRow>
        </div>

        <button
          onClick={onDone}
          className="mt-4 rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-sm px-6 py-3"
        >
          Close and open the chart
        </button>
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
              <span className="text-[0.7812rem] font-semibold">{short}</span>
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
            <span className="text-[0.7812rem] font-semibold">{short}</span>
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
          <span className="text-[0.7812rem] font-semibold">Samples</span>
        </button>
        <button
          onClick={onOpenAdmin}
          title="Practice admin"
          className="w-[54px] h-[54px] rounded-2xl flex flex-col items-center justify-center gap-0.5 text-organic-neutral-700 hover:bg-organic-neutral-200 transition-colors"
        >
          <LayoutDashboard size={21} />
          <span className="text-[0.7812rem] font-semibold">Admin</span>
        </button>
        <button
          onClick={onLogout}
          title="Log out"
          className="w-[54px] h-[44px] rounded-2xl flex flex-col items-center justify-center gap-0.5 text-organic-neutral-700 hover:bg-organic-neutral-200 transition-colors"
        >
          <LogOut size={19} />
          <span className="text-[0.7812rem] font-semibold">Log out</span>
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
              <div className="font-heading text-[1.75rem] mt-1.5 text-organic-text">{st.value}</div>
            </div>
          ))}
        </div>

        <div className="bg-organic-surface rounded-organic-card p-[22px] shadow-organic-sm">
          <h3 className="text-[1.1875rem] font-heading text-organic-text mb-3">Today&apos;s schedule</h3>
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
                <div className="w-9 h-9 rounded-full bg-organic-accent-200 grid place-items-center text-[0.7812rem] font-bold text-organic-accent-800">
                  {initialsOf(s.patient_name)}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-organic-text">{s.patient_name}</div>
                  <div className="text-xs text-organic-neutral-600">{s.location === 'ONLINE' ? 'Video' : 'In person'} · {s.status}</div>
                </div>
                <span className={`text-[0.7812rem] font-semibold px-2.5 py-0.5 rounded-organic-pill ${riskStyle(s.patient_risk).bg} ${riskStyle(s.patient_risk).color}`}>
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
            <h3 className="text-[1.0625rem] font-heading text-organic-accent-800">Needs review</h3>
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
                <div className="font-semibold text-[0.8438rem] text-organic-text">{f.patient_name}</div>
                <div className="text-xs text-organic-neutral-700">
                  {f.instrument_name}{f.interpretation_text ? ` — ${f.interpretation_text}` : ' flagged'}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-organic-surface rounded-organic-card p-5 shadow-organic-sm">
          <h3 className="text-[1.0625rem] font-heading text-organic-text mb-3">Tasks</h3>
          <div className="flex flex-col gap-2.5">
            {dashboard && dashboard.notes_due.length === 0 && (
              <div className="text-[0.8438rem] text-organic-neutral-600">All session notes are signed off.</div>
            )}
            {dashboard?.notes_due.map((n) => (
              <div key={n.note_id} className="flex items-center gap-2.5 text-[0.8438rem] text-organic-text">
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

// ─── Scheduler ──────────────────────────────────────────────────────────────

// Widened /appointments row. `patient_id` is null for non-patient blocks
// (documentation / admin time), and `appointment_type` carries the real type —
// those two fields are what decide the chip treatment below. The design
// prototype had neither and string-matched its own sample labels instead.
type Appointment = {
  id: string
  patient_id: string | null
  patient_name: string | null
  patient_risk: string | null
  therapist_id: string | null
  appointment_type: string | null
  title: string | null
  start_time: string
  end_time: string
  location: string
  status: string
  meeting_link: string | null
}

type WeekKey = 'prev' | 'this' | 'next'

const WEEK_OPTIONS = [
  { value: 'prev', label: 'Last week' },
  { value: 'this', label: 'This week' },
  { value: 'next', label: 'Next week' },
]

const WEEK_OFFSET: Record<WeekKey, number> = { prev: -1, this: 0, next: 1 }

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

// Rows are normally derived from the real start times in the fetched week. This
// ladder only fills an otherwise empty grid so the empty state still has shape;
// the design's six irregular rows (09:00 / 10:00 / 11:30 / 14:00 / 15:30 /
// 17:00) were hand-picked to fit its sample data and are not reused.
const FALLBACK_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']

const APPOINTMENT_TYPE_LABEL: Record<string, string> = {
  INTAKE: 'Intake',
  FOLLOW_UP: 'Follow-up',
  CBT: 'CBT',
  GROUP: 'Group',
  ASSESSMENT: 'Assessment',
  DOCUMENTATION: 'Documentation',
  ADMIN: 'Admin',
}

// Contract rule: a cell is an admin/documentation block when the type says so,
// or when there is no patient behind it. Never inferred from display text.
function isAdminBlock(a: Appointment) {
  return a.appointment_type === 'DOCUMENTATION' || a.appointment_type === 'ADMIN' || !a.patient_id
}

function typeLabel(type: string | null) {
  if (!type) return null
  return APPOINTMENT_TYPE_LABEL[type] || type
}

function appointmentTitle(a: Appointment) {
  if (!isAdminBlock(a)) return a.patient_name || a.title || 'Appointment'
  return a.title || typeLabel(a.appointment_type) || 'Blocked time'
}

function appointmentMeta(a: Appointment) {
  const bits: string[] = []
  const type = typeLabel(a.appointment_type)
  if (type) bits.push(type)
  if (a.location) bits.push(a.location === 'ONLINE' ? 'Video' : 'In person')
  if (a.status === 'CANCELLED') bits.push('Cancelled')
  if (a.status === 'NO_SHOW') bits.push('No-show')
  return bits.join(' · ')
}

// Monday of the week `offsetWeeks` away from the real current date, at local
// midnight. Everything downstream (day columns, the today marker, the request
// range) hangs off this — nothing about the current week is hardcoded.
function mondayOf(offsetWeeks: number) {
  const d = new Date()
  const dow = (d.getDay() + 6) % 7 // Mon = 0
  d.setDate(d.getDate() - dow + offsetWeeks * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(d: Date, n: number) {
  const next = new Date(d)
  next.setDate(next.getDate() + n)
  return next
}

// Local plain calendar date. Sent to the API as `from`/`to` and used as the
// day-column key, so an appointment lands in the column the clinician sees it
// in rather than the one UTC would put it in.
function localDateKey(d: Date) {
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

function slotKeyOf(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function weekRangeLabel(start: Date, end: Date) {
  const startMonth = start.toLocaleDateString(undefined, { month: 'short' })
  const endMonth = end.toLocaleDateString(undefined, { month: 'short' })
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  return sameMonth
    ? `${startMonth} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`
    : `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${end.getFullYear()}`
}

function SchedulerView({
  onOpenPatient,
  onWeekLabel,
}: {
  onOpenPatient: (p: ChartPatientRef) => void
  onWeekLabel: (label: string) => void
}) {
  const [weekKey, setWeekKey] = useState<WeekKey>('this')
  const [appointments, setAppointments] = useState<Appointment[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    let dropped = false
    const start = mondayOf(WEEK_OFFSET[weekKey])
    setAppointments(null)
    setError(null)
    // The window is Sun–Mon (one padding day either side of the Mon–Sun week)
    // for two reasons:
    //   1. The grid is Mon–Fri but weekend rows are disclosed below, so Sat/Sun
    //      must come back rather than vanish.
    //   2. `from`/`to` are plain calendar dates; the backend resolves them
    //      against the DATABASE session timezone (no tz is set on the pool, so
    //      that is UTC), while every column/slot bucket here is resolved in the
    //      BROWSER's timezone. Without padding, a clinic east of UTC loses the
    //      start of Monday (a UTC+12 clinic loses every appointment before
    //      12:00 on Monday) and a clinic west of UTC loses the end of Sunday.
    //      One extra day either side covers the maximum ±14h offset; the local
    //      date filters below then decide what actually belongs to this week,
    //      so the padding rows are discarded, not displayed.
    apiClient
      .getAppointments({ from: localDateKey(addDays(start, -1)), to: localDateKey(addDays(start, 7)), mine: true })
      .then((rows: Appointment[]) => {
        if (!dropped) setAppointments(Array.isArray(rows) ? rows : [])
      })
      .catch(() => {
        if (!dropped) setError('Could not load your schedule.')
      })
    return () => {
      dropped = true
    }
  }, [weekKey, retryToken])

  const monday = mondayOf(WEEK_OFFSET[weekKey])
  const days = [0, 1, 2, 3, 4].map((i) => addDays(monday, i))
  const dayIndexByDate: Record<string, number> = {}
  days.forEach((d, i) => {
    dayIndexByDate[localDateKey(d)] = i
  })

  const weekendKeys = [localDateKey(addDays(monday, 5)), localDateKey(addDays(monday, 6))]

  const rows = appointments || []
  const inGrid = rows.filter((a) => localDateKey(new Date(a.start_time)) in dayIndexByDate)
  // Mon–Fri is all the design ever draws. A weekend appointment in the same week
  // is counted and called out rather than dropped on the floor. Matching the two
  // real Sat/Sun dates — rather than "everything that isn't a weekday" — is what
  // keeps the notice honest now that the request deliberately spans one padding
  // day either side of the week: those padding rows belong to the adjacent weeks
  // and must not be counted here.
  const offGrid = rows.filter((a) => weekendKeys.includes(localDateKey(new Date(a.start_time))))

  const derivedSlots = Array.from(new Set(inGrid.map((a) => slotKeyOf(a.start_time)))).sort()
  const slots = derivedSlots.length ? derivedSlots : FALLBACK_SLOTS

  const cells = new Map<string, Appointment[]>()
  inGrid.forEach((a) => {
    const key = `${slotKeyOf(a.start_time)}|${dayIndexByDate[localDateKey(new Date(a.start_time))]}`
    const existing = cells.get(key)
    if (existing) existing.push(a)
    else cells.set(key, [a])
  })

  const todayKey = localDateKey(new Date())
  const todayIndex = days.findIndex((d) => localDateKey(d) === todayKey)

  // Stats are computed from the rows actually fetched. The design's 24 / 6 / 4%
  // were hand-typed literals that matched nothing on its own grid.
  const sessions = inGrid.filter((a) => !isAdminBlock(a))
  const booked = sessions.filter((a) => a.status !== 'CANCELLED').length
  const completed = sessions.filter((a) => a.status === 'COMPLETED').length
  const noShow = sessions.filter((a) => a.status === 'NO_SHOW').length
  const outcomes = completed + noShow
  const loaded = appointments !== null && !error

  const range = weekRangeLabel(monday, days[4])
  // "recorded as held", not "held": the figure counts rows marked COMPLETED, and
  // a week that was only partly marked up would otherwise understate itself.
  const countText = !loaded
    ? null
    : weekKey === 'prev'
    ? outcomes > 0
      ? `${completed} sessions recorded as held`
      : `${booked} sessions on the calendar`
    : `${booked} sessions booked`
  const weekLabel = countText ? `${range} · ${countText}` : range

  useEffect(() => {
    onWeekLabel(weekLabel)
  }, [weekLabel])

  // A failed fetch is not a pending one. Showing "Loading…" under a stat card
  // while the grid says the load failed would claim a number is on its way when
  // nothing is in flight.
  const failed = error !== null

  const stats: { label: string; value: string; note: string; icon: typeof Calendar }[] = [
    {
      label: weekKey === 'prev' ? 'Sessions held' : 'Sessions booked',
      value: failed
        ? '—'
        : !loaded
        ? '…'
        : weekKey === 'prev' && outcomes === 0
        ? '—'
        : String(weekKey === 'prev' ? completed : booked),
      // "Held" needs an outcome to have been recorded; without one, 0 would read
      // as "nobody came" rather than "nothing was marked". When only some of the
      // week was marked up, the denominator is spelled out for the same reason —
      // "3" under "Sessions held" must not be read as "only 3 happened".
      note: failed
        ? 'Unavailable — schedule did not load'
        : !loaded
        ? 'Loading…'
        : weekKey === 'prev'
        ? outcomes === 0
          ? 'No session outcomes recorded'
          : `${outcomes} of ${sessions.length} sessions have a recorded outcome`
        : 'Across 5 days, Mon–Fri',
      icon: CalendarDays,
    },
    {
      // Needs a working-hours / availability model to have a denominator. There
      // isn't one, so this stays a placeholder rather than a made-up number.
      label: 'Free slots',
      value: '—',
      note: 'Set your working hours to enable this',
      icon: CalendarClock,
    },
    {
      label: 'No-show rate',
      value: failed ? '—' : !loaded ? '…' : outcomes === 0 ? '—' : `${Math.round((noShow / outcomes) * 100)}%`,
      // No prior-period figure is fetched, so there is no trend line to show.
      note: failed
        ? 'Unavailable — schedule did not load'
        : !loaded
        ? 'Loading…'
        : outcomes === 0
        ? 'No outcomes recorded yet'
        : `${noShow} no-show${noShow === 1 ? '' : 's'} of ${outcomes} with a recorded outcome`,
      icon: UserX,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <SegmentedControl options={WEEK_OPTIONS} value={weekKey} onChange={(v) => setWeekKey(v as WeekKey)} />
        <span className="text-sm text-organic-neutral-600">{weekLabel}</span>
        <button
          disabled
          title="Coming soon"
          className="ml-auto rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-sm px-5 py-2.5 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CalendarPlus size={16} /> Add appointment
        </button>
      </div>

      <div className="bg-organic-surface rounded-organic-card p-5 shadow-organic-sm overflow-x-auto">
        {!appointments && !error && <div className="text-sm text-organic-neutral-600 py-2">Loading…</div>}

        {error && (
          <div className="flex items-center gap-3 py-2">
            <span className="text-sm text-organic-accent-800">{error}</span>
            <button onClick={() => setRetryToken((t) => t + 1)} className="text-sm text-organic-accent-700 underline">
              Retry
            </button>
          </div>
        )}

        {loaded && (
          <>
            <div className="grid grid-cols-[74px_repeat(5,minmax(150px,1fr))] gap-2.5 min-w-[820px]">
              <div />
              {days.map((d, i) => {
                const isToday = i === todayIndex
                return (
                  <div
                    key={localDateKey(d)}
                    className={`text-center pb-2.5 border-b-2 ${
                      isToday ? 'border-organic-accent-500' : 'border-organic-text/[0.16]'
                    }`}
                  >
                    <div className="text-xs tracking-[0.05em] uppercase font-bold text-organic-neutral-600">
                      {WEEKDAY_NAMES[i]}
                    </div>
                    <div className={`font-heading text-[1.1875rem] ${isToday ? 'text-organic-accent-700' : 'text-organic-text'}`}>
                      {d.getDate()}
                    </div>
                  </div>
                )
              })}

              {slots.map((slot) => (
                <Fragment key={slot}>
                  <div className="min-h-[58px] pt-2.5 pr-1.5 text-xs font-bold text-organic-accent-700">{slot}</div>
                  {days.map((d, i) => {
                    const entries = cells.get(`${slot}|${i}`) || []
                    return (
                      <div
                        key={`${slot}|${localDateKey(d)}`}
                        className="min-h-[58px] border-t border-organic-text/[0.16] flex flex-col gap-1"
                      >
                        {/* Real data can double-book a slot; every entry is rendered. */}
                        {entries.map((a) => (
                          <SchedulerCell
                            key={a.id}
                            appointment={a}
                            slot={slot}
                            dayLabel={`${WEEKDAY_NAMES[i]} ${d.getDate()}`}
                            compact={entries.length > 1}
                            onOpenPatient={onOpenPatient}
                          />
                        ))}
                      </div>
                    )
                  })}
                </Fragment>
              ))}
            </div>

            {/* "…for this week" would contradict the weekend notice directly
                below it when the only bookings in the week are Sat/Sun. */}
            {inGrid.length === 0 && (
              <div className="text-center text-sm text-organic-neutral-600 pt-4">
                {offGrid.length > 0
                  ? 'No appointments Monday to Friday this week.'
                  : 'No appointments booked for this week.'}
              </div>
            )}

            {offGrid.length > 0 && (
              <div className="mt-3 text-xs text-organic-neutral-700 bg-organic-neutral-200 rounded-organic-tile px-3 py-2">
                {offGrid.length === 1
                  ? '1 appointment this week falls on Saturday or Sunday and is not shown in this Mon–Fri grid.'
                  : `${offGrid.length} appointments this week fall on Saturday or Sunday and are not shown in this Mon–Fri grid.`}
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3.5">
        {stats.map((st) => (
          <div key={st.label} className="bg-organic-surface rounded-organic-card p-4 shadow-organic-sm">
            <div className="flex justify-between items-center">
              <span className="text-xs text-organic-neutral-600">{st.label}</span>
              <st.icon size={16} className="text-organic-accent-500" />
            </div>
            <div className="font-heading text-[1.75rem] mt-1.5 text-organic-text">{st.value}</div>
            <div className="text-xs text-organic-neutral-600">{st.note}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SchedulerCell({
  appointment,
  slot,
  dayLabel,
  compact,
  onOpenPatient,
}: {
  appointment: Appointment
  slot: string
  dayLabel: string
  compact: boolean
  onOpenPatient: (p: ChartPatientRef) => void
}) {
  const admin = isAdminBlock(appointment)
  const patientId = appointment.patient_id
  const title = appointmentTitle(appointment)
  const meta = appointmentMeta(appointment)
  const chip = `px-2.5 py-2 rounded-[14px] border-l-4 ${
    admin ? 'bg-organic-neutral-200 border-organic-neutral-400' : 'bg-organic-accent-100 border-organic-accent-500'
  } ${appointment.status === 'CANCELLED' ? 'opacity-60' : ''}`
  const body = (
    <>
      <div
        className={`font-bold ${compact ? 'text-xs' : 'text-sm'} truncate ${
          admin ? 'text-organic-neutral-800' : 'text-organic-accent-900'
        }`}
      >
        {title}
      </div>
      {meta && <div className="text-xs text-organic-neutral-600 truncate">{meta}</div>}
    </>
  )

  // Blocked time has no chart to open, so it stays a plain div.
  if (admin || !patientId) return <div className={chip}>{body}</div>

  return (
    <button
      onClick={() => onOpenPatient({ id: patientId, name: title })}
      aria-label={`${title}, ${slot}, ${dayLabel}`}
      className={`w-full text-left hover:bg-organic-accent-200 transition-colors ${chip}`}
    >
      {body}
    </button>
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
  // Provenance. Read-only everywhere: it records what happened to the row, not
  // anything about the patient, so it is never part of an edit or a PATCH.
  source: string | null
  created_by: string | null
  source_detail: string | null
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

// Takes the loose HistoryNote shape so the same preview serves both the chart's
// full notes and the trimmed ones that ride along with a session payload.
function notePreview(n: HistoryNote): string {
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

const DT_CLASS = 'text-[0.7812rem] font-semibold tracking-wide uppercase text-organic-neutral-600 mb-0.5'
const INPUT_CLASS = 'w-full bg-organic-bg border border-organic-neutral-300/60 rounded-organic-tile px-3 py-2 text-sm'
const FORM_LABEL_CLASS = 'block text-xs font-semibold text-organic-neutral-600 mb-1.5'

function ProfileField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className={DT_CLASS}>{label}</dt>
      <dd className={`text-[0.8438rem] ${value ? 'text-organic-text' : 'text-organic-neutral-500 italic'}`}>
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

  // `created_by` is a clinician UUID; turning it into a name needs the
  // practice's clinician list. Until that list arrives the id is not dressed up
  // as a name, and a lookup that fails says so rather than being reported as an
  // unknown clinician — "we could not check" and "it was nobody we know" are
  // different statements.
  const [clinicianNames, setClinicianNames] = useState<Record<string, string> | null>(null)
  const [lookupFailed, setLookupFailed] = useState(false)
  const createdBy = detail?.created_by || null

  useEffect(() => {
    let cancelled = false
    if (createdBy && clinicianNames === null && !lookupFailed) {
      apiClient
        .getClinicians()
        .then((rows: any[]) => {
          if (cancelled) return
          const names: Record<string, string> = {}
          for (const r of rows || []) if (r?.id && r?.full_name) names[r.id] = r.full_name
          setClinicianNames(names)
        })
        .catch(() => {
          if (!cancelled) setLookupFailed(true)
        })
    }
    return () => {
      cancelled = true
    }
  }, [createdBy])

  const origin = sourceMetaOf(detail?.source)
  const lookupReady = clinicianNames !== null
  const addedBy =
    createdBy && !lookupReady && !lookupFailed
      ? 'Looking up…'
      : addedByLabel(createdBy, (id) => clinicianNames?.[id], lookupReady)
  const addedByNamed = !!(createdBy && clinicianNames?.[createdBy])

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
            className="rounded-organic-pill border border-organic-neutral-300/70 bg-transparent font-heading text-[0.7812rem] px-3.5 py-1.5 text-organic-text hover:bg-organic-neutral-100 transition-colors"
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
                  className={`inline-block text-[0.7812rem] font-semibold px-2.5 py-0.5 rounded-organic-pill ${riskStyle(detail.risk).bg} ${riskStyle(detail.risk).color}`}
                >
                  {detail.risk}
                </span>
              ) : (
                <span className="text-[0.8438rem] text-organic-neutral-500 italic">Not recorded</span>
              )}
            </dd>
          </div>
          <div>
            <dt className={DT_CLASS}>Wellbeing</dt>
            <dd>
              {detail.wellbeing_status ? (
                <span
                  className={`inline-block text-[0.7812rem] font-semibold px-2.5 py-0.5 rounded-organic-pill ${
                    (WELLBEING_STYLE[detail.wellbeing_status] || WELLBEING_STYLE.GREEN).bg
                  } ${(WELLBEING_STYLE[detail.wellbeing_status] || WELLBEING_STYLE.GREEN).color}`}
                >
                  {(WELLBEING_STYLE[detail.wellbeing_status] || { label: detail.wellbeing_status }).label}
                </span>
              ) : (
                <span className="text-[0.8438rem] text-organic-neutral-500 italic">Not recorded</span>
              )}
            </dd>
          </div>
          <div>
            <dt className={DT_CLASS}>AI analysis consent</dt>
            <dd>
              <span
                className={`inline-block text-[0.7812rem] font-semibold px-2.5 py-0.5 rounded-organic-pill ${
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

      {/* Provenance sits below the demographics and outside the edit form on
          purpose: it is a record of how this row came to exist, not a fact
          about the patient, so there is nothing here to correct. It is never
          copied into the draft and never reaches the PATCH. */}
      {detail && !draft && (
        <div className="mt-4 pt-3.5 border-t border-organic-neutral-300/50">
          <div className="flex items-baseline gap-2 mb-2.5">
            <h4 className="text-[0.7812rem] font-semibold tracking-wide uppercase text-organic-neutral-600">Record origin</h4>
            <span className="text-[0.7812rem] text-organic-neutral-500">Read-only</span>
          </div>

          {origin.warning && (
            <div className="flex items-start gap-2.5 bg-organic-neutral-200 border border-dashed border-organic-neutral-600 text-organic-neutral-800 text-[0.8438rem] rounded-organic-tile px-3.5 py-2.5 mb-3">
              <FlaskConical size={15} className="mt-0.5 flex-none text-organic-neutral-600" />
              <span>{origin.warning}</span>
            </div>
          )}

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3.5">
            <div>
              <dt className={DT_CLASS}>How this record was added</dt>
              <dd className="flex items-center gap-2 flex-wrap">
                <span
                  title={origin.title}
                  className={`text-[0.8438rem] ${origin.kind === 'unrecorded' ? 'text-organic-neutral-500 italic' : 'text-organic-text'}`}
                >
                  {origin.detail}
                </span>
                {origin.kind === 'test' && (
                  <span
                    title={origin.title}
                    className="text-[0.7812rem] font-semibold px-2.5 py-0.5 rounded-organic-pill inline-flex items-center gap-1 bg-organic-neutral-300 text-organic-neutral-800 border border-dashed border-organic-neutral-600"
                  >
                    <FlaskConical size={13} />
                    {origin.label}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className={DT_CLASS}>Added by</dt>
              <dd
                title={createdBy ? `Recorded against clinician ID ${createdBy}` : undefined}
                className={`text-[0.8438rem] ${addedByNamed ? 'text-organic-text' : 'text-organic-neutral-500 italic'}`}
              >
                {addedBy}
              </dd>
            </div>
            {detail.source_detail && (
              <div className="sm:col-span-2">
                <dt className={DT_CLASS}>Note recorded with the record</dt>
                <dd className="text-[0.8438rem] text-organic-neutral-700 leading-relaxed">{detail.source_detail}</dd>
              </div>
            )}
          </dl>
        </div>
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
  // null = not answered yet (loading, or the request failed). Never [] on
  // failure: an empty array here renders "No patients assigned to you yet.",
  // which is a statement about the caseload, not about the network.
  const [myPatients, setMyPatients] = useState<SimplePatient[] | null>(null)
  const [pickerError, setPickerError] = useState<string | null>(null)
  const [detail, setDetail] = useState<PatientDetail | null>(null)
  const [notes, setNotes] = useState<SessionNote[] | null>(null)
  const [records, setRecords] = useState<AssessmentRecord[] | null>(null)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!patient) {
      setPickerError(null)
      setMyPatients(null)
      apiClient
        .getPatients({ mine: true, limit: CASELOAD_LIMIT })
        .then((rows: SimplePatient[]) => setMyPatients(Array.isArray(rows) ? rows : []))
        .catch(() => setPickerError('Could not load your caseload. This is not a record that you have no patients.'))
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
          {myPatients?.map((p) => (
            <button
              key={p.id}
              onClick={() => onPickPatient({ id: p.id, name: p.name })}
              className="text-left flex items-center justify-between bg-organic-surface hover:bg-organic-accent-100 rounded-organic-tile px-3.5 py-2.5 text-sm"
            >
              <span className="font-semibold">{p.name}</span>
              <span className="text-xs text-organic-neutral-500">{p.status}</span>
            </button>
          ))}
          {pickerError ? (
            <div className="text-sm text-organic-accent-800">{pickerError}</div>
          ) : myPatients === null ? (
            <div className="text-sm text-organic-neutral-600">Loading…</div>
          ) : myPatients.length === 0 ? (
            <div className="text-sm text-organic-neutral-600">No patients assigned to you yet.</div>
          ) : null}
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
            <span className="font-heading text-[1.375rem] text-organic-text">{patient.name}</span>
            {detail && (
              <span className={`text-[0.7812rem] font-semibold px-2.5 py-0.5 rounded-organic-pill ${riskStyle(detail.risk).bg} ${riskStyle(detail.risk).color}`}>
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
                    <div className="text-[0.8438rem] text-organic-text">{notePreview(n)}</div>
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
                      <span className="text-[0.7812rem] font-semibold px-2 py-0.5 rounded-organic-pill bg-organic-accent-200 text-organic-accent-800">
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

/**
 * AI Scribe — deliberately not built.
 *
 * This view used to render a fabricated session: an invented verbatim
 * clinician/patient dialogue, and an invented SOAP note whose Objective read
 * "PHQ-9 14 (down from 18). No acute SI voiced; item 9 monitored." and whose
 * Assessment read "MDD, moderate — improving". Beneath it sat a "Save to
 * chart" button.
 *
 * That is invented clinical content, including an invented suicidal-ideation
 * observation, one click away from a patient's permanent record. It was kept
 * off screen only by the nav entry's `ready: false` flag -- the SampleGate
 * wrapper around it defaults to SHOWING samples, so flipping that one flag
 * would have shipped all of it.
 *
 * There is no scribe backend to wire this to: nothing in backend/ transcribes,
 * diarises or summarises anything. Building it properly needs audio capture,
 * streaming transcription, speaker diarisation, note generation, and a
 * clinician review-and-sign flow before a word of it may reach a chart.
 *
 * Until then the clinician writes the note themselves during the session --
 * which SessionRunner now supports, and which is wired to the real API.
 */
function ScribeView() {
  return (
    <div className="max-w-[640px]">
      <div className="bg-organic-surface rounded-organic-card p-7 shadow-organic-sm">
        <div className="flex items-center gap-2.5 mb-3">
          <Lock size={20} className="text-organic-neutral-500 flex-none" />
          <h2 className="text-[1.375rem] font-heading text-organic-text">AI Scribe is not available</h2>
        </div>

        <p className="text-sm text-organic-neutral-700 mb-4">
          Automatic session transcription and note drafting has not been built. Nothing
          in the system records or transcribes a session today.
        </p>

        <div className="bg-organic-bg rounded-organic-tile p-4 mb-5 text-[0.8125rem] text-organic-neutral-700">
          <p className="mb-2">Before a drafted note could ever reach a patient chart it would need:</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li>consented audio capture and transcription</li>
            <li>reliable attribution of who said what</li>
            <li>a clinician review-and-sign step, because an unreviewed generated
                note is not a clinical record</li>
          </ul>
        </div>

        <p className="text-[0.8125rem] text-organic-neutral-600">
          In the meantime, notes are written during the consultation itself — start a
          session from the caseload and the note is saved to the patient&apos;s chart
          with the rest of the visit.
        </p>
      </div>
    </div>
  )
}


// ─── Care plan ──────────────────────────────────────────────────────────────

type CarePlan = {
  id: string
  patient_id: string
  status: string
  main_track: string | null
  goals: unknown[] | null
  created_at: string
}

type HomeworkTask = {
  id: string
  title: string
  description: string | null
  task_type: string | null
  due_date: string | null
  status: string
  assigned_at: string | null
}

/** A goal may be stored as a bare string or as an object; render whichever it
 *  is rather than printing "[object Object]" at a clinician. */
function goalText(goal: unknown): string | null {
  if (typeof goal === 'string') return goal.trim() || null
  if (goal && typeof goal === 'object') {
    const g = goal as Record<string, unknown>
    for (const key of ['title', 'text', 'goal', 'description', 'name']) {
      const v = g[key]
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
  }
  return null
}

/**
 * Care plan.
 *
 * This view used to render an invented plan for a named patient "Maya O." --
 * four fabricated treatment phases with week ranges and completion states, and
 * four homework items with adherence ticks -- shown regardless of which
 * patient, if any, was open. It now reads the real care plan and homework
 * endpoints for the selected patient.
 *
 * No care plans exist in the database yet, so an honest empty state is the
 * normal result today. That is the correct thing to show: "no plan yet" is a
 * true statement about a patient; an invented plan is not.
 */
function PlanView({ patient }: { patient: ChartPatientRef | null }) {
  const [plans, setPlans] = useState<CarePlan[] | null>(null)
  const [homework, setHomework] = useState<HomeworkTask[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!patient) {
      setPlans(null)
      setHomework(null)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      apiClient.getPatientCarePlans(patient.id),
      apiClient.getPatientHomework(patient.id),
    ])
      .then(([p, h]: [CarePlan[], HomeworkTask[]]) => {
        if (cancelled) return
        setPlans(Array.isArray(p) ? p : [])
        setHomework(Array.isArray(h) ? h : [])
      })
      .catch(() => {
        // A failed request must never read as "this patient has no care plan".
        if (!cancelled) {
          setError('Could not load the care plan. This is not a record that none exists.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [patient?.id])

  if (!patient) {
    return (
      <div className="bg-organic-surface rounded-organic-card p-7 shadow-organic-sm max-w-[640px]">
        <h3 className="text-[1.1875rem] font-heading mb-1.5">No patient selected</h3>
        <p className="text-sm text-organic-neutral-600">
          Open a patient from your caseload or the Patient chart, and their care plan
          will appear here.
        </p>
      </div>
    )
  }

  const active = plans?.find((p) => (p.status || '').toUpperCase() === 'ACTIVE') || plans?.[0] || null
  const goals = (active?.goals || []).map(goalText).filter((g): g is string => !!g)
  const done = (homework || []).filter((t) => (t.status || '').toLowerCase() === 'completed').length

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 max-w-[1100px]">
      <div className="bg-organic-surface rounded-organic-card p-[22px] shadow-organic-sm">
        <h3 className="text-[1.1875rem] font-heading mb-3">Care plan · {patient.name}</h3>

        {loading && <div className="text-sm text-organic-neutral-600">Loading care plan…</div>}
        {error && <div className="text-sm text-organic-accent-800">{error}</div>}

        {!loading && !error && !active && (
          <p className="text-sm text-organic-neutral-600">
            No care plan has been created for {patient.name} yet.
          </p>
        )}

        {!loading && !error && active && (
          <>
            <div className="flex items-center gap-2 mb-3.5">
              <span className="text-[0.7812rem] px-2.5 py-0.5 rounded-organic-pill bg-organic-accent-200 text-organic-accent-800 font-semibold">
                {active.status}
              </span>
              {active.main_track && (
                <span className="text-sm text-organic-neutral-700">{active.main_track}</span>
              )}
            </div>
            {goals.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {goals.map((g, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-organic-neutral-800">
                    <Circle size={15} className="text-organic-accent-500 flex-none mt-0.5" />
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-organic-neutral-600">No goals recorded on this plan.</p>
            )}
          </>
        )}
      </div>

      <div className="bg-organic-surface rounded-organic-card p-[22px] shadow-organic-sm">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-[1.0625rem] font-heading">Homework</h3>
          {homework && homework.length > 0 && (
            <span className="text-[0.8125rem] text-organic-neutral-600">
              {done} of {homework.length} done
            </span>
          )}
        </div>

        {loading && <div className="text-sm text-organic-neutral-600">Loading…</div>}
        {!loading && !error && homework && homework.length === 0 && (
          <p className="text-sm text-organic-neutral-600">Nothing assigned yet.</p>
        )}
        {!loading && !error && homework && homework.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {homework.map((t) => {
              const complete = (t.status || '').toLowerCase() === 'completed'
              return (
                <div key={t.id} className="flex items-start gap-2.5">
                  {complete ? (
                    <CheckCircle2 size={17} className="text-organic-accent-600 flex-none mt-0.5" />
                  ) : (
                    <Circle size={17} className="text-organic-neutral-400 flex-none mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-organic-text">{t.title}</div>
                    <div className="text-xs text-organic-neutral-600">
                      {[t.task_type, t.due_date ? 'due ' + t.due_date : null, t.status]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
