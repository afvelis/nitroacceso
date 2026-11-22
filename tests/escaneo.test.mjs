// escaneo.test.mjs - tests del flujo de puerta por RPC contra staging (P1-04, Fase C via A).
// Corren con: node --test tests/*.test.mjs  (sin instalar nada; Node >= 18 trae fetch).
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
  const ses = await login(PIN_PUERTA_DEMO, "puerta");
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
  // CONTRATO NUEVO (migracion supabase/migrations/0003_f8_preserva_hora_reautorizacion.sql):
  // f_puerta_marcar_vendedor PRESERVA marcado_dia1_at cuando el vendedor ya
  // esta autorizado y ya tiene hora: la reautorizacion NO reescribe la hora de
  // la primera entrada. El retorno sigue siendo boolean y devuelve true en el
  // reintento, como EXITO IDEMPOTENTE; false queda reservado a rechazos reales
  // (rol, p_estado, p_dia, fila inexistente), asi la puerta no muestra
  // "No se pudo autorizar." en un escaneo que no rompio nada.
  // Hasta que la 0003 este aplicada en staging, este test es ROJO por
  // diseno: la funcion vieja reescribia la hora en cada llamada.
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

  // REPETICION identica: no debe dar error, debe devolver true (exito
  // idempotente) y el estado debe seguir autorizado.
  const repetida = await marcarAutorizado();
  assert.equal(repetida.ok, true, "la autorizacion repetida no debe dar error HTTP");
  assert.equal(repetida.datos, true,
    "la reautorizacion devuelve true como exito idempotente: un false aqui dispararia el error falso de la puerta");
  const trasRepetida = await verVendedor(token, VENDEDOR_CONSUMIDO);

  // La hora de entrada se PRESERVA: repetir no la reescribe.
  const marca1 = trasPrimera.marcado_dia1_at;
  const marca2 = trasRepetida.marcado_dia1_at;
  console.log("doble escaneo: marcado_dia1_at tras 1a autorizacion = " + marca1);
  console.log("doble escaneo: marcado_dia1_at tras repeticion     = " + marca2);
  assert.equal(marca2, marca1,
    "el doble escaneo REESCRIBE marcado_dia1_at: la hora de entrada queda clavada en la segunda autorizacion y se pierde la primera, sin dejar rastro del reintento (mira supabase/migrations/0003_f8_preserva_hora_reautorizacion.sql)");
  assert.notEqual(marca1, null,
    "marcado_dia1_at debe tener valor tras autorizar: la primera entrada debe quedar con hora registrada en la base");

  // Asercion final: repetir no desautoriza y no deja el registro en otro estado.
  assert.equal(trasRepetida.estado_dia1, "autorizado",
    "tras la autorizacion repetida el vendedor debe seguir autorizado");
  assert.ok(trasRepetida.marcado_dia1_at, "el vendedor debe seguir con su marca del dia 1");
});

test("dia invalido: p_dia fuera de rango no autoriza ningun dia", async () => {
  // Desde la migracion 0002_f9_valida_p_dia.sql el servidor rechaza cualquier
  // p_dia fuera de (1,2) ANTES de cualquier UPDATE (misma pauta que ya aplica
  // f_puerta_marcar_cortesia en 0001_esquema_inicial.sql:3970): devuelve false
  // y no toca ningun estado. Ya NO hay "limitacion conocida del servidor":
  // el caso anterior, que solo podia garantizar que el dia 1 quedaba
  // invariable (el dia 2 acababa autorizado), queda cubierto por esta
  // afirmacion completa.
  const token = await tokenPuerta();
  const antes = await verVendedor(token, VENDEDOR_CONSUMIDO);
  assert.notEqual(antes, null, "V-DEMO02 deberia existir en el seed de staging");
  console.log("dia invalido: estado_dia1 previo = " + antes.estado_dia1
    + " / estado_dia2 previo = " + antes.estado_dia2);
  const r = await rpc("f_puerta_marcar_vendedor", {
    p_token: token,
    p_vendedor_id: antes.vendedor_id,
    p_dia: 9,
    p_estado: "autorizado"
  });
  assert.equal(r.ok, true, "el rechazo es logico: la RPC debe responder 200, no error HTTP");
  assert.equal(r.datos, false, "la RPC debe devolver false para un p_dia fuera de (1,2)");
  const despues = await verVendedor(token, VENDEDOR_CONSUMIDO);
  assert.equal(despues.estado_dia1, antes.estado_dia1,
    "un p_dia invalido no debe cambiar el estado del dia 1");
  assert.equal(despues.estado_dia2, antes.estado_dia2,
    "un p_dia invalido no debe cambiar el estado del dia 2");
});

