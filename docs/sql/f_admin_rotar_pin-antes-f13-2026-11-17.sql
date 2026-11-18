-- Vuelta atras de la migracion 0004 (F-13).
-- Esta es la definicion exacta de public.f_admin_rotar_pin que habia en produccion
-- ANTES de aplicar 0004_f13_pin_8_digitos_bcrypt_12.sql, capturada con
-- pg_get_functiondef el 17/11/2026. Revertir = ejecutar este archivo y rotar los
-- PIN que se hubieran cambiado con el formato nuevo (aqui vuelven a exigirse 6 digitos).

begin;

create or replace function public.f_admin_rotar_pin(p_token uuid, p_objetivo text, p_pin_actual text, p_pin_nuevo text)
 returns text
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_pin_admin text;
  v_pin_objetivo text;
begin
  if public.f_sesion_ok(p_token, 'admin') is not true then
    return null;
  end if;

  select pin_admin into v_pin_admin from public.config where id = 1;
  if v_pin_admin is null then
    return 'ERR_CONFIG';
  end if;

  if (left(v_pin_admin, 2) = '$2' and extensions.crypt(p_pin_actual, v_pin_admin) = v_pin_admin)
     or (left(v_pin_admin, 2) <> '$2' and p_pin_actual = v_pin_admin) then
    null;
  else
    return 'ERR_PIN_ACTUAL';
  end if;

  if p_objetivo not in ('admin', 'puerta') then
    return 'ERR_OBJETIVO';
  end if;

  if p_pin_nuevo is null or p_pin_nuevo !~ '^[0-9]{6}$' then
    return 'ERR_FORMATO';
  end if;

  select case p_objetivo when 'admin' then pin_admin else pin_puerta end
    into v_pin_objetivo
    from public.config where id = 1;

  if v_pin_objetivo is not null and p_pin_nuevo = v_pin_objetivo then
    return 'ERR_IGUAL';
  end if;

  if p_objetivo = 'admin' then
    update public.config
       set pin_admin = extensions.crypt(p_pin_nuevo, extensions.gen_salt('bf'))
     where id = 1;
  else
    update public.config
       set pin_puerta = extensions.crypt(p_pin_nuevo, extensions.gen_salt('bf'))
     where id = 1;
  end if;

  return 'ok';
end;
$function$;

commit;
