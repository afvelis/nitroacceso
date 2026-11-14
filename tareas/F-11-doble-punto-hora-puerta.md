---
id: "F-11"
titulo: "Doble punto final en la hora de «ENTRADA YA CONSUMADA» en puerta"
prioridad: "P3"
estado: "pendiente"
area: "interfaz"
depende_de: []
archivos:
  - "js/puerta.js"
---

# F-11 · Doble punto final en la hora de «ENTRADA YA CONSUMADA» en puerta

## Contexto

Hallazgo observado en pantalla el 13/11/2026 durante la vía B de P1-04 (Sesión 27): al escanear un código ya usado, la puerta muestra `Validado el 13/11/2026 a las 11:59:10 p. m.. No se puede autorizar de nuevo.` — el texto de la hora ya acaba en punto (`p. m.`) y la plantilla le añade otro, dejando dos puntos finales seguidos. Defecto cosmético, sin efecto funcional.

## Evidencia

- Observado en pantalla (13/11/2026): `Validado el 13/11/2026 a las 11:59:10 p. m.. No se puede autorizar de nuevo.` tras autorizar `V-76A8F5D4` en staging.
- A localizar en [js/puerta.js](../js/puerta.js): buscar el texto `No se puede autorizar de nuevo` (aparece en las plantillas de aviso, p. ej. alrededores de `js/puerta.js:455` y `:627`) y la función que formatea la hora (`fecha` / `hora` que esas plantillas interpolan).

## Objetivo

Que el mensaje quede con una sola puntuación final, p. ej. `Validado el 13/11/2026 a las 11:59:10 p. m. No se puede autorizar de nuevo.`

## Pasos

- [ ] Localizar con `grep -n "No se puede autorizar de nuevo"` las plantillas afectadas y confirmar el contexto inmediato de cada una antes de editar.
- [ ] Quitar el punto añadido por la plantilla (o normalizar la hora formateada) para que quede una sola puntuación.
- [ ] Probar en pantalla con un código ya consumido y comparar el texto resultante.

## Criterios de aceptación

- [ ] El mensaje de «ENTRADA YA CONSUMADA» muestra una sola puntuación entre la hora y el resto del texto.
- [ ] Las demás pantallas que usan el mismo texto (`:627` y la de premios canjeados, `:694`) quedan consistentes si comparten el defecto.
- [ ] No se introducen regresiones en el flujo del evento.

## Verificación

En staging: escanear (o buscar a mano) un código ya autorizado y leer el texto exacto del aviso; debe decir `...p. m. No se puede autorizar de nuevo.` con un solo punto.

## Fuera de alcance

- Cualquier cambio en las RPC o la hora guardada en la base: es solo formato de presentación.
- La reautorización y su reescritura de `marcado_dia1_at` (tarea F-8).

## Notas de implementación

> El agente completa esta sección al terminar o bloquearse.

- Qué cambió:
- Archivos tocados:
- Pruebas ejecutadas:
- Riesgos o pendientes:
