---
id: "M-38"
titulo: "Aprobación de coordinadores desde el dashboard (solicitar → aprobar/rechazar)"
prioridad: "P2"
estado: "pendiente"
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

> Pendiente. Primer paso obligatorio: definir el origen de la solicitud con el usuario.
