import { IsOptional, IsString } from 'class-validator';

export class GenerateSessionSummaryDto {
  /** Contexte additionnel optionnel fourni par l'admin/formateur avant génération */
  @IsOptional()
  @IsString()
  additionalContext?: string;
}
