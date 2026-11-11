import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile, Req, Query, ForbiddenException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { FormationService } from './formation.service';
import { CreateFormationDto } from './dto/create-formation.dto';
import { UpdateFormationDto } from './dto/update-formation.dto';
import { AskFormationDto } from '../ai/dto/ask-formation.dto';
import { AiService } from '../ai/ai.service';
import { ManualJwtGuard } from '../auth/guards/manual-jwt.guard';
import { OptionalJwtGuard } from '../auth/guards/optional-jwt.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('formations')
export class FormationController {
  constructor(
    private readonly formationService: FormationService,
    private readonly aiService: AiService,
  ) {}

  @Post()
  @UseGuards(ManualJwtGuard, AdminGuard)
  async create(@Body() dto: CreateFormationDto) {
    return this.formationService.create(dto);
  }

  @Get()
  @UseGuards(OptionalJwtGuard)
  async findAll(@Query('all') all?: string) {
    return this.formationService.findAll(all === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.formationService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(ManualJwtGuard, AdminGuard)
  update(@Param('id') id: string, @Body() dto: UpdateFormationDto) {
    return this.formationService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ManualJwtGuard, AdminGuard)
  remove(@Param('id') id: string) {
    return this.formationService.remove(id);
  }

  /**
   * GET /formations/:id/ai-summary
   * Génère un résumé IA de la formation à partir de ses documents de session.
   * Accessible aux participants et employés inscrits uniquement.
   */
  @Get(':id/ai-summary')
  @UseGuards(ManualJwtGuard)
  async getAiSummary(@Param('id') id: string, @Req() req: any) {
    if (!['participant', 'employe'].includes(req.user?.role)) {
      throw new ForbiddenException('Seuls les participants peuvent utiliser l\'assistant IA');
    }
    return this.aiService.generateFormationSummary(id, req.user.sub);
  }

  /**
   * POST /formations/:id/ai-ask
   * Répond à une question libre sur la formation (RAG scopé aux documents).
   * Accessible aux participants et employés inscrits uniquement.
   */
  @Post(':id/ai-ask')
  @UseGuards(ManualJwtGuard)
  async askQuestion(@Param('id') id: string, @Body() dto: AskFormationDto, @Req() req: any) {
    if (!['participant', 'employe'].includes(req.user?.role)) {
      throw new ForbiddenException('Seuls les participants peuvent utiliser l\'assistant IA');
    }
    return this.aiService.askFormationQuestion(id, dto.question, req.user.sub);
  }

  @Post(':id/upload')
  @UseGuards(ManualJwtGuard, AdminGuard)
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
  @UseGuards(ManualJwtGuard, AdminGuard)
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
  @UseGuards(ManualJwtGuard, AdminGuard)
  async removeSupport(@Param('id') id: string, @Param('index') index: string) {
    return this.formationService.removeSupport(id, parseInt(index));
  }
}
