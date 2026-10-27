---
id: "P2-03"
titulo: "Observabilidad y runbook de incidentes"
prioridad: "P2"
estado: "pendiente"
area: "operacion"
depende_de: ["P1-03"]
archivos:
  - ".github/workflows/keep-supabase-alive.yml"
  - "config.js"
---

# P2-03 · Observabilidad y runbook de incidentes

## Contexto

Los errores se muestran con `alert()` o se pierden en la consola. No hay métricas de latencia, tasa de error, escaneos por minuto ni alertas si Supabase se cae o se pausa. El workflow de keepalive existe, pero no avisa si falla. El día del evento, eso significa enterarse del problema cuando la fila ya está en la puerta.

## Evidencia

- [.github/workflows/keep-supabase-alive.yml](../.github/workflows/keep-supabase-alive.yml): ping cada 3 días sin alerta.
- [config.js:7-21](../config.js#L7-L21): errores de red se propagan como `throw new Error(t)`.
- [admin.html](../admin.html) y [dashboard.html](../dashboard.html): no hay panel de salud ni latencia.

## Objetivo

Detectar problemas antes de que afecten la operación, tener evidencia para diagnosticar y un procedimiento claro para incidentes típicos (red, Supabase, token perdido, link filtrado, dispositivo comprometido).

## Pasos

- [ ] Añadir telemetría de errores (Sentry o equivalente) con scrubbing de PII y tokens; no enviar cédulas, correos ni teléfonos.
- [ ] Añadir métricas mínimas: latencia de RPC, tasa de error, escaneos por minuto, pases rechazados, pendientes offline.
- [ ] Configurar alertas: Supabase caído/pausado, error 5xx sostenido, latencia alta, fallos de login anómalos.
- [ ] Hacer que el keepalive falle de forma visible (issue, correo o webhook) si el ping no responde.
- [ ] Añadir un panel de salud en admin: estado de Supabase, último escaneo, listas abiertas, errores recientes.
- [ ] Escribir `docs/runbook.md` con procedimientos para: caída de red, Supabase pausado, token de puerta perdido, link de aliado filtrado, QR que no escanea, dispositivo comprometido, restauración de backup.
- [ ] Definir contactos y responsables por turno.
- [ ] Probar el runbook en un simulacro antes del evento.

## Criterios de aceptación

- [ ] Hay alertas configuradas y probadas para Supabase caído y errores 5xx.
- [ ] La telemetría no contiene PII ni tokens.
- [ ] El admin ve un panel de salud con estado y últimos errores.
- [ ] El keepalive notifica si falla.
- [ ] Existe un runbook probado con pasos concretos y contactos.
- [ ] El equipo sabe qué hacer si la puerta queda sin red.

## Verificación

1. Simular un fallo de Supabase en staging y comprobar la alerta.
2. Revisar un evento de telemetría y confirmar que no tiene PII.
3. Seguir el runbook en un simulacro de caída de red.
4. Verificar que el keepalive notifica cuando se fuerza un fallo.

## Fuera de alcance

- Reemplazar Supabase por otra infraestructura.
- Monitoreo 24/7 fuera de la ventana del evento.

## Notas de implementación

> Pendiente.
