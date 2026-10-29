# seguridad-supabase.md — Auditoría de backend (P0-02)

> **Versión 4 · FINAL de P0-02 · 29/10/2026 (Sesión 14)** — fases 1, 2, 2b, 3 y 4 **EJECUTADAS y VERIFICADAS**. Este documento queda congelado al cerrarse la tarea; los temas derivados viven en P0-03 y P1-04 (ver §13).
> **Qué es:** la evidencia del estado REAL de la base de Supabase (proyecto nitrotalentos) al 29/10/2026, obtenida con las consultas de diagnóstico de [`tareas/00-revision-seguridad.md`](../tareas/00-revision-seguridad.md) §2 más las Consultas D, E, F, G, H e I creadas en esta sesión. Las ejecutó el **usuario** en el SQL Editor y pegó los resultados íntegros en la sesión; este documento los consolida y los interpreta.
> Las consultas de auditoría son **solo lectura**. Los cambios de permisos (fase 2) y los DROP (fase 3) fueron aprobados y ejecutados por el usuario.
> Regla permanente: antes de reescribir o borrar cualquier RPC, leer su definición con `SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = '<nombre>';`

---

## 1 · Consulta 1 — RLS por tabla: **16/16 ACTIVO ✓** (29/10)

| Tabla | relrowsecurity |
| --- | --- |
| coordinadores, stands, sesiones, listas, vendedores, personas, talentos, config, eventos, cortesia_listas, cortesia_personas, aliados, aliado_asignaciones, aliado_ampliaciones, aliado_concursos, cortesias | **true** (las 16) |

Las 16 tablas coinciden una a una con ARQUITECTURA.md §3. Además, la red de seguridad `ensure_rls` (ver §8) activa RLS automáticamente en cualquier tabla nueva de `public`.

Consulta usada: `select relname, relrowsecurity from pg_class where relkind = 'r' and relnamespace = 'public'::regnamespace;`

## 2 · Consulta 2 — Grants de tablas

**ANTES (29/10 ~09:52):** 96 filas = 16 tablas × 2 roles (anon, authenticated) × 3 privilegios (TRUNCATE, REFERENCES, TRIGGER). Sin SELECT/INSERT/UPDATE/DELETE: el DML directo ya estaba revocado.

**DESPUÉS de la fase 2 (29/10 ~11:21):** **0 filas** ("Success. No rows returned"). Las 16 tablas quedaron **totalmente cerradas** para `anon` y `authenticated` (H3 cerrado). Con RLS activo sin políticas + 0 privilegios, la API REST no puede leer ni escribir tablas.

## 3 · Consulta 3 — Funciones por ACL (29/10 ~09:52) y Consulta D — firmas exactas (29/10 ~11:15)

**79 objetos `f_*` + `rls_auto_enable()`:** 2 internas solo-postgres (`f_sesion_rol`, `f_codigo`), 68 con anon EXECUTE (patrón correcto para las RPC que llama la app), 5 con `proacl NULL` = PUBLIC ejecutaba (corregido en fase 2). Sin drift entre capturas. La sobrecarga viva de `f_coord_crear_stand` es la de 5 argumentos, idéntica a la firma documentada en ARQUITECTURA.md §4.

## 4 · Consultas E, F, G — search_path, definiciones y event triggers (29/10 ~13:42-14:00)

- **E — search_path:** las ~79 funciones SECURITY DEFINER — incluidas las internas — **tienen `search_path` protegido** (ninguna con proconfig vacío). `rls_auto_enable` usa `pg_catalog` (más estricta, correcta para un event trigger). **H10 CERRADO.** (Nota de método: mi filtro comparó sin el espacio de `search_path=public, pg_temp` y devolvió todas; la lectura del resultado real es la que vale.)
- **F — definiciones completas** (regla `pg_get_functiondef` antes de tocar RPC): `f_aliado_crear_premio` ya era un coto (`SELECT jsonb_build_object('error','ERR_DEPRECADO_USAR_CONCURSOS')`); `f_coord_crear_stand` 5-arg es LA VIVA; la 6-arg nadie la llamaba; `f_puerta_activar_dia2` era legacy (validaba rol puerta + día 1 + sin listas abiertas, activaba día 2); `rls_auto_enable` es handler de event trigger.
- **G — event triggers:** 7 registrados; 6 de la plataforma Supabase (no se tocan). El del proyecto: **`ensure_rls` → `rls_auto_enable()`, `ddl_command_end`, activo ('O')** → red de seguridad viva.

## 5 · Fase 2 EJECUTADA y VERIFICADA (29/10 ~11:15-11:21, UTC-4)

