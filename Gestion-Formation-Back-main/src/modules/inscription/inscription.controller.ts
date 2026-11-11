import { Controller, Get, Post, Patch, Delete, Param, UseGuards, Req } from '@nestjs/common';
import { InscriptionService } from './inscription.service';
import { ManualJwtGuard } from '../auth/guards/manual-jwt.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

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
