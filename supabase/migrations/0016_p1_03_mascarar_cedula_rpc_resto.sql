-- 0016_p1_03_mascarar_cedula_rpc_resto.sql
-- Proyecto: NitroSystem (control de acceso) · Tarea: P1-03 unidad 1b (resto)
-- Referencia: tareas/P1-03-auditoria-privacidad.md:202 (nota "seguir con pg_get_functiondef")
-- Fecha: 27/11/2026
--
-- QUÉ HACE (continuación de 0013, que ya enmascara f_aliado_ver):
--   Enmascara la cédula en las 4 RPC restantes que la devolvían en claro:
--     1. f_admin_listar_aliados — cédula del aliado en cada tarjeta
--     2. f_admin_ver_concursos_aliado — cédula del aliado (asignación)
--                          y cédula del ganador del concurso
--     3. f_puerta_personas_de_lista — cédula de cada persona de la lista
--     4. f_puerta_cortesia_lista — cédula de cada persona de la lista
--
--   Usa el helper public.f_cedula_mascara (creado en 0013).
--
-- NO SE ENMASCARAN (a propósito, verificado en código):
--   · f_puerta_vendedor_por_qr — operador compara cédula con documento físico
--   · f_puerta_cortesia_individual — operador verifica identidad del portador
--   · f_puerta_premiacion_por_qr — operador verifica identidad del ganador
--   · f_link_stand_ver — stand deduplica por cédula
--   (ver 0013.sql, sección "NO SE ENMASCAN")
--
-- RIESGOS:
--   · create or replace: no se modifican grants/revoke, conservan los de 0001.
--   · Si algún cliente necesitaba la cédula completa en estas vistas,
--     se romperá. Son admin, coord y puerta — no hay uso legítimo conocido
--     de cédula completa en esos flujos (la comparación física es en
--     funciones no enmascaradas listadas arriba).
--
-- ORDEN: después de 0015_p1_05_revelado_cedula.sql (no depende de ningún
--   objeto nuevo).

begin;

-- ======================================================================
-- 1) f_admin_listar_aliados
-- ======================================================================
-- Enmascara a.cedula en la tarjeta de cada aliado.
CREATE OR REPLACE FUNCTION public.f_admin_listar_aliados(p_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if public.f_sesion_ok(p_token, 'admin') is not true then
    return null;
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', a.id,
      'nombre_organizacion', a.nombre_organizacion,
      'responsable', a.responsable,
      'cedula', public.f_cedula_mascara(a.cedula),
      'correo', a.correo,
      'telefono', a.telefono,
      'nota_duplicado', a.nota_duplicado,
      'activo', a.activo,
      'creada_at', a.creada_at,
      'asignaciones', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', asi.id,
          'codigo_link', asi.codigo_link,
          'pool_tipo', asi.pool_tipo,
          'cupones_unico', asi.cupones_unico,
          'cupones_dia1', asi.cupones_dia1,
          'cupones_dia2', asi.cupones_dia2,
          'estado', asi.estado,
          'razon_anulacion', asi.razon_anulacion,
          'creada_at', asi.creada_at,
          'premios_creados', (
            select count(*) from cortesias c
            where c.asignacion_id = asi.id
          ),
          'cupones_asignados', coalesce((
            select sum(c.cupones_total) from cortesias c
            where c.asignacion_id = asi.id
          ), 0),
          'cupones_asignados_dia1', coalesce((
            select sum(c.cupones_total) from cortesias c
            where c.asignacion_id = asi.id and c.dia1 = true
          ), 0),
          'cupones_asignados_dia2', coalesce((
            select sum(c.cupones_total) from cortesias c
            where c.asignacion_id = asi.id and c.dia2 = true
          ), 0),
          'disponible_unico', case when asi.pool_tipo = 'unico'
            then asi.cupones_unico - coalesce((select sum(c.cupones_total) from cortesias c where c.asignacion_id = asi.id), 0)
            else null end,
          'disponible_dia1', case when asi.pool_tipo = 'por_dia'
            then asi.cupones_dia1 - coalesce((select sum(c.cupones_total) from cortesias c where c.asignacion_id = asi.id and c.dia1 = true), 0)
            else null end,
          'disponible_dia2', case when asi.pool_tipo = 'por_dia'
            then asi.cupones_dia2 - coalesce((select sum(c.cupones_total) from cortesias c where c.asignacion_id = asi.id and c.dia2 = true), 0)
            else null end,
          'ampliaciones', coalesce((
            select jsonb_agg(jsonb_build_object(
              'cupones_antes', am.cupones_antes,
              'cupones_despues', am.cupones_despues,
              'motivo', am.motivo,
              'motivo_detalle', am.motivo_detalle,
              'creada_at', am.creada_at
            ) order by am.creada_at desc)
            from aliado_ampliaciones am
            where am.asignacion_id = asi.id
          ), '[]'::jsonb)
        ) order by asi.creada_at desc)
        from aliado_asignaciones asi
        where asi.aliado_id = a.id
      ), '[]'::jsonb)
    ) order by a.creada_at desc)
    from aliados a
  ), '[]'::jsonb);
end;
$function$;

