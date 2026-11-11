import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';
import { ManualJwtGuard } from '../auth/guards/manual-jwt.guard';

@Controller('evaluations')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @UseGuards(ManualJwtGuard)
  @Post()
  create(@Body() dto: CreateEvaluationDto) {
    return this.evaluationService.create(dto);
  }

  @UseGuards(ManualJwtGuard)
  @Get()
  findAll(@Query('formationId') formationId?: string, @Query('formateurId') formateurId?: string, @Query('sessionId') sessionId?: string, @Query('participantId') participantId?: string) {
    return this.evaluationService.findAll(formationId, formateurId, sessionId, participantId);
  }

  @UseGuards(ManualJwtGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.evaluationService.findOne(id);
  }

  @UseGuards(ManualJwtGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEvaluationDto) {
    return this.evaluationService.update(id, dto);
  }

  @UseGuards(ManualJwtGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.evaluationService.remove(id);
  }
}
