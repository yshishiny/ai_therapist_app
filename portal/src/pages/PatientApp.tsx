import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { TextSizeControl } from '../components/TextSizeControl'
import { useAuthStore } from '../store/authStore'
import apiClient, {
  MoodEntry,
  MyAssessmentResult,
  MyHomeworkTask,
  MyProfile,
  MySession,
} from '../services/api'
import {
  AlertCircle,
  Annoyed,
  ArrowRight,
  ArrowUp,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronUp,
  Frown,
  Home,
  Laugh,
  LineChart,
  ListChecks,
  LogOut,
  Meh,
  MessageCircle,
  Shield,
  Smile,
  Sparkles,
  User,
} from 'lucide-react'

/**
 * The patient's own app.
 *
 * Every clinical statement on this screen — a score, a severity band, a mood
 * line, a session time, a task count — is read from the /me/* endpoints and
 * rendered only in the form the server sent it. Nothing on this screen is
 * seeded, sampled or illustrative: a patient reading a severity band about
 * their own mental health may act on it, so a placeholder here is not a
 * placeholder, it is a false clinical claim.
 *
 * Three states are kept apart everywhere, deliberately: still loading, failed
 * to load, and genuinely empty. "No assessments yet" is itself a clinical
 * claim, and it must never be the thing a network error looks like.
 */

type Tab = 'home' | 'chat' | 'tasks' | 'progress'

const TABS: { tab: Tab; label: string; icon: typeof Home }[] = [
  { tab: 'home', label: 'Home', icon: Home },
  { tab: 'chat', label: 'Aria', icon: MessageCircle },
  { tab: 'tasks', label: 'Tasks', icon: ListChecks },
  { tab: 'progress', label: 'Progress', icon: LineChart },
]

// Labels for the 1–5 scale the server defines (mood_score has a 1..5 CHECK on
// the column). These name the *input control*; they are not a reading of
// anybody's mood until the patient picks one and it is written to the database.
const MOOD_SCALE: { score: number; icon: typeof Frown; label: string }[] = [
  { score: 1, icon: Frown, label: 'Low' },
  { score: 2, icon: Annoyed, label: 'Meh' },
  { score: 3, icon: Meh, label: 'Okay' },
  { score: 4, icon: Smile, label: 'Good' },
  { score: 5, icon: Laugh, label: 'Great' },
]

const ENERGY_SCALE = [1, 2, 3, 4, 5]

// Prompts the patient may choose to send. They are suggestions for the input
// box — nothing is sent, and nothing is recorded, until the patient taps one.
const PROMPTS = ['I feel anxious', 'Help me reframe this', 'A grounding exercise']

const PATIENT_ONLY =
  'This is the patient app, and it only ever shows the signed-in patient their own record. Your account is not a patient account, so there is no record here to show.'

// ─── Loading / error plumbing ───────────────────────────────────────────────

type Loadable<T> =
  | { state: 'loading' }
  | { state: 'ready'; data: T }
  | { state: 'error'; message: string; forbidden: boolean }

function httpStatus(err: unknown): number | null {
  const status = (err as { response?: { status?: unknown } } | null)?.response?.status
  return typeof status === 'number' ? status : null
}

/** Why a request did not succeed, in words, without guessing. */
function reason(err: unknown): string {
  // A 2xx whose body was not the documented list. This is deliberately not
  // collapsed into an empty list upstream: "no results" on this screen is a
  // statement about the patient's record, not about the network.
  if ((err as { isMalformedResponse?: boolean } | null)?.isMalformedResponse) {
    return 'the server sent a reply this app could not read'
  }
  const status = httpStatus(err)
  if (status === null) return 'the server could not be reached'
  if (status === 404) return 'the server had no record to return'
  if (status >= 500) return `the server failed (${status})`
  return `the server refused the request (${status})`
}

type LoadError = { state: 'error'; message: string; forbidden: boolean }

function loadFailure(err: unknown, subject: string): LoadError {
  if (httpStatus(err) === 403) return { state: 'error', message: PATIENT_ONLY, forbidden: true }
  return { state: 'error', message: `${subject} could not be loaded — ${reason(err)}.`, forbidden: false }
}

function actionFailure(err: unknown, what: string): string {
  if (httpStatus(err) === 403) return PATIENT_ONLY
  return `${what} — ${reason(err)}.`
}

/**
 * One remote resource, with its own retry. Each hook owns a single GET, so a
 * failure in one panel never turns another panel into a false "nothing here".
 */
function useResource<T>(subject: string, load: () => Promise<T>) {
  const loadRef = useRef(load)
  loadRef.current = load
  const [tick, setTick] = useState(0)
  const [value, setValue] = useState<Loadable<T>>({ state: 'loading' })

  useEffect(() => {
    let cancelled = false
    setValue({ state: 'loading' })
    loadRef.current()
      .then((data) => {
        if (!cancelled) setValue({ state: 'ready', data })
      })
      .catch((err) => {
        if (!cancelled) setValue(loadFailure(err, subject))
      })
    return () => {
      cancelled = true
    }
  }, [subject, tick])

  const refresh = useCallback(() => setTick((t) => t + 1), [])
  return { value, refresh }
}

function Pending({ what, light = false }: { what: string; light?: boolean }) {
  return (
    <div className={`text-sm py-1.5 ${light ? 'text-organic-accent-200' : 'text-organic-neutral-600'}`}>
      Loading {what}…
    </div>
  )
}

