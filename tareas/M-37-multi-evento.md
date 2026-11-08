---
id: "M-37"
titulo: "Multi-evento: gestionar hasta 3 eventos simultáneos desde el dashboard"
prioridad: "P2"
estado: "pendiente"
area: "datos"
depende_de: ["P1-04"]
archivos:
  - "dashboard.html"
  - "js/dashboard.js"
  - "admin.html"
  - "js/admin.js"
---

# M-37 · Multi-evento: gestionar hasta 3 eventos simultáneos desde el dashboard

## Contexto

Decisión del usuario (31/10/2026, sesión 18): el proyecto escaló y ya no quiere el modelo "un solo conjunto de datos + limpieza total". Quiere que el dashboard sea el centro de control **multi-evento**: crear eventos nuevos (hasta 3 activos en simultáneo, más los históricos), cada uno arrancando de cero con todas las funciones del sistema, y cambiar entre ellos. El dashboard concentra estadísticas y el manejo general. La "limpieza total" desaparece como concepto: cerrar un evento = congelarlo con su informe (archivado, no borrado). Esto elimina de raíz el riesgo operativo que P0-05 vino a mitigar.

El usuario fijó el momento de arranque: **después de cerrar la deuda actual** (F-1, pendientes menores de tareas/) y con staging disponible (P1-04). No arrancar antes.

## Evidencia

- Modelo actual: tablas de trabajo globales sin `evento_id`; `config` es una sola fila (`edicion_abierta`, `dia_activo`, `dia1_cerrado`, `dia2_cerrado`).
- `f_admin_limpiar_todo(uuid)` borra las 10 tablas de trabajo y reinicia `config` (definición verificada el 31/10/2026; NO toca aliados ni informes).
- La tabla `eventos` guarda los informes (snapshots); su nombre choca con el concepto nuevo, hay que renombrar (propuesta: `informes`) o nombrar el registro nuevo de otra forma.
- Las RPC de rol público (talento, stand, aliado, coord, cortesía) reciben `codigo_link`/ids de filas que pasarán a tener `evento_id`: el evento se deduce de la fila, sin cambiar su firma.

## Objetivo

Que el usuario cree, cambie y cierre eventos desde el dashboard; que cada evento opere aislado (datos, días, edición abierta, coordinadores) sin mezclarse con otros; y que los datos de un evento nunca se borren: cerrar = archivar con informe.

## Diseño acordado (resumen)

1. **Tabla nueva `evento`** (registro): id, nombre, estado (`activo` | `cerrado`), creado_at, cerrado_at. Los campos de día/edición pasan a ser del evento.
2. **`evento_id` en las ~12 tablas de trabajo** (talentos, listas, personas, stands, vendedores, cortesias, cortesia_listas, cortesia_personas, aliados, aliado_asignaciones, aliado_concursos, aliado_ampliaciones, coordinadores) + backfill: los datos actuales quedan como evento histórico "NitroSystem 2026" (estado `cerrado`).
3. **Sesión ligada al evento**: `sesiones` gana `evento_id`; el admin elige/crea el evento tras el login. Las RPC de admin/puerta acotan por el evento de la sesión **por dentro** (casi ninguna firma cambia). Los PINs siguen siendo globales.
4. **Cerrar evento**: congela (informe guardado + estado `cerrado`), sustituye a `f_admin_limpiar_todo` (se retira del flujo y se marca obsoleta).
5. **Frontend**: gestor de eventos en dashboard (listar / crear / cambiar / cerrar); badge de evento activo en admin; el resto de páginas casi sin cambios.

## Pasos

- [ ] Renombrar la tabla de informes `eventos` → `informes` y actualizar sus 3 RPC + admin.js (o resolver el nombre del registro nuevo; decidir en diseño).
- [ ] Crear tabla `evento` con estado y campos de día/edición por evento.
- [ ] Añadir `evento_id` a las tablas de trabajo + backfill al evento histórico; conteos antes/después en staging.
- [ ] `sesiones.evento_id` + elección de evento tras login; RPCs admin/puerta acotadas por sesión.
- [ ] RPC de rol público: deducir el evento desde la fila (`codigo_link`/id) sin cambiar firmas.
- [ ] `f_admin_crear_evento`, `f_admin_listar_eventos_activos`, `f_admin_cambiar_evento`, `f_admin_cerrar_evento` (con informe obligatorio antes de cerrar).
- [ ] Retirar `f_admin_limpiar_todo` del flujo (deprecada; conservar un ciclo en staging como prueba).
- [ ] Keep-alive: fijar a qué evento apunta el ping diario.
- [ ] Frontend: gestor de eventos en dashboard + badge en admin; revisar páginas una a una.
- [ ] Regresión completa del flujo (coordinador, talento, stand, aliado, cortesía, puerta, informe) con 2 eventos activos en staging.

## Criterios de aceptación

- [ ] Se pueden tener 2-3 eventos activos y operarlos sin que los datos se mezclen.
- [ ] Un talento/stand/aliado/cortesía de un evento NO puede ser tocado por una sesión ligada a otro evento.
- [ ] Cerrar un evento exige informe guardado y no borra nada.
- [ ] Los datos históricos (backfill) siguen accesibles en su evento archivado.
- [ ] La migración completa se ensayó en staging con conteos comparados antes de tocar producción.

## Verificación

1. Todo primero en staging (P1-04): backfill con conteos antes/después tabla por tabla.
2. Prueba de aislamiento: sesión ligada al evento A intentando operar filas del evento B → debe fallar en el servidor.
3. Regresión completa por página con dos eventos activos.
4. Solo tras todo verde: migración en producción con backup previo (P0-05) y conteos comparados.

## Fuera de alcance

- Aprobación de coordinadores desde el dashboard ([M-38](M-38-aprobacion-coordinadores.md)).
- PINs por evento; multi-organización; límite duro de 3 eventos en código (es operacional).

## Notas de implementación

> Pendiente. Prioridad fijada por el usuario como el siguiente gran paso tras cerrar la deuda; no arrancar sin staging.
