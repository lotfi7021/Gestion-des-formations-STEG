import { api } from "./client";
import type { UserRef } from "./types";

/** Un employé STEG est un User avec role='employe' (poste, département, identifiant inclus). */
export type Employe = UserRef & {
  isActive: boolean;
};

export type CreateEmployeDto = {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  poste?: string;
  departement?: string;
  directionText?: string;
  dateEmbauche?: string;
};

/** Récupère les employés STEG = Users avec role='employe'. */
export async function getEmployes(): Promise<Employe[]> {
  return api.get<Employe[]>("/users/employes");
}

/** Crée un compte employé STEG (User role='employe' + email d'identifiants). */
export async function createEmploye(dto: CreateEmployeDto): Promise<Employe> {
  return api.post<Employe>("/users/employes", dto);
}

export async function updateEmploye(id: string, dto: Partial<CreateEmployeDto>): Promise<Employe> {
  return api.patch<Employe>(`/users/${id}`, dto);
}

export async function deleteEmploye(id: string): Promise<void> {
  return api.delete(`/users/${id}`);
}
