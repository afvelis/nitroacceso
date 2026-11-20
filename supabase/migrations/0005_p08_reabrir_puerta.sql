-- 0005_p08_reabrir_puerta.sql
-- Proyecto: NitroSystem (control de acceso) · Tarea: P0-08
--
-- QUE CAMBIA (cuatro cosas, nada mas):
--   1. Columna nueva `rol_solicitado` en `login_intentos` (admin|puerta|null).
--      Por que: hoy admin y puerta COMPARTEN el mismo contador por IP, asi que
--      los fallos de la puerta bloquean tambien al administrador. Con el origen
--      guardado en cada intento, el bloqueo se cuenta por pantalla y por
--      separado: puerta 90 segundos, admin (y llamadas sin rol) 15 minutos.
--   2. Tabla nueva de auditoria `reaperturas_puerta`: cada reapertura guarda
--      quien (SOLO el hash sha256 del token, nunca el token en claro), cuando,
--      el motivo y cuantos intentos se borraron. Sin policies ni grants de
--      lectura: la tabla no se expone por la API, solo la escriben las RPC.
--   3. `f_login` pasa a `f_login(p_pin text, p_rol_solicitado text default null)`:
--      el frontend declara el rol que esta intentando (admin|puerta) y el
--      bloqueo se aplica SOLO al contador de ese origen. El error BLOQUEADO
--      ahora dice los segundos que faltan en vez del "15 minutos" fijo. La
--      firma nueva es sobrecarga con default para no romper llamadores viejos.
--      Un login correcto NO borra los fallos previos: desbloquear es solo cosa
--      de `f_admin_reabrir_puerta` (y del paso del tiempo).
--   4. RPC nueva `f_admin_reabrir_puerta(p_token uuid, p_motivo text)`:
--      desbloquea la pantalla de puerta en pleno evento borrando SOLO los
--      intentos FALLIDOS de los ultimos 90 s (puerta) y 15 min (legado/null),
--      jamas los exitosos y jamas el contador del admin. Exige motivo de al
--      menos 10 caracteres y deja auditoria (punto 2).
--
-- NOTA: el cuerpo de f_login es COPIA de la vigente en
-- 0001_esquema_inicial.sql (f_login) con SOLO los cambios de arriba. No cambia
-- RETURNS, ni SECURITY DEFINER, ni SET search_path, ni el resto del cuerpo.
-- Se usa CREATE OR REPLACE, que conserva los permisos del par de firmas ya
-- otorgado; la sobrecarga NUEVA (text, text) recibe aqui el mismo patron de
-- permisos que ya tiene f_login(text) en 0001 (revoke from public, grant anon),
-- sin la cual el login dejaria de funcionar al aplicar esta migracion.
--
-- ORDEN: aplicar 0005 en staging y ahi correr las pruebas de P0-08 criterio (g)
-- antes de tocar produccion. La migracion NO se ha aplicado en ninguna base.

begin;

-- 1. Origen del intento en login_intentos
alter table public.login_intentos add column if not exists rol_solicitado text;

do $chk$
begin
  if not exists (select 1 from pg_constraint where conname = 'login_intentos_rol_solicitado_check') then
    alter table public.login_intentos
      add constraint login_intentos_rol_solicitado_check
      check (rol_solicitado is null or rol_solicitado in ('admin','puerta'));
  end if;
end
$chk$;

-- 2. Auditoria de reaperturas (sin policies: no se lee por la API)
create table if not exists public.reaperturas_puerta (
  id bigint generated always as identity,
  creada_at timestamptz not null default now(),
  sesion_token_hash text not null,
  motivo text not null,
  intentos_borrados integer not null,
  ventana text not null
);

do $pk$
begin
  if not exists (select 1 from pg_constraint where conname = 'reaperturas_puerta_pkey') then
    alter table public.reaperturas_puerta add constraint reaperturas_puerta_pkey primary key (id);
  end if;
end
$pk$;

alter table public.reaperturas_puerta enable row level security;
revoke all on public.reaperturas_puerta from anon, authenticated;

-- 3. f_login con contadores separados por origen y segundos restantes
CREATE OR REPLACE FUNCTION public.f_login(p_pin text, p_rol_solicitado text default null)
 RETURNS TABLE(token uuid, rol text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_rol text;
  v_ip text;
  v_disp text;
  v_intentos int;
  v_token uuid;
  v_ventana interval;
  v_mas_antiguo timestamptz;
  v_restantes int;
begin
  if p_rol_solicitado is not null and p_rol_solicitado not in ('admin','puerta') then
    raise exception 'ERR_ROL: rol solicitado invalido.';
  end if;

  v_ventana := case when p_rol_solicitado = 'puerta' then interval '90 seconds' else interval '15 minutes' end;

  v_ip := coalesce(
            nullif(btrim(split_part(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1)), ''),
            nullif(btrim(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-real-ip', '')), ''),
            'desconocida'
          );
  v_disp := left(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'user-agent', ''), 200);

  select count(*), min(creada_at) into v_intentos, v_mas_antiguo
    from public.login_intentos
   where ip = v_ip
     and exito = false
     and rol_solicitado is not distinct from p_rol_solicitado
     and creada_at > now() - v_ventana;

  if v_intentos >= 5 then
    v_restantes := greatest(1, ceil(extract(epoch from (v_mas_antiguo + v_ventana - now())))::int);
    raise exception 'BLOQUEADO: demasiados intentos fallidos desde esta IP. Espera % segundos.', v_restantes;
  end if;

  select case
           when c.pin_admin is not null
                and (p_pin = c.pin_admin
                     or (left(c.pin_admin, 2) = '$2' and extensions.crypt(p_pin, c.pin_admin) = c.pin_admin))
             then 'admin'
           when c.pin_puerta is not null
                and (p_pin = c.pin_puerta
                     or (left(c.pin_puerta, 2) = '$2' and extensions.crypt(p_pin, c.pin_puerta) = c.pin_puerta))
             then 'puerta'
         end
    into v_rol
    from public.config c
   where c.id = 1;

  insert into public.login_intentos(ip, dispositivo, exito, rol_solicitado)
  values (v_ip, v_disp, v_rol is not null, p_rol_solicitado);

  if v_rol is null then
    return;
  end if;

  v_token := gen_random_uuid();

  insert into public.sesiones(token_hash, rol, device_label, expira_at)
  values (
    encode(extensions.digest(v_token::text, 'sha256'), 'hex'),
    v_rol,
    v_disp,
    now() + interval '8 hours'
  );

  return query select v_token, v_rol;
end;
$function$;

-- f_login(text, text) (permisos de la sobrecarga nueva, patron de 0001)
revoke execute on function public.f_login(p_pin text, p_rol_solicitado text) from public;

-- f_login(text, text) (grant anon)
grant execute on function public.f_login(p_pin text, p_rol_solicitado text) to anon;

-- 4. Reapertura de puerta con auditoria
CREATE OR REPLACE FUNCTION public.f_admin_reabrir_puerta(p_token uuid, p_motivo text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_borrados integer;
begin
  if public.f_sesion_rol(p_token) is distinct from 'admin' then
    return 'ERR_TOKEN';
  end if;

  if p_motivo is null or length(btrim(p_motivo)) < 10 then
    return 'ERR_MOTIVO';
  end if;

  delete from public.login_intentos
   where exito = false
     and ((rol_solicitado = 'puerta' and creada_at > now() - interval '90 seconds')
       or (rol_solicitado is null   and creada_at > now() - interval '15 minutes'));

  get diagnostics v_borrados = row_count;

  insert into public.reaperturas_puerta(sesion_token_hash, motivo, intentos_borrados, ventana)
  values (
    encode(extensions.digest(p_token::text, 'sha256'), 'hex'),
    left(btrim(p_motivo), 300),
    v_borrados,
    'puerta 90s + legado 15min'
  );

  return 'ok';
end;
$function$;

-- f_admin_reabrir_puerta (permisos, patron de 0002)
revoke all on function public.f_admin_reabrir_puerta(uuid, text) from public;
grant execute on function public.f_admin_reabrir_puerta(uuid, text) to anon;

commit;
