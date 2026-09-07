import api from './client'
 
export interface Rolle {
  id: number
  name: string
}
 
export interface LoggedInUser {
  id: number
  email: string
  username: string
  rollen?: Rolle[]
}
 
export interface LoginPayload {
  email: string
  password: string
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
 
/**
 * Calls GET /api/accounts/me/. Used to check on app start whether the
 * access_token cookie from a previous session is still valid - without
 * this, currentUser would reset to null on every page reload even though
 * the user is technically still logged in server-side.
 */
export async function getMe(): Promise<LoggedInUser> {
  const response = await api.get<LoggedInUser>('/accounts/me/')
  return response.data
}
 
/** Checks whether the given user has the given role name (e.g. 'vorstand', 'admin'). */
export function hasRole(user: LoggedInUser, roleName: string): boolean {
  return user.rollen?.some((r) => r.name === roleName) ?? false
}
 



