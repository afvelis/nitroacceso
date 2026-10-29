# ARQUITECTURA.md — NitroSystem

> Fuente técnica de verdad del sistema v3. Solo cambia cuando cambia el esquema o el manifiesto.
> **Verificada contra la base y el repo:** Consulta A (funciones) 27/10/2026 · Consulta B (tablas) 27-28/10/2026 · árbol del repo 28-29/10/2026 · **P0-02 completa 29/10/2026: Consultas D-I, cierre de permisos y DROPs** (ver §8 y `docs/seguridad-supabase.md`).
> Si este documento contradice al repo o a la base, mandan el repo y la base — y se corrige este documento al cierre de la sesión.
> Regla permanente: antes de reescribir cualquier RPC, leer su definición vigente con `SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = '<nombre>';`

---

## 1 · Identidad del proyecto

- Sistema web de control de acceso para un evento de 2 días llamado comercialmente **"NitroSystem"** (antes "Nitrotoon"; renombrado 28/10/2026). Encabezado exacto de todas las páginas: "NitroSystem" (logo 🚀).
- 100% gratis y sin fricción: sin instalaciones, todo vía web — GitHub Pages + Supabase (Free).
- GitHub: repo **afvelis/nitroacceso** (público). Pages activado (main, /root). Sitio: https://afvelis.github.io/nitroacceso/
- Supabase: organización "nitro", proyecto **nitrotalentos**. URL: https://exrbwctegkzxurzwihvh.supabase.co (SIN /rest/v1/ al final). Clave publishable en config.js línea 4.
- El evento ya pasó (26/09/2026). El proyecto sigue en desarrollo/mantenimiento.

## 2 · Actores y roles

1. Administrador (tú): PIN 8 dígitos → dashboard.html
2. Staff de puerta: PIN 4 dígitos → puerta.html
3. Coordinador de talentos: código COORD- o link coord.html?c=
4. Coordinador de stands: código COORD- o link coord.html?c=
5. Representante de talento: link talento.html?t=
6. Vendedor de stand: link stand.html?s=
7. Beneficiario de cortesía: link cortesia.html?c=
8. Ganador de premiación: link cortesia.html?c= (con tipo premiación)
9. Aliado: link aliado.html?a=ASI-xxxxxxxx (pool de cupones, crea concursos y asigna ganadores)

## 3 · Tablas (16) — RLS activado en todas SIN políticas; todo acceso vía funciones SECURITY DEFINER

Verificadas el 27-28/10/2026 con la Consulta B (§8). Las 16 coinciden con lo documentado en v2.4, salvo una adición menor (sesiones.creada_at).

| Tabla | Columnas verificadas |
| --- | --- |
| config | id=1, nombre_evento, edicion_abierta bool, pin_admin, pin_puerta, dia_activo int default 1 check in (1,2), dia1_cerrado bool, dia2_cerrado bool |
| sesiones | token uuid, rol text, **creada_at** (columna existe en base; no estaba en el traspaso v2.4) |
| coordinadores | id uuid, tipo, nombre, codigo, correo, creada_at, activo bool |
| talentos | id, nombre, dia1, dia2, codigo_link, correo_link, coordinador_id uuid, creada_at, links_anulados text[] |
| listas | id, talento_id, dia int, estado text, codigo_corto, cerrada_at |
| personas | id, lista_id, nombre, apellido, cedula, cargo, estado, marcado_at, creada_at |
| stands | id, numero, cupo, tipo (patrocinante\|pagado), codigo_link, correo_link, coordinador_id, creada_at, nombre, links_anulados text[], empresa, vende |
| vendedores | id, stand_id, nombre, apellido, cedula, vende, empresa, codigo_qr, estado_dia1, estado_dia2, marcado_dia1_at, marcado_dia2_at, creada_at |
| eventos | id, nombre, stats jsonb, detalle jsonb, **creado_at** (ojo: creado, no creada) |
| cortesias | id uuid pk, tipo (lista\|individual\|premiacion), nombre_organizacion, razon (prensa\|vinculo_familiar\|premio\|autoridad\|otros), causa, dia1 bool, dia2 bool, codigo_link unique, estado (activa\|anulada), anulada_at, creada_at, concurso text, aliado text, cupones_total int, cupones_consumidos int default 0, canjeado_at, canjeado_dia int, aliado_id uuid, asignacion_id uuid, origen (admin\|aliado) default 'admin', razon_anulacion, enviado_at, concurso_id uuid |
| cortesia_listas | id, cortesia_id fk cascade, dia (1\|2), codigo_corto unique, creada_at, unique(cortesia_id,dia) |
| cortesia_personas | id, cortesia_id fk, lista_id fk nullable, nombre, apellido, cedula, codigo_qr unique nullable, estado default 'pendiente', marcado_at, estado_dia1/2, marcado_dia1_at/2_at, creada_at, correo, telefono; check de modo (lista sin QR o individual con QR); unique(lista_id,cedula); índice único parcial (cortesia_id,cedula) WHERE lista_id IS NULL |
| aliados | id uuid pk, nombre_organizacion not null, responsable not null, cedula (v2.4), nota_duplicado (v2.4), correo, telefono, activo bool default true, creada_at |
| aliado_asignaciones | id uuid pk, aliado_id fk cascade, codigo_link unique, pool_tipo (unico\|por_dia), cupones_unico int, cupones_dia1 int, cupones_dia2 int, estado (activa\|anulada), razon_anulacion, anulada_at, creada_at; check de pool |
| aliado_concursos | id uuid pk, asignacion_id fk cascade, nombre not null, descripcion, fecha_concurso date (obligatoria, hoy o posterior), cupones_reservados int check >=1, estado (abierto\|cerrado), creada_at, cerrada_at |
| aliado_ampliaciones | id uuid pk, asignacion_id fk cascade, cupones_antes int, cupones_despues int, motivo not null, motivo_detalle, creada_at |

