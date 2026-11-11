/** Extrait un message lisible depuis une erreur API (chaîne, JSON ou Error). */
export function getErrorMessage(error: unknown, fallback = "Une erreur est survenue"): string {
  if (typeof error === "string" && error.trim()) return error;

  if (error instanceof Error && error.message) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed === "object" && "message" in parsed) {
        return String(parsed.message);
      }
    } catch {
      // Message déjà lisible : on le retourne tel quel.
    }
    return error.message;
  }

  return fallback;
}
