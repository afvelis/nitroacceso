---
id: "P1-02"
titulo: "Rol supervisor y revalidación de estado en puerta"
prioridad: "P1"
estado: "pendiente"
area: "seguridad"
depende_de: ["P0-02"]
archivos:
  - "puerta.html"
  - "config.js"
  - "dashboard.html"
---

# P1-02 · Rol supervisor y revalidación de estado en puerta

## Contexto

Cualquier token de puerta puede cerrar el Día 1 y activar el Día 2, y también reabrir una lista cerrada. Eso debería ser una acción de supervisor o admin. Además, el estado de “evento en edición” y el día activo se consultan al cargar la página, no antes de cada escaneo: si el admin reabre la edición o cambia el día desde otro dispositivo, una puerta ya abierta puede seguir autorizando con estado viejo.

## Evidencia

- [puerta.html:320](../puerta.html#L320): `f_puerta_cerrar_dia_y_activar_siguiente` con el token de puerta.
- [puerta.html:1015](../puerta.html#L1015): botón “Reabrir lista”.
- [puerta.html:1131](../puerta.html#L1131): `f_puerta_cerrar_lista` con `p_cerrada: false`.
- [puerta.html:339-354](../puerta.html#L339-L354): `verificarEstadoEvento()` solo se llama al cargar.
- [config.js:24-30](../config.js#L24-L30): el rol se guarda en `sessionStorage`, no en el servidor.

## Objetivo

Separar las acciones destructivas de puerta en un rol `supervisor` (o `admin`) y hacer que el servidor revalide el estado del evento en cada mutación, sin confiar en el estado cacheado del cliente.

## Pasos

- [ ] Definir roles: `puerta` (escanea y autoriza), `supervisor` (cierra/reabre listas, cierra día), `admin` (todo).
- [ ] Actualizar `f_login` y las RPC para devolver/validar el rol `supervisor`.
- [ ] Restringir `f_puerta_cerrar_dia_y_activar_siguiente` y `f_puerta_cerrar_lista` a `supervisor`/`admin`.
- [ ] En la UI de puerta, ocultar esos botones si el rol no es `supervisor`; el ocultamiento es cosmético, la RPC debe rechazar igual.
- [ ] Antes de cada autorización, el servidor debe comprobar: evento no en edición, día correcto, lista abierta, pase no anulado, pase no consumido.
- [ ] En el cliente, reconsultar `f_puerta_estado` antes de cada escaneo o cada N segundos, y bloquear si el estado cambió.
- [ ] Si el día cambia mientras hay una puerta abierta, forzar recarga o volver al selector de día.
- [ ] Registrar en auditoría quién cerró/reabrió y por qué (motivo opcional).
- [ ] Probar el escenario: admin reabre edición mientras puerta escanea; la siguiente autorización debe fallar.

## Criterios de aceptación

- [ ] Un token de `puerta` no puede cerrar el día ni reabrir una lista.
- [ ] Un token de `supervisor` sí puede, y queda registrado.
- [ ] Si el evento está en edición, toda autorización falla aunque la pestaña se haya cargado antes.
- [ ] Si el día activo cambió, una puerta con estado viejo no puede autorizar en el día equivocado.
- [ ] La UI muestra u oculta los botones según el rol, pero la seguridad no depende de eso.
- [ ] No hay regresiones en el flujo normal de escaneo.

## Verificación

En staging:

1. Login como `puerta`, intentar cerrar día y reabrir lista; debe fallar.
2. Login como `supervisor`, hacerlo; debe funcionar y registrarse.
3. Con una pestaña de puerta abierta, abrir edición desde admin y escanear; debe fallar.
4. Cerrar Día 1 desde otra pestaña y escanear en la pestaña vieja; debe rechazar.

## Fuera de alcance

- Rediseñar todos los permisos de admin.
- La UI de auditoría completa (ver [P1-03](P1-03-auditoria-privacidad.md)).

## Notas de implementación

> Pendiente.
