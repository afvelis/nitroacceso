---
id: "M-33"
titulo: "Humanizar la vista «anulada» del aliado"
prioridad: "P2"
estado: "hecho"
area: "frontend"
depende_de: []
archivos:
  - "aliado.html"
---

# M-33 · Humanizar la vista «anulada» del aliado

## Contexto

Idea de producto (registrada en ESTADO.md §3-C, Sesión 13): cuando una asignación o un premio del aliado queda anulado, aliado.html muestra un estado crudo. Hay que humanizar esa vista: lenguaje claro para el aliado, qué quedó anulado, qué sigue vigente y qué puede hacer (a quién contactar). La RPC `f_aliado_ver` ya devuelve información de estado (ARQUITECTURA.md §4); primero hay que ver qué muestra hoy exactamente.

## Evidencia

- aliado.html: pantallas de estado «anulada» (buscar «anulada»/«anulado» en el archivo; verificar el archivo actual antes de editar).
- ARQUITECTURA.md §4: `f_aliado_ver(p_codigo_link)` — JSON con `asignacion`, `aliado`, `concursos`, `ampliaciones`, `dias_cerrados`.

## Objetivo

Que un aliado con algo anulado entienda, en lenguaje llano, qué pasó y qué sigue disponible, sin textos técnicos ni crudos.

## Pasos

- [x] Documentar qué ve hoy el aliado en cada estado anulado (asignación anulada, concurso cerrado/anulado, premios anulados). (verificado por código el 23/11/2026: `aliado.html` mostraba un único `#panelAnulado` con h2 fijo «⛔ Asignación anulada» y texto crudo `Motivo: <razon>\nAliado: <nombre>` montado por concatenación en `js/aliado.js` (`cargar()`); en el modal de detalles del ganador, el estado «Anulado» era solo un pill rojo sin explicación)
- [x] Proponer al usuario los textos nuevos (tono del sistema, español llano). (probado 23/11/2026: los textos se definieron con el orquestador y los aprobó el usuario antes del código; los probó en pantalla ese día)
- [x] Implementar los textos aprobados; nada más que textos/estilo si no hace falta RPC. (probado 23/11/2026: implementado en `aliado.html` (+`#tituloAnulado`/`#detalleAnulado`) y `js/aliado.js` — dos casos con `textContent`/`createElement`, sin ninguna RPC nueva; commit `66544ca`)
- [x] Probar con una asignación de prueba anulada. (probado 23/11/2026 en pantalla por el usuario: se anuló `ASI-DEMO01` en staging, se abrió `aliado.html?a=ASI-DEMO01` y se vio la pantalla nueva completa; reversión ejecutada y verificada por RPC en el mismo turno)

## Criterios de aceptación

- [x] Ningún estado anulado muestra texto crudo o confuso; todos usan los textos aprobados. (probado 23/11/2026 en pantalla para el caso «asignación anulada»: título «⛔ Esta asignación quedó anulada», recuadro «Motivo: …» y dos párrafos con el código; el caso «organización desactivada» quedó verificado por código el 23/11/2026 — la rama `!d.aliado.activo` pinta los textos aprobados con `textContent`; no hubo aliado inactivo real en staging que permitiera probarlo en pantalla)
- [x] Lo que sigue vigente (otros cupones, otras asignaciones) sigue visible y usable. (probado 23/11/2026: tras reverter `ASI-DEMO01` a `activa` por SQL, `f_aliado_ver("ASI-DEMO01")` devolvió `estado: "activa"`, `razon_anulacion: null`, `aliado.activo: true`, `cupones_disponibles: 90` — el flujo normal del aliado quedó intacto; el flujo no se cambió: el `return` y el panel visible se conservaron tal como estaban)
- [x] Sin cambios de RPC (si se descubriera que hacen falta, se documenta y se decide aparte). (probado 23/11/2026: cero cambios de RPC; toda la información necesaria ya viajaba en `f_aliado_ver` — `razon_anulacion`, `aliado.activo`, `nombre_organizacion`, `codigo_link`)

## Verificación

Prueba manual: anular una asignación de prueba (con aprobación del usuario), abrir su link y comparar la pantalla nueva contra los textos aprobados. Revertir/limpiar la prueba después.

Ejecutada el 23/11/2026 por el usuario en staging, con reversión en el mismo turno: `ASI-DEMO01` quedó anulada con `razon_anulacion = 'Prueba M-33 (se revierte en el paso 2)'`, la pantalla mostró los textos aprobados tal cual, y después de revertir se verificó por RPC `f_aliado_ver("ASI-DEMO01")` → `estado: "activa"`, `razon_anulacion: null`, `aliado.activo: true`, `cupones_disponibles: 90`.

## Fuera de alcance

- Cambiar las reglas de anulación ni las RPC (`f_admin_anular_asignacion`, `f_admin_anular_aliado`).
- Notificaciones por correo o WhatsApp.

## Notas de implementación

Implementada el 23/11/2026 (commit `66544ca`), probada en staging el 23/11/2026 con dato real y reversión verificada por RPC.

**Qué se cambió (archivo:línea):**
- `aliado.html:143-147` — `#panelAnulado` reemplazado por la estructura con tres anclas: `#tituloAnulado` (h2), `#razonAnulada` (aviso rojo) y `#detalleAnulado` (div suave-14).
- `js/aliado.js` (`cargar()`, caso `!d.aliado.activo || d.asignacion.estado !== 'activa'`) — el texto crudo que se montaba por concatenación se sustituyó por DOS casos escritos con `textContent`/`createElement` (nunca `innerHTML` para `razon_anulacion` ni para el nombre):
  - Caso A (`!d.aliado.activo`): `⛔ Tu organización quedó desactivada`, `La cuenta de <nombre> ya no está activa en este evento.` y dos párrafos: qué no se puede usar + con qué código reclamar.
  - Caso B (`estado !== 'activa'`): `⛔ Esta asignación quedó anulada`, `Motivo: <razon>` o `No se registró un motivo de la anulación.` + los mismos dos párrafos con `d.asignacion.codigo_link`.
- `js/aliado.js` (`abrirModalDetallesGanador`) — cuando el ganador está anulado, debajo del dato «Estado» va un párrafo `suave-13 mt-10` con la nota del premio anulado; el pill rojo y los demás campos no cambiaron.

**Qué se probó:** caso B (asignación anulada) en pantalla con `ASI-DEMO01` real, texto a texto: título, recuadro rojo `Motivo: Prueba M-33 (se revierte en el paso 2)` y los dos párrafos con el código `ASI-DEMO01`. Tras revertir, `f_aliado_ver("ASI-DEMO01")` devolvió `estado: "activa"`, `razon_anulacion: null`, `aliado.activo: true`, `cupones_disponibles: 90`.

**Qué NO se probó en pantalla:** el caso A (organización desactivada) — no hubo aliado inactivo en staging ese día; quedó verificado por lectura de código (la rama `!d.aliado.activo` pinta los textos aprobados con `textContent`).
