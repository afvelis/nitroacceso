-- =============================================================================
-- 0007_p1_01_atomicidad_cupones.sql
-- Tarea: P1-01 · Escaneos atómicos, cupones y cédulas duplicadas (fase 1)
-- Fecha: 2026-11-20
--
-- QUÉ HACE
--   1. Bloquea la fila del padre (aliado_asignaciones / aliado_concursos)
--      antes de decidir, en las RPC que hacían "leer -> calcular -> escribir"
--      sin bloqueo.
--   2. Vuelve condicional el canje de premiación: dos puertas no pueden
--      canjear el mismo premio.
--   3. Añade CHECK para que los contadores de cupones no queden negativos ni
--      por encima del total.
--   4. Bloquea también la edición admin de una cortesía de premiación, que era
--      el último escritor capaz de violar el CHECK por carrera.
--
-- QUÉ NO HACE, A PROPÓSITO
--   - NO cambia ninguna firma de función: cero riesgo de PGRST202/PGRST203
--     (incidente del 2026-11-20 con f_login).
--   - NO cambia ningún valor de retorno: el contrato de F-8 (el segundo
--     escaneo devuelve true como éxito idempotente) queda intacto.
--   - NO toca f_puerta_marcar_vendedor / _cortesia / _persona: solo escriben
--     una bandera de estado, no un contador, y bajo READ COMMITTED no hay
--     actualización perdida.
--   - NO añade ledger ni detección global de cédulas duplicadas: eso es la
--     0008.
--
-- RESPALDO
--   Definiciones anteriores capturadas con pg_get_functiondef en staging:
--   docs/sql/p1-01-definiciones-antes-2026-11-20.sql
--
-- ORDEN OBLIGATORIO DE DESPLIEGUE
--   1. Aplicar SOLO en staging (adoqujnnnrlgmvwbnwbl).
--   2. Correr la batería de concurrencia de P1-01.
--   3. Solo después, aplicar en producción.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Restricciones de integridad en cortesias
--
-- Se añaden como NOT VALID y se validan después dentro de la misma
-- transacción: si un dato histórico viola la regla, la migración aborta
-- entera con un error que nombra la restricción exacta, en vez de dejar la
-- base a medias. No se pierde nada: al abortar, todo se revierte.
-- -----------------------------------------------------------------------------

alter table public.cortesias
  add constraint cortesias_cupones_total_no_negativo
  check (cupones_total >= 0) not valid;

alter table public.cortesias
  add constraint cortesias_cupones_consumidos_no_negativo
  check (cupones_consumidos >= 0) not valid;

alter table public.cortesias
  add constraint cortesias_cupones_consumidos_no_excede_total
  check (cupones_consumidos <= cupones_total) not valid;

alter table public.cortesias validate constraint cortesias_cupones_total_no_negativo;
alter table public.cortesias validate constraint cortesias_cupones_consumidos_no_negativo;
alter table public.cortesias validate constraint cortesias_cupones_consumidos_no_excede_total;

-- -----------------------------------------------------------------------------
-- 2. f_puerta_canjear_premiacion
--    Canje condicional: el UPDATE solo aplica si el premio sigue sin canjear.
--    Se conserva la comprobación previa para no cambiar el orden de errores
--    que ya conoce la puerta (ERR_ANULADA antes que ERR_USADA).
-- -----------------------------------------------------------------------------

create or replace function public.f_puerta_canjear_premiacion(p_token uuid, p_codigo_qr text, p_cupones_usados integer)
 returns text
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_cortesia cortesias%rowtype;
  v_persona cortesia_personas%rowtype;
  v_dia_activo int;
  v_canje_id uuid;
