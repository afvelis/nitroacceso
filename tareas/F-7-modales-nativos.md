---
id: "F-7"
titulo: "Sustituir los diálogos nativos por los modales de la app (regla v2.1)"
prioridad: "P1"
estado: "pendiente"
area: "frontend"
depende_de: []
archivos:
  - "js/stand.js"
  - "js/talento.js"
  - "js/dashboard.js"
  - "js/estadisticas.js"
  - "js/cortesia.js"
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

- [ ] **CA1.** El grep del punto R1 devuelve 0 llamadas nativas reales (excluyendo vendor/ y los casos justificados por escrito).
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

(vacío por ahora)
