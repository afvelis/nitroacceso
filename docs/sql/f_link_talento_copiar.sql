-- f_link_talento_copiar — F-6: copia selectiva y repetible (11/11/2026)
--
-- Este archivo tiene DOS versiones de la misma funcion, conviviendo por SOBRECARGA:
--
--   1) La de 3 argumentos (text, integer, integer) RETURNS boolean: es la version
--      vigente desde el 09/11/2026 (arreglo F-1), copiada TAL CUAL desde
--      supabase/migrations/0001_esquema_inicial.sql. Se conserva sin cambios
--      porque las paginas ya desplegadas la siguen llamando hasta que salga la
--      version nueva del frontend.
--
--   2) La NUEVA de 4 argumentos (text, integer, integer, uuid[] DEFAULT NULL)
--      RETURNS jsonb: copia selectiva (acepta una lista de persona_id), permite
--      destino NO vacio (omite duplicados comparando la cedula normalizada) y
--      devuelve cuantas personas copio y cuantas omitio. Es idempotente:
--      ejecutarla dos veces seguidas no duplica nada la segunda vez.
--
-- Conviven sin problema: Postgres distingue las dos por el numero y tipo de
-- argumentos. Las llamadas viejas (3 argumentos) resuelven a la version booleana;
-- las nuevas (4 argumentos, aunque el ultimo venga null explicito) resuelven a
-- la jsonb.
--
-- Para revertir: borrar SOLO la sobrecarga de 4 argumentos con
--   drop function public.f_link_talento_copiar(text, integer, integer, uuid[]);
-- (NO se ejecuta aqui: este archivo no incluye ningun DROP). La de 3 argumentos
-- se queda siempre.

-- ============ 1) Version de 3 argumentos (compatibilidad, SIN cambios) ============
-- La usan las paginas antiguas hasta que se despliegue la version nueva.
CREATE OR REPLACE FUNCTION public.f_link_talento_copiar(p_codigo_link text, p_dia_origen integer, p_dia_destino integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_abierta boolean;
  v_t uuid;
  v_o uuid;
  v_d uuid;
  v_n integer;
begin
  if p_dia_origen is null or p_dia_destino is null or p_dia_origen = p_dia_destino then
    return false;
  end if;

  select edicion_abierta into v_abierta from config limit 1;
  if v_abierta is not true then return false; end if;

  select id into v_t from talentos where codigo_link = p_codigo_link limit 1;
  if v_t is null then return false; end if;

  -- Origen: la lista del día de origen, esté 'en_edicion' o ya 'cerrada'.
  -- Si hubiera más de una, gana la que está en edición.
  select id into v_o
    from listas
   where talento_id = v_t and dia = p_dia_origen
   order by (estado = 'en_edicion') desc
   limit 1;

  -- Destino: obligatoriamente en edición, para que se pueda editar después.
  select id into v_d
    from listas
   where talento_id = v_t and dia = p_dia_destino and estado = 'en_edicion'
   order by (estado = 'en_edicion') desc
   limit 1;

  if v_o is null or v_d is null then return false; end if;

  -- No pisar personas que ya existan en el día destino.
  if exists (select 1 from personas where lista_id = v_d) then return false; end if;

  insert into personas (lista_id, nombre, apellido, cedula, cargo)
  select v_d, nombre, apellido, cedula, cargo
    from personas
   where lista_id = v_o;

  get diagnostics v_n = row_count;
  return v_n > 0;
end $function$;


-- ============ 2) Version NUEVA de 4 argumentos (sobrecarga, F-6) ============
CREATE OR REPLACE FUNCTION public.f_link_talento_copiar(
  p_codigo_link text,
  p_dia_origen integer,
  p_dia_destino integer,
  p_persona_ids uuid[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_t uuid;
  v_anulado boolean;
  v_abierta boolean;
  v_o uuid;
  v_d uuid;
  v_n integer;
  v_seleccionadas integer;
  v_omitidas integer;
begin
  -- 1) Resolver el link: el talento debe existir y no estar anulado.
  --    (links_anulados se comprueba igual que f_link_talento_ver.)
  select t.id, (p_codigo_link = any(t.links_anulados))
    into v_t, v_anulado
    from talentos t
   where t.codigo_link = p_codigo_link
   limit 1;
  if v_t is null or v_anulado then
    return jsonb_build_object('ok', false, 'copiadas', 0, 'omitidas', 0, 'motivo', 'link_invalido');
  end if;

  -- 2) La edicion debe estar abierta (misma comprobacion que la version de 3 argumentos).
  select edicion_abierta into v_abierta from config limit 1;
  if v_abierta is not true then
    return jsonb_build_object('ok', false, 'copiadas', 0, 'omitidas', 0, 'motivo', 'edicion_cerrada');
  end if;

  -- 3) Lista de origen (en edicion o cerrada; si hubiera varias, gana la que
  --    esta en edicion) y lista de destino.
  select id into v_o
    from listas
   where talento_id = v_t and dia = p_dia_origen
   order by (estado = 'en_edicion') desc
   limit 1;

  -- 4) Destino: obligatoriamente en edicion (editable).
  select id into v_d
    from listas
   where talento_id = v_t and dia = p_dia_destino and estado = 'en_edicion'
   limit 1;

  if v_o is null or v_d is null then
    return jsonb_build_object('ok', false, 'copiadas', 0, 'omitidas', 0, 'motivo', 'lista_inexistente');
  end if;

  -- 5) Seleccion: p_persona_ids null o VACIO = todas las personas del origen;
  --    si trae ids, solo esos (los ids que no pertenecen al origen no existen
  --    en la consulta, asi que se ignoran solos).
  -- 6) Copiar solo las que NO esten ya en el destino, comparando la cedula
  --    NORMALIZADA: mayusculas y sin espacios, puntos, guiones ni otros simbolos.
  --    Se copian las mismas columnas que copia la version de 3 argumentos
  --    (nombre, apellido, cedula, cargo); estado queda en 'pendiente', el
  --    default de la tabla, igual que hoy.
  with seleccion as (
    select p.nombre, p.apellido, p.cedula, p.cargo
      from personas p
     where p.lista_id = v_o
       and (coalesce(cardinality(p_persona_ids), 0) = 0 or p.id = any(p_persona_ids))
  )
  insert into personas (lista_id, nombre, apellido, cedula, cargo)
  select v_d, s.nombre, s.apellido, s.cedula, s.cargo
    from seleccion s
   where not exists (
     select 1 from personas d
      where d.lista_id = v_d
        and upper(regexp_replace(d.cedula, '[^0-9A-Za-z]', '', 'g'))
          = upper(regexp_replace(s.cedula, '[^0-9A-Za-z]', '', 'g'))
   );

  get diagnostics v_n = row_count;

  -- omitidas = seleccionadas que ya existian en el destino (mismo criterio de
  -- seleccion de arriba, restando las que se insertaron).
  select count(*) into v_seleccionadas
    from personas p
   where p.lista_id = v_o
     and (coalesce(cardinality(p_persona_ids), 0) = 0 or p.id = any(p_persona_ids));

  v_omitidas := v_seleccionadas - v_n;

  -- 7) Resultado. Idempotente: si todo ya estaba, la segunda pasada devuelve
  --    copiadas = 0 y omitidas = total, sin duplicar filas.
  return jsonb_build_object('ok', true, 'copiadas', v_n, 'omitidas', v_omitidas, 'motivo', null::text);
