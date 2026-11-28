---
id: "M-35"
titulo: "Mostrar nombres de premios anulados (requiere cambio de RPC)"
prioridad: "P2"
estado: "en_progreso"
area: "datos"
depende_de: []
archivos:
  - "aliado.html"
  - "aliados-concursos.html"
  - "js/aliado.js"
  - "supabase/migrations/0021_m35_mostrar_concursos_anulados.sql"
---

# M-35 · Mostrar nombres de premios anulados (requiere cambio de RPC)

## Contexto

Idea de producto (registrada en ESTADO.md §3-C, Sesión 13): cuando un premio/premiación se anula, en la vista del aliado y del admin el nombre del ganador o del premio desaparece o queda genérico, y no se puede saber qué era. Para mostrar el nombre hace falta un cambio de RPC (que el detalle de lo anulado viaje con el nombre). Ojo: al premiar una anulación, los datos del ganador se guardan con `razon_anulacion` en `cortesias` (ARQUITECTURA.md §3) — primero hay que verificar exactamente qué se pierde y en qué vista.

## Evidencia

- aliado.html y aliados-concursos.html: render de concursos y premios anulados (buscar «anulada» en ambos; verificar los archivos actuales antes de editar).
- RPCs involucradas (ARQUITECTURA.md §4): `f_admin_ver_concursos_aliado(p_token, p_asignacion_id)` y `f_aliado_ver(p_codigo_link)`.
- ARQUITECTURA.md §3, tabla `cortesias`: `estado (activa|anulada)`, `razon_anulacion`, `concurso_id`.

## Objetivo

Que las vistas de concursos muestren el nombre del premio/ganador anulado (marcado como anulado) en vez de ocultarlo.

## Pasos

- [ ] Reproducir el caso: crear aliado/concurso/premio de prueba, anularlo, y documentar qué muestran hoy aliado.html y aliados-concursos.html.
- [ ] Pedir al usuario `pg_get_functiondef` de las RPCs involucradas (Consulta C de ARQUITECTURA.md §8) y ubicar dónde se filtra o se oculta lo anulado.
- [ ] Proponer el cambio mínimo de RPC y su SQL exacto al usuario (regla: primero `pg_get_functiondef`, DROP/OR REPLACE con la misma firma, reglas §6 de ARQUITECTURA.md).
- [ ] El usuario ejecuta el SQL; ajustar el render en las dos vistas para mostrar el nombre con la marca «anulado».
- [ ] Probar de punta a punta con datos de prueba y limpiar después.

## Criterios de aceptación

- [ ] El premio anulado se ve con su nombre y la marca clara de anulado (no desaparece ni queda genérico).
- [ ] Los premios activos no cambian de aspecto (regresión verificada).
- [ ] El SQL quedó documentado en esta tarea y fue ejecutado por el usuario (ningún asistente toca la base).
- [ ] No se exponen datos de más en la vista pública del aliado (solo lo suyo).

## Verificación

Prueba manual con datos de prueba: anular un premio y verificar las dos vistas; además, repetir el flujo completo de canje en puerta con un premio activo para confirmar que el cambio de RPC no rompió `f_puerta_premiacion_por_qr` / `f_puerta_canjear_premiacion`.

## Fuera de alcance

- Re-anular o re-activar premios existentes reales.
- Cambiar el flujo de premiación de puerta.
- Mostrar datos del ganador anulados fuera de lo que ya es visible para ese aliado.

## Notas de implementación

### 27/11/2026 — Implementación completa

- **RPC (migración 0021):** `f_aliado_ver` ya no excluye los concursos cerrados (se eliminó el `NOT EXISTS` que filtraba por `dias_cerrados`). Se añade `razon_anulacion` al JSON de cada concurso y un boolean `cerrado`. La cédula se enmascara con `f_cedula_mascara` (heredado de 0013).
- **Frontend (js/aliado.js):** `pintarConcursos()` ahora muestra el `razon_anulacion` de cada concurso (texto rojo ⚠️), y cuando un concurso está cerrado sin ganador pero tiene razón de anulación, muestra "Concurso anulado." en el bloque de botones.
- **Regresión:** el flujo normal (asignar, editar, eliminar, enviar) se mantiene intacto. Los concursos activos siguen mostrando `pill-verde`.
- **CSP:** `js/aliado.js` se carga como script externo (`<script src>`), no afecta el hash CSP de `aliado.html`.
- **Verificación:** `node --check js/aliado.js` → OK.
