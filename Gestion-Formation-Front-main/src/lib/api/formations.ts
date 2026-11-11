import { api, API_BASE } from "./client";

export type Formation = {
  id: string;
  titre: string;
  description: string;
  objectifs: string;
  prerequis: string;
  categorie: string;
  tarif: number;
  type: "intra" | "inter" | "catalogue";
  programme: string;
  dureeEnHeures: number;
  dureeEnJours: number;
  capaciteMax: number;
  imageUrl?: string;
  supportsFormation: { nom: string; url: string; type: string; sessionId?: string }[];
  isActive: boolean;
  clonedFromId?: string;
  clonedFromCabinetId?: string;
  clonedFromCabinetName?: string;
  createdAt: string;
  updatedAt: string;
  sessions?: any[];
};

export type CreateFormationDto = {
  titre: string;
  description?: string;
  objectifs?: string;
  prerequis?: string;
  categorie?: string;
  tarif?: number;
  type: "intra" | "inter" | "catalogue";
  programme?: string;
  dureeEnHeures?: number;
  dureeEnJours?: number;
  capaciteMax?: number;
};

export async function getFormations(cabinetId?: string, all?: boolean): Promise<Formation[]> {
  const params = new URLSearchParams();
  if (cabinetId) params.set("cabinetId", cabinetId);
  if (all) params.set("all", "true");
  const qs = params.toString();
  return api.get<Formation[]>(`/formations${qs ? `?${qs}` : ""}`);
}

export async function getFormation(id: string): Promise<Formation> {
  return api.get<Formation>(`/formations/${id}`);
}

export async function createFormation(dto: CreateFormationDto): Promise<Formation> {
  return api.post<Formation>("/formations", dto);
}

export async function updateFormation(
  id: string,
  dto: Partial<CreateFormationDto>,
): Promise<Formation> {
  return api.patch<Formation>(`/formations/${id}`, dto);
}

export async function deleteFormation(id: string): Promise<void> {
  return api.delete(`/formations/${id}`);
}

export async function uploadFormationSupport(id: string, file: File): Promise<Formation> {
  const token = localStorage.getItem("access_token");
  const res = await fetch(`${API_BASE}/formations/${id}/upload`, {
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

export async function uploadFormationImage(id: string, file: File): Promise<Formation> {
  const token = localStorage.getItem("access_token");
  const res = await fetch(`${API_BASE}/formations/${id}/upload-image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: (() => {
      const fd = new FormData();
      fd.append("image", file);
      return fd;
    })(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function cloneFormationForPlatform(id: string): Promise<Formation> {
  return api.post<Formation>(`/formations/${id}/clone`);
}
