---
id: "F-7"
titulo: "Sustituir los diálogos nativos por los modales de la app (regla v2.1)"
prioridad: "P1"
estado: "en_progreso"
area: "frontend"
depende_de: []
archivos:
  - "js/modales.js"
  - "js/stand.js"
  - "js/dashboard.js"
  - "js/estadisticas.js"
  - "js/cortesia.js"
  - "stand.html"
  - "dashboard.html"
  - "estadisticas.html"
  - "cortesia.html"
---

# F-7 · Sustituir los diálogos nativos por los modales de la app (regla v2.1)

## Problema

La regla v2.1 (ver DECISIONES.md) prohíbe alert/confirm/prompt nativos: Chrome suprime los diálogos encadenados y una respuesta puede no verse nunca (pasó con la rotación de PIN, que fallaba en silencio).

Hallazgo de auditoría del 10/11/2026, verificado leyendo el código:

- `js/admin.js` y `js/puerta.js` redirigen `window.alert` a su propio modal (línea 70 y 69), así que sus `alert()` NO violan la regla.
- `js/stand.js` tiene 6 llamadas nativas reales (2 confirm + 4 alert): `js/stand.js:124` (quitar vendedor), `js/stand.js:261` (registrar lote parcial), `js/stand.js:356` (imagen de QR copiada) y tres más.
- `js/talento.js` usa confirm nativo al guardar una lista que queda vacía (aviso «Esto dejará VACÍA la lista del Dia N»).
- `js/dashboard.js`, `js/estadisticas.js`, `js/cortesia.js` y otros no tienen override: cualquier alert/confirm/prompt que usen sale nativo.
- No hay un modal centralizado: cada archivo define su propio modalAlert/modalConfirm (`admin.js`, `puerta.js`, `aliados.js`, `aliado.js`, `aliados-concursos.js`, `cortesias.js`), con firmas distintas (unos reciben `(mensaje, titulo)` y otros `(titulo, mensaje)`).

## Objetivo

Que ninguna acción de la app dependa de un diálogo del navegador.

## Requisitos

- **R1.** Inventariar TODAS las llamadas nativas con un grep reproducible y dejarlas listadas en esta tarea con `archivo:línea`.
- **R2.** Sustituirlas por el modal propio del archivo (o por un helper común si se decide crear uno).
- **R3.** Mientras no haya helper común, unificar al menos la FIRMA para que no se confunda el orden de argumentos; documentar cuál es la canónica.
- **R4.** No introducir regresiones: cada confirm sustituido debe devolver la misma decisión (continuar o abortar) y no romper el flujo.
- **R5.** Dejar claro en las notas cuántos diálogos nativos quedan y por qué, si alguno se decide no tocar.

## Criterios de aceptación

- [x] **CA1.** El grep del punto R1 devuelve 0 llamadas nativas reales (excluyendo vendor/ y los casos justificados por escrito).
- [ ] **CA2.** Las pruebas manuales de cada flujo afectado siguen funcionando (quitar vendedor, registrar lote parcial, vaciar lista de talento, cerrar sesión).

## Verificación

Grep reproducible contra la raíz del repo (excluyendo `vendor/`), por ejemplo:

```bash
grep -rn --include='*.js' -E '(^|[^.\w])(alert|confirm|prompt)\(' . --exclude-dir=vendor
```

y revisión manual de cada resultado: si el archivo redirige `window.alert` a su propio modal, no cuenta como violación; si sale nativo, sí. Después, prueba manual de cada flujo afectado en staging.

## Fuera de alcance

- Crear un sistema de modales nuevo distinto de los ya existentes por archivo (el helper común, si se decide, es opcional dentro de R2/R3).
- Cambiar el texto ni la decisión de ningún diálogo: misma pregunta, misma respuesta, solo el medio.

## Notas de implementación

**Fases A y B hechas (F-7 queda `en_progreso` hasta la prueba manual del usuario). Implementado el 11/11/2026 en la rama `agente/2026-11-11-f7-modales-nativos`.**

### 1. Inventario real de llamadas nativas (R1), con grep reproducible

Grep usado (sale VACÍO tras la sustitución, excluyendo los archivos con override):

```bash
grep -rnE --include='*.js' '(^|[^.[:alnum:]_$])(alert|confirm|prompt)[[:space:]]*\(' js/ \
  stand.html dashboard.html estadisticas.html cortesia.html \
  | grep -v 'js/admin.js' | grep -v 'js/puerta.js'
```

Las 13 llamadas nativas reales que existían (líneas verificadas antes de editar):

