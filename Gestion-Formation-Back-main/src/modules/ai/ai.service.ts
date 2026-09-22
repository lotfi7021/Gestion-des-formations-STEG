import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Session } from '../../entities/session.entity';
import { Certificate } from '../../entities/certificate.entity';
import { Presence } from '../../entities/presence.entity';
import { Evaluation } from '../../entities/evaluation.entity';
import { SessionDocument } from '../../entities/session-document.entity';
import { Inscription } from '../../entities/inscription.entity';
import { Formation } from '../../entities/formation.entity';
import { PresenceStatus } from '../../common/enums/presence-status.enum';
import { AiTextResponse } from './dto/ai-response.dto';
import { RagService, RagChunk } from './rag/rag.service';

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'qwen/qwen3.8-27b';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;
/** Timeout par requête HTTP vers Groq (ms). */
const REQUEST_TIMEOUT_MS = 30_000;

/** Durée du cache des résumés (ms) — invalidé si les documents changent. */
const SUMMARY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Instructions système communes à tous les prompts RAG.
 * Langue, ton, format, interdiction d'halluciner.
 */
const RAG_SYSTEM_RULES = `Règles impératives :
- Réponds UNIQUEMENT en français, dans un ton professionnel et pédagogique.
- Base-toi EXCLUSIVEMENT sur le contexte fourni ci-dessous. N'utilise JAMAIS tes connaissances générales.
- Si l'information n'est pas dans le contexte, déclare-le explicitement plutôt que d'inventer.
- Cite tes sources sous la forme (Document, page X) pour chaque affirmation issue d'un document.`;

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  /**
   * Cache des résumés générés : clé = formationId ou sessionId,
   * valeur = { réponse, empreinte des documents, date }.
   * Invalidation : TTL 24h OU changement des documents de session
   * (upload/suppression → nouvelle empreinte).
   */
  private readonly summaryCache = new Map<
    string,
    { response: AiTextResponse; docsFingerprint: string; createdAt: number }
  >();

  constructor(
    private readonly configService: ConfigService,
    private readonly ragService: RagService,

    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,

    @InjectRepository(Certificate)
    private readonly certificateRepository: Repository<Certificate>,

    @InjectRepository(Presence)
    private readonly presenceRepository: Repository<Presence>,

    @InjectRepository(Evaluation)
    private readonly evaluationRepository: Repository<Evaluation>,

    @InjectRepository(SessionDocument)
    private readonly sessionDocumentRepository: Repository<SessionDocument>,

    @InjectRepository(Inscription)
    private readonly inscriptionRepository: Repository<Inscription>,

    @InjectRepository(Formation)
    private readonly formationRepository: Repository<Formation>,
  ) {}

  // ───────────────────────────────────────────────────────────────────────────
  // PUBLIC : Résumé de session (données structurées, pas de RAG)
  // ───────────────────────────────────────────────────────────────────────────

  async generateSessionSummary(
    sessionId: string,
    additionalContext?: string,
  ): Promise<AiTextResponse> {
    const started = Date.now();
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: { formation: true, formateurs: true, participants: true },
    });
    if (!session) throw new NotFoundException(`Session #${sessionId} introuvable`);

    const [presences, evaluations, documents] = await Promise.all([
      this.presenceRepository.find({ where: { session: { id: sessionId } }, relations: { user: true } }),
      this.evaluationRepository.find({
        where: { session: { id: sessionId } },
        relations: { participant: true, formateur: true },
      }),
      this.sessionDocumentRepository.find({ where: { sessionId } }),
    ]);

    const totalLignes = presences.length;
    const presents = presences.filter((p) => p.statutFormation === PresenceStatus.PRESENT).length;
    const totalParticipants = session.participants?.length ?? 0;
    const tauxPresence = totalLignes > 0 ? Math.round((presents / totalLignes) * 100) : 0;

    const commentaires = evaluations.map((e) => e.commentaire).filter((c): c is string => Boolean(c));
    const pointsForts = evaluations.map((e) => e.pointsForts).filter((p): p is string => Boolean(p));
    const pointsAmeliorer = evaluations
      .map((e) => e.pointsAmeliorer)
      .filter((p): p is string => Boolean(p));
    const notesMoyennes = this.computeEvaluationAverages(evaluations);

    const context = this.buildSessionContext({
      session,
      tauxPresence,
      totalParticipants,
      presents,
      commentaires,
      pointsForts,
      pointsAmeliorer,
      notesMoyennes,
      documents,
      additionalContext,
    });

    const systemPrompt = `Tu es un assistant expert en formation professionnelle travaillant pour la plateforme StirForma.
Tu génères des résumés synthétiques et professionnels de sessions de formation en français.
Ton texte doit être structuré, factuel et facilement réutilisable dans un rapport ou un compte-rendu officiel.
Utilise un style formel, sans émojis. Maximum 400 mots.`;

    const userPrompt = `Génère un résumé de session de formation à partir des données suivantes :\n\n${context}\n\nLe résumé doit couvrir :\n1. Un aperçu général de la session (formation, dates, formateur, lieu)\n2. Le taux de présence et son interprétation\n3. Les points forts remontés par les participants\n4. Les axes d'amélioration identifiés\n5. Une conclusion sur la qualité globale de la session`;

    const fallbackText = this.buildSessionSummaryFallback(session, tauxPresence, pointsForts, pointsAmeliorer);

    const result = await this.callGroq(systemPrompt, userPrompt, fallbackText);
    return { ...result, latencyMs: Date.now() - started };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PUBLIC : Texte de certificat — sortie JSON stricte
  // ───────────────────────────────────────────────────────────────────────────

  async generateCertificateText(
    certificateId: string,
    additionalMention?: string,
  ): Promise<AiTextResponse> {
    const started = Date.now();
    const certificate = await this.certificateRepository.findOne({
      where: { id: certificateId },
      relations: { user: true, formation: true, session: { formateurs: true } },
    });
    if (!certificate) throw new NotFoundException(`Certificat #${certificateId} introuvable`);

    const { user, formation, session } = certificate;
    if (!user || !formation || !session) {
      throw new NotFoundException('Données du certificat incomplètes (user, formation ou session manquant)');
    }

    const presences = await this.presenceRepository.find({
      where: { session: { id: session.id }, user: { id: user.id } },
    });
    const totalJours = presences.length;
    const joursPresent = presences.filter((p) => p.statutFormation === PresenceStatus.PRESENT).length;
    const tauxAssiduite = totalJours > 0 ? Math.round((joursPresent / totalJours) * 100) : 100;

    const evaluation = await this.evaluationRepository.findOne({
      where: { session: { id: session.id }, participant: { id: user.id } },
    });

    const formateurs =
      (session.formateurs ?? []).map((f) => `${f.prenom} ${f.nom}`).join(', ') || 'Non renseigné';
    const dateDebut = new Date(session.dateDebut).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const dateFin = new Date(session.dateFin).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

    const mentionAssiduite =
      tauxAssiduite >= 90
        ? 'avec une assiduité exemplaire'
        : tauxAssiduite >= 70
          ? 'avec une assiduité satisfaisante'
          : 'ayant suivi la formation';

    const systemPrompt = `Tu es un expert en rédaction de certificats de formation professionnelle pour la plateforme StirForma.
Tu génères des textes de certificat personnalisés, formels et valorisants, en français.

FORMAT DE SORTIE OBLIGATOIRE — renvoie UNIQUEMENT un objet JSON valide, sans texte avant ni après, conforme à ce schéma :
{
  "titre": "Certificat de Formation",           // string : titre du certificat
  "corps": "texte du certificat de 150 à 200 mots",  // string : corps solennel, sans le préambule "Nous certifions que"
  "mention": "ex: avec une assiduité exemplaire",    // string : mention d'assiduité courte
  "competences": ["compétence 1", "compétence 2"]    // string[] : 2 à 4 compétences acquises
}`;

    const userPrompt = `Génère le JSON du certificat pour :

Participant : ${user.prenom} ${user.nom}
Formation : "${formation.titre}"
Catégorie : ${formation.categorie || 'Formation professionnelle'}
Durée : ${formation.dureeEnJours ?? '?'} jour(s) — ${formation.dureeEnHeures ?? '?'} heure(s)
Session : du ${dateDebut} au ${dateFin}
Lieu : ${session.lieu || 'Non renseigné'}
Formateur(s) : ${formateurs}
Objectifs de la formation : ${formation.objectifs || formation.description || 'Non renseignés'}
Programme : ${formation.programme || 'Non renseigné'}
Taux d'assiduité : ${tauxAssiduite}% (${mentionAssiduite})
Note obtenue : ${certificate.noteObtenue != null ? `${certificate.noteObtenue}/20` : 'Non renseignée'}
Commentaire du participant : ${evaluation?.commentaire || 'Aucun'}
${additionalMention ? `Mention complémentaire : ${additionalMention}` : ''}

Le corps doit :
1. Féliciter ${user.prenom} ${user.nom} pour l'achèvement de la formation
2. Reformuler les compétences acquises de manière valorisante (à partir des objectifs et du programme)
3. Mentionner l'assiduité : ${mentionAssiduite}
4. Se terminer par une formule encourageante pour la suite de sa carrière`;

    const fallbackText = this.buildCertificateFallback(
      user, formation, session, tauxAssiduite, certificate.noteObtenue,
    );

    const result = await this.callGroq(systemPrompt, userPrompt, fallbackText, GROQ_MODEL, {
      temperature: 0.7,
      maxTokens: 1024,
      jsonMode: true,
    });

    // Extraction + validation du JSON renvoyé par le modèle
    if (!result.isFallback) {
      const parsed = this.parseJsonOutput(result.text);
      if (parsed && typeof parsed.corps === 'string' && parsed.corps.length > 30) {
        const formatted = this.formatCertificateJson(parsed);
        return { text: formatted, isFallback: false, latencyMs: Date.now() - started };
      }
      // JSON invalide ou incomplet → on tente d'utiliser le texte brut
      this.logger.warn('JSON certificat invalide — usage du texte brut ou fallback');
      if (result.text && result.text.length > 30) {
        return { text: result.text, isFallback: false, latencyMs: Date.now() - started };
      }
      return { text: fallbackText, isFallback: true, latencyMs: Date.now() - started };
    }

    return { ...result, latencyMs: Date.now() - started };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PUBLIC : Résumé IA d'une formation (RAG + cache)
  // ───────────────────────────────────────────────────────────────────────────

  async generateFormationSummary(formationId: string, userId: string): Promise<AiTextResponse> {
    const started = Date.now();
    const formation = await this.formationRepository.findOne({
      where: { id: formationId },
      relations: { sessions: true },
    });
    if (!formation) throw new NotFoundException(`Formation #${formationId} introuvable`);

    await this.assertParticipantEnrolled(formationId, userId);

    const sessionIds = (formation.sessions ?? []).map((s) => s.id);
    const docs =
      sessionIds.length > 0
        ? await this.sessionDocumentRepository
            .createQueryBuilder('doc')
            .where('doc.sessionId IN (:...ids)', { ids: sessionIds })
            .getMany()
        : [];

    if (docs.length === 0) {
      return {
        text: "Aucun contenu disponible pour cette formation. Aucun document de session n'a été partagé pour le moment.",
        isFallback: true,
        notFound: true,
        latencyMs: Date.now() - started,
      };
    }

    // Cache : clé formation + empreinte des documents
    const fingerprint = this.computeDocsFingerprint(docs);
    const cacheKey = `summary:formation:${formationId}`;
    const cached = this.summaryCache.get(cacheKey);
    if (cached && cached.docsFingerprint === fingerprint && Date.now() - cached.createdAt < SUMMARY_CACHE_TTL_MS) {
      this.logger.log(`Cache HIT résumé formation ${formationId}`);
      return { ...cached.response, cached: true, latencyMs: Date.now() - started };
    }

    const rag = await this.ragService.buildContext(docs);
    if (!rag.context) {
      return {
        text: "Aucun contenu exploitable dans les documents de cette formation (PDF illisible ou vide).",
        isFallback: true,
        notFound: true,
        latencyMs: Date.now() - started,
      };
    }

    const systemPrompt = `Tu es un assistant pédagogique expert pour la plateforme StirForma.
Tu génères des résumés structurés et clairs de formations professionnelles en français.
${RAG_SYSTEM_RULES}`;

    const userPrompt = `Génère un résumé structuré de la formation "${formation.titre}" à partir des extraits ci-dessous.

Le résumé doit contenir :
1. **Objectifs pédagogiques** — ce que le participant apprend
2. **Points clés du contenu** — les thèmes et concepts principaux abordés
3. **Compétences visées** — ce que le participant sera capable de faire à l'issue
4. **Synthèse** — 2-3 phrases résumant l'essentiel

Informations de la formation :
- Titre : ${formation.titre}
- Catégorie : ${formation.categorie || 'Non renseignée'}
- Durée : ${formation.dureeEnJours ?? '?'} jour(s) / ${formation.dureeEnHeures ?? '?'} heure(s)
- Objectifs déclarés : ${formation.objectifs || 'Non renseignés'}
- Programme : ${formation.programme || 'Non renseigné'}

--- EXTRAITS DES DOCUMENTS DE SESSION ---
${rag.context}
--- FIN DES EXTRAITS ---`;

    const fallback =
      `Résumé de la formation "${formation.titre}" :\n\n` +
      (formation.objectifs ? `**Objectifs :** ${formation.objectifs}\n\n` : '') +
      (formation.programme ? `**Programme :** ${formation.programme}\n\n` : '') +
      `Durée : ${formation.dureeEnJours ?? '?'} jour(s).`;

    const result = await this.callGroq(systemPrompt, userPrompt, fallback, GROQ_MODEL);

    const response: AiTextResponse = {
      ...result,
      sources: rag.chunks.map((c) => ({ document: c.document, page: c.page || undefined })),
      latencyMs: Date.now() - started,
    };

    // Mise en cache
    this.summaryCache.set(cacheKey, {
      response,
      docsFingerprint: fingerprint,
      createdAt: Date.now(),
    });

    return response;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PUBLIC : Q&A RAG scopé à une formation — avec citations + confidence
  // ───────────────────────────────────────────────────────────────────────────

  async askFormationQuestion(
    formationId: string,
    question: string,
    userId: string,
  ): Promise<AiTextResponse> {
    const started = Date.now();
    const formation = await this.formationRepository.findOne({
      where: { id: formationId },
      relations: { sessions: true },
    });
    if (!formation) throw new NotFoundException(`Formation #${formationId} introuvable`);

    await this.assertParticipantEnrolled(formationId, userId);

    const sessionIds = (formation.sessions ?? []).map((s) => s.id);
    const docs =
      sessionIds.length > 0
        ? await this.sessionDocumentRepository
            .createQueryBuilder('doc')
            .where('doc.sessionId IN (:...ids)', { ids: sessionIds })
            .getMany()
        : [];

    if (docs.length === 0) {
      return {
        text: "Aucun contenu disponible pour cette formation. Je ne peux pas répondre à votre question sans documents de référence.",
        isFallback: true,
        notFound: true,
        latencyMs: Date.now() - started,
      };
    }

    // 1. Retrieval vectoriel (top-k configurable via AI_RAG_TOP_K)
    const rag = await this.ragService.buildContext(docs, question);
    if (!rag.context) {
      return {
        text: "Aucun contenu exploitable dans les documents de cette formation.",
        isFallback: true,
        notFound: true,
        latencyMs: Date.now() - started,
      };
    }

    // 2. Prompt structuré avec sortie JSON (citations + confiance)
    const systemPrompt = `Tu es un assistant pédagogique pour la formation "${formation.titre}" sur la plateforme StirForma.
${RAG_SYSTEM_RULES}

FORMAT DE SORTIE OBLIGATOIRE — renvoie UNIQUEMENT un objet JSON valide, sans texte avant ni après :
{
  "reponse": "ta réponse en français, claire et pédagogique",
  "trouve": true,                          // true si l'info est dans le contexte, false sinon
  "confiance": "high",                     // "high", "medium" ou "low"
  "sources": [ { "document": "nom.pdf", "page": 3 } ]   // documents/pages utilisés ([] si trouve=false)
}`;

    const userPrompt = `--- EXTRAITS DES DOCUMENTS DE FORMATION ---
${rag.context}
--- FIN DES EXTRAITS ---

Question du participant : ${question}`;

    // Fallback hors-ligne : recherche par mots-clés dans les chunks bruts
    // pour donner au moins un extrait pertinent.
    const fallback = this.buildRagKeywordFallback(rag.chunks, question, formation.titre);

    const result = await this.callGroq(systemPrompt, userPrompt, fallback, GROQ_MODEL, {
      jsonMode: true,
      temperature: 0.3, // Q&A factuelle → peu créatif
    });

    if (result.isFallback) {
      return { ...result, notFound: true, latencyMs: Date.now() - started };
    }

    // 3. Parse de la sortie JSON structurée
    const parsed = this.parseJsonOutput(result.text);
    if (!parsed || typeof parsed.reponse !== 'string') {
      // Sortie non-JSON : on utilise le texte brut tel quel
      this.logger.warn('Sortie Q&A non-JSON — usage du texte brut');
      return {
        text: result.text,
        isFallback: false,
        confidence: 'medium',
        sources: rag.chunks.slice(0, 3).map((c) => ({ document: c.document, page: c.page || undefined })),
        latencyMs: Date.now() - started,
      };
    }

    const sources = Array.isArray(parsed.sources)
      ? parsed.sources
          .filter((s: any) => s && typeof s.document === 'string')
          .map((s: any) => ({ document: s.document, page: typeof s.page === 'number' ? s.page : undefined }))
      : rag.chunks.slice(0, 3).map((c) => ({ document: c.document, page: c.page || undefined }));

    return {
      text: parsed.reponse,
      isFallback: false,
      notFound: parsed.trouve === false,
      confidence: ['high', 'medium', 'low'].includes(parsed.confiance) ? parsed.confiance : 'medium',
      sources,
      latencyMs: Date.now() - started,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PRIVATE : Appel Groq — retry/backoff, timeout, logs de monitoring
  // ───────────────────────────────────────────────────────────────────────────

  private async callGroq(
    systemPrompt: string,
    userPrompt: string,
    fallbackText: string,
    model: string = GROQ_MODEL,
    opts?: { temperature?: number; maxTokens?: number; jsonMode?: boolean },
  ): Promise<AiTextResponse> {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      this.logger.warn('GROQ_API_KEY non configurée — utilisation du fallback');
      return { text: fallbackText, isFallback: true };
    }

    const body: Record<string, any> = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: opts?.temperature ?? 0.7,
      max_tokens: opts?.maxTokens ?? 1024,
    };
    if (opts?.jsonMode) body.response_format = { type: 'json_object' };

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const attemptStart = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (response.ok) {
          const data: any = await response.json();
          const text = data?.choices?.[0]?.message?.content?.trim();
          const elapsed = Date.now() - attemptStart;
          if (text) {
            // Log de monitoring : durée, modèle, usage tokens
            this.logger.log(
              `Groq OK ${model} ${elapsed}ms | usage: ${JSON.stringify(data?.usage ?? {})}`,
            );
            clearTimeout(timer);
            return { text, isFallback: false };
          }
          this.logger.warn(`Réponse Groq vide (${elapsed}ms) — fallback`);
          clearTimeout(timer);
          return { text: fallbackText, isFallback: true };
        }

        const errBody = await response.text().catch(() => '');
        this.logger.warn(
          `Groq erreur ${response.status} (tentative ${attempt + 1}/${MAX_RETRIES}): ${errBody.slice(0, 300)}`,
        );

        // Retry sur 429 (rate limit) et 5xx (erreur serveur)
        const retryable = response.status === 429 || response.status >= 500;
        if (retryable && attempt < MAX_RETRIES - 1) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt);
          this.logger.log(`Retry ${attempt + 1}/${MAX_RETRIES - 1} dans ${delay}ms…`);
          clearTimeout(timer);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        clearTimeout(timer);
        this.logger.error(`Erreur Groq non récupérable (${response.status}) — fallback`);
        return { text: fallbackText, isFallback: true };
      } catch (err: any) {
        const elapsed = Date.now() - attemptStart;
        // AbortError = timeout
        const isTimeout = err?.name === 'AbortError';
        this.logger.error(
          `${isTimeout ? 'Timeout' : 'Erreur réseau'} Groq (tentative ${attempt + 1}/${MAX_RETRIES}, ${elapsed}ms): ${err?.message}`,
        );
        if (attempt < MAX_RETRIES - 1) {
          clearTimeout(timer);
          await new Promise((r) => setTimeout(r, BASE_DELAY_MS * Math.pow(2, attempt)));
          continue;
        }
        clearTimeout(timer);
        return { text: fallbackText, isFallback: true };
      }
    }

    return { text: fallbackText, isFallback: true };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PRIVATE : Helpers RAG / JSON / cache
  // ───────────────────────────────────────────────────────────────────────────

  /** Parse un JSON potentiellement entouré de texte ou de blocs markdown. */
  private parseJsonOutput(raw: string): any | null {
    if (!raw) return null;
    // 1. Tentative directe
    try {
      return JSON.parse(raw);
    } catch {
      // 2. Extraction du premier bloc {...} équilibré
    }
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        // 3. Extraction depuis un bloc markdown ```json ... ```
      }
    }
    const md = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (md) {
      try {
        return JSON.parse(md[1].trim());
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Fallback hors-ligne pour le Q&A : au lieu d'un message générique,
   * renvoie les chunks les plus pertinents selon une recherche par mots-clés
   * (scoring simple) pour que l'utilisateur ait au moins un extrait utile.
   */
  private buildRagKeywordFallback(chunks: RagChunk[], question: string, formationTitre: string): string {
    if (chunks.length === 0) {
      return `Le service IA est momentanément indisponible. Aucun extrait des documents de "${formationTitre}" n'a pu être récupéré.`;
    }

    const keywords = question
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);

    const scored = chunks
      .map((c) => {
        const lower = c.text.toLowerCase();
        const score = keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
        return { c, score };
      })
      .sort((a, b) => b.score - a.score);

    const top = scored.slice(0, 2).filter((s) => s.score > 0);
    const picked = top.length > 0 ? top : scored.slice(0, 1);

    const extraits = picked
      .map(
        ({ c }) =>
          `📄 ${c.document}${c.page ? ` (page ${c.page})` : ''} :\n« ${c.text.slice(0, 400).trim()}${c.text.length > 400 ? '…' : ''} »`,
      )
      .join('\n\n');

    return `Le service IA est momentanément indisponible. Voici les extraits les plus pertinents trouvés dans les documents :\n\n${extraits}`;
  }

  /** Empreinte stable des documents (id + mtime) — change dès qu'un doc est ajouté/supprimé/modifié. */
  private computeDocsFingerprint(docs: SessionDocument[]): string {
    return docs
      .map((d) => `${d.id}:${(d as any).createdAt ?? ''}`)
      .sort()
      .join('|');
  }

  private buildSessionContext(params: {
    session: Session;
    tauxPresence: number;
    totalParticipants: number;
    presents: number;
    commentaires: string[];
    pointsForts: string[];
    pointsAmeliorer: string[];
    notesMoyennes: Record<string, number | null>;
    documents: SessionDocument[];
    additionalContext?: string;
  }): string {
    const {
      session, tauxPresence, totalParticipants, presents, commentaires,
      pointsForts, pointsAmeliorer, notesMoyennes, documents, additionalContext,
    } = params;

    const formateurs =
      (session.formateurs ?? []).map((f) => `${f.prenom} ${f.nom}`).join(', ') || 'Non renseigné';
    const dateDebut = new Date(session.dateDebut).toLocaleDateString('fr-FR');
    const dateFin = new Date(session.dateFin).toLocaleDateString('fr-FR');

    const lines: string[] = [
      `--- Informations générales ---`,
      `Formation : "${session.formation?.titre ?? 'N/A'}"`,
      `Catégorie : ${session.formation?.categorie ?? 'N/A'}`,
      `Type : ${session.formation?.type ?? 'N/A'}`,
      `Durée : ${session.formation?.dureeEnJours ?? '?'} jour(s) — ${session.formation?.dureeEnHeures ?? '?'} heure(s)`,
      `Dates : du ${dateDebut} au ${dateFin}`,
      `Lieu : ${session.lieu ?? 'Non renseigné'}`,
      `Formateur(s) : ${formateurs}`,
      ``,
      `--- Objectifs & programme ---`,
      `Objectifs : ${session.formation?.objectifs ?? 'Non renseignés'}`,
      `Programme : ${session.formation?.programme ?? 'Non renseigné'}`,
      ``,
      `--- Présence ---`,
      `Total participants inscrits : ${totalParticipants}`,
      `Présents : ${presents}`,
      `Taux de présence : ${tauxPresence}%`,
      ``,
      `--- Notes moyennes (évaluations) ---`,
      `Note globale : ${notesMoyennes.noteGlobale ?? 'N/A'}/5`,
      `Contenu : ${notesMoyennes.noteContenu ?? 'N/A'}/5`,
      `Pédagogie : ${notesMoyennes.notePedagogie ?? 'N/A'}/5`,
      `Supports : ${notesMoyennes.noteSupports ?? 'N/A'}/5`,
      `Organisation : ${notesMoyennes.noteOrganisation ?? 'N/A'}/5`,
      ``,
      `--- Points forts remontés ---`,
      pointsForts.length > 0 ? pointsForts.slice(0, 5).join('\n') : 'Aucun',
      ``,
      `--- Axes d'amélioration ---`,
      pointsAmeliorer.length > 0 ? pointsAmeliorer.slice(0, 5).join('\n') : 'Aucun',
      ``,
      `--- Commentaires libres (extrait) ---`,
      commentaires.length > 0 ? commentaires.slice(0, 5).join('\n') : 'Aucun',
      ``,
      `--- Documents de session ---`,
      `${documents.length} document(s) partagé(s) : ${documents.map((d) => d.originalName).join(', ') || 'Aucun'}`,
    ];

    if (additionalContext) {
      lines.push(``, `--- Contexte complémentaire ---`, additionalContext);
    }

    return lines.join('\n');
  }

  private computeEvaluationAverages(evaluations: Evaluation[]): Record<string, number | null> {
    if (evaluations.length === 0) {
      return {
        noteGlobale: null, noteContenu: null, notePedagogie: null,
        noteSupports: null, noteOrganisation: null,
      };
    }

    const avg = (values: (number | null | undefined)[]): number | null => {
      const valid = values.filter((v): v is number => v != null && !isNaN(Number(v)));
      if (valid.length === 0) return null;
      return Math.round((valid.reduce((s, v) => s + v, 0) / valid.length) * 100) / 100;
    };

    return {
      noteGlobale: avg(evaluations.map((e) => Number(e.note))),
      noteContenu: avg(evaluations.map((e) => (e.noteContenu != null ? Number(e.noteContenu) : null))),
      notePedagogie: avg(evaluations.map((e) => (e.notePedagogie != null ? Number(e.notePedagogie) : null))),
      noteSupports: avg(evaluations.map((e) => (e.noteSupports != null ? Number(e.noteSupports) : null))),
      noteOrganisation: avg(evaluations.map((e) => (e.noteOrganisation != null ? Number(e.noteOrganisation) : null))),
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PRIVATE : Fallbacks structurés
  // ───────────────────────────────────────────────────────────────────────────

  private buildSessionSummaryFallback(
    session: Session,
    tauxPresence: number,
    pointsForts: string[],
    pointsAmeliorer: string[],
  ): string {
    const formateurs =
      (session.formateurs ?? []).map((f) => `${f.prenom} ${f.nom}`).join(', ') || 'formateur non renseigné';
    const dateDebut = new Date(session.dateDebut).toLocaleDateString('fr-FR');
    const dateFin = new Date(session.dateFin).toLocaleDateString('fr-FR');
    const titre = session.formation?.titre ?? 'formation';

    return [
      `Compte-rendu de la session "${titre}"`,
      ``,
      `La session "${titre}" s'est déroulée du ${dateDebut} au ${dateFin}`,
      `à ${session.lieu ?? 'lieu non renseigné'}, animée par ${formateurs}.`,
      ``,
      `Taux de présence : ${tauxPresence}%.`,
      ``,
      pointsForts.length > 0 ? `Points forts identifiés : ${pointsForts.slice(0, 3).join(' ; ')}.` : '',
      pointsAmeliorer.length > 0 ? `Axes d'amélioration : ${pointsAmeliorer.slice(0, 3).join(' ; ')}.` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  private buildCertificateFallback(
    user: { prenom: string; nom: string },
    formation: { titre: string; objectifs?: string; dureeEnJours?: number },
    session: { dateDebut: Date; dateFin: Date; lieu?: string },
    tauxAssiduite: number,
    noteObtenue?: number | null,
  ): string {
    const dateDebut = new Date(session.dateDebut).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const dateFin = new Date(session.dateFin).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const mention =
      tauxAssiduite >= 90
        ? 'avec une assiduité exemplaire'
        : tauxAssiduite >= 70
          ? 'avec une assiduité satisfaisante'
          : 'ayant complété la formation';

    return [
      `${user.prenom} ${user.nom} a suivi et validé avec succès la formation "${formation.titre}"`,
      `d'une durée de ${formation.dureeEnJours ?? '?'} jour(s), organisée du ${dateDebut} au ${dateFin}`,
      `${session.lieu ? `à ${session.lieu}` : ''}, ${mention} (${tauxAssiduite}% de présence).`,
      ``,
      formation.objectifs
        ? `À l'issue de cette formation, le participant a acquis les compétences suivantes : ${formation.objectifs}.`
        : '',
      noteObtenue != null ? `Note obtenue : ${noteObtenue}/20.` : '',
      ``,
      `Ce certificat atteste de l'engagement et du sérieux de ${user.prenom} ${user.nom} dans son parcours de développement professionnel.`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  /** Transforme le JSON certificat en texte formaté pour le PDF/certificat. */
  private formatCertificateJson(parsed: any): string {
    const lines: string[] = [];
    if (parsed.titre) lines.push(parsed.titre, ``);
    if (parsed.corps) lines.push(parsed.corps.trim(), ``);
    if (parsed.mention) lines.push(`Mention : ${parsed.mention}`, ``);
    if (Array.isArray(parsed.competences) && parsed.competences.length > 0) {
      lines.push(`Compétences validées :`, ...parsed.competences.map((c: string) => `• ${c}`));
    }
    return lines.join('\n').trim();
  }

  private async assertParticipantEnrolled(formationId: string, userId: string): Promise<void> {
    const inscription = await this.inscriptionRepository
      .createQueryBuilder('i')
      .innerJoin('i.session', 's')
      .innerJoin('s.formation', 'f')
      .where('f.id = :formationId', { formationId })
      .andWhere('i.userId = :userId', { userId })
      .getOne();

    if (!inscription) {
      throw new ForbiddenException(
        "Vous devez être inscrit à cette formation pour utiliser l'assistant IA",
      );
    }
  }
}
