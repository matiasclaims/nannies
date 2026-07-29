import { IsInt, Max, Min } from 'class-validator';

/** Mes que CIERRA (se evaluará y fijará el nivel del mes entrante). */
export class CerrarMesDto {
  @IsInt()
  @Min(2020)
  @Max(2100)
  anio!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  mes!: number;
}
