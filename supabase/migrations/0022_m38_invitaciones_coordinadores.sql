-- 0022_m38_invitaciones_coordinadores.sql
-- Proyecto: NitroSystem (control de acceso) · Tarea: M-38 (invitaciones a coordinadores)
-- Referencia: tareas/M-38-aprobacion-coordinadores.md
--
-- POR QUE:
--   Hoy el admin crea coordinadores al vuelo desde admin.html (f_admin_crear_coordinador).
--   M-38 cambia el flujo: el admin envia un LINK de invitacion; el coordinador lo abre
--   en coordinator.html, confirma sus datos y el sistema genera su codigo COORD- y lo
--   manda a coord.html. La invitacion queda registrada (pendiente / aceptada / rechazada
--   / expirada) con fecha, IP y motivo del rechazo. La creacion directa del admin se
--   retira de admin.html; la tabla coordinadores y su codigo se generan igual que antes.
--
-- SEGURIDAD:
--   Tabla con RLS habilitada y sin grants para anon/authenticated: todo pasa por RPC.
--   La RPC publica (f_coordinador_aceptar) se limita por candado consultivo, por el
--   estado de la invitacion (no se puede aceptar dos veces) y por anti-spam de contacto
--   (1 aceptacion por el mismo email/telefono/nombre en 24 h).
--   Nota de seguridad: creador_token/aceptado_por guardan el HASH sha256 del token de
--   sesion del admin (nunca el token en claro, regla vigente del repo desde P0-03).

-- 1) TABLA
create table if not exists public.coordinator_invitations (
  id              uuid primary key default gen_random_uuid(),
  codigo_invit    text not null unique,
  nombre          text not null,
  tipo            text not null,
  email           text,
  telefono        text,
  estado          text not null default 'pendiente',
  ip_rechazo      text,
  motivo_rechazo  text,
  creador_token   text,
  creada_at       timestamptz not null default now(),
  aceptada_at     timestamptz,
  rechazada_at    timestamptz,
  aceptado_por    text,
  ip_aceptacion   text,
  constraint coordinator_invitaciones_tipo_check
    check (tipo in ('talentos','stands')),
  constraint coordinator_invitaciones_estado_check
    check (estado in ('pendiente','aceptada','expirada','rechazada')),
  constraint coordinator_invitaciones_nombre_check
    check (char_length(btrim(nombre)) between 3 and 120),
  constraint coordinator_invitaciones_email_check
    check (email is null or char_length(btrim(email)) between 5 and 120),
  constraint coordinator_invitaciones_telefono_check
    check (telefono is null or char_length(btrim(telefono)) between 7 and 30),
  constraint coordinator_invitaciones_motivo_check
    check (motivo_rechazo is null or char_length(btrim(motivo_rechazo)) between 10 and 500)
);

comment on table public.coordinator_invitations is
  'M-38: invitaciones a coordinadores. El coordinador acepta el link ?i=INV- y recibe su codigo COORD- (se crea en coordinadores).';

create index if not exists coordinator_invitaciones_tipo_idx
  on public.coordinator_invitations (tipo, estado);
create index if not exists coordinator_invitaciones_creada_idx
  on public.coordinator_invitations (creada_at desc);

alter table public.coordinator_invitations enable row level security;
revoke all on public.coordinator_invitations from anon, authenticated;

