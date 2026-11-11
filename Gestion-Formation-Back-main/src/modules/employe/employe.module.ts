import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employe } from '../../entities/employe.entity';
import { User } from '../../entities/user.entity';
import { MailModule } from '../mail/mail.module';
import { NotificationModule } from '../notification/notification.module';
import { EmployeController } from './employe.controller';
import { EmployeService } from './employe.service';

@Module({
  imports: [TypeOrmModule.forFeature([Employe, User]), MailModule, NotificationModule],
  controllers: [EmployeController],
  providers: [EmployeService],
  exports: [EmployeService],
})
export class EmployeModule {}
