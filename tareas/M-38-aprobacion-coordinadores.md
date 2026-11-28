---
id: "M-38"
titulo: "Aprobación de coordinadores desde el dashboard (solicitar → aprobar/rechazar)"
prioridad: "P2"
estado: "hecho"
area: "datos"
depende_de: []
archivos:
  - "dashboard.html"
  - "js/dashboard.js"
  - "admin.html"
  - "js/admin.js"
---

# M-38 · Aprobación de coordinadores desde el dashboard (solicitar → aprobar/rechazar)

## Contexto

Idea del usuario (31/10/2026, sesión 18), surgida al imaginar el dashboard multi-evento: hoy el admin crea coordinadores directamente (RPC genera el código y el admin lo entrega). El usuario quiere un flujo de **solicitud → aprobación/rechazo** concentrado en el dashboard, para no dar acceso directo sin filtro.

## Evidencia

- Creación actual de coordinadores: RPC de admin genera el código al vuelo (panel "Coordinadores" en admin.html / js/admin.js).
- El coordinador hoy no tiene login propio: recibe un código y entra por coord.html con él.

## Objetivo

Que la creación de un coordinador pase por una solicitud que el admin aprueba o rechaza desde el dashboard, dejando registro de quién decidió y cuándo.

## Diseño propuesto (a definir con el usuario)

1. **Origen de la solicitud** (decidir): ¿una página pública donde el coordinador se postula (nombre + correo/teléfono), o el admin mismo registra la solicitud recibida por WhatsApp? La primera exige página pública anti-abuso (rate limit); la segunda es solo un cambio de flujo interno.
2. **Tabla `solicitudes_coordinador`**: id, tipo (talentos/stands), nombre, contacto, estado (`pendiente` | `aprobada` | `rechazada`), evento_id (si ya existe M-37), solicitado_at, decidida_at.
3. **RPC**: `f_solicitar_coordinador` (pública, con rate limit) o `f_admin_registrar_solicitud`; `f_admin_listar_solicitudes`, `f_admin_decidir_solicitud` (aprueba → genera el código igual que hoy; rechaza → guarda el motivo).
4. **Dashboard**: tarjeta "Solicitudes pendientes" con aprobar/rechazar; el código se entrega igual que ahora.

## Pasos

- [ ] Definir con el usuario el origen de la solicitud (página pública vs registro interno).
- [ ] SQL en staging: tabla + RPCs con rate limit y RLS.
- [ ] Dashboard: tarjeta de solicitudes con aprobar/rechazar + historial.
- [ ] Regresión del flujo de coordinadores existente (revocar, eliminar, regenerar).

## Criterios de aceptación

- [ ] Ningún coordinador queda activo sin una decisión registrada del admin.
- [ ] Aprobar genera el código con el mismo comportamiento actual (no rompe coord.html).
- [ ] El rechazo queda registrado con motivo y fecha.

## Verificación

1. En staging: crear solicitud, aprobar → coordinador activo con código; crear otra, rechazar → queda registrada.
2. Rate limit de la solicitud pública (si aplica) probado en staging.

## Fuera de alcance

- Login propio de coordinadores (siguen entrando por código).
- El gestor multi-evento ([M-37](M-37-multi-evento.md)); si M-37 ya existe, las solicitudes se ligan al evento activo.

## Notas de implementación

**28/11/2026 — M-38 implementado (fase servidor + pantallas). Origen de invitación aprobado: página pública con link privado, rate limit.**

- Decisiones sobre el diseño original del brief:
  - La tabla se llama `coordinator_invitations` y el link es `coordinator.html?i=INV-8`. Se añadió `ip_aceptacion` (fuera del brief) para actualizar la fila y poder auditar la aceptación pública.
  - `creador_token`/`aceptado_por` nacieron `uuid` en el brief, pero guardan **hash hex sha256 del token de sesión** (regla vigente del repo desde P0-03: nunca tokens en claro).
  - RPC extra no prevista en el brief: `f_invitacion_ver(p_codigo)` (pública, solo `tipo` + `estado`, nunca nombre/contacto) para pintar coordinator.html sin revelar datos; y `f_admin_crear_invitacion` (implícita en el formulario "Crear invitación").
  - La gestión de coordinadores ya creados (revocar/reactivar/eliminar/editar) se MUDÓ a la pestaña "Coordinadores creados" de coord-invitas.html (mismo criterio "mover a coord-invitas.html"); admin.html queda sin sección de coordinadores.

