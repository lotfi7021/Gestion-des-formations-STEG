import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { Formation } from '../../entities/formation.entity';
import { Session } from '../../entities/session.entity';
import { Inscription } from '../../entities/inscription.entity';
import { User } from '../../entities/user.entity';
import { Evaluation } from '../../entities/evaluation.entity';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Formation, Session, Inscription, User, Evaluation]),
    AuthModule,
    MailModule,
  ],
  controllers: [ChatbotController],
  providers: [ChatbotService],
})
export class ChatbotModule {}
