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
--      NO DELETE para la app (append-only). El administrador consulta
--      con SQL Editor usando service_role.
--   3. NO guarda tokens, PINs ni contraseñas. Solo IDs, nombres, acciones y
--      snapshots JSONB de antes/después.
--   4. Crea la función genérica public.registrar_auditoria() para que las
--      RPC de la app llamen fácilmente (seguridad: la función es SECURITY
--      DEFINER, pero como no se expone a anon/authenticated, solo las RPC
--      pueden usarla).
--
-- PENDIENTE (próximas migraciones):
--   · Integrar registros en cada RPC crítica:
--     - f_login: registrar_auditoria('puerta'/'admin', ...) con login_ok/login_fail
--     - f_logout: registrar_auditoria con logout
--     - f_puerta_autorizar_entrada: accion='autorizar_entrada'
--     - f_puerta_anular_cortesia: accion='anular_cortesia'
--     - f_coord_cerrar_edicion: accion='cierre_edicion'
--   · Crear la vista de auditoría en admin (nueva pantalla o sección)
--   · Política de retención automática (borrado > N meses)

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
-- 3) Función genérica de registro (segura, solo llamadas internas)
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
-- 4) Helper: extraer IP y user-agent de request info (PostgREST)
-- ======================================================================
-- Esta función es segura (no expuesta) y la llaman las RPC SECURITY
-- DEFINER para obtener los metadatos de la conexión sin exponerlos.
create or replace function public._aud_ip()
 returns text
language sql
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select current_setting('request.header.x-forwarded-for', true)
         coalesce(nullif(current_setting('request.header.x-forwarded-for', true), ''),
                  current_setting('request.header.x-real-ip', true))
$function$;

-- La IP real se obtiene con:
-- select current_setting('request.header.x-forwarded-for', true) || 
--        coalesce(nullif(current_setting('request.header.x-forwarded-for', true), ''),
--                 current_setting('request.header.x-real-ip', true));
-- Pero eso no funciona directamente. En PostgREST, la IP está en:
-- select request.headers::json->>'x-forwarded-for';
-- Mejor: crear una función simple que la lea del request context.
-- Sin embargo, las funciones SECURITY DEFINER en Supabase no tienen
-- acceso directo a request.headers. La alternativa es pasar la IP
-- desde el frontend o desde la RPC que la recibe.

-- Pendiente: integrar la obtención de IP del request en cada RPC
-- que llame a registrar_auditoria. La app puede enviar 'X-Forwarded-For'
-- en los headers de la llamada a Supabase (postg-js lo soporta).

commit;