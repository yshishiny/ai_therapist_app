import { useState } from 'react'
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
} from 'lucide-react'

type WorkspaceView = 'caseload' | 'chart' | 'scribe' | 'plan'

const NAV_ITEMS: { view: WorkspaceView; label: string; short: string; icon: typeof LayoutGrid }[] = [
  { view: 'caseload', label: 'Caseload', short: 'Home', icon: LayoutGrid },
  { view: 'chart', label: 'Patient chart', short: 'Chart', icon: FolderOpen },
  { view: 'scribe', label: 'AI Scribe', short: 'Scribe', icon: Mic },
  { view: 'plan', label: 'Care plan', short: 'Plan', icon: ListChecks },
]

const TITLES: Record<WorkspaceView, string> = {
  caseload: 'Good morning, Dr. Nasser',
  chart: 'Patient chart',
  scribe: 'AI Scribe',
  plan: 'Care plan',
}
const SUBTITLES: Record<WorkspaceView, string> = {
  caseload: 'Thursday, July 24 · 6 sessions today',
  chart: 'Maya Okonkwo · clinical record',
  scribe: 'Live documentation assistant',
  plan: 'Phased treatment & homework',
}

export default function ClinicianWorkspace() {
  const [view, setView] = useState<WorkspaceView>('caseload')
  const goToChart = () => setView('chart')

  return (
    <div className="min-h-screen bg-organic-bg flex items-stretch">
      <IconRail view={view} onChange={setView} />

      <main className="flex-1 min-w-0 px-9 pt-8 pb-16 max-w-[1240px]">
        <header className="flex justify-between items-end gap-5 flex-wrap mb-7">
          <div>
            <h1 className="text-[34px] font-heading text-organic-text mb-1">{TITLES[view]}</h1>
            <p className="text-organic-neutral-600 text-sm">{SUBTITLES[view]}</p>
          </div>
          <div className="flex gap-2.5 items-center">
            <div className="flex items-center gap-2 bg-organic-surface border border-organic-neutral-300/60 rounded-organic-pill px-3.5 py-2 min-w-[190px]">
              <Search size={16} className="text-organic-neutral-500" />
              <span className="text-sm text-organic-neutral-500">Find patient…</span>
            </div>
            <button className="rounded-organic-pill bg-organic-accent text-organic-accent-100 font-heading text-sm px-[18px] py-2.5 inline-flex items-center gap-1.5 hover:bg-organic-accent-600 transition-colors">
              <Plus size={16} /> New session
            </button>
          </div>
        </header>

        {view === 'caseload' && <CaseloadView onOpenPatient={goToChart} />}
        {view === 'chart' && <ChartView />}
        {view === 'scribe' && <ScribeView />}
        {view === 'plan' && <PlanView />}
      </main>
    </div>
  )
}

// ─── Icon rail ────────────────────────────────────────────────────────────

