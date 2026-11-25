---
id: "P0-10"
titulo: "CSP de puerta.html con hash style-src desfasado (página sin estilos en producción)"
prioridad: "P0"
estado: "en_progreso"
area: "seguridad"
depende_de: []
archivos:
  - "puerta.html"
  - "scripts/verificar-arranque.py"
---

# P0-10 · CSP de puerta.html con hash style-src desfasado

## Contexto

Incidente P0 reportado por el usuario EN PANTALLA el 25/11/2026: la pantalla de
puerta se ve **sin estilos** en producción. La página es monolítica (todo su CSS
vive en un único bloque `<style>` inline) y su CSP bloquea el estilo inline por
hash: si el hash declarado no coincide con el contenido real del bloque, el
navegador lo descarta completo y la página queda sin CSS.

## Evidencia

- `puerta.html:5`: el meta CSP declaraba
  `style-src 'self' 'sha256-ijztkVWP6KFM5tZX/wN7plEuFUefH2jDv1aWCZXDRaY='`.
- El hash calculado sobre los bytes exactos entre las etiquetas `<style>...</style>`
  (línea 11 de `puerta.html`) es
  `sha256-No2qdSo38EbkKjiSSCIvfL3K8i1CUlBEs552Pj3cgIM=`. No coincide: el bloque
  entero queda bloqueado y la página no tiene ningún otro CSS.
- Commit culpable: `18e0c95` (20/11/2026), que añadió la regla `.aviso-error{...}`
  al bloque `<style>` sin recalcular el hash declarado.
- El resto de los .html de la raíz cuadran (verificado con el guardia nuevo:
  16 páginas con style-src verificado, 4 con script-src, 0 desajustes).

## Causa raíz

Nadie verificaba los hashes CSP. El defecto era silencioso: no hay error en
consola para el usuario ni prueba automática que lo detectara; el único síntoma
era la pérdida de estilos en pantalla.

## Arreglo

`puerta.html:5`: hash `style-src` sustituido por el calculado real
`sha256-No2qdSo38EbkKjiSSCIvfL3K8i1CUlBEs552Pj3cgIM=`. El contenido del bloque
`<style>` y el resto del archivo NO se tocaron (mismo número de líneas que en
`bf6a15e`: 174).

## Prevención

`scripts/verificar-arranque.py` (sección j3) verifica automáticamente TODOS los
.html de la raíz: cada `sha256-` declarado en `style-src` y `script-src` de cada
meta CSP debe coincidir con el hash real del contenido de los bloques `<style>`
y de los scripts inline (bytes exactos entre etiquetas, como los hashea el
navegador). Un desajuste por cualquiera de las dos vías (hash declarado que no
corresponde a ningún bloque, o bloque real sin hash declarado) produce
`[FALLA] hashes CSP` con `archivo:línea`. Las páginas sin meta CSP no fallan.

## Criterios de aceptación

- [x] El hash declarado coincide con el calculado en `puerta.html`. **Prueba:**
      python3 sobre los bytes crudos: declarado `sha256-No2qdSo38EbkKjiSSCIvfL3K8i1CUlBEs552Pj3cgIM=`
      calculado `sha256-No2qdSo38EbkKjiSSCIvfL3K8i1CUlBEs552Pj3cgIM=` → MATCH.
- [x] `scripts/verificar-arranque.py` detecta un desajuste si se introduce a
      propósito. **Prueba** (en una copia del repo en /tmp, fuera del repo real):
      con el hash viejo `sha256-ijztkVW...` restaurado en `puerta.html` de la copia,
      el verificador imprime
      `[FALLA] hashes CSP ... 2 desajuste(s)` con
      `puerta.html:5 style-src: hash declarado 'sha256-ijztkVWP6KFM5tZX/wN7plEuFUefH2jDv1aWCZXDRaY=' no corresponde a ningun bloque real`
      y
      `puerta.html:11 style-src: bloque real sin hash declarado (calculado 'sha256-No2qdSo38EbkKjiSSCIvfL3K8i1CUlBEs552Pj3cgIM=')`;
      con un hash totalmente falso, también FALLA; con la copia sin alterar,
      vuelve a `[ OK ] hashes CSP`. Una página a la que se le quitó el meta CSP
      no produce FALLA (se ignora, la cuenta baja a 15 páginas).
- [ ] El usuario confirma EN PANTALLA que la puerta se ve con estilos.
      **PENDIENTE DE PRUEBA EN PANTALLA.**

## Notas de implementación

Implementado el 25/11/2026 en la rama `agente/2026-11-25-csp-hashes-puerta`
(desde `bf6a15e`). El guardia también verificó los `script-src` inline de
`aliados-concursos.html`, `aliados.html`, `dashboard.html` y `reclamos.html`:
los 4 cuadran, sin desfasajes que reportar.
