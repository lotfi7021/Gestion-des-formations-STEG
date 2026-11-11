import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';

@Controller('evaluations')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Post()
  create(@Body() dto: CreateEvaluationDto) {
    return this.evaluationService.create(dto);
  }

  @Get()
  findAll(@Query('formationId') formationId?: string, @Query('formateurId') formateurId?: string, @Query('cabinetId') cabinetId?: string, @Query('sessionId') sessionId?: string, @Query('participantId') participantId?: string) {
    return this.evaluationService.findAll(formationId, formateurId, cabinetId, sessionId, participantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.evaluationService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEvaluationDto) {
    return this.evaluationService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.evaluationService.remove(id);
  }
}
