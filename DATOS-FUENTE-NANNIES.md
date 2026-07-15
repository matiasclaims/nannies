# Datos Fuente — Tarifas y Reglas · Sistema Nannies

> **Documento de datos concretos para desarrollo (Claude Code)**
> Proyecto: Sistema Operativo Integral · Nannies Child Care
> Preparado por: Operalia · Julio 2026
> Complementa a ARQUITECTURA-SISTEMA-NANNIES.md (sección 6: reglas de negocio)

---

## ⚠️ Nota de verificación obligatoria

Los datos de este documento fueron **transcritos desde las fuentes originales** (imágenes del tabulador, tablas de precios y notas de reglas). Antes de cablearlos en el sistema, **Matías debe verificar cada cifra contra el archivo fuente correspondiente**, porque un error de transcripción en tarifas se convierte en un error de nómina o cobro real.

Fuentes originales de referencia:
- Tabulador de pago → `PE_2026.pdf` / imagen "Propuesta económica 2026"
- Precios de paquetes → imagen "Nuestros precios por paquete"
- Precios individuales → imagen "Nuestros precios" (Daycare/Nightcare)
- Reglas de incidencias → `reglasdeincidencias.pdf` + `Reglamento_PF_2026.pdf`

**Si una cifra de este MD no coincide con la fuente, la fuente gana.**

---

## 1. Tabulador de PAGO a nannies (lo que Nannies paga)

Fuente: "Propuesta económica 2026". Cada servicio se paga según la columna del **nivel-tarifa vigente ese mes** (ver reglas de nivel en §4).

**Niveles (columnas):** Salario Base · Salario 25hrs · Nannie Rookie (50 servicios) · Nannie Jr. (80 servicios) · Nannie Sr. (130 servicios).

| Tipo de servicio | Base | 25 hrs | Rookie | Jr. | Sr. |
|---|---|---|---|---|---|
| 3 hrs | $196.5 | $222 | $228.6 | $237 | $241.2 |
| 4 hrs | $230 | $255 | $262.6 | $269.8 | $274.5 |
| 5 hrs | $255 | $275 | $288.4 | $295.6 | $304.3 |
| 6 hrs | $295 | $315 | $327.6 | $335.4 | $352.9 |
| 7–9 hrs | $400 | $465 | $468.8 | $482.2 | $506 |
| Paquete 10 | $880 | $935 | $948.2 | $983.8 | $1014.4 |
| Paquete 20 | $1700 | $1750 | $1790.2 | $1861.8 | $1921.3 |
| Paquete 30 | $2150 | $2210 | $2295.5 | $2360.4 | $2420 |
| Paquete 40 | $2450 | $2510 | $2571.3 | $2680 | $2695.1 |
| Paquete 50 | $2485 | $2545 | $2570 | $2710 | $2740.6 |
| Fiesta 3 hrs | $390 | $420 | $432 | $449.4 | $462 |
| Fiesta 4 hrs | $520 | $540 | $556.2 | $578.1 | $595 |
| Fiesta 5 hrs | $650 | $675 | $690 | $717 | $735 |
| Fiesta 6 hrs | $780 | $810 | $824.4 | $836.7 | $889.3 |

> **Verificar contra `PE_2026.pdf` antes de cablear.** Montos en MXN.

---

## 2. Tablas de COBRO a familias (lo que Nannies cobra)

### 2.1 Paquetes de horas — PRECIO FIJO, cobro AUTOMÁTICO al asignar

Fuente: "Nuestros precios por paquete 2026". El ingreso nace al contratar el paquete (modelo "saldo" que se consume servicio a servicio).

| Paquete | Precio/hora | Precio total |
|---|---|---|
| 10 horas | $155/h | $1,550 |
| 20 horas | $142.5/h | $2,850 |
| 30 horas | $125/h | $3,750 |
| 40 horas | $95/h | $3,800 |
| 50 horas | $82/h | $4,100 |

### 2.2 Servicios individuales — MENÚ de opciones, cobro MANUAL al realizar

Fuente: "Nuestros precios" (Daycare / Nightcare / Acompañamiento). Los papás eligen la opción según los beneficios que quieran. En el sistema: menú de estas 5 opciones + campo libre (para casos variables como ludoteca por estación).

| Precio | Incluye |
|---|---|
| $95 | Todos los cuidados |
| $110 | Todos los cuidados + Actividades planeadas |
| $125 | Todos los cuidados + Actividades planeadas + Seguimiento cada hora |
| $140 | Lo anterior + Reporte final |
| $160 | Lo anterior + Cobertura médica |

> **Nota:** estos precios aparecen etiquetados por plaza (Toluca / Querétaro en las fuentes). Verificar si hay diferencia de precio por plaza antes de cablear. Montos en MXN.

