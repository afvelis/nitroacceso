# Seguridad de sesiones — NitroSystem (P0-03)

> Fuente de verdad del modelo de sesiones, logins y PINs. Congelado al cierre de la Sesión 15 (29/10/2026).
> Complementa a `seguridad-supabase.md` (P0-02, permisos) — este documento cubre P0-03 (sesiones, rate limit, PINs).
> Regla permanente: antes de reescribir cualquier RPC de sesión, leer su definición vigente con `pg_get_functiondef`.
> Respaldo del mundo anterior (pre-P0-03): `docs/Supabase Snippet Untitled query.csv` (54 definiciones, commit `fe6f3ac`).

---

## 1 · Modelo de sesión

- El token de sesión es un `uuid` que **se genera en el login, viaja UNA vez al navegador y jamás vuelve a la base en claro**. En la base solo existe su huella **SHA-256 en hex** (`token_hash`, 64 caracteres).
- Tabla `sesiones` (PK: `token_hash`): `token_hash` (único), `rol` (admin|puerta), `device_label` (user-agent truncado a 200), `creada_at`, `expira_at`, `revocado_at`, `ultimo_uso_at`.
- Vida útil: **8 horas** desde el login (`expira_at = creada_at + interval '8 hours'`).
- El token vive en `sessionStorage` del navegador: al cerrar la pestaña muere localmente; en la base expira solo a las 8 h (o antes si se revoca).
- **Una pestaña abierta NO es una sesión viva:** la revocación mata la llave en la base; la pestaña muere en su próxima llamada o al recargar (la web no tiene canal para notificar en vivo).

## 2 · Validación: el guardián y la matriz

- **Guardián único:** `f_sesion_ok(p_token, p_rol_requerido)` — valida hash + no revocada + no expirada + rol, y anota `ultimo_uso_at`. Devuelve booleano estricto (`IS NOT TRUE` para fallar cerrado).
- `f_sesion_rol(p_token)` misma validación devolviendo el rol (la usan las 13 funciones helper-user: coordinadores, links, aliados, concursos, cortesia_ver, etc.).
- Las 3 funciones `LANGUAGE sql` de puerta (`f_puerta_lista`, `f_puerta_vendedor_por_cedula`, `f_puerta_vendedor_por_qr`) son `STABLE` y no pueden llamar al guardián (hace UPDATE): llevan el chequeo **inline por hash** con `exists (… token_hash = encode(extensions.digest(…)) and revocado_at is null and expira_at > now() and rol = 'puerta')`.
- **Matriz completa (54 funciones que tocan sesión):** 36 con guardián (10 admin lectura + 13 admin cortesías + 5 admin aliados + 8 puerta plpgsql) · 3 con hash inline · 13 helper-users vía `f_sesion_rol` · 2 núcleo (`f_sesion_ok`, `f_sesion_rol`) + `f_login` (crea). **Verificado: 0 funciones con chequeo viejo por token en claro** (`prosrc ilike '%token = p_token%'` → 0 filas).
- Fallo cerrado en todos los casos: `NULL` / `false` / vacío / `{"error":"ERR_SESION"}` / `{"ok":false,"error":"ERR_ROL"}` / `-1`, según el contrato original de cada función.

## 3 · Login y rate limit (`f_login`)

1. Resuelve la IP del llamador por cabeceras (`x-forwarded-for` → `x-real-ip` → `'desconocida'` en SQL Editor) y el dispositivo (user-agent, 200 chars).
2. **Rate limit por IP:** cuenta fallas de `login_intentos` en los últimos 15 min; con **5 o más, aborta con `BLOQUEADO: demasiados intentos fallidos desde esta IP. Espera 15 minutos.`** — antes de mirar el PIN (bloquea incluso con el PIN correcto). La ventana corre desde la 5ª falla y el intento bloqueado no deja registro.
3. Compara el PIN contra `config`: acepta bcrypt (`extensions.crypt`) — tras las rotaciones de P0-03 **ambos PINs son bcrypt y la aceptación de claro está muerta**.
4. Registra el intento en `login_intentos(ip, dispositivo, exito, creada_at)` — exitosos y fallidos.
5. Si es válido: genera el token, guarda solo el hash, crea la sesión de 8 h y devuelve `{token, rol}` una sola vez.

`login_intentos` nace cerrada (0 privilegios para anon/authenticated) y se barre en la limpieza de fin de evento.

## 4 · PINs

- Ambos PINs (admin y puerta) tienen **exactamente 6 dígitos** y viven como **bcrypt** (pgcrypto, `$2a$06$…`, 60 chars). Verificación segura: `(left(pin, 2) = '$2') as es_bcrypt` → `true, true` (29/10/2026).
- **Rotación** (`f_admin_rotar_pin`): exige el **PIN admin actual** como prueba de presencia (aunque el objetivo sea el de puerta), el nuevo debe casar `^[0-9]{6}$`, no puede repetir el actual, y queda `extensions.crypt(p_pin_nuevo, extensions.gen_salt('bf'))`. El PIN anterior muere de inmediato (el hash no acepta el claro).
- **Regla de verificación permanente: las claves jamás se muestran** — ni prefijos, ni largos, ni fragmentos; solo booleanos. (Incidente del 29/10 registrado: una consulta expuso 7 de 8 caracteres de un PIN en claro; quedó neutralizado por rotación.)

