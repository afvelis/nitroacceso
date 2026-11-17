-- =====================================================================
-- NITROACCESO · HUELLA DE CONTENIDO (tarea P0-07, volcado/restauración)
--
-- PARA QUÉ SIRVE:
--   Comparar el CONTENIDO de las 15 tablas del volcado ANTES y DESPUÉS
--   de una restauración. Los conteos iguales NO prueban que sean las
--   mismas filas: dos bases pueden tener los mismos conteos y filas
--   distintas. La huella es el md5 del contenido completo combinado de
--   las 15 tablas (en el orden de FK de docs/sql/volcado-datos.sql),
--   calculado letra a letra sobre cada fila completa. Si la huella
--   después de restaurar es IDÉNTICA a la de referencia, la restauración
--   fue fiel al byte, no solo «del mismo tamaño».
--
--   Referencia registrada (17/11/2026), volcado de producción:
--     huella = e3c3141c1914c4820cd9e4075da86166  (tablas = 15)
--
-- PRIVACIDAD:
--   NO imprime ningún dato personal: no muestra filas, cédulas, códigos
--   ni PINs. Solo regresa dos valores: el md5 por tabla (intermedio) y
--   la huella total. Es una consulta de SOLO LECTURA: no escribe nada.
--
-- CÓMO LEER EL RESULTADO:
--   · «huella» es el valor a comparar antes/después.
--   · «tablas» SIEMPRE debe ser 15: si da otro número, el esquema o la
--     lista cambió y el valor NO es comparable con la referencia.
--
-- LÍMITES (importantes):
--   · La huella solo es comparable CONSIGO MISMA sobre el MISMO esquema:
--     si F-12 añade columnas a vendedores (o cambia cualquier tipo de
--     dato), la huella cambia SIN que haya corrupción.
--   · Si se añade o se quita UNA tabla de la lista, el valor cambia sin
--     que haya corrupción: la lista de tablas es parte de la receta.
--   · Por eso: comparar solo huellas producidas por ESTE MISMO archivo
--     (misma versión en el repo) sobre el mismo proyecto/esquema.
-- =====================================================================

with h as (
  select 'config' t, md5(coalesce(string_agg(x::text,'|' order by x::text),'')) m from public.config x
  union all select 'coordinadores', md5(coalesce(string_agg(x::text,'|' order by x::text),'')) from public.coordinadores x
  union all select 'aliados', md5(coalesce(string_agg(x::text,'|' order by x::text),'')) from public.aliados x
  union all select 'aliado_asignaciones', md5(coalesce(string_agg(x::text,'|' order by x::text),'')) from public.aliado_asignaciones x
  union all select 'aliado_concursos', md5(coalesce(string_agg(x::text,'|' order by x::text),'')) from public.aliado_concursos x
  union all select 'aliado_ampliaciones', md5(coalesce(string_agg(x::text,'|' order by x::text),'')) from public.aliado_ampliaciones x
  union all select 'cortesias', md5(coalesce(string_agg(x::text,'|' order by x::text),'')) from public.cortesias x
  union all select 'cortesia_listas', md5(coalesce(string_agg(x::text,'|' order by x::text),'')) from public.cortesia_listas x
  union all select 'cortesia_personas', md5(coalesce(string_agg(x::text,'|' order by x::text),'')) from public.cortesia_personas x
  union all select 'stands', md5(coalesce(string_agg(x::text,'|' order by x::text),'')) from public.stands x
  union all select 'vendedores', md5(coalesce(string_agg(x::text,'|' order by x::text),'')) from public.vendedores x
  union all select 'talentos', md5(coalesce(string_agg(x::text,'|' order by x::text),'')) from public.talentos x
  union all select 'listas', md5(coalesce(string_agg(x::text,'|' order by x::text),'')) from public.listas x
  union all select 'personas', md5(coalesce(string_agg(x::text,'|' order by x::text),'')) from public.personas x
  union all select 'eventos', md5(coalesce(string_agg(x::text,'|' order by x::text),'')) from public.eventos x
)
select md5(string_agg(t || ':' || m, '|' order by t)) as huella,
       count(*) as tablas
  from h;
