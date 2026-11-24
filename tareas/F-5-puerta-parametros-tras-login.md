---
id: "F-5"
titulo: "Conservar los parámetros ?lista=/?v= tras el login de puerta.html"
prioridad: "P2"
estado: "hecho"
area: "frontend"
depende_de: []
archivos:
  - "puerta.html"
---

# F-5 · Conservar los parámetros ?lista=/?v= tras el login de puerta.html

## Contexto

Hallazgo de la prueba en vivo del 28/10/2026 (Sesión 13): si alguien entra a puerta.html con `?lista=` o `?v=` y todavía NO tiene sesión de puerta, los parámetros se pierden: el código solo rellena el campo si `tokenSesion` ya existe. En la prueba el usuario lo rodeó pegando el código `L-0765D8` en el buscador manual. Mejora: releer `location.search` después del login de puerta y completar el campo entonces.

## Evidencia

- [puerta.html:1159-1174](../puerta.html#L1159-L1174): el relleno del campo solo ocurre si `tokenSesion` ya existe (referencia; verificar el archivo actual antes de editar).
- Reporte del usuario en la Sesión 13 (28/10/2026), con el rodeo manual `L-0765D8`.

## Objetivo

Que entrar a `puerta.html?lista=L-XXXXXX` (o `?v=V-XXXXXXXX`) sin sesión previa funcione: tras el login, el campo se llena solo con el código que venía en la URL.

## Pasos

- [x] Verificar el bloque actual de lectura de parámetros en puerta.html (líneas de referencia arriba). (probado 23/11/2026: el relleno vivía en el IIFE final de `js/puerta.js` y solo aplicaba con `tokenSesion` existente)
- [x] Guardar los parámetros de la URL al cargar la página (aunque no haya sesión) y releerlos tras un login exitoso. (probado 23/11/2026: función `aplicarParametrosURL()` en `js/puerta.js:1333`, llamada desde el IIFE final (línea 1352) y en el handler de `btnEntrar` tras `await verificarEstadoEvento()` (línea 444); implementado en el commit `3a24649`) (probado 23/11/2026 en pantalla por el usuario: `puerta.html?lista=LST-DEMO01-D1` sin sesión previa → tras el PIN el buscador manual queda con `LST-DEMO01-D1` y NO se lanza búsqueda automática; reporte «todo como lo esperas»)
- [x] Mantener el buscador manual intacto: el parámetro de URL solo pre-llena el campo, nunca lanza una búsqueda sin el usuario. (probado 23/11/2026: `aplicarParametrosURL()` solo asigna `inputManual.value`; probado en pantalla el 23/11/2026 — no se lanzó ninguna búsqueda al entrar)
- [x] Probar los dos caminos: con sesión previa (comportamiento de hoy) y sin sesión previa (login y luego relleno). (probado 23/11/2026 en pantalla por el usuario: con sesión previa el comportamiento quedó idéntico al de antes; sin sesión, el campo quedó pre-lleno tras el login)

## Criterios de aceptación

- [x] `puerta.html?lista=L-XXXXXX` sin sesión: tras el login, el campo de búsqueda contiene el código. (probado 23/11/2026 en pantalla: `puerta.html?lista=LST-DEMO01-D1` sin sesión → el campo quedó con `LST-DEMO01-D1` tras el PIN)
- [x] Con sesión previa: el comportamiento actual no cambia. (probado 23/11/2026 en pantalla por el usuario: idéntico al de antes)
- [x] El QR de vendedores (`?v=`) se rellena igual tras el login. (verificado por código el 23/11/2026: `aplicarParametrosURL()` lee `params.get('v')` con la misma prioridad `v` → `lista` → `cl` → `ci` que ya tenía el IIFE reescrito; no hubo prueba en pantalla con `?v=` ese día)
- [x] Sin parámetros en la URL, nada cambia (regresión verificada). (verificado por código el 23/11/2026: sin código disponible la función devuelve `null` sin tocar `inputManual`; no hubo prueba separada en pantalla)

## Verificación

Prueba manual en incógnito (sin sesión): abrir `puerta.html?lista=` con un código corto real de prueba, hacer login con el PIN de puerta de prueba y confirmar que el campo quedó pre-llenado. Repetir con `?v=`. Luego repetir con sesión previa para confirmar que no cambió.

Ejecutada el 23/11/2026 por el usuario en staging: `?lista=LST-DEMO01-D1` sin sesión y con sesión; reporte «todo como lo esperas». El caso `?v=` no se probó en pantalla ese día (se cubre por código: misma función, misma prioridad).

## Fuera de alcance

- Cambiar el login, el PIN ni la creación de sesión (ver [P0-03](P0-03-login-sesiones.md)).
- Que el parámetro dispare búsquedas o marcados automáticos sin acción del usuario.

## Notas de implementación

Implementada el 23/11/2026 (commit `3a24649`), probada en pantalla por el usuario el 23/11/2026.

**Qué se cambió (archivo:línea):**
- `js/puerta.js:1333-1339` — función nueva `aplicarParametrosURL()`: lee `location.search` y pre-llena el campo manual con el primer código disponible en la prioridad `v` → `lista` → `cl` → `ci` (la misma que ya existía). Si no hay ninguno, no toca el campo y devuelve `null`. Reutiliza la `const` existente `inputManual` (no hay segunda referencia).
- `js/puerta.js:1349-1353` — el IIFE final ya no duplica el bloque `if(vendedorParam){...} else if(listaParam){...}`: queda `if(tokenSesion){ aplicarParametrosURL(); }`, y se eliminaron las constantes `listaParam/vendedorParam/clParam/ciParam` que quedaron sin uso.
- `js/puerta.js:442-446` — en el handler de `btnEntrar`, en el camino de ÉXITO, después de `await verificarEstadoEvento()` se llama `aplicarParametrosURL()`, que aplica el código cuando el panel principal ya está visible, para que el campo exista y se vea relleno.

**Qué se probó:** los cuatro criterios de aceptación (detalle con evidencia en cada casilla). En pantalla: los dos caminos con `?lista=LST-DEMO01-D1` (sin sesión y con sesión), ambos «como se esperaba».

**Qué NO se probó en pantalla:** `?v=`, `?cl=` y `?ci=` (cubierto por lectura de código: la función comparte la misma prioridad que ya existía), y la regresión de «sin parámetros» como caso separado (la función devuelve early `null` sin tocar el campo).
