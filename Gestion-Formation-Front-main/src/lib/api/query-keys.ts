/**
 * Clés de cache TanStack Query centralisées.
 * Toute query/mutation doit passer par cet objet afin d'éviter les doublons
 * de cache (ex: "sessions" vs "sessions-all") et de garantir les invalidations.
 */
export const queryKeys = {
  formations: ["formations"] as const,
  formationsAll: ["formations", "all"] as const,
  formation: (id?: string) => ["formation", id] as const,

  sessions: ["sessions"] as const,
  sessionsAll: ["sessions", "all"] as const,
  session: (id: string) => ["session", id] as const,
  mySessions: (variant?: "all" | "enrolled") =>
    variant ? (["my-sessions", variant] as const) : (["my-sessions"] as const),

  formateurs: ["formateurs"] as const,
  participants: ["participants"] as const,
  participantsForSelect: ["participants", "users"] as const,

  evaluations: (filters?: { formationId?: string; formateurId?: string }) =>
    filters
      ? (["evaluations", filters.formationId ?? "", filters.formateurId ?? ""] as const)
      : (["evaluations"] as const),
  evaluationCheck: (sessionId: string, userId?: string) =>
    ["evaluations", "check", sessionId, userId] as const,

  documentsSignes: ["documents-signes"] as const,
  signatures: ["signatures-all"] as const,
  latestSignature: ["my-signature"] as const,

  pendingUsers: ["pending-users"] as const,
  pendingInscriptions: ["pending-inscriptions"] as const,
  confirmedInscriptions: ["confirmed-inscriptions"] as const,
  myInscriptions: ["my-inscriptions"] as const,
  myCertificates: ["my-certificates"] as const,
  certificates: ["certificates"] as const,

  sessionDocuments: (sessionId: string) => ["session-documents", sessionId] as const,
  sessionCheckIn: (sessionId: string) => ["session-check-in", sessionId] as const,
  checkIn: (token: string) => ["check-in", token] as const,
  notifications: ["notifications"] as const,
} as const;
