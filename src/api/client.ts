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
 
// "Single-flight" refresh: if several requests hit a 401 around the same
// time (e.g. a Promise.all of several DELETE calls), they must NOT each
// trigger their own POST /token/refresh/ - the backend rotates refresh
// tokens on use, so only the first of several simultaneous refresh calls
// would actually succeed; the rest would fail with 401 using an
// already-rotated-out token. Instead, all callers share the same in-flight
// refresh promise and each retries once it resolves.
let refreshPromise: Promise<void> | null = null
 
function refreshAccessToken(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/accounts/token/refresh/')
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}
 
/**
 * Response interceptor: on a 401 (access token expired), tries once to
 * refresh it (see refreshAccessToken above) and replays the original
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
        await refreshAccessToken()
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
  

