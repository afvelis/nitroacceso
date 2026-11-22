// login.test.mjs - tests positivos de f_login contra staging (P1-04, Fase C via A).
// Corren con: node --test tests/*.test.mjs  (sin instalar nada; Node >= 18 trae fetch).
//
// Este archivo SOLO contiene casos positivos y no gasta cuota del limitador.
// Los casos negativos (PIN incorrecto, PIN de formato invalido) viven en
// tests/negativos-login.manual.mjs y NO corren en la suite ni en el CI: cada
// intento fallido consume 1 de los 5 fallos por IP cada 15 minutos que permite
// el servidor, y puede bloquear staging (y las demos manuales) 15 minutos.

import test from "node:test";
import assert from "node:assert/strict";
import { login, rpc, PIN_ADMIN_DEMO, PIN_PUERTA_DEMO, leerEntornoStaging } from "./helpers.mjs";

// Candado temprano: si algo apunta fuera de staging, fallar antes de cualquier test.
leerEntornoStaging();

test("f_login con el PIN de admin devuelve token y rol admin", async () => {
  const ses = await login(PIN_ADMIN_DEMO, "admin");
  assert.notEqual(ses, null, "f_login no devolvio sesion para el PIN de admin");
  assert.ok(typeof ses.token === "string" && ses.token.length > 0, "el token viene vacio");
  assert.equal(ses.rol, "admin");
});

test("f_login con el PIN de puerta devuelve token y rol puerta", async () => {
  const ses = await login(PIN_PUERTA_DEMO, "puerta");
  assert.notEqual(ses, null, "f_login no devolvio sesion para el PIN de puerta");
  assert.ok(typeof ses.token === "string" && ses.token.length > 0, "el token viene vacio");
  assert.equal(ses.rol, "puerta");
});

test("f_login con 1 argumento (legado, rol null) sigue respondiendo sin PGRST203", async () => {
  // Login EXITOSO por el cubo legado null: gasta un exito, no fallos. Sirve
  // para detectar que no reaparecen sobrecargas de f_login (PGRST203, HTTP 300)
  // y que la firma por defecto de la 0005 sigue viva.
  const r = await rpc("f_login", { p_pin: PIN_ADMIN_DEMO });
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.datos) && r.datos.length === 1, "f_login con 1 argumento debe devolver exactamente 1 fila");
  assert.equal(typeof r.datos[0].token, "string", "el token no viene");
  assert.equal(r.datos[0].rol, "admin", "el login por cubo null debe resolver rol admin con PIN de admin");
});

test("f_login rechaza rol invalido (ERR_ROL) sin consumir cubo", async () => {
  // El raise de la guardia ocurre ANTES de insertar en login_intentos, asi que
  // este test no consume cuota del limitador (seguro para CI).
  const r = await rpc("f_login", { p_pin: PIN_ADMIN_DEMO, p_rol_solicitado: "basura" });
  assert.equal(r.ok, false, "f_login con p_rol_solicitado invalido debe fallar");
  assert.ok(String(r.texto).includes("ERR_ROL"), "debe contener ERR_ROL");
});
