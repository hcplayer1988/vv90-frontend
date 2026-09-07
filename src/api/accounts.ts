import api from './client'
 
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
>
 
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