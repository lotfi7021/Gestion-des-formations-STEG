import { api } from "./client";

export type Presence = {
  id: string;
  datePresence: string;
  statutFormation: "present" | "absent" | "retard" | "excuse";
  statutCantine: "present" | "absent" | "retard" | "excuse";
  heureArrivee: string;
  heureDepart: string;
  commentaire: string;
  isJustified: boolean;
  justificatifUrl: string;
  employe: any;
  session: any;
};

export async function getPresences(): Promise<Presence[]> {
  return api.get<Presence[]>("/presences");
}

export async function getPresence(id: string): Promise<Presence> {
  return api.get<Presence>(`/presences/${id}`);
}
