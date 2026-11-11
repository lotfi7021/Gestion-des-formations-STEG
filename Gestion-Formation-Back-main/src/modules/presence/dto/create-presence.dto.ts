import { IsString, IsEnum, IsOptional, IsBoolean, IsUUID, IsDateString } from 'class-validator';
import { PresenceStatus } from '../../../common/enums';

export class CreatePresenceDto {
  @IsDateString()
  datePresence: string;

  @IsOptional()
  @IsEnum(PresenceStatus)
  statutFormation?: PresenceStatus;

  @IsOptional()
  @IsEnum(PresenceStatus)
  statutCantine?: PresenceStatus;

  @IsOptional()
  @IsString()
  heureArrivee?: string;

  @IsOptional()
  @IsString()
  heureDepart?: string;

  @IsOptional()
  @IsString()
  commentaire?: string;

  @IsOptional()
  @IsBoolean()
  isJustified?: boolean;

  @IsOptional()
  @IsString()
  justificatifUrl?: string;

  @IsUUID()
  employeId: string;

  @IsUUID()
  sessionId: string;
}
