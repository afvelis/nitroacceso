# ESTADO.md — NitroSystem (control de acceso)

Versión del archivo: **4** · Última actualización: **28/10/2026** · Generado en el cierre de la Sesión 13 (28/10/2026)

> Este archivo SOLO lleva el ESTADO del proyecto. Las reglas de trabajo viven en `AGENTS.md` (+ sus anexos: continuidad v3 y estilo de trato). La arquitectura técnica vive en `ARQUITECTURA.md`. Los "por qués" viven en `DECISIONES.md`. Las tareas ejecutables viven en `tareas/`. Si este archivo contradice a `AGENTS.md`, manda `AGENTS.md`. Si contradice al repo, manda el repo.

---

## 1 · Estado de avance por módulo

| Módulo | Estado | Verificado |
| --- | --- | --- |
| Núcleo de acceso (index, dashboard, admin, coord, talento, stand, puerta, cortesia, cortesias, estadisticas) | ✅ En producción (evento 26/09/2026 ya pasó) · Rebranding NitroSystem aplicado 28/10 · **P0-01 XSS aplicado y probado en vivo 28/10** | Sí (blobs + Actions #166/#167) |
| aliado.html (público, entra con ?a=ASI-xxx) | ✅ Completo (v2.3) | Sí |
| aliados.html (admin) | ✅ **COMPLETO — brief cerrado al 100% el 28/10/2026** (detalle abajo) | Sí |
| aliados-concursos.html (historial por asignación) | ✅ Completo (v2.4) | Sí |
| acceso-denegado.html | ✅ Completo (v2.4) | Sí |
| Keep-alive Supabase (GitHub Actions) | ✅ Activo — run **#11** verde 28/10 14:15 local (event schedule), cadencia cada 3 días, próximo ~31/10 | Sí (API Actions 28/10) |

**Brief de aliados (workstream A) — cerrado:**

| Paso | Estado |
| --- | --- |
| 1. Listado con `f_admin_listar_aliados` | ✅ |
| 2. Nuevo aliado + modal (duplicados, cédula obligatoria) | ✅ |
| 3. Copiar link / WhatsApp / Correo / Ver concursos | ✅ |
| 7. Botón de acceso en dashboard.html ("🤝 Aliados") | ✅ |
| 4a. Ampliar cupones (modal con justificación) + desglose base+ampliado | ✅ 22/10 — **semántica de SUMA corregida 28/10 (BUG-1)** |
| 4b. Anular asignación (🚫, aviso M-04, razón ≥3 caracteres) | ✅ 28/10 |
| 4c. Dar de baja al aliado (caja explicativa + contador de asignaciones activas) | ✅ 28/10 |
| 5. Agregar asignación al mismo aliado (multi-pool + modal de compartir) | ✅ 28/10 |
| 6. Pastilla "🤝 Gestionar aliados" en cortesias.html | ✅ 28/10 |

**Rebranding NitroSystem (28/10/2026):** 15 archivos (14 HTML + config.js), 50 reemplazos, formato **"Solo NitroSystem"** (decisión del usuario). Intactos a propósito: repo y URLs `nitroacceso`, Instagram `@nitrotoon`. Commit "feat: rebranding NitroSystem (paso 5)", Actions #160 verde. Detalle en DECISIONES.md.

**P0-01 — Eliminar el XSS almacenado (28/10/2026, Sesión 13):** 10 archivos (config.js + 8 HTML + `tareas/P0-01-xss-escape.md`), commits `44ef31ab` (fix) y `53ab76ff` (docs), Actions #166/#167 verdes. Escape central `escaparHtml()`/`NA.esc` en config.js + validaciones de entrada como defensa en profundidad. Probado en vivo con ejemplo desde cero: la validación RECHAZA el payload en formularios públicos (no llega a la base) y el escape se verificó con un nombre legítimo con apóstrofe y comillas, intacto en talento → puerta → vista de lista completada; autorización funcionó de punta a punta (no-regresión). Ejemplo de prueba eliminado del SQL Editor por id exacto (verificación en 0 filas). Tarea marcada `hecho`. Detalle completo en `tareas/P0-01-xss-escape.md` (Notas de implementación).

## 2 · Verificación de arranque (reemplaza el checklist de 5 preguntas de la v2.4)

Al iniciar cualquier sesión, se verifica en este orden. Cada punto dice quién lo hace según el modo: **AGENTE** (asistente con lectura de repo, p. ej. una sesión agéntica) o **CHAT GRATUITO** (el usuario es las manos del asistente y lo reporta mirando GitHub en el navegador).

1. **Repo y cambios recientes** — AGENTE: lee el árbol de archivos y los commits desde la última sesión y los compara con el manifiesto de ARQUITECTURA.md. CHAT GRATUITO: el usuario abre el repo en GitHub, revisa la lista de archivos y los commits recientes, y reporta qué ve (o pega el manifiesto y confirma archivo por archivo).
2. **tareas/** — AGENTE: lee los `estado:` del backlog. CHAT GRATUITO: el usuario abre `tareas/` y reporta los estados (o pega la tabla del README).
3. **Keep-alive** — AGENTE: revisa la última ejecución en Actions. CHAT GRATUITO: el usuario mira Actions y reporta si la última ejecución está en verde.
4. **Backend Supabase** — SIEMPRE el usuario (en ambos modos), SOLO si la sesión va a tocar RPC o esquema: ejecuta las Consultas A (funciones) y B (tablas/columnas) en el SQL Editor y pega los resultados. Los resultados vigentes quedan copiados en ARQUITECTURA.md.
5. **Excepción crítica** (heredada del método del Sponsorship Audit Engine, igual en ambos modos): si cualquier cosa no encaja (archivo que el manifiesto dice que existe y no está, contradicción entre ESTADO y repo, paso que no cuadra), DETENER y avisar en español llano. No reconstruir en silencio.

**Estado de la verificación vigente (28/10/2026, cierre de la Sesión 13):**

- Consulta A (RPC): ✅ cerrada el 27/10. 79 filas = 78 funciones + 1 sobrecarga. Los 3 hallazgos [VERIFICAR] siguen en ARQUITECTURA.md §4, sin decisión de limpieza aún.
- Consulta B (tablas): ✅ cerrada el 28/10.
- Sesión 13: NO se tocó el esquema de Supabase (solo DELETEs acotados del ejemplo de prueba, ejecutados y verificados por el usuario en el SQL Editor). Verificación de arranque ejecutada en modo agente: 4 archivos de continuidad comparados blob a blob con `main`, keep-alive run #11 verde. Árbol del repo verificado blob a blob tras cada upload del día (`44ef31ab`, `53ab76ff`).
- La verificación inicial del checklist v2.4 (5 preguntas) sigue **CERRADA AL 100%**.

## 3 · Workstreams activos

**A — Brief de aliados: ✅ CERRADO 28/10/2026** (ver §1). Sin trabajo pendiente.

**B — Backlog de seguridad** (`tareas/`): 12 tareas adoptadas 27/10. **P0-01 (XSS) HECHO 28/10 (Sesión 13)** — ver §1. Quedan 11 `pendiente`. Orden recomendado: **P0-02 (RLS)** → P0-03 (sesiones) → P0-04 (QR/CSP) → P0-05 (backups), luego P1/P2. Se trabaja UNA tarea a la vez según `AGENTS.md`.

**C — Ideas de producto pendientes** (se migrarán a `tareas/` con `PLANTILLA.md` conforme se activen): historial global de concursos (`concursos.html`); extender M-28/M-31 a cortesias/estadisticas/admin; origen (admin vs aliado) en dashboard; razón de anulación al ganador; "ganadas" en vez de "asignadas" en cortesia.html; aviso de concursos sin ganador; motor de envío automático (M-01); tarjetas clicables del dashboard; módulo post-evento (M-21); anti-colisión de códigos (M-22); RBAC (M-29); PIN admin robusto (M-30). **M-33** humanizar la vista "anulada" del aliado; **M-34** fecha de creación en la tarjeta del admin; **M-35** mostrar nombres de premios anulados (requiere cambio de RPC); **M-36** módulo de reclamos.

**D — Hallazgos RPC del 27/10** (solo documentar por ahora, decisión del usuario):
1. `f_coord_crear_stand` existe con DOS firmas (sobrecarga: con y sin `p_nombre`) — riesgo PGRST202; verificar cuál usa coord.html antes de cualquier DROP.
2. `f_puerta_activar_dia2(p_token uuid)` existe y no estaba documentada.
3. `rls_auto_enable()` existe y no estaba documentada (posible helper del colaborador).
Estas 3 quedan documentadas en ARQUITECTURA.md (§4) con etiqueta `[VERIFICAR]`.

**E — Manuales (solicitud del usuario, 28/10):** manual de uso por módulo (para usuarios finales), memoria técnica viva (ARQUITECTURA.md como evolución) y manual de reparación. Candidato a siguiente workstream junto con B.

**F — Hallazgos de la prueba en vivo (Sesión 13, 28/10)** — descubiertos por el usuario durante la verificación de P0-01; por migrar a `tareas/` con `PLANTILLA.md`:
- **F-1** El botón "Repetir y editar la del Dia 1" (talento.html:296 → RPC `f_link_talento_copiar`) no copió la lista del Día 1 al Día 2 en la prueba del usuario ("no hace nada"). Investigar: `pg_get_functiondef` de `f_link_talento_copiar` + consola del navegador al pulsarlo.
- **F-2** "Mis links" de coord.html ordena del más viejo al más nuevo (el recién creado queda al fondo) y no muestra cupo. Propuesta del usuario: historial colapsable con los 2 últimos creados visibles, en orden de creación; evaluar mostrar cupo/registrados por link.
- **F-3** Revalidar la lógica edición-abierta / edición-cerrada módulo por módulo: qué bloqueos se mantienen (puerta muere con edición abierta; stand/talento ocultan formularios con edición cerrada) y cuáles se ajustan, evitando consecuencias sobre los datos del evento.
- **F-4** El QR del talento no muestra el código corto en pantalla (stand.html sí lo muestra; el texto del talento pide "dicta el codigo corto" que no se ve). Corrección de 1 línea en construirCajaQR.
- **F-5** Los parámetros `?lista=`/`?v=` se pierden si no hay sesión previa de puerta (puerta.html:1159-1174: solo rellenan el campo si `tokenSesion` ya existe; el usuario lo rodeó pegando el código `L-0765D8` en el buscador manual). Mejora: releer `location.search` tras el login de puerta.

**Hoja de estilo de trato (acuerdo del usuario, 28/10, Sesión 13):** incorporada como anexo permanente en `AGENTS.md` y registrada en `DECISIONES.md`. Toda sesión futura (chat gratuito o agente) la recibe automáticamente.

## 4 · Siguiente paso inmediato

1. ✅ HECHO 28/10 (Sesión 13): P0-01 XSS completo (implementación, prueba en vivo de las dos capas, limpieza del ejemplo, tarea `hecho` publicada), hoja de estilo incorporada en AGENTS.md, este cierre documental (ESTADO v4 + DECISIONES).
2. ✅ HECHO 28/10 (Sesión 13): copias locales del PC sincronizadas con el repo (blobs verificados iguales al arrancar; al cierre, ESTADO/AGENTS/DECISIONS se editan en local y sube el usuario).
3. Próxima sesión: verificación de §2 y elegir workstream — **B — P0-02 (RLS)**, **E — manuales**, o **higiene documental** (migrar M-33…M-36 y F-1…F-5 a `tareas/` con `PLANTILLA.md`). Decisión del usuario al arrancar.

## 5 · Transición v2.4 → v3 (histórico)

- Los 4 archivos `prompt-traspaso-nitrotoon-v2.4-*.txt` fueron movidos a `historico/` el 28/10/2026 y **dejan de evolucionar**.
- Los prompts v2.0–v2.3 ya estaban en `historico/`.
- El método "4 txt por versión" queda sustituido por: `AGENTS.md` (reglas) + `ESTADO.md` (estado) + `ARQUITECTURA.md` (técnica) + `DECISIONES.md` (por qués) + `tareas/` (backlog). Todo versionado en el repo; los chats gratuitos pegan AGENTS.md + ESTADO.md; los agentes leen el repo directo.
- `texto-antes-inicio-obligatorio.txt` sigue sirviendo como frase de arranque; ahora debe referir a ESTADO.md en lugar de "los 4 archivos".
