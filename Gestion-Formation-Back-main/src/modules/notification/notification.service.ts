import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Notification } from '../../entities/notification.entity';
import { User } from '../../entities/user.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationStreamService } from './notification-stream.service';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly streamService: NotificationStreamService,
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const user = await this.userRepository.findOneBy({ id: dto.userId });
    if (!user) throw new NotFoundException(`Utilisateur #${dto.userId} introuvable`);

    const notification = this.notificationRepository.create({
      ...dto,
      dateEnvoi: new Date(),
      user,
    });
    const saved = await this.notificationRepository.save(notification);
    this.streamService.emit(user.id, { type: 'notification', notification: saved });
    return saved;
  }

  async findAll(): Promise<Notification[]> {
    return this.notificationRepository.find({ relations: { user: true } });
  }

  async findOne(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!notification) throw new NotFoundException(`Notification #${id} introuvable`);
    return notification;
  }

  async findByUser(userId: string): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      relations: { user: true },
    });
  }

  /**
   * Indique si une notification identique (même utilisateur, titre, message)
   * a déjà été créée depuis la date `since`. Sert à éviter les rappels en double
   * lorsque les tâches planifiées s'exécutent plusieurs fois.
   */
  async wasRecentlySent(
    userId: string,
    titre: string,
    message: string,
    since: Date,
  ): Promise<boolean> {
    const count = await this.notificationRepository.count({
      where: {
        user: { id: userId },
        titre,
        message,
        dateEnvoi: MoreThanOrEqual(since),
      },
    });
    return count > 0;
  }

  async markAsRead(id: string): Promise<Notification> {
    const notification = await this.findOne(id);
    notification.isRead = true;
    notification.dateLecture = new Date();
    return this.notificationRepository.save(notification);
  }

  async update(id: string, dto: UpdateNotificationDto): Promise<Notification> {
    const notification = await this.findOne(id);
    Object.assign(notification, dto);
    return this.notificationRepository.save(notification);
  }

  async remove(id: string): Promise<void> {
    const result = await this.notificationRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Notification #${id} introuvable`);
  }
}
