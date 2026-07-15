import { SetMetadata } from '@nestjs/common';
import type { Accion } from '../../rbac/permissions';

export const ACCION_KEY = 'accion_requerida';

/**
 * Marca la acción (de la matriz de permisos) que un endpoint exige.
 * El AccionGuard la lee y valida contra ACTION_POLICY.
 */
export const RequiereAccion = (accion: Accion) => SetMetadata(ACCION_KEY, accion);
