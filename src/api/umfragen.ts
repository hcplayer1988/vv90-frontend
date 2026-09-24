import api from "./client";
 
export type UmfrageKontext = "forum" | "termine" | "allgemein";
 
export interface UmfrageWaehler {
  id: number;
  name: string;
}
 
export interface UmfrageOption {
  id: number;
  text: string;
  start: string | null;
  ende: string | null;
  anzahl_stimmen: number;
  meine_stimme: boolean;
  waehler: UmfrageWaehler[];
}
 
export interface Umfrage {
  id: number;
  frage: string;
  mehrfachauswahl: boolean;
  kontext: UmfrageKontext;
  beitrag: number | null;
  ersteller: string;
  erstellt_am: string;
  geschlossen: boolean;
  umgewandelt_in_termin: number | null;
  optionen: UmfrageOption[];
}
 
export interface UmfrageOptionPayload {
  text: string;
  start?: string;
  ende?: string;
}
 
export interface UmfrageErstellenPayload {
  frage: string;
  mehrfachauswahl: boolean;
  kontext: UmfrageKontext;
  beitrag?: number;
  optionen: UmfrageOptionPayload[];
}
 
export async function erstelleUmfrage(
  payload: UmfrageErstellenPayload,
): Promise<Umfrage> {
  const response = await api.post<Umfrage>("/umfragen/", payload);
  return response.data;
}
 
export async function stimmeAbgeben(
  umfrageId: number,
  optionIds: number[],
): Promise<Umfrage> {
  const response = await api.post<Umfrage>(`/umfragen/${umfrageId}/abstimmen/`, {
    optionen: optionIds,
  });
  return response.data;
}
 
export async function loescheUmfrage(umfrageId: number): Promise<void> {
  await api.delete(`/umfragen/${umfrageId}/`);
}
 
export async function listUmfragen(kontext: UmfrageKontext): Promise<Umfrage[]> {
  const response = await api.get<Umfrage[]>("/umfragen/", { params: { kontext } });
  return response.data;
}
 