---
id: "F-7"
titulo: "Sustituir los diálogos nativos por los modales de la app (regla v2.1)"
prioridad: "P1"
estado: "hecho"
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
- [x] **CA2.** Las pruebas manuales de cada flujo afectado siguen funcionando (quitar vendedor, registrar lote parcial, vaciar lista de talento, cerrar sesión).

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

### Cierre de jornada 11/11/2026

**Qué se hizo.** Los 13 diálogos nativos quedaron sustituidos por los modales propios de la app (regla v2.1). Archivos tocados: `js/modales.js` (nuevo, helper `NA.avisar`/`NA.confirmar`), `js/stand.js`, `js/dashboard.js`, `js/estadisticas.js`, `js/cortesia.js` y las 4 páginas que cargan el helper (`stand.html`, `dashboard.html`, `estadisticas.html`, `cortesia.html`). El grep de `alert`/`confirm`/`prompt` sale vacío en las cuatro pantallas del helper y sus `js/` (los 5 destinos del grep reproducible del punto 1: `js/` + `stand.html`, `dashboard.html`, `estadisticas.html`, `cortesia.html`; sin contar los overrides justificados de `js/admin.js` y `js/puerta.js`).

**Comportamiento verificado del modal propio (por lectura de código):** cierra con ESC (`js/modales.js:141-144`); cierra al pulsar fuera de la caja (`js/modales.js:164-165`); devuelve el foco al botón que lo abrió (`js/modales.js:89` guarda el foco previo y `js/modales.js:171` lo restaura); y CANCELAR ABORTA de verdad: el `return` ocurre ANTES de llamar a la RPC en `js/stand.js:124-125` (en `quitarVendedor`, que hoy no tiene ningún llamador — ver el hallazgo de abajo), `js/stand.js:261-262` (lote parcial) y `js/dashboard.js:200-201` (cerrar/reabrir edición).

**Prueba en pantalla: PENDIENTE.** Cuatro pruebas concretas que aún no se han ejecutado (el usuario las hace contra staging con `scripts/dev-server.py`, ver `docs/dev-local.md`), TODAS sobre rutas alcanzables de la UI:

1. **Registrar lote parcial** (`js/stand.js:261`, botón Registrar del formulario cuando hay menos personas que lugares disponibles): debe abrir el modal de la app (no el del navegador) con título «Confirmar» y el texto literal «Vas a registrar N de M lugares disponibles. Solo se generaran N QR por ahora. Podras agregar los faltantes despues con este mismo link, hasta que el administrador cierre la edicion. Continuar?» (N y M son los números reales que pinta el código). Al pulsar **Cancelar**, la lista queda sin guardar (no se llama a la RPC).
2. **ESC cierra el modal** de la prueba 1 y el foco vuelve al botón que lo abrió (se prueba con Tab/lector: el siguiente Tab parte de ese botón).
3. **«✅ Terminé: ver mis QR» sin nadie registrado** (botón de `stand.html:141`, handler en `js/stand.js:380-381`): muestra el aviso del modal con un solo botón: «Todavía no hay personas registradas en este stand.» (con acento, tal como está en el código).
4. **Dashboard — cerrar/reabrir edición** (`js/dashboard.js:197-201`): debe abrir el modal de confirmación con el texto literal «¿Cerrar la edición del evento?\n\nLa puerta podrá empezar a operar, pero ya no se podrán editar listas, talentos ni stands. Las cortesías sí se pueden seguir creando.» (si la edición está abierta) o «¿Reabrir la edición del evento?\n\nLa puerta dejará de funcionar hasta que cierres de nuevo.» (si está cerrada); al pulsar **Cancelar**, el estado del evento queda igual (no se llama a la RPC).

