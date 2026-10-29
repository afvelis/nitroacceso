# seguridad-supabase.md — Auditoría de backend (P0-02, fase 1)

> **Qué es:** la evidencia del estado REAL de la base de Supabase (proyecto nitrotalentos) al **29/10/2026 · Sesión 14**, obtenida con las 3 consultas de diagnóstico de [`tareas/00-revision-seguridad.md`](../tareas/00-revision-seguridad.md) §2. Las ejecutó el **usuario** en el SQL Editor y pegó los resultados íntegros en la sesión; este documento los consolida y los interpreta.
> **Solo lectura:** ninguna consulta modifica datos, permisos ni esquema. El SQL de cierre se propone en §5 y NO se ha ejecutado.
> Regla permanente: antes de reescribir cualquier RPC, leer su definición con `SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = '<nombre>';`

---

## 1 · Consulta 1 — RLS por tabla: **16/16 ACTIVO ✓**

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

## 2 · Consulta 2 — Grants de tablas: patrón uniforme en las 16

```sql
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated');
```

**96 filas = 16 tablas × 2 roles (anon, authenticated) × 3 privilegios (TRUNCATE, REFERENCES, TRIGGER).** El mismo patrón en todas las tablas, sin excepciones.

- ✓ **NO hay SELECT, INSERT, UPDATE ni DELETE** para `anon` ni `authenticated` → el DML directo ya está revocado: la API REST **no puede leer ni escribir tablas**. (Doble capa: RLS activo sin políticas + sin privilegios DML.)
- ⚠️ **Sobre-concesión:** `TRUNCATE`, `REFERENCES` y `TRIGGER` están concedidos a `anon` y `authenticated` en las 16 tablas. `TRUNCATE` **no está cubierto por RLS**. Riesgo práctico hoy **bajo** (la API REST de Supabase no expone TRUNCATE ni DDL), pero viola el mínimo privilegio y se cierra con una línea (§5).

## 3 · Consulta 3 — Funciones: clasificación por ACL

```sql
select proname, prosecdef, proacl
from pg_proc
where proname like 'f_%';
```

> Nota de método: el `_` en `LIKE 'f_%'` es comodín, por lo que la consulta arrastró también funciones internas de PostgreSQL (`float*`, `floor`, `format`, `factorial`, `first_value`, `filename`, …). Se ignoran: todas con `prosecdef = false` y `proacl = null` (privilegios por defecto del sistema, no tocados). Abajo solo el proyecto.

**79 objetos del proyecto** (78 funciones + la sobrecarga de `f_coord_crear_stand`), clasificados:

### A · Cerradas (solo `postgres`) — 2 ✓
`f_sesion_rol` · `f_codigo` — internas; `prosecdef = true`, ACL solo owner. Correcto.

