import api from './client'
 
export interface Datei {
  id: number
  url: string
  ordner: number | null
  dateiname: string
  groesse_mb: number
  content_type: string
  hochgeladen_am: string
}
 
export interface Ordner {
  id: number
  name: string
  parent: number | null
  erstellt_am: string
}
 
export interface SpeicherInfo {
  genutzt_mb: number
  quota_mb: number
  frei_mb: number
}
 
/** Fetches the files in one folder (ordnerId = null → Hauptverzeichnis).
 *  The backend already filters to the logged-in member's own files. */
export async function listDateien(ordnerId: number | null): Promise<Datei[]> {
  const response = await api.get<Datei[]>('/dateien/', {
    params: ordnerId === null ? {} : { ordner: ordnerId },
  })
  return response.data
}
 
/** Uploads a new file into the given folder (null = Hauptverzeichnis). Same
 *  axios quirk as uploadAvatar in auth.ts: the shared 'api' instance has a
 *  fixed JSON Content-Type default, so it must be explicitly unset here for
 *  axios to detect the FormData and set the correct multipart boundary. */
export async function uploadDatei(file: File, ordnerId: number | null): Promise<Datei> {
  const formData = new FormData()
  formData.append('datei', file)
  if (ordnerId !== null) {
    formData.append('ordner', String(ordnerId))
  }
  const response = await api.post<Datei>('/dateien/', formData, {
    headers: { 'Content-Type': undefined },
  })
  return response.data
}
 
/** Deletes one of the member's own files. The id must belong to them - the
 *  backend 404s otherwise, since get_queryset() excludes other members'
 *  files entirely (not just hides them). */
export async function deleteDatei(id: number): Promise<void> {
  await api.delete(`/dateien/${id}/`)
}
 
/** Moves a file into another folder (ordnerId = null → Hauptverzeichnis). */
export async function verschiebeDatei(id: number, ordnerId: number | null): Promise<Datei> {
  const response = await api.post<Datei>(`/dateien/${id}/verschieben/`, { ordner: ordnerId })
  return response.data
}
 
/** Fetches how much of the 50MB quota the member has used/left, in MB. */
export async function getSpeicher(): Promise<SpeicherInfo> {
  const response = await api.get<SpeicherInfo>('/dateien/speicher/')
  return response.data
}
 
/** Fetches ALL of the member's folders in one flat list (with parent
 *  pointers), so the frontend can build the folder tree, the breadcrumb
 *  path and the "verschieben"-Zielordner-Auswahl entirely client-side
 *  without a round trip on every navigation click. */
export async function listAlleOrdner(): Promise<Ordner[]> {
  const response = await api.get<Ordner[]>('/dateien/ordner/', { params: { alle: '1' } })
  return response.data
}
 
export async function createOrdner(name: string, parentId: number | null): Promise<Ordner> {
  const response = await api.post<Ordner>('/dateien/ordner/', { name, parent: parentId })
  return response.data
}
 
export async function renameOrdner(id: number, name: string): Promise<Ordner> {
  const response = await api.patch<Ordner>(`/dateien/ordner/${id}/`, { name })
  return response.data
}
 
/** Deletes an empty folder. The backend rejects this (400) if the folder
 *  still contains files or subfolders. */
export async function deleteOrdner(id: number): Promise<void> {
  await api.delete(`/dateien/ordner/${id}/`)
}
 