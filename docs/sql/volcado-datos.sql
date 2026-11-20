-- =====================================================================
-- NITROACCESO · GENERADOR DE VOLCADO DE DATOS (tarea P0-07, revisión 2)
--
-- CÓMO SE USA (vuelta atrás, canal único y simétrico):
--   PASO 0: el proyecto debe tener su SELLO DE ENTORNO sembrado (UNA vez
--           por proyecto): docs/sql/sembrar-sello-staging.sql o
--           docs/sql/sembrar-sello-produccion.sql. Sin sello, este
--           generador ABORTA (deliberado).
--   IDA:    ejecutar ESTE archivo en el SQL Editor de Supabase
--           (confirmar antes que el proyecto abierto es el correcto).
--           Devuelve UNA fila y UNA columna llamada «script»: ese texto
--           es el guion completo de restauración. Copiarlo y guardarlo
--           como volcado-AAAA-MM-DD-datos.sql FUERA del repositorio.
--   VUELTA: pegar el archivo guardado en el mismo SQL Editor y ejecutar.
--
-- Qué hace este generador (revisión 2, tras revisión del orquestador):
--   · Columnas NUNCA congeladas: se descubren de information_schema.columns
--     en el momento (excluyendo identidad y generadas). Sirve antes y
--     después de que F-12 añada columnas a vendedores, sin tocarlo.
--   · Tablas del catálogo: si aparece una tabla de public que no está en
--     el orden de FK ni en las excluidas, ABORTA nombrándola (un humano
--     decide dónde va); nunca la omite en silencio.
--   · Sello de entorno embebido: el guion de restauración se niega a
--     ejecutarse en un proyecto cuyo sello no coincida (empezar borrando
--     todas las tablas en el proyecto equivocado es el peor fallo posible;
--     el nombre de base es «postgres» en todos los proyectos de Supabase).
--   · Conteos esperados embebidos: el guion verifica tabla a tabla tras
--     insertar y aborta la transacción entera si algo no coincide, así un
--     archivo truncado NO puede restaurar a medias.
--
-- Esta consulta es de SOLO LECTURA sobre los datos: solo crea una tabla
-- TEMPORAL de sesión (_volcado_p07) para devolver el resultado.
-- =====================================================================

do $gen$
declare
  -- ORDEN según las FK reales de producción (docs/sql/volcado-produccion-2026-11-09.csv):
  -- 12 FK con ON DELETE CASCADE / SET NULL y 2 con NO ACTION (stands_coordinador_id_fkey
  -- y talentos_coordinador_id_fkey, sin ON DELETE). Esas 2 NO ACTION son las que hacen
  -- que el orden de borrado importe DE VERDAD: borrar un coordinador con stands o
  -- talentos apuntándole aborta si no se borraron antes sus hijos. Padres antes que
  -- hijos para insertar; el BORRADO sale en el inverso exacto (ver aserción tras el
  -- bucle). Si el esquema cambia, un humano añade aquí la tabla nueva en su posición;
  -- el generador nunca la omite en silencio (aborta nombrándola, ver paso 2).
  v_orden    text[] := array[
    'config',
    'coordinadores',
    'aliados',
    'aliado_asignaciones',
    'aliado_concursos',
    'aliado_ampliaciones',
    'cortesias',
    'cortesia_listas',
    'cortesia_personas',
    'stands',
    'vendedores',
    'talentos',
    'listas',
    'personas',
    'eventos'];
  -- Excluidas a propósito: transitorios de seguridad y registro operativo de
  -- auditoría. Revivir sesiones es un riesgo, login_intentos.id y
  -- reaperturas_puerta.id son GENERATED ALWAYS AS IDENTITY (un insert con
  -- identidad explícita fallaría); y reaperturas_puerta, como sesiones y
  -- login_intentos, es registro operativo de auditoría: no se restaura ni se
  -- cuenta en el volcado. Al excluir, ninguna sentencia usa identidad explícita.
  v_excluidas text[] := array['sesiones', 'login_intentos', 'reaperturas_puerta'];

  v_tabla    text;
  v_com      text;
  v_cols     text;
  v_datos    text;
  v_filas    bigint;
  v_sello    text;
  v_sello_esc text;
  v_evento   text;
  v_deletes  text := '';
  v_inserts  text := '';
  v_checks   text := '';
  v_conteos  text := '';
  v_total_filas bigint := 0;
  v_n_deletes int := 0;
  v_n_inserts int := 0;
  v_script   text;
  v_i        int;
