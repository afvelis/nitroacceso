---
id: "F-9"
titulo: "f_puerta_marcar_vendedor no valida p_dia: un valor fuera de rango autoriza otro dia"
prioridad: "P1"
estado: "hecho"
area: "seguridad"
depende_de: []
archivos:
  - "supabase/migrations/0002_f9_valida_p_dia.sql (nueva; la 0001 es línea base y no se edita)"
  - "tests/escaneo.test.mjs"
---

# F-9 · `f_puerta_marcar_vendedor` no valida `p_dia`: un valor fuera de rango autoriza otro día

## Contexto

La RPC de puerta `f_puerta_marcar_vendedor` no valida `p_dia`: la función solo distingue `p_dia = 1` y cualquier otro valor cae en la rama del día 2. Con un valor fuera del rango esperado `(1, 2)` — probado en staging con `p_dia = 9` — el registro acaba **autorizado en el día 2** en lugar de ser rechazado. La consecuencia real es que un parámetro mal formado en la puerta (bug de frontend, petición manipulada o llamada manual) puede autorizar el día equivocado en vez de fallar.

Todo el SQL lo ejecuta el usuario; esta tarea no cambia nada del servidor sin su orden explícita.

## Evidencia

- [P1-04-staging-migraciones-tests.md](P1-04-staging-migraciones-tests.md), nota **(v)**, «Hallazgo 3»: verificado contra staging y contra el SQL de la migración `0001` (`supabase/migrations/0001_esquema_inicial.sql`); la prueba real con `p_dia = 9` devolvió `true` y puso `estado_dia2` de `V-DEMO02` en `autorizado` (se restauró a `pendiente`).
- [tests/escaneo.test.mjs](../tests/escaneo.test.mjs), caso «dia invalido»: el test afirma la propiedad garantizada (el día 1 queda invariable) y documenta la limitación del servidor; el log del test imprime el `estado_dia1` previo a la llamada.

## Objetivo

`f_puerta_marcar_vendedor` rechaza cualquier `p_dia` fuera de `(1, 2)` sin modificar ningún día, y existe un test automatizado que lo demuestre.

## Pasos

- [x] El usuario ejecuta `pg_get_functiondef('f_puerta_marcar_vendedor')` en el SQL Editor y pega el resultado para reescribir sobre la definición real, no sobre la migración. (HECHO 14/11/2026: pegado por el usuario; el volcado queda en [docs/sql/f_puerta_marcar_vendedor-antes-f9-2026-11-14.sql](../docs/sql/f_puerta_marcar_vendedor-antes-f9-2026-11-14.sql).)
- [x] Hacer backup de la definición vigente (lotes de `docs/sql/`). (HECHO 14/11/2026: `docs/sql/f_puerta_marcar_vendedor-antes-f9-2026-11-14.sql`, aún sin cambios de contenido, solo CRLF→LF.)
- [x] Reescribir la función para que valide `p_dia` contra `(1, 2)` y rechace cualquier otro valor (excepción o devolver `false`, según lo que permita el contrato de la función) ANTES del `UPDATE`. (HECHO 14/11/2026: el SQL va como migración NUEVA `supabase/migrations/0002_f9_valida_p_dia.sql` — la `0001` es línea base y no se edita, lo dice `supabase/README.md` — y **aplicada en staging por el USUARIO ese mismo día**; ver Notas.)
- [x] Actualizar el caso «dia invalido» de `tests/escaneo.test.mjs` para afirmar el comportamiento nuevo: rechazo y ningún día modificado. (HECHO 14/11/2026: caso reescrito y ejecutado contra staging con la `0002` ya aplicada; ver Notas.)

## Criterios de aceptación

- [x] Con `p_dia` fuera de `(1, 2)`, `f_puerta_marcar_vendedor` rechaza (excepción o `false`) y NO modifica ningún día (ni el 1 ni el 2). (probado 14/11/2026: suite 7/7 contra staging, caso «dia invalido»; ver Notas)
- [x] Existe un test automatizado que lo demuestra en la suite (`tests/escaneo.test.mjs`) y pasa contra staging. (probado 14/11/2026: suite 7/7 contra staging, caso «dia invalido»; ver Notas)
- [x] No se introdujeron regresiones en el flujo del evento (día 1 y día 2 legítimos siguen autorizando igual). (probado 14/11/2026: suite 8/8 contra staging; día 1 por «doble escaneo», día 2 legítimo por «dia 2 legitimo»)

## Verificación

- Ejecutar la suite (`node --test tests/*.test.mjs`) contra staging: el caso «dia invalido» debe pasar con el comportamiento nuevo y el resto de la suite debe seguir 7/7.
- En staging, verificar por consulta que ningún `estado_dia2` cambió tras la llamada rechazada (contajes, sin mostrar claves).

## Fuera de alcance

- Cualquier otro cambio de la misma función (la reautorización y `marcado_dia1_at` son la tarea [F-8](F-8-reautorizacion-reescribe-hora.md)); si ambas tocan la RPC, se hacen EN SERIE.
- Cambios de frontend en `puerta.html` / `js/puerta.js`.

## Notas de implementación

> El agente completa esta sección al terminar o bloquearse.

