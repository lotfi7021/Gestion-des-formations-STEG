import { api, API_BASE } from "./client";

export type Formateur = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  qualifications: string;
  specialites: string;
  biographie: string;
  disponibilites: { jour: string; heureDebut: string; heureFin: string }[];
  cvUrl: string;
  programmeUrl: string;
  modeleCnfcppUrl: string;
  feuillePresenceUrl: string;
  attestationUrl: string;
  noteGlobale: number;
  role: string;
  avatarUrl?: string;
  clonedFromId?: string;
  clonedFromCabinetId?: string;
  clonedFromCabinetName?: string;
  sessionsAsFormateur: any[];
  evaluationsRecues: any[];
  createdAt: string;
  updatedAt: string;
};

export async function getFormateurs(cabinetId?: string, all?: boolean): Promise<Formateur[]> {
  const params = new URLSearchParams();
  if (cabinetId) params.set("cabinetId", cabinetId);
  if (all) params.set("all", "true");
  const qs = params.toString();
  return api.get<Formateur[]>(`/formateurs${qs ? `?${qs}` : ""}`);
}

export async function getFormateur(id: string): Promise<Formateur> {
  return api.get<Formateur>(`/formateurs/${id}`);
}

export type CreateFormateurDto = {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  specialites?: string;
  qualifications?: string;
};

export async function createFormateur(dto: CreateFormateurDto): Promise<Formateur> {
  return api.post<Formateur>("/formateurs", dto);
}

export async function updateFormateur(
  id: string,
  dto: Partial<CreateFormateurDto>,
): Promise<Formateur> {
  return api.patch<Formateur>(`/formateurs/${id}`, dto);
}

export async function deleteFormateur(id: string): Promise<void> {
  return api.delete(`/formateurs/${id}`);
}

export async function uploadFormateurDocument(
  id: string,
  type: string,
  file: File,
): Promise<Formateur> {
  const token = localStorage.getItem("access_token");
  const res = await fetch(`${API_BASE}/formateurs/${id}/upload-document/${type}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: (() => {
      const fd = new FormData();
      fd.append("file", file);
      return fd;
    })(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function cloneFormateurForPlatform(id: string): Promise<Formateur> {
  return api.post<Formateur>(`/formateurs/${id}/clone`);
}

export const DOCUMENT_TYPES = [
  { key: "cv", label: "CV", field: "cvUrl" },
  { key: "programme", label: "Programme", field: "programmeUrl" },
  { key: "modele-cnfcpp", label: "Modèle CNFCPP", field: "modeleCnfcppUrl" },
  { key: "feuille-presence", label: "Feuille de présence", field: "feuillePresenceUrl" },
  { key: "attestation", label: "Attestation de formation", field: "attestationUrl" },
] as const;
