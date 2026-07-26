import { useState } from 'react'
import MainLayout from '../components/MainLayout'
import { Card, StatCard, Button, Badge, SegmentedControl, ProgressBar, GradientCard, Avatar, Table } from '../components/OrganicUI'
import { Activity, AlertCircle, TrendingDown, Users, Zap } from 'lucide-react'

export default function DashboardPage() {
  const [dashView, setDashView] = useState<'analytics' | 'welcome' | 'bento'>('analytics')

  return (
    <MainLayout>
      <div className="min-h-screen bg-organic-bg p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-5xl font-heading text-organic-text mb-2">Welcome back</h1>
            <p className="text-organic-neutral-600">Practice overview and quick actions</p>
          </div>

          {/* Dashboard Selector */}
          <div className="mb-8">
            <SegmentedControl
              options={[
                { value: 'analytics', label: 'Analytics' },
                { value: 'welcome', label: 'Welcome' },
                { value: 'bento', label: 'Bento' },
              ]}
              value={dashView}
              onChange={(v) => setDashView(v as 'analytics' | 'welcome' | 'bento')}
            />
          </div>

          {dashView === 'analytics' && <AnalyticsView />}
          {dashView === 'welcome' && <WelcomeView />}
          {dashView === 'bento' && <BentoView />}
        </div>
      </div>
    </MainLayout>
  )
}

// Analytics View
function AnalyticsView() {
  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Active patients" value="48" icon={<Users size={24} />} trend={{ direction: 'up', percent: 12 }} />
        <StatCard label="Sessions this month" value="156" icon={<Activity size={24} />} trend={{ direction: 'up', percent: 8 }} />
        <StatCard label="Assessments pending" value="12" icon={<AlertCircle size={24} />} trend={{ direction: 'down', percent: 3 }} />
        <StatCard label="Avg score improvement" value="18%" icon={<TrendingDown size={24} />} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Symptom Trend */}
        <Card className="lg:col-span-2">
          <h2 className="text-2xl font-heading text-organic-text mb-6">Symptom trends (last 4 weeks)</h2>
          <svg viewBox="0 0 400 200" className="w-full h-64">
            <rect width="400" height="200" fill="transparent" />
            <line x1="50" y1="150" x2="390" y2="150" stroke="#dcd3c4" strokeWidth="1" />
            <line x1="50" y1="100" x2="390" y2="100" stroke="#dcd3c4" strokeWidth="1" />
            <line x1="50" y1="50" x2="390" y2="50" stroke="#dcd3c4" strokeWidth="1" />
            <polyline points="50,80 120,70 190,50 260,65 330,75 390,60" fill="none" stroke="#c67139" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="50,100 120,95 190,75 260,85 330,90 390,80" fill="none" stroke="#7a8a5e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5,5" />
            <line x1="50" y1="20" x2="50" y2="160" stroke="#201e1d" strokeWidth="2" />
            <line x1="50" y1="160" x2="390" y2="160" stroke="#201e1d" strokeWidth="2" />
            <text x="50" y="180" fontSize="12" textAnchor="middle" fill="#82796a">
              Week 1
            </text>
            <text x="150" y="180" fontSize="12" textAnchor="middle" fill="#82796a">
              Week 2
            </text>
            <text x="250" y="180" fontSize="12" textAnchor="middle" fill="#82796a">
              Week 3
            </text>
            <text x="350" y="180" fontSize="12" textAnchor="middle" fill="#82796a">
              Week 4
            </text>
            <line x1="50" y1="15" x2="80" y2="15" stroke="#c67139" strokeWidth="2" />
            <text x="90" y="18" fontSize="12" fill="#201e1d">
              PHQ-9
            </text>
            <line x1="150" y1="15" x2="180" y2="15" stroke="#7a8a5e" strokeWidth="2" strokeDasharray="5,5" />
            <text x="190" y="18" fontSize="12" fill="#201e1d">
              GAD-7
            </text>
          </svg>
        </Card>

        {/* Risk Flags */}
        <Card>
          <h3 className="text-xl font-heading text-organic-text mb-4">Risk flags</h3>
          <div className="space-y-3">
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="font-medium text-red-800 text-sm">High risk</p>
              <p className="text-xs text-red-700 mt-1">2 patients flagged for follow-up</p>
            </div>
            <div className="p-3 bg-organic-accent-2-100 rounded-lg border border-organic-accent-2-200">
              <p className="font-medium text-organic-accent-2-800 text-sm">Medium risk</p>
              <p className="text-xs text-organic-accent-2-700 mt-1">5 patients in observation</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="font-medium text-green-800 text-sm">Stable</p>
              <p className="text-xs text-green-700 mt-1">41 patients stable</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Priority Patients Table */}
      <Card>
        <h3 className="text-xl font-heading text-organic-text mb-4">Priority patients</h3>
        <Table
          headers={['Patient', 'Status', 'Last session', 'Risk level']}
          rows={[
            [
              <div key="1" className="flex items-center gap-2">
                <Avatar name="Sarah Johnson" size="sm" />
                <div>
                  <p className="font-medium">Sarah Johnson</p>
                  <p className="text-xs text-organic-neutral-600">ID: #2841</p>
                </div>
              </div>,
              <Badge key="2" variant="sage">
                Active
              </Badge>,
              '2 days ago',
              <Badge key="3" variant="danger">
                High
              </Badge>,
            ],
            [
              <div key="4" className="flex items-center gap-2">
                <Avatar name="Michael Chen" size="sm" />
                <div>
                  <p className="font-medium">Michael Chen</p>
                  <p className="text-xs text-organic-neutral-600">ID: #2837</p>
                </div>
              </div>,
              <Badge key="5" variant="sage">
                Active
              </Badge>,
              '5 days ago',
              <Badge key="6" variant="accent">
                Medium
              </Badge>,
            ],
            [
              <div key="7" className="flex items-center gap-2">
                <Avatar name="Emma Davis" size="sm" />
                <div>
                  <p className="font-medium">Emma Davis</p>
                  <p className="text-xs text-organic-neutral-600">ID: #2834</p>
                </div>
              </div>,
              <Badge key="8" variant="sage">
                Active
              </Badge>,
              '1 week ago',
              <Badge key="9" variant="sage">
                Low
              </Badge>,
            ],
          ]}
        />
      </Card>
    </div>
  )
}

