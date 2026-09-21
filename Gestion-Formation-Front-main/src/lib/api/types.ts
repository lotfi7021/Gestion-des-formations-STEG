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
};

export type EmployeRef = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  identifiant?: string | null;
  poste?: string | null;
  departement?: string | null;
  directionText?: string | null;
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
  /** Relations présentes uniquement quand le backend les peuple. */
  participants?: UserRef[];
  employes?: EmployeRef[];
  formateurs?: UserRef[];
};
