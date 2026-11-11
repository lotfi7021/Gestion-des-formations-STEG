import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inscription } from '../../entities/inscription.entity';
import { Session } from '../../entities/session.entity';
import { User } from '../../entities/user.entity';
import { Formation } from '../../entities/formation.entity';
import { StatutPaiement, NotificationType } from '../../common/enums';
import { NotificationService } from '../notification/notification.service';

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
    private readonly notificationService: NotificationService,
  ) {}

  async create(userId: string, sessionId: string): Promise<Inscription> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || (user.role !== 'participant' && user.role !== 'employe' && user.role !== 'formateur')) {
      throw new BadRequestException('Seuls les participants, employés et formateurs peuvent s\'inscrire');
    }

    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: { participants: true, formation: true },
    });
    if (!session) throw new NotFoundException(`Session #${sessionId} not found`);

    const alreadyEnrolled = session.participants.some((p) => p.id === user.id);
    if (alreadyEnrolled) throw new ConflictException('Vous êtes déjà inscrit à cette session');

    const existingInscription = await this.inscriptionRepository.findOne({
      where: { userId, sessionId, statutPaiement: StatutPaiement.EN_ATTENTE },
    });
    if (existingInscription) {
      throw new ConflictException('Vous avez déjà une inscription en attente de paiement pour cette session');
    }

    const pendingCount = await this.inscriptionRepository.count({
      where: { sessionId, statutPaiement: StatutPaiement.EN_ATTENTE },
    });

    const maxCap = session.capaciteMax ?? session.formation.capaciteMax;
    if (maxCap && (session.participants.length + pendingCount) >= maxCap) {
      throw new BadRequestException('La session a atteint sa capacité maximale');
    }

    const formation = session.formation;
    const inscription = this.inscriptionRepository.create({
      user: { id: userId } as any,
      session: { id: sessionId } as any,
      montant: formation.tarif || 0,
      statutPaiement: StatutPaiement.EN_ATTENTE,
      methodePaiement: 'cash',
    });

    const saved = await this.inscriptionRepository.save(inscription);

    await this.notificationService.create({
      type: NotificationType.RAPPEL_SESSION,
      titre: 'Inscription soumise — Paiement en attente',
      message: `Votre inscription à "${formation.titre}" a été soumise. Veuillez effectuer le paiement en espèces (${formation.tarif || 0} €) pour que l'administration valide votre inscription.`,
      userId: user.id,
      lienAction: '/mes-formations',
    });

    const admin = await this.userRepository.findOne({ where: { role: 'admin' as any } });
    if (admin) {
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

  async confirmPayment(inscriptionId: string, adminId: string): Promise<Inscription> {
    const inscription = await this.inscriptionRepository.findOne({
      where: { id: inscriptionId },
      relations: { user: true, session: { participants: true, formation: true, formateurs: true } },
    });
    if (!inscription) throw new NotFoundException('Inscription introuvable');
    if (inscription.statutPaiement === StatutPaiement.PAYE) {
      throw new ConflictException('Cette inscription est déjà payée');
    }

    const session = inscription.session;
    const maxCap = session.capaciteMax ?? session.formation.capaciteMax;
    if (maxCap && session.participants.length >= maxCap) {
      throw new BadRequestException('La session a atteint sa capacité maximale');
    }

    session.participants.push(inscription.user);
    session.nombreParticipants = session.participants.length;
    await this.sessionRepository.save(session);

    inscription.statutPaiement = StatutPaiement.PAYE;
    inscription.datePaiement = new Date();
    const saved = await this.inscriptionRepository.save(inscription);

    const label = `"${session.formation.titre}" du ${new Date(session.dateDebut).toLocaleDateString('fr-FR')}`;

    await this.notificationService.create({
      type: NotificationType.RAPPEL_SESSION,
      titre: 'Inscription confirmée — Paiement reçu',
      message: `Votre inscription à ${label} a été confirmée. Paiement en espèces reçu.`,
      userId: inscription.userId,
      lienAction: '/mes-formations',
    });

    for (const formateur of session.formateurs || []) {
      await this.notificationService.create({
        type: NotificationType.RAPPEL_SESSION,
        titre: 'Nouvel inscrit',
        message: `${inscription.user.prenom} ${inscription.user.nom} s'est inscrit à ${label}.`,
        userId: formateur.id,
      });
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
    });

    return saved;
  }
}
