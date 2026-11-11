import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile, Query, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { UserService } from '../user/user.service';
import { CreateFormateurDto } from './dto/create-formateur.dto';
import { UpdateFormateurDto } from './dto/update-formateur.dto';
import { ManualJwtGuard } from '../auth/guards/manual-jwt.guard';
import { OptionalJwtGuard } from '../auth/guards/optional-jwt.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('formateurs')
export class FormateurController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @UseGuards(ManualJwtGuard, AdminGuard)
  async create(@Body() dto: CreateFormateurDto) {
    return this.userService.createFormateur(dto);
  }

  @Get()
  @UseGuards(OptionalJwtGuard)
  async findAll(@Query('all') all?: string) {
    return this.userService.findAllFormateurs();
  }

  @Get(':id')
  @UseGuards(ManualJwtGuard, AdminGuard)
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(ManualJwtGuard, AdminGuard)
  update(@Param('id') id: string, @Body() dto: UpdateFormateurDto) {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ManualJwtGuard, AdminGuard)
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }

  private readonly documentFields: Record<string, string> = {
    cv: 'cvUrl',
    programme: 'programmeUrl',
    'modele-cnfcpp': 'modeleCnfcppUrl',
    'feuille-presence': 'feuillePresenceUrl',
    attestation: 'attestationUrl',
  };

  @Post(':id/upload-document/:type')
  @UseGuards(ManualJwtGuard, AdminGuard)
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
