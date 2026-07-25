import { useState } from 'react'
import { Badge, ProgressBar } from '../components/OrganicUI'
import { Heart, MessageCircle, CheckSquare2, TrendingUp, Send, SmilePlus } from 'lucide-react'

type PatientTab = 'home' | 'aria' | 'tasks' | 'progress'

interface Message {
  id: string
  sender: 'user' | 'aria'
  text: string
  timestamp: string
}

export default function PatientApp() {
  const [currentTab, setCurrentTab] = useState<PatientTab>('home')
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'aria', text: 'Hi! How are you feeling today?', timestamp: '10:30 AM' },
    { id: '2', sender: 'user', text: 'Better than yesterday, thanks for asking', timestamp: '10:31 AM' },
    { id: '3', sender: 'aria', text: "That's wonderful! Keep up the good work with those breathing exercises.", timestamp: '10:32 AM' },
  ])
  const [messageInput, setMessageInput] = useState('')
  const [moodCheckin, setMoodCheckin] = useState<number | null>(null)

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      setMessages([
        ...messages,
        { id: String(messages.length + 1), sender: 'user', text: messageInput, timestamp: 'Now' },
      ])
      setMessageInput('')
      // Simulate Aria response
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: String(prev.length + 1), sender: 'aria', text: "I'm here to support you. Keep taking care of yourself!", timestamp: 'Now' },
        ])
      }, 1000)
    }
  }

  return (
    <div className="min-h-screen bg-organic-bg p-4 flex items-center justify-center">
      {/* Phone Frame */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border-8 border-gray-900">
        {/* Status Bar */}
        <div className="bg-organic-text text-white px-6 py-2 flex justify-between items-center text-xs">
          <span>9:41</span>
          <div className="flex gap-1">
            <span>📶</span>
            <span>📡</span>
            <span>🔋</span>
          </div>
        </div>

        {/* App Content */}
        <div className="bg-organic-bg min-h-screen flex flex-col">
          {/* Header */}
          <div className="bg-organic-surface px-4 py-4 border-b border-organic-neutral-200">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-organic-accent-2 to-green-600 flex items-center justify-center text-white text-lg">
                  🧘
                </div>
                <div>
                  <p className="font-heading text-organic-text text-base">Good morning, Alex</p>
                  <p className="text-xs text-organic-neutral-600">Ready to check in?</p>
                </div>
              </div>
              <button className="relative">
                <div className="text-xl">🔔</div>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto pb-24">
            {currentTab === 'home' && <HomeTab moodCheckin={moodCheckin} onMoodChange={setMoodCheckin} />}
            {currentTab === 'aria' && <AriaTab messages={messages} messageInput={messageInput} onMessageChange={setMessageInput} onSendMessage={handleSendMessage} />}
            {currentTab === 'tasks' && <TasksTab />}
            {currentTab === 'progress' && <ProgressTab />}
          </div>

          {/* Bottom Tab Bar */}
          <div className="fixed bottom-0 left-0 right-0 max-w-sm mx-auto bg-white/80 backdrop-blur border-t border-organic-neutral-200 px-4 py-2 flex justify-around">
            {[
              { id: 'home', icon: '🏠', label: 'Home' },
              { id: 'aria', icon: '💬', label: 'Aria' },
              { id: 'tasks', icon: '✅', label: 'Tasks' },
              { id: 'progress', icon: '📈', label: 'Progress' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id as PatientTab)}
                className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors ${
                  currentTab === tab.id
                    ? 'bg-organic-accent text-orange-50'
                    : 'text-organic-neutral-600 hover:bg-organic-neutral-100'
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Home Tab
interface HomeTabProps {
  moodCheckin: number | null
  onMoodChange: (mood: number) => void
}

function HomeTab({ moodCheckin, onMoodChange }: HomeTabProps) {
  const moods = [
    { emoji: '😢', label: 'Terrible', value: 0 },
    { emoji: '😕', label: 'Bad', value: 1 },
    { emoji: '😐', label: 'Okay', value: 2 },
    { emoji: '🙂', label: 'Good', value: 3 },
    { emoji: '😄', label: 'Great', value: 4 },
  ]

  return (
    <div className="p-4 space-y-4">
      {/* Next Session Card */}
      <div className="bg-gradient-to-br from-organic-accent to-orange-600 text-white rounded-2xl p-4">
        <p className="text-xs text-orange-100 mb-1">NEXT SESSION</p>
        <p className="font-heading text-lg">Thu, 2:00 PM</p>
        <p className="text-sm text-orange-50 mt-1">with Dr. Moustafa</p>
        <button className="mt-3 bg-white text-organic-accent px-4 py-2 rounded-full text-sm font-medium hover:bg-orange-50 transition-colors">
          Join & prepare
        </button>
      </div>

      {/* Mood Check-in */}
      <div className="bg-organic-surface rounded-2xl p-4 border border-organic-neutral-200">
        <p className="font-medium text-organic-text text-sm mb-3">How are you feeling right now?</p>
        <div className="flex justify-between gap-2">
          {moods.map((mood) => (
            <button
              key={mood.value}
              onClick={() => onMoodChange(mood.value)}
              className={`flex-1 py-2 rounded-xl transition-all ${
                moodCheckin === mood.value
                  ? 'bg-organic-accent-200 ring-2 ring-organic-accent'
                  : 'bg-organic-neutral-100 hover:bg-organic-neutral-200'
              }`}
              title={mood.label}
            >
              <span className="text-2xl">{mood.emoji}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Today's Tasks Preview */}
      <div className="bg-organic-surface rounded-2xl p-4 border border-organic-neutral-200">
        <p className="font-medium text-organic-text text-sm mb-3">Today's tasks</p>
        <div className="space-y-2">
          {[
            { title: 'Breathing exercises (3x)', done: false },
            { title: 'Mood check-in', done: true },
            { title: 'Journaling', done: false },
          ].map((task, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={task.done} readOnly className="w-4 h-4 rounded" />
              <span className={task.done ? 'line-through text-organic-neutral-500' : 'text-organic-text'}>
                {task.title}
              </span>
            </div>
          ))}
        </div>
        <button className="w-full mt-3 text-organic-accent text-sm font-medium hover:underline">
          View all tasks →
        </button>
      </div>

      {/* Talk to Aria Card */}
      <div className="bg-gradient-to-br from-organic-accent-2 to-green-600 text-white rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🤖</div>
          <div>
            <p className="font-heading text-base">Talk to Aria</p>
            <p className="text-xs text-green-100">Always here to listen</p>
          </div>
        </div>
        <button className="w-full mt-3 bg-white text-green-700 px-4 py-2 rounded-full text-sm font-medium hover:bg-green-50 transition-colors">
          Open chat
        </button>
      </div>
    </div>
  )
}

// Aria Tab (Chat)
interface AriaTabProps {
  messages: Message[]
  messageInput: string
  onMessageChange: (text: string) => void
  onSendMessage: () => void
}

function AriaTab({ messages, messageInput, onMessageChange, onSendMessage }: AriaTabProps) {
  return (
    <div className="flex flex-col h-screen">
      {/* Aria Header */}
      <div className="bg-gradient-to-r from-organic-accent-2 to-green-600 text-white px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            🤖
          </div>
          <div>
            <p className="font-medium text-sm">Aria</p>
            <p className="text-xs text-green-100">Always here to listen</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xs px-4 py-2 rounded-2xl ${
                msg.sender === 'user'
                  ? 'bg-organic-accent text-orange-50 rounded-br-none'
                  : 'bg-organic-surface text-organic-text rounded-bl-none'
              }`}
            >
              <p className="text-sm">{msg.text}</p>
              <p className="text-xs mt-1 opacity-70">{msg.timestamp}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Suggestion Chips */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto">
        {['Tell me a tip', 'How to breathe', 'Sleep tips'].map((suggestion) => (
          <button
            key={suggestion}
            className="flex-shrink-0 bg-organic-surface px-3 py-2 rounded-full text-xs text-organic-text hover:bg-organic-neutral-200 transition-colors"
            onClick={() => onMessageChange(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="border-t border-organic-neutral-200 px-3 py-3 flex gap-2">
        <input
          type="text"
          value={messageInput}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && onSendMessage()}
          placeholder="Message Aria..."
          className="flex-1 bg-organic-neutral-100 text-organic-text placeholder-organic-neutral-500 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-organic-accent"
        />
        <button
          onClick={onSendMessage}
          className="w-10 h-10 bg-organic-accent text-orange-50 rounded-full flex items-center justify-center hover:bg-organic-accent-600 transition-colors"
        >
          <Send size={18} />
        </button>
      </div>

      {/* Safety Disclaimer */}
      <div className="px-4 py-2 text-xs text-organic-neutral-600 text-center border-t border-organic-neutral-200">
        <p>🆘 Aria isn't a crisis service. If you're in danger, call 988.</p>
      </div>
    </div>
  )
}

// Tasks Tab
function TasksTab() {
  const completedCount = 2
  const totalCount = 5

  const tasks = [
    { title: 'Morning breathing exercises', category: 'Wellness', done: true },
    { title: 'Mood check-in', category: 'Daily', done: true },
    { title: 'Progressive muscle relaxation', category: 'Practice', done: false },
    { title: 'Gratitude journaling', category: 'Mindfulness', done: false },
    { title: 'Evening reflection', category: 'Daily', done: false },
  ]

  return (
    <div className="p-4 space-y-4">
      {/* Progress Card */}
      <div className="bg-organic-surface rounded-2xl p-4 border border-organic-neutral-200">
        <p className="text-xs text-organic-neutral-600 font-medium mb-2">THIS WEEK</p>
        <p className="text-2xl font-heading text-organic-text mb-1">
          {completedCount}/{totalCount} completed
        </p>
        <div className="w-full bg-organic-neutral-200 rounded-full h-2 mt-2">
          <div
            className="bg-gradient-to-r from-organic-accent to-orange-600 h-full rounded-full"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {tasks.map((task, i) => (
          <div key={i} className="bg-organic-surface rounded-xl p-3 flex items-center gap-3 border border-organic-neutral-200">
            <input
              type="checkbox"
              checked={task.done}
              readOnly
              className="w-5 h-5 rounded text-organic-accent cursor-pointer"
            />
            <div className="flex-1">
              <p className={`text-sm ${task.done ? 'line-through text-organic-neutral-500' : 'text-organic-text font-medium'}`}>
                {task.title}
              </p>
              <Badge variant="neutral" className="mt-1 inline-block text-xs py-0.5 px-2">
                {task.category}
              </Badge>
            </div>
            {task.done && <span className="text-organic-accent-2-700 text-lg">✓</span>}
          </div>
        ))}
      </div>

      {/* Add Button */}
      <button className="w-full bg-organic-accent text-orange-50 rounded-xl py-3 font-medium hover:bg-organic-accent-600 transition-colors">
        + Add custom task
      </button>
    </div>
  )
}

// Progress Tab
function ProgressTab() {
  return (
    <div className="p-4 space-y-4">
      {/* Streak Card */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-organic-accent to-orange-600 text-white rounded-2xl p-4">
          <p className="text-xs text-orange-100 mb-1">CURRENT STREAK</p>
          <p className="text-3xl font-heading">12 days</p>
          <p className="text-xs text-orange-100 mt-1">🔥 Keep it up!</p>
        </div>
        <div className="bg-gradient-to-br from-organic-accent-2 to-green-600 text-white rounded-2xl p-4">
          <p className="text-xs text-green-100 mb-1">SESSIONS</p>
          <p className="text-3xl font-heading">8</p>
          <p className="text-xs text-green-100 mt-1">Completed</p>
        </div>
      </div>

      {/* Mood This Month */}
      <div className="bg-organic-surface rounded-2xl p-4 border border-organic-neutral-200">
        <p className="font-medium text-organic-text text-sm mb-3">Mood this month</p>
        <svg viewBox="0 0 300 100" className="w-full h-20">
          <defs>
            <linearGradient id="moodGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#7a8a5e', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: '#7a8a5e', stopOpacity: 0.1 }} />
            </linearGradient>
          </defs>
          <polyline points="10,70 40,50 70,60 100,40 130,55 160,35 190,45 220,30 250,40 280,25" fill="url(#moodGradient)" stroke="#7a8a5e" strokeWidth="2" />
        </svg>
        <p className="text-xs text-organic-neutral-600 mt-2">Trending upward 📈</p>
      </div>

      {/* Assessment Scores */}
      <div className="bg-organic-surface rounded-2xl p-4 border border-organic-neutral-200">
        <p className="font-medium text-organic-text text-sm mb-4">Assessment scores</p>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <p className="text-sm text-organic-text">PHQ-9</p>
              <p className="text-sm font-heading text-organic-accent">14</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-organic-neutral-200 rounded-full h-2">
                <div className="bg-organic-accent h-full rounded-full" style={{ width: '52%' }} />
              </div>
              <span className="text-xs text-organic-neutral-600">↓ 18</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <p className="text-sm text-organic-text">GAD-7</p>
              <p className="text-sm font-heading text-organic-accent-2-700">11</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-organic-neutral-200 rounded-full h-2">
                <div className="bg-organic-accent-2-700 h-full rounded-full" style={{ width: '52%' }} />
              </div>
              <span className="text-xs text-organic-neutral-600">↓ 15</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