begin
  if public.f_sesion_ok(p_token, 'puerta') is not true then return null; end if;

  select * into v_persona from cortesia_personas where codigo_qr = p_codigo_qr;
  if not found then return 'ERR_NO_EXISTE'; end if;

  -- P1-01: FOR UPDATE fija estado, canjeado_at y cupones_total durante toda la
  -- transacción. Sin esto, f_admin_editar_cortesia_premiacion puede bajar
  -- cupones_total entre la lectura y el UPDATE y disparar el CHECK
  -- cortesias_cupones_consumidos_no_excede_total (error 23514 en la puerta).
  select * into v_cortesia from cortesias where id = v_persona.cortesia_id and tipo = 'premiacion' for update;
  if not found then return 'ERR_NO_EXISTE'; end if;

  if v_cortesia.estado = 'anulada' then return 'ERR_ANULADA'; end if;
  if v_cortesia.canjeado_at is not null then return 'ERR_USADA'; end if;

  select dia_activo into v_dia_activo from config where id = 1;
  if v_dia_activo is null then return 'ERR_CONFIG'; end if;

  if (v_dia_activo = 1 and not v_cortesia.dia1) or (v_dia_activo = 2 and not v_cortesia.dia2) then
    return 'ERR_DIA';
  end if;

  if p_cupones_usados is null or p_cupones_usados < 1 then return 'ERR_DATOS'; end if;
  if p_cupones_usados > v_cortesia.cupones_total then return 'ERR_DATOS'; end if;

  -- P1-01: canje atómico. Si otra puerta canjeó este premio entre la lectura
  -- de arriba y este UPDATE, la fila ya no cumple "canjeado_at is null":
  -- no se actualiza y devolvemos ERR_USADA en vez de canjear dos veces.
  update cortesias set
    cupones_consumidos = p_cupones_usados,
    canjeado_at = now(),
    canjeado_dia = v_dia_activo
  where id = v_cortesia.id
    and canjeado_at is null
  returning id into v_canje_id;

  if v_canje_id is null then return 'ERR_USADA'; end if;

  update cortesia_personas set
    estado_dia1 = case when v_dia_activo = 1 then 'autorizado' else estado_dia1 end,
    estado_dia2 = case when v_dia_activo = 2 then 'autorizado' else estado_dia2 end,
    marcado_dia1_at = case when v_dia_activo = 1 then now() else marcado_dia1_at end,
    marcado_dia2_at = case when v_dia_activo = 2 then now() else marcado_dia2_at end
  where id = v_persona.id;

  return 'ok';
end;
$function$;

-- -----------------------------------------------------------------------------
-- 3. f_aliado_crear_concurso
--    Bloquea la asignación antes de sumar los cupones ya reservados, para que
--    dos concursos simultáneos no sumen por encima del pool.
-- -----------------------------------------------------------------------------

create or replace function public.f_aliado_crear_concurso(p_codigo_link text, p_nombre text, p_descripcion text, p_fecha_concurso date, p_cupones_reservados integer)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_asi record;
  v_ali record;
  v_reservados int;
  v_concurso_id uuid;
begin
  -- P1-01: FOR UPDATE serializa crear/editar sobre la misma asignación.
  select * into v_asi from aliado_asignaciones where codigo_link = p_codigo_link for update;
  if v_asi is null then return jsonb_build_object('error','ERR_LINK'); end if;
  if v_asi.estado <> 'activa' then return jsonb_build_object('error','ERR_ANULADA'); end if;
  select * into v_ali from aliados where id = v_asi.aliado_id;
  if not v_ali.activo then return jsonb_build_object('error','ERR_ALIADO_ANULADO'); end if;

  if p_nombre is null or trim(p_nombre) = '' then return jsonb_build_object('error','ERR_NOMBRE'); end if;
  if p_fecha_concurso is null then return jsonb_build_object('error','ERR_FECHA_REQUERIDA'); end if;
  if p_fecha_concurso < current_date then return jsonb_build_object('error','ERR_FECHA_PASADA'); end if;
  if p_cupones_reservados is null or p_cupones_reservados < 1 then return jsonb_build_object('error','ERR_CUPONES'); end if;

  select coalesce(sum(cupones_reservados),0) into v_reservados
    from aliado_concursos where asignacion_id = v_asi.id;

  if (v_reservados + p_cupones_reservados) > v_asi.cupones_unico then
    return jsonb_build_object('error','ERR_SIN_CUPONES','disponible', v_asi.cupones_unico - v_reservados);
  end if;

  insert into aliado_concursos (asignacion_id, nombre, descripcion, fecha_concurso, cupones_reservados, estado)
  values (v_asi.id, trim(p_nombre), nullif(trim(p_descripcion),''), p_fecha_concurso, p_cupones_reservados, 'abierto')
  returning id into v_concurso_id;

  return jsonb_build_object('ok', true, 'concurso_id', v_concurso_id);
