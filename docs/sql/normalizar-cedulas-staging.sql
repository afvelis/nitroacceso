-- =============================================================================
-- normalizar-cedulas-staging.sql
--
-- SOLO PARA EL ENTORNO DE PRUEBAS (STAGING). NO EJECUTAR EN PRODUCCION.
--
-- Que hace: quita de las cedulas YA GUARDADAS todo lo que no sea digito
-- (prefijos tipo "V-", puntos, espacios, guiones), dejando solo numeros.
-- Motivo: la regla de negocio confirmada es cedula SOLO numeros, sin prefijos
-- (asi lo valida cedulaValida en config.js y asi se escribe en el evento real,
-- para reducir friccion). El seed y los datos de prueba viejos usaban cedulas
-- con prefijo (V-10000002, V-20000001) que el sistema rechaza al guardar.
--
-- El LO EJECUTA el usuario en el SQL Editor de Supabase (staging), consulta por
-- consulta, de arriba hacia abajo: PRE -> UPDATE -> POST. No ejecutar el lote
-- entero de una: verificar cada resultado antes de seguir.
--
-- ALCANCE: talentos/personas (personas), stands/vendedores (vendedores) y
-- cortesia_personas. Las columnas codigo_qr (V-DEMO01, V-DEMO02, ...) NO se
-- tocan: son codigos de QR, no cedulas.
--
-- ADVERTENCIA: si dos cedulas distintas NORMALIZAN a lo mismo dentro de la
-- misma lista/stand (ej.: "V-123" y "123"), los UPDATE fallarian por la
-- unique (lista_id, cedula) / (stand_id, cedula). La consulta PRE-2 existe
-- justamente para detectarlo ANTES de tocar nada. Si devuelve filas, DETENERSE
-- y resolver a mano.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PRE-1: cuantas cedulas NO numericas hay (dotacion del problema).
-- ESPERADO: filas por tabla y dia. Si las tres dan 0, no hay nada que hacer.
-- -----------------------------------------------------------------------------
select 'personas' as tabla, count(*) as no_numericas
from public.personas where cedula ~ '[^0-9]'
union all
select 'vendedores', count(*)
from public.vendedores where cedula ~ '[^0-9]'
union all
select 'cortesia_personas', count(*)
from public.cortesia_personas where cedula ~ '[^0-9]';

-- -----------------------------------------------------------------------------
-- PRE-2: detalle de lo que se va a cambiar (una fila por cedula afectada).
-- ESPERADO: la lista de cedulas con prefijo/puntos, con su valor final.
-- -----------------------------------------------------------------------------
select 'personas' as tabla, lista_id, cedula,
       regexp_replace(cedula, '\D', '', 'g') as cedula_final
from public.personas where cedula ~ '[^0-9]'
union all
select 'vendedores', stand_id, cedula,
       regexp_replace(cedula, '\D', '', 'g')
from public.vendedores where cedula ~ '[^0-9]'
union all
select 'cortesia_personas', lista_id, cedula,
       regexp_replace(cedula, '\D', '', 'g')
from public.cortesia_personas where cedula ~ '[^0-9]'
order by tabla, cedula;

-- -----------------------------------------------------------------------------
-- PRE-3: posibles COLISIONES tras normalizar (dos cedulas distintas de la
-- misma lista/stand que quedarian iguales). ESPERADO: 0 filas.
-- Si devuelve filas, NO continuar: resolver esas a mano y volver a chequer.
-- -----------------------------------------------------------------------------
select 'personas' as tabla, lista_id as grupo_id,
       regexp_replace(cedula, '\D', '', 'g') as cedula_final, count(*) as n
from public.personas group by lista_id, regexp_replace(cedula, '\D', '', 'g') having count(*) > 1
union all
select 'cortesia_personas', lista_id,
       regexp_replace(cedula, '\D', '', 'g'), count(*)
from public.cortesia_personas group by lista_id, regexp_replace(cedula, '\D', '', 'g') having count(*) > 1
union all
select 'vendedores', stand_id,
       regexp_replace(cedula, '\D', '', 'g'), count(*)
from public.vendedores group by stand_id, regexp_replace(cedula, '\D', '', 'g') having count(*) > 1;

-- -----------------------------------------------------------------------------
-- UPDATE 1/3: personas del talento.
-- -----------------------------------------------------------------------------
update public.personas
set cedula = regexp_replace(cedula, '\D', '', 'g')
where cedula ~ '[^0-9]';

-- -----------------------------------------------------------------------------
-- UPDATE 2/3: vendedores de stands.
-- -----------------------------------------------------------------------------
update public.vendedores
set cedula = regexp_replace(cedula, '\D', '', 'g')
where cedula ~ '[^0-9]';

-- -----------------------------------------------------------------------------
-- UPDATE 3/3: personas de cortesias.
-- -----------------------------------------------------------------------------
update public.cortesia_personas
set cedula = regexp_replace(cedula, '\D', '', 'g')
where cedula ~ '[^0-9]';

-- -----------------------------------------------------------------------------
-- POST: confirmacion final. ESPERADO: las tres tablas con 0 y el conteo total
-- de filas igual al de antes de los UPDATE (nada se borro, solo se cambio el
-- valor de la columna cedula).
-- -----------------------------------------------------------------------------
select 'personas' as tabla, count(*) as no_numericas,
       (select count(*) from public.personas) as total_tabla
from public.personas where cedula ~ '[^0-9]'
union all
select 'vendedores', count(*),
       (select count(*) from public.vendedores)
from public.vendedores where cedula ~ '[^0-9]'
union all
select 'cortesia_personas', count(*),
       (select count(*) from public.cortesia_personas)
from public.cortesia_personas where cedula ~ '[^0-9]';
