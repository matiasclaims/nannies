# Arquitectura del Sistema — Nannies Child Care

> **Documento de especificación para desarrollo (Claude Code)**
> Proyecto: Sistema Operativo Integral · Nannies Child Care
> Preparado por: Operalia · Julio 2026
> Estado: Arquitectura validada (OAL Fase 1) — lista para construcción módulo por módulo

---

## 0. Cómo leer este documento

Este MD define **qué se va a construir y cómo se conecta**, no el código. Está organizado en:
1. Filosofía de diseño (el criterio que resuelve cualquier duda no prevista)
2. Roles y permisos
3. Mapa de módulos y navegación
4. Desglose de cada módulo (pantallas, qué hace)
5. Interconexiones (cómo fluyen los datos)
6. Reglas de negocio clave
7. Integraciones externas
8. Modelo de datos (el esqueleto de tablas)
9. Pendientes declarados (lo que NO está definido — no inventar)
10. Notas de stack

El diseño visual (look & feel) ya fue validado por la clienta: **dirección "Claro"** — sidebar claro, cards blancas con sombra, acento azul `#0CC0DF`, banner de bienvenida, KPIs con barra de progreso. Paleta de marca: rosa `#FF66C4`, azul `#0CC0DF`, morado `#CB6CE6`, verde `#9DCD5A`, rojo `#FF5757`.

---

## 1. Filosofía de diseño (principio rector)

**Automatizar el cálculo, humanizar la decisión de consecuencia.**

El sistema cuenta, calcula, alerta y encola automáticamente — pero **cada vez que una acción afecta el dinero o el estatus de una persona (nannie o familia), un humano confirma**. Este es el criterio para resolver cualquier caso ambiguo que este documento no cubra explícitamente.

Ejemplos de este principio ya aplicados:
- El motor de asignación (M2) **recomienda**, pero Paula **decide** (override permanente).
- Las incidencias se **detectan manualmente** y se **calculan automáticamente**, pero su **aplicación al pago la confirma Paula**.
- Los strikes se **acumulan solos**, pero el 3º (el que descuenta 20%) lo **confirma Paula**.
- Las alertas de cumplimiento **avisan**, no **bloquean**.

**Principios de seguridad complementarios:**
- **Menor privilegio:** cada rol ve lo mínimo que necesita.
- **Segmentación a nivel de campo:** dos roles pueden ver la misma pantalla con distintos campos visibles.
- **Protección de menores (no negociable):** los datos identificables de menores (nombres completos, datos sensibles) solo son visibles para la Directora. Nunca en vistas de nannie ni en accesos públicos. Este requisito deriva del protocolo PRO-SAN-NANNIES-001 y del estándar de máxima severidad para datos de menores.

---

## 2. Roles y permisos

El sistema tiene **3 roles autenticados** + **1 acceso público sin cuenta**.

| Rol | Quién | Alcance |
|-----|-------|---------|
| **Directora** | Paula | Acceso total. Único rol que ve finanzas completas, márgenes, comisiones y tabuladores. Confirma consecuencias económicas (aplicar descuentos, 3er strike). |
| **Subdirectora** | Jackeline (y Mariana a futuro) | Opera todo (asignar, calendario, expedientes, familias, reportes, incidencias). **NO ve el margen ni las finanzas de negocio.** Puede ver lo operativo del dinero necesario para coordinar (ej. pago a una nannie), pero **no el margen de la agencia**. |
| **Nannie** | Cada niñera | Solo lo suyo: su disponibilidad, sus servicios asignados, perfiles de familia en **vista operativa** (rutinas/alergias/necesidades, sin datos identificables completos), sus reportes, su expediente/nivel (ver, no editar lo sensible). No ve finanzas, ni otras nannies, ni otras familias, ni dashboard de negocio. |
| **Papá/Familia** *(acceso público, sin cuenta)* | Familias | No entran al sistema. Solo reciben un **link para la encuesta de evaluación** (M6). Sin autenticación, sin perfil, sin acceso a datos. |

