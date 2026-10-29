---
id: "F-3"
titulo: "Revalidar la lógica edición-abierta / edición-cerrada módulo por módulo"
prioridad: "P2"
estado: "pendiente"
area: "operacion"
depende_de: []
archivos:
  - "admin.html"
  - "coord.html"
  - "talento.html"
  - "stand.html"
  - "puerta.html"
---

# F-3 · Revalidar la lógica edición-abierta / edición-cerrada módulo por módulo

## Contexto

Hallazgo de la prueba en vivo del 28/10/2026 (Sesión 13): la lógica de «edición abierta / edición cerrada» (`config.edicion_abierta`) se aplicó por módulo en momentos distintos y nunca se revalidó en conjunto. Estado conocido: puerta.html muere (bloquea todo) con edición abierta; stand.html y talento.html ocultan formularios con edición cerrada. Hay que decidir, módulo por módulo, qué bloqueos se mantienen y cuáles se ajustan, evitando consecuencias sobre los datos del evento (los bloqueos existen para proteger datos reales).

## Evidencia

- ARQUITECTURA.md §3, tabla `config`: columna `edicion_abierta bool`.
- Buscar `edicion_abierta` (y sus alias en cliente) en admin.html, coord.html, talento.html, stand.html y puerta.html; listar qué hace cada uno antes de cambiar nada.
- Reporte del usuario en la Sesión 13 (28/10/2026): comportamiento descrito arriba.

## Objetivo

Una matriz por módulo que diga qué está permitido con edición abierta y con edición cerrada, aprobada por el usuario y aplicada sin romper datos.

## Pasos

- [ ] Inventario: por cada módulo, qué muestra/bloquea hoy con edición abierta y con edición cerrada (evidencia con archivo y línea).
- [ ] Proponer al usuario la matriz deseada (quién puede crear/editar en cada estado y por qué).
- [ ] Aprobar con el usuario antes de tocar código (nada destructivo ni asumido).
- [ ] Aplicar los ajustes módulo por módulo, un módulo por turno.
- [ ] Probar cada cambio con el interruptor de edición abierto y cerrado desde admin.html.

## Criterios de aceptación

- [ ] La matriz quedó documentada en esta tarea y coincide con el comportamiento real de la app.
- [ ] Ningún cambio rompió datos existentes del evento (verificado con datos de prueba).
- [ ] Puerta, stand y talento se comportan según la matriz aprobada en ambos estados del interruptor.

## Verificación

Con un evento de prueba: alternar `f_admin_toggle_edicion` desde admin.html y recorrer cada módulo comprobando la matriz punto por punto. Si se toca SQL (no debería), lo ejecuta el usuario en el SQL Editor.

## Fuera de alcance

- Cambiar la RPC `f_admin_toggle_edicion` (si hiciera falta, primero `pg_get_functiondef` y aprobación del usuario).
- Borrar o mover datos del evento.
- Decidir la matriz sin aprobación explícita del usuario.

## Notas de implementación

> Pendiente.
