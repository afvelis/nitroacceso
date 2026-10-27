---
id: "P2-01"
titulo: "Modo offline y cola de escaneos para el día del evento"
prioridad: "P2"
estado: "pendiente"
area: "operacion"
depende_de: ["P0-04"]
archivos:
  - "puerta.html"
  - "config.js"
---

# P2-01 · Modo offline y cola de escaneos para el día del evento

## Contexto

Cada escaneo y cada cambio de estado depende de Supabase y de la red. Si el WiFi del venue falla, la puerta se detiene o se generan dudas sobre si una entrada quedó registrada. La generación de QR y la lectura de cámara también dependen de recursos externos (ver [P0-04](P0-04-qr-csp-dependencias.md)).

## Evidencia

- [puerta.html:569-620](../puerta.html#L569-L620): la autorización espera la RPC.
- [puerta.html:425-435](../puerta.html#L425-L435): `jsQR` se carga desde CDN.
- [config.js:7-21](../config.js#L7-L21): todas las operaciones pasan por `fetch`.
- No hay service worker, caché offline ni cola local.

## Objetivo

Que la puerta pueda seguir operando con red intermitente, sin perder escaneos ni autorizar dos veces, y que exista un respaldo imprimible para el peor caso.

## Pasos

- [ ] Añadir un service worker que precachee el shell, los estilos, `config.js`, los helpers y las librerías de QR.
- [ ] Cachear las listas/pases del día activo en IndexedDB al iniciar sesión y refrescar cuando haya red.
- [ ] Implementar una cola local de escaneos con `request_id` idempotente; enviar al servidor cuando vuelva la conexión.
- [ ] Mostrar un indicador visible de “sin conexión / N escaneos pendientes”.
- [ ] Resolver conflictos: si el servidor ya marcó el pase como consumido, no volver a autorizar; mostrar el estado real.
- [ ] Añadir una vista de “escaneos pendientes” y la posibilidad de reintentar.
- [ ] Generar un PDF/CSV imprimible por día con nombres, códigos y estado, como respaldo de puerta.
- [ ] Probar en modo avión: login offline (si es posible), escaneo, cola, reconexión y sincronización.
- [ ] Documentar el procedimiento manual si la app no carga.

## Criterios de aceptación

- [ ] La puerta puede escanear y encolar con red intermitente sin bloquearse.
- [ ] Al volver la red, los escaneos se sincronizan sin duplicar entradas.
- [ ] Si un pase ya fue consumido en el servidor, la cola no lo autoriza de nuevo.
- [ ] Hay un indicador claro de pendientes y errores.
- [ ] Existe un respaldo imprimible por día.
- [ ] El modo offline no permite acciones de admin ni cambios de configuración.

## Verificación

1. Cargar la puerta, activar modo avión, escanear 5 pases, reconectar y verificar que se sincronizaron una sola vez.
2. Simular que otro dispositivo ya consumió un pase y comprobar el conflicto.
3. Imprimir el respaldo y verificar que los datos coinciden.

## Fuera de alcance

- Offline completo para admin/aliados.
- Sincronización multi-dispositivo en tiempo real.

## Notas de implementación

> Pendiente.