begin
  -- ===== 1 · SELLO DE ENTORNO: sin sello no hay volcado (deliberado) =====
  if not exists (
    select 1 from information_schema.tables
     where table_schema = 'public' and table_name = 'respaldo_sello'
  ) then
    raise exception 'NO HAY SELLO DE ENTORNO en este proyecto. Ejecuta UNA vez, en el SQL Editor de ESTE proyecto, docs/sql/sembrar-sello-staging.sql (si es staging) o docs/sql/sembrar-sello-produccion.sql (si es produccion), y vuelve a generar el volcado.';
  end if;
  select count(*) into v_filas from public.respaldo_sello;
  if v_filas <> 1 then
    raise exception 'La tabla public.respaldo_sello debe tener EXACTAMENTE una fila y tiene %. Arreglalo antes de generar el volcado.', v_filas;
  end if;
  select btrim(entorno) into v_sello from public.respaldo_sello;
  if v_sello is null or v_sello = '' then
    raise exception 'El sello de public.respaldo_sello está vacío. Pon ''staging'' o ''produccion'' en su única fila y vuelve a generar.';
  end if;
  v_sello_esc := replace(v_sello, '''', '''''');

  -- ===== 2 · TABLAS NUEVAS SIN UBICACIÓN: abortar nombrándolas =====
  for v_tabla in
    select c.table_name
      from information_schema.tables c
     where c.table_schema = 'public'
       and c.table_type   = 'BASE TABLE'
       and c.table_name  <> 'respaldo_sello'
       and c.table_name <> all (v_orden)
       and c.table_name <> all (v_excluidas)
  loop
    raise exception 'TABLA NUEVA SIN UBICACION: public.% no está en el orden de FK del volcado ni en las excluidas. Un humano debe decidir su posición según las FK y añadirla al array v_orden de docs/sql/volcado-datos.sql. No se genera el volcado.', v_tabla;
  end loop;

  -- ===== 3 · CONSTRUCCIÓN POR TABLA (columnas y datos del catálogo, ahora mismo) =====
  -- Sin limit: si config no tuviera filas, un select into con limit dejaría NULL y el
  -- coalesce no se evaluaría nunca (la celda saldría vacía en silencio). max() sobre
  -- cero filas SÍ devuelve NULL y el coalesce sí actúa.
  select coalesce(max(nombre_evento), '[SIN CONFIG: tabla vacía]') into v_evento from public.config;

  for v_i in 1 .. array_length(v_orden, 1) loop
    v_tabla := v_orden[v_i];

    -- Columnas reales de ESTA tabla hoy, en orden físico. Se excluyen
    -- is_identity = 'YES' (columnas de identidad) y is_generated <> 'NEVER'
    -- (columnas generadas): un insert explícito con esas columnas FALLA.
    select string_agg(c.column_name, ', ' order by c.ordinal_position)
      into v_cols
      from information_schema.columns c
     where c.table_schema = 'public'
       and c.table_name   = v_tabla
       and c.is_identity  = 'NO'
       and c.is_generated = 'NEVER';
    if v_cols is null then
      raise exception 'La tabla public.% no existe o no tiene columnas elegibles. No se genera el volcado.', v_tabla;
    end if;

    execute format('select coalesce(jsonb_agg(t)::text, ''[]'') from public.%I t', v_tabla) into v_datos;
    execute format('select count(*) from public.%I', v_tabla) into v_filas;

    v_com := case v_tabla
      when 'config'              then 'sin FK; contiene hashes de PIN (pin_admin, pin_puerta): sin esta fila no se puede entrar a la base restaurada'
      when 'coordinadores'       then 'padre de stands y talentos'
      when 'aliados'             then 'padre de aliado_asignaciones y cortesias'
      when 'aliado_asignaciones' then 'hija de aliados, padre de concursos, ampliaciones y cortesias'
      when 'aliado_concursos'    then 'hija de aliado_asignaciones, padre de cortesias (concurso_id)'
      when 'aliado_ampliaciones' then 'hija de aliado_asignaciones'
      when 'cortesias'           then 'hija de aliados, aliado_concursos y aliado_asignaciones'
      when 'cortesia_listas'     then 'hija de cortesias, padre de cortesia_personas (lista_id)'
      when 'cortesia_personas'   then 'hija de cortesias y cortesia_listas'
      when 'stands'              then 'hija de coordinadores, padre de vendedores; links_anulados es text[] (jsonb_populate_recordset resuelve el array nativo, sin escapado manual)'
      when 'vendedores'          then 'hija de stands; codigo_qr vive aquí'
      when 'talentos'            then 'hija de coordinadores, padre de listas'
      when 'listas'              then 'hija de talentos, padre de personas'
      when 'personas'            then 'hija de listas'
      when 'eventos'             then 'sin FK, al final'
      else '' end;

    v_conteos := v_conteos || '--   ' || v_tabla || ': ' || v_filas || ' filas' || chr(10);
    v_total_filas := v_total_filas + v_filas;

    -- BORRADO: se ANTEPONE en cada vuelta, así el resultado queda en el INVERSO
    -- exacto del orden de inserción (hijos antes que padres). Con las 2 FK en modo
    -- NO ACTION (stands→coordinadores, talentos→coordinadores), un borrado en orden
    -- directo abortaría en cuanto hubiera un hijo apuntando al padre.
    v_deletes := 'delete from public.' || v_tabla || ';' || chr(10) || v_deletes;
    v_n_deletes := v_n_deletes + 1;

    v_inserts := v_inserts
      || '-- ' || v_tabla || ': ' || v_com || chr(10)
      || format('insert into public.%I (%s)', v_tabla, v_cols) || chr(10)
      || '  select ' || v_cols || chr(10)
      || '    from jsonb_populate_recordset(null::public.' || v_tabla || ', $j$' || v_datos || '$j$);' || chr(10)
      || chr(10);

    v_checks := v_checks
      || '  select count(*) into v_filas from public.' || v_tabla || ';' || chr(10)
      || '  if v_filas <> ' || v_filas || ' then' || chr(10)
      || '    raise exception ''VOLCADO INCOMPLETO: tabla ' || v_tabla || ' esperaba ' || v_filas || ' filas y hay %'', v_filas;' || chr(10)
      || '  end if;' || chr(10);

    v_n_inserts := v_n_inserts + 1;
  end loop;

  -- ===== 3bis · ASERCIONES (el generador falla ruidoso antes de ensamblar) =====
  if v_n_deletes <> array_length(v_orden, 1) or v_n_inserts <> array_length(v_orden, 1) then
    raise exception 'ERROR INTERNO: deletes (%) o inserts (%) no cubren las % tablas del orden. No se genera el volcado.', v_n_deletes, v_n_inserts, array_length(v_orden, 1);
  end if;
  -- El primer delete debe corresponder a la ÚLTIMA tabla del orden de inserción
  -- (eventos hoy): es la prueba de que el primer delete es la última tabla del
  -- orden de inserción. La aserción solo mira la PRIMERA línea del borrado; el
  -- orden del resto lo garantiza cómo se construye v_deletes (antepuesto).
  if strpos(v_deletes, 'delete from public.' || v_orden[array_length(v_orden, 1)] || ';' || chr(10)) <> 1 then
    raise exception 'ERROR INTERNO: el primer delete no es la última tabla del orden de inserción (%). No se genera el volcado.', v_orden[array_length(v_orden, 1)];
  end if;

  -- ===== 4 · ENSAMBLADO DEL GUION =====
  v_script :=
    '-- =====================================================================' || chr(10)
    || '-- NITROACCESO · VOLCADO DE DATOS (guion de restauración)' || chr(10)
    || '-- ¡¡ATENCIÓN!! ESTE GUION BORRARA ' || v_total_filas || ' FILAS EN ' || array_length(v_orden, 1) || ' TABLAS DE ESTE PROYECTO Y LAS REEMPLAZARA POR LAS DEL VOLCADO.' || chr(10)
    || '-- SOLO SIRVE PARA RESTAURAR EL VOLCADO GUARDADO. NO ES UNA LIMPIEZA.' || chr(10)
    || '-- Generado: ' || to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS "UTC"') || chr(10)
    || '-- Base de datos: ' || current_database() || chr(10)
    || '-- Evento: ' || v_evento || chr(10)
    || '-- Sello del entorno de origen: ' || v_sello || chr(10)
    || '--' || chr(10)
    || '-- ¡ATENCIÓN! ESTE ARCHIVO CONTIENE DATOS PERSONALES' || chr(10)
    || '-- (cédulas, correos, teléfonos, códigos QR) Y HASHES DE PIN' || chr(10)
    || '-- (config.pin_admin y config.pin_puerta, necesarios para poder' || chr(10)
    || '-- volver a entrar a la base restaurada).' || chr(10)
    || '-- NO SUBIR AL REPOSITORIO. Guardarlo solo en disco local' || chr(10)
    || '-- (carpeta respaldos/, excluida por .gitignore).' || chr(10)
    || '--' || chr(10)
    || '-- CONTEOS ESPERADOS por tabla (compara a ojo antes de ejecutar):' || chr(10)
    || v_conteos
    || '--' || chr(10)
    || '-- Columnas: descubiertas del CATÁLOGO al generar (information_schema.columns).' || chr(10)
    || '-- Se excluyen las columnas con is_identity = YES (identidad) o is_generated' || chr(10)
    || '-- distinto de NEVER (generadas): un insert explícito con ellas falla.' || chr(10)
    || '--' || chr(10)
    || '-- Integridad: antes del commit, un bloque do compara el conteo real de cada' || chr(10)
    || '-- tabla con el esperado y lanza VOLCADO INCOMPLETO si difiere: un archivo' || chr(10)
    || '-- truncado NO puede restaurar a medias.' || chr(10)
    || '--' || chr(10)
    || '-- Tablas EXCLUIDAS a propósito: sesiones, login_intentos y' || chr(10)
    || '-- reaperturas_puerta.' || chr(10)
    || '-- Son transitorios de seguridad: revivir sesiones es un riesgo, y' || chr(10)
    || '-- login_intentos.id es GENERATED ALWAYS AS IDENTITY (un insert con' || chr(10)
    || '-- identidad explícita fallaría); al excluir la tabla, ninguna sentencia' || chr(10)
    || '-- usa identidad explícita.' || chr(10)
    || '--' || chr(10)
    || '-- Delimitador $j$: evita escapar comillas. Si algún dato de texto' || chr(10)
    || '-- contuviera literalmente la secuencia $j$, este guion se rompería;' || chr(10)
    || '-- no debe ocurrir con los datos del evento.' || chr(10)
    || '-- =====================================================================' || chr(10)
    || chr(10)
    || 'begin;' || chr(10)
    || chr(10)
    || '-- ===== GUARDA DE ENTORNO: si el proyecto abierto no es el de origen,' || chr(10)
    || '-- ABORTA aquí, antes de borrar nada. =====' || chr(10)
    || 'do $sello$' || chr(10)
    || 'declare' || chr(10)
    || '  v_entorno text;' || chr(10)
    || 'begin' || chr(10)
    || '  if not exists (select 1 from information_schema.tables where table_schema = ''public'' and table_name = ''respaldo_sello'') then' || chr(10)
    || '    raise exception ''PROYECTO SIN SELLO: este volcado viene del entorno "' || v_sello_esc || '", pero este proyecto no tiene public.respaldo_sello. NO EJECUTES AQUI: sembrar el sello es un paso previo unico por proyecto (docs/sql/sembrar-sello-*.sql).'';' || chr(10)
    || '  end if;' || chr(10)
    || '  if (select count(*) from public.respaldo_sello) <> 1 then' || chr(10)
    || '    raise exception ''Sello ambiguo: public.respaldo_sello debe tener EXACTAMENTE una fila y tiene %.'', (select count(*) from public.respaldo_sello);' || chr(10)
    || '  end if;' || chr(10)
    || '  select btrim(entorno) into v_entorno from public.respaldo_sello limit 1;' || chr(10)
    || '  if v_entorno is distinct from ''' || v_sello_esc || ''' then' || chr(10)
    || '    raise exception ''PROYECTO EQUIVOCADO: este volcado viene del entorno "' || v_sello_esc || '", pero el proyecto abierto tiene el sello "%". Este guion empieza BORRANDO todas las tablas: NO lo ejecutes aqui.'', coalesce(v_entorno, ''(vacio)'');' || chr(10)
    || '  end if;' || chr(10)
    || 'end' || chr(10)
    || '$sello$;' || chr(10)
    || chr(10)
    || '-- ===== BORRADO: orden inverso a las FK (hijos antes que padres).' || chr(10)
    || '-- Reemplazo completo y determinista, no acumulación contra UNIQUE. =====' || chr(10)
    || v_deletes
    || chr(10)
    || '-- ===== INSERCIÓN: orden según las FK (padres antes que hijos).' || chr(10)
    || '-- Columnas descubiertas del catálogo en el momento de generar. =====' || chr(10)
    || chr(10)
    || v_inserts
    || '-- ===== VERIFICACIÓN DE INTEGRIDAD: si algún conteo no coincide, la' || chr(10)
    || '-- excepción aborta la transacción entera y la base queda como estaba. =====' || chr(10)
    || 'do $verificacion$' || chr(10)
    || 'declare' || chr(10)
    || '  v_filas bigint;' || chr(10)
    || 'begin' || chr(10)
    || v_checks
    || 'end' || chr(10)
    || '$verificacion$;' || chr(10)
    || chr(10)
    || '-- ===== FIN: si algo falló a medias, la transacción entera se aborta' || chr(10)
    || '-- y la base queda como estaba antes de pegar el guion. =====' || chr(10)
    || 'commit;' || chr(10);

  -- ===== 5 · ASERCIÓN DEL RESULTADO: un generador que devuelve vacío en silencio
  -- es peor que uno que falla =====
  if v_script is null or length(v_script) < 500 then
    raise exception 'ERROR INTERNO: el guion salio vacío o truncado (largo %). No se genera el volcado.', coalesce(length(v_script)::text, 'NULL');
  end if;

  -- ===== 6 · SALIDA: una tabla temporal de sesión con UNA fila y UNA columna =====
  drop table if exists _volcado_p07;
  create temp table _volcado_p07 as select v_script as script;
end
$gen$;

select script from _volcado_p07;
