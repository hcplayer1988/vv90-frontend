import api from './client'
import type { PaginatedResponse } from './pagination'
import type { Umfrage } from './umfragen'
 
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
 
export interface ListTermineParams {
  page?: number
  page_size?: number
  typ?: TerminTyp
}
 
/** Fetches one page of Termine from the server, optionally filtered by
 *  ?typ=. Used by the list view - see listAlleTermine for the calendar,
 *  which needs the complete, unfiltered set at once. */
export async function listTermine(params: ListTermineParams = {}): Promise<PaginatedResponse<Termin>> {
  const response = await api.get<PaginatedResponse<Termin>>('/termine/', {
    params: { page: params.page, page_size: params.page_size, typ: params.typ },
  })
  return response.data
}
 
/** Fetches ALL Termine in one unpaginated call (?alle=1). Needed by the
 *  calendar view, which computes recurring occurrences client-side
 *  (utils/terminRecurrence.ts) and therefore needs every Termin at once,
 *  not just one page - and by anything else (like the dashboard) that
 *  needs to compute the "next" upcoming Termin across the whole dataset. */
export async function listAlleTermine(): Promise<Termin[]> {
  const response = await api.get<Termin[]>('/termine/', { params: { alle: '1' } })
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
 
// ===== Doodle-artige Terminabstimmungen =====
// Erstellen, Abstimmen und Löschen laufen über die geteilten
// /api/umfragen/-Endpunkte (siehe api/umfragen.ts) - hier stehen nur die
// beiden Termine-spezifischen Funktionen: die gefilterte Liste (nur die
// eigenständigen Abstimmungen ohne Beitrag) und die Umwandlung einer
// Gewinner-Option in einen echten Termin.
 
export interface AbstimmungUmwandelnPayload {
  option: number
  titel: string
  typ: TerminTyp
  ort?: string
  beschreibung?: string
}
 
/** Fetches ALL standalone (Doodle-style) Termine-Abstimmungen in one
 *  unpaginated call - the backend's TermineAbstimmungViewSet has no
 *  pagination_class, same reasoning as e.g. listAntworten in api/forum.ts. */
export async function listTermineAbstimmungen(): Promise<Umfrage[]> {
  const response = await api.get<Umfrage[]>('/termine/abstimmungen/')
  return response.data
}
 
/** Vorstand-only: turns the given winning Option of a standalone Umfrage
 *  into a real Termin (using the Option's start/ende) and closes the
 *  Umfrage so it can no longer be voted on. */
export async function umwandelnAbstimmung(
  umfrageId: number,
  payload: AbstimmungUmwandelnPayload,
): Promise<Umfrage> {
  const response = await api.post<Umfrage>(`/termine/abstimmungen/${umfrageId}/umwandeln/`, payload)
  return response.data
}
 