**Requisito crítico de implementación:** los permisos operan **a nivel de campo, no solo de pantalla**. Dos consecuencias obligatorias:
- El **margen** se oculta a nivel de campo para la Subdirectora (misma pantalla de Finanzas, sección de margen no renderizada).
- Los **datos identificables de menores** se ocultan a nivel de campo para las nannies (mismo perfil de familia, campos sensibles no renderizados).

Construir permisos solo a nivel de pantalla dejaría un hueco de PII. Es requisito no negociable.

---

## 3. Mapa de módulos y navegación

**7 módulos.** Seis de captura/operación (M1–M6) y uno de salida pura (M7).

**Navegación (sidebar), agrupada por frecuencia de uso:**

```
Panorama (M7)          ← vista general, entrada
─────────────
Asignación (M2)        ← operación diaria: asignar servicios
Calendario (M1)        ← disponibilidad (corazón fundacional)
─────────────
Nannies (M4)           ← expedientes + incidencias
Familias (M5)          ← cardex de clientes
─────────────
Finanzas (M3)          ← cobros + pagos + margen
Reportes (M6)          ← captura de reportes + evaluaciones + incidencias
```

**Propósito de cada módulo:**

| Módulo | Nombre | Qué resuelve |
|--------|--------|--------------|
| **M1** | Disponibilidad y Calendario | Dónde vive el tiempo. Disponibilidad de nannies + registro maestro de asignaciones. Corazón fundacional. |
| **M2** | Asignación | Motor de match familia-nannie (reglas + override). Calcula y se retira; no posee datos. |
| **M3** | Finanzas | El dinero completo: cobros a familias + pagos a nannies + comisiones + margen. |
| **M4** | Nannies | Expediente del equipo + gestión de incidencias y descuentos. |
| **M5** | Familias | Cardex de cada familia (perfil + historial + bitácora). |
| **M6** | Reportes | Captura de reportes de servicio, evaluación dual e incidencias. |
| **M7** | Dashboard 360 | Vista panorámica. Solo lectura, consume de todos. |

---

## 4. Desglose por módulo

### M1 · Disponibilidad y Calendario
**Es calendario nativo** (no integración con Google Calendar — decisión ADD-BEF-NANNIES-001). Es el dueño del dato maestro de asignaciones: "este servicio → esta nannie → este día" vive aquí.

**Pantallas:**
- **1.1 Calendario general** — disponibilidad de todas las nannies (vista semanal/mensual), servicios asignados sobre el calendario, filtros por zona/nannie/estado. Vista de coordinación.
- **1.2 Disponibilidad por nannie** — cada nannie marca sus horarios libres/bloqueados. Bloqueos temporales con fecha de reintegro. Alerta si disponibilidad muy reducida. **Las nannies acceden a marcar su propia disponibilidad.**
- **1.3 Bandeja de oferta y respuesta** — se oferta un servicio a una nannie, se registra aceptó/rechazó con fecha. Este registro alimenta la estadística de rechazo (M6) y puede disparar incidencias (M4).

### M2 · Asignación
**Motor invocable, no dueño de datos.** Se llama al asignar, calcula, recomienda, se retira. El resultado lo escribe M1. **No tiene tabla propia de asignaciones.**

**Algoritmo:** reglas (no IA), con **override manual permanente** para Directora/Subdirectora.

**Pantallas:**
- **2.1 Nuevo servicio / solicitud** — captura datos del servicio (familia, tipo, día/horario, zona, nº de niños). Al capturar, invoca el motor.
- **2.2 Panel de recomendación y decisión** — muestra nannies candidatas rankeadas + por qué; permite elegir del ranking o **fuera de él** (override); al confirmar, registra en M1.

**Lógica del motor (2 etapas):**
1. **Filtros duros (excluyen):** zona compatible + disponibilidad en el horario.
2. **Ranking (ordena):** historial con la familia > perfil de los niños > nivel/experiencia > equidad de carga.

