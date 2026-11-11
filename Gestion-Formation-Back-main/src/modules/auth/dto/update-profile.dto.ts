import { IsString, IsOptional, MinLength, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  username?: string;

  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  prenom?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\+216)?\d{8}$/, { message: 'Numéro invalide (ex: +216XXXXXXXX)' })
  telephone?: string;
}
