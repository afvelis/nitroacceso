-- =============================================================================
-- seed.sql — fictitious staging data for NitroAccesos.
--
-- Safe to re-run: every INSERT uses ON CONFLICT DO NOTHING.
-- Contains zero real data: all names, emails and ID numbers are invented.
--
-- IMPORTANT: the PINs seeded here (100000 admin / 200000 door) are for
-- STAGING ONLY. NEVER use them in production.
--
-- Apply AFTER 0001_esquema_inicial.sql, against an empty database.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Config (single row, id = 1). PINs are bcrypt-hashed on insert.
-- -----------------------------------------------------------------------------
insert into public.config
  (id, nombre_evento, edicion_abierta, pin_admin, pin_puerta,
   dia_activo, dia1_cerrado, dia2_cerrado)
values
  (1, 'Staging - NitroAccesos (datos ficticios)', true,
   extensions.crypt('100000', extensions.gen_salt('bf')),
   extensions.crypt('200000', extensions.gen_salt('bf')),
   1, false, false)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Coordinators (one per type).
-- -----------------------------------------------------------------------------
insert into public.coordinadores (tipo, nombre, codigo, correo, activo) values
  ('talentos', 'Coordinador Talentos (demo)', 'COORD-TAL-001', 'coord-tal-001@example.com', true),
  ('stands',   'Coordinador Stands (demo)',   'COORD-STD-001', 'coord-std-001@example.com', true)
on conflict (codigo) do nothing;

-- -----------------------------------------------------------------------------
-- Talent with two lists (day 1 closed, day 2 in edition) and 3 people on day 1.
-- -----------------------------------------------------------------------------
insert into public.talentos
  (nombre, dia1, dia2, codigo_link, correo_link, coordinador_id)
values
  ('Talento Demo', true, true, 'TAL-DEMO01', 'tal-demo01@example.com',
   (select id from public.coordinadores where codigo = 'COORD-TAL-001'))
on conflict (codigo_link) do nothing;

insert into public.listas (talento_id, dia, estado, codigo_corto) values
  ((select id from public.talentos where codigo_link = 'TAL-DEMO01'), 1, 'cerrada',    'LST-DEMO01-D1'),
  ((select id from public.talentos where codigo_link = 'TAL-DEMO01'), 2, 'en_edicion', 'LST-DEMO01-D2')
on conflict (codigo_corto) do nothing;

insert into public.personas (lista_id, nombre, apellido, cedula, cargo, estado) values
  ((select id from public.listas where codigo_corto = 'LST-DEMO01-D1'), 'Nombre Uno',  'Apellido Uno',  '10000001', 'Invitado', 'pendiente'),
  ((select id from public.listas where codigo_corto = 'LST-DEMO01-D1'), 'Nombre Dos',  'Apellido Dos',  '10000002', 'Invitado', 'pendiente'),
  ((select id from public.listas where codigo_corto = 'LST-DEMO01-D1'), 'Nombre Tres', 'Apellido Tres', '10000003', 'Invitado', 'pendiente')
on conflict (lista_id, cedula) do nothing;

-- -----------------------------------------------------------------------------
-- Stand with capacity and 2 vendors with QR codes.
-- -----------------------------------------------------------------------------
insert into public.stands
  (numero, cupo, tipo, codigo_link, correo_link, nombre, coordinador_id, empresa, vende)
values
  ('S-01', 4, 'patrocinante', 'STD-DEMO01', 'std-demo01@example.com', 'Stand Demo',
   (select id from public.coordinadores where codigo = 'COORD-STD-001'),
   'Empresa Demo', 'Productos demo')
on conflict (codigo_link) do nothing;

insert into public.vendedores (stand_id, nombre, apellido, cedula, vende, empresa, codigo_qr) values
  ((select id from public.stands where codigo_link = 'STD-DEMO01'), 'Vendedor Uno', 'Apellido Uno', '20000001', 'Productos demo', 'Empresa Demo', 'V-DEMO01'),
  ((select id from public.stands where codigo_link = 'STD-DEMO01'), 'Vendedor Dos', 'Apellido Dos', '20000002', 'Productos demo', 'Empresa Demo', 'V-DEMO02')
on conflict (codigo_qr) do nothing;

-- -----------------------------------------------------------------------------
-- List-type courtesy with its list (day 1) and 2 people.
-- -----------------------------------------------------------------------------
insert into public.cortesias
  (tipo, nombre_organizacion, razon, dia1, dia2, codigo_link, estado)
values
  ('lista', 'Prensa Demo', 'prensa', true, false, 'COR-DEMO01', 'activa')
on conflict (codigo_link) do nothing;

insert into public.cortesia_listas (cortesia_id, dia, codigo_corto) values
  ((select id from public.cortesias where codigo_link = 'COR-DEMO01'), 1, 'COR-DEMO01-D1')
on conflict (codigo_corto) do nothing;

insert into public.cortesia_personas
  (cortesia_id, lista_id, nombre, apellido, cedula, estado)
values
  ((select id from public.cortesias where codigo_link = 'COR-DEMO01'),
   (select id from public.cortesia_listas where codigo_corto = 'COR-DEMO01-D1'),
   'Cortesia Uno', 'Apellido Uno', '30000001', 'pendiente'),
  ((select id from public.cortesias where codigo_link = 'COR-DEMO01'),
   (select id from public.cortesia_listas where codigo_corto = 'COR-DEMO01-D1'),
   'Cortesia Dos', 'Apellido Dos', '30000002', 'pendiente')
on conflict (lista_id, cedula) do nothing;

-- -----------------------------------------------------------------------------
-- Partner with one assignment and one contest.
-- -----------------------------------------------------------------------------
insert into public.aliados (nombre_organizacion, responsable, correo, activo) values
  ('Aliado Demo', 'Responsable Demo', 'aliado-demo@example.com', true)
on conflict do nothing;

insert into public.aliado_asignaciones
  (aliado_id, codigo_link, pool_tipo, cupones_unico, estado)
values
  ((select id from public.aliados where nombre_organizacion = 'Aliado Demo'),
   'ASI-DEMO01', 'unico', 100, 'activa')
on conflict (codigo_link) do nothing;

insert into public.aliado_concursos
  (asignacion_id, nombre, descripcion, fecha_concurso, cupones_reservados, estado)
values
  ((select id from public.aliado_asignaciones where codigo_link = 'ASI-DEMO01'),
   'Sorteo Demo', 'Concurso ficticio de staging', '2026-11-20', 10, 'abierto')
on conflict do nothing;