> **Nota:** el ranking depende de datos de M5/M6/M1/M4. Al inicio, con esos módulos vacíos, el match será básico (solo zona + disponibilidad) y mejora conforme el sistema acumula historial. Comunicar a la clienta que el sistema "aprende" con el uso (por reglas, no IA).

### M3 · Finanzas
El dinero completo. Modelo validado con la clienta.

**Pantallas:**
- **3.1 Nómina semanal (pago a nannies)** — servicios de la semana por nannie, cada uno tarifado según el **nivel-tarifa vigente ese mes**; suma semanal. Aplica descuentos de la bandeja de M4 (cuando Paula lo decide). Capa de bonos (pendiente, ver §9).
- **3.2 Registro de ingresos (cobro a familias)** — paquetes automáticos (tabla fija), individuales manuales (menú de 5 opciones $95–$160 + campo libre). Incluye campo de descuento/ajuste manual.
- **3.3 Comisiones de coordinadora** — campo manual opcional, en blanco por defecto; se llena solo cuando aplica.
- **3.4 Margen y reporte financiero** — `Cobro − Pago nannie − Comisión − Descuentos = Margen`, por servicio/nannie/zona/mes. Alimenta M7. **Solo visible para Directora.**

**Proceso automático:** cierre de mes (ver §6).

### M4 · Nannies (expediente + incidencias)
**Pantallas:**
- **4.1 Directorio de nannies** — lista con nivel actual, nivel-tarifa del mes, zona, disponibilidad, estado (activa/pausa/prueba).
- **4.2 Expediente de nannie** — datos y documentos (credencial, 5 capacitaciones + presencial, docs de selección, perfil geográfico); nivel y progreso (rango permanente + contador de servicios + nivel-tarifa del mes); alertas de cumplimiento (certificaciones/docs — **avisan, no bloquean**); historial de incidencias.
- **4.3 Bandeja de descuentos e incidencias** — recibe de M6 las incidencias con consecuencia ya calculada; Paula decide cuándo aplicar; al aplicar → va a M3. Gestión de strikes (3 strikes → 20%, con confirmación en el 3º).

### M5 · Familias (cardex)
**Módulo con mayor carga de PII sensible (menores). Máxima protección.**

**Pantallas:**
- **5.1 Directorio de familias** — lista con zona, nº de servicios, última atención.
- **5.2 Perfil de familia** — datos de familia y niños (nombres, edades, rutinas, necesidades, salud); alimentado por Google Forms (importación); historial de servicios. **Doble vista por rol:** coordinación ve completo; nannie ve solo lo operativo (rutinas/alergias/necesidades).
- **5.3 Bitácora / notas** — conocimiento acumulado sobre la familia. Se nutre **aparte** (desacoplada del reporte de servicio de M6).

**Arranque:** vacío (no se migra el histórico de 8 años).

### M6 · Reportes + Evaluación Dual
**Boca de entrada crítica** (captura datos que no existen en otro lado).

**Pantallas:**
- **6.1 Reportes de servicio** — la nannie registra su reporte (cada hora + final: fecha, actividades, incidentes, actitud del niño). Vinculado al servicio (M1) y familia (M5). **La nannie escribe.**
- **6.2 Evaluación dual** — evaluación de papás (por **link híbrido**: papás por link + Paula puede capturar) + evaluación de agencia (coordinación). Alimenta ranking de M2 y reglas de M4. Regla: calificación <7.5 → mes de prueba.
- **6.3 Registro de incidencias** — captura de faltas según las 14 reglas; el sistema identifica la regla y calcula la consecuencia; **encola en la bandeja de M4**.

### M7 · Dashboard 360
**Solo lectura. Consume de todos, escribe en ninguno.** Ya diseñado (dirección Claro).
Muestra: ingreso no capturado, aceptación por nannie, zonas de más demanda, cancelaciones, servicios, cobertura, margen (solo Directora), actividad reciente.

