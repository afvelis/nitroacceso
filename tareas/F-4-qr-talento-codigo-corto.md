---
id: "F-4"
titulo: "Mostrar el código corto en el QR del talento"
prioridad: "P2"
estado: "pendiente"
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

- [ ] Comparar `construirCajaQR` en talento.html y en stand.html y ubicar la diferencia exacta.
- [ ] Aplicar la corrección de 1 línea en talento.html (respetar el formato visual de la caja).
- [ ] Verificar que el código mostrado coincide con el `codigo_corto` real de la lista (formato L-XXXXXX).

## Criterios de aceptación

- [ ] El QR del talento muestra el código corto en pantalla.
- [ ] El código mostrado coincide con el de la base (verificar contra el link real).
- [ ] stand.html no cambió en nada (regresión verificada).
- [ ] El fallback manual del día del evento sigue disponible (el código también se puede leer en el buscador de puerta).

## Verificación

Prueba manual: abrir el link de un talento de prueba, mirar la caja del QR y comparar el código en pantalla contra el `codigo_corto` que muestra puerta.html al buscar esa lista.

## Fuera de alcance

- Cambiar el tamaño o el contenido del QR, ni la lógica de escaneo de puerta.
- Tocar el botón «Cerrar esta pestaña» ni el panel azul del Día 2 (CONGELADOS según ARQUITECTURA.md §7).

## Notas de implementación

> Pendiente.
