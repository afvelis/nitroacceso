# ESTADO.md — Nitrotoon Control de acceso

Versión del archivo: **2** · Última actualización: **28/10/2026** · Generado en la sesión de migración v2.4→v3 (27-28/10/2026)

> Este archivo SOLO lleva el ESTADO del proyecto. Las reglas de trabajo viven en `AGENTS.md` (+ su anexo de continuidad v3). La arquitectura técnica vive en `ARQUITECTURA.md`. Los "por qués" viven en `DECISIONES.md`. Las tareas ejecutables viven en `tareas/`. Si este archivo contradice a `AGENTS.md`, manda `AGENTS.md`. Si contradice al repo, manda el repo.

---

## 1 · Estado de avance por módulo

| Módulo | Estado | Verificado |
| --- | --- | --- |
| Núcleo de acceso (index, dashboard, admin, coord, talento, stand, puerta, cortesia, cortesias, estadisticas) | ✅ En producción (evento 26/09/2026 ya pasó) | Sí — sin cambios HTML desde v2.4 |
| aliado.html (público, entra con ?a=ASI-xxx) | ✅ Completo (v2.3) | Sí |
| aliados.html (admin) | 🔄 Parcial — ver detalle abajo | Sí (raw leído 27/10) |
| aliados-concursos.html (historial por asignación) | ✅ Completo (v2.4) | Sí |
| acceso-denegado.html | ✅ Completo (v2.4) | Sí |
| Keep-alive Supabase (GitHub Actions) | ✅ Activo — última ejecución 25/10/2026 success | Sí (API Actions 27/10) |

**Detalle aliados.html (brief original de aliados-admin):**

| Paso del brief | Estado |
| --- | --- |
| 1. Listado con `f_admin_listar_aliados` | ✅ |
| 2. Nuevo aliado + modal (duplicados, cédula obligatoria) | ✅ |
| 3. Copiar link / WhatsApp / Correo / Ver concursos | ✅ |
| 7. Botón de acceso en dashboard.html ("🤝 Aliados") | ✅ |
| 4a. Ampliar cupones (modal con justificación) + desglose base+ampliado | ✅ 22/10/2026 (commit 95a6982 y 2eb4652) |
| 4b. Anular asignación | ❌ Pendiente |
| 4c. Anular aliado completo | ❌ Pendiente |
| 5. Agregar asignación al mismo aliado | ❌ Pendiente |
| 6. Pastilla "🤝 Gestionar aliados" en cortesias.html | ❌ Pendiente |

## 2 · Verificación de arranque (reemplaza el checklist de 5 preguntas de la v2.4)

Al iniciar cualquier sesión, se verifica en este orden. Cada punto dice quién lo hace según el modo: **AGENTE** (asistente con lectura de repo, p. ej. una sesión agéntica) o **CHAT GRATUITO** (el usuario es las manos del asistente y lo reporta mirando GitHub en el navegador).