---

## 5. Interconexiones (cómo fluyen los datos)

Seis cadenas de datos. Cada flecha indica dirección; se anota qué lee/escribe cada módulo.

### Cadena 1 — Operativa (ciclo de un servicio)
```
M2 (calcula match) → Paula elige → M1 (registra asignación como evento)
   ↑ M2 LEE de: M1 (disponibilidad), M5 (perfil/historial), M6 (evaluaciones), M4 (nivel)
   ↓ servicio realizado en M1 GENERA: horas → M3 ; estado → M6
```
**Contrato:** M2 *lee* pero *no escribe*; M1 es dueño del dato de asignación.

### Cadena 2 — Financiera (el dinero de cada servicio)
```
M1 (servicio: horas + tipo) → M3 calcula:
   • Pago nannie (tabulador × nivel-tarifa del mes) [auto]
   • Cobro familia (paquete auto / individual manual)
   • Comisión coordinadora [manual opcional]
   − Descuentos (de M4) [manual]
   = Margen → M7
```
**Contrato:** paquetes cobran al **asignar** (compromiso al contratar → modelo "paquete como saldo" que se consume servicio a servicio); individuales cobran al **realizarse**.

### Cadena 3 — Disciplinaria (incidencia → descuento)
```
M6 (detección MANUAL) → cálculo consecuencia [AUTO] → M4 (bandeja) → Paula aplica [MANUAL] → M3 (descuenta)
```
**Contrato — 3 momentos:** detectar (manual) → calcular/encolar (auto) → aplicar al pago (manual). Strikes igual, con confirmación de Paula en el 3º.

### Cadena 4 — Progreso de nannie
```
M1 (servicios completados) → M4 (contador permanente) → umbral 50/80/130: ascenso de rango [AUTO + notifica]
M1 (horas del mes) → M3 (cierre de mes): fija nivel-tarifa del mes siguiente [AUTO]
```
**Contrato:** DOS contadores separados que **no deben confundirse** — rango permanente (vive en M4) y nivel-tarifa mensual (lo calcula M3).

### Cadena 5 — Conocimiento de familia
```
Google Forms (externo) → sincronización AUTO → M5 (perfil)
M6 (evaluación) → M5 (historial)
M5 (perfil + historial) → alimenta ranking de M2
```
**Contrato:** la bitácora de M5 se nutre **aparte** (no del reporte de M6).

### Cadena 6 — Visibilidad
```
M1 + M3 + M4 + M6 → M7 (Dashboard, solo lectura)
```

### Mapa de dependencias (para orden de construcción)
- **M1** es la raíz: casi todos leen de él.
- **M3, M4, M6** dependen de M1.
- **M2** depende de todos para rankear bien (match pobre al inicio, esperado).
- **M7** depende de todos; nadie depende de M7 (hoja terminal).

**Orden de construcción sugerido:** Núcleo **M1 → M2 → M3**, luego gestión **M5 → M6 → M4** (acoplados), y **M7** al final.

---

## 6. Reglas de negocio clave

### 6.1 Tabulador y niveles de nannie
- **Rango permanente** (por servicios acumulados de por vida): 50→Rookie (+3%), 80→Junior (+7%), 130→Senior (+10%). Nunca se pierde.
- **Nivel-tarifa mensual** (se reinicia): depende del **umbral de 25 hrs/mes**. Si la nannie cumple 25+ hrs el mes que cierra → el mes siguiente cobra en su rango; si no → cae a Salario Base todo el mes siguiente.
- **Son dos cosas distintas:** una Senior que no hizo 25 hrs cobra como Base ese mes, aunque su rango siga siendo Senior.
- **Cálculo del pago:** servicio por servicio, cada uno con la columna del nivel-tarifa vigente ese mes. El pago del sábado = suma de los servicios de esa semana.

