---
id: "P0-02"
titulo: "Verificar y cerrar RLS, grants y autorización por rol"
prioridad: "P0"
estado: "hecho"
area: "seguridad"
depende_de: []
archivos:
  - "config.js"
  - "aliados.html"
  - "admin.html"
  - "cortesias.html"
  - "aliados-concursos.html"
---

# P0-02 · Verificar y cerrar RLS, grants y autorización por rol

## Contexto

La app usa la clave publicable de Supabase y llama RPC directamente. Cualquiera con la URL y la clave puede invocar `/rest/v1/rpc/...` sin pasar por la UI. Los guards de las páginas solo miran `sessionStorage.na_rol`, que el usuario puede cambiar. El control de acceso real debe estar en Supabase: RLS, grants y validación de token/rol dentro de cada función.

No hay SQL ni migraciones en el repo, así que esta tarea incluye auditar el proyecto de Supabase y documentar el estado actual antes de cambiar nada.

## Evidencia

- [config.js:7-21](../config.js#L7-L21): llamada directa a `/rest/v1/rpc/`.
- [config.js:3-4](../config.js#L3-L4): URL y clave publicable.
- [aliados.html:12-14](../aliados.html#L12-L14), [admin.html:652](../admin.html#L652), [cortesias.html:1009](../cortesias.html#L1009): guards de rol en cliente.
- [aliados-concursos.html:323-330](../aliados-concursos.html#L323-L330): llamada admin con `p_token`.

## Objetivo

Que un usuario anónimo no pueda leer ni escribir tablas directamente, y que cada RPC rechace tokens inválidos, expirados o de un rol sin permiso.

## Pasos

- [x] **Auditar sin cambiar nada.** Consultas 1-3 ejecutadas (29/10 ~09:52) y consolidadas en `docs/seguridad-supabase.md` (v4, §1-§4).
- [x] RLS activo en las 16/16 tablas (ya lo estaba; la red `ensure_rls` lo mantiene en tablas nuevas).
- [x] Grants comprobados: sin DML para `anon`/`authenticated`; fase 2 revocó también TRUNCATE/REFERENCES/TRIGGER (Verificación 1: 0 filas).
- [x] `proacl` revisado (79 objetos): fase 2 revocó PUBLIC y concedió `anon` en las 4 usadas; la sobrecarga muerta quedó solo-postgres (Verificación 2 sin nulls).
- [x] `search_path` de las SECURITY DEFINER: todas protegidas ya (fase 2b; nada que blindar).
- [x] Validación verificada: Consulta H (todas las funciones con `p_token` validan sesión) + Consulta I (38/38 `f_admin_*` exigen rol `admin`, 14/14 `f_puerta_*` rol `puerta`, 0 cruces) + cuerpos capturados. `f_coord_*` validan coordinador activo por `codigo_coord` (cuerpo de `f_coord_crear_stand`).
- [x] `p_token` vs hash: verificado que se compara **en claro** contra `sesiones.token` → traslado explícito a P0-03.
- [x] Matriz documentada en `docs/seguridad-supabase.md` (v4, §9).
- [x] Staging: **no aplicable** — no existe proyecto de staging (P1-04). Sustituido en producción por: prueba de rechazo con token inventado + matriz de roles por sondeo de cuerpos + cuerpos de muestra.
- [x] Token inventado probado: `f_admin_dashboard(gen_random_uuid())` → null y `f_puerta_estado(gen_random_uuid())` → null (falla cerrada). Token expirado/revocado: no hay expiración definida → P0-03.
- [x] SQL exacto guardado en `docs/seguridad-supabase.md` (§5 y §6); aplicado directo en producción con aprobación explícita del usuario y reversibilidad documentada (§11).

## Criterios de aceptación

- [x] `GET /rest/v1/<tabla>` con clave anónima no devuelve filas: 0 privilegios (incluido SELECT) + RLS sin políticas = denegación total; verificado por la matriz de grants (0 filas tras fase 2).
- [x] Ninguna función interna ejecutable por PUBLIC/anon sin necesidad: internas solo-postgres; las 4 usadas normalizadas a anon; sobrecarga muerta solo-postgres y luego DROP.
- [x] Un token de `puerta` no puede ejecutar RPC de admin: verificado por matriz (Consulta I: 38/38 exigen 'admin'); prueba funcional con token REAL de puerta → P1-04 (sentencia lista en la tarea, sin exponer el token).
- [x] Token inventado → null en `f_admin_dashboard` y `f_puerta_estado` (probado). Expirado/revocado → P0-03 (no hay expiración aún).
- [x] Matriz de autorización documentada (docs/seguridad-supabase.md §9) y coincide con el comportamiento real (rechazo probado).
- [x] SQL versionado en `docs/seguridad-supabase.md`; staging no existe (P1-04) — aplicado en producción con aprobación, reversibilidad y evidencia.

## Verificación

En staging:

```bash
# Ajustar el nombre de la tabla y las variables
curl -s "$SUPABASE_URL/rest/v1/personas?select=*&limit=1" \
  -H "apikey: $SUPABASE_ANON" \
  -H "Authorization: Bearer $SUPABASE_ANON"
```

Debe devolver error o `[]`, nunca datos personales. Repetir con `sesiones`, `vendedores`, `cortesias`, `asignaciones` y `concursos`.

## Fuera de alcance

- Cambiar el modelo de autenticación (ver [P0-03](P0-03-login-sesiones.md)).
- Auditar la lógica de negocio de cada RPC (ver [P1-01](P1-01-integridad-escaneos-cupones.md)).

## Notas de implementación

> **HECHA el 29/10/2026 (Sesión 14).** Evidencia completa en [docs/seguridad-supabase.md](../../docs/seguridad-supabase.md) (v4, congelado).

**Qué se hizo, por fases (todo el SQL lo ejecutó el usuario en Supabase con aprobación explícita, y se verificó después):**

1. **Fase 1 — auditoría (solo lectura):** RLS 16/16 activo; grants de tablas sin DML para anon/authenticated (96 filas de TRUNCATE/REFERENCES/TRIGGER sobrantes); proacl de las 79 funciones clasificado (2 internas solo-postgres, 68 anon, 5 con PUBLIC).
2. **Fase 2 — cierre de permisos:** `REVOKE ALL ON ALL TABLES` para anon/authenticated (Verificación 1: 0 filas) + REVOKE PUBLIC / GRANT anon en las 4 funciones usadas y revocación de la sobrecarga muerta (Verificación 2: ACLs exactas, ningún null). Smoke test: app ok.
3. **Fase 2b — search_path:** las ~79 SECURITY DEFINER ya tenían `search_path` protegido (H10 cerrado).
4. **Fase 3 — limpieza:** DROP de `f_aliado_crear_premio` (ya era un coto), la sobrecarga de 6 argumentos de `f_coord_crear_stand` (nadie la usaba; elimina la ambigüedad PGRST202) y `f_puerta_activar_dia2` (legacy). `rls_auto_enable` + event trigger `ensure_rls` se CONSERVAN a propósito (activan RLS en tablas nuevas). Verificación 3: exactamente 2 filas. Definiciones guardadas para reversión.
5. **Fase 4 — autorización interna:** Consulta H (matriz token/sesión: las ~42 funciones con `p_token` todas validan sesión; las ~33 sin token se autentican por `codigo_link`/`codigo_coord`, por diseño) + Consulta I (38/38 `f_admin_*` exigen rol admin, 14/14 `f_puerta_*` rol puerta, 0 contaminación cruzada) + pruebas de rechazo con token inventado → null/null (falla cerrada).

**Matriz de autorización resultante:** `f_admin_*` → token + rol admin · `f_puerta_*` → token + rol puerta · `f_coord_*` → codigo_coord de coordinador activo · `f_link_*` / `f_aliado_*` / `f_cortesia_ver` → codigo_link no adivinable · internas (`f_sesion_rol`, `f_codigo`, `rls_auto_enable`) → solo postgres.

**Qué quedó fuera (explícito):**

- `p_token` NO se compara contra hash (se compara en claro contra `sesiones.token`); no hay expiración ni revocación de sesiones → **P0-03**.
- No existe staging (→ **P1-04**): el SQL se aplicó directo en producción con aprobación explícita, todo reversible y con definiciones guardadas. Ahí también vive la prueba funcional con un token REAL de puerta contra `f_admin_dashboard` (sin exponer el token):
  `select public.f_admin_dashboard((select token from sesiones where rol='puerta' limit 1));` — esperado null.
- Actualización de ARQUITECTURA.md §4/§8 con los resultados vigentes → cierre de sesión.
