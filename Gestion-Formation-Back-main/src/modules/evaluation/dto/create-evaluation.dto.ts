import { IsNumber, IsString, IsOptional, IsBoolean, IsUUID, IsDateString, Min, Max } from 'class-validator';

export class CreateEvaluationDto {
  @IsNumber()
  @Min(0)
  @Max(5)
  note: number;

  @IsOptional()
  @IsString()
  commentaire?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  noteContenu?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  notePedagogie?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  noteSupports?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  noteOrganisation?: number;

  @IsOptional()
  @IsBoolean()
  recommande?: boolean;

  @IsDateString()
  dateEvaluation: string;

  @IsUUID()
  formateurId: string;

  @IsUUID()
  sessionId: string;

  @IsUUID()
  participantId: string;

  // --- Champs du formulaire détaillé ---

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4)
  noteObjectifClarte?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4)
  noteUtilite?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4)
  noteDureeRythme?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4)
  noteConfortSalle?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4)
  noteEquipements?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4)
  noteMaitriseSujet?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4)
  noteClarteExplications?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4)
  noteAnimation?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4)
  noteCapaciteReponse?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4)
  noteSatisfactionGlobale?: number;

  @IsOptional()
  @IsString()
  pointsForts?: string;

  @IsOptional()
  @IsString()
  pointsAmeliorer?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  noteCfpStir?: number;
}
