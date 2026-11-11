import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import * as fs from 'fs';
import { SignatureService } from './signature.service';
import { SaveSignatureDto } from './dto/save-signature.dto';
import { ManualJwtGuard } from '../auth/guards/manual-jwt.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('signatures')
export class SignatureController {
  constructor(private readonly signatureService: SignatureService) {}

  @Post()
  @UseGuards(ManualJwtGuard)
  saveSignature(@Req() req: any, @Body() dto: SaveSignatureDto) {
    return this.signatureService.saveSignature(req.user.sub, dto);
  }

  @Get('mine')
  @UseGuards(ManualJwtGuard)
  getMySignatures(@Req() req: any) {
    return this.signatureService.getMySignatures(req.user.sub);
  }

  @Get('latest')
  @UseGuards(ManualJwtGuard)
  getLatestSignature(@Req() req: any) {
    return this.signatureService.getLatestSignature(req.user.sub);
  }

  @Get('all')
  @UseGuards(ManualJwtGuard, AdminGuard)
  getAllSignatures() {
    return this.signatureService.getAllSignatures();
  }

  @Patch(':id/verify')
  @UseGuards(ManualJwtGuard, AdminGuard)
  verifySignature(@Param('id') id: string, @Req() req: any) {
    return this.signatureService.verifySignature(id, req.user.sub);
  }

  @Delete(':id')
  @UseGuards(ManualJwtGuard)
  deleteSignature(@Param('id') id: string) {
    return this.signatureService.deleteSignature(id);
  }

  @Post('generate-convention/:sessionId/:participantId')
  @UseGuards(ManualJwtGuard, AdminGuard)
  generateConvention(
    @Param('sessionId') sessionId: string,
    @Param('participantId') participantId: string,
    @Req() req: any,
  ) {
    return this.signatureService.generateConvention(sessionId, participantId, req.user.sub);
  }

  @Post('generate-contrat/:sessionId/:formateurId')
  @UseGuards(ManualJwtGuard, AdminGuard)
  generateContratFormateur(
    @Param('sessionId') sessionId: string,
    @Param('formateurId') formateurId: string,
    @Req() req: any,
  ) {
    return this.signatureService.generateContratFormateur(sessionId, formateurId, req.user.sub);
  }

  @Post('generate-emargement/:sessionId')
  @UseGuards(ManualJwtGuard, AdminGuard)
  generateFeuilleEmargement(
    @Param('sessionId') sessionId: string,
    @Req() req: any,
  ) {
    return this.signatureService.generateFeuilleEmargement(sessionId, req.user.sub);
  }

  @Get('documents')
  @UseGuards(ManualJwtGuard, AdminGuard)
  getAllDocuments() {
    return this.signatureService.getAllDocumentsSignes();
  }

  @Get('documents/mine')
  @UseGuards(ManualJwtGuard)
  getMyDocuments(@Req() req: any) {
    return this.signatureService.getDocumentsSignesByUser(req.user.sub);
  }

  @Get('documents/session/:sessionId')
  @UseGuards(ManualJwtGuard)
  getDocumentsBySession(@Param('sessionId') sessionId: string) {
    return this.signatureService.getDocumentsSignesBySession(sessionId);
  }

  @Get('documents/:id')
  @UseGuards(ManualJwtGuard)
  getDocument(@Param('id') id: string) {
    return this.signatureService.getDocumentSigne(id);
  }

  @Get('documents/:id/download')
  @UseGuards(ManualJwtGuard)
  async downloadDocument(@Param('id') id: string, @Res() res: Response) {
    const doc = await this.signatureService.getDocumentSigne(id);
    const filePath = join(__dirname, '..', '..', '..', doc.fileUrl);
    if (!fs.existsSync(filePath)) throw new NotFoundException('Fichier introuvable');
    const sanitized = doc.titre.replace(/[^a-zA-Z0-9]/g, '_');
    res.download(filePath, `${sanitized}.pdf`);
  }
}
