import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as QRCode from 'qrcode';
import { Session } from '../../entities/session.entity';
import { Presence } from '../../entities/presence.entity';
import { User } from '../../entities/user.entity';
import { NotificationType, PresenceStatus, UserRole } from '../../common/enums';
import { NotificationService } from '../notification/notification.service';
import { MailService } from '../mail/mail.service';
import { emailHtml } from '../../common/email-helper';
import { buildIcs } from '../../common/ics-helper';

export interface CheckInSessionInfo {
  id: string;
  titre: string;
  dateDebut: Date;
  dateFin: Date;
  heureDebut?: string;
  heureFin?: string;
  lieu?: string;
  salle?: string;
}

@Injectable()
export class CheckinService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Presence)
    private readonly presenceRepository: Repository<Presence>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationService: NotificationService,
    private readonly mailService: MailService,
  ) {}

  /** Génère (ou réutilise) le jeton de pointage et le QR code associé. */
  async getAdminInfo(sessionId: string): Promise<{
    token: string;
    url: string;
    qrCodeDataUrl: string;
    session: CheckInSessionInfo;
  }> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: { formation: true, participants: true },
    });
    if (!session) throw new NotFoundException(`Session #${sessionId} introuvable`);

    if (!session.checkInToken) {
      session.checkInToken = uuidv4();
      await this.sessionRepository.save(session);
    }

    const url = this.buildCheckInUrl(session.checkInToken);
    const qrCodeDataUrl = await QRCode.toDataURL(url, { width: 360, margin: 1 });

    return {
      token: session.checkInToken,
      url,
      qrCodeDataUrl,
      session: this.toSessionInfo(session),
    };
  }

  /** Aperçu de la session avant confirmation du pointage. */
  async getInfo(token: string, userId: string) {
    const session = await this.loadByToken(token);
    await this.assertParticipant(session, userId);

    const presence = await this.findTodayPresence(session.id, userId);
    return {
      session: this.toSessionInfo(session),
      alreadyCheckedIn: presence?.statutFormation === PresenceStatus.PRESENT,
      heureArrivee: presence?.heureArrivee ?? null,
    };
  }

  /** Enregistre la présence du participant pour la journée en cours. */
  async checkIn(token: string, userId: string) {
    const session = await this.loadByToken(token);
    const participant = await this.assertParticipant(session, userId);

    if (session.isCancelled) {
      throw new BadRequestException('Cette session a été annulée.');
    }
    if (session.isCompleted) {
      throw new BadRequestException('Cette session est déjà terminée.');
    }

    const today = this.today();
    if (today < this.dayStart(session.dateDebut) || today > this.dayStart(session.dateFin)) {
      throw new BadRequestException(
        "Le pointage n'est ouvert que pendant les dates de la session.",
      );
    }

    const now = new Date();
    const heureArrivee = now.toTimeString().slice(0, 5);
    let presence = await this.findTodayPresence(session.id, userId);

    if (presence?.statutFormation === PresenceStatus.PRESENT) {
      return {
        alreadyCheckedIn: true,
        heureArrivee: presence.heureArrivee,
        session: this.toSessionInfo(session),
      };
    }

    if (presence) {
      presence.statutFormation = PresenceStatus.PRESENT;
      presence.heureArrivee = presence.heureArrivee || heureArrivee;
      presence = await this.presenceRepository.save(presence);
    } else {
      presence = await this.presenceRepository.save(
        this.presenceRepository.create({
          datePresence: today,
          statutFormation: PresenceStatus.PRESENT,
          statutCantine: PresenceStatus.ABSENT,
          heureArrivee,
          user: participant,
          session,
        }),
      );
    }

    await this.notifyCheckIn(session, participant);

    return {
      alreadyCheckedIn: false,
      heureArrivee: presence.heureArrivee,
      session: this.toSessionInfo(session),
    };
  }

  /** Envoie la convocation (.ics) à tous les participants de la session. */
  async sendConvocations(sessionId: string): Promise<{ sent: number; failed: number }> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: { formation: true, participants: true, formateurs: true },
    });
    if (!session) throw new NotFoundException(`Session #${sessionId} introuvable`);
    if (session.isCancelled) throw new BadRequestException('Session annulée.');

    const token = session.checkInToken || uuidv4();
    if (!session.checkInToken) {
      session.checkInToken = token;
      await this.sessionRepository.save(session);
    }

    const checkInUrl = this.buildCheckInUrl(token);
    const { start, end } = this.eventDates(session);
    const location = [session.lieu, session.salle].filter(Boolean).join(' - ') || 'Lieu à confirmer';
    const titre = session.formation?.titre || 'Formation';
    const formateur = (session.formateurs || [])
      .map((f) => `${f.prenom} ${f.nom}`)
      .join(', ');

    let sent = 0;
    let failed = 0;

    for (const participant of session.participants || []) {
      const ics = buildIcs({
        uid: `session-${session.id}-${participant.id}@steg-form`,
        title: `Convocation : ${titre}`,
        description: [
          `Vous êtes convoqué(e) à la formation "${titre}".`,
          formateur ? `Formateur : ${formateur}` : '',
          `Pointage : ${checkInUrl}`,
        ]
          .filter(Boolean)
          .join('\n'),
        location,
        start,
        end,
        organizerEmail: process.env.MAIL_FROM,
      });

      try {
        await this.mailService.send({
          to: participant.email,
          subject: `Convocation : ${titre}`,
          html: emailHtml(
            `Bonjour ${participant.prenom} ${participant.nom}`,
            `Vous êtes convoqué(e) à la formation "${titre}" le ${start.toLocaleDateString('fr-FR')} à ${session.heureDebut || start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} (${location}). Scannez le QR code affiché sur place ou utilisez le bouton ci-dessous pour pointer votre présence.`,
            `/check-in/${token}`,
            'Pointer ma présence',
          ),
          attachments: [
            {
              filename: `convocation-${titre.replace(/[^a-zA-Z0-9]/g, '_')}.ics`,
              content: ics,
              contentType: 'text/calendar; charset=utf-8; method=REQUEST',
            },
          ],
        });
        sent += 1;
      } catch {
        failed += 1;
      }
    }

    return { sent, failed };
  }

  private async loadByToken(token: string): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      where: { checkInToken: token },
      relations: { formation: true, participants: true, formateurs: true },
    });
    if (!session) throw new NotFoundException('Lien de pointage invalide.');
    return session;
  }

  private async assertParticipant(session: Session, userId: string): Promise<User> {
    const participant = await this.userRepository.findOneBy({ id: userId });
    if (!participant) throw new NotFoundException(`Utilisateur #${userId} introuvable`);
    if (participant.role !== UserRole.PARTICIPANT) {
      throw new ForbiddenException('Seuls les participants peuvent pointer.');
    }
    const enrolled = (session.participants || []).some((p) => p.id === userId);
    if (!enrolled) {
      throw new ForbiddenException("Vous n'êtes pas inscrit à cette session.");
    }
    return participant;
  }

  private async findTodayPresence(sessionId: string, userId: string): Promise<Presence | null> {
    return this.presenceRepository.findOne({
      where: {
        session: { id: sessionId },
        user: { id: userId },
        datePresence: this.today(),
      },
    });
  }

  private async notifyCheckIn(session: Session, participant: User): Promise<void> {
    const destinataires = [
      ...(session.formateurs || []),
      ...(await this.userRepository.find({ where: { role: UserRole.ADMIN } })),
    ].filter((u) => u.id !== participant.id);

    const message = `${participant.prenom} ${participant.nom} a pointé présent pour "${session.formation?.titre}".`;

    for (const user of destinataires) {
      try {
        await this.notificationService.create({
          type: NotificationType.POINTAGE,
          titre: 'Pointage participant',
          message,
          userId: user.id,
          lienAction: user.role === UserRole.ADMIN ? '/admin/sessions' : '/formateur/dashboard',
        });
      } catch {
        // Une erreur de notification ne doit pas faire échouer le pointage.
      }
    }
  }

  private toSessionInfo(session: Session): CheckInSessionInfo {
    return {
      id: session.id,
      titre: session.formation?.titre || 'Formation',
      dateDebut: session.dateDebut,
      dateFin: session.dateFin,
      heureDebut: session.heureDebut,
      heureFin: session.heureFin,
      lieu: session.lieu,
      salle: session.salle,
    };
  }

  private buildCheckInUrl(token: string): string {
    const frontUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    return `${frontUrl.replace(/\/$/, '')}/check-in/${token}`;
  }

  private today(): Date {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private dayStart(value: Date): Date {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private eventDates(session: Session): { start: Date; end: Date } {
    const start = this.combine(session.dateDebut, session.heureDebut);
    let end = this.combine(session.dateFin, session.heureFin);
    if (end <= start) end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    return { start, end };
  }

  private combine(date: Date, time?: string): Date {
    const result = new Date(date);
    if (time && /^\d{2}:\d{2}/.test(time)) {
      const [hours, minutes] = time.split(':').map(Number);
      result.setHours(hours, minutes, 0, 0);
    }
    return result;
  }
}
