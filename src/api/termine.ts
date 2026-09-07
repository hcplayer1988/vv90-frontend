import api from './client'
 
export type TerminTyp = 'spielplan' | 'mitgliederversammlung' | 'turnier' | 'training' | 'sonstiges'
export type WiederholungEinheit = 'tage' | 'wochen' | 'monate' | ''
 
export interface Termin {
  id: number
  titel: string
  beschreibung: string
  typ: TerminTyp
  ort: string
  start: string
  ende: string | null
  ist_wiederkehrend: boolean
  wiederholung_einheit: WiederholungEinheit
  wiederholung_abstand: number | null
  wiederholung_bis: string | null
  recurrence_label: string
  erstellt_von: string
  erstellt_am: string
}
 
// What we send when creating/editing - matches Termin minus the fields the
// backend fills in itself (id, recurrence_label, erstellt_von, erstellt_am).
export type TerminPayload = Partial<
  Omit<Termin, 'id' | 'recurrence_label' | 'erstellt_von' | 'erstellt_am'>
>
 
export async function listTermine(): Promise<Termin[]> {
  const response = await api.get<Termin[]>('/termine/')
  return response.data
}
 
export async function createTermin(payload: TerminPayload): Promise<Termin> {
  const response = await api.post<Termin>('/termine/', payload)
  return response.data
}
 
export async function updateTermin(id: number, payload: TerminPayload): Promise<Termin> {
  const response = await api.patch<Termin>(`/termine/${id}/`, payload)
  return response.data
}
 
export async function deleteTermin(id: number): Promise<void> {
  await api.delete(`/termine/${id}/`)
}
 