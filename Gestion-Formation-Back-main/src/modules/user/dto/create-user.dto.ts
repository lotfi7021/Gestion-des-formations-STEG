import { IsString, IsEmail, IsEnum, IsOptional, IsBoolean, MinLength, IsUUID } from 'class-validator';
import { UserRole } from '../../../common/enums';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsUUID()
  employeId?: string;

  @IsOptional()
  @IsUUID()
  formateurId?: string;
}
