# Backlog de Nitroacceso

Este directorio es la fuente de verdad de las tareas pendientes del proyecto. Cada archivo de tarea es accionable, con contexto, evidencia, pasos y criterios de aceptación, pensado para que un agente (o una persona) lo tome de principio a fin sin tener que reconstruir el análisis.

La revisión que originó este backlog está en [00-revision-seguridad.md](00-revision-seguridad.md). Léela primero si necesitas contexto; las tareas ya incluyen lo esencial.

---

## Cómo debe trabajar un agente

1. **Lee** [00-revision-seguridad.md](00-revision-seguridad.md) y este README.
2. **Elige una sola tarea** con `estado: pendiente`, prioridad más alta y dependencias resueltas.
3. **Cambia** en el frontmatter de esa tarea `estado: pendiente` por `estado: en_progreso`.
4. **Implementa** los pasos. Si algo no se puede hacer desde este repo (por ejemplo, SQL en Supabase), documenta el SQL exacto, dónde se aplicó y cómo se verificó.
5. **Verifica** los criterios de aceptación. No marques `hecho` sin evidencia.
6. **Actualiza** el frontmatter a `estado: hecho` y añade una sección `## Notas de implementación` con:
   - qué cambió;
   - archivos tocados;
   - pruebas ejecutadas;
   - riesgos o pendientes que quedaron.
7. Si te bloqueas, usa `estado: bloqueado` y explica el bloqueo concreto en `## Notas de implementación`.

### Reglas

- **No ejecutes pruebas destructivas ni de fuerza bruta contra producción.** Usa un proyecto de staging o datos de prueba.
- **No imprimas tokens, claves ni datos personales** en logs, commits o capturas.
- **No commitees secretos.** La clave publicable de Supabase puede estar en el cliente; una `service_role` o una contraseña de base de datos, nunca.
- **No asumas que el frontend es la autorización.** Si una tarea toca permisos, el cambio real debe estar en la RPC/RLS; el cambio de UI es solo cosmético.
- **No rompas el flujo del evento sin fallback.** Si cambias QR, escaneo o sesión, deja una forma manual de operar.
- Los números de línea en las tareas son una referencia; verifica el archivo actual antes de editar.

---

## Convenciones

Cada tarea usa este frontmatter:

```yaml
---
id: "P0-01"
titulo: "Descripción corta"
prioridad: "P0"          # P0 crítico, P1 alto, P2 mejora, P3 cosmético
estado: "pendiente"      # pendiente | en_progreso | bloqueado | hecho | descartado
area: "seguridad"        # seguridad | integridad | operacion | frontend | datos
depende_de: []           # IDs de otras tareas
archivos:
  - "ruta/al/archivo"
---
```

Usa [PLANTILLA.md](PLANTILLA.md) para crear tareas nuevas. No renombres los IDs una vez creados; agrega tareas nuevas al final.

---

## Índice

