import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { join } from 'path';
import * as fs from 'fs';

import { Session } from '../../entities/session.entity';
import { Certificate } from '../../entities/certificate.entity';
import { Presence } from '../../entities/presence.entity';
import { Evaluation } from '../../entities/evaluation.entity';
import { SessionDocument } from '../../entities/session-document.entity';
import { Inscription } from '../../entities/inscription.entity';
import { Formation } from '../../entities/formation.entity';
import { PresenceStatus } from '../../common/enums/presence-status.enum';
import { AiTextResponse } from './dto/ai-response.dto';

// ─────────────────────────────────────────────────────────────────────────────
// Types internes
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'qwen/qwen3.8-27b';
// Même modèle pour le RAG — on compense par un chunking agressif
const GROQ_RAG_MODEL = 'qwen/qwen3.8-27b';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

// 3500 chars ≈ ~875 tokens de contenu. Avec le prompt système + question ≈ ~2000 tokens total,
// bien sous la limite de 7000 TPM du tier gratuit Groq.
const RAG_MAX_CHARS = 3_500;

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly configService: ConfigService,

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
  // PUBLIC : Résumé de session
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Génère un résumé synthétique d'une session à partir de ses données :
   * présences, évaluations, documents et contenu de la formation.
   */
  async generateSessionSummary(
    sessionId: string,
    additionalContext?: string,
  ): Promise<AiTextResponse> {
    // 1. Charger la session avec toutes ses relations utiles
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: {
        formation: true,
        formateurs: true,
        participants: true,
        employes: true,
      },
    });
    if (!session) throw new NotFoundException(`Session #${sessionId} introuvable`);

    // 2. Charger présences, évaluations, documents
    const [presences, evaluations, documents] = await Promise.all([
      this.presenceRepository.find({
        where: { session: { id: sessionId } },
        relations: { user: true },
      }),
      this.evaluationRepository.find({
        where: { session: { id: sessionId } },
        relations: { participant: true, formateur: true },
      }),
      this.sessionDocumentRepository.find({
        where: { sessionId },
      }),
    ]);

    // 3. Calculer le taux de présence
    // Le taux = nb de lignes PRESENT / nb total de lignes de présence
    // (chaque participant a une ligne par jour de session)
    const totalLignes = presences.length;
    const presents = presences.filter(
      (p) => p.statutFormation === PresenceStatus.PRESENT,
    ).length;
    const totalParticipants =
      (session.participants?.length ?? 0) + (session.employes?.length ?? 0);
    const tauxPresence =
      totalLignes > 0
        ? Math.round((presents / totalLignes) * 100)
        : 0;

    // 4. Agréger les points forts / à améliorer des évaluations
    const commentaires = evaluations
      .map((e) => e.commentaire)
      .filter((c): c is string => Boolean(c));
    const pointsForts = evaluations
      .map((e) => e.pointsForts)
      .filter((p): p is string => Boolean(p));
    const pointsAmeliorer = evaluations
      .map((e) => e.pointsAmeliorer)
      .filter((p): p is string => Boolean(p));

    const notesMoyennes = this.computeEvaluationAverages(evaluations);

    // 5. Construire le contexte formaté pour le prompt
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

    const userPrompt = `Génère un résumé de session de formation à partir des données suivantes :

${context}

Le résumé doit couvrir :
1. Un aperçu général de la session (formation, dates, formateur, lieu)
2. Le taux de présence et son interprétation
3. Les points forts remontés par les participants
4. Les axes d'amélioration identifiés
5. Une conclusion sur la qualité globale de la session`;

    const fallbackText = this.buildSessionSummaryFallback(
      session,
      tauxPresence,
      pointsForts,
      pointsAmeliorer,
    );

    return this.callClaude(systemPrompt, userPrompt, fallbackText);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PUBLIC : Texte de certificat personnalisé
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Génère un texte de certificat personnalisé pour un participant donné
   * à partir de son inscription et des données de la session/formation.
   */
  async generateCertificateText(
    certificateId: string,
    additionalMention?: string,
  ): Promise<AiTextResponse> {
    // 1. Charger le certificat avec ses relations
    const certificate = await this.certificateRepository.findOne({
      where: { id: certificateId },
      relations: {
        user: true,
        formation: true,
        session: {
          formateurs: true,
        },
      },
    });
    if (!certificate) throw new NotFoundException(`Certificat #${certificateId} introuvable`);

    const { user, formation, session } = certificate;
    if (!user || !formation || !session) {
      throw new NotFoundException('Données du certificat incomplètes (user, formation ou session manquant)');
    }

    // 2. Charger les présences du participant pour calculer son taux d'assiduité
    const presences = await this.presenceRepository.find({
      where: { session: { id: session.id }, user: { id: user.id } },
    });
    const totalJours = presences.length;
    const joursPresent = presences.filter(
      (p) => p.statutFormation === PresenceStatus.PRESENT,
    ).length;
    const tauxAssiduite =
      totalJours > 0 ? Math.round((joursPresent / totalJours) * 100) : 100;

    // 3. Charger l'évaluation du participant (commentaire, note)
    const evaluation = await this.evaluationRepository.findOne({
      where: { session: { id: session.id }, participant: { id: user.id } },
    });

    // 4. Construire le prompt
    const formateurs = (session.formateurs ?? [])
      .map((f) => `${f.prenom} ${f.nom}`)
      .join(', ') || 'Non renseigné';

    const dateDebut = new Date(session.dateDebut).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const dateFin = new Date(session.dateFin).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

    const systemPrompt = `Tu es un assistant expert en rédaction de certificats de formation professionnelle pour la plateforme StirForma.
Tu génères des textes de certificat personnalisés, formels et valorisants en français.
Le texte doit être court (150-200 mots), solennel et mettre en valeur les compétences acquises.
Ne commence pas par "Nous certifions que" car ce préambule est déjà imprimé sur le certificat.`;

    const mentionAssiduite =
      tauxAssiduite >= 90
        ? 'avec une assiduité exemplaire'
        : tauxAssiduite >= 70
          ? 'avec une assiduité satisfaisante'
          : 'ayant suivi la formation';

    const userPrompt = `Génère le corps d'un certificat de formation professionnelle personnalisé pour :

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

Le texte doit :
1. Féliciter ${user.prenom} ${user.nom} pour l'achèvement de la formation
2. Reformuler les compétences acquises de manière valorisante (à partir des objectifs et du programme)
3. Mentionner le taux d'assiduité : ${mentionAssiduite}
4. Se terminer par une formule encourageante pour la suite de sa carrière professionnelle`;

    const fallbackText = this.buildCertificateFallback(
      user,
      formation,
      session,
      tauxAssiduite,
      certificate.noteObtenue,
    );

    return this.callClaude(systemPrompt, userPrompt, fallbackText);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PRIVATE : Appel API Groq avec retry
  // ───────────────────────────────────────────────────────────────────────────

  private async callClaude(
    systemPrompt: string,
    userPrompt: string,
    fallbackText: string,
    model: string = GROQ_MODEL,
  ): Promise<AiTextResponse> {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      this.logger.warn('GROQ_API_KEY non configurée — utilisation du fallback');
      return { text: fallbackText, isFallback: true };
    }

    const body = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    };

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          const data: any = await response.json();
          const text = data?.choices?.[0]?.message?.content?.trim();
          if (text) return { text, isFallback: false };
          this.logger.warn('Réponse Groq vide — fallback');
          return { text: fallbackText, isFallback: true };
        }

        const errBody = await response.text().catch(() => '');
        this.logger.warn(`Groq API erreur ${response.status}: ${errBody}`);

        // Retry sur 429 (rate limit)
        if (response.status === 429 && attempt < MAX_RETRIES - 1) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt);
          this.logger.log(`Retry ${attempt + 1}/${MAX_RETRIES - 1} dans ${delay}ms…`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        this.logger.error(`Erreur Groq non récupérable (${response.status}) — fallback`);
        return { text: fallbackText, isFallback: true };

      } catch (err: any) {
        this.logger.error(`Erreur réseau Groq (tentative ${attempt + 1}): ${err.message}`);
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, BASE_DELAY_MS * Math.pow(2, attempt)));
          continue;
        }
        return { text: fallbackText, isFallback: true };
      }
    }

    return { text: fallbackText, isFallback: true };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PRIVATE : Helpers de construction de contexte
  // ───────────────────────────────────────────────────────────────────────────

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
    const { session, tauxPresence, totalParticipants, presents, commentaires,
      pointsForts, pointsAmeliorer, notesMoyennes, documents, additionalContext } = params;

    const formateurs = (session.formateurs ?? [])
      .map((f) => `${f.prenom} ${f.nom}`)
      .join(', ') || 'Non renseigné';

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

  private computeEvaluationAverages(
    evaluations: Evaluation[],
  ): Record<string, number | null> {
    if (evaluations.length === 0) {
      return { noteGlobale: null, noteContenu: null, notePedagogie: null, noteSupports: null, noteOrganisation: null };
    }

    const avg = (values: (number | null | undefined)[]): number | null => {
      const valid = values.filter((v): v is number => v != null && !isNaN(Number(v)));
      if (valid.length === 0) return null;
      return Math.round((valid.reduce((s, v) => s + v, 0) / valid.length) * 100) / 100;
    };

    return {
      noteGlobale: avg(evaluations.map((e) => Number(e.note))),
      noteContenu: avg(evaluations.map((e) => e.noteContenu != null ? Number(e.noteContenu) : null)),
      notePedagogie: avg(evaluations.map((e) => e.notePedagogie != null ? Number(e.notePedagogie) : null)),
      noteSupports: avg(evaluations.map((e) => e.noteSupports != null ? Number(e.noteSupports) : null)),
      noteOrganisation: avg(evaluations.map((e) => e.noteOrganisation != null ? Number(e.noteOrganisation) : null)),
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PRIVATE : Textes de fallback (si l'IA est indisponible)
  // ───────────────────────────────────────────────────────────────────────────

  private buildSessionSummaryFallback(
    session: Session,
    tauxPresence: number,
    pointsForts: string[],
    pointsAmeliorer: string[],
  ): string {
    const formateurs = (session.formateurs ?? [])
      .map((f) => `${f.prenom} ${f.nom}`)
      .join(', ') || 'formateur non renseigné';
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
      pointsForts.length > 0
        ? `Points forts identifiés : ${pointsForts.slice(0, 3).join(' ; ')}.`
        : '',
      pointsAmeliorer.length > 0
        ? `Axes d'amélioration : ${pointsAmeliorer.slice(0, 3).join(' ; ')}.`
        : '',
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

  // ───────────────────────────────────────────────────────────────────────────
  // PUBLIC : Résumé IA d'une formation (RAG sur documents de session)
  // ───────────────────────────────────────────────────────────────────────────

  async generateFormationSummary(formationId: string, userId: string): Promise<AiTextResponse> {
    const formation = await this.formationRepository.findOne({
      where: { id: formationId },
      relations: { sessions: true },
    });
    if (!formation) throw new NotFoundException(`Formation #${formationId} introuvable`);

    // Vérifier que l'utilisateur est bien inscrit à au moins une session
    await this.assertParticipantEnrolled(formationId, userId);

    // Récupérer tous les documents de toutes les sessions de cette formation
    const sessionIds = (formation.sessions ?? []).map((s) => s.id);
    const docs = sessionIds.length > 0
      ? await this.sessionDocumentRepository
          .createQueryBuilder('doc')
          .where('doc.sessionId IN (:...ids)', { ids: sessionIds })
          .getMany()
      : [];

    // Extraire le texte des documents PDF
    const context = await this.extractTextFromDocuments(docs);

    if (!context) {
      return {
        text: 'Aucun contenu disponible pour cette formation. Aucun document de session n\'a été partagé pour le moment.',
        isFallback: true,
      };
    }

    const systemPrompt = `Tu es un assistant pédagogique expert pour la plateforme StirForma.
Tu génères des résumés structurés et clairs de formations professionnelles en français.
Base-toi UNIQUEMENT sur les documents fournis. N'invente rien.`;

    const userPrompt = `Génère un résumé structuré de la formation "${formation.titre}" à partir des documents ci-dessous.

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

--- DOCUMENTS DE SESSION ---
${context}
--- FIN DES DOCUMENTS ---`;

    const fallback = `Résumé de la formation "${formation.titre}" :\n\n` +
      (formation.objectifs ? `**Objectifs :** ${formation.objectifs}\n\n` : '') +
      (formation.programme ? `**Programme :** ${formation.programme}\n\n` : '') +
      `Durée : ${formation.dureeEnJours ?? '?'} jour(s).`;

    return this.callClaude(systemPrompt, userPrompt, fallback, GROQ_RAG_MODEL);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PUBLIC : Q&A RAG scopé à une formation
  // ───────────────────────────────────────────────────────────────────────────

  async askFormationQuestion(
    formationId: string,
    question: string,
    userId: string,
  ): Promise<AiTextResponse> {
    const formation = await this.formationRepository.findOne({
      where: { id: formationId },
      relations: { sessions: true },
    });
    if (!formation) throw new NotFoundException(`Formation #${formationId} introuvable`);

    await this.assertParticipantEnrolled(formationId, userId);

    const sessionIds = (formation.sessions ?? []).map((s) => s.id);
    const docs = sessionIds.length > 0
      ? await this.sessionDocumentRepository
          .createQueryBuilder('doc')
          .where('doc.sessionId IN (:...ids)', { ids: sessionIds })
          .getMany()
      : [];

    const context = await this.extractTextFromDocuments(docs, question);

    if (!context) {
      return {
        text: 'Aucun contenu disponible pour cette formation. Je ne peux pas répondre à votre question sans documents de référence.',
        isFallback: true,
      };
    }

    const systemPrompt = `Tu es un assistant pédagogique pour la formation "${formation.titre}" sur la plateforme StirForma.
Tu réponds aux questions des participants en te basant UNIQUEMENT sur les documents de formation fournis.
Si la réponse ne se trouve pas dans les documents, dis-le clairement : "Cette information ne figure pas dans les documents de la formation."
Ne fais JAMAIS appel à des connaissances générales hors du contenu fourni.
Réponds en français, de façon claire et pédagogique.`;

    const userPrompt = `--- DOCUMENTS DE FORMATION ---
${context}
--- FIN DES DOCUMENTS ---

Question du participant : ${question}`;

    const fallback = `Je n'ai pas pu accéder au service IA pour le moment. Voici les informations disponibles sur la formation "${formation.titre}" :\n\n` +
      (formation.objectifs ? `Objectifs : ${formation.objectifs}\n` : '') +
      (formation.programme ? `Programme : ${formation.programme}` : '');

    return this.callClaude(systemPrompt, userPrompt, fallback, GROQ_RAG_MODEL);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PRIVATE : Vérification inscription participant
  // ───────────────────────────────────────────────────────────────────────────

  private async assertParticipantEnrolled(formationId: string, userId: string): Promise<void> {
    const inscription = await this.inscriptionRepository
      .createQueryBuilder('i')
      .innerJoin('i.session', 's')
      .innerJoin('s.formation', 'f')
      .where('f.id = :formationId', { formationId })
      .andWhere('i.userId = :userId', { userId })
      .getOne();

    if (!inscription) {
      throw new ForbiddenException('Vous devez être inscrit à cette formation pour utiliser l\'assistant IA');
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PRIVATE : Extraction texte des documents PDF
  // ───────────────────────────────────────────────────────────────────────────

  private async extractTextFromDocuments(
    docs: SessionDocument[],
    keyword?: string,
  ): Promise<string> {
    if (docs.length === 0) return '';

    // pdf-parse@1.1.1 exporte directement une fonction
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require('pdf-parse');
    const parts: string[] = [];

    for (const doc of docs) {
      // On traite uniquement les PDF
      if (!doc.mimetype?.includes('pdf') && !doc.filename?.endsWith('.pdf')) continue;

      const filePath = join(__dirname, '..', '..', '..', 'uploads', 'session-docs', doc.filename);
      if (!fs.existsSync(filePath)) continue;

      try {
        const buffer = fs.readFileSync(filePath);
        const parsed = await pdfParse(buffer);
        const text = parsed.text?.trim();
        if (text) {
          parts.push(`[Document: ${doc.originalName}]\n${text}`);
        }
      } catch (err: any) {
        this.logger.warn(`Impossible de lire le PDF ${doc.filename}: ${err.message}`);
      }
    }

    if (parts.length === 0) return '';

    let combined = parts.join('\n\n---\n\n');

    // Chunking : si keyword fourni, prioriser les passages pertinents
    if (keyword && combined.length > RAG_MAX_CHARS) {
      combined = this.extractRelevantChunks(combined, keyword);
    }

    // Sans keyword (résumé) : on prend les premiers paragraphes non-vides
    // qui contiennent des phrases complètes (évite les listes de mots bruts)
    if (!keyword && combined.length > RAG_MAX_CHARS) {
      const paragraphs = combined.split(/\n{2,}/);
      const meaningful = paragraphs.filter((p) => p.length > 80 && /[.!?]/.test(p));
      if (meaningful.length > 0) {
        let result = '';
        for (const p of meaningful) {
          if ((result + p).length > RAG_MAX_CHARS) break;
          result += p + '\n\n';
        }
        combined = result.trim() || combined.slice(0, RAG_MAX_CHARS);
      } else {
        combined = combined.slice(0, RAG_MAX_CHARS);
      }
      combined += '\n\n[... contenu tronqué]';
    }

    // Tronquer si toujours trop long
    if (combined.length > RAG_MAX_CHARS + 50) {
      combined = combined.slice(0, RAG_MAX_CHARS) + '\n\n[... contenu tronqué]';
    }

    return combined;
  }

  /**
   * Chunking basique par mot-clé : extrait les paragraphes contenant
   * les termes de la question, avec 200 chars de contexte autour.
   */
  private extractRelevantChunks(text: string, keyword: string): string {
    const keywords = keyword.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const paragraphs = text.split(/\n{2,}/);
    const scored = paragraphs.map((p) => {
      const lower = p.toLowerCase();
      const score = keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
      return { p, score };
    });

    const relevant = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map((s) => s.p);

    const result = relevant.join('\n\n');
    return result.length > 0 ? result : text.slice(0, RAG_MAX_CHARS);
  }

}