### B · `anon` EXECUTE (patrón correcto para las RPC que llama la app) — 68
`f_admin_toggle_edicion`, `f_puerta_marcar_vendedor`, `f_login`, `f_admin_crear_coordinador`, `f_coord_crear_talento`, `f_link_talento_guardar`, `f_puerta_vendedor_por_cedula`, `f_link_talento_copiar`, `f_link_stand_ver`, `f_link_stand_mi_qr`, `f_puerta_lista`, `f_puerta_cerrar_lista`, `f_puerta_vendedor_por_qr`, `f_admin_editar_coordinador`, `f_admin_activar_coordinador`, `f_admin_listar_coordinadores`, `f_admin_borrar_coordinador`, `f_admin_anular_cortesia`, `f_admin_estado_dias`, `f_admin_listar_eventos`, `f_admin_ver_evento`, `f_admin_ver_cortesia`, `f_admin_limpiar_todo`, `f_coord_entrar`, `f_link_stand_registrar`, `f_link_stand_registrar_lote`, `f_link_stand_quitar_vendedor`, `f_puerta_personas_de_lista`, `f_puerta_estado`, `f_puerta_activar_dia2` *(ver H7)*, `f_admin_segmentacion`, `f_admin_crear_cortesia_lista`, `f_admin_crear_cortesia_individual`, `f_admin_listar_cortesias`, `f_admin_editar_cortesia`, `f_admin_cortesia_agregar_dia`, `f_admin_editar_cortesia_dias`, `f_admin_cortesia_quitar_dia`, `f_admin_cortesia_agregar_persona`, `f_admin_cortesia_quitar_persona`, `f_puerta_cortesia_lista`, `f_admin_cortesia_editar_persona`, `f_puerta_cortesia_individual`, `f_puerta_marcar_cortesia`, `f_admin_tiempos`, `f_admin_stats`, `f_coord_editar_talento`, `f_link_talento_ver`, `f_admin_guardar_evento`, `f_puerta_marcar_persona`, `f_admin_dashboard`, `f_puerta_premiacion_por_qr`, `f_puerta_canjear_premiacion`, `f_admin_crear_cortesia_premiacion`, `f_admin_editar_cortesia_premiacion`, `f_admin_crear_asignacion`, `f_admin_listar_aliados`, `f_admin_ampliar_cupones`, `f_admin_anular_asignacion`, `f_admin_ver_concursos_aliado`, `f_admin_anular_aliado`, `f_aliado_crear_premio` *(ver H8)*, `f_cortesia_ver`, `f_aliado_crear_concurso`, `f_aliado_editar_concurso`, `f_aliado_eliminar_concurso`, `f_aliado_asignar_ganador`, `f_aliado_marcar_enviado`, `f_aliado_ver`, `f_admin_crear_aliado`, `f_admin_chequear_duplicados_aliado`, `f_coord_crear_stand` *(1ª sobrecarga, ver H6)*.

Todas con `prosecdef = true` (SECURITY DEFINER), excepto la de H8.

### C · `proacl = NULL` → **PUBLIC tiene EXECUTE** (demasiado abiertas) — 5 ⚠️
| Función | Nota |
| --- | --- |
| `f_coord_editar_stand` | La app la llama como `anon` → normalizar no cambia nada |
| `f_coord_mis_links` | La app la llama como `anon` → normalizar no cambia nada |
| `f_admin_editar_cortesia_datos` | La app la llama como `anon` → normalizar no cambia nada |
| `f_puerta_cerrar_dia_y_activar_siguiente` | La app la llama como `anon` → normalizar no cambia nada |
| `f_coord_crear_stand` (2ª sobrecarga) | Ver H6 — probablemente la sobrecarga muerta |

`proacl = NULL` significa privilegios por defecto: **cualquier rol (incluido PUBLIC) puede ejecutarlas**. Es más abierto que el patrón B y se corrige con REVOKE/GRANT por función (§5).

---

## 4 · Hallazgos

