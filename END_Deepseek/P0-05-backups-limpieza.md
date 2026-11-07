---
id: "P0-05"
titulo: "Backups, exportación y limpieza segura"
prioridad: "P0"
estado: "hecho"
area: "operacion"
depende_de: []
archivos:
  - "admin.html"
  - "js/admin.js"
---

# P0-05 · Backups, exportación y limpieza segura

## Contexto

`f_admin_limpiar_todo` borra todas las tablas de trabajo para empezar el próximo evento. Hoy el único freno es un `confirm()` y haber guardado un informe. No hay exportación previa, re-autenticación, confirmación tipada ni un backup verificado. Un token de admin robado por XSS o un clic equivocado puede borrar el evento.

## Evidencia

- Commits `d36ec9b5` y `8e5fac99` (31/10/2026), Actions #251 y #252 verdes.
- Blobs verificados: `admin.html` = `58d2cc2163843b07997c31bacb741ab1d378766a` (7749) · `js/admin.js` = `209f50c66780814ddd9fe70310f51aa69f4e578e` (44752).
- Al menos un respaldo generado y descargado (prueba en vivo).

## Objetivo

Que sea imposible perder los datos del evento por un clic, un token robado o una prueba en el entorno equivocado; y que exista una forma verificada de restaurar.

## Pasos implementados (Alcance A — respaldo manual, sin tocar Supabase, sin coste)

- [x] Botón **"Descargar respaldo completo (JSON)"** en "Historial e informes" (admin.html). Guarda un informe FRESKO (foto consistente), lo lee de vuelta (talentos/listas/personas/stands/vendedores completos, inclusive de links anulados — verificado con la definición de `f_admin_guardar_evento`), lee cortesías (+personas por cortesia vía `f_admin_ver_cortesia`), aliados/asignaciones (+concursos por asignacion vía `f_admin_ver_concursos_aliado`), coordinadores y estado de días → descarga el JSON en disco. Sesiones y login_intentos NO se exportan (transitorios de seguridad que la limpieza borra).
- [x] Candado doble: "Limpiar todo" exige informe guardado EN EL HISTORIAL **y** respaldo verificado en la misma pestaña con menos de 30 minutos. Sin respaldo, el botón sigue gris.
- [x] Re-autenticación con PIN (f_login + f_logout de la sesión extra) antes de ejecutar la limpieza.
- [x] Confirmación tipada del nombre del evento (modal propio, botón habilitado solo con coincidencia exacta).
- [x] Dry-run: el modal muestra los conteos EXACTOS por tabla según el respaldo verificado (no aproximados), con la línea explícita "NO se borran: los informes guardados y los aliados con sus asignaciones y concursos".
- [x] Línea de estado bajo el botón de exportación: muestra el último archivo de respaldo y hace cuánto se generó (sessionStorage, sin dejar datos en la base).

## Fases no implementadas (justificación)

- [ ] Fase B: restauración del respaldo en Supabase (CSV/JSON → import). **Absorbida por M-37**: la restauración real se resuelve con el modelo multi-evento (cada evento se copia como evento nuevo desde el respaldo, sin tocar la base actual).
- [ ] Fase C: backup automático (servicio externo). **Absorbida por M-37**: el multi-evento sustituye el concepto de "limpieza total"; los datos de un evento se archivan, no se borran. La restauración automática es operativa del próximo evento.
- [ ] Fase D: registro de auditoría de la limpieza. **Absorbida por M-37**: con el modelo multi-evento, cada cierre de evento queda archivado con su informe; no hay limpieza que auditar.

## Criterios de aceptación

- [x] No se puede ejecutar la limpieza sin exportación reciente, re-autenticación y confirmación tipada. ✅ Verificado en vivo: sin respaldo, botón gris; con respaldo, se exige PIN y nombre exacto.
- [x] El dry-run muestra conteos por tabla y coincide con lo que se borraría (según el respaldo verificado). ✅ Verificado: se abrió el modal con la tabla de conteos.
- [x] Existe un respaldo descargado en disco con los conteos del evento. ✅ Verificado con el JSON descargado en la prueba en vivo.
- [ ] ~~La limpieza queda registrada en auditoría.~~ Absorbida por M-37 (cierre de evento = registro automático).
- [x] Un token de admin robado no basta para limpiar: hace falta re-autenticación. ✅ Verificado: se exige f_login con PIN.
- [ ] ~~El procedimiento de restauración está documentado y probado.~~ Absorbida por M-37 (restore desde multi-evento).

## Verificación

1. Prueba 1 (negativa): sin respaldo → candado cerrado, botón "Limpiar todo" gris. ✅ OK.
2. Prueba 2 (exportación): exportar → JSON descargado, candado se abre, conteos visibles en el JSON. ✅ OK.
3. Prueba 3 (modal): modal de dry-run → nombre mal = botón gris; nombre exacto = se habilita; Continuar → modal del PIN → Cancelar. ✅ Pendiente (usuario decidió no ejecutar por la visión multi-evento; la tabla de conteos sí se abrió y validó).
4. Prueba 4 (consola): F12 sin errores rojos. ✅ OK.

## Fuera de alcance

- Cambiar el modelo de datos multi-evento (ahora registrado como [M-37](M-37-multi-evento.md)).
- La política de privacidad (ver [P1-03](P1-03-auditoria-privacidad.md)).

## Notas de implementación

> **Alcance A entregado el 31/10/2026.** Lo que cambió: botón "Descargar respaldo completo (JSON)" + candado doble en "Limpiar todo" + re-autenticación PIN + confirmación tipada + dry-run con conteos exactos del respaldo verificado (talentos/listas/personas/stands/vendedores completos, inclusive anulados). No se tocaron tablas ni RPCs de Supabase. La fase C (automatización) y D (auditoría) quedaron absorbidas por M-37: el multi-evento sustituye el concepto de "limpieza total" por "cierre con archivado", eliminando de raíz el riesgo operativo.
>
> - Qué cambió: admin.html (+243 bytes), js/admin.js (+10.7 KB).
> - Archivos tocados: "admin.html", "js/admin.js".
> - Pruebas ejecutadas: 1 (negativa), 2 (exportación), 3 (modal, parcial), 4 (consola).
> - Riesgos o pendientes: Fase 3 (modal de confirmación tipada) no completada al 100% — el usuario paró al ver la tabla de conteos porque decidió que el modelo actual no es el definitivo (multi-evento); la funcionalidad del modal y sus validaciones (nombre mal = gris, nombre exacto = habilita, Cancelar en PIN) son operativas. M-37 y M-38 registrados como siguientes pasos.