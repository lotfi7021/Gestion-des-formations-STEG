import { IsString, MinLength, MaxLength } from 'class-validator';

export class AskFormationDto {
  @IsString()
  @MinLength(2, { message: 'La question doit contenir au moins 2 caractères' })
  @MaxLength(1000, { message: 'La question ne peut pas dépasser 1000 caractères' })
  question: string;
}
