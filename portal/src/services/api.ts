import axios, { AxiosInstance, AxiosError } from 'axios'
import { TokenPair } from '../types/auth'
import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from './storage'

const API_URL = (import.meta as any).env.VITE_API_URL || 'https://aitherapistapp-production.up.railway.app'

// Follow-up booked from the end of a session. Times are absolute ISO instants
// so the backend never has to guess the clinician's timezone.
export type NextAppointmentIn = {
  start_time: string
  end_time: string
  appointment_type?: string
  location?: string
}

let isRefreshing = false
let failedQueue: Array<{ resolve: (value: any) => void; reject: (reason?: any) => void }> = []

/** One page of GET /patients. */
export interface PatientsPage {
  items: any[]
  /**
   * How many patients exist behind the filter, NOT how many are in `items`.
   * `null` means the server did not report one — it is never guessed from the
   * page length, because "50 rows" and "50 rows of 300" must not look alike.
   */
  total: number | null
  limit: number | null
  offset: number
}

/**
 * GET /patients returns `{ items, total, limit, offset }`. Older server builds
 * returned a bare array; that is normalised here with `total: null` so callers
 * render "Showing 1-50" rather than claiming a total nobody sent.
 */
function toPatientsPage(data: any, requested?: { limit?: number; offset?: number }): PatientsPage {
  const fallbackLimit = requested?.limit ?? null
  const fallbackOffset = requested?.offset ?? 0
  if (Array.isArray(data)) {
    return { items: data, total: null, limit: fallbackLimit, offset: fallbackOffset }
  }
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    total: typeof data?.total === 'number' ? data.total : null,
    limit: typeof data?.limit === 'number' ? data.limit : fallbackLimit,
    offset: typeof data?.offset === 'number' ? data.offset : fallbackOffset,
  }
}

/** A row of the practice content library (GET /admin/resources). */
export interface ResourceItem {
  id: string
  title: string
  author: string | null
  category: string
  description: string | null
  file_url: string | null
  /** Topic slug, media word, and the provenance marker ('verified' / 'unverified'). */
  tags: string[]
  created_at: string
}

// ── Patient portal (/me/*) ────────────────────────────────────────────────
// Every shape below is transcribed from the SQL the backend actually runs
// (backend/src/repositories/patient_portal_repository_db_real.py), not from a
// mock. The routes are all guarded by get_patient_context, so a token without a
// patient_id gets 403 "Patient access only." from every one of them.

/** GET /me/profile — the signed-in patient's own record. */
export interface MyProfile {
  id: string
  full_name: string | null
  gender: string | null
  dob: string | null
  /** `diagnosis` is returned twice by the server, under both names. */
  primary_diagnosis: string | null
  diagnosis: string | null
  status: string | null
  /** `risk` is returned twice by the server, under both names. */
  risk_level: string | null
  risk: string | null
  therapist_id: string | null
}

/** GET /me/mood — one row per check-in. Both scores are 1–5 (DB CHECK). */
export interface MoodEntry {
  id: string
  mood_score: number
  energy_score: number
  note: string | null
  /** jsonb column; may arrive as an array or as its raw JSON text. */
  emotions: unknown
  logged_at: string
}

/** POST /me/mood body. Both scores are required by the server. */
export interface MoodLogIn {
  mood_score: number
  energy_score: number
  note?: string | null
  emotions?: string[]
}

/**
 * GET /me/assessments — scored results, newest first.
 *
 * `template_id` is the raw instrument identifier stored on the result row; the
 * server sends no display name for it, so nothing may be substituted. There is
 * no maximum-score field either, which is why no proportion bar can be drawn.
 */
export interface MyAssessmentResult {
  id: string
  template_id: string | null
  score_total: number | null
  severity_band: string | null
  interpretation_text: string | null
  taken_at: string | null
}

/** GET /me/homework — `status` is lower-cased by the service before it is sent. */
export interface MyHomeworkTask {
  id: string
  title: string | null
  description: string | null
  task_type: string | null
  status: string | null
  due_date: string | null
  assigned_at: string | null
  patient_feedback: unknown
}

/**
 * GET /me/sessions — at most 20 rows, newest scheduled_at first, past and
 * future together. No clinician name is included, so none can be shown.
 */
export interface MySession {
  id: string
  session_type: string | null
  scheduled_at: string | null
  duration_minutes: number | null
  status: string | null
  summary_snippet: string | null
}

/** POST /me/ai-chat — the companion's reply to one message. */
export interface AriaReply {
  patient_id: string
  conversation_id: string
  reply: string
}

/** Practice-wide counters (GET /dashboard/summary). Every field is a COUNT(*). */
export interface PracticeSummary {
  active_cases: number
  new_this_month: number
  risk_alerts: number
  high_priority: number
  assessments_completed: number
  sessions_today: number
  sessions_remaining: number
}

