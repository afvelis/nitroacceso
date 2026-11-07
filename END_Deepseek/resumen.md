# 📋 RESUMEN — NitroSystem (módulo de control de acceso)
## Guía de transición para el nuevo agente (31/10/2026)

---

## 🏠 Dónde vive el proyecto

**Repo de GitHub:** `https://github.com/afvelis/nitroacceso` (rama `main`, GitHub Pages)  
**Owner:** `afvelis`  
**No tienes acceso al disco del usuario** — pero sí puedes leer/escribir en el repo vía GitHub API.  
El usuario sube archivos manualmente a GitHub con "Upload files" (arrastrar) o con el lápiz (Ctrl+A → Ctrl+V). Tú le das el texto de commit exacto y el usuario hace el commit.

**Cómo leer el repo:**  
Usa `web_fetch` con URLs `raw.githubusercontent.com` para leer cualquier archivo.  
Ejemplo: `https://raw.githubusercontent.com/afvelis/nitroacceso/main/ESTADO.md`  
O usa la GitHub API para listar archivos/blobs: `https://api.github.com/repos/afvelis/nitroacceso/contents/ruta/al/archivo`

---

## 📦 Lo que YA estás recibiendo en esta carpeta

Estos archivos fueron copiados del cierre de la Sesión 18 (31/10/2026). Léalos en este orden:

1. **[ESTADO.md](ESTADO.md)** — El corazón. Dice qué está hecho, qué falta, y cuál es el siguiente paso inmediato. Léelo primero.
2. **[DECISIONES.md](DECISIONES.md)** — El "por qué" de cada decisión tomada. Append-only (nunca se borra, se agrega).
3. **[tareas/README.md](tareas/README.md)** — El backlog. Tabla con todas las tareas, su estado, prioridad y dependencias.
4. **[tareas/P0-05-backups-limpieza.md](tareas/P0-05-backups-limpieza.md)** — Tu primera tarea: la P0-05 ya está **HECHA**. La marca de `hecho` es la evidencia de que el agente anterior la completó. Úsala como referencia de cómo se documenta una tarea.
5. **[tareas/M-37-multi-evento.md](tareas/M-37-multi-evento.md)** — Visión aprobada por el usuario para el futuro (multi-evento, dashboard como centro de control). **NO arrancar hoy.** Depende de P1-04 (staging).
6. **[tareas/M-38-aprobacion-coordinadores.md](tareas/M-38-aprobacion-coordinadores.md)** — Aprobación de coordinadores desde el dashboard. Tarea registrada pero no priorizada aún.
7. **[SEGURIDAD-NitroSystem.md](SEGURIDAD-NitroSystem.md)** — Garantías de seguridad (G1-G8) y protocolo de mejora continua.
8. **[CONTINUIDAD-18-19.txt](CONTINUIDAD-18-19.txt)** — Instrucciones concretas de cómo subir el lote de cierre al repo.
9. **[CONTINUIDAD-URGENTE-S18.txt](CONTINUIDAD-URGENTE-S18.txt)** — Punto exacto donde se cortó la sesión 18 (por falla eléctrica).

---

## 🎯 DONDE ESTAMOS AHORA (31/10/2026)

### Lo que YA funciona en producción

| Módulo | Estado | Notas |
|---|---|---|
| P0-01 XSS | ✅ Hecho 28/10 | Escape central, probado en vivo |
| P0-02 RLS/autorización | ✅ Hecho 29/10 | 16/16 tablas con RLS, 0 privilegios |
| P0-03 Sesiones/PINs | ✅ Hecho 29-30/10 | PINs 6 dígitos bcrypt, rate limit, auto-bloqueo 5 min, sesiones 8h solo-hash |
| P0-04 QR/CSP | 🟡 4/5 fases | Fases 1-4a hechas y verificadas. **Falta fase 4b:** 9 páginas sin CSP (121 conversiones). |
| P0-05 Respaldo | ✅ Hecho 31/10 (alcance A) | Exportación JSON + candado doble + PIN + confirmación tipada + dry-run. Fases B-D absorbidas por M-37. |
| P0-06 Metaetiquetas | ✅ Hecho 31/10 | `no-referrer` y `noindex` reubicados en las 14 páginas. |

