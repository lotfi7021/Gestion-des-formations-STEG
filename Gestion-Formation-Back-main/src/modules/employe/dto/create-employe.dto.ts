import { IsString, IsEmail, IsOptional, IsUUID, Matches } from 'class-validator';

export class CreateEmployeDto {
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
  poste?: string;

  @IsOptional()
  @IsString()
  departement?: string;

  @IsOptional()
  @IsString()
  directionText?: string;

  @IsOptional()
  @IsString()
  dateEmbauche?: string;

  @IsOptional()
  @IsUUID()
  entrepriseId?: string;
}
