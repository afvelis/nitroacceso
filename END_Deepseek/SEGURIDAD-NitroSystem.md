# SEGURIDAD-NitroSystem.md — Garantías de seguridad y protocolo de mejora

Versión: **1** · 31/10/2026 · **Archivo LOCAL — no se sube al repo.** Lo lee cualquier IA (agéntica o de chat) antes de escribir una sola línea de código de este proyecto. Se actualiza en cada «CERRAR SESIÓN».

> CÓMO USAR ESTE ARCHIVO: define las garantías de seguridad YA GANADAS por el proyecto y las reglas que todo desarrollo nuevo debe traer **de fábrica**, no como arreglo posterior. Complementa (no reemplaza) a `AGENTS.md` (reglas de trabajo), `ESTADO.md` (estado), `ARQUITECTURA.md` (técnica) y `DECISIONES.md` (por qués). Si detectas que una regla de aquí es falla, está obsoleta o es mejorable, NO lo callas y NO lo arreglas en silencio: aplica el **Protocolo de mejora continua** (§6).

---

## 1 · Postura general del proyecto

- App estática (HTML/JS vanilla, sin build) servida por **GitHub Pages** + backend **Supabase** (Postgres + funciones RPC). Sin servidor propio, sin Cloudflare (confirmado por cabeceras: `server: GitHub.com`).
- **El cliente es territorio hostil**: todo lo que corre en el navegador puede ser leído, modificado y reenviado. La autoridad vive SIEMPRE en la base de datos (RLS + RPC), nunca en el JS.
- La clave `anon` de Supabase es **pública por diseño**. La seguridad NUNCA depende de ocultarla: depende de RLS, de permisos de funciones y de sesiones.
- Modelo de amenaza: (a) XSS e inyección de scripts en páginas; (b) robo de códigos de pase (son credenciales portadoras: quien ve un código, entra); (c) abuso directo de RPC saltándose la UI; (d) sesiones/PIN robados; (e) dependencias comprometidas (supply chain); (f) **errores introducidos por la propia IA de desarrollo** (reconstrucciones de memoria, conversiones masivas que pierden piezas, "simplificaciones" que quitan validaciones).

## 2 · Las 8 garantías ganadas (reglas duras)

**G1 · CSP estricta por `<meta>` en TODAS las páginas (14/14 desde el 30/10/2026).**
- Plantilla: `default-src 'self'; script-src 'self'[ + 'sha256-…' por cada script inline]; img-src 'self' data: blob:; connect-src 'self' https://exrbwctegkzxurzwihvh.supabase.co; font-src 'self'; form-action 'none'; base-uri 'none'; object-src 'none'; style-src 'self' 'sha256-…'`.
- Jamás `'unsafe-inline'`. Un hash por cada bloque `<style>` (algunas páginas tienen dos). La CSP va justo debajo de `<meta charset="UTF-8">`.
- **Los hashes se recalculan desde el archivo FINAL** (después de la última edición de CSS o del mini-script). Un hash viejo deja la página sin estilos.
- La CSP NO bloquea las escrituras CSSOM (`el.style.x = …`); SÍ bloquea el `style="…"` escrito en el HTML — **incluido el que viaja dentro de plantillas `innerHTML` de los `js/`**. Contar conversiones solo del HTML da números falsos.

**G2 · Anti-XSS (P0-01, cerrada 28/10).** Datos dinámicos nunca van a `innerHTML` sin escapar. Preferir `textContent` y `data-*` + plantillas. El escape de P0-01 es la referencia; cualquier salida nueva pasa por él.

**G3 · Autorización en la base (P0-02, cerrada 29/10).** RLS activo en 16/16 tablas, 0 privilegios públicos, sin `EXECUTE` para `PUBLIC`, `search_path` fijado en todas las funciones, matriz de autorización verificada por consultas. Toda función nueva nace con RLS/permisos revisados; una RPC nueva sin revisión de permisos es un fallo, no una deuda.

**G4 · Sesiones y credenciales (P0-03, cerrada 29-30/10).** Tokens de sesión guardados **solo hasheados** (SHA-256; PK por `token_hash`, la columna plana se eliminó), con expiración, revocación y último uso. Rate limit 5 intentos / 15 min por IP. PINs bcrypt de 6 dígitos. Auto-bloqueo por intentos fallidos. Jamás volver a guardar tokens planos.

