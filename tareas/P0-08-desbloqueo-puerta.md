---
id: "P0-08"
titulo: "Desbloqueo de puerta y rediseño del bloqueo de login"
prioridad: "P0"
estado: "pendiente"
area: "seguridad"
depende_de: ["P0-07"]
archivos:
  - "supabase/migrations/0001_esquema_inicial.sql"
  - "js/admin.js"
  - "admin.html"
  - "docs/manual-usuario/09-problemas-frecuentes.md"
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

- [ ] (a) RPC nueva `f_admin_reabrir_puerta(p_token uuid, p_motivo text)`: exige `f_sesion_ok(p_token,'admin')`; exige `p_motivo` no vacío (mínimo 10 caracteres) y devuelve `'ERR_MOTIVO'` si falta; borra SOLO las filas de `login_intentos` con `exito = false` dentro de la ventana vigente (nunca las exitosas); deja entrar con el PIN que ya se tiene, sin rotarlo; devuelve `'ok'`.
- [ ] (b) Toda reapertura queda auditada: quién (token/sesión), cuándo y motivo, en una tabla de auditoría propia. Ninguna reapertura sin rastro.
- [ ] (c) Separar el contador de admin del de puerta para que los fallos de una pantalla no bloqueen la otra. **DECISIÓN PENDIENTE (no hecho):** esto exige cambiar la firma de `f_login` (parámetro nuevo `p_rol_solicitado`) o rediseñar la comprobación, y la regla del proyecto prohíbe cambiar firmas sin aprobación explícita del usuario. Queda escrito como decisión pendiente, no como hecho.
- [ ] (d) Ventana de bloqueo de puerta corta (60-120 s), ventana de admin larga (15 min). **ADVERTENCIA:** acortar la ventana es seguro SOLO si a la vez los PIN pasan a 8 dígitos ([F-13](F-13-pin-8-digitos-bcrypt-12.md)). Con 6 dígitos, 5 intentos por minuto agotan 10^6 en ~139 días, que es tolerable pero no holgado. **No hacer (c) ni (d) por separado de F-13.**
- [ ] (e) Mensaje de bloqueo con segundos restantes en lugar del «15 minutos» fijo, y en la pantalla de puerta el texto exacto que debe ver el operador: «esperar N segundos» o «avisar al administrador».
- [ ] (f) Botón «Reabrir puerta» en la tarjeta «Sesiones y seguridad» de [admin.html](../admin.html) (`<section class="tarjeta" id="sesiones">`, línea 124), con motivo obligatorio y resultado mostrado en la propia tarjeta (norma de mensajes v2.2 del [AGENTS.md](../AGENTS.md)), no solo en cabecera.
- [ ] (g) Pruebas en staging: 5 fallos → bloqueo; reabrir → entra sin rotar PIN; motivo vacío → rechazado; token de puerta en vez de admin → rechazado; y comprobación de que el contador de admin no se mueve con fallos de puerta (solo si se hizo (c)).

## Fallback manual para el día del evento (mientras no exista esto)

- Quién tiene el PIN correcto: el administrador, por escrito y de memoria (no en el teléfono bloqueado ni solo en un correo).
- Qué dispositivo se usa: UNO solo para puerta y UNO solo para admin, con IPs distintas si es posible (red móvil del admin vs wifi del recinto) para que un bloqueo de puerta no toque al admin.
- Qué hacer si se bloquea: NO insistir (reintentar estando bloqueado no suma ni reinicia nada, ver hallazgo de línea 3637-3655); esperar los 15 minutos o entrar como admin desde el otro dispositivo; como último recurso, `f_admin_limpiar_todo` SOLO con orden explícita del usuario, sabiendo que borra el evento entero. Rotar el PIN NO desbloquea.

## Fuera de alcance

- Rotar PINs o tocar `config` (eso es [F-13](F-13-pin-8-digitos-bcrypt-12.md)).
- Cambiar la firma de `f_login` sin aprobación explícita del usuario (criterio (c) queda como decisión pendiente).
- Ejecutar cualquier SQL contra producción: todo lo ejecuta el usuario en el SQL Editor, primero en staging.

## Notas de implementación

> **Tarea creada el 2026-11-17 desde el análisis de seguridad del bloqueo de login.** Solo documentación: no se tocó código ni SQL. Los números de línea fueron verificados con `grep -n` el mismo día; re-verificar antes de editar (regla del README).
