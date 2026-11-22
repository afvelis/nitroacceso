// ============================================================================
// negativos-login.manual.mjs - CASOS NEGATIVOS Y DE AISLAMIENTO DE LOGIN:
// NO CORREN EN LA SUITE NI EN EL CI. Ejecutar SOLO A MANO:
//
//     node tests/negativos-login.manual.mjs
//
// POR QUE NO EN LA SUITE NI EN EL CI: cada intento fallido de f_login queda
// registrado en la base y el servidor bloquea la IP por cubos SEPARADOS por
// rol (puerta 90 segundos; admin 15 minutos). La helper login(pin, rol) ahora
// EXIGE el rol explicito y nunca compra en el cubo legado null. Este archivo
// gasta fallos del cubo puerta por ejecucion (ver cada test) y puede tumbar
// las demos manuales del usuario que compartan la IP. Regla de uso: como
// maximo UNA ejecucion por ventana (esperar a que el cubo este limpio).
//
// ESCENARIOS (3): (1) un PIN incorrecto no devuelve sesion; (2) un PIN de
// formato invalido (3 digitos) no devuelve sesion; (3) aislamiento por rol:
// 5 fallos en el cubo puerta no bloquean el siguiente login de admin.
//
// QUE AFIRMA: los negativos aceptan las DOS respuestas validas: array vacio
// (HTTP 200) o error HTTP con BLOQUEADO en el texto. La asercion es "no hay
// token", nunca "el status es X": exigir un status concreto seria fragil.
// ============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { login, PIN_ADMIN_DEMO, leerEntornoStaging } from "./helpers.mjs";

leerEntornoStaging();

// PIN inventado de 6 digitos que no es ninguno de los dos PIN de demo.
const PIN_INVENTADO = String(987654);
// PIN de formato invalido (3 digitos: el seed usa 6).
const PIN_CORTO = "123";

test("f_login con un PIN incorrecto no devuelve sesion", async () => {
  const ses = await login(PIN_INVENTADO, "puerta");
  assert.equal(ses, null, "un PIN incorrecto no debe dar sesion");
});

test("f_login con un PIN de formato invalido (3 digitos) no devuelve sesion", async () => {
  const ses = await login(PIN_CORTO, "puerta");
  assert.equal(ses, null, "un PIN de 3 digitos no debe dar sesion");
});

// MANUAL por diseño: consume los 5 fallos del cubo puerta y deja la puerta
// bloqueada ~90 segundos (ventana propia del rol puerta), con riesgo de tumbar
// un escaneo o la corrida siguiente; por eso NO va al CI ni a la suite.
test("MANUAL aislamiento: 5 fallos de puerta no bloquean el login de admin", async () => {
  // Provoca 5 fallos EXACTOS en el cubo puerta (PIN malo, rol puerta).
  for (let i = 0; i < 5; i++) {
    await login("000001", "puerta");
  }
  // El cubo admin es distinto: el login de admin debe seguir funcionando.
  const admin = await login(PIN_ADMIN_DEMO, "admin");
  assert.notEqual(admin, null, "el cubo admin no debe verse afectado por 5 fallos de puerta");
});
