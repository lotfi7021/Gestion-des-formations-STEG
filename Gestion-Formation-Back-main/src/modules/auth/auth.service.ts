import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../entities/user.entity';
import { Employe } from '../../entities/employe.entity';
import { UserRole } from '../../common/enums';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { MailService } from '../mail/mail.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../common/enums';

@Injectable()
export class AuthService {
  private readonly accessTokenExpiry = '15m';
  private readonly refreshTokenExpiry = '7d';

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Employe)
    private readonly employeRepository: Repository<Employe>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly notificationService: NotificationService,
  ) {}

  async login(dto: LoginDto) {
    let user = await this.userRepository.findOne({
      where: [
        { email: dto.email },
        { username: dto.email },
      ],
    });

    if (!user) {
      const employe = await this.employeRepository.findOne({ where: { identifiant: dto.email } });
      if (employe) {
        user = await this.userRepository.findOne({ where: { email: employe.email } });
        if (!user) {
          const hashedPassword = await bcrypt.hash(dto.password, 10);
          const username = employe.email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '_');
          user = this.userRepository.create({
            username,
            email: employe.email,
            password: hashedPassword,
            role: UserRole.EMPLOYE,
            isActive: true,
            nom: employe.nom,
            prenom: employe.prenom,
            telephone: employe.telephone,
          });
          user = await this.userRepository.save(user);
        }
      }
    }

    if (!user) throw new UnauthorizedException('Identifiants incorrects');

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) throw new UnauthorizedException('Identifiants incorrects');

    if (!user.isActive) throw new ForbiddenException('Compte désactivé');

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: this.accessTokenExpiry });
    const refreshToken = uuidv4();

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.update(user.id, {
      refreshToken: hashedRefreshToken,
      lastLogin: new Date(),
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        nom: user.nom,
        prenom: user.prenom,
        telephone: user.telephone,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async refresh(refreshToken: string) {
    const users = await this.userRepository.find({ where: { isActive: true } });

    let user: User | null = null;
    for (const u of users) {
      if (u.refreshToken && (await bcrypt.compare(refreshToken, u.refreshToken))) {
        user = u;
        break;
      }
    }

    if (!user) throw new UnauthorizedException('Refresh token invalide');

    const payload = { sub: user.id, email: user.email, role: user.role };
    const newAccessToken = this.jwtService.sign(payload, { expiresIn: this.accessTokenExpiry });
    const newRefreshToken = uuidv4();

    const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
    await this.userRepository.update(user.id, { refreshToken: hashedRefreshToken });

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expires_in: 900,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        nom: user.nom,
        prenom: user.prenom,
        telephone: user.telephone,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      nom: user.nom,
      prenom: user.prenom,
      telephone: user.telephone,
      avatarUrl: user.avatarUrl,
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.userRepository.findOne({
      where: [{ username: dto.username }, { email: dto.email }],
    });
    if (existing) {
      throw new UnauthorizedException("Nom d'utilisateur ou email déjà utilisé");
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      username: dto.username,
      email: dto.email,
      password: hashedPassword,
      role: dto.role || UserRole.PARTICIPANT,
      isActive: false,
      nom: dto.username,
      prenom: '',
    });
    await this.userRepository.save(user);

    await this.mailService.send({
      to: user.email,
      subject: "Inscription reçue — En attente d'approbation",
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          <div style="background: #0a7c6e; padding: 28px 32px;">
            <table><tr>
              <td style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 8px; text-align: center; vertical-align: middle; font-size: 22px; font-weight: 700; color: #fff;">F</td>
               <td style="padding-left: 12px; font-size: 22px; font-weight: 700; color: #ffffff;">steg_form</td>
            </tr></table>
          </div>
          <div style="padding: 36px 32px;">
            <p style="margin: 0 0 8px; color: #374151; font-size: 15px;">Bonjour <strong style="color: #0a7c6e;">${user.username}</strong>,</p>
            <p style="margin: 0 0 20px; color: #374151; font-size: 15px; line-height: 1.6;">
              Votre inscription en tant que <strong>${user.role}</strong> a bien été reçue.<br>
              Un administrateur va valider votre compte dans les plus brefs délais.<br>
              Vous recevrez un email dès que votre compte sera actif.
            </p>
          </div>
          <div style="background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px 32px; text-align: center;">
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">Cet email a été envoyé automatiquement depuis steg_form.</p>
          </div>
        </div>
      `,
    });

    const admin = await this.userRepository.findOne({ where: { role: UserRole.ADMIN } });
    if (admin) {
      await this.notificationService.create({
        type: user.role === UserRole.FORMATEUR ? NotificationType.NOUVEAU_FORMATEUR : NotificationType.NOUVEL_INSCRIT,
        titre: `Nouvel inscrit : ${user.username}`,
        message: `${user.username} (${user.email}) s'est inscrit en tant que ${user.role} et attend votre validation.`,
        userId: admin.id,
        lienAction: '/admin/approbations',
      });
    }

    return {
      message: "Inscription soumise. En attente d'approbation par un administrateur.",
    };
  }

  async updateProfile(userId: string, dto: { username?: string; nom?: string; prenom?: string; telephone?: string }) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    if (dto.username !== undefined) {
      const existing = await this.userRepository.findOne({ where: { username: dto.username } });
      if (existing && existing.id !== userId) {
        throw new ForbiddenException('Nom d\'utilisateur déjà pris');
      }
      user.username = dto.username;
    }
    if (dto.nom !== undefined) user.nom = dto.nom;
    if (dto.prenom !== undefined) user.prenom = dto.prenom;
    if (dto.telephone !== undefined) user.telephone = dto.telephone;

    await this.userRepository.save(user);
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      nom: user.nom,
      prenom: user.prenom,
      telephone: user.telephone,
      avatarUrl: user.avatarUrl,
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new ForbiddenException('Mot de passe actuel incorrect');

    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);

    return { message: 'Mot de passe mis à jour' };
  }

  async getPendingUsers() {
    return this.userRepository.find({
      where: { isActive: false },
      select: { id: true, username: true, email: true, role: true, createdAt: true },
    });
  }

  async approveUser(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Utilisateur introuvable');

    user.isActive = true;
    await this.userRepository.save(user);

    await this.mailService.send({
      to: user.email,
      subject: 'Compte approuvé — Bienvenue sur steg_form',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          <div style="background: #0a7c6e; padding: 28px 32px;">
            <table><tr>
              <td style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 8px; text-align: center; vertical-align: middle; font-size: 22px; font-weight: 700; color: #fff;">F</td>
               <td style="padding-left: 12px; font-size: 22px; font-weight: 700; color: #ffffff;">steg_form</td>
            </tr></table>
          </div>
          <div style="padding: 36px 32px;">
            <p style="margin: 0 0 8px; color: #374151; font-size: 15px;">Bonjour <strong style="color: #0a7c6e;">${user.username}</strong>,</p>
            <p style="margin: 0 0 20px; color: #374151; font-size: 15px; line-height: 1.6;">
              Votre compte <strong>${user.role}</strong> a été approuvé par un administrateur.<br>
              Vous pouvez dès maintenant vous connecter à la plateforme steg_form.
            </p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:8081'}/connexion" style="display: inline-block; background: #0a7c6e; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">Se connecter</a>
          </div>
          <div style="background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px 32px; text-align: center;">
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">Cet email a été envoyé automatiquement depuis steg_form.</p>
          </div>
        </div>
      `,
    });

    return { message: 'Utilisateur approuvé' };
  }

  async rejectUser(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Utilisateur introuvable');
    await this.userRepository.remove(user);
    return { message: 'Inscription rejetée et supprimée' };
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    user.avatarUrl = avatarUrl;
    await this.userRepository.save(user);
    return { avatarUrl };
  }

  async logout(userId: string) {
    await this.userRepository.update(userId, { refreshToken: null });
  }

  decodeToken(token: string) {
    return this.jwtService.decode(token);
  }

  async verifyToken(token: string) {
    return this.jwtService.verify(token);
  }
}
