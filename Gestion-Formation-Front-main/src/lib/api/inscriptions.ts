import { api } from "./client";

export type Inscription = {
  id: string;
  userId: string;
  sessionId: string;
  montant: number;
  statutPaiement: "en_attente" | "paye" | "refuse";
  methodePaiement: string;
  datePaiement: string | null;
  dateInscription: string;
  user: {
    id: string;
    username: string;
    email: string;
    prenom: string;
    nom: string;
    role: string;
  };
  session: {
    id: string;
    dateDebut: string;
    dateFin: string;
    lieu: string;
    formation: {
      id: string;
      titre: string;
      tarif: number;
    };
    formateurs?: { id: string; prenom: string; nom: string }[];
  };
};

export async function getPendingInscriptions(): Promise<Inscription[]> {
  return api.get<Inscription[]>("/inscriptions/pending");
}

export async function getConfirmedInscriptions(): Promise<Inscription[]> {
  return api.get<Inscription[]>("/inscriptions/confirmed");
}

export async function getMyInscriptions(): Promise<Inscription[]> {
  return api.get<Inscription[]>("/inscriptions/mine");
}

export async function confirmPayment(inscriptionId: string): Promise<Inscription> {
  return api.patch<Inscription>(`/inscriptions/${inscriptionId}/confirm-payment`, {});
}

export async function rejectInscription(inscriptionId: string): Promise<void> {
  return api.delete(`/inscriptions/${inscriptionId}/reject`);
}
