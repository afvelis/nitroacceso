# Librerías vendorizadas (P0-04)

Estas librerías viven en `vendor/` a propósito: se sirven desde el mismo origen para que el
sitio no dependa de CDNs ni de servicios de terceros. **No se editan a mano.** Si hay que
actualizar una, se descarga el archivo oficial de su versión y se recalculan los SHA-256 de
esta tabla.

Origen verificado el 30/10/2026 (descarga directa del paquete npm en jsDelivr).

| Archivo | Librería | Versión | Licencia | Autor | Peso | SHA-256 |
| --- | --- | --- | --- | --- | --- | --- |
| `qrcode-generator-1.4.4.js` | qrcode-generator | 1.4.4 | MIT | Kazuhiko Arase | 56.694 B | `18ae399f81182bc9de916e9c77b195df20cc58d6f2d55a62b085a299f1bf1780` |
| `qrcode-generator-1.4.4-utf8.js` | qrcode-generator (gancho UTF-8) | 1.4.4 | MIT | Kazuhiko Arase | 793 B | `e522d64003b332e29271fdce4993ed3ae2934c8947f41654bd324ddcfa2de301` |
| `jsqr-1.4.0.js` | jsQR | 1.4.0 | Apache-2.0 | Cosmo Wolfe | 256.885 B | `bc40c8a15196236b2314db0856f72ca0b49980cd5413b8c852a7349f5fee0859` |

## Para qué se usa cada una

- **qrcode-generator**: genera los QR en el navegador (`ponerQR` en `config.js`). Sirve los
  códigos de lista, stand, cortesía y premiación sin enviarlos a ningún servicio externo.
  El archivo `-utf8.js` es un gancho opcional que permite codificar ñ y acentos.
  Lo usan: `cortesia.html`, `stand.html`, `talento.html` (todas a través de `config.js`).
- **jsQR**: segunda capa de lectura de QR por cámara en `puerta.html`
  (capa 1: `BarcodeDetector` nativo; capa 2: jsQR; capa 3: código manual).

## Notas de seguridad

- Las dos librerías son de sólo lectura en ejecución: no hacen peticiones de red.
- `jsQR` expone su función como `window.jsQR` al cargarse; `puerta.html` comprueba
  `window.jsQR` antes de llamarla.
- Si una de estas librerías no carga, la página debe seguir operable de forma manual
  (mostrar el código y la URL en texto en los QR; escribir el código a mano en la puerta).
