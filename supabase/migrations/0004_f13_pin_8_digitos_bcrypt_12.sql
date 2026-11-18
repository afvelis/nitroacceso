-- 0004_f13_pin_8_digitos_bcrypt_12.sql
-- Proyecto: NitroSystem (control de acceso) · Tarea: F-13
--
-- QUE CAMBIA (tres cosas, nada mas):
--   1. El PIN nuevo exigido por f_admin_rotar_pin pasa de 6 a 8 digitos
--      (`p_pin_nuevo !~ '^[0-9]{8}$'`). El LOGIN no cambia: f_login no valida
--      formato, solo compara con extensions.crypt, asi que los PIN de 6
--      existentes siguen entrando hasta que se roten.
--   2. El bcrypt pasa de coste por defecto (6) a coste 12:
--      extensions.gen_salt('bf', 12). Por que: con coste 6 (minimo de pgcrypto)
--      un hash filtrado de 6 digitos se agota por fuerza bruta en minutos;
--      8 digitos mas coste 12 son ~6400 veces mas caros de atacar.
--      NOTA: el coste 12 anade latencia a cada login (una vez por turno, no
--      por escaneo). Esa latencia DEBE MEDIRSE en staging, no suponerse.
--   3. ARREGLO DELIBERADO: la comprobacion de PIN repetido (ERR_IGUAL) estaba
--      MUERTA: comparaba el PIN nuevo en texto plano contra el hash bcrypt
--      guardado (`p_pin_nuevo = v_pin_objetivo`), condicion que nunca es
--      verdadera con un hash, asi que ERR_IGUAL jamas salia. Ahora compara
--      contra el hash con extensions.crypt (y conserva la comparacion directa
--      para el caso defensivo de un valor no bcrypt). Una validacion que nunca
--      se ejecuta da una falsa sensacion de control.
--
-- NOTA: la definicion es COPIA de la vigente en produccion (verificada con
-- pg_get_functiondef el 17/11/2026, sin deriva) con SOLO los tres cambios de
-- arriba. No cambia la firma, ni RETURNS, ni SECURITY DEFINER, ni
-- SET search_path, ni el orden del resto del cuerpo. Se usa CREATE OR REPLACE,
-- que conserva los permisos existentes (patron de la 0003).
--
-- ORDEN OBLIGATORIO DE DESPLIEGUE: aplicar 0004 primero, rotar los dos PIN
-- despues; solo entonces el PIN nuevo (de 8 digitos) es el valido. La
-- migracion NO se ha aplicado en ninguna base (staging ni produccion).

begin;

CREATE OR REPLACE FUNCTION public.f_admin_rotar_pin(p_token uuid, p_objetivo text, p_pin_actual text, p_pin_nuevo text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

  if p_pin_nuevo is null or p_pin_nuevo !~ '^[0-9]{8}$' then
    return 'ERR_FORMATO';
  end if;

  select case p_objetivo when 'admin' then pin_admin else pin_puerta end
    into v_pin_objetivo
    from public.config where id = 1;

  -- Cambio deliberado (F-13): la comparacion de PIN repetido estaba muerta
  -- (texto plano contra hash bcrypt). Se compara con crypt contra el hash,
  -- conservando la comparacion directa para un valor no bcrypt.
  if v_pin_objetivo is not null
     and (v_pin_objetivo = p_pin_nuevo
          or (left(v_pin_objetivo, 2) = '$2'
              and extensions.crypt(p_pin_nuevo, v_pin_objetivo) = v_pin_objetivo)) then
    return 'ERR_IGUAL';
  end if;

  if p_objetivo = 'admin' then
    update public.config
       set pin_admin = extensions.crypt(p_pin_nuevo, extensions.gen_salt('bf', 12))
     where id = 1;
  else
    update public.config
       set pin_puerta = extensions.crypt(p_pin_nuevo, extensions.gen_salt('bf', 12))
     where id = 1;
  end if;

  return 'ok';
end;
$function$;

commit;