## 4 · Funciones RPC vigentes (verificadas 27/10 con la Consulta A: 79 filas = 78 funciones + 1 sobrecarga; tras los DROPs del 29/10 quedan **76 funciones sin sobrecargas** + `rls_auto_enable` = 77 objetos)

### Internas
- `f_sesion_rol(p_token uuid)` → text
- `f_codigo(p_prefijo text, p_largo integer)` → text (prefijos SIEMPRE con guion)
- `f_login(p_pin text)` → table(token uuid, rol text)

### Admin
- `f_admin_toggle_edicion(p_token, p_abierta boolean)`
- `f_admin_crear_coordinador(p_token, p_tipo, p_nombre, p_correo)`
- `f_admin_listar_coordinadores(p_token)`
- `f_admin_editar_coordinador(p_token, p_id uuid, p_nombre, p_correo)`
- `f_admin_activar_coordinador(p_token, p_id uuid, p_activo boolean)`
- `f_admin_borrar_coordinador(p_token, p_id uuid)`
- `f_admin_stats(p_token)` · `f_admin_dashboard(p_token)` · `f_admin_segmentacion(p_token)` · `f_admin_tiempos(p_token)`
- `f_admin_guardar_evento(p_token, p_nombre)` · `f_admin_listar_eventos(p_token)` · `f_admin_ver_evento(p_token, p_id uuid)`
- `f_admin_limpiar_todo(p_token)` · `f_admin_estado_dias(p_token)`

### Cortesías admin
- `f_admin_crear_cortesia_lista(p_token, p_nombre_organizacion, p_razon, p_causa, p_dia1, p_dia2, p_personas_dia1 jsonb, p_personas_dia2 jsonb)`
- `f_admin_crear_cortesia_individual(p_token, p_nombre, p_apellido, p_cedula, p_razon, p_causa, p_dia1, p_dia2)`
- `f_admin_crear_cortesia_premiacion(p_token, p_nombre, p_apellido, p_cedula, p_concurso, p_cupones_total, p_aliado, p_dia1, p_dia2)`
- `f_admin_listar_cortesias(p_token)` · `f_admin_ver_cortesia(p_token, p_codigo_link)` · `f_admin_anular_cortesia(p_token, p_codigo_link)`
- `f_admin_editar_cortesia(p_token, p_codigo_link, p_razon, p_causa)`
- `f_admin_editar_cortesia_datos(p_token, p_codigo_link, p_nombre_organizacion, p_nombre, p_apellido, p_cedula)`
- `f_admin_editar_cortesia_dias(p_token, p_codigo_link, p_dia1, p_dia2)`
- `f_admin_editar_cortesia_premiacion(p_token, p_codigo_link, p_nombre, p_apellido, p_cedula, p_concurso, p_cupones_total, p_aliado)`
- `f_admin_cortesia_agregar_dia(p_token, p_codigo_link, p_dia)` · `f_admin_cortesia_quitar_dia(p_token, p_codigo_link, p_dia)`
- `f_admin_cortesia_agregar_persona(p_token, p_codigo_link, p_dia, p_nombre, p_apellido, p_cedula)`
- `f_admin_cortesia_quitar_persona(p_token, p_codigo_link, p_dia, p_cedula)`
- `f_admin_cortesia_editar_persona(p_token, p_persona_id uuid, p_nombre, p_apellido, p_cedula)`

