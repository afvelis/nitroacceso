-- Backup de la definición VIGENTE de f_puerta_marcar_vendedor ANTES de F-8.
-- Fuente: supabase/migrations/0002_f9_valida_p_dia.sql del propio repo
-- (aplicada en STAGING adoqujnnnrlgmvwbnwbl por el usuario el 2026-11-14,
-- segun P1-04-staging-migraciones-tests.md). Es la definicion que lleva la
-- validacion `if p_dia not in (1,2) ...` de F-9 y AUN NO lleva el arreglo de
-- F-8 (reautorizar reescribia la hora de entrada).
-- Antes de aplicar la migracion 0003, el usuario confirma con
-- pg_get_functiondef('public.f_puerta_marcar_vendedor(uuid,uuid,integer,text)')
-- en el SQL Editor que esta copia coincide con la definicion vigente.

CREATE OR REPLACE FUNCTION public.f_puerta_marcar_vendedor(p_token uuid, p_vendedor_id uuid, p_dia integer, p_estado text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if f_sesion_rol(p_token) is distinct from 'puerta' then return false; end if;
  if p_estado not in ('pendiente','autorizado') then return false; end if;
  if p_dia not in (1,2) then return false; end if;
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
