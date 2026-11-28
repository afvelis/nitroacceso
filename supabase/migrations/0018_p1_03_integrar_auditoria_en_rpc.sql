-- 0018_p1_03_integrar_auditoria_en_rpc.sql
-- Proyecto: nitroacceso · Tarea: P1-03 unidad 2 (auditoría)
-- Reescribe 8 RPC con CREATE OR REPLACE y añade la llamada a
-- public.registrar_auditoria() en los puntos de acción.
--
-- Reglas de esta migración:
-- - Los cuerpos son COPIA de las definiciones vigentes de producción:
--   f_login (0010), f_logout (0001), f_puerta_marcar_persona (0011),
--   f_puerta_marcar_vendedor (0011), f_puerta_cerrar_lista (0010),
--   f_admin_limpiar_todo (0001), f_admin_anular_cortesia (0001),
--   f_puerta_canjear_premiacion (0007). La única lógica nueva es la
--   captura de snapshot y la llamada a registrar_auditoria().
-- - La IP/user-agent se extraen INLINE con el mismo patrón de f_login
--   (sin funciones helper, siguiendo 0017).
-- - Depende de 0017 (tabla audit_log + registrar_auditoria).

begin;

-- ======================================================================
-- 1) f_login (vigente: 0010_p1_02_rol_supervisor.sql:80)
--    + login_fail (PIN incorrecto) y login_ok (sesión creada).
-- ======================================================================
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
  if p_rol_solicitado is not null and p_rol_solicitado not in ('admin','puerta','supervisor') then
    raise exception 'ERR_ROL: rol solicitado invalido.';
  end if;

  v_ventana := case when p_rol_solicitado in ('puerta','supervisor') then interval '90 seconds' else interval '15 minutes' end;

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
           when c.pin_supervisor is not null
                and (p_pin = c.pin_supervisor
                     or (left(c.pin_supervisor, 2) = '$2' and extensions.crypt(p_pin, c.pin_supervisor) = c.pin_supervisor))
             then 'supervisor'
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
    perform public.registrar_auditoria(
      'puerta', null, coalesce(p_rol_solicitado, 'sin_rol'),
      'login_fail', 'sesion', null, null,
      jsonb_build_object('rol_solicitado', p_rol_solicitado, 'motivo', 'pin_incorrecto'),
      v_ip, v_disp
    );
    return;
  end if;

  perform public.registrar_auditoria(
    v_rol, null, v_rol,
    'login_ok', 'sesion', null, null,
    jsonb_build_object('rol', v_rol),
    v_ip, v_disp
  );

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

revoke execute on function public.f_login(p_pin text, p_rol_solicitado text) from public;
grant execute on function public.f_login(p_pin text, p_rol_solicitado text) to anon;

