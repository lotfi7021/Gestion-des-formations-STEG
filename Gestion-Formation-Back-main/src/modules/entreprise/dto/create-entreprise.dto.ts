import { IsString, IsEmail, IsOptional, Matches } from 'class-validator';

export class CreateEntrepriseDto {
  @IsString()
  nom: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\+216)?\d{8}$/, { message: 'Numéro invalide (ex: +216XXXXXXXX)' })
  telephone?: string;

  @IsOptional()
  @IsString()
  localisation?: string;

  @IsOptional()
  @IsString()
  codeDirection?: string;

  @IsOptional()
  @IsString()
  typeDirection?: string;
}
