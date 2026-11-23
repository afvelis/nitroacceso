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
- [ ] Antes de cada autorización, el servidor debe comprobar: evento no en edición, día correcto, lista abierta, pase no anulado, pase no consumido. **(Parcial 23/11/2026: `0011` valida evento en edición, día activo y día cerrado en las tres RPC de marcado; **no** valida pase anulado ni pase consumido — pendiente.)**
- [x] En el cliente, reconsultar `f_puerta_estado` antes de cada escaneo o cada N segundos, y bloquear si el estado cambió. **(Implementado en `js/puerta.js`: `estadoEventoOperativo()` reconsulta antes de cada una de las 4 autorizaciones, y **ejercitado en pantalla el 23/11/2026**: con `edicion_abierta = true` la autorización se bloqueó sin llamar al marcado. Sin polling periódico: se reconsulta antes de autorizar y al recuperar el foco con la tarjeta de evento abierto visible; «cada N segundos» NO es lo que se hizo.)**
- [ ] Si el día cambia mientras hay una puerta abierta, forzar recarga o volver al selector de día. **(Implementado en cliente 23/11/2026: `estadoEventoOperativo()` detecta el cambio de día, actualiza `diaActivo`, refresca el selector y cancela la autorización con aviso. Prueba en PANTALLA pendiente.)**
- [x] Registrar en auditoría quién cerró/reabrió y por qué (motivo opcional).
- [x] Probar el escenario: admin reabre edición mientras puerta escanea; la siguiente autorización debe fallar. **(Probado el 23/11/2026 en staging con una pestaña ya cargada: se puso `edicion_abierta = true`, la siguiente autorización mostró el modal propio y NO autorizó; cerrada la edición sin recargar, la puerta se recuperó con «🔄 Comprobar de nuevo» y autorizó — `Nombre Dos` 19:16:04, `Nombre Tres` 19:18:57, lista `LST-DEMO01-D2` 2/2.)**

## Criterios de aceptación

- [x] Un token de `puerta` no puede cerrar el día ni reabrir una lista.
- [x] Un token de `supervisor` sí puede, y queda registrado.
- [x] Si el evento está en edición, toda autorización falla aunque la pestaña se haya cargado antes. **(Probado en pantalla 23/11/2026: con `edicion_abierta = true` y la pestaña ya cargada, pulsar Autorizar muestra el modal propio y NO autoriza; con la edición cerrada y SIN recargar, la puerta se recupera con «🔄 Comprobar de nuevo» y autoriza — `Nombre Dos` 19:16:04 y `Nombre Tres` 19:18:57; la lista `LST-DEMO01-D2` quedó completada 2/2 y se cerró sola.)**
- [ ] Si el día activo cambió, una puerta con estado viejo no puede autorizar en el día equivocado. **(Nota 23/11/2026: la vía de SERVIDOR está probada por el test de CI «dia no activo: no autoriza en el día equivocado (criterio 4)» en `tests/escaneo.test.mjs`, verde en `main`; la vía de PANTALLA queda PENDIENTE — pestaña vieja con el día cambiado sin recargar.)**
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
2. Prueba en navegador (criterio 3, tarea :47): con la pestaña de puerta abierta, abrir edición desde admin y escanear: la autorización debe fallar mostrando el motivo; repetir con autorizar en lista y cortesía.
3. Prueba en navegador (criterio 4, tarea :48): cerrar Día 1 desde otra pestaña y escanear en la pestaña vieja: el panel se actualiza al Día 2 y no autoriza nada del Día 1.
4. Verificar que el flujo normal de escaneo no regresa (criterio 6): autorizar vendedor, persona de lista y cortesía funciona igual que antes.
5. Fallback manual del día del evento: si la verificación del estado falla por conexión, la puerta cancela la autorización; tener plan de a dedo con lista impresa.

Verificado por el agente con herramientas disponibles: `node --check js/puerta.js` (sintaxis OK) y `python3 scripts/verificar-arranque.py` (OK en "seccion 9 de dev-local"; la única FALLA —"contiene main: 1 commit de retraso"— es situacion previa de git de la rama, ajena a este cambio). NO verificado por el agente: ejecución del SQL (lo ejecuta el usuario) y prueba en navegador.

### 23/11/2026 — El CI dependía de `dia_activo`; la suite de escaneo ahora se adapta y usa el servidor como juez del criterio 4

