import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Plaza } from '@prisma/client';

/** Un peque dentro de una familia importada. Solo `nombre` es obligatorio. */
export class NinoImportDto {
  @IsString()
  @MaxLength(120)
  nombre!: string;

  @IsOptional() @IsInt() @Min(0) @Max(18)
  edad?: number;

  @IsOptional() @IsString() @MaxLength(2000)
  salud?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  rutinas?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  caracter?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  reaccionAnteLoNuevo?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  tematicasInteres?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  restriccionesPantalla?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  conductasRiesgo?: string;

  @IsOptional() @IsBoolean()
  autorizacionCambioPanal?: boolean;
}

/** Una familia importada (cardex + sus peques). */
export class FamiliaImportDto {
  @IsString() @MaxLength(120)
  nombreContacto!: string;

  @IsOptional() @IsString() @MaxLength(120)
  apellido?: string;

  @IsEnum(Plaza)
  plaza!: Plaza;

  @IsOptional() @IsString() @MaxLength(120)
  zona?: string;

  @IsOptional() @IsString() @MaxLength(30)
  telefono?: string;

  @IsOptional() @IsString() @MaxLength(160)
  email?: string;

  @IsOptional() @IsString() @MaxLength(30)
  numeroEmergencia?: string;

  @IsOptional() @IsString() @MaxLength(500)
  direccion?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  expectativas?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  reglasEspecificas?: string;

  @IsOptional() @IsBoolean()
  adultoResponsablePresente?: boolean;

  @IsOptional() @IsString() @MaxLength(500)
  mascotas?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(60, { each: true })
  areasATrabajar?: string[];

  @IsOptional() @IsString() @MaxLength(200)
  autorizacionAudiovisual?: string;

  @IsOptional() @IsBoolean() consentimientoReglamento?: boolean;
  @IsOptional() @IsBoolean() consentimientoMedico?: boolean;
  @IsOptional() @IsBoolean() consentimientoPrivacidad?: boolean;
  @IsOptional() @IsBoolean() consentimientoConfidencialidad?: boolean;

  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => NinoImportDto)
  ninos!: NinoImportDto[];
}

/** Lote de familias a importar (máx. 500 por envío). */
export class ImportarFamiliasDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => FamiliaImportDto)
  familias!: FamiliaImportDto[];
}
