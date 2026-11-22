---
id: "P2-04"
titulo: "El CI depende de los PIN de demo de staging: rotar un PIN tumba la suite de todo el repo"
prioridad: "P2"
estado: "en_progreso"
area: "operacion"
depende_de: []
archivos:
  - ".github/workflows/ci.yml"
  - "tests/helpers.mjs"
  - "docs/dev-local.md"
---

# P2-04 · El CI depende de los PIN de demo de staging: rotar un PIN tumba la suite de todo el repo

## Problema medido el 2026-11-17

El workflow [.github/workflows/ci.yml](../.github/workflows/ci.yml) ejecuta `node --test tests/*.test.mjs` contra STAGING REAL (la suite habla por RPC con el proyecto de staging, con la clave publicable leída de `config.js`). [tests/helpers.mjs](../tests/helpers.mjs) usa dos PIN fijos — `PIN_ADMIN_DEMO` y `PIN_PUERTA_DEMO` — que corresponden al seed de staging ([supabase/seed.sql](../supabase/seed.sql), `100000` admin / `200000` puerta, públicos por diseño).

Al rotar los PIN de staging para probar [F-13](F-13-pin-8-digitos-bcrypt-12.md), los 8 tests pasaron a rojo y el PR de documentación quedó bloqueado por checks rojos que nada tenían que ver con su contenido. Se arregló restaurando los PIN de demo del seed.

## Riesgos a documentar

- **(a) Cualquiera que rote un PIN en staging tumba el CI de todo el repo.** Un cambio legítimo del entorno (rotación de PIN, restauración del staging, reconstrucción del seed) se percibe como «el código está roto».
- **(b) Los tests ESCRIBEN en staging y no son idempotentes:** [tests/escaneo.test.mjs](../tests/escaneo.test.mjs) muta el vendedor `V-DEMO02` (doble escaneo, día inválido) y NO lo restaura — deja staging con datos mutados tras cada corrida.
- **(c) El CI no distingue un fallo de código de un fallo de entorno:** los 8 tests fallan igual si la RPC está mal que si el entorno de staging no está preparado.

## Criterios propuestos (SIN implementar; decidir e implementar en su momento)

- [x] Que el CI falle con un mensaje EXPLÍCITO si los PIN de demo no entran — «ENTORNO STAGING NO PREPARADO» — en vez de fallar 8 tests con errores que parece de código. **Cumplido (2026-11-22):** constante `MENSAJE_ENTORNO_NO_PREPARADO` y `verificarEntornoStaging()` en `tests/helpers.mjs:168` y `tests/helpers.mjs:176`; script `tests/preflight-entorno.mjs:1`; paso propio en el workflow en `.github/workflows/ci.yml:38`.
- [x] Documentar en [docs/dev-local.md](../docs/dev-local.md) que después de cualquier rotación en staging hay que restaurar los PIN de demo del seed antes de abrir o relanzar un PR. **Cumplido (2026-11-22):** nota en `docs/dev-local.md:87` (sección 6), con la comprobación de 10 segundos vía `node tests/preflight-entorno.mjs` (`docs/dev-local.md:92`).
- [ ] Decidir si la suite debe usar un entorno PROPIO (no el staging que se usa para pruebas manuales), de modo que las rotaciones y mutaciones de pruebas no afecten ni al CI ni a las demos. **Decisión tomada (2026-11-22): se elige la OPCIÓN A — staging compartido + preflight.** No se crea un proyecto Supabase propio de tests. Justificación y consecuencias honestas en `DECISIONES.md` (2026-11-22 · Sesión 34).

## Notas

- Tarea creada el 2026-11-17 durante el cierre de F-13; solo documentación, sin implementación.
- Regla operativa vigente (ver `DECISIONES.md`, 17/11/2026): después de cualquier rotación en staging, restaurar los PIN de demo del seed antes de abrir o relanzar un PR.

## Notas de implementación (2026-11-22)

**Qué cambió.** Preflight para distinguir "entorno roto" de "código roto": `verificarEntornoStaging()` hace 1 login por rol contra staging tras el candado de producción, lanza un `Error` que empieza por `ENTORNO STAGING NO PREPARADO: ` (sin ningún valor de PIN) si algún PIN de demo no entra, y devuelve `{ url, admin: true, puerta: true }` si ambos entran. El script y el paso de CI solo reportan; la función no imprime nada.

**Archivos tocados:** `tests/helpers.mjs` (bloque nuevo al final, sin modificar nada anterior), `tests/preflight-entorno.mjs` (nuevo; NO es `*.test.mjs` para que el `node --test tests/*.test.mjs` del CI no lo recoja), `.github/workflows/ci.yml` (paso `Preflight del entorno de staging (P2-04)` antes de las suites, nada más del workflow), `docs/dev-local.md` (nota en la sección 6), `DECISIONES.md` (entrada append-only del 2026-11-22).

**Pruebas ejecutadas.** `node tests/preflight-entorno.mjs; echo "EXIT=$?"` contra staging real dio:

```
ENTORNO STAGING PREPARADO: PIN de admin y PIN de puerta entran en staging.
EXIT=0
```

**Pendientes.**

- [ ] Verificar el paso de preflight en el CI real (primer push/PR tras fusionar): debe verse `Preflight del entorno de staging (P2-04)` en verde y las suites detrás.
- [ ] La mutación de `V-DEMO02` en `tests/escaneo.test.mjs` sigue sin restaurarse: el riesgo (b) queda documentado, NO arreglado, y con la opción A las pruebas manuales y el CI siguen compartiendo base.
