---
id: "P0-01"
titulo: "Eliminar el XSS almacenado y centralizar el escape"
prioridad: "P0"
estado: "pendiente"
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

- [ ] Crear una implementación única de escape. Se puede añadir `escaparHtml` a `config.js` (ya se carga en todas las páginas) o crear `js/seguridad.js` y cargarlo después de `config.js`. Exponerla como `NA.esc` o `escaparHtml`.
- [ ] Escapar **todos** los valores de usuario en `puerta.html`: vendedor, personas de listas, cortesías, premiaciones, talento, códigos y estados.
- [ ] Escapar los valores de usuario en `dashboard.html` (`item.nombre`, `item.codigo`, `item.link`) y reemplazar el `onclick` concatenado por un `addEventListener` con closure o `dataset`.
- [ ] Escapar los nombres y textos de concurso en `cortesia.html` y en los modales de `aliado.html` que concatenan `concurso.nombre` en `opts.mensaje`.
- [ ] Para atributos como `data-nombre`, dejar de concatenar HTML: crear el botón con `document.createElement` y asignar `btn.dataset.nombre = valor`. Si el dato no se usa, eliminarlo.
- [ ] Revisar `grep` de interpolaciones con `nombre`, `apellido`, `cedula`, `empresa`, `vende`, `correo`, `telefono`, `concurso`, `organizacion` y `mensaje` para detectar casos restantes.
- [ ] Añadir validación de longitud y caracteres permitidos en los formularios públicos (nombres, cédula, correo, teléfono) como defensa en profundidad, sin confiar en ella para el escape.
- [ ] Añadir una prueba manual documentada con el payload `<img src=x onerror=alert(1)>` en staging.

## Criterios de aceptación

- [ ] Un nombre `<img src=x onerror=alert(1)>` se muestra como texto literal en puerta, dashboard y cortesía; no se ejecuta.
- [ ] Un nombre con `"` o `'` no rompe atributos ni botones.
- [ ] `puerta.html`, `dashboard.html` y `cortesia.html` no tienen interpolaciones de datos de usuario sin escapar.
- [ ] No se usa `onclick` con datos de usuario concatenados.
- [ ] No hay regresiones en la autorización de entradas ni en la visualización de listas.

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

> Pendiente.
