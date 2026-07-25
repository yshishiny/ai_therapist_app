import { useState } from 'react'
import { Card, StatCard, Button, Badge, Input, ProgressBar, GradientCard, Avatar } from '../components/OrganicUI'
import { Activity, Clipboard, Mic, Map, Search, Plus, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'

type WorkspaceView = 'caseload' | 'chart' | 'scribe' | 'plan'

export default function ClinicianWorkspace() {
  const [currentView, setCurrentView] = useState<WorkspaceView>('caseload')
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)

  const mockPatients = [
    {
      id: '1',
      name: 'Sarah Johnson',
      status: 'Active',
      risk: 'High',
      phq9: 14,
      lastSession: '2 days ago',
      nextSession: 'Today at 2:00 PM',
    },
    {
      id: '2',
      name: 'Michael Chen',
      status: 'Active',
      risk: 'Medium',
      phq9: 11,
      lastSession: '5 days ago',
      nextSession: 'Tomorrow at 10:00 AM',
    },
    {
      id: '3',
      name: 'Emma Davis',
      status: 'Active',
      risk: 'Low',
      phq9: 5,
      lastSession: '1 week ago',
      nextSession: 'Friday at 3:00 PM',
    },
  ]

  return (
    <div className="min-h-screen bg-organic-bg flex">
      {/* Icon Rail */}
      <IconRail currentView={currentView} onViewChange={setCurrentView} />

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-5xl font-heading text-organic-text mb-2">Clinician Workspace</h1>
            <p className="text-organic-neutral-600">Manage your caseload and patient sessions</p>
          </div>

          {currentView === 'caseload' && <CaseloadView patients={mockPatients} onSelectPatient={setSelectedPatientId} />}
          {currentView === 'chart' && selectedPatientId && (
            <PatientChartView patient={mockPatients.find((p) => p.id === selectedPatientId)!} />
          )}
          {currentView === 'scribe' && selectedPatientId && (
            <AIScriveView patient={mockPatients.find((p) => p.id === selectedPatientId)!} />
          )}
          {currentView === 'plan' && selectedPatientId && (
            <CarePlanView patient={mockPatients.find((p) => p.id === selectedPatientId)!} />
          )}
        </div>
      </div>
    </div>
  )
}

// Icon Rail Navigation
interface IconRailProps {
  currentView: WorkspaceView
  onViewChange: (view: WorkspaceView) => void
}

function IconRail({ currentView, onViewChange }: IconRailProps) {
  const navItems = [
    { icon: Activity, label: 'Caseload', view: 'caseload' as WorkspaceView },
    { icon: Clipboard, label: 'Chart', view: 'chart' as WorkspaceView },
    { icon: Mic, label: 'Scribe', view: 'scribe' as WorkspaceView },
    { icon: Map, label: 'Plan', view: 'plan' as WorkspaceView },
  ]

  return (
    <div className="w-24 bg-organic-neutral-100 border-r border-organic-neutral-200 flex flex-col items-center py-8 gap-4">
      {/* Brand */}
      <div className="w-12 h-12 rounded-organic-tile bg-gradient-to-br from-organic-accent to-orange-600 flex items-center justify-center text-white font-heading text-lg mb-4">
        🧠
      </div>

      {/* Nav Items */}
      <div className="flex-1 flex flex-col gap-2">
        {navItems.map(({ icon: Icon, label, view }) => (
          <button
            key={view}
            onClick={() => onViewChange(view)}
            className={`w-12 h-12 rounded-organic-tile flex items-center justify-center transition-all ${
              currentView === view
                ? 'bg-organic-accent text-orange-50'
                : 'text-organic-neutral-600 hover:bg-organic-neutral-200'
            }`}
            title={label}
          >
            <Icon size={20} />
          </button>
        ))}
      </div>

      {/* User Avatar */}
      <Avatar name="Dr. Patel" size="sm" />
    </div>
  )
}

// Caseload View
interface CaseloadViewProps {
  patients: any[]
  onSelectPatient: (id: string) => void
}

