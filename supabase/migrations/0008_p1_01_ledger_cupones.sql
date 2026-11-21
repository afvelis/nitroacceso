-- =============================================================================
-- 0008_p1_01_ledger_cupones.sql
-- Tarea: P1-01 · Escaneos atómicos, cupones y cédulas duplicadas (fase 2)
-- Fecha: 2026-11-20
--
-- QUÉ HACE
--   1. Crea el ledger `cupones_movimientos`: emisión, reserva, ajuste de
--      reserva, ajuste del pool, consumo y anulación.
--   2. Lo alimenta con TRIGGERS, no reescribiendo RPC: así captura todos los
--      escritores (presentes y futuros) sin cambiar una sola firma.
--   3. Añade la RPC `f_admin_cuadre_cupones`, que dice por asignación si las
--      cuentas cuadran y dónde no.
--
-- POR QUÉ TRIGGERS Y NO RPC REESCRITAS
--   Los escritores de cupones están repartidos en 9 sitios. Reemplazar cada
--   RPC obligaría a respaldar y re-probar cada una (riesgo PGRST202/203). Un
--   trigger AFTER cubre todos los caminos, incluidos los que se escriban en el
--   futuro.
--
-- GARANTÍA DE SEGURIDAD OPERATIVA
--   El cuerpo del trigger envuelve TODO en `exception when others then null`.
--   Si el ledger no puede registrar algo, la operación de negocio continúa:
--   un fallo de auditoría jamás puede tumbar un canje en la puerta el día del
--   evento. Se prefiere perder una fila de auditoría antes que un ingreso.
--
-- POR QUÉ SIN CLAVES FORÁNEAS EN EL LEDGER
--   Un historial de auditoría no debe borrarse en cascada cuando se borra su
--   origen. Las columnas son uuid sueltos a propósito.
--
-- ORDEN OBLIGATORIO DE DESPLIEGUE
--   1. Aplicar SOLO en staging (adoqujnnnrlgmvwbnwbl).
--   2. Correr las pruebas de la tarea P1-01.
--   3. Solo después, producción.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Tabla del ledger
-- -----------------------------------------------------------------------------

create table if not exists public.cupones_movimientos (
  id             bigint generated always as identity primary key,
  creada_at      timestamptz not null default now(),
  tipo           text        not null,
  cantidad       integer     not null,
  asignacion_id  uuid,
  concurso_id    uuid,
  cortesia_id    uuid,
  detalle        text,
  constraint cupones_movimientos_tipo_chk check (tipo in (
    'emision',
    'reserva',
    'ajuste_reserva',
    'reserva_liberada',
    'ajuste_pool',
    'consumo',
    'ajuste_total',
    'anulacion'
  ))
);

comment on table public.cupones_movimientos is
  'Ledger de cupones. Auditoria: si una fila no se puede escribir, la operacion de negocio continua (ver f_trg_cupones_movimientos).';

create index if not exists cupones_movimientos_asignacion_idx
  on public.cupones_movimientos (asignacion_id);
create index if not exists cupones_movimientos_cortesia_idx
  on public.cupones_movimientos (cortesia_id);
create index if not exists cupones_movimientos_creada_idx
  on public.cupones_movimientos (creada_at desc);

-- El ledger no se expone: solo lo leen las RPC SECURITY DEFINER.
revoke all on public.cupones_movimientos from anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. Función de trigger
--    Un solo cuerpo para las tres tablas, discriminando por tg_table_name.
-- -----------------------------------------------------------------------------

