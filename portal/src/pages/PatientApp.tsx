import { useState } from 'react'
import {
  Bell,
  Sparkles,
  ArrowRight,
  PenLine,
  AudioLines,
  ChevronRight,
  Shield,
  ArrowUp,
  Home,
  MessageCircle,
  ListChecks,
  LineChart,
  Check,
  Frown,
  Annoyed,
  Meh,
  Smile,
  Laugh,
} from 'lucide-react'

type Tab = 'home' | 'chat' | 'tasks' | 'progress'

const TABS: { tab: Tab; label: string; icon: typeof Home }[] = [
  { tab: 'home', label: 'Home', icon: Home },
  { tab: 'chat', label: 'Aria', icon: MessageCircle },
  { tab: 'tasks', label: 'Tasks', icon: ListChecks },
  { tab: 'progress', label: 'Progress', icon: LineChart },
]

const MOODS: { icon: typeof Frown; label: string }[] = [
  { icon: Frown, label: 'Low' },
  { icon: Annoyed, label: 'Meh' },
  { icon: Meh, label: 'Okay' },
  { icon: Smile, label: 'Good' },
  { icon: Laugh, label: 'Great' },
]

function greeting() {
  const hr = new Date().getHours()
  return hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'
}

export default function PatientApp() {
  const [tab, setTab] = useState<Tab>('home')
  const [mood, setMood] = useState(2)

  return (
    <div
      className="min-h-screen flex justify-center items-start p-4 pt-6"
      style={{ background: 'radial-gradient(circle at 30% 0%, #eceef3, #d9dce4)' }}
    >
      <div className="w-full max-w-[412px] bg-organic-bg rounded-[38px] shadow-organic-lg overflow-hidden relative min-h-[812px] flex flex-col">
        <div className="px-[22px] pt-[22px] pb-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-[42px] h-[42px] rounded-full bg-organic-accent-300 grid place-items-center font-bold text-organic-accent-900">MO</div>
            <div className="leading-tight">
              <div className="text-xs text-organic-neutral-600">{greeting()}</div>
              <div className="font-heading text-lg">Maya</div>
            </div>
          </div>
          <button className="w-10 h-10 rounded-full border border-organic-neutral-300/60 bg-organic-surface grid place-items-center relative">
            <Bell size={18} />
            <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-organic-accent" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-[108px] pt-1.5">
          {tab === 'home' && <HomeTab onGoChat={() => setTab('chat')} onGoTasks={() => setTab('tasks')} mood={mood} setMood={setMood} />}
          {tab === 'chat' && <ChatTab />}
          {tab === 'tasks' && <TasksTab />}
          {tab === 'progress' && <ProgressTab />}
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 border-t border-organic-neutral-300/50 px-[18px] pt-3 pb-[22px] flex justify-between"
          style={{ background: 'rgba(247, 248, 250, 0.92)', backdropFilter: 'blur(10px)' }}
        >
          {TABS.map(({ tab: t, label, icon: Icon }) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 flex flex-col items-center gap-1 ${t === tab ? 'text-organic-accent' : 'text-organic-neutral-500'}`}
            >
              <Icon size={23} />
              <span className={`text-[10.5px] ${t === tab ? 'font-bold' : 'font-medium'}`}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Home ───────────────────────────────────────────────────────────────────

const HOME_TASKS = [
  { icon: PenLine, title: 'CBT thought record', meta: 'Worksheet · 10 min' },
  { icon: AudioLines, title: 'Evening breathing', meta: 'Audio · 6 min' },
]

function HomeTab({ onGoChat, onGoTasks, mood, setMood }: { onGoChat: () => void; onGoTasks: () => void; mood: number; setMood: (m: number) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-gradient-to-br from-organic-accent-600 to-organic-accent-800 rounded-organic-tile p-[22px] text-organic-accent-100 relative overflow-hidden">
        <div className="relative">
          <div className="text-xs opacity-85 mb-1">Next session</div>
          <div className="font-heading text-[22px] mb-0.5">Thursday · 10:00 AM</div>
          <div className="text-[13px] opacity-85 mb-4">with Dr. Heba Moustafa · video call</div>
          <button className="rounded-organic-pill bg-organic-accent-100 text-organic-accent-800 font-heading text-[13.5px] px-[18px] py-2.5">
            Join &amp; prepare
          </button>
        </div>
      </div>

      <div className="bg-organic-surface rounded-organic-card p-5 shadow-organic-sm">
        <div className="font-heading text-[17px] mb-3.5">How are you feeling today?</div>
        <div className="flex justify-between gap-1.5">
          {MOODS.map((m, i) => {
            const sel = mood === i
            return (
              <button
                key={m.label}
                onClick={() => setMood(i)}
                className={`flex-1 rounded-organic-tile py-3 flex flex-col items-center gap-1.5 ${sel ? 'bg-organic-accent-200' : 'bg-organic-neutral-100'}`}
              >
                <m.icon size={22} className={sel ? 'text-organic-accent-800' : 'text-organic-neutral-600'} />
                <span className={`text-[10.5px] font-semibold ${sel ? 'text-organic-accent-800' : 'text-organic-neutral-600'}`}>{m.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2.5">
          <h3 className="text-lg font-heading">Today&apos;s tasks</h3>
          <button onClick={onGoTasks} className="text-[12.5px] text-organic-accent">See all</button>
        </div>
        <div className="flex flex-col gap-2.5">
          {HOME_TASKS.map((t) => (
            <div key={t.title} className="flex items-center gap-3.5 bg-organic-surface rounded-organic-tile p-3.5 shadow-organic-sm">
              <div className="w-10 h-10 rounded-organic-tile bg-organic-accent-100 grid place-items-center flex-none">
                <t.icon size={19} className="text-organic-accent-700" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm">{t.title}</div>
                <div className="text-xs text-organic-neutral-600">{t.meta}</div>
              </div>
              <ChevronRight size={18} className="text-organic-neutral-500" />
            </div>
          ))}
        </div>
      </div>

      <button onClick={onGoChat} className="bg-organic-accent-2-100 rounded-organic-tile p-[18px] flex items-center gap-3.5 text-left">
        <div className="w-[46px] h-[46px] rounded-full bg-organic-accent-2-500 grid place-items-center flex-none">
          <Sparkles size={22} className="text-organic-accent-2-100" />
        </div>
        <div className="flex-1">
          <div className="font-heading text-base text-organic-accent-2-900">Talk to Aria</div>
          <div className="text-[12.5px] text-organic-accent-2-800">Your AI companion, here anytime</div>
        </div>
        <ArrowRight size={19} className="text-organic-accent-2-700" />
      </button>
    </div>
  )
}

// ─── Chat (Aria) ────────────────────────────────────────────────────────────

const CHAT_MESSAGES = [
  { who: 'ai', text: "Hi Maya, I'm glad you're here. How has your week felt so far?" },
  { who: 'me', text: "A bit up and down. Work has been stressful and I haven't slept well." },
  { who: 'ai', text: "That sounds draining. When your sleep dips, what tends to be on your mind as you're lying awake?" },
  { who: 'me', text: "Mostly worrying I'll fall behind on everything." },
]
const CHIPS = ['I feel anxious', 'Help me reframe this', 'A grounding exercise']

function ChatTab() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5 pb-2">
        <div className="w-[42px] h-[42px] rounded-full bg-organic-accent-2-500 grid place-items-center">
          <Sparkles size={20} className="text-organic-accent-2-100" />
        </div>
        <div>
          <div className="font-heading text-lg">Aria</div>
          <div className="text-[11.5px] text-organic-accent-2-700">● Always here to listen</div>
        </div>
      </div>
      {CHAT_MESSAGES.map((m, i) => (
        <div key={i} className={`flex ${m.who === 'me' ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[78%] px-4 py-3 text-sm leading-relaxed ${
              m.who === 'me'
                ? 'bg-organic-accent text-organic-accent-100 rounded-2xl rounded-br-md'
                : 'bg-organic-surface text-organic-text rounded-2xl rounded-bl-md'
            }`}
          >
            {m.text}
          </div>
        </div>
      ))}
      <div className="flex gap-2 flex-wrap mt-0.5">
        {CHIPS.map((c) => (
          <span key={c} className="text-[12.5px] px-3.5 py-2 rounded-organic-pill bg-organic-surface border border-organic-neutral-300/60 text-organic-neutral-800">
            {c}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2 py-2 pl-[18px] pr-2 bg-organic-surface border border-organic-neutral-300/60 rounded-organic-pill mt-1.5">
        <span className="flex-1 text-sm text-organic-neutral-500">Share what&apos;s on your mind…</span>
        <button className="w-[38px] h-[38px] rounded-full bg-organic-accent grid place-items-center">
          <ArrowUp size={19} className="text-organic-accent-100" />
        </button>
      </div>
      <div className="flex items-center gap-2 justify-center text-[11px] text-organic-neutral-600 mt-0.5">
        <Shield size={13} /> Aria isn&apos;t a crisis service. In an emergency, call your local line.
      </div>
    </div>
  )
}

// ─── Tasks ──────────────────────────────────────────────────────────────────

const TASKS = [
  { title: 'Gratitude journal', meta: 'Completed today', type: 'Journal', done: true },
  { title: 'CBT thought record', meta: 'Due today', type: 'Worksheet', done: false },
  { title: 'Evening breathing', meta: 'Due today', type: 'Audio', done: false },
  { title: 'Read: Understanding worry', meta: 'Due Fri', type: 'Reading', done: false },
  { title: 'Morning walk log', meta: 'Completed yesterday', type: 'Activity', done: true },
]

function TasksTab() {
  const completed = TASKS.filter((t) => t.done).length
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[26px] font-heading">Your homework</h2>
      <div className="bg-organic-accent-2-100 rounded-organic-tile px-[18px] py-4 flex items-center gap-3.5">
        <div className="font-heading text-3xl text-organic-accent-2-800">{completed}/{TASKS.length}</div>
        <div className="flex-1">
          <div className="font-semibold text-[13.5px] text-organic-accent-2-900">Completed this week</div>
          <div className="h-1.5 rounded-organic-pill bg-organic-accent-2-200 mt-1.5 overflow-hidden">
            <div className="h-full bg-organic-accent-2-500" style={{ width: `${(completed / TASKS.length) * 100}%` }} />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        {TASKS.map((t) => (
          <div key={t.title} className="flex items-center gap-3.5 bg-organic-surface rounded-organic-tile p-3.5 shadow-organic-sm">
            <span className={`w-[26px] h-[26px] rounded-full flex-none grid place-items-center border-2 ${t.done ? 'bg-organic-accent-2-500 border-organic-accent-2-500' : 'border-organic-neutral-400'}`}>
              {t.done && <Check size={14} className="text-organic-accent-2-100" />}
            </span>
            <div className="flex-1">
              <div className={`font-semibold text-sm ${t.done ? 'text-organic-neutral-500 line-through' : 'text-organic-text'}`}>{t.title}</div>
              <div className="text-xs text-organic-neutral-600">{t.meta}</div>
            </div>
            <span className="text-[10.5px] px-2.5 py-0.5 rounded-organic-pill bg-organic-neutral-200 text-organic-neutral-700">{t.type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Progress ───────────────────────────────────────────────────────────────

const SCORES = [
  { name: 'PHQ-9 (depression)', now: 14, band: 'Mod. severe', delta: '↓ from 18', pct: 52, color: 'bg-organic-accent-500' },
  { name: 'GAD-7 (anxiety)', now: 11, band: 'Moderate', delta: '↓ from 15', pct: 52, color: 'bg-organic-accent-2-500' },
]

function ProgressTab() {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[26px] font-heading">Your progress</h2>
      <div className="flex gap-3">
        <div className="flex-1 bg-organic-surface rounded-organic-tile p-4 shadow-organic-sm">
          <div className="font-heading text-[28px] text-organic-accent-700">12</div>
          <div className="text-xs text-organic-neutral-600">Day streak</div>
        </div>
        <div className="flex-1 bg-organic-surface rounded-organic-tile p-4 shadow-organic-sm">
          <div className="font-heading text-[28px] text-organic-accent-2-700">8</div>
          <div className="text-xs text-organic-neutral-600">Sessions done</div>
        </div>
      </div>
      <div className="bg-organic-surface rounded-organic-card p-5 shadow-organic-sm">
        <div className="flex justify-between items-center mb-3.5">
          <h3 className="text-[17px] font-heading">Mood this month</h3>
          <span className="text-[11px] text-organic-accent-2-700 font-semibold">Trending up</span>
        </div>
        <svg viewBox="0 0 320 130" className="w-full h-[130px]">
          <defs>
            <linearGradient id="patientMood" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#c9903d" stopOpacity="0.3" />
              <stop offset="1" stopColor="#c9903d" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,90 L53,96 L106,72 L160,80 L213,54 L266,58 L320,34 L320,130 L0,130 Z" fill="url(#patientMood)" />
          <path d="M0,90 L53,96 L106,72 L160,80 L213,54 L266,58 L320,34" fill="none" stroke="#c9903d" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="bg-organic-surface rounded-organic-card p-5 shadow-organic-sm">
        <h3 className="text-[17px] font-heading mb-3.5">Assessment scores</h3>
        <div className="flex flex-col gap-3.5">
          {SCORES.map((s) => (
            <div key={s.name}>
              <div className="flex justify-between text-[13px] mb-1.5">
                <span className="font-semibold">{s.name}</span>
                <span className="text-organic-neutral-700">
                  {s.now} · {s.band} <span className="text-organic-accent-2-700">{s.delta}</span>
                </span>
              </div>
              <div className="h-2 rounded-organic-pill bg-organic-neutral-200 overflow-hidden">
                <div className={`h-full ${s.color}`} style={{ width: `${s.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
