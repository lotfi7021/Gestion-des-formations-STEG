import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inscription } from '../../entities/inscription.entity';
import { Session } from '../../entities/session.entity';
import { User } from '../../entities/user.entity';
import { Formation } from '../../entities/formation.entity';
import { Presence } from '../../entities/presence.entity';
import { InscriptionController } from './inscription.controller';
import { InscriptionService } from './inscription.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { PresenceModule } from '../presence/presence.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inscription, Session, User, Formation, Presence]),
    AuthModule,
    NotificationModule,
    PresenceModule,
  ],
  controllers: [InscriptionController],
  providers: [InscriptionService],
  exports: [InscriptionService],
})
export class InscriptionModule {}
