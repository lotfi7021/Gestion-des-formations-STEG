import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Evaluation } from '../../entities/evaluation.entity';
import { User } from '../../entities/user.entity';
import { Session } from '../../entities/session.entity';
import { EvaluationController } from './evaluation.controller';
import { EvaluationService } from './evaluation.service';

@Module({
  imports: [TypeOrmModule.forFeature([Evaluation, User, Session])],
  controllers: [EvaluationController],
  providers: [EvaluationService],
  exports: [EvaluationService],
})
export class EvaluationModule {}
