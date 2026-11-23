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

// Estado REAL del evento en staging, leido una vez al cargar el archivo con la
// RPC existente f_puerta_estado (mismo token de puerta que usan los tests).
// Antes la suite asumia estado base (dia_activo = 1) y el CI cambiaba de
// resultado al avanzar el dia del evento: con la revalidacion de la 0011 el
// servidor rechaza p_dia <> dia_activo y el doble escaneo con p_dia: 1 fijo
// devolvia false. Con esto la suite es determinista con CUALQUIER dia_activo
// valido (1 o 2), y si staging esta en edicion falla con un mensaje claro de
// ENTORNO (no un false confuso que parece codigo roto).
const ESTADO_SERVIDOR = await (async () => {
  const token = await tokenPuerta();
  const r = await rpc("f_puerta_estado", { p_token: token });
  if (!r.ok || !r.datos || typeof r.datos !== "object") {
    throw new Error("f_puerta_estado no respondio para el rol puerta: no se puede determinar dia_activo de staging");
  }
  return r.datos;
})();
const diaActivo = ESTADO_SERVIDOR.dia_activo;
if (ESTADO_SERVIDOR.edicion_abierta === true) {
  throw new Error("staging está en edición: la puerta no puede autorizar; cierra la edición antes de correr los tests");
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
  //
  // El dia que se marca es el DIA ACTIVO leido de f_puerta_estado arriba
  // (antes era p_dia: 1 a mano, y con dia_activo = 2 en staging la 0011
  // devolvia false y tumbo el CI sin que el codigo estuviera roto). Los campos
  // estado_diaN / marcado_diaN_at se calculan del dia marcado, para que las
  // aserciones comparen lo que de verdad toco la RPC.
  const token = await tokenPuerta();
  const antes = await verVendedor(token, VENDEDOR_CONSUMIDO);
  assert.notEqual(antes, null, "V-DEMO02 deberia existir en el seed de staging");
  const campoEstado = "estado_dia" + diaActivo;
  const campoMarca = "marcado_dia" + diaActivo + "_at";

  async function marcarAutorizado() {
    return rpc("f_puerta_marcar_vendedor", {
      p_token: token,
      p_vendedor_id: antes.vendedor_id,
      p_dia: diaActivo,
      p_estado: "autorizado"
    });
  }

  console.log("doble escaneo: dia activo = " + diaActivo
    + " / estado previo = " + antes[campoEstado]);

  // Primera autorizacion: no debe dar error y debe dejar el estado autorizado.
  const primera = await marcarAutorizado();
  assert.equal(primera.ok, true, "la primera autorizacion no debe dar error HTTP");
  if (antes[campoEstado] !== "autorizado") {
    assert.equal(primera.datos, true, "la primera autorizacion deberia devolver true");
  }
  const trasPrimera = await verVendedor(token, VENDEDOR_CONSUMIDO);
  assert.equal(trasPrimera[campoEstado], "autorizado", "tras autorizar, el estado debe ser autorizado");

  // REPETICION identica: no debe dar error, debe devolver true (exito
  // idempotente) y el estado debe seguir autorizado.
  const repetida = await marcarAutorizado();
  assert.equal(repetida.ok, true, "la autorizacion repetida no debe dar error HTTP");
  assert.equal(repetida.datos, true,
    "la reautorizacion devuelve true como exito idempotente: un false aqui dispararia el error falso de la puerta");
  const trasRepetida = await verVendedor(token, VENDEDOR_CONSUMIDO);

  // La hora de entrada se PRESERVA: repetir no la reescribe.
  const marca1 = trasPrimera[campoMarca];
  const marca2 = trasRepetida[campoMarca];
  console.log("doble escaneo: " + campoMarca + " tras 1a autorizacion = " + marca1);
  console.log("doble escaneo: " + campoMarca + " tras repeticion          = " + marca2);
  assert.equal(marca2, marca1,
    "el doble escaneo REESCRIBE " + campoMarca + ": la hora de entrada queda clavada en la segunda autorizacion y se pierde la primera, sin dejar rastro del reintento (mira supabase/migrations/0003_f8_preserva_hora_reautorizacion.sql)");
  assert.notEqual(marca1, null,
    campoMarca + " debe tener valor tras autorizar: la primera entrada debe quedar con hora registrada en la base");

  // Asercion final: repetir no desautoriza y no deja el registro en otro estado.
  assert.equal(trasRepetida[campoEstado], "autorizado",
    "tras la autorizacion repetida el vendedor debe seguir autorizado");
  assert.ok(trasRepetida[campoMarca], "el vendedor debe seguir con su marca del dia " + diaActivo);
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

// Test reescrito (23/11/2026, PR #47): el objetivo ORIGINAL de este test era
// cubrir el dia 2 legitimo (criterio 3 de F-9) y su reautorizacion (F-8),
// pero exigia que el dia activo del servidor fuera 2: era INCOMPATIBLE con el
// doble escaneo, que marcaba el dia 1. Con la revalidacion de la 0011 el
// servidor ademas rechaza p_dia <> dia_activo, de modo que el dia legítimo
// que marca la puerta ES el dia activo y ya lo cubre el doble escaneo de
// arriba (con el dia activo dinamico, cubre 1 y 2 legitimos). Este test pasa
// a cubrir lo que hacia falta: el criterio 4 de P1-02 — el servidor rechaza
// autorizar en el dia que NO esta activo (con la puerta/esquema viejos la
// RPC aceptaba cualquier p_dia valido y el criterio no tenia prueba).
test("dia no activo: no autoriza en el dia equivocado (criterio 4)", async () => {
  const token = await tokenPuerta();
  const antes = await verVendedor(token, VENDEDOR_CONSUMIDO);
  assert.notEqual(antes, null, "V-DEMO02 deberia existir en el seed de staging");
  const otroDia = diaActivo === 1 ? 2 : 1;
  console.log("dia no activo: dia activo = " + diaActivo
    + " / se intenta el dia " + otroDia
    + " / estado_dia1 previo = " + antes.estado_dia1
    + " / estado_dia2 previo = " + antes.estado_dia2);
  const r = await rpc("f_puerta_marcar_vendedor", {
    p_token: token,
    p_vendedor_id: antes.vendedor_id,
    p_dia: otroDia,
    p_estado: "autorizado"
  });
  assert.equal(r.ok, true, "el rechazo es logico: la RPC debe responder 200, no error HTTP");
  assert.equal(r.datos, false,
    "criterio 4 de P1-02: no se puede autorizar en el dia que no esta activo");
  // El rechazo ocurre ANTES de cualquier UPDATE (misma pauta que el p_dia
  // invalido): ninguno de los dos dias debe cambiar de estado.
  const despues = await verVendedor(token, VENDEDOR_CONSUMIDO);
  assert.equal(despues.estado_dia1, antes.estado_dia1,
    "intentar autorizar el dia no activo no debe cambiar el estado del dia 1");
  assert.equal(despues.estado_dia2, antes.estado_dia2,
    "intentar autorizar el dia no activo no debe cambiar el estado del dia 2");
});