| Llamada | Ubicación | Flujo |
|---|---|---|
| `confirm` | `js/stand.js:124` | quitar vendedor (`quitarVendedor`) |
| `confirm` | `js/stand.js:261` | registrar lote parcial (`btnRegistrar`) |
| `alert` | `js/stand.js:356` | imagen del QR copiada |
| `alert` | `js/stand.js:361` | respaldo de texto al fallar la copia de imagen |
| `alert` | `js/stand.js:369` | dentro de `setTimeout(..., 500)`: respaldo tras abrir correo |
| `alert` | `js/stand.js:381` | stand sin personas (`btnTermine`) |
| `alert` | `js/dashboard.js:32` | respaldo al fallar la copia (`copiarTexto`) |
| `confirm` | `js/dashboard.js:200` | cerrar/reabrir edición (`btnToggleEdicion`) |
| `alert` | `js/dashboard.js:209` | error al cambiar el estado |
| `confirm` | `js/dashboard.js:216` | cerrar sesión de administrador (`btnSalir`) |
| `alert` | `js/dashboard.js:226` | no se pudo cargar el dashboard |
| `alert` | `js/estadisticas.js:375` | no se pudo cargar la segmentación |
| `alert` | `js/cortesia.js:37` | respaldo de copiado manual del beneficiario |

Por qué `js/admin.js` y `js/puerta.js` NO cuentan: ambos redirigen `window.alert` a su modal propio (`window.alert = function(msg){ modalAlert(String(msg)); };` en `js/admin.js:70` y equivalente en `js/puerta.js:69`), así que sus llamadas no salen al navegador. La primera llamada en cada archivo está por debajo del override (`js/admin.js:180`, `js/puerta.js:159`), lo que se comprueba en la salida del grep completo: todas sus líneas quedan dentro de los archivos excluidos. Por la misma regla, `window.confirm` no se parchea en ningún lado: no se tocan globales.

### 2. Corrección a la premisa original de la tarea

- `js/talento.js` tenía **0** llamadas nativas: la premisa de la tarea (confirm al vaciar lista) estaba desactualizada — F-6 ya lo dejó con `modalAviso`/`modalConfirmar`. Se quitó de `archivos:`.
- En cambio `js/dashboard.js`, `js/estadisticas.js` y `js/cortesia.js` **sí** tenían llamadas nativas reales y faltaban en el frontmatter original. Se añadieron.

### 3. Diseño elegido (R2/R3)

- Helper compartido nuevo: **`js/modales.js`**, IIFE con `'use strict'`, sin dependencias. Expone `NA.avisar(mensaje, titulo)` (Promise, resuelve `true`) y `NA.confirmar(mensaje, titulo)` (Promise, resuelve `true`/`false`). **Firma canónica R3: `(mensaje, titulo)`**, igual que el `modalAlert` de `js/admin.js`.
- No parchea `window.alert` ni `window.confirm`; cada llamador se convierte explícitamente.
- Estilos aplicados SOLO por CSSOM (`Object.assign(el.style, ...)`) para no tocar la CSP: las 4 páginas cierran `style-src 'self'` + hash y no admiten estilos inline nuevos. Clases usadas: `modal-fondo`, `modal-caja`, `modal-titulo`, `modal-mensaje`, `modal-acciones`, `btn`, `btn-gris`.
- Contenido construido con `document.createElement` + `textContent` (nunca `innerHTML` con texto variable): sin riesgo de XSS por diseño.
- Accesibilidad: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` al título, id único en el mensaje, foco al botón principal al abrir y devolución del foco al elemento que lo tenía al cerrar. `Escape` y clic en el fondo = misma decisión que Cancelar (en `avisar`, cerran). Cola de una sola instancia: si se llama con un modal abierto, la llamada siguiente espera en cola.
- Páginas que cargan el helper (`<script src="js/modales.js">` entre `config.js` y el script propio): `stand.html`, `dashboard.html`, `estadisticas.html`, `cortesia.html`. La CSP de ninguna se tocó.

### 4. Los textos NO cambiaron (R4)

Misma pregunta literal, misma decisión, mismo orden de flujo. Cada `confirm('...')` pasó a `await NA.confirmar('...')` y cada `alert('...')` a `NA.avisar('...')` con el string intacto (incluidos los `\n\n` y los emojis). Solo se convirtió en `async` el listener de `btnSalir` en `js/dashboard.js` (antes sincrónico); su único llamador es `addEventListener`, sin dependencia sincrónica del retorno.

### 5. Pendiente (CA2)

La prueba manual en navegador de los flujos afectados la hace el usuario en staging: quitar vendedor, registrar lote parcial, avisos de QR/copiado y stand vacío (cap. 04), cerrar sesión admin (cap. 01), cerrar/reabrir edición y errores de carga (cap. 02), respaldo de copiado del beneficiario (cap. 05), error de segmentación (cap. 08). Mientras eso no ocurra, la tarea sigue `en_progreso` y CA2 sin marcar.

Candidato a nota v2.2 (fuera de alcance aquí): los avisos de copiado de QR en `js/stand.js` y el fallback de `js/cortesia.js:37` son solo avisos informativos; la norma v2.2 pediría verlos junto al botón pulsado. No se cambió el diseño de las pantallas en F-7: solo el medio del diálogo.
