import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile, Req, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormationService } from './formation.service';
import { CreateFormationDto } from './dto/create-formation.dto';
import { UpdateFormationDto } from './dto/update-formation.dto';
import { ManualJwtGuard } from '../auth/guards/manual-jwt.guard';
import { OptionalJwtGuard } from '../auth/guards/optional-jwt.guard';
import { CabinetOrAdminGuard } from '../auth/guards/cabinet-or-admin.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { User } from '../../entities/user.entity';

function isUUID(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

@Controller('formations')
export class FormationController {
  constructor(
    private readonly formationService: FormationService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  private async resolveCabinetId(req: any, queryCabinetId?: string): Promise<string | undefined> {
    if (queryCabinetId && typeof queryCabinetId === 'string' && isUUID(queryCabinetId)) return queryCabinetId;
    if (req.user?.role === 'cabinet' && req.user?.email) {
      const u = await this.userRepo.findOne({ where: { email: req.user.email } });
      const uid = u?.id;
      return uid && isUUID(uid) ? uid : undefined;
    }
    return undefined;
  }

  @Post()
  @UseGuards(ManualJwtGuard, CabinetOrAdminGuard)
  async create(@Body() dto: CreateFormationDto, @Req() req: any) {
    const cabinetId = await this.resolveCabinetId(req);
    return this.formationService.create({ ...dto, cabinetId });
  }

  @Get()
  @UseGuards(OptionalJwtGuard)
  async findAll(@Req() req: any, @Query('cabinetId') queryCabinetId?: string, @Query('all') all?: string) {
    const cabinetId = await this.resolveCabinetId(req, queryCabinetId);
    return this.formationService.findAll(cabinetId, all === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.formationService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(ManualJwtGuard, CabinetOrAdminGuard)
  update(@Param('id') id: string, @Body() dto: UpdateFormationDto) {
    return this.formationService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ManualJwtGuard, CabinetOrAdminGuard)
  remove(@Param('id') id: string) {
    return this.formationService.remove(id);
  }

  @Post(':id/clone')
  @UseGuards(ManualJwtGuard, AdminGuard)
  clone(@Param('id') id: string) {
    return this.formationService.cloneForPlatform(id);
  }

  @Post(':id/upload')
  @UseGuards(ManualJwtGuard, CabinetOrAdminGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(__dirname, '..', '..', '..', 'uploads', 'formations'),
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          cb(new Error('Seuls les fichiers PDF sont acceptés'), false);
        } else {
          cb(null, true);
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async upload(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.formationService.addSupport(id, {
      nom: file.originalname,
      url: `/uploads/formations/${file.filename}`,
      type: 'pdf',
    });
  }

  @Post(':id/upload-image')
  @UseGuards(ManualJwtGuard, CabinetOrAdminGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: join(__dirname, '..', '..', '..', 'uploads', 'formations'),
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, 'img-' + uniqueSuffix + extname(file.originalname));
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
  async uploadImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.formationService.updateImage(id, `/uploads/formations/${file.filename}`);
  }

  @Delete(':id/supports/:index')
  @UseGuards(ManualJwtGuard, CabinetOrAdminGuard)
  async removeSupport(@Param('id') id: string, @Param('index') index: string) {
    return this.formationService.removeSupport(id, parseInt(index));
  }
}