function Failed({ message, onRetry, light = false }: { message: string; onRetry: () => void; light?: boolean }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <AlertCircle size={16} className={`flex-none mt-0.5 ${light ? 'text-organic-accent-200' : 'text-organic-danger'}`} />
      <div className="flex-1">
        <div className={`text-sm ${light ? 'text-organic-accent-100' : 'text-organic-neutral-800'}`}>{message}</div>
        <button
          onClick={onRetry}
          className={`text-sm underline mt-1 ${light ? 'text-organic-accent-200' : 'text-organic-accent-700'}`}
        >
          Try again
        </button>
      </div>
    </div>
  )
}

// ─── Formatting (never invents a value it was not given) ────────────────────

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/**
 * `homework_tasks.due_date` is a SQL DATE, so the server sends a bare
 * "YYYY-MM-DD" — a calendar date, with no time and no zone. ECMAScript parses
 * that form as UTC midnight, which `toLocaleDateString` then renders as the
 * *previous day* for every patient west of UTC: a due date the server never
 * sent. A calendar date is therefore built as that calendar date in the
 * patient's own timezone. Values that carry a time (logged_at, scheduled_at,
 * taken_at are all timestamptz) still go through the normal instant parse.
 */
function parseServerDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const d = DATE_ONLY.test(iso)
    ? new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)))
    : new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatDate(iso: string | null | undefined): string | null {
  const d = parseServerDate(iso)
  if (!d) return null
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(iso: string | null | undefined): string | null {
  const d = parseServerDate(iso)
  if (!d) return null
  return d.toLocaleString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Presents the server's own status word; it does not translate or reinterpret it.
 *
 * One coercion has to be undone first. patient_portal_service_db.get_homework
 * normalises with `str(item.get("status", "")).lower()`, and for a row whose
 * status column is NULL that key exists holding None — so `str(None).lower()`
 * puts the literal string "none" on the wire. That is the *absence* of a status,
 * not a status named "None", and a task must not be labelled with it.
 */
function prettyStatus(status: string | null | undefined): string | null {
  if (!status) return null
  const cleaned = status.replace(/[_-]+/g, ' ').trim()
  if (!cleaned) return null
  const lower = cleaned.toLowerCase()
  if (lower === 'none' || lower === 'null') return null
  return cleaned.charAt(0).toUpperCase() + lower.slice(1)
}

const DONE_STATUSES = new Set(['completed', 'complete', 'done', 'submitted'])

function isDone(task: MyHomeworkTask): boolean {
  return DONE_STATUSES.has((task.status ?? '').toLowerCase())
}

function firstName(name: string | null | undefined): string | null {
  if (!name) return null
  const part = name.trim().split(/\s+/)[0]
  return part || null
}

function initials(name: string | null | undefined): string | null {
  if (!name) return null
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return null
  const head = parts[0].charAt(0)
  const tail = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''
  const out = `${head}${tail}`.toUpperCase()
  return out || null
}

function greeting() {
  const hr = new Date().getHours()
  return hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'
}

// ─── Frame ──────────────────────────────────────────────────────────────────

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen flex justify-center items-start p-4 pt-6"
      style={{ background: 'radial-gradient(circle at 30% 0%, #eceef3, #d9dce4)' }}
    >
      <div className="w-full max-w-[412px] bg-organic-bg rounded-[38px] shadow-organic-lg overflow-hidden relative min-h-[812px] flex flex-col">
        {children}
      </div>
    </div>
  )
}

/**
 * Shown when the signed-in account is not a patient. Every /me/* endpoint
 * answers such a token with 403 "Patient access only.", so rendering the tabs
 * would produce a patient record made entirely of empty states.
 */
function NotAPatient({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-4">
      <div className="w-14 h-14 rounded-full bg-organic-neutral-200 grid place-items-center">
        <Shield size={24} className="text-organic-neutral-600" />
      </div>
      <h1 className="font-heading text-xl">Patient app</h1>
      <p className="text-sm text-organic-neutral-700 leading-relaxed">{PATIENT_ONLY}</p>
      <div className="flex items-center gap-3 mt-1">
        <Link
          to="/"
          className="rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-sm px-5 py-2.5"
        >
          Go to your portal
        </Link>
        <button onClick={onSignOut} className="text-sm text-organic-accent-700 underline">
          Sign out
        </button>
      </div>
    </div>
  )
}

export default function PatientApp() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const signOut = useCallback(() => {
    void logout()
  }, [logout])

  // The route has no requiredRoles, so anyone signed in can reach it. The token
  // role is checked here so a non-patient is told why the app is empty instead
  // of being shown six failed requests.
  if (user && user.role !== 'patient') {
    return (
      <PhoneFrame>
        <NotAPatient onSignOut={signOut} />
      </PhoneFrame>
    )
  }

  return <PatientAppShell onSignOut={signOut} />
}

// ─── Shell ──────────────────────────────────────────────────────────────────

type ChatEntry = { id: number; role: 'you' | 'aria'; text: string; failed?: boolean }

