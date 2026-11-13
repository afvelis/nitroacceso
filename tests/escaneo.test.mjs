// escaneo.test.mjs - tests del flujo de puerta por RPC contra staging (P1-04, Fase C via A).
// Corren con: node --test tests/  (sin instalar nada; Node >= 18 trae fetch).
//
// NOTA sobre los datos de demo: son FINITOS (el seed crea V-DEMO01 y V-DEMO02,
// y nada los regenera). Por eso el test de doble escaneo lee el estado actual
// de V-DEMO02 ANTES de actuar y se ramifica segun lo que encuentra: un test
// que asumiera "pendiente" fallaria a partir de la segunda ejecucion, cuando
// el vendedor ya queda autorizado. V-DEMO01 se deja limpio (solo lectura)
// para las demos manuales; el vendedor consumido por los tests es V-DEMO02.

import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { login, rpc, PIN_PUERTA_DEMO, leerEntornoStaging } from "./helpers.mjs";

// Candado temprano: si algo apunta fuera de staging, fallar antes de cualquier test.
leerEntornoStaging();

const VENDEDOR_DEMO = "V-DEMO01";      // solo lectura: reservado para demos manuales
const VENDEDOR_CONSUMIDO = "V-DEMO02"; // lo mutan los tests (doble escaneo, dia invalido)
const CODIGO_INEXISTENTE = "V-NOEXISTE-TEST";

// Las RPC de puerta exigen rol 'puerta', asi que el token sale de f_login
// con el PIN de puerta de demo.
async function tokenPuerta() {
  const ses = await login(PIN_PUERTA_DEMO);
  assert.notEqual(ses, null, "no se pudo iniciar sesion de puerta para los tests");
  assert.equal(ses.rol, "puerta");
  return ses.token;
}

async function verVendedor(token, codigo) {
  const r = await rpc("f_puerta_vendedor_por_qr", { p_token: token, p_codigo_qr: codigo });
  // Con token valido la RPC responde 200; el cuerpo es el objeto o null.
  if (!r.ok) return null;
  return r.datos;
}

test("escaneo valido: f_puerta_vendedor_por_qr devuelve el vendedor de demo", async () => {
  const token = await tokenPuerta();
  const v = await verVendedor(token, VENDEDOR_DEMO);
  assert.notEqual(v, null, "V-DEMO01 deberia existir en el seed de staging");
  assert.ok(v.vendedor_id, "falta vendedor_id");
  assert.ok(typeof v.estado_dia1 === "string" && v.estado_dia1.length > 0, "falta estado_dia1");
});

test("escaneo inexistente: un codigo que no existe devuelve null", async () => {
  const token = await tokenPuerta();
  const v = await verVendedor(token, CODIGO_INEXISTENTE);
  assert.equal(v, null, "un codigo QR inexistente debe devolver null");
});

test("token invalido: no devuelve datos de nadie (prueba de seguridad)", async () => {
  // Token inventado con formato uuid valido: la sesion no existe en la base.
  // Se afirma "no hay datos" (null o error), nunca un status concreto.
  const tokenFalso = randomUUID();
  const v = await verVendedor(tokenFalso, VENDEDOR_DEMO);
  assert.equal(v, null, "un token inventado no debe devolver datos de ningun vendedor");
});

