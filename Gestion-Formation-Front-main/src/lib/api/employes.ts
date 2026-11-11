import { api } from "./client";

export type Employe = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  poste: string | null;
  departement: string | null;
  entrepriseText: string | null;
  dateEmbauche: string | null;
  identifiant: string;
  userActive?: boolean;
  userId?: string;
  createdAt: string;
  updatedAt: string;
};

export async function getEmployes(): Promise<Employe[]> {
  return api.get<Employe[]>("/employes");
}

export async function getEmploye(id: string): Promise<Employe> {
  return api.get<Employe>(`/employes/${id}`);
}

export type CreateEmployeDto = {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  poste?: string;
  departement?: string;
  entrepriseText?: string;
};

export async function createEmploye(dto: CreateEmployeDto): Promise<Employe> {
  return api.post<Employe>("/employes", dto);
}

export async function updateEmploye(id: string, dto: Partial<CreateEmployeDto>): Promise<Employe> {
  return api.patch<Employe>(`/employes/${id}`, dto);
}

export async function deleteEmploye(id: string): Promise<void> {
  return api.delete(`/employes/${id}`);
}
