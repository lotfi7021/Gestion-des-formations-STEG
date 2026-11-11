import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { join } from 'path';
import { EmbeddingsService } from './embeddings.service';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RagChunk {
  text: string;
  /** Nom du fichier source (originalName) */
  document: string;
  /** Numéro de page PDF (1-based, 0 = inconnue) */
  page: number;
  /** Similarité cosinus avec la requête (retrieval vectoriel) */
  score?: number;
}

export interface RagContext {
  /** Contexte formaté prêt à injecter dans le prompt */
  context: string;
  /** Chunks retenus (top-k), avec source + score */
  chunks: RagChunk[];
  /** true si le retrieval vectoriel a été utilisé (vs mots-clés) */
  usedEmbeddings: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

/** Taille cible d'un chunk en caractères (~300-400 tokens). */
const CHUNK_SIZE = 1200;
/** Chevauchement entre chunks consécutifs pour ne pas couper les idées. */
const CHUNK_OVERLAP = 150;

const FRENCH_STOPWORDS = new Set([
  'alors', 'apres', 'après', 'aussi', 'autre', 'autres', 'avant', 'avec', 'avoir',
  'bien', 'cela', 'celle', 'celles', 'celui', 'cependant', 'ces', 'cette', 'chaque',
  'comme', 'comment', 'dans', 'depuis', 'des', 'deux', 'document', 'documents',
  'donc', 'dont', 'elle', 'elles', 'encore', 'entre', 'est', 'etre', 'être', 'était',
  'fait', 'faire', 'figure', 'fois', 'font', 'formation', 'formations', 'ici',
  'information', 'juste', 'leur', 'leurs', 'lorsque', 'mais', 'même', 'moins',
  'notre', 'nous', 'par', 'parce', 'parle', 'parler', 'parlent', 'pas', 'peut',
  'plus', 'plutot', 'plutôt', 'pour', 'pourquoi', 'quand', 'que', 'quel', 'quelle',
  'quelles', 'quels', 'qui', 'quoi', 'sans', 'selon', 'ses', 'seulement', 'sinon',
  'soit', 'son', 'sont', 'sous', 'sur', 'tandis', 'tant', 'tous', 'tout', 'toute',
  'toutes', 'très', 'trop', 'une', 'vient', 'voir', 'vont', 'votre', 'vous',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  /** Cache disque des embeddings : clé = hash(docId + mtime + model) */
  private readonly cacheDir: string;
  private readonly cacheMemory = new Map<string, RagChunk[]>();

  constructor(
    private readonly configService: ConfigService,
    private readonly embeddings: EmbeddingsService,
  ) {
    this.cacheDir = join(process.cwd(), 'uploads', 'ai-embeddings-cache');
    if (!fs.existsSync(this.cacheDir)) fs.mkdirSync(this.cacheDir, { recursive: true });
  }

  /**
   * Construit le contexte RAG pour une liste de documents PDF.
   * - Avec question : retrieval vectoriel top-k (fallback mots-clés si
   *   les embeddings sont indisponibles).
   * - Sans question : sélection "meaningful paragraphs" pour un résumé.
   */
  async buildContext(
    docs: { id: string; originalName: string; filename: string; mimetype?: string }[],
    question?: string,
    topK?: number,
  ): Promise<RagContext> {
    const k = topK ?? this.configService.get<number>('AI_RAG_TOP_K') ?? 8;

    if (docs.length === 0) return { context: '', chunks: [], usedEmbeddings: false };

    // 1. Charger/chaunker tous les documents (cache mémoire + disque)
    const allChunks: RagChunk[] = [];
    for (const doc of docs) {
      const chunks = await this.getChunksCached(doc);
      allChunks.push(...chunks);
    }
    if (allChunks.length === 0) return { context: '', chunks: [], usedEmbeddings: false };

    // 2. Sélection des chunks
    if (!question) {
      // Mode résumé : paragraphes significatifs jusqu'au budget
      const selected = this.selectForSummary(allChunks);
      return {
        context: this.formatChunks(selected),
        chunks: selected,
        usedEmbeddings: false,
      };
    }

    // Retrieval vectoriel
    const queryVector = await this.embeddings.embed(question, 'query');

    if (queryVector) {
      const scored = await this.scoreByEmbeddings(allChunks, queryVector);
      const top = scored
        .filter((c) => (c.score ?? 0) > 0.3) // seuil de pertinence minimal
        .slice(0, k);
      const picked = top.length > 0 ? top : scored.slice(0, Math.min(3, scored.length));
      this.logger.log(
        `RAG vectoriel : ${allChunks.length} chunks → ${picked.length} retenus (top score ${picked[0]?.score?.toFixed(2)})`,
      );
      return { context: this.formatChunks(picked), chunks: picked, usedEmbeddings: true };
    }

    // 3. Fallback : scoring par mots-clés
    this.logger.warn('Embeddings indisponibles — RAG par mots-clés');
    const selected = this.selectByKeywords(allChunks, question, k);
    return { context: this.formatChunks(selected), chunks: selected, usedEmbeddings: false };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Chunking + cache
  // ───────────────────────────────────────────────────────────────────────────

  private async getChunksCached(doc: {
    id: string;
    originalName: string;
    filename: string;
    mimetype?: string;
  }): Promise<RagChunk[]> {
    const isPdf = doc.mimetype?.includes('pdf') || doc.filename?.endsWith('.pdf');
    if (!isPdf) return [];

    const filePath = join(__dirname, '..', '..', '..', '..', 'uploads', 'session-docs', doc.filename);
    if (!fs.existsSync(filePath)) return [];

    const mtime = fs.statSync(filePath).mtimeMs;
    const cacheKey = `${doc.id}-${Math.round(mtime)}-${this.embeddings.modelName}`;

    // Mémoire
    const mem = this.cacheMemory.get(cacheKey);
    if (mem) return mem;

    // Disque
    const disk = this.readDiskCache(cacheKey);
    if (disk) {
      this.cacheMemory.set(cacheKey, disk);
      return disk;
    }

    // Extraction + chunking + embeddings
    let pages: { text: string; page: number }[];
    try {
      pages = await this.extractPdfPages(filePath);
    } catch (err: any) {
      this.logger.warn(`Impossible de lire le PDF ${doc.filename}: ${err.message}`);
      return [];
    }

    const chunks: RagChunk[] = [];
    for (const { text, page } of pages) {
      for (const piece of this.splitIntoChunks(text)) {
        chunks.push({ text: piece, document: doc.originalName, page });
      }
    }
    if (chunks.length === 0) return [];

    // Vectoriser chaque chunk (peut être null si embeddings indisponibles)
    let vectorized = false;
    for (const chunk of chunks) {
      const vector = await this.embeddings.embed(chunk.text, 'passage');
      if (vector) {
        (chunk as any).vector = vector;
        vectorized = true;
      }
    }

    if (vectorized) {
      this.writeDiskCache(cacheKey, chunks);
    }
    this.cacheMemory.set(cacheKey, chunks);
    this.logger.log(
      `RAG cache miss → ${chunks.length} chunks vectorisés pour "${doc.originalName}"`,
    );
    return chunks;
  }

  /** Extraction page par page (pdf-parse ne le fait pas nativement → split). */
  private async extractPdfPages(
    filePath: string,
  ): Promise<{ text: string; page: number }[]> {
    // pdf-parse@1.1.1 exporte directement une fonction
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse: (buf: Buffer) => Promise<{ text: string; numpages: number }> =
      require('pdf-parse');

    const buffer = fs.readFileSync(filePath);
    const parsed = await pdfParse(buffer);
    const fullText = parsed.text?.trim();
    if (!fullText) return [];

    // Heuristique de découpage par page : pdf-parse concatène les pages.
    // On découpe le texte total en numpages parts approximativement égales
    // aux sauts de formulaire \f s'ils existent (reliquats d'extraction).
    const formFeeds = fullText.split('\f');
    if (formFeeds.length > 1) {
      return formFeeds
        .map((t, i) => ({ text: t.trim(), page: i + 1 }))
        .filter((p) => p.text.length > 0);
    }

    // Sinon : découpage équitable sur numpages
    const n = Math.max(1, parsed.numpages || 1);
    const perPage = Math.ceil(fullText.length / n);
    const pages: { text: string; page: number }[] = [];
    for (let i = 0; i < n; i++) {
      const slice = fullText.slice(i * perPage, (i + 1) * perPage).trim();
      if (slice) pages.push({ text: slice, page: i + 1 });
    }
    return pages;
  }

  /** Découpe un texte en chunks ~CHUNK_SIZE avec chevauchement. */
  private splitIntoChunks(text: string): string[] {
    if (text.length <= CHUNK_SIZE) return [text];

    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + CHUNK_SIZE, text.length);

      // Ne pas couper en plein milieu d'une phrase si possible
      if (end < text.length) {
        const lastDot = text.lastIndexOf('.', end);
        const lastNl = text.lastIndexOf('\n', end);
        const cut = Math.max(lastDot, lastNl);
        if (cut > start + CHUNK_SIZE * 0.5) end = cut + 1;
      }

      chunks.push(text.slice(start, end).trim());
      if (end >= text.length) break;
      start = Math.max(end - CHUNK_OVERLAP, start + 1);
    }
    return chunks.filter((c) => c.length > 0);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Scoring
  // ───────────────────────────────────────────────────────────────────────────

  private async scoreByEmbeddings(
    chunks: RagChunk[],
    queryVector: number[],
  ): Promise<RagChunk[]> {
    const scored: RagChunk[] = [];
    for (const chunk of chunks) {
      const vector = (chunk as any).vector as number[] | undefined;
      const score = vector ? EmbeddingsService.cosineSimilarity(queryVector, vector) : 0;
      scored.push({ ...chunk, score });
    }
    return scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  private selectByKeywords(chunks: RagChunk[], question: string, k: number): RagChunk[] {
    const keywords = question
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3 && !FRENCH_STOPWORDS.has(w));

    if (keywords.length === 0) return chunks.slice(0, k);

    return chunks
      .map((c) => {
        const lower = c.text.toLowerCase();
        const score = keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
        return { ...c, score };
      })
      .filter((c) => (c.score ?? 0) > 0)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, k);
  }

  /** Mode résumé : remplit le budget avec des paragraphes significatifs. */
  private selectForSummary(chunks: RagChunk[], budget = 6000): RagChunk[] {
    const selected: RagChunk[] = [];
    let total = 0;
    for (const c of chunks) {
      if (total + c.text.length > budget) break;
      selected.push(c);
      total += c.text.length;
    }
    return selected.length > 0 ? selected : chunks.slice(0, 5);
  }

  /** Format final injecté dans le prompt, avec sources traçables. */
  private formatChunks(chunks: RagChunk[]): string {
    return chunks
      .map((c) => `[Source: ${c.document}${c.page ? `, page ${c.page}` : ''}]\n${c.text}`)
      .join('\n\n---\n\n');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Cache disque
  // ───────────────────────────────────────────────────────────────────────────

  private readDiskCache(key: string): RagChunk[] | null {
    try {
      const file = join(this.cacheDir, `${key}.json`);
      if (!fs.existsSync(file)) return null;
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch {
      return null;
    }
  }

  private writeDiskCache(key: string, chunks: RagChunk[]): void {
    try {
      fs.writeFileSync(join(this.cacheDir, `${key}.json`), JSON.stringify(chunks));
    } catch (err: any) {
      this.logger.warn(`Écriture cache embeddings échouée: ${err.message}`);
    }
  }
}