- `supabase/migrations/0022_m38_invitaciones_coordinadores.sql`: tabla `coordinator_invitations` (RLS, sin grants para anon/authenticated, checks de longitud/estado/tipo, motivo de rechazo 10–500) + 6 RPC:
  - `f_admin_crear_invitacion` (admin; 5 intentos de `f_codigo('INV-',8)` por unique).
  - `f_invitacion_ver` (pública, minimizada).
  - `f_coordinador_aceptar` (pública, js/coordinator.js): candado consultivo `pg_advisory_xact_lock(hashtext(codigo))`, exige `estado='pendiente'` (no se acepta dos veces) y anti-spam de contacto: máximo 1 aceptación por el MISMO email/telefono/nombre en 24 h (`LIMITE_DIARIO`); crea el coordinador con `f_codigo('COORD-', 8)` como `f_admin_crear_coordinador` (mismo comportamiento que la RPC antigua de admin). IP via `request.headers` (mismo patrón que `f_login`).
  - `f_admin_listar_invitaciones` (admin, filtro por tipo, creada_at desc, tope 300), `f_admin_rechazar_invitacion` (admin, motivo ≥10), `f_admin_aceptar_invitacion` (admin, sin anti-spam, `aceptado_por` = hash del token).
- `coord-invitas.html` + `js/coord-invitas.js` (nuevos): sesión admin exigida (redirige a index.html si no), 3 pestañas (crear / lista filtrable con paginado de 20 + "Mostrar todas" + CSV / coordinadores creados mudados de admin.html), validación v2.2, modales propios (rechazo con motivo obligatorio; aceptación a nombre del coordinador muestra el código con copiar/WhatsApp/correo), mensajes dentro de la tarjeta (v2.2).
- `coordinator.html` + `js/coordinator.js` (nuevos): página pública limpia, lee `?i=`, consulta `f_invitacion_ver`, valida campos con borde/aria-invalid/texto bajo el campo, muestra código y redirige a `coord.html?c=COORD` (mismo patrón de enlace que admin usaba); errores bloqueantes en modal propio `NA.avisar`.
- `dashboard.html`: el botón "➕ Crear coordinador" (a admin.html#crear-coordinador) pasó a ser `👥 Coordinadores` a coord-invitas.html (título "Acceso rápido: coordinadores"). Sin cambio en js/dashboard.js: es un enlace estático como los otros accesos rápidos.
- `admin.html` sin las secciones "Crear coordinador" y "Coordinadores creados"; `js/admin.js` sin `crearCoord/cargarLista/tarjetaCoord/mostrarEdicion/revocar/borrarDefinitivo/urlWA/urlMail` ni sus listeners (el respaldo completo sigue tirando de `f_admin_listar_coordinadores` para el JSON).
- `docs/dev-local.md` §9 y `scripts/verificar-arranque.py` (`PARAMETROS_ESPERADOS`) e `ARQUITECTURA.md` actualizados con `?i=` (coordinator.html).
- Documentación de usuario actualizada: 02-panel-y-dias.md (accesos rápidos) y 07-aliados-y-coordinadores.md (Parte A reescrita por el flujo de invitaciones).

- Verificación hecha: `node --check` OK en `js/coord-invitas.js`, `js/coordinator.js`, `js/dashboard.js`, `js/admin.js` y `js/puerta.js` (puerta.html/js NO tocados); hashes CSP de las 2 páginas nuevas calculados y verificados con el recuento del verificador de arranque (los 2 FALLAs que quedan son los previos de main, proyectos P0-10 y la sección "relevo" de puerta de casos de "?lista=/?v=...").

- **PENDIENTE (colgado del flujo normal): el usuario ejecuta el SQL 0022 en staging y se verifica por catálogo (conteo, no por el "Success"): tabla `coordinator_invitations` con 0 policies y grants; 6 RPC nuevas; prueba en pantalla de crear → aceptar (link) → rechazar (motivo) y de un 2do intento con el mismo contacto (LIMITE_DIARIO).**