function CaseloadView({ patients, onSelectPatient }: CaseloadViewProps) {
  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Today sessions" value="6" icon={<Clock size={24} />} />
        <StatCard label="My patients" value="41" icon={<Activity size={24} />} />
        <StatCard label="Notes due" value="3" icon={<AlertCircle size={24} />} />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Today's Schedule */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h2 className="text-2xl font-heading text-organic-text mb-4">Today's schedule</h2>
            <div className="space-y-3">
              {[
                { time: '09:00', name: 'Sarah Johnson', type: 'Follow-up', risk: 'High' },
                { time: '10:30', name: 'Michael Chen', type: 'Initial', risk: 'Medium' },
                { time: '14:00', name: 'Emma Davis', type: 'Review', risk: 'Low' },
                { time: '15:30', name: 'Group session', type: '4 patients', risk: 'Mixed' },
              ].map((session, i) => (
                <button
                  key={i}
                  onClick={() => onSelectPatient(patients[Math.min(i, patients.length - 1)].id)}
                  className="p-4 bg-organic-neutral-100 rounded-lg hover:bg-organic-neutral-200 transition-colors text-left"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-organic-text">{session.time}</p>
                      <p className="text-sm text-organic-neutral-600 mt-1">{session.name}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="neutral">{session.type}</Badge>
                      <p className="text-xs text-organic-neutral-600 mt-2">Risk: {session.risk}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Right: Tasks & Flags */}
        <div className="space-y-6">
          {/* Needs Review */}
          <Card className="border-l-4 border-organic-accent">
            <h3 className="text-lg font-heading text-organic-text mb-3">Needs review</h3>
            <div className="space-y-2">
              <div className="p-2 bg-orange-50 rounded">
                <p className="text-sm font-medium text-orange-900">Sarah Johnson</p>
                <p className="text-xs text-orange-700">Suicide risk flag</p>
              </div>
              <div className="p-2 bg-orange-50 rounded">
                <p className="text-sm font-medium text-orange-900">Michael Chen</p>
                <p className="text-xs text-orange-700">Missing assessment</p>
              </div>
            </div>
          </Card>

          {/* Tasks Checklist */}
          <Card>
            <h3 className="text-lg font-heading text-organic-text mb-3">Tasks</h3>
            <div className="space-y-2">
              {[
                { title: 'Document session notes', done: false },
                { title: 'Review PHQ-9 scores', done: false },
                { title: 'Send homework assignments', done: true },
              ].map((task, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <input
                    type="checkbox"
                    checked={task.done}
                    className="w-5 h-5 rounded"
                    readOnly
                  />
                  <span className={task.done ? 'line-through text-organic-neutral-500' : 'text-organic-text'}>
                    {task.title}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Patient Chart View
interface PatientChartViewProps {
  patient: any
}

function PatientChartView({ patient }: PatientChartViewProps) {
  return (
    <div className="space-y-8">
      {/* Patient Header */}
      <div className="flex items-center gap-4 mb-8">
        <Avatar name={patient.name} size="lg" />
        <div>
          <h2 className="text-3xl font-heading text-organic-text">{patient.name}</h2>
          <p className="text-organic-neutral-600">Last session: {patient.lastSession}</p>
        </div>
      </div>

      {/* 2fr/1fr Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Symptom Trend + Session History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart */}
          <Card>
            <h3 className="text-xl font-heading text-organic-text mb-4">Symptom trajectory</h3>
            <svg viewBox="0 0 500 250" className="w-full h-64">
              <line x1="60" y1="200" x2="480" y2="200" stroke="#dcd3c4" strokeWidth="1" />
              <line x1="60" y1="150" x2="480" y2="150" stroke="#dcd3c4" strokeWidth="1" />
              <line x1="60" y1="100" x2="480" y2="100" stroke="#dcd3c4" strokeWidth="1" />
              <line x1="60" y1="50" x2="480" y2="50" stroke="#dcd3c4" strokeWidth="1" />
              <polyline points="60,120 140,110 220,80 300,95 380,85 460,95" fill="none" stroke="#c67139" strokeWidth="3" />
              <polyline points="60,140 140,135 220,110 300,120 380,115 460,125" fill="none" stroke="#7a8a5e" strokeWidth="3" strokeDasharray="5,5" />
              <line x1="60" y1="20" x2="60" y2="200" stroke="#201e1d" strokeWidth="2" />
              <line x1="60" y1="200" x2="480" y2="200" stroke="#201e1d" strokeWidth="2" />
              <text x="60" y="230" fontSize="12" textAnchor="middle" fill="#82796a">
                4w ago
              </text>
              <text x="270" y="230" fontSize="12" textAnchor="middle" fill="#82796a">
                Today
              </text>
              <line x1="60" y1="15" x2="90" y2="15" stroke="#c67139" strokeWidth="2" />
              <text x="100" y="18" fontSize="12" fill="#201e1d">
                PHQ-9
              </text>
              <line x1="180" y1="15" x2="210" y2="15" stroke="#7a8a5e" strokeWidth="2" strokeDasharray="5,5" />
              <text x="220" y="18" fontSize="12" fill="#201e1d">
                GAD-7
              </text>
            </svg>
          </Card>

          {/* Session History */}
          <Card>
            <h3 className="text-xl font-heading text-organic-text mb-4">Signed session notes</h3>
            <div className="space-y-3">
              {[
                { date: '2024-07-25', title: 'Session notes - week 5', type: 'SOAP' },
                { date: '2024-07-18', title: 'Session notes - week 4', type: 'SOAP' },
                { date: '2024-07-11', title: 'Session notes - week 3', type: 'SOAP' },
                { date: '2024-07-04', title: 'Initial assessment', type: 'Intake' },
              ].map((note, i) => (
                <div key={i} className="p-3 bg-organic-neutral-100 rounded-lg hover:bg-organic-neutral-200 transition-colors cursor-pointer flex justify-between items-center">
                  <div>
                    <p className="font-medium text-organic-text">{note.title}</p>
                    <p className="text-xs text-organic-neutral-600">{note.date}</p>
                  </div>
                  <Badge variant="accent">{note.type}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right: AI Summary + Scores */}
        <div className="space-y-6">
          <GradientCard variant="accent">
            <h3 className="text-lg font-heading text-white mb-3">AI clinical summary</h3>
            <ul className="text-sm text-orange-100 space-y-2">
              <li className="flex gap-2">
                <span>•</span>
                <span>Consistent progress over 5 weeks</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Response to CBT interventions positive</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Sleep quality improving</span>
              </li>
            </ul>
          </GradientCard>

          <Card>
            <h3 className="text-lg font-heading text-organic-text mb-4">Latest scores</h3>
            <div className="space-y-4">
              <ProgressBar label="PHQ-9" value={patient.phq9} max={27} variant="accent" />
              <ProgressBar label="GAD-7" value={11} max={21} variant="sage" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

// AI Scribe View
function AIScriveView({ patient }: PatientChartViewProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState('24:11')

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 mb-8">
        <Avatar name={patient.name} size="lg" />
        <div>
          <h2 className="text-3xl font-heading text-organic-text">{patient.name}</h2>
          <p className="text-organic-neutral-600">Active session</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Live Transcript */}
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-heading text-organic-text">Live session transcript</h3>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-organic-pill ${isRecording ? 'bg-red-100' : 'bg-organic-neutral-100'}`}>
              <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-600 animate-pulse' : 'bg-organic-neutral-600'}`} />
              <span className={`text-sm font-medium ${isRecording ? 'text-red-700' : 'text-organic-neutral-700'}`}>
                {isRecording ? `Recording ${recordingTime}` : 'Not recording'}
              </span>
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
            {[
              { speaker: 'CLINICIAN', text: 'How have you been feeling since our last session?' },
              { speaker: 'PATIENT', text: "Better, actually. I've been trying those breathing exercises you suggested." },
              { speaker: 'CLINICIAN', text: 'That's great to hear. How often have you been practicing?' },
              { speaker: 'PATIENT', text: 'About 3 times a day. They really help when I feel anxious.' },
            ].map((turn, i) => (
              <div key={i} className={`p-3 rounded-lg ${turn.speaker === 'CLINICIAN' ? 'bg-organic-accent-100' : 'bg-organic-neutral-100'}`}>
                <p className="text-xs font-bold text-organic-neutral-700 mb-1">{turn.speaker}</p>
                <p className="text-sm text-organic-text">{turn.text}</p>
              </div>
            ))}
          </div>

          <Button variant="primary" className="w-full">
            {isRecording ? 'Stop recording' : 'Start recording'}
          </Button>
        </Card>

        {/* AI Session Note (SOAP) */}
        <Card>
          <h3 className="text-xl font-heading text-organic-text mb-4">AI session note (SOAP)</h3>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-bold text-organic-neutral-700 mb-2">SUBJECTIVE</p>
              <div className="p-3 bg-organic-neutral-100 rounded-lg text-sm text-organic-text">
                Patient reports improved mood and reduced anxiety. Practicing breathing exercises 3x daily with positive results.
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-organic-neutral-700 mb-2">OBJECTIVE</p>
              <div className="p-3 bg-organic-neutral-100 rounded-lg text-sm text-organic-text">
                Affect: stable, slightly improved. Speech: normal rate and volume. Engagement: active participation.
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-organic-neutral-700 mb-2">ASSESSMENT</p>
              <div className="p-3 bg-organic-neutral-100 rounded-lg text-sm text-organic-text">
                GAD with depressive features. Responding well to CBT. PHQ-9 trending downward (14→12).
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-organic-neutral-700 mb-2">PLAN</p>
              <div className="p-3 bg-organic-neutral-100 rounded-lg text-sm text-organic-text">
                Continue weekly sessions. Add exposure exercises for situational anxiety. Assign homework: daily mood log.
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button variant="primary" className="flex-1">
              Save to chart
            </Button>
            <Button variant="secondary" className="flex-1">
              Edit
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

// Care Plan View
function CarePlanView({ patient }: PatientChartViewProps) {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 mb-8">
        <Avatar name={patient.name} size="lg" />
        <div>
          <h2 className="text-3xl font-heading text-organic-text">{patient.name}</h2>
          <p className="text-organic-neutral-600">Treatment plan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Timeline */}
        <div className="lg:col-span-2">
          <Card>
            <h3 className="text-xl font-heading text-organic-text mb-6">Phased treatment timeline</h3>

            <div className="space-y-0">
              {[
                { phase: 'Phase 1: Stabilization', done: true, current: false, desc: 'Assessment & psychoeducation' },
                { phase: 'Phase 2: Skill Building', done: true, current: true, desc: 'CBT techniques & exposure' },
                { phase: 'Phase 3: Integration', done: false, current: false, desc: 'Real-world application' },
                { phase: 'Phase 4: Maintenance', done: false, current: false, desc: 'Relapse prevention' },
              ].map((phase, i) => (
                <div key={i} className="flex gap-4 pb-6 relative">
                  {/* Timeline line */}
                  {i < 3 && (
                    <div
                      className={`absolute left-5 top-12 w-0.5 h-12 ${phase.done ? 'bg-organic-accent-2-700' : 'bg-organic-neutral-300'}`}
                    />
                  )}

                  {/* Phase marker */}
                  <div className="relative z-10">
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center font-heading text-sm ${
                        phase.current
                          ? 'bg-organic-accent text-orange-50'
                          : phase.done
                            ? 'bg-organic-accent-2-700 text-white'
                            : 'bg-organic-neutral-300 text-organic-neutral-700'
                      }`}
                    >
                      {phase.done ? <CheckCircle2 size={20} /> : phase.current ? '→' : i + 1}
                    </div>
                  </div>

                  {/* Phase content */}
                  <div className="flex-1 pt-1">
                    <p className="font-heading text-organic-text">{phase.phase}</p>
                    <p className="text-sm text-organic-neutral-600">{phase.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Homework Assignment */}
        <div>
          <Card>
            <h3 className="text-lg font-heading text-organic-text mb-4">Assign homework</h3>

            <div className="space-y-3 mb-4">
              {[
                { icon: '📋', title: 'Mood tracking', assigned: true },
                { icon: '🧘', title: 'Breathing exercises', assigned: true },
                { icon: '📚', title: 'Psychoeducation', assigned: false },
                { icon: '🎯', title: 'Exposure practice', assigned: false },
              ].map((hw, i) => (
                <button
                  key={i}
                  className="w-full p-3 rounded-lg bg-organic-neutral-100 hover:bg-organic-neutral-200 transition-colors text-left flex items-center gap-3"
                >
                  <span className="text-lg">{hw.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-organic-text">{hw.title}</p>
                  </div>
                  {hw.assigned && <CheckCircle2 size={18} className="text-organic-accent-2-700" />}
                </button>
              ))}
            </div>

            <Button variant="primary" className="w-full">
              <Plus size={18} /> Add assignment
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
