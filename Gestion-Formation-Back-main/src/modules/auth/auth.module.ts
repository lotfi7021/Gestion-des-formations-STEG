import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Employe } from '../../entities/employe.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AdminGuard } from './guards/admin.guard';
import { ManualJwtGuard } from './guards/manual-jwt.guard';
import { CabinetGuard } from './guards/cabinet.guard';
import { CabinetOrAdminGuard } from './guards/cabinet-or-admin.guard';
import { OptionalJwtGuard } from './guards/optional-jwt.guard';
import { MailModule } from '../mail/mail.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Employe]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
      signOptions: { expiresIn: '15m' },
    }),
    MailModule,
    forwardRef(() => NotificationModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AdminGuard, ManualJwtGuard, CabinetGuard, CabinetOrAdminGuard, OptionalJwtGuard],
  exports: [AuthService, JwtModule, AdminGuard, ManualJwtGuard, CabinetGuard, CabinetOrAdminGuard, OptionalJwtGuard],
})
export class AuthModule {}
