import { PartialType } from '@nestjs/mapped-types';
import { CreateFormateurDto } from './create-formateur.dto';

export class UpdateFormateurDto extends PartialType(CreateFormateurDto) {}
