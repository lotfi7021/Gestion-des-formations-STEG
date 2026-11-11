import { IsString, IsEnum, IsOptional, IsBoolean, IsObject, IsUUID } from 'class-validator';
import { NotificationType } from '../../../common/enums';

export class CreateNotificationDto {
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  titre: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @IsString()
  lienAction?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsUUID()
  userId: string;
}
