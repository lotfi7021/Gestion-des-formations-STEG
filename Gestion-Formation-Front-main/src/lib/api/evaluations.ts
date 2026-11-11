import { api } from "./client";
import type { SessionRef, UserRef } from "./types";

export type Evaluation = {
  id: string;
  note: number;
  commentaire: string;
  noteContenu: number;
  notePedagogie: number;
  noteSupports: number;
  noteOrganisation: number;
  recommande: boolean;
  dateEvaluation: string;
  isValidated: boolean;
  formateur: UserRef;
  session: SessionRef;
  participant: UserRef;
  noteObjectifClarte?: number;
  noteUtilite?: number;
  noteDureeRythme?: number;
  noteConfortSalle?: number;
  noteEquipements?: number;
  noteMaitriseSujet?: number;
  noteClarteExplications?: number;
  noteAnimation?: number;
  noteCapaciteReponse?: number;
  noteSatisfactionGlobale?: number;
  pointsForts?: string;
  pointsAmeliorer?: string;
  noteCfpStir?: number;
};

export type CreateEvaluationDto = {
  note: number;
  commentaire?: string;
  noteContenu?: number;
  notePedagogie?: number;
  noteSupports?: number;
  noteOrganisation?: number;
  recommande?: boolean;
  dateEvaluation: string;
  formateurId: string;
  sessionId: string;
  participantId: string;
  noteObjectifClarte?: number;
  noteUtilite?: number;
  noteDureeRythme?: number;
  noteConfortSalle?: number;
  noteEquipements?: number;
  noteMaitriseSujet?: number;
  noteClarteExplications?: number;
  noteAnimation?: number;
  noteCapaciteReponse?: number;
  noteSatisfactionGlobale?: number;
  pointsForts?: string;
  pointsAmeliorer?: string;
  noteCfpStir?: number;
};

export async function getEvaluations(filters?: {
  formationId?: string;
  formateurId?: string;
  sessionId?: string;
  participantId?: string;
}): Promise<Evaluation[]> {
  const params = new URLSearchParams();
  if (filters?.formationId) params.set("formationId", filters.formationId);
  if (filters?.formateurId) params.set("formateurId", filters.formateurId);
  if (filters?.sessionId) params.set("sessionId", filters.sessionId);
  if (filters?.participantId) params.set("participantId", filters.participantId);
  const qs = params.toString();
  return api.get<Evaluation[]>(`/evaluations${qs ? `?${qs}` : ""}`);
}

export async function getEvaluation(id: string): Promise<Evaluation> {
  return api.get<Evaluation>(`/evaluations/${id}`);
}

export async function createEvaluation(dto: CreateEvaluationDto): Promise<Evaluation> {
  return api.post<Evaluation>("/evaluations", dto);
}

export async function updateEvaluation(
  id: string,
  dto: Partial<CreateEvaluationDto>,
): Promise<Evaluation> {
  return api.patch<Evaluation>(`/evaluations/${id}`, dto);
}
