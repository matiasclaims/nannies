import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Alta de un niño en el perfil de familia (M5). Solo `nombre` es obligatorio. */
export class CrearNinoDto {
  @IsString()
  @MaxLength(120)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  apellidos?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(18)
  edad?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  genero?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  rutinas?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  necesidades?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  salud?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reaccionAnteLoNuevo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  caracter?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  tematicasInteres?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  restriccionesPantalla?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  conductasRiesgo?: string;

  @IsOptional()
  @IsBoolean()
  autorizacionCambioPanal?: boolean;
}

/** Edición de un niño: todos los campos opcionales. */
export class EditarNinoDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  apellidos?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(18)
  edad?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  genero?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  rutinas?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  necesidades?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  salud?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reaccionAnteLoNuevo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  caracter?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  tematicasInteres?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  restriccionesPantalla?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  conductasRiesgo?: string;

  @IsOptional()
  @IsBoolean()
  autorizacionCambioPanal?: boolean;
}
