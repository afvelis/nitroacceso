---
id: "F-13"
titulo: "PIN de 8 dígitos y bcrypt coste 12 (más capítulo de manual)"
prioridad: "P1"
estado: "pendiente"
area: "seguridad"
depende_de: ["P0-07"]
archivos:
  - "supabase/migrations/0004_pin_8_digitos_bcrypt_12.sql"
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

- [ ] (a) Migración acumulativa nueva (siguiente número libre en `supabase/migrations/`: al 2026-11-17 existen `0001`, `0002`, `0003`, por lo que tocaría `0004_pin_8_digitos_bcrypt_12.sql`) con `CREATE OR REPLACE` de `f_admin_rotar_pin`: regex `^[0-9]{8}$` y `extensions.gen_salt('bf', 12)`. **Prohibido** editar `0001`/`0002`/`0003`, prohibido `DROP`, prohibido cambiar la firma `(p_token uuid, p_objetivo text, p_pin_actual text, p_pin_nuevo text)`. Envolver en `begin;` … `commit;`.
- [ ] (b) Compatibilidad: los PIN de 6 dígitos ya existentes deben seguir funcionando para entrar DESPUÉS de la migración (`f_login` no valida formato, solo compara con `extensions.crypt`, [supabase/migrations/0001_esquema_inicial.sql:3641-3651](../supabase/migrations/0001_esquema_inicial.sql#L3641-L3651)). Solo la ROTACIÓN exigirá 8. Debe quedar como criterio probado en staging, no supuesto.
- [ ] (c) [js/admin.js](../js/admin.js): misma regex de 8 dígitos y mensaje de error coherente (líneas 192, 195 y 203 al día de hoy). [admin.html](../admin.html): texto de la tarjeta actualizado (línea 126 al día de hoy).
- [ ] (d) Capítulo nuevo `docs/manual-usuario/10-seguridad-del-panel.md` y su fila en [docs/manual-usuario/00-indice.md](../docs/manual-usuario/00-indice.md). Debe explicar: que «Rotar PIN» SIEMPRE pide el PIN de ADMIN actual, también al rotar el de puerta, y que NO hace falta recordar el PIN de puerta para cambiarlo; que rotar un PIN NO cierra las sesiones abiertas (para eso está «Revocar», que cierra todas menos la actual); y el formato de 8 dígitos.
- [ ] (e) Prueba en staging ANTES de producción: rotar admin y puerta con 8 dígitos, entrar con ambos; verificar que un PIN viejo de 6 sigue entrando.
- [ ] (f) Dejar escrito que el coste 12 añade latencia al login (una vez por turno, no por escaneo) y que debe medirse, no suponerse.

## Riesgo residual

Ningún cambio de longitud de PIN ni de coste bcrypt arregla que el respaldo ([P0-07](P0-07-vuelta-atras-volcado-restauracion.md)) contenga los hashes: el volcado incluye la fila `config` completa, hashes de PIN incluidos. La regla es que el respaldo no se comparte y que después de restaurar se rotan los PIN.

## Fuera de alcance

- El desbloqueo de puerta y las ventanas de bloqueo por rol: eso es [P0-08](P0-08-desbloqueo-puerta.md), y su criterio (d) NO se hace por separado de esta tarea.
- Ejecutar la migración contra producción: todo lo ejecuta el usuario en el SQL Editor, primero en staging (criterio (e)).
- Migrar o re-hashear los PIN existentes: solo se exige compatibilidad (criterio (b)).

## Notas de implementación

> **Tarea creada el 2026-11-17.** Solo documentación: no se tocó código ni SQL. La migración aún no existe; el nombre `0004_pin_8_digitos_bcrypt_12.sql` es el siguiente número libre verificado (`ls supabase/migrations/` → 0001, 0002, 0003). Los números de línea fueron verificados con `grep -n` el mismo día; re-verificar antes de editar (regla del README).
