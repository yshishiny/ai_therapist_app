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
  async getPatients() {
    const response = await this.client.get('/patients')
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

  async updatePatient(id: string, data: any) {
    const response = await this.client.patch(`/patients/${id}`, data)
    return response.data
  }

  // Assessment endpoints
  async getAssessmentTemplates() {
    const response = await this.client.get('/assessments/templates')
    return response.data
  }

  async getPatientAssessments(patientId: string) {
    const response = await this.client.get(`/patients/${patientId}/assessments`)
    return response.data
  }

  async submitAssessment(patientId: string, templateId: string, answers: any) {
    const response = await this.client.post(`/patients/${patientId}/assessments`, {
      template_id: templateId,
      answers,
    })
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
