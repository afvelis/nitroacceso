-- 0012_m36_modulo_reclamos.sql
-- Proyecto: NitroSystem (control de acceso) · Tarea: M-36 fase 1 (modulo de reclamos)
-- Referencia: tareas/M-36-modulo-reclamos.md (brief y tabla de requisitos aprobados 23/11/2026)
--
-- POR QUE:
--   Hoy el aliado con una asignacion anulada solo puede "comunicarse con la mesa tecnica"
--   y no queda rastro. Fase 1: el reclamo se registra, el admin lo ve como alerta en el
--   dashboard y lo gestiona. El reclamo NO cambia estados, NO mueve cupones y NO reactiva
--   nada (RQ-08). Avisos solo dentro de la app: no hay correo automatico (RQ-12 y decision
--   del usuario del 23/11/2026).
--
-- SEGURIDAD:
--   Tabla con RLS habilitada y sin grants para anon/authenticated: todo pasa por RPC.
--   Las RPC de lectura publica no devuelven datos personales; las de admin validan sesion
--   con f_sesion_ok(p_token,'admin').

-- 1) TABLA
create table if not exists public.reclamos (
  id               uuid primary key default gen_random_uuid(),
  codigo_reclamo   text not null unique,
  origen           text not null default 'aliado',
  codigo_link      text not null,
  nombre_contacto  text not null,
  contacto         text not null,
  motivo           text not null,
  detalle          text,
  estado           text not null default 'nuevo',
  respuesta        text,
  nota_interna     text,
  creada_at        timestamptz not null default now(),
  actualizada_at   timestamptz not null default now(),
  resuelta_at      timestamptz,
  constraint reclamos_origen_check check (origen in ('aliado','cortesia','puerta')),
  constraint reclamos_estado_check check (estado in ('nuevo','en_revision','resuelto','rechazado')),
  constraint reclamos_motivo_check check (motivo in (
    'anulacion_no_entendida',
    'anulacion_por_error',
    'cupones_no_disponibles',
    'datos_incorrectos',
    'otro'
  )),
  constraint reclamos_nombre_largo check (char_length(nombre_contacto) between 3 and 120),
  constraint reclamos_contacto_largo check (char_length(contacto) between 5 and 120),
  constraint reclamos_detalle_largo check (detalle is null or char_length(detalle) <= 500),
  constraint reclamos_respuesta_largo check (respuesta is null or char_length(respuesta) <= 1000),
  constraint reclamos_nota_largo check (nota_interna is null or char_length(nota_interna) <= 1000)
);

comment on table public.reclamos is
  'M-36 fase 1: reclamos (registro y seguimiento). No cambia estados ni cupones de otras tablas.';

create index if not exists reclamos_estado_idx on public.reclamos (estado, creada_at desc);
create index if not exists reclamos_link_idx on public.reclamos (codigo_link, creada_at desc);

alter table public.reclamos enable row level security;
revoke all on public.reclamos from anon, authenticated;

-- 2) RPC PUBLICA: crear reclamo (sin login; el codigo del link identifica el caso)
create or replace function public.f_reclamo_crear(
  p_codigo_link text,
  p_nombre      text,
  p_contacto    text,
  p_motivo      text,
  p_detalle     text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_link      text := trim(coalesce(p_codigo_link, ''));
  v_nombre    text := trim(coalesce(p_nombre, ''));
  v_contacto  text := trim(coalesce(p_contacto, ''));
  v_motivo    text := trim(coalesce(p_motivo, ''));
  v_detalle   text := nullif(trim(coalesce(p_detalle, '')), '');
  v_codigo    text;
  v_recientes integer;
  v_intento   integer;
begin
  if v_link = '' then
    return jsonb_build_object('ok', false, 'error', 'CODIGO_INVALIDO');
  end if;
  if not exists (select 1 from public.aliado_asignaciones a where a.codigo_link = v_link) then
    return jsonb_build_object('ok', false, 'error', 'CODIGO_INVALIDO');
  end if;
  if char_length(v_nombre) < 3 or char_length(v_nombre) > 120 then
    return jsonb_build_object('ok', false, 'error', 'NOMBRE_INVALIDO');
  end if;
  if char_length(v_contacto) < 5 or char_length(v_contacto) > 120 then
    return jsonb_build_object('ok', false, 'error', 'CONTACTO_INVALIDO');
  end if;
  if v_motivo not in ('anulacion_no_entendida','anulacion_por_error','cupones_no_disponibles','datos_incorrectos','otro') then
    return jsonb_build_object('ok', false, 'error', 'MOTIVO_INVALIDO');
  end if;
  if v_detalle is not null and char_length(v_detalle) > 500 then
    return jsonb_build_object('ok', false, 'error', 'DETALLE_LARGO');
  end if;

  -- RQ-09: maximo 3 reclamos por link en 24 horas
  -- RQ-09: evita que dos envios simultaneos se salten el limite
  perform pg_advisory_xact_lock(hashtext(v_link));
  select count(*) into v_recientes
    from public.reclamos r
   where r.codigo_link = v_link
     and r.creada_at > now() - interval '24 hours';
  if v_recientes >= 3 then
    return jsonb_build_object('ok', false, 'error', 'LIMITE_DIARIO');
  end if;

  for v_intento in 1..5 loop
    v_codigo := public.f_codigo('REC-', 6);
    begin
      insert into public.reclamos (codigo_reclamo, origen, codigo_link, nombre_contacto, contacto, motivo, detalle)
      values (v_codigo, 'aliado', v_link, v_nombre, v_contacto, v_motivo, v_detalle);
      return jsonb_build_object('ok', true, 'codigo_reclamo', v_codigo);
    exception when unique_violation then
      continue;
    end;
  end loop;

  return jsonb_build_object('ok', false, 'error', 'NO_SE_PUDO_CREAR');
end;
$function$;

revoke all on function public.f_reclamo_crear(text, text, text, text, text) from public;
grant execute on function public.f_reclamo_crear(text, text, text, text, text) to anon;

-- 3) RPC PUBLICA: consultar un reclamo por su codigo (sin datos personales, sin nota interna)
create or replace function public.f_reclamo_ver(p_codigo_reclamo text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_codigo text := trim(coalesce(p_codigo_reclamo, ''));
  v_row    public.reclamos%rowtype;
begin
  if v_codigo = '' then
    return null;
  end if;
  select * into v_row from public.reclamos r where r.codigo_reclamo = v_codigo;
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'codigo_reclamo', v_row.codigo_reclamo,
    'origen',         v_row.origen,
    'motivo',         v_row.motivo,
    'estado',         v_row.estado,
    'respuesta',      v_row.respuesta,
    'creada_at',      v_row.creada_at,
    'actualizada_at', v_row.actualizada_at,
    'resuelta_at',    v_row.resuelta_at
  );
