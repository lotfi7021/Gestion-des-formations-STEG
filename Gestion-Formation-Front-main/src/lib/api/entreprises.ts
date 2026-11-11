import { api } from "./client";

export type Entreprise = {
  id: string;
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
  siret: string;
  secteurActivite: string;
  employes: any[];
};

export async function getEntreprises(): Promise<Entreprise[]> {
  return api.get<Entreprise[]>("/entreprises");
}

export async function getEntreprise(id: string): Promise<Entreprise> {
  return api.get<Entreprise>(`/entreprises/${id}`);
}
