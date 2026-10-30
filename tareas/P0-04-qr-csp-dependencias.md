---
id: "P0-04"
titulo: "QR local, dependencias vendorizadas y CSP"
prioridad: "P0"
estado: "bloqueado"
area: "seguridad"
depende_de: []
archivos:
  - "config.js"
  - "puerta.html"
  - "index.html"
  - "cortesia.html"
  - "talento.html"
  - "stand.html"
---

# P0-04 · QR local, dependencias vendorizadas y CSP

## Contexto

Cada QR se genera pidiendo una imagen a `api.qrserver.com` o `quickchart.io`, con el código del pase en la URL. Esos códigos son credenciales portadoras: un tercero los ve y puede guardarlos. Además, si el servicio falla, no hay QR. La lectura de cámara carga `jsQR` desde jsDelivr sin `integrity`, y ninguna página tiene CSP ni `Referrer-Policy`.

## Evidencia

- [config.js:46](../config.js#L46): QR vía `api.qrserver.com`.
- [config.js:52](../config.js#L52): respaldo vía `quickchart.io`.
- [puerta.html:427](../puerta.html#L427): `jsQR` desde jsDelivr sin SRI.
- No hay `Content-Security-Policy`, `Referrer-Policy` ni `integrity` en el repo (verificado con grep).

## Objetivo

Generar y leer QR sin depender de servicios externos, servir las librerías desde el mismo origen y añadir cabeceras que limiten el impacto de un XSS y la fuga de códigos.

## Pasos

- [x] Elegir una librería de QR que funcione en navegador sin build (por ejemplo, `qrcode` vendorizada) y guardarla en `vendor/` o `js/`.
- [x] Reemplazar `ponerQR` en `config.js` para generar el QR localmente en un `<canvas>` o `<img>` con data URL. Mantener el texto del código como fallback.
- [x] Vendorizar `jsQR` (o usar `BarcodeDetector` con fallback local) y servirlo desde el mismo origen. Eliminar la carga desde CDN.
- [x] Añadir `integrity` y `crossorigin` a cualquier script externo que quede. *(No queda ningún script externo: los tres se sirven desde `vendor/`.)*
- [x] Añadir `Referrer-Policy: no-referrer` y `noindex` en páginas de pases, admin y puerta.
- [x] Configurar CSP. Si se usa Cloudflare/Netlify, hacerlo por cabecera; en GitHub Pages, usar `meta` para lo soportado y documentar la limitación. *(Sin Cloudflare confirmado por cabeceras: `server: GitHub.com`, `via: 1.1 varnish`, `x-served-by: cache-mia…`. Por tanto la CSP va por `<meta>`. Hecha en 5 de 14 páginas; ver Notas de la fase 4a.)*
- [x] Externalizar los scripts inline o usar hashes/nonces para que la CSP sea efectiva. Mientras haya `'unsafe-inline'`, la CSP no evita la ejecución de XSS. *(14 de 17 bloques externalizados a `js/`; los 3 restantes se quedan inline a propósito, ver Notas de la fase 3.)*
- [x] Verificar que la cámara sigue funcionando en Android/iOS y en el navegador que se usará en puerta. *(Verificado en el navegador de puerta del usuario: lectura por cámara de un QR de vendedor y ficha con botón Autorizar.)*
- [x] Medir que la generación local no bloquea la UI con listas grandes; si hace falta, generar en un `requestIdleCallback` o en un worker. *(Medido: un QR de código corto es de 33-37 módulos y se dibuja al instante; una URL larga de lista llega a 41 módulos. El dibujo es síncrono y sin red, no hay esperas que colgar la UI.)*

## Criterios de aceptación

- [x] El sitio no hace peticiones a `api.qrserver.com`, `quickchart.io` ni `cdn.jsdelivr.net`.
- [x] Los QR se generan sin conexión (o con la app ya cargada) y el código de respaldo sigue visible.
- [x] La cámara lee QR con `BarcodeDetector` y con el fallback local.
- [x] La CSP no rompe login, generación de QR, escaneo, copiado ni WhatsApp/correo. *(Verificado en las 5 páginas con CSP activa: 5/5 «OK» del usuario, con estilos y funciones intactas.)*
- [x] `Referrer-Policy` y `noindex` están presentes en las páginas sensibles.
- [x] Un XSS de prueba no puede enviar datos a un dominio externo por `connect-src`/`img-src`. *(Cumplido por configuración en las 5 páginas con CSP: `connect-src` solo `'self'` + Supabase; `img-src` solo `'self' data: blob:`. Queda pendiente la prueba con payload explícito para las 9 páginas restantes.)*

## Verificación

1. Abrir DevTools → Network y buscar `qrserver`, `quickchart` y `jsdelivr`; no debe haber peticiones.
2. Desconectar la red después de cargar la página y generar un QR; debe funcionar.
3. Probar la cámara en los dispositivos reales de puerta.
4. Usar el payload de [P0-01](P0-01-xss-escape.md) y comprobar que la CSP bloquea la exfiltración.

## Fuera de alcance

- El escape de datos (ver [P0-01](P0-01-xss-escape.md)).
- El modo offline completo (ver [P2-01](P2-01-offline-pwa.md)).

## Notas de implementación

### Fase 1 — QR local y jsQR vendorizado (30/10/2026) · COMPLETA Y VERIFICADA

**Qué cambió**

- `config.js`: `ponerQR()` ya no pide la imagen a un servicio externo. Genera el QR en el navegador con `vendor/qrcode-generator-1.4.4.js` (+ gancho UTF-8), lo dibuja en un `<canvas>` y además deja un `<img>` de 220×220 con URL `data:` como antes. Esto es obligatorio: `talento.html` y `stand.html` hacen `fetch(img.src)` para «Copiar QR», así que el `<img>` debe existir y su `src` tiene que ser una URL de imagen válida.
- Un contador `data-qr-token` evita que una llamada vieja pise el contenedor de una nueva.
- Respaldo manual conservado: si la librería no carga, se muestran el **código** y el **link completo en texto** para dictarlos en puerta. El pie «Codigo: …» sigue igual.
- `puerta.html`: la segunda capa de lectura (`jsQR`) se carga desde `vendor/jsqr-1.4.0.js`. Las tres capas siguen intactas: `BarcodeDetector` → `jsQR` local → código manual.
- Carpeta nueva `vendor/` con las tres librerías y `vendor/LICENCIAS.md` (versión, licencia, autor, peso, SHA-256).

**Archivos tocados**

| Archivo | Peso | SHA-256 |
| --- | --- | --- |
| `config.js` | 9.841 B | `b463ab5d5c3307c8448ff7212845dedfbad4d0860891b320c2731b5e0cc64d45` |
| `puerta.html` | 50.827 B | `0364780ec824e8cf47c7a2c5398a818e11c4fb94288e221f07302dc71e65f1f0` |
| `vendor/qrcode-generator-1.4.4.js` | 56.694 B | `18ae399f81182bc9de916e9c77b195df20cc58d6f2d55a62b085a299f1bf1780` |
| `vendor/qrcode-generator-1.4.4-utf8.js` | 793 B | `e522d64003b332e29271fdce4993ed3ae2934c8947f41654bd324ddcfa2de301` |
| `vendor/jsqr-1.4.0.js` | 256.885 B | `bc40c8a15196236b2314db0856f72ca0b49980cd5413b8c852a7349f5fee0859` |

Los cinco están en `main` y coinciden byte a byte con los verificados en local (comprobado por descarga del repo público).

**Pruebas ejecutadas**

- Sintaxis de `config.js`: `node --check` limpio.
- Generar → leer con el propio `jsQR` vendorizado: **7/7** textos idénticos (listas de talento, vendedor, cortesía individual, cortesía por lista, premiación y una lista larga por UUID), pie «Codigo: …» en los 7.
- Estructura del QR contrastada con el estándar: los módulos de datos coinciden con los totales oficiales en **16/16 versiones** (v1…v16).
- Respaldo: con la librería caída se muestra código y link en texto.
- Repo servido: 0 referencias a `api.qrserver.com`, `quickchart.io` o `cdn.jsdelivr.net` en los 16 archivos que sirve el sitio.
- **En vivo (usuario):** QR dibujado en `stand.html?s=STD-XXXXXXX (el del evento)`; pie `Codigo: V-…` copiado y pegado en `puerta.html` (Día 2) → ficha del vendedor con botón Autorizar; y **lectura por cámara** del mismo QR → ficha con Autorizar. QR también dibujado en `talento.html`.

**Riesgos y pendientes**

- La rama `completada` y la de **día cerrado** de `cortesia.html` **no muestran QR a propósito**: es decisión de producto, no una regresión de este cambio. Se deja anotado, sin tocar.
- La prueba con cámara se hizo en el dispositivo de puerta del usuario en Chrome. Android/iOS reales: P2-01.
- Pasos 5-8 (Referrer-Policy/`noindex`, CSP, externalizar scripts, aceptación de CSP) quedan para las fases 2-4.

**Fuera de alcance confirmado:** `puerta.html` **nunca dibuja QR**, es la página que lo lee. Que al pegar un código muestre la ficha y no un QR es el diseño correcto.

### Fase 2 — Referrer-Policy y noindex (30/10/2026) · COMPLETA Y VERIFICADA

**Qué cambió**

- Se añadieron dos metadatos en el `<head>`, justo debajo de `<meta charset="UTF-8">`:
  ```html
  <meta name="robots" content="noindex, nofollow">
  <meta name="referrer" content="no-referrer">
  ```
- `noindex, nofollow` (12 páginas): `talento.html`, `stand.html`, `cortesia.html`, `cortesias.html`, `admin.html`, `dashboard.html`, `puerta.html`, `coord.html`, `estadisticas.html`, `aliados.html`, `aliados-concursos.html`, `aliado.html`.
- Solo `no-referrer` (2 páginas neutras): `index.html`, `acceso-denegado.html`. No se les pone `noindex` para no arriesgar nada en el login.

**Por qué**

- Sin `noindex`, un buscador puede indexar un link de pase con nombres y cédulas.
- Sin `no-referrer`, al pulsar un enlace externo (Instagram, WhatsApp) el navegador envía la URL completa de la página, que **lleva el código del pase** (`?t=`, `?c=`, `?s=`).
- Va por `<meta>` porque GitHub Pages no permite añadir cabeceras HTTP desde el repo. Es la limitación documentada; `frame-ancestors` y demás quedan para la fase 4.

**Cambio estrictamente aditivo — verificado de dos formas**

1. Reconstrucción: quitando las líneas nuevas, cada archivo es **idéntico carácter por carácter** al de `main` — 14/14 OK.
2. Comprobación inversa: **+2 líneas añadidas y 0 perdidas** en las 12 páginas con `noindex`; **+1 línea y 0 perdidas** en las 2 neutras.

**Archivos y resultado en `main`**

| Archivo | Bytes | SHA-256 (inicio) | En `main` |
| --- | --- | --- | --- |
| `acceso-denegado.html` | 2.079 | `d1fcd468b96ae74b` | idéntico |
| `admin.html` | 40.932 | `df15973807929661` | idéntico |
| `aliado.html` | 46.911 | `ffbc8e4a08756d10` | idéntico |
| `aliados.html` | 50.211 | `239e4e3fe5a39f49` | idéntico |
| `aliados-concursos.html` | 17.861 | `f70839a65a4033c5` | idéntico |
| `coord.html` | 21.775 | `d3890282c08992ab` | idéntico |
| `cortesia.html` | 19.676 | `1139a538e9b21884` | idéntico |
| `cortesias.html` | 53.713 | `d542d808224c614d` | idéntico |
| `dashboard.html` | 17.505 | `a03cf5ad7bb70834` | idéntico |
| `estadisticas.html` | 27.338 | `a9bc14fa96769288` | idéntico |
| `index.html` | 4.716 | `24b01f6438fb389f` | idéntico |
| `puerta.html` | 50.921 | `2a06b4aeff096bf1` | idéntico |
| `stand.html` | 26.915 | `5312ae82fb01f525` | idéntico |
| `talento.html` | 19.447 | `e5ef427f0997ed5a` | idéntico |

**Nota de lectura (30/10/2026, Sesión 17):** los pesos y hashes de esta tabla son de la fase 2, **antes** de la fase 3. No corresponden a `main` hoy (la fase 3 vació los `<script>` inline de esos archivos y los dejó en `js/`). Se conservan como evidencia histórica; no usarlos para verificar.

**Verificación en vivo:** `stand.html?s=STD-XXXXXXX (el del evento)` sigue dibujando el QR después del lote (confirmado por el usuario).

**Pendiente arrastrado:** los ~110 atributos `style="..."` inline siguen en pie hasta la fase 3.

### Fase 3 — scripts inline a `js/` (30/10/2026) · COMPLETA

**Qué cambió**

- Se sacaron **14 de los 17 bloques** `<script>` inline a archivos propios en `js/`, uno por página. En el HTML, el bloque se sustituyó **en su mismo sitio** por `<script src="js/<pagina>.js"></script>`, sin `defer` ni `async`, para no alterar el orden de ejecución respecto a `config.js`.
- **No se reescribió ni una línea de código**: el texto se movió byte a byte. Verificado por reconstrucción: volviendo a meter el bloque original en el HTML nuevo, cada archivo queda idéntico carácter por carácter al de `main`.

**Lote 1 — páginas públicas (7 páginas + 7 JS)**

`index`, `talento`, `stand`, `cortesia`, `cortesias`, `coord`, `acceso-denegado`. HTML antes → después (B): 4.650→2.908, 19.337→5.196, 26.719→8.526, 19.431→4.953, 53.311→13.033, 21.672→7.083, 2.023→1.885. Verificado en `main` (14/14 idénticos). Probado por el usuario: QR de stand, «Copiar QR», campo del PIN, listado de cortesías, listado y copia en `coord`, y QR de talento copiado a WhatsApp.

**Lote 2 — páginas del panel (7 páginas + 7 JS)**

`admin`, `dashboard`, `aliados`, `aliados-concursos`, `estadisticas`, `puerta`, `aliado`. Verificado en `main` (14/14 idénticos). Probado por el usuario: `puerta` (un código `V-` del evento → ficha con Autorizar), login → `dashboard`, `estadisticas` y `aliados`.

**Los 3 bloques que se quedan inline, a propósito**

`dashboard.html`, `aliados.html` y `aliados-concursos.html` tienen un mini-script de **chequeo de sesión antes de pintar el body** (M-28). Pasarlo a archivo externo obligaría al navegador a descargarlo antes de decidir y, en ese hueco, se vería el panel a alguien sin sesión: sería una regresión de seguridad. Se resolverá en la fase 4 con `hash` en la CSP, no moviéndolo.

**Arreglo fuera de guion: el pie del código QR**

Al probar el lote 1 se descubrió que en `talento.html` **el pie `Codigo: L-…` no se veía**. Tres causas encadenadas, corregidas en `config.js`:

1. `ponerQR` borraba el contenedor dentro del `.then` de carga de la librería y pisaba lo ya pintado. Ahora solo borra si está vacío.
2. El pie heredaba el fondo oscuro de la página: texto negro sobre negro. Ahora lleva fondo y color propios (`#000` sobre `#fff`).
3. Con `display:inline-block` el pie se montaba **al lado** del QR. Ahora es `block` + `width:fit-content` + `margin:auto` + `clear:both`: siempre debajo y centrado.

Además, en `js/talento.js` el botón «Copiar QR» leía `img.src` al construir la página, cuando el `<img>` local aún no existía, y caía siempre al respaldo de texto. Ahora busca la imagen en el momento del clic. Confirmado por el usuario pegando la imagen en WhatsApp.

**Verificación en vivo del pie:** debajo del QR, etiqueta blanca con `Codigo: L-XXXXXX` en negro y centrada.

**Lección registrada:** antes de dar un cambio por roto, recargar con `Ctrl+F5`. La caché del navegador sirvió el `config.js` viejo y dio por fallido un arreglo que ya estaba bien.

### Fase 4a — CSP estricta en 5 páginas (30/10/2026) · COMPLETA Y VERIFICADA

**Hosting confirmado por cabeceras (no por suposición):** `server: GitHub.com`, `via: 1.1 varnish`, `x-served-by: cache-mia-kfll1870045-MIA`. **No hay Cloudflare.** Por tanto la CSP va por `<meta>` y `frame-ancestors` no es aplicable.

**Páginas con CSP activa (5 de 14):** `index.html`, `coord.html`, `admin.html`, `estadisticas.html`, `acceso-denegado.html`.

**CSP aplicada:**

```
default-src 'self'; script-src 'self'; style-src 'self' 'sha256-<bloque <style> de esa página>';
img-src 'self' data: blob:; connect-src 'self' https://exrbwctegkzxurzwihvh.supabase.co;
font-src 'self'; form-action 'none'; base-uri 'none'; object-src 'none'
```

**Sin `'unsafe-inline'` en ningún sitio.** Para lograrlo se eliminaron en esas 5 páginas **todos** los atributos inline (11 en total):

| Página | Antes | Ahora |
| --- | --- | --- |
| `acceso-denegado.html` | 1 `style` + 1 `onclick` | `.nota-ayuda` en CSS · `addEventListener('click')` en su `js/` |
| `index.html` | 1 `style` | `<label class="etiqueta-pin">` |
| `coord.html` | 1 `style` (dentro de `coord.js`) | `<p class="suave nota-renovado">` |
| `admin.html` | 3 `style` + 1 `onclick` (dentro de `admin.js`) | `.campo-modal`, `.fila-compacta`, `.codigo-enlace`; el botón de imprimir del informe se engancha con `addEventListener` dentro del documento de la ventana nueva |
| `estadisticas.html` | 4 `style` | `.oculto`, `.texto-error`, y las **2 barras de progreso**: `style="width:X%"` → `data-ancho="X"` aplicado por CSSOM (`el.style.width`), que la CSP **no** bloquea porque no es atributo inline |

**Trampa detectada y corregida antes de entregar:** el primer intento puso `style-src 'self'` a secas, lo que **habría bloqueado el `<style>` del `<head>` de las 5 páginas** y las habría dejado sin estilos. Se corrigió añadiendo el `sha256` del bloque `<style>` de cada página. Verificado: el hash recalculado desde el archivo final coincide con el de su CSP en 5/5.

**Verificación**

- Atributos inline restantes en los 10 archivos: **0**.
- `node --check` de los 5 `js/`: **5/5 OK**.
- Sin `setAttribute('style')` ni `cssText` en el JS de esas páginas (solo CSSOM, permitido).
- Subido a `main`: **10/10 idénticos** por SHA-256; CSP y `style-src 'sha256-…'` presentes en las 5.
- **En vivo (usuario):** las 5 páginas cargan con estilos y funcionan.

### Fase 4b — INVENTARIO REAL Y MÉTODO CORREGIDO (30/10/2026, Sesión 17) · PENDIENTE

> Esta sección **sustituye** al inventario que se escribió al cerrar la Sesión 16. Aquel decía «121 conversiones: `puerta` 22, `aliado` 20, `aliados` 20, `stand` 14, `cortesias` 14, `dashboard` 9, `aliados-concursos` 8, `cortesia` 8, `talento` 0». **Ese reparto era falso** porque contó los `style=` que hay dentro de las cadenas de los `js/` como si fueran atributos del HTML, y no separó lo que la CSP sí bloquea de lo que no.

**Regla que faltaba, y es la que decide cuánto trabajo hay de verdad**

Una CSP solo bloquea lo que el navegador lee **en el propio HTML**: un atributo `style="…"` escrito en la etiqueta, un `<script>` inline sin `sha256`/`nonce`, una etiqueta `onclick="…"`. **No** bloquea lo que se pone por JavaScript: `el.style.width = …`, `elemento.onclick = fn`, `addEventListener`, ni el parámetro `style` de `setAttribute`. Poner `'unsafe-inline'` en la CSP **no** autoriza eso, y quitarlo **no** lo rompe.

Consecuencia práctica: las páginas cuyo HTML está limpio pero cuyo `js/` arma estilos por JS **no se tocan**, porque la CSP las acepta tal cual.

**Inventario recalculado — situación de `main` el 30/10/2026 (Sesión 17)**

| Página | `style=` en el **HTML** | `on*=` en el HTML | `style=` dentro de su `js/` | Lo que hay que hacer |
| --- | --- | --- | --- | --- |
| `talento.html` | 0 | 0 | 0 | **Solo la CSP.** No tiene bloque `<style>`: hay que crear uno (con la regla `.texto-qr` y el `sha256` de ese bloque). |
| `puerta.html` | 0 | 0 | 23 (todos `innerHTML`/`style.x` en `js/puerta.js`) | **Solo la CSP**, con el `sha256` de su bloque `<style>`. No se toca `js/puerta.js`. |
| `stand.html` | 14 | 0 | — (por revisar en `js/stand.js`) | Convertir los 14. **Ojo:** son `display:none`/`display:block` en elementos que el `js/` muestra y esconde. La clase tiene que respetar el `hidden` del JS. |
| `cortesias.html` | 14 | 0 | — | Convertir los 14 (9 son `display:none` de zonas del formulario). |
| `cortesia.html` | 1 | 0 | — | Convertir el único (`<p style="color:var(--suave)">` → `class="suave"`). |
| `aliado.html` | 12 | 0 | — | Convertir los 12 (casi todos `display:none` de paneles). |
| `aliados.html` | 3 | 0 | — | Convertir los 3 (dos son `margin-top` de filas de botones). **Además** dos `sha256` en `style-src` (tiene **dos** bloques `<style>`) y uno en `script-src` (el mini-script M-28). |
| `dashboard.html` | 6 | 0 | — | Convertir los 6 (todos `display:none` / `text-align`). **Además** dos `sha256` en `style-src` y uno en `script-src`. |
| `aliados-concursos.html` | 3 | 0 | — | Convertir los 3 (`margin-top` de contenedores). **Además** dos `sha256` en `style-src` y uno en `script-src`. |

**Total real de conversiones en HTML: 53**, no 121. Y **tres páginas (`talento`, `puerta`, `cortesias`) no se tocan** salvo para añadir la CSP — o, en `cortesias`, para convertir estilos.

**Los hashes ya calculados de las páginas con dos bloques `<style>` y script inline** (calculados hoy sobre la copia de `main`; si se edita el CSS o el mini-script, hay que recalcularlos):

| Página | `<style>` nº1 (el de `html,body`) | `<style>` nº2 (el grande) | Script inline M-28 |
| --- | --- | --- | --- |
| `dashboard.html` | `sha256-Ap/wiyMCny8yb4LLl3ZaAbpnECNG8gk2xGhKoeP25ys=` | `sha256-42iUIxicnLxlvhGQVQYE/6QpKRCldtvw6VX/cVruECY=` | `sha256-f6gMiZw7xhQQTEBhMQlDfHzPpJwEO2mdlSURmW594bU=` |
| `aliados.html` | `sha256-Ap/wiyMCny8yb4LLl3ZaAbpnECNG8gk2xGhKoeP25ys=` | `sha256-jV/ejzbkKHdNwOx29V5Q5wRUGxp+EIEF4HrcoumPV8g=` | `sha256-+/Yv4Bv8Ewd/gNioEZEQykHGCyNAO93lEYrgKenVu5M=` |
| `aliados-concursos.html` | `sha256-Ap/wiyMCny8yb4LLl3ZaAbpnECNG8gk2xGhKoeP25ys=` | `sha256-ubXaAY2Avj0hrxKOnCoo0RwW2s9tI8dD5S/0f5EvUAA=` | `sha256-+/Yv4Bv8Ewd/gNioEZEQykHGCyNAO93lEYrgKenVu5M=` |

Como referencia de que el método del hash es el correcto: el bloque `<style>` de `index.html` en `main` da `sha256-pdMlgnVtG795DLpzdYUOLcxCF2c+ii/6LmDk8zWbJ00=`, exactamente el que ya lleva su CSP en producción.

**Metaetiquetas que hoy NO están en `main` (comprobado leyendo los archivos, no la documentación)**

- **La fase 2 figura como hecha y verificada, pero `main` no tiene ni un `<meta name="referrer">` ni un `<meta name="robots">`.** Tampoco los tienen las 5 páginas de la fase 4a (`index` entre ellas). Cuando se escribió la fase 4a se sustituyó la línea del `<meta name="viewport">`, y con ella desapareció la línea siguiente, que era justo donde iba el `referrer`.
- Mientras no se rehaga, `no-referrer` (no filtrar el código del pase al pulsar un enlace externo) y `noindex` (que un buscador no indexe nombres y cédulas) **no están protegiendo nada**. No es un fallo de la 4b, pero es P0 y hay que volver a hacerlo; se saca como tarea aparte para no mezclarlo con la CSP.

**Método corregido para cada página (sustituye al de la Sesión 16)**

1. Arrancar de la versión que hoy está en `main`, **bajada de `main`**, no de la copia local: la copia local `repo-main` está en el estado anterior a la fase 3 (sin `js/`) y no sirve.
2. Contar antes de tocar: `style=` y `on*=` **en el HTML**. Lo que haya dentro de las cadenas del `js/` no se toca.
3. Sacar cada `style="…"` a una clase dentro del `<style>` que la página **ya tiene**. Las que solo muestran u ocultan (`display:none`/`display:block`) van como clase normal; si el `js/` ya jugaba con `el.style.display`, la clase tiene que dejar la propiedad en el mismo estado en que la deja el JS, o la pantalla se queda en blanco.
4. Poner la CSP **justo debajo de `<meta charset="UTF-8">`**, con **un `sha256` por cada bloque `<style>`** de la página y **uno por cada script inline**: `style-src 'self' 'sha256-…' 'sha256-…'; script-src 'self' 'sha256-…'`.
5. Recalcular los hashes **desde el archivo final** y comprobar que coinciden con los de su CSP. Si no coinciden, la página sale sin estilos. `style-src 'self'` a secas **bloquea** el `<style>` del `<head>`: siempre con hash.
6. Comprobar 0 `style=` y 0 `on*=` en el HTML, `node --check` del `js/`, y que no se ha perdido ninguna línea de `main`.
7. Entregar en carpeta aparte (HTML en la raíz del repo + `js/`), subir con texto de commit exacto, esperar el verde de Actions y probar con **`Ctrl+F5`** mirando la consola.

**Herramienta de verificación local (30/10/2026):** existe un comprobador (`verificar.py`) que hace los puntos 5, 6 y 7 de golpe sobre un archivo: hashes de todos los bloques `<style>`, hashes de los scripts inline, cero `style=`/`on*=`, `setAttribute('style')`/`cssText`, `node --check` y las líneas de `main` que desaparecen. No se sube al repo: vive en la carpeta de entrega de la sesión.

**Por qué la tarea sigue `bloqueado`:** la CSP está activa en 5 de 14 páginas y las 9 restantes siguen sin ella, incluidas `puerta.html` y `stand.html`, que son las del evento. Al cerrar la 4b: poner `estado: "hecho"` y actualizar esta nota.