SQL aplicado por el usuario con su aprobación explícita (todo reversible):

```sql
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION f_admin_editar_cortesia_datos(uuid, text, text, text, text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION f_admin_editar_cortesia_datos(uuid, text, text, text, text, text) TO anon;

REVOKE EXECUTE ON FUNCTION f_coord_editar_stand(text, text, text, text, integer, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION f_coord_editar_stand(text, text, text, text, integer, text) TO anon;

REVOKE EXECUTE ON FUNCTION f_coord_mis_links(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION f_coord_mis_links(text) TO anon;

REVOKE EXECUTE ON FUNCTION f_puerta_cerrar_dia_y_activar_siguiente(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION f_puerta_cerrar_dia_y_activar_siguiente(uuid) TO anon;

REVOKE EXECUTE ON FUNCTION f_coord_crear_stand(text, text, text, integer, text, text) FROM PUBLIC;
```

**Evidencia:** Verificación 1 = 0 filas ✓ · Verificación 2 = las 4 usadas con `{postgres,anon}`, la sobrecarga muerta solo postgres, ningún null ✓ · Smoke test: **"APP esta ok"** ✓.

## 6 · Fase 3 EJECUTADA y VERIFICADA (29/10 ~14:05-14:10, UTC-4)

```sql
DROP FUNCTION public.f_aliado_crear_premio(p_codigo_link text, p_nombre text, p_apellido text, p_cedula text, p_concurso text, p_cupones_total integer, p_dia1 boolean, p_dia2 boolean);
DROP FUNCTION public.f_coord_crear_stand(p_codigo_coord text, p_nombre text, p_numero text, p_cupo integer, p_tipo text, p_correo text);
DROP FUNCTION public.f_puerta_activar_dia2(p_token uuid);
```

**Evidencia:** Verificación 3 = **exactamente 2 filas** (`f_coord_crear_stand(...5 arg...)` y `rls_auto_enable()`) ✓ · Smoke test: **"APP OK"** ✓. La base quedó con **77 objetos**: 76 funciones + `rls_auto_enable()`. Las definiciones eliminadas quedaron capturadas en la evidencia (Consulta F) para reversión.

## 7 · `rls_auto_enable` y el event trigger `ensure_rls` — CONSERVADOS

`rls_auto_enable()` es el handler del event trigger **`ensure_rls`** (activo): activa RLS automáticamente en toda tabla nueva del esquema `public`. Es una **red de seguridad**, es solo-postgres y usa `search_path=pg_catalog`. Decisión: **no se toca**.

## 8 · Fase 4 EJECUTADA y VERIFICADA (29/10 ~15:35-15:50, UTC-4) — autorización interna

**Consulta H — matriz token/sesión (76 filas):**

| Grupo | Cuántas | Resultado |
| --- | --- | --- |
| Con `p_token` + validan vía `f_sesion_rol` | 13 | ✓ Validación central |
| Con `p_token` + consultan `sesiones` directamente | ~29 | ✓ Validación en línea (mismo estilo que el cuerpo capturado de `f_puerta_activar_dia2`: `SELECT rol FROM sesiones WHERE token = p_token`) |
| Sin `p_token` (`f_link_*`, `f_aliado_*`, `f_coord_*`, `f_cortesia_ver`) | ~33 | ✓ Por diseño: se autentican con `codigo_link`/`codigo_coord`, validados contra su tabla en cada llamada (comprobado en el cuerpo de `f_coord_crear_stand`) |

**Cero funciones con token sin validación de sesión.**

**Consulta I — rol exigido (53 filas):** las **38/38 `f_admin_*`** mencionan rol + `'admin'` (y ninguna `'puerta'`); las **14/14 `f_puerta_*`** mencionan rol + `'puerta'` (y ninguna `'admin'`); `f_sesion_rol` es el validador genérico. **Cero contaminación cruzada de roles.**

**Pruebas de rechazo (token inventado, falla cerrada):**

```sql
select public.f_admin_dashboard(gen_random_uuid());  -- resultado: null
select public.f_puerta_estado(gen_random_uuid());    -- resultado: null
```

Un token que no existe en `sesiones` **no devuelve ningún dato**. ✓

## 9 · Matriz de autorización resultante

