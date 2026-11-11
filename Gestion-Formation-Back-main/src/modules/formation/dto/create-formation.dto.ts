import { IsString, IsOptional, IsNumber, IsEnum, IsBoolean, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { FormationType } from '../../../common/enums';

class SupportFormationDto {
  @IsString()
  nom: string;

  @IsString()
  url: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class CreateFormationDto {
  @IsString()
  titre: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  objectifs?: string;

  @IsOptional()
  @IsString()
  prerequis?: string;

  @IsOptional()
  @IsString()
  categorie?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tarif?: number;

  @IsEnum(FormationType)
  type: FormationType;

  @IsOptional()
  @IsString()
  programme?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  dureeEnHeures?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  dureeEnJours?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  capaciteMax?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupportFormationDto)
  supportsFormation?: SupportFormationDto[];

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
