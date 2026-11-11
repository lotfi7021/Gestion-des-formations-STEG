import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Embeddings locaux via @xenova/transformers (ONNX, aucun appel réseau).
 * Modèle multilingue léger (~120 Mo, téléchargé au premier usage puis mis en
 * cache local par la lib) — bien pour du français.
 */
const DEFAULT_EMBEDDING_MODEL = 'Xenova/multilingual-e5-small';

export interface EmbeddingResult {
  vector: number[];
  model: string;
}

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private readonly model: string;
  private pipeline: any = null;
  private pipelinePromise: Promise<any> | null = null;

  constructor(private readonly configService: ConfigService) {
    this.model =
      this.configService.get<string>('AI_EMBEDDING_MODEL') || DEFAULT_EMBEDDING_MODEL;
  }

  /**
   * Charge le pipeline une seule fois (lazy). Retourne null si la lib
   * n'est pas disponible — le RAG retombera alors sur le mode mots-clés.
   */
  private async getPipeline(): Promise<any | null> {
    if (this.pipeline) return this.pipeline;
    if (this.pipelinePromise) return this.pipelinePromise;

    this.pipelinePromise = (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { pipeline } = require('@xenova/transformers');
        this.logger.log(`Chargement du modèle d'embeddings "${this.model}"…`);
        const pipe = await pipeline('feature-extraction', this.model);
        this.logger.log("Modèle d'embeddings prêt.");
        return pipe;
      } catch (err: any) {
        this.logger.warn(
          `Embeddings indisponibles (${err.message}) — le RAG utilisera le scoring par mots-clés.`,
        );
        return null;
      }
    })();

    this.pipeline = await this.pipelinePromise;
    return this.pipeline;
  }

  get isAvailable(): boolean {
    return this.pipeline !== null;
  }

  get modelName(): string {
    return this.model;
  }

  /** Vecteur d'un texte (préfixe e5 requis : "passage: ..." / "query: ..."). */
  async embed(text: string, kind: 'passage' | 'query' = 'passage'): Promise<number[] | null> {
    const pipe = await this.getPipeline();
    if (!pipe) return null;

    try {
      const input = kind === 'query' ? `query: ${text}` : `passage: ${text}`;
      const output = await pipe(input, { pooling: 'mean', normalize: true });
      return Array.from(output.data as Float32Array);
    } catch (err: any) {
      this.logger.warn(`Embedding échoué: ${err.message}`);
      return null;
    }
  }

  /** Similarité cosinus entre deux vecteurs (doivent être normalisés ou non). */
  static cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
