---
id: "F-9"
titulo: "f_puerta_marcar_vendedor no valida p_dia: un valor fuera de rango autoriza otro dia"
prioridad: "P1"
estado: "pendiente"
area: "seguridad"
depende_de: []
archivos:
  - "supabase/migrations/0001_esquema_inicial.sql"
  - "tests/escaneo.test.mjs"
---

# F-9 · `f_puerta_marcar_vendedor` no valida `p_dia`: un valor fuera de rango autoriza otro día

## Contexto

La RPC de puerta `f_puerta_marcar_vendedor` no valida `p_dia`: la función solo distingue `p_dia = 1` y cualquier otro valor cae en la rama del día 2. Con un valor fuera del rango esperado `(1, 2)` — probado en staging con `p_dia = 9` — el registro acaba **autorizado en el día 2** en lugar de ser rechazado. La consecuencia real es que un parámetro mal formado en la puerta (bug de frontend, petición manipulada o llamada manual) puede autorizar el día equivocado en vez de fallar.

Todo el SQL lo ejecuta el usuario; esta tarea no cambia nada del servidor sin su orden explícita.

## Evidencia

- [P1-04-staging-migraciones-tests.md](P1-04-staging-migraciones-tests.md), nota **(v)**, «Hallazgo 3»: verificado contra staging y contra el SQL de la migración `0001` (`supabase/migrations/0001_esquema_inicial.sql`); la prueba real con `p_dia = 9` devolvió `true` y puso `estado_dia2` de `V-DEMO02` en `autorizado` (se restauró a `pendiente`).
- [tests/escaneo.test.mjs](../tests/escaneo.test.mjs), caso «dia invalido»: el test afirma la propiedad garantizada (el día 1 queda invariable) y documenta la limitación del servidor; el log del test imprime el `estado_dia1` previo a la llamada.

## Objetivo

`f_puerta_marcar_vendedor` rechaza cualquier `p_dia` fuera de `(1, 2)` sin modificar ningún día, y existe un test automatizado que lo demuestre.

## Pasos

- [ ] El usuario ejecuta `pg_get_functiondef('f_puerta_marcar_vendedor')` en el SQL Editor y pega el resultado para reescribir sobre la definición real, no sobre la migración.
- [ ] Hacer backup de la definición vigente (lotes de `docs/sql/`).
- [ ] Reescribir la función para que valide `p_dia` contra `(1, 2)` y rechace cualquier otro valor (excepción o devolver `false`, según lo que permita el contrato de la función) ANTES del `UPDATE`.
- [ ] Actualizar el caso «dia invalido» de `tests/escaneo.test.mjs` para afirmar el comportamiento nuevo: rechazo y ningún día modificado.

## Criterios de aceptación

- [ ] Con `p_dia` fuera de `(1, 2)`, `f_puerta_marcar_vendedor` rechaza (excepción o `false`) y NO modifica ningún día (ni el 1 ni el 2).
- [ ] Existe un test automatizado que lo demuestra en la suite (`tests/escaneo.test.mjs`) y pasa contra staging.
- [ ] No se introdujeron regresiones en el flujo del evento (día 1 y día 2 legítimos siguen autorizando igual).

## Verificación

- Ejecutar la suite (`node --test tests/*.test.mjs`) contra staging: el caso «dia invalido» debe pasar con el comportamiento nuevo y el resto de la suite debe seguir 7/7.
- En staging, verificar por consulta que ningún `estado_dia2` cambió tras la llamada rechazada (contajes, sin mostrar claves).

## Fuera de alcance

- Cualquier otro cambio de la misma función (la reautorización y `marcado_dia1_at` son la tarea [F-8](F-8-reautorizacion-reescribe-hora.md)); si ambas tocan la RPC, se hacen EN SERIE.
- Cambios de frontend en `puerta.html` / `js/puerta.js`.

## Notas de implementación

> El agente completa esta sección al terminar o bloquearse.

- Qué cambió:
- Archivos tocados:
- Pruebas ejecutadas:
- Riesgos o pendientes:
