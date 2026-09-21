import { api } from "./client";
import type { EmployeRef, FormationRef, UserRef } from "./types";

export type Session = {
  id: string;
  dateDebut: string;
  dateFin: string;
  heureDebut: string;
  heureFin: string;
  lieu: string;
  salle: string;
  cvFormateurUrl: string;
  factureUrl: string;
  bonCommandeUrl: string;
  contratUrl: string;
  nombreParticipants: number;
  capaciteMax: number | null;
  isCompleted: boolean;
  isCancelled: boolean;
  notes: string;
  formation: FormationRef;
  participants: UserRef[];
  employes: EmployeRef[];
  formateurs: UserRef[];
  createdAt: string;
  updatedAt: string;
};

export async function getSessions(all?: boolean): Promise<Session[]> {
  const params = new URLSearchParams();
  if (all) params.set("all", "true");
  const qs = params.toString();
  return api.get<Session[]>(`/sessions${qs ? `?${qs}` : ""}`);
}

export async function getSession(id: string): Promise<Session> {
  return api.get<Session>(`/sessions/${id}`);
}

export type CreateSessionDto = {
  formationId: string;
  dateDebut: string;
  dateFin: string;
  heureDebut?: string;
  heureFin?: string;
  lieu?: string;
  salle?: string;
  capaciteMax?: number;
  notes?: string;
  participantIds?: string[];
  employeIds?: string[];
  formateurIds?: string[];
};

export type UpdateSessionDto = Partial<CreateSessionDto> & {
  isCompleted?: boolean;
  isCancelled?: boolean;
};

export async function createSession(dto: CreateSessionDto): Promise<Session> {
  return api.post<Session>("/sessions", dto);
}

export async function updateSession(id: string, dto: UpdateSessionDto): Promise<Session> {
  return api.patch<Session>(`/sessions/${id}`, dto);
}

export async function deleteSession(id: string): Promise<void> {
  return api.delete(`/sessions/${id}`);
}

export async function enrollInSession(sessionId: string): Promise<Session> {
  return api.post<Session>(`/sessions/${sessionId}/enroll`);
}

export async function getMySessions(type?: string): Promise<Session[]> {
  const path = type ? `/sessions/mine?type=${type}` : "/sessions/mine";
  return api.get<Session[]>(path);
}

export async function cloneSessionForPlatform(id: string): Promise<Session> {
  return api.post<Session>(`/sessions/${id}/clone`);
}
