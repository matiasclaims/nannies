# Estándares de Seguridad — Sistema Nannies Child Care

> **Documento normativo de seguridad para desarrollo (Claude Code)**
> Proyecto: Sistema Operativo Integral · Nannies Child Care
> Preparado por: Operalia · Julio 2026
> Carácter: **OBLIGATORIO**. Complementa a ARQUITECTURA-SISTEMA-NANNIES.md

---

## 0. Por qué este documento existe

Este sistema maneja **datos personales de menores de edad** (nombres, edades, rutinas, ubicaciones, condiciones de salud) y **datos financieros** de la operación. Una fuga o un acceso indebido no es un bug: es un daño a terceros vulnerables y una responsabilidad legal para Nannies y para Operalia.

Por eso, **la seguridad no es una fase posterior ni un "nice to have": es una condición de construcción**. Todo código de este sistema se escribe bajo los estándares de este documento. Ante cualquier duda entre "más rápido" y "más seguro", **gana más seguro**.

Este documento es accionable: cada sección da reglas concretas que Claude Code debe seguir al codificar.

---

## 1. Principio rector de seguridad

**Confianza cero por defecto, mínimo privilegio siempre.**

- Ningún dato es visible sin que el rol lo justifique.
- Ninguna acción se ejecuta sin verificar que quien la pide tiene permiso.
- Ninguna librería entra al proyecto sin justificar por qué es necesaria y confiable.
- Ningún dato sensible viaja o se almacena sin protección.

Cuando este documento no cubra un caso, aplicar el criterio: **¿esto expone algún dato de un menor, un dato financiero, o una credencial? Si hay duda, protégelo como si sí.**

---

## 2. Protección de datos de menores (máxima prioridad)

Los datos de menores (`ninos`, y los campos sensibles de `familias`) son la clase de dato más protegida del sistema.

**Reglas obligatorias:**
- **Nunca** exponer nombres completos, edades exactas combinadas con ubicación, ni datos de salud de un menor a un rol que no sea Directora.
- Los permisos de estos campos operan **a nivel de campo, no de pantalla** (ver §3). Una nannie que abre el perfil de una familia **no debe recibir del backend** los campos sensibles del menor — no basta con ocultarlos en el frontend.
- **Nunca** registrar datos de menores en logs, mensajes de error, URLs, o parámetros de consulta (query strings).
- **Nunca** incluir datos de menores en respuestas de API que no los necesiten estrictamente.
- Cualquier exportación o reporte que incluya datos de menores debe verificar el rol antes de generarse.

**Regla de oro:** el backend nunca envía al cliente un dato de menor que ese rol no tiene permiso de ver. La protección vive en el servidor, no en el navegador.

---

## 3. Control de acceso (permisos a nivel de campo)

**El control de acceso se impone en el backend, siempre.** El frontend puede ocultar elementos por UX, pero **la verdad de "quién puede ver/hacer qué" vive en el servidor**. Nunca confiar en que el frontend filtró.

**Reglas:**
- Cada endpoint verifica el **rol** del usuario autenticado antes de responder.
- Cada endpoint que devuelve datos con campos sensibles **filtra los campos según el rol** antes de enviar la respuesta (no envía el campo y lo esconde: no lo envía).
  - Margen financiero → solo en respuestas a **Directora**. Nunca a Subdirectora ni Nannie.
  - Campos sensibles de menores → solo a **Directora**. Vista operativa (rutinas/alergias/necesidades) a Nannie.
- Las acciones con consecuencia económica (aplicar descuento, 3er strike, fijar comisión) requieren rol **Directora** verificado en el backend.
- El acceso público de encuesta (M6) **no** da acceso a ningún dato del sistema: es un endpoint aislado que solo recibe la evaluación, no consulta ni devuelve información de familias, nannies ni servicios.

**Implementación:** usar guards/middlewares de NestJS para verificar rol en cada ruta. Definir la matriz de permisos (rol × recurso × campo) en un solo lugar central, no dispersa por el código.

---

## 4. Autenticación y sesiones

