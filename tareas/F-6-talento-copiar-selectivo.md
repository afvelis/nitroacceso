---
id: "F-6"
titulo: "Copiar del Día 1 al Día 2: selectivo, repetible y siempre disponible"
prioridad: "P1"
estado: "en_progreso"
area: "frontend"
depende_de: []
archivos:
  - "js/talento.js"
  - "talento.html"
---

# F-6 · Copiar del Día 1 al Día 2: selectivo, repetible y siempre disponible

## Problema (observado en pruebas reales contra staging, 10/11/2026)

Tres defectos de la función de copiado del módulo de talento:

1. La opción de copiar está ESCONDIDA detrás del botón «Agregar participante» y solo aparece si la lista del día destino está vacía y no se ha pulsado antes «Lista nueva desde cero» (hay un flag en sessionStorage `na_norep_`). Si el usuario toca algo, la función desaparece y no hay forma de volver a invocarla. La ayuda queda inaccesible.
2. Es todo o nada: la RPC `f_link_talento_copiar` copia TODAS las filas del día origen. No permite traer algunas personas y completar el resto a mano.
3. La RPC exige que el destino esté vacío, así que tampoco se puede ampliar una lista ya empezada.

Contexto de negocio confirmado por el usuario: un talento NO tiene cupo fijo (el número de personas varía según lo que se presente) y las personas PUEDEN repetir entre el Día 1 y el Día 2. Copiar es solo una ayuda para ahorrar tiempo, no una regla. Por eso la solución NO introduce cupos ni validaciones de cantidad.

## Objetivo

Copiar personas del Día 1 al Día 2 debe ser una acción principal, siempre disponible, selectiva y repetible, que suma y nunca destruye.

## Requisitos

- **R1.** En la tarjeta de la lista del día destino (mientras la edición esté ABIERTA y el día origen tenga al menos una persona), mostrar una barra de acciones SIEMPRE VISIBLE, en este orden: «Copiar del Dia 1» (principal) · «Agregar participante» · «Guardar lista del Dia N».
- **R2.** Eliminar la condición «solo si el destino está vacío» y eliminar el flag de sessionStorage `na_norep_` como puerta de entrada a la copia.
- **R3.** Al pulsar «Copiar del Dia 1» se abre un panel con la lista de personas del día origen: una casilla por persona mostrando nombre, apellido, cédula y cargo. Todas marcadas por defecto. Incluye «Seleccionar todas» / «Ninguna» y un contador «N de M seleccionadas».
- **R4.** Botones del panel: «Copiar seleccionados» y «Cancelar». Si no hay ninguna marcada: mensaje «Selecciona al menos una persona.» y no cerrar el panel.
- **R5.** La copia SUMA: no borra ni reemplaza lo que ya hay en el destino. Omite duplicados comparando la cédula normalizada (ignorar mayúsculas, espacios, puntos y guiones) y al terminar informa: «X persona(s) copiada(s). Y ya estaban en la lista.»
- **R6.** Se puede repetir cuantas veces haga falta mientras la edición esté abierta.
- **R7.** «Empezar de cero» deja de ser una opción dentro del panel de copia: pasa a ser una acción secundaria al final de la tarjeta, con confirmación usando el modal propio de la app (NUNCA confirm/alert nativos, regla v2.1).
- **R8.** Si no hay nada que copiar (día origen vacío o todas ya presentes), decirlo con claridad: «No hay personas nuevas que copiar.» No dejar la pantalla muda.
- **R9.** Mantener el fallback manual: si la copia falla por cualquier motivo, el usuario siempre puede agregar personas a mano y guardar.
- **R10.** Todos los mensajes con el modal propio de la app.

## Cambio de base de datos requerido

Nueva versión de la RPC `public.f_link_talento_copiar`. Requisitos funcionales (el SQL definitivo lo revisa el usuario y LO EJECUTA ÉL, nunca el agente):

- Debe aceptar una selección opcional: parámetro nuevo `p_persona_ids uuid[] DEFAULT NULL`. Si viene NULL, copia todas (comportamiento actual) para no romper llamadas existentes.
- Debe permitir destino NO vacío, omitiendo duplicados por cédula (normalizada igual que la UI).
- Debe seguir validando que la edición esté abierta y que el link sea válido.
- Debe devolver cuántos copió y cuántos omitió, o al menos un boolean más un count; lo que sea más simple de consumir desde la UI. Documentar la firma final.
- Debe seguir funcionando el caso que hoy funciona: día origen CERRADO con 3 personas y destino vacío (bug F-1 ya corregido).

## Criterios de aceptación (probar SIEMPRE en staging antes de producción)

- [ ] **CA1.** Con el Día 1 cerrado con 3 personas y el Día 2 vacío, el botón «Copiar del Dia 1» se ve SIN pulsar nada más.
- [ ] **CA2.** Copiar las 3 → el Día 2 tiene 3 personas.
- [ ] **CA3.** Volver a pulsar «Copiar del Dia 1» → el panel sigue disponible y al copiar de nuevo informa que ya estaban todas (0 nuevas, 3 existentes), sin duplicar filas en la base.
- [ ] **CA4.** Desmarcar una persona y copiar → se copian solo las marcadas.
- [ ] **CA5.** Copiar en un Día 2 que ya tiene personas agregadas a mano → se suman las nuevas y se conservan las que estaban.
- [ ] **CA6.** Ningún alert/confirm/prompt nativo en todo el flujo.
- [ ] **CA7.** La RPC rechaza con mensaje claro si la edición está cerrada.