### Coordinador
- `f_coord_entrar(p_codigo)` · `f_coord_mis_links(p_codigo_coord)`
- `f_coord_crear_talento(p_codigo_coord, p_nombre, p_dia1, p_dia2, p_correo)`
- `f_coord_editar_stand(p_codigo_coord, p_codigo_link, p_nombre, p_numero, p_cupo, p_tipo)`
- `f_coord_editar_talento(p_codigo_coord, p_codigo_link, p_nombre)`
- `f_coord_crear_stand(p_codigo_coord, p_numero, p_cupo, p_tipo, p_correo)` — ✓ resuelta 29/10/2026 (P0-02): esta firma de 5 argumentos es **la única viva** (la que usa coord.html; anon EXECUTE). La sobrecarga de 6 argumentos (con `p_nombre`) quedó solo-postgres tras el cierre de permisos y fue DROPeada — desapareció el riesgo PGRST202. Cuerpo capturado en docs/seguridad-supabase.md.

### Links externos
- `f_link_talento_ver(p_codigo_link)` · `f_link_talento_guardar(p_codigo_link, p_dia, p_personas jsonb)` · `f_link_talento_copiar(p_codigo_link, p_dia_origen, p_dia_destino)`
- `f_link_stand_ver(p_codigo_link)` · `f_link_stand_registrar_lote(p_codigo_link, p_empresa, p_vende, p_personas jsonb)` · `f_link_stand_registrar(p_codigo_link, p_nombre, p_apellido, p_cedula, p_vende, p_empresa)` · `f_link_stand_mi_qr(p_codigo_link, p_cedula)` · `f_link_stand_quitar_vendedor(p_codigo_link, p_cedula)`

### Puerta
- `f_puerta_estado(p_token)` · `f_puerta_cerrar_dia_y_activar_siguiente(p_token)`
- `f_puerta_lista(p_token, p_dia, p_buscar)` · `f_puerta_personas_de_lista(p_token, p_lista_id uuid)` · `f_puerta_marcar_persona(p_token, p_persona_id uuid, p_estado)` · `f_puerta_cerrar_lista(p_token, p_lista_id uuid, p_cerrada boolean)`
- `f_puerta_vendedor_por_qr(p_token, p_codigo_qr)` · `f_puerta_vendedor_por_cedula(p_token, p_cedula)` · `f_puerta_marcar_vendedor(p_token, p_vendedor_id uuid, p_dia, p_estado)`
- `f_puerta_cortesia_lista(p_token, p_codigo_corto)` · `f_puerta_cortesia_individual(p_token, p_codigo_qr)` · `f_puerta_marcar_cortesia(p_token, p_persona_id uuid, p_dia, p_estado)`
- `f_puerta_premiacion_por_qr(p_token, p_codigo_qr)` · `f_puerta_canjear_premiacion(p_token, p_codigo_qr, p_cupones_usados integer)`
- ~~`f_puerta_activar_dia2(p_token uuid)`~~ — **DROPeada 29/10/2026 (P0-02)**: era la variante legacy de "activar día 2"; el flujo real usa `f_puerta_cerrar_dia_y_activar_siguiente`. Definición guardada en docs/seguridad-supabase.md para reversión.

### Pública
- `f_cortesia_ver(p_codigo_link)` — devuelve razon_anulacion, aliado y origen cuando la cortesía está anulada; aliado + origen cuando está activa (ampliada v2.2). Es la RPC que usa el keep-alive.

### Módulo de aliados — ADMIN
- `f_admin_crear_aliado(p_token, p_nombre_organizacion, p_responsable, p_cedula, p_correo, p_telefono, p_pool_tipo, p_cupones_unico, p_cupones_dia1, p_cupones_dia2, p_nota_duplicado)` → {ok, aliado_id, asignacion_id, codigo_link} | ERR_DUPLICADO_SIN_CONFIRMAR
- `f_admin_chequear_duplicados_aliado(p_token, p_cedula, p_correo, p_telefono)` → jsonb array [{tipo, aliado_id, nombre_organizacion, responsable, activo}]
- `f_admin_ver_concursos_aliado(p_token, p_asignacion_id uuid)` → jsonb {asignacion, concursos}
- `f_admin_crear_asignacion(p_token, p_aliado_id uuid, p_pool_tipo, p_cupones_unico, p_cupones_dia1, p_cupones_dia2)` → {ok, asignacion_id, codigo_link}
- `f_admin_listar_aliados(p_token)` → array con aliados + asignaciones + stats (incluye cedula, nota_duplicado, ampliaciones, disponible_unico/dia1/dia2)
- `f_admin_ampliar_cupones(p_token, p_asignacion_id uuid, p_cupones_unico, p_cupones_dia1, p_cupones_dia2, p_motivo, p_motivo_detalle)` → {ok, cupones_antes, cupones_despues} — usada por el modal del 22/10; **semántica de SUMA desde el 28/10/2026** (antes reemplazaba el total y permitía reducir pools: BUG-1 corregido, ver DECISIONES.md)
- `f_admin_anular_asignacion(p_token, p_asignacion_id uuid, p_razon)` → {ok, premios_anulados}
- `f_admin_anular_aliado(p_token, p_aliado_id uuid, p_razon)` → {ok, asignaciones_anuladas, premios_anulados}