### 6.2 Cierre de mes (proceso automático)
Job programado el día 1 de cada mes: evalúa las horas del mes que cerró para cada nannie y **fija el nivel-tarifa del mes entrante**. El nivel queda estampado y **no se recalcula servicio a servicio dentro del mes**. Debe dejar registro auditable (qué nivel, cuántas horas) para que Paula pueda verificar.

### 6.3 Incidencias (14 reglas)
Detección manual → cálculo automático de consecuencia → encolado en bandeja M4 → aplicación manual por Paula. Las 14 reglas (del reglamento de incidencias) definen el % de descuento o strike. 3 strikes → 20% (confirmación de Paula en el 3º).

### 6.4 Modelo financiero
- **Pago a nannies:** automático (tabulador + nivel).
- **Comisión coordinadora:** manual, opcional, en blanco por defecto.
- **Ingreso paquetes:** automático (tabla fija, al asignar).
- **Ingreso individuales:** manual (menú 5 opciones + campo libre, al realizar).
- **Descuentos/ajustes:** manuales.
- **Margen:** `Cobro − Pago − Comisión − Descuentos`. Solo Directora.

### 6.5 Override de asignación (M2)
El sistema recomienda; la Directora/Subdirectora puede asignar a cualquier nannie, dentro o fuera del ranking. Parte del flujo normal, no excepción.

---

## 7. Integraciones externas

- **Google Forms → M5:** sincronizador automático que jala respuestas nuevas (API de Google Sheets) y crea/actualiza perfiles de familia. **Requisito de seguridad:** maneja PII de menores en tránsito → canal seguro, sin logs con PII, credenciales de Google resguardadas (nunca expuestas en código).
- **Link de encuesta (M6):** acceso público sin autenticación para que los papás evalúen un servicio. No expone datos de otros; acceso simple por servicio.

---

## 8. Modelo de datos (esqueleto de tablas)

> Las tablas y relaciones principales. Los nombres son orientativos; ajustar a la convención del stack.

**`nannies`** — id, nombre, zona(s)/perfil_geográfico, rango_permanente (base/rookie/junior/senior), servicios_acumulados, nivel_tarifa_mes_actual, estado (activa/pausa/prueba), datos_documentos, certificaciones.

**`familias`** — id, datos_contacto, zona, estado, fecha_alta. *(PII de coordinación)*

**`ninos`** — id, familia_id → `familias`, nombre, edad, genero, rutinas, necesidades, salud. *(PII de menores — máxima protección, nivel de campo)*

**`disponibilidad`** — id, nannie_id → `nannies`, fecha, hora_inicio, hora_fin, estado (disponible/bloqueado/temporal), fecha_reintegro. *(M1)*

**`servicios`** *(tabla maestra de asignaciones — vive en M1)* — id, familia_id, nannie_id, fecha, hora_inicio, hora_fin, tipo_servicio, zona, num_ninos, estado (ofertado/aceptado/rechazado/completado/cancelado), es_paquete (bool), paquete_id (si aplica).

**`ofertas_respuesta`** — id, servicio_id → `servicios`, nannie_id, respuesta (aceptó/rechazó), fecha_respuesta. *(alimenta estadística de rechazo)*

**`paquetes`** — id, familia_id, horas_totales, horas_consumidas, precio_total, fecha_contratacion, estado. *(modelo "saldo": se cobra al inicio, se consume por servicio)*

**`ingresos`** — id, servicio_id o paquete_id, monto, origen (auto_paquete/manual_individual), ajuste_descuento, nota. *(M3)*

**`pagos_nannie`** — id, nannie_id, semana, servicios_incluidos (ref), monto_bruto, descuentos_aplicados, monto_neto, nivel_tarifa_aplicado. *(M3)*

**`comisiones`** — id, servicio_id, coordinadora_id, monto (nullable — en blanco si no aplica). *(M3, manual)*

**`incidencias`** — id, nannie_id, servicio_id, regla_aplicada (1–14), tipo (descuento/strike), consecuencia_calculada, estado (encolada/aplicada), fecha_deteccion, fecha_aplicacion. *(M6 detecta → M4 gestiona → M3 aplica)*

