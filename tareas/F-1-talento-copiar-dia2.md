---
id: "F-1"
titulo: "Reparar el botón «Repetir y editar la del Día 1» en talento.html"
prioridad: "P1"
estado: "hecho"
area: "datos"
depende_de: []
archivos:
  - "talento.html"
---

# F-1 · Reparar el botón «Repetir y editar la del Día 1» en talento.html

## Contexto

Durante la prueba en vivo del 28/10/2026 (verificación de [P0-01](P0-01-xss-escape.md)), el representante de talento pulsó el botón «Repetir y editar la del Dia 1» y la lista del Día 1 no se copió al Día 2: el usuario lo reportó como «no hace nada». Es una función del flujo del evento (pasar la lista de un día al otro) que existe justamente como ayuda manual, así que debe funcionar.

## Evidencia

- [talento.html:296](../talento.html#L296): botón «Repetir y editar la del Dia 1» (referencia; verificar el archivo actual antes de editar).
- La llamada corresponde a la RPC `f_link_talento_copiar(p_codigo_link, p_dia_origen, p_dia_destino)` (ARQUITECTURA.md §4).
- Reporte del usuario en la Sesión 13 (28/10/2026): «no hace nada».

## Objetivo

Que al pulsar el botón, las personas de la lista del Día 1 se copien a la del Día 2 y el usuario lo vea en pantalla.

## Pasos

- [ ] Pedir al usuario la definición vigente de la RPC en el SQL Editor: `SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'f_link_talento_copiar';` (Consulta C de ARQUITECTURA.md §8).
- [ ] Revisar en talento.html que el botón llama a la RPC con los parámetros correctos y en el orden correcto (`p_dia_origen` = 1, `p_dia_destino` = 2).
- [ ] Pulsar el botón con la consola del navegador abierta: mirar si hay error de red, error de RPC o respuesta sin efecto visible.
- [ ] Identificar la causa: RPC que no copia, parámetros invertidos, respuesta no manejada o botón sin listener.
- [ ] Aplicar la corrección en el lado que corresponda (SQL ejecutado por el usuario en Supabase, o JS en talento.html; nunca asumir acceso a la base).
- [ ] Probar con un talento de prueba: crear lista del Día 1 con personas, pulsar el botón y verificar la copia.

## Criterios de aceptación

- [ ] El botón copia las personas del Día 1 al Día 2 y lo muestra en pantalla.
- [ ] Si la copia falla, aparece un mensaje de error visible (nunca un «no hace nada» silencioso).
- [ ] No se rompen la edición del Día 1 ni el flujo de puerta (regresión verificada).

## Verificación

Prueba manual con un talento de prueba: guardar 2-3 personas en el Día 1, pulsar «Repetir y editar la del Dia 1», y confirmar en pantalla y con `f_link_talento_ver` que el Día 2 quedó poblado. Si hay SQL, el usuario lo ejecuta en el SQL Editor y pega el resultado completo.

## Fuera de alcance

- Cambiar el botón «Cerrar esta pestaña» ni el panel azul del Día 2 (CONGELADOS según ARQUITECTURA.md §7).
- Rediseñar el flujo de listas por día.

## Notas de implementación

**Cerrada el 09/11/2026.**

### Causa raíz

La RPC `public.f_link_talento_copiar(p_codigo_link text, p_dia_origen integer, p_dia_destino integer)` exigía `estado = 'en_edicion'` en la lista de **origen** (además del destino). Al cerrarse el Día 1 su lista pasa a `cerrada`, la función devolvía `false` y el frontend pintaba «quizás el Día 2 ya tiene integrantes», que no era la causa real. El botón sí tenía su listener y llamaba a la RPC con los parámetros correctos.

### Arreglo aplicado en Supabase (ejecutado por el usuario; el agente no ejecuta SQL)

`CREATE OR REPLACE` de `public.f_link_talento_copiar`:

- Acepta la lista de origen en `cerrada` o `en_edicion` (si hubiera varias, gana la que está en edición).
- Mantiene el destino obligatoriamente en `en_edicion`, para que se pueda editar después.
- Añade `limit 1` en las búsquedas de config, talento, origen y destino (evita «query returned more than one row»).
- Devuelve el resultado de `get diagnostics v_n = row_count; return v_n > 0;` (antes devolvía `true` aunque copiara 0 filas).

### Verificación en la base

Consulta de comprobación ejecutada por el usuario: `existe = true`, `tiene_arreglo = true`, `tiene_conteo = true` y la restricción vieja (`en_edicion` en el origen) ausente.

### Prueba funcional sin efectos persistidos

Transacción con ROLLBACK sobre un talento con Día 1 cerrado (9 personas) y Día 2 vacío:

```sql
begin;
update config set edicion_abierta = true;
select f_link_talento_copiar('<codigo_link>', 1, 2);  -- -> true
select count(*) from personas where lista_id = <lista_dia2>;  -- -> 9
rollback;
```

Resultado dentro de la transacción: `true` y 9 personas copiadas al Día 2. Tras el ROLLBACK: `edicion_abierta = false`, Día 2 con 0 personas y total de la tabla `personas` sin cambios (35). Sin cambios persistidos.

### Frontend

Mensaje de error corregido para nombrar las tres causas reales («edición abierta, Día 1 con integrantes, Día 2 vacío») y trazas en consola (`console.info` al inicio, `console.warn` si la RPC devuelve falso, `console.error` en excepción), en `js/talento.js`, función `mostrarOpcionDia2`. No se cambió la lógica: misma RPC, mismos parámetros y `await cargar()` cuando devuelve `true`. `pinta()` usa `textContent` (no `innerHTML`), así que no hace falta escapado adicional.

### Pendiente / riesgo

No se probó el clic en la pantalla real porque `edicion_abierta` está en `false` (evento terminado); la prueba se hizo a nivel de RPC. Queda cubierto por [P1-04](P1-04-staging.md) (staging).

### Respaldo SQL

Definiciones SQL de la función (versión PRE para revertir y POST vigente) guardadas en `docs/sql/f_link_talento_copiar.sql`.

## Criterios de aceptación

- [x] El botón copia las personas del Día 1 al Día 2 y lo muestra en pantalla. *(verificado a nivel de RPC con transacción y ROLLBACK: `true` y 9 personas copiadas; clic en pantalla pendiente de P1-04 porque `edicion_abierta` está en `false`)*
- [x] Si la copia falla, aparece un mensaje de error visible (nunca un «no hace nada» silencioso). *(mensaje nuevo que nombra las tres causas reales + trazas `console.info`/`warn`/`error` en `js/talento.js`)*
- [x] No se rompen la edición del Día 1 ni el flujo de puerta (regresión verificada). *(la copia con ROLLBACK dejó la lista del Día 1 y su estado sin tocar; el cambio de frontend es solo el mensaje y las trazas, sin tocar lógica ni puerta)*
