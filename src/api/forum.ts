import api from "./client";
import type { PaginatedResponse } from "./pagination";
import type { Umfrage } from "./umfragen";
 
export interface Beitrag {
  id: number;
  titel: string;
  text: string;
  kategorie: string;
  autor: string;
  erstellt_am: string;
  aktualisiert_am: string;
  anzahl_kommentare: number;
  umfrage: Umfrage | null;
}
 
export type BeitragPayload = Partial<
  Pick<Beitrag, "titel" | "text" | "kategorie">
>;
 
export interface Kommentar {
  id: number;
  beitrag: number;
  antwort_auf: number | null;
  autor: string;
  text: string;
  erstellt_am: string;
  likes: number;
  dislikes: number;
  meine_bewertung: "like" | "dislike" | null;
}
 
export type KommentarPayload = {
  beitrag: number;
  antwort_auf?: number | null;
  text: string;
};
 
// Matches the backend's ordering_fields on BeitragViewSet.
export type BeitraegeSortierung =
  | "-erstellt_am" 
  | "erstellt_am" 
  | "-anzahl_kommentare"; 
 
export interface ListBeitraegeParams {
  page?: number;
  page_size?: number;
  search?: string;
  kategorie?: string;
  meine?: boolean;
  ordering?: BeitraegeSortierung;
}
 
export async function getBeitrag(id: number): Promise<Beitrag> {
  const response = await api.get<Beitrag>(`/forum/beitraege/${id}/`);
  return response.data;
}
 
/** Fetches one page of Beiträge from the server. Search, category filter,
 *  "nur meine" and sorting all happen server-side now (not just
 *  pagination) - otherwise they'd only ever apply to whichever single page
 *  happens to be loaded. */
export async function listBeitraege(
  params: ListBeitraegeParams = {},
): Promise<PaginatedResponse<Beitrag>> {
  const response = await api.get<PaginatedResponse<Beitrag>>(
    "/forum/beitraege/",
    {
      params: {
        page: params.page,
        page_size: params.page_size,
        search: params.search || undefined,
        kategorie: params.kategorie || undefined,
        meine: params.meine ? "1" : undefined,
        ordering: params.ordering,
      },
    },
  );
  return response.data;
}
 
/** Fetches the distinct categories used across ALL posts (not just the
 *  current page) - needed for the filter chips now that the frontend no
 *  longer has every post loaded at once to derive them from locally. */
export async function listKategorien(): Promise<string[]> {
  const response = await api.get<string[]>("/forum/beitraege/kategorien/");
  return response.data;
}
 
export async function createBeitrag(payload: BeitragPayload): Promise<Beitrag> {
  const response = await api.post<Beitrag>("/forum/beitraege/", payload);
  return response.data;
}
 
export async function updateBeitrag(
  id: number,
  payload: BeitragPayload,
): Promise<Beitrag> {
  const response = await api.patch<Beitrag>(`/forum/beitraege/${id}/`, payload);
  return response.data;
}
 
export async function deleteBeitrag(id: number): Promise<void> {
  await api.delete(`/forum/beitraege/${id}/`);
}
 
/** Fetches one page of TOP-LEVEL comments for a post. Replies are fetched
 *  separately via listAntworten, always in full (see the backend
 *  KommentarPagination docstring for why only top-level comments are
 *  really paginated). */
export async function listKommentare(
  beitragId: number,
  params: { page?: number; page_size?: number } = {},
): Promise<PaginatedResponse<Kommentar>> {
  const response = await api.get<PaginatedResponse<Kommentar>>(
    "/forum/kommentare/",
    {
      params: {
        beitrag: beitragId,
        page: params.page,
        page_size: params.page_size,
      },
    },
  );
  return response.data;
}
 
/** Fetches ALL replies for a post in one unpaginated call. */
export async function listAntworten(beitragId: number): Promise<Kommentar[]> {
  const response = await api.get<Kommentar[]>("/forum/kommentare/", {
    params: { beitrag: beitragId, antworten: "1" },
  });
  return response.data;
}
 
export async function createKommentar(
  payload: KommentarPayload,
): Promise<Kommentar> {
  const response = await api.post<Kommentar>("/forum/kommentare/", payload);
  return response.data;
}
 
export async function updateKommentar(
  id: number,
  text: string,
): Promise<Kommentar> {
  const response = await api.patch<Kommentar>(`/forum/kommentare/${id}/`, {
    text,
  });
  return response.data;
}
 
export async function deleteKommentar(id: number): Promise<void> {
  await api.delete(`/forum/kommentare/${id}/`);
}
 
export interface BewertenResponse {
  likes: number;
  dislikes: number;
  meine_bewertung: "like" | "dislike" | null;
}
 
export async function bewerteKommentar(
  id: number,
  typ: "like" | "dislike",
): Promise<BewertenResponse> {
  const response = await api.post<BewertenResponse>(
    `/forum/kommentare/${id}/bewerten/`,
    { typ },
  );
  return response.data;
}
 