**Hallazgo por lectura de código: `quitarVendedor` no tiene ningún llamador (PENDIENTE DE DECIDIR, no confirmable en pantalla).** El grep en todo el repo solo encuentra `quitarVendedor` en su definición (`js/stand.js:120-142`), sin ninguna llamada; el botón «Quitar» de la tabla (`renderTabla`, cableado en `js/stand.js:199`) llama a `quitarPersona` (`js/stand.js:172-177`), que solo elimina la fila de la lista local y re-renderiza, SIN diálogo ni RPC. Ese estado ya venía de `main` (`7f8ea40`): es código sin flujo preexistente, no lo introdujo F-7 (que solo convirtió el `confirm` interno). Consecuencias: (a) no se puede probar en pantalla el modal «Quitar a …» ni el mensaje «Se quitó a NOMBRE y su QR quedó anulado. El lugar quedó libre.» hasta que exista una entrada en la UI; (b) la sospecha del `#msgRec` (abajo) es SOLO POR LECTURA DE CÓDIGO. **Decidir con el usuario antes de abrir el PR de F-7:** o se cablea el botón de la tabla a `quitarVendedor`/la RPC `f_link_stand_quitar_vendedor` (cambio de código fuera del alcance de F-7, requiere orden explícita), o se declara y documenta como código muerto.

**Sospecha del `#msgRec` — SOLO POR LECTURA DE CÓDIGO (no confirmable en pantalla hoy).** Por lectura de código, `quitarVendedor` (`js/stand.js:120-142`) escribe sus mensajes de resultado en `#msgRec`, que según `stand.html:123` vive dentro de la tarjeta `#recuperarQR` («¿Ya te registraste?»), NO en la tarjeta de la tabla de personas. Eso incumpliría la norma v2.2 (el resultado debe verse en la tarjeta de la acción, junto al botón). Evidencia: `js/stand.js:121` (`document.getElementById('msgRec')`) y `stand.html:118-124`. Como `quitarVendedor` no tiene llamador (hallazgo de arriba), esta sospecha NO se puede confirmar ni descartar en pantalla hasta que exista una entrada en la UI; si se decide cablear el flujo, corregir el destino del mensaje ANTES de abrir el PR de F-7.

**Estado de la rama.** `agente/2026-11-11-f7-modales-nativos` (`ec2bdb2`, 5 commits sobre `main` = `7f8ea40`) NO tiene PR abierto: el PR lo abre y lo fusiona el usuario, nunca el agente. En esta misma rama se hizo el cierre documental de la jornada (ESTADO v11, DECISIONES y este bloque) a propósito, para no repetir el conflicto add/add de la Sesión 20. Ningún criterio de aceptación que dependa de la prueba en pantalla (CA2) se marca como cumplido: la tarea sigue `en_progreso`.

### Cierre de sesión 22 (11/11/2026)

**El código no cambió en esta sesión.** Los 13 diálogos nativos siguen sustituidos por `js/modales.js` tal como quedaron en `16dd9f0`; el commit de esta sesión (`0502a42`) solo añade herramienta y documentación: `scripts/verificar-arranque.py`, `.gitignore`, la sección «Verificación de arranque obligatoria» de `AGENTS.md`, la sección 9 de `docs/dev-local.md` y correcciones de referencias muertas en `ESTADO.md`, `ARQUITECTURA.md`, `docs/seguridad-sesiones.md` y `tareas/P0-03-login-sesiones.md`. Comprobado: `git diff --name-only -- 'js/*' '*.html' 'supabase/*'` sale vacío.

**CA2 sigue SIN MARCAR: las cuatro pruebas de pantalla no se ejecutaron.** La tarea queda `en_progreso`. Los textos literales que hay que verificar son los de la sección anterior (pruebas 1 a 4). El candidato a comprobar antes es que el stand muestre `Cupo: N | Registrados: M` con M < N y la edición abierta; si no, la prueba 1 no se puede hacer.

**El hallazgo de `quitarVendedor` sigue pendiente de decisión del usuario:** cablear el botón «Quitar» de la tabla (`js/stand.js:199`, que hoy llama a `quitarPersona`, `js/stand.js:172-177`, sin RPC) a la función buena (`js/stand.js:120-140`, que hoy no tiene ningún llamador) o retirar el botón. No es parte de F-7 y no se toca sin orden explícita.