function PatientAppShell({ onSignOut }: { onSignOut: () => void }) {
  const [tab, setTab] = useState<Tab>('home')

  const profile = useResource<MyProfile>('Your profile', useCallback(() => apiClient.getMyProfile(), []))
  const mood = useResource<MoodEntry[]>('Your mood check-ins', useCallback(() => apiClient.getMyMood(30), []))
  const assessments = useResource<MyAssessmentResult[]>(
    'Your assessment results',
    useCallback(() => apiClient.getMyAssessments(), []),
  )
  const homework = useResource<MyHomeworkTask[]>('Your tasks', useCallback(() => apiClient.getMyHomework(), []))
  const sessions = useResource<MySession[]>('Your sessions', useCallback(() => apiClient.getMySessions(), []))

  // Aria's thread lives here so switching tabs does not silently discard it —
  // there is no endpoint that can read it back.
  const [chat, setChat] = useState<ChatEntry[]>([])
  const [chatError, setChatError] = useState<string | null>(null)
  const [chatSending, setChatSending] = useState(false)
  const conversationId = useRef<string | null>(null)
  const nextChatId = useRef(1)

  const sendToAria = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || chatSending) return
      const mineId = nextChatId.current++
      setChat((c) => [...c, { id: mineId, role: 'you', text: trimmed }])
      setChatError(null)
      setChatSending(true)
      try {
        const reply = await apiClient.sendAriaMessage(trimmed, conversationId.current)
        conversationId.current = reply.conversation_id ?? conversationId.current
        setChat((c) => [...c, { id: nextChatId.current++, role: 'aria', text: reply.reply }])
      } catch (err) {
        setChat((c) => c.map((m) => (m.id === mineId ? { ...m, failed: true } : m)))
        setChatError(actionFailure(err, 'Your message was not delivered'))
      } finally {
        setChatSending(false)
      }
    },
    [chatSending],
  )

  const profileForbidden = profile.value.state === 'error' && profile.value.forbidden

  // The token said 'patient' but the server disagrees. Trust the server.
  if (profileForbidden) {
    return (
      <PhoneFrame>
        <NotAPatient onSignOut={onSignOut} />
      </PhoneFrame>
    )
  }

  const person = profile.value.state === 'ready' ? profile.value.data : null
  const name = firstName(person?.full_name)
  const badge = initials(person?.full_name)

  return (
    <PhoneFrame>
      <div className="px-[22px] pt-[22px] pb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-[42px] h-[42px] rounded-full bg-organic-accent-300 grid place-items-center font-bold text-organic-accent-900 flex-none">
            {badge ?? <User size={20} className="text-organic-accent-900" aria-hidden="true" />}
          </div>
          <div className="leading-tight min-w-0">
            <div className="text-xs text-organic-neutral-600">{greeting()}</div>
            <div className="font-heading text-lg truncate">
              {name ?? (profile.value.state === 'loading' ? '…' : '')}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-none">
          <TextSizeControl compact />
          <button
            onClick={onSignOut}
            title="Sign out"
            aria-label="Sign out"
            className="w-10 h-10 rounded-full border border-organic-neutral-300/60 bg-organic-surface grid place-items-center"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-[108px] pt-1.5">
        {profile.value.state === 'error' && (
          <div className="bg-organic-surface rounded-organic-tile px-4 py-3 shadow-organic-sm mb-4">
            <Failed message={profile.value.message} onRetry={profile.refresh} />
          </div>
        )}

        {tab === 'home' && (
          <HomeTab
            sessions={sessions.value}
            onRetrySessions={sessions.refresh}
            homework={homework.value}
            onRetryHomework={homework.refresh}
            mood={mood.value}
            onMoodLogged={mood.refresh}
            onGoChat={() => setTab('chat')}
            onGoTasks={() => setTab('tasks')}
          />
        )}
        {tab === 'chat' && (
          <ChatTab entries={chat} error={chatError} sending={chatSending} onSend={sendToAria} />
        )}
        {tab === 'tasks' && (
          <TasksTab value={homework.value} onRetry={homework.refresh} onChanged={homework.refresh} />
        )}
        {tab === 'progress' && (
          <ProgressTab
            mood={mood.value}
            onRetryMood={mood.refresh}
            assessments={assessments.value}
            onRetryAssessments={assessments.refresh}
            homework={homework.value}
            sessions={sessions.value}
            onRetrySessions={sessions.refresh}
          />
        )}
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 border-t border-organic-neutral-300/50 px-[18px] pt-3 pb-[22px] flex justify-between"
        style={{ background: 'rgba(247, 248, 250, 0.92)', backdropFilter: 'blur(10px)' }}
      >
        {TABS.map(({ tab: t, label, icon: Icon }) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-current={t === tab ? 'page' : undefined}
            className={`flex-1 flex flex-col items-center gap-1 ${t === tab ? 'text-organic-accent' : 'text-organic-neutral-500'}`}
          >
            <Icon size={23} />
            <span className={`text-[0.7812rem] ${t === tab ? 'font-bold' : 'font-medium'}`}>{label}</span>
          </button>
        ))}
      </div>
    </PhoneFrame>
  )
}

// ─── Home ───────────────────────────────────────────────────────────────────

