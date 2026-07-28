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

// ─── Record provenance ──────────────────────────────────────────────────────
//
// GET /patients and GET /patients/{id} report how each record got into the
// database (`source`), which clinician put it there (`created_by`) and any
// free-text note about it (`source_detail`). This matters clinically: ten
// seeded test records once sat in a working caseload looking exactly like the
// real people beside them.
//
// `source` is the sole authority on a record's origin. Nothing below infers an
// origin from anything else; a value this build has no label for is shown
// verbatim rather than rounded to the nearest known one; and a missing value
// stays "Not recorded" rather than being read as "manual".

export type PatientSource = 'BULK_UPLOAD' | 'MANUAL' | 'SEED' | 'SYSTEM'

/** The provenance fields PatientOut carries on every patient. */
export interface PatientProvenance {
  source: string | null
  created_by: string | null
  source_detail: string | null
}

/**
 * real          the record of an actual person on the caseload
 * test          SEED/SYSTEM — not a person, and safe to hide from the registry
 * unrecognised  a `source` value this build has no label for. Deliberately NOT
 *               treated as test data: an unfamiliar origin is no evidence that
 *               the patient is fake, so these are never hidden.
 * unrecorded    `source` is null — how the record arrived is simply unknown
 */
export type SourceKind = 'real' | 'test' | 'unrecognised' | 'unrecorded'

export interface SourceMeta {
  kind: SourceKind
  /** Short marker for a registry row; null when the row needs none. */
  label: string | null
  /** How the record arrived, phrased for a detail view. */
  detail: string
  /** Set only for `test` — why the record is not a person. */
  warning: string | null
  /** Tooltip spelling out what the marker does and does not mean. */
  title: string
}

const SOURCE_META: Record<PatientSource, SourceMeta> = {
  BULK_UPLOAD: {
    kind: 'real',
    label: 'Imported',
    detail: 'Imported from a file (bulk upload)',
    warning: null,
    title: 'A real patient record. It reached the system through a bulk file import rather than being typed in.',
  },
  MANUAL: {
    kind: 'real',
    label: null,
    detail: 'Entered manually',
    warning: null,
    title: 'A real patient record, entered by hand.',
  },
  SEED: {
    kind: 'test',
    label: 'Test data',
    detail: 'Created by a seed script',
    warning: 'This is seeded test data, not a real patient.',
    title: 'Not a real patient. A seed script created this record for development and testing.',
  },
  SYSTEM: {
    kind: 'test',
    label: 'Demo / system',
    detail: 'Created by the system',
    warning: 'This record was created by the system, not by a clinician registering a patient.',
    title: 'Not a real patient. The system created this record itself rather than a clinician registering someone.',
  },
}

/**
 * Never returns null: every record gets a truthful reading, including the two
 * cases the backend enum does not cover — a value this build does not know,
 * and no value at all.
 */
export function sourceMetaOf(source: string | null | undefined): SourceMeta {
  if (!source) {
    return {
      kind: 'unrecorded',
      label: 'Not recorded',
      detail: 'Not recorded',
      warning: null,
      title: 'This record carries no origin marker, so there is no record of how it was added.',
    }
  }
  const known = SOURCE_META[source as PatientSource]
  if (known) return known
  return {
    kind: 'unrecognised',
    label: source,
    detail: `Recorded as “${source}”`,
    warning: null,
    title: `The server reported the origin “${source}”, which this version of the portal has no description for. It is shown exactly as sent, and is not assumed to be test data.`,
  }
}

/**
 * Resolves `created_by` to a clinician name. It never guesses: an id that is
 * not in the list stays unnamed, an absent id says so, and a list that could
 * not be loaded is reported as a failed lookup rather than as "nobody".
 */
export function addedByLabel(
  createdBy: string | null | undefined,
  nameOf: (id: string) => string | null | undefined,
  lookupAvailable: boolean,
): string {
  if (!createdBy) return 'Not recorded'
  if (!lookupAvailable) return 'Could not look up who added this record'
  return nameOf(createdBy) || 'Unknown clinician'
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
