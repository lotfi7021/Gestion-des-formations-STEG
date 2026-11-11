import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EmployeService } from './employe.service';
import { CreateEmployeDto } from './dto/create-employe.dto';
import { UpdateEmployeDto } from './dto/update-employe.dto';

@Controller('employes')
export class EmployeController {
  constructor(private readonly employeService: EmployeService) {}

  @Post()
  create(@Body() dto: CreateEmployeDto) {
    return this.employeService.create(dto);
  }

  @Get()
  findAll() {
    return this.employeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeDto) {
    return this.employeService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.employeService.remove(id);
  }
}
