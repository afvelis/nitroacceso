// preflight-entorno.mjs - comprueba que el entorno de staging esta preparado (P2-04).
//
// Uso: node tests/preflight-entorno.mjs
//
// Hace 1 login con el PIN de admin y 1 con el PIN de puerta contra staging.
// En exito imprime una unica linea con "ENTORNO STAGING PREPARADO" y termina
// con codigo 0; en fallo imprime por stderr el mensaje del error (solo el
// mensaje, sin stack trace) y termina con codigo 1.
//
// NO es un *.test.mjs a proposito: asi `node --test tests/*.test.mjs` no lo
// recoge como suite (solo recoge los terminados en .test.mjs). El CI corre
// este script como primer paso del job, ANTES de las suites, para que un
// entorno no preparado falle ahi y no parezca codigo roto.

import { verificarEntornoStaging, login, rpc, PIN_PUERTA_DEMO } from "./helpers.mjs";

try {
  await verificarEntornoStaging();

  // Estado real del evento con el rol puerta (P1-02 / P2-04): el CI depende
  // de campos de config ademas de los PIN — si el evento esta en edicion la puerta no
  // autoriza nada (0011) y si dia_activo no es 1 ni 2 la suite no tiene
  // sentido. Fallar AQUI con mensaje de entorno, no como 18 tests rojos
  // que parecen codigo roto.
  const ses = await login(PIN_PUERTA_DEMO, "puerta");
  if (!ses) {
    throw new Error("f_login de puerta no dio sesion en el preflight: no se puede consultar f_puerta_estado");
  }
  const r = await rpc("f_puerta_estado", { p_token: ses.token });
  const estado = (r.ok && r.datos && typeof r.datos === "object") ? r.datos : null;
  if (!estado) {
    throw new Error("f_puerta_estado no responde para el rol puerta");
  }
  if (estado.edicion_abierta === true) {
    throw new Error("ENTORNO STAGING EN EDICIÓN: la puerta no debe autorizar. Pon config.edicion_abierta = false antes de correr el CI");
  }
  if (estado.dia_activo !== 1 && estado.dia_activo !== 2) {
    throw new Error("config.dia_activo de staging es " + JSON.stringify(estado.dia_activo) + " y no es 1 ni 2: no hay dia activo valido para correr la suite");
  }

  console.log("ENTORNO STAGING PREPARADO: PIN de admin y PIN de puerta entran en staging; dia_activo = " + estado.dia_activo + ".");
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
