-- =============================================================================
-- 0009_p1_01_cedulas_duplicadas.sql
-- Tarea: P1-01 · Escaneos atómicos, cupones y cédulas duplicadas (fase 3)
-- Fecha: 2026-11-20
--
-- QUÉ HACE
--   1. Crea tabla de log `cedulas_duplicadas_log` (anulaciones de pase duplicado).
--   2. RPC `f_admin_cedulas_duplicadas(p_token)`: reporta cédulas que aparecen
--      en más de una tabla (personas, vendedores, cortesia_personas) o en
--      más de una lista dentro de `personas`.
--   3. RPC `f_admin_anular_pase_duplicado(p_token, p_origen, p_id, p_motivo)`:
--      anula el pase sobrante y exige `p_motivo` obligatorio. Se registra el
--      motivo en el log. Regla B: sistema no decide, admin decide con motivo.
--
-- REQUERIMIENTOS DE LA BASE
--   - Tablas: public.personas(id, cedula, estado, lista_id),
--     public.vendedores(id, cedula, estado_dia1, estado_dia2),
--     public.cortesia_personas(id, cedula, estado).
--   - Todas existen en staging y se verifican en la migración.
--   - Si una de las tablas no existe, la migración aborta toda (ROLLBACK
--     completo, nada se pierde).
--
-- PERMISOS
--   - Tabla de log: solo lectura por RPC SECURITY DEFINER.
--   - RPC de anulacion: grant to anon (como todas las RPC admin).
--
-- ORDEN OBLIGATORIO DE DESPLIEGUE
--   1. Aplicar SOLO en staging.
--   2. Verificar que f_admin_cedulas_duplicadas devuelve los duplicados reales.
--   3. Solo después, producción.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 0. Verificacion: las tablas fuente deben existir.
--    Si alguna no existe, abortamos toda la migracion sin tocar nada.
-- -----------------------------------------------------------------------------

do $$
begin
  if not exists(select 1 from information_schema.tables where table_schema='public' and table_name='personas') then
    raise exception 'La tabla personas no existe: abortando 0009';
  end if;
  if not exists(select 1 from information_schema.tables where table_schema='public' and table_name='vendedores') then
    raise exception 'La tabla vendedores no existe: abortando 0009';
  end if;
  if not exists(select 1 from information_schema.tables where table_schema='public' and table_name='cortesia_personas') then
    raise exception 'La tabla cortesia_personas no existe: abortando 0009';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 1. Tabla de log de anulaciones (similar a reaperturas_puerta y aliado_ampliaciones)
-- -----------------------------------------------------------------------------

create table if not exists public.cedulas_duplicadas_log (
  id                 bigint generated always as identity primary key,
  creada_at          timestamptz not null default now(),
  cedula             text        not null,
  origen             text        not null,  -- 'personas'|'vendedores'|'cortesia_personas'
  pase_id            uuid        not null,  -- id de la fila anulada (sin FK, no se borra el log)
  motivo             text        not null,  -- motivo obligatorio del admin
  admin_token_hash   text        not null   -- hash del token del admin (sin clave en claro)
);

comment on table public.cedulas_duplicadas_log is
  'Registro de anulaciones de pases duplicados. Motivo obligatorio por cada operacion.';

create index if not exists cedulas_duplicadas_log_origen_idx on public.cedulas_duplicadas_log (origen);
create index if not exists cedulas_duplicadas_log_creada_idx on public.cedulas_duplicadas_log (creada_at desc);

revoke all on public.cedulas_duplicadas_log from anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. RPC: reporte de cédulas duplicadas
--    Devuelve una fila por cedula duplicada con el detalle de cada ocurrencia.
--    Un duplicado es cualquier cedula que aparece en >= 2 filas de origen distinto.
-- -----------------------------------------------------------------------------

