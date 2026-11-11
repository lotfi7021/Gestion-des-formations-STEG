import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Presence } from '../../entities/presence.entity';
import { User } from '../../entities/user.entity';
import { Session } from '../../entities/session.entity';
import { CreatePresenceDto } from './dto/create-presence.dto';
import { UpdatePresenceDto } from './dto/update-presence.dto';
import { PresenceStatus } from '../../common/enums';

@Injectable()
export class PresenceService {
  constructor(
    @InjectRepository(Presence)
    private readonly presenceRepository: Repository<Presence>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  /**
   * Initialise automatiquement une ligne de présence (ABSENT par défaut)
   * pour chaque jour de la session, pour un participant donné.
   * Évite les doublons si les présences existent déjà.
   */
  async initPresencesForParticipant(sessionId: string, userId: string): Promise<Presence[]> {
    const session = await this.sessionRepository.findOneBy({ id: sessionId });
    if (!session) throw new NotFoundException(`Session #${sessionId} introuvable`);

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException(`Utilisateur #${userId} introuvable`);

    // Générer la liste de toutes les dates de la session (1 par jour)
    const dates = this.getSessionDates(new Date(session.dateDebut), new Date(session.dateFin));

    const created: Presence[] = [];
    for (const date of dates) {
      // Vérifier si une présence existe déjà pour ce jour/participant
      const existing = await this.presenceRepository.findOne({
        where: {
          session: { id: sessionId },
          user: { id: userId },
          datePresence: date,
        },
      });
      if (existing) continue;

      const presence = this.presenceRepository.create({
        datePresence: date,
        statutFormation: PresenceStatus.ABSENT,
        statutCantine: PresenceStatus.ABSENT,
        user,
        session,
      });
      created.push(await this.presenceRepository.save(presence));
    }
    return created;
  }

  /**
   * Retourne les présences d'une session avec calcul du taux.
   */
  async findBySession(sessionId: string): Promise<{ presences: Presence[]; tauxPresence: number }> {
    const presences = await this.presenceRepository.find({
      where: { session: { id: sessionId } },
      relations: { user: true },
      order: { datePresence: 'ASC' },
    });

    const total = presences.length;
    const presents = presences.filter((p) => p.statutFormation === PresenceStatus.PRESENT).length;
    const tauxPresence = total > 0 ? Math.round((presents / total) * 100) : 0;

    return { presences, tauxPresence };
  }

  async create(dto: CreatePresenceDto): Promise<Presence> {
    const user = await this.userRepository.findOneBy({ id: dto.employeId });
    if (!user) throw new NotFoundException(`Utilisateur #${dto.employeId} introuvable`);

    const session = await this.sessionRepository.findOneBy({ id: dto.sessionId });
    if (!session) throw new NotFoundException(`Session #${dto.sessionId} introuvable`);

    // Vérifier doublon (même user, même session, même date)
    const existing = await this.presenceRepository.findOne({
      where: {
        session: { id: dto.sessionId },
        user: { id: dto.employeId },
        datePresence: new Date(dto.datePresence),
      },
    });
    if (existing) {
      throw new ConflictException(
        `Une présence existe déjà pour cet utilisateur à cette date dans cette session`,
      );
    }

    const presence = this.presenceRepository.create({
      ...dto,
      datePresence: new Date(dto.datePresence),
      user,
      session,
    });
    return this.presenceRepository.save(presence);
  }

  async findAll(): Promise<Presence[]> {
    return this.presenceRepository.find({ relations: { user: true, session: true } });
  }

  async findOne(id: string): Promise<Presence> {
    const presence = await this.presenceRepository.findOne({
      where: { id },
      relations: { user: true, session: true },
    });
    if (!presence) throw new NotFoundException(`Présence #${id} introuvable`);
    return presence;
  }

  async update(id: string, dto: UpdatePresenceDto): Promise<Presence> {
    const presence = await this.findOne(id);
    if (dto.employeId) {
      const user = await this.userRepository.findOneBy({ id: dto.employeId });
      if (!user) throw new NotFoundException(`Utilisateur #${dto.employeId} introuvable`);
      presence.user = user;
    }
    if (dto.sessionId) {
      const session = await this.sessionRepository.findOneBy({ id: dto.sessionId });
      if (!session) throw new NotFoundException(`Session #${dto.sessionId} introuvable`);
      presence.session = session;
    }
    Object.assign(presence, dto);
    return this.presenceRepository.save(presence);
  }

  async remove(id: string): Promise<void> {
    const result = await this.presenceRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Présence #${id} introuvable`);
  }

  // ─── Helper : génère toutes les dates entre début et fin (incluses) ────────
  private getSessionDates(dateDebut: Date, dateFin: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(dateDebut);
    current.setHours(0, 0, 0, 0);
    const end = new Date(dateFin);
    end.setHours(0, 0, 0, 0);

    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }
}
