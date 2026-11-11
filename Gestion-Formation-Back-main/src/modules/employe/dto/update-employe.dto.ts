import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateEmployeDto } from './create-employe.dto';

export class UpdateEmployeDto extends PartialType(
  OmitType(CreateEmployeDto, ['email'] as const),
) {}
