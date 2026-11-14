-- Backup de la definición VIGENTE de f_puerta_marcar_vendedor ANTES de F-9.
-- Fuente: pg_get_functiondef('public.f_puerta_marcar_vendedor(uuid,uuid,integer,text)')
-- ejecutado por el usuario en el SQL Editor del proyecto de STAGING
-- (adoqujnnnrlgmvwbnwbl) el 2026-11-14.
-- El original vino con CRLF; aquí se conserva con LF y sin cambios de contenido.

CREATE OR REPLACE FUNCTION public.f_puerta_marcar_vendedor(p_token uuid, p_vendedor_id uuid, p_dia integer, p_estado text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if f_sesion_rol(p_token) is distinct from 'puerta' then return false; end if;
  if p_estado not in ('pendiente','autorizado') then return false; end if;
  if p_dia = 1 then
    update vendedores set
      estado_dia1 = p_estado,
      marcado_dia1_at = case when p_estado = 'autorizado' then now() else null end
    where id = p_vendedor_id;
  else
    update vendedores set
      estado_dia2 = p_estado,
      marcado_dia2_at = case when p_estado = 'autorizado' then now() else null end
    where id = p_vendedor_id;
  end if;
  return found;
end $function$;
