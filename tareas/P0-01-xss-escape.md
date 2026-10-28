---
id: "P0-01"
titulo: "Eliminar el XSS almacenado y centralizar el escape"
prioridad: "P0"
estado: "hecho"
area: "seguridad"
depende_de: []
archivos:
  - "config.js"
  - "puerta.html"
  - "dashboard.html"
  - "cortesia.html"
  - "aliado.html"
  - "stand.html"
  - "talento.html"
  - "admin.html"
  - "estadisticas.html"
---

# P0-01 · Eliminar el XSS almacenado y centralizar el escape

## Contexto

Los nombres, cédulas, empresas y textos de concurso se insertan con `innerHTML` sin escapar. Un vendedor o talento puede registrar un nombre con HTML/JS desde un formulario público y ejecutar código cuando el personal de puerta o el admin abre la lista. El script puede leer `sessionStorage.na_token` y llamar a RPC con ese token.

Ver el análisis completo en [00-revision-seguridad.md](00-revision-seguridad.md#1-xss-almacenado--crítico-y-verificable).

## Evidencia

- [puerta.html:579-581](../puerta.html#L579-L581): vendedor.
- [puerta.html:684-690](../puerta.html#L684-L690): personas de lista y `data-nombre`.
- [puerta.html:750-751](../puerta.html#L750-L751): cortesía individual.
- [puerta.html:818-819](../puerta.html#L818-L819): premiación.
- [puerta.html:986](../puerta.html#L986), [1009-1010](../puerta.html#L1009-L1010), [1040-1059](../puerta.html#L1040-L1059): listas de talento.
- [dashboard.html:291-295](../dashboard.html#L291-L295): alertas del admin, incluido un `onclick` con el link.
- [cortesia.html:289](../cortesia.html#L289): nombres en el pase.
- [stand.html:355-360](../stand.html#L355-L360) y [talento.html:420-431](../talento.html#L420-L431): no hay validación de caracteres en la entrada.

## Objetivo

Que ningún dato controlado por un usuario pueda ejecutar HTML/JS en las páginas del personal, y que exista una única función de escape usada en todo el proyecto.

## Pasos

- [x] Crear una implementación única de escape. Se puede añadir `escaparHtml` a `config.js` (ya se carga en todas las páginas) o crear `js/seguridad.js` y cargarlo después de `config.js`. Exponerla como `NA.esc` o `escaparHtml`.
- [x] Escapar **todos** los valores de usuario en `puerta.html`: vendedor, personas de listas, cortesías, premiaciones, talento, códigos y estados.
- [x] Escapar los valores de usuario en `dashboard.html` (`item.nombre`, `item.codigo`, `item.link`) y reemplazar el `onclick` concatenado por un `addEventListener` con closure o `dataset`.
- [x] Escapar los nombres y textos de concurso en `cortesia.html` y en los modales de `aliado.html` que concatenan `concurso.nombre` en `opts.mensaje`.
- [x] Para atributos como `data-nombre`, dejar de concatenar HTML: crear el botón con `document.createElement` y asignar `btn.dataset.nombre = valor`. Si el dato no se usa, eliminarlo.
- [x] Revisar `grep` de interpolaciones con `nombre`, `apellido`, `cedula`, `empresa`, `vende`, `correo`, `telefono`, `concurso`, `organizacion` y `mensaje` para detectar casos restantes.
- [x] Añadir validación de longitud y caracteres permitidos en los formularios públicos (nombres, cédula, correo, teléfono) como defensa en profundidad, sin confiar en ella para el escape.
- [x] Añadir una prueba manual documentada con el payload `<img src=x onerror=alert(1)>` en staging.

## Criterios de aceptación

- [x] Un nombre `<img src=x onerror=alert(1)>` se muestra como texto literal en puerta, dashboard y cortesía; no se ejecuta. *(en staging el formulario público lo RECHAZA por la validación nueva — no llega a la base; el escape se verificó en vivo con un nombre con `"` y `'`, guardado y mostrado intacto en talento, puerta y vista de lista completada)*
- [x] Un nombre con `"` o `'` no rompe atributos ni botones. *(escaparHtml cubre ambos; `data-nombre` eliminado; `data-copiar` con `encodeURIComponent`)*
- [x] `puerta.html`, `dashboard.html` y `cortesia.html` no tienen interpolaciones de datos de usuario sin escapar. *(grep del paso de Verificación, revisado punto por punto)*
- [x] No se usa `onclick` con datos de usuario concatenados. *(0 coincidencias de `onclick="…${…}"`)*
- [x] No hay regresiones en la autorización de entradas ni en la visualización de listas. *(probado en vivo: autorizar en puerta funcionó de punta a punta — diálogo, guardado, hora y cierre automático de la lista; `node --check` 0 errores)*

## Verificación

1. En staging, registrar un vendedor con nombre `<img src=x onerror=alert(1)>` y abrir su QR en `puerta.html`; no debe aparecer el `alert`.
2. Repetir con una persona de lista de talento y abrir el dashboard del admin; el nombre debe verse como texto.
3. Buscar en el código:

```bash
grep -nE '\$\{[^}]*(nombre|apellido|cedula|empresa|vende|correo|telefono|concurso|organizacion)' *.html
```

4. Revisar que cada coincidencia esté escapada o construida con `textContent`.

## Fuera de alcance

- Cambiar la CSP (ver [P0-04](P0-04-qr-csp-dependencias.md)).
- Revisar RLS o permisos de RPC (ver [P0-02](P0-02-rls-autorizacion.md)).

## Notas de implementación

Sesión del 28/10/2026 (modo agente). Copia de trabajo verificada byte a byte contra `main` @ `3db0f80` antes de editar (los archivos de `moduloAcceso\entregas\rebrand-src\` son previos al rebranding y NO se usaron como base).

**Qué cambió**

1. `config.js` — helper central:
   - `escaparHtml(t)`: escapa `& < > " '`. Global y alias `NA.esc` / `NA.escaparHtml`.
   - Validadores de profundidad: `textoPersonaValido(v, max)`, `cedulaValida(v)`, `correoValido(v)`, `telefonoValido(v)`. Rechazan `<`/`>` y longitudes excesivas; NO sustituyen al escape.
2. `puerta.html` — escapados con `escaparHtml`: vendedor (nombre/apellido/cédula/empresa), organización y código corto de cortesías (lista e individual), `razonLegible` (incluye `causa`), personas de listas de talento (nombre/apellido/cédula/cargo), ganador de premiación (nombre/apellido/cédula/concurso), talento/código/estado de listas. `data-nombre` eliminado de los botones "✅ Autorizar" (se leía en los handlers pero nunca se usó) junto con sus dos `const nombre`. Sumideros genéricos blindados: `modalAlert`/`modalConfirm`/`modalPrompt` (mensaje y título) y `mostrarCargando`/`mostrarError` (cubren mensajes con contenido de QR arbitrario y `e.message`).
3. `dashboard.html` — escapados `item.tipo`/`item.nombre`/`item.codigo`/`item.link` en las alertas expandibles; `onclick="copiarLink('${item.link}')"` reemplazado por `data-copiar` (valor con `encodeURIComponent`) + `addEventListener` delegado; `toggleDetalle` ahora por `data-idx` + listener; `e.message` del panel de carga escapado.
4. `cortesia.html` — escapados: `tituloPrincipal` (organización/beneficiario), `razonLegible`, nombres de personas en el pase, `d.concurso` en premiación y `linkEntrega` en ambos bloques de link; `e.message` del error de carga. El `<strong>` del aviso "ya fue utilizado" es HTML intencional con fecha local (se conserva; el dato peligroso de ese caller no es de usuario). Los `mensajeWA` van solo a `urlWA`/`urlMail`, que hacen `encodeURIComponent` — sin contexto HTML.
5. `aliado.html` — modales `modalAlert`/`modalConfirm` ahora escapan mensaje, título y texto del check (cubre `concurso.nombre` y datos del ganador en "ÚLTIMA ADVERTENCIA", `r.error` y `e.message`). Validaciones nuevas: al crear concurso (nombre ≤80, descripción ≤300, sin `<`/`>`) y al asignar ganador (nombre/apellido ≤60, cédula solo números, correo y teléfono válidos).
6. `stand.html` — `e.message` de conexión escapado; validación de nombre/apellido (≤60, sin `<`/`>`) y cédula (números, 4–20) al agregar personas; empresa (≤80) y rubro (≤120) al registrar. Sus tablas ya usaban `textContent`.
7. `talento.html` — validación por fila al guardar lista: nombre/apellido (≤60, sin `<`/`>`), cédula (números, 4–20), cargo (≤60, sin `<`/`>`). Sus tablas ya usaban `esc`; sus avisos usan `textContent`.
8. `admin.html` y `estadisticas.html` — `e.message` de los bloques catch escapados con el `esc` local (barrido "casos restantes"; añadidos al frontmatter `archivos`).

**Verificación estática ejecutada (evidencia)**

- Grep de la tarea (`\$\{[^}]*(nombre|apellido|cedula|empresa|vende|correo|telefono|concurso|organizacion)` + `mensaje|razon`): todas las coincidencias restantes están escapadas, son valores internos (números, `Día 1/2`, clases CSS) o van solo a `urlWA`/`urlMail` con `encodeURIComponent`.
- `onclick="…${…}"`: 0 coincidencias en el proyecto. `data-nombre`: 0 coincidencias.
- Barrido de concatenaciones tipo `+ x.nombre +`: los 24 puntos restantes son `textContent`, `confirm`/`alert` nativos (solo texto), portapapeles o URLs codificadas. aliados/cortesias/aliados-concursos/coord/admin ya escapaban con `esc` (superficies de la Sesión 12).
- Sintaxis: `node --check` sobre `config.js` y los 9 bloques `<script>` inline de los archivos tocados — 0 errores (Node v22.12.0).

**Prueba en vivo (28/10/2026, evento real con edición reabierta y cerrada de nuevo; ejecutada por el usuario, verificada por el asistente; desplegada en commit `44ef31ab`, Actions #166 verde)**

1. Formulario público de talento RECHAZA el payload `<img src=x onerror=alert(1)>` con el mensaje exacto "Hay un nombre o apellido no valido (maximo 60 caracteres, sin < ni >) en la lista del Dia 2." — la entrada maliciosa no llega a la base (defensa en profundidad activa; mismo patrón de rechazo en stand y aliado).
2. El nombre `O'Brien "Prueba"` (apóstrofe + comillas) se guardó y se mostró INTACTO en: tabla del talento, puerta en vivo (lista `L-0765D8`) y vista "LISTA COMPLETADA" — sin `alert`, sin atributos ni botones rotos.
3. No-regresión funcional: autorizar en puerta de punta a punta (diálogo de confirmación con el nombre bien escrito → estado `autorizado` con hora 7:21:46 p. m. → cierre automático de la lista al completarse).
4. Limpieza del ejemplo ejecutada por el usuario en el SQL Editor de Supabase (persona/lista/talento de prueba borrados por id exacto, con verificación final en 0 filas).

Los hallazgos de la sesión de pruebas (F-1 repetir Día 1 en talento; F-2 orden de "Mis links"; F-3 revalidar lógica edición abierta/cerrada; F-4 QR de talento sin código corto visible; F-5 parámetros `?lista=`/`?v=` perdidos sin sesión previa) quedan registrados en ESTADO/DECISIONES como backlog — fuera del alcance de P0-01.

**Decisiones tomadas**

- Escape central en `config.js` (opción A del paso 1): `config.js` ya se carga en las 13 páginas antes de cada script inline; no se creó `js/seguridad.js`.
- Los 8 `esc()` locales existentes se dejan funcionando (comportamiento equivalente); unificarlos sobre `NA.esc` queda para el refactor de P2-02 para mantener este cambio quirúrgico.
- `data-nombre` se eliminó en lugar de escaparse: era un atributo muerto.
- La validación bloquea `<`/`>` y longitud, pero permite apóstrofes y comillas para no rechazar nombres legítimos (p. ej. "O'Brien"): la barrera real sigue siendo el escape.