| # | Hallazgo | Estado |
| --- | --- | --- |
| H1 | RLS activo en las 16/16 tablas | ✓ Bien |
| H2 | Sin DML para `anon`/`authenticated` en tablas: la API no lee ni escribe tablas | ✓ Bien |
| H3 | `TRUNCATE`/`REFERENCES`/`TRIGGER` sobre-grantados a `anon`+`authenticated` en las 16 tablas (TRUNCATE no lo cubre RLS; PostgREST no lo expone → riesgo práctico bajo) | ⚠️ Cerrar (§5, bloque 1) |
| H4 | 5 objetos con `proacl NULL` = PUBLIC ejecuta (§3-C) | ⚠️ Normalizar (§5, bloque 2) |
| H5 | Internas `f_sesion_rol` y `f_codigo` solo `postgres` | ✓ Bien |
| H6 | Sobrecarga de `f_coord_crear_stand` confirmada en base: 2 firmas con ACLs distintas (una `anon`, otra PUBLIC). Riesgo PGRST202 ya documentado en ARQUITECTURA.md §4 | ⚠️ Decidir DROP tras `pg_get_functiondef` de ambas y confirmar cuál usa coord.html |
| H7 | `f_puerta_activar_dia2` existe con `anon` EXECUTE; no estaba en el traspaso v2.4 (ARQUITECTURA.md §4 la marca [VERIFICAR]). El código anterior a P0-01 no la llama (grep en copia local del 28/10: 0 coincidencias; P0-01 solo cambió escape/validaciones). Confirmación final pendiente contra el código actual | ⚠️ Candidata a DROP |
| H8 | `f_aliado_crear_premio` está DEPRECADA (ARQUITECTURA.md §4) y es la **única del proyecto que NO es SECURITY DEFINER** (`prosecdef = false`) con `anon` EXECUTE. Mismo estado de confirmación que H7 | ⚠️ Candidata a DROP |
| H9 | `rls_auto_enable()` no aparece en la Consulta 3 (su nombre no empieza por `f_`); su definición y ACL siguen sin verificar | ⏳ Pendiente (Consulta D) |

## 5 · Fase 2 propuesta — cierre de permisos (NO ejecutado; requiere tu aprobación)

**Paso previo — Consulta D (solo lectura):** firmas exactas y ACL de TODO lo que vive en el esquema `public` (incluye `rls_auto_enable` y resuelve las firmas del bloque 2):

```sql
select proname || '(' || pg_get_function_identity_arguments(oid) || ')' as funcion,
       prosecdef, proacl
from pg_proc
where pronamespace = 'public'::regnamespace
order by proname;
```

**Bloque 1 (propuesta) — cerrar tablas por completo.** Impacto esperado: **ninguno** para la app (todo va por RPC SECURITY DEFINER; el keep-alive llama a `f_cortesia_ver`). Reversible con un GRANT equivalente:

```sql
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
```

**Bloque 2 (propuesta) — normalizar las 5 funciones PUBLIC.** La app sigue funcionando porque las 4 usadas se quedan con `anon`; la sobrecarga muerta de `f_coord_crear_stand` queda solo para `postgres` hasta decidir su DROP. Firmas exactas pendientes de la Consulta D:

```sql
REVOKE EXECUTE ON FUNCTION f_coord_editar_stand(<argumentos>) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION f_coord_editar_stand(<argumentos>) TO anon;
-- (ídem f_coord_mis_links, f_admin_editar_cortesia_datos, f_puerta_cerrar_dia_y_activar_siguiente)
REVOKE EXECUTE ON FUNCTION f_coord_crear_stand(<argumentos de la 2ª sobrecarga>) FROM PUBLIC;
-- sin GRANT a anon: es la sobrecarga que nadie debería usar
```

**Fase 3 (después) — limpieza de código muerto, cada DROP con su `pg_get_functiondef` previo y tu aprobación explícita:** sobrecarga muerta de `f_coord_crear_stand` (H6), `f_puerta_activar_dia2` (H7), `f_aliado_crear_premio` (H8), y decisión sobre `rls_auto_enable` (H9).

**Verificación del cierre (fase 2):** repetir la Consulta 2 (debe devolver **0 filas**) y la Consulta 3 (las 4 funciones usadas deben aparecer con `anon=X/postgres` y ninguna con `proacl = null`), y probar la app: login, puerta y aliados deben funcionar igual.

## 6 · Registro

- Consultas 1-3 ejecutadas por el usuario: 29/10/2026 ~09:52 (UTC-4), SQL Editor, proyecto nitrotalentos. Resultados pegados íntegros en la Sesión 14 y consolidados aquí sin alterar valores.
- Este documento lo redactó el asistente; el SQL de §5 es PROPUESTA y no se ha ejecutado.
- Actualización pendiente al cierre: ARQUITECTURA.md §8 ("resultados vigentes") y la tarea `tareas/P0-02-rls-autorizacion.md`.
