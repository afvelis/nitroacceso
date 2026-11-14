---
id: "F-8"
titulo: "Reautorizar en puerta reescribe marcado_dia1_at y no deja rastro del doble escaneo"
prioridad: "P2"
estado: "hecho"
area: "integridad"
depende_de: []
archivos:
  - "supabase/migrations/0003_f8_preserva_hora_reautorizacion.sql"
  - "docs/sql/f_puerta_marcar_vendedor-antes-f8-2026-11-14.sql"
  - "tests/escaneo.test.mjs"
---

# F-8 · La reautorización en puerta reescribe `marcado_dia1_at` y no deja rastro del doble escaneo

## Contexto

Autorizar dos veces al mismo vendedor **reescribe `marcado_dia1_at`** con la hora de la segunda autorización (medido en staging: `2026-11-13T15:31:59.249363+00:00` → `2026-11-13T15:31:59.72505+00:00`), y `f_puerta_marcar_vendedor` devuelve `true` en ambos casos porque hace `UPDATE ...; return found;` — `found` vale `true` si el UPDATE coincidió con la fila, aunque los valores no cambien. Es decir: **se pierde la hora de la primera entrada** y el doble escaneo no deja ningún rastro en la base, justo cuando el rastro es lo que permitiría detectar un reintento de brazalete.

Todo el SQL lo ejecuta el usuario; esta tarea no cambia nada del servidor sin su orden explícita.

## Evidencia

- [P1-04-staging-migraciones-tests.md](P1-04-staging-migraciones-tests.md), nota **(v)**, «Hallazgo 1» (el booleano de vuelta) y «Hallazgo 2» (la hora reescrita, con las dos horas medidas en la ejecución de verificación del 12/11/2026).
- SQL de la migración `0001` ([supabase/migrations/0001_esquema_inicial.sql](../supabase/migrations/0001_esquema_inicial.sql)): la definición de `f_puerta_marcar_vendedor` con `update ...; return found;`.
- [tests/escaneo.test.mjs](../tests/escaneo.test.mjs), caso de doble escaneo: las aserciones son de ESTADO (leer, autorizar, releer, repetir, releer) precisamente porque el booleano de vuelta no distingue.

## Objetivo

Que la reautorización de un vendedor ya autorizado preserve la hora de la primera entrada (o deje constancia explícita del reintento) y que el resultado de la función refleje lo que ocurrió.

## Pasos

- [x] El usuario ejecuta `pg_get_functiondef('f_puerta_marcar_vendedor')` en el SQL Editor y pega el resultado para reescribir sobre la definición real. (HECHO 14/11/2026: ejecutado por el usuario en STAGING antes de aplicar la `0003`; la definición real era idéntica al cuerpo de la `0002` del repo — solo diferían comentarios, `begin;/commit;` y el `;` final — no había deriva y la `0003` reemplazó la función, no creó sobrecarga.)
- [x] Hacer backup de la definición vigente (lotes de `docs/sql/`): `docs/sql/f_puerta_marcar_vendedor-antes-f8-2026-11-14.sql`, copia del cuerpo de la `0002` (con la validación de `p_dia`, sin el arreglo de F-8).
- [x] Reescribir la función: no reescribir `marcado_dia1_at` (ni `marcado_dia2_at`) si el vendedor ya está `autorizado` con hora, con `CREATE OR REPLACE` que conserva los permisos. El reintento NO se registra en la base: eso es alcance de P1-03. El retorno es `true` también en la reautorización (éxito idempotente), para no disparar el alert de `js/puerta.js:477`. Migración nueva: `supabase/migrations/0003_f8_preserva_hora_reautorizacion.sql`, ACUMULATIVA (incluye la validación de `p_dia` de F-9 para que producción aplique un solo archivo).
- [x] Añadir al test de doble escaneo de `tests/escaneo.test.mjs` la aserción del comportamiento nuevo: `assert.equal(marca2, marca1)`, `assert.notEqual(marca1, null)` y `assert.equal(repetida.datos, true)`; el HALLAZGO impreso en consola pasó a aserción real.

## Criterios de aceptación