**Lo que pasó con evidencia (PR #47):** el CI corría `node --test tests/*.test.mjs` contra staging y fallaba 1 de 18 (`tests/escaneo.test.mjs:99`, reautorización idempotente, `expected: true, actual: false`). Causa confirmada, no de código: el test 12 («doble escaneo») llamaba a `f_puerta_marcar_vendedor` con `p_dia: 1` escrito a mano, mientras staging tiene `config.dia_activo = 2` y `dia1_cerrado = true` (fruto de la prueba real de la fase 1). Con la revalidación de `0011` aplicada en staging, la RPC devuelve `false` si `p_dia <> dia_activo` o si el día está cerrado — es decir, la RPC estaba haciendo EXACTAMENTE lo que la fase 2 pide, y el test la castigaba por ello. Defecto estructural: el test 12 exigía `dia_activo = 1` y el test 14 exigía `dia_activo = 2`, así que la suite cambiaba de resultado al avanzar el día del evento.

**Corregido en `tests/escaneo.test.mjs` (mismo commit; solo tests, sin tocar servidor ni `js/puerta.js`):**

- Al cargar el archivo, la suite consulta `f_puerta_estado` con el token de puerta (helper `rpc` ya existente; sin cliente HTTP nuevo) y guarda `dia_activo`. Si `edicion_abierta` es `true`, falla con mensaje claro («staging está en edición: la puerta no puede autorizar...») — fallo de entorno, no un `false` confuso.
- Test 12 «doble escaneo»: `p_dia` pasa a ser el `dia_activo` leído del servidor, y los campos `estado_diaN` / `marcado_diaN_at` se calculan del día marcado. Se mantienen las dos aserciones del contrato F-8: primera autorización `true` y REAUTORIZACIÓN `true` con su mensaje (idempotencia).
- Test 14 pasa a «dia no activo: no autoriza en el día equivocado (criterio 4)»: con `otroDia = diaActivo === 1 ? 2 : 1`, la expectativa es `false` y que ningún día cambie de estado (la 0011 rechaza ANTES del UPDATE). Así la suite AHORA SÍ ejercita el criterio 4 del servidor (rechazo del día equivocado) de forma automática; antes el día legítimo solo lo cubría el doble escaneo con su día activo dinámico.
- Test 13 (`p_dia: 9`, fuera de rango) queda igual. Sin teardown nuevo: el doble escaneo deja el día activo de V-DEMO02 en «autorizado» igual que antes, y el test del día no activo no muta nada (la RPC rechaza antes del UPDATE).
- `tests/preflight-entorno.mjs` (P2-04): tras el login de puerta consulta `f_puerta_estado`; falla con «ENTORNO STAGING EN EDICIÓN...» si `edicion_abierta`, falla si `dia_activo` no es 1 ni 2, y en éxito imprime `dia_activo` en su línea.

**Verificado con herramientas disponibles:** `node --check tests/escaneo.test.mjs` y `node --check tests/preflight-entorno.mjs` (sintaxis OK). NO ejecutado por decisión del orquestador: la suite y el preflight contra staging (hacen `fetch()` y mutarían staging; también falta confirmar el resultado del CI real en el PR #47 tras este commit).

**Sigue pendiente:** los criterios 3 y 4 siguen `[ ]` — la prueba en navegador (admin abre edición mientras la puerta escanea; cerrar Día 1 en otra pestaña) no se ha hecho. Lo que este cambio prueba automáticamente es el rechazo del servidor, no la reacción del cliente `js/puerta.js` (mensajes en tarjeta, modal, recarga del día).

### 23/11/2026 — Defecto encontrado y arreglado: la tarjeta "Evento aún abierto" era un callejón sin salida

**Defecto (reproducido en staging el 23/11/2026):** con `edicion_abierta=true`, al entrar a puerta o al revalidar antes de una autorización, la pantalla quedaba atrapada en la tarjeta "⚠️ Evento aún abierto": su único botón era "🚪 Salir" (`borrarSesion()` + `location.reload()`, js/puerta.js:379-381). No había reintento, ni polling, ni reacción a foco/conexión: si el administrador cerraba la edición, el operario tenía que SALIR, perder la sesión y volver a entrar con el PIN. Medido hoy: `edicion_abierta` revertido a `false` en la base no devolvía la pantalla.

**Arreglo (mismo día, rama de trabajo):**

- [puerta.html](../puerta.html) (tarjeta `#tarjetaEventoAbierto`): botón nuevo **"🔄 Comprobar de nuevo"** (`#btnComprobarEvento`, clase `btn btn-azul`, ya existente) y contenedor de aviso `#msgEventoAbierto` (patrón `pintarAviso`, norma v2.2: el resultado vive junto al botón). Texto de la tarjeta ajustado: basta pulsar "Comprobar de nuevo" cuando el administrador confirme; "Salir" solo si se prefiere volver a entrar.
- [js/puerta.js](../js/puerta.js): función nueva `reintentarEstadoEvento()` junto a `verificarEstadoEvento()` — reconsulta `f_puerta_estado` con `llamar`; sin respuesta pinta en la tarjeta que puede faltar conexión o ser la sesión caducada y ofrece reintentar o salir (no lanza al operario sin explicar); si `edicion_abierta` sigue true pinta "⏳ El evento sigue en edición. Se volverá a comprobar cuando pulses otra vez." y no cambia de pantalla; si ya está cerrada, actualiza `diaActivo`, llama `mostrarPrincipal()` + `actualizarSelectorDia()` y pinta "✅ El evento ya está cerrado. Día activo: N. Escanea el QR o abre la lista de nuevo." en el contenedor de esa pantalla. Sin `alert`/`confirm`/`prompt` nativos. El botón se deshabilita durante la consulta y hay guard de reentrancia (doble clic). Extra trivial incluido (~4 líneas): al recuperar el foco la pestaña (`visibilitychange`) reconsulta solo si la tarjeta sigue visible, con el mismo guard.
- Referencias §9 actualizadas en `docs/dev-local.md` por el desplazamiento de líneas de `js/puerta.js`: `506-509` → `557-560` y `1247-1250` → `1298-1301`. Manual `docs/manual-usuario/06-puerta.md` actualizado en el mismo commit (paso 1, "Que debes ver", "Errores comunes").

**Pendiente:** la prueba en navegador del arreglo está PENDIENTE (con la base en edición, pulsar Comprobar y comprobar las tres salidas). Los criterios 3 y 4 siguen `[ ]`.

### 23/11/2026 — Cierre de sesión: criterio 3 PROBADO EN PANTALLA; criterio 4 probado en servidor por CI, la vía de pantalla queda PENDIENTE

**Criterio 3 — probado en pantalla el 23/11/2026 (staging, `adoqujnnnrlgmvwbnwbl`):** con `edicion_abierta = true` y la pestaña de puerta ya cargada, pulsar Autorizar mostró el modal propio y NO autorizó. Con la edición cerrada desde admin y SIN recargar la pestaña, la puerta se recuperó con el botón "🔄 Comprobar de nuevo" (sin perder la sesión) y autorizó: `Nombre Dos` a las 19:16:04 y `Nombre Tres` a las 19:18:57; la lista `LST-DEMO01-D2` quedó completada 2/2 y se cerró automáticamente. Evidencia medida, no simbólica: la lista terminó `completada 2/2`.

**Criterio 4 — probado en SERVIDOR, pantalla PENDIENTE:** la vía del servidor está probada por el test automatizado de CI (`tests/escaneo.test.mjs`, "dia no activo: no autoriza en el día equivocado (criterio 4)"), verde en `main`. La vía de PANTALLA (pestaña vieja con el día cambiado sin recargar) sigue PENDIENTE de prueba; por eso el criterio NO se marca `[x]`.

**El arreglo del defecto quedó probado en el mismo test del criterio 3:** el callejón sin salida ("Evento aún abierto" con única salida "Salir" que borraba la sesión) ya no ocurre — la prueba de recuperación del 23/11 (edición cerrada, sin recargar, botón Comprobar de nuevo, autoriza) es por donde el criterio 3 pasó hoy.

**Migración `0011_p1_02_revalidacion_estado_puerta.sql`:** aplicada en STAGING y verificada contra el catálogo (3 filas, firmas 4/3/4, retorno `boolean`, guardas presentes). NO aplicada en producción; el SQL pendiente es para el usuario.

**Pendiente tras este cierre:** (1) ejecutar `0011` en PRODUCCIÓN con el usuario (mismo archivo ya verificado + consulta de conteo); (2) prueba en pantalla del criterio 4 (pestaña vieja + día cambiado); (3) retomar la siguiente tarea `pendiente` con dependencias resueltas.