function HomeTab({
  sessions,
  onRetrySessions,
  homework,
  onRetryHomework,
  mood,
  onMoodLogged,
  onGoChat,
  onGoTasks,
}: {
  sessions: Loadable<MySession[]>
  onRetrySessions: () => void
  homework: Loadable<MyHomeworkTask[]>
  onRetryHomework: () => void
  mood: Loadable<MoodEntry[]>
  onMoodLogged: () => void
  onGoChat: () => void
  onGoTasks: () => void
}) {
  const openTasks =
    homework.state === 'ready' ? homework.data.filter((t) => !isDone(t)).slice(0, 3) : []

  return (
    <div className="flex flex-col gap-4">
      <NextSessionCard value={sessions} onRetry={onRetrySessions} onRequested={onRetrySessions} />

      <MoodCheckIn value={mood} onLogged={onMoodLogged} />

      <div>
        <div className="flex justify-between items-center mb-2.5">
          <h3 className="text-lg font-heading">Open tasks</h3>
          <button onClick={onGoTasks} className="text-[0.7812rem] text-organic-accent">
            See all
          </button>
        </div>
        <div className="bg-organic-surface rounded-organic-tile p-3.5 shadow-organic-sm">
          {homework.state === 'loading' && <Pending what="your tasks" />}
          {homework.state === 'error' && <Failed message={homework.message} onRetry={onRetryHomework} />}
          {homework.state === 'ready' && homework.data.length === 0 && (
            <div className="text-sm text-organic-neutral-700">Your therapist has not assigned any tasks yet.</div>
          )}
          {homework.state === 'ready' && homework.data.length > 0 && openTasks.length === 0 && (
            <div className="text-sm text-organic-neutral-700">
              Every assigned task is marked complete. Nothing is open right now.
            </div>
          )}
          {openTasks.length > 0 && (
            <div className="flex flex-col gap-2.5">
              {openTasks.map((t) => (
                <div key={t.id} className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-organic-tile bg-organic-accent-100 grid place-items-center flex-none">
                    <ListChecks size={19} className="text-organic-accent-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{t.title ?? 'Untitled task'}</div>
                    <div className="text-xs text-organic-neutral-600">{taskMeta(t)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <button onClick={onGoChat} className="bg-organic-accent-2-100 rounded-organic-tile p-[18px] flex items-center gap-3.5 text-left">
        <div className="w-[46px] h-[46px] rounded-full bg-organic-accent-2-500 grid place-items-center flex-none">
          <Sparkles size={22} className="text-organic-accent-2-100" />
        </div>
        <div className="flex-1">
          <div className="font-heading text-base text-organic-accent-2-900">Talk to Aria</div>
          <div className="text-[0.7812rem] text-organic-accent-2-800">Your AI companion, here anytime</div>
        </div>
        <ArrowRight size={19} className="text-organic-accent-2-700" />
      </button>
    </div>
  )
}

/** Due date and the server's own status word — nothing else is known about a task. */
function taskMeta(task: MyHomeworkTask): string {
  const due = formatDate(task.due_date)
  const status = prettyStatus(task.status)
  return [status, due ? `Due ${due}` : 'No due date'].filter(Boolean).join(' · ')
}

/**
 * The next scheduled session, or an honest blank.
 *
 * /me/sessions carries no clinician name and no join link, so neither is shown.
 * A row whose status is still 'requested' is reported as a request, not as a
 * booking — the practice has not confirmed it.
 */
function NextSessionCard({
  value,
  onRetry,
  onRequested,
}: {
  value: Loadable<MySession[]>
  onRetry: () => void
  onRequested: () => void
}) {
  const [formOpen, setFormOpen] = useState(false)
  const [preferredDate, setPreferredDate] = useState('')
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [requested, setRequested] = useState(false)

  const rows = value.state === 'ready' ? value.data : []

  // The soonest session that is still ahead and not cancelled. A row with no
  // scheduled_at cannot be presented as a time, so it is not eligible here.
  const upcoming = useMemo(() => {
    const now = Date.now()
    return rows
      .map((s) => ({ s, t: s.scheduled_at ? new Date(s.scheduled_at).getTime() : Number.NaN }))
      .filter(({ s, t }) => !Number.isNaN(t) && t > now && (s.status ?? '').toLowerCase() !== 'cancelled')
      .sort((a, b) => a.t - b.t)
      .map(({ s }) => s)[0]
  }, [rows])

  // Requests the practice has not put a time against yet.
  const undatedRequests = rows.filter(
    (s) => !s.scheduled_at && (s.status ?? '').toLowerCase() === 'requested',
  ).length

  const submit = async () => {
    setSending(true)
    setRequestError(null)
    try {
      await apiClient.requestMySession({
        preferred_date: preferredDate || null,
        notes: notes.trim() || null,
      })
      setRequested(true)
      setFormOpen(false)
      setPreferredDate('')
      setNotes('')
      onRequested()
    } catch (err) {
      setRequestError(actionFailure(err, 'Your request was not sent'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-organic-accent-600 to-organic-accent-800 rounded-organic-tile p-[22px] text-organic-accent-100">
      <div className="text-xs opacity-85 mb-1">Next session</div>

      {value.state === 'loading' && <Pending what="your schedule" light />}
      {value.state === 'error' && <Failed message={value.message} onRetry={onRetry} light />}

      {value.state === 'ready' && upcoming && (
        <>
          <div className="font-heading text-[1.375rem] mb-0.5">
            {formatDateTime(upcoming.scheduled_at) ?? 'Time not set'}
          </div>
          <div className="text-[0.8125rem] opacity-85">
            {[
              upcoming.session_type,
              upcoming.duration_minutes ? `${upcoming.duration_minutes} min` : null,
              prettyStatus(upcoming.status),
            ]
              .filter(Boolean)
              .join(' · ')}
          </div>
          {(upcoming.status ?? '').toLowerCase() === 'requested' && (
            <div className="text-[0.8125rem] opacity-85 mt-2">
              This is a request you sent. Your practice has not confirmed it yet.
            </div>
          )}
        </>
      )}

      {value.state === 'ready' && !upcoming && (
        <>
          <div className="font-heading text-[1.375rem] mb-0.5">No session scheduled</div>
          <div className="text-[0.8125rem] opacity-85">
            {undatedRequests > 0
              ? `You have ${undatedRequests} session request${undatedRequests === 1 ? '' : 's'} waiting for a time.`
              : 'Nothing is on your calendar right now.'}
          </div>
        </>
      )}

      {value.state === 'ready' && requested && (
        <div className="text-[0.8125rem] opacity-85 mt-2">Request sent to your practice.</div>
      )}

      {requestError && <div className="text-[0.8125rem] mt-2">{requestError}</div>}

      {value.state === 'ready' && !formOpen && (
        <button
          onClick={() => setFormOpen(true)}
          className="rounded-organic-pill bg-organic-accent-100 text-organic-accent-800 font-heading text-[0.8438rem] px-[18px] py-2.5 mt-4 inline-flex items-center gap-2"
        >
          <CalendarPlus size={16} /> Request a session
        </button>
      )}

      {formOpen && (
        <div className="mt-4 flex flex-col gap-2.5">
          <label className="text-xs opacity-85" htmlFor="preferred-date">
            Preferred date (optional)
          </label>
          <input
            id="preferred-date"
            type="date"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            className="rounded-organic-tile px-3 py-2 text-sm text-organic-text bg-organic-neutral-100"
          />
          <label className="text-xs opacity-85" htmlFor="request-notes">
            Anything your practice should know (optional)
          </label>
          <textarea
            id="request-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="rounded-organic-tile px-3 py-2 text-sm text-organic-text bg-organic-neutral-100 resize-none"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={submit}
              disabled={sending}
              className="rounded-organic-pill bg-organic-accent-100 text-organic-accent-800 font-heading text-[0.8438rem] px-[18px] py-2.5 disabled:opacity-60"
            >
              {sending ? 'Sending…' : 'Send request'}
            </button>
            <button onClick={() => setFormOpen(false)} className="text-sm underline opacity-85">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * The check-in itself. mood_score and energy_score are both NOT NULL on the
 * server with a 1..5 CHECK, so both must be chosen by the patient — neither is
 * pre-selected and neither is filled in on their behalf.
 */
function MoodCheckIn({ value, onLogged }: { value: Loadable<MoodEntry[]>; onLogged: () => void }) {
  const [moodScore, setMoodScore] = useState<number | null>(null)
  const [energyScore, setEnergyScore] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const last = value.state === 'ready' && value.data.length > 0 ? value.data[value.data.length - 1] : null

  const submit = async () => {
    if (moodScore === null || energyScore === null || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      await apiClient.logMyMood({
        mood_score: moodScore,
        energy_score: energyScore,
        note: note.trim() || null,
      })
      setSavedAt(new Date().toISOString())
      setMoodScore(null)
      setEnergyScore(null)
      setNote('')
      onLogged()
    } catch (err) {
      setSaveError(actionFailure(err, 'Your check-in was not saved'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-organic-surface rounded-organic-card p-5 shadow-organic-sm">
      <div className="font-heading text-[1.0625rem] mb-3.5">How are you feeling today?</div>

      <div className="flex justify-between gap-1.5">
        {MOOD_SCALE.map((m) => {
          const sel = moodScore === m.score
          return (
            <button
              key={m.score}
              onClick={() => setMoodScore(m.score)}
              aria-pressed={sel}
              className={`flex-1 rounded-organic-tile py-3 flex flex-col items-center gap-1.5 ${sel ? 'bg-organic-accent-200' : 'bg-organic-neutral-100'}`}
            >
              <m.icon size={22} className={sel ? 'text-organic-accent-800' : 'text-organic-neutral-600'} />
              <span className={`text-[0.7812rem] font-semibold ${sel ? 'text-organic-accent-800' : 'text-organic-neutral-600'}`}>
                {m.label}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-4">
        <div className="text-[0.8125rem] font-semibold text-organic-neutral-700 mb-2">
          Energy right now <span className="font-normal text-organic-neutral-600">(1 lowest, 5 highest)</span>
        </div>
        <div className="flex gap-1.5">
          {ENERGY_SCALE.map((n) => {
            const sel = energyScore === n
            return (
              <button
                key={n}
                onClick={() => setEnergyScore(n)}
                aria-pressed={sel}
                className={`flex-1 rounded-organic-pill py-2 text-sm font-semibold ${sel ? 'bg-organic-accent-200 text-organic-accent-800' : 'bg-organic-neutral-100 text-organic-neutral-600'}`}
              >
                {n}
              </button>
            )
          })}
        </div>
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Add a note (optional)"
        className="w-full mt-3 rounded-organic-tile bg-organic-neutral-100 px-3 py-2 text-sm resize-none"
      />

      <button
        onClick={submit}
        disabled={moodScore === null || energyScore === null || saving}
        className="w-full mt-3 rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-[0.8438rem] py-2.5 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Log check-in'}
      </button>

      {saveError && (
        <div className="flex items-start gap-2 mt-2.5">
          <AlertCircle size={16} className="text-organic-danger flex-none mt-0.5" />
          <span className="text-sm text-organic-neutral-800">{saveError}</span>
        </div>
      )}

      {savedAt && !saveError && (
        <div className="text-sm text-organic-neutral-700 mt-2.5">Check-in saved.</div>
      )}

      <div className="text-xs text-organic-neutral-600 mt-3">
        {value.state === 'loading' && 'Loading your check-ins…'}
        {value.state === 'error' && 'Your earlier check-ins could not be loaded.'}
        {value.state === 'ready' &&
          (last
            ? `Last check-in ${formatDate(last.logged_at) ?? 'recorded'}.`
            : 'No check-ins logged in the last 30 days.')}
      </div>
    </div>
  )
}

// ─── Chat (Aria) ────────────────────────────────────────────────────────────

/**
 * The thread starts empty, always. A pre-written conversation in the patient's
 * own voice would be a clinical record they never created, so nothing is seeded
 * here — only turns that actually went to /me/ai-chat and came back are shown.
 */
function ChatTab({
  entries,
  error,
  sending,
  onSend,
}: {
  entries: ChatEntry[]
  error: string | null
  sending: boolean
  onSend: (text: string) => void
}) {
  const [draft, setDraft] = useState('')

  const send = (text: string) => {
    if (!text.trim() || sending) return
    onSend(text)
    setDraft('')
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5 pb-2">
        <div className="w-[42px] h-[42px] rounded-full bg-organic-accent-2-500 grid place-items-center">
          <Sparkles size={20} className="text-organic-accent-2-100" />
        </div>
        <div>
          <div className="font-heading text-lg">Aria</div>
          <div className="text-[0.7812rem] text-organic-accent-2-700">Your AI companion</div>
        </div>
      </div>

      {entries.length === 0 && (
        <div className="bg-organic-surface rounded-organic-card p-5 shadow-organic-sm text-sm text-organic-neutral-700 leading-relaxed">
          There is nothing here yet. Anything you write starts a new conversation — Aria has no earlier
          messages from you.
        </div>
      )}

      {entries.map((m) => (
        <div key={m.id} className={`flex flex-col ${m.role === 'you' ? 'items-end' : 'items-start'}`}>
          <div
            className={`max-w-[78%] px-4 py-3 text-sm leading-relaxed ${
              m.role === 'you'
                ? `bg-organic-accent text-organic-accent-100 rounded-2xl rounded-br-md ${m.failed ? 'opacity-60' : ''}`
                : 'bg-organic-surface text-organic-text rounded-2xl rounded-bl-md'
            }`}
          >
            {m.text}
          </div>
          {m.failed && <span className="text-xs text-organic-danger mt-1">Not delivered</span>}
        </div>
      ))}

      {sending && <div className="text-sm text-organic-neutral-600">Sending…</div>}

      {error && (
        <div className="flex items-start gap-2">
          <AlertCircle size={16} className="text-organic-danger flex-none mt-0.5" />
          <span className="text-sm text-organic-neutral-800">{error}</span>
        </div>
      )}

      {entries.length === 0 && (
        <div className="flex gap-2 flex-wrap mt-0.5">
          {PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => send(p)}
              disabled={sending}
              className="text-[0.7812rem] px-3.5 py-2 rounded-organic-pill bg-organic-surface border border-organic-neutral-300/60 text-organic-neutral-800 disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 py-2 pl-[18px] pr-2 bg-organic-surface border border-organic-neutral-300/60 rounded-organic-pill mt-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              send(draft)
            }
          }}
          placeholder="Share what's on your mind…"
          aria-label="Message Aria"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-organic-neutral-500"
        />
        <button
          onClick={() => send(draft)}
          disabled={!draft.trim() || sending}
          aria-label="Send"
          className="w-[38px] h-[38px] rounded-full bg-organic-accent grid place-items-center flex-none disabled:opacity-50"
        >
          <ArrowUp size={19} className="text-organic-accent-100" />
        </button>
      </div>

      <div className="flex items-center gap-2 justify-center text-[0.7812rem] text-organic-neutral-600 mt-0.5">
        <Shield size={13} /> Aria isn&apos;t a crisis service. In an emergency, call your local line.
      </div>
    </div>
  )
}

// ─── Tasks ──────────────────────────────────────────────────────────────────

function TasksTab({
  value,
  onRetry,
  onChanged,
}: {
  value: Loadable<MyHomeworkTask[]>
  onRetry: () => void
  onChanged: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[1.625rem] font-heading">Your homework</h2>

      {value.state === 'loading' && (
        <div className="bg-organic-surface rounded-organic-tile px-4 py-3 shadow-organic-sm">
          <Pending what="your tasks" />
        </div>
      )}

      {value.state === 'error' && (
        <div className="bg-organic-surface rounded-organic-tile px-4 py-3 shadow-organic-sm">
          <Failed message={value.message} onRetry={onRetry} />
        </div>
      )}

      {value.state === 'ready' && <TaskList tasks={value.data} onChanged={onChanged} />}
    </div>
  )
}

function TaskList({ tasks, onChanged }: { tasks: MyHomeworkTask[]; onChanged: () => void }) {
  if (tasks.length === 0) {
    return (
      <div className="bg-organic-surface rounded-organic-tile px-4 py-3 shadow-organic-sm text-sm text-organic-neutral-700">
        Your therapist has not assigned any tasks yet.
      </div>
    )
  }

  // Counted from the list that was actually returned — never a stored figure.
  const done = tasks.filter(isDone).length

  return (
    <>
      <div className="bg-organic-accent-2-100 rounded-organic-tile px-[18px] py-4 flex items-center gap-3.5">
        <div className="font-heading text-3xl text-organic-accent-2-800">
          {done}/{tasks.length}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-[0.8438rem] text-organic-accent-2-900">
            Marked complete, of everything assigned to you
          </div>
          <div className="h-1.5 rounded-organic-pill bg-organic-accent-2-200 mt-1.5 overflow-hidden">
            <div
              className="h-full bg-organic-accent-2-500"
              style={{ width: `${Math.round((done / tasks.length) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} onChanged={onChanged} />
        ))}
      </div>
    </>
  )
}

function TaskRow({ task, onChanged }: { task: MyHomeworkTask; onChanged: () => void }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const complete = isDone(task)

  const submit = async () => {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      await apiClient.submitMyHomework(task.id, { completion_notes: note.trim() || null })
      setOpen(false)
      setNote('')
      onChanged()
    } catch (err) {
      setError(actionFailure(err, 'That task was not marked complete'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-organic-surface rounded-organic-tile p-3.5 shadow-organic-sm">
      <button
        onClick={() => !complete && setOpen((o) => !o)}
        disabled={complete}
        className="w-full flex items-center gap-3.5 text-left disabled:cursor-default"
      >
        <span
          className={`w-[26px] h-[26px] rounded-full flex-none grid place-items-center border-2 ${complete ? 'bg-organic-accent-2-500 border-organic-accent-2-500' : 'border-organic-neutral-400'}`}
        >
          {complete && <Check size={14} className="text-organic-accent-2-100" />}
        </span>
        <div className="flex-1 min-w-0">
          <div className={`font-semibold text-sm ${complete ? 'text-organic-neutral-500 line-through' : 'text-organic-text'}`}>
            {task.title ?? 'Untitled task'}
          </div>
          <div className="text-xs text-organic-neutral-600">{taskMeta(task)}</div>
        </div>
        {task.task_type && (
          <span className="text-[0.7812rem] px-2.5 py-0.5 rounded-organic-pill bg-organic-neutral-200 text-organic-neutral-700 flex-none">
            {task.task_type}
          </span>
        )}
        {!complete &&
          (open ? (
            <ChevronUp size={18} className="text-organic-neutral-500 flex-none" />
          ) : (
            <ChevronDown size={18} className="text-organic-neutral-500 flex-none" />
          ))}
      </button>

      {open && !complete && (
        <div className="mt-3 pl-[40px] flex flex-col gap-2.5">
          {task.description && <p className="text-sm text-organic-neutral-700 leading-relaxed">{task.description}</p>}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="How did it go? (optional)"
            className="rounded-organic-tile bg-organic-neutral-100 px-3 py-2 text-sm resize-none"
          />
          <button
            onClick={submit}
            disabled={saving}
            className="self-start rounded-organic-pill bg-organic-accent-2-500 text-organic-accent-2-100 font-heading text-[0.8438rem] px-[18px] py-2 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Mark complete'}
          </button>
          {error && (
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-organic-danger flex-none mt-0.5" />
              <span className="text-sm text-organic-neutral-800">{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Progress ───────────────────────────────────────────────────────────────

function ProgressTab({
  mood,
  onRetryMood,
  assessments,
  onRetryAssessments,
  homework,
  sessions,
  onRetrySessions,
}: {
  mood: Loadable<MoodEntry[]>
  onRetryMood: () => void
  assessments: Loadable<MyAssessmentResult[]>
  onRetryAssessments: () => void
  homework: Loadable<MyHomeworkTask[]>
  sessions: Loadable<MySession[]>
  onRetrySessions: () => void
}) {
  const checkIns = mood.state === 'ready' ? String(mood.data.length) : mood.state === 'loading' ? '…' : '—'
  const tasksDone =
    homework.state === 'ready'
      ? `${homework.data.filter(isDone).length}/${homework.data.length}`
      : homework.state === 'loading'
      ? '…'
      : '—'

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[1.625rem] font-heading">Your progress</h2>

      {/* Both tiles are counted from the lists on this screen. Neither is a
          streak or a stored total — nothing in the API reports one. */}
      <div className="flex gap-3">
        <div className="flex-1 bg-organic-surface rounded-organic-tile p-4 shadow-organic-sm">
          <div className="font-heading text-[1.75rem] text-organic-accent-700">{checkIns}</div>
          <div className="text-xs text-organic-neutral-600">
            {mood.state === 'error' ? 'Check-ins — did not load' : 'Check-ins, last 30 days'}
          </div>
        </div>
        <div className="flex-1 bg-organic-surface rounded-organic-tile p-4 shadow-organic-sm">
          <div className="font-heading text-[1.75rem] text-organic-accent-2-700">{tasksDone}</div>
          <div className="text-xs text-organic-neutral-600">
            {homework.state === 'error' ? 'Tasks — did not load' : 'Tasks marked complete'}
          </div>
        </div>
      </div>

      <div className="bg-organic-surface rounded-organic-card p-5 shadow-organic-sm">
        <h3 className="text-[1.0625rem] font-heading mb-3.5">Your mood check-ins</h3>
        {mood.state === 'loading' && <Pending what="your check-ins" />}
        {mood.state === 'error' && <Failed message={mood.message} onRetry={onRetryMood} />}
        {mood.state === 'ready' && <MoodTrend entries={mood.data} />}
      </div>

      <div className="bg-organic-surface rounded-organic-card p-5 shadow-organic-sm">
        <h3 className="text-[1.0625rem] font-heading mb-3.5">Assessment results</h3>
        {assessments.state === 'loading' && <Pending what="your results" />}
        {assessments.state === 'error' && <Failed message={assessments.message} onRetry={onRetryAssessments} />}
        {assessments.state === 'ready' && <AssessmentResults results={assessments.data} />}
      </div>

      <div className="bg-organic-surface rounded-organic-card p-5 shadow-organic-sm">
        <h3 className="text-[1.0625rem] font-heading mb-3.5">Session history</h3>
        {sessions.state === 'loading' && <Pending what="your sessions" />}
        {sessions.state === 'error' && <Failed message={sessions.message} onRetry={onRetrySessions} />}
        {sessions.state === 'ready' && <SessionHistory rows={sessions.data} />}
      </div>
    </div>
  )
}

/**
 * The mood line, drawn only from logged points and positioned by the time each
 * one was logged. With fewer than two points there is no trend to draw, and the
 * card says so rather than showing a shape.
 */
function MoodTrend({ entries }: { entries: MoodEntry[] }) {
  const points = useMemo(
    () =>
      entries
        .map((e) => ({ t: new Date(e.logged_at).getTime(), v: e.mood_score }))
        .filter((p) => !Number.isNaN(p.t) && typeof p.v === 'number')
        .sort((a, b) => a.t - b.t),
    [entries],
  )

  if (points.length === 0) {
    return (
      <p className="text-sm text-organic-neutral-700">
        You haven&apos;t logged a check-in in the last 30 days. Log one on the Home tab and it will appear here.
      </p>
    )
  }

  if (points.length === 1) {
    const only = points[0]
    return (
      <p className="text-sm text-organic-neutral-700">
        One check-in so far — {only.v} out of 5 on {formatDate(new Date(only.t).toISOString())}. A line needs at
        least two.
      </p>
    )
  }

  const W = 320
  const H = 130
  const PAD = 14
  const first = points[0].t
  const last = points[points.length - 1].t
  const span = last - first
  const inner = W - PAD * 2

  const coords = points.map((p, i) => {
    const x = span > 0 ? PAD + ((p.t - first) / span) * inner : PAD + (i / (points.length - 1)) * inner
    const clamped = Math.min(5, Math.max(1, p.v))
    const y = H - PAD - ((clamped - 1) / 4) * (H - PAD * 2)
    return { x, y }
  })

  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
  const area = `${line} L${coords[coords.length - 1].x.toFixed(1)},${H} L${coords[0].x.toFixed(1)},${H} Z`

  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[130px]" role="img" aria-label="Your logged mood scores over time">
        <defs>
          <linearGradient id="patientMoodTrend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c9903d" stopOpacity="0.3" />
            <stop offset="1" stopColor="#c9903d" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#patientMoodTrend)" />
        <path d={line} fill="none" stroke="#c9903d" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={3.5} fill="#c9903d" />
        ))}
      </svg>
      <div className="flex justify-between text-xs text-organic-neutral-600 mt-1">
        <span>{formatDate(new Date(first).toISOString())}</span>
        <span>{formatDate(new Date(last).toISOString())}</span>
      </div>
      <div className="text-xs text-organic-neutral-600 mt-2">
        {points.length} check-ins, scored 1 (Low) to 5 (Great).
      </div>
    </>
  )
}

/**
 * Assessment results, exactly as scored.
 *
 * The instrument label is the identifier the result was stored under; the
 * server sends no display name, so nothing is substituted for it. There is no
 * maximum score in the response either, which is why no proportion bar is
 * drawn. A previous score is shown only when a second real result for the same
 * instrument exists, and it is shown as the two numbers and their dates — this
 * screen does not tell a patient their mental health is improving.
 */
function AssessmentResults({ results }: { results: MyAssessmentResult[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, MyAssessmentResult[]>()
    for (const r of results) {
      const key = r.template_id ?? 'unknown'
      const bucket = map.get(key)
      if (bucket) bucket.push(r)
      else map.set(key, [r])
    }
    // The endpoint orders results newest first, so index 0 of each bucket is
    // the most recent one.
    return Array.from(map.entries())
  }, [results])

  if (results.length === 0) {
    // Worded as a fact about this screen, not about the chart. GET /me/assessments
    // reads the `assessment_results` table, and nothing in the backend ever
    // writes to it — scored assessments are INSERTed into `assessment_instances`
    // (backend/src/repositories/assessment_repository_db_real.py:114). So an
    // empty list here is not evidence that no assessment was scored, and this
    // screen must not tell a patient that none was.
    return (
      <p className="text-sm text-organic-neutral-700">
        There are no results to show here. If you have completed an assessment and expected to see it, ask your
        therapist — they hold the full record, and this screen may not have it.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {grouped.map(([key, rows]) => {
        const latest = rows[0]
        const previous = rows.length > 1 ? rows[1] : null
        const canCompare =
          previous !== null &&
          typeof latest.score_total === 'number' &&
          typeof previous.score_total === 'number'

        return (
          <div key={key} className="border-b border-organic-neutral-300/50 pb-3.5 last:border-b-0 last:pb-0">
            <div className="flex justify-between items-baseline gap-2">
              <span className="font-semibold text-[0.8125rem] uppercase truncate">
                {latest.template_id ?? 'Unnamed instrument'}
              </span>
              <span className="text-organic-neutral-800 text-[0.8125rem] flex-none">
                {typeof latest.score_total === 'number' ? latest.score_total : '—'}
                {latest.severity_band ? ` · ${latest.severity_band}` : ''}
              </span>
            </div>
            <div className="text-xs text-organic-neutral-600 mt-0.5">
              {formatDate(latest.taken_at) ?? 'Date not recorded'}
            </div>
            {latest.interpretation_text && (
              <p className="text-sm text-organic-neutral-700 mt-1.5 leading-relaxed">{latest.interpretation_text}</p>
            )}
            {canCompare && previous && (
              <div className="text-xs text-organic-neutral-600 mt-1.5">
                Previous result: {previous.score_total}
                {previous.severity_band ? ` · ${previous.severity_band}` : ''} on{' '}
                {formatDate(previous.taken_at) ?? 'an unrecorded date'}.
              </div>
            )}
            {rows.length === 1 && (
              <div className="text-xs text-organic-neutral-600 mt-1.5">
                This is your only recorded result for this measure, so there is nothing to compare it with.
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** The session rows the server returned — at most its 20 most recent. */
function SessionHistory({ rows }: { rows: MySession[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-organic-neutral-700">No sessions have been recorded for you yet.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((s) => (
        <div key={s.id} className="border-b border-organic-neutral-300/50 pb-3 last:border-b-0 last:pb-0">
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-sm font-semibold">
              {formatDate(s.scheduled_at) ?? 'No date set'}
            </span>
            <span className="text-xs text-organic-neutral-700 flex-none">{prettyStatus(s.status) ?? '—'}</span>
          </div>
          <div className="text-xs text-organic-neutral-600 mt-0.5">
            {[s.session_type, s.duration_minutes ? `${s.duration_minutes} min` : null].filter(Boolean).join(' · ') ||
              'No details recorded'}
          </div>
          {s.summary_snippet && (
            <p className="text-sm text-organic-neutral-700 mt-1.5 leading-relaxed">{s.summary_snippet}</p>
          )}
        </div>
      ))}
      {rows.length === 20 && (
        <div className="text-xs text-organic-neutral-600">
          Showing the 20 most recent records the server returns.
        </div>
      )}
    </div>
  )
}
