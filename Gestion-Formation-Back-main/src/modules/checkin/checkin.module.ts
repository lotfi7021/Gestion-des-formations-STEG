import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from '../../entities/session.entity';
import { Presence } from '../../entities/presence.entity';
import { User } from '../../entities/user.entity';
import { CheckinController, SessionCheckinController } from './checkin.controller';
import { CheckinService } from './checkin.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, Presence, User]),
    AuthModule,
    NotificationModule,
    MailModule,
  ],
  controllers: [CheckinController, SessionCheckinController],
  providers: [CheckinService],
  exports: [CheckinService],
})
export class CheckinModule {}