- [x] Reautorizar NO cambia `marcado_dia1_at` cuando ya tiene hora (evidencia: suite 8/8 contra staging con horas idénticas — `.767022` antes y después de repetir; cubierto por `tests/escaneo.test.mjs`, tests "doble escaneo" y "dia 2 legitimo").
- [x] Filas `autorizado` con hora NULL: el caso NO existe en los datos reales (conteo en producción del 14/11/2026: 0 en día 1 y 0 en día 2, sobre 15 y 2 autorizados). La rama `is not null` queda como defensa y no se ejercita hoy.
- [x] Existe un test automatizado que lo demuestra contra staging para la parte automatizable (primer criterio): `tests/escaneo.test.mjs`, "doble escaneo" y "dia 2 legitimo" (evidencia: suite 8/8 en verde; antes de aplicar la `0003` daba 6/8, con "doble escaneo" y "dia 2 legitimo" fallando por `AssertionError` de hora reescrita). La verificación del segundo criterio era manual (§Verificación) y NO se ejecutó: el caso no existe en los datos.
- [x] No se introdujeron regresiones en el flujo del evento: la primera autorización sigue marcando la hora y el flujo de puerta no se rompe (evidencia: el test "dia 2 legitimo" sigue demostrando que la primera autorización sí escribe `marcado_dia2_at`; suite 8/8 en verde).

## Verificación

- Parte automatizada (criterio 1): ejecutar la suite (`node --test tests/*.test.mjs`) contra staging y comparar la hora dentro del test. El test "doble escaneo" lo hace para el día 1 (`marcado_dia1_at` antes y después del segundo escaneo) y el test "dia 2 legitimo" hace lo equivalente para el día 2 (`marcado_dia2_at`). Sin la `0003` aplicada el test de doble escaneo queda ROJO por diseño; con la `0003` aplicada, VERDE. Resultados reales (14/11/2026): ROJO antes de aplicar la `0003` → `tests 8 · pass 6 · fail 2`, EXIT 1 (fallaban "doble escaneo" y "dia 2 legitimo" con `AssertionError` de hora reescrita; horas del día 1: `.457564` tras la 1.ª autorización, `.767022` tras la repetición — distintas, el defecto demostrado). VERDE después de aplicar la `0003` en staging → `tests 8 · pass 8 · fail 0`, EXIT 0 (hora del día 1: `2026-11-14T16:45:31.767022+00:00` antes y DESPUÉS de repetir, idénticas; la aserción nueva del día 2 pasa).
- Parte manual (criterio 2 — SQL en el SQL Editor de **STAGING** `adoqujnnnrlgmvwbnwbl`; NUNCA en producción). **NO SE EJECUTÓ (14/11/2026):** el caso no existe en los datos reales (conteo en producción del 14/11/2026: `dia1_autorizado_sin_hora=0`, `dia2_autorizado_sin_hora=0`, sobre 15 y 2 autorizados). Queda documentada como PROCEDIMIENTO por si algún día aparece una fila así; no se marcó el criterio como "probada por SQL manual" porque no se corrió ese SQL. El `update` del paso 2 toca SOLO V-DEMO02 (dato de demo de staging, el mismo vendedor que consumen los tests), y devuelve la fila al estado `autorizado` con hora, que es el estado en que los tests también la dejan.
  1. Obtener el token de puerta (paso previo; el PIN de puerta de staging se escribe a mano en la consulta desde tu memoria — el repo no guarda secretos):
     ```sql
     select token, rol from f_login('<PIN-DE-PUERTA-DE-STAGING>');
     ```
     Esperado: 1 fila con `rol = 'puerta'`. Copia el token para los pasos siguientes.
  2. Situar V-DEMO02 en `autorizado` con hora NULL (simula el caso hipotético de una fila venida de producción; NOTA 14/11/2026: `docs/sql/volcado-produccion-2026-11-09.csv` es DDL, no datos, y el conteo real dio 0 filas así — este paso no se ejecutó):
     ```sql
     update vendedores
     set estado_dia1 = 'autorizado',
         marcado_dia1_at = null
     where codigo_qr = 'V-DEMO02';
     ```
     Esperado: `UPDATE 1` (confirma el conteo: uno solo).
  3. PRIMERA llamada a la RPC:
     ```sql
     select public.f_puerta_marcar_vendedor(
       '<TOKEN>'::uuid,
       (select id from vendedores where codigo_qr = 'V-DEMO02'),
       1,
       'autorizado'
     ) as autorizacion_1;
     ```
     Esperado: `true`. Como la fila estaba `autorizado` con hora NULL, es la ÚNICA vez que se rellena.
  4. Anotar la hora de la primera autorización:
     ```sql
     select marcado_dia1_at, estado_dia1 from vendedores where codigo_qr = 'V-DEMO02';
     ```
     Esperado: `marcado_dia1_at` con valor (la hora de la llamada del paso 3), `estado_dia1 = 'autorizado'`. Anota esa hora como `hora1`.
  5. REPETIR la llamada idéntica (mismo token, mismos parámetros):
     ```sql
     select public.f_puerta_marcar_vendedor(
       '<TOKEN>'::uuid,
       (select id from vendedores where codigo_qr = 'V-DEMO02'),
       1,
       'autorizado'
     ) as autorizacion_2;
     ```
     Esperado: `true` también (éxito idempotente; un `false` aquí sería el defecto que dispara el error falso de la puerta).
  6. Comprobar que la hora NO cambió:
     ```sql
     select marcado_dia1_at, estado_dia1 from vendedores where codigo_qr = 'V-DEMO02';
     ```
     Esperado, dato a dato: `marcado_dia1_at` = `hora1` (¡exactamente la del paso 4, sin reescribir!) y `estado_dia1 = 'autorizado'`. Si la hora es DISTINTA a `hora1`, o la `0003` no está aplicada, o el arreglo no se comporta como está escrito: detenerse e investigar antes de seguir. (Con la función vieja, sin la `0003`, este paso muestra una hora nueva: eso ES el bug F-8, no un error del procedimiento.)

