// ============================================================================
// negativos-login.manual.mjs - CASOS NEGATIVOS DE LOGIN: NO CORREN EN LA SUITE
// NI EN EL CI. Ejecutar SOLO A MANO:
//
//     node tests/negativos-login.manual.mjs
//
// POR QUE NO EN LA SUITE: cada intento fallido de f_login queda registrado en
// la base y el servidor bloquea una IP a partir de 5 fallos cada 15 minutos
// (el error empieza por BLOQUEADO). Este archivo gasta 2 fallos por ejecucion.
// Tres ejecuciones seguidas bloquean staging durante 15 minutos, y con ello
// tambien las demos manuales del usuario que compartan la IP. Regla de uso:
// como maximo UNA ejecucion por ventana de 15 minutos.
//
// QUE AFIRMA: un PIN incorrecto y un PIN de formato invalido (3 digitos) no
// devuelven sesion. Se aceptan las DOS respuestas validas: array vacio
// (HTTP 200) o error HTTP con BLOQUEADO en el texto. La asercion es "no hay
// token", nunca "el status es X": exigir un status concreto seria fragil.
// ============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { login, leerEntornoStaging } from "./helpers.mjs";

leerEntornoStaging();

// PIN inventado de 6 digitos que no es ninguno de los dos PIN de demo.
const PIN_INVENTADO = String(987654);
// PIN de formato invalido (3 digitos: el seed usa 6).
const PIN_CORTO = "123";

test("f_login con un PIN incorrecto no devuelve sesion", async () => {
  const ses = await login(PIN_INVENTADO);
  assert.equal(ses, null, "un PIN incorrecto no debe dar sesion");
});

test("f_login con un PIN de formato invalido (3 digitos) no devuelve sesion", async () => {
  const ses = await login(PIN_CORTO);
  assert.equal(ses, null, "un PIN de 3 digitos no debe dar sesion");
});
