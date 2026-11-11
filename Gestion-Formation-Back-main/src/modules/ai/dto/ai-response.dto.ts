export class AiTextResponse {
  /** Texte généré par le modèle IA */
  text: string;
  /** true si le texte provient du fallback (IA indisponible) */
  isFallback: boolean;
}
