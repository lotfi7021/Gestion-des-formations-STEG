import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { join } from 'path';
import * as fs from 'fs';
import PDFDocument from 'pdfkit';
import { Signature } from '../../entities/signature.entity';
import { DocumentSigne, DocumentType } from '../../entities/document-signe.entity';
import { User } from '../../entities/user.entity';
import { Session } from '../../entities/session.entity';
import { Formation } from '../../entities/formation.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../common/enums';
import { SaveSignatureDto } from './dto/save-signature.dto';

@Injectable()
export class SignatureService {
  constructor(
    @InjectRepository(Signature)
    private readonly signatureRepository: Repository<Signature>,
    @InjectRepository(DocumentSigne)
    private readonly documentSigneRepository: Repository<DocumentSigne>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Formation)
    private readonly formationRepository: Repository<Formation>,
    private readonly notificationService: NotificationService,
  ) {}

  async saveSignature(userId: string, dto: SaveSignatureDto): Promise<Signature> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const signature = this.signatureRepository.create({
      imageData: dto.imageData,
      type: dto.type || 'captured',
      user: { id: userId } as any,
      userId,
    });

    return this.signatureRepository.save(signature);
  }

  async getMySignatures(userId: string): Promise<Signature[]> {
    return this.signatureRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getLatestSignature(userId: string): Promise<Signature | null> {
    return this.signatureRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async verifySignature(id: string, adminId: string): Promise<Signature> {
    const signature = await this.signatureRepository.findOneBy({ id });
    if (!signature) throw new NotFoundException('Signature introuvable');

    signature.isVerified = true;
    signature.verifiedBy = adminId;
    signature.verifiedAt = new Date();
    return this.signatureRepository.save(signature);
  }

  async getAllSignatures(): Promise<Signature[]> {
    return this.signatureRepository.find({
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
  }

  async deleteSignature(id: string): Promise<void> {
    const result = await this.signatureRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException('Signature introuvable');
  }

  async generateConvention(sessionId: string, participantId: string, adminId: string): Promise<DocumentSigne> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: { formation: true, participants: true, formateurs: true },
    });
    if (!session) throw new NotFoundException('Session introuvable');

    const participant = await this.userRepository.findOneBy({ id: participantId });
    if (!participant) throw new NotFoundException('Participant introuvable');

    const admin = await this.userRepository.findOneBy({ id: adminId });
    if (!admin) throw new NotFoundException('Admin introuvable');

    const formation = session.formation;
    if (!formation) throw new NotFoundException('Formation introuvable');

    const adminSignature = await this.getLatestSignature(adminId);
    const participantSignature = await this.getLatestSignature(participantId);

    const archivesDir = join(__dirname, '..', '..', '..', 'uploads', 'archives');
    if (!fs.existsSync(archivesDir)) fs.mkdirSync(archivesDir, { recursive: true });

    const filename = `convention_${participant.id}_${sessionId.slice(0, 8)}_${Date.now()}.pdf`;
    const filePath = join(archivesDir, filename);

    await this.generateConventionPdf({
      filePath,
      formation,
      session,
      participant,
      admin,
      adminSignature,
      participantSignature,
    });

    const fileStats = fs.statSync(filePath);
    const fileSize = `${(fileStats.size / 1024).toFixed(1)} KB`;

    const doc = this.documentSigneRepository.create({
      type: DocumentType.CONVENTION_FORMATION,
      titre: `Convention de formation - ${formation.titre}`,
      fileUrl: `/uploads/archives/${filename}`,
      fileSize,
      isSignedByAdmin: !!adminSignature,
      isSignedByParticipant: !!participantSignature,
      signedAtByAdmin: adminSignature?.createdAt || null,
      signedAtByParticipant: participantSignature?.createdAt || null,
      signatureAdminId: adminSignature?.id || null,
      signatureParticipantId: participantSignature?.id || null,
      session: { id: sessionId } as any,
      sessionId,
      participant: { id: participantId } as any,
      participantId,
      metadata: {
        formationTitre: formation.titre,
        dateDebut: session.dateDebut,
        dateFin: session.dateFin,
        formateurs: (session.formateurs || []).map((f) => `${f.prenom} ${f.nom}`),
      },
    });

    const saved = await this.documentSigneRepository.save(doc);

    await this.notificationService.create({
      type: NotificationType.DOCUMENT_SIGNE,
      titre: 'Convention de formation générée',
      message: `La convention pour "${formation.titre}" a été générée et archivée.`,
      userId: adminId,
      lienAction: `/admin/sessions/${sessionId}`,
    });

    if (participantSignature) {
      await this.notificationService.create({
        type: NotificationType.DOCUMENT_SIGNE,
        titre: 'Votre convention de formation',
        message: `Votre convention pour "${formation.titre}" est disponible.`,
        userId: participantId,
        lienAction: `/mes-documents`,
      });
    }

    return saved;
  }

  async generateContratFormateur(sessionId: string, formateurId: string, adminId: string): Promise<DocumentSigne> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: { formation: true, formateurs: true },
    });
    if (!session) throw new NotFoundException('Session introuvable');

    const formateur = await this.userRepository.findOneBy({ id: formateurId });
    if (!formateur) throw new NotFoundException('Formateur introuvable');

    const admin = await this.userRepository.findOneBy({ id: adminId });
    if (!admin) throw new NotFoundException('Admin introuvable');

    const formation = session.formation;
    if (!formation) throw new NotFoundException('Formation introuvable');

    const adminSignature = await this.getLatestSignature(adminId);
    const formateurSignature = await this.getLatestSignature(formateurId);

    const archivesDir = join(__dirname, '..', '..', '..', 'uploads', 'archives');
    if (!fs.existsSync(archivesDir)) fs.mkdirSync(archivesDir, { recursive: true });

    const filename = `contrat_formateur_${formateur.id}_${sessionId.slice(0, 8)}_${Date.now()}.pdf`;
    const filePath = join(archivesDir, filename);

    await this.generateContratFormateurPdf({
      filePath,
      formation,
      session,
      formateur,
      admin,
      adminSignature,
      formateurSignature,
    });

    const fileStats = fs.statSync(filePath);
    const fileSize = `${(fileStats.size / 1024).toFixed(1)} KB`;

    const doc = this.documentSigneRepository.create({
      type: DocumentType.CONTRAT_FORMATEUR,
      titre: `Contrat formateur - ${formation.titre}`,
      fileUrl: `/uploads/archives/${filename}`,
      fileSize,
      isSignedByAdmin: !!adminSignature,
      isSignedByFormateur: !!formateurSignature,
      signedAtByAdmin: adminSignature?.createdAt || null,
      signedAtByFormateur: formateurSignature?.createdAt || null,
      signatureAdminId: adminSignature?.id || null,
      signatureFormateurId: formateurSignature?.id || null,
      session: { id: sessionId } as any,
      sessionId,
      participant: { id: formateurId } as any,
      participantId: formateurId,
      metadata: {
        formationTitre: formation.titre,
        dateDebut: session.dateDebut,
        dateFin: session.dateFin,
      },
    });

    const saved = await this.documentSigneRepository.save(doc);

    await this.notificationService.create({
      type: NotificationType.DOCUMENT_SIGNE,
      titre: 'Contrat formateur généré',
      message: `Le contrat pour "${formateur.prenom} ${formateur.nom}" - "${formation.titre}" a été généré.`,
      userId: adminId,
      lienAction: `/admin/sessions/${sessionId}`,
    });

    return saved;
  }

  async generateFeuilleEmargement(sessionId: string, adminId: string): Promise<DocumentSigne> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: { formation: true, participants: true, employes: true, formateurs: true },
    });
    if (!session) throw new NotFoundException('Session introuvable');

    const admin = await this.userRepository.findOneBy({ id: adminId });
    if (!admin) throw new NotFoundException('Admin introuvable');

    const formation = session.formation;
    if (!formation) throw new NotFoundException('Formation introuvable');

    const allParticipants = [
      ...(session.participants || []),
    ];

    const adminSignature = await this.getLatestSignature(adminId);

    const participantSignatures: Map<string, Signature> = new Map();
    for (const p of allParticipants) {
      const sig = await this.getLatestSignature(p.id);
      if (sig) participantSignatures.set(p.id, sig);
    }

    const archivesDir = join(__dirname, '..', '..', '..', 'uploads', 'archives');
    if (!fs.existsSync(archivesDir)) fs.mkdirSync(archivesDir, { recursive: true });

    const filename = `emargement_${sessionId.slice(0, 8)}_${Date.now()}.pdf`;
    const filePath = join(archivesDir, filename);

    await this.generateEmargementPdf({
      filePath,
      formation,
      session,
      admin,
      adminSignature,
      participants: allParticipants,
      participantSignatures,
    });

    const fileStats = fs.statSync(filePath);
    const fileSize = `${(fileStats.size / 1024).toFixed(1)} KB`;

    const doc = this.documentSigneRepository.create({
      type: DocumentType.FEUILLE_EMARGEMENT,
      titre: `Feuille d'émargement - ${formation.titre}`,
      fileUrl: `/uploads/archives/${filename}`,
      fileSize,
      isSignedByAdmin: !!adminSignature,
      signedAtByAdmin: adminSignature?.createdAt || null,
      signatureAdminId: adminSignature?.id || null,
      session: { id: sessionId } as any,
      sessionId,
      metadata: {
        formationTitre: formation.titre,
        dateDebut: session.dateDebut,
        dateFin: session.dateFin,
        nbParticipants: allParticipants.length,
        nbSignatures: participantSignatures.size,
        lieu: session.lieu,
      },
    });

    const saved = await this.documentSigneRepository.save(doc);

    await this.notificationService.create({
      type: NotificationType.DOCUMENT_SIGNE,
      titre: 'Feuille d\'émargement générée',
      message: `La feuille d'émargement pour "${formation.titre}" a été générée (${participantSignatures.size}/${allParticipants.length} signatures).`,
      userId: adminId,
      lienAction: `/admin/sessions/${sessionId}`,
    });

    return saved;
  }

  async getAllDocumentsSignes(): Promise<DocumentSigne[]> {
    return this.documentSigneRepository.find({
      relations: { session: true, participant: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getDocumentsSignesByUser(userId: string): Promise<DocumentSigne[]> {
    return this.documentSigneRepository.find({
      where: { participantId: userId },
      relations: { session: { formation: true } },
      order: { createdAt: 'DESC' },
    });
  }

  async getDocumentsSignesBySession(sessionId: string): Promise<DocumentSigne[]> {
    return this.documentSigneRepository.find({
      where: { sessionId },
      relations: { participant: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getDocumentSigne(id: string): Promise<DocumentSigne> {
    const doc = await this.documentSigneRepository.findOne({
      where: { id },
      relations: { session: true, participant: true },
    });
    if (!doc) throw new NotFoundException('Document introuvable');
    return doc;
  }

  private formatDate(d: Date): string {
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  private embedSignature(doc: PDFKit.PDFDocument, signature: Signature | null, x: number, y: number, label: string, w = 140, h = 50): void {
    doc.fontSize(8).font('Helvetica').fillColor('#888').text(label, x, y - 12, { width: w, align: 'center' });

    if (signature?.imageData) {
      const imgBase64 = signature.imageData.replace(/^data:image\/\w+;base64,/, '');
      try {
        const img = Buffer.from(imgBase64, 'base64');
        doc.image(img, x + 10, y + 2, { width: w - 20, height: h - 6 });
      } catch {
        doc.lineWidth(0.5).rect(x, y, w, h).stroke('#999');
        doc.fontSize(8).fillColor('#999').text('Signature non disponible', x + 5, y + 18, { width: w - 10, align: 'center' });
      }
    } else {
      doc.lineWidth(0.5).rect(x, y, w, h).stroke('#999');
      doc.fontSize(8).fillColor('#ccc').text('En attente de signature', x + 5, y + 18, { width: w - 10, align: 'center' });
    }

    doc.fillColor('#000');
  }

  private async generateConventionPdf(options: {
    filePath: string;
    formation: Formation;
    session: Session;
    participant: User;
    admin: User;
    adminSignature: Signature | null;
    participantSignature: Signature | null;
  }): Promise<void> {
    const { filePath, formation, session, participant, admin, adminSignature, participantSignature } = options;

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const dd = (d: Date) => this.formatDate(d);
    const formateurs = (session.formateurs || []).map((f) => `${f.prenom} ${f.nom}`).join(', ');

    doc.fontSize(20).font('Helvetica-Bold').fillColor('#1a3a5c').text('CONVENTION DE FORMATION', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#666').text('Entre les soussignés :', { align: 'center' });
    doc.moveDown(1);

    const sectionY = doc.y;
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a3a5c').text("L'ORGANISME DE FORMATION :");
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#333');
    doc.text('STEG Formation - Direction de la Formation et du Développement des Compétences');
    doc.text('Représenté par :');
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#000').text(`${admin.prenom} ${admin.nom}`);
    doc.fillColor('#333').fontSize(10).font('Helvetica');
    doc.moveDown(0.5);

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a3a5c').text("LE PARTICIPANT :");
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#333');
    doc.text(`Nom : ${participant.nom.toUpperCase()}`);
    doc.text(`Prénom : ${participant.prenom}`);
    doc.text(`Email : ${participant.email}`);
    if (participant.poste) doc.text(`Poste : ${participant.poste}`);
    if (participant.directionText) doc.text(`Direction : ${participant.directionText}`);
    doc.moveDown(0.5);

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a3a5c').text("OBJET DE LA CONVENTION :");
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#333');
    doc.text(`Formation : ${formation.titre}`);
    if (formation.description) doc.text(`Description : ${formation.description}`);
    if (formation.objectifs) doc.text(`Objectifs : ${formation.objectifs}`);
    doc.text(`Durée : ${formation.dureeEnJours || '—'} jour${formation.dureeEnJours > 1 ? 's' : ''} (${formation.dureeEnHeures || '—'} heures)`);
    doc.text(`Dates : du ${dd(new Date(session.dateDebut))} au ${dd(new Date(session.dateFin))}`);
    if (session.lieu) doc.text(`Lieu : ${session.lieu}`);
    if (formateurs) doc.text(`Formateur(s) : ${formateurs}`);
    doc.moveDown(1);

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a3a5c').text("TARIF :");
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#333');
    doc.text(`Montant : ${formation.tarif ? `${formation.tarif} TND` : '—'}`);
    doc.moveDown(1);

    const bottomY = doc.y;
    doc.lineWidth(0.5).moveTo(50, bottomY).lineTo(545, bottomY).stroke('#c5a55a');
    doc.y = bottomY + 15;

    doc.fontSize(9).font('Helvetica').fillColor('#666');
    doc.text('Fait en deux exemplaires originaux.', { align: 'center' });
    doc.text(`À ${session.lieu || 'Tunis'}, le ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' });
    doc.moveDown(1.5);

    const sigY = doc.y;
    doc.lineWidth(0.3).moveTo(50, sigY).lineTo(295, sigY).stroke('#c5a55a');
    doc.lineWidth(0.3).moveTo(300, sigY).lineTo(545, sigY).stroke('#c5a55a');

    this.embedSignature(doc, participantSignature, 55, sigY + 5, 'Signature du participant', 230, 55);
    this.embedSignature(doc, adminSignature, 305, sigY + 5, "Signature de l'organisme", 230, 55);

    doc.end();
    return new Promise((r) => stream.on('finish', r));
  }

  private async generateContratFormateurPdf(options: {
    filePath: string;
    formation: Formation;
    session: Session;
    formateur: User;
    admin: User;
    adminSignature: Signature | null;
    formateurSignature: Signature | null;
  }): Promise<void> {
    const { filePath, formation, session, formateur, admin, adminSignature, formateurSignature } = options;

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const dd = (d: Date) => this.formatDate(d);

    doc.fontSize(20).font('Helvetica-Bold').fillColor('#1a3a5c').text('CONTRAT DE PRESTATION DE SERVICE', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#666').text('Entre les soussignés :', { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a3a5c').text("L'ORGANISME DE FORMATION :");
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#333');
    doc.text('STEG Formation - Direction de la Formation et du Développement des Compétences');
    doc.text('Représenté par :');
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#000').text(`${admin.prenom} ${admin.nom}`);
    doc.fillColor('#333').fontSize(10).font('Helvetica');
    doc.moveDown(0.5);

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a3a5c').text("LE FORMATEUR :");
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#333');
    doc.text(`Nom : ${formateur.nom.toUpperCase()}`);
    doc.text(`Prénom : ${formateur.prenom}`);
    doc.text(`Email : ${formateur.email}`);
    if (formateur.telephone) doc.text(`Téléphone : ${formateur.telephone}`);
    if (formateur.qualifications) doc.text(`Qualifications : ${formateur.qualifications}`);
    if (formateur.specialites) doc.text(`Spécialités : ${formateur.specialites}`);
    doc.moveDown(0.5);

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a3a5c').text("OBJET DU CONTRAT :");
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#333');
    doc.text(`Formation : ${formation.titre}`);
    doc.text(`Durée : ${formation.dureeEnJours || '—'} jour${formation.dureeEnJours > 1 ? 's' : ''} (${formation.dureeEnHeures || '—'} heures)`);
    doc.text(`Période : du ${dd(new Date(session.dateDebut))} au ${dd(new Date(session.dateFin))}`);
    if (session.lieu) doc.text(`Lieu : ${session.lieu}`);
    doc.moveDown(0.5);

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a3a5c').text("CLAUSES PARTICULIÈRES :");
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica').fillColor('#666');
    doc.text('Le formateur s\'engage à assurer l\'intégralité de la formation selon le programme défini.');
    doc.text('Le formateur fournira les supports pédagogiques nécessaires au bon déroulement de la formation.');
    doc.text('L\'organisme s\'engage à mettre à disposition les ressources logistiques nécessaires.');
    doc.moveDown(1);

    const bottomY = doc.y;
    doc.lineWidth(0.5).moveTo(50, bottomY).lineTo(545, bottomY).stroke('#c5a55a');
    doc.y = bottomY + 15;

    doc.fontSize(9).font('Helvetica').fillColor('#666');
    doc.text('Fait en deux exemplaires originaux.', { align: 'center' });
    doc.text(`À ${session.lieu || 'Tunis'}, le ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' });
    doc.moveDown(1.5);

    const sigY = doc.y;
    doc.lineWidth(0.3).moveTo(50, sigY).lineTo(295, sigY).stroke('#c5a55a');
    doc.lineWidth(0.3).moveTo(300, sigY).lineTo(545, sigY).stroke('#c5a55a');

    this.embedSignature(doc, formateurSignature, 55, sigY + 5, 'Signature du formateur', 230, 55);
    this.embedSignature(doc, adminSignature, 305, sigY + 5, "Signature de l'organisme", 230, 55);

    doc.end();
    return new Promise((r) => stream.on('finish', r));
  }

  private async generateEmargementPdf(options: {
    filePath: string;
    formation: Formation;
    session: Session;
    admin: User;
    adminSignature: Signature | null;
    participants: User[];
    participantSignatures: Map<string, Signature>;
  }): Promise<void> {
    const { filePath, formation, session, admin, adminSignature, participants, participantSignatures } = options;

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const dd = (d: Date) => this.formatDate(d);
    const formateurs = (session.formateurs || []).map((f) => `${f.prenom} ${f.nom}`).join(', ');

    doc.fontSize(18).font('Helvetica-Bold').fillColor('#1a3a5c').text("FEUILLE D'ÉMARGEMENT DÉMATÉRIALISÉE", { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#333').text(formation.titre, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#666');
    doc.text(`${dd(new Date(session.dateDebut))} — ${dd(new Date(session.dateFin))}`, { align: 'center' });
    if (session.lieu) doc.text(`Lieu : ${session.lieu}`, { align: 'center' });
    if (formateurs) doc.text(`Formateur(s) : ${formateurs}`, { align: 'center' });
    doc.fillColor('#000');
    doc.moveDown(1);

    const tableTop = doc.y;
    const colX = [40, 100, 170, 240, 310, 390];
    const colW = [50, 60, 60, 60, 70, 100];
    const headers = ['N°', 'Nom', 'Prénom', 'Identifiant', 'Heure', 'Signature'];

    doc.fontSize(9).font('Helvetica-Bold');
    headers.forEach((h, i) => doc.text(h, colX[i], tableTop, { width: colW[i], align: 'left' }));
    doc.moveDown(0.3);

    let rowY = doc.y;
    doc.fontSize(9).font('Helvetica');

    if (participants.length === 0) {
      doc.fontSize(11).fillColor('#999').text('Aucun participant inscrit.');
      doc.fillColor('#000');
    } else {
      participants.forEach((p, idx) => {
        const lineY = rowY;
        const cells = [String(idx + 1), p.nom, p.prenom, p.identifiant || '—', '___h___'];

        cells.forEach((c, i) => {
          doc.text(c, colX[i], lineY, { width: colW[i], align: 'left' });
        });

        const sigX = colX[5];
        const sigY2 = lineY;
        const sig = participantSignatures.get(p.id) || null;
        this.embedSignature(doc, sig, sigX, sigY2, '', colW[5], 16);

        doc.moveTo(40, lineY + 18).lineTo(545, lineY + 18).strokeColor('#ddd').stroke();
        doc.strokeColor('#000');
        rowY += 24;

        if (rowY > 730) {
          doc.addPage();
          rowY = 40;
        }
      });

      doc.y = rowY + 10;
    }

    doc.moveDown(1);
    doc.fontSize(9).fillColor('#666');
    doc.text(`Total participants : ${participants.length} | Signatures électroniques : ${participantSignatures.size}/${participants.length}`, { align: 'center' });
    doc.moveDown(0.5);

    const adminSigY = doc.y;
    doc.lineWidth(0.3).moveTo(50, adminSigY).lineTo(545, adminSigY).stroke('#c5a55a');
    doc.y = adminSigY + 5;

    this.embedSignature(doc, adminSignature, 200, adminSigY + 5, "Cachet et signature de l'organisme", 200, 50);

    doc.moveDown(1);
    doc.fontSize(8).fillColor('#999');
    doc.text(`Document généré électroniquement le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, { align: 'right' });

    doc.end();
    return new Promise((r) => stream.on('finish', r));
  }
}
