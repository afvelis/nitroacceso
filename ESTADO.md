# ESTADO.md — NitroSystem (control de acceso)

Versión del archivo: **6** · Última actualización: **30/10/2026** · Generado en el cierre de la Sesión 15 (29-30/10/2026)

> Este archivo SOLO lleva el ESTADO del proyecto. Las reglas de trabajo viven en `AGENTS.md` (+ sus anexos: continuidad v3 y estilo de trato). La arquitectura técnica vive en `ARQUITECTURA.md`. Los "por qués" viven en `DECISIONES.md`. Las tareas ejecutables viven en `tareas/`. Si este archivo contradice a `AGENTS.md`, manda `AGENTS.md`. Si contradice al repo, manda el repo.

---

## 1 · Estado de avance por módulo

| Módulo | Estado | Verificado |
| --- | --- | --- |
| Núcleo de acceso (index, dashboard, admin, coord, talento, stand, puerta, cortesia, cortesias, estadisticas) | ✅ En producción (evento 26/09/2026 ya pasó) · Rebranding NitroSystem aplicado 28/10 · **P0-01 XSS aplicado y probado en vivo 28/10** | Sí (blobs + Actions #166/#167) |
| aliado.html (público, entra con ?a=ASI-xxx) | ✅ Completo (v2.3) | Sí |
| aliados.html (admin) | ✅ **COMPLETO — brief cerrado al 100% el 28/10/2026** | Sí |
| aliados-concursos.html (historial por asignación) | ✅ Completo (v2.4) | Sí |
| acceso-denegado.html | ✅ Completo (v2.4) | Sí |
| Backend Supabase (seguridad) | ✅ **P0-02 COMPLETA 29/10** — RLS 16/16, 0 privilegios, sin EXECUTE de PUBLIC, search_path protegido, matriz de autorización verificada · **P0-03 COMPLETA 29-30/10** — sesiones solo-hash con expiración/revocación/último uso, rate limit 5/15 min por IP, PINs bcrypt de 6 dígitos, login real/revocación/auto-bloqueo, columna `token` eliminada (PK por `token_hash`) | Sí (P0-02: Consultas A-I; P0-03: conteos por lote + pruebas en vivo; smoke "APP OK" en cada fase) |
| Keep-alive Supabase (GitHub Actions) | ✅ Activo — run **#11** verde 28/10 14:15 local, cadencia cada 3 días, **próximo ~31/10 (mañana)** | Sí (API Actions 28/10) |

**Higiene documental (29/10/2026, Sesión 14):** F-1…F-5 (hallazgos de la prueba en vivo) y M-33…M-36 (ideas de producto) migrados a `tareas/` con PLANTILLA.md; `tareas/README.md` quedó como índice del backlog (21 tareas). Manifiesto de ARQUITECTURA §7 corregido (no existe README en la raíz; se registró la carpeta `docs/`). Commits `02d60db` y `6ce8a1c`, Actions verdes.

**P0-03 — Endurecer PIN, rate limit, tokens y bloqueo de sesión (29-30/10/2026, Sesión 15): COMPLETA y VERIFICADA en 6 fases.** Fase A: respaldo de las 54 definiciones que tocan sesión en `docs/Supabase Snippet Untitled query.csv` (commit `fe6f3ac`). Fase B: pgcrypto a `extensions`, `sesiones` +5 columnas, tabla `login_intentos`, tablas nacen cerradas. Fase C: guardián `f_sesion_ok` + `f_sesion_rol` por hash + `f_login` con rate limit (5 fallas/15 min, probado EN VIVO: el 6º intento revienta con BLOQUEADO). Fase D: las 39 inline reescritas en 4 lotes (36 al guardián, 3 `LANGUAGE sql` con hash inline); verificación por conteo tras cada lote (10→23→28→36) y 0 chequeos residuales. Fase E: `f_logout`, `f_admin_sesiones`, `f_admin_revocar_sesiones` (excluye la propia), `f_admin_rotar_pin` (6 dígitos, bcrypt); frontend: salida real, auto-bloqueo 5 min, panel "Sesiones y seguridad", `admin.html` v2 con modales propios (regla v2.1); rotaciones reales ejecutadas (booleanos `true,true`; viejos rechazados). Fase F: `f_login` sin token en claro, columna `token` eliminada, PK por `token_hash`, limpieza de fin de evento barre sesiones + login_intentos. Detalle y evidencia: `docs/seguridad-sesiones.md` y Notas del task (3 incidentes con lecciones: lote en proyecto equivocado → verificar por conteo; diálogos nativos suprimidos → modales; fuga de prefijo de PIN en consulta → regla "claves solo booleanos" + cura por rotación). Commits de la sesión: `edf6c8d` (ESTADO v5), `896e26c` (task en_progreso), `fe6f3ac` (respaldo), `config.js`, `index.html`, `puerta.html`, `admin.html` (v1 y v2), task `hecho`, `docs/seguridad-sesiones.md`, `tareas/README.md` — Actions verdes.

**P0-02 — Verificar y cerrar RLS, grants y autorización por rol (29/10/2026, Sesión 14): COMPLETA y VERIFICADA en 5 fases.** Fase 1: auditoría solo-lectura (RLS 16/16; grants sin DML; 5 funciones con PUBLIC). Fase 2: cierre de permisos (REVOKE ALL ON ALL TABLES + REVOKE PUBLIC/GRANT anon; Verificación 1: 0 filas; Verificación 2 sin nulls). Fase 2b: search_path de las SECURITY DEFINER, todas protegidas. Fase 3: DROP de `f_aliado_crear_premio`, la sobrecarga de 6 argumentos de `f_coord_crear_stand` y `f_puerta_activar_dia2` (Verificación 3: 2 filas; definiciones guardadas para reversión). Fase 4: matriz de autorización (Consulta H: todas las funciones con token validan sesión; Consulta I: 38/38 f_admin_* exigen rol admin, 14/14 f_puerta_* rol puerta, 0 cruces) + pruebas de rechazo con token inventado → null. La app se probó ("APP OK") tras cada fase. **`rls_auto_enable` + event trigger `ensure_rls` se CONSERVAN a propósito** (activan RLS en tablas nuevas). Evidencia completa congelada en `docs/seguridad-supabase.md` (v4). Traslados: hash/expiración de tokens → **P0-03** (✅ ejecutado); staging + prueba con token real de puerta → **P1-04**. Tarea marcada `hecho`; README del backlog actualizado.

**P0-01 — Eliminar el XSS almacenado (28/10/2026, Sesión 13):** 10 archivos, commits `44ef31ab`/`53ab76ff`, Actions #166/#167. Escape central `escaparHtml()`/`NA.esc` + validaciones de entrada; probado en vivo con las dos capas. Detalle en `tareas/P0-01-xss-escape.md`.

**Rebranding NitroSystem (28/10/2026):** 15 archivos, formato "Solo NitroSystem". Actions #160 verde. Detalle en DECISIONES.md.

## 2 · Verificación de arranque (reemplaza el checklist de 5 preguntas de la v2.4)

Al iniciar cualquier sesión, se verifica en este orden. Cada punto dice quién lo hace según el modo: **AGENTE** (asistente con lectura de repo, p. ej. una sesión agéntica) o **CHAT GRATUITO** (el usuario es las manos del asistente y lo reporta mirando GitHub en el navegador).

1. **Repo y cambios recientes** — AGENTE: lee el árbol de archivos y los commits desde la última sesión y los compara con el manifiesto de ARQUITECTURA.md. CHAT GRATUITO: el usuario abre el repo en GitHub, revisa la lista de archivos y los commits recientes, y reporta qué ve.
2. **tareas/** — AGENTE: lee los `estado:` del backlog. CHAT GRATUITO: el usuario abre `tareas/` y reporta los estados (o pega la tabla del README).
3. **Keep-alive** — AGENTE: revisa la última ejecución en Actions. CHAT GRATUITO: el usuario mira Actions y reporta si la última ejecución está en verde.
4. **Backend Supabase** — SIEMPRE el usuario (en ambos modos), SOLO si la sesión va a tocar RPC o esquema: ejecuta la Consulta A o D (funciones/ACL) y la B (tablas/columnas) del SQL Editor y pega los resultados. Los resultados vigentes quedan copiados en ARQUITECTURA.md y en `docs/seguridad-supabase.md`.
5. **Excepción crítica**: si cualquier cosa no encaja (archivo que el manifiesto dice que existe y no está, contradicción entre ESTADO y repo, paso que no cuadra), DETENER y avisar en español llano. No reconstruir en silencio.

**Estado de la verificación vigente (30/10/2026, cierre de la Sesión 15):**

- Consultas A y B: ✅ 27-28/10. Consultas D, E, F, G, H, I: ✅ 29/10 (P0-02). Sesión 15 (P0-03): dumps `pg_get_functiondef` de las 54 funciones de sesión y de las 11 de puerta, conteos por lote (guardián 10→23→28→36; residuos 0), booleanos bcrypt (`true,true`), contaje de sesiones (1 activa / 10 revocadas). **La base quedó con 82 objetos (81 funciones + `rls_auto_enable`)** — 5 funciones nuevas (`f_sesion_ok`, `f_logout`, `f_admin_sesiones`, `f_admin_revocar_sesiones`, `f_admin_rotar_pin`), 41 reescritas (39 inline + `f_login` + `f_admin_limpiar_todo`).
- Sesión 15: SÍ se tocó esquema (columnas/índices/tabla/PK/DROP de columna `token`; todo ejecutado por el usuario con aprobación explícita y verificación posterior — lo destructivo con respaldo previo `fe6f3ac`). Smoke "APP OK" en cada fase.
- Reglas nuevas de la sesión 15 (ya en Estilo de trato): consultas SQL con resultados **una a la vez**; cambios de repo con **ruta + commit exactos**; **verificaciones de claves solo booleanos** (jamás prefijos/fragmentos).
- La verificación inicial del checklist v2.4 (5 preguntas) sigue **CERRADA AL 100%**.

## 3 · Workstreams activos

**A — Brief de aliados: ✅ CERRADO 28/10/2026.** Sin trabajo pendiente.

**B — Backlog de seguridad** (`tareas/`): **P0-01 HECHO 28/10 · P0-02 HECHA 29/10 · P0-03 HECHA 29-30/10.** Quedan 9 `pendiente`: P0-04 (QR/CSP), P0-05 (backups), P1-01…P1-04, P2-01…P2-03. Orden recomendado: **P0-04 → P0-05**, luego P1/P2. Se trabaja UNA tarea a la vez según `AGENTS.md`.

**C — Ideas de producto pendientes** (las activadas migran a `tareas/` con `PLANTILLA.md`): historial global de concursos (`concursos.html`); extender M-28/M-31 a cortesias/estadisticas/admin; origen (admin vs aliado) en dashboard; razón de anulación al ganador; "ganadas" en vez de "asignadas" en cortesia.html; aviso de concursos sin ganador; motor de envío automático (M-01); tarjetas clicables del dashboard; módulo post-evento (M-21); anti-colisión de códigos (M-22); RBAC (M-29); **depuración de admin.html** (petición explícita del usuario 29/10: separar actividades medulares de secundarias — la página está sobrecargada). **M-33…M-36 ya viven en `tareas/`** (migradas 29/10).

**D — Hallazgos RPC del 27/10: ✅ RESUELTOS 29/10/2026 (P0-02).** Sobrecarga de `f_coord_crear_stand` → quedó solo la de 5 argumentos (la que usa coord.html). `f_puerta_activar_dia2` → DROP. `rls_auto_enable` → CONSERVADA (handler de `ensure_rls`). Detalle en ARQUITECTURA.md §4 y docs/seguridad-supabase.md.

**E — Manuales (solicitud del usuario, 28/10):** manual de uso por módulo (usuarios finales), memoria técnica viva (ARQUITECTURA.md) y manual de reparación. Candidato a siguiente workstream junto con B.

**F — Hallazgos de la prueba en vivo (28/10): ✅ MIGRADOS a `tareas/` el 29/10** como F-1…F-5. **F-1 es la única P1** (botón «Repetir y editar la del Día 1» de talento.html que "no hace nada").

**G — Pendientes surgidos de P0-03 (29-30/10, sin tarea propia aún — crear como F-6/F-7/M-37 en la próxima sesión si el usuario lo aprueba):**
- **Depurar admin.html** (petición explícita del usuario): separar actividades medulares de las secundarias; la página está sobrecargada.
- **puerta.html:** distinguir "sesión revocada/expirada" de "no encontrado" en las búsquedas (hoy ambas responden vacío con el mismo mensaje).
- **`f_admin_limpiar_todo`:** no reinicia `dia1_cerrado`/`dia2_cerrado` (pre-existente) — el próximo evento arrancaría con los días "cerrados" del anterior. **Decisión del usuario pendiente antes del próximo evento.**
- Renombrar `docs/Supabase Snippet Untitled query.csv` → `respaldo-funciones-pre-p003.csv` (higiene).
- Supabase Auth + MFA para admin: descartado en P0-03 (retomable como P2).

**Hoja de estilo de trato (28/10) + reglas del 29/10 (granularidad; una consulta SQL a la vez; ruta+commit por cambio; claves solo booleanos):** incorporadas como anexo permanente en `AGENTS.md` y registradas en `DECISIONES.md`.

## 4 · Siguiente paso inmediato

1. ✅ HECHO 29-30/10 (Sesión 15): **P0-03 completa en 6 fases** — sesiones solo-hash con expiración/revocación, rate limit probado en vivo, PINs bcrypt de 6 dígitos, salida real, auto-bloqueo, panel de sesiones; columna `token` eliminada. Evidencia en `docs/seguridad-sesiones.md`; tarea `hecho`; backlog actualizado.
2. **Próxima sesión:** verificación de §2 (¡incluye revisar el keep-alive, corre ~31/10!) y elegir UNA:
   - **P0-04 — QR local, dependencias vendorizadas y CSP** (continúa la línea de seguridad).
   - **P0-05 — Backups, exportación y limpieza segura.**
   - **F-1 — Reparar el botón «Repetir y editar la del Día 1»** de talento.html (la única P1 funcional).
   - **E — Manuales.**
   - Crear las tareas del workstream **G** (5-10 minutos, 3 archivos con PLANTILLA.md).
   Decisión del usuario al arrancar.
3. **Recordatorio operativo:** el keep-alive debe correr **~31/10** (run siguiente al #11 del 28/10). Si al arrancar la próxima sesión no aparece verde en Actions, revisar el workflow `keep-supabase-alive.yml`.
4. **Nota PINs:** desde P0-03, los PINs de admin y puerta son de **6 dígitos** y están rotados (el usuario los custodia en papel). Si se pierden: rotar desde el panel exige el PIN admin vigente; si se pierde el de admin, la recuperación es por base (nuevo hash bcrypt generado por el asistente con `pg_get_functiondef` → usuario ejecuta) — documentar en el manual E.

## 5 · Transición v2.4 → v3 (histórico)

- Los 4 archivos `prompt-traspaso-nitrotoon-v2.4-*.txt` fueron movidos a `historico/` el 28/10/2026 y **dejan de evolucionar**.
- Los prompts v2.0–v2.3 ya estaban en `historico/`.
- El método "4 txt por versión" queda sustituido por: `AGENTS.md` (reglas) + `ESTADO.md` (estado) + `ARQUITECTURA.md` (técnica) + `DECISIONES.md` (por qués) + `tareas/` (backlog). Todo versionado en el repo; los chats gratuitos pegan AGENTS.md + ESTADO.md; los agentes leen el repo directo.
- `texto-antes-inicio-obligatorio.txt` sigue sirviendo como frase de arranque; ahora debe referir a ESTADO.md en lugar de "los 4 archivos".
