/**
 * Types de référence partagés entre les modules API.
 * Représentent les entités renvoyées par le backend, éventuellement
 * partiellement peuplées (relations imbriquées).
 */

export type FormationRef = {
  id: string;
  titre: string;
  description?: string | null;
  objectifs?: string | null;
  prerequis?: string | null;
  categorie?: string | null;
  tarif?: number | null;
  type?: string;
  programme?: string | null;
  dureeEnHeures?: number | null;
  dureeEnJours?: number | null;
  capaciteMax?: number | null;
  imageUrl?: string | null;
  supportsFormation?: { nom: string; url: string; type: string; sessionId?: string }[];
};

export type UserRef = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  role?: string;
  telephone?: string | null;
  poste?: string | null;
  departement?: string | null;
  directionText?: string | null;
  identifiant?: string | null;
  isActive?: boolean;
  avatarUrl?: string | null;
  username?: string | null;
  createdAt?: string;
};

export type SessionRef = {
  id: string;
  dateDebut: string;
  dateFin: string;
  lieu?: string | null;
  salle?: string | null;
  capaciteMax?: number | null;
  isCompleted?: boolean;
  isCancelled?: boolean;
  formation?: FormationRef;
  /** Relations présentes uniquement quand le backend les peuple.
   *  Les employés STEG font partie des participants (users role=employe). */
  participants?: UserRef[];
  formateurs?: UserRef[];
};