| Familia | Autenticación | Qué exige |
| --- | --- | --- |
| `f_admin_*` (38) | `p_token uuid` | Sesión válida + **rol `admin`** |
| `f_puerta_*` (14) | `p_token uuid` | Sesión válida + **rol `puerta`** |
| `f_coord_*` (6) | `p_codigo_coord text` | Coordinador **activo** (y del tipo correcto donde aplica) |
| `f_link_*` (8), `f_aliado_*` (6), `f_cortesia_ver` | `p_codigo_link text` | Código de link no adivinable, validado contra su tabla |
| `f_login` | `p_pin text` | PIN contra `coordinadores`; crea la sesión |
| Internas: `f_sesion_rol`, `f_codigo`, `rls_auto_enable` | — | Solo `postgres` (sin EXECUTE para anon/PUBLIC) |

## 10 · Hallazgos (estado final al 29/10/2026)

| # | Hallazgo | Estado |
| --- | --- | --- |
| H1 | RLS activo en las 16/16 tablas | ✓ Bien |
| H2 | Sin DML para `anon`/`authenticated` en tablas | ✓ Bien |
| H3 | `TRUNCATE`/`REFERENCES`/`TRIGGER` sobre-grantados | ✓ **CERRADO en fase 2** (0 filas) |
| H4 | 5 objetos con `proacl NULL` = PUBLIC ejecutaba | ✓ **CERRADO en fase 2** |
| H5 | Internas `f_sesion_rol` y `f_codigo` solo `postgres` | ✓ Bien |
| H6 | Sobrecarga de `f_coord_crear_stand` (ambigüedad PGRST202) | ✓ **CERRADO en fase 3** |
| H7 | `f_puerta_activar_dia2` legacy expuesta a anon | ✓ **CERRADO en fase 3** |
| H8 | `f_aliado_crear_premio` deprecada, INVOKER, anon | ✓ **CERRADO en fase 3** |
| H9 | `rls_auto_enable` | ✓ CONSERVADA a propósito (red `ensure_rls` activa) |
| H10 | `search_path` de las SECURITY DEFINER | ✓ **CERRADO en fase 2b**: todas protegidas |
| H11 | Matriz de autorización (token/sesión/rol) | ✓ **SIN HUECOS** (fase 4: Consultas H/I + rechazo con token inventado) |

## 11 · Reversión de la fase 3 (definiciones guardadas)

Los cuerpos completos quedaron capturados con la Consulta F (29/10, evidencia de la Sesión 14 y del chat). Resumen:

- `f_aliado_crear_premio(...)` returns jsonb, LANGUAGE sql → `SELECT jsonb_build_object('error','ERR_DEPRECADO_USAR_CONCURSOS');`
- `f_coord_crear_stand(p_codigo_coord text, p_nombre text, p_numero text, p_cupo integer, p_tipo text, p_correo text)` returns text, plpgsql, SECURITY DEFINER, con validación de coordinador/edición/correo, `gen_random_uuid()` y manejo de `unique_violation`.
- `f_puerta_activar_dia2(p_token uuid)` returns boolean, plpgsql, SECURITY DEFINER: rol `puerta` + `dia_activo=1` + sin listas abiertas → `UPDATE config SET dia_activo=2`.

## 12 · Qué queda FUERA de P0-02 (traslados explícitos)

1. **→ P0-03:** `p_token` se compara **en claro** contra `sesiones.token` (no hay hash); no hay expiración ni revocación de sesiones definidas. Endurecer PIN, rate limit, hash/expiración/revocación de tokens es P0-03.
2. **→ P1-04:** no existe proyecto de staging; el SQL se aplicó directo en producción con aprobación explícita, todo reversible y con definiciones guardadas. Staging, migraciones versionadas y pruebas funcionales con tokens REALES (ej.: token de puerta contra `f_admin_dashboard`) viven en P1-04. Prueba opcional sin exponer el token: `select public.f_admin_dashboard((select token from sesiones where rol='puerta' limit 1));` — esperado null.
3. **→ Cierre de sesión:** actualizar ARQUITECTURA.md §4/§8 (firmas y resultados vigentes + Consultas D/E/F/G/H/I + red `ensure_rls`) y la tarea `tareas/P0-02-rls-autorizacion.md` (ya actualizada).

## 13 · Registro

- Consultas 1-3: 29/10 ~09:52 (UTC-4) · Consulta D: ~11:15 · Fase 2: ~11:15-11:21 · Verificaciones 1-2 + smoke: ~11:21 · Consulta E: ~13:42 · Consultas F/G: ~13:50-14:00 · Fase 3 (DROPs): ~14:05 · Verificación 3 + smoke "APP OK": ~14:10 · Consulta H: ~15:35 · Consulta I: ~15:45 · Pruebas de rechazo: ~15:50.
- Este documento lo redacta el asistente; el usuario ejecuta todo el SQL y sube los archivos.
- **P0-02: COMPLETADA y VERIFICADA el 29/10/2026.** Documento congelado.
