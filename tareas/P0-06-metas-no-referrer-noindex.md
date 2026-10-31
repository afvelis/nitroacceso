---
id: "P0-06"
titulo: "Reponer meta no-referrer y noindex en las páginas"
prioridad: "P0"
estado: "hecho"
area: "seguridad"
depende_de: ["P0-04"]
archivos:
  - "index.html"
  - "coord.html"
  - "admin.html"
  - "estadisticas.html"
  - "acceso-denegado.html"
  - "puerta.html"
  - "stand.html"
  - "cortesia.html"
  - "cortesias.html"
  - "talento.html"
  - "dashboard.html"
  - "aliado.html"
  - "aliados.html"
  - "aliados-concursos.html"
  - "tareas/README.md"
---

# P0-06 · Reponer meta no-referrer y noindex en las páginas

## Contexto

La fase 2 de P0-04 (Sesión 16) subió `<meta name="referrer" content="no-referrer">` y `<meta name="robots" content="noindex, nofollow">` a las 14 páginas, pero una edición posterior (fases 3/4a) sustituyó la línea del `<meta name="viewport">` y con ella desapareció la línea siguiente, que era donde iban los metas. El 30/10/2026 (Sesión 17) se detectó que **ninguna página de `main` los tenía**, aunque P0-04 figuraba como hecha. Sin `no-referrer`, al pulsar un enlace externo el navegador envía la URL completa, **que lleva el código del pase** (`?t=`, `?c=`, `?s=`); sin `noindex`, un buscador puede indexar un link con nombres y cédulas. La garantía G6 de SEGURIDAD-NitroSystem.md quedó marcada como REGRESIÓN ABIERTA.

## Evidencia

- Origen de la regresión: sección «Metaetiquetas que hoy NO están en `main`» de [P0-04-qr-csp-dependencias.md](P0-04-qr-csp-dependencias.md).
- Antes del arreglo: 0 `name="referrer"` y 0 `name="robots"` en las 14 páginas de `main` (verificado leyendo el árbol blob a blob, 31/10/2026).

## Objetivo

Las 14 páginas vuelven a servir los metas: `no-referrer` en las 14 y `noindex, nofollow` en las 12 sensibles, sin tocar la CSP ni sus hashes.

## Pasos

- [x] 1. Verificar el estado de partida contra `main`: las 14 páginas locales comparadas por blob sha1 con el árbol de `main` — 14/14 idénticas al cierre de la Sesión 17.
- [x] 2. Insertar los metas justo debajo de la línea de la CSP, antes del viewport: `robots` + `referrer` en 12 páginas; solo `referrer` en `index.html` y `acceso-denegado.html` (diseño de la fase 2: pantallas neutras, registrado en DECISIONES.md 30/10).
- [x] 3. Verificación mecánica antes de subir (ver Verificación).
- [x] 4. Subida de las 14 HTML por Upload files a la raíz de `main` (commit `7be043ab`) y verificación blob de la subida: 14/14.
- [x] 5. Actions verde (Pages run #249) y prueba en vivo del usuario.
- [x] 6. Documentación: esta tarea + fila de P0-06 en el índice del backlog + fila de P0-04 corregida a `hecho`.

## Criterios de aceptación

- [x] `no-referrer` presente en las 14 páginas de `main`.
- [x] `noindex, nofollow` presente en las 12 páginas sensibles y ausente en `index.html` y `acceso-denegado.html`.
- [x] La línea de la CSP queda intacta: los sha256 de los 15 bloques `<style>` y de los 3 mini-scripts, recalculados desde los archivos finales, coinciden con los declarados en cada CSP.
- [x] 0 `style=` y 0 `on*=` (sin cambios), LF sin BOM, y cero líneas perdidas respecto a la versión anterior (solo inserciones).
- [x] Actions verde y prueba en vivo con consola limpia.

## Verificación

- **Mecánica, antes de subir** (script local de la sesión): reconstrucción byte a byte (archivo nuevo = anterior + líneas insertadas tras la CSP), hashes de CSP 15+3 OK, 0 `style=`/`on*=`, conteos de metas (14 referrer + 12 robots), diff sin pérdidas.
- **Tras subir**: árbol de `main` revisado por la API — las 14 huellas blob coinciden con las generadas (tabla en Notas) y el resto del repo quedó intacto. Pages run #249 verde.
- **En vivo** (usuario, 31/10/2026, tras Actions verde, con Ctrl+F5): (1) `index` se ve normal, su fuente muestra `no-referrer` y no muestra `robots`; (2) el código fuente de `puerta.html` muestra las dos líneas debajo de la CSP; (3) consola de `index` limpia (el ruido de MetaMask no cuenta).

## Fuera de alcance

- Cambios de CSS, scripts o de la CSP (ninguno: los hashes no cambiaron).
- Cabeceras HTTP reales (`Referrer-Policy` como cabecera): GitHub Pages no las permite; el `<meta>` es el mecanismo disponible.
- La prueba de XSS con payload explícito (verificación opcional separada, registrada en SEGURIDAD-NitroSystem.md §7).

## Notas de implementación

- Qué cambió: inserción de 1–2 líneas de `<meta>` por página, inmediatamente después de la línea de la CSP; nada más.
- Archivos tocados: las 14 HTML de la raíz, esta tarea y `tareas/README.md`.
- Pruebas ejecutadas: las tres capas de arriba (mecánica, blob tras subir, en vivo).
- Huellas blob en `main` tras la subida (commit `7be043ab`):

| Archivo | Blob sha1 | Bytes |
| --- | --- | --- |
| `index.html` | `31e91c0aa1ff741483beb7bb0ee11e6d1111ae5d` | 3311 |
| `acceso-denegado.html` | `496586780348b30c846a1a8a6a5ce7bcc656448a` | 2268 |
| `coord.html` | `d84e6c82d087123bbf6e404f57d1e3e4cf63d40d` | 7538 |
| `admin.html` | `a60b95e82fae19a39ae7253a650f291ab1175923` | 7506 |
| `estadisticas.html` | `a6f1bf0e4a2aaf14439070eb4c4e2458a00f3ea8` | 7655 |
| `talento.html` | `94eb657d6dce25ecc26509433cc27f0bf68c2f90` | 5680 |
| `puerta.html` | `e6114c4bcb93cd972f1a7af22025ccd3a1c553f1` | 9479 |
| `cortesia.html` | `209fe98752794ad3b5d2bf8e01180be794a150c8` | 5601 |
| `stand.html` | `1a28b54a6a5c4e8a99bef353d6a7376e583e7d1a` | 9011 |
| `dashboard.html` | `2344f6d24a746dc5ce472e5ec103898cd7d6c67d` | 8627 |
| `aliados-concursos.html` | `2d425585206676e5d56a7f13eadfbf6a1f8eac61` | 7584 |
| `aliados.html` | `70009fd06df2b85ea0f1b6b70b2462b50d4d3453` | 8585 |
| `aliado.html` | `08b2cb004d7825dd8776785f46ff87667199b6bb` | 12368 |
| `cortesias.html` | `60ee2c769ed739039013fb16cf8f3e14f5fe5586` | 13613 |

- Riesgos o pendientes: ninguno conocido. **Regla para páginas nuevas** (refuerza SEGURIDAD §3): el orden del `<head>` es charset → CSP → `robots`/`referrer` → viewport; al editar la línea del viewport, no tocar las contiguas (así se perdió la primera vez).
