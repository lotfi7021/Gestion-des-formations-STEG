import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { typeOrmConfig } from './config/typeorm.config';
import { User } from './entities/user.entity';
import { Entreprise } from './entities/entreprise.entity';
import { Formation } from './entities/formation.entity';
import { SeedService } from './seed/seed.service';
import { FormationModule } from './modules/formation/formation.module';
import { SessionModule } from './modules/session/session.module';
import { UserModule } from './modules/user/user.module';
import { EntrepriseModule } from './modules/entreprise/entreprise.module';
import { PresenceModule } from './modules/presence/presence.module';
import { CertificateModule } from './modules/certificate/certificate.module';
import { NotificationModule } from './modules/notification/notification.module';
import { EvaluationModule } from './modules/evaluation/evaluation.module';
import { AuthModule } from './modules/auth/auth.module';
import { FormateurModule } from './modules/formateur/formateur.module';
import { EmployeModule } from './modules/employe/employe.module';
import { InscriptionModule } from './modules/inscription/inscription.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { SessionDocumentModule } from './modules/session-document/session-document.module';
import { ChatbotModule } from './modules/chatbot/chatbot.module';
import { SignatureModule } from './modules/signature/signature.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(typeOrmConfig),
    TypeOrmModule.forFeature([User, Entreprise, Formation]),
    FormationModule,
    SessionModule,
    UserModule,
    FormateurModule,
    EmployeModule,
    EntrepriseModule,
    PresenceModule,
    CertificateModule,
    NotificationModule,
    EvaluationModule,
    AuthModule,
    InscriptionModule,
    TasksModule,
    SessionDocumentModule,
    ChatbotModule,
    SignatureModule,
  ],
  controllers: [AppController],
  providers: [AppService, SeedService],
})
export class AppModule {}
