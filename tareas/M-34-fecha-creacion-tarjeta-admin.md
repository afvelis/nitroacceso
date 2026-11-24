---
id: "M-34"
titulo: "Mostrar la fecha de creación en la tarjeta del aliado (aliados.html)"
prioridad: "P2"
estado: "hecho"
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

- [x] Verificar si el JSON de `f_admin_listar_aliados` incluye `creada_at` (mirar el consumo en aliados.html o pedir la definición al usuario con `pg_get_functiondef`). (probado 23/11/2026: medido por el orquestador — `f_admin_listar_aliados` devuelve `creada_at` a nivel del aliado, valor real `"2026-11-10T12:38:20.185116+00:00"`; no hizo falta RPC)
- [x] Si viaja: agregar la fecha a la tarjeta con formato legible (dd/mm/aaaa). (probado 23/11/2026: función `fechaCorta(iso)` nueva en `js/aliados.js:198` con formato fijo dd/mm/aaaa en UTC, sin `toLocaleDateString`; la línea `Creado:` de la tarjeta (`js/aliados.js:283`) la usa; commit `1ba781c`)
- [x] Si no viaja: documentar el cambio mínimo de RPC necesario y decidir con el usuario antes de tocar la base (regla: `pg_get_functiondef` primero). (no aplicable: el dato ya viaja en la RPC; no se tocó la base)

## Criterios de aceptación

- [x] La tarjeta muestra la fecha de creación con formato dd/mm/aaaa. (probado 23/11/2026 en pantalla por el usuario: tarjeta `Aliado Demo` en `aliados.html` muestra `Creado: 10/11/2026`, coherente con `creada_at = "2026-11-10T12:38:20.185116+00:00"`)
- [x] El resto de la tarjeta (cupones, ampliaciones, acciones) no cambió (regresión verificada). (probado 23/11/2026 en pantalla por el usuario: `Responsable Demo`, correo, cupones y ampliaciones sin cambios; por código, `fechaBonita` no se tocó (definición intacta en js/aliados.js:192-194); tras el cambio ya no queda ninguna llamada a ella en este archivo — las demás pantallas usan su propia copia (admin.js, cortesias.js, aliados-concursos.js), así que no hay efecto en otras páginas.)
- [x] Si hizo falta RPC, quedó documentada en esta tarea con su SQL exacto ejecutado por el usuario. (no aplicable: no hizo falta RPC)

## Verificación

Prueba manual: abrir aliados.html con el token de admin de prueba y comparar la fecha mostrada contra `creada_at` en la base (consulta del usuario en el SQL Editor).

## Fuera de alcance

- Cambiar el orden del listado ni los filtros de aliados.html.
- Historial completo de cambios del aliado.

## Notas de implementación

Implementada el 23/11/2026 (commit `1ba781c`), probada en pantalla por el usuario el 23/11/2026.

**Qué se cambió (archivo:línea):**
- `js/aliados.js:198-207` — función nueva `fechaCorta(iso)`: `dd/mm/aaaa` con ceros a la izquierda calculado con getters UTC (el formato no depende del navegador, como exige la tarea; `toLocaleDateString` solo está permitido en `fechaBonita`, que no se tocó). Nulo, vacío o fecha inválida → `-`.
- `js/aliados.js:283` — la línea `Creado:` de `renderAliado` pasó de `fechaBonita(a.creada_at)` a `fechaCorta(a.creada_at)`. Nada más de la tarjeta cambió.

**Qué se probó:** los 3 criterios (detalle con evidencia en cada casilla). En pantalla: `Aliado Demo` → `Creado: 10/11/2026`, resto de la tarjeta intacto.

**Qué NO se probó en pantalla:** los casos de borde de `fechaCorta` (nulo/inválido → `-`) como imagen en pantalla; quedaron verificados por código y con script de prueba (`node -e`) durante la implementación.
