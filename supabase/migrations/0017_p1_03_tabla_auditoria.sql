-- 0017_p1_03_tabla_auditoria.sql
-- Proyecto: NitroSystem (control de acceso) · Tarea: P1-03 unidad 2
-- Referencia: tareas/P1-03-auditoria-privacidad.md — crear tabla de auditoría append-only
-- Fecha: 27/11/2026
--
-- QUÉ HACE:
--   1. Crea la tabla public.audit_log con las columnas:
--        id (PK), evento_id (nullable), actor_tipo, actor_id,
--        actor_label, accion, entidad, entidad_id, antes, despues, ip,
--        user_agent, created_at
--   2. RLS: INSERT permitido para anon/authenticated (las RPC SECURITY
--      DEFINER insertan dentro de su contexto). NO SELECT, NO UPDATE,
--      NO DELETE para la app (append-only).
--   3. Crea la función genérica public.registrar_auditoria() para que las
--      RPC de la app la llamen (seguridad: SECURITY DEFINER, no expuesta).
--   4. NO guarda tokens, PINs ni contraseñas.
--
-- PENDIENTE (0018): integrar calls a registrar_auditoria() en las
--   RPC críticas (f_login, f_logout, f_puerta_marcar_*, f_admin_*)
--
-- PENDIENTE (futuro): vista de auditoría en admin, política de retención

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

-- Index para búsquedas
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
-- 3) Función genérica de registro
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
-- 4) Función helper para extraer IP del request (PostgREST)
-- ======================================================================
create or replace function public.audit_get_ip()
 returns text
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_raw text;
  v_hdr text;
begin
  -- Leer headers del request
  begin
    select current_setting('request.headers') into v_raw;
  exception when others then
    v_raw := '';
  end;

  -- Extraer x-forwarded-for
  begin
    select (
      select split_part(x, ',', 1) from jsonb_array_elements_text(
        jsonb_path_query(v_raw::jsonb, '$.x-forwarded-for')
      ) x
    ) into v_hdr;
  exception when others then
    v_hdr := '';
  end;

  v_hdr := trim(v_hdr);

  -- Si no hay x-forwarded-for, intentar x-real-ip
  if v_hdr = '' then
    begin
      select jsonb_path_query(v_raw::jsonb, '$.x-real-ip')::text into v_hdr;
    exception when others then
      v_hdr := '';
    end;
    v_hdr := trim(v_hdr);
  end;

  if v_hdr = '' then
    return 'desconocida';
  end if;

  return v_hdr;
end;
$function$;

revoke all on function public.audit_get_ip() from public, anon, authenticated;

-- ======================================================================
-- 5) Función helper para extraer user-agent del request (PostgREST)
-- ======================================================================
create or replace function public.audit_get_user_agent()
 returns text
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_raw text;
begin
  begin
    select current_setting('request.headers') into v_raw;
  exception when others then
    v_raw := '';
  end;

  begin
    return left(jsonb_path_query(v_raw::jsonb, '$.user-agent')::text, 500);
  exception when others then
    return 'no-disponible';
  end;
end;
$function$;

revoke all on function public.audit_get_user_agent() from public, anon, authenticated;

-- ======================================================================
-- 6) Funciones helper para acciones comunes (seguras, SECURITY DEFINER)
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
begin
  perform public.registrar_auditoria(
    'puerta', p_actor_id, p_actor_label,
    'login_ok', 'sesion', null, null,
    jsonb_build_object('rol', p_rol),
    public.audit_get_ip(),
    public.audit_get_user_agent()
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
begin
  perform public.registrar_auditoria(
    'puerta', null, p_actor_label,
    'login_fail', 'sesion', null, null,
    jsonb_build_object('rol', coalesce(p_rol, 'desconocido'), 'motivo', p_motivo),
    public.audit_get_ip(),
    public.audit_get_user_agent()
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
begin
  perform public.registrar_auditoria(
    case
      when p_actor_label like '%@%' then 'admin'
      else 'puerta'
    end, p_actor_id, p_actor_label,
    'logout', 'sesion', null, null,
    jsonb_build_object('hora', now()::text),
    public.audit_get_ip(),
    public.audit_get_user_agent()
  );
end;
$function$;

revoke all on function public.f_audit_logout(text, uuid) from public, anon, authenticated;

commit;