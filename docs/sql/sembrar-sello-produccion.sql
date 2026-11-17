-- =====================================================================
-- NITROACCESO · SELLO DE ENTORNO — PRODUCCIÓN (tarea P0-07)
--
-- PASO PREVIO ÚNICO por proyecto: identifica de qué entorno se trata.
-- ¿Por qué? El nombre de base es «postgres» en TODOS los proyectos de
-- Supabase, así que el SQL Editor no distingue staging de producción por
-- su nombre. Sin sello no hay volcado: el generador y el guion de
-- restauración abortan si falta o no coincide.
--
-- CONFIRMAR ANTES DE EJECUTAR: el proyecto abierto es PRODUCCIÓN.
-- Este archivo se ejecuta en producción UNA sola vez.
-- =====================================================================

create table if not exists public.respaldo_sello (
  entorno text not null
);

-- RLS activa sin policies: nadie accede por API; solo el SQL Editor (rol postgres).
alter table public.respaldo_sello enable row level security;

-- Siembra idempotente: solo inserta si aún no hay sello.
insert into public.respaldo_sello (entorno)
select 'produccion'
 where not exists (select 1 from public.respaldo_sello);

-- PRUEBA DEL OBJETIVO (una consulta a la vez, después de lo de arriba):
--   select entorno from public.respaldo_sello;
-- DEBE devolver EXACTAMENTE una fila con el valor exacto: produccion
