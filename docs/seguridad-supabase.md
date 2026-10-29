# seguridad-supabase.md — Auditoría de backend (P0-02)

> **Versión 2 · 29/10/2026 (Sesión 14)** — fase 2 (cierre de permisos) **EJECUTADA y VERIFICADA**. Ver §6.
> **Qué es:** la evidencia del estado REAL de la base de Supabase (proyecto nitrotalentos) al 29/10/2026, obtenida con las consultas de diagnóstico de [`tareas/00-revision-seguridad.md`](../tareas/00-revision-seguridad.md) §2 más las Consultas D y E creadas en esta sesión. Las ejecutó el **usuario** en el SQL Editor y pegó los resultados íntegros en la sesión; este documento los consolida y los interpreta.
> Las consultas de auditoría son **solo lectura**. Los cambios de permisos (fase 2) fueron aprobados y ejecutados por el usuario.
> Regla permanente: antes de reescribir cualquier RPC, leer su definición con `SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = '<nombre>';`

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

Las 16 tablas coinciden una a una con ARQUITECTURA.md §3.

## 2 · Consulta 2 — Grants de tablas

```sql
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated');
```

**ANTES (captura del 29/10 ~09:52):** 96 filas = 16 tablas × 2 roles (anon, authenticated) × 3 privilegios (TRUNCATE, REFERENCES, TRIGGER). Sin SELECT/INSERT/UPDATE/DELETE: el DML directo ya estaba revocado.

**DESPUÉS de la fase 2 (29/10 ~11:21):** **0 filas** — Verificación 1 confirmada por el usuario ("Success. No rows returned"). Las 16 tablas quedaron **totalmente cerradas** para `anon` y `authenticated` (H3 cerrado).

## 3 · Consulta 3 — Funciones: clasificación por ACL (captura del 29/10 ~09:52)

```sql
select proname, prosecdef, proacl
from pg_proc
where proname like 'f_%';
```

> Nota de método: el `_` en `LIKE 'f_%'` es comodín, por lo que la consulta arrastró también funciones internas de PostgreSQL (`float*`, `floor`, `format`, …). Se ignoran. En adelante se usa la **Consulta D**, que filtra bien por esquema.

**79 objetos del proyecto** (78 funciones + la sobrecarga de `f_coord_crear_stand`):

- **A · Solo postgres (internas, cerradas ✓):** `f_sesion_rol`, `f_codigo`.
- **B · anon EXECUTE (patrón correcto para las RPC que llama la app):** 68 funciones, todas SECURITY DEFINER salvo la de H8. Lista completa en la v1 de este documento y reproducible con la Consulta D.
- **C · proacl NULL = PUBLIC ejecutaba (⚠️ corregido en fase 2):** `f_admin_editar_cortesia_datos`, `f_coord_editar_stand`, `f_coord_mis_links`, `f_puerta_cerrar_dia_y_activar_siguiente`, y la 2ª sobrecarga de `f_coord_crear_stand` (6 argumentos).

## 4 · Consulta D — Firmas exactas y ACL de todo el esquema public (29/10 ~11:15)

```sql
select proname || '(' || pg_get_function_identity_arguments(oid) || ')' as funcion,
       prosecdef, proacl
from pg_proc
where pronamespace = 'public'::regnamespace
order by proname;
```

**80 filas**: 79 objetos `f_*` + `rls_auto_enable()`. Resultados clave:

- **Las 5 funciones con proacl NULL, con su firma exacta:**
  1. `f_admin_editar_cortesia_datos(p_token uuid, p_codigo_link text, p_nombre_organizacion text, p_nombre text, p_apellido text, p_cedula text)`
  2. `f_coord_crear_stand(p_codigo_coord text, p_nombre text, p_numero text, p_cupo integer, p_tipo text, p_correo text)` ← **2ª sobrecarga (6 arg), la PUBLIC**
  3. `f_coord_editar_stand(p_codigo_coord text, p_codigo_link text, p_nombre text, p_numero text, p_cupo integer, p_tipo text)`
  4. `f_coord_mis_links(p_codigo_coord text)`
  5. `f_puerta_cerrar_dia_y_activar_siguiente(p_token uuid)`
- **La sobrecarga que usa la app** es la de 5 argumentos: `f_coord_crear_stand(p_codigo_coord text, p_numero text, p_cupo integer, p_tipo text, p_correo text)` — coincide con la 1ª firma documentada en ARQUITECTURA.md §4.
- **H9 resuelto:** `rls_auto_enable()` tiene `prosecdef = true` y `proacl = {postgres=X/postgres}` → **solo postgres** puede ejecutarla. NO es agujero: es un helper huérfano (probablemente quedó de cuando se activó RLS). Candidata a DROP en fase 3 (decisión del usuario).
- `f_aliado_crear_premio(p_codigo_link text, p_nombre text, p_apellido text, p_cedula text, p_concurso text, p_cupones_total integer, p_dia1 boolean, p_dia2 boolean)` — confirmada con `prosecdef = false` (la única del proyecto que NO es SECURITY DEFINER) y anon EXECUTE. Ver H8.
- `f_puerta_activar_dia2(p_token uuid)` — confirmada con anon EXECUTE. Ver H7.
- El resto idéntico a la Consulta 3: sin drift entre las dos capturas.

