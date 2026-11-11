import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { join } from 'path';
import * as fs from 'fs';
import { SessionDocument } from '../../entities/session-document.entity';
import { Session } from '../../entities/session.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class SessionDocumentService {
  constructor(
    @InjectRepository(SessionDocument)
    private readonly docRepository: Repository<SessionDocument>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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

    if (!isFormateur && !isParticipant) {
      throw new ForbiddenException('Vous devez être inscrit à cette session pour voir les documents');
    }

    return this.docRepository.find({
      where: { sessionId },
      relations: { uploadedBy: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Supprime un document de session.
   * Autorisé uniquement aux formateurs de la session (même règle que l'upload).
   * Supprime aussi le fichier physique du disque.
   */
  async remove(docId: string, userId: string): Promise<void> {
    const doc = await this.docRepository.findOne({
      where: { id: docId },
      relations: { session: { formateurs: true } },
    });
    if (!doc) throw new NotFoundException('Document introuvable');

    const isFormateur = doc.session.formateurs.some((f) => f.id === userId);
 if (!isFormateur) {
      throw new ForbiddenException(
        'Seuls les formateurs de cette session peuvent supprimer des documents',
      );
    }

    await this.docRepository.remove(doc);

    // Best effort : ne bloque pas la réponse si le fichier est déjà absent
    const filePath = join(__dirname, '..', '..', '..', 'uploads', 'session-docs', doc.filename);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (err: any) {
      // Log silencieux : la ligne DB est déjà supprimée
    }
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
