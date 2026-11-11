import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsUUID, IsDateString, Min, Max } from 'class-validator';
import { CertificateStatus } from '../../../common/enums';

export class CreateCertificateDto {
  @IsString()
  numeroCertificat: string;

  @IsDateString()
  dateEmission: string;

  @IsOptional()
  @IsDateString()
  dateExpiration?: string;

  @IsOptional()
  @IsEnum(CertificateStatus)
  statut?: CertificateStatus;

  @IsOptional()
  @IsString()
  qrCode?: string;

  @IsOptional()
  @IsString()
  signatureElectronique?: string;

  @IsOptional()
  @IsString()
  certificatUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  noteObtenue?: number;

  @IsOptional()
  @IsBoolean()
  isValidated?: boolean;

  @IsOptional()
  @IsString()
  validatedBy?: string;

  @IsUUID()
  employeId: string;

  @IsUUID()
  formationId: string;

  @IsUUID()
  sessionId: string;
}
