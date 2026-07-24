export type UserRole = 'patient' | 'clinician' | 'supervisor' | 'admin'

export interface TokenPayload {
  sub: string
  role: UserRole
  org_id: string
  exp: number
  iat: number
  type: 'access' | 'refresh'
  jti: string
}

export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RefreshRequest {
  refresh_token: string
}

export interface AuthState {
  user: TokenPayload | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
}