create or replace function public.f_trg_cupones_movimientos()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  begin
    if tg_table_name = 'cortesias' then

      if tg_op = 'INSERT' then
        if new.tipo = 'premiacion' and new.cupones_total is not null then
          insert into public.cupones_movimientos
            (tipo, cantidad, asignacion_id, concurso_id, cortesia_id, detalle)
          values
            ('emision', new.cupones_total, new.asignacion_id, new.concurso_id,
             new.id, new.codigo_link);
        end if;

      elsif tg_op = 'UPDATE' then

        if old.canjeado_at is null and new.canjeado_at is not null then
          insert into public.cupones_movimientos
            (tipo, cantidad, asignacion_id, concurso_id, cortesia_id, detalle)
          values
            ('consumo', coalesce(new.cupones_consumidos, 0), new.asignacion_id,
             new.concurso_id, new.id,
             'dia ' || coalesce(new.canjeado_dia::text, '?'));
        end if;

        if old.cupones_total is distinct from new.cupones_total then
          insert into public.cupones_movimientos
            (tipo, cantidad, asignacion_id, concurso_id, cortesia_id, detalle)
          values
            ('ajuste_total',
             coalesce(new.cupones_total, 0) - coalesce(old.cupones_total, 0),
             new.asignacion_id, new.concurso_id, new.id,
             coalesce(old.cupones_total::text, 'null') || ' -> ' ||
             coalesce(new.cupones_total::text, 'null'));
        end if;

        if old.estado is distinct from 'anulada' and new.estado = 'anulada' then
          insert into public.cupones_movimientos
            (tipo, cantidad, asignacion_id, concurso_id, cortesia_id, detalle)
          values
            ('anulacion',
             greatest(coalesce(new.cupones_total, 0) - coalesce(new.cupones_consumidos, 0), 0),
             new.asignacion_id, new.concurso_id, new.id,
             coalesce(new.razon_anulacion, 'sin motivo'));
        end if;

      end if;

    elsif tg_table_name = 'aliado_concursos' then

      if tg_op = 'INSERT' then
        insert into public.cupones_movimientos
          (tipo, cantidad, asignacion_id, concurso_id, detalle)
        values
          ('reserva', new.cupones_reservados, new.asignacion_id, new.id, new.nombre);

      elsif tg_op = 'UPDATE' then
        if old.cupones_reservados is distinct from new.cupones_reservados then
          insert into public.cupones_movimientos
            (tipo, cantidad, asignacion_id, concurso_id, detalle)
          values
            ('ajuste_reserva',
             coalesce(new.cupones_reservados, 0) - coalesce(old.cupones_reservados, 0),
             new.asignacion_id, new.id,
             coalesce(old.cupones_reservados::text, 'null') || ' -> ' ||
             coalesce(new.cupones_reservados::text, 'null'));
        end if;

      elsif tg_op = 'DELETE' then
        insert into public.cupones_movimientos
          (tipo, cantidad, asignacion_id, concurso_id, detalle)
        values
          ('reserva_liberada', old.cupones_reservados, old.asignacion_id, old.id,
           'concurso eliminado: ' || coalesce(old.nombre, '?'));
      end if;

    elsif tg_table_name = 'aliado_asignaciones' then

      if tg_op = 'UPDATE' then
        if old.cupones_unico is distinct from new.cupones_unico
           or old.cupones_dia1 is distinct from new.cupones_dia1
           or old.cupones_dia2 is distinct from new.cupones_dia2 then
          insert into public.cupones_movimientos
            (tipo, cantidad, asignacion_id, detalle)
          values
            ('ajuste_pool',
             (coalesce(new.cupones_unico, 0) + coalesce(new.cupones_dia1, 0) + coalesce(new.cupones_dia2, 0))
             - (coalesce(old.cupones_unico, 0) + coalesce(old.cupones_dia1, 0) + coalesce(old.cupones_dia2, 0)),
             new.id, new.codigo_link);
        end if;
      end if;

    end if;

  exception when others then
    -- Auditoria best-effort: nunca tumba la operacion de negocio.
    null;
  end;

  return null;
end;
$function$;

revoke all on function public.f_trg_cupones_movimientos() from public;
revoke all on function public.f_trg_cupones_movimientos() from anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. Triggers
-- -----------------------------------------------------------------------------

