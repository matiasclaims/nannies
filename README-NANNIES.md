# README — Punto de entrada para el desarrollo
## Sistema Operativo Integral · Nannies Child Care

> **Léeme primero.** Este documento es el índice del proyecto: qué es cada archivo, en qué orden usarlos, y cómo arrancar la construcción.
> Preparado por: Operalia · Julio 2026 · Fase: OAL Fase 2 (Construcción)

---

## 1. Qué es este proyecto

Un sistema de gestión para una agencia de niñeras (Nannies Child Care) que resuelve: asignación de niñeras a familias, disponibilidad/calendario, nómina, cobros y margen, expedientes, cardex de familias, reportes e incidencias, y un dashboard.

**Es una aplicación web responsiva, celular-first**, con acceso por enlace (no app descargable). Maneja **datos de menores de edad** — la seguridad es condición de construcción, no fase posterior.

---

## 2. Documentos y materiales (qué es cada cosa)

### Documentos del proyecto (los 4 MD — léelos en este orden)

1. **`README-NANNIES.md`** — Este documento. El índice de entrada.

2. **`ARQUITECTURA-SISTEMA-NANNIES.md`** — La especificación completa. Qué son los 7 módulos, sus pantallas, los 3 roles y permisos, cómo se interconectan los datos (6 cadenas), las reglas de negocio, el esqueleto de datos (tablas), el stack y los pendientes. **Es la fuente principal de qué construir.**

3. **`SEGURIDAD-SISTEMA-NANNIES.md`** — El estándar de seguridad obligatorio bajo el cual se escribe todo el código. Protección de datos de menores, permisos a nivel de campo, gestión de secretos, reglas para incorporar librerías, seguridad del servidor. **Se aplica a cada línea de código, siempre.**

4. **`DATOS-FUENTE-NANNIES.md`** — Los números y reglas concretas: tabulador de pago (14 servicios × 5 niveles), tablas de cobro (paquetes e individuales), reparto del dinero, reglas de nivel, y las 14 reglas de incidencias. **Todo lo que hay que cablear en tarifas y reglas está aquí.** Contiene una nota de verificación: cada cifra debe confirmarse contra su archivo fuente antes de cablear.

### Material visual (único archivo externo a los MD)

5. **Diseño "Claro"** — El prototipo ya validado por la clienta (look & feel), como archivo aparte (HTML o PDF). No se puede consolidar en texto porque es visual. El frontend debe seguir esta piel: sidebar claro, cards blancas con sombra, acento azul `#0CC0DF`, banner de bienvenida, KPIs con barra de progreso. Escritorio (con sidebar) + celular (top bar + bottom nav). **No inventar estética; seguir esta.**

**Paleta de marca:** rosa `#FF66C4` · azul `#0CC0DF` · morado `#CB6CE6` · verde `#9DCD5A` · rojo `#FF5757`.

---

## 3. Stack (ya definido)

- **Frontend:** React + Tailwind / shadcn. Web responsiva, celular-first.
- **Backend:** Node.js + NestJS (estructura modular para los 7 módulos).
- **Base de datos:** PostgreSQL (posible Supabase como capa gestionada).
- **Hospedaje:** VPS Hostinger KVM 1 (1 vCPU, 4 GB RAM, Ubuntu 24.04). Cuello de botella: vCPU único — cuidar procesos pesados (cierre de mes, dashboard).
- **Requisito previo de despliegue:** remover por completo el proyecto anterior del VPS antes de montar Nannies.

---

## 4. Orden de construcción (no todo de golpe)

El sistema se construye **por núcleo**, respetando las dependencias entre módulos (M1 es la raíz de la que casi todo cuelga).

**Fase A — Núcleo (resuelve el dolor central):**
1. **M1 · Calendario/Disponibilidad** — el corazón fundacional. Todo nace aquí (disponibilidad + registro maestro de asignaciones). Construir primero.
2. **M2 · Asignación** — el motor de match (reglas + override). Depende de M1.
3. **M3 · Finanzas** — cobros, pagos, margen. Depende de M1. Necesita el tabulador y tablas de cobro.

**Fase B — Gestión (acoplados entre sí):**
4. **M5 · Familias** — cardex (arranca vacío; se nutre de Google Forms).
5. **M6 · Reportes** — captura de reportes, evaluaciones e incidencias.
6. **M4 · Nannies** — expediente + bandeja de descuentos (recibe de M6).

**Fase C — Visibilidad:**
7. **M7 · Dashboard 360** — solo lectura, consume de todos. Construir al final (ya está diseñado).

**Transversal desde el día 1:** los 3 roles y los permisos a nivel de campo se construyen desde el inicio, no como añadido.

---

## 5. Antes de escribir la primera línea

- [ ] Leer `ARQUITECTURA-SISTEMA-NANNIES.md` completo.
- [ ] Leer `SEGURIDAD-SISTEMA-NANNIES.md` completo.
- [ ] Tener a la mano el tabulador, tablas de cobro y reglamento de incidencias.
- [ ] Tener el diseño "Claro" como referencia visual.
- [ ] Configurar `.env` fuera del control de versiones (secretos nunca en código).
- [ ] Definir la matriz de permisos (rol × recurso × campo) en un lugar central.

---

## 6. Principios que resuelven cualquier duda no prevista

Si algo no está especificado, aplicar estos dos criterios (ambos vienen de los MD):

1. **De diseño:** *"Automatizar el cálculo, humanizar la decisión de consecuencia."* El sistema calcula y sugiere; un humano confirma toda acción que afecte el dinero o el estatus de una persona.

2. **De seguridad:** *"¿Esto expone un dato de un menor, un dato financiero, o una credencial? Si hay duda, protégelo como si sí."* Ante conflicto entre conveniencia y seguridad, gana seguridad.

---

## 7. Lo que NO está definido (no inventar)

- **Bonos (M3):** existe la capa, pero las reglas no están definidas por la clienta. Dejar el andamiaje, no cablear montos ni condiciones.
- Cualquier regla de negocio que no esté en los MD ni en los materiales fuente: **preguntar, no asumir.**

---

*README · Nannies Child Care × Operalia · OAL Fase 2 · Julio 2026*
