import { api, API_BASE } from "./client";

export type Certificate = {
  id: string;
  numeroCertificat: string;
  dateEmission: string;
  dateExpiration: string;
  statut: "emis" | "envoye" | "telecharge";
  qrCode: string;
  signatureElectronique: string;
  certificatUrl: string;
  noteObtenue: number;
  isValidated: boolean;
  validatedBy: string;
  user: { id: string; prenom: string; nom: string };
  formation: { id: string; titre: string };
  session: { id: string; dateDebut: string; dateFin: string };
};

export async function getCertificates(): Promise<Certificate[]> {
  return api.get<Certificate[]>("/certificates");
}

export async function getCertificate(id: string): Promise<Certificate> {
  return api.get<Certificate>(`/certificates/${id}`);
}

export async function getMyCertificates(): Promise<Certificate[]> {
  return api.get<Certificate[]>("/certificates/mine");
}

export async function generateSessionCertificates(sessionId: string): Promise<Certificate[]> {
  return api.post<Certificate[]>(`/certificates/generate/${sessionId}`, {});
}

export function getCertificateDownloadUrl(certId: string): string {
  const token = localStorage.getItem("access_token");
  return `${API_BASE}/certificates/${certId}/download?token=${token}`;
}
