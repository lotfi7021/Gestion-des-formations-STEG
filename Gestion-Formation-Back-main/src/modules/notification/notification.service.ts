import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../entities/notification.entity';
import { User } from '../../entities/user.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const user = await this.userRepository.findOneBy({ id: dto.userId });
    if (!user) throw new NotFoundException(`User #${dto.userId} not found`);

    const notification = this.notificationRepository.create({
      ...dto,
      dateEnvoi: new Date(),
      user,
    });
    return this.notificationRepository.save(notification);
  }

  async findAll(): Promise<Notification[]> {
    return this.notificationRepository.find({ relations: { user: true } });
  }

  async findOne(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!notification) throw new NotFoundException(`Notification #${id} not found`);
    return notification;
  }

  async findByUser(userId: string): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      relations: { user: true },
    });
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
    if (result.affected === 0) throw new NotFoundException(`Notification #${id} not found`);
  }
}