-- 2) RPC ADMIN: crear invitacion (devuelve el codigo INV- para armar el link)
create or replace function public.f_admin_crear_invitacion(
  p_token    uuid,
  p_tipo     text,
  p_nombre   text,
  p_email    text,
  p_telefono text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_tipo     text := btrim(coalesce(p_tipo, ''));
  v_nombre   text := btrim(coalesce(p_nombre, ''));
  v_email    text := nullif(btrim(coalesce(p_email, '')), '');
  v_telefono text := nullif(btrim(coalesce(p_telefono, '')), '');
  v_codigo   text;
  v_hash     text;
  v_intento  integer;
begin
  if public.f_sesion_ok(p_token, 'admin') is not true then
    return jsonb_build_object('ok', false, 'error', 'SESION');
  end if;
  if v_tipo not in ('talentos','stands') then
    return jsonb_build_object('ok', false, 'error', 'TIPO_INVALIDO');
  end if;
  if char_length(v_nombre) < 3 or char_length(v_nombre) > 120 then
    return jsonb_build_object('ok', false, 'error', 'NOMBRE_INVALIDO');
  end if;
  if v_email is not null and
     v_email !~ '^[^@[:space:]<>]+@[^@[:space:]<>]+\.[^@[:space:]<>]+$' then
    return jsonb_build_object('ok', false, 'error', 'EMAIL_INVALIDO');
  end if;
  if v_telefono is not null and v_telefono !~ '^[0-9+\s().-]{7,30}$' then
    return jsonb_build_object('ok', false, 'error', 'TELEFONO_INVALIDO');
  end if;

  v_intento := 1;
  loop
    v_codigo := public.f_codigo('INV-', 8);
    begin
      insert into public.coordinator_invitations
        (codigo_invit, nombre, tipo, email, telefono, creador_token)
      values
        (v_codigo,
         v_nombre,
         v_tipo,
         v_email,
         v_telefono,
         encode(extensions.digest(p_token::text, 'sha256'), 'hex'));
      return jsonb_build_object('ok', true, 'codigo_invit', v_codigo, 'tipo', v_tipo);
    exception when unique_violation then
      v_intento := v_intento + 1;
      if v_intento > 5 then
        return jsonb_build_object('ok', false, 'error', 'NO_SE_PUDO_CREAR');
      end if;
    end;
  end loop;
end;
$function$;

revoke all on function public.f_admin_crear_invitacion(uuid, text, text, text, text) from public;
grant execute on function public.f_admin_crear_invitacion(uuid, text, text, text, text) to anon;

-- 2b) RPC PUBLICA: estado de una invitacion (para pintar coordinator.html).
--     Devuelve SOLO tipo y estado: nunca el nombre completo ni el contacto
--     (el link es privado, pero minimizar datos en paginas publicas es norma).
create or replace function public.f_invitacion_ver(p_codigo_invit text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_codigo text := upper(btrim(coalesce(p_codigo_invit, '')));
  v_inv    public.coordinator_invitations%rowtype;
begin
  if v_codigo = '' then
    return null;
  end if;
  select * into v_inv from public.coordinator_invitations i where i.codigo_invit = v_codigo;
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'codigo_invit', v_inv.codigo_invit,
    'tipo',         v_inv.tipo,
    'estado',       v_inv.estado
  );
end;
$function$;

revoke all on function public.f_invitacion_ver(text) from public;
grant execute on function public.f_invitacion_ver(text) to anon;

-- 3) RPC PUBLICA: aceptar la invitacion desde coordinator.html
create or replace function public.f_coordinador_aceptar(
  p_codigo_invit text,
  p_nombre       text,
  p_email        text,
  p_telefono     text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_codigo_i text := upper(btrim(coalesce(p_codigo_invit, '')));
  v_nombre   text := btrim(coalesce(p_nombre, ''));
  v_email    text := nullif(btrim(coalesce(p_email, '')), '');
  v_telefono text := nullif(btrim(coalesce(p_telefono, '')), '');
  v_inv      public.coordinator_invitations%rowtype;
  v_recentes integer;
  v_ip       text;
  v_codigo   text;
begin
  if v_codigo_i = '' then
    return jsonb_build_object('ok', false, 'error', 'CODIGO_INVALIDO');
  end if;
  if char_length(v_nombre) < 3 or char_length(v_nombre) > 120 then
    return jsonb_build_object('ok', false, 'error', 'NOMBRE_INVALIDO');
  end if;
  if v_email is not null and
     v_email !~ '^[^@[:space:]<>]+@[^@[:space:]<>]+\.[^@[:space:]<>]+$' then
    return jsonb_build_object('ok', false, 'error', 'EMAIL_INVALIDO');
  end if;
  if v_telefono is not null and v_telefono !~ '^[0-9+\s().-]{7,30}$' then
    return jsonb_build_object('ok', false, 'error', 'TELEFONO_INVALIDO');
  end if;

  v_ip := coalesce(
            nullif(btrim(split_part(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1)), ''),
            nullif(btrim(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-real-ip', '')), ''),
            'desconocida'
          );

  -- Candado: impide que dos envios simultaneos acepten dos veces la misma invitacion.
  perform pg_advisory_xact_lock(hashtext(v_codigo_i));

  select * into v_inv from public.coordinator_invitations i where i.codigo_invit = v_codigo_i;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'CODIGO_INVALIDO');
  end if;
  if v_inv.estado = 'aceptada' then
    return jsonb_build_object('ok', false, 'error', 'YA_ACEPTADA');
  end if;
  if v_inv.estado in ('rechazada','expirada') then
    return jsonb_build_object('ok', false, 'error', 'NO_VIGENTE');
  end if;

  -- Anti-spam: el mismo contacto no puede aceptar mas de 1 invitacion en 24 h.
  select count(*) into v_recentes
    from public.coordinator_invitations x
   where x.estado = 'aceptada'
     and x.aceptada_at > now() - interval '24 hours'
     and (
          (v_email    is not null and lower(btrim(coalesce(x.email, ''))) = lower(v_email))
          or (v_telefono is not null and regexp_replace(coalesce(x.telefono, ''), '\D', '', 'g')
                                    = regexp_replace(v_telefono, '\D', '', 'g'))
          or (lower(btrim(x.nombre)) = lower(v_nombre))
         );
  if v_recentes > 0 then
    return jsonb_build_object('ok', false, 'error', 'LIMITE_DIARIO');
  end if;

  -- El codigo del coordinador se genera IGUAL que en f_admin_crear_coordinador.
  v_codigo := public.f_codigo('COORD-', 8);
  insert into public.coordinadores (tipo, nombre, codigo, correo)
    values (v_inv.tipo, v_nombre, v_codigo, lower(v_email));

  update public.coordinator_invitations i
     set estado        = 'aceptada',
         nombre        = v_nombre,
         email         = coalesce(v_email, i.email),
         telefono      = coalesce(v_telefono, i.telefono),
         aceptada_at   = now(),
         ip_aceptacion = v_ip
   where i.id = v_inv.id;

  return jsonb_build_object('ok', true, 'codigo', v_codigo, 'tipo', v_inv.tipo);
end;
$function$;

revoke all on function public.f_coordinador_aceptar(text, text, text, text) from public;
grant execute on function public.f_coordinador_aceptar(text, text, text, text) to anon;

-- 4) RPC ADMIN: listar invitaciones (con filtro opcional de tipo)
create or replace function public.f_admin_listar_invitaciones(p_token uuid, p_tipo text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_tipo text := nullif(btrim(coalesce(p_tipo, '')), '');
begin
  if public.f_sesion_ok(p_token, 'admin') is not true then
    return null;
  end if;
  if v_tipo is not null and v_tipo not in ('talentos','stands') then
    return null;
  end if;

  return coalesce((
    select jsonb_agg(x order by x->>'creada_at' desc)
      from (
        select jsonb_build_object(
          'id',             i.id,
          'codigo_invit',   i.codigo_invit,
          'nombre',         i.nombre,
          'tipo',           i.tipo,
          'estado',         i.estado,
          'email',          i.email,
          'telefono',       i.telefono,
          'creada_at',      i.creada_at,
          'aceptada_at',    i.aceptada_at,
          'rechazada_at',   i.rechazada_at,
          'motivo_rechazo', i.motivo_rechazo
        ) as x
          from public.coordinator_invitations i
         where v_tipo is null or i.tipo = v_tipo
         order by i.creada_at desc
         limit 300
      ) s
  ), '[]'::jsonb);
end;
$function$;

revoke all on function public.f_admin_listar_invitaciones(uuid, text) from public;
grant execute on function public.f_admin_listar_invitaciones(uuid, text) to anon;

-- 5) RPC ADMIN: rechazar invitacion (motivo obligatorio, queda registrado)
create or replace function public.f_admin_rechazar_invitacion(
  p_token  uuid,
  p_id     uuid,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_motivo text := btrim(coalesce(p_motivo, ''));
  v_row    public.coordinator_invitations%rowtype;
  v_ip     text;
begin
  if public.f_sesion_ok(p_token, 'admin') is not true then
    return jsonb_build_object('ok', false, 'error', 'SESION');
  end if;
  if char_length(v_motivo) < 10 or char_length(v_motivo) > 500 then
    return jsonb_build_object('ok', false, 'error', 'MOTIVO_INVALIDO');
  end if;
  if p_id is null then
    return jsonb_build_object('ok', false, 'error', 'ID_INVALIDO');
  end if;

  select * into v_row from public.coordinator_invitations i where i.id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'NO_EXISTE');
  end if;
  if v_row.estado <> 'pendiente' then
    return jsonb_build_object('ok', false, 'error', 'YA_DECIDIDA');
  end if;

  v_ip := coalesce(
            nullif(btrim(split_part(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1)), ''),
            nullif(btrim(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-real-ip', '')), ''),
            'desconocida'
          );

  update public.coordinator_invitations i
     set estado         = 'rechazada',
         ip_rechazo     = v_ip,
         motivo_rechazo = v_motivo,
         rechazada_at   = now()
   where i.id = v_row.id;

  return jsonb_build_object('ok', true);
end;
$function$;

revoke all on function public.f_admin_rechazar_invitacion(uuid, uuid, text) from public;
grant execute on function public.f_admin_rechazar_invitacion(uuid, uuid, text) to anon;

-- 6) RPC ADMIN: aceptar la invitacion en nombre del coordinador
--    (cuando el coordinador confirma por telefono y el admin la acepta por el).
--    Misma creacion de coordinador que f_coordinador_aceptar, SIN verificacion
--    de contacto 24 h y SIN candado (las 3 invitaciones iguales a la vez son
--    imposibles: solo el admin con sesion llega aqui y una por una).
--    aceptado_por guarda el HASH sha256 del token de sesion del admin (nunca el
--    token en claro, regla vigente del repo desde P0-03).
create or replace function public.f_admin_aceptar_invitacion(
  p_token    uuid,
  p_id       uuid,
  p_nombre   text,
  p_email    text,
  p_telefono text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_nombre   text := btrim(coalesce(p_nombre, ''));
  v_email    text := nullif(btrim(coalesce(p_email, '')), '');
  v_telefono text := nullif(btrim(coalesce(p_telefono, '')), '');
  v_inv      public.coordinator_invitations%rowtype;
  v_ip       text;
  v_codigo   text;
begin
  if public.f_sesion_ok(p_token, 'admin') is not true then
    return jsonb_build_object('ok', false, 'error', 'SESION');
  end if;
  if char_length(v_nombre) < 3 or char_length(v_nombre) > 120 then
    return jsonb_build_object('ok', false, 'error', 'NOMBRE_INVALIDO');
  end if;
  if v_email is not null and
     v_email !~ '^[^@[:space:]<>]+@[^@[:space:]<>]+\.[^@[:space:]<>]+$' then
    return jsonb_build_object('ok', false, 'error', 'EMAIL_INVALIDO');
  end if;
  if v_telefono is not null and v_telefono !~ '^[0-9+\s().-]{7,30}$' then
    return jsonb_build_object('ok', false, 'error', 'TELEFONO_INVALIDO');
  end if;
  if p_id is null then
    return jsonb_build_object('ok', false, 'error', 'ID_INVALIDO');
  end if;

  select * into v_inv from public.coordinator_invitations i where i.id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'NO_EXISTE');
  end if;
  if v_inv.estado = 'aceptada' then
    return jsonb_build_object('ok', false, 'error', 'YA_ACEPTADA');
  end if;
  if v_inv.estado in ('rechazada','expirada') then
    return jsonb_build_object('ok', false, 'error', 'NO_VIGENTE');
  end if;

  v_ip := coalesce(
            nullif(btrim(split_part(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1)), ''),
            nullif(btrim(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-real-ip', '')), ''),
            'desconocida'
          );

  v_codigo := public.f_codigo('COORD-', 8);
  insert into public.coordinadores (tipo, nombre, codigo, correo)
    values (v_inv.tipo, v_nombre, v_codigo, lower(v_email));

  update public.coordinator_invitations i
     set estado        = 'aceptada',
         nombre        = v_nombre,
         email         = coalesce(v_email, i.email),
         telefono      = coalesce(v_telefono, i.telefono),
         aceptada_at   = now(),
         aceptado_por  = encode(extensions.digest(p_token::text, 'sha256'), 'hex'),
         ip_aceptacion = v_ip
   where i.id = v_inv.id;

  return jsonb_build_object('ok', true, 'codigo', v_codigo, 'tipo', v_inv.tipo);
end;
$function$;

revoke all on function public.f_admin_aceptar_invitacion(uuid, uuid, text, text, text) from public;
grant execute on function public.f_admin_aceptar_invitacion(uuid, uuid, text, text, text) to anon;

-- 7) PostgREST recarga el esquema
notify pgrst, 'reload schema';