## 5 · Hallazgos (estado al 29/10/2026 tras fase 2)

| # | Hallazgo | Estado |
| --- | --- | --- |
| H1 | RLS activo en las 16/16 tablas | ✓ Bien |
| H2 | Sin DML para `anon`/`authenticated` en tablas | ✓ Bien |
| H3 | `TRUNCATE`/`REFERENCES`/`TRIGGER` sobre-grantados a `anon`+`authenticated` en las 16 tablas | ✓ **CERRADO en fase 2** (Verificación 1: 0 filas) |
| H4 | 5 objetos con `proacl NULL` = PUBLIC ejecutaba | ✓ **CERRADO en fase 2** (Verificación 2: 4 con anon, la sobrecarga muerta solo postgres, ningún null) |
| H5 | Internas `f_sesion_rol` y `f_codigo` solo `postgres` | ✓ Bien |
| H6 | Sobrecarga de `f_coord_crear_stand` confirmada en base (2 firmas). La de 6 argumentos quedó solo-postgres tras fase 2 | ⏳ Fase 3: `pg_get_functiondef` de ambas, confirmar cuál usa coord.html, DROP de la muerta |
| H7 | `f_puerta_activar_dia2` existe con anon EXECUTE; no estaba en el traspaso v2.4. El código anterior a P0-01 no la llama (grep en copia local del 28/10: 0 coincidencias). Confirmación final pendiente contra el código actual | ⏳ Fase 3: candidata a DROP |
| H8 | `f_aliado_crear_premio` DEPRECADA, la única NO-SECURITY-DEFINER, con anon EXECUTE | ⏳ Fase 3: candidata a DROP |
| H9 | `rls_auto_enable()`: solo postgres (resuelto con la Consulta D) | ✓ Sin riesgo; DROP opcional en fase 3 |
| H10 | `search_path` de las SECURITY DEFINER sin verificar (protección contra secuestro de nombres) | ⏳ Fase 2b: Consulta E |

## 6 · Fase 2 EJECUTADA y VERIFICADA (29/10/2026 ~11:15-11:21, UTC-4)

SQL aplicado por el usuario en el SQL Editor **con su aprobación explícita** (todo reversible):

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

**Evidencia de la verificación (pegada por el usuario):**

- Verificación 1 (re-consulta de grants de tablas): **"Success. No rows returned"** = 0 permisos residuales. ✓
- Verificación 2 (ACLs de las 5 funciones): `f_admin_editar_cortesia_datos`, `f_coord_editar_stand`, `f_coord_mis_links` y `f_puerta_cerrar_dia_y_activar_siguiente` con `{postgres=X/postgres,anon=X/postgres}`; la sobrecarga de 6 arg de `f_coord_crear_stand` con solo `{postgres=X/postgres}`; la de 5 arg intacta con anon; **ningún null**. ✓
- Smoke test de la app (solo lectura): **"APP esta ok"** — dashboard, aliados, cortesias y Mis links funcionan normal. ✓

## 7 · Pendiente de P0-02

1. **Fase 2b — search_path seguro** (H10): Consulta E sobre las SECURITY DEFINER; si hay funciones sin `search_path=public,pg_temp`, se corrige con `ALTER FUNCTION ... SET search_path = public, pg_temp` (una línea por función, reversible).
2. **Fase 3 — limpieza de código muerto** (cada DROP con `pg_get_functiondef` previo y aprobación explícita): sobrecarga de 6 arg de `f_coord_crear_stand` (H6), `f_puerta_activar_dia2` (H7), `f_aliado_crear_premio` (H8), `rls_auto_enable` (H9, opcional).
3. **Fase 4 — autorización interna:** revisar con `pg_get_functiondef` que cada `f_admin_*` valide token+rol admin, cada `f_coord_*` coordinador activo, cada `f_puerta_*` token de puerta; verificar si `p_token` se compara contra hash (relacionado con P0-03); documentar la matriz función → rol → token; pruebas de rechazo (token de puerta contra `f_admin_*`, tokens inventados).

## 8 · Registro

- Consultas 1-3 ejecutadas por el usuario: 29/10/2026 ~09:52 (UTC-4). Consulta D: ~11:15. Fase 2 (SQL de cierre): ~11:15-11:21. Verificaciones 1-2 y smoke test: ~11:21.
- Consulta E (search_path): pendiente de ejecución.
- Este documento lo redacta el asistente; el usuario ejecuta todo el SQL y sube los archivos.
- Actualización pendiente al cierre de la sesión: ARQUITECTURA.md §8 ("resultados vigentes" + Consulta D/E) y la tarea `tareas/P0-02-rls-autorizacion.md`.