### Módulo de aliados — PÚBLICO
- `f_aliado_ver(p_codigo_link)` → jsonb {asignacion, aliado, dias_cerrados, estadisticas_por_dia, concursos, ampliaciones}
- `f_aliado_crear_concurso(p_codigo_link, p_nombre, p_descripcion, p_fecha_concurso date, p_cupones_reservados)`
- `f_aliado_editar_concurso(p_codigo_link, p_concurso_id uuid, p_nombre, p_descripcion, p_fecha_concurso, p_cupones_reservados)`
- `f_aliado_eliminar_concurso(p_codigo_link, p_concurso_id uuid)`
- `f_aliado_asignar_ganador(p_codigo_link, p_concurso_id uuid, p_nombre, p_apellido, p_cedula, p_correo, p_telefono, p_cupones_total, p_dia1, p_dia2)` → {ok, codigo_link, codigo_qr, cortesia_id}
- `f_aliado_marcar_enviado(p_codigo_link, p_concurso_id uuid)` → {ok, enviado_at}
- ~~`f_aliado_crear_premio(...)`~~ — **DROPeada 29/10/2026 (P0-02)**: ya era un coto que solo devolvía `{"error":"ERR_DEPRECADO_USAR_CONCURSOS"}`; el módulo usa concursos.

### Utilidad
- `rls_auto_enable()` — ✓ resuelta 29/10/2026 (P0-02): es el handler del event trigger **`ensure_rls`** (`ddl_command_end`, activo) que activa RLS automáticamente en toda tabla nueva de `public`. **Se conserva a propósito** como red de seguridad; solo-postgres, `search_path=pg_catalog`.

## 5 · Convenciones de códigos (con guion)

- L- (6) listas · V- (8) vendedores · CL- (6) cortesía lista · CI- (8) cortesía individual · PR- (8) premiación
- COR- (8) coordinador · TAL- (8) talento · STD- (8) stand · COORD- (8) · ASI- (8) asignación de aliado

## 6 · Reglas SQL aprendidas (obligatorias)

- CREATE OR REPLACE con firma DISTINTA crea SOBRECARGA (riesgo PGRST202 — ya ocurrió con f_coord_crear_stand). Para cambiar firma: DROP de la vieja primero; el aviso "destructive operations" de Supabase es normal, pulsar Run query.
- Toda función NUEVA: REVOKE EXECUTE FROM PUBLIC + GRANT EXECUTE TO anon.
- SECURITY DEFINER + SET search_path = public, pg_temp en toda función.
- Tras cambios de esquema: `NOTIFY pgrst, 'reload schema';`
- Comparar correos: `lower(trim(col))`. Cédulas y teléfonos: `regexp_replace(col, '\D', '', 'g')`.

## 7 · Manifiesto de archivos publicados (verificado contra el árbol del repo el 29/10/2026; verificación anterior: 27/10/2026)

