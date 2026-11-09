-- f_link_talento_copiar — antes y despues de F-1 (09/11/2026)
-- La version PRE es la que habia en produccion hasta el 09/11/2026: fallaba cuando
-- la lista del Dia 1 ya estaba cerrada. La version POST esta aplicada en la base.
-- Para revertir: ejecutar el bloque PRE tal cual.

-- ============ PRE (rollback) ============
CREATE OR REPLACE FUNCTION public.f_link_talento_copiar(p_codigo_link text, p_dia_origen integer, p_dia_destino integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_abierta boolean; v_t uuid; v_o uuid; v_d uuid;
begin
  select edicion_abierta into v_abierta from config;
  if not v_abierta then return false; end if;
  select id into v_t from talentos where codigo_link = p_codigo_link;
  if v_t is null then return false; end if;
  select id into v_o from listas where talento_id = v_t and dia = p_dia_origen and estado = 'en_edicion';
  select id into v_d from listas where talento_id = v_t and dia = p_dia_destino and estado = 'en_edicion';
  if v_o is null or v_d is null then return false; end if;
  if exists (select 1 from personas where lista_id = v_d) then return false; end if;
  insert into personas (lista_id, nombre, apellido, cedula, cargo)
  select v_d, nombre, apellido, cedula, cargo from personas where lista_id = v_o;
  return true;
end $function$

-- ============ POST (vigente desde 09/11/2026) ============
CREATE OR REPLACE FUNCTION public.f_link_talento_copiar(
  p_codigo_link text,
  p_dia_origen integer,
  p_dia_destino integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_abierta boolean;
  v_t uuid;
  v_o uuid;
  v_d uuid;
  v_n integer;
begin
  if p_dia_origen is null or p_dia_destino is null or p_dia_origen = p_dia_destino then
    return false;
  end if;

  select edicion_abierta into v_abierta from config limit 1;
  if v_abierta is not true then return false; end if;

  select id into v_t from talentos where codigo_link = p_codigo_link limit 1;
  if v_t is null then return false; end if;

  -- Origen: la lista del dia de origen, este 'en_edicion' o ya 'cerrada'.
  -- Si hubiera mas de una, gana la que esta en edicion.
  select id into v_o
    from listas
   where talento_id = v_t and dia = p_dia_origen
   order by (estado = 'en_edicion') desc
   limit 1;

  -- Destino: obligatoriamente en edicion, para que se pueda editar despues.
  select id into v_d
    from listas
   where talento_id = v_t and dia = p_dia_destino and estado = 'en_edicion'
   order by (estado = 'en_edicion') desc
   limit 1;

  if v_o is null or v_d is null then return false; end if;

  if exists (select 1 from personas where lista_id = v_d) then return false; end if;

  insert into personas (lista_id, nombre, apellido, cedula, cargo)
  select v_d, nombre, apellido, cedula, cargo
    from personas
   where lista_id = v_o;

  get diagnostics v_n = row_count;
  return v_n > 0;
end $function$
