-- 0002_f9_valida_p_dia.sql
-- Proyecto: NitroSystem (control de acceso) · Tarea: F-9
--
-- PROBLEMA (confirmado con pg_get_functiondef el 2026-11-14 en staging
-- adoqujnnnrlgmvwbnwbl): f_puerta_marcar_vendedor solo distinguia
-- "if p_dia = 1 then ... else ..." — cualquier p_dia distinto de 1
-- (9, 0, -1, 100...) caia en la rama del dia 2 y AUTORIZABA EL DIA 2
-- en vez de rechazar. La funcion validaba el rol de sesion y p_estado,
-- pero nunca p_dia.
--
-- ARREGLO: una comprobacion mas, ANTES de cualquier UPDATE, con el mismo
-- contrato que ya usan las otras validaciones de esta funcion y que
-- f_puerta_marcar_cortesia aplica en 0001_esquema_inicial.sql:3970
-- ("IF p_dia NOT IN (1,2) THEN RETURN FALSE; END IF;").
-- Se devuelve false (no se lanza excepcion) para no romper el contrato
-- boolean de la RPC ni el manejo de error que ya tiene la puerta.
--
-- NOTA: la 0001 es la foto del esquema de produccion del 09/11/2026 y NO
-- se edita (lo dice supabase/README.md). Este cambio entra como migracion
-- nueva, tal como manda ese mismo documento.
--
-- NOTA 2: se usa CREATE OR REPLACE, que CONSERVA los permisos existentes
-- (los "revoke execute ... from public" / "grant execute ... to anon" de
-- 0001_esquema_inicial.sql:4960-4965 siguen vigentes). No se repiten aqui.

begin;

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

commit;
