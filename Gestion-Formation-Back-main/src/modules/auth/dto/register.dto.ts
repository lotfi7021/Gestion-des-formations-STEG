import { IsString, IsEmail, IsOptional, IsEnum, MinLength } from 'class-validator';
import { UserRole } from '../../../common/enums';

export class RegisterDto {
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
}
