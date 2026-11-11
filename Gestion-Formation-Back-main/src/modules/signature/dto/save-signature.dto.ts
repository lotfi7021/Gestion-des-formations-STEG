import { IsString, IsOptional } from 'class-validator';

export class SaveSignatureDto {
  @IsString()
  imageData: string;

  @IsOptional()
  @IsString()
  type?: string;
}
