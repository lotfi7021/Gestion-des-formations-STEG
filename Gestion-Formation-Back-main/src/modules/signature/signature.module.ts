import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Signature } from '../../entities/signature.entity';
import { DocumentSigne } from '../../entities/document-signe.entity';
import { User } from '../../entities/user.entity';
import { Session } from '../../entities/session.entity';
import { Formation } from '../../entities/formation.entity';
import { SignatureController } from './signature.controller';
import { SignatureService } from './signature.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Signature, DocumentSigne, User, Session, Formation]),
    AuthModule,
    NotificationModule,
  ],
  controllers: [SignatureController],
  providers: [SignatureService],
  exports: [SignatureService],
})
export class SignatureModule {}
