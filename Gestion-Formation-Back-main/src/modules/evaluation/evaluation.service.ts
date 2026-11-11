import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Evaluation } from '../../entities/evaluation.entity';
import { User } from '../../entities/user.entity';
import { Session } from '../../entities/session.entity';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';

@Injectable()
export class EvaluationService {
  constructor(
    @InjectRepository(Evaluation)
    private readonly evaluationRepository: Repository<Evaluation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  async create(dto: CreateEvaluationDto): Promise<Evaluation> {
    const formateur = await this.userRepository.findOneBy({ id: dto.formateurId });
    if (!formateur) throw new NotFoundException(`Formateur #${dto.formateurId} not found`);

    const session = await this.sessionRepository.findOneBy({ id: dto.sessionId });
    if (!session) throw new NotFoundException(`Session #${dto.sessionId} not found`);

    const participant = await this.userRepository.findOneBy({ id: dto.participantId });
    if (!participant) throw new NotFoundException(`Participant #${dto.participantId} not found`);

    const existing = await this.evaluationRepository.findOne({
      where: { session: { id: dto.sessionId }, participant: { id: dto.participantId } },
    });
    if (existing) throw new ConflictException('Vous avez déjà évalué cette session');

    const evaluation = this.evaluationRepository.create({
      ...dto,
      dateEvaluation: new Date(dto.dateEvaluation),
      formateur,
      session,
      participant,
    });
    return this.evaluationRepository.save(evaluation);
  }

  async findAll(formationId?: string, formateurId?: string, cabinetId?: string, sessionId?: string, participantId?: string): Promise<Evaluation[]> {
    const where: any = {};
    if (formationId) where.session = { ...where.session, formation: { id: formationId } };
    if (formateurId) where.formateur = { id: formateurId };
    if (cabinetId) where.session = { ...where.session, cabinetId };
    if (sessionId) where.session = { ...where.session, id: sessionId };
    if (participantId) where.participant = { id: participantId };
    return this.evaluationRepository.find({
      where,
      relations: { formateur: true, session: { formation: true }, participant: true },
    });
  }

  async findOne(id: string): Promise<Evaluation> {
    const evaluation = await this.evaluationRepository.findOne({
      where: { id },
      relations: { formateur: true, session: true, participant: true },
    });
    if (!evaluation) throw new NotFoundException(`Evaluation #${id} not found`);
    return evaluation;
  }

  async update(id: string, dto: UpdateEvaluationDto): Promise<Evaluation> {
    const evaluation = await this.findOne(id);
    Object.assign(evaluation, dto);
    return this.evaluationRepository.save(evaluation);
  }

  async remove(id: string): Promise<void> {
    const result = await this.evaluationRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Evaluation #${id} not found`);
  }
}
