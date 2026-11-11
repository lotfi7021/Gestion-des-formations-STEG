import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Session } from '../../entities/session.entity';
import { User } from '../../entities/user.entity';
import { NotificationType } from '../../common/enums';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationService: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async remindUpcomingSessions() {
    this.logger.log('Checking upcoming sessions...');

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const sessions = await this.sessionRepository.find({
      where: { dateDebut: Between(now, in24h) },
      relations: { formation: true, participants: true, formateurs: true },
    });

    for (const session of sessions) {
      const label = `"${session.formation?.titre}" le ${session.dateDebut.toLocaleDateString('fr-FR')} à ${session.dateDebut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

      for (const participant of session.participants || []) {
        await this.notificationService.create({
          type: NotificationType.RAPPEL_SESSION,
          titre: 'Session imminente',
          message: `Votre session ${label} commence dans moins de 24h.`,
          userId: participant.id,
          lienAction: '/mes-formations',
        });
      }

      for (const formateur of session.formateurs || []) {
        await this.notificationService.create({
          type: NotificationType.RAPPEL_SESSION,
          titre: 'Session imminente',
          message: `Votre session ${label} commence dans moins de 24h.`,
          userId: formateur.id,
          lienAction: '/formateur/dashboard',
        });
      }
    }
  }
}
