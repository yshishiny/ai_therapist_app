export interface Patient {
  id: string
  org_id: string
  therapist_id: string
  full_name: string
  name: string
  email: string
  phone: string | null
  gender: string | null
  dob: string | null
  status: 'Active' | 'Paused' | 'Discharged'
  risk: 'Low' | 'Moderate' | 'High' | 'Severe'
  created_at: string
  updated_at: string
}

export interface ClinicalProfile {
  id: string
  patient_id: string
  presenting_problem: string
  history: string
  medications: string | null
  prior_therapy: string | null
  trauma_history: string | null
  goals: string
  risk_level: string
  formulation_summary: string
}

export interface RiskFlag {
  id: string
  patient_id: string
  type: 'self_harm' | 'abuse' | 'psychosis' | 'substance_use' | 'other'
  severity: 'low' | 'moderate' | 'high' | 'critical'
  active: boolean
  notes: string
  created_at: string
}
