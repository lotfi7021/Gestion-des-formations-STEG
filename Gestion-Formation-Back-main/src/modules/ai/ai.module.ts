import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Session } from '../../entities/session.entity';
import { Certificate } from '../../entities/certificate.entity';
import { Presence } from '../../entities/presence.entity';
import { Evaluation } from '../../entities/evaluation.entity';
import { SessionDocument } from '../../entities/session-document.entity';
import { Inscription } from '../../entities/inscription.entity';
import { Formation } from '../../entities/formation.entity';

import { AuthModule } from '../auth/auth.module';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Session,
      Certificate,
      Presence,
      Evaluation,
      SessionDocument,
      Inscription,
      Formation,
    ]),
    AuthModule,
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
