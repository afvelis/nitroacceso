-- 0014_m39_informe_patrocinadores.sql
-- Proyecto: NitroSystem (control de acceso) · Tarea: M-39 (informe agregado para patrocinadores)
-- Referencia: tareas/M-39-informe-agregado-patrocinadores.md
--
-- QUE HACE:
--   Crea la RPC de admin f_admin_informe_patrocinadores(p_token): informe AGREGADO de
--   asistencia para entregar a patrocinadores. Devuelve totales por segmento (talento / stand / cortesía) y por día, resumen de
--   stands, talentos, empresas, cargos y razones de cortesía.
--
-- POR QUE:
--   Se entregan bases a patrocinadores y hoy no hay herramienta para ello. El aviso de
--   privacidad v1 dice que no se entregan datos personales a terceros, así que lo único
--   que puede salir es AGREGADO: cero nombres, cédulas, correos ni teléfonos.
--   El JSON solo lleva contadores y nombres de catálogo (número/nombre de stand,
--   nombre de talento, empresa, cargo, razón), nunca datos de personas físicas.
--   Regla anti-reidentificación (grupo mínimo 3): en 'cargos', los grupos de
--   menos de 3 personas se agrupan en una sola fila "(grupos de menos de 3)";
--   un grupo de 1 o 2 personas reidentifica a alguien en una base que sale del
--   equipo hacia patrocinadores externos.
--
-- SEGURIDAD:
--   Security definer con search_path fijo (patrón 0001). Solo pasa f_sesion_rol = 'admin'.
--   Concedida a anon: la llama el frontend con la clave anon + token de admin, igual que
--   f_admin_listar_reclamos (0012). El token valida el rol dentro de la función, así que
--   el grant a anon no expone nada.
--
-- El SQL lo ejecuta el ORGANIZADOR en el SQL Editor de Supabase (proyecto correcto):
--   1. Confirmar el proyecto antes de ejecutar.
--   2. Pegar este archivo completo y ejecutar.
--   3. Verificación con conteo/salida literal: 'ok' => true, 'error' => ERR_SESION con
--      token inválido, y claves esperadas: totales, segmentos, stands, talentos,
--      empresas, cargos, cortesias_por_razon, aviso.

