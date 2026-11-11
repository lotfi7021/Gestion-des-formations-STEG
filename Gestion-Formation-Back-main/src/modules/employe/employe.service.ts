import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Employe } from '../../entities/employe.entity';
import { User } from '../../entities/user.entity';
import { UserRole, NotificationType } from '../../common/enums';
import { MailService } from '../mail/mail.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class EmployeService {
  constructor(
    @InjectRepository(Employe)
    private readonly employeRepository: Repository<Employe>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly mailService: MailService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(dto: {
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    poste?: string;
    departement?: string;
    directionText?: string;
    dateEmbauche?: string;
  }): Promise<Employe> {
    const existing = await this.employeRepository.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Un employé avec cet email existe déjà');

    const identifiant = await this.generateIdentifiant();

    const employe = this.employeRepository.create({
      ...dto,
      dateEmbauche: dto.dateEmbauche ? new Date(dto.dateEmbauche) : undefined,
      identifiant,
    });
    const saved = await this.employeRepository.save(employe);

    const existingUser = await this.userRepository.findOne({ where: { email: dto.email } });
    if (!existingUser) {
      const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-2).toUpperCase();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const user = this.userRepository.create({
        username: identifiant,
        email: dto.email,
        password: hashedPassword,
        role: UserRole.EMPLOYE,
        isActive: true,
        nom: dto.nom,
        prenom: dto.prenom,
        telephone: dto.telephone,
      });
      await this.userRepository.save(user);

      await this.mailService.send({
        to: user.email,
        subject: 'Bienvenue sur steg_form — Vos identifiants de connexion',
        html: this.welcomeEmailHtml(user, tempPassword, identifiant),
      });
    }

    const admin = await this.userRepository.findOne({ where: { role: UserRole.ADMIN } });
    if (admin) {
      await this.notificationService.create({
        type: NotificationType.NOUVEL_INSCRIT,
        titre: `Nouvel employé : ${saved.prenom} ${saved.nom}`,
        message: `${saved.prenom} ${saved.nom} (${saved.email}) a été ajouté comme employé.`,
        userId: admin.id,
      });
    }

    return saved;
  }

  async findAll(): Promise<(Employe & { userActive?: boolean; userId?: string })[]> {
    const employes = await this.employeRepository.find({ order: { identifiant: 'DESC' } });
    const users = await this.userRepository.find({ where: { role: UserRole.EMPLOYE } });
    return employes.map((e) => {
      const user = users.find((u) => u.email === e.email);
      return { ...e, userActive: user?.isActive, userId: user?.id } as any;
    });
  }

  async findOne(id: string): Promise<Employe> {
    const employe = await this.employeRepository.findOne({ where: { id } });
    if (!employe) throw new NotFoundException(`Employé #${id} introuvable`);
    return employe;
  }

  async update(id: string, dto: Partial<{
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
    poste: string;
    departement: string;
    directionText: string;
    dateEmbauche: string;
  }>): Promise<Employe> {
    const employe = await this.findOne(id);
    if (dto.email && dto.email !== employe.email) {
      const existing = await this.employeRepository.findOne({ where: { email: dto.email } });
      if (existing) throw new ConflictException('Un employé avec cet email existe déjà');
    }
    Object.assign(employe, {
      ...dto,
      dateEmbauche: dto.dateEmbauche ? new Date(dto.dateEmbauche) : employe.dateEmbauche,
    });
    return this.employeRepository.save(employe);
  }

  async remove(id: string): Promise<void> {
    const result = await this.employeRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Employé #${id} introuvable`);
  }

  private welcomeEmailHtml(user: User, tempPassword: string, identifiant: string): string {
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
            Votre compte employé a été créé sur steg_form.<br/>
            Vous pouvez dès maintenant consulter le catalogue et vous inscrire aux formations.
          </p>
          <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Identifiants de connexion</p>
            <table style="font-size: 14px; color: #374151;">
              <tr><td style="padding: 4px 8px 4px 0; color: #6b7280;">Email</td><td><strong>${user.email}</strong></td></tr>
              <tr><td style="padding: 4px 8px 4px 0; color: #6b7280;">Identifiant</td><td><strong>${identifiant}</strong></td></tr>
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

  private async generateIdentifiant(): Promise<string> {
    const year = new Date().getFullYear().toString();

    const maxEmploye = await this.employeRepository.findOne({
      where: { identifiant: Like(`${year}STG%`) },
      order: { identifiant: 'DESC' },
    });

    const maxUser = await this.userRepository.findOne({
      where: { username: Like(`${year}STG%`) },
      order: { username: 'DESC' },
    });

    let nextNum = 1;
    const employeNum = maxEmploye?.identifiant?.match(/(\d+)$/)?.[1];
    const userNum = maxUser?.username?.match(/(\d+)$/)?.[1];
    if (employeNum || userNum) {
      nextNum = Math.max(parseInt(employeNum || '0', 10), parseInt(userNum || '0', 10)) + 1;
    }

    return `${year}STG${nextNum.toString().padStart(3, '0')}`;
  }
}
