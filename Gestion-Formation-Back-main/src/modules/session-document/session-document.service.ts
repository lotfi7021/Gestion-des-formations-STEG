import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionDocument } from '../../entities/session-document.entity';
import { Session } from '../../entities/session.entity';
import { User } from '../../entities/user.entity';
import { Employe } from '../../entities/employe.entity';

@Injectable()
export class SessionDocumentService {
  constructor(
    @InjectRepository(SessionDocument)
    private readonly docRepository: Repository<SessionDocument>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Employe)
    private readonly employeRepository: Repository<Employe>,
  ) {}

  async upload(
    sessionId: string,
    userId: string,
    file: Express.Multer.File,
  ): Promise<SessionDocument> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: { formateurs: true },
    });
    if (!session) throw new NotFoundException('Session introuvable');

    const isFormateur = session.formateurs.some((f) => f.id === userId);
    if (!isFormateur) throw new ForbiddenException('Seuls les formateurs de cette session peuvent ajouter des documents');

    const doc = this.docRepository.create({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      session: { id: sessionId } as any,
      sessionId,
      uploadedBy: { id: userId } as any,
      uploadedById: userId,
    });

    return this.docRepository.save(doc);
  }

  async findAll(sessionId: string, userId: string): Promise<SessionDocument[]> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: { participants: true, formateurs: true },
    });
    if (!session) throw new NotFoundException('Session introuvable');

    const isFormateur = session.formateurs.some((f) => f.id === userId);
    const isParticipant = session.participants.some((p) => p.id === userId);
    const isEmploye = await this.employeRepository.findOne({
      where: { id: userId },
    });

    if (!isFormateur && !isParticipant && !isEmploye) {
      throw new ForbiddenException('Vous devez être inscrit à cette session pour voir les documents');
    }

    return this.docRepository.find({
      where: { sessionId },
      relations: { uploadedBy: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(docId: string, userId: string): Promise<SessionDocument> {
    const doc = await this.docRepository.findOne({
      where: { id: docId },
      relations: { session: { participants: true, formateurs: true }, uploadedBy: true },
    });
    if (!doc) throw new NotFoundException('Document introuvable');

    const session = doc.session;
    const isFormateur = session.formateurs.some((f) => f.id === userId);
    const isParticipant = session.participants.some((p) => p.id === userId);

    if (!isFormateur && !isParticipant) {
      throw new ForbiddenException('Accès refusé');
    }

    return doc;
  }
}
