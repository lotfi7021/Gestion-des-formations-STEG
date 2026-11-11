import { api } from "./client";

export type Cabinet = {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  nom: string;
  prenom: string;
  telephone: string | null;
  createdAt: string;
};

export type CreateCabinetDto = {
  nomCabinet: string;
  email: string;
  telephone?: string;
};

export async function getCabinets(): Promise<Cabinet[]> {
  return api.get<Cabinet[]>("/users/cabinets");
}

export async function createCabinet(dto: CreateCabinetDto): Promise<Cabinet> {
  return api.post<Cabinet>("/users/cabinets", dto);
}
