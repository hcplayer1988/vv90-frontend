import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
 
/**
 * Shared Axios instance for all backend calls.
 *
 * withCredentials: true is essential here - the backend uses httpOnly
 * cookies for the JWT access/refresh tokens (not the Authorization header),
 * so the browser needs to be told to actually send/accept cookies on
 * cross-origin requests (localhost:5173 -> localhost:8000).
 */
const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})
 
// Extends Axios' request config with a custom flag so we can tell "this
// request already went through one retry after a refresh" apart from a
// fresh request - without it, a still-invalid session would retry forever.
interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}
 
// App.tsx registers a callback here on mount so this module can tell it
// "the session is truly gone" (refresh itself failed) without client.ts
// needing to know anything about React state directly.
let onAuthFailure: (() => void) | null = null
 
export function setAuthFailureHandler(handler: () => void) {
  onAuthFailure = handler
}
 
/**
 * Response interceptor: on a 401 (access token expired), tries once to
 * refresh it via POST /accounts/token/refresh/ and replays the original
 * request. The refresh call itself is excluded from this logic - otherwise
 * a failing refresh would try to refresh itself, endlessly.
 */
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined
 
    const isRefreshCall = originalRequest?.url?.includes('/accounts/token/refresh/')
    const isUnauthorized = error.response?.status === 401
 
    if (isUnauthorized && originalRequest && !originalRequest._retry && !isRefreshCall) {
      originalRequest._retry = true
      try {
        await api.post('/accounts/token/refresh/')
        return api(originalRequest)
      } catch {
        // Refresh token is also expired/invalid - the session is really over.
        onAuthFailure?.()
        return Promise.reject(error)
      }
    }
 
    return Promise.reject(error)
  }
)
 
export default api
  