create or replace function public.f_admin_cedulas_duplicadas(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_filas jsonb;
begin
  if public.f_sesion_ok(p_token, 'admin') is not true then
    return jsonb_build_object('error', 'ERR_SESION');
  end if;

  with todas as (
    select 'personas' as origen,
           p.cedula,
           p.id as pase_id,
           p.estado as estado,
           p.lista_id
      from public.personas p
     where p.cedula is not null and trim(p.cedula) <> ''
    union all
    select 'vendedores',
           v.cedula,
           v.id,
           v.estado_dia1,
           null::uuid
      from public.vendedores v
     where v.cedula is not null and trim(v.cedula) <> ''
    union all
    select 'cortesia_personas',
           cp.cedula,
           cp.id,
           cp.estado,
           null::uuid
      from public.cortesia_personas cp
     where cp.cedula is not null and trim(cp.cedula) <> ''
  ),
  duplicadas as (
    select cedula
      from todas
     group by cedula
    having count(*) >= 2
       or count(distinct origen) >= 2
  )
  select jsonb_agg(
           jsonb_build_object(
             'cedula', t.cedula,
             'origenes', (select jsonb_agg(distinct t2.origen order by t2.origen)
                          from todas t2 where t2.cedula = t.cedula),
             'total', (select count(*) from todas t3 where t3.cedula = t.cedula),
             'detalle', (
               select jsonb_agg(
                 jsonb_build_object(
                   'origen', t4.origen,
                   'pase_id', t4.pase_id,
                   'estado', t4.estado,
                   'lista_id', t4.lista_id
                 ) order by t4.origen, t4.pase_id
               )
               from todas t4
              where t4.cedula = t.cedula
             )
           ) order by t.cedula
         )
    into v_filas
    from (select distinct cedula from duplicadas) t;

  return jsonb_build_object('ok', true, 'filas', coalesce(v_filas, '[]'::jsonb));
end;
$function$;

revoke all on function public.f_admin_cedulas_duplicadas(uuid) from public;
grant execute on function public.f_admin_cedulas_duplicadas(uuid) to anon;

-- -----------------------------------------------------------------------------
-- 3. RPC: anular un pase duplicado (regla B: admin decide con motivo)
--    No anula nada por si sola — exige p_motivo (texto no vacio) y lo registra.
--    p_origen debe ser 'personas', 'vendedores' o 'cortesia_personas'.
-- -----------------------------------------------------------------------------

create or replace function public.f_admin_anular_pase_duplicado(p_token uuid, p_origen text, p_id uuid, p_motivo text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_cedula text;
  v_anulada boolean;
  v_token_hash text;
begin
  if public.f_sesion_ok(p_token, 'admin') is not true then
    return jsonb_build_object('error', 'ERR_SESION');
  end if;

  if p_origen not in ('personas', 'vendedores', 'cortesia_personas') then
    return jsonb_build_object('error', 'ERR_ORIGEN_INVALIDO');
  end if;

  if p_motivo is null or trim(p_motivo) = '' then
    return jsonb_build_object('error', 'ERR_MOTIVO_VACIO');
  end if;

  -- Leer la cedula del pase (segun el origen)
  if p_origen = 'personas' then
    select cedula into v_cedula from public.personas where id = p_id;
    if not found then
      return jsonb_build_object('error', 'ERR_NO_EXISTE');
    end if;

    -- Verificar que esta cedula es duplicada (aparece en >= 2 origenes)
    if (select count(*) from (
      select 'personas' as origen from public.personas where cedula = v_cedula and id <> p_id
      union all
      select 'vendedores' from public.vendedores where cedula = v_cedula
      union all
      select 'cortesia_personas' from public.cortesia_personas where cedula = v_cedula
    ) x where x.origen is not null) < 1 then
      return jsonb_build_object('error', 'ERR_NO_DUPLICADO');
    end if;

    -- Desautorizar el pase: set estado = 'pendiente'
    update public.personas set estado = 'pendiente' where id = p_id;
    v_anulada := found;

  elsif p_origen = 'vendedores' then
    select cedula into v_cedula from public.vendedores where id = p_id;
    if not found then
      return jsonb_build_object('error', 'ERR_NO_EXISTE');
    end if;

    if (select count(*) from (
      select 'personas' as origen from public.personas where cedula = v_cedula
      union all
      select 'vendedores' from public.vendedores where cedula = v_cedula and id <> p_id
      union all
      select 'cortesia_personas' from public.cortesia_personas where cedula = v_cedula
    ) x where x.origen is not null) < 1 then
      return jsonb_build_object('error', 'ERR_NO_DUPLICADO');
    end if;

    -- Desautorizar los dos dias
    update public.vendedores set estado_dia1 = 'pendiente', estado_dia2 = 'pendiente' where id = p_id;
    v_anulada := found;

  elsif p_origen = 'cortesia_personas' then
    select cedula into v_cedula from public.cortesia_personas where id = p_id;
    if not found then
      return jsonb_build_object('error', 'ERR_NO_EXISTE');
    end if;

    if (select count(*) from (
      select 'personas' as origen from public.personas where cedula = v_cedula
      union all
      select 'vendedores' as origen from public.vendedores where cedula = v_cedula
      union all
      select 'cortesia_personas' as origen from public.cortesia_personas where cedula = v_cedula and id <> p_id
    ) x where x.origen is not null) < 1 then
      return jsonb_build_object('error', 'ERR_NO_DUPLICADO');
    end if;

    -- Desautorizar el pase
    update public.cortesia_personas set estado = 'pendiente' where id = p_id;
    v_anulada := found;
  end if;

  if not v_anulada then
    return jsonb_build_object('error', 'ERR_NO_ANULADA');
  end if;

  -- Registrar el motivo en el log (sin FK: si se borra el pase, no se borra el log)
  v_token_hash := encode(extensions.digest(p_token::text, 'sha256'), 'hex');

  insert into public.cedulas_duplicadas_log (cedula, origen, pase_id, motivo, admin_token_hash)
  values (v_cedula, p_origen, p_id, trim(p_motivo), v_token_hash);

  return jsonb_build_object('ok', true, 'cedula', v_cedula, 'origen', p_origen, 'motivo', trim(p_motivo));
end;
$function$;

revoke all on function public.f_admin_anular_pase_duplicado(uuid, text, uuid, text) from public;
grant execute on function public.f_admin_anular_pase_duplicado(uuid, text, uuid, text) to anon;

commit;
