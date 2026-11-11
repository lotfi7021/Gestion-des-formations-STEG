import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { GenerateSessionSummaryDto } from './dto/generate-session-summary.dto';
import { GenerateCertificateTextDto } from './dto/generate-certificate-text.dto';
import { ManualJwtGuard } from '../auth/guards/manual-jwt.guard';
import { CabinetOrAdminGuard } from '../auth/guards/cabinet-or-admin.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

/**
 * Endpoints de génération IA — appelés directement depuis le frontend.
 * Les mêmes fonctionnalités sont aussi exposées depuis session.controller et
 * certificate.controller pour la cohérence REST (voir tâches #5 et #6).
 */
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * POST /ai/sessions/:id/summary
   * Accessible aux admin, formateurs et cabinets.
   */
  @Post('sessions/:id/summary')
  @UseGuards(ManualJwtGuard, CabinetOrAdminGuard)
  generateSessionSummary(
    @Param('id') sessionId: string,
    @Body() dto: GenerateSessionSummaryDto,
  ) {
    return this.aiService.generateSessionSummary(sessionId, dto.additionalContext);
  }

  /**
   * POST /ai/certificates/:id/generate-text
   * Accessible aux admin uniquement (flux de validation de certificat).
   */
  @Post('certificates/:id/generate-text')
  @UseGuards(ManualJwtGuard, AdminGuard)
  generateCertificateText(
    @Param('id') certificateId: string,
    @Body() dto: GenerateCertificateTextDto,
  ) {
    return this.aiService.generateCertificateText(certificateId, dto.additionalMention);
  }
}
