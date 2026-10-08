import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from '../../entities/session.entity';
import { User } from '../../entities/user.entity';
import { TasksService } from './tasks.service';
import { NotificationModule } from '../notification/notification.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Session, User]),
    NotificationModule,
    MailModule,
  ],
  providers: [TasksService],
})
export class TasksModule {}
