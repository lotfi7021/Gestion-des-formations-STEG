import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { PresenceService } from './presence.service';
import { CreatePresenceDto } from './dto/create-presence.dto';
import { UpdatePresenceDto } from './dto/update-presence.dto';
import { ManualJwtGuard } from '../auth/guards/manual-jwt.guard';

@Controller('presences')
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @UseGuards(ManualJwtGuard)
  @Post()
  create(@Body() dto: CreatePresenceDto) {
    return this.presenceService.create(dto);
  }

  @UseGuards(ManualJwtGuard)
  @Get()
  findAll() {
    return this.presenceService.findAll();
  }

  /** Retourne les présences d'une session + taux de présence calculé */
  @UseGuards(ManualJwtGuard)
  @Get('session/:sessionId')
  findBySession(@Param('sessionId') sessionId: string) {
    return this.presenceService.findBySession(sessionId);
  }

  @UseGuards(ManualJwtGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.presenceService.findOne(id);
  }

  @UseGuards(ManualJwtGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePresenceDto) {
    return this.presenceService.update(id, dto);
  }

  @UseGuards(ManualJwtGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.presenceService.remove(id);
  }
}
