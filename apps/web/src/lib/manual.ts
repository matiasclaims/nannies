/**
 * Contenido del MANUAL DE USUARIO (fuente única de verdad).
 * Se renderiza dentro del sistema (role-aware) y de aquí se genera el PDF.
 * Un capítulo por módulo; se agrega uno al cerrar cada módulo.
 * En español, para usuarios finales (no técnico).
 */

export type Publico = 'coordinacion' | 'nannie';

export interface Seccion {
  titulo: string;
  intro?: string;
  pasos?: string[];
  nota?: string;
}

export interface CapituloModulo {
  modulo: string;
  nombre: string;
  contenido: Record<Publico, Seccion[]>;
}

export const MANUAL: CapituloModulo[] = [
  {
    modulo: 'M1',
    nombre: 'Calendario y disponibilidad',
    contenido: {
      coordinacion: [
        {
          titulo: 'El Calendario, de un vistazo',
          intro:
            'El Calendario es el corazón del sistema: aquí ves la disponibilidad de las nannies y los servicios de la semana. Desde él ofreces servicios y das seguimiento a las respuestas.',
        },
        {
          titulo: 'Ver el calendario del equipo',
          pasos: [
            'Entra a "Calendario" en el menú de la izquierda.',
            'Con las flechas ‹ › cambias de semana; en medio ves el rango de fechas.',
            'Modo "Todas": ves a todas las nannies (filas) y los días (columnas), con su disponibilidad de fondo y sus servicios como etiquetas.',
            'Modo "Por nannie": elige una nannie en el panel derecho y verás su semana con el eje de horas (07:00–24:00), para ubicar sus huecos disponibles.',
          ],
        },
        {
          titulo: 'Ofertar un servicio a una nannie',
          pasos: [
            'En el panel "Requieren tu decisión" (derecha), busca un servicio "por asignar".',
            'En su tarjeta, elige a la nannie en el desplegable.',
            'Presiona "Ofertar". El servicio pasa a "Esperando su respuesta".',
          ],
          nota: 'Puedes ofrecer a la nannie que quieras; el sistema no te obliga a seguir una sugerencia (la asignación asistida llega en M2).',
        },
        {
          titulo: 'Dar seguimiento a las ofertas',
          pasos: [
            'En "Requieren tu decisión" ves las ofertas "Esperando su respuesta" y a quién se ofertaron.',
            'Cuando la nannie responde, el servicio cambia a "Aceptado" o "Rechazado".',
            'Refresca o navega para ver el estado actualizado.',
          ],
          nota: 'La respuesta la da únicamente la nannie ofertada. Coordinación no acepta ni rechaza por ella.',
        },
        {
          titulo: 'Sobre la disponibilidad',
          intro:
            'Cada nannie marca su propia disponibilidad; tú la ves (solo lectura). Si una coordinadora también opera como nannie, verá el botón "Marcar mi disponibilidad" para registrar la suya.',
        },
      ],
      nannie: [
        {
          titulo: 'Tu calendario, de un vistazo',
          intro:
            'Aquí marcas cuándo estás disponible y respondes las ofertas de servicio que te llegan. Todo en una sola pantalla, pensada para tu celular.',
        },
        {
          titulo: 'Marcar tu disponibilidad',
          pasos: [
            'Entra a "Calendario".',
            'Presiona "+ Marcar mi disponibilidad".',
            'Elige la fecha, la hora de inicio y la de fin.',
            'Elige el estado: Disponible, Bloqueado o Bloqueo temporal (si es temporal, indica la fecha de reintegro).',
            'Presiona "Agregar bloque".',
          ],
          nota: 'Solo tú marcas tu disponibilidad. Es importante mantenerla al día para que te asignen servicios.',
        },
        {
          titulo: 'Aceptar o rechazar una oferta',
          pasos: [
            'Cuando coordinación te oferta un servicio, aparece arriba en "Tienes N ofertas".',
            'Revisa el tipo de servicio, el día, el horario y la zona.',
            'Presiona "Aceptar" si lo tomas, o "Rechazar" si no puedes.',
          ],
          nota: 'La decisión es tuya. Al aceptar, el servicio queda confirmado para ti.',
        },
        {
          titulo: 'Ver tu semana',
          pasos: [
            'Más abajo, en "Mi semana", ves tu agenda día por día.',
            'Aparecen tus servicios (con horario y zona) y tus bloques de disponibilidad.',
            'El día de hoy se resalta.',
          ],
        },
      ],
    },
  },
];