function IconRail({ view, onChange }: { view: WorkspaceView; onChange: (v: WorkspaceView) => void }) {
  return (
    <aside className="flex-none w-[84px] bg-organic-neutral-100 border-r border-organic-neutral-300/50 py-[22px] flex flex-col items-center gap-2 sticky top-0 h-screen">
      <div className="w-11 h-11 rounded-organic-tile bg-organic-accent grid place-items-center text-organic-accent-100 mb-3.5">
        <Brain size={22} />
      </div>
      {NAV_ITEMS.map(({ view: v, label, short, icon: Icon }) => {
        const active = v === view
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
      <div className="mt-auto w-10 h-10 rounded-full bg-organic-accent-2-200 grid place-items-center text-xs font-bold text-organic-accent-2-800">
        ON
      </div>
    </aside>
  )
}

// ─── Caseload ─────────────────────────────────────────────────────────────

const STATS = [
  { label: 'Today', value: '6', icon: Calendar },
  { label: 'My patients', value: '41', icon: UsersRound },
  { label: 'Notes due', value: '3', icon: FileEdit },
]

const RISK_STYLE: Record<string, { color: string; bg: string }> = {
  High: { color: 'text-organic-accent-800', bg: 'bg-organic-accent-200' },
  Med: { color: 'text-organic-accent-2-800', bg: 'bg-organic-accent-2-200' },
  Low: { color: 'text-organic-neutral-700', bg: 'bg-organic-neutral-200' },
}

const SCHEDULE = [
  { time: '09:00', name: 'Tomas Ruiz', initials: 'TR', kind: 'Intake · in person', risk: 'Low' },
  { time: '10:00', name: 'Maya Okonkwo', initials: 'MO', kind: 'Follow-up · video', risk: 'High' },
  { time: '11:30', name: 'Sara Farouk', initials: 'SF', kind: 'Follow-up · video', risk: 'High' },
  { time: '14:00', name: 'Grace Kim', initials: 'GK', kind: 'CBT session · in person', risk: 'Med' },
]

const FLAGS = [
  { name: 'Maya Okonkwo', detail: 'PHQ-9 item 9 elevated — review safety plan' },
  { name: 'Sara Farouk', detail: 'GAD-7 rose to 19 since last week' },
]

const TODOS = ['Sign session note · D. Alvarez', 'Send GAD-7 to L. Petrova', 'Review AI summary · G. Kim']

function CaseloadView({ onOpenPatient }: { onOpenPatient: () => void }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-4">
      <div>
        <div className="grid grid-cols-3 gap-3.5 mb-4">
          {STATS.map((st) => (
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
            {SCHEDULE.map((s) => (
              <button
                key={s.time}
                onClick={onOpenPatient}
                className="flex items-center gap-3.5 py-3 px-1 border-b border-organic-text/[0.07] last:border-b-0 text-left"
              >
                <span className="text-sm font-bold text-organic-accent-700 w-14">{s.time}</span>
                <div className="w-9 h-9 rounded-full bg-organic-accent-200 grid place-items-center text-[11px] font-bold text-organic-accent-800">
                  {s.initials}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-organic-text">{s.name}</div>
                  <div className="text-xs text-organic-neutral-600">{s.kind}</div>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-organic-pill ${RISK_STYLE[s.risk].bg} ${RISK_STYLE[s.risk].color}`}>
                  {s.risk}
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
            {FLAGS.map((f) => (
              <div key={f.name} className="bg-organic-bg rounded-organic-tile p-3">
                <div className="font-semibold text-[13.5px] text-organic-text">{f.name}</div>
                <div className="text-xs text-organic-neutral-700">{f.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-organic-surface rounded-organic-card p-5 shadow-organic-sm">
          <h3 className="text-[17px] font-heading text-organic-text mb-3">Tasks</h3>
          <div className="flex flex-col gap-2.5">
            {TODOS.map((t) => (
              <div key={t} className="flex items-center gap-2.5 text-[13.5px] text-organic-text">
                <span className="w-5 h-5 rounded-[6px] border-2 border-organic-neutral-400 flex-none" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Patient chart ──────────────────────────────────────────────────────────

const SESSION_HISTORY = [
  { title: 'Session 08 — CBT reframing', date: 'Jul 17, 2026', tag: 'Signed' },
  { title: 'Session 07 — Sleep & rumination', date: 'Jul 10, 2026', tag: 'Signed' },
  { title: 'Session 06 — Behavioral activation', date: 'Jul 3, 2026', tag: 'Signed' },
]

function ChartView() {
  return (
    <div>
      <div className="flex items-center gap-3.5 mb-[18px]">
        <div className="w-[52px] h-[52px] rounded-full bg-organic-accent-200 grid place-items-center font-bold text-base text-organic-accent-800">
          MO
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <span className="font-heading text-[22px] text-organic-text">Maya Okonkwo</span>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-organic-pill bg-organic-accent-200 text-organic-accent-800">
              High risk
            </span>
          </div>
          <div className="text-sm text-organic-neutral-600">34F · In treatment · 8 sessions · since Feb 2026</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <div className="flex flex-col gap-4">
          <div className="bg-organic-surface rounded-organic-card p-[22px] shadow-organic-sm">
            <h3 className="text-lg font-heading text-organic-text mb-3.5">Symptom trajectory</h3>
            <svg viewBox="0 0 560 180" className="w-full h-[180px]">
              <defs>
                <linearGradient id="trajectoryFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#5262ad" stopOpacity="0.28" />
                  <stop offset="1" stopColor="#5262ad" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,40 L110,54 L220,70 L330,86 L440,110 L560,120 L560,180 L0,180 Z" fill="url(#trajectoryFill)" />
              <path
                d="M0,40 L110,54 L220,70 L330,86 L440,110 L560,120"
                fill="none"
                stroke="#5262ad"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M0,90 L110,84 L220,96 L330,88 L440,100 L560,94"
                fill="none"
                stroke="#c9903d"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="1 8"
              />
            </svg>
            <div className="flex gap-5 mt-1.5 text-xs text-organic-neutral-600">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-[3px] bg-organic-accent rounded-sm" />
                PHQ-9
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-[3px] bg-organic-accent-2 rounded-sm" />
                GAD-7
              </span>
            </div>
          </div>

          <div className="bg-organic-surface rounded-organic-card p-[22px] shadow-organic-sm">
            <h3 className="text-lg font-heading text-organic-text mb-3">Session history</h3>
            <div className="flex flex-col">
              {SESSION_HISTORY.map((s) => (
                <div key={s.title} className="flex items-center gap-3.5 py-3 px-1 border-b border-organic-text/[0.07] last:border-b-0">
                  <FileText size={17} className="text-organic-accent-600" />
                  <div className="flex-1">
                    <div className="font-semibold text-[13.5px] text-organic-text">{s.title}</div>
                    <div className="text-xs text-organic-neutral-600">{s.date}</div>
                  </div>
                  <span className="text-[11.5px] text-organic-neutral-600">{s.tag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-3.5">
          <div className="bg-gradient-to-br from-organic-accent-100 to-organic-surface rounded-organic-card p-5 shadow-organic-sm">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={17} className="text-organic-accent-700" />
              <h4 className="text-base font-heading text-organic-text">AI summary</h4>
            </div>
            <p className="text-[13px] text-organic-neutral-800 leading-relaxed mb-3">
              Depression improving steadily (18→14); anxiety stable. Item 9 elevated — maintain weekly safety
              check-ins. Client reports better sleep with breathing homework.
            </p>
            <div className="flex gap-2 flex-wrap">
              <span className="text-[11px] px-2.5 py-1 rounded-organic-pill bg-organic-accent-200 text-organic-accent-800">CBT</span>
              <span className="text-[11px] px-2.5 py-1 rounded-organic-pill bg-organic-accent-2-200 text-organic-accent-2-800">
                Safety plan active
              </span>
            </div>
          </div>

          <div className="bg-organic-surface rounded-organic-card p-5 shadow-organic-sm">
            <h4 className="text-base font-heading text-organic-text mb-3">Latest scores</h4>
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between">
                <span className="text-sm text-organic-neutral-700">PHQ-9</span>
                <span className="font-bold text-organic-accent-700">14 · Mod. severe</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-organic-neutral-700">GAD-7</span>
                <span className="font-bold text-organic-accent-2-700">11 · Moderate</span>
              </div>
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
  return (
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
  return (
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
  )
}
