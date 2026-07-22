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
  {
    modulo: 'M2',
    nombre: 'Asignación y paquetes',
    contenido: {
      coordinacion: [
        {
          titulo: 'Asignación, de un vistazo',
          intro:
            'En "Asignación" capturas un servicio nuevo y el sistema te recomienda a las nannies que mejor encajan por zona y disponibilidad. Tú tomas la decisión final: el sistema sugiere, la persona decide.',
        },
        {
          titulo: 'Capturar un servicio nuevo',
          pasos: [
            'Entra a "Asignación" en el menú.',
            'Elige la familia. Si es nueva, usa el botón + para darla de alta al momento.',
            'Elige el tipo de servicio, la plaza y la zona (al elegir la familia se rellenan solas si ya las tiene).',
            'Indica la fecha, el horario (Desde/Hasta) y el número de niños.',
            'El horario debe ser en horas completas y de mínimo 3 horas por visita.',
          ],
          nota: 'La duración se calcula sola y te avisa en rojo si no cumple el mínimo de 3 horas.',
        },
        {
          titulo: 'Cobro: paquete o servicio suelto',
          intro:
            'Si la familia tiene un paquete de horas activo, aparece el bloque "Cobro del servicio" con dos opciones.',
          pasos: [
            '"Descontar del paquete": las horas del servicio se restan del saldo del paquete. Verás cuántas horas quedan.',
            '"Servicio suelto": el servicio va fuera del paquete (su cobro se maneja en Finanzas).',
          ],
          nota: 'Si el servicio pide más horas de las que quedan en el paquete, el sistema te avisa y no deja ofertar: reduce el horario, renueva el paquete o cóbralo como suelto.',
        },
        {
          titulo: 'Buscar y elegir nannie',
          pasos: [
            'Presiona "Buscar nannies disponibles".',
            'Aparece la lista de candidatas, ordenada de la más recomendada a la menos. La primera lleva la etiqueta "Sugerida".',
            'Cada tarjeta muestra su horario disponible, su rango y cuántos servicios lleva esa semana (para repartir carga).',
            'Presiona "Ofertar" en la nannie elegida.',
          ],
          nota: 'También puedes asignar a cualquier otra nannie con el selector "Asignar a otra nannie (override)", aunque no esté en la recomendación.',
        },
        {
          titulo: 'Coincidencias aproximadas (±1 hora)',
          intro:
            'Cuando ninguna nannie cubre el horario exacto, el sistema no las descarta por poco: incluye a las que quedan hasta 1 hora fuera en la entrada o la salida.',
          pasos: [
            'Estas aparecen con la etiqueta ámbar "Aproximada", debajo de las coincidencias exactas.',
            'Debajo del nombre se explica el hueco, por ejemplo "empieza 1 h tarde" o "termina 1 h antes".',
          ],
          nota: 'Son una opción cuando no hay match exacto; tú decides si conviene ofertarles.',
        },
        {
          titulo: 'Qué pasa al ofertar',
          intro:
            'Al ofertar, el servicio se le manda a la nannie y queda "Esperando su respuesta" (lo sigues en el Calendario, panel "Requieren tu decisión"). Si era contra paquete, las horas ya quedaron descontadas; si la nannie rechaza, esas horas se devuelven al saldo automáticamente.',
        },
        {
          titulo: 'Registrar un paquete de horas (Familias)',
          intro:
            'Los paquetes se dan de alta en la sección "Familias". Un paquete es un bolsón de horas prepagadas que la familia va consumiendo servicio a servicio.',
          pasos: [
            'Entra a "Familias".',
            'Ubica a la familia. Si no tiene paquete, verás un selector de tramo (10, 20, 30, 40 o 50 horas).',
            'Elige el tramo y presiona "Registrar".',
            'La familia mostrará su "Paquete activo" con una barra de saldo de horas.',
          ],
          nota: 'Una familia solo puede tener un paquete activo a la vez. Los paquetes no caducan: duran hasta agotar las horas. El cobro del paquete se maneja en Finanzas (M3).',
        },
      ],
      nannie: [
        {
          titulo: 'Qué cambia para ti',
          intro:
            'Con la asignación asistida, coordinación elige a quién ofrecer cada servicio con ayuda del sistema. Para ti no cambia nada: te siguen llegando las ofertas igual que siempre.',
        },
        {
          titulo: 'Recibir y responder ofertas',
          pasos: [
            'Cuando te ofertan un servicio, aparece en "Tienes N ofertas" en tu Calendario.',
            'Revisa el día, el horario y la zona.',
            'Presiona "Aceptar" o "Rechazar".',
          ],
          nota: 'Mantén tu disponibilidad al día: el sistema te recomienda con base en las horas que marcas. Si rechazas un servicio, no hay problema; la familia no pierde sus horas de paquete.',
        },
      ],
    },
  },
];
