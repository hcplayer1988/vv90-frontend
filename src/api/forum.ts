import api from "./client";

export interface Beitrag {
  id: number;
  titel: string;
  text: string;
  kategorie: string;
  autor: string;
  erstellt_am: string;
  aktualisiert_am: string;
  anzahl_kommentare: number;
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

export async function getBeitrag(id: number): Promise<Beitrag> {
  const response = await api.get<Beitrag>(`/forum/beitraege/${id}/`);
  return response.data;
}

export async function listBeitraege(): Promise<Beitrag[]> {
  const response = await api.get<Beitrag[]>("/forum/beitraege/");
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

export async function listKommentare(beitragId: number): Promise<Kommentar[]> {
  const response = await api.get<Kommentar[]>("/forum/kommentare/", {
    params: { beitrag: beitragId },
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