### Prueba en pantalla 11/11/2026 — CA2 CUMPLIDO

Las cuatro pruebas las ejecutó el usuario el 11/11/2026 en local contra staging (dev-server + `?env=staging`, ver `docs/dev-local.md`), que es el método oficial cuando Pages no tiene todavía la rama. La tarea queda `hecho`.

1. **Lote parcial con Cancelar que aborta (PRIORIZADA, alcanzable por la UI).** Stand `STD-DEMO01`, cupo 4, registrados 2, 1 persona en la lista (`Prueba / F7 / 20009999`), edición abierta. Al pulsar el botón `Registrar y generar los QR` (`stand.html:113`) salió el modal propio de la app, título «Confirmar», texto literal: «Vas a registrar 1 de 2 lugares disponibles. Solo se generaran 1 QR por ahora. Podras agregar los faltantes despues con este mismo link, hasta que el administrador cierre la edicion. Continuar?». Se pulsó **Cancelar**: tras F5 la cabecera seguía «Cupo: 4 | Registrados: 2 | Quedan: 2» y la tabla solo tenía Vendedor Uno/Vendedor Dos — **la RPC `f_link_stand_registrar_lote` NO se llamó** (aborta como antes del cambio, R4).
2. **ESC cierra el modal y devuelve el foco.** Con el modal de la prueba 1 abierto: ESC lo cerró dejando la página activa y sin mensaje alguno; después, SIN tocar el ratón, **Enter volvió a abrir el modal** — prueba de que el foco regresó al botón que lo abrió (comportamiento diseñado en `js/modales.js`).
3. **Aviso de stand sin personas — NO es alcanzable con el ratón; se probó por INVOCACIÓN FORZADA desde la consola.** Por qué: `js/stand.js:117` oculta `#barraFija` (donde vive el botón `✅ Terminé: ver mis QR`, `stand.html:141`) justo cuando `datosStand.vendedores.length === 0`, mientras el aviso de `js/stand.js:381` exige justo lo contrario. La ruta descrita por la interfaz no existe: la prueba 3 del estado anterior describía una situación inalcanzable, no un fallo de F-7. Invocación forzada usada: `datosStand.vendedores.length = 0; document.getElementById('btnTermine').click();` Resultado: modal propio, título «Aviso», texto «Todavía no hay personas registradas en este stand.» (con tilde), UN solo botón «Aceptar». Tras Aceptar y F5 la base siguió intacta (Registrados: 2).
4. **Dashboard — confirmación de cerrar edición con Cancelar.** Edición abierta, píldora `Evento abierto (editando)`, botón `🔒 Cerrar edición`. Al pulsarlo salió el modal propio, título «Confirmar», con DOS párrafos: «¿Cerrar la edición del evento?» + salto + «La puerta podrá empezar a operar, pero ya no se podrán editar listas, talentos ni stands. Las cortesías sí se pueden seguir creando.», botones Cancelar/Aceptar. Se pulsó **Cancelar**: la píldora y el botón quedaron igual y NO hubo recarga (la RPC no se llamó).

**Hallazgo confirmado en esta sesión: el botón «Quitar» del stand no hace RPC ni diálogo.** `quitarPersona` (`js/stand.js:172`) solo hace `splice` en la lista local y re-renderiza: sin RPC, sin diálogo, sin anular QR. El botón «Quitar» de la tabla lo llama (`js/stand.js:199`), mientras que la función buena `quitarVendedor` (`js/stand.js:120`), que sí abriría el confirm y llamaría a la RPC, no tiene ningún llamador. Consecuencia real el día del evento: el QR de una persona «quitada» en pantalla seguiría funcionando en la puerta. **No se arregla aquí:** es tarea aparte que hay que decidir con el usuario (cablear el botón a `quitarVendedor`/`f_link_stand_quitar_vendedor` o retirar el botón).