1. **Repo y cambios recientes** — AGENTE: lee el árbol de archivos y los commits desde la última sesión y los compara con el manifiesto de ARQUITECTURA.md. CHAT GRATUITO: el usuario abre el repo en GitHub, revisa la lista de archivos y los commits recientes, y reporta qué ve (o pega el manifiesto y confirma archivo por archivo).
2. **tareas/** — AGENTE: lee los `estado:` del backlog. CHAT GRATUITO: el usuario abre `tareas/` y reporta los estados (o pega la tabla del README).
3. **Keep-alive** — AGENTE: revisa la última ejecución en Actions. CHAT GRATUITO: el usuario mira Actions y reporta si la última ejecución está en verde.
4. **Backend Supabase** — SIEMPRE el usuario (en ambos modos), SOLO si la sesión va a tocar RPC o esquema: ejecuta las Consultas A (funciones) y B (tablas/columnas) en el SQL Editor y pega los resultados. Los resultados vigentes quedan copiados en ARQUITECTURA.md.
5. **Excepción crítica** (heredada del método del Sponsorship Audit Engine, igual en ambos modos): si cualquier cosa no encaja (archivo que el manifiesto dice que existe y no está, contradicción entre ESTADO y repo, paso que no cuadra), DETENER y avisar en español llano. No reconstruir en silencio.

**Estado de la verificación vigente (28/10/2026):**

- Consulta A (RPC): ✅ cerrada el 27/10. 79 filas = 78 funciones + 1 sobrecarga. Los 3 hallazgos quedaron documentados en ARQUITECTURA.md (§4) con etiqueta [VERIFICAR].
- Consulta B (tablas): ✅ cerrada el 28/10 (tramo final: listas, personas, sesiones, stands, talentos, vendedores — todo coincide con la v2.4; única adición: sesiones.creada_at).
- ARQUITECTURA.md: ✅ sembrada el 28/10 con tablas, RPCs y manifiesto verificados (con las consultas A/B/C copiables al final).
- La verificación inicial del checklist v2.4 (5 preguntas) quedó **CERRADA AL 100%**.

## 3 · Workstreams activos

**A — Terminar el brief de aliados** (prioridad funcional): pasos 4b (anular asignación), 4c (anular aliado), 5 (agregar asignación), 6 (pastilla en cortesias.html). Las RPC necesarias ya existen y están verificadas: `f_admin_anular_asignacion`, `f_admin_anular_aliado`, `f_admin_crear_asignacion`.

**B — Backlog de seguridad** (`tareas/`, adoptado 27/10, aportado por colaborador de confianza): 12 tareas P0/P1/P2, todas `pendiente`. Orden recomendado: P0-01 (XSS) → P0-02 (RLS) → P0-03 (sesiones) → P0-04 (QR/CSP) → P0-05 (backups). Se trabaja UNA tarea a la vez según `AGENTS.md`.

**C — Ideas de producto pendientes** (heredadas de PENDIENTES v2.4; se migrarán a `tareas/` con `PLANTILLA.md` conforme se activen): historial global de concursos (`concursos.html`); extender M-28/M-31 a cortesias/estadisticas/admin; origen (admin vs aliado) en dashboard; razón de anulación al ganador; "ganadas" en vez de "asignadas" en cortesia.html; aviso de concursos sin ganador; motor de envío automático (M-01); tarjetas clicables del dashboard; módulo post-evento (M-21); anti-colisión de códigos (M-22); RBAC (M-29); PIN admin robusto (M-30); unificar NOMBRE_EVENTO "NITROACCESO"→"Nitrotoon" en config.js.

**D — Hallazgos RPC del 27/10** (solo documentar por ahora, decisión del usuario):
1. `f_coord_crear_stand` existe con DOS firmas (sobrecarga: con y sin `p_nombre`) — riesgo PGRST202; verificar cuál usa coord.html antes de cualquier DROP.
2. `f_puerta_activar_dia2(p_token uuid)` existe y no estaba documentada.
3. `rls_auto_enable()` existe y no estaba documentada (posible helper del colaborador).
Estas 3 quedaron documentadas en ARQUITECTURA.md (§4) con etiqueta `[VERIFICAR]`.

## 4 · Siguiente paso inmediato

1. ✅ HECHO 28/10: los 3 documentos están en la RAÍZ del repo; `AGENTS.md` quedó LIMPIO con el anexo v3 consolidado (commit "docs: AGENTS.md limpio, anexo v3 consolidado", verificado por el asistente); la guía del método está subida (GUIA-Metodo-Continuidad-v3.pdf).
2. 🔲 PENDIENTE — sincronizar repo con las copias locales: re-subir desde `moduloAcceso\continuidad\` los 3 .md (ESTADO.md v2, DECISIONES.md, ARQUITECTURA.md) con el lápiz (Ctrl+A → Ctrl+V → commit → 🟢), porque el repo tiene las versiones previas con referencias viejas `continuidad/`. Después el asistente re-verifica y declara LISTO para entrar al proyecto.
3. Con el método afinado: elegir workstream — **A** (terminar brief de aliados: anular asignación, anular aliado, agregar asignación, pastilla) o **B** (backlog P0-01 XSS) — cada paso con su PRUEBA de objetivo.

## 5 · Transición v2.4 → v3 (histórico)

- Los 4 archivos `prompt-traspaso-nitrotoon-v2.4-*.txt` fueron movidos a `historico/` el 28/10/2026 y **dejan de evolucionar**.
- Los prompts v2.0–v2.3 ya estaban en `historico/`.
- El método "4 txt por versión" queda sustituido por: `AGENTS.md` (reglas) + `ESTADO.md` (estado) + `ARQUITECTURA.md` (técnica) + `DECISIONES.md` (por qués) + `tareas/` (backlog). Todo versionado en el repo; los chats gratuitos pegan AGENTS.md + ESTADO.md; los agentes leen el repo directo.
- `texto-antes-inicio-obligatorio.txt` sigue sirviendo como frase de arranque; ahora debe referir a ESTADO.md en lugar de "los 4 archivos".
