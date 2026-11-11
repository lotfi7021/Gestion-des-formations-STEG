import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { CertificateService } from './certificate.service';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';
import { ManualJwtGuard } from '../auth/guards/manual-jwt.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AiService } from '../ai/ai.service';
import { GenerateCertificateTextDto } from '../ai/dto/generate-certificate-text.dto';
import * as fs from 'fs';
import { join } from 'path';

@Controller('certificates')
export class CertificateController {
  constructor(
    private readonly certificateService: CertificateService,
    private readonly aiService: AiService,
  ) {}

  @Post()
  create(@Body() dto: CreateCertificateDto) {
    return this.certificateService.create(dto);
  }

  @Get()
  findAll() {
    return this.certificateService.findAll();
  }

  @Get('mine')
  @UseGuards(ManualJwtGuard)
  findMine(@Req() req: any) {
    return this.certificateService.findByUser(req.user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.certificateService.findOne(id);
  }

  @Get(':id/download')
  @UseGuards(ManualJwtGuard)
  async download(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const cert = await this.certificateService.findOne(id);
    if (cert.user?.id !== req.user.sub && req.user.role !== 'admin') {
      throw new NotFoundException('Accès refusé');
    }
    const filePath = join(__dirname, '..', '..', '..', cert.certificatUrl);
    if (!fs.existsSync(filePath)) throw new NotFoundException('Fichier introuvable');
    const originalName = `certificat_${cert.formation?.titre?.replace(/[^a-zA-Z0-9]/g, '_') || 'formation'}.pdf`;
    res.download(filePath, originalName);
  }

  @Post('generate/:sessionId')
  @UseGuards(ManualJwtGuard, AdminGuard)
  generateForSession(@Param('sessionId') sessionId: string, @Req() req: any) {
    return this.certificateService.generateForSession(sessionId, req.user.sub);
  }

  @Post('regenerate/:id')
  @UseGuards(ManualJwtGuard, AdminGuard)
  regenerate(@Param('id') id: string) {
    return this.certificateService.regenerate(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCertificateDto) {
    return this.certificateService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.certificateService.remove(id);
  }

  // ─── IA : texte de certificat personnalisé ────────────────────────────────

  /**
   * POST /certificates/:id/generate-text
   * Génère via Claude un texte de certificat personnalisé pour le participant.
   * Retourne { text: string, isFallback: boolean } — le texte reste éditable
   * avant la génération finale du PDF.
   * Accessible aux admin uniquement.
   */
  @Post(':id/generate-text')
  @UseGuards(ManualJwtGuard, AdminGuard)
  generateText(
    @Param('id') id: string,
    @Body() dto: GenerateCertificateTextDto,
  ) {
    return this.aiService.generateCertificateText(id, dto.additionalMention);
  }
}
