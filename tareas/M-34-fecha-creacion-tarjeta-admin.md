---
id: "M-34"
titulo: "Mostrar la fecha de creación en la tarjeta del aliado (aliados.html)"
prioridad: "P2"
estado: "pendiente"
area: "frontend"
depende_de: []
archivos:
  - "aliados.html"
---

# M-34 · Mostrar la fecha de creación en la tarjeta del aliado (aliados.html)

## Contexto

Idea de producto (registrada en ESTADO.md §3-C, Sesión 13): en el panel de aliados (aliados.html) conviene ver cuándo se creó cada aliado/asignación, para distinguir aliados nuevos de viejos sin abrir el detalle. La fecha existe en la base (`aliado_asignaciones.creada_at`, ARQUITECTURA.md §3); hay que verificar si `f_admin_listar_aliados` ya la devuelve al cliente.

## Evidencia

- aliados.html: tarjeta del aliado (buscar la plantilla de tarjeta; verificar el archivo actual antes de editar).
- ARQUITECTURA.md §4: `f_admin_listar_aliados(p_token)` — devuelve aliados + asignaciones + stats (cédula, nota_duplicado, ampliaciones, disponible_unico/dia1/dia2); verificar si incluye `creada_at`.

## Objetivo

Que la tarjeta del aliado muestre la fecha de creación de la asignación, si el dato ya viaja en el listado (o documentar el cambio de RPC necesario si no viaja).

## Pasos

- [ ] Verificar si el JSON de `f_admin_listar_aliados` incluye `creada_at` (mirar el consumo en aliados.html o pedir la definición al usuario con `pg_get_functiondef`).
- [ ] Si viaja: agregar la fecha a la tarjeta con formato legible (dd/mm/aaaa).
- [ ] Si no viaja: documentar el cambio mínimo de RPC necesario y decidir con el usuario antes de tocar la base (regla: `pg_get_functiondef` primero).

## Criterios de aceptación

- [ ] La tarjeta muestra la fecha de creación con formato dd/mm/aaaa.
- [ ] El resto de la tarjeta (cupones, ampliaciones, acciones) no cambió (regresión verificada).
- [ ] Si hizo falta RPC, quedó documentada en esta tarea con su SQL exacto ejecutado por el usuario.

## Verificación

Prueba manual: abrir aliados.html con el token de admin de prueba y comparar la fecha mostrada contra `creada_at` en la base (consulta del usuario en el SQL Editor).

## Fuera de alcance

- Cambiar el orden del listado ni los filtros de aliados.html.
- Historial completo de cambios del aliado.

## Notas de implementación

> Pendiente.
