---
id: "F-5"
titulo: "Conservar los parámetros ?lista=/?v= tras el login de puerta.html"
prioridad: "P2"
estado: "pendiente"
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

- [ ] Verificar el bloque actual de lectura de parámetros en puerta.html (líneas de referencia arriba).
- [ ] Guardar los parámetros de la URL al cargar la página (aunque no haya sesión) y releerlos tras un login exitoso.
- [ ] Mantener el buscador manual intacto: el parámetro de URL solo pre-llena el campo, nunca lanza una búsqueda sin el usuario.
- [ ] Probar los dos caminos: con sesión previa (comportamiento de hoy) y sin sesión previa (login y luego relleno).

## Criterios de aceptación

- [ ] `puerta.html?lista=L-XXXXXX` sin sesión: tras el login, el campo de búsqueda contiene el código.
- [ ] Con sesión previa: el comportamiento actual no cambia.
- [ ] El QR de vendedores (`?v=`) se rellena igual tras el login.
- [ ] Sin parámetros en la URL, nada cambia (regresión verificada).

## Verificación

Prueba manual en incógnito (sin sesión): abrir `puerta.html?lista=` con un código corto real de prueba, hacer login con el PIN de puerta de prueba y confirmar que el campo quedó pre-llenado. Repetir con `?v=`. Luego repetir con sesión previa para confirmar que no cambió.

## Fuera de alcance

- Cambiar el login, el PIN ni la creación de sesión (ver [P0-03](P0-03-login-sesiones.md)).
- Que el parámetro dispare búsquedas o marcados automáticos sin acción del usuario.

## Notas de implementación

> Pendiente.