test("doble escaneo: autorizar, repetir y comprobar el estado", async () => {
  // VERIFICADO contra staging y contra el SQL de la migracion 0001:
  // f_puerta_marcar_vendedor hace `update ...; return found;` y `found` vale
  // true si el UPDATE coincidio con la fila, aunque los valores no cambien.
  // Por eso una llamada repetida sobre un vendedor ya autorizado tambien
  // devuelve true: las aserciones de este test son de ESTADO, no del booleano
  // de vuelta. Ademas se comprueba marcado_dia1_at: el UPDATE reescribe la
  // hora en cada llamada; si cambia, se imprime como HALLAZGO (la puerta
  // reescribiria la hora de entrada en un doble escaneo) sin arreglarlo aqui.
  const token = await tokenPuerta();
  const antes = await verVendedor(token, VENDEDOR_CONSUMIDO);
  assert.notEqual(antes, null, "V-DEMO02 deberia existir en el seed de staging");

  async function marcarAutorizado() {
    return rpc("f_puerta_marcar_vendedor", {
      p_token: token,
      p_vendedor_id: antes.vendedor_id,
      p_dia: 1,
      p_estado: "autorizado"
    });
  }

  console.log("doble escaneo: estado previo = " + antes.estado_dia1);

  // Primera autorizacion: no debe dar error y debe dejar el estado autorizado.
  const primera = await marcarAutorizado();
  assert.equal(primera.ok, true, "la primera autorizacion no debe dar error HTTP");
  if (antes.estado_dia1 !== "autorizado") {
    assert.equal(primera.datos, true, "la primera autorizacion deberia devolver true");
  }
  const trasPrimera = await verVendedor(token, VENDEDOR_CONSUMIDO);
  assert.equal(trasPrimera.estado_dia1, "autorizado", "tras autorizar, el estado debe ser autorizado");

  // REPETICION identica: no debe dar error y el estado debe seguir autorizado.
  const repetida = await marcarAutorizado();
  assert.equal(repetida.ok, true, "la autorizacion repetida no debe dar error HTTP");
  const trasRepetida = await verVendedor(token, VENDEDOR_CONSUMIDO);

  // HALLAZGO potencial: comparar la hora de la marca antes y despues de repetir.
  const marca1 = trasPrimera.marcado_dia1_at;
  const marca2 = trasRepetida.marcado_dia1_at;
  console.log("doble escaneo: marcado_dia1_at tras 1a autorizacion = " + marca1);
  console.log("doble escaneo: marcado_dia1_at tras repeticion     = " + marca2);
  if (marca1 !== marca2) {
    console.log("HALLAZGO: la autorizacion repetida REESCRIBE marcado_dia1_at: el doble escaneo reescribe la hora de entrada y no deja rastro de que ya estaba autorizado.");
  }

  // Asercion final: repetir no desautoriza y no deja el registro en otro estado.
  assert.equal(trasRepetida.estado_dia1, "autorizado",
    "tras la autorizacion repetida el vendedor debe seguir autorizado");
  assert.ok(trasRepetida.marcado_dia1_at, "el vendedor debe seguir con su marca del dia 1");
});

test("dia invalido: p_dia fuera de rango no autoriza el dia 1", async () => {
  // VERIFICADO contra staging y contra el SQL de la migracion 0001:
  // f_puerta_marcar_vendedor solo distingue p_dia = 1; cualquier otro valor
  // cae en la rama del dia 2 (limitacion conocida del servidor, fuera del
  // alcance de estos tests). La propiedad que SI garantiza y que este test
  // afirma es que un p_dia invalido NUNCA autoriza el dia 1 (el dia que el
  // escaner esta controlando): estado_dia1 queda invariable.
  // Efecto secundario documentado: esta llamada deja estado_dia2 de
  // V-DEMO02 en "autorizado" (vendedor de prueba, ya consumido por el test
  // de doble escaneo).
  const token = await tokenPuerta();
  const antes = await verVendedor(token, VENDEDOR_CONSUMIDO);
  assert.notEqual(antes, null, "V-DEMO02 deberia existir en el seed de staging");
  console.log("dia invalido: estado_dia1 previo = " + antes.estado_dia1);
  const r = await rpc("f_puerta_marcar_vendedor", {
    p_token: token,
    p_vendedor_id: antes.vendedor_id,
    p_dia: 9,
    p_estado: "autorizado"
  });
  const despues = await verVendedor(token, VENDEDOR_CONSUMIDO);
  assert.equal(despues.estado_dia1, antes.estado_dia1,
    "un p_dia invalido no debe cambiar el estado del dia 1");
});