end $function$;


-- f_link_talento_copiar (4 argumentos): mismos permisos que la de 3 argumentos.
revoke execute on function public.f_link_talento_copiar(p_codigo_link text, p_dia_origen integer, p_dia_destino integer, p_persona_ids uuid[]) from public;
grant execute on function public.f_link_talento_copiar(p_codigo_link text, p_dia_origen integer, p_dia_destino integer, p_persona_ids uuid[]) to anon;


-- ============ PRE (verificacion ANTES de aplicar) ============
-- Ejecutar en el SQL Editor (staging primero, produccion despues) ANTES de
-- aplicar este archivo. Debe mostrar la funcion de 3 argumentos (retorna
-- boolean) y, si ya se aplico antes, tambien la de 4 argumentos.
select p.oid::regprocedure::text as firma,
       p.prorettype::regtype as retorno
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname = 'f_link_talento_copiar'
 order by 1;


-- ============ POST (verificacion DESPUES de aplicar) ============
-- 1) Deben quedar EXACTAMENTE dos sobrecargas: la de 3 argumentos retornando
--    boolean y la de 4 argumentos (text, integer, integer, uuid[]) retornando
--    jsonb. Ninguna debe faltar y no debe haber otras.
select p.oid::regprocedure::text as firma,
       p.prorettype::regtype as retorno
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname = 'f_link_talento_copiar'
 order by 1;

-- 2) Comprobacion rapida de que la sobrecarga de 4 argumentos existe y devuelve
--    jsonb (esta consulta debe devolver exactamente una fila con retorno jsonb):
select p.prorettype::regtype as retorno_de_la_sobrecarga_de_4
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname = 'f_link_talento_copiar'
   and pg_get_function_identity_arguments(p.oid) = 'p_codigo_link text, p_dia_origen integer, p_dia_destino integer, p_persona_ids uuid[]';
