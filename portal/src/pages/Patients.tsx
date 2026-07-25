import { useState } from 'react'
import MainLayout from '../components/MainLayout'
import { Card, Button, Badge, Avatar, Input, Table } from '../components/OrganicUI'
import { Plus } from 'lucide-react'

export default function PatientsPage() {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'high' | 'intake'>('all')

  const mockPatients = [
    {
      id: '1',
      name: 'Sarah Johnson',
      status: 'Active',
      lastSession: '2 days ago',
      risk: 'High',
      primaryClinic: 'Dr. Patel',
      phq9: 14,
    },
    {
      id: '2',
      name: 'Michael Chen',
      status: 'Active',
      lastSession: '5 days ago',
      risk: 'Medium',
      primaryClinic: 'Dr. Smith',
      phq9: 11,
    },
    {
      id: '3',
      name: 'Emma Davis',
      status: 'Active',
      lastSession: '1 week ago',
      risk: 'Low',
      primaryClinic: 'Dr. Patel',
      phq9: 5,
    },
    {
      id: '4',
      name: 'James Wilson',
      status: 'Intake',
      lastSession: 'Never',
      risk: 'High',
      primaryClinic: 'Dr. Johnson',
      phq9: 18,
    },
  ]

  const filteredPatients = mockPatients.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter =
      filterStatus === 'all' || (filterStatus === 'high' && p.risk === 'High') || (filterStatus === 'intake' && p.status === 'Intake')
    return matchesSearch && matchesFilter
  })

  if (selectedPatientId) {
    const patient = mockPatients.find((p) => p.id === selectedPatientId)
    if (patient) {
      return <PatientDetailPage patient={patient} onBack={() => setSelectedPatientId(null)} />
    }
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-organic-bg p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-5xl font-heading text-organic-text mb-2">Patients</h1>
              <p className="text-organic-neutral-600">Manage and monitor your caseload</p>
            </div>
            <Button variant="primary" className="flex items-center gap-2">
              <Plus size={18} />
              Register patient
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-8">
            <Input
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <div className="flex gap-2">
              {(['all', 'high', 'intake'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2.5 rounded-organic-pill text-sm font-medium transition-colors ${
                    filterStatus === status
                      ? 'bg-organic-accent text-orange-50'
                      : 'bg-organic-neutral-200 text-organic-neutral-700 hover:text-organic-text'
                  }`}
                >
                  {status === 'all' ? 'All' : status === 'high' ? 'High risk' : 'Intake'}
                </button>
              ))}
            </div>
          </div>

          {/* Patients Table */}
          <Card>
            <Table
              headers={['Patient', 'Status', 'Primary clinician', 'Last session', 'Risk level']}
              rows={filteredPatients.map((patient) => [
                <button
                  key={patient.id}
                  onClick={() => setSelectedPatientId(patient.id)}
                  className="flex items-center gap-3 hover:text-organic-accent transition-colors cursor-pointer group"
                >
                  <Avatar name={patient.name} size="sm" />
                  <div className="text-left">
                    <p className="font-medium group-hover:underline">{patient.name}</p>
                    <p className="text-xs text-organic-neutral-600">ID: #{patient.id.padStart(4, '0')}</p>
                  </div>
                </button>,
                <Badge key={`status-${patient.id}`} variant="sage">
                  {patient.status}
                </Badge>,
                patient.primaryClinic,
                patient.lastSession,
                <Badge
                  key={`risk-${patient.id}`}
                  variant={patient.risk === 'High' ? 'danger' : patient.risk === 'Medium' ? 'accent' : 'sage'}
                >
                  {patient.risk}
                </Badge>,
              ])}
            />
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}

interface PatientDetailPageProps {
  patient: {
    id: string
    name: string
    status: string
    lastSession: string
    risk: string
    primaryClinic: string
    phq9: number
  }
  onBack: () => void
}

function PatientDetailPage({ patient, onBack }: PatientDetailPageProps) {
  return (
    <MainLayout>
      <div className="min-h-screen bg-organic-bg p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header with back */}
          <div className="mb-8">
            <button onClick={onBack} className="text-organic-accent hover:text-organic-accent-600 font-medium mb-4 flex items-center gap-2">
              ← Back to patients
            </button>

            {/* Patient Identity Row */}
            <div className="flex items-start gap-6 mb-8">
              <Avatar name={patient.name} size="lg" />
              <div className="flex-1">
                <h1 className="text-4xl font-heading text-organic-text mb-2">{patient.name}</h1>
                <div className="flex gap-4 items-center">
                  <Badge variant={patient.risk === 'High' ? 'danger' : patient.risk === 'Medium' ? 'accent' : 'sage'}>
                    {patient.risk} risk
                  </Badge>
                  <p className="text-organic-neutral-600">
                    Primary clinician: <span className="font-medium text-organic-text">{patient.primaryClinic}</span>
                  </p>
                  <p className="text-organic-neutral-600">
                    Last session: <span className="font-medium text-organic-text">{patient.lastSession}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 2fr/1fr Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Clinical File */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <h2 className="text-2xl font-heading text-organic-text mb-4">Clinical file archive</h2>

                {/* Folder Tabs */}
                <div className="flex gap-2 mb-6 border-b border-organic-neutral-200 pb-4">
                  {['Intake & raw docs', 'Processed notes', 'AI summaries', 'Patient reports'].map((folder) => (
                    <button
                      key={folder}
                      className="px-3 py-2 rounded-organic-pill bg-organic-neutral-200 text-sm font-medium text-organic-neutral-700 hover:bg-organic-accent hover:text-orange-50 transition-colors"
                    >
                      {folder}
                    </button>
                  ))}
                </div>

                {/* File List */}
                <div className="space-y-2">
                  {[
                    { name: 'Initial Intake Form', date: '2024-07-01', locked: false },
                    { name: 'PHQ-9 Assessment', date: '2024-07-15', locked: false },
                    { name: 'Clinical Notes - Session 1', date: '2024-07-20', locked: false },
                    { name: 'Progress Report', date: '2024-07-25', locked: true },
                  ].map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-organic-neutral-100 rounded-lg hover:bg-organic-neutral-200 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-organic-accent-200 flex items-center justify-center text-organic-accent-700">
                          📄
                        </div>
                        <div>
                          <p className="font-medium text-organic-text">{file.name}</p>
                          <p className="text-xs text-organic-neutral-600">{file.date}</p>
                        </div>
                      </div>
                      {file.locked && <div className="text-organic-accent-2-700">🔒</div>}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Symptom Trend Chart */}
              <Card>
                <h3 className="text-xl font-heading text-organic-text mb-4">Symptom trajectory</h3>
                <svg viewBox="0 0 500 250" className="w-full h-64">
                  {/* Grid */}
                  <line x1="60" y1="200" x2="480" y2="200" stroke="#dcd3c4" strokeWidth="1" />
                  <line x1="60" y1="150" x2="480" y2="150" stroke="#dcd3c4" strokeWidth="1" />
                  <line x1="60" y1="100" x2="480" y2="100" stroke="#dcd3c4" strokeWidth="1" />
                  <line x1="60" y1="50" x2="480" y2="50" stroke="#dcd3c4" strokeWidth="1" />
                  {/* PHQ-9 line */}
                  <polyline points="60,120 140,110 220,80 300,95 380,85 460,95" fill="none" stroke="#c67139" strokeWidth="3" />
                  {/* GAD-7 line */}
                  <polyline points="60,140 140,135 220,110 300,120 380,115 460,125" fill="none" stroke="#7a8a5e" strokeWidth="3" strokeDasharray="5,5" />
                  {/* Axes */}
                  <line x1="60" y1="20" x2="60" y2="200" stroke="#201e1d" strokeWidth="2" />
                  <line x1="60" y1="200" x2="480" y2="200" stroke="#201e1d" strokeWidth="2" />
                  {/* Labels */}
                  <text x="60" y="230" fontSize="12" textAnchor="middle" fill="#82796a">
                    4w ago
                  </text>
                  <text x="230" y="230" fontSize="12" textAnchor="middle" fill="#82796a">
                    2w ago
                  </text>
                  <text x="400" y="230" fontSize="12" textAnchor="middle" fill="#82796a">
                    Today
                  </text>
                  {/* Legend */}
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
            </div>

            {/* Right Column - AI Insights & Scores */}
            <div className="space-y-6">
              {/* AI Clinical Insights */}
              <div className="bg-gradient-to-br from-organic-accent to-orange-600 text-white rounded-organic-card p-6 shadow-organic-lg">
                <h3 className="text-lg font-heading mb-3">AI clinical insights</h3>
                <ul className="text-sm space-y-2">
                  <li className="flex gap-2">
                    <span>•</span>
                    <span>PHQ-9 trending down, positive trajectory</span>
                  </li>
                  <li className="flex gap-2">
                    <span>•</span>
                    <span>Sleep quality improving week-over-week</span>
                  </li>
                  <li className="flex gap-2">
                    <span>•</span>
                    <span>Recommend behavioral activation exercises</span>
                  </li>
                </ul>
              </div>

              {/* Latest Scores */}
              <Card>
                <h3 className="text-lg font-heading text-organic-text mb-4">Latest assessment scores</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <p className="font-medium text-organic-text">PHQ-9</p>
                      <p className="text-2xl font-heading text-organic-accent">{patient.phq9}</p>
                    </div>
                    <div className="w-full bg-organic-neutral-200 rounded-organic-pill h-2">
                      <div className="bg-organic-accent h-full rounded-organic-pill" style={{ width: `${(patient.phq9 / 27) * 100}%` }} />
                    </div>
                    <p className="text-xs text-organic-neutral-600 mt-1">Moderate severity</p>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <p className="font-medium text-organic-text">GAD-7</p>
                      <p className="text-2xl font-heading text-organic-accent-2-700">11</p>
                    </div>
                    <div className="w-full bg-organic-neutral-200 rounded-organic-pill h-2">
                      <div className="bg-organic-accent-2-700 h-full rounded-organic-pill" style={{ width: `${(11 / 21) * 100}%` }} />
                    </div>
                    <p className="text-xs text-organic-neutral-600 mt-1">Moderate anxiety</p>
                  </div>
                </div>
              </Card>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button variant="primary" className="w-full">
                  View all assessments
                </Button>
                <Button variant="secondary" className="w-full">
                  Schedule follow-up
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