## Fuera de alcance

- La validación de `p_dia` (tarea [F-9](F-9-dia-fuera-de-rango.md)); si ambas tocan la RPC, se hacen EN SERIE.
- Cambios de frontend en `puerta.html` / `js/puerta.js`.

## Notas de implementación

- Qué cambió: la RPC `f_puerta_marcar_vendedor` ya no reescribe `marcado_dia1_at`/`marcado_dia2_at` cuando el vendedor ya está `autorizado` y ya tiene hora (el `CASE` lee la fila VIEJA dentro del mismo UPDATE, semántica de Postgres; no hace falta `select for update`). El `is not null` del `CASE` cubriría filas `autorizado` con hora NULL venidas de producción (caso que NO existe en los datos reales: conteo 0/0 del 14/11/2026 — ver Cierre): a esas se les pondría la hora del primer alta real. El retorno es `true` también en la reautorización (éxito idempotente); `false` queda para rechazos reales (rol, `p_estado`, `p_dia`, fila inexistente).
- Archivos tocados: `supabase/migrations/0003_f8_preserva_hora_reautorizacion.sql` (nuevo), `docs/sql/f_puerta_marcar_vendedor-antes-f8-2026-11-14.sql` (backup nuevo), `tests/escaneo.test.mjs` (los tests «doble escaneo» y «dia 2 legitimo»: este último ampliado con la reautorización del día 2, para que la preservación de `marcado_dia2_at` de la `0003` tenga cobertura), esta tarea y `DECISIONES.md`.
- Pruebas ejecutadas: `node --check tests/escaneo.test.mjs` pasó (sintaxis). La suite real corrió contra staging en el cierre del 14/11/2026: ROJO 6/8 antes de la `0003`, VERDE 8/8 después (ver bloque «Cierre (14/11/2026)» al final).
- El segundo escaneo NO queda registrado en la base: la migración solo PRESERVA la hora original, no añade columnas ni rastro del reintento. Eso corresponde a P1-03 (auditoría).
- La cláusula "fila `autorizado` con hora NULL se rellena una sola vez" del criterio 2 NO tiene test automatizado por RPC: ninguna RPC de la app deja una fila `autorizado` con hora NULL (solo el paso a `pendiente` la borra con `null`). Por eso se verifica a mano con el SQL del paso manual de §Verificación, y así lo dice el propio criterio.
- A la fecha del bloque «Cierre (14/11/2026)» de abajo: la `0003` está APLICADA EN STAGING Y EN PRODUCCIÓN (ambas las aplicó el usuario el 14/11/2026; la de producción queda trazada en «Cierre en PRODUCCIÓN (14/11/2026)» al final del cierre).
- La `0002` (F-9) nunca llegó a aplicarse en producción por separado: el 14/11/2026 se aplicó la `0003` SOLA (es acumulativa y ambas son idempotentes, `CREATE OR REPLACE`), y con ella producción quedó arreglada para F-8 y F-9.
- El paso 1 de «Pasos» lo cerró el usuario con `pg_get_functiondef` antes de aplicar la `0003` (definición idéntica a la `0002` del repo). Los cuatro criterios de aceptación quedaron marcados el 14/11/2026 con las pruebas del bloque de cierre y la nota del §Verificación.

