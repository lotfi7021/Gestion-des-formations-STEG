import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Session } from '../../entities/session.entity';
import { Certificate } from '../../entities/certificate.entity';
import { Presence } from '../../entities/presence.entity';
import { Evaluation } from '../../entities/evaluation.entity';
import { SessionDocument } from '../../entities/session-document.entity';
import { Inscription } from '../../entities/inscription.entity';
import { Formation } from '../../entities/formation.entity';
import { User } from '../../entities/user.entity';

import { AuthModule } from '../auth/auth.module';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { RagService } from './rag/rag.service';
import { EmbeddingsService } from './rag/embeddings.service';

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
      User,
    ]),
    AuthModule,
  ],
  controllers: [AiController],
  providers: [AiService, RagService, EmbeddingsService],
  exports: [AiService],
})
export class AiModule {}
