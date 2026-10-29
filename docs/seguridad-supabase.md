# seguridad-supabase.md — Auditoría de backend (P0-02)

> **Versión 3 · 29/10/2026 (Sesión 14)** — fases 1, 2, 2b y 3 **EJECUTADAS y VERIFICADAS**. Solo queda la fase 4 (autorización interna). Ver §5, §6, §7 y §9.
> **Qué es:** la evidencia del estado REAL de la base de Supabase (proyecto nitrotalentos) al 29/10/2026, obtenida con las consultas de diagnóstico de [`tareas/00-revision-seguridad.md`](../tareas/00-revision-seguridad.md) §2 más las Consultas D, E, F, G y H creadas en esta sesión. Las ejecutó el **usuario** en el SQL Editor y pegó los resultados íntegros en la sesión; este documento los consolida y los interpreta.
> Las consultas de auditoría son **solo lectura**. Los cambios de permisos (fase 2) y los DROP (fase 3) fueron aprobados y ejecutados por el usuario.
> Regla permanente: antes de reescribir o borrar cualquier RPC, leer su definición con `SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = '<nombre>';`

---

## 1 · Consulta 1 — RLS por tabla: **16/16 ACTIVO ✓** (29/10)

```sql
select relname, relrowsecurity
from pg_class
where relkind = 'r'
  and relnamespace = 'public'::regnamespace;
```

| Tabla | relrowsecurity |
| --- | --- |
| coordinadores | true |
| stands | true |
| sesiones | true |
| listas | true |
| vendedores | true |
| personas | true |
| talentos | true |
| config | true |
| eventos | true |
| cortesia_listas | true |
| cortesia_personas | true |
| aliados | true |
| aliado_asignaciones | true |
| aliado_ampliaciones | true |
| aliado_concursos | true |
| cortesias | true |

Las 16 tablas coinciden una a una con ARQUITECTURA.md §3. Además, existe la red de seguridad `ensure_rls` (ver §8): cualquier tabla nueva en `public` queda con RLS automáticamente.

## 2 · Consulta 2 — Grants de tablas

```sql
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated');
```

**ANTES (29/10 ~09:52):** 96 filas = 16 tablas × 2 roles (anon, authenticated) × 3 privilegios (TRUNCATE, REFERENCES, TRIGGER). Sin SELECT/INSERT/UPDATE/DELETE: el DML directo ya estaba revocado.

**DESPUÉS de la fase 2 (29/10 ~11:21):** **0 filas** ("Success. No rows returned"). Las 16 tablas quedaron **totalmente cerradas** para `anon` y `authenticated` (H3 cerrado).

## 3 · Consulta 3 — Funciones: clasificación por ACL (29/10 ~09:52)

```sql
select proname, prosecdef, proacl
from pg_proc
where proname like 'f_%';
```

> Nota de método: el `_` en `LIKE 'f_%'` es comodín, por lo que la consulta arrastró también funciones internas de PostgreSQL. Se ignoran. En adelante se usa la **Consulta D**, que filtra bien por esquema.

**79 objetos del proyecto** (78 funciones + la sobrecarga de `f_coord_crear_stand`):

- **A · Solo postgres (internas, cerradas ✓):** `f_sesion_rol`, `f_codigo`.
- **B · anon EXECUTE (patrón correcto para las RPC que llama la app):** 68 funciones, todas SECURITY DEFINER salvo `f_aliado_crear_premio` (H8, DROP en fase 3).
- **C · proacl NULL = PUBLIC ejecutaba (corregido en fase 2):** `f_admin_editar_cortesia_datos`, `f_coord_editar_stand`, `f_coord_mis_links`, `f_puerta_cerrar_dia_y_activar_siguiente`, y la 2ª sobrecarga de `f_coord_crear_stand`.

## 4 · Consulta D — Firmas exactas y ACL de todo el esquema public (29/10 ~11:15)

**80 filas**: 79 objetos `f_*` + `rls_auto_enable()`. Resultados clave:

- **Las 5 funciones con proacl NULL, con su firma exacta:** `f_admin_editar_cortesia_datos(uuid, text, text, text, text, text)` · `f_coord_crear_stand(text, text, text, integer, text, text)` (2ª sobrecarga, PUBLIC) · `f_coord_editar_stand(text, text, text, text, integer, text)` · `f_coord_mis_links(text)` · `f_puerta_cerrar_dia_y_activar_siguiente(uuid)`.
- **La sobrecarga que usa la app** es la de 5 argumentos — coincide con la 1ª firma documentada en ARQUITECTURA.md §4.
- **H9 resuelto:** `rls_auto_enable()` es **solo postgres**. Ver §8: se conserva (red de seguridad activa).
- `f_aliado_crear_premio` confirmada con `prosecdef = false` (la única NO-SECURITY-DEFINER) y anon EXECUTE.
- `f_puerta_activar_dia2(p_token uuid)` confirmada con anon EXECUTE.
- El resto idéntico a la Consulta 3: sin drift entre capturas.

## 5 · Consultas E, F, G — search_path, definiciones y event triggers (29/10 ~13:42-14:00)

**Consulta E — search_path:** mi filtro tenía un artefacto (comparaba sin el espacio de `search_path=public, pg_temp`), por lo que devolvió todas las funciones. Leyendo el resultado real: **las ~79 funciones SECURITY DEFINER — incluidas las internas — tienen `search_path` protegido** (ninguna con proconfig vacío). `rls_auto_enable` usa `search_path=pg_catalog` (más estricta, correcto para un event trigger). **H10 CERRADO: no había nada que blindar.**

**Consulta F — definiciones completas** (regla: `pg_get_functiondef` antes de tocar cualquier RPC). Las 5 filas:

1. `f_aliado_crear_premio` — **ya era un coto**: solo `SELECT jsonb_build_object('error','ERR_DEPRECADO_USAR_CONCURSOS')`; no toca tablas. → DROP.
2. `f_coord_crear_stand` (5 arg) — **LA VIVA**: valida coordinador tipo `stands` + activo, edición abierta, datos, correo duplicado; inserta stand con `f_codigo('STD-', 8)`. → SE QUEDA.
3. `f_coord_crear_stand` (6 arg, con `p_nombre`) — versión más nueva que nadie llama. → DROP (elimina además la ambigüedad PGRST202 de ARQUITECTURA §4).
4. `f_puerta_activar_dia2(p_token uuid)` — variante legacy: valida rol `puerta`, exige `dia_activo=1` y sin listas abiertas, activa día 2. El flujo real usa `f_puerta_cerrar_dia_y_activar_siguiente`. → DROP (definición guardada para reversión).
5. `rls_auto_enable()` — handler de event trigger; `RETURNS event_trigger`. → CONSERVAR (ver Consulta G).

**Consulta G — event triggers:** 7 registrados. 6 de la plataforma Supabase (`issue_graphql_placeholder`, `pgrst_ddl_watch`, `pgrst_drop_watch`, `issue_pg_cron_access`, `issue_pg_net_access`, `issue_pg_graphql_access` — no se tocan). El del proyecto: **`ensure_rls` → `rls_auto_enable()`, evento `ddl_command_end`, estado 'O' (activo)** → la red de seguridad está viva.

## 6 · Fase 2 EJECUTADA y VERIFICADA (29/10/2026 ~11:15-11:21, UTC-4)

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

## 7 · Fase 3 EJECUTADA y VERIFICADA (29/10/2026 ~14:05-14:10, UTC-4)

SQL de DROP aplicado por el usuario con su aprobación explícita:

```sql
DROP FUNCTION public.f_aliado_crear_premio(p_codigo_link text, p_nombre text, p_apellido text, p_cedula text, p_concurso text, p_cupones_total integer, p_dia1 boolean, p_dia2 boolean);
DROP FUNCTION public.f_coord_crear_stand(p_codigo_coord text, p_nombre text, p_numero text, p_cupo integer, p_tipo text, p_correo text);
DROP FUNCTION public.f_puerta_activar_dia2(p_token uuid);
```

**Evidencia:** Verificación 3 = **exactamente 2 filas** (`f_coord_crear_stand(...5 arg...)` y `rls_auto_enable()`) ✓ · Smoke test: **"APP OK"** ✓. La base quedó con **77 objetos**: 76 funciones + `rls_auto_enable()`.

## 8 · `rls_auto_enable` y el event trigger `ensure_rls` — CONSERVADOS

`rls_auto_enable()` es el handler del event trigger **`ensure_rls`** (`ddl_command_end`, activo): activa RLS automáticamente en toda tabla nueva del esquema `public`. Es una **red de seguridad** (protege el futuro), es solo-postgres y usa `search_path=pg_catalog`. Decisión: **no se toca**. Las 6 event triggers restantes son de la plataforma Supabase y no se tocan.

