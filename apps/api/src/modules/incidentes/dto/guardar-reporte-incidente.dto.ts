import {
  IsBoolean,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Cuerpo del reporte de incidente. Se usa tanto para crear (POST) como para
 *  actualizar (PUT). Solo familia, fecha/hora, lugar y relato son obligatorios;
 *  el resto se captura según el caso (aplique o no la cobertura médica). */
export class GuardarReporteIncidenteDto {
  @IsString()
  familiaId!: string;

  // Vínculos opcionales (autollenan y cruzan a ambos expedientes).
  @IsOptional() @IsString() servicioId?: string;
  @IsOptional() @IsString() ninoId?: string;
  @IsOptional() @IsString() nannieId?: string;
  @IsOptional() @IsString() paqueteId?: string;

  @IsISO8601()
  fechaHoraIncidente!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  lugar!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  relatoNannie!: string;

  @IsOptional() @IsString() @MaxLength(2000) medidasInmediatas?: string;
  @IsOptional() @IsString() @MaxLength(2000) evolucionMenor?: string;
  @IsOptional() @IsString() @MaxLength(500) doctor?: string;
  @IsOptional() @IsISO8601() fechaConsulta?: string;
  @IsOptional() @IsString() @MaxLength(2000) diagnostico?: string;
  @IsOptional() @IsString() @MaxLength(2000) tratamiento?: string;
  @IsOptional() @IsString() @MaxLength(1000) documentacionEntregada?: string;
  @IsOptional() @IsString() @MaxLength(2000) medidasNannies?: string;

  @IsBoolean()
  coberturaAplico!: boolean;

  @IsOptional() @IsNumber() @Min(0) coberturaImporte?: number;
  @IsOptional() @IsString() @MaxLength(1000) anexos?: string;
}
