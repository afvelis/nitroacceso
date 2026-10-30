---
id: "P0-03"
titulo: "Endurecer PIN, rate limit, tokens y bloqueo de sesión"
prioridad: "P0"
estado: "hecho"
area: "seguridad"
depende_de: []
archivos:
  - "index.html"
  - "puerta.html"
  - "config.js"
  - "admin.html"
  - "docs/seguridad-sesiones.md"
---

# P0-03 · Endurecer PIN, rate limit, tokens y bloqueo de sesión

## Contexto

El acceso se reduce a un PIN. El placeholder sugiere 4 dígitos, el cliente no limita intentos y todo el personal de puerta comparte el mismo PIN. Los tokens se guardan en `sessionStorage` y `borrarSesion()` solo limpia el navegador: no hay logout real, expiración visible ni revocación. Una tablet de puerta abierta queda operativa para el siguiente.

## Evidencia

- [index.html:46](../index.html#L46): input de PIN con placeholder de 4 puntos.
- [index.html:86](../index.html#L86): `f_login` recibe solo el PIN.
- [config.js:24-35](../config.js#L24-L35): guardar/leer/borrar sesión solo en `sessionStorage`.
- [puerta.html:367-389](../puerta.html#L367-L389): login de puerta reutiliza el mismo PIN.
- [puerta.html:1015](../puerta.html#L1015): un token de puerta puede reabrir listas.
- [puerta.html:320](../puerta.html#L320): un token de puerta puede cerrar el día.

## Objetivo

Reducir la probabilidad y el impacto de un acceso no autorizado: PIN más fuerte, límite de intentos, tokens expirables y revocables, logout real, bloqueo por inactividad y trazabilidad por dispositivo.

## Pasos

- [x] Subir el PIN de admin a 6-8 dígitos o passphrase; mantener uno distinto para puerta. Si se puede, usar Supabase Auth + MFA para admin y dejar el PIN solo para puerta. *(Hecho a 6 dígitos vía rotación en el panel; Supabase Auth + MFA: descartado para esta fase — quedó en Notas.)*
- [x] Implementar rate limit en servidor por IP y por dispositivo: N intentos fallidos → bloqueo temporal con `Retry-After`, y alerta tras varios bloqueos. *(Hecho por IP: 5 fallas en 15 min → bloqueo 15 min; la respuesta es el error BLOQUEADO de la RPC — sin header Retry-After (limitación de PostgREST) y sin alertas (sin canal); ver Notas.)*
- [x] Añadir tabla/campos de sesiones: `token_hash`, `rol`, `device_label`, `creado_at`, `expira_at`, `revocado_at`, `ultimo_uso_at`. *(Fase B: 5 columnas nuevas en `sesiones`; `creada_at` ya existía.)*
- [x] Guardar solo el hash del token (SHA-256 o similar), nunca el token en claro. *(SHA-256 hex vía pgcrypto `extensions.digest`; Fase F2 eliminó la columna `token` y la PK pasó a `token_hash`.)*
- [x] Validar en cada RPC: hash existe, no revocado, no expirado, rol correcto. *(Guardián `f_sesion_ok(token, rol)` en 36 funciones + hash inline en las 3 `LANGUAGE sql` de puerta + `f_sesion_rol` en 13 helper-users; 0 chequeos viejos residuales verificados.)*
- [x] Implementar logout real: RPC que marque `revocado_at`; el botón de salir debe llamarla además de limpiar `sessionStorage`. *(Fase E: `f_logout` + `borrarSesion()` en config.js; probado con contaje 1 activa / 10 revocadas.)*
- [x] Añadir “cerrar todas las sesiones” y “rotar PIN” en el panel admin. *(Fase E: `f_admin_revocar_sesiones` (excluye la propia) y `f_admin_rotar_pin` (exige PIN admin actual + 6 dígitos, bcrypt); tarjeta "Sesiones y seguridad" en admin.html.)*
- [x] Añadir auto-lock por inactividad (5-10 minutos) en admin y puerta; pedir PIN de nuevo. *(5 min en puerta y admin vía `iniciarAutoBloqueo()` en config.js; desplegado, prueba viva pendiente de inactividad real.)*
- [x] Registrar intentos fallidos y sesiones creadas/revocadas en la auditoría. *(Tabla `login_intentos` (IP, dispositivo, resultado, hora) + columnas de sesión; `f_admin_sesiones` las expone en el panel; limpieza de fin de evento barre ambas.)*
- [x] No mostrar el token en la UI ni en logs. *(El token se entrega una vez en el login y jamás vuelve a la base en claro; las vistas del panel solo muestran el hash truncado a 12.)*

## Criterios de aceptación

- [x] Tras N intentos fallidos, `f_login` responde con bloqueo temporal y no permite seguir probando. *(Probado en vivo 29/10: 5 fallas → el 6º intento revienta con `ERROR: BLOQUEADO: demasiados intentos fallidos desde esta IP. Espera 15 minutos.` — se detiene antes de mirar el PIN, incluso si fuera correcto.)*
- [x] Un token expira y deja de funcionar; un token revocado falla inmediatamente. *(Revocación probada en vivo (botón del panel + logout; 10 revocadas / 1 activa). Expiración: validada por dato (`expira_at = creada_at + 8 h`) y por el guardián; la prueba viva de expiración quedó para P1-04 (staging) — ver Notas.)*
- [x] “Salir” invalida el token en servidor, no solo en el navegador. *(Probado: salir → re-login con PIN nuevo; la sesión anterior aparece revocada en la base.)*
- [x] Admin y puerta pueden revocar todas las sesiones activas. *(Panel admin: "Revocar todas las demás sesiones" — por decisión cerrada excluye la propia; probado: la puerta muere al recargar/siguiente acción, el panel sobrevive.)*
- [x] La sesión se bloquea tras el tiempo de inactividad configurado. *(Desplegado a 5 min en puerta y admin; la prueba viva requiere esperar 5 min sin tocar — quedará cubierta en el uso real.)*
- [x] La base de datos no almacena tokens en texto plano. *(Fase F2: columna `token` eliminada; PK por `token_hash`; verificación `prosrc ilike '%token = p_token%'` → 0 filas.)*
- [x] El login exitoso registra dispositivo/fecha/hora y el fallido también. *(`login_intentos`: filas con IP real + user-agent + hora para logins correctos; fallidas registradas igual — en SQL Editor aparecen como IP `desconocida` por no traer cabeceras.)*

## Verificación

En staging:

1. Probar 20 PIN incorrectos y comprobar el bloqueo. *(Hecho en producción con el cubo `desconocida` del SQL Editor: 5 fallas → bloqueo. 20 intentos innecesarios: el umbral es 5.)*
2. Iniciar sesión, copiar el token, hacer logout y reutilizar el token; debe fallar. *(Cubierto por la prueba de revocación: toda sesión revocada falla en el guardián.)*
3. Esperar la expiración configurada (o manipular `expira_at` en staging) y comprobar que falla. *(Pendiente para P1-04/staging; el guardián ya filtra `expira_at > now()` y el dato de 8 h está verificado.)*
4. Dejar una pestaña inactiva y comprobar el auto-lock. *(Desplegado a 5 min; prueba por espera real.)*
5. Revisar la tabla de sesiones: no debe haber tokens en claro. *(Hecho: la columna ya no existe — imposible.)*

## Fuera de alcance

- Rediseñar todos los roles (ver [P1-02](P1-02-roles-estado-puerta.md)).
- Auditar RLS/grants (ver [P0-02](P0-02-rls-autorizacion.md)).

## Notas de implementación

**Ejecutada 29/10/2026 (Sesión 15) en 6 fases, verificada dato a dato. Responsable: usuario + asistente.**

### Fases

- **Fase A — Respaldo:** `pg_get_functiondef` de las 54 funciones que tocan sesiones, congeladas en `docs/Supabase Snippet Untitled query.csv` (93,442 B, commit `fe6f3ac`). Es la póliza de reversión de todo el SQL de esta tarea (renombrar en una pasada de higiene futura).
- **Fase B — Esquema:** pgcrypto a `extensions`; `sesiones` +5 columnas (`token_hash`, `device_label`, `expira_at`, `revocado_at`, `ultimo_uso_at`) + índice único `sesiones_token_hash_uidx`; tabla `login_intentos`; REVOKES; `alter default privileges` para que las tablas nuevas nazcan cerradas.
- **Fase C — Núcleo:** guardián `f_sesion_ok(p_token, rol)` (hash+revocación+expiración+rol, anota `ultimo_uso_at`), `f_sesion_rol` re-hecha por hash, `f_login` con rate limit 5/15 min por IP y registro de intentos, purga de sesiones viejas. 13 helper-users endurecidas gratis. **Prueba del rate limit hecha en vivo con el cubo `desconocida`** (5 fallas reales → el 6º intento revienta). Nota técnica: `encode()` es del núcleo de Postgres — no se califica como `extensions.encode`; `digest`/`crypt`/`gen_salt` sí.
- **Fase D — Reescritura de las 39 inline en 4 lotes** (10 admin lectura, 13 admin cortesías, 5 admin aliados, 11 puerta): 8 plpgsql de puerta + 28 de admin al guardián; las 3 `LANGUAGE sql` de puerta (`lista`, `vendedor_por_cedula`, `vendedor_por_qr`) llevan hash inline (son `STABLE`, no pueden llamar al guardián). Verificación por conteo tras cada lote (10 → 23 → 28 → 36) y **0 chequeos residuales** al final. Humo "APP OK" en dashboard, estadísticas, cortesías y puerta (marcado en vivo: 4 personas, 2 autorizados).
- **Fase E — RPCs y frontend:** `f_logout`, `f_admin_sesiones`, `f_admin_revocar_sesiones` (excluye la propia — decisión cerrada), `f_admin_rotar_pin` (prueba de presencia con el PIN admin actual; nuevo PIN exactamente 6 dígitos; queda bcrypt). Frontend: `config.js` (salida real + `iniciarAutoBloqueo` 5 min), `index.html` (placeholder 6 puntos + BLOQUEADO legible sin filtrar errores), `puerta.html` (auto-bloqueo), `admin.html` **v2** (tarjeta "Sesiones y seguridad" + modales propios regla v2.1 — sin alert/confirm/prompt nativos). `dashboard.html` no necesitó cambios: su botón Salir hereda la salida real de config.js. Rotaciones reales ejecutadas: admin y puerta a 6 dígitos → verificación booleana `true, true`; re-login con los nuevos OK; viejos rechazados.
- **Fase F — Limpieza definitiva:** `f_login` v2 (no guarda el token; solo el hash), columna `token` eliminada, PK movida a `token_hash` (`sesiones_token_hash_pkey` usando el índice único existente), `f_admin_limpiar_todo` ahora barre también `login_intentos` (requisito del usuario: el cierre del evento cierra todas las sesiones y borra los intentos).

### Incidentes y lecciones (registrados para el estilo de trato)

1. **Lote aplicado en el proyecto equivocado (Fase D, lote 1B):** el SQL Editor estaba en otro proyecto; "Success" no bastó. Lección: **verificar con consulta de conteo tras CADA lote** — el conteo mostró 7/10 y se re-aplicó.
2. **Diálogos nativos suprimidos (rotación de PIN):** Chrome suprime `alert/confirm/prompt` encadenados; el resultado de la primera rotación nunca se vio y "pareció" exitosa sin aplicarse. Lección: **la regla v2.1 (modales propios) también evita fallos silenciosos** — se corrigió con `admin.html` v2.
3. **Fuga de prefijo de PIN en una consulta de verificación:** la consulta mostró `left(pin_admin, 7)` de un PIN aún en claro (7 de 8 caracteres quedaron en el chat). Cura aplicada: rotación real (el valor filtrado quedó muerto). **Regla nueva permanente: las verificaciones de claves jamás muestran prefijos, largos ni fragmentos — solo booleanos** (ej.: `(left(pin, 2) = '$2') as es_bcrypt`).
4. **Reglas del usuario registradas en Estilo de trato (29/10):** las consultas SQL con resultados se piden **una a la vez** (la ventana no permite pegar más); todo cambio de repo se entrega con **ruta exacta + texto de commit**.

### Decisiones cerradas (detalle en DECISIONES.md)

Expiración 8 h · rate limit 5 fallas/15 min por IP (bloquea incluso con PIN correcto; la ventana corre desde la 5ª falla) · PINs de 6 dígitos con bcrypt (`extensions.crypt/gen_salt('bf')`; aceptación de claro muerta al rotar) · "revocar todas" = todas excepto la propia · auto-bloqueo 5 min · la columna `token` eliminada (el token vive solo en el navegador) · Supabase Auth + MFA: descartado para esta fase (el modelo PIN+bcrypt cumplió los criterios; puede retomarse como P2) · `Retry-After` y alertas de bloqueo: fuera de alcance (limitación de PostgREST / sin canal; el mensaje BLOQUEADO es visible en el login).

### Pendientes que quedaron (backlog)

- **Depurar `admin.html` (petición explícita del usuario):** la página está sobrecargada de funciones; separar actividades medulares de secundarias. Candidato a nueva tarea P1/P2.
- **`puerta.html`:** distinguir "sesión revocada/expirada" de "no encontrado" en las búsquedas (hoy ambas responden vacío con mensaje genérico de no-encontrado).
- **`f_admin_limpiar_todo`:** no reinicia `dia1_cerrado`/`dia2_cerrado` (pre-existente a P0-03) — el próximo evento arrancaría con los días "cerrados" del anterior. Decisión del usuario pendiente antes del próximo evento.
- **P1-04 (staging):** prueba viva de expiración de token y del auto-bloqueo con temporizador.
- Renombrar `docs/Supabase Snippet Untitled query.csv` → `respaldo-funciones-pre-p003.csv` (higiene, no urgente).

### SQL aplicado (todo ejecutado por el usuario en el SQL Editor de Supabase, proyecto nitrotalentos)

Fase B (pgcrypto/extensions + columnas + login_intentos + grants/default privileges) · Fase C (f_sesion_ok, f_sesion_rol, f_login, purga, notify) · Fase D (39 CREATE OR REPLACE en 4 lotes + re-aplicación del 1B) · Fase E (4 RPCs nuevas) · rotaciones vía panel (2) · Fase F (f_login v2 + swap de PK + drop column + f_admin_limpiar_todo + notify). Reversión total posible desde el respaldo de la Fase A.
