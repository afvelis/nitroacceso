---
id: "F-13"
titulo: "PIN de 8 dígitos y bcrypt coste 12 (más capítulo de manual)"
prioridad: "P1"
estado: "en_progreso"
area: "seguridad"
depende_de: ["P0-07"]
archivos:
  - "supabase/migrations/0004_f13_pin_8_digitos_bcrypt_12.sql"
  - "js/admin.js"
  - "admin.html"
  - "docs/manual-usuario/10-seguridad-del-panel.md"
  - "docs/manual-usuario/00-indice.md"
---

# F-13 · PIN de 8 dígitos y bcrypt coste 12 (más capítulo de manual)

## Contexto

**Contexto verificado el 2026-11-17** (números de línea verificados con `grep -n`; re-verificar antes de editar):

- El PIN se guarda con bcrypt coste POR DEFECTO de pgcrypto porque se llama `extensions.gen_salt('bf')` sin número de iteraciones en `f_admin_rotar_pin`: [supabase/migrations/0001_esquema_inicial.sql:1985](../supabase/migrations/0001_esquema_inicial.sql#L1985) (`set pin_admin = extensions.crypt(p_pin_nuevo, extensions.gen_salt('bf'))`) y [:1989](../supabase/migrations/0001_esquema_inicial.sql#L1989) (idem para `pin_puerta`). El coste por defecto de pgcrypto es 6, el mínimo.
- El PIN nuevo se valida con `p_pin_nuevo !~ '^[0-9]{6}$'` en la misma función: [supabase/migrations/0001_esquema_inicial.sql:1971](../supabase/migrations/0001_esquema_inicial.sql#L1971). El navegador repite la validación con `/^[0-9]{6}$/` en [js/admin.js:195](../js/admin.js#L195) (y el mensaje «exactamente 6 digitos» también en [js/admin.js:192](../js/admin.js#L192) y [js/admin.js:203](../js/admin.js#L203)).
- El texto visible dice «exactamente 6 digitos» en [admin.html:126](../admin.html#L126) (tarjeta «Sesiones y seguridad»).
- El manual NO tiene ningún capítulo dedicado al PIN. Corrección de la afirmación inicial tras verificar con `grep` (no decir «la única mención es una», sería falso): el índice menciona «rota PINs» en [docs/manual-usuario/00-indice.md:11](../docs/manual-usuario/00-indice.md#L11) y el PIN de entrada en [:12](../docs/manual-usuario/00-indice.md#L12) y [:79](../docs/manual-usuario/00-indice.md#L79); además el PIN y el bloqueo de 15 minutos aparecen en [docs/manual-usuario/09-problemas-frecuentes.md:22-23](../docs/manual-usuario/09-problemas-frecuentes.md#L22-L23) y [:45](../docs/manual-usuario/09-problemas-frecuentes.md#L45). Lo que NO existe es un capítulo que explique rotación, formato, bcrypt y revocación de sesiones en un solo sitio.

## Objetivo

Que los PIN nuevos tengan 8 dígitos y se guarden con bcrypt coste 12 (el mínimo razonable actual), sin romper los PIN de 6 ya existentes, con el frontend y el manual actualizados en el mismo cambio.

## Criterios de aceptación

- [x] (a) Migración acumulativa nueva (siguiente número libre en `supabase/migrations/`: al 2026-11-17 existen `0001`, `0002`, `0003`, por lo que tocaría `0004_pin_8_digitos_bcrypt_12.sql`) con `CREATE OR REPLACE` de `f_admin_rotar_pin`: regex `^[0-9]{8}$` y `extensions.gen_salt('bf', 12)`. **Prohibido** editar `0001`/`0002`/`0003`, prohibido `DROP`, prohibido cambiar la firma `(p_token uuid, p_objetivo text, p_pin_actual text, p_pin_nuevo text)`. Envolver en `begin;` … `commit;`.
- [x] (b) Compatibilidad: los PIN de 6 dígitos ya existentes deben seguir funcionando para entrar DESPUÉS de la migración (`f_login` no valida formato, solo compara con `extensions.crypt`, [supabase/migrations/0001_esquema_inicial.sql:3641-3651](../supabase/migrations/0001_esquema_inicial.sql#L3641-L3651)). Solo la ROTACIÓN exigirá 8. **PROBADO el 17/11/2026 en staging:** un PIN de 6 dígitos creado A MANO por SQL (no por rotación) siguió autenticando después de aplicar la 0004 — `select public.f_login('123456')` devolvió rol `'puerta'`. La prueba se hizo llamando a `f_login` directamente, NO por la pantalla de puerta (con `edicion_abierta = true` el módulo se bloquea por diseño). Ver Notas de implementación.
- [x] (c) [js/admin.js](../js/admin.js): misma regex de 8 dígitos y mensaje de error coherente (líneas 192, 195 y 203 al día de hoy). [admin.html](../admin.html): texto de la tarjeta actualizado (línea 126 al día de hoy).
- [x] (d) Capítulo nuevo `docs/manual-usuario/10-seguridad-del-panel.md` y su fila en [docs/manual-usuario/00-indice.md](../docs/manual-usuario/00-indice.md). Debe explicar: que «Rotar PIN» SIEMPRE pide el PIN de ADMIN actual, también al rotar el de puerta, y que NO hace falta recordar el PIN de puerta para cambiarlo; que rotar un PIN NO cierra las sesiones abiertas (para eso está «Revocar», que cierra todas menos la actual); y el formato de 8 dígitos.
- [x] (e) Prueba en staging HECHA el 17/11/2026 ANTES de producción: migración 0004 aplicada en staging y verificada con 5 booleanos sobre `pg_get_functiondef` (exige 8 dígitos `true`, queda regex de 6 `false`, tiene `gen_salt('bf', 12)` `true`, queda `gen_salt('bf')` sin coste `false`, arreglo `ERR_IGUAL` presente `true`); PIN de admin y de puerta ROTADOS A 8 DÍGITOS desde la interfaz, con confirmación en pantalla («el anterior ya no sirve»); entrar con ambos; un PIN viejo de 6 sigue entrando (criterio b). **SIGUE PENDIENTE: aplicar la 0004 y rotar en PRODUCCIÓN.**
- [x] (f) Dejar escrito que el coste 12 añade latencia al login (una vez por turno, no por escaneo) y que debe medirse, no suponerse. Escrito en la cabecera de [supabase/migrations/0004_f13_pin_8_digitos_bcrypt_12.sql](../supabase/migrations/0004_f13_pin_8_digitos_bcrypt_12.sql) (NOTA de latencia) y en [docs/manual-usuario/10-seguridad-del-panel.md](../docs/manual-usuario/10-seguridad-del-panel.md) ("puede tardar un instante más"). La MEDICIÓN real se hizo el 17/11/2026 en staging: **~300 ms por hash**, una vez por turno (login/rotación), no por escaneo.

## Riesgo residual

Ningún cambio de longitud de PIN ni de coste bcrypt arregla que el respaldo ([P0-07](P0-07-vuelta-atras-volcado-restauracion.md)) contenga los hashes: el volcado incluye la fila `config` completa, hashes de PIN incluidos. La regla es que el respaldo no se comparte y que después de restaurar se rotan los PIN.

## Fuera de alcance

- El desbloqueo de puerta y las ventanas de bloqueo por rol: eso es [P0-08](P0-08-desbloqueo-puerta.md), y su criterio (d) NO se hace por separado de esta tarea.
- Ejecutar la migración contra producción: todo lo ejecuta el usuario en el SQL Editor, primero en staging (criterio (e)).
- Migrar o re-hashear los PIN existentes: solo se exige compatibilidad (criterio (b)).

## Notas de implementación

> **Tarea creada el 2026-11-17.** Solo documentación: no se tocó código ni SQL. La migración aún no existe; el nombre `0004_pin_8_digitos_bcrypt_12.sql` es el siguiente número libre verificado (`ls supabase/migrations/` → 0001, 0002, 0003). Los números de línea fueron verificados con `grep -n` el mismo día; re-verificar antes de editar (regla del README).

> **Implementación el 2026-11-17 (rama `agente/2026-11-17-f13-pin-8-digitos`).** Escrito en el repo, SIN aplicar en ninguna base:
> - Migración `supabase/migrations/0004_f13_pin_8_digitos_bcrypt_12.sql` (nombre real; el frontmatter quedó corregido a este): copia de la definición vigente en producción (verificada con `pg_get_functiondef`, sin deriva) con SOLO tres cambios: regex `^[0-9]{8}$`, `gen_salt('bf', 12)` en las dos rotaciones, y el arreglo DELIBERADO del `ERR_IGUAL` (comparaba texto plano contra hash bcrypt; ahora compara con `crypt`). `begin;`/`commit;`, sin DROP, sin tocar 0001/0002/0003.
> - Frontend: `js/admin.js` (mensaje del modal, regex y texto de `ERR_FORMATO` a 8 digitos), `admin.html` (tarjeta "Sesiones y seguridad"), `index.html` y `puerta.html` (placeholder de 8 puntos; SIN `maxlength` ni `pattern` para que los PIN de 6 sigan entrando).
> - Docs técnicos: `docs/seguridad-sesiones.md` (§4) y `ARQUITECTURA.md` (línea de `f_admin_rotar_pin`). `DECISIONES.md` solo con las dos entradas nuevas al final (append-only).
> - Manual: capítulo nuevo `10-seguridad-del-panel.md` + fila en el índice + las dos menciones de 6 dígitos en `01-entrar-y-salir.md`.
>
> **PENDIENTE (requiere staging/producción, todo lo ejecuta el usuario):** aplicar la migración 0004, rotar los dos PIN, entrar con 8 dígitos, comprobar que un PIN viejo de 6 sigue entrando, y medir la latencia del coste 12 (criterios b y e, sin [x]).
>
> **AVISO: la migración NO se ha aplicado en ninguna base (ni staging ni producción).** Orden obligatorio: aplicar 0004 primero, LUEGO rotar los dos PIN; solo entonces el PIN nuevo de 8 dígitos es el válido. Antes de aplicar, verificar la definición vigente con `pg_get_functiondef('f_admin_rotar_pin')`.

> **Prueba en staging el 2026-11-17 (rama `agente/2026-11-17-f13-prueba-staging`), ejecutada por el usuario en el SQL Editor del proyecto staging (`adoqujnnnrlgmvwbnwbl`):**
> - **Migración 0004 aplicada y verificada con 5 booleanos** sobre `pg_get_functiondef`: exige 8 dígitos `true`, queda regex de 6 `false`, tiene `gen_salt('bf', 12)` `true`, queda `gen_salt('bf')` sin coste `false`, arreglo `ERR_IGUAL` presente `true`.
> - **Rotación real desde la interfaz:** PIN de admin y de puerta rotados a 8 dígitos en staging, con confirmación en pantalla («el anterior ya no sirve»). El orden fue el obligatorio: aplicar 0004 primero, rotar después.
> - **Compatibilidad (criterio b):** un PIN de 6 dígitos CREADO A MANO por SQL (no por rotación) siguió autenticando: `select public.f_login('123456')` devolvió rol `'puerta'`. La prueba se hizo llamando a `f_login` directamente porque la prueba de login en la pantalla de puerta NO se puede hacer con la edición abierta: el módulo se bloquea por diseño (con `edicion_abierta = true` la puerta no opera). `f_login` es la misma función que usa la pantalla, así que la prueba vale y no obliga a cambiar el estado del evento. Esa llamada crea una sesión real: limpiar con la función de revocar.
> - **Coste 12 medido: ~300 ms por hash**, una vez por turno (login/rotación), no por escaneo.
> - **Vuelta atrás:** la definición EXACTA de `f_admin_rotar_pin` previa a la 0004 (capturada con `pg_get_functiondef` el 17/11/2026) vive en `docs/sql/f_admin_rotar_pin-antes-f13-2026-11-17.sql`; revertir = ejecutar ese archivo y rotar los PIN cambiados con el formato nuevo (vuelven a exigirse 6 dígitos).
> - **Orden obligatorio, siempre:** aplicar 0004 primero y LUEGO rotar los dos PIN; solo entonces el PIN nuevo de 8 dígitos es el válido.
> - **PENDIENTE (producción, lo ejecuta el usuario):** aplicar la 0004 en producción, rotar allí los dos PIN a 8 dígitos y verificar. Nada de esto se marcó hecho.
