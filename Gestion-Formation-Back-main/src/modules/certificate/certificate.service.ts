import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { join } from 'path';
import * as fs from 'fs';
import PDFDocument from 'pdfkit';
import { Certificate } from '../../entities/certificate.entity';
import { DocumentSigne, DocumentType } from '../../entities/document-signe.entity';
import { Signature } from '../../entities/signature.entity';
import { User } from '../../entities/user.entity';
import { Formation } from '../../entities/formation.entity';
import { Session } from '../../entities/session.entity';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';
import { CertificateStatus, NotificationType } from '../../common/enums';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class CertificateService {
  constructor(
    @InjectRepository(Certificate)
    private readonly certificateRepository: Repository<Certificate>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Formation)
    private readonly formationRepository: Repository<Formation>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(DocumentSigne)
    private readonly documentSigneRepository: Repository<DocumentSigne>,
    @InjectRepository(Signature)
    private readonly signatureRepository: Repository<Signature>,
    private readonly notificationService: NotificationService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // CRUD
  // ─────────────────────────────────────────────────────────────────────────────

  async create(dto: CreateCertificateDto): Promise<Certificate> {
    const user = await this.userRepository.findOneBy({ id: dto.employeId });
    if (!user) throw new NotFoundException(`User #${dto.employeId} not found`);

    const formation = await this.formationRepository.findOneBy({ id: dto.formationId });
    if (!formation) throw new NotFoundException(`Formation #${dto.formationId} not found`);

    const session = await this.sessionRepository.findOneBy({ id: dto.sessionId });
    if (!session) throw new NotFoundException(`Session #${dto.sessionId} not found`);

    const certificate = this.certificateRepository.create({
      ...dto,
      dateEmission: new Date(dto.dateEmission),
      dateExpiration: dto.dateExpiration ? new Date(dto.dateExpiration) : undefined,
      user,
      formation,
      session,
    });
    return this.certificateRepository.save(certificate);
  }

  async findAll(): Promise<Certificate[]> {
    return this.certificateRepository.find({
      relations: { user: true, formation: true, session: true },
    });
  }

  async findByUser(userId: string): Promise<Certificate[]> {
    return this.certificateRepository.find({
      where: { user: { id: userId } },
      relations: { formation: true, session: true },
      order: { dateEmission: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Certificate> {
    const certificate = await this.certificateRepository.findOne({
      where: { id },
      relations: { user: true, formation: true, session: true },
    });
    if (!certificate) throw new NotFoundException(`Certificate #${id} not found`);
    return certificate;
  }

  async update(id: string, dto: UpdateCertificateDto): Promise<Certificate> {
    const certificate = await this.findOne(id);
    Object.assign(certificate, dto);
    return this.certificateRepository.save(certificate);
  }

  async remove(id: string): Promise<void> {
    const result = await this.certificateRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Certificate #${id} not found`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REGENERATE
  // ─────────────────────────────────────────────────────────────────────────────

  async regenerate(id: string): Promise<Certificate> {
    const cert = await this.findOne(id);
    if (!cert.user || !cert.formation || !cert.session) {
      throw new BadRequestException(
        'Certificat incomplet (utilisateur, formation ou session manquant)',
      );
    }

    const session = await this.sessionRepository.findOne({
      where: { id: cert.session.id },
      relations: { formateurs: true },
    });

    if (cert.certificatUrl) {
      const oldPath = join(__dirname, '..', '..', '..', cert.certificatUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const certsDir = join(__dirname, '..', '..', '..', 'uploads', 'certificates');
    if (!fs.existsSync(certsDir)) fs.mkdirSync(certsDir, { recursive: true });

    const adminSig = await this.signatureRepository.findOne({
      where: { userId: cert.validatedBy || '' },
      order: { createdAt: 'DESC' },
    });

    const userSig = await this.signatureRepository.findOne({
      where: { userId: cert.user.id },
      order: { createdAt: 'DESC' },
    });

    const filename = `certificat_${cert.user.id}_${Date.now()}.pdf`;
    const filePath = join(certsDir, filename);

    await this.generateCertificatePdf({
      filePath,
      nom: cert.user.nom,
      prenom: cert.user.prenom,
      formationTitre: cert.formation.titre,
      dateDebut: cert.session.dateDebut,
      dateFin: cert.session.dateFin,
      dureeEnJours: cert.formation.dureeEnJours,
      numeroCertificat: cert.numeroCertificat,
      formateurs: (session?.formateurs || []).map((f) => `${f.prenom} ${f.nom}`),
      lieu: cert.session.lieu,
      adminSignature: adminSig || null,
      participantSignature: userSig || null,
    });

    cert.certificatUrl = `/uploads/certificates/${filename}`;
    cert.signatureElectronique = adminSig?.imageData || null;
    cert.dateEmission = new Date();
    return this.certificateRepository.save(cert);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GENERATE FOR SESSION
  // ─────────────────────────────────────────────────────────────────────────────

  async generateForSession(sessionId: string, adminId: string): Promise<Certificate[]> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: { formation: true, participants: true, formateurs: true, employes: true },
    });
    if (!session) throw new NotFoundException('Session introuvable');
    if (!session.isCompleted)
      throw new BadRequestException('La session doit être marquée comme terminée');

    const formation = session.formation;
    let participants = session.participants || [];

    if (session.employes?.length) {
      const allUsers = await this.userRepository.find({ where: { role: 'employe' as any } });
      for (const emp of session.employes) {
        const user = allUsers.find((u) => u.email === emp.email);
        if (user && !participants.some((p) => p.id === user.id)) {
          participants.push(user);
        }
      }
    }

    if (participants.length === 0)
      throw new BadRequestException('Aucun participant dans cette session');

    const adminSignature = await this.signatureRepository.findOne({
      where: { userId: adminId },
      order: { createdAt: 'DESC' },
    });

    const existing = await this.certificateRepository.find({
      where: { session: { id: sessionId } },
    });
    const existingUserIds = new Set(existing.map((c) => c.user?.id));

    const certsDir = join(__dirname, '..', '..', '..', 'uploads', 'certificates');
    if (!fs.existsSync(certsDir)) fs.mkdirSync(certsDir, { recursive: true });

    const archivesDir = join(__dirname, '..', '..', '..', 'uploads', 'archives');
    if (!fs.existsSync(archivesDir)) fs.mkdirSync(archivesDir, { recursive: true });

    const certificates: Certificate[] = [];

    for (const participant of participants) {
      if (existingUserIds.has(participant.id)) continue;

      const numero = `CERT-${sessionId.slice(0, 8)}-${participant.id.slice(0, 8)}-${Date.now()}`;
      const filename = `certificat_${participant.id}_${Date.now()}.pdf`;
      const filePath = join(certsDir, filename);

      const participantSignature = await this.signatureRepository.findOne({
        where: { userId: participant.id },
        order: { createdAt: 'DESC' },
      });

      await this.generateCertificatePdf({
        filePath,
        nom: participant.nom,
        prenom: participant.prenom,
        formationTitre: formation.titre,
        dateDebut: session.dateDebut,
        dateFin: session.dateFin,
        dureeEnJours: formation.dureeEnJours,
        numeroCertificat: numero,
        formateurs: (session.formateurs || []).map((f) => `${f.prenom} ${f.nom}`),
        lieu: session.lieu,
        adminSignature,
        participantSignature,
      });

      const cert = this.certificateRepository.create({
        numeroCertificat: numero,
        dateEmission: new Date(),
        statut: CertificateStatus.EMIS,
        certificatUrl: `/uploads/certificates/${filename}`,
        signatureElectronique: adminSignature?.imageData || null,
        isValidated: true,
        validatedBy: adminId,
        user: { id: participant.id } as any,
        formation: { id: formation.id } as any,
        session: { id: session.id } as any,
      });

      const saved = await this.certificateRepository.save(cert);

      fs.copyFileSync(filePath, join(archivesDir, filename));

      await this.documentSigneRepository.save(
        this.documentSigneRepository.create({
          type: DocumentType.CERTIFICAT,
          titre: `Certificat - ${formation.titre}`,
          fileUrl: `/uploads/certificates/${filename}`,
          isSignedByAdmin: !!adminSignature,
          isSignedByParticipant: !!participantSignature,
          signedAtByAdmin: adminSignature?.createdAt || null,
          signedAtByParticipant: participantSignature?.createdAt || null,
          signatureAdminId: adminSignature?.id || null,
          signatureParticipantId: participantSignature?.id || null,
          session: { id: sessionId } as any,
          sessionId,
          participant: { id: participant.id } as any,
          participantId: participant.id,
          metadata: {
            numeroCertificat: numero,
            formationTitre: formation.titre,
            dateEmission: new Date(),
          },
        }),
      );

      await this.notificationService.create({
        type: NotificationType.DOCUMENT_SIGNE,
        titre: 'Votre certificat est disponible',
        message: `Votre certificat pour "${formation.titre}" a été généré avec signature électronique.`,
        userId: participant.id,
        lienAction: `/mes-certificats`,
      });

      certificates.push(saved);
    }

    return certificates;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PDF GENERATION — mise en page proportionnelle sur une seule page A4 paysage
  //
  // Zones verticales (total = PH - 2*MARGIN = 495 pt) :
  //   ZONE_HEADER  14%  ≈ 69 pt  logo · sous-titre · séparateur
  //   ZONE_TITLE   12%  ≈ 59 pt  ATTESTATION DE FORMATION
  //   ZONE_NAME    22%  ≈ 109 pt "Délivré à" + grand nom
  //   ZONE_BODY    20%  ≈ 99 pt  "Pour avoir suivi" + titre formation
  //   ZONE_DETAIL  17%  ≈ 84 pt  dates · durée · lieu · formateurs
  //   ZONE_SIG     15%  ≈ 75 pt  séparateur · numéro · signatures
  // ─────────────────────────────────────────────────────────────────────────────
  private async generateCertificatePdf(options: {
    filePath: string;
    nom: string;
    prenom: string;
    formationTitre: string;
    dateDebut: Date;
    dateFin: Date;
    dureeEnJours: number;
    numeroCertificat: string;
    formateurs: string[];
    lieu?: string;
    adminSignature?: Signature | null;
    participantSignature?: Signature | null;
  }): Promise<void> {
    const {
      filePath,
      nom,
      prenom,
      formationTitre,
      dateDebut,
      dateFin,
      dureeEnJours,
      numeroCertificat,
      formateurs,
      lieu,
      adminSignature,
      participantSignature,
    } = options;

    // ── Document setup ──────────────────────────────────────────────────────────
    const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 0 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const PW = doc.page.width;   // 841.89 pt
    const PH = doc.page.height;  // 595.28 pt
    const CX = PW / 2;

    // Marges intérieures (espace de contenu)
    const ML = 60;  // marge gauche/droite
    const MT = 50;  // marge haute/basse
    const CW = PW - 2 * ML;     // largeur de contenu

    // ── Zones proportionnelles ──────────────────────────────────────────────────
    const INNER_H    = PH - 2 * MT;
    const Z_HEADER   = INNER_H * 0.14;  // ≈ 69 pt
    const Z_TITLE    = INNER_H * 0.12;  // ≈ 59 pt
    const Z_NAME     = INNER_H * 0.22;  // ≈ 109 pt
    const Z_BODY     = INNER_H * 0.20;  // ≈ 99 pt
    const Z_DETAIL   = INNER_H * 0.17;  // ≈ 84 pt
    const Z_SIG      = INNER_H * 0.15;  // ≈ 75 pt

    // Ancres Y de chaque zone
    const Y_HEADER   = MT;
    const Y_TITLE    = Y_HEADER  + Z_HEADER;
    const Y_NAME     = Y_TITLE   + Z_TITLE;
    const Y_BODY     = Y_NAME    + Z_NAME;
    const Y_DETAIL   = Y_BODY    + Z_BODY;
    const Y_SIG      = Y_DETAIL  + Z_DETAIL;

    // ── Couleurs & helper formatage date ────────────────────────────────────────
    const BLUE   = '#1a3a5c';
    const GOLD   = '#c5a55a';
    const GREY   = '#555555';
    const LGREY  = '#888888';
    const XGREY  = '#aaaaaa';

    const fmtDate = (d: Date) =>
      new Date(d).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

    // ── Helpers graphiques ───────────────────────────────────────────────────────

    /** Ligne décorative horizontale centrée */
    const hrGold = (y: number, w: number) => {
      doc.lineWidth(0.5)
        .moveTo(CX - w / 2, y)
        .lineTo(CX + w / 2, y)
        .stroke(GOLD);
    };

    /** Ligne dorée avec losange central */
    const hrOrnament = (y: number, w: number) => {
      const half = w / 2;
      const dSize = 3.5;
      doc.lineWidth(0.5)
        .moveTo(CX - half, y).lineTo(CX - dSize * 2, y).stroke(GOLD);
      doc.lineWidth(0.5)
        .moveTo(CX + dSize * 2, y).lineTo(CX + half, y).stroke(GOLD);
      // losange
      doc
        .moveTo(CX, y - dSize)
        .lineTo(CX + dSize, y)
        .lineTo(CX, y + dSize)
        .lineTo(CX - dSize, y)
        .closePath()
        .fillAndStroke(GOLD, GOLD);
    };

    /** Texte centré sur une ligne unique */
    const centerText = (
      text: string,
      y: number,
      size: number,
      font: string,
      color: string,
    ) => {
      doc.fontSize(size).font(font).fillColor(color).text(text, ML, y, {
        width: CW,
        align: 'center',
        lineBreak: false,
      });
    };

    // ── BORDURES EXTÉRIEURES ─────────────────────────────────────────────────────
    doc.lineWidth(2.5).rect(18, 18, PW - 36, PH - 36).stroke(BLUE);
    doc.lineWidth(0.8).rect(26, 26, PW - 52, PH - 52).stroke(GOLD);
    doc.lineWidth(0.3).rect(30, 30, PW - 60, PH - 60).stroke(GOLD);

    // ── COINS DÉCORATIFS ─────────────────────────────────────────────────────────
    const corner = (x: number, y: number, sx: number, sy: number) => {
      const L = 16;
      doc.lineWidth(1.8).stroke(GOLD)
        .moveTo(x + sx * L, y).lineTo(x, y).lineTo(x, y + sy * L).stroke(GOLD);
      doc.lineWidth(0.7).stroke(GOLD)
        .moveTo(x + sx * (L + 6), y).lineTo(x, y).lineTo(x, y + sy * (L + 6)).stroke(GOLD);
    };
    corner(26, 26,  1,  1);
    corner(PW - 26, 26, -1,  1);
    corner(26, PH - 26,  1, -1);
    corner(PW - 26, PH - 26, -1, -1);

    // ════════════════════════════════════════════════════════════════════════════
    // ZONE HEADER  (Y_HEADER → Y_HEADER + Z_HEADER)
    // ════════════════════════════════════════════════════════════════════════════
    // Logo / nom du centre — centré verticalement dans la zone
    const logoY = Y_HEADER + Z_HEADER * 0.05;
    centerText('STEG FORMATION', logoY, 20, 'Helvetica-Bold', BLUE);
    centerText(
      'Direction de la Formation et du Développement des Compétences',
      logoY + 24,
      9,
      'Helvetica',
      LGREY,
    );
    // Séparateur sous le header
    hrGold(Y_TITLE - 8, 300);

    // ════════════════════════════════════════════════════════════════════════════
    // ZONE TITLE  (Y_TITLE → Y_TITLE + Z_TITLE)
    // ════════════════════════════════════════════════════════════════════════════
    const titleY = Y_TITLE + (Z_TITLE - 22) / 2;  // centré verticalement dans la zone
    centerText('ATTESTATION DE FORMATION', titleY, 22, 'Helvetica-Bold', BLUE);

    // ════════════════════════════════════════════════════════════════════════════
    // ZONE NAME  (Y_NAME → Y_NAME + Z_NAME)
    // ════════════════════════════════════════════════════════════════════════════
    const delivreY = Y_NAME + 6;
    centerText('Délivré à', delivreY, 10, 'Helvetica', LGREY);

    // Taille du nom adaptée à la longueur
    const fullName = `${prenom.toUpperCase()} ${nom.toUpperCase()}`;
    const nameFontSize = fullName.length > 30 ? 28 : fullName.length > 22 ? 32 : 38;
    const nameY = delivreY + 18;
    centerText(fullName, nameY, nameFontSize, 'Helvetica-Bold', BLUE);

    // Filet doré sous le nom
    hrGold(nameY + nameFontSize + 10, 220);

    // ════════════════════════════════════════════════════════════════════════════
    // ZONE BODY  (Y_BODY → Y_BODY + Z_BODY)
    // ════════════════════════════════════════════════════════════════════════════
    const pourY = Y_BODY + 8;
    centerText('Pour avoir suivi avec succès la formation :', pourY, 10, 'Helvetica-Oblique', LGREY);

    // Titre de la formation — taille adaptée
    const tLen = formationTitre.length;
    const tSize = tLen > 70 ? 13 : tLen > 50 ? 15 : tLen > 30 ? 18 : 21;
    const formY = pourY + 20;
    centerText(formationTitre, formY, tSize, 'Helvetica-BoldOblique', BLUE);

    // ════════════════════════════════════════════════════════════════════════════
    // ZONE DETAIL  (Y_DETAIL → Y_DETAIL + Z_DETAIL)
    // Tous les éléments espacés uniformément dans la zone
    // ════════════════════════════════════════════════════════════════════════════

    // Construire la liste des lignes de détail disponibles
    const detailLines: string[] = [
      `Du ${fmtDate(dateDebut)}  au  ${fmtDate(dateFin)}`,
      `Durée : ${dureeEnJours || '—'} jour${dureeEnJours > 1 ? 's' : ''}`,
    ];
    if (lieu) detailLines.push(`Lieu : ${lieu}`);
    if (formateurs.length > 0) {
      detailLines.push(`Formateur${formateurs.length > 1 ? 's' : ''} : ${formateurs.join('  ·  ')}`);
    }

    // Espacement uniforme : diviser Z_DETAIL en (n+1) intervalles
    const lineH = 12;  // hauteur estimée d'une ligne
    const totalTextH = detailLines.length * lineH;
    const padding = (Z_DETAIL - totalTextH) / (detailLines.length + 1);

    detailLines.forEach((line, i) => {
      const lineY = Y_DETAIL + padding + i * (lineH + padding);
      // Taille adaptée pour les lignes longues
      const lSize = line.length > 90 ? 8 : line.length > 65 ? 9 : 10.5;
      doc.fontSize(lSize).font('Helvetica').fillColor(GREY)
        .text(line, ML, lineY, { width: CW, align: 'center', lineBreak: false });
    });

    // Ornement entre détails et signatures
    hrOrnament(Y_SIG - 4, 340);

    // ════════════════════════════════════════════════════════════════════════════
    // ZONE SIGNATURE  (Y_SIG → Y_SIG + Z_SIG)
    // ════════════════════════════════════════════════════════════════════════════
    const numY = Y_SIG + 6;
    doc.fontSize(7.5).font('Helvetica').fillColor(XGREY)
      .text(
        `N° ${numeroCertificat}   ·   Émis le ${new Date().toLocaleDateString('fr-FR')}`,
        ML,
        numY,
        { width: CW, align: 'center', lineBreak: false },
      );

    // Boîtes de signature : gauche = participant, droite = responsable
    const boxW    = 185;
    const boxH    = Z_SIG - 28;  // hauteur de la boîte
    const boxY    = numY + 14;
    const leftBX  = CX - boxW - 20;
    const rightBX = CX + 20;

    // ── Fonction dessin d'une boîte signature ───────────────────────────────────
    const drawSigBox = (
      bx: number,
      label: string,
      sigData: string | null | undefined,
    ) => {
      // Contour subtil
      doc.lineWidth(0.4)
        .rect(bx, boxY, boxW, boxH)
        .stroke(GOLD);

      // Label en haut de la boîte
      doc.fontSize(7.5).font('Helvetica').fillColor(LGREY)
        .text(label, bx, boxY + 5, { width: boxW, align: 'center', lineBreak: false });

      // Ligne de signature ou image
      const sigLineY = boxY + boxH - 16;

      if (sigData) {
        const raw = sigData.replace(/^data:image\/\w+;base64,/, '');
        const imgBuf = Buffer.from(raw, 'base64');
        const imgX = bx + 8;
        const imgW = boxW - 16;
        const imgH = boxH - 28;
        const imgY = boxY + 18;
        try {
          doc.image(imgBuf, imgX, imgY, { width: imgW, height: imgH, fit: [imgW, imgH] });
        } catch {
          // Fallback : ligne simple si l'image est invalide
          doc.lineWidth(0.5)
            .moveTo(bx + 15, sigLineY)
            .lineTo(bx + boxW - 15, sigLineY)
            .stroke(XGREY);
        }
      } else {
        // Ligne vide
        doc.lineWidth(0.5)
          .moveTo(bx + 15, sigLineY)
          .lineTo(bx + boxW - 15, sigLineY)
          .stroke(XGREY);
      }
    };

    drawSigBox(rightBX,  'Signature du participant',  participantSignature?.imageData);
    drawSigBox(leftBX, 'Cachet du responsable',     adminSignature?.imageData);

    // ── Fin du document ──────────────────────────────────────────────────────────
    doc.end();
    return new Promise((resolve) => stream.on('finish', resolve));
  }
}