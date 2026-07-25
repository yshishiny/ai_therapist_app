import { useState } from 'react'
import MainLayout from '../components/MainLayout'
import { Card, Button, Badge, ProgressBar, GradientCard } from '../components/OrganicUI'
import { AlertCircle, Download, Edit2 } from 'lucide-react'

export default function AssessmentsPage() {
  const [selectedAssessment, setSelectedAssessment] = useState<'list' | 'phq9'>('list')

  if (selectedAssessment === 'phq9') {
    return <PHQ9ScoringPage onBack={() => setSelectedAssessment('list')} />
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-organic-bg p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-5xl font-heading text-organic-text mb-2">Assessments</h1>
            <p className="text-organic-neutral-600">Standardized clinical tools and patient scores</p>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Assessment Catalog */}
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-heading text-organic-text">Assessment catalog</h2>
                <Button variant="primary">Build new</Button>
              </div>

              {/* Assessment Cards */}
              {[
                { name: 'PHQ-9', desc: 'Patient Health Questionnaire', items: 9, category: 'Depression' },
                { name: 'GAD-7', desc: 'Generalized Anxiety Disorder', items: 7, category: 'Anxiety' },
                { name: 'ACE', desc: 'Adverse Childhood Experiences', items: 10, category: 'Trauma' },
                { name: 'PCL-5', desc: 'PTSD Checklist for DSM-5', items: 20, category: 'Trauma' },
              ].map((assessment, i) => (
                <Card
                  key={i}
                  className="cursor-pointer hover:shadow-organic-lg transition-shadow"
                  onClick={() => setSelectedAssessment('phq9')}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-heading text-organic-text">{assessment.name}</h3>
                      <p className="text-sm text-organic-neutral-600">{assessment.desc}</p>
                    </div>
                    <div className="w-12 h-12 rounded-organic-tile bg-gradient-to-br from-organic-accent to-orange-600 flex items-center justify-center text-white font-heading text-lg">
                      {assessment.items}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="neutral">{assessment.items} items</Badge>
                    <Badge variant="accent">{assessment.category}</Badge>
                  </div>
                </Card>
              ))}
            </div>

            {/* Right: Scored Result */}
            <div className="space-y-6">
              <h2 className="text-2xl font-heading text-organic-text">Scored PHQ-9 result</h2>

              {/* Big Score Card */}
              <GradientCard variant="accent">
                <div className="text-center">
                  <p className="text-orange-100 text-sm mb-2">TOTAL SCORE</p>
                  <p className="text-6xl font-heading text-white mb-2">14 / 27</p>
                  <p className="text-orange-50 text-lg font-medium">Moderately severe depression</p>
                </div>
              </GradientCard>

              {/* Severity Meter */}
              <Card>
                <h3 className="text-lg font-heading text-organic-text mb-4">Severity spectrum</h3>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="text-xs text-organic-neutral-600 font-medium w-20">Minimal</div>
                    <div className="flex-1 h-3 bg-organic-neutral-200 rounded-organic-pill overflow-hidden">
                      <div className="h-full w-1/5 bg-organic-accent-2-700" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="text-xs text-organic-neutral-600 font-medium w-20">Mild</div>
                    <div className="flex-1 h-3 bg-organic-neutral-200 rounded-organic-pill overflow-hidden">
                      <div className="h-full w-2/5 bg-organic-accent-2-600" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="text-xs text-organic-neutral-600 font-medium w-20">Moderate</div>
                    <div className="flex-1 h-3 bg-organic-neutral-200 rounded-organic-pill overflow-hidden">
                      <div className="h-full w-3/5 bg-organic-accent" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="text-xs text-organic-neutral-600 font-medium w-20">Moderately Severe</div>
                    <div className="flex-1 h-3 bg-organic-neutral-200 rounded-organic-pill overflow-hidden">
                      <div className="h-full w-4/5 bg-organic-accent-600" style={{ width: '52%' }} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="text-xs text-organic-neutral-600 font-medium w-20">Severe</div>
                    <div className="flex-1 h-3 bg-organic-neutral-200 rounded-organic-pill overflow-hidden">
                      <div className="h-full w-full bg-organic-accent-800" />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Risk Flag Callout */}
              <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">Item 9: Suicidal ideation flagged</p>
                    <p className="text-sm text-red-700 mt-1">Patient endorsed passive suicidal thoughts. Clinician alerted for follow-up assessment.</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button variant="primary" className="flex-1 flex items-center justify-center gap-2">
                  <Edit2 size={18} />
                  Edit response
                </Button>
                <Button variant="secondary" className="flex-1 flex items-center justify-center gap-2">
                  <Download size={18} />
                  Export PDF
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

