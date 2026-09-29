import type { PrismaService } from '../../prisma/prisma.service';

/**
 * Encuesta de papás por PAQUETE (no por día): de un paquete atendido por una
 * nannie sale UNA sola encuesta, en la ÚLTIMA sesión programada de esa nannie
 * dentro del paquete. Si un mismo paquete lo atienden varias nannies, hay una
 * encuesta por nannie (cada una en su última sesión). Los servicios
 * individuales (sin paqueteId) siguen con una encuesta cada uno.
 *
 * Devuelve el conjunto de IDs de servicio que SÍ portan encuesta (las últimas
 * sesiones por paquete+nannie), calculado sobre las sesiones vivas (no
 * canceladas/rechazadas) de los paquetes indicados.
 */
export async function serviciosPortadoresEncuesta(
  prisma: PrismaService,
  paqueteIds: string[],
): Promise<Set<string>> {
  const portadores = new Set<string>();
  const ids = [...new Set(paqueteIds.filter(Boolean))];
  if (ids.length === 0) return portadores;

  const sesiones = await prisma.servicio.findMany({
    where: {
      paqueteId: { in: ids },
      nannieId: { not: null },
      estado: { notIn: ['CANCELADO', 'RECHAZADO'] },
    },
    select: { id: true, paqueteId: true, nannieId: true, fecha: true, horaInicio: true },
  });

  // Por cada (paquete, nannie) nos quedamos con la sesión más tardía (fecha y,
  // a igualdad de fecha, hora de inicio).
  const ultima = new Map<string, { id: string; fecha: Date; horaInicio: string }>();
  for (const s of sesiones) {
    const clave = `${s.paqueteId}|${s.nannieId}`;
    const prev = ultima.get(clave);
    const esPosterior =
      !prev ||
      s.fecha > prev.fecha ||
      (s.fecha.getTime() === prev.fecha.getTime() && s.horaInicio > prev.horaInicio);
    if (esPosterior) ultima.set(clave, { id: s.id, fecha: s.fecha, horaInicio: s.horaInicio });
  }
  for (const v of ultima.values()) portadores.add(v.id);
  return portadores;
}