// Caso nuevo (14/11/2026): cubre el criterio 3 de F-9, que la validacion de
// p_dia introducida por supabase/migrations/0002_f9_valida_p_dia.sql:37 no
// haya roto los dias legítimos. Precedente del patron (rechazar el p_dia
// invalido ANTES del UPDATE): f_puerta_marcar_cortesia, en
// 0001_esquema_inicial.sql:3970. Hasta ahora la suite solo ejercitaba el
// dia 1 (doble escaneo) y un p_dia invalido (dia invalido): el dia 2
// legitimo no tenia prueba.
// Ampliado (14/11/2026, F-8): ademas cubre la REAUTORIZACION del dia 2
// (contrato nuevo de supabase/migrations/0003_f8_preserva_hora_reautorizacion.sql):
// repetir la marca de 'autorizado' sobre el dia 2 PRESERVA marcado_dia2_at
// y devuelve true como exito idempotente, igual que el doble escaneo del dia 1.
test("dia 2 legitimo: p_dia = 2 autoriza y desautoriza el dia 2 sin tocar el dia 1", async () => {
  // NOTA sobre el estado final: este test deja estado_dia2 de V-DEMO02 en
  // "autorizado" (su segundo marcado). Si empezo en otro valor (p. ej.
  // "pendiente"), NO lo restaura: se documenta aqui y no se anade logica
  // extra de restauracion, igual que hace el doble escaneo con el dia 1.
  const token = await tokenPuerta();
  const antes = await verVendedor(token, VENDEDOR_CONSUMIDO);
  assert.notEqual(antes, null, "V-DEMO02 deberia existir en el seed de staging");
  const dia1Previo = antes.estado_dia1;
  const dia2Previo = antes.estado_dia2;
  console.log("dia 2 legitimo: estado_dia1 previo = " + dia1Previo
    + " / estado_dia2 previo = " + dia2Previo);

  // Paso 1: marcar el dia 2 como pendiente (desautorizar).
  const pendiente = await rpc("f_puerta_marcar_vendedor", {
    p_token: token,
    p_vendedor_id: antes.vendedor_id,
    p_dia: 2,
    p_estado: "pendiente"
  });
  assert.equal(pendiente.ok, true, "la marca del dia 2 (pendiente) no debe dar error HTTP");
  assert.equal(pendiente.datos, true, "la marca del dia 2 (pendiente) debe encontrar la fila y devolver true");
  const trasPendiente = await verVendedor(token, VENDEDOR_CONSUMIDO);
  assert.equal(trasPendiente.estado_dia2, "pendiente",
    "tras marcar el dia 2, estado_dia2 debe ser pendiente");
  assert.equal(trasPendiente.estado_dia1, dia1Previo,
    "marcar el dia 2 no debe tocar el dia 1");

  // Paso 2: marcar el dia 2 como autorizado (camino legitimo del evento).
  const autorizado = await rpc("f_puerta_marcar_vendedor", {
    p_token: token,
    p_vendedor_id: antes.vendedor_id,
    p_dia: 2,
    p_estado: "autorizado"
  });
  assert.equal(autorizado.ok, true, "la marca del dia 2 (autorizado) no debe dar error HTTP");
  assert.equal(autorizado.datos, true, "la marca del dia 2 (autorizado) debe encontrar la fila y devolver true");
  const trasAutorizado = await verVendedor(token, VENDEDOR_CONSUMIDO);
  assert.equal(trasAutorizado.estado_dia2, "autorizado",
    "tras autorizar el dia 2, estado_dia2 debe ser autorizado");
  assert.equal(trasAutorizado.estado_dia1, dia1Previo,
    "autorizar el dia 2 no debe tocar el dia 1");
  assert.ok(trasAutorizado.marcado_dia2_at,
    "autorizar el dia 2 debe dejar marcado_dia2_at con valor");

  // Paso 3 (F-8): REAUTORIZACION del dia 2. La misma llamada repetida debe
  // devolver true (exito idempotente) y PRESERVAR marcado_dia2_at: la hora de
  // la primera entrada del dia 2 no se reescribe. Contrato de
  // supabase/migrations/0003_f8_preserva_hora_reautorizacion.sql. Con la
  // funcion vieja (solo 0002 aplicada) este paso es ROJO por diseno: la
  // llamada reescribia marcado_dia2_at con now() en cada pase.
  const marca2Primera = trasAutorizado.marcado_dia2_at;
  const repetidaDia2 = await rpc("f_puerta_marcar_vendedor", {
    p_token: token,
    p_vendedor_id: antes.vendedor_id,
    p_dia: 2,
    p_estado: "autorizado"
  });
  assert.equal(repetidaDia2.ok, true, "la reautorizacion del dia 2 no debe dar error HTTP");
  assert.equal(repetidaDia2.datos, true,
    "la reautorizacion del dia 2 devuelve true como exito idempotente: un false aqui dispararia el error falso de la puerta");
  const trasRepetidaDia2 = await verVendedor(token, VENDEDOR_CONSUMIDO);
  assert.equal(trasRepetidaDia2.estado_dia2, "autorizado",
    "tras la reautorizacion del dia 2, estado_dia2 debe seguir autorizado");
  assert.equal(trasRepetidaDia2.marcado_dia2_at, marca2Primera,
    "la reautorizacion del dia 2 REESCRIBE marcado_dia2_at: se pierde la hora de la primera entrada del dia 2, igual que pasaba con el dia 1 antes del arreglo (mira supabase/migrations/0003_f8_preserva_hora_reautorizacion.sql)");
  assert.notEqual(marca2Primera, null,
    "marcado_dia2_at debe tener valor tras autorizar el dia 2: la primera entrada del dia 2 debe quedar con hora registrada en la base");
  assert.equal(trasRepetidaDia2.estado_dia1, dia1Previo,
    "la reautorizacion del dia 2 no debe tocar el dia 1");
});
