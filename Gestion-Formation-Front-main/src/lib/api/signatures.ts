import { api } from "./client";
import { getAccessToken, API_BASE } from "./client";

export type Signature = {
  id: string;
  imageData: string;
  type: string;
  isVerified: boolean;
  verifiedBy: string | null;
  verifiedAt: string | null;
  userId: string;
  user?: { id: string; prenom: string; nom: string; email: string };
  createdAt: string;
};

export type DocumentSigne = {
  id: string;
  type: "convention_formation" | "feuille_emargement" | "contrat_formateur" | "certificat";
  titre: string;
  fileUrl: string;
  fileSize: string | null;
  isSignedByParticipant: boolean;
  isSignedByAdmin: boolean;
  isSignedByFormateur: boolean;
  signedAtByParticipant: string | null;
  signedAtByAdmin: string | null;
  signedAtByFormateur: string | null;
  sessionId: string | null;
  participantId: string | null;
  participant?: { id: string; prenom: string; nom: string };
  session?: { id: string; dateDebut: string; dateFin: string; formation?: { titre: string } };
  metadata: Record<string, any> | null;
  createdAt: string;
};

export async function saveSignature(imageData: string, type?: string): Promise<Signature> {
  return api.post<Signature>("/signatures", { imageData, type });
}

export async function getMySignatures(): Promise<Signature[]> {
  return api.get<Signature[]>("/signatures/mine");
}

export async function getLatestSignature(): Promise<Signature | null> {
  try {
    return await api.get<Signature>("/signatures/latest");
  } catch {
    return null;
  }
}

export async function getAllSignatures(): Promise<Signature[]> {
  return api.get<Signature[]>("/signatures/all");
}

export async function verifySignature(id: string): Promise<Signature> {
  return api.patch<Signature>(`/signatures/${id}/verify`, {});
}

export async function deleteSignature(id: string): Promise<void> {
  return api.delete(`/signatures/${id}`);
}

export async function generateConvention(
  sessionId: string,
  participantId: string,
): Promise<DocumentSigne> {
  return api.post<DocumentSigne>(`/signatures/generate-convention/${sessionId}/${participantId}`);
}

export async function generateContratFormateur(
  sessionId: string,
  formateurId: string,
): Promise<DocumentSigne> {
  return api.post<DocumentSigne>(`/signatures/generate-contrat/${sessionId}/${formateurId}`);
}

export async function generateFeuilleEmargement(sessionId: string): Promise<DocumentSigne> {
  return api.post<DocumentSigne>(`/signatures/generate-emargement/${sessionId}`);
}

export async function getAllDocumentsSignes(): Promise<DocumentSigne[]> {
  return api.get<DocumentSigne[]>("/signatures/documents");
}

export async function getMyDocumentsSignes(): Promise<DocumentSigne[]> {
  return api.get<DocumentSigne[]>("/signatures/documents/mine");
}

export async function getDocumentsSignesBySession(sessionId: string): Promise<DocumentSigne[]> {
  return api.get<DocumentSigne[]>(`/signatures/documents/session/${sessionId}`);
}

export async function getDocumentSigne(id: string): Promise<DocumentSigne> {
  return api.get<DocumentSigne>(`/signatures/documents/${id}`);
}

export async function downloadDocumentSigne(id: string): Promise<void> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE}/signatures/documents/${id}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Erreur lors du téléchargement");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `document_${id.slice(0, 8)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