| # | Archivo | Último cambio | Nota |
| --- | --- | --- | --- |
| 1 | config.js | sesión 4 | NOMBRE_EVENTO = "NITROSYSTEM" (28/10/2026; constante sin uso funcional) |
| 2 | index.html | sesión 4 | Login principal, sin maxlength a propósito |
| 3 | dashboard.html | 06/10/2026 (v2.4) | Pastilla "🤝 Aliados" + M-31; único "Salir"; tarjetas NO clicables (pendiente) |
| 4 | admin.html | 04/10/2026 (v2.2) | Sin cortesías ni estadística; secciones: edicion, crear-coordinador, coordinadores, historial |
| 5 | coord.html | sesión 4 | Panel del coordinador; rota códigos al editar |
| 6 | talento.html | sesión 4 | CONGELADO: botón "Cerrar esta pestaña" y panel azul Día 2 no se tocan |
| 7 | stand.html | sesión 4 | Registro por lote en una transacción |
| 8 | cortesia.html | 26/09/2026 (v2.1) | Página pública; soporte premiación con pantalla 🏆 |
| 9 | puerta.html | 02/10/2026 (v2.2) | QR de 3 capas (BarcodeDetector → jsQR CDN → manual) |
| 10 | estadisticas.html | 04/10/2026 (v2.2) | Solo "← Volver al dashboard"; nunca cierra sesión |
| 11 | cortesias.html | **28/10/2026** | Panel admin de cortesías; pastilla "🤝 Gestionar aliados" añadida (28/10) |
| 12 | aliado.html | 05/10/2026 (v2.3) | Módulo público del aliado; entra con ?a=ASI-xxxxxxxx |
| 13 | aliados.html | **28/10/2026** | Panel admin COMPLETO: listado, crear con duplicados, compartir, Ver concursos, ➕ Ampliar cupones (semántica de suma), 🚫 Anular asignación, 🚫 Dar de baja al aliado, ➕ Agregar asignación |
| 14 | aliados-concursos.html | 06/10/2026 (v2.4) | Historial de concursos por asignación; entra con ?asig=UUID |
| 15 | acceso-denegado.html | 06/10/2026 (v2.4) | Pantalla cerrada; sin links a login ni dashboard |

Otros contenidos del repo (no son HTML/JS en vivo): `AGENTS.md`, `tareas/` (backlog de seguridad P0/P1/P2 de la revisión del 27/10 + F-1…F-5 de la prueba en vivo y M-33…M-36 ideas de producto, migradas a tareas el 29/10/2026), `.github/workflows/keep-supabase-alive.yml` (ping cada 3 días a f_cortesia_ver; si esa RPC desaparece, actualizar el curl), `GUIA-Metodo-Continuidad-v3.pdf` (guía del método de continuidad v3, subida en el cierre de la Sesión 13, 28/10/2026), y desde la migración v3: `ESTADO.md`, `ARQUITECTURA.md` y `DECISIONES.md` en la RAÍZ del repo (decisión del 28/10: se dejaron en raíz, sin carpeta). **No existe `README` en la raíz del repo**: el manifiesto lo listaba por error desde la migración v3; corregido el 29/10/2026. **`docs/`** (carpeta creada el 29/10/2026): contiene `docs/seguridad-supabase.md`, la auditoría de backend de P0-02 (v4, congelada): evidencia de RLS, grants, ACLs, search_path, DROPs, matriz de autorización y SQL exacto del cierre.

No confundir: **cortesia** (singular, pública) vs **cortesias** (plural, admin) · **aliado** (singular, público) vs **aliados** (admin) vs **aliados-concursos** (admin).

## 8 · Consultas de verificación (copiar-pegar en el SQL Editor de Supabase)

**A — Funciones (pregunta "¿hay RPCs nuevas?"):**
```sql
SELECT proname || '(' || pg_get_function_identity_arguments(oid) || ')' AS funcion
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
ORDER BY proname;
```

**B — Tablas y columnas (pregunta "¿hay tablas o columnas nuevas?"):**
```sql
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

**C — Definición de una función concreta (siempre antes de reescribirla):**
```sql
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = '<nombre>';
```

Resultados vigentes: A y B (27-28/10/2026) coincidían con §3 y §4. La Consulta A arrojó 79 filas (78 funciones + la sobrecarga de f_coord_crear_stand).

**Resultados del 29/10/2026 (P0-02, Sesión 14 — evidencia completa en `docs/seguridad-supabase.md` v4):** la base quedó con **77 objetos** (76 funciones + `rls_auto_enable`): las 16 tablas con **0 privilegios** para `anon`/`authenticated` (solo acceso vía RPC), ninguna función con EXECUTE de PUBLIC (4 normalizadas a anon), `search_path` protegido en todas las SECURITY DEFINER, y 3 objetos muertos eliminados. Nuevas consultas registradas: **D** (firmas+ACL de todo el esquema public), **E** (search_path de las SECURITY DEFINER), **F** (`pg_get_functiondef` de candidatos a DROP — regla: siempre antes de tocar), **G** (event triggers), **H** (matriz token/sesión por función), **I** (rol exigido por función). Matriz de autorización: `f_admin_*` → rol admin · `f_puerta_*` → rol puerta · `f_coord_*` → codigo_coord · `f_link_*`/`f_aliado_*`/`f_cortesia_ver` → codigo_link · internas solo-postgres. Prueba de rechazo con token inventado: null (falla cerrada). Traslados: hash/expiración de tokens → P0-03; staging y prueba con token real de puerta → P1-04.