**Páginas del sistema (14 en total):**  
`index.html`, `dashboard.html`, `admin.html`, `coord.html`, `talento.html`, `stand.html`, `puerta.html`, `cortesia.html`, `cortesias.html`, `estadisticas.html`, `aliado.html`, `aliados.html`, `aliados-concursos.html`, `acceso-denegado.html`

### Lo que YA está verificado en el repo (blobs)

- `admin.html`: blob `58d2cc2163843b07997c31bacb741ab1d378766a` (7749 bytes) — commit `d36ec9b5`
- `js/admin.js`: blob `209f50c66780814ddd9fe70310f51aa69f4e578e` (44752 bytes) — commit `8e5fac99`
- Actions: Pages #251 y #252 verdes
- Todas las demás páginas y scripts tienen blobs verificados en sesiones anteriores

### Lo que FALTA (orden recomendado)

| # | Tarea | Prioridad | Estado | Notas |
|---|---|---|---|---|
| 1 | **P0-04 fase 4b** (CSP en 9 páginas) | P0 crítico | pendiente | 121 conversiones: `style=` → clases planas + `sha256` en CSP. Método en notas de P0-04. |
| 2 | **F-1** botón "Repetir y editar" de talento.html | P1 | pendiente | Botón que "no hace nada". Único P1 funcional. |
| 3 | F-2…F-5 (hallazgos menores) | P2 | pendiente | Orden, QR, parámetros, edición abierta/cerrada. |
| 4 | M-33…M-36 (ideas de producto) | P2 | pendiente | Humanizar vista anulada, fecha creación, nombres de premios, módulo reclamos. |
| 5 | M-37 (multi-evento) | P2 | pendiente | NO ARRANCAR HOY. Depende de P1-04 (staging) y cerrar la deuda. |
| 6 | M-38 (coordinadores desde dashboard) | P2 | pendiente | Registrar solicitud → aprobar/rechazar. |

---

## 📋 REGLAS DE ORO (NO las rompas)

Estas reglas vienen de `AGENTS.md` del repo. Son no negociables:

1. **UNA acción por turno.** Nunca un "testamento" de pasos. Dile al usuario qué hacer, espera confirmación, luego avanza.
2. **El usuario sube los archivos a GitHub** (nunca tú). Tú le das el texto del commit exacto y el destino correcto. Sube TODO por "Upload files" (arrastrar). Si GitHub falla, plan B = lápiz (Ctrl+A → Ctrl+V).
3. **Archivos SIEMPRE finales y completos.** Nunca parches por fragmentos. El usuario reemplaza con Ctrl+A → Ctrl+V.
4. **SQL ejecutado por el usuario** en el SQL Editor de Supabase. Tú lo escribes, él lo ejecuta.
5. **UNA consulta SQL con resultados a la vez.** La ventana del usuario no permite pegar varios.
6. **Verificación con huella blob.** Antes de decir "correcto", verifica que el blob en GitHub coincide con lo que tú generaste (`git hash-object` en el repo → `blob %d\0` → sha1).
7. **Actions verde obligatorio.** Todo commit debe tener el workflow de GitHub Pages en verde antes de que el usuario pruebe.
8. **Nada destructivo sin aprobación.** Borros, SQL de escritura, DROPs → pedir aprobación explícita.
9. **Si algo no encaja: DETENER y avisar.** No reconstruir en silencio.
10. **El "Success" de Supabase NO es verificación.** Siempre hay que hacer una consulta de conteo para confirmar que el SQL se aplicó donde debía.

---

## 🏗️ Arquitectura rápida (lo esencial)

**Stack:** HTML/JS vanilla (sin build) → GitHub Pages + Supabase (Postgres → RPC).

**Modelo de roles:** 3 roles con login propio → admin, coord, puerta. Cada uno tiene su PIN (6 dígitos, bcrypt). La sesión viaja como hash SHA-256 (el token en claro solo llega UNA vez al navegador).

**Cómo se comunica el frontend con Supabase:**  
`config.js` expone `llamar(nombre, args)` que hace `fetch` a `/rest/v1/rpc/`. Las RPC son `SECURITY DEFINER` (corren con privilegios del propietario, validan sesión con `f_sesion_rol(p_token)` que devuelve el rol).

