export class AiTextResponse {
  /** Texte généré par le modèle IA */
  text: string;
  /** true si le texte provient du fallback (IA indisponible) */
  isFallback: boolean;
  /**
   * Sources utilisées pour les réponses RAG Q&A.
   * Chaque entrée = un chunk réellement cité par le modèle.
   */
  sources?: { document: string; page?: number }[];
  /**
   * "high" | "medium" | "low" — confiance du modèle dans sa réponse
   * ("low" = information probablement absente des documents).
   */
  confidence?: 'high' | 'medium' | 'low';
  /** true si l'information n'a pas été trouvée dans les documents */
  notFound?: boolean;
  /** true si la réponse provient du cache des résumés */
  cached?: boolean;
  /** Temps de traitement total en ms */
  latencyMs?: number;
}
