import { api } from "./client";
import type { UserRef, SessionRef } from "./types";

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
  user: UserRef;
  session: SessionRef;
};

export async function getPresences(): Promise<Presence[]> {
  return api.get<Presence[]>("/presences");
}

export async function getPresence(id: string): Promise<Presence> {
  return api.get<Presence>(`/presences/${id}`);
}
