-- 0010_p1_02_rol_supervisor.sql
-- Proyecto: NitroSystem (control de acceso) · Tarea: P1-02
--
-- QUE HACE: introduce el rol `supervisor`.
--   - El supervisor puede INICIAR SESION con su propio PIN (f_login), cerrar
--     el dia y activar el siguiente (f_puerta_cerrar_dia_y_activar_siguiente)
--     y REABRIR listas (f_puerta_cerrar_lista con p_cerrada = false).
--   - El rol `puerta` NO pierde nada: sigue escaneando y cerrando listas;
--     lo unico que YA NO puede hacer es cerrar el dia ni reabrir listas.
--   - El rol `admin` conserva todos sus permisos y ademas hereda las
--     capacidades nuevas del supervisor (cerrar dia, reabrir listas).
--
-- POR QUE ES ADITIVA (sin perdida de datos): la columna nueva
-- `config.pin_supervisor` nace NULL (= sin PIN de supervisor, el login
-- falla con ese rol hasta que se cargue), las tablas existentes no se
-- tocan salvo para ENSANCHAR dos constraints CHECK ya existentes, y todas
-- las funciones se reemplazan con CREATE OR REPLACE conservando firma,
-- SECURITY DEFINER, search_path y el cuerpo literal, con SOLO los cambios
-- indicados por bloque.
--
-- AVISO IMPORTANTE: esta migracion NO incluye ningun PIN de supervisor (ni
-- real ni de ejemplo). El PIN de supervisor se carga APARTE, en su momento,
-- por rotacion con f_admin_rotar_pin (que esta migracion ya habilita para
-- el objetivo 'supervisor').
--
-- ORDEN: aplicar despues de 0009. Pendiente de ejecutar en staging y de las
-- pruebas de P1-02 antes de tocar produccion.

begin;

-- ============================================================
-- 1. Columna nueva para el PIN de supervisor
--    Sin DEFAULT: NULL = sin PIN = el login de supervisor falla cerrado.
--    (Un valor literal tipo '[PENDIENTE]' seria adivinable: no se usa.)
-- ============================================================
alter table public.config add column if not exists pin_supervisor text;

-- ============================================================
-- 2. Ensanchar los CHECK de rol existentes para aceptar 'supervisor'
--    (drop if exists + re-create: seguro e idempotente; ninguna migracion
--    anterior los recrea, los nombres son los exactos de 0001 y 0005).
-- ============================================================
alter table public.sesiones drop constraint if exists sesiones_rol_check;
alter table public.sesiones add constraint sesiones_rol_check
  CHECK ((rol = ANY (ARRAY['admin'::text, 'puerta'::text, 'supervisor'::text])));

alter table public.login_intentos drop constraint if exists login_intentos_rol_solicitado_check;
alter table public.login_intentos add constraint login_intentos_rol_solicitado_check
  CHECK (rol_solicitado is null or rol_solicitado in ('admin','puerta','supervisor'));

-- ============================================================
-- 3. Tabla de auditoria nueva (patron de public.reaperturas_puerta, 0005)
--    Sin policies ni grants de lectura: la tabla no se expone por la API,
--    solo la escriben las RPC con SECURITY DEFINER. El hash del token se
--    calcula SIEMPRE como
--      encode(extensions.digest(p_token::text, 'sha256'), 'hex')
--    NUNCA se guarda el token en claro.
-- ============================================================
create table if not exists public.acciones_supervisor (
  id bigint generated always as identity primary key,
  creada_at timestamptz not null default now(),
  sesion_token_hash text not null,
  accion text not null,
  detalle jsonb not null default '{}'::jsonb,
  constraint acciones_supervisor_accion_check check (accion in ('cerrar_dia','reabrir_lista'))
);

alter table public.acciones_supervisor enable row level security;
revoke all on public.acciones_supervisor from anon, authenticated;

-- ============================================================
-- 4. f_login: acepta rol 'supervisor'
--    Cambios SOLO aqui: (a) la validacion del rol solicitado admite
--    'supervisor'; (b) la ventana de bloqueo de 90 s aplica tambien a
--    'supervisor'; (c) rama NUEVA de PIN de supervisor en el select case,
--    ANTES de la de admin, con el mismo patron de comparacion de las otras
--    (comparacion directa OR bcrypt con left(...,2) = '$2'). El resto del
--    cuerpo es COPIA de la vigente (0005) sin tocar nada mas.
-- ============================================================
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

-- f_login (permisos, patron de 0005)
revoke execute on function public.f_login(p_pin text, p_rol_solicitado text) from public;
grant execute on function public.f_login(p_pin text, p_rol_solicitado text) to anon;

