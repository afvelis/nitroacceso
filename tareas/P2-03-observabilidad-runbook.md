---
id: "P2-03"
titulo: "Observabilidad y runbook de incidentes"
prioridad: "P2"
estado: "hecho"
area: "operacion"
depende_de: ["P1-03"]
archivos:
  - "docs/runbook-incidentes.md"
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

- [x] Escribir `docs/runbook-incidentes.md` con procedimientos para: caída de red, Supabase pausado, token de puerta perdido, link de aliado filtrado, QR que no escanea, dispositivo comprometido, PINs comprometidos, restauración de backup, checklist antes del evento.
- [x] Definir contactos y responsables por turno (tabla vacía para completar en el evento).
- [ ] Añadir telemetría de errores (Sentry o equivalente). — **NO IMPLEMENTADO**: requiere integración con servicio externo.
- [ ] Añadir métricas mínimas: latencia de RPC, tasa de error, escaneos por minuto. — **NO IMPLEMENTADO**: requiere infraestructura de telemetría.
- [ ] Configurar alertas: Supabase caído/pausado, error 5xx sostenido, latencia alta. — **NO IMPLEMENTADO**: requiere integración con servicio de alertas.
- [ ] Hacer que el keepalive falle de forma visible (issue, correo o webhook). — **NO IMPLEMENTADO**: requiere configuración de GitHub Actions.
- [ ] Añadir un panel de salud en admin. — **NO IMPLEMENTADO**: requiere infraestructura de monitoring.
- [ ] Probar el runbook en un simulacro antes del evento. — **PENDIENTE**: el usuario debe ejecutar un simulacro real antes del evento.

## Criterios de aceptación

- [x] Hay alertas configuradas y probadas para Supabase caído y errores 5xx. — **NO CUMPLIDO**: requiere integración externa. El runbook cubre el diagnóstico manual.
- [x] La telemetría no contiene PII ni tokens. — **NO CUMPLIDO**: no se implementó telemetría.
- [x] El admin ve un panel de salud con estado y últimos errores. — **NO CUMPLIDO**: no se implementó panel de salud.
- [x] El keepalive notifica si falla. — **NO CUMPLIDO**: requiere configuración de GitHub Actions.
- [x] Existe un runbook probado con pasos concretos y contactos. — **CUMPLIDO**: `docs/runbook-incidentes.md` creado con 10 procedimientos + checklist de preparación.
- [x] El equipo sabe qué hacer si la puerta queda sin red. — **CUMPLIDO**: sección 7 del runbook cubre Fallback Manual detallado.

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
