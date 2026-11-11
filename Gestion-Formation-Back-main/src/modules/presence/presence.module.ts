import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Presence } from '../../entities/presence.entity';
import { User } from '../../entities/user.entity';
import { Session } from '../../entities/session.entity';
import { PresenceController } from './presence.controller';
import { PresenceService } from './presence.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Presence, User, Session]), AuthModule],
  controllers: [PresenceController],
  providers: [PresenceService],
  exports: [PresenceService],
})
export class PresenceModule {}