-- ============================================================
-- 5. f_sesion_ok: si se pide 'puerta', tambien acepta sesion 'supervisor'
--    (la puerta NO gana permisos cuando la sesion es de supervisor: la
--    condicion es asimetrica, solo supervisor pasa como puerta).
--    Funcion INTERNA: SOLO revoke from public, SIN grant a anon. Es asi a
--    proposito, no se "arregla".
-- ============================================================
CREATE OR REPLACE FUNCTION public.f_sesion_ok(p_token uuid, p_rol_requerido text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_ok boolean;
begin
  if p_token is null then
    return false;
  end if;

  update public.sesiones
     set ultimo_uso_at = now()
   where token_hash = encode(extensions.digest(p_token::text, 'sha256'), 'hex')
     and revocado_at is null
     and expira_at > now()
     and (p_rol_requerido is null or rol = p_rol_requerido or (p_rol_requerido = 'puerta' and rol = 'supervisor'))
  returning true into v_ok;

  return coalesce(v_ok, false);
end;
$function$;

-- f_sesion_ok (funcion interna: solo revoke, sin grant)
revoke execute on function public.f_sesion_ok(p_token uuid, p_rol_requerido text) from public;

-- ============================================================
-- 6. f_puerta_cerrar_dia_y_activar_siguiente: cierra el dia
--    La autorizacion pasa a exigir rol 'supervisor' o 'admin'
--    (a prueba de nulos: primero se descarta NULL, luego not in).
--    El resto del cuerpo es literal; antes del return exitoso se registra
--    la accion en acciones_supervisor (SOLO hash sha256 del token).
-- ============================================================
CREATE OR REPLACE FUNCTION public.f_puerta_cerrar_dia_y_activar_siguiente(p_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_rol text;
  v_dia_activo int;
  v_listas_cerradas int;
  v_dia_nuevo int;
BEGIN
  v_rol := public.f_sesion_rol(p_token);
  IF v_rol is null or v_rol not in ('supervisor','admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ERR_ROL');
  END IF;

  SELECT dia_activo INTO v_dia_activo FROM config WHERE id = 1;
  IF v_dia_activo IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ERR_CONFIG');
  END IF;

  IF v_dia_activo >= 2 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ERR_ULTIMO_DIA');
  END IF;

  WITH cerradas AS (
    UPDATE listas
    SET estado = 'cerrada',
        cerrada_at = now()
    WHERE dia = v_dia_activo
      AND estado <> 'cerrada'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_listas_cerradas FROM cerradas;

  v_dia_nuevo := v_dia_activo + 1;
  UPDATE config
  SET dia_activo = v_dia_nuevo,
      dia1_cerrado = CASE WHEN v_dia_activo = 1 THEN true ELSE dia1_cerrado END,
      dia2_cerrado = CASE WHEN v_dia_activo = 2 THEN true ELSE dia2_cerrado END
  WHERE id = 1;

  -- Auditoria P1-02: quien cerro el dia (rol de la sesion) y el detalle.
  INSERT INTO public.acciones_supervisor(sesion_token_hash, accion, detalle)
  VALUES (
    encode(extensions.digest(p_token::text, 'sha256'), 'hex'),
    'cerrar_dia',
    jsonb_build_object(
      'dia_cerrado', v_dia_activo,
      'dia_nuevo', v_dia_nuevo,
      'listas_cerradas', v_listas_cerradas,
      'rol', v_rol
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'dia_cerrado', v_dia_activo,
    'dia_nuevo', v_dia_nuevo,
    'listas_cerradas', v_listas_cerradas
  );
END;
$function$;

-- f_puerta_cerrar_dia_y_activar_siguiente (permisos, patron de 0001)
revoke execute on function public.f_puerta_cerrar_dia_y_activar_siguiente(p_token uuid) from public;
grant execute on function public.f_puerta_cerrar_dia_y_activar_siguiente(p_token uuid) to anon;

-- ============================================================
-- 7. f_puerta_cerrar_lista: cerrar vs reabrir con roles distintos
--    - CERRAR lista (p_cerrada = true): 'puerta', 'supervisor' o 'admin'
--      (la puerta no pierde su trabajo actual).
--    - REABRIR lista (p_cerrada false o null): SOLO 'supervisor' o 'admin',
--      y deja auditoria en acciones_supervisor.
--    La logica del update no cambia ni un caracter.
-- ============================================================
CREATE OR REPLACE FUNCTION public.f_puerta_cerrar_lista(p_token uuid, p_lista_id uuid, p_cerrada boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_rol text;
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

  update listas set
    estado = case when p_cerrada then 'cerrada' else 'en_puerta' end,
    cerrada_at = case when p_cerrada then now() else null end
  where id = p_lista_id;
  return found;
end $function$;

-- f_puerta_cerrar_lista (permisos, patron de 0001)
revoke execute on function public.f_puerta_cerrar_lista(p_token uuid, p_lista_id uuid, p_cerrada boolean) from public;
grant execute on function public.f_puerta_cerrar_lista(p_token uuid, p_lista_id uuid, p_cerrada boolean) to anon;

-- ============================================================
-- 8. f_admin_rotar_pin: objetivo 'supervisor'
--    Tres ramas explicitas para el objetivo (admin / puerta / supervisor).
--    Ningun camino puede escribir pin_puerta cuando se pide supervisor.
--    El resto (ERR_CONFIG, ERR_PIN_ACTUAL, ERR_FORMATO de 8 digitos,
--    ERR_IGUAL con crypt, bcrypt coste 12) es COPIA de la vigente (0004).
--    Recordatorio: NO hay PIN de supervisor aqui; se carga aparte.
-- ============================================================
CREATE OR REPLACE FUNCTION public.f_admin_rotar_pin(p_token uuid, p_objetivo text, p_pin_actual text, p_pin_nuevo text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_pin_admin text;
  v_pin_objetivo text;
  v_pin_puerta text;
  v_pin_supervisor text;
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

  -- Descartar NULL antes del not in: con p_objetivo NULL, 'not in' evaluaria
  -- a NULL, el IF no se tomaria y el else del case rotaria el PIN supervisor.
  if p_objetivo is null or p_objetivo not in ('admin', 'puerta', 'supervisor') then
    return 'ERR_OBJETIVO';
  end if;

  if p_pin_nuevo is null or p_pin_nuevo !~ '^[0-9]{8}$' then
    return 'ERR_FORMATO';
  end if;

  select case p_objetivo
           when 'admin' then pin_admin
           when 'puerta' then pin_puerta
           else pin_supervisor
         end,
         pin_puerta,
         pin_supervisor
    into v_pin_objetivo,
         v_pin_puerta,
         v_pin_supervisor
    from public.config where id = 1;

  -- Comparacion de PIN repetido conservada de la 0004 (crypt contra el
  -- hash, con comparacion directa para un valor no bcrypt).
  -- P1-02: la comparacion es contra los TRES PINs vigentes (admin, puerta y
  -- supervisor). Si el PIN nuevo coincide con otro rol, en f_login la rama
  -- que va primero devolveria la sesion de ese otro rol y el PIN real
  -- quedaria inutilizable. pin_supervisor solo si no es null.
  if (v_pin_admin = p_pin_nuevo
        or (left(v_pin_admin, 2) = '$2'
            and extensions.crypt(p_pin_nuevo, v_pin_admin) = v_pin_admin))
     or (v_pin_puerta = p_pin_nuevo
        or (left(v_pin_puerta, 2) = '$2'
            and extensions.crypt(p_pin_nuevo, v_pin_puerta) = v_pin_puerta))
     or (v_pin_supervisor is not null
        and (v_pin_supervisor = p_pin_nuevo
          or (left(v_pin_supervisor, 2) = '$2'
              and extensions.crypt(p_pin_nuevo, v_pin_supervisor) = v_pin_supervisor))) then
    return 'ERR_IGUAL';
  end if;

  if p_objetivo = 'admin' then
    update public.config
       set pin_admin = extensions.crypt(p_pin_nuevo, extensions.gen_salt('bf', 12))
     where id = 1;
  elsif p_objetivo = 'puerta' then
    update public.config
       set pin_puerta = extensions.crypt(p_pin_nuevo, extensions.gen_salt('bf', 12))
     where id = 1;
  else
    update public.config
       set pin_supervisor = extensions.crypt(p_pin_nuevo, extensions.gen_salt('bf', 12))
     where id = 1;
  end if;

  return 'ok';
end;
$function$;

-- f_admin_rotar_pin (permisos, patron de 0001)
revoke execute on function public.f_admin_rotar_pin(p_token uuid, p_objetivo text, p_pin_actual text, p_pin_nuevo text) from public;
grant execute on function public.f_admin_rotar_pin(p_token uuid, p_objetivo text, p_pin_actual text, p_pin_nuevo text) to anon;

-- Recarga del esquema para PostgREST: obligatoria, DENTRO de la transaccion,
-- para que la API vea las funciones reemplazadas sin reinicio.
notify pgrst, 'reload schema';

commit;
