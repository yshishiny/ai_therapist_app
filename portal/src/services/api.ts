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
