-- docs/sql/revelar-cedula.sql — Illuminate: consulta de emergencia para el día del evento
-- Referencia: tareas/P1-05-revelado-cedula-auditado.md
-- El SQL lo ejecuta el ORGANIZADOR directamente en el SQL Editor de Supabase:
-- sirve cuando no hay tiempo de desplegar (no toca la app, no despliega nada).
--
-- Qué hace: busca UNA cédula (normalizada, sin guiones ni punto) en las cuatro
--   tablas donde puede vivir: personas, vendedores, cortesia_personas y aliados.
-- Qué NO hace: NO deja rastro en accesos_datos (el rastro queda en el LOG de
--   Supabase: el SQL Editor registra cada consulta en el historial del proyecto).
--
-- Uso: reemplaza 0000000000 por el numero buscado y ejecuta.

-- Revelar la cedula de una persona por su numero (normaliza y compara sin guiones)
-- Uso: reemplaza 0000000000 por el numero buscado y ejecuta.
with buscada as (
  select regexp_replace('0000000000', '\D', '', 'g') as n
)
select 'personas' as origen, p.id, p.nombre, p.apellido, p.cedula,
       (select l.dia from listas l where l.id = p.lista_id) as dia,
       p.estado
from personas p, buscada b
where regexp_replace(coalesce(p.cedula,''), '\D', '', 'g') = b.n
union all
select 'vendedores', v.id, v.nombre, v.apellido, v.cedula, null,
       coalesce(v.estado_dia1, '') || '/' || coalesce(v.estado_dia2, '')
from vendedores v, buscada b
where regexp_replace(coalesce(v.cedula,''), '\D', '', 'g') = b.n
union all
select 'cortesia_personas', cp.id, cp.nombre, cp.apellido, cp.cedula, null, cp.estado
from cortesia_personas cp, buscada b
where regexp_replace(coalesce(cp.cedula,''), '\D', '', 'g') = b.n
union all
select 'aliados', a.id, a.responsable, a.nombre_organizacion, a.cedula, null,
       case when a.activo then 'activo' else 'inactivo' end
from aliados a, buscada b
where regexp_replace(coalesce(a.cedula,''), '\D', '', 'g') = b.n;
