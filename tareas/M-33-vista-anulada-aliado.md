---
id: "M-33"
titulo: "Humanizar la vista «anulada» del aliado"
prioridad: "P2"
estado: "pendiente"
area: "frontend"
depende_de: []
archivos:
  - "aliado.html"
---

# M-33 · Humanizar la vista «anulada» del aliado

## Contexto

Idea de producto (registrada en ESTADO.md §3-C, Sesión 13): cuando una asignación o un premio del aliado queda anulado, aliado.html muestra un estado crudo. Hay que humanizar esa vista: lenguaje claro para el aliado, qué quedó anulado, qué sigue vigente y qué puede hacer (a quién contactar). La RPC `f_aliado_ver` ya devuelve información de estado (ARQUITECTURA.md §4); primero hay que ver qué muestra hoy exactamente.

## Evidencia

- aliado.html: pantallas de estado «anulada» (buscar «anulada»/«anulado» en el archivo; verificar el archivo actual antes de editar).
- ARQUITECTURA.md §4: `f_aliado_ver(p_codigo_link)` — JSON con `asignacion`, `aliado`, `concursos`, `ampliaciones`, `dias_cerrados`.

## Objetivo

Que un aliado con algo anulado entienda, en lenguaje llano, qué pasó y qué sigue disponible, sin textos técnicos ni crudos.

## Pasos

- [ ] Documentar qué ve hoy el aliado en cada estado anulado (asignación anulada, concurso cerrado/anulado, premios anulados).
- [ ] Proponer al usuario los textos nuevos (tono del sistema, español llano).
- [ ] Implementar los textos aprobados; nada más que textos/estilo si no hace falta RPC.
- [ ] Probar con una asignación de prueba anulada.

## Criterios de aceptación

- [ ] Ningún estado anulado muestra texto crudo o confuso; todos usan los textos aprobados.
- [ ] Lo que sigue vigente (otros cupones, otras asignaciones) sigue visible y usable.
- [ ] Sin cambios de RPC (si se descubriera que hacen falta, se documenta y se decide aparte).

## Verificación

Prueba manual: anular una asignación de prueba (con aprobación del usuario), abrir su link y comparar la pantalla nueva contra los textos aprobados. Revertir/limpiar la prueba después.

## Fuera de alcance

- Cambiar las reglas de anulación ni las RPC (`f_admin_anular_asignacion`, `f_admin_anular_aliado`).
- Notificaciones por correo o WhatsApp.

## Notas de implementación

> Pendiente.