## 5 · Frontend (qué cambió para el usuario)

- **Salida real:** `borrarSesion()` (config.js) revoca en la base (`f_logout`) y limpia el navegador; no bloquea el cierre local si la red falla. Aplica a dashboard, admin y puerta.
- **Auto-bloqueo 5 minutos** en puerta y admin (`iniciarAutoBloqueo()`): sin clic/tecla/toque/scroll/ratón → salida real + vuelta al login. Candado local evita temporizadores duplicados.
- **Panel admin — tarjeta "Sesiones y seguridad":** ver sesiones activas (hash truncado a 12, rol, dispositivo, creada, expira, último uso, badge "Esta sesión"), **"Revocar todas las demás sesiones"** (excluye la propia, reporta cuántas mató) y **"Rotar PIN admin / Rotar PIN puerta"** (2 pasos en modal con campo oculto).
- **Login:** placeholder de 6 puntos; el bloqueo se muestra legible (`⛔ Bloqueado: demasiados intentos fallidos…`) sin filtrar el error crudo de PostgREST.
- **`admin.html` v2:** sistema de modales propio (regla v2.1) en TODA la página — los diálogos nativos encadenados pueden ser suprimidos por Chrome y ocultar resultados (incidente real de esta tarea).
- `dashboard.html` no cambió: su botón Salir hereda la salida real de config.js.

## 6 · Cierre de evento

`f_admin_limpiar_todo` (fin de evento) borra datos de trabajo, **`sesiones` (todas)** y **`login_intentos`** — requisito del usuario: cerrar el evento cierra todas las sesiones del sistema. Pendiente registrado: no reinicia `dia1_cerrado`/`dia2_cerrado` (pre-existente; decisión del usuario antes del próximo evento).

## 7 · Verificaciones ejecutadas (evidencia)

| # | Prueba | Resultado |
| --- | --- | --- |
| 1 | Rate limit: 5 fallas reales (bloque `DO` en SQL Editor, cubo `desconocida`) + 6º intento | `ERROR: P0001: BLOQUEADO…` en la línea del RAISE — criterio cumplido |
| 2 | Registro de intentos | Filas con la IP real del usuario + user-agent (exitosos y fallidos); el valor de la IP no se documenta (dato personal) |
| 3 | Sesiones nuevas | `token_hash` de 64, `device_label`, `expira_at = creada_at + 8 h`, `ultimo_uso_at` actualizándose tras Fase D |
| 4 | Reescritura por lotes | Conteos 10 → 23 → 28 → 36 con guardián; 0 residuos de chequeo viejo |
| 5 | Humo de app tras cada fase | Dashboard, estadísticas, cortesías, aliados, puerta (marcado en vivo) — "APP OK" |
| 6 | RPCs nuevas con token falso | `4 funciones / anon=true×4 / logout=false / revocar=-1 / rotar=null / sesiones=0` |
| 7 | Rotaciones de PIN | Booleanos `true,false` → `true,true`; re-login con nuevos OK; viejos rechazados |
| 8 | Salida real + revocación masiva | `sesiones_activas = 1`, `sesiones_revocadas = 10` tras la noche de pruebas; la puerta muere al recargar |

## 8 · Qué NO cubre esta implementación (explícito)

- **Supabase Auth + MFA para admin:** descartado en esta fase (el modelo PIN+bcrypt cumplió los criterios; retomable como P2).
- **Header `Retry-After`:** PostgREST no lo expone fácil; el mensaje BLOQUEADO es el contrato.
- **Alertas tras varios bloqueos:** sin canal (email/telegram no existe en el proyecto).
- **Prueba viva de expiración y del auto-bloqueo con temporizador:** requieren esperar el tiempo real; quedan para P1-04 (staging). El guardián ya filtra por `expira_at > now()` y el dato de 8 h está verificado.

## 9 · Consultas útiles (seguras — nunca muestran claves ni tokens)

```sql
-- ¿Los PINs viven solo como bcrypt?
select (left(pin_admin, 2) = '$2') as pin_admin_es_bcrypt,
       (left(pin_puerta, 2) = '$2') as pin_puerta_es_bcrypt
from public.config where id = 1;

-- Sesiones activas vs revocadas
select count(*) filter (where revocado_at is null and expira_at > now()) as activas,
       count(*) filter (where revocado_at is not null) as revocadas
from public.sesiones;

-- Funciones con el guardián (esperado: 36) y residuos del chequeo viejo (esperado: 0)
select count(*) from pg_proc
where pronamespace = 'public'::regnamespace and prosrc ilike '%f_sesion_ok%';
select proname from pg_proc
where pronamespace = 'public'::regnamespace and prosrc ilike '%token = p_token%';
```

## 10 · Reversión

El mundo pre-P0-03 (54 funciones con token en claro, sin rate limit) está congelado en `docs/Supabase Snippet Untitled query.csv` (commit `fe6f3ac`). Revertir implica restaurar esas definiciones, re-agregar la columna `token` y la PK original — **no recomendado**: la reversión solo tiene sentido como último recurso documentado.