### Cierre (14/11/2026)

- El usuario aplicó `supabase/migrations/0003_f8_preserva_hora_reautorizacion.sql` en STAGING (`adoqujnnnrlgmvwbnwbl`). Antes de aplicarla ejecutó `pg_get_functiondef('f_puerta_marcar_vendedor')`: la definición real era idéntica al cuerpo de la `0002` del repo (solo diferían comentarios, `begin;/commit;` y el `;` final), así que no había deriva y la `0003` reemplazó la función, no creó sobrecarga.
- Suite en verde contra staging: antes de la `0003`, `node --test tests/*.test.mjs` → `tests 8 · pass 6 · fail 2`, EXIT 1 ("doble escaneo" y "dia 2 legitimo" fallaban con `AssertionError` de hora reescrita: horas del día 1 `.457564` y `.767022`, distintas → defecto demostrado). Después: `tests 8 · pass 8 · fail 0`, EXIT 0, con la hora del día 1 `2026-11-14T16:45:31.767022+00:00` idéntica antes y después de repetir, y la aserción nueva del día 2 pasando.
- Consulta booleana en staging tras aplicar: `f8_dia1=true`, `f8_dia2=true`, `conserva_f9=true`, `desautorizar_ok=true`, `largo_definicion=1091`.
- Conteo de solo lectura en PRODUCCIÓN (14/11/2026): `dia1_autorizado_sin_hora=0`, `dia2_autorizado_sin_hora=0`, `dia1_autorizados=15`, `dia2_autorizados=2`, `total_vendedores=84`. Este conteo cierra el criterio (b): el caso «autorizado con hora NULL» NO existe en los datos reales y la rama `is not null` queda como defensa. (Hallazgo anexo: `docs/sql/volcado-produccion-2026-11-09.csv` es un volcado de ESQUEMA/DDL — columnas `ord,objeto,ddl` —, nunca sirvió para contar filas.)
- La `0003` quedó APLICADA EN PRODUCCIÓN el 14/11/2026, tras orden explícita del usuario (ver «Cierre en PRODUCCIÓN» justo abajo). Se aplicó SOLA, porque es acumulativa e incluye la `0002`, que no debe aplicarse por separado.

#### Cierre en PRODUCCIÓN (14/11/2026)

- El usuario aplicó la `0003` en PRODUCCIÓN el 14/11/2026, después de leer la definición real con `pg_get_functiondef('f_puerta_marcar_vendedor')`: esa definición era la VIEJA de la `0001` (sin el `if p_dia not in (1,2)`, con `marcado_dia1_at = case when p_estado = 'autorizado' then now() else null end`) y coincidía línea a línea con la `0001` del repo — sin deriva.
- Verificación por booleanos tras aplicar (el «Success. No rows returned» NO se tomó como prueba): `f8_dia1=true`, `f8_dia2=true`, `f9_valida_p_dia=true`, `desautorizar_ok=true`, `anon_puede_ejecutar=true`, `largo_definicion=1091`.
- `largo_definicion=1091` es EXACTAMENTE el mismo valor que dio staging tras aplicar la misma migración → el cuerpo de la función es idéntico en staging y en producción.
- No se modificó ni una fila de `vendedores`; no se consumió ninguna entrada; no se creó ni borró ningún vendedor de prueba. NO se hizo prueba de humo con datos reales: la primera prueba real será el primer escaneo del evento.
- Hallazgo registrado el mismo día: en producción, con la función vieja, un `p_dia` fuera de rango NO se rechazaba — caía en el `else` y **marcaba el día 2**. Estaba latente porque la puerta solo envía 1 o 2; la `0003` lo cierra de paso al incluir la validación de `p_dia` de F-9.
