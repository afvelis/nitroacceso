-- 0011_p1_02_revalidacion_estado_puerta.sql
-- Proyecto: NitroSystem (control de acceso) · Tarea: P1-02 fase 2 (criterios 3 y 4)
-- Referencia: tareas/P1-02-roles-estado-puerta.md:47-48
--
-- POR QUÉ (criterios 3 y 4 de la tarea):
--   Criterio 3 — “Si el evento está en edición, toda autorización falla aunque
--   la pestaña se haya cargado antes.” Hasta hoy las tres RPC de marcar
--   ($funciones$ abajo) validaban solo el rol y el formato de los parámetros:
--   un token de puerta con pestaña vieja seguía autorizando si el admin
--   reabría la edición desde otro equipo.
--   Criterio 4 — “Si el día activo cambió, una puerta con estado viejo no puede
--   autorizar en el día equivocado.” f_puerta_marcar_persona ni siquiera sabe
--   de días: autorizaba la persona de una lista del Día 1 aunque la puerta ya
--   hubiera pasado al Día 2.
--
-- ARREGLO: en las tres funciones se relee `config` en el momento de la
-- mutación (una sola consulta) y se rechaza ANTES de cualquier UPDATE:
--   1. sin fila de config id=1 → false (fail-closed);
--   2. edicion_abierta = true → false (evento en edición: nada autoriza);
--   3. p_dia <> dia_activo → false (solo en vendedor y cortesía, que reciben
--      p_dia; en persona se usa el dia_activo del servidor para filtrar la
--      lista, pues añadir un parámetro rompería al cliente);
--   4. día cerrado (dia1_cerrado/dia2_cerrado) → false.
--
-- NOTA 1: las columnas de config usadas aquí están en
-- 0001_esquema_inicial.sql:67 (edicion_abierta not null default true,
-- dia_activo not null default 1, dia1_cerrado/dia2_cerrado).
-- Recordar: edicion_abierta = true significa EVENTO EN EDICIÓN (la puerta NO
-- opera); false significa evento cerrado y la puerta autorizando.
--
-- NOTA 2: este archivo SUSTITUYE a las versiones de 0002_f9_valida_p_dia.sql y
-- 0003_f8_preserva_hora_reautorizacion.sql SOLO en las validaciones añadidas
-- arriba del cuerpo: la lógica de UPDATE queda exactamente la de producción
-- (se copió de 0003 para el vendedor, la que preserva marcado_diaN_at, y de
-- 0001 para cortesía y persona, incluido el cierre automático de lista de
-- marcar_persona). No se toca 0001-0010 (historia inamovible).
--
-- NOTA 3: NO se añade la exigencia listas.estado = 'en_puerta' en
-- f_puerta_marcar_persona (se evaluó y se descartó): ninguna RPC actual mueve
-- una lista a 'en_puerta' salvo f_puerta_cerrar_lista(p_cerrada:false), que
-- desde 0010 es solo del supervisor, y las listas nacen 'en_edicion'. Exigir
-- 'en_puerta' habría bloqueado a la puerta en el día del evento. Se conserva
-- el filtro `l.estado <> 'cerrada'` y se añade `l.dia = v_dia_activo`.
--
-- NOTA 4: se usa CREATE OR REPLACE (idempotente; no drop) y NO se repiten los
-- grants/revoke: conservan los de 0001_esquema_inicial.sql:4944-4965.
--
-- NOTA 5: dos comportamientos revisados y dejados COMO ESTÁN a propósito:
--   a) el `return found` final de f_puerta_marcar_persona puede devolver false
--      aunque la autorización se aplicó, si el `update listas` del cierre
--      automático afecta a 0 filas (carrera con el supervisor). Se conserva
--      porque el cuerpo es el de producción y cambiarlo no es de esta tarea;
--      el cliente reconsulta y se auto-sana.
--   b) las tres funciones asumen config.id = 1 (igual que f_puerta_estado).
--      ANTES de ejecutar esta migración hay que confirmar con un conteo que
--      existe la fila id = 1.
--
-- El servidor (esta migración) es la seguridad real; el cliente
-- (js/puerta.js) reconsulta f_puerta_estado antes de cada autorización como
-- capa visible y de contexto, no como fuente de verdad.

begin;

