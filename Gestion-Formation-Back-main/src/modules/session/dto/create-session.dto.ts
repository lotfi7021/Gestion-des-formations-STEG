import { IsString, IsOptional, IsBoolean, IsArray, IsUUID, IsDateString, IsInt, Min } from 'class-validator';

export class CreateSessionDto {
  @IsDateString()
  dateDebut: string;

  @IsDateString()
  dateFin: string;

  @IsOptional()
  @IsString()
  heureDebut?: string;

  @IsOptional()
  @IsString()
  heureFin?: string;

  @IsOptional()
  @IsString()
  lieu?: string;

  @IsOptional()
  @IsString()
  salle?: string;

  @IsOptional()
  @IsString()
  cvFormateurUrl?: string;

  @IsOptional()
  @IsString()
  factureUrl?: string;

  @IsOptional()
  @IsString()
  bonCommandeUrl?: string;

  @IsOptional()
  @IsString()
  contratUrl?: string;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @IsOptional()
  @IsBoolean()
  isCancelled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  capaciteMax?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsUUID()
  formationId: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  participantIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  employeIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  formateurIds?: string[];
}
