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
prioridad: "P0"          # P0 crítico, P1 alto, P2 mejora
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
| [P0-02](P0-02-rls-autorizacion.md) | Verificar y cerrar RLS, grants y autorización por rol | P0 | **en_progreso** (29/10/2026) | — |
| [P0-03](P0-03-login-sesiones.md) | Endurecer PIN, rate limit, tokens y bloqueo de sesión | P0 | pendiente | — |
| [P0-04](P0-04-qr-csp-dependencias.md) | QR local, dependencias vendorizadas y CSP | P0 | pendiente | — |
| [P0-05](P0-05-backups-limpieza.md) | Backups, exportación y limpieza segura | P0 | pendiente | — |
| [P1-01](P1-01-integridad-escaneos-cupones.md) | Escaneos atómicos, cupones y cédulas duplicadas | P1 | pendiente | P0-02 |
| [P1-02](P1-02-roles-estado-puerta.md) | Rol supervisor y revalidación de estado en puerta | P1 | pendiente | P0-02 |
| [P1-03](P1-03-auditoria-privacidad.md) | Auditoría de acciones y privacidad de datos | P1 | pendiente | P0-02 |
| [P1-04](P1-04-staging-migraciones-tests.md) | Staging, migraciones, tests y CI | P1 | pendiente | P0-02 |
| [P2-01](P2-01-offline-pwa.md) | Modo offline y cola de escaneos para el día del evento | P2 | pendiente | P0-04 |
| [P2-02](P2-02-refactor-accesibilidad.md) | Refactor a módulos compartidos y accesibilidad | P2 | pendiente | P1-04 |
| [P2-03](P2-03-observabilidad-runbook.md) | Observabilidad y runbook de incidentes | P2 | pendiente | P1-03 |
| [F-1](F-1-talento-copiar-dia2.md) | Reparar el botón «Repetir y editar la del Día 1» en talento.html | P1 | pendiente | — |
| [F-2](F-2-coord-mis-links-orden-cupo.md) | Reordenar «Mis links» de coord.html (más nuevo primero) y evaluar mostrar cupo | P2 | pendiente | — |
| [F-3](F-3-auditoria-edicion-abierta-cerrada.md) | Revalidar la lógica edición-abierta / edición-cerrada módulo por módulo | P2 | pendiente | — |
| [F-4](F-4-qr-talento-codigo-corto.md) | Mostrar el código corto en el QR del talento | P2 | pendiente | — |
| [F-5](F-5-puerta-parametros-tras-login.md) | Conservar los parámetros ?lista=/?v= tras el login de puerta.html | P2 | pendiente | — |
| [M-33](M-33-vista-anulada-aliado.md) | Humanizar la vista «anulada» del aliado | P2 | pendiente | — |
| [M-34](M-34-fecha-creacion-tarjeta-admin.md) | Mostrar la fecha de creación en la tarjeta del aliado (aliados.html) | P2 | pendiente | — |
| [M-35](M-35-nombres-premios-anulados.md) | Mostrar nombres de premios anulados (requiere cambio de RPC) | P2 | pendiente | — |
| [M-36](M-36-modulo-reclamos.md) | Módulo de reclamos | P2 | pendiente | — |

---

## Orden recomendado

1. **P0-01** (XSS): es el riesgo más directo y se puede corregir sin tocar Supabase. ✅ HECHO 28/10/2026.
2. **P0-02** (RLS/autorización): define si el resto de los controles sirven.
3. **P0-03** (sesiones): reduce el impacto de un token robado.
4. **P0-04** (QR/CSP): quita dependencias externas y reduce exfiltración.
5. **P0-05** (backups): protege contra el error humano y el borrado accidental.
6. **P1-01** y **P1-02**: integridad y separación de roles en puerta.
7. **P1-03** y **P1-04**: auditoría, privacidad y base para probar con seguridad.
8. **P2**: confiabilidad, mantenibilidad y operación.
9. Las tareas **F-1…F-5** (hallazgos de la prueba en vivo del 28/10/2026) y **M-33…M-36** (ideas de producto) están fuera del orden de seguridad: se toman una a la vez cuando el usuario lo decida. F-1 es la única P1 porque es un botón que no funciona.

---

## Definición de terminado

Una tarea está `hecho` cuando:

- [ ] Los pasos implementados están completos o se documentó explícitamente lo que quedó fuera.
- [ ] Todos los criterios de aceptación están verificados.
- [ ] Existe evidencia de la verificación (comando, captura, test o nota reproducible).
- [ ] No se introdujeron secretos ni datos personales en el repo.
- [ ] Se actualizó el frontmatter y se agregó `## Notas de implementación`.
- [ ] Si hubo cambios de SQL o configuración de Supabase, quedaron documentados y versionados.
