import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../entities/user.entity';
import { Entreprise } from '../../entities/entreprise.entity';
import { UserRole } from '../../common/enums';
import { MailService } from '../mail/mail.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../common/enums';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Entreprise)
    private readonly entrepriseRepository: Repository<Entreprise>,
    private readonly mailService: MailService,
    private readonly notificationService: NotificationService,
  ) {}

  private async ensureEmailNotTaken(email: string, excludeId?: string): Promise<void> {
    const existing = await this.userRepository.findOne({
      where: { email },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('Un compte existe déjà avec cet email');
    }
  }

  async createFormateur(dto: {
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    qualifications?: string;
    specialites?: string;
    biographie?: string;
    disponibilites?: { jour: string; heureDebut: string; heureFin: string }[];
    cvUrl?: string;
  }): Promise<User> {
    const existing = await this.userRepository.findOne({ where: { email: dto.email } });

    if (existing) {
      existing.nom = dto.nom;
      existing.prenom = dto.prenom;
      existing.telephone = dto.telephone;
      existing.qualifications = dto.qualifications;
      existing.specialites = dto.specialites;
      existing.biographie = dto.biographie;
      existing.disponibilites = dto.disponibilites;
      existing.cvUrl = dto.cvUrl;
      existing.role = UserRole.FORMATEUR;
      const saved = await this.userRepository.save(existing);

      await this.mailService.send({
        to: saved.email,
        subject: 'Mise à jour — Compte formateur steg_form',
        html: `<p>Bonjour ${saved.prenom},<br>Votre compte a été mis à jour en tant que formateur.</p>`,
      });

      return saved;
    }

    const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-2).toUpperCase();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const username = dto.email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '_');

    const user = this.userRepository.create({
      username,
      email: dto.email,
      password: hashedPassword,
      role: UserRole.FORMATEUR,
      isActive: true,
      nom: dto.nom,
      prenom: dto.prenom,
      telephone: dto.telephone,
      qualifications: dto.qualifications,
      specialites: dto.specialites,
      biographie: dto.biographie,
      disponibilites: dto.disponibilites,
      cvUrl: dto.cvUrl,
    });
    const saved = await this.userRepository.save(user);

    await this.mailService.send({
      to: saved.email,
      subject: 'Bienvenue sur steg_form — Vos identifiants de connexion',
      html: this.welcomeEmailHtml(saved, tempPassword, 'formateur'),
    });

    const admin = await this.userRepository.findOne({ where: { role: UserRole.ADMIN } });
    if (admin) {
      await this.notificationService.create({
        type: NotificationType.NOUVEAU_FORMATEUR,
        titre: `Nouveau formateur : ${saved.prenom} ${saved.nom}`,
        message: `${saved.prenom} ${saved.nom} (${saved.email}) a été ajouté comme formateur.`,
        userId: admin.id,
      });
    }

    return saved;
  }

  async createParticipant(dto: {
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    poste?: string;
    departement?: string;
      directionText?: string;
    dateEmbauche?: string;
    entrepriseId?: string;
  }): Promise<User> {
    await this.ensureEmailNotTaken(dto.email);

    let entreprise: Entreprise | null = null;
    if (dto.entrepriseId) {
      entreprise = await this.entrepriseRepository.findOneBy({ id: dto.entrepriseId });
    }

    const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-2).toUpperCase();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const username = dto.email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '_');

    const user = this.userRepository.create({
      username,
      email: dto.email,
      password: hashedPassword,
      role: UserRole.PARTICIPANT,
      isActive: true,
      nom: dto.nom,
      prenom: dto.prenom,
      telephone: dto.telephone,
      poste: dto.poste,
      departement: dto.departement,
      directionText: dto.directionText,
      dateEmbauche: dto.dateEmbauche ? new Date(dto.dateEmbauche) : undefined,
      entreprise: entreprise || undefined,
    });
    const saved = await this.userRepository.save(user);

    await this.mailService.send({
      to: saved.email,
      subject: 'Bienvenue sur steg_form — Vos identifiants de connexion',
      html: this.welcomeEmailHtml(saved, tempPassword, 'participant'),
    });

    const admin = await this.userRepository.findOne({ where: { role: UserRole.ADMIN } });
    if (admin) {
      await this.notificationService.create({
        type: NotificationType.NOUVEL_INSCRIT,
        titre: `Nouveau participant : ${saved.prenom} ${saved.nom}`,
        message: `${saved.prenom} ${saved.nom} (${saved.email}) a été ajouté comme participant.`,
        userId: admin.id,
      });
    }

    return saved;
  }

  async findAllFormateurs(): Promise<User[]> {
    const formateurs = await this.userRepository.find({
      where: { role: UserRole.FORMATEUR },
      relations: { entreprise: true, evaluationsRecues: true },
    });
    return formateurs.map((f) => {
      const notes = f.evaluationsRecues?.filter((e) => e.note != null).map((e) => Number(e.note)) || [];
      f.noteGlobale = notes.length ? parseFloat((notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(2)) : 0;
      return f;
    });
  }

  async findAllParticipants(): Promise<User[]> {
    return this.userRepository.find({
      where: { role: UserRole.PARTICIPANT },
      relations: { entreprise: true },
    });
  }

  /** Employés STEG = Users avec role='employe' (sans données sensibles). */
  async findAllEmployes(): Promise<User[]> {
    return this.userRepository.find({
      where: { role: UserRole.EMPLOYE },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        nom: true,
        prenom: true,
        telephone: true,
        poste: true,
        departement: true,
        directionText: true,
        dateEmbauche: true,
        identifiant: true,
        avatarUrl: true,
        createdAt: true,
      },
      order: { identifiant: 'DESC' },
    });
  }

  /**
   * Crée un compte employé STEG (User role='employe') avec email d'identifiants.
   * Remplace l'ancien EmployeService.create (table `employes` supprimée).
   */
  async createEmploye(dto: {
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    poste?: string;
    departement?: string;
    directionText?: string;
    dateEmbauche?: string;
  }): Promise<User> {
    await this.ensureEmailNotTaken(dto.email);

    const identifiant = await this.generateIdentifiant();
    const tempPassword =
      Math.random().toString(36).slice(-10) +
      Math.random().toString(36).slice(-2).toUpperCase();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const username = dto.email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '_');

    const user = this.userRepository.create({
      username,
      email: dto.email,
      password: hashedPassword,
      role: UserRole.EMPLOYE,
      isActive: true,
      nom: dto.nom,
      prenom: dto.prenom,
      telephone: dto.telephone,
      poste: dto.poste,
      departement: dto.departement,
      directionText: dto.directionText,
      dateEmbauche: dto.dateEmbauche ? new Date(dto.dateEmbauche) : undefined,
      identifiant,
    });
    const saved = await this.userRepository.save(user);

    await this.mailService.send({
      to: saved.email,
      subject: 'Bienvenue sur steg_form — Vos identifiants de connexion',
      html: this.welcomeEmailHtml(saved, tempPassword, 'employé STEG'),
    });

    const admin = await this.userRepository.findOne({ where: { role: UserRole.ADMIN } });
    if (admin) {
      await this.notificationService.create({
        type: NotificationType.NOUVEL_INSCRIT,
        titre: `Nouvel employé : ${saved.prenom} ${saved.nom}`,
        message: `${saved.prenom} ${saved.nom} (${saved.email}) a été ajouté comme employé STEG.`,
        userId: admin.id,
      });
    }

    return saved;
  }

  /** Génère un identifiant STEG unique (ex: 2026STG005). */
  private async generateIdentifiant(): Promise<string> {
    const year = new Date().getFullYear().toString();
    const maxUser = await this.userRepository.findOne({
      where: { identifiant: Like(`${year}STG%`) },
      order: { identifiant: 'DESC' },
    });
    const num = maxUser?.identifiant?.match(/(\d+)$/)?.[1];
    const nextNum = num ? parseInt(num, 10) + 1 : 1;
    return `${year}STG${nextNum.toString().padStart(3, '0')}`;
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { entreprise: true, notifications: true },
    });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({ relations: { entreprise: true } });
  }

  async create(dto: { username: string; email: string; password: string; role?: UserRole; isActive?: boolean }): Promise<User> {
    const existing = await this.userRepository.findOne({
      where: [{ username: dto.username }, { email: dto.email }],
    });
    if (existing) throw new ConflictException('Username or email already exists');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      ...dto,
      password: hashedPassword,
      nom: dto.username,
      prenom: '',
    });
    return this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneBy({ email });
  }

  async update(id: string, dto: Record<string, any>): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, dto);
    return this.userRepository.save(user);
  }

  async cloneFormateurForPlatform(id: string): Promise<User> {
    const original = await this.findOne(id);
    const baseEmail = original.email;
    let newEmail = baseEmail;
    let suffix = 0;
    while (await this.userRepository.findOne({ where: { email: newEmail } })) {
      suffix++;
      const [local] = baseEmail.split('@');
      newEmail = `${local}-plateforme${suffix > 1 ? suffix : ''}@${baseEmail.split('@')[1]}`;
    }
    const username = newEmail.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '_');
    const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-2).toUpperCase();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const clone = this.userRepository.create({
      username,
      email: newEmail,
      password: hashedPassword,
      role: UserRole.FORMATEUR,
      isActive: true,
      nom: original.nom,
      prenom: original.prenom,
      telephone: original.telephone,
      qualifications: original.qualifications,
      specialites: original.specialites,
      biographie: original.biographie,
      disponibilites: original.disponibilites,
      cvUrl: original.cvUrl,
      programmeUrl: original.programmeUrl,
      modeleCnfcppUrl: original.modeleCnfcppUrl,
      feuillePresenceUrl: original.feuillePresenceUrl,
      attestationUrl: original.attestationUrl,
    });
    const saved = await this.userRepository.save(clone);

    await this.mailService.send({
      to: saved.email,
      subject: 'Bienvenue sur steg_form — Vos identifiants de connexion',
      html: this.welcomeEmailHtml(saved, tempPassword, 'formateur'),
    });

    return saved;
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.manager.transaction(async (manager) => {
      await manager.query('DELETE FROM session_formateurs WHERE user_id = ?', [id]);
      await manager.query('DELETE FROM session_participants WHERE user_id = ?', [id]);
      await manager.query('DELETE FROM notifications WHERE `userId` = ?', [id]);
      await manager.query('DELETE FROM presences WHERE `userId` = ?', [id]);
      await manager.query('DELETE FROM evaluations WHERE `formateurId` = ?', [id]);
      await manager.query('DELETE FROM evaluations WHERE `participantId` = ?', [id]);
      await manager.query('DELETE FROM certificates WHERE `userId` = ?', [id]);
      await manager.query('DELETE FROM session_documents WHERE `uploadedById` = ?', [id]);
      await manager.query('DELETE FROM signatures WHERE `userId` = ?', [id]);
      await manager.query('UPDATE documents_signes SET `participantId` = NULL WHERE `participantId` = ?', [id]);
      await manager.query('DELETE FROM inscriptions WHERE `userId` = ?', [id]);
      await manager.delete(User, id);
    });
  }

  async updateDocumentUrl(id: string, field: string, url: string): Promise<User> {
    const user = await this.findOne(id);
    (user as any)[field] = url;
    return this.userRepository.save(user);
  }

  private welcomeEmailHtml(user: User, tempPassword: string, role: string): string {
    return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background: #0a7c6e; padding: 28px 32px;">
          <table><tr>
            <td style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 8px; text-align: center; vertical-align: middle; font-size: 22px; font-weight: 700; color: #fff;">F</td>
            <td style="padding-left: 12px; font-size: 22px; font-weight: 700; color: #ffffff;">steg_form</td>
          </tr></table>
        </div>
        <div style="padding: 36px 32px;">
          <p style="margin: 0 0 8px; color: #374151; font-size: 15px;">Bonjour <strong style="color: #0a7c6e;">${user.prenom} ${user.nom}</strong>,</p>
          <p style="margin: 0 0 20px; color: #374151; font-size: 15px; line-height: 1.6;">
            Vous avez été ajouté en tant que <strong>${role}</strong> sur la plateforme steg_form.
          </p>
          <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Identifiants de connexion</p>
            <table style="font-size: 14px; color: #374151;">
              <tr><td style="padding: 4px 8px 4px 0; color: #6b7280;">Email</td><td><strong>${user.email}</strong></td></tr>
              <tr><td style="padding: 4px 8px 4px 0; color: #6b7280;">Mot de passe</td><td><strong>${tempPassword}</strong></td></tr>
            </table>
          </div>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:8081'}/connexion" style="display: inline-block; background: #0a7c6e; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">Se connecter</a>
          <p style="margin: 16px 0 0; color: #9ca3af; font-size: 12px;">Nous vous recommandons de changer votre mot de passe après la première connexion.</p>
        </div>
        <div style="background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px 32px; text-align: center;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">Cet email a été envoyé automatiquement depuis steg_form.</p>
        </div>
      </div>`;
  }
}
