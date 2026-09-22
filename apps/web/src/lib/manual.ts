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
            'Modo "Todas": ves a todas las nannies (filas) y los días (columnas), con su disponibilidad de fondo y sus servicios como bloques.',
            'Cada bloque de servicio muestra dos líneas: arriba la nannie (en negrita) y debajo la familia a la que atiende.',
            'Al hacer clic en un servicio se despliega su detalle completo (familia, peques, tipo, horario, zona y nannie) y desde ahí lo gestionas.',
            'Modo "Por nannie": elige una nannie en el panel derecho y verás su semana con el eje de horas (07:00–24:00), para ubicar sus huecos disponibles.',
          ],
          nota: 'La familia y los peques del servicio solo los ve coordinación en su calendario; la nannie no los ve en su agenda (Opción A de privacidad).',
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
        {
          titulo: 'Doble perfil: Coordinación y Nannie',
          intro:
            'Si una persona de coordinación (p. ej. la Subdirectora) también es nannie, arriba del menú aparece un selector "Coordinación / Nannie".',
          pasos: [
            'En "Coordinación" ves el sistema completo (asignación, finanzas, nannies, etc.).',
            'En "Nannie" ves TU lado como nannie: tu panorama, tu calendario, tus ofertas, mis colonias y mis documentos.',
            'Cambias de un lado a otro cuando quieras; el sistema recuerda en qué modo te quedaste.',
          ],
          nota: 'Es solo una vista: tus permisos no cambian. El selector solo aparece para quien tiene los dos roles.',
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
            'El horario va en horas completas. El mínimo depende del tipo: la mayoría son 3 horas, la Ludoteca desde 1 hora y la Nannie de fiesta 2–10 h en Toluca / 3–5 h en Querétaro.',
            'El "Hasta" puede llegar a las 00:00 (medianoche), para cerrar servicios que terminan a esa hora.',
          ],
          nota: 'La duración se calcula sola y te avisa en rojo si no cumple el mínimo del tipo de servicio. El sistema NO deja asignar a una nannie dos servicios que se traslapen el mismo día (aunque uno siga solo ofertado), para evitar duplicidades.',
        },
        {
          titulo: 'Nannie de fiesta y Ludoteca',
          intro:
            'Además de los cuidados normales, hay tipos de servicio especiales para eventos.',
          pasos: [
            'Nannie de fiesta: cuidado en fiestas/eventos. En Toluca se cobra $250/h por nannie; en Querétaro, la tarifa por zona.',
            'Ludoteca móvil: eliges las estaciones y el sistema suma su costo; una nannie cubre una estación. Admite servicios desde 1 hora.',
          ],
          nota: 'El pago a la nannie de fiesta/ludoteca sale de su tabulador según el nivel. Para casos sin tarifa fija (algunas duraciones de fiesta), el pago queda pendiente y Paula lo ajusta a mano en Finanzas.',
        },
        {
          titulo: 'Cobro: paquete o servicio suelto',
          intro:
            'Si la familia tiene un paquete de horas activo, aparece el bloque "Cobro del servicio" con dos opciones.',
          pasos: [
            '"Descontar del paquete": las horas del servicio se restan del saldo del paquete. Verás cuántas horas quedan.',
            '"Servicio suelto": el servicio va fuera del paquete (su cobro se maneja en Finanzas).',
          ],
          nota: 'Si el servicio pide más horas de las que quedan en el paquete, el sistema divide el servicio: las horas que alcanzan salen del paquete y el sobrante (el "desborde") lo defines aparte —como servicio individual, como un paquete nuevo, o lo dejas "por definir" para resolverlo después.',
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
            'Un paquete es un bolsón de horas prepagadas que la familia va consumiendo servicio a servicio. Se da de alta DENTRO del expediente de la familia, en la sección "Paquete de horas" (ver el capítulo M5 para el detalle).',
          pasos: [
            'Entra a "Familias" y abre la familia.',
            'Baja a "Paquete de horas": si no tiene, elige el tramo (10, 20, 30, 40 o 50 horas) y presiona "Registrar paquete".',
            'En la lista de familias, cada una con paquete muestra un indicador verde "Paquete · X/Y h".',
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
  {
    modulo: 'M3',
    nombre: 'Finanzas',
    contenido: {
      coordinacion: [
        {
          titulo: 'Finanzas, de un vistazo',
          intro:
            'En "Finanzas" está el dinero completo de la operación, en cuatro pestañas: Ingresos, Nómina, Margen y Niveles. El sistema calcula solo; tú revisas y decides. El Margen (la utilidad) solo lo ve la Directora.',
        },
        {
          titulo: 'Ingresos (cobro a las familias)',
          pasos: [
            'Entra a "Finanzas" › pestaña "Ingresos".',
            'Con las flechas ‹ › cambias de mes.',
            'Arriba está el indicador de horas pagadas del mes, con color por rango: naranja (bajo), azul (en rango) y verde limón (óptimo).',
            'Las listas de paquetes contratados y de servicios individuales se despliegan al tocar su título (para no ver todo el detalle de golpe).',
          ],
          nota: 'Cuándo cuenta el ingreso: el de un PAQUETE, cuando se contrata; el de un SERVICIO individual, cuando Paula lo CREA (aunque el servicio se dé mucho después). Por eso la fecha que ves es la de creación. Las sesiones de un paquete ya no se cobran aparte.',
        },
        {
          titulo: 'Nómina semanal (pago a las nannies)',
          intro:
            'La nómina suma el pago de los servicios que cada nannie marcó como TERMINADOS en la semana (domingo a sábado), tarifado con el tabulador según su nivel del mes. El pago se reconoce el día que ella dio "terminado", no la fecha del servicio. Es lo que pagas el sábado.',
          pasos: [
            'Entra a "Finanzas" › pestaña "Nómina".',
            'Con las flechas ‹ › cambias de semana.',
            'Cada nannie muestra su total; toca su tarjeta para desplegar el detalle de sus servicios (cada uno con la familia).',
            'Cuando le pagues, marca su botón "Pagado" (queda con un check verde para que no la confundas).',
          ],
          nota: 'Solo cuentan los servicios que la nannie marcó como "Terminado". Los paquetes y la Ludoteca calculan su pago automáticamente. Los bonos —y las comisiones de coordinación cuyo beneficiario sea esa persona— se suman a su nómina de la semana.',
        },
        {
          titulo: 'Cobro al crear un servicio',
          intro:
            'El cobro a la familia se captura al momento de asignar el servicio, en la pantalla de Asignación:',
          pasos: [
            'Servicio individual: eliges la tarifa por hora del menú ($95–$160) o un monto libre (hasta 4 decimales). Si el horario cruza las 19:00, el cobro se parte en dos bandas —día y noche— y pones la tarifa de cada una (la de noche desde $125). El sistema suma ambas.',
            'Nightcare sin fracciones: al cruzar las 19:00, cada banda se cobra por HORA COMPLETA (p. ej. 18:30–21:30 se cobra como 1 h de día + 3 h de noche). Solo afecta el cobro a la familia.',
            'Nannie de fiesta: Toluca $250/h por nannie; Querétaro por zona (el sistema lo calcula).',
            'Ludoteca: eliges las estaciones (varias) y el sistema suma su costo.',
            'Servicio de paquete: no se cobra aparte; se descuenta del paquete y se prorratea.',
          ],
          nota: 'Las bandas de noche solo afectan lo que cobras a la familia; a la nannie se le paga por la duración total, igual de día que de noche.',
        },
        {
          titulo: 'Extender un servicio (la familia se queda más)',
          intro:
            'Si una familia se queda más tiempo del reservado (el "merodeo"), no hace falta recapturar nada: extiendes el servicio y todo se recalcula solo.',
          pasos: [
            'En el "Calendario", toca el bloque del servicio.',
            'Cambia la hora fin y guarda.',
            'El sistema recalcula la duración, el cobro y el pago, y lo refleja en Finanzas.',
          ],
          nota: 'Si la extensión entra a horario de noche (después de las 19:00), te pedirá la tarifa de noche. Los servicios cancelados o rechazados no se pueden editar.',
        },
        {
          titulo: 'Margen mensual, comisión y bonos (solo Directora)',
          intro:
            'El Margen es tu utilidad del MES: ingresos del mes − ajustes − comisiones − pago a nannies del mes − bonos. Como el ingreso se reconoce al crear el servicio y el pago al completarlo, ambos pueden caer en meses distintos (un servicio creado en un mes y dado en otro se ve como ingreso en el primero y como pago en el segundo). Es información sensible: solo la Directora la ve.',
          pasos: [
            'Entra a "Finanzas" › pestaña "Margen". Arriba ves las tarjetas del mes: Ingresos, Pago a nannies, Comisiones + bonos y Margen neto.',
            'Abajo, en cada servicio con ingreso ese mes, puedes escribir la comisión de coordinación y un ajuste/descuento manual.',
            'Comisión con beneficiario: al poner una comisión eliges a quién se le otorga; ese monto resta al margen Y se le paga en su nómina (igual que un bono).',
            'Comisión de paquete: se captura en la pestaña Ingresos, en cada paquete (sobre su cobro total), y cuenta en el mes en que se contrató.',
            'Bonos: la opción de bono (monto + a quién + motivo) resta al margen y se paga en la nómina de esa persona.',
          ],
          nota: 'Todas las comisiones y bonos son MANUALES (no hay porcentajes automáticos); en blanco por defecto. La Subdirectora ve la operación pero no el margen.',
        },
        {
          titulo: 'Cierre de mes (niveles)',
          intro:
            'El día 1 de cada mes se evalúan las horas del mes que cerró para fijar el nivel-tarifa de cada nannie el mes entrante (umbral: 25 horas). Con 25+ horas cobra en su rango; con menos, cae a Base ese mes.',
          pasos: [
            'Entra a "Finanzas" › pestaña "Niveles".',
            'Ves el nivel vigente de cada nannie y su rango.',
            'Presiona "Ejecutar cierre de [mes]" para fijar los niveles del mes siguiente. Queda un registro auditable.',
          ],
          nota: 'Solo la Directora ejecuta el cierre. El nivel queda fijo todo el mes; no cambia servicio a servicio.',
        },
      ],
      nannie: [
        {
          titulo: 'Tu servicio y tu pago',
          intro:
            'Tu pago se calcula solo, con base en los servicios que completas cada semana. Tú no manejas finanzas; solo hay una acción tuya que alimenta tu nómina.',
        },
        {
          titulo: 'Marcar un servicio como terminado',
          pasos: [
            'Cuando concluyas un servicio aceptado, entra a "Calendario" › "Mi semana".',
            'En ese servicio presiona "Marcar terminado".',
            'Pasa a "Terminado" y entra a tu pago de esa semana.',
          ],
          nota: 'Es importante marcarlo al concluir: un servicio que no marcas como terminado no entra en tu nómina de la semana. Solo puedes marcar terminado un servicio cuyo día ya llegó; el sistema no te deja cerrar por adelantado un servicio que aún no sucede.',
        },
        {
          titulo: 'Tu reporte (horas y ganancias)',
          intro:
            'En tu inicio (Panorama) ves tu propia actividad: lo que llevas ganado en el mes y una gráfica de tus horas por semana. Es solo tuyo.',
          nota: 'No incluye datos de las familias ni de los niños, y no se descarga: es solo para que sigas tu avance. Tu ganancia se calcula con el tabulador según tu nivel.',
        },
      ],
    },
  },
  {
    modulo: 'M4',
    nombre: 'Nannies (expediente, incidencias, evaluación y bitácora)',
    contenido: {
      coordinacion: [
        {
          titulo: 'Nannies, de un vistazo',
          intro:
            'En "Nannies" está tu equipo completo. Cada nannie tiene una tarjeta (foto, nombre, ciudad, estado y especialidad) y su expediente con cuatro secciones desplegables: Desempeño, Expediente, Incidencias y Bitácora. Todo esto es de coordinación; la nannie no lo ve.',
        },
        {
          titulo: 'Dar de alta una nannie',
          intro:
            'El alta la puede hacer tanto la Directora como la Subdirectora. La nannie entra en estado "Prueba" (aprox. un mes); si se queda, la pasas a "Activa".',
          pasos: [
            'Entra a "Nannies" › botón "Agregar nannie".',
            'Captura su nombre, teléfono, ciudad y las zonas que cubre, y elige un color para identificarla.',
            'Usuario de acceso: escribe solo la parte antes de la arroba (por ejemplo "vianney") y el sistema arma su acceso "vianney@nannies.mx". Con ese usuario entra al sistema.',
            'Correo personal (opcional): es su correo real de contacto; NO es su acceso, solo queda guardado en su ficha.',
            'Al crearla se genera una contraseña temporal que el sistema te muestra para que se la pases; ella la cambia la primera vez que entra.',
          ],
          nota: 'El acceso siempre es usuario@nannies.mx (no el correo personal). El color se elige aquí, al alta; después se modifica desde el botón "Editar" del perfil.',
        },
        {
          titulo: 'Editar el perfil de la nannie',
          intro: 'En la tarjeta de la nannie, el botón "Editar" abre todo su perfil de una sola vez.',
          pasos: [
            'Puedes cambiar: nombre, foto, estado, ciudad, teléfono, correo personal de contacto, zonas que cubre, color y su especialidad/experiencia.',
            'Para la foto usa "Cambiar foto": se recorta en cuadrado y se ajusta sola.',
            'Guarda con "Guardar".',
          ],
          nota: 'La foto de cada nannie se ve donde aparezca: lista, expediente, nómina, asignación y calendario. Su color hace un aro alrededor de su foto. "Dar de baja" desactiva su cuenta y conserva su historial.',
        },
        {
          titulo: 'Desempeño (todo automático)',
          intro:
            'La sección "Desempeño" muestra sus servicios de por vida, su rango de carrera y su nivel del mes. No se editan a mano: el sistema los calcula.',
          nota: 'El rango sube solo en el cierre de mes por servicios acumulados (Rookie 50 · Junior 80 · Senior 130) y nunca baja. Querétaro no usa rango (cobra por zona).',
        },
        {
          titulo: 'Expediente: documentación y capacitación',
          intro:
            'En la sección "Expediente" llevas dos listas: los documentos de ingreso (9) y los cursos (5). Vas marcando cada uno conforme la nannie lo entrega o lo concluye.',
          nota: 'Si a una nannie le falta documentación o capacitación, te aparece una alerta ámbar en su tarjeta de Nómina para que tú decidas retener el pago. No bloquea asignarle servicios; el control es tuyo.',
        },
        {
          titulo: 'Registrar una incidencia',
          intro:
            'En la sección "Incidencias" registras las faltas de la nannie según el reglamento. Registran tanto la Directora como la Subdirectora. El sistema nunca castiga ni da de baja solo: te avisa y tú decides.',
          pasos: [
            'En el expediente › "Incidencias" › botón "Registrar".',
            'Elige la incidencia de la lista (o "Otro" y describe qué pasó en la nota).',
            'Si la falta fue justificada (enfermedad, accidente vehicular, emergencia familiar, clima, etc.), elígela en el grupo "No culposas (justificadas)": queda registrada con su etiqueta pero NO suma strike ni penaliza.',
            'Guarda. Cada incidencia de descuento suma un "strike".',
          ],
          nota: 'Las reglas graves (maltrato, no cubrir el mínimo de horas, etc.) marcan baja o prueba: el sistema te avisa y tú confirmas si procede.',
        },
        {
          titulo: 'Strikes y el descuento del 20%',
          intro:
            'Cuando una nannie junta 3 strikes, el sistema marca un descuento del 20% de su próximo servicio. Tú decides qué hacer con él.',
          pasos: [
            '"Aplicar al pago": eliges en cuál de sus servicios se descuenta; el sistema calcula el 20% y lo resta de su pago.',
            '"Condonar": dejas pasar el descuento esta vez, pero las incidencias quedan registradas en el historial (para el día que sí lo apliques).',
          ],
          nota: 'El descuento reduce el pago de la nannie (tu margen sube). Además, en la sección de Nómina aparece un recordatorio cuando hay un descuento por strikes pendiente de aplicar.',
        },
        {
          titulo: 'Bitácora de la nannie (solo tú y Jackie)',
          intro:
            'La sección "Bitácora" son notas libres de coordinación sobre cada nannie: química con familias, cancelaciones justificadas, observaciones. NO son incidencias y no penalizan.',
          nota: 'Solo la Directora y la Subdirectora ven la bitácora. Sirve para que no dependas de tu memoria al asignar.',
        },
        {
          titulo: 'Evaluación de desempeño',
          intro:
            'Aparte de las incidencias (lo administrativo), la sección "Evaluación" mide la calidad del servicio de cada nannie sobre cinco pilares: puntualidad, reportes/comunicación, seguimiento, profesionalismo (incluye el vínculo con la familia) y la percepción de los papás.',
          pasos: [
            'En el expediente › sección "Evaluación", captura una calificación por pilar (escala 1 a 10) con una nota por cada uno.',
            'El sistema calcula la calificación ponderada de la nannie.',
            'Se hace de forma periódica (aprox. una vez por semana), no servicio por servicio.',
          ],
          nota: 'La evaluación mide lo cualitativo (calidad), separado de las incidencias (lo administrativo). La encuesta de los papás por QR se integra a este mismo apartado.',
        },
        {
          titulo: 'Reasignar, reprogramar o cancelar un servicio',
          intro:
            'Desde el "Calendario", al tocar el bloque de un servicio se abre una ventana con pestañas para gestionarlo. Es de coordinación.',
          pasos: [
            'Reasignar: pasa el servicio a otra nannie (una cubre a otra). Queda asignado directo, sin volver a ofertarlo.',
            'Reprogramar: muévelo a otra fecha u hora conservando nannie, duración y cobro. Un servicio individual pagado solo se puede reprogramar dentro de 7 días.',
            'Cancelar: márcalo cancelado. La regla de 24 h sugiere si se cobra la hora, pero tú decides con el check "Cobrar la hora" (por si avisan tarde). En un paquete, si no se cobra, la hora se devuelve al saldo.',
          ],
          nota: 'También desde ahí puedes extender la hora de fin de un servicio (ver Finanzas · extender un servicio).',
        },
      ],
      nannie: [
        {
          titulo: 'Tu primer ingreso',
          intro:
            'La primera vez que entras usas la contraseña temporal que te dieron. El sistema te pedirá crear tu propia contraseña antes de continuar.',
          nota: 'Nadie más ve tu contraseña. Si la olvidas, tu coordinación puede generarte una nueva.',
        },
        {
          titulo: 'Tu foto de perfil',
          intro: 'Puedes poner o cambiar tu foto tú misma.',
          pasos: [
            'Abre "Mi foto" (tu avatar, abajo en el menú).',
            'Sube una imagen; se recorta en cuadrado automáticamente.',
            'Guarda.',
          ],
          nota: 'Tu coordinación también puede ponerte una foto (por ejemplo, de tu credencial).',
        },
        {
          titulo: 'Mis documentos',
          intro:
            'Puedes subir tus documentos y constancias directo a la plataforma, sin mandarlos por otro lado. Coordinación los revisa desde tu expediente.',
          pasos: [
            'Entra a "Mis documentos" en el menú.',
            'Verás la lista de documentos (9) y cursos (5). Junto a cada uno, presiona "Subir" y elige el archivo (PDF o foto, máx. 8 MB).',
            'Para reemplazar uno, vuelve a subirlo; para quitarlo, usa el bote de basura.',
          ],
          nota: 'Solo tú y tu coordinación ven tus documentos.',
        },
      ],
    },
  },
  {
    modulo: 'M5',
    nombre: 'Familias (cardex, inactividad y ficha de servicio)',
    contenido: {
      coordinacion: [
        {
          titulo: 'Familias, de un vistazo',
          intro:
            'En "Familias" llevas el expediente (cardex) de cada familia y sus peques: datos de contacto, dirección, reglas de la casa, y la información operativa de cada niño (rutinas, salud, carácter…). También ves su paquete de horas activo y su historial de servicios.',
        },
        {
          titulo: 'Dar de alta una familia',
          intro:
            'Puedes registrar una familia directamente en el sistema, sin esperar el formulario. Solo el nombre de contacto y la plaza son obligatorios; el resto del cardex se completa después en el expediente.',
          pasos: [
            'Entra a "Familias" › botón "Nueva familia".',
            'Captura los datos esenciales: contacto, apellido, plaza, zona, teléfono, número de emergencia, correo y dirección.',
            'Presiona "Guardar familia".',
          ],
          nota: 'Para cargar varias familias de golpe (por ejemplo, las respuestas del formulario), usa "Importar" — ver la siguiente sección.',
        },
        {
          titulo: 'Importar familias (varias de golpe)',
          intro:
            'Cuando tengas varias familias juntas (por ejemplo, exportadas del formulario que llenan los papás), puedes cargarlas en lote sin capturarlas una por una.',
          pasos: [
            'En "Familias" › botón "Importar".',
            'Descarga la "Plantilla CSV" para ver el formato, o copia las filas desde Google Sheets y pégalas en el cuadro (también puedes subir un archivo CSV).',
            'La primera fila deben ser los encabezados (contacto, apellido, plaza, peque1_nombre, etc.); el orden no importa y las columnas que no reconozca se ignoran.',
            'Presiona "Revisar": verás una vista previa con cada familia marcada como Lista, Con error (te dice el motivo) o Posible duplicado.',
            'Presiona "Confirmar importación": se crean solo las que están listas; las de error se omiten.',
          ],
          nota: 'Obligatorios por familia: contacto y plaza (Toluca o Querétaro). Los "posibles duplicados" (mismo contacto y apellido) se marcan pero no se crean, salvo que marques la casilla para incluirlos. Nada se crea hasta que confirmas.',
        },
        {
          titulo: 'El expediente de la familia',
          intro:
            'Al abrir una familia ves su cardex completo. Con el botón "Editar" completas o corriges toda la información del formulario.',
          pasos: [
            'Datos de la familia: contacto, apellido, dirección + referencias, teléfono, número de emergencia, correo, mascotas y si hay un adulto responsable durante el servicio.',
            'Servicio: expectativas, reglas de la casa, áreas a trabajar (Atención, Socialización, etc.), autorización audiovisual y los cuatro consentimientos.',
            'Peques: agrega cada niño con su edad, salud/alergias, rutinas, carácter, temáticas de interés, restricciones de pantalla, conductas de riesgo y la autorización de cambio de pañal/baño.',
          ],
          nota: 'La zona de la familia es una referencia; la zona de cada servicio puede ser distinta y se captura al asignarlo (a veces piden el servicio en otra dirección).',
        },
        {
          titulo: 'Historial de servicios de la familia',
          intro:
            'En el expediente ves el historial de servicios de la familia. Cada servicio trae un distintivo de si fue "de paquete" o suelto.',
          nota: 'Cuando la familia tiene paquete, arriba del historial ves su balance de horas: cuántas lleva consumidas y cuántas le quedan.',
        },
        {
          titulo: 'Paquete de horas de la familia',
          intro:
            'El paquete de horas vive DENTRO del expediente de la familia (sección "Paquete de horas"), no en la lista. En la lista, cada familia solo muestra un indicador verde "Paquete · X/Y h" cuando tiene uno activo.',
          pasos: [
            'Abre la familia y baja a "Paquete de horas".',
            'Si no tiene: elige las horas (10, 20, 30, 40 o 50) y presiona "Registrar paquete". Si la familia aún no dio fechas, marca "Asignación manual".',
            'Si ya tiene: ves su saldo (horas restantes de las contratadas). Con "Programar sesiones" generas de golpe el patrón semanal (días + horario) hasta agotar las horas; aparecen como ofertas en el calendario.',
            'Fechas sueltas: cuando la familia no lleva un patrón fijo, puedes agregar sesiones una por una (fecha + horario), en lugar del patrón semanal; cada una descuenta del saldo igual.',
            '"Ver proyección (PDF)" abre un documento con marca para compartir con la familia; "Copiar enlace de avance" copia un enlace sin contraseña para que la familia consulte sus horas y fechas.',
            'Eliminar paquete: si te equivocaste al registrarlo, puedes borrarlo desde la misma sección (queda como si nunca se hubiera creado).',
          ],
          nota: 'Una familia solo puede tener un paquete activo a la vez. Desde el enlace de avance, la familia puede cancelar por su cuenta una fecha con al menos 24 h de anticipación (la hora regresa al saldo); con menos, se coordina contigo. El precio del paquete sale del tabulador; el cobro se refleja en Finanzas.',
        },
        {
          titulo: 'Familias inactivas (automático)',
          intro:
            'Cuando una familia pasa 60 días sin pedir un servicio, el sistema la marca "Inactiva" sola. Es solo una separación visual: no bloquea nada.',
          pasos: [
            'En la lista, las inactivas llevan una etiqueta ámbar "Inactiva"; en su expediente ves "Inactiva · N días sin servicio".',
            'Para dejar la lista limpia, usa el filtro "Ocultar inactivas".',
          ],
          nota: 'Se reactiva sola en cuanto le agendas un nuevo servicio; no tienes que reactivarla a mano. "Suspendida" es un estado aparte que sí pones tú (por ejemplo, recontratación externa).',
        },
        {
          titulo: 'Bitácora de la familia',
          intro:
            'Cada familia tiene su bitácora: notas y recomendaciones del equipo (conocimiento acumulado, química con nannies, observaciones). Es distinta de la bitácora de la nannie.',
          nota: 'Agrega una nota escribiéndola y presionando "Agregar". Queda con quién la escribió y la fecha.',
        },
      ],
      nannie: [
        {
          titulo: 'Ver la ficha de la familia',
          intro:
            'Para los servicios que ya aceptaste, puedes abrir una ficha con lo que necesitas para atender bien: la dirección para llegar, las reglas de la casa y la información operativa del peque.',
          pasos: [
            'En "Calendario" › "Mi semana", en tu servicio aceptado o terminado presiona "Ver ficha".',
            'Verás dirección, zona, si hay un adulto responsable, mascotas, reglas, expectativas y áreas a trabajar; y de cada peque: salud/alergias, conductas de riesgo, rutinas, carácter y demás.',
          ],
          nota: 'Por privacidad de la familia, la ficha no muestra apellidos ni datos de contacto. Solo la ves de familias con un servicio tuyo confirmado.',
        },
      ],
    },
  },
  {
    modulo: 'M6',
    nombre: 'Reportes y evaluación',
    contenido: {
      coordinacion: [
        {
          titulo: 'Reportes, de un vistazo',
          intro:
            'La pestaña "Reportes" reúne el desempeño de cada nannie en el mes: cuántos servicios y horas llevó, su calificación de papás, su evaluación de agencia y sus incidencias. Todo se puede descargar en PDF.',
        },
        {
          titulo: 'Ver el reporte general del mes',
          pasos: [
            'Entra a "Reportes" en el menú.',
            'Con las flechas ‹ › eliges el mes.',
            'La tabla muestra una fila por nannie: servicios, horas, calificación de papás (con nº de opiniones), evaluación de agencia e incidencias.',
          ],
          nota: 'La calificación de papás por debajo de 7.5 se resalta en rojo; las incidencias con un ícono de alerta. Al pie ves los totales.',
        },
        {
          titulo: 'Reporte detallado de una nannie',
          pasos: [
            'En la tabla, haz clic en la fila de la nannie.',
            'Se abre su reporte del mes: sus reportes de servicio, las evaluaciones de papás, sus incidencias y su evaluación de agencia.',
            'Con "Imprimir / Guardar PDF" lo descargas para archivar o compartir con ella.',
          ],
        },
        {
          titulo: 'Descargar en PDF',
          intro:
            'Tanto el reporte general como el de cada nannie se abren en una versión con marca Nannies lista para imprimir o guardar como PDF (botón "Descargar PDF" / "Imprimir / Guardar PDF").',
        },
        {
          titulo: 'Los reportes de servicio',
          intro:
            'Cada nannie deja un reporte por servicio (actividades, ánimo del peque, incidentes y notas). Los lees en el expediente de la familia, bajo cada servicio de su historial, y resumidos en el reporte de la nannie.',
        },
        {
          titulo: 'Encuesta de evaluación de los papás',
          intro:
            'Por cada servicio hay una encuesta corta para el papá (calificación 1–10, si volvería a contratar y un comentario), que se contesta por un link/QR sin contraseña.',
          pasos: [
            'Comparte el link/QR desde la ficha de la familia (botón "Encuesta") — o pídele a la nannie que se lo muestre al papá al terminar.',
            'Las respuestas se ven en la ficha de la nannie › sección "Evaluación de papás", y su promedio en Reportes.',
          ],
          nota: 'Si el promedio de una nannie baja de 7.5, el sistema te avisa y te ofrece ponerla en "mes de prueba" — la decisión es tuya, no es automático.',
        },
      ],
      nannie: [
        {
          titulo: 'Escribir el reporte de tu servicio',
          pasos: [
            'En "Calendario" › "Mi semana", en tu servicio aceptado o terminado presiona "Reporte".',
            'Escribe las actividades que hicieron, elige el ánimo del peque, y agrega incidentes o notas si los hubo.',
            'Presiona "Guardar reporte". Lo puedes editar después.',
          ],
          nota: 'Es un reporte por servicio. Ayuda a coordinación y a la familia a dar mejor seguimiento.',
        },
        {
          titulo: 'La encuesta para los papás (QR)',
          pasos: [
            'En tu servicio (aceptado o terminado) presiona "Encuesta".',
            'Muéstrale el QR al papá al terminar, o mándale el link. Lo contesta sin cuenta, en un momento.',
          ],
          nota: 'Tú no ves quién te calificó ni las respuestas individuales, solo tu promedio.',
        },
        {
          titulo: 'Tu calificación de papás',
          intro:
            'En tu Calendario ves tu calificación global de papás (el promedio y cuántas opiniones llevas). Es solo tu promedio: no aparecen nombres ni comentarios.',
        },
      ],
    },
  },
  {
    modulo: 'M7',
    nombre: 'Panorama (tablero)',
    contenido: {
      coordinacion: [
        {
          titulo: 'Tu Panorama, de un vistazo',
          intro:
            'Es la primera pantalla al entrar: un tablero del mes con lo importante de la operación. Cada dato es interactivo — pasa el cursor por encima para ver qué significa, y haz clic para ir a la sección donde puedes accionar.',
        },
        {
          titulo: 'Qué muestra',
          pasos: [
            'Arriba: servicios de hoy, por asignar y sin cubrir.',
            'Dona "Servicios del mes por nannie": cuántos lleva cada nannie (con su color).',
            'Anillos: aceptación de ofertas, cobertura (servicios con nannie asignada) y horas pagadas del mes.',
            'Tarjetas: ingreso no capturado (cancelaciones sin cobro), margen del mes (solo Directora) y paquetes activos.',
            'Abajo: zonas de más demanda, aceptación por nannie y actividad reciente.',
          ],
          nota: 'Un clic te lleva a su sección: la dona y las zonas al Calendario; cobertura y "por asignar" a Asignación; horas, ingreso y margen a Finanzas; una nannie a su ficha; "Paquetes activos" a las familias con paquete.',
        },
        {
          titulo: 'Comparativo de horas por mes',
          intro:
            'En el Panorama hay una gráfica de líneas que compara las horas cubiertas mes a mes, con una línea por año (los últimos 3), para ver la tendencia y comparar contra el mismo mes del año pasado.',
          pasos: [
            'Cada línea es un año; cada punto, las horas cubiertas de ese mes.',
            'Con el selector eliges la plaza: Toluca, Querétaro o Todas.',
          ],
          nota: 'Cuenta las horas de los servicios COMPLETADOS. Sirve para ver estacionalidad y crecimiento año contra año.',
        },
        {
          titulo: 'El panorama del día (hoy)',
          intro:
            'Además del tablero del mes, tienes la vista del día: los servicios de hoy con su estado, para saber qué está pasando en la operación en este momento.',
          pasos: [
            'Con las flechas ‹ › te mueves de un día a otro.',
            'Ves cada servicio del día (familia, nannie, horario, zona y estado).',
          ],
          nota: 'Es la foto operativa del día; el tablero de arriba sigue siendo del mes completo.',
        },
        {
          titulo: 'Reporte del día (para los papás)',
          intro:
            'En la vista del día puedes generar, por familia, una hoja imprimible con el reporte del servicio para entregar a los papás. Reúne los servicios del día y te marca cuáles todavía no tienen reporte de la nannie.',
          pasos: [
            'En el panorama del día, ve a "Reportes del día".',
            'Verás la lista de servicios del día; los que aún no tienen reporte capturado aparecen marcados.',
            'En cada familia, abre su hoja y con "Imprimir / Guardar PDF" la entregas a los papás.',
          ],
          nota: 'Si un servicio sale marcado como "sin reporte", pídele a la nannie que lo capture antes de entregar la hoja.',
        },
        {
          titulo: 'El margen es solo tuyo (Directora)',
          intro:
            'La tarjeta "Margen del mes" solo la ve la Directora. La Subdirectora ve todo el tablero excepto el margen del negocio.',
        },
      ],
      nannie: [
        {
          titulo: 'Tu Panorama',
          intro:
            'Al entrar ves tu actividad del mes: ofertas por responder, servicios próximos y completados, tus horas, lo que llevas ganado, tu gráfica de horas por semana y tu calificación de papás. Es solo tuyo — no ves datos del negocio ni de otras nannies.',
        },
      ],
    },
  },
];