**Tablas clave (resumen):**
- `config`: `edicion_abierta`, `dia_activo`, `dia1_cerrado`, `dia2_cerrado` (configuración del evento actual)
- `eventos`: almacena informes (snapshots de estadísticas y detalle del evento)
- `sesiones`: `token_hash`, `rol`, `expira`, `creada_at`, `ultimo_uso`
- `login_intentos`: rate limiting (5 fallas/15 min → bloqueo)
- `talentos`, `listas`, `personas` (flujo de talentos)
- `stands`, `vendedores` (flujo de stands)
- `cortesias`, `cortesia_listas`, `cortesia_personas` (cortesías/pases)
- `coordinadores`: tipos `talentos` o `stands`, códigos de acceso
- `aliados`, `aliado_asignaciones`, `aliado_concursos`, `aliado_ampliaciones` (módulo de aliados)
- `aliado_ampliaciones`: registro de ampliaciones de cupones

**RPCs importantes:**
- `f_login(p_pin)` → validación, devuelve `{token, rol}` o error "BLOQUEADO"
- `f_logout(p_token)` → revoca la sesión actual
- `f_admin_limpiar_todo(p_token)` → borra tablas de trabajo (NO aliados, NO informes)
- `f_admin_guardar_evento(p_token, p_nombre)` → guarda snapshot del evento → devuelve `id`
- `f_admin_ver_evento(p_token, p_id)` → lee snapshot → devuelve `{nombre, creado_at, stats, detalle}`
- `f_sesion_rol(p_token)` → devuelve el rol del token ('admin', 'coord', 'puerta')

---

## 🔧 Flujo de trabajo típico

1. **Leer ESTADO.md y tareas/README.md** del repo → saber qué toca hacer.
2. **Elegir UNA tarea** con `estado: pendiente`, prioridad más alta, dependencias resueltas.
3. **Cambiar a `estado: en_progreso`** en el frontmatter del archivo de la tarea.
4. **Implementar:** generar archivos completos (HTML/JS/SQL). Para SQL: pedir al usuario que ejecute `pg_get_functiondef` de la función que se va a cambiar, esperar su respuesta, luego escribir la versión nueva.
5. **Entregar al usuario:** "Sube este archivo a esta ruta del repo" + texto de commit exacto.
6. **Esperar que el usuario diga "subido".**
7. **Verificar:** usar `web_fetch` para leer el blob desde GitHub → comparar hash con lo que tú generaste → verificar Actions verde con `api.github.com/.../actions/runs`.
8. **Solo entonces decir "correcto"** y dar el siguiente paso.
9. **Al terminar la tarea:** marcar `estado: hecho`, agregar `## Notas de implementación`, entregar lote de cierre (actualizar ESTADO.md, DECISIONES.md, README del backlog, etc.).

---

## 🚨 Puntos de atención CRÍTICOS

1. **CSP (P0-04 fase 4b):** La CSP va por `<meta>` (GitHub Pages no permite cabeceras). Sin `'unsafe-inline'`. Se bloquea `style=` y `on*=` en HTML y en JS (plantillas HTML con `innerHTML`). Se reemplazan por clases CSS planas + CSSOM. Cada página tiene su propio `sha256` del bloque `<style>`. **NO cambies el hash de las 5 páginas ya protegidas** (index, coord, admin, estadisticas, acceso-denegado) — el hash es único por página y no se puede reutilizar.

2. **`f_admin_limpiar_todo` borra las 10 tablas de trabajo pero NO borra `dia1_cerrado`/`dia2_cerrado`.** El próximo evento arrancaría con los días "cerrados" del anterior. Decisión del usuario pendiente. **M-37 (multi-evento) sustituirá esto por "cierre-archivado" que no borra nada.**

3. **Aliados NO se borran con `f_admin_limpiar_todo`.** Esto fue confirmado en P0-05: la limpieza borra personas, listas, talentos, vendedores, stands, coordinadores, sesiones, login_intentos, cortesias, cortesia_personas... pero **NUNCA** aliados, asignaciones, ni concursos.

