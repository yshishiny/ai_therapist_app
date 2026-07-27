import axios, { AxiosInstance, AxiosError } from 'axios'
import { TokenPair } from '../types/auth'
import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from './storage'

const API_URL = (import.meta as any).env.VITE_API_URL || 'https://aitherapistapp-production.up.railway.app'

let isRefreshing = false
let failedQueue: Array<{ resolve: (value: any) => void; reject: (reason?: any) => void }> = []

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
  async getPatients(opts?: { mine?: boolean }) {
    const response = await this.client.get('/patients', { params: opts?.mine ? { mine: true } : undefined })
    return response.data
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

  async createClinicianSession(patientId: string, templateKeys: string[]) {
    const response = await this.client.post('/clinician-sessions', {
      patient_id: patientId,
      template_keys: templateKeys,
    })
    return response.data
  }

  async getClinicianSession(sessionId: string) {
    const response = await this.client.get(`/clinician-sessions/${sessionId}`)
    return response.data
  }

  async completeClinicianSession(sessionId: string) {
    const response = await this.client.post(`/clinician-sessions/${sessionId}/complete`)
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

  async updateSession(sessionId: string, data: any) {
    const response = await this.client.patch(`/sessions/${sessionId}`, data)
    return response.data
  }

  // Dashboard endpoints
  async getDashboard() {
    const response = await this.client.get('/dashboard')
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