-- ======================================================================
-- 2) f_logout (vigente: 0001_esquema_inicial.sql:3678)
--    + logout registrado con rol y device_label de la sesión.
-- ======================================================================
CREATE OR REPLACE FUNCTION public.f_logout(p_token uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_rol text;
  v_device text;
  v_found bool;
  v_ip text;
  v_disp text;
begin
  if p_token is null then
    return false;
  end if;

  select s.rol, s.device_label into v_rol, v_device
    from public.sesiones s
   where s.token_hash = encode(extensions.digest(p_token::text, 'sha256'), 'hex')
     and s.revocado_at is null
   limit 1;

  update public.sesiones
     set revocado_at = now()
   where token_hash = encode(extensions.digest(p_token::text, 'sha256'), 'hex')
     and revocado_at is null;

  v_found := found;

  if v_found then
    v_ip := coalesce(
              nullif(btrim(split_part(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1)), ''),
              nullif(btrim(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-real-ip', '')), ''),
              'desconocida'
            );
    v_disp := left(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'user-agent', ''), 200);

    perform public.registrar_auditoria(
      coalesce(v_rol, 'puerta'), null, coalesce(v_device, 'desconocido'),
      'logout', 'sesion', null, null,
      jsonb_build_object('rol', v_rol),
      v_ip, v_disp
    );
  end if;

  return v_found;
end;
$function$;

revoke execute on function public.f_logout(p_token uuid) from public;
grant execute on function public.f_logout(p_token uuid) to anon;

-- ======================================================================
-- 3) f_puerta_marcar_persona (vigente: 0011_p1_02_revalidacion_estado_puerta.sql:115)
--    + snapshot antes/después y registro autorizar_entrada / marcar_pendiente.
-- ======================================================================
CREATE OR REPLACE FUNCTION public.f_puerta_marcar_persona(p_token uuid, p_persona_id uuid, p_estado text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_edicion_abierta boolean;
  v_dia_activo integer;
  v_dia1_cerrado boolean;
  v_dia2_cerrado boolean;
  v_found bool;
  v_antes jsonb;
  v_despues jsonb;
  v_row record;
  v_dispositivo text;
  v_ip text;
  v_disp text;
begin
  if f_sesion_rol(p_token) is distinct from 'puerta' then return false; end if;
  if p_estado not in ('pendiente','autorizado') then return false; end if;

  -- P1-02 fase 2: revalidación del estado del evento EN el momento de marcar.
  select edicion_abierta, dia_activo, dia1_cerrado, dia2_cerrado
    into v_edicion_abierta, v_dia_activo, v_dia1_cerrado, v_dia2_cerrado
    from config where id = 1;
  if not found then return false; end if;
  if v_edicion_abierta then return false; end if;
  if (v_dia_activo = 1 and v_dia1_cerrado) or (v_dia_activo = 2 and v_dia2_cerrado) then return false; end if;

  -- Auditoría: IP/user-agent inline (mismo patrón de f_login).
  v_ip := coalesce(
            nullif(btrim(split_part(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1)), ''),
            nullif(btrim(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-real-ip', '')), ''),
            'desconocida'
          );
  v_disp := left(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'user-agent', ''), 200);

  -- Auditoría: dispositivo de la sesión.
  select s.device_label into v_dispositivo
    from public.sesiones s
   where s.token_hash = encode(extensions.digest(p_token::text, 'sha256'), 'hex')
     and s.revocado_at is null
   limit 1;

  -- Auditoría: estado anterior de la persona.
  select estado, marcado_at into v_row from personas where id = p_persona_id;
  v_antes := jsonb_build_object('estado', v_row.estado, 'marcado_at', v_row.marcado_at);

  update personas p set
    estado = p_estado,
    marcado_at = case when p_estado = 'autorizado' then now() else null end
  where p.id = p_persona_id
    and exists (select 1 from listas l where l.id = p.lista_id and l.dia = v_dia_activo and l.estado <> 'cerrada');

  v_found := found;

  -- Si se autorizó y todas las personas de la lista ya están autorizadas, cerrar la lista automáticamente
  if v_found and p_estado = 'autorizado' then
    if (
      select bool_and(estado = 'autorizado')
      from personas
      where lista_id = (select lista_id from personas where id = p_persona_id)
    ) then
      update listas set estado = 'cerrada'
      where id = (select lista_id from personas where id = p_persona_id)
        and estado <> 'cerrada';
    end if;
  end if;

  if v_found then
    -- Auditoría: estado posterior de la persona.
    select estado, marcado_at into v_row from personas where id = p_persona_id;
    v_despues := jsonb_build_object('estado', v_row.estado, 'marcado_at', v_row.marcado_at);

    perform public.registrar_auditoria(
      'puerta', null, coalesce(v_dispositivo, 'desconocido'),
      case when p_estado = 'autorizado' then 'autorizar_entrada' else 'marcar_pendiente' end,
      'personas', p_persona_id, v_antes, v_despues, v_ip, v_disp
    );
  end if;

  return v_found;
end;
$function$;

revoke execute on function public.f_puerta_marcar_persona(p_token uuid, p_persona_id uuid, p_estado text) from public;
grant execute on function public.f_puerta_marcar_persona(p_token uuid, p_persona_id uuid, p_estado text) to anon;

-- ======================================================================
-- 4) f_puerta_marcar_vendedor (vigente: 0011_p1_02_revalidacion_estado_puerta.sql:66)
--    + snapshot antes/después y registro autorizar_entrada / marcar_pendiente.
-- ======================================================================
CREATE OR REPLACE FUNCTION public.f_puerta_marcar_vendedor(p_token uuid, p_vendedor_id uuid, p_dia integer, p_estado text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_edicion_abierta boolean;
  v_dia_activo integer;
  v_dia1_cerrado boolean;
  v_dia2_cerrado boolean;
  v_found bool;
  v_antes jsonb;
  v_despues jsonb;
  v_row record;
  v_dispositivo text;
  v_ip text;
  v_disp text;
begin
  if f_sesion_rol(p_token) is distinct from 'puerta' then return false; end if;
  if p_estado not in ('pendiente','autorizado') then return false; end if;
  if p_dia not in (1,2) then return false; end if;

  -- P1-02 fase 2: revalidación del estado del evento EN el momento de marcar.
  select edicion_abierta, dia_activo, dia1_cerrado, dia2_cerrado
    into v_edicion_abierta, v_dia_activo, v_dia1_cerrado, v_dia2_cerrado
    from config where id = 1;
  if not found then return false; end if;
  if v_edicion_abierta then return false; end if;
  if p_dia <> v_dia_activo then return false; end if;
  if (p_dia = 1 and v_dia1_cerrado) or (p_dia = 2 and v_dia2_cerrado) then return false; end if;

  -- Auditoría: IP/user-agent inline (mismo patrón de f_login).
  v_ip := coalesce(
            nullif(btrim(split_part(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1)), ''),
            nullif(btrim(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-real-ip', '')), ''),
            'desconocida'
          );
  v_disp := left(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'user-agent', ''), 200);

  -- Auditoría: dispositivo de la sesión.
  select s.device_label into v_dispositivo
    from public.sesiones s
   where s.token_hash = encode(extensions.digest(p_token::text, 'sha256'), 'hex')
     and s.revocado_at is null
   limit 1;

  -- Auditoría: estado anterior del vendedor, según el día marcado.
  select case when p_dia = 1 then estado_dia1 else estado_dia2 end as estado,
         case when p_dia = 1 then marcado_dia1_at else marcado_dia2_at end as marcado_at
    into v_row
    from vendedores where id = p_vendedor_id;
  v_antes := jsonb_build_object('dia', p_dia, 'estado', v_row.estado, 'marcado_at', v_row.marcado_at);

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

  v_found := found;

  if v_found then
    -- Auditoría: estado posterior del vendedor.
    select case when p_dia = 1 then estado_dia1 else estado_dia2 end as estado,
           case when p_dia = 1 then marcado_dia1_at else marcado_dia2_at end as marcado_at
      into v_row
      from vendedores where id = p_vendedor_id;
    v_despues := jsonb_build_object('dia', p_dia, 'estado', v_row.estado, 'marcado_at', v_row.marcado_at);

    perform public.registrar_auditoria(
      'puerta', null, coalesce(v_dispositivo, 'desconocido'),
      case when p_estado = 'autorizado' then 'autorizar_entrada' else 'marcar_pendiente' end,
      'vendedores', p_vendedor_id, v_antes, v_despues, v_ip, v_disp
    );
  end if;

  return v_found;
end;
$function$;

revoke execute on function public.f_puerta_marcar_vendedor(p_token uuid, p_vendedor_id uuid, p_dia integer, p_estado text) from public;
grant execute on function public.f_puerta_marcar_vendedor(p_token uuid, p_vendedor_id uuid, p_dia integer, p_estado text) to anon;

-- ======================================================================
-- 5) f_puerta_cerrar_lista (vigente: 0010_p1_02_rol_supervisor.sql:283)
--    + snapshot antes/después y registro cerrar_edicion / reabrir_edicion.
--    Conserva el registro en acciones_supervisor del caso reabrir.
-- ======================================================================
CREATE OR REPLACE FUNCTION public.f_puerta_cerrar_lista(p_token uuid, p_lista_id uuid, p_cerrada boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_rol text;
  v_found bool;
  v_antes jsonb;
  v_despues jsonb;
  v_row record;
  v_dispositivo text;
  v_ip text;
  v_disp text;
begin
  v_rol := public.f_sesion_rol(p_token);
  if v_rol is null then return false; end if;

  if p_cerrada is true then
    -- Cerrar lista: puerta, supervisor o admin.
    if v_rol not in ('puerta','supervisor','admin') then return false; end if;
  else
    -- Reabrir lista: SOLO supervisor o admin, con auditoria.
    if v_rol not in ('supervisor','admin') then return false; end if;

    insert into public.acciones_supervisor(sesion_token_hash, accion, detalle)
    values (
      encode(extensions.digest(p_token::text, 'sha256'), 'hex'),
      'reabrir_lista',
      jsonb_build_object('lista_id', p_lista_id, 'rol', v_rol)
    );
  end if;

  -- Auditoría: IP/user-agent inline (mismo patrón de f_login).
  v_ip := coalesce(
            nullif(btrim(split_part(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1)), ''),
            nullif(btrim(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-real-ip', '')), ''),
            'desconocida'
          );
  v_disp := left(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'user-agent', ''), 200);

  -- Auditoría: dispositivo de la sesión y estado anterior de la lista.
  select s.device_label into v_dispositivo
    from public.sesiones s
   where s.token_hash = encode(extensions.digest(p_token::text, 'sha256'), 'hex')
     and s.revocado_at is null
   limit 1;

  select estado, cerrada_at into v_row from listas where id = p_lista_id;
  v_antes := jsonb_build_object('estado', v_row.estado, 'cerrada_at', v_row.cerrada_at);

  update listas set
    estado = case when p_cerrada then 'cerrada' else 'en_puerta' end,
    cerrada_at = case when p_cerrada then now() else null end
  where id = p_lista_id;

  v_found := found;

  if v_found then
    -- Auditoría: estado posterior de la lista.
    select estado, cerrada_at into v_row from listas where id = p_lista_id;
    v_despues := jsonb_build_object('estado', v_row.estado, 'cerrada_at', v_row.cerrada_at);

    perform public.registrar_auditoria(
      case when v_rol in ('admin','supervisor') then v_rol else 'puerta' end,
      null, coalesce(v_dispositivo, 'desconocido'),
      case when p_cerrada then 'cerrar_edicion' else 'reabrir_edicion' end,
      'listas', p_lista_id, v_antes, v_despues, v_ip, v_disp
    );
  end if;

  return v_found;
end;
$function$;

revoke execute on function public.f_puerta_cerrar_lista(p_token uuid, p_lista_id uuid, p_cerrada boolean) from public;
grant execute on function public.f_puerta_cerrar_lista(p_token uuid, p_lista_id uuid, p_cerrada boolean) to anon;

-- ======================================================================
-- 6) f_admin_limpiar_todo (vigente: 0001_esquema_inicial.sql:1701)
--    + limpieza_total_iniciada (conteos antes del DELETE) y
--      limpieza_total_completada (conteos cero después).
-- ======================================================================
CREATE OR REPLACE FUNCTION public.f_admin_limpiar_todo(p_token uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_dispositivo text;
  v_ip text;
  v_disp text;
begin
  if public.f_sesion_rol(p_token) is distinct from 'admin' then return false; end if;
  if not exists (select 1 from eventos) then return false; end if;

  -- Auditoría: IP/user-agent inline (mismo patrón de f_login).
  v_ip := coalesce(
            nullif(btrim(split_part(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1)), ''),
            nullif(btrim(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-real-ip', '')), ''),
            'desconocida'
          );
  v_disp := left(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'user-agent', ''), 200);

  -- Auditoría: dispositivo de la sesión.
  select s.device_label into v_dispositivo
    from public.sesiones s
   where s.token_hash = encode(extensions.digest(p_token::text, 'sha256'), 'hex')
     and s.revocado_at is null
   limit 1;

  -- Auditoría: conteos ANTES del borrado.
  perform public.registrar_auditoria(
    'admin', null, coalesce(v_dispositivo, 'desconocido'),
    'limpieza_total_iniciada', 'config', null,
    jsonb_build_object(
      'cortesias', (select count(*) from cortesias),
      'cortesia_personas', (select count(*) from cortesia_personas),
      'personas', (select count(*) from personas),
      'listas', (select count(*) from listas),
      'talentos', (select count(*) from talentos),
      'vendedores', (select count(*) from vendedores),
      'stands', (select count(*) from stands),
      'coordinadores', (select count(*) from coordinadores),
      'sesiones', (select count(*) from sesiones),
      'login_intentos', (select count(*) from login_intentos)
    ),
    null, v_ip, v_disp
  );

  delete from cortesia_personas where true;
  delete from cortesias where true;
  delete from personas where true;
  delete from listas where true;
  delete from talentos where true;
  delete from vendedores where true;
  delete from stands where true;
  delete from coordinadores where true;
  delete from sesiones where true;
  delete from login_intentos where true;
  update config
    set edicion_abierta = true,
        dia_activo = 1
    where id = 1;

  -- Auditoría: conteos cero DESPUÉS del borrado.
  perform public.registrar_auditoria(
    'admin', null, coalesce(v_dispositivo, 'desconocido'),
    'limpieza_total_completada', 'config', null,
    null,
    jsonb_build_object(
      'cortesias', 0,
      'cortesia_personas', 0,
      'personas', 0,
      'listas', 0,
      'talentos', 0,
      'vendedores', 0,
      'stands', 0,
      'coordinadores', 0,
      'dia_activo', 1,
      'edicion_abierta', true
    ),
    v_ip, v_disp
  );

  return true;
end;
$function$;

revoke execute on function public.f_admin_limpiar_todo(p_token uuid) from public;
grant execute on function public.f_admin_limpiar_todo(p_token uuid) to anon;

-- ======================================================================
-- 7) f_admin_anular_cortesia (vigente: 0001_esquema_inicial.sql:585)
--    + snapshot antes/después y registro anular_cortesia.
-- ======================================================================
CREATE OR REPLACE FUNCTION public.f_admin_anular_cortesia(p_token uuid, p_codigo_link text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_id uuid;
  v_estado text;
  v_estado_nuevo text;
  v_anulada_at timestamptz;
  v_antes jsonb;
  v_despues jsonb;
  v_dispositivo text;
  v_ip text;
  v_disp text;
BEGIN
  IF public.f_sesion_ok(p_token, 'admin') IS NOT TRUE THEN
    RETURN NULL;
  END IF;

  SELECT id, estado INTO v_id, v_estado FROM cortesias WHERE codigo_link = p_codigo_link;
  IF v_id IS NULL THEN
    RETURN 'ERR_NO_EXISTE';
  END IF;
  IF v_estado = 'anulada' THEN
    RETURN 'ERR_ANULADA';
  END IF;

  -- Auditoría: IP/user-agent inline (mismo patrón de f_login).
  v_ip := coalesce(
            nullif(btrim(split_part(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1)), ''),
            nullif(btrim(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-real-ip', '')), ''),
            'desconocida'
          );
  v_disp := left(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'user-agent', ''), 200);

  -- Auditoría: dispositivo de la sesión y estado anterior.
  select s.device_label into v_dispositivo
    from public.sesiones s
   where s.token_hash = encode(extensions.digest(p_token::text, 'sha256'), 'hex')
     and s.revocado_at is null
   limit 1;

  v_antes := jsonb_build_object('codigo_link', p_codigo_link, 'estado', v_estado);

  UPDATE cortesias
  SET estado = 'anulada', anulada_at = now()
  WHERE id = v_id;

  -- Auditoría: estado posterior.
  select estado, anulada_at into v_estado_nuevo, v_anulada_at from cortesias where id = v_id;
  v_despues := jsonb_build_object('estado', v_estado_nuevo, 'anulada_at', v_anulada_at);

  perform public.registrar_auditoria(
    'admin', null, coalesce(v_dispositivo, 'desconocido'),
    'anular_cortesia', 'cortesias', v_id, v_antes, v_despues, v_ip, v_disp
  );

  RETURN 'ok';
END;
$function$;

revoke execute on function public.f_admin_anular_cortesia(p_token uuid, p_codigo_link text) from public;
grant execute on function public.f_admin_anular_cortesia(p_token uuid, p_codigo_link text) to anon;

-- ======================================================================
-- 8) f_puerta_canjear_premiacion (vigente: 0007_p1_01_atomicidad_cupones.sql:72)
--    + snapshot antes/después y registro canje_premiacion.
--    El canje atómico con FOR UPDATE y returning (P1-01) se conserva igual.
-- ======================================================================
create or replace function public.f_puerta_canjear_premiacion(p_token uuid, p_codigo_qr text, p_cupones_usados integer)
 returns text
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_cortesia cortesias%rowtype;
  v_persona cortesia_personas%rowtype;
  v_dia_activo int;
  v_canje_id uuid;
  v_antes jsonb;
  v_despues jsonb;
  v_dispositivo text;
  v_ip text;
  v_disp text;
begin
  if public.f_sesion_ok(p_token, 'puerta') is not true then return null; end if;

  -- Auditoría: IP/user-agent inline (mismo patrón de f_login).
  v_ip := coalesce(
            nullif(btrim(split_part(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1)), ''),
            nullif(btrim(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-real-ip', '')), ''),
            'desconocida'
          );
  v_disp := left(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'user-agent', ''), 200);

  -- Auditoría: dispositivo de la sesión.
  select s.device_label into v_dispositivo
    from public.sesiones s
   where s.token_hash = encode(extensions.digest(p_token::text, 'sha256'), 'hex')
     and s.revocado_at is null
   limit 1;

  select * into v_persona from cortesia_personas where codigo_qr = p_codigo_qr;
  if not found then return 'ERR_NO_EXISTE'; end if;

  -- P1-01: FOR UPDATE fija estado, canjeado_at y cupones_total durante toda la
  -- transacción. Sin esto, f_admin_editar_cortesia_premiacion puede bajar
  -- cupones_total entre la lectura y el UPDATE y disparar el CHECK
  -- cortesias_cupones_consumidos_no_excede_total (error 23514 en la puerta).
  select * into v_cortesia from cortesias where id = v_persona.cortesia_id and tipo = 'premiacion' for update;
  if not found then return 'ERR_NO_EXISTE'; end if;

  if v_cortesia.estado = 'anulada' then return 'ERR_ANULADA'; end if;
  if v_cortesia.canjeado_at is not null then return 'ERR_USADA'; end if;

  select dia_activo into v_dia_activo from config where id = 1;
  if v_dia_activo is null then return 'ERR_CONFIG'; end if;

  if (v_dia_activo = 1 and not v_cortesia.dia1) or (v_dia_activo = 2 and not v_cortesia.dia2) then
    return 'ERR_DIA';
  end if;

  if p_cupones_usados is null or p_cupones_usados < 1 then return 'ERR_DATOS'; end if;
  if p_cupones_usados > v_cortesia.cupones_total then return 'ERR_DATOS'; end if;

  -- Auditoría: estado anterior del canje.
  v_antes := jsonb_build_object(
    'codigo_qr', p_codigo_qr,
    'estado', v_cortesia.estado,
    'cupones_total', v_cortesia.cupones_total,
    'cupones_consumidos', v_cortesia.cupones_consumidos,
    'canjeado_at', v_cortesia.canjeado_at,
    'canjeado_dia', v_cortesia.canjeado_dia
  );

  -- P1-01: canje atómico. Si otra puerta canjeó este premio entre la lectura
  -- de arriba y este UPDATE, la fila ya no cumple "canjeado_at is null":
  -- no se actualiza y devolvemos ERR_USADA en vez de canjear dos veces.
  update cortesias set
    cupones_consumidos = p_cupones_usados,
    canjeado_at = now(),
    canjeado_dia = v_dia_activo
  where id = v_cortesia.id
    and canjeado_at is null
  returning id into v_canje_id;

  if v_canje_id is null then return 'ERR_USADA'; end if;

  -- Auditoría: estado posterior del canje (solo si el canje fue exitoso).
  v_despues := jsonb_build_object(
    'cupones_consumidos', p_cupones_usados,
    'canjeado_at', now(),
    'canjeado_dia', v_dia_activo
  );
  perform public.registrar_auditoria(
    'puerta', null, coalesce(v_dispositivo, 'desconocido'),
    'canje_premiacion', 'cortesias', v_cortesia.id, v_antes, v_despues, v_ip, v_disp
  );

  update cortesia_personas set
    estado_dia1 = case when v_dia_activo = 1 then 'autorizado' else estado_dia1 end,
    estado_dia2 = case when v_dia_activo = 2 then 'autorizado' else estado_dia2 end,
    marcado_dia1_at = case when v_dia_activo = 1 then now() else marcado_dia1_at end,
    marcado_dia2_at = case when v_dia_activo = 2 then now() else marcado_dia2_at end
  where id = v_persona.id;

  return 'ok';
end;
$function$;

revoke execute on function public.f_puerta_canjear_premiacion(p_token uuid, p_codigo_qr text, p_cupones_usados integer) from public;
grant execute on function public.f_puerta_canjear_premiacion(p_token uuid, p_codigo_qr text, p_cupones_usados integer) to anon;

commit;
