-- 0003_f8_preserva_hora_reautorizacion.sql
-- Proyecto: NitroSystem (control de acceso) · Tarea: F-8
--
-- PROBLEMA (medido en staging, hallazgo 2 de P1-04-staging-migraciones-tests.md):
-- f_puerta_marcar_vendedor hacia `marcado_dia1_at = case when p_estado =
-- 'autorizado' then now() else null end`, asi que AUTORIZAR DOS VECES al mismo
-- vendedor REESCRIBIA la hora de la primera entrada con la de la segunda
-- (medido: 2026-11-13T15:31:59.249363+00:00 -> 2026-11-13T15:31:59.72505+00:00).
-- El doble escaneo no dejaba ningun rastro en la base, justo cuando el rastro
-- es lo que delataria un reintento de brazalete.
--
-- ARREGLO: si el vendedor ya esta autorizado y ya tiene hora, el CASE conserva
-- `marcado_dia1_at` (y su equivalente del dia 2) tal como estaba. El
-- `is not null` cubre ademas filas que quedaron en estado 'autorizado' con la
-- hora a NULL tras el volcado a produccion: a esas se les pone la hora del
-- primer alta real. La semantica es la de Postgres: el CASE lee la fila VIEJA
-- dentro del mismo UPDATE, por eso no hace falta `select ... for update`.
--
-- RETORNO: la funcion conserva `RETURNS boolean` y devuelve `true` tambien en
-- la reautorizacion (exito idempotente). `false` queda reservado a rechazos
-- reales (rol, p_estado, p_dia, fila inexistente): un `false` en un reintento
-- haria que js/puerta.js:477 mostrara "No se pudo autorizar." en un escaneo
-- que en realidad no rompio nada.
--
-- NOTA: la migracion es ACUMULATIVA: incluye la validacion
-- `if p_dia not in (1,2) then return false; end if;` de la tarea F-9
-- (0002_f9_valida_p_dia.sql) mas este arreglo de F-8, para que produccion
-- aplique UN SOLO archivo y no quede con dos migraciones pendientes
-- encadenadas. La 0002 sigue en el repo como historia y no se edita.
--
-- NOTA 2: el reintento (segundo escaneo) NO queda registrado en la base: solo
-- se PRESERVA la hora original. Dejar constancia explicita del reintento
-- (columna, auditoria) es alcance de la tarea P1-03 y aqui no se toca.
--
-- NOTA 3: se usa CREATE OR REPLACE, que CONSERVA los permisos existentes
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
      marcado_dia1_at = case
        when p_estado <> 'autorizado' then null
        when estado_dia1 = 'autorizado' and marcado_dia1_at is not null then marcado_dia1_at
        else now() end
    where id = p_vendedor_id;
  else
    update vendedores set
      estado_dia2 = p_estado,
      marcado_dia2_at = case
        when p_estado <> 'autorizado' then null
        when estado_dia2 = 'autorizado' and marcado_dia2_at is not null then marcado_dia2_at
        else now() end
    where id = p_vendedor_id;
  end if;
  return found;
end $function$;

commit;
