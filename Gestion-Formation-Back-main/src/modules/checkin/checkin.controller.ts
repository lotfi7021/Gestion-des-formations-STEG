import { Controller, Get, Post, Param, Req, UseGuards } from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { ManualJwtGuard } from '../auth/guards/manual-jwt.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('check-in')
@UseGuards(ManualJwtGuard)
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  @Get(':token')
  getInfo(@Param('token') token: string, @Req() req: any) {
    return this.checkinService.getInfo(token, req.user.sub);
  }

  @Post(':token')
  checkIn(@Param('token') token: string, @Req() req: any) {
    return this.checkinService.checkIn(token, req.user.sub);
  }
}

@Controller('sessions')
@UseGuards(ManualJwtGuard, AdminGuard)
export class SessionCheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  @Get(':id/check-in')
  getAdminInfo(@Param('id') id: string) {
    return this.checkinService.getAdminInfo(id);
  }

  @Post(':id/convocation')
  sendConvocations(@Param('id') id: string) {
    return this.checkinService.sendConvocations(id);
  }
}