-- 1) RPC ADMIN: informe agregado para patrocinadores (sin datos personales)
create or replace function public.f_admin_informe_patrocinadores(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_res jsonb;
begin
  if public.f_sesion_rol(p_token) is distinct from 'admin' then
    return jsonb_build_object('error', 'ERR_SESION');
  end if;

  with
  talento as (
    select p.id, regexp_replace(coalesce(p.cedula,''), '\D', '', 'g') as ced_norm,
           l.dia, (p.estado = 'autorizado') as asistio
    from personas p
    join listas l on l.id = p.lista_id
  ),
  stand as (
    select v.id, regexp_replace(coalesce(v.cedula,''), '\D', '', 'g') as ced_norm,
           1 as dia, (v.estado_dia1 = 'autorizado') as asistio
    from vendedores v
    union all
    select v.id, regexp_replace(coalesce(v.cedula,''), '\D', '', 'g'),
           2, (v.estado_dia2 = 'autorizado')
    from vendedores v
  ),
  cortesia as (
    select cp.id, regexp_replace(coalesce(cp.cedula,''), '\D', '', 'g') as ced_norm,
           cl.dia, (cp.estado = 'autorizado') as asistio
    from cortesia_personas cp
    join cortesia_listas cl on cl.id = cp.lista_id
    join cortesias c on c.id = cp.cortesia_id and c.estado = 'activa'
    where cp.lista_id is not null
    union all
    select cp.id, regexp_replace(coalesce(cp.cedula,''), '\D', '', 'g'),
           1, (cp.estado_dia1 = 'autorizado')
    from cortesia_personas cp
    join cortesias c on c.id = cp.cortesia_id and c.estado = 'activa'
    where cp.lista_id is null and c.dia1 = true
    union all
    select cp.id, regexp_replace(coalesce(cp.cedula,''), '\D', '', 'g'),
           2, (cp.estado_dia2 = 'autorizado')
    from cortesia_personas cp
    join cortesias c on c.id = cp.cortesia_id and c.estado = 'activa'
    where cp.lista_id is null and c.dia2 = true
  ),
  todo as (
    select 'talento' as segmento, id, ced_norm, dia, asistio from talento
    union all
    select 'stand', id, ced_norm, dia, asistio from stand
    union all
    select 'cortesia', id, ced_norm, dia, asistio from cortesia
  )
  select jsonb_build_object(
    'ok', true,
    'generado_at', now(),
    'evento', (
      select jsonb_build_object('nombre', cfg.nombre_evento, 'dia_activo', cfg.dia_activo)
      from config cfg where cfg.id = 1
    ),
    'aviso', 'Solo datos agregados: no incluye nombres, cédulas, correos ni teléfonos. Los grupos de menos de 3 personas se agrupan en una sola fila para evitar reidentificación.',
    'totales', jsonb_build_object(
      'registros', (select count(*) from (select distinct segmento, id from todo) z),
      'personas_distintas', (select count(distinct ced_norm) from todo where ced_norm <> ''),
      'asistieron_dia1', (select count(*) from todo where dia = 1 and asistio),
      'asistieron_dia2', (select count(*) from todo where dia = 2 and asistio)
    ),
    'segmentos', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'segmento', t.segmento,
        'registros', t.registros,
        'asistieron_dia1', t.d1,
        'asistieron_dia2', t.d2
      ) order by t.segmento), '[]'::jsonb)
      from (
        select segmento,
               count(distinct id) as registros,
               count(*) filter (where dia = 1 and asistio) as d1,
               count(*) filter (where dia = 2 and asistio) as d2
        from todo group by segmento
      ) t
    ),
    'stands', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'numero', s.numero,
        'nombre', s.nombre,
        'empresa', s.empresa,
        'tipo', s.tipo,
        'personas', s.personas,
        'asistieron_dia1', s.d1,
        'asistieron_dia2', s.d2
      ) order by s.tipo, s.numero), '[]'::jsonb)
      from (
        select st.numero, st.nombre, st.empresa, st.tipo,
               count(v.id) as personas,
               count(*) filter (where v.estado_dia1 = 'autorizado') as d1,
               count(*) filter (where v.estado_dia2 = 'autorizado') as d2
        from stands st
        left join vendedores v on v.stand_id = st.id
        group by st.id, st.numero, st.nombre, st.empresa, st.tipo
      ) s
    ),
    'talentos', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'nombre', x.nombre,
        'personas_dia1', x.p1,
        'asistieron_dia1', x.a1,
        'personas_dia2', x.p2,
        'asistieron_dia2', x.a2
      ) order by x.nombre), '[]'::jsonb)
      from (
        select tl.nombre,
               count(p.id) filter (where l.dia = 1) as p1,
               count(p.id) filter (where l.dia = 1 and p.estado = 'autorizado') as a1,
               count(p.id) filter (where l.dia = 2) as p2,
               count(p.id) filter (where l.dia = 2 and p.estado = 'autorizado') as a2
        from talentos tl
        join listas l on l.talento_id = tl.id
        left join personas p on p.lista_id = l.id
        group by tl.id, tl.nombre
      ) x
    ),
    'empresas', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'empresa', e.empresa,
        'personas', e.personas,
        'asistieron_dia1', e.d1,
        'asistieron_dia2', e.d2
      ) order by e.personas desc, e.empresa), '[]'::jsonb)
      from (
        select coalesce(nullif(btrim(v.empresa), ''), '(sin empresa)') as empresa,
               count(*) as personas,
               count(*) filter (where v.estado_dia1 = 'autorizado') as d1,
               count(*) filter (where v.estado_dia2 = 'autorizado') as d2
        from vendedores v
        group by 1
      ) e
    ),
    'cargos', (
      select coalesce(jsonb_agg(jsonb_build_object('cargo', c.cargo, 'personas', c.personas)
             order by c.personas desc, c.cargo), '[]'::jsonb)
      from (
        select cargo, sum(cnt) as personas
        from (
          select case when count(*) >= 3
                      then coalesce(nullif(btrim(p.cargo), ''), '(sin cargo)')
                      else '(grupos de menos de 3)' end as cargo,
                 count(*) as cnt
          from personas p
          group by coalesce(nullif(btrim(p.cargo), ''), '(sin cargo)')
        ) b
        group by cargo
      ) c
    ),
    'cortesias_por_razon', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'razon', r.razon,
        'personas', r.personas,
        'asistieron_dia1', r.d1,
        'asistieron_dia2', r.d2
      ) order by r.personas desc, r.razon), '[]'::jsonb)
      from (
        select co.razon,
               count(distinct x.id) as personas,
               count(distinct x.id) filter (where x.dia = 1 and x.asistio) as d1,
               count(distinct x.id) filter (where x.dia = 2 and x.asistio) as d2
        from cortesias co
        left join (
          select cp.id, cp.cortesia_id, cl.dia, (cp.estado = 'autorizado') as asistio
          from cortesia_personas cp
          join cortesia_listas cl on cl.id = cp.lista_id
          where cp.lista_id is not null
          union all
          select cp.id, cp.cortesia_id, 1, (cp.estado_dia1 = 'autorizado')
          from cortesia_personas cp
          join cortesias c on c.id = cp.cortesia_id
          where cp.lista_id is null and c.dia1 = true
          union all
          select cp.id, cp.cortesia_id, 2, (cp.estado_dia2 = 'autorizado')
          from cortesia_personas cp
          join cortesias c on c.id = cp.cortesia_id
          where cp.lista_id is null and c.dia2 = true
        ) x on x.cortesia_id = co.id
        where co.estado = 'activa'
        group by co.razon
      ) r
    )
  ) into v_res;

  return v_res;
end;
$function$;

-- 2) Permisos (bloque EXACTO del patrón de f_admin_listar_reclamos en 0012,
--    con la firma de esta función: solo el parámetro uuid)
revoke all on function public.f_admin_informe_patrocinadores(uuid) from public;
grant execute on function public.f_admin_informe_patrocinadores(uuid) to anon;

-- 3) PostgREST recarga el esquema
notify pgrst, 'reload schema';
