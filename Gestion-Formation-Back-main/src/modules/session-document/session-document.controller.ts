import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Response } from 'express';
import { ManualJwtGuard } from '../auth/guards/manual-jwt.guard';
import { SessionDocumentService } from './session-document.service';
import * as fs from 'fs';

@Controller('sessions/:sessionId/documents')
export class SessionDocumentController {
  constructor(private readonly docService: SessionDocumentService) {}

  @Post('upload')
  @UseGuards(ManualJwtGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dest = join(__dirname, '..', '..', '..', 'uploads', 'session-docs');
          if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
          cb(null, dest);
        },
        filename: (_req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, unique + extname(file.originalname));
        },
      }),
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|webp|gif|pdf|pptx|ppt|doc|docx)$/i;
        if (allowed.test(extname(file.originalname))) {
          cb(null, true);
        } else {
          cb(new Error('Seuls les fichiers PDF, images, PPTX, DOC sont autorisés'), false);
        }
      },
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async upload(
    @Param('sessionId') sessionId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) throw new NotFoundException('Fichier requis');
    return this.docService.upload(sessionId, req.user.sub, file);
  }

  @Get()
  @UseGuards(ManualJwtGuard)
  async findAll(@Param('sessionId') sessionId: string, @Req() req: any) {
    return this.docService.findAll(sessionId, req.user.sub);
  }

  @Get(':id/download')
  @UseGuards(ManualJwtGuard)
  async download(
    @Param('sessionId') sessionId: string,
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const doc = await this.docService.findOne(id, req.user.sub);
    const filePath = join(__dirname, '..', '..', '..', 'uploads', 'session-docs', doc.filename);
    if (!fs.existsSync(filePath)) throw new NotFoundException('Fichier introuvable');
    res.download(filePath, doc.originalName);
  }
}
