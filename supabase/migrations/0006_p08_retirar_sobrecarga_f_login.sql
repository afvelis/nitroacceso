-- 0006_p08_retirar_sobrecarga_f_login.sql
-- Proyecto: NitroSystem (control de acceso) · Tarea: P0-08
--
-- QUE HACE (una cosa, nada mas): retira la sobrecarga antigua
-- `f_login(p_pin text)` dejando una sola firma accesible:
-- `f_login(p_pin text, p_rol_solicitado text default null)`.
--
-- POR QUE: al convivir las dos firmas (`f_login(text)` de la 0001 y
-- `f_login(text, text)` creada en la 0005), PostgREST no puede desambiguar
-- las llamadas de un argumento y devuelve HTTP 300 / PGRST203 ("Could not
-- choose the best candidate function"). Eso rompe la llamada de un argumento
-- de tests/helpers.mjs (linea 131) y a cualquier navegador con el JS viejo
-- en cache.
--
-- POR QUE ES SEGURO: la firma vigente es `f_login(p_pin text,
-- p_rol_solicitado text default null)` (creada en la 0005), asi que las
-- llamadas de un argumento SIGUEN funcionando: Postgres resuelve el valor
-- ausente con el DEFAULT y la llamada cae en el cubo `rol_solicitado = null`
-- (ventana de 15 minutos, el comportamiento anterior a la separacion de
-- contadores de la 0005). Nadie pierde acceso; el unico cambio observable es
-- que PostgREST vuelve a tener una sola funcion candidata.
--
-- AVISO DE ORDEN: ejecutar DESPUES de la 0005. Si se ejecuta antes, no existe
-- todavia la funcion de dos argumentos y el login se queda sin funcion
-- accesible (ambos drops y la creacion viven en migraciones distintas).
--
-- NOTA FALLA REAL: esto no es teorico. Al aplicar la 0005 en staging (y en
-- produccion) aparecio exactamente este PGRST203; el usuario lo soluciono en
-- produccion con `drop function if exists public.f_login(text);` y el login
-- volvio a funcionar. Esta migracion deja el repositorio diciendo la misma
-- verdad que la base.
--
-- El usuario ya ejecuto el drop manual en produccion (18/11/2026); en staging
-- pendiente de ejecutar. Si en una base ya se ejecuto el drop manual y luego
-- se aplica esta migracion, el `drop function if exists` es inofensivo (no
-- falla si la funcion no existe).

begin;

drop function if exists public.f_login(p_pin text);

commit;
