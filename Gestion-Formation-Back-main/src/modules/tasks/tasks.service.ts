import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Session } from '../../entities/session.entity';
import { User } from '../../entities/user.entity';
import { NotificationType } from '../../common/enums';
import { NotificationService } from '../notification/notification.service';
import { MailService } from '../mail/mail.service';
import { emailHtml } from '../../common/email-helper';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationService: NotificationService,
    private readonly mailService: MailService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async remindUpcomingSessions() {
    this.logger.log('Checking upcoming sessions...');

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    // Fenêtre anti-doublon : si un rappel identique a déjà été créé depuis moins
    // de 23h, on ne le recrée pas (la tâche s'exécute toutes les heures).
    const dedupSince = new Date(now.getTime() - 23 * 60 * 60 * 1000);

    const sessions = await this.sessionRepository.find({
      where: { dateDebut: Between(now, in24h) },
      relations: { formation: true, participants: true, formateurs: true },
    });

    for (const session of sessions) {
      const label = `"${session.formation?.titre}" le ${session.dateDebut.toLocaleDateString('fr-FR')} à ${session.dateDebut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
      const message = `Votre session ${label} commence dans moins de 24h.`;

      for (const participant of session.participants || []) {
        await this.sendReminderOnce(participant.id, message, '/mes-formations', dedupSince);
      }

      for (const formateur of session.formateurs || []) {
        await this.sendReminderOnce(formateur.id, message, '/formateur/dashboard', dedupSince);
      }
    }
  }

  /**
   * Crée un rappel « Session imminente » une seule fois par fenêtre de déduplication.
   * Une erreur sur un destinataire n'interrompt pas les envois suivants.
   */
  private async sendReminderOnce(
    userId: string,
    message: string,
    lienAction: string,
    dedupSince: Date,
  ): Promise<void> {
    const titre = 'Session imminente';
    try {
      const alreadySent = await this.notificationService.wasRecentlySent(
        userId,
        titre,
        message,
        dedupSince,
      );
      if (alreadySent) return;

      await this.notificationService.create({
        type: NotificationType.RAPPEL_SESSION,
        titre,
        message,
        userId,
        lienAction,
      });
    } catch (error) {
      this.logger.error(
        `Échec du rappel à l'utilisateur ${userId} : ${(error as Error).message}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async emailUpcomingSessionsToParticipants() {
    this.logger.log('Sending daily email reminders to participants...');

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const sessions = await this.sessionRepository.find({
      where: { dateDebut: Between(now, in24h), isCancelled: false },
      relations: { formation: true, participants: true },
    });

    for (const session of sessions) {
      const heure =
        session.heureDebut ||
        session.dateDebut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const lieu = session.lieu || session.salle || 'lieu à confirmer';
      const label = `"${session.formation?.titre}" le ${session.dateDebut.toLocaleDateString('fr-FR')} à ${heure} (${lieu})`;

      for (const participant of session.participants || []) {
        try {
          await this.mailService.send({
            to: participant.email,
            subject: `Rappel : votre session "${session.formation?.titre}" commence bientôt`,
            html: emailHtml(
              `Bonjour ${participant.prenom} ${participant.nom}`,
              `Votre session ${label} commence dans moins de 24h. Merci de vous présenter à l'heure.`,
              '/mes-formations',
              'Voir mes formations',
            ),
          });
        } catch (error) {
          this.logger.error(
            `Échec de l'email de rappel à ${participant.email} : ${(error as Error).message}`,
          );
        }
      }
    }
  }
}
