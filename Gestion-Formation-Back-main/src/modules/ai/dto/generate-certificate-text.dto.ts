import { IsOptional, IsString } from 'class-validator';

export class GenerateCertificateTextDto {
  /** Ton ou mention complémentaire à inclure dans le certificat */
  @IsOptional()
  @IsString()
  additionalMention?: string;
}
