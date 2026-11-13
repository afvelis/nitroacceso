# nitroacceso

Control de acceso por QR para el evento NITROSYSTEM. Frontend estatico (HTML/CSS/JS) publicado en GitHub Pages, con backend en Supabase (tablas + funciones RPC); la app habla con la base con `fetch` directo, sin `supabase-js`.

**No hay build ni bundler: son archivos estaticos.** No hay `package.json`, ni `node_modules`, ni paso de compilacion: lo que hay en el repo es lo que se sirve.

## Estructura del repo

| Ruta | Que es |
| --- | --- |
| `*.html` | Pantallas de la app (raiz del sitio): `index.html` (login), `admin.html`, `puerta.html`, `stand.html`, `talento.html`, `cortesias.html`, `aliados.html`, `estadisticas.html`, etc. |
| `config.js` | Configuracion y utilidades compartidas: entornos (produccion/staging), sesion, QR local, escape HTML. |
| `js/` | Logica de cada pantalla (un modulo por pagina). |
| `vendor/` | Librerias de terceros versionadas a mano (generador de QR local). |
| `supabase/` | Esquema versionado: `migrations/0001_esquema_inicial.sql`, `seed.sql` (datos de demo de staging) y `README.md` con el procedimiento de reset/aplicacion. |
| `scripts/` | Herramientas locales en Python (sin dependencias): servidor de desarrollo, verificacion de arranque de sesion, conversion del volcado DDL de produccion (CSV) a la migracion inicial versionada con validacion del orden de sentencias (`volcado-a-migracion.py`). |
| `tests/` | Tests por RPC contra staging (Node puro, `node --test`). |
| `docs/` | Documentacion: manual de usuario, desarrollo local, seguridad, metodo/bitacora. |
| `tareas/` | Backlog accionable del proyecto. |

## Probar en local

Desde la raiz del repo:

```
python3 scripts/dev-server.py
```

Sirve el sitio en `http://127.0.0.1:8000/` (solo escucha en loopback). Dos cosas que hace solo en la respuesta HTTP, nunca en disco ni en el repo:

- RETIRA el CSP de cada `.html` servido (solo en la respuesta, para poder conectar a staging en local).
- FUERZA el entorno de pruebas (inyecta `window.__NA_ENV__ = "staging"` antes de cargar `config.js`).

El repo y lo que se despliega a GitHub Pages no cambian.

## La cinta amarilla

Cuando el sitio corre contra staging, la pagina muestra una **cinta amarilla** fija abajo: `STAGING - datos ficticios (no es produccion)`. Si NO la ves, estas en produccion: para antes de escribir nada.

## Despliegue

GitHub Pages sirve desde `main` (raiz del repo). Al subir cambios a `main`, el despliegue es automatico: el run de Actions que hay que esperar en verde se llama **`pages build and deployment`**. Sin workflows de build propios para el sitio: no hay nada que compilar.

## Tests

```
node --test tests/*.test.mjs
```

Sin instalar nada (Node >= 18 trae `fetch` y `node:test`). Los tests hablan por RPC directamente con el proyecto de **staging** (`config.js`, bloque `staging`); tienen un candado que aborta si apuntan fuera de staging. No abren navegador: ejercitan `f_login` (casos positivos), `f_puerta_vendedor_por_qr` y `f_puerta_marcar_vendedor` con los datos de demo del seed. No corren contra produccion, jamas.

Hay ademas un archivo de casos negativos que NO corre en la suite ni en el CI: `tests/negativos-login.manual.mjs`. Cada intento fallido de login gasta cuota del limitador del servidor (5 fallos por IP cada 15 minutos) y puede bloquear staging 15 minutos, dejando tambien sin acceso las demos manuales que compartan esa IP. Se ejecuta a mano, `node tests/negativos-login.manual.mjs`, y como maximo UNA vez por ventana de 15 minutos.

## Documentacion

- Manual de usuario: `docs/manual-usuario/` (un capitulo por pantalla).
- Desarrollo local y parametros de prueba: `docs/dev-local.md`.
- Metodo de trabajo y bitacora: `docs/metodo/bitacora-de-proyecto.md`.
- Seguridad: `docs/seguridad-supabase.md`, `docs/seguridad-sesiones.md`, `docs/seguridad-garantias.md`.
- Backlog y estado de tareas: `tareas/README.md`.
- Estado vigente y protocolo de relevo: `ESTADO.md`, `AGENTS.md`.
