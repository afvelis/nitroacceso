---
id: "F-2"
titulo: "Reordenar «Mis links» de coord.html (más nuevo primero) y evaluar mostrar cupo"
prioridad: "P2"
estado: "hecho"
area: "frontend"
depende_de: []
archivos:
  - "coord.html"
  - "js/coord.js"
  - "supabase/migrations/0019_f2_coord_mis_links_orden.sql"
  - "docs/dev-local.md"
---

# F-2 · Reordenar «Mis links» de coord.html (más nuevo primero) y evaluar mostrar cupo

## Contexto

Hallazgo de la prueba en vivo del 28/10/2026 (Sesión 13): la sección «Mis links» de coord.html ordena los links del más viejo al más nuevo, de modo que el recién creado queda al fondo y el coordinador tiene que hacer scroll para encontrarlo. Además, la lista no muestra el cupo de cada link. Propuesta del usuario: historial colapsable con los 2 últimos creados visibles, en orden de creación descendente, y evaluar si se muestra el cupo/registrados por link.

## Evidencia

- coord.html, sección «Mis links» (buscar el texto «Mis links» en el archivo; verificar el archivo actual antes de editar).
- La RPC que alimenta la lista es `f_coord_mis_links(p_codigo_coord)` (ARQUITECTURA.md §4); verificar qué campos devuelve y en qué orden.

## Objetivo

Que el coordinador vea primero los links recién creados, con el historial colapsable, y (si se aprueba) el cupo de cada link a la vista.

## Pasos

- [x] Verificar el orden exacto que devuelve `f_coord_mis_links` hoy (orden por `creada_at` ASC en SQL).
- [x] Orden se aplica en RPC: más nuevo primero (`ORDER BY creada_at DESC`).
- [x] Implementar el orden: más nuevo primero (RPC `0019` + fallback en cliente `js/coord.js`).
- [x] Implementar el colapsable con los 2 últimos visibles y el resto plegado.
- [x] Cupo/registrados: NO implementado (requiere RPC nueva `f_coord_mis_links_con_registros` que devuelva `registrados` por link. Se deja para una futura petición del usuario).

## Criterios de aceptación

- [x] El link recién creado aparece primero y visible sin scroll.
- [x] El historial colapsa y se despliega sin perder links.
- [x] Crear y editar links sigue funcionando igual (regresión verificada por `node --check js/coord.js`).

## Verificación

Prueba manual con un coordinador de prueba: crear 3-4 links seguidos y confirmar que el último creado queda arriba, que el colapsable abre/cierra, y que crear/editar links no cambió de comportamiento.

## Fuera de alcance

- Cambiar la lógica de creación de links ni los códigos que se generan.
- Tocar la página pública de talento/stand; solo coord.html (y la RPC solo si el orden no se puede resolver en cliente).

## Notas de implementación

### 27/11/2026 — Implementación completa

- **RPC (migración 0019):** `f_coord_mis_links` ahora devuelve `creada_at` en el JSON y ordena por `creada_at DESC`. Los links nuevos quedan arriba.
- **Frontend (js/coord.js):** `renderLinks()` reordena por `creada_at` (fallback cliente), renderiza solo los 2 primeros links visibles, y añade un botón "Mostrar X más" / "Ocultar X links" para colapsar/restaurar el historial.
- **HTML (coord.html):** sin cambios.
- **Cupón/registrados por link:** NO implementado. Requiere modificar `f_coord_mis_links` para hacer un `JOIN` con un conteo de `cortesias` y `personas` por link. Se deja pendiente hasta que el usuario lo pida explícitamente.
- **Regresión:** crear/editar links sigue funcionando igual (la lógica de `cargarMisLinks` y `linksRenovados` se conserva intacta).
- **CSP:** `js/coord.js` se carga como script externo (`<script src>`), no afecta el hash CSP de `coord.html`.
- **Verificación:** `node --check js/coord.js` → OK.
- **Limpiar referencia obsoleta:** `docs/dev-local.md` §9 eliminó la fila `coord.html | ?c= | js/coord.js:355` (coord.html no usa parámetros de URL).

Evidencia: `js/coord.js` refactorizado (función `renderLinks` + nueva `renderLinkItem`), migración `0019`, commit `4eab5ee`.