-- 1) f_puerta_marcar_vendedor
-- Firma y UPDATE idénticos a 0003_f8_preserva_hora_reautorizacion.sql.
CREATE OR REPLACE FUNCTION public.f_puerta_marcar_vendedor(p_token uuid, p_vendedor_id uuid, p_dia integer, p_estado text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_edicion_abierta boolean;
  v_dia_activo integer;
  v_dia1_cerrado boolean;
  v_dia2_cerrado boolean;
begin
  if f_sesion_rol(p_token) is distinct from 'puerta' then return false; end if;
  if p_estado not in ('pendiente','autorizado') then return false; end if;
  if p_dia not in (1,2) then return false; end if;

  -- P1-02 fase 2: revalidación del estado del evento EN el momento de marcar.
  select edicion_abierta, dia_activo, dia1_cerrado, dia2_cerrado
    into v_edicion_abierta, v_dia_activo, v_dia1_cerrado, v_dia2_cerrado
    from config where id = 1;
  if not found then return false; end if;
  if v_edicion_abierta then return false; end if;
  if p_dia <> v_dia_activo then return false; end if;
  if (p_dia = 1 and v_dia1_cerrado) or (p_dia = 2 and v_dia2_cerrado) then return false; end if;

  if p_dia = 1 then
    update vendedores set
      estado_dia1 = p_estado,
      marcado_dia1_at = case
        when p_estado <> 'autorizado' then null
        when estado_dia1 = 'autorizado' and marcado_dia1_at is not null then marcado_dia1_at
        else now() end
    where id = p_vendedor_id;
  else
    update vendedores set
      estado_dia2 = p_estado,
      marcado_dia2_at = case
        when p_estado <> 'autorizado' then null
        when estado_dia2 = 'autorizado' and marcado_dia2_at is not null then marcado_dia2_at
        else now() end
    where id = p_vendedor_id;
  end if;
  return found;
end $function$;

-- 2) f_puerta_marcar_persona
-- Firma y UPDATE idénticos a 0001_esquema_inicial.sql:4018, con dos
-- validaciones nuevas: estado del evento y día de la lista = dia_activo del
-- servidor (la persona no recibe p_dia; el día lo decide el servidor).
CREATE OR REPLACE FUNCTION public.f_puerta_marcar_persona(p_token uuid, p_persona_id uuid, p_estado text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_edicion_abierta boolean;
  v_dia_activo integer;
  v_dia1_cerrado boolean;
  v_dia2_cerrado boolean;
begin
  if f_sesion_rol(p_token) is distinct from 'puerta' then return false; end if;
  if p_estado not in ('pendiente','autorizado') then return false; end if;

  -- P1-02 fase 2: revalidación del estado del evento EN el momento de marcar.
  select edicion_abierta, dia_activo, dia1_cerrado, dia2_cerrado
    into v_edicion_abierta, v_dia_activo, v_dia1_cerrado, v_dia2_cerrado
    from config where id = 1;
  if not found then return false; end if;
  if v_edicion_abierta then return false; end if;
  if (v_dia_activo = 1 and v_dia1_cerrado) or (v_dia_activo = 2 and v_dia2_cerrado) then return false; end if;

  update personas p set
    estado = p_estado,
    marcado_at = case when p_estado = 'autorizado' then now() else null end
  where p.id = p_persona_id
    and exists (select 1 from listas l where l.id = p.lista_id and l.dia = v_dia_activo and l.estado <> 'cerrada');

  -- Si se autorizó y todas las personas de la lista ya están autorizadas, cerrar la lista automáticamente
  if found and p_estado = 'autorizado' then
    if (
      select bool_and(estado = 'autorizado')
      from personas
      where lista_id = (select lista_id from personas where id = p_persona_id)
    ) then
      update listas set estado = 'cerrada'
      where id = (select lista_id from personas where id = p_persona_id)
        and estado <> 'cerrada';
    end if;
  end if;

  return found;
end;
$function$;

-- 3) f_puerta_marcar_cortesia
-- Firma y UPDATE idénticos a 0001_esquema_inicial.sql:3956.
CREATE OR REPLACE FUNCTION public.f_puerta_marcar_cortesia(p_token uuid, p_persona_id uuid, p_dia integer, p_estado text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_persona cortesia_personas%ROWTYPE;
  v_cortesia cortesias%ROWTYPE;
  v_dia_lista int;
  v_edicion_abierta boolean;
  v_dia_activo integer;
  v_dia1_cerrado boolean;
  v_dia2_cerrado boolean;
BEGIN
  IF public.f_sesion_ok(p_token, 'puerta') IS NOT TRUE THEN
    RETURN FALSE;
  END IF;
  IF p_dia NOT IN (1,2) THEN
    RETURN FALSE;
  END IF;
  IF p_estado NOT IN ('pendiente','autorizado') THEN
    RETURN FALSE;
  END IF;

  -- P1-02 fase 2: revalidación del estado del evento EN el momento de marcar.
  SELECT edicion_abierta, dia_activo, dia1_cerrado, dia2_cerrado
    INTO v_edicion_abierta, v_dia_activo, v_dia1_cerrado, v_dia2_cerrado
    FROM config WHERE id = 1;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  IF v_edicion_abierta THEN
    RETURN FALSE;
  END IF;
  IF p_dia <> v_dia_activo THEN
    RETURN FALSE;
  END IF;
  IF (p_dia = 1 AND v_dia1_cerrado) OR (p_dia = 2 AND v_dia2_cerrado) THEN
    RETURN FALSE;
  END IF;

  SELECT * INTO v_persona FROM cortesia_personas WHERE id = p_persona_id;
  IF v_persona.id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT * INTO v_cortesia FROM cortesias WHERE id = v_persona.cortesia_id;
  IF v_cortesia.id IS NULL OR v_cortesia.estado IS DISTINCT FROM 'activa' THEN
    RETURN FALSE;
  END IF;

  IF v_persona.lista_id IS NOT NULL THEN
    SELECT dia INTO v_dia_lista FROM cortesia_listas WHERE id = v_persona.lista_id;
    IF v_dia_lista IS NULL OR v_dia_lista <> p_dia THEN
      RETURN FALSE;
    END IF;
    UPDATE cortesia_personas
    SET estado = p_estado,
        marcado_at = CASE WHEN p_estado = 'autorizado' THEN now() ELSE NULL END
    WHERE id = p_persona_id;
  ELSE
    IF p_dia = 1 AND NOT v_cortesia.dia1 THEN RETURN FALSE; END IF;
    IF p_dia = 2 AND NOT v_cortesia.dia2 THEN RETURN FALSE; END IF;
    IF p_dia = 1 THEN
      UPDATE cortesia_personas
      SET estado_dia1 = p_estado,
          marcado_dia1_at = CASE WHEN p_estado = 'autorizado' THEN now() ELSE NULL END
      WHERE id = p_persona_id;
    ELSE
      UPDATE cortesia_personas
      SET estado_dia2 = p_estado,
          marcado_dia2_at = CASE WHEN p_estado = 'autorizado' THEN now() ELSE NULL END
      WHERE id = p_persona_id;
    END IF;
  END IF;

  RETURN TRUE;
END;
$function$;

commit;
