import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from '../../entities/notification.entity';
import { User } from '../../entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationStreamService } from './notification-stream.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User]), forwardRef(() => AuthModule)],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationStreamService],
  exports: [NotificationService, NotificationStreamService],
})
export class NotificationModule {}
