import api from './client'
import type { Rolle } from './auth'
 
/**
 * IMPORTANT: The backend's MitgliederManageSerializer uses a
 * PrimaryKeyRelatedField for `rollen`, which DRF serializes as a plain list
 * of role IDs on read (e.g. [1, 3]) - NOT nested {id, name} objects. There's
 * no endpoint yet that maps those IDs to role names, so we can't display or
 * edit role names properly on the frontend until that exists (tracked as
 * backend follow-up work).
 */
export interface Mitglied {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
  strasse: string
  hausnummer: string
  plz: string
  ort: string
  geburtstag: string | null
  full_name: string
  rollen: number[]
  is_active: boolean
}
 
export type MitgliedPayload = Partial<
  Pick<Mitglied, 'first_name' | 'last_name' | 'strasse' | 'hausnummer' | 'plz' | 'ort' | 'geburtstag'>
> & { rollen?: number[] }
 
export async function listMitglieder(): Promise<Mitglied[]> {
  const response = await api.get<Mitglied[]>('/accounts/mitglieder/')
  return response.data
}
 
export async function updateMitglied(id: number, payload: MitgliedPayload): Promise<Mitglied> {
  const response = await api.patch<Mitglied>(`/accounts/mitglieder/${id}/`, payload)
  return response.data
}
 
/**
 * Deletes/deactivates a member. The backend deactivates (200) unless the
 * caller is the platform owner, in which case it hard-deletes (204) -
 * `hardDeleted` tells the caller which one happened so the UI can react
 * correctly (remove from list vs. just mark inactive).
 */
export async function deleteMitglied(id: number): Promise<{ hardDeleted: boolean }> {
  const response = await api.delete(`/accounts/mitglieder/${id}/`)
  return { hardDeleted: response.status === 204 }
}
 
export async function reaktiviereMitglied(id: number): Promise<void> {
  await api.post(`/accounts/mitglieder/${id}/reaktivieren/`)
}
 
export interface InvitePayload {
  email: string
  rolle: 'mitglied' | 'vorstand' | 'admin'
}
 
export async function inviteMitglied(payload: InvitePayload): Promise<void> {
  await api.post('/accounts/invite/', payload)
}
 
/** Calls GET /api/accounts/rollen/ - lists all roles with id and name, so
 *  role IDs elsewhere (e.g. Mitglied.rollen) can be turned back into
 *  readable names. Vorstand/Admin only, matching the backend permission. */
export async function listRollen(): Promise<Rolle[]> {
  const response = await api.get<Rolle[]>('/accounts/rollen/')
  return response.data
}
 
export interface Einladung {
  id: number
  email: string
  rolle: { id: number; name: string } | null
  erstellt_von: string
  erstellt_am: string
  verwendet: boolean
  ist_gueltig: boolean
}
 
export async function listEinladungen(): Promise<Einladung[]> {
  const response = await api.get<Einladung[]>('/accounts/einladungen/')
  return response.data
}
 
/** Resends the invite email with a fresh token and reset 7-day validity window. */
export async function resendEinladung(id: number): Promise<Einladung> {
  const response = await api.post<Einladung>(`/accounts/einladungen/${id}/erneut_senden/`)
  return response.data
}
 
/** Revokes an invite - deletes it, so its token becomes unusable. */
export async function revokeEinladung(id: number): Promise<void> {
  await api.delete(`/accounts/einladungen/${id}/`)
}
  



