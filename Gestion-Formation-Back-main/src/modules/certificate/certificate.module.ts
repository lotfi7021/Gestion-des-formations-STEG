import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Certificate } from '../../entities/certificate.entity';
import { DocumentSigne } from '../../entities/document-signe.entity';
import { Signature } from '../../entities/signature.entity';
import { User } from '../../entities/user.entity';
import { Formation } from '../../entities/formation.entity';
import { Session } from '../../entities/session.entity';
import { CertificateController } from './certificate.controller';
import { CertificateService } from './certificate.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Certificate, DocumentSigne, Signature, User, Formation, Session]),
    AuthModule,
    NotificationModule,
  ],
  controllers: [CertificateController],
  providers: [CertificateService],
  exports: [CertificateService],
})
export class CertificateModule {}