end;
$function$;

revoke all on function public.f_reclamo_ver(text) from public;
grant execute on function public.f_reclamo_ver(text) to anon;

-- 4) RPC ADMIN: bandeja de reclamos
create or replace function public.f_admin_listar_reclamos(p_token uuid, p_estado text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_estado text := nullif(trim(coalesce(p_estado, '')), '');
begin
  if public.f_sesion_ok(p_token, 'admin') is not true then
    return null;
  end if;
  if v_estado is not null and v_estado not in ('nuevo','en_revision','resuelto','rechazado') then
    return null;
  end if;

  return coalesce((
    select jsonb_agg(x order by x->>'creada_at' desc)
      from (
        select jsonb_build_object(
          'id',              r.id,
          'codigo_reclamo',  r.codigo_reclamo,
          'origen',          r.origen,
          'codigo_link',     r.codigo_link,
          'nombre_contacto', r.nombre_contacto,
          'contacto',        r.contacto,
          'motivo',          r.motivo,
          'detalle',         r.detalle,
          'estado',          r.estado,
          'respuesta',       r.respuesta,
          'nota_interna',    r.nota_interna,
          'creada_at',       r.creada_at,
          'actualizada_at',  r.actualizada_at,
          'resuelta_at',     r.resuelta_at
        ) as x
          from public.reclamos r
         where v_estado is null or r.estado = v_estado
         order by r.creada_at desc
         limit 200
      ) s
  ), '[]'::jsonb);
end;
$function$;

revoke all on function public.f_admin_listar_reclamos(uuid, text) from public;
grant execute on function public.f_admin_listar_reclamos(uuid, text) to anon;

-- 5) RPC ADMIN: resolver / responder
create or replace function public.f_admin_resolver_reclamo(
  p_token        uuid,
  p_codigo       text,
  p_estado       text,
  p_respuesta    text,
  p_nota_interna text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_codigo   text := trim(coalesce(p_codigo, ''));
  v_estado   text := trim(coalesce(p_estado, ''));
  v_resp     text := nullif(trim(coalesce(p_respuesta, '')), '');
  v_nota     text := nullif(trim(coalesce(p_nota_interna, '')), '');
  v_row      public.reclamos%rowtype;
begin
  if public.f_sesion_ok(p_token, 'admin') is not true then
    return jsonb_build_object('ok', false, 'error', 'SESION');
  end if;
  if v_estado not in ('nuevo','en_revision','resuelto','rechazado') then
    return jsonb_build_object('ok', false, 'error', 'ESTADO_INVALIDO');
  end if;
  if v_resp is not null and char_length(v_resp) > 1000 then
    return jsonb_build_object('ok', false, 'error', 'RESPUESTA_LARGA');
  end if;
  if v_nota is not null and char_length(v_nota) > 1000 then
    return jsonb_build_object('ok', false, 'error', 'NOTA_LARGA');
  end if;

  select * into v_row from public.reclamos r where r.codigo_reclamo = v_codigo;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'NO_EXISTE');
  end if;

  update public.reclamos r
     set estado         = v_estado,
         respuesta      = coalesce(v_resp, r.respuesta),
         nota_interna   = coalesce(v_nota, r.nota_interna),
         actualizada_at = now(),
         resuelta_at    = case when v_estado in ('resuelto','rechazado')
                               then coalesce(r.resuelta_at, now())
                               else null end
   where r.id = v_row.id;

  return jsonb_build_object('ok', true, 'codigo_reclamo', v_codigo, 'estado', v_estado);
end;
$function$;

revoke all on function public.f_admin_resolver_reclamo(uuid, text, text, text, text) from public;
grant execute on function public.f_admin_resolver_reclamo(uuid, text, text, text, text) to anon;

-- 6) PostgREST recarga el esquema
notify pgrst, 'reload schema';
