import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inscription } from '../../entities/inscription.entity';
import { Session } from '../../entities/session.entity';
import { User } from '../../entities/user.entity';
import { Formation } from '../../entities/formation.entity';
import { InscriptionController } from './inscription.controller';
import { InscriptionService } from './inscription.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inscription, Session, User, Formation]),
    AuthModule,
    NotificationModule,
  ],
  controllers: [InscriptionController],
  providers: [InscriptionService],
  exports: [InscriptionService],
})
export class InscriptionModule {}