- Contraseñas: **nunca** en texto plano. Hash con algoritmo fuerte y lento (bcrypt/argon2), con salt.
- Tokens de sesión (JWT o equivalente): firmados, con expiración razonable, transmitidos de forma segura.
- **Nunca** almacenar tokens ni credenciales en localStorage si se puede evitar; preferir cookies httpOnly seguras.
- Forzar HTTPS en todo el sistema (ver §8). Ninguna credencial viaja por HTTP.
- Rate limiting en login para frenar ataques de fuerza bruta (relevante además por el vCPU único: un ataque de fuerza bruta también es un riesgo de saturación).
- El acceso de las nannies debe ser tan restringido en backend como en frontend: una nannie autenticada solo puede consultar **sus** datos (sus servicios, su disponibilidad, su expediente). Verificar pertenencia en cada consulta (que el `nannie_id` del token coincida con el recurso pedido).

---

## 5. Seguridad de datos (en reposo y en tránsito)

- **En tránsito:** todo HTTPS/TLS. Sin excepciones. Incluye la sincronización con Google Forms y los links de encuesta.
- **En reposo:** la base de datos protegida con credenciales fuertes, no accesible desde internet abierto (solo desde el backend). Si se usa Supabase, configurar Row Level Security y no exponer la llave de servicio.
- **Consultas a base de datos:** usar siempre consultas parametrizadas / ORM. **Nunca** construir SQL concatenando strings con datos del usuario (previene inyección SQL). NestJS con un ORM (TypeORM/Prisma) cubre esto si no se hace SQL crudo manual.
- **Validación de entrada:** todo dato que entra (formularios, API, importación de Forms) se valida y sanitiza antes de procesarse o guardarse. Nunca confiar en el input.
- **Backups:** respaldos regulares de la base de datos, almacenados de forma segura. Un respaldo con PII también es PII: protegerlo igual.

---

## 6. Gestión de secretos y credenciales

- **Nunca** poner credenciales, llaves de API, tokens, contraseñas de base de datos o llaves de Google en el código fuente.
- Usar variables de entorno (`.env`) fuera del control de versiones. El `.env` **nunca** se sube al repositorio (verificar `.gitignore`).
- Las credenciales de Google (para la sincronización de Forms) se resguardan como secreto, nunca expuestas en logs ni en el cliente.
- Rotar credenciales si se sospecha exposición.
- El repositorio (si es público o compartido) **nunca** debe contener un secreto en su historial. Si uno se filtra, se rota de inmediato.

---

## 7. Dependencias y librerías (cadena de suministro)

Esta es la parte que más pediste blindar: **solo usar librerías y código que no expongan la seguridad de Operalia ni de Nannies.**

**Reglas para incorporar cualquier dependencia:**
- **Justificación:** no se agrega una librería "porque es cómoda". Cada dependencia debe tener una razón clara de por qué es necesaria.
- **Reputación:** preferir librerías ampliamente usadas, mantenidas activamente, con historial limpio. Evitar paquetes abandonados, con pocos usuarios, o de origen dudoso.
- **Mínimo de dependencias:** menos librerías = menor superficie de ataque. No agregar una dependencia pesada para algo que se resuelve con código propio simple.
- **Auditoría:** correr `npm audit` (o equivalente) regularmente y resolver vulnerabilidades conocidas. No liberar con vulnerabilidades críticas o altas sin resolver.
- **Versiones fijas:** fijar versiones de dependencias (lockfile) para que no entren cambios inesperados.
- **Nada de código copiado de fuentes no confiables:** no incorporar snippets de origen desconocido que puedan contener lógica maliciosa. Todo código de terceros debe ser verificable.

**Regla dura:** si una librería pide permisos o accesos que no corresponden a su función, o si no se puede verificar su origen y mantenimiento, **no se usa**. Se busca alternativa o se implementa a mano.

---

## 8. Seguridad del servidor (VPS Hostinger)

