-- 0013_p1_03_mascarar_cedula_rpc.sql
-- Proyecto: NitroSystem (control de acceso) · Tarea: P1-03 unidad 1b
-- Referencia: tareas/P1-03-auditoria-privacidad.md:52,98,147
-- Fecha: 25/11/2026
--
-- QUÉ HACE (unidad 1b: filtrar la cédula completa en el SERVIDOR):
--   1. Crea el helper public.f_cedula_mascara(p_cedula text): replica EXACTO
--      del helper JS cedulaMascara (config.js:164-171):
--        · null/NULL   → NULL (por strict; el JS devuelve "" y la UI ya no pinta)
--        · ''          → '' (length 0 <= 5 → repeat('•', 0))
--        · length <= 5 → solo '•' repetidos
--        · resto       → 3 primeros + '•••' + 2 últimos
--      Es función interna, NO es RPC: se cierra la superficie revocando
--      execute a public, anon y authenticated (estilo de
--      0008_p1_01_ledger_cupones.sql:220).
--   2. Reescribe public.f_aliado_ver(p_codigo_link text) (create or replace,
--      idempotente) copiada LITERAL de producción (pg_get_functiondef,
--      verificada 25/11/2026) con SOLO DOS cambios, ambos en el bloque
--      `ganador`:
--        a) la clave cedula del ganador pasa de exponer cp.cedula tal cual
--           a exponer public.f_cedula_mascara(cp.cedula);
--        b) se ELIMINA la clave correo del ganador (tomaba cp.correo; cero
--           lecturas de .correo en js/aliado.js; P1-03 unidad 1a ya lo quitó
--           de la UI).
--           El 'telefono' se CONSERVA (lo usa js/aliado.js).
--      El resto del cuerpo es byte a byte el de producción: no se toca.
--
-- ORDEN DE DESPLIEGUE: después de 0012_m36_modulo_reclamos.sql; no depende
--   de ningún objeto nuevo (aliado_asignaciones, aliados, aliado_concursos,
--   aliado_ampliaciones, cortesias, cortesia_personas y config ya existen
--   desde 0001_esquema_inicial.sql).
--
-- RIESGOS:
--   · f_aliado_ver es SECURITY DEFINER y se expone con create or replace:
--     NO se repiten sus grants/revoke, conservan los de 0001 (igual que
--     0011, NOTA 4).
--   · La máscara no es seguridad por sí sola: es minimización de dato. El
--     dato completo deja de salir de la base por esta RPC.
--   · Si algún cliente futuro necesitara la cédula completa del ganador,
--     tendría que ser con una RPC distinta y justificada (decisión, no resta).
--
-- PENDIENTE EN ESTA MISMA MIGRACIÓN (se enmascaran al llegar sus
--   pg_get_functiondef):
--   · f_admin_listar_aliados
--   · f_admin_ver_concursos_aliado
--   · f_puerta_personas_de_lista
--   · f_puerta_cortesia_lista
--   Estas RPC seguirán el mismo helper f_cedula_mascara.
--
-- NO SE ENMASCARAN (a propósito, verificado en código):
--   · f_puerta_vendedor_por_qr, f_puerta_cortesia_individual,
--     f_puerta_premiacion_por_qr: el operador de puerta COMPARA la cédula
--     con el documento físico (js/puerta.js:673, 876, 959); enmascararla
--     rompería la verificación en el día del evento.
--   · f_link_stand_ver: el stand usa la cédula completa para DEDUPLICAR
--     entradas (js/stand.js:231).
--
-- El servidor (esta migración) es la seguridad real; el cliente
-- (js/aliado.js, config.js cedulaMascara) solo pinta un dato que ya llega
-- enmascarado desde la RPC.

begin;

-- 1) Helper de enmascarado (interna, no es RPC).
CREATE OR REPLACE FUNCTION public.f_cedula_mascara(p_cedula text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 STRICT
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select case
    when length(p_cedula) <= 5 then repeat('•', length(p_cedula))
    else left(p_cedula, 3) || '•••' || right(p_cedula, 2)
  end;
$function$;

revoke all on function public.f_cedula_mascara(text) from public, anon, authenticated;

-- 2) f_aliado_ver: copia LITERAL de producción (pg_get_functiondef) con solo
--    los dos cambios marcados con "-- P1-03 unidad 1b".
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
      'estado', v_asi.estado,
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
        'creada_at', ac.creada_at,
        'cerrada_at', ac.cerrada_at,
        'ganador', (
          SELECT jsonb_build_object(
            'codigo_link', c.codigo_link,
            'codigo_qr', cp.codigo_qr,
            'nombre', cp.nombre,
            'apellido', cp.apellido,
            -- P1-03 unidad 1b: cédula enmascarada en el servidor.
            'cedula', public.f_cedula_mascara(cp.cedula),
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
        AND NOT EXISTS (
          SELECT 1 FROM cortesias c
          WHERE c.concurso_id = ac.id
            AND (
              (c.dia1 = true AND c.dia2 = false AND v_dia1_cerrado = true)
              OR (c.dia1 = false AND c.dia2 = true AND v_dia2_cerrado = true)
              OR (c.dia1 = true AND c.dia2 = true AND v_dia1_cerrado = true AND v_dia2_cerrado = true)
            )
        )
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
