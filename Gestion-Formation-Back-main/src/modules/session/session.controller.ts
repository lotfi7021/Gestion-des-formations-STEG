import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Res, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';
import { SessionService } from './session.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { ManualJwtGuard } from '../auth/guards/manual-jwt.guard';
import { CabinetOrAdminGuard } from '../auth/guards/cabinet-or-admin.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { User } from '../../entities/user.entity';

function isUUID(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

@Controller('sessions')
export class SessionController {
  constructor(
    private readonly sessionService: SessionService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  private async resolveCabinetId(req: any, queryCabinetId?: string): Promise<string | undefined> {
    if (queryCabinetId && typeof queryCabinetId === 'string' && isUUID(queryCabinetId)) return queryCabinetId;
    if (req.user?.role === 'cabinet' && req.user?.email) {
      const u = await this.userRepo.findOne({ where: { email: req.user.email } });
      const uid = u?.id;
      return uid && isUUID(uid) ? uid : undefined;
    }
    return undefined;
  }

  @Post()
  @UseGuards(ManualJwtGuard, CabinetOrAdminGuard)
  async create(@Body() dto: CreateSessionDto, @Req() req: any) {
    const cabinetId = await this.resolveCabinetId(req);
    return this.sessionService.create({ ...dto, cabinetId });
  }

  @Get()
  @UseGuards(ManualJwtGuard)
  async findAll(@Req() req: any, @Query('cabinetId') queryCabinetId?: string, @Query('all') all?: string) {
    const cabinetId = await this.resolveCabinetId(req, queryCabinetId);
    return this.sessionService.findAll(cabinetId, all === 'true');
  }

  @Get('mine')
  @UseGuards(ManualJwtGuard)
  findMine(@Req() req: any, @Query('type') type?: string) {
    return this.sessionService.findMySessions(req.user.sub, req.user.role, type);
  }

  @Get(':id')
  @UseGuards(ManualJwtGuard)
  findOne(@Param('id') id: string) {
    return this.sessionService.findOne(id);
  }

  @Post(':id/enroll')
  @UseGuards(ManualJwtGuard)
  enroll(@Param('id') id: string, @Req() req: any) {
    return this.sessionService.enroll(id, req.user.sub);
  }

  @Get(':id/presence-list')
  @UseGuards(ManualJwtGuard, CabinetOrAdminGuard)
  async presenceList(@Param('id') id: string, @Res() res: Response) {
    const { buffer, titre } = await this.sessionService.generatePresenceList(id);
    const sanitized = titre.replace(/[^a-zA-Z0-9]/g, '_');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="feuille_presence_${sanitized}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Patch(':id')
  @UseGuards(ManualJwtGuard, CabinetOrAdminGuard)
  update(@Param('id') id: string, @Body() dto: UpdateSessionDto) {
    return this.sessionService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ManualJwtGuard, CabinetOrAdminGuard)
  remove(@Param('id') id: string) {
    return this.sessionService.remove(id);
  }

  @Post(':id/clone')
  @UseGuards(ManualJwtGuard, AdminGuard)
  async clone(@Param('id') id: string) {
    return this.sessionService.cloneForPlatform(id);
  }
}
