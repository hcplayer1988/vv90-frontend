import api from './client'
 
export interface LoginPayload {
  email: string
  password: string
}
 
export interface LoggedInUser {
  id: number
  email: string
  username: string
}
 
export interface LoginResponse {
  detail: string
  user: LoggedInUser
}
 
/**
 * Calls POST /api/accounts/login/. On success the backend sets the
 * access_token/refresh_token httpOnly cookies itself - there's nothing to
 * store on the frontend side beyond the returned user info.
 */
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/accounts/login/', payload)
  return response.data
}
 
/**
 * Calls POST /api/accounts/logout/. Blacklists the refresh token and clears
 * both auth cookies server-side - the frontend just needs to reset its own
 * currentUser state afterward (done in App.tsx).
 */
export async function logout(): Promise<void> {
  await api.post('/accounts/logout/')
}
 