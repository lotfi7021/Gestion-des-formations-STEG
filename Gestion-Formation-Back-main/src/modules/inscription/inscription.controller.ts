import { Body, Controller, Get, Patch, Delete, Param, UseGuards, Req, Post } from '@nestjs/common';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { InscriptionService } from './inscription.service';
import { ManualJwtGuard } from '../auth/guards/manual-jwt.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

export class AdminEnrollDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  sessionId: string;

  /** Si true, l'inscription est créée directement PAYE (admin encaisse lui-même). */
  @IsOptional()
  @IsString()
  paid?: string;
}

@Controller('inscriptions')
export class InscriptionController {
  constructor(private readonly inscriptionService: InscriptionService) {}

  @Get('pending')
  @UseGuards(ManualJwtGuard, AdminGuard)
  findPending() {
    return this.inscriptionService.findAllPending();
  }

  @Get('confirmed')
  @UseGuards(ManualJwtGuard, AdminGuard)
  findConfirmed() {
    return this.inscriptionService.findAllConfirmed();
  }

  @Get('mine')
  @UseGuards(ManualJwtGuard)
  findMine(@Req() req: any) {
    return this.inscriptionService.findMine(req.user.sub);
  }

  /**
   * POST /inscriptions/admin
   * L'admin inscrit directement un utilisateur (participant/employé) à une session.
   * paid=true → inscription créée d'emblée PAYE (pas de passage par la case paiement).
   */
  @Post('admin')
  @UseGuards(ManualJwtGuard, AdminGuard)
  adminEnroll(@Body() dto: AdminEnrollDto, @Req() req: any) {
    return this.inscriptionService.adminEnroll(
      dto.userId,
      dto.sessionId,
      req.user.sub,
      dto.paid === 'true' || dto.paid === '1',
    );
  }

  @Patch(':id/confirm-payment')
  @UseGuards(ManualJwtGuard, AdminGuard)
  confirmPayment(@Param('id') id: string, @Req() req: any) {
    return this.inscriptionService.confirmPayment(id, req.user.sub);
  }

  @Delete(':id/reject')
  @UseGuards(ManualJwtGuard, AdminGuard)
  reject(@Param('id') id: string) {
    return this.inscriptionService.reject(id);
  }
}