-- ======================================================================
-- 2) f_admin_ver_concursos_aliado
-- ======================================================================
-- Enmascara:
--   - a.cedula en la asignación (línea del aliado)
--   - cp.cedula en el ganador del concurso
CREATE OR REPLACE FUNCTION public.f_admin_ver_concursos_aliado(p_token uuid, p_asignacion_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_asignacion jsonb;
  v_concursos jsonb;
begin
  if public.f_sesion_ok(p_token, 'admin') is not true then
    return null;
  end if;

  select jsonb_build_object(
    'asignacion_id', asi.id,
    'codigo_link', asi.codigo_link,
    'pool_tipo', asi.pool_tipo,
    'cupones_unico', asi.cupones_unico,
    'cupones_dia1', asi.cupones_dia1,
    'cupones_dia2', asi.cupones_dia2,
    'estado', asi.estado,
    'razon_anulacion', asi.razon_anulacion,
    'creada_at', asi.creada_at,
    'aliado', jsonb_build_object(
      'id', a.id,
      'nombre_organizacion', a.nombre_organizacion,
      'responsable', a.responsable,
      'cedula', public.f_cedula_mascara(a.cedula),
      'correo', a.correo,
      'telefono', a.telefono,
      'activo', a.activo
    )
  )
  into v_asignacion
  from aliado_asignaciones asi
  join aliados a on a.id = asi.aliado_id
  where asi.id = p_asignacion_id;

  if v_asignacion is null then
    return jsonb_build_object('error', 'ERR_NO_EXISTE');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'nombre', c.nombre,
    'descripcion', c.descripcion,
    'fecha_concurso', c.fecha_concurso,
    'cupones_reservados', c.cupones_reservados,
    'estado', c.estado,
    'creada_at', c.creada_at,
    'cerrada_at', c.cerrada_at,
    'ganador', (
      select jsonb_build_object(
        'cortesia_id', co.id,
        'codigo_link', co.codigo_link,
        'estado', co.estado,
        'cupones_total', co.cupones_total,
        'cupones_consumidos', co.cupones_consumidos,
        'canjeado_at', co.canjeado_at,
        'canjeado_dia', co.canjeado_dia,
        'enviado_at', co.enviado_at,
        'razon_anulacion', co.razon_anulacion,
        'dia1', co.dia1,
        'dia2', co.dia2,
        'nombre', cp.nombre,
        'apellido', cp.apellido,
        'cedula', public.f_cedula_mascara(cp.cedula),
        'correo', cp.correo,
        'telefono', cp.telefono
      )
      from cortesias co
      left join cortesia_personas cp on cp.cortesia_id = co.id
      where co.concurso_id = c.id
      limit 1
    )
  ) order by c.creada_at desc), '[]'::jsonb)
  into v_concursos
  from aliado_concursos c
  where c.asignacion_id = p_asignacion_id;

  return jsonb_build_object(
    'asignacion', v_asignacion,
    'concursos', v_concursos
  );
end;
$function$;

-- ======================================================================
-- 3) f_puerta_personas_de_lista
-- ======================================================================
-- Enmascara p.cedula en cada persona de la lista.
CREATE OR REPLACE FUNCTION public.f_puerta_personas_de_lista(p_token uuid, p_lista_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
BEGIN
  IF public.f_sesion_ok(p_token, 'puerta') IS NOT TRUE THEN
    RETURN NULL;
  END IF;

  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'persona_id', p.id,
        'nombre', p.nombre,
        'apellido', p.apellido,
        'cedula', public.f_cedula_mascara(p.cedula),
        'cargo', p.cargo,
        'estado', p.estado,
        'marcado_at', p.marcado_at,
        'lista_codigo', l.codigo_corto,
        'talento_nombre', t.nombre,
        'dia', l.dia,
        'lista_estado', l.estado
      )
      ORDER BY p.nombre, p.apellido
    )
    FROM personas p
    JOIN listas l ON l.id = p.lista_id
    JOIN talentos t ON t.id = l.talento_id
    WHERE p.lista_id = p_lista_id
  );
END;
$function$;

-- ======================================================================
-- 4) f_puerta_cortesia_lista
-- ======================================================================
-- Enmascara cp.cedula en cada persona de la lista de cortesía.
CREATE OR REPLACE FUNCTION public.f_puerta_cortesia_lista(p_token uuid, p_codigo_corto text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_lista cortesia_listas%ROWTYPE;
  v_cortesia cortesias%ROWTYPE;
BEGIN
  IF public.f_sesion_ok(p_token, 'puerta') IS NOT TRUE THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_lista FROM cortesia_listas WHERE codigo_corto = upper(btrim(p_codigo_corto));
  IF v_lista.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_cortesia FROM cortesias WHERE id = v_lista.cortesia_id;

  RETURN jsonb_build_object(
    'anulada', (v_cortesia.estado = 'anulada'),
    'tipo', 'lista',
    'lista_id', v_lista.id,
    'dia', v_lista.dia,
    'codigo_corto', v_lista.codigo_corto,
    'nombre_organizacion', v_cortesia.nombre_organizacion,
    'razon', v_cortesia.razon,
    'causa', v_cortesia.causa,
    'personas', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'persona_id', cp.id,
        'nombre', cp.nombre,
        'apellido', cp.apellido,
        'cedula', public.f_cedula_mascara(cp.cedula),
        'estado', cp.estado,
        'marcado_at', cp.marcado_at
      ) ORDER BY cp.nombre, cp.apellido)
      FROM cortesia_personas cp WHERE cp.lista_id = v_lista.id
    ), '[]'::jsonb)
  );
END;
$function$;

commit;