---
id: "P0-05"
titulo: "Backups, exportación y limpieza segura"
prioridad: "P0"
estado: "pendiente"
area: "operacion"
depende_de: []
archivos:
  - "admin.html"
  - "config.js"
---

# P0-05 · Backups, exportación y limpieza segura

## Contexto

`f_admin_limpiar_todo` borra todas las tablas de trabajo para empezar el próximo evento. Hoy el único freno es un `confirm()` y haber guardado un informe. No hay exportación previa, re-autenticación, confirmación tipada ni un backup verificado. Un token de admin robado por XSS o un clic equivocado puede borrar el evento.

## Evidencia

- [admin.html:641](../admin.html#L641): confirmación de “Limpiar todo”.
- [admin.html:639-650](../admin.html#L639-L650): flujo de limpieza.
- [admin.html:394-406](../admin.html#L394-L406): guardado de informe.
- No hay migraciones, `pg_dump` ni exportación en el repo.

## Objetivo

Que sea imposible perder los datos del evento por un clic, un token robado o una prueba en el entorno equivocado; y que exista una forma verificada de restaurar.

## Pasos

- [ ] Añadir un botón de exportación completa (JSON y/o CSV) antes de limpiar: personas, listas, talentos, stands, vendedores, cortesías, premiaciones, aliados, asignaciones, concursos y sesiones.
- [ ] Guardar la exportación fuera del navegador (descarga) y, si es posible, en un bucket/almacenamiento con retención.
- [ ] Bloquear “Limpiar todo” hasta que exista una exportación reciente y verificada.
- [ ] Exigir re-autenticación (PIN de nuevo) y confirmación tipada del nombre del evento.
- [ ] Implementar borrado lógico/archivado con ventana de gracia (por ejemplo, 24-72 horas) en vez de borrado inmediato; o un `evento_id` que permita conservar datos históricos.
- [ ] Hacer un `dry-run` que muestre cuántas filas se borrarán por tabla antes de confirmar.
- [ ] Documentar y probar la restauración en staging: descargar backup, borrar, restaurar y comparar conteos.
- [ ] Verificar la política de backups del plan de Supabase; si no hay PITR, programar un `pg_dump` externo.
- [ ] Añadir un registro de auditoría de la limpieza: quién, cuándo, cuántas filas, qué backup.

## Criterios de aceptación

- [ ] No se puede ejecutar la limpieza sin exportación reciente, re-autenticación y confirmación tipada.
- [ ] El `dry-run` muestra conteos por tabla y coincide con lo que se borra.
- [ ] Existe un backup restaurado en staging con los mismos conteos que producción antes del borrado.
- [ ] La limpieza queda registrada en auditoría.
- [ ] Un token de admin robado no basta para limpiar: hace falta re-autenticación.
- [ ] El procedimiento de restauración está documentado y probado.

## Verificación

1. En staging, guardar un informe, exportar, limpiar y restaurar; comparar conteos.
2. Intentar limpiar sin exportación y sin re-autenticación; debe bloquear.
3. Revisar el registro de auditoría de la limpieza.
4. Revisar que el backup incluye las tablas de trabajo y los informes históricos.

## Fuera de alcance

- Cambiar el modelo de datos multi-evento (se puede proponer, pero no es requisito de esta tarea).
- La política de privacidad (ver [P1-03](P1-03-auditoria-privacidad.md)).

## Notas de implementación

> Pendiente.
