import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Presence } from '../../entities/presence.entity';
import { User } from '../../entities/user.entity';
import { Session } from '../../entities/session.entity';
import { CreatePresenceDto } from './dto/create-presence.dto';
import { UpdatePresenceDto } from './dto/update-presence.dto';

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

  async create(dto: CreatePresenceDto): Promise<Presence> {
    const user = await this.userRepository.findOneBy({ id: dto.employeId });
    if (!user) throw new NotFoundException(`User #${dto.employeId} not found`);

    const session = await this.sessionRepository.findOneBy({ id: dto.sessionId });
    if (!session) throw new NotFoundException(`Session #${dto.sessionId} not found`);

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
    if (!presence) throw new NotFoundException(`Presence #${id} not found`);
    return presence;
  }

  async update(id: string, dto: UpdatePresenceDto): Promise<Presence> {
    const presence = await this.findOne(id);
    if (dto.employeId) {
      presence.user = await this.userRepository.findOneBy({ id: dto.employeId });
    }
    if (dto.sessionId) {
      presence.session = await this.sessionRepository.findOneBy({ id: dto.sessionId });
    }
    Object.assign(presence, dto);
    return this.presenceRepository.save(presence);
  }

  async remove(id: string): Promise<void> {
    const result = await this.presenceRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Presence #${id} not found`);
  }
}
