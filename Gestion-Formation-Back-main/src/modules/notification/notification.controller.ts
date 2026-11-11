import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { ManualJwtGuard } from '../auth/guards/manual-jwt.guard';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  create(@Body() dto: CreateNotificationDto) {
    return this.notificationService.create(dto);
  }

  @Get()
  @UseGuards(ManualJwtGuard)
  findMine(@Req() req: any) {
    return this.notificationService.findByUser(req.user.sub);
  }

  @Get('user/:userId')
  @UseGuards(ManualJwtGuard)
  findByUser(@Param('userId') userId: string) {
    return this.notificationService.findByUser(userId);
  }

  @Get(':id')
  @UseGuards(ManualJwtGuard)
  findOne(@Param('id') id: string) {
    return this.notificationService.findOne(id);
  }

  @Patch(':id/read')
  @UseGuards(ManualJwtGuard)
  markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }

  @Patch(':id')
  @UseGuards(ManualJwtGuard)
  update(@Param('id') id: string, @Body() dto: UpdateNotificationDto) {
    return this.notificationService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ManualJwtGuard)
  remove(@Param('id') id: string) {
    return this.notificationService.remove(id);
  }
}