/**
 * Thrown when a 2xx reply is not the list the endpoint is documented to return.
 *
 * It must never be flattened to `[]`. On the patient app an empty list is
 * rendered as a statement about the patient's own record — "No assessment
 * results have been recorded for you yet" — so turning an unreadable reply into
 * an empty list would state a clinical fact the server never sent. Callers see
 * a rejection and show their failure state instead.
 */
export class MalformedResponseError extends Error {
  readonly isMalformedResponse = true
  constructor(endpoint: string) {
    super(`${endpoint} did not return a list.`)
    this.name = 'MalformedResponseError'
  }
}

function expectList<T>(data: unknown, endpoint: string): T[] {
  if (!Array.isArray(data)) throw new MalformedResponseError(endpoint)
  return data as T[]
}

const processQueue = (error: any, token?: string) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  isRefreshing = false
  failedQueue = []
}

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor: attach access token
    this.client.interceptors.request.use(
      (config) => {
        const token = getAccessToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error),
    )

    // Response interceptor: handle 401 with auto-refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any

        // Only auto-refresh on 401 and only once per request
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (isRefreshing) {
            // Queue the request while refresh is in progress
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject })
            }).then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              return this.client(originalRequest)
            })
          }

          originalRequest._retry = true
          isRefreshing = true

          try {
            const refreshToken = getRefreshToken()
            if (!refreshToken) {
              clearTokens()
              window.location.href = '/login'
              return Promise.reject(error)
            }

            const response = await axios.post<TokenPair>(`${API_URL}/auth/refresh`, {
              refresh_token: refreshToken,
            })

            const { access_token, refresh_token } = response.data
            saveTokens(access_token, refresh_token)

            originalRequest.headers.Authorization = `Bearer ${access_token}`
            processQueue(null, access_token)

            return this.client(originalRequest)
          } catch (err) {
            processQueue(err, undefined)
            clearTokens()
            window.location.href = '/login'
            return Promise.reject(err)
          }
        }

        return Promise.reject(error)
      },
    )
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<TokenPair> {
    const response = await this.client.post<TokenPair>('/auth/login', {
      email,
      password,
    })
    return response.data
  }

  async loginWithGoogle(idToken: string): Promise<TokenPair> {
    const response = await this.client.post<TokenPair>('/auth/google', {
      id_token: idToken,
    })
    return response.data
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout')
    } finally {
      clearTokens()
    }
  }

  // Patient endpoints

  // GET /patients answers with a paginated envelope: { items, total, limit, offset }.
  // Callers that only want the rows should use getPatients() below — it unwraps
  // the envelope and still accepts the older bare-array response, so no caller
  // breaks depending on which side of the change is deployed first.
  async getPatientsPage(opts?: { mine?: boolean; limit?: number; offset?: number }): Promise<PatientsPage> {
    const params: Record<string, string | number | boolean> = {}
    if (opts?.mine) params.mine = true
    if (opts?.limit !== undefined) params.limit = opts.limit
    if (opts?.offset !== undefined) params.offset = opts.offset
    const response = await this.client.get('/patients', {
      params: Object.keys(params).length ? params : undefined,
    })
    return toPatientsPage(response.data, opts)
  }

  async getPatients(opts?: { mine?: boolean; limit?: number; offset?: number }) {
    const page = await this.getPatientsPage(opts)
    return page.items
  }

  async getCurrentAppointment() {
    const response = await this.client.get('/appointments/current')
    return response.data
  }

  // `from`/`to` are inclusive plain calendar dates (YYYY-MM-DD), `mine` scopes
  // the list to the signed-in clinician. Called with no params the request is
  // identical to the original no-parameter route.
  async getAppointments(params?: { from?: string; to?: string; mine?: boolean }) {
    const query: Record<string, string | boolean> = {}
    if (params?.from) query.from = params.from
    if (params?.to) query.to = params.to
    if (params?.mine) query.mine = true
    const response = await this.client.get('/appointments', {
      params: Object.keys(query).length ? query : undefined,
    })
    return response.data
  }

  async getPatient(id: string) {
    const response = await this.client.get(`/patients/${id}`)
    return response.data
  }

  async createPatient(data: any) {
    const response = await this.client.post('/patients', data)
    return response.data
  }

  async getClinicians() {
    const response = await this.client.get('/clinicians')
    return response.data
  }

  async getClinicianDashboard() {
    const response = await this.client.get('/dashboard/clinician-summary')
    return response.data
  }

  async updatePatient(id: string, data: any) {
    const response = await this.client.patch(`/patients/${id}`, data)
    return response.data
  }

  // Assessment endpoints
  async getAssessmentTemplates() {
    const response = await this.client.get('/assessments/templates')
    return response.data
  }

  async getAssessmentCatalog() {
    const response = await this.client.get('/admin/assessment-catalog')
    return response.data
  }

  // Content library. The rows are the ingested knowledge-base entries; each
  // carries its topic slug and its provenance marker inside `tags`.
  async getResources(): Promise<ResourceItem[]> {
    const response = await this.client.get<ResourceItem[]>('/admin/resources')
    return Array.isArray(response.data) ? response.data : []
  }

  async uploadAssessmentJson(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const response = await this.client.post('/admin/assessment-catalog/upload-json', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  }

  async uploadMaterialDocument(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const response = await this.client.post('/admin/material-uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  }

  async getAssessmentVersions(catalogId: string) {
    const response = await this.client.get(`/admin/assessment-catalog/${catalogId}/versions`)
    return response.data
  }

  async updateAssessmentVersion(versionId: string, body: any) {
    const response = await this.client.patch(`/admin/assessment-versions/${versionId}`, body)
    return response.data
  }

  async publishAssessmentVersion(versionId: string) {
    const response = await this.client.post(`/admin/assessment-versions/${versionId}/publish`)
    return response.data
  }

  // ── Controlled Trial Mode ────────────────────────────────────────────
  async getAssessmentTrial(catalogId: string) {
    const response = await this.client.get(`/admin/assessment-catalog/${catalogId}/trial`)
    return response.data
  }

  async activateAssessmentTrial(catalogId: string, data: any, governanceApproved = false) {
    const response = await this.client.post(
      `/admin/assessment-catalog/${catalogId}/trial`,
      data,
      { params: { governance_approved: governanceApproved } },
    )
    return response.data
  }

  async recordTrialAdministration(trialId: string, data: any) {
    const response = await this.client.post(`/admin/assessment-trials/${trialId}/administrations`, data)
    return response.data
  }

  async submitAssessmentLicense(catalogId: string, data: any, trialId?: string) {
    const response = await this.client.post(
      `/admin/assessment-catalog/${catalogId}/license`,
      data,
      trialId ? { params: { trial_id: trialId } } : undefined,
    )
    return response.data
  }

  async reviewAssessmentLicense(licenseId: string, approve: boolean, notes?: string) {
    const response = await this.client.post(`/admin/assessment-licenses/${licenseId}/review`, {
      approve,
      notes,
    })
    return response.data
  }

  async getAssessmentRecommendations(normalizedResult: any) {
    const response = await this.client.post('/assessment-recommendations', normalizedResult)
    return response.data
  }

  // ── Care plan (clinician-facing) ─────────────────────────────────────
  /** GET /patients/{id}/careplans — every plan for the patient, newest first. */
  // ── Bulk patient import ──────────────────────────────────────────────
  /** Per-row outcome of POST /patients/bulk-upload. Row numbers match the
   *  source file: header = row 1, first patient = row 2. */
  async bulkUploadPatients(file: File): Promise<{
    created: number
    failed: number
    errors: { row: number; error: string }[]
  }> {
    const form = new FormData()
    form.append('file', file)
    const response = await this.client.post('/patients/bulk-upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  }

  /** GET /patients/bulk-template — header-only CSV, for anyone who would rather
   *  not use the spreadsheet form. */
  async downloadPatientTemplate(): Promise<Blob> {
    const response = await this.client.get('/patients/bulk-template', { responseType: 'blob' })
    return response.data
  }

  async getPatientCarePlans(patientId: string) {
    const response = await this.client.get(`/patients/${patientId}/careplans`)
    return response.data
  }

  /** GET /patients/{id}/homework — assigned tasks. */
  async getPatientHomework(patientId: string) {
    const response = await this.client.get(`/patients/${patientId}/homework`)
    return response.data
  }

  async getPatientAssessments(patientId: string) {
    const response = await this.client.get(`/patients/${patientId}/assessments`)
    return response.data
  }

  async submitAssessment(patientId: string, templateId: string, answers: any, sessionId?: string) {
    const response = await this.client.post(`/patients/${patientId}/assessments`, {
      template_id: templateId,
      answers,
      session_id: sessionId,
    })
    return response.data
  }

  // `appointmentId` links the session to the calendar slot it is being held in,
  // so the two rows stop being separate records of the same event. Omitted when
  // the session was started ad hoc rather than from a booked appointment.
  async createClinicianSession(patientId: string, templateKeys: string[], appointmentId?: string | null) {
    const response = await this.client.post('/clinician-sessions', {
      patient_id: patientId,
      template_keys: templateKeys,
      ...(appointmentId ? { appointment_id: appointmentId } : {}),
    })
    return response.data
  }

  async getClinicianSession(sessionId: string) {
    const response = await this.client.get(`/clinician-sessions/${sessionId}`)
    return response.data
  }

  // `duration_minutes` is the elapsed consultation time measured by the client;
  // `next_appointment` books the follow-up in the same round trip and comes back
  // linked as `next_appointment_id`.
  async completeClinicianSession(
    sessionId: string,
    body?: { duration_minutes?: number; next_appointment?: NextAppointmentIn },
  ) {
    const response = await this.client.post(
      `/clinician-sessions/${sessionId}/complete`,
      body && Object.keys(body).length ? body : undefined,
    )
    return response.data
  }

  // Session endpoints
  async getPatientSessions(patientId: string) {
    const response = await this.client.get(`/patients/${patientId}/sessions`)
    return response.data
  }

  async createSession(patientId: string, data: any) {
    const response = await this.client.post(`/patients/${patientId}/sessions`, data)
    return response.data
  }

  // Sign-off. `therapist_approved` is what the dashboard's "Notes due" counter
  // reads, so this is the only thing that can ever take a note off that list.
  async updatePatientSessionNote(patientId: string, noteId: string, data: { therapist_approved: boolean }) {
    const response = await this.client.patch(`/patients/${patientId}/sessions/${noteId}`, data)
    return response.data
  }

  async updateSession(sessionId: string, data: any) {
    const response = await this.client.patch(`/sessions/${sessionId}`, data)
    return response.data
  }

  // Dashboard endpoints
  async getDashboard() {
    const response = await this.client.get('/dashboard')
    return response.data
  }

  // Practice-wide counters. Every field is a COUNT(*) scoped to the caller's
  // org, so these are safe to render as fact.
  async getPracticeSummary(): Promise<PracticeSummary> {
    const response = await this.client.get<PracticeSummary>('/dashboard/summary')
    return response.data
  }

  // ── Patient portal (/me/*) ──────────────────────────────────────────────
  // These are the only endpoints the patient app is allowed to read from. They
  // resolve the patient from the token, so none of them takes a patient id —
  // there is no way for this client to ask for somebody else's record.

  async getMyProfile(): Promise<MyProfile> {
    const response = await this.client.get<MyProfile>('/me/profile')
    return response.data
  }

  /** `days` is the look-back window the server filters on; it defaults to 30. */
  async getMyMood(days = 30): Promise<MoodEntry[]> {
    const response = await this.client.get<MoodEntry[]>('/me/mood', { params: { days } })
    return expectList<MoodEntry>(response.data, 'GET /me/mood')
  }

  async logMyMood(body: MoodLogIn): Promise<{ id: string; status: string }> {
    const response = await this.client.post('/me/mood', body)
    return response.data
  }

  async getMyAssessments(): Promise<MyAssessmentResult[]> {
    const response = await this.client.get<MyAssessmentResult[]>('/me/assessments')
    return expectList<MyAssessmentResult>(response.data, 'GET /me/assessments')
  }

  async getMyHomework(): Promise<MyHomeworkTask[]> {
    const response = await this.client.get<MyHomeworkTask[]>('/me/homework')
    return expectList<MyHomeworkTask>(response.data, 'GET /me/homework')
  }

  /** Marks one task complete. The server sets status COMPLETED and stamps the time. */
  async submitMyHomework(
    taskId: string,
    body?: { completion_notes?: string | null; helpfulness_rating?: number | null },
  ): Promise<{ status: string }> {
    const response = await this.client.post(`/me/homework/${taskId}/submit`, body ?? {})
    return response.data
  }

  async getMySessions(upcomingOnly = false): Promise<MySession[]> {
    const response = await this.client.get<MySession[]>('/me/sessions', {
      params: upcomingOnly ? { upcoming_only: true } : undefined,
    })
    return expectList<MySession>(response.data, 'GET /me/sessions')
  }

  /**
   * Asks the practice for a session. `preferred_date` must be YYYY-MM-DD — the
   * server rejects anything else with a 400. The row lands with status
   * 'requested'; it is a request, not a booking.
   */
  async requestMySession(body: { preferred_date?: string | null; notes?: string | null }) {
    const response = await this.client.post('/me/sessions/request', body)
    return response.data as { id: string; status: string; scheduled_at: string | null }
  }

  /** One turn of the patient AI companion. Pass the id back to stay in a thread. */
  async sendAriaMessage(message: string, conversationId?: string | null): Promise<AriaReply> {
    const response = await this.client.post<AriaReply>('/me/ai-chat', {
      message,
      conversation_id: conversationId ?? null,
    })
    return response.data
  }

  // Health check
  async health() {
    const response = await this.client.get('/health')
    return response.data
  }

  getClient() {
    return this.client
  }
}

export const apiClient = new ApiClient()
export default apiClient
