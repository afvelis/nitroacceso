---
id: "P0-08"
titulo: "Desbloqueo de puerta y rediseño del bloqueo de login"
prioridad: "P0"
estado: "hecho"
area: "seguridad"
depende_de: ["P0-07"]
archivos:
  - "supabase/migrations/0005_p08_reabrir_puerta.sql"
  - "js/admin.js"
  - "admin.html"
  - "js/index.js"
  - "js/puerta.js"
  - "puerta.html"
  - "docs/manual-usuario/09-problemas-frecuentes.md"
  - "ARQUITECTURA.md"
---

# P0-08 · Desbloqueo de puerta y rediseño del bloqueo de login

## Contexto

**Problema real (operativo):** en pleno evento, 5 intentos fallidos de PIN en la pantalla de puerta dejan esa IP bloqueada 15 minutos. Quince minutos en la puerta de un evento es una eternidad, y hoy no hay forma de reabrir sin reiniciar el evento entero (`f_admin_limpiar_todo` borra todo: aliados, cortesías, escaneos, configuración).

**Hallazgos verificados en el código actual** (números de línea verificados con `grep -n` sobre `supabase/migrations/0001_esquema_inicial.sql` el 2026-11-17):

- El bloqueo cuenta SOLO por IP, ventana de 15 minutos, umbral 5: [supabase/migrations/0001_esquema_inicial.sql:3631-3635](../supabase/migrations/0001_esquema_inicial.sql#L3631-L3635) (`select count(*) into v_intentos from public.login_intentos where ip = v_ip and exito = false and creada_at > now() - interval '15 minutes'`) y [:3637](../supabase/migrations/0001_esquema_inicial.sql#L3637) (`if v_intentos >= 5 then`).
- Admin y puerta COMPARTEN el mismo contador: `login_intentos` no tiene columna de rol ([supabase/migrations/0001_esquema_inicial.sql:95](../supabase/migrations/0001_esquema_inicial.sql#L95): `ip, dispositivo, exito, creada_at`) y la comprobación de bloqueo se hace antes de saber qué rol corresponde al PIN (el `select case … into v_rol` va después, [:3641-3651](../supabase/migrations/0001_esquema_inicial.sql#L3641-L3651)). Consecuencia: los fallos de la puerta bloquean también el login del administrador si comparten IP.
- La comprobación de bloqueo ([supabase/migrations/0001_esquema_inicial.sql:3637-3639](../supabase/migrations/0001_esquema_inicial.sql#L3637-L3639), `raise exception`) va ANTES del insert del intento ([supabase/migrations/0001_esquema_inicial.sql:3655](../supabase/migrations/0001_esquema_inicial.sql#L3655)): reintentar estando bloqueado no suma ni reinicia nada.
- Un login correcto NO limpia los fallos previos: no existe ningún `delete`/`update` sobre `login_intentos` en `f_login` (verificado con `grep` sobre toda la migración).
- Rotar el PIN no desbloquea: el PIN vive en `config`, el bloqueo en `login_intentos`. Son tablas distintas y nada las cruza. Por eso «cambiar el PIN para que entre» NO funciona.
- El único borrado existente es `f_admin_limpiar_todo` ([supabase/migrations/0001_esquema_inicial.sql:1719](../supabase/migrations/0001_esquema_inicial.sql#L1719), `delete from login_intentos where true;`), que borra el evento completo: no sirve como desbloqueo.
- Mensaje actual: `BLOQUEADO: demasiados intentos fallidos desde esta IP. Espera 15 minutos.` ([supabase/migrations/0001_esquema_inicial.sql:3638](../supabase/migrations/0001_esquema_inicial.sql#L3638); texto fijo, sin segundos restantes).

## Objetivo

Que en pleno evento el administrador pueda reabrir la puerta en segundos, con rastro de auditoría, sin rotar el PIN y sin reiniciar el evento; y que el bloqueo distinga pantalla de puerta de login de administrador con ventanas proporcionadas al riesgo de cada una.

## Criterios de aceptación

- [x] (a) RPC nueva `f_admin_reabrir_puerta(p_token uuid, p_motivo text)`: exige `f_sesion_ok(p_token,'admin')`; exige `p_motivo` no vacío (mínimo 10 caracteres) y devuelve `'ERR_MOTIVO'` si falta; borra SOLO las filas de `login_intentos` con `exito = false` dentro de la ventana vigente (nunca las exitosas); deja entrar con el PIN que ya se tiene, sin rotarlo; devuelve `'ok'`. **CUMPLIDO (20/11/2026, staging):** motivo válido (28 caracteres) devolvió `"ok"`; motivo `"corto"` (5) y motivo `""` devolvieron `"ERR_MOTIVO"`; token de puerta y UUID en ceros devolvieron `"ERR_TOKEN"`. Tras la reapertura, el PIN de puerta entró sin rotarlo (HTTP 200 + token).
- [x] (b) Toda reapertura queda auditada: quién (token/sesión), cuándo y motivo, en una tabla de auditoría propia. Ninguna reapertura sin rastro. **CUMPLIDO (20/11/2026, staging):** auditoría comprobada por SQL: 1 fila de la prueba con `motivo_largo = 34`, `ventana = "puerta 90s + legado 15min"`, `sesiones_distintas = 1` (hash de sesión, nunca el token) e `intentos_borrados = 6`. Las llamadas rechazadas (motivo corto/vacío, token ajeno) no dejan fila.
- [ ] (c) Separar el contador de admin del de puerta para que los fallos de una pantalla no bloqueen la otra. **APROBADO E IMPLEMENTADO:** el usuario aprobó el alcance completo a–g el 20/11/2026 (incluido el cambio de firma de `f_login`); implementado en [supabase/migrations/0005_p08_reabrir_puerta.sql](../supabase/migrations/0005_p08_reabrir_puerta.sql) como `f_login(p_pin text, p_rol_solicitado text default null)`, con contadores separados por origen (`rol_solicitado`) y ventanas propias: puerta 90 segundos, admin 15 minutos. **CUMPLIDO (20/11/2026, staging):** con 5 fallos de puerta acumulados, el login de admin siguió devolviendo 200 + token (el cubo de admin no se movió).
- [x] (d) Ventana de bloqueo de puerta corta (60-120 s), ventana de admin larga (15 min). **ADVERTENCIA:** acortar la ventana es seguro SOLO si a la vez los PIN pasan a 8 dígitos ([F-13](F-13-pin-8-digitos-bcrypt-12.md)). Con 6 dígitos, 5 intentos por minuto agotan 10^6 en ~139 días, que es tolerable pero no holgado. **No hacer (c) ni (d) por separado de F-13.** **CUMPLIDO (20/11/2026, staging):** ventanas puerta 90 s / admin 15 min, implementadas en la [0005](../supabase/migrations/0005_p08_reabrir_puerta.sql) y visibles en el mensaje. (El requisito de F-13 ya está satisfecho: la 0004 puso los PIN en 8 dígitos con bcrypt coste 12.)
- [x] (e) Mensaje de bloqueo con segundos restantes en lugar del «15 minutos» fijo, y en la pantalla de puerta el texto exacto que debe ver el operador: «esperar N segundos» o «avisar al administrador». **CUMPLIDO (20/11/2026, staging):** mensaje literal del bloqueo: `BLOQUEADO: demasiados intentos fallidos desde esta IP. Espera 79 segundos.` (antes: «Espera 15 minutos» fijo). En puerta se muestra junto al botón: «espera N segundos o avisa al administrador».
- [x] (f) Botón «Reabrir puerta» en la tarjeta «Sesiones y seguridad» de [admin.html](../admin.html) (`<section class="tarjeta" id="sesiones">`, línea 124), con motivo obligatorio y resultado mostrado en la propia tarjeta (norma de mensajes v2.2 del [AGENTS.md](../AGENTS.md)), no solo en cabecera. **CUMPLIDO (20/11/2026, staging):** botón «Reabrir puerta» en `#sesiones` de `admin.html`, motivo obligatorio validado antes de llamar, resultado dentro de la tarjeta y persistido en `sessionStorage`.
- [x] (g) Pruebas en staging: 5 fallos → bloqueo; reabrir → entra sin rotar PIN; motivo vacío → rechazado; token de puerta en vez de admin → rechazado; y comprobación de que el contador de admin no se mueve con fallos de puerta (solo si se hizo (c)). **CUMPLIDO (20/11/2026, staging):** batería completa ejecutada contra staging el 20/11/2026: P1 login admin 200 · P2 login puerta 200 · P3 5 fallos 200×5 · P4 PIN real de puerta 400 `BLOQUEADO … 79 segundos` · P5 admin 200 · P6 reapertura `"ok"` · P7 PIN de puerta 200 sin rotar · P8 motivo corto/vacío `ERR_MOTIVO` · P9 token de puerta `ERR_TOKEN` · P10 UUID ceros `ERR_TOKEN`.

## Fallback manual para el día del evento (mientras no exista esto)

- Quién tiene el PIN correcto: el administrador, por escrito y de memoria (no en el teléfono bloqueado ni solo en un correo).
- Qué dispositivo se usa: UNO solo para puerta y UNO solo para admin, con IPs distintas si es posible (red móvil del admin vs wifi del recinto) para que un bloqueo de puerta no toque al admin.
- Qué hacer si se bloquea: NO insistir (reintentar estando bloqueado no suma ni reinicia nada, ver hallazgo de línea 3637-3655); esperar los 15 minutos o entrar como admin desde el otro dispositivo; como último recurso, `f_admin_limpiar_todo` SOLO con orden explícita del usuario, sabiendo que borra el evento entero. Rotar el PIN NO desbloquea.

## Fuera de alcance

- Rotar PINs o tocar `config` (eso es [F-13](F-13-pin-8-digitos-bcrypt-12.md)).
- Cambiar la firma de `f_login` sin aprobación explícita del usuario (ya aprobada el 20/11/2026 para este alcance; cualquier otro cambio de firma sigue necesitando aprobación).
- Ejecutar cualquier SQL contra producción: todo lo ejecuta el usuario en el SQL Editor, primero en staging.

## Notas de implementación

> **Tarea creada el 2026-11-17 desde el análisis de seguridad del bloqueo de login.** Solo documentación: no se tocó código ni SQL. Los números de línea fueron verificados con `grep -n` el mismo día; re-verificar antes de editar (regla del README).

> **Cierre (20/11/2026):** la batería de 10 pruebas (g) y la auditoría se ejecutaron contra staging ese mismo día; los criterios a–g quedan marcados con su evidencia en la sección «Criterios de aceptación». Tarea cerrada como `hecho`.

## Incidente real de despliegue (20/11/2026)

Al fusionar el PR #37 (frontend) antes de aplicar el SQL, el login de admin y puerta quedó roto en producción con `PGRST202: Could not find the function public.f_login(p_pin, p_rol_solicitado)`: el frontend pidió la firma nueva y la base solo tenía la vieja. Se aplicó la `0005` en staging y producción, y entonces apareció `HTTP 300 PGRST203` por la sobrecarga: PostgREST no resuelve entre `f_login(text)` y `f_login(text, text)` cuando la llamada lleva un solo argumento. Se retiró con `drop function if exists public.f_login(text);` (migración `0006`) y el login volvió a funcionar; el usuario entró normalmente al panel. **Lección:** ninguna migración que cambie la firma de una RPC usada por el frontend se fusiona antes de estar aplicada, o el frontend debe seguir funcionando con un argumento.

**Estado del archivo de la migración `0006` (verificado en el repo el 20/11/2026):** `supabase/migrations/0006_p08_retirar_sobrecarga_f_login.sql` NO está aún en `main`; vive en la rama `agente/2026-11-18-p0-08-retirar-sobrecarga` (commit `f9c0cae`) pendiente de PR. El SQL sí quedó aplicado (el usuario lo ejecutó en el SQL Editor); falta fusionar el archivo para dejar constancia. Acordado en la misma sesión: se fusiona después de este cierre documental.

> **Residuos de la batería en staging (20/11/2026):** quedan 2 filas de prueba en `reaperturas_puerta` (`prueba automatica P0-08 en staging` y `prueba debug`) y varios logins de prueba en `login_intentos`; son residuos de la batería, sin efecto operativo.
