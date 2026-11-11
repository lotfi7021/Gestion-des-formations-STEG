import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Identifiant ou email requis"),
  password: z.string().min(6, "Minimum 6 caractères"),
});

export const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "Minimum 3 caractères")
      .regex(/^[a-zA-Z0-9._-]+$/, "Lettres, chiffres, . _ - uniquement"),
    email: z.string().email("Email invalide"),
    password: z.string().min(6, "Minimum 6 caractères"),
    confirmPassword: z.string(),
    role: z.enum(["participant", "formateur", "cabinet"]),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export const formationSchema = z.object({
  titre: z.string().min(3, "Minimum 3 caractères"),
  description: z.string().optional(),
  categorie: z.string().optional(),
  type: z.enum(["catalogue", "intra", "inter"]),
  tarif: z.number().min(0, "Le tarif ne peut pas être négatif").optional(),
  dureeEnJours: z.number().min(1, "Minimum 1 jour").max(365, "Maximum 365 jours").optional(),
  programme: z.string().optional(),
});

export const employeSchema = z.object({
  nom: z
    .string()
    .min(2, "Minimum 2 caractères")
    .regex(/^[a-zA-ZÀ-ÿ\s-]+$/, "Caractères invalides"),
  prenom: z
    .string()
    .min(2, "Minimum 2 caractères")
    .regex(/^[a-zA-ZÀ-ÿ\s-]+$/, "Caractères invalides"),
  email: z.string().email("Email invalide"),
  poste: z.string().optional(),
  departement: z.string().optional(),
  telephone: z
    .string()
    .regex(/^(\+216)?\d{8}$/, "Numéro invalide (ex: +216XXXXXXXX)")
    .optional()
    .or(z.literal("")),
  entrepriseText: z.string().optional(),
});

export const formateurSchema = z.object({
  nom: z
    .string()
    .min(2, "Minimum 2 caractères")
    .regex(/^[a-zA-ZÀ-ÿ\s-]+$/, "Caractères invalides"),
  prenom: z
    .string()
    .min(2, "Minimum 2 caractères")
    .regex(/^[a-zA-ZÀ-ÿ\s-]+$/, "Caractères invalides"),
  email: z.string().email("Email invalide"),
  telephone: z
    .string()
    .regex(/^(\+216)?\d{8}$/, "Numéro invalide (ex: +216XXXXXXXX)")
    .optional()
    .or(z.literal("")),
  specialites: z.string().optional(),
  qualifications: z.string().optional(),
});

export const sessionSchema = z
  .object({
    dateDebut: z.string().min(1, "Date de début requise"),
    dateFin: z.string().min(1, "Date de fin requise"),
    lieu: z.string().optional(),
    formationId: z.string().min(1, "Formation requise"),
    participantIds: z.array(z.string()).optional(),
    formateurIds: z.array(z.string()).optional(),
  })
  .refine((d) => !d.dateDebut || !d.dateFin || new Date(d.dateFin) > new Date(d.dateDebut), {
    message: "La date de fin doit être après la date de début",
    path: ["dateFin"],
  });

export const profileSchema = z.object({
  username: z
    .string()
    .min(3, "Minimum 3 caractères")
    .regex(/^[a-zA-Z0-9._-]+$/, "Lettres, chiffres, . _ - uniquement"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Mot de passe actuel requis"),
    newPassword: z.string().min(6, "Minimum 6 caractères"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type FormationData = z.infer<typeof formationSchema>;
export type EmployeData = z.infer<typeof employeSchema>;
export type FormateurData = z.infer<typeof formateurSchema>;
export type SessionData = z.infer<typeof sessionSchema>;
export type ProfileData = z.infer<typeof profileSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;
