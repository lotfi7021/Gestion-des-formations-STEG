import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionDocument } from '../../entities/session-document.entity';
import { Session } from '../../entities/session.entity';
import { User } from '../../entities/user.entity';
import { Employe } from '../../entities/employe.entity';
import { SessionDocumentController } from './session-document.controller';
import { SessionDocumentService } from './session-document.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([SessionDocument, Session, User, Employe]), AuthModule],
  controllers: [SessionDocumentController],
  providers: [SessionDocumentService],
})
export class SessionDocumentModule {}