| ID | Tarea | Prioridad | Estado | Depende de |
|---|---|---|---|---|
| [P0-01](P0-01-xss-escape.md) | Eliminar el XSS almacenado y centralizar el escape | P0 | **hecho** (28/10/2026) | — |
| [P0-02](P0-02-rls-autorizacion.md) | Verificar y cerrar RLS, grants y autorización por rol | P0 | **hecho** (29/10/2026) | — |
| [P0-03](P0-03-login-sesiones.md) | Endurecer PIN, rate limit, tokens y bloqueo de sesión | P0 | **hecho** (29/10/2026) | — |
| [P0-04](P0-04-qr-csp-dependencias.md) | QR local, dependencias vendorizadas y CSP | P0 | **hecho** (30/10/2026) | — |
| [P0-05](P0-05-backups-limpieza.md) | Backups, exportación y limpieza segura | P0 | **hecho** (31/10/2026) · Alcance A: respaldo JSON + candado doble + re-autenticación PIN + confirmación tipada + dry-run con conteos exactos (fases B-D absorbidas por M-37) | — |
| [P0-06](P0-06-metas-no-referrer-noindex.md) | Reponer meta no-referrer y noindex en las páginas | P0 | **hecho** (31/10/2026) | P0-04 |
| [P0-07](P0-07-vuelta-atras-volcado-restauracion.md) | Vuelta atrás: volcado/restauración por SQL Editor (canal único y simétrico) | P0 | **hecho** (20/11/2026: probado a volumen el 17/11 — volcado de producción de 15 tablas/317 filas restaurado íntegro sobre staging con huella de contenido idéntica `e3c3141c1914c4820cd9e4075da86166`, prueba destructiva + re-restauración incluida, criterios b/d/e/h re-verificados; huella en `docs/sql/huella-contenido.sql`; criterios (f) y (g) probados en staging el 20/11) | — |
| [P1-01](P1-01-integridad-escaneos-cupones.md) | Escaneos atómicos, cupones y cédulas duplicadas | P1 | **en_progreso** (0007/0008/0009 aplicadas en staging; tests seguros de 0008/0009 en main, PR #41; pendientes: prueba entre dos listas y reserva simultánea del último cupón, con datos controlados) | P0-02 |
| [P1-02](P1-02-roles-estado-puerta.md) | Rol supervisor y revalidación de estado en puerta | P1 | pendiente | P0-02 |
| [P1-03](P1-03-auditoria-privacidad.md) | Auditoría de acciones y privacidad de datos | P1 | **en_progreso** (unidad 1a: cédula enmascarada en 15 renders; unidad 1b: 0013 ejecutada en prod, 0016 pendiente prod; unidad 2: 0017 + 0018 ejecutadas en staging con éxito — tabla audit_log existe, 8 RPC integradas con auditoría, pendientes producción) | P0-02 |
| [P1-04](P1-04-staging-migraciones-tests.md) | Staging, migraciones, tests y CI | P1 | **en_progreso** (Fases A, B y C-vía-A hechas, PR #20; vía B probada en pantalla 14/11, nota (x); quedan tests E2E automatizados y lint, decisión del usuario) | P0-02 |
| [P1-05](P1-05-revelado-cedula-auditado.md) | Revelado auditado de cédula (admin) y fallback manual | P1 | **en_progreso** (SQL 0015 y fallback docuado; pendiente probar en pantalla tras aplicar la migración) | P1-03 |
| [P2-01](P2-01-offline-pwa.md) | Modo offline y cola de escaneos para el día del evento | P2 | pendiente | P0-04 |
| [P2-02](P2-02-refactor-accesibilidad.md) | Refactor a módulos compartidos y accesibilidad | P2 | pendiente | P1-04 |
| [P2-03](P2-03-observabilidad-runbook.md) | Observabilidad y runbook de incidentes | P2 | pendiente | P1-03 |
| [F-1](F-1-talento-copiar-dia2.md) | Reparar el botón «Repetir y editar la del Día 1» en talento.html | P1 | **hecho** (09/11/2026) | — |
| [F-2](F-2-coord-mis-links-orden-cupo.md) | Reordenar «Mis links» de coord.html (más nuevo primero) y evaluar mostrar cupo | P2 | pendiente | — |
| [F-3](F-3-auditoria-edicion-abierta-cerrada.md) | Revalidar la lógica edición-abierta / edición-cerrada módulo por módulo | P2 | pendiente | — |
| [F-4](F-4-qr-talento-codigo-corto.md) | Mostrar el código corto en el QR del talento | P2 | hecho | — |
| [F-5](F-5-puerta-parametros-tras-login.md) | Conservar los parámetros ?lista=/?v= tras el login de puerta.html | P2 | **hecho** (23/11/2026) | — |
| [F-6](F-6-talento-copiar-selectivo.md) | Copiar del Día 1 al Día 2 selectivo, repetible y siempre visible | P1 | **hecho** (11/11/2026) | — |
| [F-7](F-7-modales-nativos.md) | Sustituir los diálogos nativos por los modales de la app (regla v2.1) | P1 | **hecho** (11/11/2026, PR #14) | — |
| [F-8](F-8-reautorizacion-reescribe-hora.md) | La reautorización en puerta reescribe `marcado_dia1_at` y no deja rastro del doble escaneo | P2 | **hecho** (14/11/2026, staging y producción) | — |
| [F-9](F-9-dia-fuera-de-rango.md) | `f_puerta_marcar_vendedor` no valida `p_dia`: un valor fuera de rango autoriza otro día | P1 | **hecho** (14/11/2026, staging; pendiente aplicar en producción) | — |
| [F-10](F-10-contador-disponibles-no-resta-lista.md) | El contador «Disponibles» del stand no resta la lista de espera | P2 | **hecho** (14/11/2026, PR #27) | — |
| [F-11](F-11-doble-punto-hora-puerta.md) | Doble punto final en la hora de «ENTRADA YA CONSUMADA» en puerta | P3 | **hecho** (14/11/2026, PR #26) | — |
| [M-33](M-33-vista-anulada-aliado.md) | Humanizar la vista «anulada» del aliado | P2 | **hecho** (23/11/2026) | — |
| [M-34](M-34-fecha-creacion-tarjeta-admin.md) | Mostrar la fecha de creación en la tarjeta del aliado (aliados.html) | P2 | **hecho** (23/11/2026) | — |
| [M-35](M-35-nombres-premios-anulados.md) | Mostrar nombres de premios anulados (requiere cambio de RPC) | P2 | pendiente | — |
| [M-36](M-36-modulo-reclamos.md) | Módulo de reclamos | P2 | **en_progreso** (fase 1 construida y probada 24/11/2026; pendientes: envío vacío y contador; fases 2 y 3 sin empezar) | — |
| [M-37](M-37-multi-evento.md) | Multi-evento: gestionar hasta 3 eventos simultáneos desde el dashboard | P2 | pendiente | P1-04 |
| [M-38](M-38-aprobacion-coordinadores.md) | Aprobación de coordinadores desde el dashboard (solicitar → aprobar/rechazar) | P2 | pendiente | — |
| [M-39](M-39-informe-agregado-patrocinadores.md) | Informe agregado para patrocinadores (sin datos personales) | P1 | **en_progreso** | — |
| [P0-08](P0-08-desbloqueo-puerta.md) | Desbloqueo de puerta y rediseño del bloqueo de login | P0 | **hecho** (20/11/2026: RPC de reapertura con auditoría, contadores separados por rol, ventanas 90 s / 15 min, botón en el panel; batería de 10 pruebas en staging; incidente PGRST202/PGRST203 resuelto con la 0006) | P0-07 |
| [F-13](F-13-pin-8-digitos-bcrypt-12.md) | PIN de 8 dígitos y bcrypt coste 12 (más capítulo de manual) | P1 | **hecho** (17/11/2026: migración 0004 aplicada y verificada con los cinco booleanos en staging y en PRODUCCIÓN; PIN rotados a 8 dígitos y entrada real verificada a las dos pantallas) | P0-07 |
| [P2-04](P2-04-ci-depende-de-pin-de-staging.md) | El CI depende de los PIN de demo de staging: rotar un PIN tumba la suite de todo el repo | P2 | **hecho** (22/11/2026: preflight del entorno en `tests/preflight-entorno.mjs` + paso en el CI; `docs/dev-local.md` §6 documenta restaurar los PINs de demo tras rotar) · PR #44 | — |
| [P0-09](P0-09-ci-f-login-un-argumento.md) | El CI prueba f_login con un solo argumento y no cubre los cubos por rol | P2 | **en_progreso** (`login(pin, rol)` con rol explícito + tests de firma/rol en CI, PR #42; pendiente prueba MANUAL de aislamiento de 5 fallos: `node tests/negativos-login.manual.mjs`, sin demo en curso) | — |
| [P0-10](P0-10-csp-hash-puerta-desfasado.md) | CSP de puerta.html con hash style-src desfasado (página sin estilos) | P0 | **hecho** (25/11/2026: hash `style-src` corregido en `puerta.html:5` y confirmado en pantalla en producción; guardia nuevo en `scripts/verificar-arranque.py` que verifica los hashes CSP de todas las páginas; el defecto estuvo vivo del 20/11 al 25/11) | — |

---

## Orden recomendado

1. **P0-01** (XSS): es el riesgo más directo y se puede corregir sin tocar Supabase. ✅ HECHO 28/10/2026.
2. **P0-02** (RLS/autorización): define si el resto de los controles sirven. ✅ HECHO 29/10/2026.
3. **P0-03** (sesiones): reduce el impacto de un token robado. ✅ HECHO 29/10/2026 — PINs de 6 dígitos con bcrypt, rate limit 5 fallas/15 min, sesiones de 8 h solo-hash, revocación y salida real, auto-bloqueo 5 min. Detalle en [P0-03](P0-03-login-sesiones.md) y en `docs/seguridad-sesiones.md`.
4. **P0-04** (QR/CSP): quita dependencias externas y reduce exfiltración. ✅ HECHO 30/10/2026 (5/5 fases, CSP en 14/14 páginas).
5. **P0-05** (backups): protege contra el error humano y el borrado accidental. ✅ HECHO 31/10/2026 (alcance A: respaldo JSON + candado doble + re-autenticación PIN + confirmación tipada + dry-run; fases B-D absorbidas por M-37).
6. **P1-01** y **P1-02**: integridad y separación de roles en puerta.
7. **P1-03** y **P1-04**: auditoría, privacidad y base para probar con seguridad.
8. **P2**: confiabilidad, mantenibilidad y operación.
9. Las tareas **F-1…F-5** (hallazgos de la prueba en vivo del 28/10/2026) y **M-33…M-38** (ideas de producto) están fuera del orden de seguridad: se toman una a la vez cuando el usuario lo decida. F-1 quedó HECHA el 09/11/2026 (causa raíz en la RPC `f_link_talento_copiar`, arreglada en la base por el usuario y verificada con transacción y ROLLBACK) y F-7 quedó fusionada (PR #14). Al 12/11 ya no quedaba ninguna P1 de las tareas F; el cierre de la Sesión 26 (13/11) añadió **F-9 (P1)** y **F-8 (P2)**, hallazgos del servidor que exigen `pg_get_functiondef` y orden explícita del usuario antes de tocar la RPC, y el cierre de la Sesión 27 (14/11) añadió **F-10 (P2)** y **F-11 (P3)**, hallazgos de la prueba en navegador de la vía B de P1-04. **M-37** es el siguiente gran paso aprobado por el usuario: multi-evento (hasta 3 simultáneos), se inicia tras cerrar la deuda y con staging (P1-04) — **NO se arranca sin staging**.

---

## Definición de terminado

Una tarea está `hecho` cuando:

- [ ] Los pasos implementados están completos o se documentó explícitamente lo que quedó fuera.
- [ ] Todos los criterios de aceptación están verificados.
- [ ] Existe evidencia de la verificación (comando, captura, test o nota reproducible).
- [ ] No se introdujeron secretos ni datos personales en el repo.
- [ ] Se actualizó el frontmatter y se agregó `## Notas de implementación`.
- [ ] Si hubo cambios de SQL o configuración de Supabase, quedaron documentados y versionados.
