import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ManualJwtGuard } from './guards/manual-jwt.guard';
import { AdminGuard } from './guards/admin.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @UseGuards(ManualJwtGuard)
  @Get('profile')
  async getProfile(@Req() req: any) {
    return this.authService.getProfile(req.user.sub);
  }

  @UseGuards(ManualJwtGuard)
  @Patch('profile')
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.sub, dto);
  }

  @UseGuards(ManualJwtGuard)
  @Post('change-password')
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.sub, dto.currentPassword, dto.newPassword);
  }

  @UseGuards(ManualJwtGuard, AdminGuard)
  @Get('pending-users')
  async getPendingUsers() {
    return this.authService.getPendingUsers();
  }

  @UseGuards(ManualJwtGuard, AdminGuard)
  @Patch('approve/:id')
  async approveUser(@Param('id') id: string) {
    return this.authService.approveUser(id);
  }

  @UseGuards(ManualJwtGuard, AdminGuard)
  @Delete('reject/:id')
  async rejectUser(@Param('id') id: string) {
    return this.authService.rejectUser(id);
  }

  @UseGuards(ManualJwtGuard)
  @Post('logout')
  async logout(@Req() req: any) {
    return this.authService.logout(req.user.sub);
  }

  @UseGuards(ManualJwtGuard)
  @Post('upload-avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(__dirname, '..', '..', '..', 'uploads', 'avatars'),
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, 'avatar-' + uniqueSuffix + extname(file.originalname));
        },
      }),
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowed.includes(file.mimetype)) {
          cb(new Error('Seules les images JPG, PNG, WebP et GIF sont acceptées'), false);
        } else {
          cb(null, true);
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    return this.authService.updateAvatar(req.user.sub, `/uploads/avatars/${file.filename}`);
  }
}