**G5 · Dependencias vendorizadas (P0-04 fases 1-3).** Cero CDN, cero servicios externos: QR generado local (`vendor/qrcode-generator-1.4.4.js` + gancho UTF-8) y lectura con `vendor/jsqr-1.4.0.js`. Los códigos de pase jamás viajan a servicios de terceros. Si alguna vez se necesita un script externo: con `integrity` + `crossorigin` y justificación escrita.

**G6 · Metadatos de privacidad por página.** `<meta name="referrer" content="no-referrer">` y `<meta name="robots" content="noindex, nofollow">` en las páginas sensibles (pases, admin, puerta).
- ⚠️ **ESTADO ACTUAL (31/10/2026): REGRESIÓN ABIERTA.** Los metas NO están en `main` (verificado leyendo los archivos): una edición posterior a la fase 2 los borró de todas las páginas. Es la primera tarea correctiva P0 de la sesión 18. Toda página nueva debe nacer con ellos para no engrosar la deuda.

**G7 · Integridad de los cambios (lecciones de la sesión 17, en DECISIONES.md).** Clases de mostrar/ocultar **planas** (sin `!important` ni `@layer`) para que el JS pueda ganarlas por CSSOM (incidente: puerta en blanco). Conversiones masivas con **prueba de igualdad de ids** original vs entregable (incidente: stand). Todo cambio verificado por **blob sha1 contra `main`** antes de declararlo "correcto". `node --check` para los `js/`. Actions en verde ANTES de probar; pruebas con `Ctrl+F5` (caché de Pages: 10 min) mirando la consola.

**G8 · Higiene operativa.** Nunca imprimir códigos reales V-/STD/cortesía ni PINs en el chat: las pruebas son negativas (sin parámetro, código malo, sesión ausente). Sin secretos en el repo ni en el cliente. Los `.md` se suben con el lápiz (Ctrl+A → Ctrl+V), nunca por arrastre. Los archivos grandes se bajan con Ctrl+S del raw + verificación de blob (la copia del navegador trae CRLF y pierde la última línea: reparar y re-verificar). Jamás reconstruir archivos de memoria: solo copias verificadas byte a byte.

## 3 · Al crear algo nuevo (checklist de fábrica)

Página nueva:
1. `<meta charset>` → línea 2 la CSP (con hashes de su `<style>` desde el archivo final) → `no-referrer` + `noindex` si es sensible.
2. 0 `style=`, 0 `on*=` en el HTML y en las plantillas `innerHTML` del JS. Estilos dinámicos por CSSOM o clases.
3. Salidas de datos con escape (G2). Ids verificados contra los `getElementById` del JS (G7).
4. Si toca la base: RPC con `search_path` fijado, permisos según matriz de autorización, RLS probado en negativo (G3).
5. Sin credenciales ni códigos reales en el código ni en las pruebas (G8).
6. `node --check` del JS + verificación blob tras subir + Actions verde + prueba con URL completa y consola limpia.

## 4 · Definición de "listo y seguro" (DoD)

Una tarea está cerrada SOLO con: verificación mecánica (blob/hashes/ids) ✓, prueba en vivo del usuario ✓, Actions verde ✓, sin `style=`/`on*=` nuevos ✓, autorización probada en negativo si tocó la base ✓, y documentación al día (ESTADO/tareas; DECISIONES si hubo decisión) ✓.

## 5 · Cadencia

- **Arranque de sesión:** §2 de ESTADO.md (repo, tareas, keep-alive, Supabase si se toca).
- **Cierre de sesión («CERRAR SESIÓN»):** actualizar ESTADO.md, DECISIONES.md, tareas/, **este archivo** (§7 registro + versiones de garantías si cambiaron) y el TXT de continuidad. Si surgió una mejora de seguridad, ya debe estar clasificada en §6.

## 6 · Protocolo de mejora continua (obligatorio para cualquier IA)

Cuando detectes una vulnerabilidad, un método débil o una regla de este archivo que ya no protege:

