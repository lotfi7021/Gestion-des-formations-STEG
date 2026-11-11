import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, ForbiddenException, Sse } from '@nestjs/common';
import { Observable, interval, map, merge } from 'rxjs';
import { NotificationService } from './notification.service';
import { NotificationStreamService } from './notification-stream.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { ManualJwtGuard } from '../auth/guards/manual-jwt.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { UserRole } from '../../common/enums';

@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly streamService: NotificationStreamService,
  ) {}

  @UseGuards(ManualJwtGuard, AdminGuard)
  @Post()
  create(@Body() dto: CreateNotificationDto) {
    return this.notificationService.create(dto);
  }

  @Get()
  @UseGuards(ManualJwtGuard)
  findMine(@Req() req: any) {
    return this.notificationService.findByUser(req.user.sub);
  }

  /**
   * Flux temps réel (Server-Sent Events) des notifications de l'utilisateur.
   * Le front l'ouvre via fetch (header Authorization), pas via EventSource.
   */
  @Sse('stream')
  @UseGuards(ManualJwtGuard)
  stream(@Req() req: any): Observable<{ data: unknown }> {
    const notifications$ = this.streamService
      .subscribe(req.user.sub)
      .pipe(map((payload) => ({ data: payload })));
    const heartbeat$ = interval(25000).pipe(map(() => ({ data: { type: 'ping' } })));
    return merge(notifications$, heartbeat$);
  }

  @Get('user/:userId')
  @UseGuards(ManualJwtGuard)
  async findByUser(@Param('userId') userId: string, @Req() req: any) {
    this.assertOwnerOrAdmin(req, userId);
    return this.notificationService.findByUser(userId);
  }

  @Get(':id')
  @UseGuards(ManualJwtGuard)
  async findOne(@Param('id') id: string, @Req() req: any) {
    const notification = await this.notificationService.findOne(id);
    this.assertNotificationOwner(req, notification);
    return notification;
  }

  @Patch(':id/read')
  @UseGuards(ManualJwtGuard)
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const notification = await this.notificationService.findOne(id);
    this.assertNotificationOwner(req, notification);
    return this.notificationService.markAsRead(id);
  }

  @Patch(':id')
  @UseGuards(ManualJwtGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateNotificationDto, @Req() req: any) {
    const notification = await this.notificationService.findOne(id);
    this.assertNotificationOwner(req, notification);
    return this.notificationService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ManualJwtGuard)
  async remove(@Param('id') id: string, @Req() req: any) {
    const notification = await this.notificationService.findOne(id);
    this.assertNotificationOwner(req, notification);
    return this.notificationService.remove(id);
  }

  private isAdmin(req: any): boolean {
    return req.user?.role === UserRole.ADMIN;
  }

  private assertOwnerOrAdmin(req: any, ownerId?: string): void {
    if (!this.isAdmin(req) && req.user?.sub !== ownerId) {
      throw new ForbiddenException('Accès refusé à cette ressource');
    }
  }

  private assertNotificationOwner(req: any, notification: { user?: { id: string } }): void {
    this.assertOwnerOrAdmin(req, notification.user?.id);
  }
}
