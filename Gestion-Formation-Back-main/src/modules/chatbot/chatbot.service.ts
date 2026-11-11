import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Formation } from '../../entities/formation.entity';
import { Session } from '../../entities/session.entity';
import { Inscription } from '../../entities/inscription.entity';
import { User } from '../../entities/user.entity';
import { Employe } from '../../entities/employe.entity';
import { Evaluation } from '../../entities/evaluation.entity';
import { FormationType } from '../../common/enums/formation-type.enum';
import { UserRole } from '../../common/enums/role.enum';
import { StatutPaiement } from '../../common/enums/payment-status.enum';
import { EmployeService } from '../employe/employe.service';
import { MailService } from '../mail/mail.service';

interface ActionIntent {
  type: 'action';
  action: 'add_formation' | 'add_session' | 'add_employe' | 'add_participant' | 'add_formateur' | 'confirm_payment' | 'refuse_payment' | 'delete_formation' | 'delete_session' | 'delete_employe' | 'delete_participant' | 'delete_formateur' | 'deactivate_user';
  parameters: Record<string, any>;
}

@Injectable()
export class ChatbotService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Formation) private formationRepo: Repository<Formation>,
    @InjectRepository(Session) private sessionRepo: Repository<Session>,
    @InjectRepository(Inscription) private inscriptionRepo: Repository<Inscription>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Employe) private employeRepo: Repository<Employe>,
    @InjectRepository(Evaluation) private evaluationRepo: Repository<Evaluation>,
    private readonly employeService: EmployeService,
    private readonly mailService: MailService,
  ) {}

  async ask(question: string, role: string, userId?: string): Promise<{ answer: string; actionPerformed: boolean }> {
    if (role === 'admin') {
      const actionResult = await this.tryHandleAction(question);
      if (actionResult) return { answer: actionResult, actionPerformed: true };
    }
    const context = await this.buildContext(role, userId);
    const answer = await this.callGroq(question, role, context);
    return { answer, actionPerformed: false };
  }

  private async buildContext(role: string, userId?: string): Promise<string> {
    const parts: string[] = [];

    if (role === 'admin') {
      const formations = await this.formationRepo.find({ take: 50 });
      parts.push(`Nombre total de formations: ${formations.length}`);
      formations.forEach(f => {
        parts.push(`- Formation: "${f.titre}" (${f.type}, ${f.dureeEnJours ?? '?'} jours, tarif: ${f.tarif ?? '?'} DT, active: ${f.isActive})`);
      });

      const sessions = await this.sessionRepo.find({ relations: { formation: true, formateurs: true, participants: true, employes: true }, take: 50 });
      parts.push(`Nombre total de sessions: ${sessions.length}`);
      sessions.forEach(s => {
        const formateurs = s.formateurs?.map(f => `${f.prenom} ${f.nom}`).join(', ') || 'aucun';
        const nbParticipants = s.participants?.length || 0;
        const nbEmployes = s.employes?.length || 0;
        parts.push(`- Session du ${s.dateDebut ? new Date(s.dateDebut).toLocaleDateString('fr-FR') : '?'} au ${s.dateFin ? new Date(s.dateFin).toLocaleDateString('fr-FR') : '?'}, formation: "${s.formation?.titre || '?'}", lieu: ${s.lieu || '?'}, formateurs: [${formateurs}], participants: ${nbParticipants}, employés: ${nbEmployes}, complétée: ${s.isCompleted}, annulée: ${s.isCancelled}`);
      });
    }

    if (role === 'admin') {
      const inscriptions = await this.inscriptionRepo.find({ relations: { user: true, session: { formation: true } }, take: 50 });
      parts.push(`Nombre total d'inscriptions: ${inscriptions.length}`);
      const pending = inscriptions.filter(i => i.statutPaiement === 'en_attente');
      const paid = inscriptions.filter(i => i.statutPaiement === 'paye');
      const refused = inscriptions.filter(i => i.statutPaiement === 'refuse');
      parts.push(`Paiements en attente: ${pending.length}, Payés: ${paid.length}, Refusés: ${refused.length}`);
      const totalMontant = inscriptions.reduce((sum, i) => sum + Number(i.montant || 0), 0);
      parts.push(`Montant total des inscriptions: ${totalMontant} DT`);
      inscriptions.forEach(i => {
        parts.push(`- Inscription: ${i.user?.prenom || '?'} ${i.user?.nom || '?'} → "${i.session?.formation?.titre || '?'}" (${new Date(i.session?.dateDebut).toLocaleDateString('fr-FR')}), montant: ${i.montant} DT, statut: ${i.statutPaiement}, méthode: ${i.methodePaiement}`);
      });

      const employes = await this.employeRepo.find({ take: 100 });
      parts.push(`Nombre total d'employés: ${employes.length}`);
      parts.push('--- Liste des employés ---');
      employes.forEach(e => parts.push(`- ${e.prenom || '?'} ${e.nom || '?'} (${e.email}), téléphone: ${e.telephone || 'N/A'}, poste: ${e.poste || 'N/A'}, département: ${e.departement || 'N/A'}, direction: ${e.directionText || 'N/A'}`));

      const users = await this.userRepo.find({ take: 100 });
      const participants = users.filter(u => u.role === 'participant');
      const formateursList = users.filter(u => u.role === 'formateur');
      const adminsList = users.filter(u => u.role === 'admin');
      parts.push(`Nombre de participants: ${participants.length}`);
      parts.push(`Nombre de formateurs: ${formateursList.length}`);
      parts.push(`Nombre d'administrateurs: ${adminsList.length}`);

      parts.push('--- Liste des participants ---');
      participants.forEach(p => parts.push(`- ${p.prenom || '?'} ${p.nom || '?'} (${p.email}), téléphone: ${p.telephone || 'N/A'}, actif: ${p.isActive}`));
      parts.push('--- Liste des formateurs ---');
      formateursList.forEach(f => parts.push(`- ${f.prenom || '?'} ${f.nom || '?'} (${f.email}), téléphone: ${f.telephone || 'N/A'}, actif: ${f.isActive}`));
      parts.push('--- Liste des administrateurs ---');
      adminsList.forEach(a => parts.push(`- ${a.prenom || '?'} ${a.nom || '?'} (${a.email}), téléphone: ${a.telephone || 'N/A'}`));

      const evaluations = await this.evaluationRepo.find({ relations: { formateur: true, session: { formation: true }, participant: true }, take: 100 });
      parts.push(`Nombre total d'évaluations: ${evaluations.length}`);

      const notes = evaluations.map(e => Number(e.note));
      const avgNote = notes.length > 0 ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(2) : 'N/A';
      const recommandations = evaluations.filter(e => e.recommande).length;
      parts.push(`Note moyenne globale: ${avgNote}/5`);
      parts.push(`Taux de recommandation: ${evaluations.length > 0 ? Math.round(recommandations / evaluations.length * 100) : 0}%`);

      const byFormation = new Map<string, { notes: number[]; commentaires: string[] }>();
      const byFormateur = new Map<string, { notes: number[]; commentaires: string[]; nom: string }>();

      evaluations.forEach(e => {
        const fTitre = e.session?.formation?.titre || 'Inconnue';
        if (!byFormation.has(fTitre)) byFormation.set(fTitre, { notes: [], commentaires: [] });
        byFormation.get(fTitre)!.notes.push(Number(e.note));
        if (e.commentaire) byFormation.get(fTitre)!.commentaires.push(e.commentaire);

        const fNom = `${e.formateur?.prenom || '?'} ${e.formateur?.nom || '?'}`;
        if (!byFormateur.has(fNom)) byFormateur.set(fNom, { notes: [], commentaires: [], nom: fNom });
        byFormateur.get(fNom)!.notes.push(Number(e.note));
        if (e.commentaire) byFormateur.get(fNom)!.commentaires.push(e.commentaire);
      });

      parts.push('--- Évaluations par formation ---');
      const sortedFormations = [...byFormation.entries()].sort((a, b) => {
        const avgA = a[1].notes.reduce((s, n) => s + n, 0) / a[1].notes.length;
        const avgB = b[1].notes.reduce((s, n) => s + n, 0) / b[1].notes.length;
        return avgB - avgA;
      });
      sortedFormations.forEach(([titre, data]) => {
        const avg = (data.notes.reduce((s, n) => s + n, 0) / data.notes.length).toFixed(2);
        parts.push(`- "${titre}": note moyenne ${avg}/5 (${data.notes.length} évaluations)`);
        data.commentaires.slice(0, 3).forEach(c => parts.push(`  Commentaire: "${c}"`));
      });

      parts.push('--- Évaluations par formateur ---');
      const sortedFormateurs = [...byFormateur.entries()].sort((a, b) => {
        const avgA = a[1].notes.reduce((s, n) => s + n, 0) / a[1].notes.length;
        const avgB = b[1].notes.reduce((s, n) => s + n, 0) / b[1].notes.length;
        return avgB - avgA;
      });
      sortedFormateurs.forEach(([nom, data]) => {
        const avg = (data.notes.reduce((s, n) => s + n, 0) / data.notes.length).toFixed(2);
        parts.push(`- ${nom}: note moyenne ${avg}/5 (${data.notes.length} évaluations)`);
        data.commentaires.slice(0, 3).forEach(c => parts.push(`  Commentaire: "${c}"`));
      });

      if (sortedFormations.length > 0) {
        const best = sortedFormations[0];
        const bestAvg = (best[1].notes.reduce((s, n) => s + n, 0) / best[1].notes.length).toFixed(2);
        parts.push(`Meilleure formation: "${best[0]}" (${bestAvg}/5)`);
      }
      if (sortedFormateurs.length > 0) {
        const best = sortedFormateurs[0];
        const bestAvg = (best[1].notes.reduce((s, n) => s + n, 0) / best[1].notes.length).toFixed(2);
        parts.push(`Meilleur formateur: ${best[0]} (${bestAvg}/5)`);
      }

      // --- KPI détaillés par session ---
      const sessionsWithEvals = await this.sessionRepo.find({
        relations: { formation: true, participants: true, employes: true, formateurs: true },
        take: 50,
      });
      const evalsBySession = new Map<string, Evaluation[]>();
      for (const ev of evaluations) {
        const list = evalsBySession.get(ev.session?.id) ?? [];
        list.push(ev);
        evalsBySession.set(ev.session?.id, list);
      }

      const cabinetFields = ['noteObjectifClarte', 'noteContenu', 'noteUtilite', 'noteDureeRythme', 'noteConfortSalle', 'noteEquipements', 'noteSupports'];
      const formateurFields = ['noteMaitriseSujet', 'noteClarteExplications', 'noteAnimation', 'noteCapaciteReponse'];

      parts.push('--- KPI par session ---');
      let totalTauxCabinet = 0; let totalTauxFormateur = 0; let totalTauxEval = 0; let totalTauxSatis = 0; let countKpi = 0;
      for (const s of sessionsWithEvals) {
        const sessionEvals = evalsBySession.get(s.id) ?? [];
        if (sessionEvals.length === 0) continue;
        const cabinetScores = sessionEvals.map((e: any) => {
          const vals = cabinetFields.map(f => e[f]).filter((v: any) => v != null && !isNaN(Number(v)));
          return vals.length ? vals.reduce((a: number, b: number) => a + Number(b), 0) / vals.length : null;
        }).filter((v: any) => v != null);
        const formateurScores = sessionEvals.map((e: any) => {
          const vals = formateurFields.map(f => e[f]).filter((v: any) => v != null && !isNaN(Number(v)));
          return vals.length ? vals.reduce((a: number, b: number) => a + Number(b), 0) / vals.length : null;
        }).filter((v: any) => v != null);
        const scoreCabinet = cabinetScores.length ? cabinetScores.reduce((a: number, b: number) => a + b, 0) / cabinetScores.length : 0;
        const scoreFormateur = formateurScores.length ? formateurScores.reduce((a: number, b: number) => a + b, 0) / formateurScores.length : 0;
        const scoreFormation = (scoreCabinet + scoreFormateur) / 2;
        const tauxCabinet = Math.round((scoreCabinet / 4) * 100);
        const tauxFormateur = Math.round((scoreFormateur / 4) * 100);
        const tauxEval = Math.round((scoreFormation / 4) * 100);
        const nbNotesSup4 = sessionEvals.filter((e: any) => (e.noteSatisfactionGlobale ?? e.note ?? 0) >= 4).length;
        const tauxSatis = Math.round((nbNotesSup4 / sessionEvals.length) * 100);
        const nbParticipants = (s.participants?.length || 0) + (s.employes?.length || 0);
        const maxCap = s.capaciteMax;
        const tauxParticipation = maxCap ? Math.round((nbParticipants / maxCap) * 100) : 'N/A';
        const formateurNom = s.formateurs?.[0] ? `${s.formateurs[0].prenom} ${s.formateurs[0].nom}` : '—';
        parts.push(`- Session "${s.formation?.titre || '?'}" (${new Date(s.dateDebut).toLocaleDateString('fr-FR')}): Taux Cabinet=${tauxCabinet}%, Taux Formateur=${tauxFormateur}%, Taux Évaluation=${tauxEval}%, Satisfaction=${tauxSatis}%, Participation=${tauxParticipation}${typeof tauxParticipation === 'number' ? '%' : ''}, Formateur: ${formateurNom}`);
        totalTauxCabinet += tauxCabinet;
        totalTauxFormateur += tauxFormateur;
        totalTauxEval += tauxEval;
        totalTauxSatis += tauxSatis;
        countKpi++;
      }
      if (countKpi > 0) {
        parts.push(`--- Moyennes KPI globales ---`);
        parts.push(`Taux Cabinet moyen: ${Math.round(totalTauxCabinet / countKpi)}%`);
        parts.push(`Taux Formateur moyen: ${Math.round(totalTauxFormateur / countKpi)}%`);
        parts.push(`Taux Évaluation moyen: ${Math.round(totalTauxEval / countKpi)}%`);
        parts.push(`Taux Satisfaction moyen: ${Math.round(totalTauxSatis / countKpi)}%`);
      }
      parts.push(`--- Seuils d'interprétation KPI ---`);
      parts.push(`- ≥ 70% : Performant (Cabinet: Performant, Formateur: Retenu, Formation: Réussie)`);
      parts.push(`- 40-69% : À améliorer`);
      parts.push(`- < 40% : Non retenu (Cabinet: exclusion consultations, Formateur: exclusion 3 ans, Formation: révision complète)`);
      parts.push(`--- Formules de calcul des KPI ---`);
      parts.push(`Taux Cabinet = (moyenne des 7 critères cabinet par participant / 4) × 100. Critères: Objectif & Clarté, Contenu, Utilité, Rythme, Confort salle, Équipements, Supports. Chaque critère est noté de 1 à 4. Pour chaque participant on calcule la moyenne de ses 7 notes, puis on fait la moyenne de tous les participants de la session, puis on convertit en pourcentage (×25).`);
      parts.push(`Taux Formateur = (moyenne des 4 critères formateur par participant / 4) × 100. Critères: Maîtrise du sujet, Clarté des explications, Animation, Capacité de réponse. Chaque critère est noté de 1 à 4. Même calcul que le taux cabinet.`);
      parts.push(`Taux Évaluation = (moyenne du taux Cabinet et du taux Formateur). Note globale de la session.`);
      parts.push(`Taux Satisfaction = (nombre d'évaluations avec note ≥ 4 / nombre total d'évaluations) × 100. La note prise en compte est d'abord noteSatisfactionGlobale, sinon la note générale.`);
      parts.push(`Taux de Participation = (nombre d'inscrits / capacité maximale) × 100.`);
      parts.push(`Taux de Réussite = (nombre d'évaluations avec score ≥ 60% / nombre total d'évaluations) × 100.`);
    }

    if (role === 'participant' || role === 'employe') {
      if (userId) {
        const myInscriptions = await this.inscriptionRepo.find({
          where: { userId },
          relations: { session: { formation: true } },
          take: 50,
        });
        parts.push(`Vos inscriptions: ${myInscriptions.length}`);
        myInscriptions.forEach(i => {
          parts.push(`- Inscription à "${i.session?.formation?.titre || '?'}" du ${new Date(i.session?.dateDebut).toLocaleDateString('fr-FR')}, statut paiement: ${i.statutPaiement}, montant: ${i.montant} DT`);
        });

        const allFormations = await this.formationRepo.find({ where: { isActive: true }, take: 50 });
        parts.push(`Formations disponibles au catalogue: ${allFormations.length}`);
        allFormations.forEach(f => {
          parts.push(`- "${f.titre}" (${f.dureeEnJours ?? '?'} jours, ${f.tarif ?? '?'} DT, type: ${f.type})`);
        });
      }
    }

    if (role === 'formateur' && userId) {
      const mySessions = await this.sessionRepo
        .createQueryBuilder('session')
        .leftJoinAndSelect('session.formation', 'formation')
        .leftJoin('session.formateurs', 'formateur')
        .where('formateur.id = :userId', { userId })
        .take(50)
        .getMany();

      parts.push(`Vos sessions: ${mySessions.length}`);
      mySessions.forEach(s => {
        parts.push(`- Session: "${s.formation?.titre || '?'}" du ${new Date(s.dateDebut).toLocaleDateString('fr-FR')} au ${new Date(s.dateFin).toLocaleDateString('fr-FR')}, lieu: ${s.lieu || '?'}, complétée: ${s.isCompleted}`);
      });
      const myFormations = [...new Set(mySessions.map(s => s.formation?.titre).filter(Boolean))];
      parts.push(`Vos formations associées: ${myFormations.length}`);

      const myInscriptions = await this.inscriptionRepo.find({
        where: { userId },
        relations: { session: { formation: true } },
        take: 50,
      });
      parts.push(`Vos inscriptions personnelles: ${myInscriptions.length}`);
      myInscriptions.forEach(i => {
        parts.push(`- Inscription à "${i.session?.formation?.titre || '?'}" du ${new Date(i.session?.dateDebut).toLocaleDateString('fr-FR')}, statut paiement: ${i.statutPaiement}, montant: ${i.montant} DT`);
      });
    }

    return parts.join('\n');
  }

  private async callGroq(question: string, role: string, context: string): Promise<string> {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) return "Erreur: clé API Groq non configurée.";

    const roleLabel = { admin: 'Administrateur', formateur: 'Formateur', participant: 'Participant', employe: 'Employé' }[role] || 'Utilisateur';

    const systemPrompt = `Tu es un assistant chatbot pour la plateforme steg_form (gestion de formations de la STEG - Société Tunisienne de l'Électricité et du Gaz).
L'utilisateur est un ${roleLabel}.
Tu disposes des données suivantes extraites de la base de données:

${context}

Réponds en FRANÇAIS de manière claire, concise et amicale. 
Utilise les données ci-dessus pour répondre précisément.
Si la question dépasse les données fournies, dis-le honnêtement.
Adapte ta réponse au rôle de l'utilisateur.
Utilise des émojis avec parcimonie.`;

    const maxRetries = 3;
    const baseDelay = 2000;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: question },
            ],
          }),
        });

        if (response.ok) {
          const data: any = await response.json();
          const answer = data?.choices?.[0]?.message?.content;
          return answer || "Je n'ai pas pu générer une réponse. Veuillez réessayer.";
        }

        const errBody = await response.text().catch(() => '');

        if (response.status === 429 && attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt)));
          continue;
        }

        if (response.status === 429) {
          return "Trop de requêtes pour le moment. Attendez quelques instants puis réessayez.";
        }
        return `Erreur API (${response.status}): ${errBody || 'aucun détail'}`;
      } catch (err: any) {
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt)));
          continue;
        }
        return `Erreur de connexion au service Groq: ${err.message}`;
      }
    }
    return "Impossible de contacter le service pour le moment.";
  }

  private async tryHandleAction(question: string): Promise<string | null> {
    const intent = await this.detectIntent(question);
    if (!intent || intent.type !== 'action') return null;

    try {
      switch (intent.action) {
        case 'add_formation': return await this.addFormation(intent.parameters);
        case 'add_session': return await this.addSession(intent.parameters);
        case 'add_employe': return await this.addEmploye(intent.parameters);
        case 'add_participant': return await this.addParticipant(intent.parameters);
        case 'add_formateur': return await this.addFormateur(intent.parameters);
        case 'confirm_payment': return await this.confirmPayment(intent.parameters);
        case 'refuse_payment': return await this.refusePayment(intent.parameters);
        case 'delete_formation': return await this.deleteFormation(intent.parameters);
        case 'delete_session': return await this.deleteSession(intent.parameters);
        case 'delete_employe': return await this.deleteEmploye(intent.parameters);
        case 'delete_participant': return await this.deleteParticipant(intent.parameters);
        case 'delete_formateur': return await this.deleteFormateur(intent.parameters);
        case 'deactivate_user': return await this.deactivateUser(intent.parameters);
        default: return null;
      }
    } catch (err: any) {
      return `Erreur lors de l'exécution: ${err.message}`;
    }
  }

  private async detectIntent(question: string): Promise<ActionIntent | { type: 'question' } | null> {
    const q = question.toLowerCase().trim();

    const hasRefuse = /(?:refuse?|rejette?|annule?|refuse)/i.test(q);
    const hasConfirm = /(?:confirme?|valide?|accepte?)/i.test(q);
    const hasAdd = /(?:ajoute?|cr[ée]e?|nouve(?:au|lle)|inscrire?)/i.test(q);
    const hasDelete = /(?:supprime?|efface?|retire?|enl[èe]ve?)/i.test(q);
    const hasDeactivate = /(?:d[ée]sactive?|bloque?|d[ée]sactive)/i.test(q);

    const hasFormation = /\bformation\b/i.test(q);
    const hasSession = /\bsession\b/i.test(q);
    const hasEmploye = /\bemploy[ée]\b/i.test(q);
    const hasParticipant = /\bparticipant\b/i.test(q);
    const hasFormateur = /\bformateur\b/i.test(q);

    if (hasRefuse) return this.extractParams(question, 'refuse_payment');
    if (hasConfirm) return this.extractParams(question, 'confirm_payment');

    if (hasAdd) {
      let actionType: string | null = null;
      if (hasFormation) actionType = 'add_formation';
      else if (hasSession) actionType = 'add_session';
      else if (hasEmploye) actionType = 'add_employe';
      else if (hasParticipant) actionType = 'add_participant';
      else if (hasFormateur) actionType = 'add_formateur';
      if (actionType) return this.extractParams(question, actionType);
    }

    if (hasDelete) {
      let actionType: string | null = null;
      if (hasFormation) actionType = 'delete_formation';
      else if (hasSession) actionType = 'delete_session';
      else if (hasEmploye) actionType = 'delete_employe';
      else if (hasParticipant) actionType = 'delete_participant';
      else if (hasFormateur) actionType = 'delete_formateur';
      if (actionType) return this.extractParams(question, actionType);
    }

    if (hasDeactivate) {
      if (hasEmploye || hasParticipant || hasFormateur || /\b(?:compte|utilisateur|user)\b/i.test(q))
        return this.extractParams(question, 'deactivate_user');
    }

    return this.classifyIntent(question);
  }

  private async extractParams(question: string, forcedAction: string): Promise<ActionIntent | { type: 'question' } | null> {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) return null;

    const paramHints: Record<string, string> = {
      refuse_payment: 'Extrais le nom (nom, prenom ou username) de l\'utilisateur et le titre de la formation depuis le message. Paramètres: nom (obligatoire), prenom, formationTitre (obligatoire).',
      confirm_payment: 'Extrais le nom (nom, prenom ou username) de l\'utilisateur et le titre de la formation depuis le message. Paramètres: nom (obligatoire), prenom, formationTitre (obligatoire).',
      add_formation: 'Extrais les informations de la formation: titre (obligatoire), description, objectifs, prerequis, categorie, tarif, type (intra/inter/catalogue/cycle), programme, dureeEnHeures, dureeEnJours, capaciteMax.',
      add_session: 'Extrais les informations de la session: formationTitre (obligatoire), dateDebut (obligatoire), dateFin (obligatoire), heureDebut, heureFin, lieu, salle, capaciteMax.',
      add_employe: 'Extrais les informations de l\'employé: nom (obligatoire), prenom (obligatoire), email (obligatoire), telephone, poste, departement, directionText, identifiant.',
      add_participant: 'Extrais les informations du participant: nom (obligatoire), prenom (obligatoire), email (obligatoire), telephone, poste, departement, directionText.',
      add_formateur: 'Extrais les informations du formateur: nom (obligatoire), prenom (obligatoire), email (obligatoire), telephone, specialites, qualifications.',
      delete_formation: 'Extrais le titre ou id de la formation à supprimer. Paramètres: titre ou id.',
      delete_session: 'Extrais l\'id ou formationTitre+dateDebut de la session à supprimer.',
      delete_employe: 'Extrais l\'email, id, identifiant ou nom de l\'employé à supprimer.',
      delete_participant: 'Extrais l\'email, id, identifiant ou nom du participant à supprimer.',
      delete_formateur: 'Extrais l\'email, id, identifiant ou nom du formateur à supprimer.',
      deactivate_user: 'Extrais le nom, email, identifiant ou username de l\'utilisateur à désactiver. Paramètres: nom (obligatoire).',
    };

    const tip = paramHints[forcedAction] || '';

    const systemPrompt = `Tu es un assistant qui extrait des paramètres depuis un message administrateur.
L'action détectée est: "${forcedAction}".
${tip}

Réponds UNIQUEMENT avec un objet JSON valide:
{"type":"action", "action":"${forcedAction}", "parameters": { ... }}

Extrais TOUS les paramètres fournis. Si un paramètre obligatoire manque, tente de le déduire du contexte.`;

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question },
          ],
          temperature: 0.1,
        }),
      });

      if (!response.ok) return null;

      const data: any = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) return null;

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }

  private async classifyIntent(question: string): Promise<ActionIntent | { type: 'question' } | null> {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) return null;

    const systemPrompt = `Tu es un assistant qui analyse les messages d'un administrateur pour une plateforme de gestion de formations.

Actions possibles:
- add_formation: Ajouter une formation (titre obligatoire, optionnels: description, objectifs, prerequis, categorie, tarif, type (intra/inter/catalogue/cycle), programme, dureeEnHeures, dureeEnJours, capaciteMax)
- add_session: Ajouter une session (formationId ou formationTitre, dateDebut, dateFin obligatoires, optionnels: heureDebut, heureFin, lieu, salle, capaciteMax)
- add_employe: Ajouter un employé (nom, prenom, email obligatoires, optionnels: telephone, poste, departement, directionText, identifiant)
- add_participant: Ajouter un participant (nom, prenom, email obligatoires, optionnels: telephone, poste, departement, directionText)
- add_formateur: Ajouter un formateur (nom, prenom, email obligatoires, optionnels: telephone, specialites, qualifications)
- confirm_payment: Confirmer un paiement (inscriptionId OU nom+prenom+formationTitre)
- refuse_payment: Refuser un paiement / annuler une inscription (inscriptionId OU nom+prenom+formationTitre)
- delete_formation: Supprimer une formation (titre OU id)
- delete_session: Supprimer une session (id OU formationTitre+dateDebut)
- delete_employe: Supprimer un employé (email OU id)
- delete_participant: Supprimer un participant (email OU id)
- delete_formateur: Supprimer un formateur (email OU id)

Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après.
Si question: {"type": "question"}
Si action: {"type": "action", "action": "nom_action", "parameters": {"champ": "valeur"}}`;

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question },
          ],
          temperature: 0.1,
        }),
      });

      if (!response.ok) return null;

      const data: any = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) return null;

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }

  private async addFormation(params: Record<string, any>): Promise<string> {
    if (!params.titre) throw new Error('Le titre de la formation est obligatoire.');

    const formation = this.formationRepo.create({
      titre: params.titre,
      description: params.description || null,
      objectifs: params.objectifs || null,
      prerequis: params.prerequis || null,
      categorie: params.categorie || null,
      tarif: params.tarif ? Number(params.tarif) : null,
      type: this.parseFormationType(params.type) || FormationType.CATALOGUE,
      programme: params.programme || null,
      dureeEnHeures: params.dureeEnHeures ? Number(params.dureeEnHeures) : null,
      dureeEnJours: params.dureeEnJours ? Number(params.dureeEnJours) : null,
      capaciteMax: params.capaciteMax ? Number(params.capaciteMax) : null,
    });

    const saved = await this.formationRepo.save(formation);
    return `Formation "${saved.titre}" ajoutée avec succès (ID: ${saved.id}).`;
  }

  private async addSession(params: Record<string, any>): Promise<string> {
    if (!params.dateDebut) throw new Error('La date de début est obligatoire.');
    if (!params.dateFin) throw new Error('La date de fin est obligatoire.');

    let formation: Formation | null = null;
    if (params.formationId) {
      formation = await this.formationRepo.findOneBy({ id: params.formationId });
    } else if (params.formationTitre) {
      formation = await this.formationRepo.findOneBy({ titre: params.formationTitre });
      if (!formation) {
        const similar = await this.formationRepo.find({ where: { titre: Like(`%${params.formationTitre}%`) }, take: 5 });
        if (similar.length > 0) formation = similar[0];
      }
    }
    if (!formation) throw new Error('Formation non trouvée. Vérifiez le titre ou ID.');

    const session = this.sessionRepo.create({
      formation,
      dateDebut: new Date(params.dateDebut),
      dateFin: new Date(params.dateFin),
      heureDebut: params.heureDebut || null,
      heureFin: params.heureFin || null,
      lieu: params.lieu || null,
      salle: params.salle || null,
      capaciteMax: params.capaciteMax ? Number(params.capaciteMax) : null,
    });

    const saved = await this.sessionRepo.save(session);
    return `Session ajoutée pour "${formation.titre}" du ${new Date(saved.dateDebut).toLocaleDateString('fr-FR')} au ${new Date(saved.dateFin).toLocaleDateString('fr-FR')} (ID: ${saved.id}).`;
  }

  private async addEmploye(params: Record<string, any>): Promise<string> {
    if (!params.nom) throw new Error('Le nom est obligatoire.');
    if (!params.email) throw new Error('L\'email est obligatoire.');

    const saved = await this.employeService.create({
      nom: params.nom,
      prenom: params.prenom || '-',
      email: params.email,
      telephone: params.telephone || undefined,
      poste: params.poste || undefined,
      departement: params.departement || undefined,
      directionText: params.directionText || undefined,
    });
    return `Employé ${saved.prenom} ${saved.nom} ajouté avec succès (email: ${saved.email}). Un email de bienvenue a été envoyé.`;
  }

  private async addParticipant(params: Record<string, any>): Promise<string> {
    if (!params.nom) throw new Error('Le nom est obligatoire.');
    if (!params.email) throw new Error('L\'email est obligatoire.');

    const existing = await this.userRepo.findOneBy({ email: params.email });
    if (existing) throw new Error(`Un utilisateur avec l'email ${params.email} existe déjà.`);

    const defaultPassword = 'StegForm2026!';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const user = this.userRepo.create({
      username: params.email,
      email: params.email,
      password: hashedPassword,
      role: UserRole.PARTICIPANT,
      nom: params.nom,
      prenom: params.prenom || '-',
      telephone: params.telephone || null,
      poste: params.poste || null,
      departement: params.departement || null,
      directionText: params.directionText || null,
      isActive: true,
    });

    const saved = await this.userRepo.save(user);

    await this.mailService.send({
      to: saved.email,
      subject: 'Bienvenue sur steg_form — Vos identifiants',
      html: `<p>Bonjour ${saved.prenom} ${saved.nom},</p><p>Votre compte participant a été créé sur steg_form.</p><p><b>Email :</b> ${saved.email}<br><b>Mot de passe :</b> ${defaultPassword}</p><p>Connectez-vous pour accéder à vos formations.</p>`,
    });

    return `Participant ${saved.prenom} ${saved.nom} ajouté avec succès (email: ${saved.email}). Un email a été envoyé.`;
  }

  private async addFormateur(params: Record<string, any>): Promise<string> {
    if (!params.nom) throw new Error('Le nom est obligatoire.');
    if (!params.email) throw new Error('L\'email est obligatoire.');

    const existing = await this.userRepo.findOneBy({ email: params.email });
    if (existing) throw new Error(`Un utilisateur avec l'email ${params.email} existe déjà.`);

    const defaultPassword = 'StegForm2026!';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const user = this.userRepo.create({
      username: params.email,
      email: params.email,
      password: hashedPassword,
      role: UserRole.FORMATEUR,
      nom: params.nom,
      prenom: params.prenom || '-',
      telephone: params.telephone || null,
      specialites: params.specialites || null,
      qualifications: params.qualifications || null,
      isActive: true,
    });

    const saved = await this.userRepo.save(user);

    await this.mailService.send({
      to: saved.email,
      subject: 'Bienvenue sur steg_form — Vos identifiants formateur',
      html: `<p>Bonjour ${saved.prenom} ${saved.nom},</p><p>Votre compte formateur a été créé sur steg_form.</p><p><b>Email :</b> ${saved.email}<br><b>Mot de passe :</b> ${defaultPassword}</p><p>Connectez-vous pour gérer vos sessions.</p>`,
    });

    return `Formateur ${saved.prenom} ${saved.nom} ajouté avec succès (email: ${saved.email}). Un email a été envoyé.`;
  }

  private async confirmPayment(params: Record<string, any>): Promise<string> {
    let inscription: Inscription | null = null;

    if (params.inscriptionId) {
      inscription = await this.inscriptionRepo.findOne({
        where: { id: params.inscriptionId },
        relations: { user: true, session: { formation: true } },
      });
    } else if (params.nom && params.formationTitre) {
      let user = params.prenom
        ? await this.userRepo.findOne({ where: { nom: params.nom, prenom: params.prenom } })
        : null;
      if (!user) user = await this.userRepo.findOne({ where: { username: params.nom } });
      if (!user) user = await this.userRepo.findOne({ where: { nom: params.nom } });
      if (!user) user = await this.userRepo.findOne({ where: { email: params.nom } });
      if (user) {
        const inscriptions = await this.inscriptionRepo.find({
          where: { userId: user.id },
          relations: { session: { formation: true }, user: true },
        });
        inscription = inscriptions.find(i =>
          i.session?.formation?.titre?.toLowerCase().includes(params.formationTitre.toLowerCase())
        ) || null;
      }
    }

    if (!inscription) throw new Error('Inscription non trouvée.');

    if (inscription.statutPaiement === StatutPaiement.PAYE) {
      return `Le paiement pour ${inscription.user?.prenom} ${inscription.user?.nom} → "${inscription.session?.formation?.titre}" est déjà confirmé.`;
    }

    inscription.statutPaiement = StatutPaiement.PAYE;
    inscription.datePaiement = new Date();
    await this.inscriptionRepo.save(inscription);

    return `Paiement confirmé pour ${inscription.user?.prenom} ${inscription.user?.nom} → "${inscription.session?.formation?.titre}" (${inscription.montant} DT).`;
  }

  private async refusePayment(params: Record<string, any>): Promise<string> {
    let inscription: Inscription | null = null;

    if (params.inscriptionId) {
      inscription = await this.inscriptionRepo.findOne({
        where: { id: params.inscriptionId },
        relations: { user: true, session: { formation: true } },
      });
    } else if (params.nom && params.formationTitre) {
      let user = params.prenom
        ? await this.userRepo.findOne({ where: { nom: params.nom, prenom: params.prenom } })
        : null;
      if (!user) user = await this.userRepo.findOne({ where: { username: params.nom } });
      if (!user) user = await this.userRepo.findOne({ where: { nom: params.nom } });
      if (!user) user = await this.userRepo.findOne({ where: { email: params.nom } });
      if (user) {
        const inscriptions = await this.inscriptionRepo.find({
          where: { userId: user.id },
          relations: { session: { formation: true }, user: true },
        });
        inscription = inscriptions.find(i =>
          i.session?.formation?.titre?.toLowerCase().includes(params.formationTitre.toLowerCase())
        ) || null;
      }
    }

    if (!inscription) throw new Error('Inscription non trouvée.');

    if (inscription.statutPaiement === StatutPaiement.REFUSE) {
      return `Le paiement pour ${inscription.user?.prenom} ${inscription.user?.nom} → "${inscription.session?.formation?.titre}" est déjà refusé.`;
    }

    inscription.statutPaiement = StatutPaiement.REFUSE;
    inscription.datePaiement = null;
    await this.inscriptionRepo.save(inscription);

    return `Paiement refusé pour ${inscription.user?.prenom} ${inscription.user?.nom} → "${inscription.session?.formation?.titre}". L'utilisateur verra le statut "Refusé" dans ses formations.`;
  }

  private async deleteFormation(params: Record<string, any>): Promise<string> {
    let formation: Formation | null = null;
    if (params.id) {
      formation = await this.formationRepo.findOneBy({ id: params.id });
    } else if (params.titre) {
      formation = await this.formationRepo.findOneBy({ titre: params.titre });
    }
    if (!formation) throw new Error('Formation non trouvée.');
    await this.formationRepo.remove(formation);
    return `Formation "${formation.titre}" supprimée avec succès.`;
  }

  private async deleteSession(params: Record<string, any>): Promise<string> {
    let session: Session | null = null;
    if (params.id) {
      session = await this.sessionRepo.findOne({ where: { id: params.id }, relations: { formation: true } });
    } else if (params.formationTitre && params.dateDebut) {
      const formation = await this.formationRepo.findOneBy({ titre: params.formationTitre });
      if (formation) {
        session = await this.sessionRepo.findOne({
          where: { formation: { id: formation.id }, dateDebut: new Date(params.dateDebut) as any },
          relations: { formation: true },
        });
      }
    }
    if (!session) throw new Error('Session non trouvée.');
    await this.sessionRepo.remove(session);
    return `Session du ${new Date(session.dateDebut).toLocaleDateString('fr-FR')} pour "${session.formation?.titre}" supprimée.`;
  }

  private async findEmployeByParams(params: Record<string, any>): Promise<Employe | null> {
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const lookup = params.identifiant || params.id || params.email || params.nom;
    if (!lookup) return null;
    if (uuidRe.test(lookup)) {
      const byId = await this.employeRepo.findOneBy({ id: lookup });
      if (byId) return byId;
    }
    const byIdent = await this.employeRepo.findOneBy({ identifiant: lookup });
    if (byIdent) return byIdent;
    const byEmail = await this.employeRepo.findOneBy({ email: lookup });
    if (byEmail) return byEmail;
    return this.employeRepo.findOne({ where: [{ nom: lookup }, { prenom: lookup }] });
  }

  private async findUserByParams(params: Record<string, any>, role?: UserRole): Promise<User | null> {
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const lookup = params.identifiant || params.id || params.email || params.username || params.nom;
    if (!lookup) return null;
    const whereRole = role ? { role } as any : {};
    if (uuidRe.test(lookup)) {
      const byId = await this.userRepo.findOne({ where: { id: lookup, ...whereRole } });
      if (byId) return byId;
    }
    const byIdent = await this.userRepo.findOne({ where: { identifiant: lookup, ...whereRole } });
    if (byIdent) return byIdent;
    const byEmail = await this.userRepo.findOne({ where: { email: lookup, ...whereRole } });
    if (byEmail) return byEmail;
    const byUsername = await this.userRepo.findOne({ where: { username: lookup, ...whereRole } });
    if (byUsername) return byUsername;
    return this.userRepo.findOne({ where: [{ nom: lookup, ...whereRole }, { prenom: lookup, ...whereRole }] });
  }

  private async deleteEmploye(params: Record<string, any>): Promise<string> {
    const employe = await this.findEmployeByParams(params);
    if (!employe) throw new Error('Employé non trouvé.');
    await this.employeRepo.remove(employe);
    return `Employé ${employe.prenom} ${employe.nom} supprimé avec succès.`;
  }

  private async deleteParticipant(params: Record<string, any>): Promise<string> {
    const user = await this.findUserByParams(params, UserRole.PARTICIPANT);
    if (!user) throw new Error('Participant non trouvé.');
    await this.userRepo.remove(user);
    return `Participant ${user.prenom} ${user.nom} supprimé avec succès.`;
  }

  private async deleteFormateur(params: Record<string, any>): Promise<string> {
    const user = await this.findUserByParams(params, UserRole.FORMATEUR);
    if (!user) throw new Error('Formateur non trouvé.');
    await this.userRepo.remove(user);
    return `Formateur ${user.prenom} ${user.nom} supprimé avec succès.`;
  }

  private async deactivateUser(params: Record<string, any>): Promise<string> {
    const user = await this.findUserByParams(params);
    if (!user) throw new Error('Utilisateur non trouvé.');
    if (!user.isActive) return `Le compte de ${user.prenom} ${user.nom} est déjà désactivé.`;
    user.isActive = false;
    await this.userRepo.save(user);

    await this.mailService.send({
      to: user.email,
      subject: 'Votre compte steg_form a été désactivé',
      html: `<p>Bonjour ${user.prenom} ${user.nom},</p><p>Votre compte steg_form a été désactivé par l'administration.</p><p>Pour plus d'informations, contactez le support.</p>`,
    });

    return `Compte de ${user.prenom} ${user.nom} (${user.email}) désactivé avec succès. Un email a été envoyé.`;
  }

  private async nextEmployeIdentifiant(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `${year}STG`;
    const all = await this.employeRepo.find({
      where: { identifiant: Like(`${prefix}%`) },
    });
    let max = 0;
    for (const e of all) {
      const n = parseInt(e.identifiant.replace(prefix, ''), 10);
      if (!isNaN(n) && n > max) max = n;
    }
    return `${prefix}${String(max + 1).padStart(3, '0')}`;
  }

  private parseFormationType(value: string): FormationType | null {
    if (!value) return null;
    const v = value.toLowerCase().trim();
    if (v.includes('intra')) return FormationType.INTRA;
    if (v.includes('inter')) return FormationType.INTER;
    if (v.includes('catalogue') || v.includes('catalog')) return FormationType.CATALOGUE;
    if (v.includes('cycle')) return FormationType.CYCLE;
    return null;
  }
}
