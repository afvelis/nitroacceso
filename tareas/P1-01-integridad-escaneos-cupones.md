---
id: "P1-01"
titulo: "Escaneos atómicos, cupones y cédulas duplicadas"
prioridad: "P1"
estado: "pendiente"
area: "integridad"
depende_de: ["P0-02"]
archivos:
  - "puerta.html"
  - "aliado.html"
  - "stand.html"
  - "talento.html"
---

# P1-01 · Escaneos atómicos, cupones y cédulas duplicadas

## Contexto

La UI deshabilita el botón después de autorizar, pero dos dispositivos de puerta pueden escanear el mismo QR al mismo tiempo. Si la RPC hace un `select` y luego un `update` sin bloqueo, ambos pueden responder “ok”. Lo mismo puede pasar con la reserva de cupones de un concurso: dos aliados o dos pestañas pueden reservar más de lo disponible.

Tampoco hay una detección global de cédulas duplicadas entre listas: la misma persona podría tener pases en dos listas y entrar dos veces.

## Evidencia

- [puerta.html:600-605](../puerta.html#L600-L605): `f_puerta_marcar_vendedor`.
- [puerta.html:704-709](../puerta.html#L704-L709): `f_puerta_marcar_cortesia`.
- [puerta.html:1073-1077](../puerta.html#L1073-L1077): `f_puerta_marcar_persona`.
- [puerta.html:846-860](../puerta.html#L846-L860): canje de premiación.
- [stand.html:359](../stand.html#L359): solo compara cédulas dentro de la lista local.
- [talento.html:447-448](../talento.html#L447-L448): el servidor devuelve error de cédula repetida dentro de la lista, no entre listas.

## Objetivo

Que una entrada o un cupón no se puedan consumir dos veces, ni por concurrencia ni por duplicados, y que las restricciones estén en la base de datos además de la UI.

## Pasos

- [ ] Implementar el marcado como actualización condicional atómica:

```sql
update personas
set estado = 'autorizado', marcado_at = now()
where id = p_persona_id
  and estado <> 'autorizado'
returning id;
```

Si no devuelve fila, responder “ya consumado”. Repetir para vendedores, cortesías y premiaciones.

- [ ] Añadir una clave de idempotencia por escaneo (por ejemplo, `p_request_id`) para que un reintento de red no duplique la operación.
- [ ] Para cupones, descontar dentro de una transacción con bloqueo de fila (`select ... for update`) o un `update ... where disponibles >= n returning ...`.
- [ ] Añadir restricciones `check` para que los contadores no queden negativos.
- [ ] Añadir un registro/ledger de movimientos de cupones (reserva, consumo, liberación, anulación) y verificar que la suma cuadra.
- [ ] Implementar detección global de cédulas duplicadas por evento, con un reporte para el admin y una forma de anular el pase sobrante. No aplicar un `unique` ciego si una persona puede ser legítimamente talento y vendedor; primero definir la regla.
- [ ] Probar concurrencia real: dos requests simultáneos con el mismo ID y dos reservas simultáneas del último cupón.

## Criterios de aceptación

- [ ] Dos escaneos simultáneos del mismo pase: solo uno devuelve éxito.
- [ ] Dos reservas simultáneas del último cupón: solo una tiene éxito; el saldo nunca queda negativo.
- [ ] Un reintento de red con la misma clave de idempotencia no duplica la entrada.
- [ ] El reporte de cédulas duplicadas detecta el caso entre dos listas distintas.
- [ ] Las restricciones están en la base de datos y se probaron en staging.
- [ ] No se puede reabrir una lista y volver a autorizar a alguien ya autorizado sin una acción explícita.

## Verificación

En staging, con dos terminales o dos pestañas:

```bash
# Ejemplo conceptual: dos POST simultáneos al mismo RPC
curl ... /rest/v1/rpc/f_puerta_marcar_persona ... &
curl ... /rest/v1/rpc/f_puerta_marcar_persona ... &
wait
```

Revisar que solo una respuesta sea verdadera y que el conteo de autorizados sea 1. Repetir con cupones.

## Fuera de alcance

- Rediseñar el esquema completo de eventos.
- La detección de fraude por comportamiento.

## Notas de implementación

> Pendiente.
