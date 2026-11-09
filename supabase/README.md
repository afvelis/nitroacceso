# `supabase/` — Esquema versionado y datos de staging

Esta carpeta contiene el esquema del backend de NitroAccesos versionado en el repo, más un seed de datos ficticios para staging.

## Contenido

- `migrations/0001_esquema_inicial.sql` — esquema completo: 17 tablas, 82 funciones, 75 restricciones, 1 índice único parcial, RLS en todas las tablas, el event trigger `ensure_rls` y el mapa de permisos real (78 `grant execute` + 4 `revoke execute`).
- `seed.sql` — datos ficticios mínimos para probar la app y los flujos de P1-04 (config, coordinadores, talento con listas y personas, stand con vendedores, cortesía tipo lista, aliado con asignación y concurso).

## Cómo aplicar la migración en un proyecto nuevo

1. Crea el proyecto Supabase (nuevo y **vacío**: sin tablas ni funciones).
2. Abre el **SQL Editor** del proyecto destino.
3. Pega el contenido completo de `migrations/0001_esquema_inicial.sql` y ejecútalo en **una sola pasada**.
4. Verifica que no haya errores y, de querer, revisa el conteo de objetos con consultas a los catálogos.

## Cómo cargar el seed

1. Con la migración ya aplicada, pega el contenido completo de `seed.sql` en el SQL Editor y ejecútalo.
2. El seed es re-ejecutable: todos los `insert` usan `on conflict do nothing`.

## PINs de staging

El seed crea una fila de `config` con estos PINs, hasheados con bcrypt:

- **Admin:** `100000`
- **Puerta:** `200000`

**Estos PINs son SOLO de staging. JAMÁS se usan en producción.** Producción mantiene sus propios PINs rotados y nunca deben coincidir con estos.

## Advertencia importante

`0001_esquema_inicial.sql` es una **foto del esquema de producción del 09/11/2026**. A partir de ahora, todo cambio de esquema entra como una **migración nueva** (`0002_...`, `0003_...`, ...). **No edites la 0001**: es la línea base sobre la que se apoyan las migraciones siguientes y volver a aplicarla desde cero debe dar siempre el mismo resultado.
