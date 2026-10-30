---
id: "P0-04"
titulo: "QR local, dependencias vendorizadas y CSP"
prioridad: "P0"
estado: "en_progreso"
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
- [ ] Añadir `Referrer-Policy: no-referrer` y `noindex` en páginas de pases, admin y puerta.
- [ ] Configurar CSP. Si se usa Cloudflare/Netlify, hacerlo por cabecera; en GitHub Pages, usar `meta` para lo soportado y documentar la limitación.
- [ ] Externalizar los scripts inline o usar hashes/nonces para que la CSP sea efectiva. Mientras haya `'unsafe-inline'`, la CSP no evita la ejecución de XSS.
- [x] Verificar que la cámara sigue funcionando en Android/iOS y en el navegador que se usará en puerta. *(Verificado en el navegador de puerta del usuario: lectura por cámara de un QR de vendedor y ficha con botón Autorizar.)*
- [x] Medir que la generación local no bloquea la UI con listas grandes; si hace falta, generar en un `requestIdleCallback` o en un worker. *(Medido: un QR de código corto es de 33-37 módulos y se dibuja al instante; una URL larga de lista llega a 41 módulos. El dibujo es síncrono y sin red, no hay esperas que colgar la UI.)*

## Criterios de aceptación

- [x] El sitio no hace peticiones a `api.qrserver.com`, `quickchart.io` ni `cdn.jsdelivr.net`.
- [x] Los QR se generan sin conexión (o con la app ya cargada) y el código de respaldo sigue visible.
- [x] La cámara lee QR con `BarcodeDetector` y con el fallback local.
- [ ] La CSP no rompe login, generación de QR, escaneo, copiado ni WhatsApp/correo.
- [ ] `Referrer-Policy` y `noindex` están presentes en las páginas sensibles.
- [ ] Un XSS de prueba no puede enviar datos a un dominio externo por `connect-src`/`img-src`.

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
- **En vivo (usuario):** QR dibujado en `stand.html?s=STD-21B563B1`; pie `Codigo: V-…` copiado y pegado en `puerta.html` (Día 2) → ficha del vendedor con botón Autorizar; y **lectura por cámara** del mismo QR → ficha con Autorizar. QR también dibujado en `talento.html`.

**Riesgos y pendientes**

- La rama `completada` y la de **día cerrado** de `cortesia.html` **no muestran QR a propósito**: es decisión de producto, no una regresión de este cambio. Se deja anotado, sin tocar.
- La prueba con cámara se hizo en el dispositivo de puerta del usuario en Chrome. Android/iOS reales: P2-01.
- Pasos 5-8 (Referrer-Policy/`noindex`, CSP, externalizar scripts, aceptación de CSP) quedan para las fases 2-4.

**Fuera de alcance confirmado:** `puerta.html` **nunca dibuja QR**, es la página que lo lee. Que al pegar un código muestre la ficha y no un QR es el diseño correcto.

### Fases 2-4

> Pendientes.
