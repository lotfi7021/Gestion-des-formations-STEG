import { api } from "./client";

export type AiTextResponse = {
  text: string;
  isFallback: boolean;
};

/**
 * Génère un résumé IA pour une session donnée.
 * POST /sessions/:id/summary
 */
export async function generateSessionSummary(
  sessionId: string,
  additionalContext?: string,
): Promise<AiTextResponse> {
  return api.post<AiTextResponse>(`/sessions/${sessionId}/summary`, {
    additionalContext,
  });
}

/**
 * Génère un texte de certificat personnalisé via IA.
 * POST /certificates/:id/generate-text
 */
export async function generateCertificateText(
  certificateId: string,
  additionalMention?: string,
): Promise<AiTextResponse> {
  return api.post<AiTextResponse>(`/certificates/${certificateId}/generate-text`, {
    additionalMention,
  });
}

/**
 * Génère un résumé IA d'une formation à partir de ses documents de session.
 * GET /formations/:id/ai-summary
 */
export async function getFormationAiSummary(formationId: string): Promise<AiTextResponse> {
  return api.get<AiTextResponse>(`/formations/${formationId}/ai-summary`);
}

/**
 * Pose une question libre sur une formation (RAG scopé aux documents).
 * POST /formations/:id/ai-ask
 */
export async function askFormationQuestion(
  formationId: string,
  question: string,
): Promise<AiTextResponse> {
  return api.post<AiTextResponse>(`/formations/${formationId}/ai-ask`, { question });
}