- Qué cambió (2026-11-14, Sesión 28, rama `agente/2026-11-14-f9-valida-p-dia`):
  - (a) `pg_get_functiondef('public.f_puerta_marcar_vendedor(uuid,uuid,integer,text)')` ejecutado por el USUARIO el 2026-11-14 en el SQL Editor del proyecto de staging `adoqujnnnrlgmvwbnwbl`. La definición es idéntica a la del repo salvo el `;` final y los finales de línea CRLF; el volcado queda en `docs/sql/f_puerta_marcar_vendedor-antes-f9-2026-11-14.sql` (con LF, sin cambios de contenido).
  - (b) Escritos `supabase/migrations/0002_f9_valida_p_dia.sql` (la validación nueva en `0002_f9_valida_p_dia.sql:37`, misma pauta que `f_puerta_marcar_cortesia` en `0001_esquema_inicial.sql:3970`, sin tocar la `0001`) y el backup de `docs/sql/`. **NINGUNO de los dos está aplicado en la base.**
  - (c) Caso «dia invalido» de `tests/escaneo.test.mjs:114-140` actualizado al comportamiento nuevo: la RPC responde `false` (contrato confirmado en `tests/helpers.mjs:124`: `rpc` devuelve `{status, ok, datos, texto}` con el cuerpo ya parseado) y ni `estado_dia1` ni `estado_dia2` cambian. **El test está escrito pero NO ejecutado**: correrlo antes de aplicar la `0002` en staging fallaría, porque staging todavía tiene la función vieja.
- Archivos tocados: `ESTADO.md` (commit A), `docs/sql/f_puerta_marcar_vendedor-antes-f9-2026-11-14.sql`, `supabase/migrations/0002_f9_valida_p_dia.sql`, `tests/escaneo.test.mjs`, `tareas/F-9-dia-fuera-de-rango.md` (commit B).
- Pruebas ejecutadas: `scripts/verificar-arranque.py` sobre el commit `45bc534` de esta rama: 15 OK / 2 AVISOS / 0 FALLAS (avisos: rama sin empujar a `origin` y 2 menciones históricas de una ruta antigua); sobre `main` al arrancar la sesión: 16 OK / 1 AVISO / 0 FALLAS. `node --check tests/escaneo.test.mjs`: sintaxis OK. La suite NO se corrió (ver (c)).
- Riesgos o pendientes: **PENDIENTE: aplicar `0002_f9_valida_p_dia.sql` en staging (lo ejecuta el usuario en el SQL Editor, con consulta de conteo de verificación después) y correr la suite completa (`node --test tests/*.test.mjs`) contra staging.** No se marca ningún criterio de aceptación: siguen sin prueba en staging.

## Notas de implementación (actualización 14/11/2026 — suite verde contra staging)

- El USUARIO aplicó `supabase/migrations/0002_f9_valida_p_dia.sql` en staging (`adoqujnnnrlgmvwbnwbl`) el 14/11/2026. El «Success» del SQL Editor NO se tomó como prueba: se corrió la suite real.
- Evidencia real de la corrección: `node --test tests/*.test.mjs` contra staging → **7 passed, 0 failed**. Antes de aplicar la migración, el mismo caso «dia invalido» fallaba con `AssertionError: la RPC debe devolver false... true !== false` (`tests/escaneo.test.mjs:134`) — prueba de que el test detecta el defecto de verdad, no que «no explota».
- Test nuevo «dia 2 legitimo: p_dia = 2 autoriza y desautoriza el dia 2 sin tocar el dia 1» en `tests/escaneo.test.mjs`, justo después de «dia invalido»): ejercita el camino legítimo completo del día 2 — estado previo capturado, marcar `pendiente` y relectura, marcar `autorizado` y relectura con `marcado_dia2_at` con valor — y afirma en cada relectura que `estado_dia1` queda invariable. Cubre el criterio 3 de F-9 (que la validación de `p_dia` no haya roto los días legítimos), con referencia a `0002_f9_valida_p_dia.sql:37` y a `f_puerta_marcar_cortesia` (`0001_esquema_inicial.sql:3970`) como precedente del patrón. El test deja `estado_dia2` de V-DEMO02 en `"autorizado"` (documentado en el propio test).
- Corrida real de esta sesión (14/11/2026, agente, contra staging): `node --test tests/*.test.mjs` → `tests 8 · pass 8 · fail 0`, con el caso «dia 2 legitimo» pasando (log: `dia 2 legitimo: estado_dia1 previo = autorizado / estado_dia2 previo = autorizado`). El criterio 3 quedó marcado el 14/11/2026: la suite ya corrió con el test nuevo «dia 2 legitimo» y dio **8 passed / 0 failed** contra staging.
- **Lección de secuencia (14/11/2026):** el test nuevo se subió antes de aplicar el SQL y el CI del PR se puso en rojo con `6 passed / 1 failed`. NO era un fallo del código: staging seguía con la función vieja. El orden correcto es SQL en staging → suite verde → CI verde → fusionar. Queda escrito en DECISIONES.md.
- **PENDIENTE REAL: aplicar `0002_f9_valida_p_dia.sql` en PRODUCCIÓN.** No se ha hecho y no se hará sin orden explícita del usuario. Producción sigue con la función sin validar `p_dia`. Hasta entonces esta tarea está arreglada en staging, no en producción; se dice tal cual.
- ACTUALIZACIÓN 14/11/2026: el pendiente de aplicar la `0002` en producción queda CUBIERTO por la `0003` de F-8 (`supabase/migrations/0003_f8_preserva_hora_reautorizacion.sql`, ACUMULATIVA: incluye la validación de `p_dia` de F-9 y el arreglo de F-8), así que en producción se aplicará la `0003` SOLA, nunca la `0002` por separado.
