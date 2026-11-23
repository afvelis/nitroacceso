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

### 23/11/2026 — Fase 2 (revalidación de estado) escrita; PENDIENTE de ejecutar el SQL y de probar en navegador

**Escrito (código en la rama de trabajo; no probado todavía):**

- Migración [`supabase/migrations/0011_p1_02_revalidacion_estado_puerta.sql`](../supabase/migrations/0011_p1_02_revalidacion_estado_puerta.sql) con `CREATE OR REPLACE` de las tres RPC de marcar (`f_puerta_marcar_vendedor`, `f_puerta_marcar_persona`, `f_puerta_marcar_cortesia`). Firma, volatilidad, `SECURITY DEFINER`, `SET search_path` y lógica de UPDATE identificas a la de producción (0001/0003); solo se añaden, después del check de rol y del formato de parámetros: lectura de `config` en UNA consulta (`edicion_abierta`, `dia_activo`, `dia1_cerrado`, `dia2_cerrado`; sin fila → false), rechazo si `edicion_abierta` (criterio 3), rechazo si `p_dia <> dia_activo` en vendedor y cortesía (criterio 4), rechazo si el día está cerrado, y en persona el UPDATE filtra la lista con `l.dia = dia_activo` del servidor (persona no recibe `p_dia`; no se cambió la firma para no romper al cliente). Sin `drop function`; grants/revoke no repetidos (conserva los de 0001).
- DECISIÓN registrada: se evaluó exigir `listas.estado = 'en_puerta'` en `f_puerta_marcar_persona` y se DESCARTÓ: ninguna RPC mueve una lista a 'en_puerta' salvo `f_puerta_cerrar_lista(p_cerrada:false)`, que desde la fase 1 es solo del supervisor, y las listas nacen 'en_edicion' (default de 0001). Exigir 'en_puerta' habría obligado al supervisor a reabrir una por una todas las listas antes de que la puerta pudiera autorizar a nadie: rompería el día del evento. Se conservó `l.estado <> 'cerrada'` y se añadió `l = dia_activo`. El paso «lista abierta» de la tarea sigue con esta visión más estricta PENDIENTE de decidir (habría que añadir una RPC o flujo admin que ponga listas en 'en_puerta').
- Cliente [`js/puerta.js`](../js/puerta.js): dos funciones nuevas junto a `verificarEstadoEvento()` — `estadoEventoOperativo()` (reconsulta `f_puerta_estado` antes de cada autorización; si el evento está en edición muestra la tarjeta "Evento aún abierto" + modal propio; si el día cambió, actualiza `diaActivo`/selector + modal propio; si ni siquiera contesta, fail-closed con modal y NO llama a la RPC) y `resolverRechazoAutorizacion()` (si la RPC de marcar devuelve `false`, reconsulta el estado, distingue evento en edición / día cambió / otra causa y devuelve el texto para la tarjeta). Las cuatro llamadas a `f_puerta_marcar_*` (vendedor js/puerta.js:609, cortesía por lista :729, cortesía individual :812, persona de lista :1135) van precedidas del chequeo y en caso de rechazo pinto el motivo DENTRO de la tarjeta junto al botón en un contenedor nuevo por tarjeta (`#msgAutVendedor`, `#msgAutCortesiaLista`, `#msgAutCortesiaInd`, `#msgAutPersona`), reutilizando el patrón existente `pintarAviso`/`aviso aviso-rojo` y pintando después del repintado para que sobreviva (norma v2.2). Sin `alert`/`confirm`/`prompt` nuevos (el `window.alert` ya existente redirige al modal propio).
- Referencias de `docs/dev-local.md` §9 actualizadas en el mismo trabajo: `js/puerta.js:434-437` → `js/puerta.js:506-509` y `js/puerta.js:1111-1114` → `js/puerta.js:1247-1250` (el volcado de editar `js/puerta.js` desplazó las líneas). `scripts/verificar-arranque.py` da OK en "seccion 9 de dev-local" tras el ajuste.
- Manual: [`docs/manual-usuario/06-puerta.md`](../docs/manual-usuario/06-puerta.md) actualizado con los mensajes nuevos (evento en edición, día cambiado, rechazo concreto en la tarjeta y fail-closed por conexión) y anotación de que están pendientes de prueba.

**Pendiente (no marcar los criterios 3 y 4 hasta tener las pruebas):**

1. `pg_get_functiondef` de las tres RPC en staging ANTES de ejecutar el SQL (instrucción permanente del proyecto) y luego ejecutar `0011_p1_02_revalidacion_estado_puerta.sql` completo en el SQL Editor de staging (`adoqujnnnrlgmvwbnwbl`), seguido de la consulta de conteo de verificación de siempre (un "Success" no es verificación).
2. Prueba en navegador (criterio 3, tarea :63): con la pestaña de puerta abierta, abrir edición desde admin y escanear: la autorización debe fallar mostrando el motivo; repetir con autorizar en lista y cortesía.
3. Prueba en navegador (criterio 4, tarea :64): cerrar Día 1 desde otra pestaña y escanear en la pestaña vieja: el panel se actualiza al Día 2 y no autoriza nada del Día 1.
4. Verificar que el flujo normal de escaneo no regresa (criterio 6): autorizar vendedor, persona de lista y cortesía funciona igual que antes.
5. Fallback manual del día del evento: si la verificación del estado falla por conexión, la puerta cancela la autorización; tener plan de a dedo con lista impresa.

Verificado por el agente con herramientas disponibles: `node --check js/puerta.js` (sintaxis OK) y `python3 scripts/verificar-arranque.py` (OK en "seccion 9 de dev-local"; la única FALLA —"contiene main: 1 commit de retraso"— es situacion previa de git de la rama, ajena a este cambio). NO verificado por el agente: ejecución del SQL (lo ejecuta el usuario) y prueba en navegador.
