import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from '../../entities/session.entity';
import { Formation } from '../../entities/formation.entity';
import { User } from '../../entities/user.entity';
import { Employe } from '../../entities/employe.entity';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { InscriptionModule } from '../inscription/inscription.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [TypeOrmModule.forFeature([Session, Formation, User, Employe]), AuthModule, NotificationModule, InscriptionModule, MailModule],
  controllers: [SessionController],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
