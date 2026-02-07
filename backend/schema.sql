-- AI Therapist Database Schema
-- Patients
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    therapist_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    dob DATE,
    gender VARCHAR(20),
    phone TEXT,
    email TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    consent_ai_analysis BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, PAUSED, DISCHARGED
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW (),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW ()
);

-- Clinical Profiles
CREATE TABLE IF NOT EXISTS clinical_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    patient_id UUID REFERENCES patients (id) ON DELETE CASCADE,
    presenting_problem TEXT,
    history TEXT,
    medications TEXT,
    prior_therapy TEXT,
    trauma_history TEXT,
    goals TEXT,
    strengths_resources TEXT,
    risk_level VARCHAR(20) DEFAULT 'LOW', -- LOW, MODERATE, HIGH
    risk_notes TEXT,
    formulation_summary TEXT,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW ()
);

-- Risk Flags
CREATE TABLE IF NOT EXISTS risk_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    patient_id UUID REFERENCES patients (id) ON DELETE CASCADE,
    flag_type VARCHAR(50) NOT NULL, -- SELF_HARM, SUICIDAL_IDEATION, ABUSE, PSYCHOSIS, SUBSTANCE
    severity VARCHAR(20) DEFAULT 'LOW',
    active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW ()
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    patient_id UUID REFERENCES patients (id) ON DELETE CASCADE,
    therapist_id TEXT NOT NULL,
    start_time TIMESTAMP
    WITH
        TIME ZONE NOT NULL,
        end_time TIMESTAMP
    WITH
        TIME ZONE NOT NULL,
        location VARCHAR(20) DEFAULT 'IN_PERSON', -- IN_PERSON, ONLINE
        meeting_link TEXT,
        status VARCHAR(20) DEFAULT 'SCHEDULED', -- SCHEDULED, COMPLETED, CANCELLED, NO_SHOW
        reminder_sent_at TIMESTAMP
    WITH
        TIME ZONE,
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW ()
);

-- Session Notes
CREATE TABLE IF NOT EXISTS session_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    appointment_id UUID REFERENCES appointments (id),
    patient_id UUID REFERENCES patients (id) ON DELETE CASCADE,
    template VARCHAR(10) DEFAULT 'SOAP', -- SOAP, DAP, FREE
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    free_text TEXT,
    ai_draft_summary TEXT,
    ai_suggestions JSONB,
    therapist_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW (),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW ()
);

-- Assessment Templates
CREATE TABLE IF NOT EXISTS assessment_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    template_type VARCHAR(30), -- QUESTIONNAIRE, SCREENING, PERSONALITY
    license_status VARCHAR(20) DEFAULT 'VERIFY', -- FREE, LICENSED, VERIFY
    scoring_rules JSONB,
    interpretation_rules JSONB,
    delivery VARCHAR(20) DEFAULT 'IN_APP', -- IN_APP, GOOGLE_FORM
    google_form_url TEXT
);

-- Assessment Instances
CREATE TABLE IF NOT EXISTS assessment_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    patient_id UUID REFERENCES patients (id) ON DELETE CASCADE,
    template_id TEXT REFERENCES assessment_templates (id),
    taken_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW (),
        context VARCHAR(20) DEFAULT 'IN_SESSION', -- IN_SESSION, AT_HOME
        raw_answers JSONB,
        score_total INTEGER,
        subscale_scores JSONB,
        severity_band TEXT,
        interpretation_text TEXT,
        flagged BOOLEAN DEFAULT false
);

-- Care Plans
CREATE TABLE IF NOT EXISTS care_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    patient_id UUID REFERENCES patients (id) ON DELETE CASCADE,
    created_by TEXT,
    status VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, ACTIVE, COMPLETED
    main_track VARCHAR(30), -- CBT, DBT, ACT, TRAUMA, IFS, MIXED
    goals JSONB,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW (),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW ()
);

-- Care Plan Phases
CREATE TABLE IF NOT EXISTS care_plan_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    careplan_id UUID REFERENCES care_plans (id) ON DELETE CASCADE,
    phase_index INTEGER NOT NULL,
    title TEXT,
    objectives TEXT,
    methods JSONB,
    homework_templates JSONB,
    measures_to_track JSONB,
    exit_criteria TEXT
);

-- Homework Tasks
CREATE TABLE IF NOT EXISTS homework_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    patient_id UUID REFERENCES patients (id) ON DELETE CASCADE,
    careplan_phase_id UUID REFERENCES care_plan_phases (id),
    title TEXT NOT NULL,
    instructions TEXT,
    due_date DATE,
    status VARCHAR(20) DEFAULT 'ASSIGNED', -- ASSIGNED, DONE, SKIPPED
    patient_feedback TEXT,
    therapist_notes TEXT
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    actor_user_id TEXT,
    action VARCHAR(20), -- CREATE, READ, UPDATE, DELETE, EXPORT
    entity_type TEXT,
    entity_id TEXT,
    metadata JSONB,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW ()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients (status);

CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments (patient_id);

CREATE INDEX IF NOT EXISTS idx_appointments_time ON appointments (start_time);

CREATE INDEX IF NOT EXISTS idx_assessment_patient ON assessment_instances (patient_id);

CREATE INDEX IF NOT EXISTS idx_notes_patient ON session_notes (patient_id);

-- Seed assessment templates
INSERT INTO
    assessment_templates (
        id,
        name,
        template_type,
        license_status,
        scoring_rules
    )
VALUES
    (
        'phq9',
        'PHQ-9',
        'SCREENING',
        'FREE',
        '{"max": 27, "items": 9, "bands": [{"min":0,"max":4,"label":"Minimal"},{"min":5,"max":9,"label":"Mild"},{"min":10,"max":14,"label":"Moderate"},{"min":15,"max":19,"label":"Moderately Severe"},{"min":20,"max":27,"label":"Severe"}]}'
    ),
    (
        'gad7',
        'GAD-7',
        'SCREENING',
        'FREE',
        '{"max": 21, "items": 7, "bands": [{"min":0,"max":4,"label":"Minimal"},{"min":5,"max":9,"label":"Mild"},{"min":10,"max":14,"label":"Moderate"},{"min":15,"max":21,"label":"Severe"}]}'
    ),
    (
        'pss10',
        'PSS-10',
        'SCREENING',
        'FREE',
        '{"max": 40, "items": 10, "reverse": [4,5,7,8], "bands": [{"min":0,"max":13,"label":"Low"},{"min":14,"max":26,"label":"Moderate"},{"min":27,"max":40,"label":"High"}]}'
    ),
    (
        'who5',
        'WHO-5',
        'SCREENING',
        'FREE',
        '{"max": 25, "items": 5, "multiply": 4, "bands": [{"min":0,"max":50,"label":"Poor wellbeing"},{"min":51,"max":100,"label":"Adequate"}]}'
    ) ON CONFLICT (id) DO NOTHING;