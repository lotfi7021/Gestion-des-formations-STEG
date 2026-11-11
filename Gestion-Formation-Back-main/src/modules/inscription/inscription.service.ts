import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inscription } from '../../entities/inscription.entity';
import { Session } from '../../entities/session.entity';
import { User } from '../../entities/user.entity';
import { Formation } from '../../entities/formation.entity';
import { Presence } from '../../entities/presence.entity';
import { StatutPaiement, NotificationType, UserRole } from '../../common/enums';
import { NotificationService } from '../notification/notification.service';
import { PresenceService } from '../presence/presence.service';
import { MailService } from '../mail/mail.service';
import { emailHtml } from '../../common/email-helper';

@Injectable()
export class InscriptionService {
  constructor(
    @InjectRepository(Inscription)
    private readonly inscriptionRepository: Repository<Inscription>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Formation)
    private readonly formationRepository: Repository<Formation>,
    @InjectRepository(Presence)
    private readonly presenceRepository: Repository<Presence>,
    private readonly notificationService: NotificationService,
    private readonly presenceService: PresenceService,
    private readonly mailService: MailService,
  ) {}

  private async getEnrollableUser(userId: string, errorMessage: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || (user.role !== 'participant' && user.role !== 'formateur')) {
      throw new BadRequestException(errorMessage);
    }
    return user;
  }

  /**
   * Cœur commun de l'inscription : verrou pessimiste sur la session, contrôle de
   * capacité et détection des doublons, puis création de l'inscription en attente.
   */
  private async enrollInSession(
    user: User,
    sessionId: string,
    messages: { alreadyEnrolled: string; pendingExists: string },
  ): Promise<{ saved: Inscription; formation: Formation }> {
    return this.inscriptionRepository.manager.transaction(async (manager) => {
      const sessionRepository = manager.getRepository(Session);
      const inscriptionRepository = manager.getRepository(Inscription);

      const lockedSession = await sessionRepository
        .createQueryBuilder('session')
        .setLock('pessimistic_write')
        .where('session.id = :id', { id: sessionId })
        .getOne();
      if (!lockedSession) throw new NotFoundException(`Session #${sessionId} introuvable`);

      const session = await sessionRepository.findOne({
        where: { id: sessionId },
        relations: { participants: true, formation: true },
      });
      if (!session) throw new NotFoundException(`Session #${sessionId} introuvable`);

      const alreadyEnrolled = session.participants.some((p) => p.id === user.id);
      if (alreadyEnrolled) throw new ConflictException(messages.alreadyEnrolled);

      const existingInscription = await inscriptionRepository.findOne({
        where: { userId: user.id, sessionId, statutPaiement: StatutPaiement.EN_ATTENTE },
      });
      if (existingInscription) throw new ConflictException(messages.pendingExists);

      const pendingCount = await inscriptionRepository.count({
        where: { sessionId, statutPaiement: StatutPaiement.EN_ATTENTE },
      });

      const maxCap = session.capaciteMax ?? session.formation.capaciteMax;
      if (maxCap && (session.participants.length + pendingCount) >= maxCap) {
        throw new BadRequestException('La session a atteint sa capacité maximale');
      }

      const formationEntity = session.formation;
      const inscription = inscriptionRepository.create({
        user: { id: user.id } as any,
        session: { id: sessionId } as any,
        montant: formationEntity.tarif || 0,
        statutPaiement: StatutPaiement.EN_ATTENTE,
        methodePaiement: 'cash',
      });

      const savedInscription = await inscriptionRepository.save(inscription);
      return { saved: savedInscription, formation: formationEntity };
    });
  }

  async create(userId: string, sessionId: string): Promise<Inscription> {
    const user = await this.getEnrollableUser(
      userId,
      'Seuls les participants et formateurs peuvent s\'inscrire',
    );

    const { saved, formation } = await this.enrollInSession(user, sessionId, {
      alreadyEnrolled: 'Vous êtes déjà inscrit à cette session',
      pendingExists: 'Vous avez déjà une inscription en attente de paiement pour cette session',
    });

    await this.notificationService.create({
      type: NotificationType.RAPPEL_SESSION,
      titre: 'Inscription soumise — Paiement en attente',
      message: `Votre inscription à "${formation.titre}" a été soumise. Veuillez effectuer le paiement en espèces (${formation.tarif || 0} €) pour que l'administration valide votre inscription.`,
      userId: user.id,
      lienAction: '/mes-formations',
    });

    if (user.role === UserRole.FORMATEUR) {
      await this.notifyAdminsOfFormateurRequest(user, formation, saved);
    }

    const admin = await this.userRepository.findOne({ where: { role: 'admin' as any } });
    if (admin && user.role !== UserRole.FORMATEUR) {
      await this.notificationService.create({
        type: NotificationType.NOUVEL_INSCRIT,
        titre: 'Nouvelle inscription en attente de paiement',
        message: `${user.prenom} ${user.nom} (${user.email}) s'est inscrit à "${formation.titre}" et doit payer ${formation.tarif || 0} € en espèces.`,
        userId: admin.id,
        lienAction: '/admin/paiements',
      });
    }

    return saved;
  }

  /**
   * Inscription directe par l'admin : crée l'inscription et, si payé sur place,
   * confirme immédiatement (utilisateur ajouté à la session + présences initialisées).
   */
  async adminEnroll(userId: string, sessionId: string, adminId: string, paid: boolean): Promise<Inscription> {
    const user = await this.getEnrollableUser(
      userId,
      'Seuls les participants et formateurs peuvent être inscrits',
    );

    const { saved, formation } = await this.enrollInSession(user, sessionId, {
      alreadyEnrolled: `${user.prenom} ${user.nom} est déjà inscrit à cette session`,
      pendingExists: 'Une inscription en attente de paiement existe déjà pour cette session (validez-la dans Paiements)',
    });

    if (paid) {
      // L'admin encaisse directement : on confirme tout de suite (transaction dédiée)
      await this.confirmPayment(saved.id, adminId);
    } else {
      await this.notificationService.create({
        type: NotificationType.RAPPEL_SESSION,
        titre: 'Inscription soumise — Paiement en attente',
        message: `L'administration vous a inscrit à "${formation.titre}". Veuillez effectuer le paiement en espèces (${formation.tarif || 0} €) pour valider votre inscription.`,
        userId: user.id,
        lienAction: '/mes-formations',
      });
    }

    return saved;
  }

  /**
   * Prévient tous les administrateurs (notification + email) lorsqu'un formateur
   * demande son inscription à une session de formation.
   */
  private async notifyAdminsOfFormateurRequest(
    formateur: User,
    formation: Formation,
    inscription: Inscription,
  ): Promise<void> {
    const admins = await this.userRepository.find({
      where: { role: UserRole.ADMIN, isActive: true },
    });
    if (admins.length === 0) return;

    const session = await this.sessionRepository.findOneBy({ id: inscription.sessionId });
    const dateLabel = session
      ? ` — session du ${new Date(session.dateDebut).toLocaleDateString('fr-FR')}`
      : '';
    const contact = [formateur.identifiant, formateur.telephone].filter(Boolean).join(' / ');
    const titre = "Demande d'inscription d'un formateur";
    const message =
      `${formateur.prenom} ${formateur.nom} (${formateur.email}${contact ? ` - ${contact}` : ''}) ` +
      `souhaite s'inscrire à "${formation.titre}"${dateLabel}. ` +
      'Une validation du paiement est requise.';

    for (const admin of admins) {
      try {
        await this.notificationService.create({
          type: NotificationType.NOUVEL_INSCRIT,
          titre,
          message,
          userId: admin.id,
          lienAction: '/admin/paiements',
        });

        await this.mailService.send({
          to: admin.email,
          subject: `Demande d'inscription : ${formation.titre}`,
          html: emailHtml(
            `Bonjour ${admin.prenom} ${admin.nom}`,
            message,
            '/admin/paiements',
            'Traiter la demande',
          ),
        });
      } catch {
        // Une erreur sur un administrateur ne doit pas bloquer l'inscription.
      }
    }
  }

  async findAllPending(): Promise<Inscription[]> {
    return this.inscriptionRepository.find({
      where: { statutPaiement: StatutPaiement.EN_ATTENTE },
      relations: { user: true, session: { formation: true } },
      order: { dateInscription: 'DESC' },
    });
  }

  async findAllConfirmed(): Promise<Inscription[]> {
    return this.inscriptionRepository.find({
      where: { statutPaiement: StatutPaiement.PAYE },
      relations: { user: true, session: { formation: true } },
      order: { datePaiement: 'DESC' },
    });
  }

  async findMine(userId: string): Promise<Inscription[]> {
    return this.inscriptionRepository.find({
      where: { userId },
      relations: { session: { formation: true, formateurs: true } },
      order: { dateInscription: 'DESC' },
    });
  }

  async confirmPayment(inscriptionId: string, _adminId: string): Promise<Inscription> {
    const inscription = await this.inscriptionRepository.findOne({
      where: { id: inscriptionId },
      relations: { user: true, session: { participants: true, formation: true, formateurs: true } },
    });
    if (!inscription) throw new NotFoundException('Inscription introuvable');
    if (inscription.statutPaiement === StatutPaiement.PAYE) {
      throw new ConflictException('Cette inscription est déjà payée');
    }

    const sessionId = inscription.sessionId;

    // Session + inscription + présences doivent être écrites de façon atomique :
    // si une étape échoue, rien ne doit rester à moitié appliqué.
    const saved = await this.inscriptionRepository.manager.transaction(async (manager) => {
      const sessionRepository = manager.getRepository(Session);
      const inscriptionRepository = manager.getRepository(Inscription);

      // Verrou pessimiste sur la session (capacité atomique en cas de confirmations concurrentes).
      const lockedSession = await sessionRepository
        .createQueryBuilder('session')
        .setLock('pessimistic_write')
        .where('session.id = :id', { id: sessionId })
        .getOne();
      if (!lockedSession) throw new NotFoundException(`Session #${sessionId} introuvable`);

      const session = await sessionRepository.findOne({
        where: { id: sessionId },
        relations: { participants: true, formation: true },
      });
      if (!session) throw new NotFoundException(`Session #${sessionId} introuvable`);

      const maxCap = session.capaciteMax ?? session.formation?.capaciteMax;
      if (maxCap && session.participants.length >= maxCap) {
        throw new BadRequestException('La session a atteint sa capacité maximale');
      }

      session.participants.push(inscription.user);
      session.nombreParticipants = session.participants.length;
      await sessionRepository.save(session);

      inscription.statutPaiement = StatutPaiement.PAYE;
      inscription.datePaiement = new Date();
      const result = await inscriptionRepository.save(inscription);

      // Initialiser automatiquement les présences (une par jour de session)
      await this.presenceService.initPresencesForParticipant(session.id, inscription.userId, manager);

      return result;
    });

    const session = inscription.session;
    const label = `"${session.formation.titre}" du ${new Date(session.dateDebut).toLocaleDateString('fr-FR')}`;

    await this.notificationService.create({
      type: NotificationType.RAPPEL_SESSION,
      titre: 'Inscription confirmée — Paiement reçu',
      message: `Votre inscription à ${label} a été confirmée. Paiement en espèces reçu.`,
      userId: inscription.userId,
      lienAction: '/mes-formations',
    });

    try {
      await this.mailService.send({
        to: inscription.user.email,
        subject: `Inscription confirmée : ${session.formation.titre}`,
        html: emailHtml(
          `Bonjour ${inscription.user.prenom} ${inscription.user.nom}`,
          `Votre inscription à ${label} a été confirmée. Le paiement a bien été reçu. Vous pouvez retrouver la session dans "Mes formations".`,
          '/mes-formations',
          'Voir mes formations',
        ),
      });
    } catch {
      // Une erreur d'email ne doit pas annuler la confirmation.
    }

    for (const formateur of session.formateurs || []) {
      await this.notificationService.create({
        type: NotificationType.RAPPEL_SESSION,
        titre: 'Nouvel inscrit',
        message: `${inscription.user.prenom} ${inscription.user.nom} s'est inscrit à ${label}.`,
        userId: formateur.id,
      });
    }

    for (const formateur of session.formateurs || []) {
      try {
        await this.mailService.send({
          to: formateur.email,
          subject: `Nouvel inscrit : ${session.formation.titre}`,
          html: emailHtml(
            `Bonjour ${formateur.prenom} ${formateur.nom}`,
            `${inscription.user.prenom} ${inscription.user.nom} (${inscription.user.email}) vient d'être inscrit à ${label}. Le paiement a été confirmé par l'administration.`,
            '/formateur/dashboard',
            'Voir mes sessions',
          ),
        });
      } catch {
        // Une erreur d'email ne doit pas annuler la confirmation du paiement.
      }
    }

    return saved;
  }

  async reject(inscriptionId: string): Promise<Inscription> {
    const inscription = await this.inscriptionRepository.findOne({
      where: { id: inscriptionId },
      relations: { user: true, session: { formation: true } },
    });
    if (!inscription) throw new NotFoundException('Inscription introuvable');

    inscription.statutPaiement = StatutPaiement.REFUSE;
    inscription.datePaiement = null;
    const saved = await this.inscriptionRepository.save(inscription);

    const label = `"${inscription.session.formation.titre}"`;
    await this.notificationService.create({
      type: NotificationType.RAPPEL_SESSION,
      titre: 'Inscription refusée',
      message: `Votre inscription à ${label} a été refusée.`,
      userId: inscription.userId,
      lienAction: '/mes-formations',
    });

    try {
      await this.mailService.send({
        to: inscription.user.email,
        subject: `Inscription refusée : ${inscription.session.formation.titre}`,
        html: emailHtml(
          `Bonjour ${inscription.user.prenom} ${inscription.user.nom}`,
          `Votre inscription à ${label} a été refusée par l'administration. Pour plus d'informations, contactez le service formation.`,
          '/mes-formations',
          'Voir mes formations',
        ),
      });
    } catch {
      // Une erreur d'email ne doit pas annuler le refus.
    }

    return saved;
  }
}