end;
$function$;

-- -----------------------------------------------------------------------------
-- 4. f_aliado_editar_concurso
--    Mismo bloqueo, más el mismo cálculo de "otros" que ya hacía.
-- -----------------------------------------------------------------------------

create or replace function public.f_aliado_editar_concurso(p_codigo_link text, p_concurso_id uuid, p_nombre text, p_descripcion text, p_fecha_concurso date, p_cupones_reservados integer)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_asi record;
  v_con record;
  v_otros int;
begin
  -- P1-01: FOR UPDATE, mismo orden de bloqueo que crear_concurso.
  select * into v_asi from aliado_asignaciones where codigo_link = p_codigo_link for update;
  if v_asi is null or v_asi.estado <> 'activa' then return jsonb_build_object('error','ERR_LINK'); end if;

  select * into v_con from aliado_concursos where id = p_concurso_id and asignacion_id = v_asi.id;
  if v_con is null then return jsonb_build_object('error','ERR_CONCURSO_NO_EXISTE'); end if;
  if v_con.estado <> 'abierto' then return jsonb_build_object('error','ERR_CONCURSO_CERRADO'); end if;

  if p_nombre is null or trim(p_nombre) = '' then return jsonb_build_object('error','ERR_NOMBRE'); end if;
  if p_fecha_concurso is null then return jsonb_build_object('error','ERR_FECHA_REQUERIDA'); end if;
  if p_fecha_concurso < current_date then return jsonb_build_object('error','ERR_FECHA_PASADA'); end if;
  if p_cupones_reservados is null or p_cupones_reservados < 1 then return jsonb_build_object('error','ERR_CUPONES'); end if;

  select coalesce(sum(cupones_reservados),0) into v_otros
    from aliado_concursos where asignacion_id = v_asi.id and id <> p_concurso_id;

  if (v_otros + p_cupones_reservados) > v_asi.cupones_unico then
    return jsonb_build_object('error','ERR_SIN_CUPONES','disponible', v_asi.cupones_unico - v_otros);
  end if;

  update aliado_concursos
     set nombre = trim(p_nombre),
         descripcion = nullif(trim(p_descripcion),''),
         fecha_concurso = p_fecha_concurso,
         cupones_reservados = p_cupones_reservados
   where id = p_concurso_id;

  return jsonb_build_object('ok', true);
end;
$function$;

-- -----------------------------------------------------------------------------
-- 5. f_aliado_asignar_ganador
--    Bloquea la asignación y LUEGO el concurso (siempre en ese orden, igual
--    que crear/editar, para no provocar interbloqueos). Al soltar el bloqueo,
--    la relectura ve estado='cerrado' y el segundo intento recibe
--    ERR_CONCURSO_CERRADO en vez de crear un segundo premio.
-- -----------------------------------------------------------------------------

create or replace function public.f_aliado_asignar_ganador(p_codigo_link text, p_concurso_id uuid, p_nombre text, p_apellido text, p_cedula text, p_correo text, p_telefono text, p_cupones_total integer, p_dia1 boolean, p_dia2 boolean)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_asi record;
  v_ali record;
  v_con record;
  v_cortesia_id uuid;
  v_persona_id uuid;
  v_codigo_cor text;
  v_codigo_pr text;
  v_intento int;
begin
  -- P1-01: orden de bloqueo fijo: asignación -> concurso.
  select * into v_asi from aliado_asignaciones where codigo_link = p_codigo_link for update;
  if v_asi is null or v_asi.estado <> 'activa' then return jsonb_build_object('error','ERR_LINK'); end if;
  select * into v_ali from aliados where id = v_asi.aliado_id;
  if not v_ali.activo then return jsonb_build_object('error','ERR_ALIADO_ANULADO'); end if;

  select * into v_con from aliado_concursos where id = p_concurso_id and asignacion_id = v_asi.id for update;
  if v_con is null then return jsonb_build_object('error','ERR_CONCURSO_NO_EXISTE'); end if;
  if v_con.estado <> 'abierto' then return jsonb_build_object('error','ERR_CONCURSO_CERRADO'); end if;

  if p_nombre is null or trim(p_nombre) = '' then return jsonb_build_object('error','ERR_NOMBRE'); end if;
  if p_apellido is null or trim(p_apellido) = '' then return jsonb_build_object('error','ERR_APELLIDO'); end if;
  if p_cedula is null or trim(p_cedula) = '' then return jsonb_build_object('error','ERR_CEDULA'); end if;
  if p_cupones_total is null or p_cupones_total < 1 then return jsonb_build_object('error','ERR_CUPONES'); end if;
  if p_cupones_total > v_con.cupones_reservados then
    return jsonb_build_object('error','ERR_CUPONES_MAYOR_RESERVA','reservados', v_con.cupones_reservados);
  end if;
  if not (coalesce(p_dia1,false) or coalesce(p_dia2,false)) then return jsonb_build_object('error','ERR_DIAS'); end if;

  v_intento := 0;
  loop
    v_intento := v_intento + 1;
    v_codigo_cor := f_codigo('COR-', 8);
    exit when not exists (select 1 from cortesias where codigo_link = v_codigo_cor);
    if v_intento >= 10 then return jsonb_build_object('error','ERR_CODIGO'); end if;
  end loop;

  insert into cortesias (
    tipo, razon, dia1, dia2, codigo_link, estado,
    concurso, aliado, cupones_total, cupones_consumidos,
    aliado_id, asignacion_id, concurso_id, origen
  ) values (
    'premiacion', 'premio', coalesce(p_dia1,false), coalesce(p_dia2,false),
    v_codigo_cor, 'activa',
    v_con.nombre, v_ali.nombre_organizacion, p_cupones_total, 0,
    v_ali.id, v_asi.id, v_con.id, 'aliado'
  ) returning id into v_cortesia_id;

  v_intento := 0;
  loop
    v_intento := v_intento + 1;
    v_codigo_pr := f_codigo('PR-', 8);
    exit when not exists (select 1 from cortesia_personas where codigo_qr = v_codigo_pr);
    if v_intento >= 10 then return jsonb_build_object('error','ERR_CODIGO'); end if;
  end loop;

  insert into cortesia_personas (
    cortesia_id, lista_id, nombre, apellido, cedula, codigo_qr, estado, correo, telefono
  ) values (
    v_cortesia_id, null, trim(p_nombre), trim(p_apellido), trim(p_cedula), v_codigo_pr, 'pendiente',
    nullif(trim(p_correo),''), nullif(trim(p_telefono),'')
  ) returning id into v_persona_id;

  update aliado_concursos set estado = 'cerrado', cerrada_at = now() where id = v_con.id;

  return jsonb_build_object(
    'ok', true,
    'codigo_link', v_codigo_cor,
    'codigo_qr', v_codigo_pr,
    'cortesia_id', v_cortesia_id
  );
end;
$function$;

-- -----------------------------------------------------------------------------
-- 6. f_admin_ampliar_cupones
--    Bloquea la asignación antes de leer el total. Además, el incremento pasa
--    a ser relativo (cupones_unico = cupones_unico + n) en el pool único, como
--    ya lo era para los pools por día.
-- -----------------------------------------------------------------------------

create or replace function public.f_admin_ampliar_cupones(p_token uuid, p_asignacion_id uuid, p_cupones_unico integer, p_cupones_dia1 integer, p_cupones_dia2 integer, p_motivo text, p_motivo_detalle text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_pool_tipo text;
  v_cupones_antes int;
  v_cupones_despues int;
begin
  if public.f_sesion_ok(p_token, 'admin') is not true then
    return jsonb_build_object('error','ERR_SESION');
  end if;

  -- P1-01: FOR UPDATE para que dos ampliaciones simultáneas no se pisen.
  select pool_tipo,
         case when pool_tipo='unico' then cupones_unico else (cupones_dia1 + cupones_dia2) end
    into v_pool_tipo, v_cupones_antes
    from aliado_asignaciones where id = p_asignacion_id for update;
  if v_pool_tipo is null then
    return jsonb_build_object('error','ERR_ASIG_NO_EXISTE');
  end if;

  if p_motivo is null or trim(p_motivo) = '' then
    return jsonb_build_object('error','ERR_MOTIVO');
  end if;

  if v_pool_tipo = 'unico' then
    if p_cupones_unico is null or p_cupones_unico < 1 then
      return jsonb_build_object('error','ERR_CUPONES');
    end if;
    v_cupones_despues := v_cupones_antes + p_cupones_unico;
    update aliado_asignaciones
       set cupones_unico = cupones_unico + p_cupones_unico
     where id = p_asignacion_id;
  else
    if p_cupones_dia1 is null or p_cupones_dia1 < 0 or p_cupones_dia2 is null or p_cupones_dia2 < 0 then
      return jsonb_build_object('error','ERR_CUPONES');
    end if;
    if p_cupones_dia1 + p_cupones_dia2 < 1 then
      return jsonb_build_object('error','ERR_CUPONES');
    end if;
    v_cupones_despues := v_cupones_antes + p_cupones_dia1 + p_cupones_dia2;
    update aliado_asignaciones
       set cupones_dia1 = cupones_dia1 + p_cupones_dia1,
           cupones_dia2 = cupones_dia2 + p_cupones_dia2
     where id = p_asignacion_id;
  end if;

  insert into aliado_ampliaciones (asignacion_id, cupones_antes, cupones_despues, motivo, motivo_detalle)
  values (p_asignacion_id, v_cupones_antes, v_cupones_despues, trim(p_motivo), nullif(trim(p_motivo_detalle),''));

  return jsonb_build_object('ok', true, 'cupones_antes', v_cupones_antes, 'cupones_despues', v_cupones_despues);
end;
$function$;

-- -----------------------------------------------------------------------------
-- 7. f_admin_editar_cortesia_premiacion
--    Último escritor sin bloqueo de cupones_total. Sin este FOR UPDATE, bajar
--    el total mientras la puerta canjea puede dejar cupones_consumidos por
--    encima de cupones_total y abortar con 23514. Con el bloqueo, si el canje
--    llegó primero se ve canjeado_at escrito y se devuelve ERR_USADA.
-- -----------------------------------------------------------------------------

create or replace function public.f_admin_editar_cortesia_premiacion(p_token uuid, p_codigo_link text, p_nombre text, p_apellido text, p_cedula text, p_concurso text, p_cupones_total integer, p_aliado text)
 returns text
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_cortesia cortesias%rowtype;
begin
  if public.f_sesion_ok(p_token, 'admin') is not true then return null; end if;

  -- P1-01: mismo bloqueo y mismo orden que el canje de puerta.
  select * into v_cortesia from cortesias where codigo_link = p_codigo_link and tipo='premiacion' for update;
  if not found then return 'ERR_NO_EXISTE'; end if;
  if v_cortesia.estado = 'anulada' then return 'ERR_ANULADA'; end if;
  if v_cortesia.canjeado_at is not null then return 'ERR_USADA'; end if;

  if p_nombre is null or trim(p_nombre)='' then return 'ERR_DATOS'; end if;
  if p_apellido is null or trim(p_apellido)='' then return 'ERR_DATOS'; end if;
  if p_cedula is null or trim(p_cedula)='' then return 'ERR_DATOS'; end if;
  if p_concurso is null or trim(p_concurso)='' then return 'ERR_DATOS'; end if;
  if p_cupones_total is null or p_cupones_total < 1 then return 'ERR_DATOS'; end if;
  if p_aliado is null or trim(p_aliado)='' then return 'ERR_DATOS'; end if;

  update cortesias set
    concurso = trim(p_concurso),
    cupones_total = p_cupones_total,
    aliado = trim(p_aliado)
  where id = v_cortesia.id;

  update cortesia_personas set
    nombre = trim(p_nombre),
    apellido = trim(p_apellido),
    cedula = trim(p_cedula)
  where cortesia_id = v_cortesia.id and lista_id is null;

  return 'ok';
end;
$function$;

commit;