4. **El blob hash se calcula así:** `sha1("blob " + longitud + "\0" + contenido)`. No uses `git hash-object` directamente — usa la fórmula exacta.

5. **El usuario habla español llano (nivel no experto).** No usar jerga técnica innecesaria. Ser conciso.

6. **P0-05 paso 3 (modal de confirmación):** El usuario paró la prueba en vivo al ver la tabla de conteos pero no la completó al 100%. La funcionalidad del modal (validación del nombre, botón gris/habilitado, Cancelar en PIN) es operativa pero no fue probada con evidencia completa. Si necesitas re-probar, la pista está en las notas de implementación de P0-05.

7. **Keep-alive:** GitHub Actions corre cada 3 días (`keep-supabase-alive.yml`). El último run reportado fue el #12 el 31/10 a las 13:08 local. Verifica que siga corriendo.

---

## 📌 Decisiones del usuario que afectan tu trabajo

1. **Upload para TODO incl. .md** (derogada regla del lápiz). Subir por arrastre es el método oficial; si GitHub falla → plan B lápiz.
2. **Multi-evento (M-37) es la visión aprobada para el futuro,** pero SOLO se inicia tras cerrar la deuda (F-1, etc.) y con staging (P1-04). **NO arranques M-37 hoy.**
3. **Aprobación de coordinadores desde dashboard (M-38)** quedó registrada pero sin brief aún.
4. **El usuario quiere cerrar la deuda actual** antes de escalar. Prioridad: P0-04 4b → F-1 → F-2…F-5 → M-33…M-36.
5. **"No se ejecuta nada destructivo sin aprobación explícita del usuario."**

---

## 🗺️ Tu primera misión (orden del usuario)

El usuario pidió explícitamente **"cerrar todos los errores y cosas por hacer de lo que tengo ya"** antes de arrancar con la escalabilidad. Eso significa:

**ORDEN DE EJECUCIÓN (uno a la vez, como siempre):**

1. **P0-04 fase 4b** (CSP en las 9 páginas faltantes: puerta 22, stand 14, talento 0, cortesia 8, cortesias 14, dashboard 9, aliados 20, aliados-concursos 8, aliado 20).
2. **F-1** (botón "Repetir y editar la del Día 1" de talento.html — P1 funcional, botón que no hace nada).
3. **F-2…F-5** (pendientes menores, el usuario los elige uno a uno).
4. **M-33…M-36** (ideas de producto, el usuario los elige).
5. **M-37** (multi-evento): SOLO cuando 1-4 estén completas Y P1-04 (staging) esté disponible.

Cada tarea debe completarse con: evidencia, verificación, y actualización del README del backlog + ESTADO.md.

---

## 📞 Cómo contactarte con el usuario (resumen de su forma de trabajar)

- **Sube archivos:** tú generas → le dices "sube esto a esta ruta" → usuario sube → tú verificas → "correcto" → siguiente paso.
- **SQL:** tú escribes → se lo das al usuario → él ejecuta en SQL Editor → pega resultado → tú verificas.
- **Pruebas en vivo:** tú le dices "abre X URL, pulsa Y botón, debe verse Z". El usuario reporta por texto.
- **Si el usuario dice "CERRAR SESIÓN" o "handoff":** generas el lote de cierre completo (ESTADO.md, DECISIONES.md, tareas/, SEGURIDAD-NitroSystem.md, TXT continuidad) y te despides.

---

## ✅ Checklist rápido para empezar esta sesión

- [ ] Leer `ESTADO.md` (ya lo tienes en esta carpeta)
- [ ] Leer `tareas/README.md` (ya lo tienes en esta carpeta)
- [ ] Leer `tareas/P0-04-qr-csp-dependencias.md` del repo (tiene el método a repetir para la fase 4b)
- [ ] Elegir: P0-04 4b, F-1, o lo que el usuario decida
- [ ] Empezar UNA tarea a la vez, con UNA instrucción a la vez

---

*Este resumen fue generado el 31/10/2026 por el agente DeepSeek de la Sesión 18.  
Proyecto: NitroSystem — Control de acceso (GitHub Pages + Supabase).  
Repo: github.com/afvelis/nitroacceso (main).  
Próximo agente: que tengas suerte. 🚀*