-- =============================================================================
-- Respaldo de definiciones previas a la migracion 0007 (P1-01, fase 1)
--
-- Capturado con pg_get_functiondef en el proyecto de STAGING
-- (adoqujnnnrlgmvwbnwbl) el 2026-11-20, ANTES de aplicar la 0007.
-- Obligatorio segun DECISIONES.md:329: toda migracion que reemplace una RPC
-- deja aqui la definicion anterior EXACTA.
--
-- Contiene SOLO las 5 funciones que la 0007 reemplaza. Las otras 3 del
-- relevamiento (f_puerta_marcar_vendedor, _cortesia, _persona) NO se tocan.
--
-- Para restaurar una: copiar su bloque completo en el SQL Editor y ejecutar.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1/5  f_puerta_canjear_premiacion(uuid, text, integer)
--      Estado anterior: comprobaba canjeado_at y luego actualizaba sin
--      condicion (carrera: dos puertas podian canjear el mismo premio).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_puerta_canjear_premiacion(p_token uuid, p_codigo_qr text, p_cupones_usados integer)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_cortesia cortesias%ROWTYPE;
  v_persona cortesia_personas%ROWTYPE;
  v_dia_activo int;
BEGIN
  IF public.f_sesion_ok(p_token, 'puerta') IS NOT TRUE THEN RETURN NULL; END IF;

  SELECT * INTO v_persona FROM cortesia_personas WHERE codigo_qr = p_codigo_qr;
  IF NOT FOUND THEN RETURN 'ERR_NO_EXISTE'; END IF;

  SELECT * INTO v_cortesia FROM cortesias WHERE id = v_persona.cortesia_id AND tipo = 'premiacion';
  IF NOT FOUND THEN RETURN 'ERR_NO_EXISTE'; END IF;

  IF v_cortesia.estado = 'anulada' THEN RETURN 'ERR_ANULADA'; END IF;
  IF v_cortesia.canjeado_at IS NOT NULL THEN RETURN 'ERR_USADA'; END IF;

  SELECT dia_activo INTO v_dia_activo FROM config WHERE id = 1;
  IF v_dia_activo IS NULL THEN RETURN 'ERR_CONFIG'; END IF;

  IF (v_dia_activo = 1 AND NOT v_cortesia.dia1) OR (v_dia_activo = 2 AND NOT v_cortesia.dia2) THEN
    RETURN 'ERR_DIA';
  END IF;

  IF p_cupones_usados IS NULL OR p_cupones_usados < 1 THEN RETURN 'ERR_DATOS'; END IF;
  IF p_cupones_usados > v_cortesia.cupones_total THEN RETURN 'ERR_DATOS'; END IF;

  UPDATE cortesias SET
    cupones_consumidos = p_cupones_usados,
    canjeado_at = now(),
    canjeado_dia = v_dia_activo
  WHERE id = v_cortesia.id;

  UPDATE cortesia_personas SET
    estado_dia1 = CASE WHEN v_dia_activo = 1 THEN 'autorizado' ELSE estado_dia1 END,
    estado_dia2 = CASE WHEN v_dia_activo = 2 THEN 'autorizado' ELSE estado_dia2 END,
    marcado_dia1_at = CASE WHEN v_dia_activo = 1 THEN now() ELSE marcado_dia1_at END,
    marcado_dia2_at = CASE WHEN v_dia_activo = 2 THEN now() ELSE marcado_dia2_at END
  WHERE id = v_persona.id;

  RETURN 'ok';
END;
$function$
;

