---
id: "F-8"
titulo: "Reautorizar en puerta reescribe marcado_dia1_at y no deja rastro del doble escaneo"
prioridad: "P2"
estado: "pendiente"
area: "integridad"
depende_de: []
archivos:
  - "supabase/migrations/0001_esquema_inicial.sql"
  - "tests/escaneo.test.mjs"
---

# F-8 · La reautorización en puerta reescribe `marcado_dia1_at` y no deja rastro del doble escaneo

## Contexto

Autorizar dos veces al mismo vendedor **reescribe `marcado_dia1_at`** con la hora de la segunda autorización (medido en staging: `2026-11-13T15:31:59.249363+00:00` → `2026-11-13T15:31:59.72505+00:00`), y `f_puerta_marcar_vendedor` devuelve `true` en ambos casos porque hace `UPDATE ...; return found;` — `found` vale `true` si el UPDATE coincidió con la fila, aunque los valores no cambien. Es decir: **se pierde la hora de la primera entrada** y el doble escaneo no deja ningún rastro en la base, justo cuando el rastro es lo que permitiría detectar un reintento de brazalete.

Todo el SQL lo ejecuta el usuario; esta tarea no cambia nada del servidor sin su orden explícita.

## Evidencia

- [P1-04-staging-migraciones-tests.md](P1-04-staging-migraciones-tests.md), nota **(v)**, «Hallazgo 1» (el booleano de vuelta) y «Hallazgo 2» (la hora reescrita, con las dos horas medidas en la ejecución de verificación del 12/11/2026).
- SQL de la migración `0001` ([supabase/migrations/0001_esquema_inicial.sql](../supabase/migrations/0001_esquema_inicial.sql)): la definición de `f_puerta_marcar_vendedor` con `update ...; return found;`.
- [tests/escaneo.test.mjs](../tests/escaneo.test.mjs), caso de doble escaneo: las aserciones son de ESTADO (leer, autorizar, releer, repetir, releer) precisamente porque el booleano de vuelta no distingue.

## Objetivo

Que la reautorización de un vendedor ya autorizado preserve la hora de la primera entrada (o deje constancia explícita del reintento) y que el resultado de la función refleje lo que ocurrió.

## Pasos

- [ ] El usuario ejecuta `pg_get_functiondef('f_puerta_marcar_vendedor')` en el SQL Editor y pega el resultado para reescribir sobre la definición real.
- [ ] Hacer backup de la definición vigente (lotes de `docs/sql/`).
- [ ] Reescribir la función: no reescribir `marcado_dia1_at` si el vendedor ya está `autorizado` (o guardar el reintento en una columna/campo explícito), y hacer que el retorno distinga en lo posible el primer alta de la reautorización.
- [ ] Añadir al test de doble escaneo de `tests/escaneo.test.mjs` la aserción del comportamiento nuevo.

## Criterios de aceptación

- [ ] Reautorizar NO cambia `marcado_dia1_at` (o deja constancia explícita del reintento).
- [ ] Existe un test automatizado que lo demuestra contra staging.
- [ ] No se introdujeron regresiones en el flujo del evento: la primera autorización sigue marcando la hora y el flujo de puerta no se rompe.

## Verificación

- Ejecutar la suite (`node --test tests/*.test.mjs`) contra staging y comparar el `marcado_dia1_at` antes y después del segundo escaneo dentro del test.

## Fuera de alcance

- La validación de `p_dia` (tarea [F-9](F-9-dia-fuera-de-rango.md)); si ambas tocan la RPC, se hacen EN SERIE.
- Cambios de frontend en `puerta.html` / `js/puerta.js`.

## Notas de implementación

> El agente completa esta sección al terminar o bloquearse.

- Qué cambió:
- Archivos tocados:
- Pruebas ejecutadas:
- Riesgos o pendientes:
