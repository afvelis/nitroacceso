-- 0017_p1_03_tabla_auditoria.sql
-- Proyecto: NitroSystem (control de acceso) · Tarea: P1-03 unidad 2
-- Referencia: tareas/P1-03-auditoria-privacidad.md
-- Fecha: 27/11/2026
--
-- Crea la tabla de auditoría y la función de registro.
-- Sin funciones helper de IP/user-agent: se extraen inline en cada RPC
-- (igual que lo hace f_login actualmente).

begin;

-- ======================================================================
-- 1) Tabla audit_log
-- ======================================================================
create table if not exists public.audit_log (
  id          uuid default gen_random_uuid() primary key,
  evento_id   uuid,
  actor_tipo  text not null check (actor_tipo in ('admin', 'puerta', 'coord', 'aliado', 'sistema')),
  actor_id    uuid,
  actor_label text not null,
  accion      text not null,
  entidad     text not null,
  entidad_id  uuid,
  antes       jsonb,
  despues     jsonb,
  ip          text,
  user_agent  text,
  created_at  timestamptz default now() not null
);

create index if not exists idx_audit_log_created on public.audit_log (created_at desc);
create index if not exists idx_audit_log_actor on public.audit_log (actor_tipo, actor_id, created_at desc);
create index if not exists idx_audit_log_accion on public.audit_log (accion, created_at desc);
create index if not exists idx_audit_log_entidad on public.audit_log (entidad, entidad_id);
create index if not exists idx_audit_log_evento on public.audit_log (evento_id, created_at desc);

-- ======================================================================
-- 2) RLS: append-only para la app
-- ======================================================================
alter table public.audit_log enable row level security;

create policy audit_insert on public.audit_log
  for insert
  to anon, authenticated
  with check (true);

-- ======================================================================
-- 3) Función genérica de registro (SECURITY DEFINER, no expuesta)
-- ======================================================================
create or replace function public.registrar_auditoria(
  p_actor_tipo text,
  p_actor_id   uuid,
  p_actor_label text,
  p_accion     text,
  p_entidad   text,
  p_entidad_id uuid,
  p_antes     jsonb,
  p_despues   jsonb,
  p_ip        text default null,
  p_user_agent text default null
) returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  insert into public.audit_log
    (actor_tipo, actor_id, actor_label, accion, entidad, entidad_id,
     antes, despues, ip, user_agent)
  values
    (p_actor_tipo, p_actor_id, p_actor_label, p_accion, p_entidad,
     p_entidad_id, p_antes, p_despues, p_ip, p_user_agent);
end;
$function$;

revoke all on function public.registrar_auditoria(text, uuid, text, text, text, uuid, jsonb, jsonb, text, text) from public, anon, authenticated;

-- ======================================================================
-- 4) Funciones helper para acciones comunes (SECURITY DEFINER, no expuestas)
--    Usan la misma sintaxis de current_setting que f_login (plpgsql con BEGIN...EXCEPTION).
-- ======================================================================

-- f_audit_login_ok
create or replace function public.f_audit_login_ok(
  p_actor_label text,
  p_rol         text,
  p_actor_id    uuid default null
) returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_hdr text;
  v_ip text;
  v_ua text;
begin
  -- Extraer IP (estilo f_login)
  begin
    select current_setting('request.headers') into v_hdr;
  exception when others then
    v_hdr := null;
  end;

  if v_hdr is not null then
    select nullif(btrim(split_part(v_hdr::json->>'x-forwarded-for', ',', 1)), '') into v_ip;
    if v_ip is null or v_ip = '' then
      select nullif(btrim(v_hdr::json->>'x-real-ip'), '') into v_ip;
    end if;
  end if;
  if v_ip is null then v_ip := 'desconocida'; end if;

  -- Extraer user-agent
  begin
    select current_setting('request.headers') into v_hdr;
  exception when others then
    v_hdr := null;
  end;
  if v_hdr is not null then
    select left(nullif(btrim(v_hdr::json->>'user-agent'), ''), 500) into v_ua;
  end if;
  if v_ua is null or v_ua = '' then v_ua := 'no-disponible'; end if;

  perform public.registrar_auditoria(
    'puerta', p_actor_id, p_actor_label,
    'login_ok', 'sesion', null, null,
    jsonb_build_object('rol', p_rol),
    v_ip, v_ua
  );
end;
$function$;

revoke all on function public.f_audit_login_ok(text, text, uuid) from public, anon, authenticated;

-- f_audit_login_fail
create or replace function public.f_audit_login_fail(
  p_actor_label text,
  p_rol         text,
  p_motivo      text default 'PIN incorrecto o cuenta bloqueada'
) returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_hdr text;
  v_ip text;
  v_ua text;
begin
  begin
    select current_setting('request.headers') into v_hdr;
  exception when others then
    v_hdr := null;
  end;

  if v_hdr is not null then
    select nullif(btrim(split_part(v_hdr::json->>'x-forwarded-for', ',', 1)), '') into v_ip;
    if v_ip is null or v_ip = '' then
      select nullif(btrim(v_hdr::json->>'x-real-ip'), '') into v_ip;
    end if;
  end if;
  if v_ip is null then v_ip := 'desconocida'; end if;

  begin
    select current_setting('request.headers') into v_hdr;
  exception when others then
    v_hdr := null;
  end;
  if v_hdr is not null then
    select left(nullif(btrim(v_hdr::json->>'user-agent'), ''), 500) into v_ua;
  end if;
  if v_ua is null or v_ua = '' then v_ua := 'no-disponible'; end if;

  perform public.registrar_auditoria(
    'puerta', null, p_actor_label,
    'login_fail', 'sesion', null, null,
    jsonb_build_object('rol', coalesce(p_rol, 'desconocido'), 'motivo', p_motivo),
    v_ip, v_ua
  );
end;
$function$;

revoke all on function public.f_audit_login_fail(text, text, text) from public, anon, authenticated;

-- f_audit_logout
create or replace function public.f_audit_logout(
  p_actor_label text,
  p_actor_id    uuid
) returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_hdr text;
  v_ip text;
  v_ua text;
begin
  begin
    select current_setting('request.headers') into v_hdr;
  exception when others then
    v_hdr := null;
  end;

  if v_hdr is not null then
    select nullif(btrim(split_part(v_hdr::json->>'x-forwarded-for', ',', 1)), '') into v_ip;
    if v_ip is null or v_ip = '' then
      select nullif(btrim(v_hdr::json->>'x-real-ip'), '') into v_ip;
    end if;
  end if;
  if v_ip is null then v_ip := 'desconocida'; end if;

  begin
    select current_setting('request.headers') into v_hdr;
  exception when others then
    v_hdr := null;
  end;
  if v_hdr is not null then
    select left(nullif(btrim(v_hdr::json->>'user-agent'), ''), 500) into v_ua;
  end if;
  if v_ua is null or v_ua = '' then v_ua := 'no-disponible'; end if;

  perform public.registrar_auditoria(
    case
      when p_actor_label like '%@%' then 'admin'
      else 'puerta'
    end, p_actor_id, p_actor_label,
    'logout', 'sesion', null, null,
    jsonb_build_object('hora', now()::text),
    v_ip, v_ua
  );
end;
$function$;

revoke all on function public.f_audit_logout(text, uuid) from public, anon, authenticated;

commit;