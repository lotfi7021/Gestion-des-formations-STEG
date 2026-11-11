import { IsString, IsEmail, IsOptional, IsArray, ValidateNested, IsNumber, Min, Max, Matches } from 'class-validator';
import { Type } from 'class-transformer';

class DisponibiliteDto {
  @IsString()
  jour: string;

  @IsString()
  heureDebut: string;

  @IsString()
  heureFin: string;
}

export class CreateFormateurDto {
  @IsString()
  nom: string;

  @IsString()
  prenom: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\+216)?\d{8}$/, { message: 'Numéro invalide (ex: +216XXXXXXXX)' })
  telephone?: string;

  @IsOptional()
  @IsString()
  qualifications?: string;

  @IsOptional()
  @IsString()
  specialites?: string;

  @IsOptional()
  @IsString()
  biographie?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DisponibiliteDto)
  disponibilites?: DisponibiliteDto[];

  @IsOptional()
  @IsString()
  cvUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  noteGlobale?: number;
}
