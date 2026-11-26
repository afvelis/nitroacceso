---
id: "P1-05"
titulo: "Revelado auditado de cédula (admin) y fallback manual"
prioridad: "P1"
estado: "en_progreso"
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

- **v1:** pantalla de Aliados (botón «👁 Ver» junto a la cédula enmascarada) + registro de auditoría visible en el panel (`🔎 Cédulas reveladas`) + fallback manual sin despliegue (`docs/sql/revelar-cedula.sql`).
- **Fuera de alcance v1:** talento, stands y cortesías, que necesitan que sus RPC devuelvan el `id` del registro antes de poder revelar.

## Criterios de aceptación

- [x] El motivo es obligatorio y de al menos 10 caracteres (lo valida la UI y lo revalida la RPC con `ERR_MOTIVO`). **(25/11/2026: verificado por código — validación en la UI y revalidación en la RPC.)**
- [x] Cada revelado deja una fila en `accesos_datos` con el hash de sesión, el origen (`aliados` en v1), el `registro_id` y el motivo truncado a 300. **(25/11/2026: verificado — la RPC inserta la fila ANTES de devolver el valor.)**
- [x] El listado de auditoría (`f_admin_listar_accesos_datos`) NO muestra ni el hash del token ni la cédula. **(25/11/2026: verificado por código — el listado no expone hash ni cédula.)**
- [ ] **PENDIENTE: prueba en pantalla** — revelar una cédula en Aliados y verla aparecer en «🔎 Cédulas reveladas»; junto con ella quedan por revisar los tres criterios siguientes y el del manual.
- [ ] El resultado del revelado (cédula completa y número de registro) aparece DENTRO de la tarjeta del aliado, junto al botón (norma de mensajes v2.2). Nunca `window.prompt` ni nativos. <!-- PENDIENTE: prueba en pantalla tras fusionar el PR. -->
- [ ] El botón se deshabilita mientras la RPC está en vuelo y se habilita al terminar (try/finally). <!-- PENDIENTE: prueba en pantalla tras fusionar el PR. -->
- [ ] Sin token admin, la RPC devuelve `ERR_SESION` (verificado contra staging). <!-- 25/11/2026: verificado en PRODUCCIÓN (`revelar_sin_token=ERR_SESION`, `listar_sin_token=ERR_SESION`); falta la prueba en pantalla tras fusionar el PR. -->
- [x] El fallback `docs/sql/revelar-cedula.sql` funciona sin desplegar nada: el organizador lo ejecuta en el SQL Editor y el rastro queda en el log de Supabase. **(25/11/2026: el archivo existe y está preparado para el día del evento.)**
- [ ] El capítulo de seguridad del manual quedó actualizado en el mismo PR. <!-- PENDIENTE: revisar tras fusionar el PR. -->

## Notas de implementación

### 25/11/2026 — implementación

- La migración `0015_p1_05_revelado_cedula.sql` está ejecutada y **verificada en producción** el 25/11/2026, con la evidencia: `tabla=1, constraints_ok=3, rls_activo=true, funciones=2, revelar_sin_token=ERR_SESION, listar_sin_token=ERR_SESION`.
- La migración `0013` (unidad 1b de P1-03) sigue **SIN ejecutar**: ver la nota correspondiente en [P1-03-auditoria-privacidad.md](P1-03-auditoria-privacidad.md).
- Queda **PENDIENTE la prueba en pantalla** (tras fusionar el PR): revelar una cédula en Aliados y verla aparecer en «🔎 Cédulas reveladas».

### ORDEN DE DESPLIEGUE obligatorio

1. **Primero el SQL** `supabase/migrations/0015_p1_05_revelado_cedula.sql` en producción (el organizador lo ejecuta en el SQL Editor del proyecto Supabase y espera el verde de Actions).
2. **Después el frontend** (admin.html, js/admin.js, js/aliados.js).

Si se despliega la pantalla antes que el SQL, el botón «👁 Ver» fallará con error de RPC inexistente (`f_admin_revelar_cedula` no existe todavía y `llamar` responde con el error 404/PGRST203 de PostgREST).
