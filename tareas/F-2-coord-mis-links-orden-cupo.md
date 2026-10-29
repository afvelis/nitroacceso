---
id: "F-2"
titulo: "Reordenar «Mis links» de coord.html (más nuevo primero) y evaluar mostrar cupo"
prioridad: "P2"
estado: "pendiente"
area: "frontend"
depende_de: []
archivos:
  - "coord.html"
---

# F-2 · Reordenar «Mis links» de coord.html (más nuevo primero) y evaluar mostrar cupo

## Contexto

Hallazgo de la prueba en vivo del 28/10/2026 (Sesión 13): la sección «Mis links» de coord.html ordena los links del más viejo al más nuevo, de modo que el recién creado queda al fondo y el coordinador tiene que hacer scroll para encontrarlo. Además, la lista no muestra el cupo de cada link. Propuesta del usuario: historial colapsable con los 2 últimos creados visibles, en orden de creación descendente, y evaluar si se muestra el cupo/registrados por link.

## Evidencia

- coord.html, sección «Mis links» (buscar el texto «Mis links» en el archivo; verificar el archivo actual antes de editar).
- La RPC que alimenta la lista es `f_coord_mis_links(p_codigo_coord)` (ARQUITECTURA.md §4); verificar qué campos devuelve y en qué orden.

## Objetivo

Que el coordinador vea primero los links recién creados, con el historial colapsable, y (si se aprueba) el cupo de cada link a la vista.

## Pasos

- [ ] Verificar el orden exacto que devuelve `f_coord_mis_links` hoy (definición con `pg_get_functiondef` ejecutada por el usuario, o orden en cliente).
- [ ] Decidir dónde se ordena (cliente o RPC) y documentar la decisión.
- [ ] Implementar el orden: más nuevo primero.
- [ ] Implementar el colapsable con los 2 últimos visibles y el resto plegado.
- [ ] Evaluar y proponer al usuario si se agrega cupo/registrados por link (puede requerir cambio de RPC; documentarlo si así fuera).

## Criterios de aceptación

- [ ] El link recién creado aparece primero y visible sin scroll.
- [ ] El historial colapsa y se despliega sin perder links.
- [ ] Crear y editar links sigue funcionando igual (regresión verificada).

## Verificación

Prueba manual con un coordinador de prueba: crear 3-4 links seguidos y confirmar que el último creado queda arriba, que el colapsable abre/cierra, y que crear/editar links no cambió de comportamiento.

## Fuera de alcance

- Cambiar la lógica de creación de links ni los códigos que se generan.
- Tocar la página pública de talento/stand; solo coord.html (y la RPC solo si el orden no se puede resolver en cliente).

## Notas de implementación

> Pendiente.
