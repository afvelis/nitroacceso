---
id: "P1-02"
titulo: "Rol supervisor y revalidación de estado en puerta"
prioridad: "P1"
estado: "en_progreso"
area: "seguridad"
depende_de: ["P0-02"]
archivos:
  - "puerta.html"
  - "config.js"
  - "dashboard.html"
---

# P1-02 · Rol supervisor y revalidación de estado en puerta

## Contexto

Cualquier token de puerta puede cerrar el Día 1 y activar el Día 2, y también reabrir una lista cerrada. Eso debería ser una acción de supervisor o admin. Además, el estado de “evento en edición” y el día activo se consultan al cargar la página, no antes de cada escaneo: si el admin reabre la edición o cambia el día desde otro dispositivo, una puerta ya abierta puede seguir autorizando con estado viejo.

## Evidencia

- [js/puerta.js:209-246](../js/puerta.js#L209-L246): Handler de "Cerrar Día 1 y activar Día 2" — modal propio de confirmación y resultado pintado dentro de la tarjeta (norma v2.2); la RPC `f_puerta_cerrar_dia_y_activar_siguiente` se llama desde aquí (antes estaba citada en `puerta.html`, el código vivo vive en `js/puerta.js`).
- [js/puerta.js:1057-1091](../js/puerta.js#L1057-L1091): botón “Reabrir lista” → `f_puerta_cerrar_lista` con `p_cerrada: false`.
- [js/puerta.js:248-271](../js/puerta.js#L248-L271): `verificarEstadoEvento()` — se llama solo al arrancar y tras entrar ([js/puerta.js:289](../js/puerta.js#L289), [js/puerta.js:1105](../js/puerta.js#L1105)), no antes de cada escaneo (hueco de la fase 2).
- [config.js:190-196](../config.js#L190-L196): el token y el rol se guardan en `sessionStorage` (`guardarSesion`/`leerSesion`), no hay estado de rol en el servidor.

## Objetivo

Separar las acciones destructivas de puerta en un rol `supervisor` (o `admin`) y hacer que el servidor revalide el estado del evento en cada mutación, sin confiar en el estado cacheado del cliente.

## Pasos

- [x] Definir roles: `puerta` (escanea y autoriza), `supervisor` (cierra/reabre listas, cierra día), `admin` (todo).
- [x] Actualizar `f_login` y las RPC para devolver/validar el rol `supervisor`.
- [x] Restringir `f_puerta_cerrar_dia_y_activar_siguiente` y `f_puerta_cerrar_lista` a `supervisor`/`admin`.
- [x] En la UI de puerta, ocultar esos botones si el rol no es `supervisor`; el ocultamiento es cosmético, la RPC debe rechazar igual.
- [ ] Antes de cada autorización, el servidor debe comprobar: evento no en edición, día correcto, lista abierta, pase no anulado, pase no consumido.
- [ ] En el cliente, reconsultar `f_puerta_estado` antes de cada escaneo o cada N segundos, y bloquear si el estado cambió.
- [ ] Si el día cambia mientras hay una puerta abierta, forzar recarga o volver al selector de día.
- [x] Registrar en auditoría quién cerró/reabrió y por qué (motivo opcional).
- [ ] Probar el escenario: admin reabre edición mientras puerta escanea; la siguiente autorización debe fallar.

## Criterios de aceptación

- [x] Un token de `puerta` no puede cerrar el día ni reabrir una lista.
- [x] Un token de `supervisor` sí puede, y queda registrado.
- [ ] Si el evento está en edición, toda autorización falla aunque la pestaña se haya cargado antes.
- [ ] Si el día activo cambió, una puerta con estado viejo no puede autorizar en el día equivocado.
- [x] La UI muestra u oculta los botones según el rol, pero la seguridad no depende de eso.
- [x] No hay regresiones en el flujo normal de escaneo.

## Verificación

En staging:

1. Login como `puerta`, intentar cerrar día y reabrir lista; debe fallar.
2. Login como `supervisor`, hacerlo; debe funcionar y registrarse.
3. Con una pestaña de puerta abierta, abrir edición desde admin y escanear; debe fallar.
4. Cerrar Día 1 desde otra pestaña y escanear en la pestaña vieja; debe rechazar.

## Fuera de alcance

- Rediseñar todos los permisos de admin.
- La UI de auditoría completa (ver [P1-03](P1-03-auditoria-privacidad.md)).

## Notas de implementación

### 22/11/2026 — Fase 1 (roles + permisos + auditoría) HECHA y probada en staging; fase 2 PENDIENTE

**Estado:** `en_progreso`. Probados los criterios 1, 2, 5 y 6; los criterios 3 y 4 (revalidación de estado) corresponden a la fase 2, que NO se ha empezado.

**Cumplido (pasos 1-4 y 8), con prueba ejecutada el 22/11/2026:**

- Migración [`supabase/migrations/0010_p1_02_rol_supervisor.sql`](../supabase/migrations/0010_p1_02_rol_supervisor.sql) aplicada en staging (`adoqujnnnrlgmvwbnwbl`) y verificada con 10 comprobaciones: columna nueva `config.pin_supervisor`; los dos CHECK de roles ampliados a `admin|puerta|supervisor`; tabla `acciones_supervisor` con RLS activada y privilegios cerrados; `f_login` con rama supervisor; `f_sesion_ok(p_token,'puerta')` ampliada para aceptar también `supervisor`; las dos RPC reescritas (`f_puerta_cerrar_dia_y_activar_siguiente` y `f_puerta_cerrar_lista`) restringidas a `supervisor`/`admin`; `f_admin_rotar_pin` con tres objetivos (admin, puerta, supervisor).
- Pruebas en navegador (dev-server local contra staging): el supervisor ve el panel de cerrar día y el modal propio; cerró el Día 1 de verdad y quedó `config.dia_activo = 2`, `dia1_cerrado = true`, `dia2_cerrado = false`, con 1 fila en `acciones_supervisor` (`accion='cerrar_dia'`, `sesion_token_hash` de 64 caracteres —sha256, nunca el token en claro— y `detalle` con `dia_nuevo`, `listas_cerradas` y `rol`).
- Con el rol `puerta` (PIN de staging) NO aparecen los botones «Cerrar Día 1» ni «Reabrir lista» y la búsqueda funciona normal (criterio 1 y 6; el ocultamiento es cosmético, la RPC rechaza igual).
- Los mensajes de cerrar día y reabrir lista se pintan dentro de la tarjeta de cada acción (`js/puerta.js`), no con `alert()` (norma v2.2).

**Pendiente (pasos 5-7 y 9) — FASE 2, no hecha:** revalidación de estado en el servidor en cada autorización (evento no en edición, día correcto, lista abierta, pase no anulado ni consumido) y reconsulta de `f_puerta_estado` en el cliente antes de cada escaneo, con bloqueo/recarga si cambió el día. Requiere una migración `0011` sobre `f_puerta_marcar_vendedor`, `f_puerta_marcar_persona` y `f_puerta_marcar_cortesia`, y `pg_get_functiondef` de las tres ANTES de reescribirlas.

**Deuda anotada, fuera de alcance:** quedan `alert()` en `js/puerta.js` (los del flujo de escaneo, no los de cerrar día/reabrir) que incumplen la norma v2.2; merecen una tarea propia.