## 9 · Hallazgos (estado final al 29/10/2026)

| # | Hallazgo | Estado |
| --- | --- | --- |
| H1 | RLS activo en las 16/16 tablas | ✓ Bien |
| H2 | Sin DML para `anon`/`authenticated` en tablas | ✓ Bien |
| H3 | `TRUNCATE`/`REFERENCES`/`TRIGGER` sobre-grantados | ✓ **CERRADO en fase 2** (0 filas) |
| H4 | 5 objetos con `proacl NULL` = PUBLIC ejecutaba | ✓ **CERRADO en fase 2** |
| H5 | Internas `f_sesion_rol` y `f_codigo` solo `postgres` | ✓ Bien |
| H6 | Sobrecarga de `f_coord_crear_stand` (2 firmas, ambigüedad PGRST202) | ✓ **CERRADO en fase 3** (DROP de la de 6 arg; queda la viva de 5) |
| H7 | `f_puerta_activar_dia2` legacy expuesta a anon | ✓ **CERRADO en fase 3** (DROP; definición en §10) |
| H8 | `f_aliado_crear_premio` deprecada, INVOKER, anon | ✓ **CERRADO en fase 3** (DROP; ya era un coto) |
| H9 | `rls_auto_enable` | ✓ CONSERVADA a propósito: red de seguridad activa (`ensure_rls`), solo postgres |
| H10 | `search_path` de las SECURITY DEFINER | ✓ **CERRADO en fase 2b**: todas protegidas |

## 10 · Reversión de la fase 3 (definiciones guardadas)

Si algún día hiciera recrear lo eliminado, los cuerpos completos quedaron capturados con la Consulta F (29/10, en la evidencia de la Sesión 14 y en el historial del chat). Resumen:

- `f_aliado_crear_premio(p_codigo_link text, p_nombre text, p_apellido text, p_cedula text, p_concurso text, p_cupones_total integer, p_dia1 boolean, p_dia2 boolean)` returns jsonb, LANGUAGE sql → `SELECT jsonb_build_object('error','ERR_DEPRECADO_USAR_CONCURSOS');`
- `f_coord_crear_stand(p_codigo_coord text, p_nombre text, p_numero text, p_cupo integer, p_tipo text, p_correo text)` returns text, plpgsql, SECURITY DEFINER, con validación de coordinador/edición/correo e inserción con `gen_random_uuid()` y manejo de `unique_violation`.
- `f_puerta_activar_dia2(p_token uuid)` returns boolean, plpgsql, SECURITY DEFINER: rol `puerta` + `dia_activo=1` + sin listas abiertas → `UPDATE config SET dia_activo=2`.

## 11 · Pendiente de P0-02 — fase 4 (autorización interna)

1. **Consulta H (matriz de validación):** para cada `f_*`, ¿lleva `p_token`?, ¿valida contra `f_sesion_rol`?, ¿toca `sesiones`? — detecta funciones con token pero sin validación.
2. Definiciones dirigidas (`pg_get_functiondef`) de las funciones que la matriz marque como dudosas; verificar que `f_admin_*` exija rol admin, `f_coord_*` coordinador activo, `f_puerta_*` rol puerta.
3. Verificar cómo valida el PIN `f_login` y si los tokens se guardan en claro o con hash (conecta con P0-03).
4. Documentar la matriz función → rol → token (quedará en ARQUITECTURA.md al cierre) y hacer pruebas de rechazo (token de puerta contra una `f_admin_*`, tokens inventados).

## 12 · Registro

- Consultas 1-3: 29/10 ~09:52 (UTC-4) · Consulta D: ~11:15 · Fase 2 (SQL de cierre): ~11:15-11:21 · Verificaciones 1-2 + smoke: ~11:21 · Consulta E: ~13:42 · Consultas F/G: ~13:50-14:00 · Fase 3 (DROPs): ~14:05 · Verificación 3 + smoke "APP OK": ~14:10.
- Consulta H (matriz de autorización): pendiente de ejecución.
- Este documento lo redacta el asistente; el usuario ejecuta todo el SQL y sube los archivos.
- Actualización pendiente al cierre de la sesión: ARQUITECTURA.md §8 (resultados vigentes + Consultas D/E/F/G/H + red `ensure_rls`) y la tarea `tareas/P0-02-rls-autorizacion.md`.
