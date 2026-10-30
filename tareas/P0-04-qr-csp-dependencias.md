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

- [ ] Elegir una librería de QR que funcione en navegador sin build (por ejemplo, `qrcode` vendorizada) y guardarla en `vendor/` o `js/`.
- [ ] Reemplazar `ponerQR` en `config.js` para generar el QR localmente en un `<canvas>` o `<img>` con data URL. Mantener el texto del código como fallback.
- [ ] Vendorizar `jsQR` (o usar `BarcodeDetector` con fallback local) y servirlo desde el mismo origen. Eliminar la carga desde CDN.
- [ ] Añadir `integrity` y `crossorigin` a cualquier script externo que quede.
- [ ] Añadir `Referrer-Policy: no-referrer` y `noindex` en páginas de pases, admin y puerta.
- [ ] Configurar CSP. Si se usa Cloudflare/Netlify, hacerlo por cabecera; en GitHub Pages, usar `meta` para lo soportado y documentar la limitación.
- [ ] Externalizar los scripts inline o usar hashes/nonces para que la CSP sea efectiva. Mientras haya `'unsafe-inline'`, la CSP no evita la ejecución de XSS.
- [ ] Verificar que la cámara sigue funcionando en Android/iOS y en el navegador que se usará en puerta.
- [ ] Medir que la generación local no bloquea la UI con listas grandes; si hace falta, generar en un `requestIdleCallback` o en un worker.

## Criterios de aceptación

- [ ] El sitio no hace peticiones a `api.qrserver.com`, `quickchart.io` ni `cdn.jsdelivr.net`.
- [ ] Los QR se generan sin conexión (o con la app ya cargada) y el código de respaldo sigue visible.
- [ ] La cámara lee QR con `BarcodeDetector` y con el fallback local.
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

> Pendiente.
