import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PresenceService } from './presence.service';
import { CreatePresenceDto } from './dto/create-presence.dto';
import { UpdatePresenceDto } from './dto/update-presence.dto';

@Controller('presences')
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @Post()
  create(@Body() dto: CreatePresenceDto) {
    return this.presenceService.create(dto);
  }

  @Get()
  findAll() {
    return this.presenceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.presenceService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePresenceDto) {
    return this.presenceService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.presenceService.remove(id);
  }
}
