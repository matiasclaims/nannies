import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Nota opcional que se le manda por correo a quien reportó al resolver. */
export class ResolverProblemaDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  nota?: string;
}
