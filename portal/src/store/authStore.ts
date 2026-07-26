import { create } from 'zustand'
import { AuthState, TokenPayload, UserRole } from '../types/auth'
import apiClient from '../services/api'
import {
  saveTokens,
  clearTokens,
  getAccessToken,
  decodeToken,
  isTokenExpired
} from '../services/storage'

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: (idToken: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => void
  hasRole: (role: UserRole | UserRole[]) => boolean
}

export const useAuthStore = create<AuthStore>((set, get) => {
  // Initialize auth state from storage
  const accessToken = getAccessToken()
  const user = accessToken && !isTokenExpired(accessToken)
    ? (decodeToken(accessToken) as TokenPayload)
    : null

  return {
    // Initial state
    user,
    accessToken,
    refreshToken: null,
    isAuthenticated: !!user,
    isLoading: false,

    // Actions
    login: async (email: string, password: string) => {
      set({ isLoading: true })
      try {
        const tokens = await apiClient.login(email, password)
        saveTokens(tokens.access_token, tokens.refresh_token)

        const decoded = decodeToken(tokens.access_token) as TokenPayload
        set({
          user: decoded,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          isAuthenticated: true,
          isLoading: false,
        })
      } catch (error) {
        set({ isLoading: false })
        throw error
      }
    },

    loginWithGoogle: async (idToken: string) => {
      set({ isLoading: true })
      try {
        const tokens = await apiClient.loginWithGoogle(idToken)
        saveTokens(tokens.access_token, tokens.refresh_token)

        const decoded = decodeToken(tokens.access_token) as TokenPayload
        set({
          user: decoded,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          isAuthenticated: true,
          isLoading: false,
        })
      } catch (error) {
        set({ isLoading: false })
        throw error
      }
    },

    logout: async () => {
      set({ isLoading: true })
      try {
        await apiClient.logout()
      } finally {
        clearTokens()
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        })
      }
    },

    checkAuth: () => {
      const token = getAccessToken()

      if (!token || isTokenExpired(token)) {
        clearTokens()
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        })
        return
      }

      const decoded = decodeToken(token) as TokenPayload
      set({
        user: decoded,
        accessToken: token,
        isAuthenticated: true,
      })
    },

    hasRole: (roles: UserRole | UserRole[]) => {
      const { user } = get()
      if (!user) return false

      const roleArray = Array.isArray(roles) ? roles : [roles]
      return roleArray.includes(user.role)
    },
  }
})
