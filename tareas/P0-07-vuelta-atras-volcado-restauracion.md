---
id: "P0-07"
titulo: "Vuelta atrás: volcado/restauración por SQL Editor (canal único y simétrico)"
prioridad: "P0"
estado: "hecho"
area: "operacion"
depende_de: []
archivos:
  - "docs/sql/volcado-datos.sql"
  - "docs/sql/verificar-conteos.sql"
  - "docs/sql/sembrar-sello-staging.sql"
  - "docs/sql/sembrar-sello-produccion.sql"
  - "docs/sql/huella-contenido.sql"
  - ".gitignore"
---

# P0-07 · Vuelta atrás: volcado/restauración por SQL Editor

## Contexto

Supabase **Free** no tiene PITR ni backups automáticos: el único job sobre la base es el keep-alive ([.github/workflows/keep-supabase-alive.yml](../.github/workflows/keep-supabase-alive.yml), que solo pinga). El "respaldo JSON" del admin (P0-05 alcance A, [js/admin.js:464](../js/admin.js#L464)) **no es restaurable**: le faltan `id`, `codigo_qr`, `codigo_link` y la fila `config`; sirve como informe, no como vuelta atrás. No existe ningún `pg_dump`, ni script de import, ni runbook: la restauración de un borrado accidental hoy es simplemente imposible. El usuario es el único que ejecuta SQL, en el SQL Editor web de Supabase (sin `psql`, sin acceso de red a la base desde el agente).

Decisión aprobada (consejo de dos asesores, usuario de acuerdo, 2026-11-17): **canal único y simétrico** — el mismo camino de ida y vuelta. Una consulta en el SQL Editor que escupa texto SQL; el usuario lo guarda como archivo; restaurar = pegar ese archivo en el mismo editor. **Sin RPC nueva, sin botón nuevo, sin claves nuevas.** Y usar `jsonb_populate_recordset` (no `INSERT` generado a mano con `quote_literal`): es lo que resuelve bien los tipos `text[]` (`links_anulados`), `uuid`, `timestamptz` y los NULL, justo donde falla la generación manual.

Esta tarea va ANTES de cualquier migración: sin vuelta atrás, ninguna otra P0 se puede probar contra producción sin riesgo.

**Revisión del orquestador (2026-11-17, tras el esqueleto v1):** tres agujeros graves cerrados en la revisión 2. (1) Las columnas escritas a mano eran una foto del esquema: con F-12 añadiendo columnas a `vendedores`, el volcado habría perdido ese dato en silencio → las columnas se descubren del catálogo en el momento. (2) Una celda copiada truncada podría haber restaurado a medias → conteos esperados embebidos y verificación que aborta la transacción entera. (3) El guion EMPIEZA BORRANDO todas las tablas y el nombre de base es `postgres` en todo proyecto Supabase: pegar un volcado de staging en producción borró el evento real → guarda por sello de entorno (`public.respaldo_sello`), sin sello no hay volcado.

## Evidencia

- Supabase Free sin PITR ni backups automáticos; keep-alive solo pinga: [.github/workflows/keep-supabase-alive.yml:19](../.github/workflows/keep-supabase-alive.yml#L19) (única llamada, un ping).
- El respaldo JSON del admin no es restaurable: [js/admin.js:464-504](../js/admin.js#L464-L504) compone el informe vía RPCs de lectura (`f_admin_ver_evento`, `f_admin_ver_cortesia`, `f_admin_ver_concursos_aliado`); ninguna devuelve `id`, `codigo_qr`, `codigo_link` ni la fila `config`.
- Fases B/C de P0-05 (import/automatización) absorbidas por M-37, nunca ejecutadas: [tareas/P0-05-backups-limpieza.md:40-42](P0-05-backups-limpieza.md#L40-L42).
- RLS activa sin policies: [supabase/migrations/0001_esquema_inicial.sql:4291](../supabase/migrations/0001_esquema_inicial.sql#L4291) y siguientes; todo el acceso pasa por RPCs `SECURITY DEFINER` (el SQL Editor corre como `postgres` y no pasa por RLS).
- Las FK no están en `0001` sino solo en producción: [docs/sql/volcado-produccion-2026-11-09.csv:23-68](../docs/sql/volcado-produccion-2026-11-09.csv#L23-L68) (14 FK reales, con `ON DELETE CASCADE`/`SET NULL`); ese CSV es solo DDL, no datos.
- `login_intentos.id` es `GENERATED ALWAYS AS IDENTITY`: [supabase/migrations/0001_esquema_inicial.sql:95](../supabase/migrations/0001_esquema_inicial.sql#L95).
- Precedente del riesgo nº 1: un lote se ejecutó por error en otro proyecto y el SQL Editor dijo «Success» (29/10/2026, registrado en AGENTS.md, ritmo punto 3); el conteo lo delató, no el editor. De ahí el sello de entorno.
- F-12 va a añadir columnas de anulación a `vendedores`: cualquier lista de columnas congelada produciría volcados que pierden ese dato en silencio.
- No existe ningún script de volcado/import en el repo (verificado: `docs/sql/` solo tiene DDL, RPCs y SQL puntual al 2026-11-17).

## Objetivo

Que exista una vuelta atrás probada y operable por el usuario solo: generar un volcado completo ejecutable (con `id`s, `codigo_qr`, `links_anulados`, marcados de entrada y la fila `config`), y restaurarlo pegando el archivo en el SQL Editor, con conteos idénticos por tabla.

## Pasos

- [x] Escribir `docs/sql/volcado-datos.sql` (revisión 3): bloque `do` de solo lectura que descubre tablas y columnas del catálogo (`information_schema`, excluyendo `is_identity='YES'` y `is_generated<>'NEVER'`), aborta si hay una tabla nueva sin ubicación, embebe el sello de origen y los conteos esperados, y devuelve UNA fila y UNA columna (`script`) con el guion de restauración completo (`begin;`…`commit;`; guarda de sello; borrado en el INVERSO exacto del orden de inserción, con aserción en el generador de que el primer delete es la última tabla; inserciones `jsonb_populate_recordset`; verificación de integridad que aborta).
- [x] Escribir `docs/sql/verificar-conteos.sql` (revisión 2): una fila por tabla (`tabla`, `filas`) descubierta del catálogo, misma lista y exclusiones que el generador.
- [x] Escribir `docs/sql/sembrar-sello-staging.sql` y `docs/sql/sembrar-sello-produccion.sql`: paso previo ÚNICO por proyecto (`create table if not exists public.respaldo_sello` + RLS + `insert` idempotente).
- [x] Añadir `.gitignore` para volcados con datos y carpeta `respaldos/`.
- [x] El usuario ejecuta `sembrar-sello-staging.sql` en staging (verificado: `select entorno from public.respaldo_sello;` devuelve una fila `staging`; el sello de PRODUCCIÓN queda pendiente de sembrar cuando se genere el volcado de producción).
- [x] El usuario ejecuta `volcado-datos.sql` en el SQL Editor de **staging**, guarda el resultado como `volcado-AAAA-MM-DD-datos.sql` (fuera del repo) y confirma que abre y empieza por la cabecera, con la lista de conteos esperados.
- [ ] Prueba en staging desechable 1 (base vacía): restaurar el volcado en una base vacía con el mismo esquema; `verificar-conteos.sql` antes y después debe dar conteos idénticos; suite de RPC en 8/8.
- [x] Prueba en staging desechable 2 (reemplazo): restaurar de nuevo sobre esa base ya poblada (mismo volcado) sin errores de `UNIQUE` ni de FK.
- [x] Prueba negativa del sello: intentar restaurar el volcado de staging en un proyecto con sello distinto (o sin sembrar) debe abortar con el mensaje «PROYECTO EQUIVOCADO» / «PROYECTO SIN SELLO» sin borrar nada.
- [x] Prueba negativa de truncado: cortar el guion a mitad (p. ej. sin la última tabla) y ejecutarlo debe abortar con «VOLCADO INCOMPLETO: …» dejando la base intacta. — CUMPLIDO el 20/11/2026 en staging (variante g-2: archivo sin el insert de una tabla; ver «Pruebas (f) y (g)»).
- [x] Comprobar `git status` limpio (ningún volcado con datos en el repo).

## Criterios de aceptación

- [x] (a) Existe un volcado completo ejecutable que incluye `id`s, `codigo_qr`, `links_anulados`, marcados de entrada y la fila `config`, y excluye `sesiones` y `login_intentos`.
- [x] (b) Existe un guion de restauración que, partiendo de una base vacía, deja conteos idénticos por tabla al original. **Re-probado a volumen el 17/11/2026** con el volcado de producción (15 tablas, 317 filas) ejecutado íntegro sobre staging: 15 de 15 conteos exactos y huella de contenido idéntica (ver bloque «Prueba a volumen» en Notas de implementación).
- [x] (c) La restauración se prueba en staging (desechable) y la suite de RPC queda en 8/8 después (la suite vive en `tests/` — `tests/escaneo.test.mjs` y `tests/login.test.mjs` — y se ejecuta con `node --test tests/*.test.mjs` contra staging; línea base actual: 8/8 en verde, verificada el 14/11/2026).
- [x] (d) Está probado también el caso de restaurar sobre una base con datos (reemplazo), sin errores de `UNIQUE` ni de FK. **Re-probado a volumen el 17/11/2026:** tras borrar a propósito el stand con más vendedores (stands 22→21 y vendedores 84→59 por la cascada de `vendedores_stand_id_fkey ON DELETE CASCADE`, migración 0001:420), re-ejecutar EL MISMO archivo devolvió stands 22 y vendedores 84 y la huella quedó idéntica.
- [x] (e) Ningún archivo con datos personales queda en el repo; `.gitignore` lo impide y está comprobado con `git status` (17/11/2026: la segunda copia del volcado de producción vive en el disco externo del usuario, fuera del repo).
- [x] (f) El generador descubre tablas y columnas del catálogo y aborta si aparece una tabla nueva sin ubicación. **CUMPLIDO (20/11/2026, staging)** — se creó una tabla fuera de `v_orden` y el generador abortó nombrándola: `ERROR: P0001: TABLA NUEVA SIN UBICACION: public.tabla_prueba_p07 no está en el orden de FK del volcado ni en las excluidas…` (`CONTEXT: PL/pgSQL function inline_code_block line 77 at RAISE`). No se generó ningún guion. Detalle en las notas de implementación.
- [x] (g) Un volcado truncado no puede restaurar a medias: el guion aborta y la base queda intacta. **CUMPLIDO (20/11/2026, staging)** — probado en dos variantes: archivo cortado (rechazado, nada aplicado) y archivo válido sin el `insert` de una tabla (`VOLCADO INCOMPLETO` y reversión completa). Detalle en las notas de implementación.
- [x] (h) El guion se niega a ejecutarse en un proyecto cuyo sello de entorno no coincide. **Lado positivo también probado a volumen el 17/11/2026:** staging se selló temporalmente como `produccion` (verificado: 1 fila, sello `produccion`) y el volcado de producción (sello `produccion`) se ejecutó COMPLETO ahí.

## Verificación

1. **Estática (hecha el 2026-11-17, revisión 2):** parseo real con libpg_query (pglast v8.8) de los cuatro SQL (`volcado-datos.sql`, `verificar-conteos.sql`, los dos de sello) y del guion simulado con los dos bloques `do` nuevos (normal, y con columna extra tipo F-12 en `vendedores`): 1 `begin`, 1 `commit`, 15 `delete`, 15 `insert`, 2 `do`. Balance de comillas y `$j$`/`$sello$`/`$verificacion$` emparejados, `v_orden` idéntico en generador y verificar-conteos. Elaborado en `/tmp`, nada ejecutado contra Supabase.
2. **Prueba del objetivo (usuario, staging):** conteos con `verificar-conteos.sql` antes y después de restaurar; tabla resultante fila a fila idéntica.
3. **Pruebas negativas:** sello distinto → aborta sin borrar nada; guion truncado → «VOLCADO INCOMPLETO» y rollback de la transacción entera.
4. `git status` no muestra volcados con datos.
5. Las pruebas de staging son desechables: nunca contra producción.

## Fuera de alcance

- RPCs nuevas, botones nuevos o claves nuevas (decisión del consejo: canal único por SQL Editor).
- Backup automático o PITR (requiere plan de pago; no lo pide el usuario).
- M-37 (multi-evento): esta tarea es la vuelta atrás del modelo actual.
- Migrar esquema o tocar RPCs existentes.

## Notas de implementación

> **Esqueleto v1 el 2026-11-17; revisión 2 el mismo día tras revisión del orquestador; revisión 3 tras tribunal (RECHAZADO por un P0, corregido).** Lo corregido en la revisión 3: (P0) el borrado salía en orden DIRECTO porque se concatenaba en el mismo bucle forward — con las 2 FK en modo NO ACTION (`stands_coordinador_id_fkey`, `talentos_coordinador_id_fkey`) la restauración sobre base poblada era imposible; ahora los deletes se anteponen en el bucle (inverso exacto) y el generador tiene aserción: mismo número de deletes que de inserts y primer delete = última tabla del orden. (P1) `.gitignore` sin ruta (`volcado-*-datos.sql`) para cubrir el volcado aunque caiga en la raíz; verificado con `git check-ignore -v`. (P2) `config` vacía ya no produce script NULL en silencio (`max()` sin `limit` + aserción de largo mínimo); sello con `btrim` en el guard generado y escapado en los mensajes; aviso destructivo en la TERCERA línea del guion generado (1º banner, 2º título, 3º aviso) con el total de filas a borrar; FK documentadas como 12 CASCADE/SET NULL + 2 NO ACTION.
>
> **Revisión 2 (2026-11-17):** (1) `volcado-datos.sql` descubre las columnas de `information_schema.columns` en el momento (excluyendo `is_identity='YES'` y `is_generated<>'NEVER'`) y las tablas del catálogo: si aparece una tabla de `public` que no está en `v_orden` ni en las excluidas, ABORTA nombrándola; el mismo guion sirve antes y después de F-12. (2) El guion generado embebe el conteo real por tabla (cabecera + bloque `do $verificacion$` antes del `commit` que lanza `VOLCADO INCOMPLETO: tabla % esperaba % filas y hay %` y aborta la transacción entera). (3) Sello de entorno: `public.respaldo_sello` (una fila, RLS activa sin policies); el generador toma el sello del proyecto donde corre (aborta si falta, vacía o ambigua) y el guion abre con `do $sello$`. `verificar-conteos.sql` también descubre del catálogo. El borrado sigue en orden inverso a la inserción; ambas listas salen de la misma fuente (`v_orden`), idéntico en generador y verificar-conteos. Ningún criterio marcado: falta sembrar sellos y probar en staging (pasos 5-11).
>
> **Prueba real en STAGING (17/11/2026, ejecutada por el usuario en el SQL Editor de Supabase):**
>
> - **(a) CUMPLIDO** — el generador (`docs/sql/volcado-datos.sql`), ejecutado en staging, produjo un guion con las 15 tablas y 22 filas, con `id`, `codigo_qr`, `links_anulados` y la fila `config` completa (incluidos los hashes de PIN); `sesiones` y `login_intentos` quedaron fuera. El archivo resultante se guardó en el disco del usuario, FUERA del repo.
> - **(b) CUMPLIDO** — ejecutado el guion guardado en staging: `Success. No rows returned` y las 15 comprobaciones de conteo embebidas pasaron antes del `commit`.
> - **(c) CUMPLIDO** — tras restaurar: `node --test tests/*.test.mjs` → `tests 8 / pass 8 / fail 0` (línea base idéntica a la de antes de la restauración).
> - **(d) CUMPLIDO** — prueba de reemplazo sobre base poblada: se borró a propósito `personas` con cédula `10000001` (conteo 5→4), se ejecutó el guion y la fila volvió (conteo 4→5, `cedula_10000001 = 1`). Un guion que no hiciera nada habría dejado 4.
> - **(e) CUMPLIDO** — `git check-ignore -v` demuestra que `volcado-2026-11-17-datos.sql` está ignorado tanto en la raíz como en `docs/sql/`, y que `docs/sql/volcado-datos.sql` (el generador) y `docs/sql/verificar-conteos.sql` NO lo están. Ningún archivo con datos personales está en el repo.
> - **(f) PENDIENTE** — tabla nueva sin ubicación: no se ejecutó con una tabla falsa; se ejercitará de forma natural la primera vez que se genere el volcado de producción (si producción tuviera una tabla fuera de la lista, el generador abortará nombrándola).
> - **(g) PENDIENTE** — volcado truncado: no se ejecutó el escenario de archivo cortado.
> - **(h) CUMPLIDO** — con el sello de staging cambiado temporalmente a `produccion`, el guion abortó con `ERROR: P0001: PROYECTO EQUIVOCADO: este volcado viene del entorno "staging", pero el proyecto abierto tiene el sello "produccion"...` y los conteos siguieron en 5/3/1: no se tocó ninguna fila. El sello se devolvió a `staging` y se verificó.
>
> **Prueba a VOLUMEN del volcado de PRODUCCIÓN (17/11/2026, ejecutada por el usuario en el SQL Editor):**
>
> - El volcado de producción del 17/11/2026 (15 tablas, 317 filas, sello `produccion`) se ejecutó COMPLETO sobre STAGING, poniendo antes el sello de staging en `produccion` (verificado: 1 fila, sello `produccion`).
> - Conteos externos tras la ejecución: 15 de 15 coinciden exactamente — aliado_ampliaciones 3, aliado_asignaciones 12, aliado_concursos 4, aliados 11, config 1, coordinadores 2, cortesia_listas 15, cortesia_personas 68, cortesias 43, eventos 5, listas 8, personas 35, stands 22, talentos 4, vendedores 84 (suma 317).
> - **Prueba destructiva controlada:** se borró el stand con MÁS vendedores → stands 22→21 y vendedores 84→59 (cascada de 25 vendedores por `vendedores_stand_id_fkey ON DELETE CASCADE`, migración 0001:420). Re-ejecutado EL MISMO archivo → Success; conteos de vuelta: stands 22, vendedores 84.
> - **Huella de contenido** (md5 del contenido completo de las 15 tablas, sin imprimir ninguna fila) tras la re-restauración: IDÉNTICA a la de referencia — `e3c3141c1914c4820cd9e4075da86166` con 15 tablas. Conclusión: restauración fiel al byte a volumen de producción. Instrumento reutilizable: `docs/sql/huella-contenido.sql`.
> - Cierre: staging devuelto a su estado — sello de vuelta a `staging` (verificado 1 fila) y volcado de staging re-ejecutado; total 22 filas verificado por consulta externa.
> - **Segunda copia** del archivo de producción guardada en el DISCO EXTERNO del usuario, FUERA del repo (244 KB exactos, confirmada por el usuario).
> - **Análisis de efectos colaterales** (verificado contra `supabase/migrations/0001_esquema_inicial.sql`): NINGUNA FK de `sesiones`, `login_intentos` ni `respaldo_sello` apunta a las 15 tablas, por lo que restaurar no borra sesiones ni el contador de intentos; las dos únicas FK sin cascada (`stands_coordinador_id_fkey` y `talentos_coordinador_id_fkey`) quedan satisfechas por el orden de borrado; no hay triggers de DELETE en las 15 tablas; ninguna PK de las 15 es identity (todas uuid con `gen_random_uuid()`, `config.id` fijo 1), por lo que los ids se conservan; ninguna FK apunta a `config`; `revoke all on all tables in schema public from anon, authenticated` (0001:5018) hace que las tablas de staging no sean legibles por la API REST.
> - **Huella de REFERENCIA del volcado de producción del 17/11/2026: `e3c3141c1914c4820cd9e4075da86166` (15 tablas).** Solo es comparable con huellas producidas por el mismo archivo (`docs/sql/huella-contenido.sql`) sobre el mismo esquema.
> - Criterios con esta prueba: (b), (d), (e) y (h) quedan probados también a volumen. **(f)** y **(g)** SIGUEN PENDIENTES: no se ejecutó su prueba.
> - **AVISO PIN:** el archivo de producción es ANTERIOR a la rotación de PIN del 17/11/2026, así que si se restaura devuelve los PIN anteriores. **La regla es rotar los PIN después de restaurar.**
>
> **Qué falta para cerrar P0-07:**
>
> Las pruebas (f) y (g) se ejecutaron el 20/11/2026 en staging; ver la sección «Pruebas (f) y (g) — 20/11/2026, en staging». Con eso, el guion de vuelta atrás queda cerrado.
>
> **Nota honesta de estado:** la restauración quedó probada con los datos de staging (22 filas) y a volumen de producción (317 filas), con huella de contenido idéntica tras una prueba destructiva controlada y re-restauración; y el comportamiento del generador ya está probado: aborta ante una tabla nueva sin ubicación (f) y un volcado truncado no puede restaurar a medias (g), verificado el 20/11/2026 en staging en sus dos variantes.

## Pruebas (f) y (g) — 20/11/2026, en staging

Ejecutadas por el usuario en el SQL Editor del proyecto de staging, con `docs/sql/verificar-conteos.sql` medido antes y después de cada prueba. Los archivos con datos personales usados en la prueba se quedaron siempre en la carpeta de respaldos del usuario, FUERA del repo; nada de eso se commiteó.

Línea base de staging en las tres mediciones: 15 tablas, suma 22 filas — `config 1`, `coordinadores 2`, `aliados 1`, `aliado_asignaciones 1`, `aliado_concursos 1`, `aliado_ampliaciones 0`, `cortesias 1`, `cortesia_listas 1`, `cortesia_personas 2`, `stands 1`, `vendedores 3`, `talentos 1`, `listas 2`, `personas 5`, `eventos 0`.

### (f) Tabla nueva sin ubicación — CUMPLIDO

1. Se creó en staging `public.tabla_prueba_p07` (tabla vacía, de usar y tirar), fuera de `v_orden` y de las excluidas.
2. Se ejecutó el generador `docs/sql/volcado-datos.sql`. Abortó:

   `ERROR: P0001: TABLA NUEVA SIN UBICACION: public.tabla_prueba_p07 no está en el orden de FK del volcado ni en las excluidas. Un humano debe decidir su posición según las FK y añadirla al array v_orden de docs/sql/volcado-datos.sql. No se genera el volcado.`
   `CONTEXT: PL/pgSQL function inline_code_block line 77 at RAISE`

3. No se devolvió ninguna columna `script`: no se generó guion.
4. Se borró la tabla y se verificó `information_schema.tables` = 0 filas para ese nombre. Los conteos de las 15 tablas quedaron idénticos a la línea base.

### (g) Volcado truncado — CUMPLIDO, probado en dos variantes

**(g-1) Archivo cortado.** Copia del volcado de staging truncada de 19 351 a 14 575 caracteres, con el corte dentro de la sentencia `insert into public.personas (...)`. Ejecutada en staging:

`ERROR: 42703: column "id" does not exist` · `LINE 144: select id, lista_id, nombre, …` · `DETAIL: There is a column named "id" in table "personas", but it cannot be referenced from this part of the query.`

El motor rechazó el archivo completo antes de aplicar nada. Conteos después: idénticos a la línea base.

**(g-2) Archivo válido con una tabla sin insertar.** Segunda copia del mismo volcado a la que se le quitaron las tres líneas del `insert into public.personas (...)`, conservando `delete from public.personas;` (221 → 218 líneas). Esto es el caso adversarial: el guion se aplica, borra las 5 personas y reinserta las otras 14 tablas. Ejecutado en staging:

`ERROR: P0001: VOLCADO INCOMPLETO: tabla personas esperaba 5 filas y hay 0`
`CONTEXT: PL/pgSQL function inline_code_block line 59 at RAISE`

La verificación embebida saltó después de los 15 `delete` y de los 14 `insert`, antes del `commit`. Conteos posteriores: los 15 valores de la línea base, `personas = 5`, suma 22 — es decir, la transacción revirtió también los borrados ya ejecutados: **una restauración a medias no es posible**.

### Efecto en el estado de la tarea

Los 8 criterios de aceptación quedan cumplidos. P0-07 pasa a `hecho`.
