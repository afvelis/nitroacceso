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
- (e) Incidente al aplicar la migración en staging (2026-11-09): el primer intento falló con `ERROR: 42830: there is no unique constraint matching given keys for referenced table "aliado_asignaciones"`. Fue un defecto del generador (`scripts/volcado-a-migracion.py`), no del esquema: el script ordenaba las restricciones alfabéticamente y emitía las 5 `foreign key` que apuntan a `aliado_asignaciones`, `aliados`, `cortesias` y `talentos` **antes** de la `primary key`/`unique` a la que referencian. El SQL Editor revirtió todo (el SQL va en una sola transacción implícita) y staging quedó intacto y vacío, verificado por API: las tablas devuelven `PGRST205` y las funciones `PGRST202`, es decir, no existe nada.
- (f) Corrección del generador: ahora ordena las restricciones en tres pasadas (1ª `primary key`/`unique`, 2ª `check`, 3ª `foreign key`) para que ninguna FK preceda a su clave; se añadió al script una **validación automática** que se ejecuta siempre antes de escribir el archivo y aborta con código de salida distinto de 0 si una FK no tiene su PK/UNIQUE previa, si hay `add constraint` antes de su `create table` o si hay funciones antes de las tablas; y la migración generada va envuelta en una transacción explícita (`begin;`/`commit;`) para que un fallo a mitad de archivo no deje la base a medias. La migración regenerada pasa la validación (`VALIDACION OK`) y respeta los mismos conteos que la versión anterior (17 tablas, 75 restricciones, 1 índice, 82 funciones, 17 RLS, 1 event trigger, 78 grant + 4 revoke).
- (g) Segundo incidente al aplicar la migración en staging (2026-11-09): la migración corregida creó las 17 tablas y las 82 funciones correctamente, pero la comparación de permisos contra producción reveló que `anon` podía ejecutar `f_sesion_rol` y `rls_auto_enable` (errores de validación en vez de `42501 permission denied`). Causa: `CREATE FUNCTION` concede `EXECUTE` a `PUBLIC` por defecto y `anon` hereda de `PUBLIC`; la migración solo emitía `grant/revoke` sobre `anon`, así que `PUBLIC` conservaba el privilegio. Producción nunca estuvo expuesta (P0-02 hizo `REVOKE ALL FROM PUBLIC`). Corrección: el generador ahora emite para cada una de las 82 funciones un `revoke execute ... from public` y solo añade `grant execute ... to anon` en las 78 públicas (las 4 internas quedan sin grant, sin `revoke from anon` redundante); se añadió al script la validación de que cada grant a `anon` tenga su revoke de `PUBLIC` previo y que cada función creada tenga su revoke, y se regeneró la 0001 (`VALIDACION OK`: 82 revoke from public + 78 grant to anon).
- (h) Pendiente inmediato: resetear staging (drop schema public cascade + create schema + grant usage, ver `supabase/README.md`) y reaplicar migración + seed con la 0001 regenerada, verificando los conteos y los permisos (`f_sesion_rol` y `rls_auto_enable` deben devolver `42501` para `anon`).
- (i) Tercer incidente al aplicar la migración en staging (2026-11-09): con el seed cargado, `f_login` fallaba con `ERROR: null value in column "id" of relation "login_intentos" violates not-null constraint`. Causa: `login_intentos.id` es una columna `GENERATED ALWAYS AS IDENTITY`, que en PostgreSQL NO tiene `column_default` — el valor automático vive en `pg_attribute.attidentity` — y la consulta de volcado lo dejaba como `id bigint not null` a secas, así que la migración creaba la columna sin valor automático y el `insert into login_intentos(ip, dispositivo, exito)` fallaba. El usuario verificó en producción con `information_schema.columns` que es la **única columna identity de todo el esquema**, con `identity_generation = ALWAYS`. Corrección: el generador (`scripts/volcado-a-migracion.py`) ahora emite la columna como `bigint GENERATED ALWAYS AS IDENTITY` (sin `not null` ni `default`, que identity ya implica), con dos vías por prioridad — la columna `identidad` del CSV si el volcado la trae, o un mapa de respaldo documentado (`IDENTITY_COLUMNS`) con la entrada única `('login_intentos','id') = 'ALWAYS'` porque el CSV del 09/11/2026 se extrajo con la versión anterior de la consulta; y `validate()` ahora aborta con código 1 y sin escribir el archivo si una columna identity del DDL generado no sale como `GENERATED ... AS IDENTITY` sin `not null` ni `default`. Nada de secuencias ni `nextval()`: lo correcto es `GENERATED ALWAYS AS IDENTITY`. Además se versionó por primera vez la consulta extractor en [`docs/sql/extraer-esquema.sql`](../docs/sql/extraer-esquema.sql) (hasta ahora solo existía pegada en un chat, con riesgo de pérdida; la nueva versión ya captura `attidentity` en la columna `identidad`).
- (j) Para reaplicar en staging, el usuario tuvo que ejecutar a mano en el SQL Editor de staging `alter table login_intentos alter column id add generated always as identity` (con la 0001 anterior ya aplicada, la tabla existía sin valor automático y sin PK usable para recrearla limpio); después se reaplicó lo que faltaba. Nota: `GENERATED ... AS IDENTITY` se añade a una tabla existente cuando la columna es de tipo bigint y no lleva default; si hubiera hecho falta, el camino limpio era resetear staging y reaplicar la 0001 regenerada.
- (k) Staging se recreó desde cero una vez durante esta tanda (reset con `drop schema public cascade` + migración + seed, procedimiento de `supabase/README.md`) para dejar atrás los incidentes anteriores (orden de FKs y permisos de PUBLIC) sobre una base limpia.
- (l) Resultados REALES de las pruebas funcionales contra staging (2026-11-09, migración regenerada + seed aplicados):
    - Estructura: 17 tablas y 82 funciones presentes; cerradas a `anon` (las internas devuelven `42501 permission denied`, incluidas `f_sesion_rol` y `rls_auto_enable`).
    - `f_login` con PIN `100000` devuelve token con rol `admin`; con PIN `999999` devuelve vacío (login correcto y rechazo correcto).
    - `f_cortesia_ver('COR-DEMO01')` devuelve la cortesía con sus 2 personas.
    - `f_link_talento_ver('TAL-DEMO01')` muestra el día 1 cerrado con 3 personas y el día 2 en edición y vacío.
    - `f_admin_estado_dias` con token real devuelve el estado de los días; con token inventado devuelve `null`.
    - `f_link_talento_copiar` sobre `TAL-DEMO01` devolvió `true` y el día 2 pasó a tener 3 personas (F-1 validado en staging).
- (m) Sigue pendiente de P1-04: tests E2E, CI y README raíz. La separación de `config.js` por entorno y el banner (Fase B) ya están implementados, ver (o). La tarea NO se marca como hecha por todo eso.
- (n) **Cierre de la Fase A con evidencia real de la reconstrucción desde cero (2026-11-10).** Staging se reseteó y se verificó VACÍO antes de aplicar nada: 0 tablas, 0 funciones y 0 triggers en el esquema `public`, sin `ensure_rls`; los 6 event triggers restantes son los de Supabase (`issue_graphql_placeholder`, `issue_pg_cron_access`, `issue_pg_graphql_access`, `issue_pg_net_access`, `pgrst_ddl_watch`, `pgrst_drop_watch`), que existen en cualquier proyecto nuevo. A continuación se aplicó la migración `0001` regenerada (la del PR de identity) y se verificó la estructura: **17 tablas, 82 funciones, 17 tablas con RLS, `ensure_rls` = 1 event trigger, `columnas_identity` = 1 (solo `login_intentos.id`), 75 restricciones**; después se aplicó el seed. Pruebas funcionales por API, todas correctas: `f_login` con PIN `100000` devuelve token con rol `admin`; con PIN `200000` devuelve token con rol `puerta`; con PIN `999999` devuelve vacío; `f_link_talento_ver('TAL-DEMO01')` muestra el día 1 cerrado con 3 personas y el día 2 en edición con 0; `f_link_talento_copiar` devolvió `true` y dejó 3 personas en el día 2. Todo se aplicó SIN ningún `alter table` manual. El PR de identity quedó fusionado en `main` (4cfcec2) y GitHub Pages desplegó en verde (run 261, success).
- (o) **Fase B implementada (rama `agente/2026-11-10-p1-04-entornos`): entornos + banner + blindaje en `config.js`, sin tocar los 14 HTML.** Las líneas de URL/clave/base fijas se sustituyeron por la tabla `NA_ENTORNOS` (producción y staging) y `SUPABASE_URL` / `SUPABASE_ANON` / `BASE` siguen existiendo con el mismo nombre, ahora calculadas del entorno activo. Resolución en este orden: (a) blindaje primero, (b) `window.__NA_ENV__`, (c) parámetro `?env=`, (d) producción por defecto; valores aceptados `staging`, `produccion` y `prod` (alias), cualquier otro se ignora. **Blindaje:** si el host es `afvelis.github.io` o termina en `.github.io` se fuerza producción y se ignora cualquier override, con `console.warn` (el sitio público real nunca puede quedar conectado a la base de pruebas por un enlace mal copiado). **Banner:** si el entorno no es producción se inyecta solo una banda fija abajo (30 px, fondo oscuro, texto ámbar 12 px, `z-index` máximo, `pointer-events: none`, sin tocar el layout) con el texto "STAGING - datos ficticios (no es producción)" y el host de Supabase; idempotente. **Testabilidad (para la Fase C):** la resolución es una función pura expuesta como `NA.resolverEntorno(hostname, search, override)`, y el archivo no lanza excepción si se carga sin DOM. Se expone en `window.NA`: `entorno`, `esStaging`, `config` (solo `url` y `base`, sin la clave) y `resolverEntorno`, junto a `esc`/`escaparHtml` que ya existían. Un único `console.info` de arranque dice el entorno y el host de Supabase; nunca se imprime la clave. **Cómo se usa staging:** añadir `?env=staging` a la URL de la página, o definir `window.__NA_ENV__ = "staging"` antes de cargar `config.js`; en cualquier host `*.github.io` se ignora por seguridad. La base de staging es dinámica (`location.origin + "/"`) para que los QR generados en staging apunten al sitio donde se está probando.
- (p) Pendiente conocido: la migración `0001` NO es idempotente en el event trigger (`create event trigger ensure_rls` sin guarda). Funciona en esquema vacío porque `drop schema public cascade` se lleva la función y el trigger, pero un segundo intento de aplicación sobre un esquema que ya tenga `ensure_rls` fallaría con `42710` (duplicate object). Candidato a corrección futura: `drop event trigger if exists ensure_rls` (y la guarda equivalente para su función) al inicio de la migración.
- (q) **Pendiente conocido (bloquea el modo staging de punta a punta): CSP `connect-src` solo apunta a producción.** Los 14 HTML declaran `connect-src 'self' https://exrbwctegkzxurzwihvh.supabase.co` (p. ej. `index.html:5`, `coord.html:5`, `talento.html:5`, `puerta.html:5`). Con `?env=staging` el banner sí aparece y `config.js` sí apunta a staging, pero el `fetch` de `llamar()` a `https://adoqujnnnrlgmvwbnwbl.supabase.co/rest/v1/rpc/...` es rechazado por `connect-src` (en consola: "Refused to connect … Content Security Policy"): banner sin RPC. Como esta fase no toca HTML por diseño, el arreglo queda como follow-up que sí toque los 14 HTML: añadir `https://adoqujnnnrlgmvwbnwbl.supabase.co` a `connect-src` de los 14 (se puede decidir si va siempre o solo viaja con la Fase C/CI). Reproducción: servir el sitio en localhost, abrir `index.html?env=staging`, intentar login y leer el rechazo de CSP en consola.
- (r) Corrección sobre esta misma rama (2026-11-10, hallazgos de revisión): (1) la URL de staging en `config.js` tenía la ref de proyecto mal transcrita con 19 caracteres (`adoqujnnnrlgmwbnwbl`, sin la `v`) en contra de la ref real de 20 registrada en (a); verificado por DNS (`getent hosts adoqujnnnrlgmvwbnwbl.supabase.co` resuelve, la de 19 no existe) y corregida a `https://adoqujnnnrlgmvwbnwbl.supabase.co`. (2) El blindaje de `resolverEntorno` era sensible a mayúsculas en el hostname (`AFVELIS.github.io` escapaba del blindaje); no alcanzable desde el navegador (`location.hostname` va en minúsculas) pero corregido con `hostname.toLowerCase()` por ser el seam de tests de la Fase C.

> Pendiente.
