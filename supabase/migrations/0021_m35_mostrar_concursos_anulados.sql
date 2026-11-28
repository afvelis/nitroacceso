-- 0021_m35_mostrar_concursos_anulados.sql
-- Proyecto: NitroSystem · Tarea: M-35
-- Fecha: 27/11/2026
--
-- QUÉ HACE:
--   f_aliado_ver ahora devuelve TODOS los concursos del aliado, incluso
--   los cerrados/anulados. Antes la función excluía los concursos cerrados
--   con un NOT EXISTS, lo que hacía invisible al aliado sus concursos
--   finalizados y sus premios asignados (aun anulados).
--
-- CAMBIOS:
--   - Se elimina el filtro NOT EXISTS del subquery de concursos
--   - Se añade razon_anulacion a la salida de cada concurso
--   - Se añade una nueva columna 'cerrado' (boolean) para que el frontend
--     sepa si el concurso está cerrado o abierto

begin;

CREATE OR REPLACE FUNCTION public.f_aliado_ver(p_codigo_link text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_asi RECORD;
  v_ali RECORD;
  v_reservados int;
  v_dia1_cerrado bool;
  v_dia2_cerrado bool;
BEGIN
  SELECT * INTO v_asi FROM aliado_asignaciones WHERE codigo_link = p_codigo_link;
  IF v_asi IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO v_ali FROM aliados WHERE id = v_asi.aliado_id;

  SELECT COALESCE(dia1_cerrado,false), COALESCE(dia2_cerrado,false)
    INTO v_dia1_cerrado, v_dia2_cerrado
    FROM config WHERE id = 1;

  SELECT COALESCE(SUM(cupones_reservados),0) INTO v_reservados
    FROM aliado_concursos WHERE asignacion_id = v_asi.id;

  RETURN jsonb_build_object(
    'asignacion', jsonb_build_object(
      'id', v_asi.id,
      'codigo_link', v_asi.codigo_link,
      'pool_tipo', v_asi.pool_tipo,
      'cupones_unico', v_asi.cupones_unico,
      'razon_anulacion', v_asi.razon_anulacion,
      'cupones_reservados', v_reservados,
      'cupones_disponibles', v_asi.cupones_unico - v_reservados,
      'creada_at', v_asi.creada_at
    ),
    'aliado', jsonb_build_object(
      'nombre_organizacion', v_ali.nombre_organizacion,
      'responsable', v_ali.responsable,
      'correo', v_ali.correo,
      'telefono', v_ali.telefono,
      'activo', v_ali.activo
    ),
    'dias_cerrados', jsonb_build_object(
      'dia1', v_dia1_cerrado,
      'dia2', v_dia2_cerrado
    ),
    'estadisticas_por_dia', jsonb_build_object(
      'dia1', jsonb_build_object(
        'total', (SELECT COUNT(*) FROM cortesias c WHERE c.asignacion_id = v_asi.id AND c.dia1 = true AND c.tipo = 'premiacion' AND c.estado = 'activa'),
        'asistieron', (SELECT COUNT(*) FROM cortesias c WHERE c.asignacion_id = v_asi.id AND c.dia1 = true AND c.tipo = 'premiacion' AND c.estado = 'activa' AND c.cupones_consumidos > 0)
      ),
      'dia2', jsonb_build_object(
        'total', (SELECT COUNT(*) FROM cortesias c WHERE c.asignacion_id = v_asi.id AND c.dia2 = true AND c.tipo = 'premiacion' AND c.estado = 'activa'),
        'asistieron', (SELECT COUNT(*) FROM cortesias c WHERE c.asignacion_id = v_asi.id AND c.dia2 = true AND c.tipo = 'premiacion' AND c.estado = 'activa' AND c.cupones_consumidos > 0)
      )
    ),
    'concursos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', ac.id,
        'nombre', ac.nombre,
        'descripcion', ac.descripcion,
        'fecha_concurso', ac.fecha_concurso,
        'cupones_reservados', ac.cupones_reservados,
        'estado', ac.estado,
        'cerrado', (ac.cerrada_at IS NOT NULL),
        'razon_anulacion', (SELECT c.razon_anulacion FROM cortesias c WHERE c.concurso_id = ac.id AND c.estado = 'anulada' LIMIT 1),
        'creada_at', ac.creada_at,
        'cerrada_at', ac.cerrada_at,
        'ganador', (
          SELECT jsonb_build_object(
            'codigo_link', c.codigo_link,
            'codigo_qr', cp.codigo_qr,
            'nombre', cp.nombre,
            'apellido', cp.apellido,
            'cedula', public.f_cedula_mascara(cp.cedula),
            'correo', cp.correo,
            'telefono', cp.telefono,
            'cupones_total', c.cupones_total,
            'cupones_consumidos', c.cupones_consumidos,
            'dia1', c.dia1,
            'dia2', c.dia2,
            'estado', c.estado,
            'canjeado_at', c.canjeado_at,
            'enviado_at', c.enviado_at,
            'creada_at', c.creada_at
          )
          FROM cortesias c
          JOIN cortesia_personas cp ON cp.cortesia_id = c.id AND cp.lista_id IS NULL
          WHERE c.concurso_id = ac.id
          LIMIT 1
        )
      ) ORDER BY ac.creada_at DESC)
      FROM aliado_concursos ac
      WHERE ac.asignacion_id = v_asi.id
    ), '[]'::jsonb),
    'ampliaciones', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'cupones_antes', am.cupones_antes,
        'cupones_despues', am.cupones_despues,
        'motivo', am.motivo,
        'motivo_detalle', am.motivo_detalle,
        'creada_at', am.creada_at
      ) ORDER BY am.creada_at DESC)
      FROM aliado_ampliaciones am
      WHERE am.asignacion_id = v_asi.id
    ), '[]'::jsonb)
  );
END;
$function$;

commit;