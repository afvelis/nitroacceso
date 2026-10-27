# Plantilla de tarea

Copia este archivo con un nombre `P?-??-slug.md`, completa el frontmatter y borra estas instrucciones. No cambies el formato del frontmatter: el agente lo usa para ordenar y filtrar.

```markdown
---
id: "P0-00"
titulo: "Título corto y accionable"
prioridad: "P0"          # P0 crítico | P1 alto | P2 mejora
estado: "pendiente"      # pendiente | en_progreso | bloqueado | hecho | descartado
area: "seguridad"        # seguridad | integridad | operacion | frontend | datos
depende_de: []           # ["P0-01", "P1-04"]
archivos:
  - "ruta/al/archivo"
---

# P0-00 · Título corto

## Contexto

Qué problema existe, a quién afecta y por qué importa. Si viene de la revisión, enlaza a [00-revision-seguridad.md](00-revision-seguridad.md).

## Evidencia

Archivos y líneas concretas. Ejemplo: [puerta.html:579-581](../puerta.html#L579-L581). Si no hay evidencia en el repo, explica qué hay que verificar.

## Objetivo

Resultado observable que debe existir al terminar. Una o dos frases.

## Pasos

- [ ] Paso 1.
- [ ] Paso 2.
- [ ] Paso 3.

## Criterios de aceptación

- [ ] Criterio verificable 1.
- [ ] Criterio verificable 2.
- [ ] No se introdujeron regresiones en el flujo del evento.

## Verificación

Comandos, pruebas manuales o consultas SQL que demuestran que funciona. Si la prueba es destructiva, indicar que se hace en staging.

## Fuera de alcance

Lo que esta tarea no cubre, para evitar que el agente se expanda.

## Notas de implementación

> El agente completa esta sección al terminar o bloquearse.

- Qué cambió:
- Archivos tocados:
- Pruebas ejecutadas:
- Riesgos o pendientes:
```
