---
id: "P2-04"
titulo: "El CI depende de los PIN de demo de staging: rotar un PIN tumba la suite de todo el repo"
prioridad: "P2"
estado: "pendiente"
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

- [ ] Que el CI falle con un mensaje EXPLÍCITO si los PIN de demo no entran — por ejemplo «ENTORNO STAGING NO PREPARADO» — en vez de fallar 8 tests con errores que parece de código.
- [ ] Documentar en [docs/dev-local.md](../docs/dev-local.md) que después de cualquier rotación en staging hay que restaurar los PIN de demo del seed antes de abrir o relanzar un PR.
- [ ] Decidir si la suite debe usar un entorno PROPIO (no el staging que se usa para pruebas manuales), de modo que las rotaciones y mutaciones de pruebas no afecten ni al CI ni a las demos.

## Notas

- Tarea creada el 2026-11-17 durante el cierre de F-13; solo documentación, sin implementación.
- Regla operativa vigente (ver `DECISIONES.md`, 17/11/2026): después de cualquier rotación en staging, restaurar los PIN de demo del seed antes de abrir o relanzar un PR.
