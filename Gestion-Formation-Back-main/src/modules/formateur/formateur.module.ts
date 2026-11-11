import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { FormateurController } from './formateur.controller';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [UserModule, AuthModule, MulterModule.register({})],
  controllers: [FormateurController],
})
export class FormateurModule {}
