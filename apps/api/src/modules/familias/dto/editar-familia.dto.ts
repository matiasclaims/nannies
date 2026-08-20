import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { EstadoFamilia, Plaza } from '@prisma/client';

/** Edición del cardex de la familia (M5). Todo opcional; solo se actualiza lo
 *  que venga. La vista por rol (qué ve la nannie) se resuelve en la lectura. */
export class EditarFamiliaDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombreContacto?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  apellido?: string;

  @IsOptional()
  @IsEnum(Plaza)
  plaza?: Plaza;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  zona?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  numeroEmergencia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  expectativas?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reglasEspecificas?: string;

  @IsOptional()
  @IsBoolean()
  adultoResponsablePresente?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  mascotas?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  areasATrabajar?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  autorizacionAudiovisual?: string;

  @IsOptional()
  @IsBoolean()
  consentimientoReglamento?: boolean;

  @IsOptional()
  @IsBoolean()
  consentimientoMedico?: boolean;

  @IsOptional()
  @IsBoolean()
  consentimientoPrivacidad?: boolean;

  @IsOptional()
  @IsBoolean()
  consentimientoConfidencialidad?: boolean;

  @IsOptional()
  @IsEnum(EstadoFamilia)
  estado?: EstadoFamilia;
}
