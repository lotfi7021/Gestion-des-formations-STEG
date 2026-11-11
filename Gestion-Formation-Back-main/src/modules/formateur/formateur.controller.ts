import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile, Req, Query, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { UserService } from '../user/user.service';
import { CreateFormateurDto } from './dto/create-formateur.dto';
import { UpdateFormateurDto } from './dto/update-formateur.dto';
import { ManualJwtGuard } from '../auth/guards/manual-jwt.guard';
import { OptionalJwtGuard } from '../auth/guards/optional-jwt.guard';
import { CabinetOrAdminGuard } from '../auth/guards/cabinet-or-admin.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('formateurs')
export class FormateurController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @UseGuards(ManualJwtGuard, CabinetOrAdminGuard)
  async create(@Body() dto: CreateFormateurDto, @Req() req: any) {
    let cabinetId: string | undefined;
    if (req.user?.role === 'cabinet' && req.user?.email) {
      cabinetId = await this.userService.resolveCabinetId(req.user.email);
    }
    return this.userService.createFormateur({ ...dto, cabinetId });
  }

  @Get()
  @UseGuards(OptionalJwtGuard)
  async findAll(@Req() req: any, @Query('cabinetId') queryCabinetId?: string, @Query('all') all?: string) {
    let cabinetId: string | undefined;
    if (all === 'true') {
      // return all formateurs (admin KPI use case)
    } else if (queryCabinetId && typeof queryCabinetId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(queryCabinetId)) {
      cabinetId = queryCabinetId;
    } else if (req.user?.role === 'cabinet' && req.user?.email) {
      cabinetId = await this.userService.resolveCabinetId(req.user.email);
    }
    return this.userService.findAllFormateurs(cabinetId, all === 'true');
  }

  @Get(':id')
  @UseGuards(ManualJwtGuard, CabinetOrAdminGuard)
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(ManualJwtGuard, CabinetOrAdminGuard)
  update(@Param('id') id: string, @Body() dto: UpdateFormateurDto) {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ManualJwtGuard, CabinetOrAdminGuard)
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }

  @Post(':id/clone')
  @UseGuards(ManualJwtGuard, AdminGuard)
  async clone(@Param('id') id: string) {
    return this.userService.cloneFormateurForPlatform(id);
  }

  private readonly documentFields: Record<string, string> = {
    cv: 'cvUrl',
    programme: 'programmeUrl',
    'modele-cnfcpp': 'modeleCnfcppUrl',
    'feuille-presence': 'feuillePresenceUrl',
    attestation: 'attestationUrl',
  };

  @Post(':id/upload-document/:type')
  @UseGuards(ManualJwtGuard, CabinetOrAdminGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(__dirname, '..', '..', '..', 'uploads', 'formateurs'),
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          cb(new BadRequestException('Seuls les fichiers PDF sont acceptés'), false);
        } else {
          cb(null, true);
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadDocument(
    @Param('id') id: string,
    @Param('type') type: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const field = this.documentFields[type];
    if (!field) throw new BadRequestException(`Type de document invalide: ${type}`);
    return this.userService.updateDocumentUrl(id, field, `/uploads/formateurs/${file.filename}`);
  }
}
