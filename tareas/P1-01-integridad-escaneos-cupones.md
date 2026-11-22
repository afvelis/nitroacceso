---
id: "P1-01"
titulo: "Escaneos atómicos, cupones y cédulas duplicadas"
prioridad: "P1"
estado: "en_progreso"
area: "integridad"
depende_de: ["P0-02"]
archivos:
  - "puerta.html"
  - "aliado.html"
  - "stand.html"
  - "talento.html"
---

# P1-01 · Escaneos atómicos, cupones y cédulas duplicadas

## Contexto

La UI deshabilita el botón después de autorizar, pero dos dispositivos de puerta pueden escanear el mismo QR al mismo tiempo. Si la RPC hace un `select` y luego un `update` sin bloqueo, ambos pueden responder “ok”. Lo mismo puede pasar con la reserva de cupones de un concurso: dos aliados o dos pestañas pueden reservar más de lo disponible.

Tampoco hay una detección global de cédulas duplicadas entre listas: la misma persona podría tener pases en dos listas y entrar dos veces.

## Evidencia

- [puerta.html:600-605](../puerta.html#L600-L605): `f_puerta_marcar_vendedor`.
- [puerta.html:704-709](../puerta.html#L704-L709): `f_puerta_marcar_cortesia`.
- [puerta.html:1073-1077](../puerta.html#L1073-L1077): `f_puerta_marcar_persona`.
- [puerta.html:846-860](../puerta.html#L846-L860): canje de premiación.
- [stand.html:359](../stand.html#L359): solo compara cédulas dentro de la lista local.
- [talento.html:447-448](../talento.html#L447-L448): el servidor devuelve error de cédula repetida dentro de la lista, no entre listas.

## Objetivo

Que una entrada o un cupón no se puedan consumir dos veces, ni por concurrencia ni por duplicados, y que las restricciones estén en la base de datos además de la UI.

## Pasos

- [ ] Implementar el marcado como actualización condicional atómica: — **DESCARTADO**, ver «Notas de implementación» (las tres RPC de marcado no tienen carrera real y cambiarlas rompería el contrato de F-8):

```sql
update personas
set estado = 'autorizado', marcado_at = now()
where id = p_persona_id
  and estado <> 'autorizado'
returning id;
```

Si no devuelve fila, responder “ya consumado”. Repetir para vendedores, cortesías y premiaciones.

- [ ] Añadir una clave de idempotencia por escaneo (por ejemplo, `p_request_id`) para que un reintento de red no duplique la operación. — **TRASLADADO a P2-01** (aprobado por el usuario el 2026-11-20: hoy no existe cola offline, así que no protege de nada real y añadiría riesgo de sobrecarga PGRST203).
- [x] Para cupones, descontar dentro de una transacción con bloqueo de fila (`select ... for update`) o un `update ... where disponibles >= n returning ...`. — HECHO en la 0007 (2026-11-20).
- [x] Añadir restricciones `check` para que los contadores no queden negativos. — HECHO en la 0007 (2026-11-20), probado en staging.
- [x] Añadir un registro/ledger de movimientos de cupones (reserva, consumo, liberación, anulación) y verificar que la suma cuadra. *(Implementado en `0008`: tabla `cupones_movimientos`, 3 triggers de auditoría y RPC `f_admin_cuadre_cupones`. La verificación de cuadre por tests está PENDIENTE.)*
- [x] Implementar detección global de cédulas duplicadas por evento, con un reporte para el admin y una forma de anular el pase sobrante. No aplicar un `unique` ciego si una persona puede ser legítimamente talento y vendedor; primero definir la regla. — HECHO en la `0009` (2026-11-20): regla definida (regla B: nada se anula sin motivo), reporte `f_admin_cedulas_duplicadas` y anulación `f_admin_anular_pase_duplicado`. **Prueba entre dos listas PENDIENTE.**
- [x] Probar concurrencia real: dos requests simultáneos con el mismo ID y dos reservas simultáneas del último cupón. — HECHO para el canje de premios (dos pestañas, 2026-11-20). La reserva de cupones de aliado tiene el bloqueo aplicado pero su prueba con datos de aliado queda PENDIENTE.

## Criterios de aceptación

- [x] Dos canjes simultáneos del mismo premio: solo uno canjea y `cupones_consumidos` no se duplica. *(Redacción original: «dos escaneos simultáneos del mismo pase: solo uno devuelve éxito»; se reescribió el 2026-11-20 con aprobación del usuario porque choca con el contrato de F-8 y con `tests/escaneo.test.mjs:83`, donde el segundo escaneo devuelve `true` como éxito idempotente. Probado en staging: A `ok`, B `ERR_USADA`, consumidos 3 y no 6.)*
- [ ] Dos reservas simultáneas del último cupón: solo una tiene éxito; el saldo nunca queda negativo. — Bloqueo aplicado en `f_aliado_crear_concurso`/`f_aliado_editar_concurso`; **prueba con datos de aliado PENDIENTE** en staging.
- [ ] Un reintento de red con la misma clave de idempotencia no duplica la entrada. — **TRASLADADO a P2-01** junto con `p_request_id`.
- [ ] El reporte de cédulas duplicadas detecta el caso entre dos listas distintas. — **Implementado en `0009`** (`f_admin_cedulas_duplicadas`, `f_admin_anular_pase_duplicado` con motivo obligatorio). **Prueba entre dos listas PENDIENTE.**
- [x] Las restricciones están en la base de datos y se probaron en staging. — 2026-11-20: las tres en estado `validada` y las tres rechazan la fila mala con `23514`.
- [ ] No se puede reabrir una lista y volver a autorizar a alguien ya autorizado sin una acción explícita.

## Verificación

En staging, con dos terminales o dos pestañas:

```bash
# Ejemplo conceptual: dos POST simultáneos al mismo RPC
curl ... /rest/v1/rpc/f_puerta_marcar_persona ... &
curl ... /rest/v1/rpc/f_puerta_marcar_persona ... &
wait
```

Revisar que solo una respuesta sea verdadera y que el conteo de autorizados sea 1. Repetir con cupones.

## Fuera de alcance

- Rediseñar el esquema completo de eventos.
- La detección de fraude por comportamiento.

## Notas de implementación

> **Fase 1 cerrada en staging el 2026-11-20. Fases 2a (ledger, `0008`) y 3 (cédulas duplicadas, `0009`) implementadas en código (2026-11-20); sus pruebas y la confirmación en staging quedan PENDIENTES.**
>
> ### Fase 1 — atomicidad (aplicada y probada en staging el 2026-11-20)
>
> **Archivos:** `supabase/migrations/0007_p1_01_atomicidad_cupones.sql` y el respaldo previo `docs/sql/p1-01-definiciones-antes-2026-11-20.sql` (6 funciones capturadas con `pg_get_functiondef` en staging antes de reemplazarlas, según `DECISIONES.md:329`).
>
> **Qué se cambió**
> - `for update` antes de decidir en `f_aliado_crear_concurso`, `f_aliado_editar_concurso`, `f_aliado_asignar_ganador` (orden fijo: asignación → concurso), `f_admin_ampliar_cupones`, `f_puerta_canjear_premiacion` y `f_admin_editar_cortesia_premiacion`.
> - Canje condicional en `f_puerta_canjear_premiacion`: `update ... where id = ... and canjeado_at is null returning id`; si no afecta fila, `ERR_USADA`.
> - El pool «único» de `f_admin_ampliar_cupones` pasa a incremento relativo.
> - Tres `CHECK` en `cortesias`: `cupones_total >= 0`, `cupones_consumidos >= 0`, `cupones_consumidos <= cupones_total`.
>
> **Qué NO se tocó, y por qué**
> - `f_puerta_marcar_vendedor`, `f_puerta_marcar_cortesia` y `f_puerta_marcar_persona`: solo escriben una bandera de estado, no un contador; bajo `READ COMMITTED` no hay actualización perdida. Tocarlas habría roto el contrato de F-8 (`tests/escaneo.test.mjs:83`) y devuelto a la puerta el modal falso «No se pudo autorizar.».
> - Ninguna firma cambió: cero riesgo de `PGRST202`/`PGRST203` (incidente del 2026-11-20 con `f_login`).
> - Ningún valor de retorno cambió.
>
> **Evidencia ejecutada en staging**
> 1. 9 de 9: las 3 restricciones en `validada` y las 6 funciones `con for update`, con las firmas intactas (`f_puerta_canjear_premiacion(uuid,text,integer)` igual; `f_admin_editar_cortesia_premiacion` con sus 8 argumentos).
> 2. Los `CHECK` muerden: `cupones_consumidos = cupones_total + 1` y `cupones_consumidos = -1` → `23514` en los dos casos; fila de prueba borrada.
> 3. Doble canje secuencial con la RPC real: primer canje `ok`, segundo `ERR_USADA`, `cupones_consumidos` queda en 3 (no 6).
> 4. Concurrencia real, dos pestañas del SQL Editor y `pg_sleep(15)`: la primera `ok` con el bloqueo tomado, la segunda `ERR_USADA`; `cupones_consumidos = 3`. Dos puertas simultáneas, un solo canje.
>
> **Fallo del revisor corregido antes de aplicar:** el `CHECK` de `cupones_consumidos <= cupones_total` podía abortar RPCs por carrera con `f_admin_editar_cortesia_premiacion`; se añadió `for update` a la lectura de `v_cortesia` en el canje y esa función entró en la 0007.
>
> ### Fase 2a — ledger de cupones (migración `0008`)
>
> Crea la tabla `cupones_movimientos` (`id` bigint identity, `creada_at`, `tipo` text con CHECK de 8 valores: `emision`, `reserva`, `ajuste_reserva`, `reserva_liberada`, `ajuste_pool`, `consumo`, `ajuste_total`, `anulacion`; `cantidad`, `asignacion_id`, `concurso_id`, `cortesia_id`, `detalle`), sin foreign keys para que la auditoría no se borre en cascada con la fila origen, y sin acceso para `anon`/`authenticated` (revoke). Tres triggers AFTER en `cortesias`, `aliado_concursos` y `aliado_asignaciones` vía `f_trg_cupones_movimientos()` (auditoría best-effort: `exception when others then null`, un fallo del ledger no rompe la operación real). Incluye backfill de los consumos históricos. RPC `f_admin_cuadre_cupones(p_token uuid)` devuelve por asignación `otorgado/reservado/emitido/consumido/anulado/consumido_ledger` con el booleano `cuadra`, más `huerfanas` (cortesías sin asignación). **Evidencia:** `supabase/migrations/0008_p1_01_ledger_cupones.sql`. Tests de la RPC añadidos el 2026-11-22 (`tests/cupones.test.mjs`: estructura de `filas`/`huerfanas` con sesión válida y `ERR_SESION` con token inventado). **PENDIENTE:** confirmar que el cuadre CUADRA (valores `cuadra = true`) con datos controlados (la suite solo afirma estructura, no la suma).
>
> ### Fase 3 — cédulas duplicadas (migración `0009`)
>
> Crea la tabla `cedulas_duplicadas_log` (`id`, `creada_at`, `cedula`, `origen`, `pase_id`, `motivo`, `admin_token_hash`; sin acceso para `anon`/`authenticated`) y dos RPC: `f_admin_cedulas_duplicadas(p_token uuid)` (detecta duplicados entre `personas`, `vendedores` y `cortesia_personas`, devuelve por cédula `origenes[]`, `total` y detalle con `origen/pase_id/estado/lista_id`) y `f_admin_anular_pase_duplicado(p_token uuid, p_origen text, p_id uuid, p_motivo text)`, que exige motivo no vacío (regla B: nada se anula sin motivo), desautoriza el pase a `pendiente` y registra `sha256(p_token)` en el log. Errores: `ERR_SESION`, `ERR_ORIGEN_INVALIDO`, `ERR_MOTIVO_VACIO`, `ERR_NO_EXISTE`, `ERR_NO_DUPLICADO`, `ERR_NO_ANULADA`. **Evidencia:** `supabase/migrations/0009_p1_01_cedulas_duplicadas.sql`. Tests de la RPC añadidos el 2026-11-22 (`tests/cupones.test.mjs`: estructura del reporte y guardas `ERR_SESION`/`ERR_ORIGEN_INVALIDO`/`ERR_MOTIVO_VACIO`). **PENDIENTE:** test de detección entre dos listas (la suite NO hace anulación exitosa para no mutar staging; al probarla a mano, usar rutas de error y/o limpiar lo creado).
>
> ### Suite de tests nueva (2026-11-22)
>
> Tests automatizados añadidos en `tests/cupones.test.mjs` (mismo patrón `node:test` que `escaneo.test.mjs`, un solo login admin con `PIN_ADMIN_DEMO`): estructura de `f_admin_cuadre_cupones` y `f_admin_cedulas_duplicadas` + 3 guardas de `f_admin_anular_pase_duplicado`. NO cubren anulación exitosa ni triggers (para no mutar staging); la detección entre dos listas sigue PENDIENTE de prueba controlada. 0008/0009 confirmadas aplicadas en staging (los objetos de las dos migraciones existen).
>
> **Pendiente para cerrar la tarea:** Fases 2a y 3 implementadas en código (0008/0009) y con suite de lectura/guardas en `tests/cupones.test.mjs`. Para cerrar la tarea faltan: (1) la prueba de detección de duplicados entre dos listas (criterio de aceptación sin check; no la cubre la suite para no mutar staging) y (2) comprobar con datos controlados que el cuadre da `cuadra = true` por asignación (la suite afirma estructura, no la suma).
