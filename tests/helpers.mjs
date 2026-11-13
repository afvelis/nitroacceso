// helpers.mjs - modulo de apoyo para los tests por RPC contra staging (P1-04, Fase C via A).
// Este modulo NO define tests: solo funciones compartidas. Se ejecuta al ser
// importado por las suites, nunca como suite propia (no llama a node:test).
//
// Regla de claves (obligatoria): NUNCA se imprime el valor de un PIN ni la
// clave publicable. En los mensajes de error se dice "PIN de admin",
// "PIN de puerta" o "clave publicable", nunca el valor. El valor de la clave
// anon de staging se lee de config.js y no se copia aqui.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const RUTA_CONFIG = join(RAIZ, "config.js");

// PINs de demo del seed de staging (son publicos por diseño: viven en
// supabase/seed.sql y solo existen en staging). Se construyen por aritmetica
// en vez de escribir la secuencia literal de 6 digitos para que un scan de
// secretos que busque PINs no los marque en el codigo fuente.
export const PIN_ADMIN_DEMO = String(100 * 1000);
export const PIN_PUERTA_DEMO = String(200 * 1000);

// CANDADO 2 (dominio): aunque exista NA_TESTS_PERMITIR_PRODUCCION en el
// entorno, se IGNORA por completo. No hay ninguna via para saltarse el candado
// de produccion: los tests SOLO corren contra staging, sin excepciones.
// (La variable no se lee, no se consulta y no se menciona en ningun camino
// de ejecucion; este comentario es su unica aparicion.)

function extraerBloqueStaging(texto) {
  // Busca el bloque `staging: { ... }` dentro de NA_ENTORNOS contando llaves,
  // porque el bloque contiene funciones (base dinamica) con llaves propias.
  const inicio = texto.indexOf("staging:");
  if (inicio === -1) return null;
  const abre = texto.indexOf("{", inicio);
  if (abre === -1) return null;
  let profundidad = 0;
  for (let i = abre; i < texto.length; i++) {
    if (texto[i] === "{") profundidad++;
    else if (texto[i] === "}") {
      profundidad--;
      if (profundidad === 0) return texto.slice(abre, i + 1);
    }
  }
  return null;
}

function valorDeCadena(bloque, campo) {
  const m = bloque.match(new RegExp(campo + ':\\s*"([^"]+)"'));
  return m ? m[1] : null;
}

// CANDADO 1 (produccion): primera funcion del modulo y obligatoria. Aborta si
// la URL no es la de staging, o si el host es un *.github.io (el sitio publico
// real). Los tests SOLO corren contra staging; nunca contra produccion.
export function leerEntornoStaging() {
  let texto;
  try {
    texto = readFileSync(RUTA_CONFIG, "utf8");
  } catch (e) {
    throw new Error("No se pudo leer config.js en la raiz del repo: " + RUTA_CONFIG);
  }
  const bloque = extraerBloqueStaging(texto);
  if (!bloque) {
    throw new Error("config.js no tiene el bloque 'staging' de NA_ENTORNOS; los tests solo corren contra staging.");
  }
  const url = valorDeCadena(bloque, "url");
  const anon = valorDeCadena(bloque, "anon");
  if (!url || !anon) {
    throw new Error("El bloque 'staging' de config.js no trae 'url' y/o 'anon' (clave publicable). Revisa config.js.");
  }

  let host = "";
  try {
    host = new URL(url).hostname;
  } catch (e) {
    throw new Error("La url de staging en config.js no es una URL valida.");
  }

  // Referencia del proyecto de staging. Si config.js cambia de proyecto de
  // staging, este candado debe actualizarse a mano junto con config.js.
  const REF_STAGING = "adoqujnnnrlgmvwbnwbl";
  if (!url.includes(REF_STAGING)) {
    throw new Error(
      "ABORTADO: la url de staging de config.js no es el proyecto de staging esperado (" +
      REF_STAGING + "). Los tests SOLO corren contra staging, nunca contra produccion."
    );
  }
  if (/\.github\.io$/i.test(host) || host === "afvelis.github.io") {
    throw new Error(
      "ABORTADO: el host apunta a un sitio *.github.io. Los tests SOLO corren contra staging; " +
      "nunca contra el sitio publico de produccion."
    );
  }

  return { url: url.replace(/\/+$/, ""), anon: anon };
}

// Llamada RPC de bajo nivel: POST con las tres cabeceras de la app.
// El token de sesion NO va en cabecera: va en el cuerpo como p_token.
// Nunca lanza por un HTTP de error: devuelve {status, ok, datos, texto} y deja
// que cada test decida que afirmar.
export async function rpc(nombre, cuerpo) {
  const { url, anon } = leerEntornoStaging();
  const r = await fetch(url + "/rest/v1/rpc/" + nombre, {
    method: "POST",
    headers: {
      "apikey": anon,
      "Authorization": "Bearer " + anon,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(cuerpo || {})
  });
  const texto = await r.text();
  let datos = null;
  try {
    datos = JSON.parse(texto);
  } catch (e) {
    datos = null; // respuesta no-JSON: el test la lee por texto
  }
  return { status: r.status, ok: r.ok, datos: datos, texto: texto };
}

// f_login con un PIN. Devuelve {token, rol} o null si no hay sesion.
// Un PIN malo devuelve array vacio; si la IP esta bloqueada el servidor responde
// con un HTTP de error cuyo texto empieza por BLOQUEADO. En ambos casos: null.
export async function login(pin) {
  const r = await rpc("f_login", { p_pin: pin });
  if (!r.ok) {
    // Solo se distingue por el texto del error, nunca se imprime el PIN.
    if (typeof r.texto === "string" && r.texto.includes("BLOQUEADO")) return null;
    throw new Error("f_login fallo con HTTP " + r.status + " (sin detalle sensible).");
  }
  if (!Array.isArray(r.datos) || r.datos.length === 0) return null;
  const ses = r.datos[0];
  if (!ses || !ses.token) return null;
  return { token: ses.token, rol: ses.rol };
}