---

## 3. Reparto del dinero por servicio (modelo financiero)

Confirmado con la clienta:

```
Cobro a familia (auto paquete / manual individual)
 − Pago a nannie (automático, tabulador × nivel)
 − Comisión de coordinadora (MANUAL, opcional, en blanco por defecto)
 − Descuentos/ajustes (manual)
 = Margen de la agencia
```

**Sobre la comisión de coordinadora (Jackie/otros):** NO es automática ni fija. La mayoría de servicios los coordina Paula. Jackie tiene 2-3 fijos. El sistema **contempla** el campo pero lo deja en blanco; Paula lo llena solo cuando aplica. No modelar un % automático.

**El margen es información sensible:** solo visible para la Directora (Paula).

---

## 4. Reglas de nivel de nannie

**Dos contadores distintos (no confundir):**

**A) Rango permanente** (por servicios acumulados de por vida — nunca se pierde):
- 50 servicios → Nannie Rookie (+3%)
- 80 servicios → Nannie Junior (+7%)
- 130 servicios → Nannie Senior (+10%)

**B) Nivel-tarifa mensual** (se reinicia cada mes según actividad):
- Umbral: **25 horas/mes**.
- Si la nannie cumple 25+ hrs el mes que cierra → el mes siguiente cobra en su rango (Rookie/Jr/Sr).
- Si NO cumple → cae a Salario Base todo el mes siguiente, **aunque su rango permanente siga siendo mayor**.
- El nivel-tarifa se **fija al inicio del mes** (proceso automático de cierre de mes) y no cambia a media marcha.

**Ejemplo:** una nannie con rango permanente Senior que solo hizo 20 hrs en julio → en agosto cobra como Salario Base. Si en agosto hace 30 hrs → en septiembre vuelve a cobrar como Senior.

---

## 5. Las 14 reglas de incidencias

Fuente: `reglasdeincidencias.pdf` + `Reglamento_PF_2026.pdf`. Detección **manual** (un humano registra que ocurrió), cálculo de consecuencia **automático**, aplicación al pago **manual** (Paula, desde la bandeja de M4).

> **Verificar cada regla y porcentaje contra el reglamento fuente antes de cablear.**

| # | Situación | Consecuencia |
|---|---|---|
| 1 | Sin documentación completa | No se asignan servicios |
| 2 | 3 solicitudes para actualizar calendario sin cumplir (en blanco o sin registrar servicios) | −10% del próximo servicio asignado |
| 3 | No ha cumplido con las capacitaciones | Retención de pago hasta que mande los comprobantes |
| 4 | 3 solicitudes de envío de reporte final sin atender | −10% del próximo servicio asignado |
| 5 | No usa el uniforme en sus servicios | −15% del próximo servicio asignado |
| 6 | 3 solicitudes de Admin para que se reporte cada hora sin atender | −10% del próximo servicio asignado |
| 7 | Palabras altisonantes, maltrato, solicitud de bonos/gratificaciones/dinero a las familias | Prescindir de sus servicios (baja) |
| 8 | Se le asigna un servicio que empata con su zona y horario disponible y no lo recibe | Strike (al reunir 3 strikes → −20% del próximo servicio) |
| 9 | Llega tarde (debe reponer el tiempo). Después de 3 retardos de +5 min | −10% del próximo servicio asignado |
| 10 | No envía justificante médico que acredite que no puede cubrir un servicio | Las horas del servicio se descuentan de su siguiente pago, aún cuando otra nannie haya cubierto |
| 11 | No cubre 25 hrs mínimo durante 2 meses seguidos | Ya no puede seguir en la agencia (baja) |
| 12 | Elige servicios con base en el pago y no en la disponibilidad | −10% sobre su siguiente pago |
| 13 | 3 informes de diferentes papás sobre uso excesivo del celular | Strike |
| 14 | Calificación menor a 7.5 en evaluación semestral | 1 mes de prueba para mejorar áreas de oportunidad |

**Sobre los strikes (reglas 8 y 13):** se acumulan automáticamente; al llegar a 3 → −20% del próximo servicio, **con confirmación de Paula en el 3er strike** antes de aplicar.

---

## 6. Recordatorio de pendiente

**Bonos (M3):** existe una capa de bonos sobre el pago base (ej. Nannie del mes, Top horas), pero **las reglas y montos NO están definidos por la clienta**. Construir el andamiaje, no inventar. Pendiente de definición.

---

*Datos Fuente · Nannies Child Care × Operalia · OAL Fase 2 · Julio 2026*
*Toda cifra debe verificarse contra su archivo fuente antes de cablear en el sistema.*
