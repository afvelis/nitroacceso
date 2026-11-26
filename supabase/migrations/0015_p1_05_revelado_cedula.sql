-- 0015_p1_05_revelado_cedula.sql
-- Proyecto: NitroSystem (control de acceso) · Tarea: P1-05 (revelado auditado de cedula)
-- Referencia: tareas/P1-05-revelado-cedula-auditado.md
-- Fecha: 25/11/2026
--
-- QUÉ HACE:
--   1. Tabla public.accesos_datos: auditoría de revelados (cada vez que una
--      RPC entrega la cédula completa queda quién, cuándo, qué registro y
--      por qué). Clona el patrón de reaperturas_puerta (0005:54-72):
--      bigint generated always as identity, PK en línea propia, RLS habilitado
--      y sin grants para anon/authenticated (append-only para la app: el
--      frontend ni lee ni escribe la tabla directo, solo pasa por RPC).
--   2. RPC f_admin_revelar_cedula(p_token, p_origen, p_id, p_motivo): revela la
--      cédula completa de UN registro, con motivo obligatorio (10+ caracteres)
--      y rastro. Solo admin (f_sesion_rol). Nunca devuelve el hash del token.
--   3. RPC f_admin_listar_accesos_datos(p_token, p_limite): lista los últimos
--      accesos para la tarjeta de auditoría del panel. Nunca devuelve el hash
--      del token ni la cédula.
--
-- POR QUE:
--   Enmascarar del todo impediría casos legítimos: una reclamación, un
--   duplicado, un premio. La solución no es quitar la máscara sino revelar
--   UNA cédula, con motivo escrito y con rastro auditado.
--
-- El SQL lo ejecuta el organizador en el SQL Editor de Supabase.

-- 1) Tabla de auditoría (append-only para la app: sin UPDATE ni DELETE desde el frontend)
create table if not exists public.accesos_datos (
  id bigint generated always as identity,
  creada_at timestamptz not null default now(),
  sesion_token_hash text not null,
  origen text not null,
  registro_id uuid not null,
  motivo text not null
);

do $pk$
begin
  if not exists (select 1 from pg_constraint where conname = 'accesos_datos_pkey') then
    alter table public.accesos_datos add constraint accesos_datos_pkey primary key (id);
  end if;
end
$pk$;

alter table public.accesos_datos drop constraint if exists accesos_datos_origen_check;
alter table public.accesos_datos add constraint accesos_datos_origen_check
  check (origen in ('personas','vendedores','cortesia_personas','aliados'));

alter table public.accesos_datos drop constraint if exists accesos_datos_motivo_check;
alter table public.accesos_datos add constraint accesos_datos_motivo_check
  check (length(btrim(motivo)) >= 10);

create index if not exists accesos_datos_creada_at_idx on public.accesos_datos (creada_at desc);

alter table public.accesos_datos enable row level security;
revoke all on public.accesos_datos from anon, authenticated;

-- 2) Revelar la cédula completa de UN registro, con motivo obligatorio y rastro
create or replace function public.f_admin_revelar_cedula(p_token uuid, p_origen text, p_id uuid, p_motivo text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_ced text;
  v_nombre text;
  v_apellido text;
  v_motivo text;
  v_id bigint;
begin
  if public.f_sesion_rol(p_token) is distinct from 'admin' then
    return jsonb_build_object('error', 'ERR_SESION');
  end if;

  v_motivo := btrim(coalesce(p_motivo, ''));
  if length(v_motivo) < 10 then
    return jsonb_build_object('error', 'ERR_MOTIVO');
  end if;

  if p_origen = 'personas' then
    select p.cedula, p.nombre, p.apellido into v_ced, v_nombre, v_apellido
    from personas p where p.id = p_id;
  elsif p_origen = 'vendedores' then
    select v.cedula, v.nombre, v.apellido into v_ced, v_nombre, v_apellido
    from vendedores v where v.id = p_id;
  elsif p_origen = 'cortesia_personas' then
    select cp.cedula, cp.nombre, cp.apellido into v_ced, v_nombre, v_apellido
    from cortesia_personas cp where cp.id = p_id;
  elsif p_origen = 'aliados' then
    select a.cedula, a.responsable, a.nombre_organizacion into v_ced, v_nombre, v_apellido
    from aliados a where a.id = p_id;
  else
    return jsonb_build_object('error', 'ERR_ORIGEN');
  end if;

  if not found or v_ced is null then
    return jsonb_build_object('error', 'ERR_NO_ENCONTRADO');
  end if;

  insert into public.accesos_datos (sesion_token_hash, origen, registro_id, motivo)
  values (encode(extensions.digest(p_token::text, 'sha256'), 'hex'), p_origen, p_id, left(v_motivo, 300))
  returning id into v_id;

  return jsonb_build_object(
    'ok', true,
    'acceso_id', v_id,
    'cedula', v_ced,
    'nombre', v_nombre,
    'apellido', v_apellido,
    'revelado_at', now()
  );
end;
$function$;

-- 3) Listar los últimos accesos (nunca devuelve el hash del token ni la cédula)
create or replace function public.f_admin_listar_accesos_datos(p_token uuid, p_limite integer default 50)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_lim integer;
begin
  if public.f_sesion_rol(p_token) is distinct from 'admin' then
    return jsonb_build_object('error', 'ERR_SESION');
  end if;

  v_lim := greatest(1, least(coalesce(p_limite, 50), 200));

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', a.id,
      'creada_at', a.creada_at,
      'origen', a.origen,
      'registro_id', a.registro_id,
      'motivo', a.motivo
    ) order by a.creada_at desc)
    from (
      select id, creada_at, origen, registro_id, motivo
      from accesos_datos
      order by creada_at desc
      limit v_lim
    ) a
  ), '[]'::jsonb);
end;
$function$;

-- 4) Permisos (patrón de las RPC admin: el frontend usa clave anon + token)
revoke all on function public.f_admin_revelar_cedula(uuid, text, uuid, text) from public;
grant execute on function public.f_admin_revelar_cedula(uuid, text, uuid, text) to anon;

revoke all on function public.f_admin_listar_accesos_datos(uuid, integer) from public;
grant execute on function public.f_admin_listar_accesos_datos(uuid, integer) to anon;

notify pgrst, 'reload schema';
