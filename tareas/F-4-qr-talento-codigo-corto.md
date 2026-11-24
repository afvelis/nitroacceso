---
id: "F-4"
titulo: "Mostrar el código corto en el QR del talento"
prioridad: "P2"
estado: "hecho"
area: "frontend"
depende_de: []
archivos:
  - "talento.html"
  - "stand.html"
---

# F-4 · Mostrar el código corto en el QR del talento

## Contexto

Hallazgo de la prueba en vivo del 28/10/2026 (Sesión 13): el QR del talento no muestra el código corto en pantalla, pero el propio texto de talento.html pide «dicta el codigo corto», que el talento no puede dictar porque no se ve. stand.html sí lo muestra junto a su QR. Es una corrección de 1 línea en `construirCajaQR`.

## Evidencia

- talento.html, función `construirCajaQR` (buscar el nombre en el archivo; verificar el archivo actual antes de editar).
- stand.html: la misma función (o equivalente) sí muestra el código corto; es la referencia del comportamiento esperado.
- Reporte del usuario en la Sesión 13 (28/10/2026).

## Objetivo

Que el panel del talento muestre el código corto de su lista visible junto al QR, igual que lo hace stand.html.

## Pasos

- [x] Comparar `construirCajaQR` en talento.html y en stand.html y ubicar la diferencia exacta. (No hizo falta corregir: la caja ya recibe el código en `js/talento.js:327`.)
- [x] Aplicar la corrección de 1 línea en talento.html (respetar el formato visual de la caja). (Sin cambios: la corrección efectiva entró en `config.js` el 30/10/2026, commit `f87fb0f`.)
- [x] Verificar que el código mostrado coincide con el `codigo_corto` real de la lista (formato L-XXXXXX). (Verificado por RPC el 23/11/2026.)

## Criterios de aceptación

- [x] El QR del talento muestra el código corto en pantalla. (probado 23/11/2026: `talento.html?t=TAL-DEMO01` en staging muestra `Codigo: LST-DEMO01-D1` bajo el QR)
- [x] El código mostrado coincide con el de la base (verificar contra el link real). (probado 23/11/2026: `f_link_talento_ver("TAL-DEMO01")` devuelve `LST-DEMO01-D1` (3 personas) y `LST-DEMO01-D2` (2))
- [x] stand.html no cambió en nada (regresión verificada). (probado 23/11/2026: `git status --porcelain` vacío, `stand.html` y `js/stand.js` sin cambios)
- [x] El fallback manual del día del evento sigue disponible (el código también se puede leer en el buscador de puerta). (probado 23/11/2026: `f_puerta_lista(token, 1, "LST-DEMO01-D1")` = 200 con la lista y sus 3 personas; `(token, 2, "LST-DEMO01-D2")` = 200 con 2)

## Verificación

Prueba manual: abrir el link de un talento de prueba, mirar la caja del QR y comparar el código en pantalla contra el `codigo_corto` que muestra puerta.html al buscar esa lista.

## Fuera de alcance

- Cambiar el tamaño o el contenido del QR, ni la lógica de escaneo de puerta.
- Tocar el botón «Cerrar esta pestaña» ni el panel azul del Día 2 (CONGELADOS según ARQUITECTURA.md §7).

## Notas de implementación

**23/11/2026 — cerrada sin cambios de código: ya estaba implementada.**

- El hallazgo original (28/10/2026, Sesión 13) pedía mostrar el código corto junto al QR del talento.
- El código ya lo hace desde el **30/10/2026**, commit `f87fb0f` (*P0-04 fase 1*), que introdujo `dibujarPieQR()` en `config.js:307-337` y la llamó desde las dos rutas de `ponerQR()` (`config.js:400` y `config.js:408`).
- `js/talento.js:327` ya le pasa el código: `ponerQR(qrInner, urlPuerta('lista', l.codigo_corto), l.codigo_corto)`, y `js/talento.js:249-251` pinta la caja también en modo consulta (está fuera del `if/else` de `editable`), así que no hay rama que la oculte con la edición cerrada.

**Pruebas ejecutadas (23/11/2026):**

| Criterio | Prueba | Resultado |
| --- | --- | --- |
| 1. El QR muestra el código | `talento.html?t=TAL-DEMO01` servido desde el repo con `scripts/dev-server.py` contra staging; reporte del usuario en pantalla | CUMPLIDO: franja blanca bajo el QR con `Codigo: LST-DEMO01-D1` |
| 2. Coincide con la base | RPC `f_link_talento_ver("TAL-DEMO01")` → `LST-DEMO01-D1` (3 personas) y `LST-DEMO01-D2` (2) | CUMPLIDO: es el mismo `codigo_corto` |
| 3. stand.html sin cambios | `git status --porcelain` vacío; ningún commit de esta sesión toca `stand.html` ni `js/stand.js` | CUMPLIDO |
| 4. Fallback manual disponible | `f_puerta_lista(token, 1, "LST-DEMO01-D1")` → 200 con la lista y 3 personas; `(token, 2, "LST-DEMO01-D2")` → 200 con 2 | CUMPLIDO |

- El criterio 1 se validó en pantalla (reporte visual del usuario, 23/11) y se contrasta contra el dato leído por RPC del criterio 2.
- No hay nada que desplegar: no cambian `talento.html`, `js/talento.js`, `config.js` ni `stand.html`.