drop trigger if exists trg_cupones_cortesias on public.cortesias;
create trigger trg_cupones_cortesias
  after insert or update on public.cortesias
  for each row execute function public.f_trg_cupones_movimientos();

drop trigger if exists trg_cupones_concursos on public.aliado_concursos;
create trigger trg_cupones_concursos
  after insert or update or delete on public.aliado_concursos
  for each row execute function public.f_trg_cupones_movimientos();

drop trigger if exists trg_cupones_asignaciones on public.aliado_asignaciones;
create trigger trg_cupones_asignaciones
  after update on public.aliado_asignaciones
  for each row execute function public.f_trg_cupones_movimientos();

-- -----------------------------------------------------------------------------
-- 4. RPC de cuadre
--    Devuelve una fila por asignacion y una fila final para las cortesias
--    que no cuelgan de ninguna asignacion. `cuadra` es false si algo no cierra.
-- -----------------------------------------------------------------------------

create or replace function public.f_admin_cuadre_cupones(p_token uuid)
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

  with base as (
    select
      a.id                     as asignacion_id,
      coalesce(al.nombre_organizacion, '(sin aliado)') as aliado,
      a.codigo_link,
      a.estado                 as estado_asignacion,
      case when a.pool_tipo = 'unico'
           then coalesce(a.cupones_unico, 0)
           else coalesce(a.cupones_dia1, 0) + coalesce(a.cupones_dia2, 0)
      end                      as otorgado,
      coalesce((select sum(c.cupones_reservados) from public.aliado_concursos c
                 where c.asignacion_id = a.id), 0) as reservado,
      coalesce((select sum(ct.cupones_total) from public.cortesias ct
                 where ct.asignacion_id = a.id and ct.estado <> 'anulada'), 0) as emitido,
      coalesce((select sum(ct.cupones_consumidos) from public.cortesias ct
                 where ct.asignacion_id = a.id and ct.estado <> 'anulada'), 0) as consumido,
      coalesce((select sum(ct.cupones_total - ct.cupones_consumidos) from public.cortesias ct
                 where ct.asignacion_id = a.id and ct.estado = 'anulada'), 0) as anulado,
      coalesce((select sum(m.cantidad) from public.cupones_movimientos m
                 where m.asignacion_id = a.id and m.tipo = 'consumo'), 0) as consumido_ledger
    from public.aliado_asignaciones a
    left join public.aliados al on al.id = a.aliado_id
  )
  select coalesce(jsonb_agg(
           jsonb_build_object(
             'asignacion_id',     asignacion_id,
             'aliado',            aliado,
             'codigo_link',       codigo_link,
             'estado_asignacion', estado_asignacion,
             'otorgado',          otorgado,
             'reservado',         reservado,
             'emitido',           emitido,
             'consumido',         consumido,
             'anulado',           anulado,
             'consumido_ledger',  consumido_ledger,
             'cuadra',            (reservado <= otorgado
                                   and emitido <= reservado
                                   and consumido <= emitido
                                   and consumido = consumido_ledger)
           ) order by aliado, codigo_link
         ), '[]'::jsonb)
    into v_filas
  from base;

  return jsonb_build_object(
    'ok', true,
    'filas', v_filas,
    'huerfanas', jsonb_build_object(
      'cortesias_sin_asignacion',
      (select count(*) from public.cortesias
        where asignacion_id is null and tipo = 'premiacion'),
      'emitido',
      (select coalesce(sum(cupones_total), 0) from public.cortesias
        where asignacion_id is null and tipo = 'premiacion' and estado <> 'anulada'),
      'consumido',
      (select coalesce(sum(cupones_consumidos), 0) from public.cortesias
        where asignacion_id is null and tipo = 'premiacion' and estado <> 'anulada')
    )
  );
end;
$function$;

revoke all on function public.f_admin_cuadre_cupones(uuid) from public;
grant execute on function public.f_admin_cuadre_cupones(uuid) to anon;

commit;