interface PHQ9ScoringPageProps {
  onBack: () => void
}

function PHQ9ScoringPage({ onBack }: PHQ9ScoringPageProps) {
  const [responses, setResponses] = useState<Record<number, number>>({})

  const items = [
    'Little interest or pleasure in doing things',
    'Feeling down, depressed, or hopeless',
    'Trouble falling or staying asleep, or sleeping too much',
    'Feeling tired or having little energy',
    'Poor appetite or overeating',
    'Feeling bad about yourself or being a failure',
    'Trouble concentrating on things',
    'Moving or speaking so slowly that others could have noticed, or the opposite',
    'Thoughts that you would be better off dead or hurting yourself',
  ]

  const handleResponse = (itemIndex: number, value: number) => {
    setResponses((prev) => ({
      ...prev,
      [itemIndex]: value,
    }))
  }

  const totalScore = Object.values(responses).reduce((a, b) => a + b, 0)
  const allAnswered = Object.keys(responses).length === items.length

  return (
    <MainLayout>
      <div className="min-h-screen bg-organic-bg p-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button onClick={onBack} className="text-organic-accent hover:text-organic-accent-600 font-medium mb-4 flex items-center gap-2">
              ← Back to assessments
            </button>
            <h1 className="text-4xl font-heading text-organic-text mb-2">PHQ-9 Assessment</h1>
            <p className="text-organic-neutral-600">Patient Health Questionnaire for Depression Screening</p>
          </div>

          {/* Instructions */}
          <Card className="mb-8 bg-organic-accent-100 border border-organic-accent-300">
            <p className="text-organic-accent-900">
              <strong>Instructions:</strong> Over the last two weeks, how often have you been bothered by any of the following problems? (0 = Not at all, 3 = Nearly every day)
            </p>
          </Card>

          {/* Questions */}
          <div className="space-y-6 mb-8">
            {items.map((item, i) => (
              <Card key={i}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-medium text-organic-text">{i + 1}. {item}</p>
                  </div>
                  {responses[i] !== undefined && <Badge variant="accent">{responses[i]} points</Badge>}
                </div>

                {/* Response Options */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { value: 0, label: 'Not at all' },
                    { value: 1, label: 'Several days' },
                    { value: 2, label: 'More than half' },
                    { value: 3, label: 'Nearly every day' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleResponse(i, option.value)}
                      className={`p-3 rounded-organic-pill border-2 transition-all ${
                        responses[i] === option.value
                          ? 'bg-organic-accent border-organic-accent text-orange-50 font-medium'
                          : 'border-organic-neutral-300 text-organic-text hover:border-organic-accent'
                      }`}
                    >
                      <div className="text-lg font-bold">{option.value}</div>
                      <div className="text-xs mt-1">{option.label}</div>
                    </button>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          {/* Score Summary */}
          {allAnswered && (
            <div className="space-y-6">
              <GradientCard variant="accent">
                <div className="text-center">
                  <p className="text-orange-100 text-sm mb-2">TOTAL SCORE</p>
                  <p className="text-6xl font-heading text-white">{totalScore} / 27</p>
                  <p className="text-orange-50 text-lg mt-2">
                    {totalScore <= 4 && 'Minimal depression'}
                    {totalScore > 4 && totalScore <= 9 && 'Mild depression'}
                    {totalScore > 9 && totalScore <= 14 && 'Moderate depression'}
                    {totalScore > 14 && totalScore <= 19 && 'Moderately severe depression'}
                    {totalScore > 19 && 'Severe depression'}
                  </p>
                </div>
              </GradientCard>

              {/* Special Question */}
              {totalScore > 0 && (
                <Card className="border-l-4 border-organic-accent">
                  <p className="font-medium text-organic-text mb-3">Item 9 - Suicidal Ideation</p>
                  <p className="text-sm text-organic-neutral-700 mb-4">If patient responded yes (1-3) to item 9:</p>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-900 font-medium">⚠️ Risk flag: Conduct immediate suicide risk assessment</p>
                  </div>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button variant="primary" className="flex-1">
                  Save assessment result
                </Button>
                <Button variant="secondary" className="flex-1">
                  Assign follow-up
                </Button>
              </div>
            </div>
          )}

          {!allAnswered && (
            <Card className="text-center p-8 bg-organic-neutral-100">
              <p className="text-organic-neutral-700">
                Complete all {items.length} questions to see the score • {Object.keys(responses).length} of {items.length} answered
              </p>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
