import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, FindOptionsWhere } from 'typeorm';
import PDFDocument from 'pdfkit';
import { Session } from '../../entities/session.entity';
import { Formation } from '../../entities/formation.entity';
import { User } from '../../entities/user.entity';
import { Employe } from '../../entities/employe.entity';
import { UserRole, NotificationType } from '../../common/enums';
import { NotificationService } from '../notification/notification.service';
import { MailService } from '../mail/mail.service';
import { InscriptionService } from '../inscription/inscription.service';
import { emailHtml } from '../../common/email-helper';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Formation)
    private readonly formationRepository: Repository<Formation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Employe)
    private readonly employeRepository: Repository<Employe>,
    private readonly notificationService: NotificationService,
    private readonly mailService: MailService,
    private readonly inscriptionService: InscriptionService,
  ) {}

  async create(dto: CreateSessionDto & { cabinetId?: string }): Promise<Session> {
    const formation = await this.formationRepository.findOneBy({ id: dto.formationId });
    if (!formation) throw new NotFoundException(`Formation #${dto.formationId} not found`);

    let cabinet: User | undefined;
    if (dto.cabinetId) {
      cabinet = await this.userRepository.findOneBy({ id: dto.cabinetId });
    }

    const session = this.sessionRepository.create({
      ...dto,
      dateDebut: new Date(dto.dateDebut),
      dateFin: new Date(dto.dateFin),
      formation,
      cabinet: cabinet || undefined,
      participants: [],
      employes: [],
      formateurs: [],
    });

    if (dto.participantIds?.length) {
      session.participants = await this.userRepository.find({ where: { id: In(dto.participantIds), role: UserRole.PARTICIPANT } });
    }
    if (dto.employeIds?.length) {
      session.employes = await this.employeRepository.find({ where: { id: In(dto.employeIds) } });
    }
    if (dto.formateurIds?.length) {
      session.formateurs = await this.userRepository.find({ where: { id: In(dto.formateurIds), role: UserRole.FORMATEUR } });
    }

    const saved = await this.sessionRepository.save(session);

    const label = `"${formation.titre}" du ${new Date(dto.dateDebut).toLocaleDateString('fr-FR')} au ${new Date(dto.dateFin).toLocaleDateString('fr-FR')}`;

    const allUsers = await this.userRepository.find({
      where: [{ role: UserRole.PARTICIPANT }, { role: UserRole.FORMATEUR }, { role: UserRole.EMPLOYE }, { role: UserRole.ADMIN }],
    });

    await Promise.all(
      allUsers.map((u) => {
        const isParticipant = u.role === UserRole.PARTICIPANT;
        const isFormateur = u.role === UserRole.FORMATEUR;

        return this.notificationService
          .create({
            type: NotificationType.SESSION_PROCHAINE,
            titre: isFormateur
              ? `Session à animer : ${formation.titre}`
              : `Nouvelle session : ${formation.titre}`,
            message: isParticipant
              ? `Une nouvelle session ${label} est disponible. Inscrivez-vous dès maintenant !`
              : `Une nouvelle session ${label} a été créée.`,
            userId: u.id,
            lienAction: isParticipant ? '/catalogue' : isFormateur ? '/formateur/dashboard' : '/catalogue',
          })
          .then(() =>
            this.mailService.send({
              to: u.email,
              subject: isFormateur
                ? `Session à animer : ${formation.titre}`
                : `Nouvelle session : ${formation.titre}`,
              html: emailHtml(
                `Bonjour ${u.prenom} ${u.nom}`,
                isParticipant
                  ? `Une nouvelle session ${label} est disponible. Inscrivez-vous dès maintenant !`
                  : isFormateur
                    ? `Vous avez été assigné à la session ${label}.`
                    : `Une nouvelle session ${label} a été créée.`,
                isParticipant ? '/catalogue' : isFormateur ? '/formateur/dashboard' : '/catalogue',
                'Voir les détails',
              ),
            }),
          );
      }),
    );

    return saved;
  }

  async findAll(cabinetId?: string, all?: boolean): Promise<Session[]> {
    const where: FindOptionsWhere<Session> = {};
    if (all) {
      // return all sessions (admin KPI use case)
    } else if (cabinetId) {
      where.cabinetId = cabinetId as any;
    } else {
      where.cabinetId = IsNull();
    }
    return this.sessionRepository.find({
      where,
      relations: { formation: true, participants: true, employes: true, formateurs: true, cabinet: true },
    });
  }

  async findOne(id: string): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      where: { id },
      relations: { formation: true, participants: true, employes: true, formateurs: true, presences: true, evaluations: true, cabinet: true },
    });
    if (!session) throw new NotFoundException(`Session #${id} not found`);
    return session;
  }

  async update(id: string, dto: UpdateSessionDto): Promise<Session> {
    const session = await this.findOne(id);

    if (dto.formationId) {
      session.formation = await this.formationRepository.findOneBy({ id: dto.formationId });
    }
    if (dto.participantIds) {
      session.participants = await this.userRepository.find({ where: { id: In(dto.participantIds) } });
    }
    if (dto.employeIds) {
      session.employes = await this.employeRepository.find({ where: { id: In(dto.employeIds) } });
    }
    if (dto.formateurIds) {
      session.formateurs = await this.userRepository.find({ where: { id: In(dto.formateurIds) } });
    }

    Object.assign(session, dto);
    return this.sessionRepository.save(session);
  }

  async enroll(sessionId: string, userId: string): Promise<{ message: string; inscription: any }> {
    const inscription = await this.inscriptionService.create(userId, sessionId);
    return {
      message: 'Inscription soumise. Veuillez effectuer le paiement en espèces pour que l\'administration valide votre inscription.',
      inscription,
    };
  }

  async findMySessions(userId: string, role: string, type?: string): Promise<Session[]> {
    if (role === UserRole.FORMATEUR) {
      if (type === 'enrolled') {
        return this.sessionRepository.find({
          where: { participants: { id: userId } },
          relations: { formation: true, participants: true, formateurs: true },
        });
      }
      return this.sessionRepository.find({
        where: { formateurs: { id: userId } },
        relations: { formation: true, participants: true },
      });
    }

    const sessions = await this.sessionRepository.find({
      where: { participants: { id: userId } },
      relations: { formation: true, formateurs: true, employes: true },
    });

    if (role === UserRole.EMPLOYE) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user) {
        const employe = await this.employeRepository.findOne({ where: { email: user.email } });
        if (employe) {
          const employeSessions = await this.sessionRepository.find({
            where: { employes: { id: employe.id } },
            relations: { formation: true, formateurs: true, employes: true },
          });
          for (const s of employeSessions) {
            if (!sessions.find((x) => x.id === s.id)) sessions.push(s);
          }
        }
      }
    }

    return sessions;
  }

  async generatePresenceList(id: string): Promise<{ buffer: Buffer; titre: string }> {
    const session = await this.sessionRepository.findOne({
      where: { id },
      relations: { formation: true, participants: true, employes: true, formateurs: true },
    });
    if (!session) throw new NotFoundException(`Session #${id} not found`);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => {});

    const formatDate = (d: Date) =>
      d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const formatTime = (d: Date) =>
      d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const titre = session.formation?.titre || 'Formation';
    const dateStr = `${formatDate(new Date(session.dateDebut))} — ${formatDate(new Date(session.dateFin))}`;
    const heureStr = `${formatTime(new Date(session.dateDebut))} — ${formatTime(new Date(session.dateFin))}`;

    doc.fontSize(18).font('Helvetica-Bold').text('Feuille de présence', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text(titre, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#666').text(`${dateStr} | ${heureStr}`, { align: 'center' });
    if (session.lieu) doc.text(`Lieu : ${session.lieu}`, { align: 'center' });
    doc.fillColor('#000');
    doc.moveDown(1);

    const formateurs = session.formateurs || [];
    if (formateurs.length > 0) {
      doc.fontSize(10).font('Helvetica-Bold').text(`Formateur(s) : ${formateurs.map((f) => `${f.prenom} ${f.nom}`).join(', ')}`);
      doc.moveDown(0.5);
    }

    const allParticipants: { nom: string; prenom: string; identifiant?: string }[] = [
      ...(session.participants || []).map((p) => ({ nom: p.nom, prenom: p.prenom })),
      ...(session.employes || []).map((e) => ({ nom: e.nom, prenom: e.prenom, identifiant: e.identifiant })),
    ];

    if (allParticipants.length === 0) {
      doc.fontSize(11).fillColor('#999').text('Aucun participant inscrit.');
      doc.fillColor('#000');
    } else {
      const tableTop = doc.y;
      const colX = [40, 120, 200, 300, 380];
      const colW = [70, 70, 90, 70, 100];
      const headers = ['N°', 'Nom', 'Prénom', 'Identifiant', 'Signature'];

      doc.fontSize(9).font('Helvetica-Bold');
      headers.forEach((h, i) => doc.text(h, colX[i], tableTop, { width: colW[i], align: 'left' }));

      doc.moveDown(0.3);
      let rowY = doc.y;

      doc.fontSize(9).font('Helvetica');
      allParticipants.forEach((p, idx) => {
        const cells = [String(idx + 1), p.nom, p.prenom, p.identifiant || '—', ''];
        const lineY = rowY;

        cells.forEach((c, i) => {
          doc.text(c, colX[i], lineY, { width: colW[i], align: 'left' });
        });

        doc.moveTo(40, lineY + 14).lineTo(540, lineY + 14).strokeColor('#ddd').stroke();
        doc.strokeColor('#000');
        rowY += 20;

        if (rowY > 750) {
          doc.addPage();
          rowY = 40;
        }
      });

      doc.y = rowY + 10;
    }

    doc.moveDown(1);
    doc.fontSize(9).fillColor('#666').text(
      `Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      { align: 'right' },
    );

    doc.end();
    return new Promise((resolve) => {
      doc.on('end', () => resolve({ buffer: Buffer.concat(buffers), titre }));
    });
  }

  async cloneForPlatform(id: string): Promise<Session> {
    const original = await this.findOne(id);
    const platformFormation = await this.formationRepository.findOne({
      where: { clonedFromId: original.formation.id },
    });
    const clone = this.sessionRepository.create({
      dateDebut: original.dateDebut,
      dateFin: original.dateFin,
      heureDebut: original.heureDebut,
      heureFin: original.heureFin,
      lieu: original.lieu,
      salle: original.salle,
      nombreParticipants: 0,
      capaciteMax: original.capaciteMax,
      formation: platformFormation || original.formation,
      clonedFromId: id,
      clonedFromCabinetId: original.cabinetId,
      clonedFromCabinetName: original.cabinet?.nom ?? null,
    });
    return this.sessionRepository.save(clone);
  }

  async remove(id: string): Promise<void> {
    const em = this.sessionRepository.manager;
    await em.transaction(async (tx) => {
      const session = await tx.findOne(Session, {
        where: { id },
        relations: { presences: true, certificats: true, evaluations: true, documents: true },
      });
      if (!session) throw new NotFoundException(`Session #${id} not found`);

      // Delete join table records first
      await tx.query(`DELETE FROM session_participants WHERE session_id = ?`, [id]);
      await tx.query(`DELETE FROM session_employes WHERE session_id = ?`, [id]);
      await tx.query(`DELETE FROM session_formateurs WHERE session_id = ?`, [id]);

      // Delete child entities
      await tx.query(`DELETE FROM documents_signes WHERE \`sessionId\` = ?`, [id]);
      await tx.query(`DELETE FROM inscriptions WHERE \`sessionId\` = ?`, [id]);
      await tx.query(`DELETE FROM presences WHERE \`sessionId\` = ?`, [id]);
      await tx.query(`DELETE FROM certificates WHERE \`sessionId\` = ?`, [id]);
      await tx.query(`DELETE FROM evaluations WHERE \`sessionId\` = ?`, [id]);
      await tx.query(`DELETE FROM session_documents WHERE \`sessionId\` = ?`, [id]);

      // Finally delete the session
      await tx.delete(Session, id);
    });
  }
}
