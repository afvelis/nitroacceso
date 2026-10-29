---
id: "P0-02"
titulo: "Verificar y cerrar RLS, grants y autorización por rol"
prioridad: "P0"
estado: "en_progreso"
area: "seguridad"
depende_de: []
archivos:
  - "config.js"
  - "aliados.html"
  - "admin.html"
  - "cortesias.html"
  - "aliados-concursos.html"
---

# P0-02 · Verificar y cerrar RLS, grants y autorización por rol

## Contexto

La app usa la clave publicable de Supabase y llama RPC directamente. Cualquiera con la URL y la clave puede invocar `/rest/v1/rpc/...` sin pasar por la UI. Los guards de las páginas solo miran `sessionStorage.na_rol`, que el usuario puede cambiar. El control de acceso real debe estar en Supabase: RLS, grants y validación de token/rol dentro de cada función.

No hay SQL ni migraciones en el repo, así que esta tarea incluye auditar el proyecto de Supabase y documentar el estado actual antes de cambiar nada.

## Evidencia

- [config.js:7-21](../config.js#L7-L21): llamada directa a `/rest/v1/rpc/`.
- [config.js:3-4](../config.js#L3-L4): URL y clave publicable.
- [aliados.html:12-14](../aliados.html#L12-L14), [admin.html:652](../admin.html#L652), [cortesias.html:1009](../cortesias.html#L1009): guards de rol en cliente.
- [aliados-concursos.html:323-330](../aliados-concursos.html#L323-L330): llamada admin con `p_token`.

## Objetivo

Que un usuario anónimo no pueda leer ni escribir tablas directamente, y que cada RPC rechace tokens inválidos, expirados o de un rol sin permiso.

## Pasos

- [ ] **Auditar sin cambiar nada.** Ejecutar en Supabase las consultas de [00-revision-seguridad.md](00-revision-seguridad.md#2-rls-grants-y-autorización-por-rol--crítico-a-verificar) y guardar el resultado en `docs/seguridad-supabase.md`.
- [ ] Comprobar si RLS está activo en todas las tablas de `public`. Si alguna no lo tiene, activarlo.
- [ ] Comprobar qué tablas puede leer/escribir `anon` y `authenticated`.
- [ ] Revisar `proacl` de todas las funciones `f_*`. Si es `NULL`, `PUBLIC` tiene `EXECUTE`; revocar y conceder solo a `anon` (o al rol que corresponda).
- [ ] Revisar que las funciones `SECURITY DEFINER` tengan `SET search_path = public, pg_temp`.
- [ ] Verificar que cada `f_admin_*` valide token + rol `admin`; que `f_coord_*` valide coordinador activo; que `f_puerta_*` valide token de puerta.
- [ ] Verificar que `p_token` se compare contra un hash almacenado, no contra texto plano.
- [ ] Documentar la matriz de autorización: función → rol permitido → token requerido.
- [ ] Probar en staging con un token de `puerta` contra `f_admin_dashboard`, `f_admin_listar_aliados` y `f_admin_limpiar_todo`; deben rechazar.
- [ ] Probar con token inventado, token expirado y token revocado.
- [ ] Si hay que cambiar grants o políticas, guardar el SQL exacto en `supabase/migrations/` (o en `docs/seguridad-supabase.md` si aún no existe la carpeta) y aplicarlo primero en staging.

## Criterios de aceptación

- [ ] `GET /rest/v1/<tabla>?select=*` con la clave anónima no devuelve filas de tablas de trabajo.
- [ ] Ninguna función interna es ejecutable por `PUBLIC` o `anon` sin necesidad.
- [ ] Un token de `puerta` no puede ejecutar RPC de admin.
- [ ] Un token inventado, expirado o revocado devuelve error, no datos.
- [ ] La matriz de autorización está documentada y coincide con el comportamiento real.
- [ ] Los cambios de SQL están versionados y se aplicaron en staging antes que en producción.

## Verificación

En staging:

```bash
# Ajustar el nombre de la tabla y las variables
curl -s "$SUPABASE_URL/rest/v1/personas?select=*&limit=1" \
  -H "apikey: $SUPABASE_ANON" \
  -H "Authorization: Bearer $SUPABASE_ANON"
```

Debe devolver error o `[]`, nunca datos personales. Repetir con `sesiones`, `vendedores`, `cortesias`, `asignaciones` y `concursos`.

## Fuera de alcance

- Cambiar el modelo de autenticación (ver [P0-03](P0-03-login-sesiones.md)).
- Auditar la lógica de negocio de cada RPC (ver [P1-01](P1-01-integridad-escaneos-cupones.md)).

## Notas de implementación

> En progreso desde el 29/10/2026 (Sesión 14): fase 1 de auditoría — el usuario ejecuta las Consultas de diagnóstico (RLS, grants, proacl) y pega los resultados; nada se cambia todavía.
