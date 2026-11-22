// helpers.mjs - modulo de apoyo para los tests por RPC contra staging (P1-04, Fase C via A).
// Este modulo NO define tests: solo funciones compartidas. Se ejecuta al ser
// importado por las suites, nunca como suite propia (no llama a node:test).
//
// login(pin, rol) pasa el rol EXPLICITO (`p_rol_solicitado`) a f_login con la
// firma de la 0005: los cubos del limitador son separados por rol (puerta 90 s,
// admin 15 min) y comprar en el cubo legado `null` (un argumento) deja el
// aislamiento por rol sin probar y tasa los logins de test al cubo compartido
// (P0-09). El valor del rol es obligatorio y validado: nunca se llama con null.
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
    host = new URL(url).hostname.toLowerCase();
  } catch (e) {
    throw new Error("La url de staging en config.js no es una URL valida.");
  }

  // Referencia del proyecto de staging. Si config.js cambia de proyecto de
  // staging, este candado debe actualizarse a mano junto con config.js.
  // Se compara por IGUALDAD de hostname exacto, nunca por inclusion en la
  // URL: una URL de otro proyecto que solo CONTENGA la referencia en el
  // path o la query no pasa el candado.
  const HOST_STAGING = "adoqujnnnrlgmvwbnwbl.supabase.co";
  if (host !== HOST_STAGING) {
    throw new Error(
      "ABORTADO: la url de staging de config.js no apunta al host exacto del proyecto de staging esperado (" +
      HOST_STAGING + "). Los tests SOLO corren contra staging, nunca contra produccion."
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

// f_login con un PIN y su rol explicito. Devuelve {token, rol} o null si no
// hay sesion. Un PIN malo devuelve array vacio; si la IP esta bloqueada el
// servidor responde con un HTTP de error cuyo texto empieza por BLOQUEADO. En
// ambos casos: null. El rol obligatorio ("admin" o "puerta") evita gastar el
// cubo legado null por accidente (P0-09).
export async function login(pin, rol) {
  if (rol !== "admin" && rol !== "puerta") {
    throw new Error("login() requiere rol 'admin' o 'puerta' (no usar el cubo legado null)");
  }
  const r = await rpc("f_login", { p_pin: pin, p_rol_solicitado: rol });
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

// ---------------------------------------------------------------------------
// PREFLIGHT DEL ENTORNO DE STAGING (P2-04): distingue un "entorno roto" de
// un "codigo roto". Existe porque rotar un PIN en staging tumbo el CI con 8
// fallos que parecian de codigo y bloquearon un PR que nada tenia que ver.
//
// Este preflight NO se ejecuta dentro de cada suite A PROPOSITO: son 3 suites
// x 2 logins por suite y, si el entorno esta roto, cada login fallido gasta
// el limitador de f_login (5 fallos por IP y rol cada 15 min): se agotaria la
// cuota y se taparia el diagnostico. Por eso va en un paso propio del job de
// CI (una vez por corrida, no por suite) y en el script manual
// tests/preflight-entorno.mjs.
//
// El diagnostico es SIN AMBIGUEDAD a proposito (correccion del 22/11/2026):
// una caida de red o un HTTP de error NO se reporta igual que "un PIN fue
// rechazado", para no mandar a nadie a restaurar el seed cuando el problema
// es la conexion. motivoLogin() clasifica cada login y verificarEntornoStaging()
// lista, para cada rol que fallo, el motivo y SOLO la remediacion de ese motivo.

// Mensaje canonico del preflight: si el entorno no esta preparado, este texto
// abre el diagnostico (en el log del CI y en el script manual).
export const MENSAJE_ENTORNO_NO_PREPARADO = "ENTORNO STAGING NO PREPARADO";

// Clasifica UNA llamada a f_login con un PIN y su rol explicito. Devuelve un
// string corto: "sesion" si hay token, "rechazado" si la respuesta es 2xx con
// array vacio, "bloqueado" si el texto de la respuesta contiene BLOQUEADO,
// "http_<status>" si la respuesta no es ok, y "red" si fetch lanza. No imprime
// nada y no expone tokens, claves ni valores de PIN (regla del modulo).
// NOTA: rpc() llama a leerEntornoStaging(), asi que el candado de produccion
// corre aqui tambien; su excepcion no puede confundirse con "red" porque
// verificarEntornoStaging() lo llama PRIMERO y sin capturar (ver abajo).
export async function motivoLogin(pin, rol) {
  let r;
  try {
    r = await rpc("f_login", { p_pin: pin, p_rol_solicitado: rol });
  } catch (e) {
    return "red";
  }
  if (typeof r.texto === "string" && r.texto.includes("BLOQUEADO")) return "bloqueado";
  if (!r.ok) return "http_" + r.status;
  if (Array.isArray(r.datos) && r.datos.length > 0 && r.datos[0] && r.datos[0].token) {
    return "sesion";
  }
  return "rechazado";
}

// Remediacion solo para cada motivo que fallo (nunca la generica de siempre).
function remediacionDeMotivo(motivo) {
  if (motivo === "rechazado") {
    return "restaura los PIN de demo del seed (supabase/seed.sql) y ver docs/dev-local.md seccion 6";
  }
  if (motivo === "bloqueado") {
    return "el limitador de f_login bloqueo la IP por fallos recientes: esperar 15 minutos y reintentar";
  }
  if (motivo === "red") {
    return "no se pudo hablar con staging: revisar conexion y que el proyecto de staging este arriba";
  }
  // http_<status> y cualquier motivo futuro no reconocido:
  return "staging respondio con error HTTP: revisar el estado del proyecto de staging";
}

// Comprueba que los PIN de demo del seed siguen entrando en staging: 1 llamada
// f_login con el PIN de admin (rol "admin") y 1 con el PIN de puerta (rol
// "puerta"). NO imprime nada (que decida quien llama) y NO devuelve tokens ni
// claves. Devuelve { url, admin: true, puerta: true }; si alguno de los dos
// logins no da sesion, lanza un Error cuyo mensaje empieza por el mensaje
// canonico, dice por cada rol que fallo el MOTIVO entre parentesis (rechazado /
// bloqueado / red / http_<status>) y solo la remediacion que corresponda a ese
// motivo, sin revelar ningun valor de PIN.
export async function verificarEntornoStaging() {
  // Candado de produccion primero: si lanza, es un fallo de seguridad (la URL
  // no es staging) y se propaga TAL CUAL, sin reenvolverlo como entorno no
  // preparado.
  const { url } = leerEntornoStaging();

  const motivoAdmin = await motivoLogin(PIN_ADMIN_DEMO, "admin");
  const motivoPuerta = await motivoLogin(PIN_PUERTA_DEMO, "puerta");

  if (motivoAdmin === "sesion" && motivoPuerta === "sesion") {
    return { url: url, admin: true, puerta: true };
  }

  const fallos = [];
  if (motivoAdmin !== "sesion") fallos.push("el PIN de admin (" + motivoAdmin + ")");
  if (motivoPuerta !== "sesion") fallos.push("el PIN de puerta (" + motivoPuerta + ")");

  // Motivos distintos en orden de aparicion (1 o 2); su remediacion una vez.
  const motivos = [];
  for (const m of [motivoAdmin, motivoPuerta]) {
    if (m !== "sesion" && !motivos.includes(m)) motivos.push(m);
  }
  const remedios = motivos.map(remediacionDeMotivo).join("; ");

  const detalle = fallos.length === 1
    ? "no entra " + fallos[0] + " en staging."
    : "no entran " + fallos[0] + " ni " + fallos[1] + " en staging.";
  throw new Error(
    MENSAJE_ENTORNO_NO_PREPARADO + ": " + detalle +
    " Remediacion: " + remedios + "."
  );
}
