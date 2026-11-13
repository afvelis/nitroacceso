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
import { login, PIN_ADMIN_DEMO, PIN_PUERTA_DEMO, leerEntornoStaging } from "./helpers.mjs";

// Candado temprano: si algo apunta fuera de staging, fallar antes de cualquier test.
leerEntornoStaging();

test("f_login con el PIN de admin devuelve token y rol admin", async () => {
  const ses = await login(PIN_ADMIN_DEMO);
  assert.notEqual(ses, null, "f_login no devolvio sesion para el PIN de admin");
  assert.ok(typeof ses.token === "string" && ses.token.length > 0, "el token viene vacio");
  assert.equal(ses.rol, "admin");
});

test("f_login con el PIN de puerta devuelve token y rol puerta", async () => {
  const ses = await login(PIN_PUERTA_DEMO);
  assert.notEqual(ses, null, "f_login no devolvio sesion para el PIN de puerta");
  assert.ok(typeof ses.token === "string" && ses.token.length > 0, "el token viene vacio");
  assert.equal(ses.rol, "puerta");
});