-- -----------------------------------------------------------------------------
-- 2/5  f_aliado_crear_concurso(text, text, text, date, integer)
--      Estado anterior: sumaba cupones reservados y luego insertaba, sin
--      bloquear la asignacion (carrera: sobreventa de cupones).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_aliado_crear_concurso(p_codigo_link text, p_nombre text, p_descripcion text, p_fecha_concurso date, p_cupones_reservados integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_asi RECORD;
  v_ali RECORD;
  v_reservados int;
  v_concurso_id uuid;
BEGIN
  SELECT * INTO v_asi FROM aliado_asignaciones WHERE codigo_link = p_codigo_link;
  IF v_asi IS NULL THEN RETURN jsonb_build_object('error','ERR_LINK'); END IF;
  IF v_asi.estado <> 'activa' THEN RETURN jsonb_build_object('error','ERR_ANULADA'); END IF;
  SELECT * INTO v_ali FROM aliados WHERE id = v_asi.aliado_id;
  IF NOT v_ali.activo THEN RETURN jsonb_build_object('error','ERR_ALIADO_ANULADO'); END IF;

  IF p_nombre IS NULL OR trim(p_nombre) = '' THEN RETURN jsonb_build_object('error','ERR_NOMBRE'); END IF;
  IF p_fecha_concurso IS NULL THEN RETURN jsonb_build_object('error','ERR_FECHA_REQUERIDA'); END IF;
  IF p_fecha_concurso < CURRENT_DATE THEN RETURN jsonb_build_object('error','ERR_FECHA_PASADA'); END IF;
  IF p_cupones_reservados IS NULL OR p_cupones_reservados < 1 THEN RETURN jsonb_build_object('error','ERR_CUPONES'); END IF;

  SELECT COALESCE(SUM(cupones_reservados),0) INTO v_reservados
    FROM aliado_concursos WHERE asignacion_id = v_asi.id;

  IF (v_reservados + p_cupones_reservados) > v_asi.cupones_unico THEN
    RETURN jsonb_build_object('error','ERR_SIN_CUPONES','disponible', v_asi.cupones_unico - v_reservados);
  END IF;

  INSERT INTO aliado_concursos (asignacion_id, nombre, descripcion, fecha_concurso, cupones_reservados, estado)
  VALUES (v_asi.id, trim(p_nombre), NULLIF(trim(p_descripcion),''), p_fecha_concurso, p_cupones_reservados, 'abierto')
  RETURNING id INTO v_concurso_id;

  RETURN jsonb_build_object('ok', true, 'concurso_id', v_concurso_id);
END;
$function$
;

-- -----------------------------------------------------------------------------
-- 3/5  f_aliado_editar_concurso(text, uuid, text, text, date, integer)
--      Estado anterior: igual que crear, sin bloqueo de la asignacion.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_aliado_editar_concurso(p_codigo_link text, p_concurso_id uuid, p_nombre text, p_descripcion text, p_fecha_concurso date, p_cupones_reservados integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_asi RECORD;
  v_con RECORD;
  v_otros int;
BEGIN
  SELECT * INTO v_asi FROM aliado_asignaciones WHERE codigo_link = p_codigo_link;
  IF v_asi IS NULL OR v_asi.estado <> 'activa' THEN RETURN jsonb_build_object('error','ERR_LINK'); END IF;

  SELECT * INTO v_con FROM aliado_concursos WHERE id = p_concurso_id AND asignacion_id = v_asi.id;
  IF v_con IS NULL THEN RETURN jsonb_build_object('error','ERR_CONCURSO_NO_EXISTE'); END IF;
  IF v_con.estado <> 'abierto' THEN RETURN jsonb_build_object('error','ERR_CONCURSO_CERRADO'); END IF;

  IF p_nombre IS NULL OR trim(p_nombre) = '' THEN RETURN jsonb_build_object('error','ERR_NOMBRE'); END IF;
  IF p_fecha_concurso IS NULL THEN RETURN jsonb_build_object('error','ERR_FECHA_REQUERIDA'); END IF;
  IF p_fecha_concurso < CURRENT_DATE THEN RETURN jsonb_build_object('error','ERR_FECHA_PASADA'); END IF;
  IF p_cupones_reservados IS NULL OR p_cupones_reservados < 1 THEN RETURN jsonb_build_object('error','ERR_CUPONES'); END IF;

  SELECT COALESCE(SUM(cupones_reservados),0) INTO v_otros
    FROM aliado_concursos WHERE asignacion_id = v_asi.id AND id <> p_concurso_id;

  IF (v_otros + p_cupones_reservados) > v_asi.cupones_unico THEN
    RETURN jsonb_build_object('error','ERR_SIN_CUPONES','disponible', v_asi.cupones_unico - v_otros);
  END IF;

  UPDATE aliado_concursos
     SET nombre = trim(p_nombre),
         descripcion = NULLIF(trim(p_descripcion),''),
         fecha_concurso = p_fecha_concurso,
         cupones_reservados = p_cupones_reservados
   WHERE id = p_concurso_id;

  RETURN jsonb_build_object('ok', true);
END;
$function$
;

-- -----------------------------------------------------------------------------
-- 4/5  f_aliado_asignar_ganador(text, uuid, text, text, text, text, text,
--                              integer, boolean, boolean)
--      Estado anterior: leia el concurso 'abierto', creaba el premio y lo
--      cerraba despues, sin bloqueo (carrera: dos premios para un concurso).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_aliado_asignar_ganador(p_codigo_link text, p_concurso_id uuid, p_nombre text, p_apellido text, p_cedula text, p_correo text, p_telefono text, p_cupones_total integer, p_dia1 boolean, p_dia2 boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_asi RECORD;
  v_ali RECORD;
  v_con RECORD;
  v_cortesia_id uuid;
  v_persona_id uuid;
  v_codigo_cor text;
  v_codigo_pr text;
  v_intento int;
BEGIN
  SELECT * INTO v_asi FROM aliado_asignaciones WHERE codigo_link = p_codigo_link;
  IF v_asi IS NULL OR v_asi.estado <> 'activa' THEN RETURN jsonb_build_object('error','ERR_LINK'); END IF;
  SELECT * INTO v_ali FROM aliados WHERE id = v_asi.aliado_id;
  IF NOT v_ali.activo THEN RETURN jsonb_build_object('error','ERR_ALIADO_ANULADO'); END IF;

  SELECT * INTO v_con FROM aliado_concursos WHERE id = p_concurso_id AND asignacion_id = v_asi.id;
  IF v_con IS NULL THEN RETURN jsonb_build_object('error','ERR_CONCURSO_NO_EXISTE'); END IF;
  IF v_con.estado <> 'abierto' THEN RETURN jsonb_build_object('error','ERR_CONCURSO_CERRADO'); END IF;

  IF p_nombre IS NULL OR trim(p_nombre) = '' THEN RETURN jsonb_build_object('error','ERR_NOMBRE'); END IF;
  IF p_apellido IS NULL OR trim(p_apellido) = '' THEN RETURN jsonb_build_object('error','ERR_APELLIDO'); END IF;
  IF p_cedula IS NULL OR trim(p_cedula) = '' THEN RETURN jsonb_build_object('error','ERR_CEDULA'); END IF;
  IF p_cupones_total IS NULL OR p_cupones_total < 1 THEN RETURN jsonb_build_object('error','ERR_CUPONES'); END IF;
  IF p_cupones_total > v_con.cupones_reservados THEN
    RETURN jsonb_build_object('error','ERR_CUPONES_MAYOR_RESERVA','reservados', v_con.cupones_reservados);
  END IF;
  IF NOT (COALESCE(p_dia1,false) OR COALESCE(p_dia2,false)) THEN RETURN jsonb_build_object('error','ERR_DIAS'); END IF;

  v_intento := 0;
  LOOP
    v_intento := v_intento + 1;
    v_codigo_cor := f_codigo('COR-', 8);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM cortesias WHERE codigo_link = v_codigo_cor);
    IF v_intento >= 10 THEN RETURN jsonb_build_object('error','ERR_CODIGO'); END IF;
  END LOOP;

  INSERT INTO cortesias (
    tipo, razon, dia1, dia2, codigo_link, estado,
    concurso, aliado, cupones_total, cupones_consumidos,
    aliado_id, asignacion_id, concurso_id, origen
  ) VALUES (
    'premiacion', 'premio', COALESCE(p_dia1,false), COALESCE(p_dia2,false),
    v_codigo_cor, 'activa',
    v_con.nombre, v_ali.nombre_organizacion, p_cupones_total, 0,
    v_ali.id, v_asi.id, v_con.id, 'aliado'
  ) RETURNING id INTO v_cortesia_id;

  v_intento := 0;
  LOOP
    v_intento := v_intento + 1;
    v_codigo_pr := f_codigo('PR-', 8);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM cortesia_personas WHERE codigo_qr = v_codigo_pr);
    IF v_intento >= 10 THEN RETURN jsonb_build_object('error','ERR_CODIGO'); END IF;
  END LOOP;

  INSERT INTO cortesia_personas (
    cortesia_id, lista_id, nombre, apellido, cedula, codigo_qr, estado, correo, telefono
  ) VALUES (
    v_cortesia_id, NULL, trim(p_nombre), trim(p_apellido), trim(p_cedula), v_codigo_pr, 'pendiente',
    NULLIF(trim(p_correo),''), NULLIF(trim(p_telefono),'')
  ) RETURNING id INTO v_persona_id;

  UPDATE aliado_concursos SET estado = 'cerrado', cerrada_at = now() WHERE id = v_con.id;

  RETURN jsonb_build_object(
    'ok', true,
    'codigo_link', v_codigo_cor,
    'codigo_qr', v_codigo_pr,
    'cortesia_id', v_cortesia_id
  );
END;
$function$
;

-- -----------------------------------------------------------------------------
-- 5/5  f_admin_ampliar_cupones(uuid, uuid, integer, integer, integer,
--                              text, text)
--      Estado anterior: leia el total y escribia un total calculado, sin
--      bloqueo (carrera: ampliacion perdida).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_admin_ampliar_cupones(p_token uuid, p_asignacion_id uuid, p_cupones_unico integer, p_cupones_dia1 integer, p_cupones_dia2 integer, p_motivo text, p_motivo_detalle text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_pool_tipo text;
  v_cupones_antes int;
  v_cupones_despues int;
BEGIN
  IF public.f_sesion_ok(p_token, 'admin') IS NOT TRUE THEN
    RETURN jsonb_build_object('error','ERR_SESION');
  END IF;

  SELECT pool_tipo,
         CASE WHEN pool_tipo='unico' THEN cupones_unico ELSE (cupones_dia1 + cupones_dia2) END
    INTO v_pool_tipo, v_cupones_antes
    FROM aliado_asignaciones WHERE id = p_asignacion_id;
  IF v_pool_tipo IS NULL THEN
    RETURN jsonb_build_object('error','ERR_ASIG_NO_EXISTE');
  END IF;

  IF p_motivo IS NULL OR trim(p_motivo) = '' THEN
    RETURN jsonb_build_object('error','ERR_MOTIVO');
  END IF;

  IF v_pool_tipo = 'unico' THEN
    IF p_cupones_unico IS NULL OR p_cupones_unico < 1 THEN
      RETURN jsonb_build_object('error','ERR_CUPONES');
    END IF;
    v_cupones_despues := v_cupones_antes + p_cupones_unico;
    UPDATE aliado_asignaciones SET cupones_unico = v_cupones_despues WHERE id = p_asignacion_id;
  ELSE
    IF p_cupones_dia1 IS NULL OR p_cupones_dia1 < 0 OR p_cupones_dia2 IS NULL OR p_cupones_dia2 < 0 THEN
      RETURN jsonb_build_object('error','ERR_CUPONES');
    END IF;
    IF p_cupones_dia1 + p_cupones_dia2 < 1 THEN
      RETURN jsonb_build_object('error','ERR_CUPONES');
    END IF;
    v_cupones_despues := v_cupones_antes + p_cupones_dia1 + p_cupones_dia2;
    UPDATE aliado_asignaciones
       SET cupones_dia1 = cupones_dia1 + p_cupones_dia1,
           cupones_dia2 = cupones_dia2 + p_cupones_dia2
     WHERE id = p_asignacion_id;
  END IF;

  INSERT INTO aliado_ampliaciones (asignacion_id, cupones_antes, cupones_despues, motivo, motivo_detalle)
  VALUES (p_asignacion_id, v_cupones_antes, v_cupones_despues, trim(p_motivo), NULLIF(trim(p_motivo_detalle),''));

  RETURN jsonb_build_object('ok', true, 'cupones_antes', v_cupones_antes, 'cupones_despues', v_cupones_despues);
END;
$function$
;
