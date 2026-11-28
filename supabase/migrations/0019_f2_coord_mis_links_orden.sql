-- 0019_f2_coord_mis_links_orden.sql
-- Proyecto: NitroSystem · Tarea: F-2 — Reordenar Mis Links de coord.html
-- Fecha: 27/11/2026
--
-- QUÉ HACE:
--   La RPC f_coord_mis_links ordena los links de más nuevo a más viejo
--   (ORDER BY creada_at DESC) y devuelve creado_at en la respuesta para
--   que el frontend pueda usarlo para el colapsable.
--
-- CAMBIOS EN f_coord_mis_links (0001):
--   1. ORDER BY creada_at DESC en talentos y stands
--   2. Devolver creado_at en el JSON para soporte de colapsable

begin;

CREATE OR REPLACE FUNCTION public.f_coord_mis_links(p_codigo_coord text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_coord_id uuid;
  v_activo boolean;
  v_tipo text;
  v_out jsonb;
begin
  select id, activo, tipo into v_coord_id, v_activo, v_tipo
    from coordinadores
   where codigo = upper(trim(coalesce(p_codigo_coord, '')));
  if v_coord_id is null or not v_activo then
    return null;
  end if;

  if v_tipo = 'talentos' then
    select coalesce(jsonb_agg(jsonb_build_object(
        'codigo', codigo_link,
        'titulo', nombre,
        'dia1', dia1,
        'dia2', dia2,
        'creada_at', creada_at
      )), '[]'::jsonb)
      into v_out
      from talentos
     where coordinador_id = v_coord_id
       and codigo_link is not null
       and upper(codigo_link) like 'TAL-%'
     order by creada_at desc;
    return v_out;
  else
    select coalesce(jsonb_agg(jsonb_build_object(
        'codigo', codigo_link,
        'titulo', 'Stand ' || numero || ' — ' || nombre,
        'numero', numero,
        'nombre', nombre,
        'cupo', cupo,
        'tipo_stand', tipo,
        'creada_at', creada_at
      )), '[]'::jsonb)
      into v_out
      from stands
     where coordinador_id = v_coord_id
       and codigo_link is not null
       and upper(codigo_link) like 'STD-%'
     order by creada_at desc;
    return v_out;
  end if;
end;
$function$;

commit;