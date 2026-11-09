---
id: "P1-04"
titulo: "Staging, migraciones, tests y CI"
prioridad: "P1"
estado: "en_progreso"
area: "operacion"
depende_de: ["P0-02"]
archivos:
  - "config.js"
  - ".github/workflows/"
---

# P1-04 · Staging, migraciones, tests y CI

## Contexto

No hay `README`, `package.json`, tests, migraciones ni CI. El esquema y las RPC viven solo en Supabase, así que no se puede reconstruir el backend, probar cambios con seguridad ni restaurar desde cero. `config.js` apunta a producción, de modo que un despliegue de prueba puede escribir datos reales. El historial muestra renombrados de archivos para evitar la caché de GitHub Pages.

Esto es la base para poder verificar las demás tareas sin tocar el evento real.

## Evidencia

- [config.js:3-5](../config.js#L3-L5): URL de Supabase y `BASE` de producción hardcodeados.
- No hay `supabase/`, `tests/`, `package.json` ni CI más allá del keepalive.
- [.github/workflows/keep-supabase-alive.yml](../.github/workflows/keep-supabase-alive.yml): único workflow.

## Objetivo

Tener un entorno de staging separado, el esquema versionado, pruebas automatizadas de los flujos críticos y CI que las ejecute.

## Pasos

- [ ] Crear un proyecto Supabase de staging con datos ficticios. No reutilizar el de producción.
- [ ] Externalizar la configuración: `config.js` debe leer el entorno (por ejemplo, `window.__NA_CONFIG__` generado en deploy) o tener `config.staging.js` y `config.prod.js`. Nunca apuntar staging a producción.
- [ ] Mostrar un banner visible cuando el entorno no sea producción.
- [ ] Inicializar Supabase CLI y versionar el esquema en `supabase/migrations/`, con `seed.sql` para datos de prueba.
- [ ] Documentar las RPC y la matriz de permisos en `docs/`.
- [ ] Añadir Playwright (o similar) para los flujos críticos: login, crear talento/stand, registrar, generar QR, escanear, doble escaneo, cerrar día, crear cortesía, asignar ganador, canjear.
- [ ] Añadir tests SQL o de RPC para autorización: anon, puerta, supervisor, admin, token expirado.
- [ ] Añadir CI en GitHub Actions: lint, tests, validación de enlaces y secret scan. No ejecutar pruebas destructivas contra producción.
- [ ] Configurar previews/staging en el deploy; no publicar directo a producción sin pasar pruebas.
- [ ] Añadir `README.md` con arquitectura, roles, deploy, configuración y runbook.
- [ ] Resolver la caché de GitHub Pages con assets versionados o un service worker, en vez de renombrar archivos.

## Criterios de aceptación

- [ ] Existe un staging funcional con su propio Supabase y datos de prueba.
- [ ] `config.js` no puede apuntar a producción por accidente en staging.
- [ ] El esquema se puede recrear desde cero con las migraciones y el seed.
- [ ] Los tests E2E cubren al menos los flujos de login, registro, escaneo y doble escaneo.
- [ ] CI corre en cada PR y falla si un test o el lint fallan.
- [ ] El `README` permite a alguien nuevo levantar el proyecto y desplegarlo.
- [ ] Los cambios de assets no dependen de renombrar archivos para evitar caché.

## Verificación

1. Crear un proyecto Supabase vacío, aplicar migraciones + seed y levantar la app contra él.
2. Ejecutar la suite E2E contra staging.
3. Hacer un cambio pequeño y comprobar que CI lo valida antes de mergear.
4. Verificar que producción no recibe escrituras desde staging.

## Fuera de alcance

- Migrar todos los datos históricos de producción a staging; usar datos ficticios.
- Reemplazar GitHub Pages por otra plataforma (se puede proponer, pero no es requisito).

## Notas de implementación

### Progreso (2026-11-09)

- (a) Proyecto de staging creado y verificado vacío: URL `https://adoqujnnnrlgmvwbnwbl.supabase.co`, responde y no tiene ninguna tabla ni función.
- (b) Volcado DDL de producción extraído por el usuario desde el SQL Editor con consultas a catálogos (solo lectura) y versionado en `docs/sql/volcado-produccion-2026-11-09.csv` (285 filas).
- (c) Esquema inicial generado en `supabase/migrations/0001_esquema_inicial.sql` con 17 tablas, 75 restricciones, 1 índice, 82 funciones, 17 RLS, el event trigger `ensure_rls` y el mapa de permisos real (78 grant + 4 revoke). Generado con `scripts/volcado-a-migracion.py` a partir del volcado; se excluyeron los 6 event triggers de Supabase/PostgREST (`issue_graphql_placeholder`, `issue_pg_cron_access`, `issue_pg_graphql_access`, `issue_pg_net_access`, `pgrst_ddl_watch`, `pgrst_drop_watch`) porque ya existen en cualquier proyecto nuevo.
- (d) Seed ficticio en `supabase/seed.sql`: config con PINs de staging (`100000` admin / `200000` puerta, solo staging), 2 coordinadores, 1 talento con 2 listas y 3 personas, 1 stand con 2 vendedores, 1 cortesía tipo lista con su lista y 2 personas, 1 aliado con asignación y concurso. Re-ejecutable (`on conflict do nothing`), cero datos reales.
- (e) Pendiente inmediato: aplicar migración + seed en staging y verificar con las consultas A y B.
- (f) Sigue pendiente de P1-04: separar `config.js` por entorno, banner de entorno, tests E2E, CI y README raíz.

> Pendiente.