- **Requisito previo:** remover por completo el proyecto anterior del VPS antes de montar Nannies. No dejar restos, credenciales viejas, ni puertos abiertos del proyecto previo.
- **HTTPS obligatorio:** certificado TLS (Let's Encrypt), renovación automática. Ningún tráfico en HTTP plano.
- **Firewall:** solo abrir los puertos estrictamente necesarios (HTTPS, SSH). Cerrar todo lo demás. La base de datos **no** expuesta a internet.
- **SSH:** acceso por llave, no por contraseña. Deshabilitar login de root directo si es posible.
- **Actualizaciones:** mantener Ubuntu y los servicios con parches de seguridad al día.
- **Aislamiento:** el proceso de la aplicación corre con el mínimo privilegio necesario, no como root.
- **Consideración de recursos (vCPU único):** además de rendimiento, el núcleo único es un tema de seguridad — un ataque de saturación (DoS) o un proceso descontrolado puede tumbar el sistema. Poner límites, rate limiting, y timeouts en operaciones pesadas.

---

## 9. Integraciones externas (superficie de riesgo)

**Google Forms → M5 (sincronización):**
- La conexión usa credenciales de Google resguardadas como secreto.
- Los datos de familias/menores que llegan por esta vía se validan y sanitizan antes de guardarse.
- El canal es HTTPS. Los datos no se registran en logs durante el tránsito.

**Link de encuesta → M6 (acceso público):**
- Es la única puerta sin autenticación del sistema: máxima vigilancia.
- El endpoint **solo acepta** la evaluación de un servicio; no consulta ni devuelve ningún dato.
- El link no debe ser adivinable (usar identificadores no secuenciales/aleatorios).
- Validar y sanitizar todo lo que entra por ahí. Rate limiting para evitar abuso.
- El link no expone datos de la familia, del niño, ni de la nannie.

---

## 10. Prácticas de código seguro (transversales)

- **Validación y sanitización** de toda entrada de usuario, siempre, en el backend.
- **Escape de salida** para prevenir XSS: nunca renderizar en el frontend contenido de usuario sin escapar.
- **Manejo de errores discreto:** los mensajes de error al usuario no revelan detalles internos (estructura de base de datos, rutas, versiones, stack traces). Los detalles van a logs internos protegidos, no a la pantalla.
- **Logs sin PII:** los registros del sistema no contienen datos de menores, credenciales, ni datos financieros sensibles.
- **Principio de menor exposición en APIs:** cada endpoint devuelve solo los campos necesarios para su función, nunca "todo el objeto por comodidad".
- **CORS** configurado de forma restrictiva: solo el dominio del sistema.

---

## 11. Checklist de seguridad antes de liberar

Antes de que el sistema (o cada módulo) pase a producción, verificar:

- [ ] Ningún secreto en el código ni en el historial del repositorio.
- [ ] `.env` fuera del control de versiones.
- [ ] Permisos verificados en backend en cada endpoint (rol + campo).
- [ ] Datos de menores nunca enviados a roles sin permiso (verificado en backend).
- [ ] Margen financiero solo llega a Directora.
- [ ] Contraseñas hasheadas, tokens seguros, HTTPS forzado.
- [ ] Consultas parametrizadas (sin SQL concatenado).
- [ ] Entrada validada y sanitizada en todos los puntos de entrada.
- [ ] `npm audit` sin vulnerabilidades críticas/altas.
- [ ] Dependencias justificadas, reputadas, versiones fijadas.
- [ ] Firewall configurado, puertos mínimos, BD no expuesta.
- [ ] Proyecto anterior removido del VPS.
- [ ] Link de encuesta no adivinable y aislado.
- [ ] Logs sin PII ni secretos.
- [ ] Backups configurados y protegidos.

---

## 12. Regla final

Ante cualquier decisión de construcción donde la seguridad y la conveniencia entren en conflicto, **la seguridad gana**. Si una funcionalidad no se puede hacer de forma segura, no se hace hasta encontrar la forma segura. Este sistema cuida datos de niños: ese es el estándar.

---

*Documento de seguridad · Nannies Child Care × Operalia · OAL Fase 1 · Julio 2026*
*Complementa a ARQUITECTURA-SISTEMA-NANNIES.md · Carácter obligatorio para toda la construcción.*
