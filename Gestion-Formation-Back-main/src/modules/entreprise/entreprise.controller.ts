import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EntrepriseService } from './entreprise.service';
import { CreateEntrepriseDto } from './dto/create-entreprise.dto';
import { UpdateEntrepriseDto } from './dto/update-entreprise.dto';

@Controller('entreprises')
export class EntrepriseController {
  constructor(private readonly entrepriseService: EntrepriseService) {}

  @Post()
  create(@Body() dto: CreateEntrepriseDto) {
    return this.entrepriseService.create(dto);
  }

  @Get()
  findAll() {
    return this.entrepriseService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.entrepriseService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEntrepriseDto) {
    return this.entrepriseService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.entrepriseService.remove(id);
  }
}