**`evaluaciones`** — id, servicio_id, nannie_id, fuente (papa/agencia), calificacion, comentarios, fecha. *(M6)*

**`reportes_servicio`** — id, servicio_id, nannie_id, contenido, incidentes, actitud_nino, fecha. *(M6)*

**`bitacora_familia`** — id, familia_id, nannie_id, nota, fecha. *(M5, desacoplada de reportes)*

**`usuarios`** — id, nombre, rol (directora/subdirectora/nannie), nannie_id (si rol=nannie), credenciales. *(permisos)*

**Relaciones clave:**
- `servicios` conecta `familias` ↔ `nannies` (una asignación).
- `incidencias` pertenece a una `nannie` y sale de un `servicio`.
- `pagos_nannie` agrupa varios `servicios` de una semana.
- `ninos` pertenece a una `familia` (PII de menores, protección de campo).
- El margen se **calcula** (no se almacena como verdad única): `ingresos − pagos_nannie − comisiones − ajustes`.

---

## 9. Pendientes declarados (NO inventar)

> Honestidad activa: lo que aún **no** está definido. Claude Code debe dejar el andamiaje pero **no cablear reglas inexistentes**.

- **Bonos (M3):** existe una capa de bonos sobre el pago base (Nannie del mes, Top horas, etc.), pero **las reglas no están definidas por la clienta**. Construir el espacio para que quepan; no inventar montos ni condiciones.
- **Reglas de incidencia detalladas:** las 14 reglas están en el reglamento; al implementar 6.3, mapear cada una a su consecuencia exacta desde el documento fuente, no de memoria.

---

## 10. Notas de stack

**Stack definido (cerrado en sesión de arquitectura):**

- **Entorno de desarrollo:** Claude Code.
- **Frontend:** React con Tailwind / shadcn. Aplicación web responsiva, **celular-first** (es donde viven las nannies). Acceso por enlace web, no app descargable. Escritorio (con sidebar) + celular (top bar + bottom nav) — ambos ya diseñados, dirección "Claro".
- **Backend:** Node.js con **NestJS**. Elegido por su estructura modular ordenada, que mantiene los 7 módulos sin que el código se vuelva desordenado.
- **Base de datos:** **PostgreSQL** — robusto para los datos relacionales interconectados (nannies, familias, servicios, nóminas, incidencias). Posible uso de **Supabase** como capa gestionada.
- **Hospedaje:** VPS propio en Hostinger, plan **KVM 1** (1 vCPU, 4 GB RAM, 50 GB disco, Ubuntu 24.04 LTS, 4 TB de ancho de banda). Se desarrolla y arranca en KVM 1 limpio; se evalúa el salto a **KVM 2** (2 vCPU, 8 GB RAM) en la liberación o cuando el volumen lo pida.
  - **Cuello de botella identificado:** el único núcleo de CPU puede sufrir en los picos de dashboard (M7) y nómina (M3). Diseñar esos procesos pesados (cierre de mes, agregaciones del dashboard) para que no saturen el vCPU único — considerar caché, procesamiento diferido o queries optimizadas.
  - **Requisito previo de despliegue:** remover por completo el proyecto anterior que corre en el VPS antes de montar Nannies.

**Calendario:** nativo (no Google Calendar). Google se usa solo para importar el formulario de familias (M5).

**Roles desde el día 1:** los permisos a nivel de campo no son un añadido posterior — se construyen desde el inicio.

**Seguridad:** este sistema se construye bajo el estándar definido en el documento complementario **SEGURIDAD-SISTEMA-NANNIES.md** (obligatorio, no opcional — maneja PII de menores).

---

*Documento de arquitectura · Nannies Child Care × Operalia · OAL Fase 1 · Julio 2026*
*Todas las decisiones aquí registradas fueron validadas con la clienta o derivadas del diagnóstico y el Context Pack de módulos. Sin supuestos inventados.*
