-- 0017_p1_03_tabla_auditoria.sql
-- Proyecto: nitroacceso · Tarea: P1-03 unidad 2 (auditoría)
-- Solo: tabla audit_log, índices, RLS y la función registrar_auditoria().
-- Sin funciones helper de IP: el patrón de extracción se escribe inline en
-- cada RPC que lo usa (0018), igual que lo hace f_login en producción.

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
  created_at  timestamptz not null default now()
);

create index if not exists idx_audit_log_created on public.audit_log (created_at desc);
create index if not exists idx_audit_log_actor on public.audit_log (actor_tipo, actor_id, created_at desc);
create index if not exists idx_audit_log_accion on public.audit_log (accion, created_at desc);
create index if not exists idx_audit_log_entidad on public.audit_log (entidad, entidad_id);
create index if not exists idx_audit_log_evento on public.audit_log (evento_id, created_at desc);

-- ======================================================================
-- 2) RLS: solo insert para anon/authenticated (append-only)
-- ======================================================================
alter table public.audit_log enable row level security;

drop policy if exists audit_insert on public.audit_log;
create policy audit_insert on public.audit_log
  for insert
  to anon, authenticated
  with check (true);

-- ======================================================================
-- 3) registrar_auditoria: SECURITY DEFINER, revocada para que nadie la
--    llame directamente desde el cliente; solo la usan las RPC.
-- ======================================================================
create or replace function public.registrar_auditoria(
  p_actor_tipo  text,
  p_actor_id    uuid,
  p_actor_label text,
  p_accion      text,
  p_entidad     text,
  p_entidad_id  uuid,
  p_antes       jsonb,
  p_despues     jsonb,
  p_ip          text default null,
  p_user_agent  text default null
) returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  insert into public.audit_log
    (actor_tipo, actor_id, actor_label, accion, entidad, entidad_id, antes, despues, ip, user_agent)
  values
    (p_actor_tipo, p_actor_id, p_actor_label, p_accion, p_entidad, p_entidad_id, p_antes, p_despues, p_ip, p_user_agent);
end;
$function$;

revoke all on function public.registrar_auditoria(text, uuid, text, text, text, uuid, jsonb, jsonb, text, text) from public, anon, authenticated;

commit;
