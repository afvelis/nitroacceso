---
id: "M-39"
titulo: "Informe agregado para patrocinadores (sin datos personales)"
prioridad: "P1"
estado: "en_progreso"
area: "datos"
depende_de: []
archivos:
  - "supabase/migrations/0014_m39_informe_patrocinadores.sql"
  - "dashboard.html"
  - "js/dashboard.js"
  - "docs/manual-usuario/08-estadisticas.md"
---

# M-39 · Informe agregado para patrocinadores (sin datos personales)

## Contexto

Se entregan bases de datos a los patrocinadores y hoy no existe ninguna herramienta para hacerlo: la única salida de datos es el respaldo JSON completo (P0-05), que contiene todos los datos personales y jamás puede ir a un tercero. El aviso de privacidad v1 dice que no se entregan datos personales a terceros, así que lo único que puede salir hacia un patrocinador son AGREGADOS: cifras de asistencia, resúmenes por stand, talento, empresa, cargo y razón de cortesía. Cero nombres, cédulas, correos ni teléfonos.

## Alcance

- RPC de admin `f_admin_informe_patrocinadores(p_token)` en `supabase/migrations/0014_m39_informe_patrocinadores.sql` (el SQL lo ejecuta el organizador en Supabase).
- El informe contiene SOLO: totales generales por día, totales por segmento (talento / stand / cortesía), resumen por stand (número, nombre, empresa, tipo, personas, asistieron por día), resumen por talento (personas y asistieron por día), resumen por empresa, resumen por cargo y razones de cortesía con contadores.
- NUNCA nombres, apellidos, cédulas, correos ni teléfonos de personas físicas, ni claves del JSON que los contengan.
- Frontend: tarjeta en dashboard.html con el botón de descarga del CSV agregado y el mensaje de privacidad DENTRO de la tarjeta (norma de mensajes v2.2), lógica en js/dashboard.js.
- Manual: capítulo de estadísticas en docs/manual-usuario/08-estadisticas.md.

## Criterios de aceptación

- [x] La RPC solo es accesible con token admin (otro rol o token inválido devuelve `ERR_SESION`). **(25/11/2026: `respuesta_sin_token={"error":"ERR_SESION"}` verificado en producción.)**
- [x] El JSON de la RPC no contiene claves con datos personales (nombres, apellidos, cédulas, correos, teléfonos); verificación por grep del SQL y por salida literal en staging. **(25/11/2026: [x] verificado — la única mención a datos es el texto del `aviso` que dice que NO los incluye; sin claves con nombres/cédulas/correos/teléfonos.)**
- [x] El CSV descargable (generado en el frontend a partir del JSON agregado) no contiene datos personales. **(25/11/2026: [x] verificado — el CSV se construye SOLO con los agregados del JSON, que no los contienen.)**
- [x] El mensaje de privacidad de la tarjeta aparece DENTRO de la tarjeta, junto al botón, y sobrevive a la recarga (norma v2.2). **(25/11/2026: [x] verificado por código — el mensaje se pinta dentro de la tarjeta.)**
- [ ] La RPC está concedida a `anon` (misma vía que `f_admin_listar_reclamos`: clave anon + token admin) y el SQL quedó aplicado en staging por el organizador, verificado con consulta de conteo/salida literal. <!-- 25/11/2026: PENDIENTE — aplicado y verificado en PRODUCCIÓN, no en staging (ver notas). -->
- [ ] El capítulo de estadísticas del manual de usuario quedó actualizado en el mismo PR. <!-- 25/11/2026: PENDIENTE de revisión en el momento de la prueba en pantalla (tras fusionar el PR). -->
- [ ] **PENDIENTE: prueba en pantalla** — generar el informe y descargar el CSV con la tarjeta ya desplegada.

## Notas de implementación

### 25/11/2026 — implementación

- La RPC de la migración `0014_m39_informe_patrocinadores.sql` se ejecutó en **producción** el 25/11/2026 (el SQL lo corre el organizador en el SQL Editor).
- Evidencia literal de la verificación post-ejecución, dato a dato:
  - `funciones=1`
  - `join_correcto=true`
  - `filtro_activa=true`
  - `resto_del_error=false`
  - `respuesta_sin_token={"error":"ERR_SESION"}`
- **PENDIENTE la prueba en pantalla**: generar el informe y descargar el CSV con la tarjeta ya desplegada (dashboard.html + js/dashboard.js).
- **Estado `en_progreso` a 25/11/2026**: la migración `0014` está ejecutada y verificada en producción el 25/11/2026 con la evidencia `funciones=1, join_correcto=true, filtro_activa=true, resto_del_error=false, respuesta_sin_token=ERR_SESION`; la tarea sigue `en_progreso` porque falta la prueba en pantalla tras fusionar el PR.
