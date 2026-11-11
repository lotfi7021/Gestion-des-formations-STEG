import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Création d'un participant / employé STEG (compte User role=employe|participant).
 * Les champs STEG (poste, département, direction) sont portés par l'entité User.
 */
export class CreateParticipantDto {
  @IsString()
  @MaxLength(255)
  nom: string;

  @IsString()
  @MaxLength(255)
  prenom: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
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
}
