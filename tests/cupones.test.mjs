// cupones.test.mjs - tests de lectura y guardas de las RPC de P1-01 fases 2a y 3
// (migraciones supabase/migrations/0008_p1_01_ledger_cupones.sql y
// supabase/migrations/0009_p1_01_cedulas_duplicadas.sql) contra staging.
// Corren con: node --test tests/*.test.mjs  (sin instalar nada; Node >= 18 trae fetch).
//
// ALCANCE DE SEGURO: estos tests solo cubren LECTURA (el cuadre y el reporte
// de duplicados) y las GUARDAS DE ERROR de la anulación (sesión, origen y
// motivo invalidos). NO prueban la anulación exitosa ni la escritura de los
// triggers del ledger, para no mutar datos de staging: anular un pase real o
// forzar movimientos de cupones deja rastro en la base de demostración. La
// detección real entre dos listas distintas queda como verificación manual /
// criterio aparte de P1-01, con datos controlados y limpieza posterior.

import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { login, rpc, PIN_ADMIN_DEMO } from "./helpers.mjs";

// Un solo login admin para toda la suite: las tres RPC exigen rol admin y
// compartir sesión evita gastar ventanas del limitador de login (incidente
// del 13/11: cada llamada cuenta para 5 fallos/15 min por IP).
const admin = await login(PIN_ADMIN_DEMO);

test("sesion admin disponible: login de staging devuelve token", () => {
  assert.ok(admin && admin.token, "Sin sesión admin de staging (¿PIN de demo rotado? ver P2-04)");
});

test("f_admin_cuadre_cupones devuelve estructura valida", async () => {
  assert.ok(admin && admin.token, "Sin sesión admin de staging (¿PIN de demo rotado? ver P2-04)");
  const r = await rpc("f_admin_cuadre_cupones", { p_token: admin.token });
  assert.equal(r.status, 200, "el cuadre con sesión válida debe responder 200");
  assert.equal(r.datos.ok, true, "el cuadre con sesión válida debe responder ok");
  assert.ok(Array.isArray(r.datos.filas), "el cuadre debe devolver la lista 'filas'");
  assert.ok(r.datos.huerfanas && typeof r.datos.huerfanas === "object", "el cuadre debe devolver el objeto 'huerfanas'");
});

test("f_admin_cuadre_cupones rechaza token invalido", async () => {
  // Token inventado con formato uuid valido: la sesion no existe en la base.
  const r = await rpc("f_admin_cuadre_cupones", { p_token: randomUUID() });
  assert.equal(r.datos.error, "ERR_SESION", "un token inventado debe dar ERR_SESION");
});

test("f_admin_cedulas_duplicadas devuelve estructura valida", async () => {
  assert.ok(admin && admin.token, "Sin sesión admin de staging (¿PIN de demo rotado? ver P2-04)");
  const r = await rpc("f_admin_cedulas_duplicadas", { p_token: admin.token });
  assert.equal(r.status, 200, "el reporte con sesión válida debe responder 200");
  assert.equal(r.datos.ok, true, "el reporte con sesión válida debe responder ok");
  assert.ok(Array.isArray(r.datos.filas), "el reporte debe devolver la lista 'filas'");
});

test("f_admin_cedulas_duplicadas rechaza token invalido", async () => {
  const r = await rpc("f_admin_cedulas_duplicadas", { p_token: randomUUID() });
  assert.equal(r.datos.error, "ERR_SESION", "un token inventado debe dar ERR_SESION");
});

test("f_admin_anular_pase_duplicado rechaza sesion invalida", async () => {
  // Guarda ANTES de cualquier escritura: con sesión invalida la RPC debe
  // rechazar y no tocar la base.
  const r = await rpc("f_admin_anular_pase_duplicado", {
    p_token: randomUUID(),
    p_origen: "personas",
    p_id: randomUUID(),
    p_motivo: "prueba de guarda"
  });
  assert.equal(r.datos.error, "ERR_SESION", "un token inventado debe dar ERR_SESION");
});

test("f_admin_anular_pase_duplicado rechaza origen invalido", async () => {
  // Guarda de dominio: un origen que no existe entre los permitidos se
  // rechaza sin mirar p_id ni p_motivo, y sin escribir nada.
  const r = await rpc("f_admin_anular_pase_duplicado", {
    p_token: admin.token,
    p_origen: "basura",
    p_id: randomUUID(),
    p_motivo: "prueba de guarda"
  });
  assert.equal(r.datos.error, "ERR_ORIGEN_INVALIDO", "un origen inventado debe dar ERR_ORIGEN_INVALIDO");
});

test("f_admin_anular_pase_duplicado rechaza motivo vacio", async () => {
  // Regla B (DECISIONES, 2026-11-22): nada se anula sin motivo. Un motivo
  // de solo espacios es tan inaceptable como uno vacío.
  const r = await rpc("f_admin_anular_pase_duplicado", {
    p_token: admin.token,
    p_origen: "personas",
    p_id: randomUUID(),
    p_motivo: "   "
  });
  assert.equal(r.datos.error, "ERR_MOTIVO_VACIO", "un motivo en blanco debe dar ERR_MOTIVO_VACIO");
});
