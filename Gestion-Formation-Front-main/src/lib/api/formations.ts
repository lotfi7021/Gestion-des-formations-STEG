import { api, API_BASE } from "./client";
import type { SessionRef } from "./types";

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
  createdAt: string;
  updatedAt: string;
  sessions?: SessionRef[];
};

export type PaginatedFormations = {
  data: Formation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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

/**
 * Liste des formations.
 * NOTE: l'API retourne un objet paginé { data, total, page, limit, totalPages }.
 * Pour compatibilité avec tous les appelants existants (qui itèrent sur un
 * tableau), on extrait ici le tableau `data`. Utiliser getFormationsPaginated()
 * pour accéder aux métadonnées de pagination.
 */
export async function getFormations(options: { all?: boolean; page?: number; limit?: number } = {}): Promise<Formation[]> {
  const paginated = await getFormationsPaginated(options);
  return paginated.data ?? [];
}

export async function getFormationsPaginated(options: { all?: boolean; page?: number; limit?: number } = {}): Promise<PaginatedFormations> {
  const params = new URLSearchParams();
  if (options.all) params.set("all", "true");
  if (options.page) params.set("page", options.page.toString());
  if (options.limit) params.set("limit", options.limit.toString());
  const qs = params.toString();
  return api.get<PaginatedFormations>(`/formations${qs ? `?${qs}` : ""}`);
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
