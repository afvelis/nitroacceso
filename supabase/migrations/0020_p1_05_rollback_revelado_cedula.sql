-- 0020_p1_05_rollback_revelado_cedula.sql
-- Proyecto: NitroSystem (control de acceso) · Tarea: P1-05
-- Fecha: 27/11/2026
--
-- ROLLOBACK de 0015_p1_05_revelado_cedula.sql.
-- La migración 0015 fue aplicada en producción y staging pero el usuario
-- rechazó el enfoque (modal + motivo obligatorio + auditoría de revelados).
-- Se cambió a hover-reveal simple sin auditoría.
--
-- Esta migración DROPA los objetos creados por 0015.
-- NO SE BORRA LA TABLA `accesos_datos` si ya tiene datos reales.
-- Solo las RPC y el acceso de anon/authenticated.
-- Si se desea eliminar la tabla también, hacerlo manualmente con:
--   DROP TABLE public.accesos_datos;

begin;

-- 1) Eliminar las dos RPC que creó 0015
DROP FUNCTION IF EXISTS public.f_admin_revelar_cedula(uuid, text, uuid, text);
DROP FUNCTION IF EXISTS public.f_admin_listar_accesos_datos(uuid, integer);

-- 2) La tabla accesos_datos ya fue creada con RLS pero no tiene policies.
--    Se puede borrar manualmente si se desea:
--    DROP TABLE public.accesos_datos;
--    No se hace aquí para proteger datos que puedan haberse generado.

-- NOTA: no se droppea la tabla `accesos_datos` ni su contenido.
-- La tabla ya fue ejecutada en producción y puede contener datos reales.
-- Si se desea borrarla, hacerlo manualmente después de confirmar:
--   DROP TABLE public.accesos_datos;

commit;