// Welcome View
function WelcomeView() {
  return (
    <div className="space-y-8">
      <GradientCard variant="accent" className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-heading text-organic-accent-100 mb-2">Good morning, Dr. Patel</h2>
            <p className="text-organic-accent-100 mb-4">3 alerts require attention today</p>
            <Button variant="primary" className="bg-white text-organic-accent hover:bg-organic-accent-100">
              Review alerts →
            </Button>
          </div>
          <Zap size={48} className="text-organic-accent-200" />
        </div>
      </GradientCard>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center p-4">
          <p className="text-sm text-organic-neutral-600 mb-1">Today's sessions</p>
          <p className="text-3xl font-heading text-organic-accent">6</p>
        </Card>
        <Card className="text-center p-4">
          <p className="text-sm text-organic-neutral-600 mb-1">New patients</p>
          <p className="text-3xl font-heading text-organic-accent-2-700">2</p>
        </Card>
        <Card className="text-center p-4">
          <p className="text-sm text-organic-neutral-600 mb-1">Pending reviews</p>
          <p className="text-3xl font-heading text-organic-accent">8</p>
        </Card>
        <Card className="text-center p-4">
          <p className="text-sm text-organic-neutral-600 mb-1">Messages</p>
          <p className="text-3xl font-heading text-organic-neutral-600">12</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-xl font-heading text-organic-text mb-4">Today's schedule</h3>
          <div className="space-y-3">
            {['09:00 - Sarah Johnson (Follow-up)', '10:30 - Michael Chen (Initial)', '14:00 - Emma Davis (Review)', '15:30 - Group session (4 patients)'].map((item, i) => (
              <div key={i} className="p-3 bg-organic-neutral-100 rounded-lg text-sm text-organic-text">
                {item}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-xl font-heading text-organic-text mb-4">Risk flags</h3>
          <div className="space-y-2">
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm font-medium text-red-800">Sarah Johnson - Suicidal ideation flagged</p>
            </div>
            <div className="p-3 bg-organic-accent-2-100 rounded-lg">
              <p className="text-sm font-medium text-organic-accent-2-800">Michael Chen - Sleep disruption worsening</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

// Bento View
function BentoView() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <GradientCard variant="sage" className="md:col-span-2 md:row-span-2 p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-organic-accent-2-100 text-sm mb-1">PRACTICE HEALTH</p>
            <p className="text-5xl font-heading text-white">94%</p>
          </div>
          <Zap size={32} className="text-organic-accent-2-200" />
        </div>
        <svg viewBox="0 0 300 80" className="w-full h-20">
          <polyline points="10,60 40,30 70,50 100,20 130,40 160,15 190,35 220,25 250,45 280,30" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
          <polyline points="10,60 40,30 70,50 100,20 130,40 160,15 190,35 220,25 250,45 280,30" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="3" strokeDasharray="5,5" />
        </svg>
      </GradientCard>

      <StatCard label="Active patients" value="48" trend={{ direction: 'up', percent: 5 }} />
      <StatCard label="This week sessions" value="22" trend={{ direction: 'up', percent: 12 }} />
      <StatCard label="Avg satisfaction" value="4.6★" trend={{ direction: 'up', percent: 2 }} />
      <StatCard label="Risk alerts" value="3" trend={{ direction: 'down', percent: 8 }} />

      <Card className="md:col-span-2">
        <h3 className="text-xl font-heading text-organic-text mb-4">Risk flags requiring attention</h3>
        <div className="space-y-4">
          <ProgressBar label="High risk" value={2} max={25} variant="accent" />
          <ProgressBar label="Medium risk" value={5} max={25} variant="sage" />
          <ProgressBar label="Low risk" value={18} max={25} variant="sage" />
        </div>
      </Card>
    </div>
  )
}
