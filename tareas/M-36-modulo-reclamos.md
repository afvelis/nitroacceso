---
id: "M-36"
titulo: "Módulo de reclamos"
prioridad: "P2"
estado: "pendiente"
area: "operacion"
depende_de: []
archivos: []
---

# M-36 · Módulo de reclamos

## Contexto

Idea de producto (registrada en ESTADO.md §3-C, Sesión 13): un módulo para registrar y seguir reclamos (quién reclama, qué reclama, estado de la respuesta). El alcance está POR DEFINIR: no se construye nada hasta tener requisitos en una tabla (quién lo usa, qué hace, qué NO hace) aprobada por el usuario. Los datos del evento ya pasaron (26/09/2026), así que primero hay que decidir si este módulo es para el próximo evento o para uso actual.

## Evidencia

- ESTADO.md §3-C: idea migrada a tarea el 29/10/2026, sin brief todavía.
- No hay tablas ni RPCs de reclamos en la base (ARQUITECTURA.md §3-§4 no las registra).

## Objetivo

Paso 0 cumplido: requisitos aprobados por el usuario en una tabla antes de construir cualquier cosa.

## Pasos

- [ ] Preguntar al usuario las 5 preguntas de la idea: qué problema resuelve, quién lo usa, qué debe hacer, qué NO debe hacer, cómo se sabrá que sirve.
- [ ] Redactar la tabla de requisitos y el brief por fases con el usuario.
- [ ] Solo con el brief aprobado: diseñar tabla(s) + RPCs (siguiendo las reglas SQL de ARQUITECTURA.md §6) y las pantallas mínimas.
- [ ] Construir por fases, una a la vez, con su prueba dato a dato.

## Criterios de aceptación

- [ ] La tabla de requisitos existe y está aprobada por el usuario (queda copiada en esta tarea).
- [ ] Nada fue construido antes de la aprobación del brief.
- [ ] Si se construye después: cada fase con su prueba del objetivo dato a dato.

## Verificación

En esta etapa no hay prueba técnica: la verificación es que el usuario apruebe (o corrija) la tabla de requisitos entregada.

## Fuera de alcance

- Construir pantallas, tablas o RPCs antes del brief aprobado.
- Tocar módulos existentes para «aprovechar» reclamos.

## Notas de implementación

> Pendiente.
