-- 0018_p1_03_integrar_auditoria_en_rpc.sql
-- Proyecto: NitroSystem (control de acceso) · Tarea: P1-03 unidad 2b
-- Referencia: tareas/P1-03-auditoria-privacidad.md
-- Fecha: 27/11/2026
--
-- Integra calls a public.registrar_auditoria() en las RPC críticas.
-- El IP/user-agent se extraen inline con el mismo estilo de f_login.
-- Depende de 0017 (tabla audit_log + registrar_auditoria).

begin;

-- Helper interno: extrae IP desde request.headers (estilo f_login)
-- Se repite en cada función porque plpgsql no permite funciones sql en begin/commit de Supabase.
-- La macro se escribe inline.

-- ======================================================================
-- 1) f_login — registrar login_ok o login_fail
-- ======================================================================
CREATE OR REPLACE FUNCTION public.f_login(p_pin text, p_rol_solicitado text DEFAULT NULL::text)
 RETURNS TABLE(token uuid, rol text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_rol text;
  v_ip text;
  v_disp text;
  v_headers text;
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
    -- Loguear el bloqueo
    perform public.registrar_auditoria(
      'puerta', null, coalesce(p_rol_solicitado, 'desconocido'),
      'login_fail', 'sesion', null, null,
      jsonb_build_object('rol', coalesce(p_rol_solicitado, 'desconocido'), 'motivo', 'BLOQUEADO por exceder 5 intentos en ' || v_ventana::text),
      v_ip, v_disp
    );
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
    -- Loguear login fallido: pin incorrecto
    perform public.registrar_auditoria(
      'puerta', null, coalesce(p_rol_solicitado, 'desconocido'),
      'login_fail', 'sesion', null, null,
      jsonb_build_object('rol', coalesce(p_rol_solicitado, 'desconocido'), 'motivo', 'PIN incorrecto'),
      v_ip, v_disp
    );
    return;
  end if;

  -- Loguear login exitoso
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

-- ======================================================================
-- 2) f_logout — registrar logout
-- ======================================================================
CREATE OR REPLACE FUNCTION public.f_logout(p_token uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_found bool;
  v_rol text;
  v_device text;
  v_disp text;
  v_ip text;
begin
  if p_token is null then
    return false;
  end if;

  -- Obtener rol y device de la sesión
  select rol, device_label into v_rol, v_device
  from public.sesiones
  where token_hash = encode(extensions.digest(p_token::text, 'sha256'), 'hex')
    and revocado_at is null
  limit 1;

  update public.sesiones
     set revocado_at = now()
   where token_hash = encode(extensions.digest(p_token::text, 'sha256'), 'hex')
     and revocado_at is null;

  v_found := found;

  if v_found then
    -- Extraer IP y user-agent (estilo f_login)
    v_ip := coalesce(
              nullif(btrim(split_part(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1)), ''),
              nullif(btrim(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-real-ip', '')), ''),
              'desconocida'
            );
    v_disp := left(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'user-agent', ''), 200);

    -- Loguear logout
    perform public.registrar_auditoria(
      coalesce(v_rol, 'desconocido'), null, coalesce(v_device, 'desconocido'),
      'logout', 'sesion', null, null,
      jsonb_build_object('rol', v_rol, 'hora', now()::text),
      v_ip, v_disp
    );
  end if;

  return v_found;
end;
$function$;

-- ======================================================================
-- 3) f_puerta_marcar_persona — registrar autorizar_entrada (persona)
-- ======================================================================
CREATE OR REPLACE FUNCTION public.f_puerta_marcar_persona(p_token uuid, p_persona_id uuid, p_estado text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_found bool;
  v_list_id uuid;
  v_persona record;
  v_antes jsonb;
  v_despues jsonb;
  v_dispositivo text;
  v_rol text;
  v_ip text;
  v_disp text;
begin
  if f_sesion_rol(p_token) is distinct from 'puerta' then return false; end if;
  if p_estado not in ('pendiente','autorizado') then return false; end if;

  -- Extraer IP y dispositivo (estilo f_login)
  v_ip := coalesce(
            nullif(btrim(split_part(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1)), ''),
            nullif(btrim(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-real-ip', '')), ''),
            'desconocida'
          );
  v_disp := left(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'user-agent', ''), 200);

  -- Obtener rol de la sesión
  select s.rol, s.device_label into v_rol, v_dispositivo
  from sesiones s
  where token_hash = encode(extensions.digest(p_token::text, 'sha256'), 'hex')
    and revocado_at is null
  limit 1;

  -- Capturar antes
  select id, estado, marcado_at into v_persona
  from personas where id = p_persona_id;

  if v_persona.id is not null then
    v_antes := jsonb_build_object(
      'id', v_persona.id,
      'estado', v_persona.estado,
      'marcado_at', v_persona.marcado_at
    );
  end if;

  update personas p set
    estado = p_estado,
    marcado_at = case when p_estado = 'autorizado' then now() else null end
  where p.id = p_persona_id
    and exists (select 1 from listas l where l.id = p.lista_id and l.estado <> 'cerrada');

  v_found := found;

  if found and p_estado = 'autorizado' then
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
    -- Capturar después
    select id, estado, marcado_at into v_persona
    from personas where id = p_persona_id;

    if v_persona.id is not null then
      v_despues := jsonb_build_object(
        'id', v_persona.id,
        'estado', v_persona.estado,
        'marcado_at', v_persona.marcado_at
      );
    end if;

    -- Loguear
    perform public.registrar_auditoria(
      'puerta', null, coalesce(v_dispositivo, 'puerta-' || coalesce(v_rol, '')),
      case when p_estado = 'autorizado' then 'autorizar_entrada' else 'marcar_pendiente' end,
      'personas', p_persona_id, v_antes, v_despues,
      v_ip, v_disp
    );
  end if;

  return v_found;
end;
$function$;

-- ======================================================================
-- 4) f_puerta_marcar_vendedor — registrar autorizar_entrada (vendedor)
-- ======================================================================
CREATE OR REPLACE FUNCTION public.f_puerta_marcar_vendedor(p_token uuid, p_vendedor_id uuid, p_dia integer, p_estado text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_found bool;
  v_vend record;
  v_antes jsonb;
  v_despues jsonb;
  v_dispositivo text;
  v_rol text;
  v_ip text;
  v_disp text;
begin
  if f_sesion_rol(p_token) is distinct from 'puerta' then return false; end if;
  if p_estado not in ('pendiente','autorizado') then return false; end if;

  -- Extraer IP y dispositivo
  v_ip := coalesce(
            nullif(btrim(split_part(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1)), ''),
            nullif(btrim(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-real-ip', '')), ''),
            'desconocida'
          );
  v_disp := left(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'user-agent', ''), 200);

  -- Obtener sesión
  select s.rol, s.device_label into v_rol, v_dispositivo
  from sesiones s
  where token_hash = encode(extensions.digest(p_token::text, 'sha256'), 'hex')
    and revocado_at is null
  limit 1;

  -- Capturar antes
  select id, estado_dia1, estado_dia2, marcado_dia1_at, marcado_dia2_at
    into v_vend from vendedores where id = p_vendedor_id;

  if v_vend.id is not null then
    if p_dia = 1 then
      v_antes := jsonb_build_object(
        'id', v_vend.id, 'dia', 1,
        'estado_dia1', v_vend.estado_dia1, 'marcado_dia1_at', v_vend.marcado_dia1_at
      );
    else
      v_antes := jsonb_build_object(
        'id', v_vend.id, 'dia', 2,
        'estado_dia2', v_vend.estado_dia2, 'marcado_dia2_at', v_vend.marcado_dia2_at
      );
    end if;
  end if;

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

  v_found := found;

  if v_found then
    select id, estado_dia1, estado_dia2, marcado_dia1_at, marcado_dia2_at
      into v_vend from vendedores where id = p_vendedor_id;

    if p_dia = 1 then
      v_despues := jsonb_build_object(
        'id', v_vend.id, 'dia', 1,
        'estado_dia1', v_vend.estado_dia1, 'marcado_dia1_at', v_vend.marcado_dia1_at
      );
    else
      v_despues := jsonb_build_object(
        'id', v_vend.id, 'dia', 2,
        'estado_dia2', v_vend.estado_dia2, 'marcado_dia2_at', v_vend.marcado_dia2_at
      );
    end if;

    -- Loguear
    perform public.registrar_auditoria(
      'puerta', null, coalesce(v_dispositivo, 'puerta-' || coalesce(v_rol, '')),
      case when p_estado = 'autorizado' then 'autorizar_entrada' else 'marcar_pendiente' end,
      'vendedores', p_vendedor_id, v_antes, v_despues,
      v_ip, v_disp
    );
  end if;

  return v_found;
end;
$function$;

-- ======================================================================
-- 5) f_puerta_cerrar_lista — registrar cierre_edicion
-- ======================================================================
CREATE OR REPLACE FUNCTION public.f_puerta_cerrar_lista(p_token uuid, p_lista_id uuid, p_cerrada boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_found bool;
  v_list record;
  v_antes jsonb;
  v_despues jsonb;
  v_dispositivo text;
  v_rol text;
  v_ip text;
  v_disp text;
begin
  if f_sesion_rol(p_token) is distinct from 'puerta' then return false; end if;

  -- Extraer IP y dispositivo
  v_ip := coalesce(
            nullif(btrim(split_part(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1)), ''),
            nullif(btrim(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-real-ip', '')), ''),
            'desconocida'
          );
  v_disp := left(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'user-agent', ''), 200);

  -- Obtener sesión
  select s.rol, s.device_label into v_rol, v_dispositivo
  from sesiones s
  where token_hash = encode(extensions.digest(p_token::text, 'sha256'), 'hex')
    and revocado_at is null
  limit 1;

  -- Capturar antes
  select id, estado, cerrada_at into v_list
  from listas where id = p_lista_id;

  if v_list.id is not null then
    v_antes := jsonb_build_object(
      'id', v_list.id,
      'estado_anterior', v_list.estado,
      'cerrada_at_anterior', v_list.cerrada_at
    );
  end if;

  update listas set
    estado = case when p_cerrada then 'cerrada' else 'en_puerta' end,
    cerrada_at = case when p_cerrada then now() else null end
  where id = p_lista_id;

  v_found := found;

  if v_found then
    select id, estado, cerrada_at into v_list
    from listas where id = p_lista_id;

    v_despues := jsonb_build_object(
      'id', v_list.id,
      'estado_nuevo', v_list.estado,
      'cerrada_at', v_list.cerrada_at
    );

    -- Loguear
    perform public.registrar_auditoria(
      'puerta', null, coalesce(v_dispositivo, 'puerta-' || coalesce(v_rol, '')),
      case when p_cerrada then 'cerrar_edicion' else 'reabrir_edicion' end,
      'listas', p_lista_id, v_antes, v_despues,
      v_ip, v_disp
    );
  end if;

  return v_found;
end;
$function$;

-- ======================================================================
-- 6) f_admin_limpiar_todo — registrar limpieza_total
-- ======================================================================
CREATE OR REPLACE FUNCTION public.f_admin_limpiar_todo(p_token uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_found bool;
  v_dispositivo text;
  v_rol text;
  v_ip text;
  v_disp text;
begin
  if public.f_sesion_rol(p_token) is distinct from 'admin' then return false; end if;
  if not exists (select 1 from eventos) then return false; end if;

  -- Extraer IP y dispositivo
  v_ip := coalesce(
            nullif(btrim(split_part(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1)), ''),
            nullif(btrim(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-real-ip', '')), ''),
            'desconocida'
          );
  v_disp := left(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'user-agent', ''), 200);

  -- Obtener sesión
  select s.rol, s.device_label into v_rol, v_dispositivo
  from sesiones s
  where token_hash = encode(extensions.digest(p_token::text, 'sha256'), 'hex')
    and revocado_at is null
  limit 1;

  -- Registrar ANTES del borrado (conteos)
  perform public.registrar_auditoria(
    'admin', null, coalesce(v_dispositivo, 'admin-' || coalesce(v_rol, '')),
    'limpieza_total_iniciada', 'config', null,
    jsonb_build_object(
      'cortesias', (select count(*) from cortesias),
      'cortesias_personas', (select count(*) from cortesia_personas),
      'personas', (select count(*) from personas),
      'listas', (select count(*) from listas),
      'talentos', (select count(*) from talentos),
      'vendedores', (select count(*) from vendedores),
      'stands', (select count(*) from stands),
      'coordinadores', (select count(*) from coordinadores)
    ),
    null,
    v_ip, v_disp
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

  v_found := true;

  -- Registrar DESPUÉS (todos cero)
  perform public.registrar_auditoria(
    'admin', null, coalesce(v_dispositivo, 'admin-' || coalesce(v_rol, '')),
    'limpieza_total_completada', 'config', null,
    jsonb_build_object(
      'cortesias', 0,
      'cortesias_personas', 0,
      'personas', 0,
      'listas', 0,
      'talentos', 0,
      'vendedores', 0,
      'stands', 0,
      'coordinadores', 0,
      'dia_activo_nuevo', 1,
      'edicion_abierta', true
    ),
    null,
    v_ip, v_disp
  );

  return v_found;
end;
$function$;

-- ======================================================================
-- 7) f_admin_anular_cortesia — registrar anular_cortesia
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
  v_cortesia cortesias%ROWTYPE;
  v_dispositivo text;
  v_rol text;
  v_ip text;
  v_disp text;
BEGIN
  IF public.f_sesion_ok(p_token, 'admin') IS NOT TRUE THEN
    RETURN NULL;
  END IF;

  SELECT id, estado, nombre_organizacion, cupones_total, cupones_consumidos
    INTO v_cortesia FROM cortesias WHERE codigo_link = p_codigo_link;
  IF v_cortesia.id IS NULL THEN
    RETURN 'ERR_NO_EXISTE';
  END IF;
  IF v_cortesia.estado = 'anulada' THEN
    RETURN 'ERR_ANULADA';
  END IF;

  -- Extraer IP y dispositivo
  v_ip := coalesce(
            nullif(btrim(split_part(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1)), ''),
            nullif(btrim(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-real-ip', '')), ''),
            'desconocida'
          );
  v_disp := left(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'user-agent', ''), 200);

  -- Obtener sesión
  SELECT s.rol, s.device_label INTO v_rol, v_dispositivo
  FROM sesiones s
  WHERE token_hash = encode(extensions.digest(p_token::text, 'sha256'), 'hex')
    AND revocado_at IS NULL
  LIMIT 1;

  -- Loguear antes
  PERFORM public.registrar_auditoria(
    'admin', null, coalesce(v_dispositivo, 'admin-' || coalesce(v_rol, '')),
    'anular_cortesia', 'cortesias', v_cortesia.id,
    jsonb_build_object(
      'codigo_link', p_codigo_link,
      'nombre_organizacion', v_cortesia.nombre_organizacion,
      'estado', v_cortesia.estado,
      'cupones_total', v_cortesia.cupones_total
    ),
    jsonb_build_object('estado_anterior', v_cortesia.estado),
    v_ip, v_disp
  );

  UPDATE cortesias
  SET estado = 'anulada', anulada_at = now()
  WHERE id = v_cortesia.id;

  -- Loguear después
  PERFORM public.registrar_auditoria(
    'admin', null, coalesce(v_dispositivo, 'admin-' || coalesce(v_rol, '')),
    'anular_cortesia', 'cortesias', v_cortesia.id,
    jsonb_build_object('estado_anterior', 'activa'),
    jsonb_build_object('estado_nuevo', 'anulada'),
    v_ip, v_disp
  );

  RETURN 'ok';
END;
$function$;

-- ======================================================================
-- 8) f_puerta_canjear_premiacion — registrar canje_premiacion
-- ======================================================================
CREATE OR REPLACE FUNCTION public.f_puerta_canjear_premiacion(p_token uuid, p_codigo_qr text, p_cupones_usados integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_persona cortesia_personas%ROWTYPE;
  v_cortesia cortesias%ROWTYPE;
  v_dispositivo text;
  v_rol text;
  v_ip text;
  v_disp text;
BEGIN
  IF public.f_sesion_ok(p_token, 'puerta') IS NOT TRUE THEN
    RETURN jsonb_build_object('error', 'ERR_NO_SESION');
  END IF;

  -- Extraer IP y dispositivo
  v_ip := coalesce(
            nullif(btrim(split_part(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1)), ''),
            nullif(btrim(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-real-ip', '')), ''),
            'desconocida'
          );
  v_disp := left(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'user-agent', ''), 200);

  -- Obtener sesión
  SELECT s.rol, s.device_label INTO v_rol, v_dispositivo
  FROM sesiones s
  WHERE token_hash = encode(extensions.digest(p_token::text, 'sha256'), 'hex')
    AND revocado_at IS NULL
  LIMIT 1;

  SELECT * INTO v_persona FROM cortesia_personas
  WHERE codigo_qr = upper(btrim(p_codigo_qr)) AND lista_id IS NULL;
  IF v_persona.id IS NULL THEN
    RETURN jsonb_build_object('error', 'ERR_NO_EXISTE');
  END IF;

  SELECT * INTO v_cortesia FROM cortesias WHERE id = v_persona.cortesia_id;

  -- Loguear antes
  PERFORM public.registrar_auditoria(
    'puerta', null, coalesce(v_dispositivo, 'puerta-' || coalesce(v_rol, '')),
    'canje_premiacion', 'cortesias', v_cortesia.id,
    jsonb_build_object(
      'codigo_qr', p_codigo_qr,
      'persona_id', v_persona.id,
      'nombre', v_persona.nombre,
      'apellido', v_persona.apellido,
      'cupones_total', v_cortesia.cupones_total,
      'cupones_consumidos_anterior', v_cortesia.cupones_consumidos
    ),
    jsonb_build_object('cupones_nuevos', p_cupones_usados),
    v_ip, v_disp
  );

  UPDATE cortesias SET cupones_consumidos = cupones_consumidos + p_cupones_usados
  WHERE id = v_cortesia.id;

  -- Loguear después
  PERFORM public.registrar_auditoria(
    'puerta', null, coalesce(v_dispositivo, 'puerta-' || coalesce(v_rol, '')),
    'canje_premiacion', 'cortesias', v_cortesia.id,
    jsonb_build_object('cupones_consumidos_anterior', v_cortesia.cupones_consumidos),
    jsonb_build_object('cupones_consumidos_nuevo', v_cortesia.cupones_consumidos + p_cupones_usados),
    v_ip, v_disp
  );

  RETURN jsonb_build_object(
    'ok', true,
    'nuevo_total', v_cortesia.cupones_consumidos + p_cupones_usados
  );
END;
$function$;

commit;