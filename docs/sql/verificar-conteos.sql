-- =====================================================================
-- NITROACCESO · VERIFICACIÓN DE CONTEOS POR TABLA (tarea P0-07, revisión 2)
--
-- Consulta de SOLO LECTURA sobre los datos (solo crea una tabla temporal
-- de sesión, _conteos_p07). Se ejecuta en el SQL Editor de Supabase
-- (confirmar que el proyecto abierto es el correcto).
--
-- USO: ejecutar ANTES y DESPUÉS de restaurar un volcado y comparar la
-- tabla resultante fila a fila. Los conteos deben quedar idénticos.
--
-- Las tablas se descubren del CATÁLOGO (information_schema), no de una
-- lista a mano: misma lista y mismas exclusiones que el generador
-- (docs/sql/volcado-datos.sql), en el mismo orden de FK.
--
-- EXCLUIDAS a propósito:
--   · sesiones y login_intentos: transitorios de seguridad, no entran en
--     el volcado ni en la comparación.
--   · respaldo_sello: sello de entorno (docs/sql/sembrar-sello-*.sql), no
--     es una tabla del volcado.
-- Si aparece una tabla nueva de public sin ubicación, ABORTA nombrándola,
-- igual que el generador.
-- =====================================================================

do $conteos$
declare
  -- Mismo orden de FK que el generador (padres antes que hijos).
  v_orden     text[] := array[
    'config',
    'coordinadores',
    'aliados',
    'aliado_asignaciones',
    'aliado_concursos',
    'aliado_ampliaciones',
    'cortesias',
    'cortesia_listas',
    'cortesia_personas',
    'stands',
    'vendedores',
    'talentos',
    'listas',
    'personas',
    'eventos'];
  v_excluidas text[] := array['sesiones', 'login_intentos', 'respaldo_sello'];
  v_tabla     text;
  v_filas     bigint;
  v_i         int;
begin
  -- Tablas nuevas sin ubicación: abortar nombrándolas.
  for v_tabla in
    select c.table_name
      from information_schema.tables c
     where c.table_schema = 'public'
       and c.table_type   = 'BASE TABLE'
       and c.table_name <> all (v_orden)
       and c.table_name <> all (v_excluidas)
  loop
    raise exception 'TABLA NUEVA SIN UBICACION: public.% no está en el orden de FK del volcado ni en las excluidas. Un humano debe decidir su posición según las FK y añadirla al array v_orden de docs/sql/volcado-datos.sql y de docs/sql/verificar-conteos.sql.', v_tabla;
  end loop;

  drop table if exists _conteos_p07;
  create temp table _conteos_p07 (orden int, tabla text, filas bigint);

  for v_i in 1 .. array_length(v_orden, 1) loop
    v_tabla := v_orden[v_i];
    execute format('select count(*) from public.%I', v_tabla) into v_filas;
    insert into _conteos_p07 values (v_i, v_tabla, v_filas);
  end loop;
end
$conteos$;

select tabla, filas from _conteos_p07 order by orden;
