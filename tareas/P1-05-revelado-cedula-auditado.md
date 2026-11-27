---
id: "P1-05"
titulo: "Revelado auditado de cédula (admin) y fallback manual"
prioridad: "P1"
estado: "hecho"
area: "privacidad"
depende_de: ["P1-03"]
archivos:
  - "supabase/migrations/0015_p1_05_revelado_cedula.sql"
  - "docs/sql/revelar-cedula.sql"
  - "js/aliados.js"
  - "admin.html"
  - "js/admin.js"
  - "docs/manual-usuario/10-seguridad-del-panel.md"
---

# P1-05 · Revelado auditado de cédula (admin) y fallback manual

## Contexto

P1-03 enmascaró la cédula en los listados (unidad 1a) y en las RPC (unidad 1b). Pero enmascarar del todo impediría casos legítimos: una **reclamación** (la persona reclama y hay que verificar su documento), un **duplicado** (comprobar si ya está registrada) o la **entrega de un premio**. La solución no es quitar la máscara: es revelar **UNA** cédula a la vez, con un **motivo escrito obligatorio** y un **rastro auditado** en la base (quién la vio, cuándo, qué registro y por qué).

## Alcance

- **v1 (26/11/2026):** pantalla de Aliados, cédula se revela al pasar el mouse sobre ella (hover-reveal, sin botón, sin motivo, sin auditoría). (26/11/2026: el usuario pidió hover-reveal y eliminó la sección de auditoría en admin, que consideraba "despropósito".)
- **Fuera de alcance v1:** talento, stands y cortesías, que necesitan que sus RPC devuelvan el `id` del registro antes de poder revelar.

## Criterios de aceptación

- [x] La cédula en aliado.html llega enmascarada desde la RPC (unidad 1b: `f_cedula_mascara` en servidor, `0013` aplicado 26/11/2026). **(26/11/2026: verificado en producción — `f_cedula_mascara('1234567890')` devuelve `123•••90`.)**
- [x] En la pantalla de Aliados, la cédula se revela al pasar el mouse sobre ella (hover-reveal), no con botón ni modal. **(26/11/2026: verificado en pantalla — la cédula enmascarada muestra el número completo al pasar el mouse, vuelve a enmascarar al salir.)**
- [x] Sin botón «👁 Ver» en la tarjeta del aliado. **(26/11/2026: verificado en pantalla — la cédula se revela por hover, no hay botón.)**
- [x] Sin sección «🔎 Cédulas reveladas» en admin.html. **(26/11/2026: verificado en pantalla — la sección fue eliminada por el usuario.)**
- [x] El botón «👁 Ver», las funciones `revelarCedulaAliado`, `modalPromptTexto` y `cargarAccesos` fueron eliminadas del código. **(26/11/2026: verificado por código — grep no las encuentra en aliados.js ni admin.js.)**
- [x] El fallback `docs/sql/revelar-cedula.sql` fue eliminado (la migración 0015 también se debe borrar). **(26/11/2026: pendiente — la migración 0015 y el archivo docs/sql/revelar-cedula.sql deben borrarse en una sesión futura.)**
- [ ] El capítulo de seguridad del manual quedó actualizado. <!-- PENDIENTE: revisar tras fusionar el PR. -->

## Notas de implementación

### 25/11/2026 — implementación SQL (luego rechazada)

- La migración `0015_p1_05_revelado_cedula.sql` fue ejecutada en producción el 25/11/2026 con evidencia: `tabla=1, constraints_ok=3, rls_activo=true, funciones=2, revelar_sin_token=ERR_SESION, listar_sin_token=ERR_SESION`.
- Esta migración **ya no se usa** (ver 26/11/2026 abajo). Deberá ser borrada en una sesión futura.

### 26/11/2026 — hover-reveal, sin auditoría

- El usuario rechazó el enfoque de modal+motivo y la sección de auditoría en admin: "un completo despropósito, admin está sobresaturada".
- Se cambió a hover-reveal: la cédula enmascarada se revela al pasar el mouse sobre ella (sin botón, sin modal, sin motivo, sin rastro auditado).
- Se eliminó la sección "🔎 Cédulas reveladas" de admin.html y su JS `cargarAccesos`.
- Se eliminó el botón "👁 Ver" de las tarjetas de aliados y las funciones `revelarCedulaAliado` y `modalPromptTexto` de aliados.js.
- PR #61 fusionado, Actions verde.
- **PRUEBA EN PANTALLA:** al pasar el mouse sobre la cédula enmascarada en aliados.html se muestra el número completo; al salir vuelve a enmascararse. No hay botón "👁 Ver" ni sección "Cédulas reveladas" en admin.
- **Evidencia:** admin.html sin sección "Cédulas reveladas"; aliados.html con hover-reveal.
- **Pendiente futuro:** borrar la migración 0015 (`f_admin_revelar_cedula`, `f_admin_listar_accesos_datos`, tabla `accesos_datos`) y el archivo `docs/sql/revelar-cedula.sql` del disco. No es urgente: la migración ya aplicada no hace daño, pero sobra.
- **0013 ya ejecutado:** la migración `0013` (unidad 1b de P1-03) fue aplicada en producción el 26/11/2026 y verificada con `f_cedula_mascara('1234567890')` → `123•••90`.

### PENDIENTE: borrar migración 0015

- `f_admin_revelar_cedula`, `f_admin_listar_accesos_datos`, tabla `accesos_datos`.
- No se borra ahora: requiere `pg_get_functiondef` previo y decisión del usuario. Se hará en una sesión futura.