1. **No lo arregles en silencio** dentro de otro lote de trabajo. Toda mejora es visible, con su propia tarea/commit y verificación.
2. **Clasifica:**
   - **URGENTE** → explotable hoy, rompe una garantía G1-G8, o hay evidencia de abuso: se convierte en tarea de la **SESIÓN EN CURSO**, primero en la fila, antes de cualquier feature. Si el arreglo requiere revertir, se revierte primero (precedente: puerta 30/10/2026) y se resube corregido.
   - **MANEJABLE** → endurecimiento, defensa en profundidad, deuda documental: se registra como **tarea preventiva** para sesión futura (prioridad P1/P2 según exposición) en `tareas/` con la PLANTILLA del backlog.
3. **Propón, no impongas:** al usuario se le presenta en español llano: qué se detectó, por qué importa, qué cuesta arreglarlo y qué se propone. El usuario aprueba (es el único que toca el repo).
4. **Registra:** nueva entrada en §7 (append-only). Si la mejora cambia una garantía, se agrega la regla nueva citando a la anterior (nunca se reescribe historia).
5. **Verifica:** ninguna mejora se da por hecha sin el DoD de §4.

## 7 · Registro de seguridad (append-only)

| Fecha | Tipo | Descripción | Clasificación | Estado | Referencia |
| --- | --- | --- | --- | --- | --- |
| 31/10/2026 | apertura | Registro creado con la postura v1 (G1-G8). | — | vigente | este archivo |
| 31/10/2026 | regresión | `no-referrer` + `noindex` ausentes en las 14 páginas de `main` (borrados por una edición posterior a la fase 2). | URGENTE (P0) | abierta — primera tarea sesión 18 | tareas/P0-04 §Metaetiquetas |
| 31/10/2026 | verificación pendiente | Prueba de XSS con payload explícito (la protección está garantizada por configuración: `connect-src`/`img-src` cerrados). | MANEJABLE | abierta — opcional | tareas/P0-04 |
| 31/10/2026 | operación | Keep-alive de Supabase: revisar ejecución ~31/10 en Actions. | rutina | pendiente de revisar | ESTADO.md §4 |
| 31/10/2026 | cierre P0-06 | P0-06 ejecutado: reponer `<meta name="referrer" content="no-referrer">` y `<meta name="robots" content="noindex, nofollow">` en las 14 páginas; corregir fila P0-06 del README del backlog. Commits `7be043ab` (14 HTML) y `65416e41` (tarea + README). Actions #249/#250 verdes. | URGENTE | **hecho** | tareas/P0-06 |
| 31/10/2026 | P0-05 alcance A | Respaldo JSON descargable + candado doble (informe + respaldo ≤30 min) en "Limpiar todo" + re-autenticación PIN (f_login/f_logout) + confirmación tipada del nombre + dry-run con conteos exactos del respaldo verificado (talentos/listas/personas/stands/vendedores completos, inclusive anulados). Blobs `58d2cc21…` y `209f50c6…`, commits `d36ec9b5` / `8e5fac99`, Actions #251/#252 verdes. Fases B-D absorbidas por M-37 (multi-evento sustituye limpieza total). | URGENTE (P0) | **hecho** | tareas/P0-05 |
| 31/10/2026 | G6 restaurada | La protección contra borrado accidental (G6) quedó restaurada y reforzada tras P0-05 alcance A: ya no basta un token robado para limpiar; hacePIN, nombre exacto y respaldo verificado ≤30 min. Regla de G6 actualizada: ver §8 abajo. | G6 | vigente | P0-05 / M-37 |

---

*Fin de SEGURIDAD-NitroSystem.md v1. Este archivo crece con el proyecto: en cada cierre de sesión se actualiza el registro y, si corresponde, las garantías.*

## 8 · Garantías actualizadas (31/10/2026)

**G6 · Protección contra borrado accidental (actualizada 31/10/2026 por P0-05).** Ya no basta un token de admin para limpiar. Antes de ejecutar `f_admin_limpiar_todo` se exige: (a) al menos un informe guardado en el historial (verificado por la RPC); (b) un respaldo JSON descargado y verificado en la misma pestaña con menos de 30 minutos; (c) re-autenticación con el PIN de admin (validado por `f_login`, revocando la sesión extra inmediatamente); (d) confirmación tipada del nombre exacto del evento (modal propio, botón habilitado solo con coincidencia). El dry-run muestra los conteos EXACTOS por tabla según el respaldo antes de pedir el PIN. Las fases B-D de P0-05 (restauración automática, backup programado, auditoría de la limpieza) quedan absorbidas por M-37: el multi-evento sustituye limpieza total por cierre-archivado, eliminando de raíz el riesgo.
