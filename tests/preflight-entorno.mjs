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

import { verificarEntornoStaging } from "./helpers.mjs";

try {
  await verificarEntornoStaging();
  console.log("ENTORNO STAGING PREPARADO: PIN de admin y PIN de puerta entran en staging.");
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
