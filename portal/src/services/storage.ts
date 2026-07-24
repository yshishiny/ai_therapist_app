const ACCESS_TOKEN_KEY = 'auth.access_token'
const REFRESH_TOKEN_KEY = 'auth.refresh_token'

export function saveTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function decodeToken(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payload = parts[1]
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return decoded
  } catch {
    return null
  }
}

export function getStoredRole(): string | null {
  const token = getAccessToken()
  if (!token) return null
  const decoded = decodeToken(token)
  return decoded?.role || null
}

export function getStoredUserId(): string | null {
  const token = getAccessToken()
  if (!token) return null
  const decoded = decodeToken(token)
  return decoded?.sub || null
}

export function getStoredOrgId(): string | null {
  const token = getAccessToken()
  if (!token) return null
  const decoded = decodeToken(token)
  return decoded?.org_id || null
}

export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token)
  if (!decoded?.exp) return true
  return Date.now() >= decoded.exp * 1000
}

export function getTokenExpiresIn(token: string): number {
  const decoded = decodeToken(token)
  if (!decoded?.exp) return 0
  return decoded.exp * 1000 - Date.now()
}
