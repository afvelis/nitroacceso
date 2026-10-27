---
id: "P2-02"
titulo: "Refactor a módulos compartidos, accesibilidad y UX"
prioridad: "P2"
estado: "pendiente"
area: "frontend"
depende_de: ["P1-04"]
archivos:
  - "*.html"
  - "config.js"
---

# P2-02 · Refactor a módulos compartidos, accesibilidad y UX

## Contexto

Cada página repite estilos, helpers de modales, copiado, formato de fechas, `esc()` y lógica de sesión. Hay ~8.000 líneas de HTML/JS con duplicación. Eso hace que un cambio de seguridad, como escapar o agregar CSP, haya que replicarlo en varios archivos, y que aparezcan inconsistencias (algunas páginas escapan, otras no). La accesibilidad también es despareja: modales sin foco atrapado, botones sin `aria-label`, estados que dependen solo del color.

## Evidencia

- [puerta.html:153-199](../puerta.html#L153-L199), [aliado.html:181-220](../aliado.html#L181-L220), [cortesias.html:271-300](../cortesias.html#L271-L300): modales duplicados.
- `esc()` definido por separado en varias páginas.
- `config.js` mezcla configuración, API, sesión, QR y links.
- No hay foco atrapado ni `aria-live` en los resultados de escaneo.

## Objetivo

Reducir la duplicación, tener una sola implementación de las funciones críticas y mejorar la operación en teléfonos/tablets y con teclado.

## Pasos

- [ ] Extraer módulos compartidos sin build (ES modules o IIFE): `js/api.js`, `js/sesion.js`, `js/escape.js`, `js/qr.js`, `js/ui.js`, `js/fechas.js`.
- [ ] Mover estilos comunes a `css/base.css`, `css/componentes.css`; dejar solo estilos específicos por página.
- [ ] Unificar modales (`alert`, `confirm`, `prompt`) en `ui.js` con foco atrapado, cierre con Escape y `aria-modal`.
- [ ] Unificar `esc()` y eliminar las copias locales.
- [ ] Unificar el manejo de errores: mensaje genérico al usuario, detalle en consola/telemetría, sin `innerHTML` con `e.message`.
- [ ] Añadir `aria-live` a los resultados de escaneo y estados de carga.
- [ ] Revisar contraste, tamaños táctiles, navegación por teclado y lectores de pantalla en las pantallas de puerta y admin.
- [ ] Añadir un “modo prueba” visible que use datos de staging y no permita acciones reales.
- [ ] Añadir exportación CSV/JSON desde el dashboard y un buscador global por cédula.
- [ ] Medir el tamaño de las páginas y eliminar código muerto (`NOMBRE_EVENTO`, helpers sin uso).

## Criterios de aceptación

- [ ] Existe una sola implementación de `esc`, API, sesión, QR y modales.
- [ ] Ninguna página redefine `esc()` ni copia el modal.
- [ ] Los modales atrapan el foco, cierran con Escape y tienen `aria-modal`.
- [ ] Los resultados de escaneo se anuncian con `aria-live`.
- [ ] La puerta se puede operar con teclado y en un teléfono sin zoom.
- [ ] El modo prueba es visible y no escribe en producción.
- [ ] No hay errores de consola en los flujos principales.

## Verificación

1. Navegar la puerta solo con teclado.
2. Probar con VoiceOver/TalkBack el resultado de un escaneo.
3. Revisar que no hay duplicados de helpers con `grep`.
4. Ejecutar los tests E2E de [P1-04](P1-04-staging-migraciones-tests.md) después del refactor.

## Fuera de alcance

- Migrar a un framework (React/Vue). No es necesario para este tamaño.
- Rediseño visual completo.

## Notas de implementación

> Pendiente.