## Verificación

Probar en staging (local con `scripts/dev-server.py`, ver P1-04) los siete criterios de aceptación de arriba, dato a dato, con la consola abierta. La versión nueva de la RPC la ejecuta el usuario en el SQL Editor de staging tras revisar `pg_get_functiondef` de la versión vigente.

## Fuera de alcance

- Introducir cupos ni validaciones de cantidad de personas (decisión de negocio: un talento no tiene cupo fijo).
- Rediseñar el flujo de listas por día más allá de la barra de acciones y el panel de copia.
- Tocar los paneles CONGELADOS de talento.html (ARQUITECTURA.md §7) salvo lo que exija la barra de acciones.

## Notas de implementación

Implementado (rama `agente/2026-11-11-f6-copiar-selectivo`, pendiente de PR y de prueba en staging):

- **SQL (`docs/sql/f_link_talento_copiar.sql`, reescrito):** se conserva intacta la función actual de 3 argumentos (`boolean`, versión F-1 copiada tal cual de `supabase/migrations/0001_esquema_inicial.sql`) como compatibilidad para las páginas ya desplegadas, y se AÑADE por **SOBRECARGA** una función nueva de 4 argumentos: `public.f_link_talento_copiar(p_codigo_link text, p_dia_origen integer, p_dia_destino integer, p_persona_ids uuid[] default null) RETURNS jsonb`.
- **Por qué sobrecarga y no reemplazo:** la función de 3 argumentos la siguen llamando las páginas antiguas hasta que se despliegue el frontend nuevo; reemplazarla las rompería. Postgres distingue las dos firmas sin conflicto, no hay ningún `DROP` y la reversión es trivial (`drop function` solo de la firma de 4 argumentos, documentado en la cabecera del SQL).
- **Comportamiento de la nueva:** valida link (existencia + `links_anulados`), edición abierta, origen (en edición o cerrada) y destino (obligatoriamente `en_edicion`); si `p_persona_ids` es NULL o vacío copia TODAS las del origen, si trae ids copia solo esas; omite duplicados comparando la cédula normalizada `upper(regexp_replace(cedula, '[^0-9A-Za-z]', '', 'g'))`; copia las mismas columnas que hoy (nombre, apellido, cedula, cargo) y `estado` queda en `pendiente` por default de la tabla. Devuelve `jsonb_build_object('ok', copiadas, omitidas, motivo)` y es idempotente (segunda pasada: copiadas=0, omitidas=total). Incluye `revoke`/`grant` a `anon` igual que las demás funciones del volcado.
- **Nota de coherencia (adaptación honesta):** la instrucción mencionaba `SET search_path TO 'pg_catalog'`, pero todas las funciones del volcado usan `SET search_path TO 'public', 'pg_temp'`; se usó esa, para ser coherente con el resto del archivo.
- **UI (`js/talento.js`, `talento.html`):** barra de acciones SIEMPRE visible en la tarjeta del Día 2 editable con Día 1 con personas, en el orden «Copiar del Dia 1» (principal) · «Agregar participante» · «Guardar lista del Dia N». Eliminados el requisito «destino vacío» y el flag de sessionStorage `na_norep_`. Panel de selección con una casilla por persona (nombre, apellido, cédula y cargo), todas marcadas por defecto, «Seleccionar todas» / «Ninguna», contador «N de M seleccionadas», «Copiar seleccionados» / «Cancelar» (si no hay marcadas: modal propio y el panel no se cierra). La copia llama a la RPC de 4 argumentos con los ids marcados y traduce el resultado o el motivo (`edicion_cerrada`, `destino_no_editable`, `link_invalido`) a mensajes claros. «Empezar de cero» quedó como acción secundaria al final de la tarjeta del Día 2 con confirmación en modal propio; también se sustituyó el `confirm()` nativo de `guardarDia()` por el mismo modal. Se implementaron `modalAviso`/`modalConfirmar` en talento.js (mismo patrón visual que admin.js: fondo, tarjeta, botones) y las clases CSS correspondientes en talento.html, con el hash CSP del `<style>` recalculado y verificado (el anterior era `sha256-chCcO55...js=`, el nuevo `sha256-G3dyj1EV...Pw=`). El fallback manual (agregar a mano y guardar) sigue intacto, igual que QR, tarea cumplida, WhatsApp y correo.
- **QUIÉN EJECUTA EL SQL:** el usuario, NUNCA el agente. Primero en el SQL Editor de **staging** (con la consulta PRE de verificación del propio archivo antes, y las dos consultas POST después: deben quedar exactamente las dos sobrecargas, la de 3 retornando `boolean` y la de 4 retornando `jsonb`), y solo tras validar los criterios de aceptación en staging, en **producción**.
- **FALTA:** la prueba completa en el entorno de pruebas (CA1 a CA7) contra staging con la RPC de 4 argumentos ya aplicada; mientras tanto no desplegar el frontend nuevo a producción (la UI nueva ya solo llama a la sobrecarga de 4 argumentos).
- **SQL a ejecutar (resumido):** el archivo completo `docs/sql/f_link_talento_copiar.sql` (copiar y pegar entero en el SQL Editor). No requiere nada más: incluye la función de compatibilidad, la sobrecarga nueva, los grants y las consultas de verificación PRE/POST.
