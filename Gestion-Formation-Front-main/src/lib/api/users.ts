import { api } from "./client";

export type Participant = {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  nom: string;
  prenom: string;
  telephone: string | null;
  avatarUrl?: string;
};

export async function getParticipants(): Promise<Participant[]> {
  return api.get<Participant[]>("/users/participants");
}

export type CreateParticipantDto = {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  poste?: string;
  departement?: string;
  entrepriseText?: string;
};

export async function createParticipant(dto: CreateParticipantDto): Promise<Participant> {
  return api.post<Participant>("/users/participants", dto);
}

export async function updateParticipant(
  id: string,
  dto: Partial<CreateParticipantDto>,
): Promise<Participant> {
  return api.patch<Participant>(`/users/${id}`, dto);
}

export async function deleteParticipant(id: string): Promise<void> {
  return api.delete(`/users/${id}`);
}

export async function toggleUserActive(id: string, isActive: boolean): Promise<Participant> {
  return api.patch<Participant>(`/users/${id}`, { isActive });
}
