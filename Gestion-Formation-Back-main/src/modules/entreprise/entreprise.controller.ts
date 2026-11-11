import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { EntrepriseService } from './entreprise.service';
import { CreateEntrepriseDto } from './dto/create-entreprise.dto';
import { UpdateEntrepriseDto } from './dto/update-entreprise.dto';
import { ManualJwtGuard } from '../auth/guards/manual-jwt.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('entreprises')
export class EntrepriseController {
  constructor(private readonly entrepriseService: EntrepriseService) {}

  @UseGuards(ManualJwtGuard, AdminGuard)
  @Post()
  create(@Body() dto: CreateEntrepriseDto) {
    return this.entrepriseService.create(dto);
  }

  @UseGuards(ManualJwtGuard)
  @Get()
  findAll() {
    return this.entrepriseService.findAll();
  }

  @UseGuards(ManualJwtGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.entrepriseService.findOne(id);
  }

  @UseGuards(ManualJwtGuard, AdminGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEntrepriseDto) {
    return this.entrepriseService.update(id, dto);
  }

  @UseGuards(ManualJwtGuard, AdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.entrepriseService.remove(id);
  }
}
