const BASE = import.meta.env.VITE_API_URL ?? ''
const TOKEN_KEY = 'skin_tracker_token'

export function apiUrl(path: string) {
  return `${BASE}${path}`
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getStoredToken()
  const headers = new Headers(init?.headers)
  if (token) headers.set('X-App-Token', token)

  const res = await fetch(apiUrl(path), { ...init, headers })

  if (res.status === 401) {
    clearStoredToken()
    window.dispatchEvent(new Event('auth:logout'))
  }

  return res
}
