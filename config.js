/* config.js - ajustes generales de nitroacceso */
const NOMBRE_EVENTO = "NITROSYSTEM";

// ===== P1-04 · Fase B: entornos staging/producción =====
// Cómo probar contra staging (Fase B):
//   1) Añadir ?env=staging a la URL de la página (p. ej. index.html?env=staging), o
//   2) Definir window.__NA_ENV__ = "staging" ANTES de cargar este script.
// Seguridad (blindaje): en cualquier host *.github.io (incluido afvelis.github.io,
// el sitio público real) se ignora CUALQUIER override (?env= o __NA_ENV__) y se
// fuerza producción, para que un enlace mal copiado nunca conecte el sitio
// público a la base de pruebas. Cuando se ignora un override se avisa por consola.
// Valores aceptados: "staging", "produccion" y "prod" (alias); cualquier otro
// valor se ignora y se usa producción.
const NA_ENTORNOS = {
  produccion: {
    url: "https://exrbwctegkzxurzwihvh.supabase.co",
    anon: "sb_publishable_bi7cWsc1qmhvlAE4tdNLbA_bUE-SWDu",
    base: "https://afvelis.github.io/nitroacceso/"
  },
  staging: {
    url: "https://adoqujnnnrlgmvwbnwbl.supabase.co",
    anon: "sb_publishable_ptjJ7P0EVlsm_ijx-qOazg_3cMP8i_u",
    // Base dinámica: los QR generados en staging apuntan al sitio donde se
    // está probando, no a producción.
    base: (typeof location !== "undefined" && location && location.origin) ? location.origin + "/" : ""
  }
};

// Resolución PURA del entorno, en este orden: (a) blindaje *.github.io primero,
// (b) override window.__NA_ENV__, (c) parámetro ?env= de la URL, (d) producción
// por defecto. No depende del DOM (solo de sus argumentos) para poder probarse
// sin navegador (Fase C). Devuelve "staging" o "produccion".
function resolverEntorno(hostname, search, override) {
  function normalizar(valor) {
    if (typeof valor !== "string") return null;
    const v = valor.trim().toLowerCase();
    if (v === "staging") return "staging";
    if (v === "produccion" || v === "prod") return "produccion";
    return null;
  }
  function valorParametroEnv(search) {
    if (typeof search !== "string" || !search) return null;
    const m = search.match(/[?&]env=([^&]*)/);
    if (!m) return null;
    try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
  }
  const esGithubPages = typeof hostname === "string" &&
    (hostname.toLowerCase() === "afvelis.github.io" || /\.github\.io$/.test(hostname.toLowerCase()));
  if (esGithubPages) {
    const intento = normalizar(override) || normalizar(valorParametroEnv(search));
    if (intento && intento !== "produccion") {
      console.warn("NA: el host " + String(hostname).toLowerCase() + " es *.github.io: se IGNORA el override de entorno (" + intento + ") y se fuerza produccion por seguridad.");
    }
    return "produccion";
  }
  const porOverride = normalizar(override);
  if (porOverride) return porOverride;
  const porParametro = normalizar(valorParametroEnv(search));
  if (porParametro) return porParametro;
  return "produccion";
}

// Entorno activo de esta carga, con guardas para no romper si el script se
// carga sin DOM/window (tests, node).
const NA_ENTORNO = resolverEntorno(
  (typeof location !== "undefined" && location && location.hostname) ? location.hostname : "",
  (typeof location !== "undefined" && location && typeof location.search === "string") ? location.search : "",
  (typeof window !== "undefined" && window && window.__NA_ENV__) ? window.__NA_ENV__ : undefined
);
const NA_CFG = NA_ENTORNOS[NA_ENTORNO];

const SUPABASE_URL = NA_CFG.url;
const SUPABASE_ANON = NA_CFG.anon;
const BASE = NA_CFG.base;
const NA_ES_STAGING = NA_ENTORNO === "staging";

// Banner de entorno no-producción: banda fija abajo, sin tocar el layout de
// ninguna página (ninguna página tiene que llamar nada: se inyecta sola).
// Idempotente: si se ejecuta dos veces no duplica la banda (doble guarda:
// marca interna del módulo y búsqueda por id en el DOM).
var naBannerInyectado = false;
function inyectarBannerEntorno() {
  if (typeof document === "undefined") return;
  if (!NA_ES_STAGING) return;
  if (naBannerInyectado || document.getElementById("na-banner-entorno")) return;
  if (!document.body) return;
  const banda = document.createElement("div");
  banda.id = "na-banner-entorno";
  banda.textContent = "STAGING - datos ficticios (no es producción) - Supabase: " + NA_CFG.url.replace(/^https?:\/\//, "");
  banda.style.position = "fixed";
  banda.style.left = "0";
  banda.style.right = "0";
  banda.style.bottom = "0";
  banda.style.width = "100%";
  banda.style.height = "30px";
  banda.style.lineHeight = "30px";
  banda.style.backgroundColor = "#1a1a1a";
  banda.style.color = "#ffb020";
  banda.style.fontSize = "12px";
  banda.style.fontWeight = "700";
  banda.style.letterSpacing = "1px";
  banda.style.textAlign = "center";
  banda.style.fontFamily = "ui-monospace, Menlo, Consolas, monospace";
  banda.style.zIndex = "2147483647";
  banda.style.pointerEvents = "none";
  banda.style.userSelect = "none";
  document.body.appendChild(banda);
  naBannerInyectado = true;
}
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inyectarBannerEntorno);
  } else {
    inyectarBannerEntorno();
  }
}

// Un solo aviso de arranque: entorno activo y host de Supabase. NUNCA la clave.
if (typeof console !== "undefined" && console.info) {
  console.info("NA: entorno activo: " + NA_ENTORNO + " (Supabase: " + NA_CFG.url.replace(/^https?:\/\//, "") + ")");
}

// ===== P0-01 · Escape HTML central (única implementación del proyecto) =====
// Escapa los 5 caracteres con significado en HTML. Usar SIEMPRE que un dato
// que pueda venir de un usuario se interpole en innerHTML o en un atributo.
// Exposición: escaparHtml(...) global y alias NA.esc / NA.escaparHtml.
function escaparHtml(t) {
  return String(t == null ? "" : t)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
if (typeof window !== "undefined") {
  window.NA = {
    esc: escaparHtml,
    escaparHtml: escaparHtml,
    entorno: NA_ENTORNO,
    esStaging: NA_ES_STAGING,
    // Solo url y base del entorno activo: la clave NO se expone aquí.
    config: { url: SUPABASE_URL, base: BASE },
    resolverEntorno: resolverEntorno
  };
}

// ===== P0-01 · Validación en profundidad para formularios públicos =====
// Defensa adicional, NO sustituye al escape. Rechaza < y > (innecesarios en
// nombres/empresas/rubros) y longitudes excesivas. Permite acentos, apóstrofes
// y comillas para no rechazar nombres legítimos (el escape los neutraliza).
function textoPersonaValido(valor, maxLen) {
  if (typeof valor !== "string") return false;
  const v = valor.trim();
  if (!v || v.length > (maxLen || 60)) return false;
  return !/[<>]/.test(v);
}
function cedulaValida(valor) {
  if (typeof valor !== "string") return false;
  const v = valor.trim();
  return /^[0-9.\s-]{4,20}$/.test(v);
}
function correoValido(valor) {
  if (typeof valor !== "string") return false;
  const v = valor.trim();
  return v.length <= 120 && /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]{2,}$/.test(v);
}
function telefonoValido(valor) {
  if (typeof valor !== "string") return false;
  const v = valor.trim();
  return v.length >= 7 && v.length <= 30 && /^[0-9+\s().-]+$/.test(v);
}

async function llamar(nombre, args) {
  const r = await fetch(SUPABASE_URL + "/rest/v1/rpc/" + nombre, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON,
      "Authorization": "Bearer " + SUPABASE_ANON,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(args || {})
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t);
  }
  return await r.json();
}

function guardarSesion(token, rol) {
  sessionStorage.setItem("na_token", token);
  sessionStorage.setItem("na_rol", rol);
}
function leerSesion() {
  return { token: sessionStorage.getItem("na_token"), rol: sessionStorage.getItem("na_rol") };
}

// ===== P0-03 · Salida real =====
// Antes: solo borraba el token del navegador (la sesión seguía viva en la base).
// Ahora: revoca la sesión en la base (f_logout) y además limpia el navegador.
// La revocación va "dispara y olvida": el cierre local nunca se bloquea si la
// red falla; la sesión residual igual expira sola (8 h).
function borrarSesion() {
  const s = leerSesion();
  const t = s && s.token;
  sessionStorage.removeItem("na_token");
  sessionStorage.removeItem("na_rol");
  if (t) {
    try {
      llamar("f_logout", { p_token: t }).catch(function () {});
    } catch (e) {}
  }
}

// ===== P0-03 · Auto-bloqueo por inactividad =====
// Si la página queda 5 minutos sin interacción (clic, tecla, toque, scroll o
// movimiento del ratón), cierra la sesión real (borrarSesion → f_logout) y
// regresa al login. Pensado para el PC de la puerta y el panel del admin.
const NA_INACTIVIDAD_MS = 5 * 60 * 1000;
function iniciarAutoBloqueo() {
  let temporizador = null;
  function reiniciar() {
    if (temporizador) clearTimeout(temporizador);
    temporizador = setTimeout(function () {
      borrarSesion();
      location.replace("index.html");
    }, NA_INACTIVIDAD_MS);
  }
  ["click", "keydown", "mousemove", "touchstart", "scroll"].forEach(function (ev) {
    document.addEventListener(ev, reiniciar, { passive: true });
  });
  reiniciar();
}

function urlPuerta(param, valor) {
  return BASE + "puerta.html?" + param + "=" + encodeURIComponent(valor);
}

// ===== P0-04 · QR local (sin servicios de terceros) =====
// ANTES: la imagen del QR se pedía a un servicio de terceros (y un segundo
// servicio como respaldo), con el código del pase dentro de la URL. Ese código
// es una credencial: quien lo ve puede usarlo. Además, sin internet no había QR.
// AHORA: el QR se dibuja en el propio navegador con vendor/qrcode-generator.
// El código del pase NUNCA sale del equipo. Si la librería no cargara, se
// muestra el código y el link en texto (el respaldo manual del día del evento).
//
// Se dibuja en un <canvas> y además se deja el resultado como <img> con una
// URL data: (mismo tamaño de antes, 220x220). talento.html usa img.src para
// "Copiar QR" (fetch + portapapeles), así que el <img> debe seguir existiendo.
var QR_LIB_URL = "";
var QR_UTF8_URL = "";
// Guarda: si el script se carga sin DOM (tests, node) no hay de dónde calcular
// la URL de la librería; en navegador el comportamiento es idéntico al de antes.
if (typeof document !== "undefined" && typeof location !== "undefined") {
  const qrBaseScript = document.currentScript ? document.currentScript.src : location.href;
  QR_LIB_URL = new URL("vendor/qrcode-generator-1.4.4.js", qrBaseScript).href;
  QR_UTF8_URL = new URL("vendor/qrcode-generator-1.4.4-utf8.js", qrBaseScript).href;
}
var qrLibreriaEstado = { estado: "sin-cargar", promesa: null };
var qrContador = 0;

function cargarLibreriaQR() {
  if (typeof window.qrcode === "function") { qrLibreriaEstado.estado = "lista"; return Promise.resolve(true); }
  if (qrLibreriaEstado.promesa) return qrLibreriaEstado.promesa;
  function cargar(src) {
    return new Promise(function (resolver) {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = function () { resolver(true); };
      s.onerror = function () { resolver(false); };
      document.head.appendChild(s);
    });
  }
  qrLibreriaEstado.estado = "cargando";
  qrLibreriaEstado.promesa = cargar(QR_LIB_URL).then(function (ok) {
    if (!ok) { qrLibreriaEstado.estado = "fallo"; return false; }
    // El gancho UTF-8 es opcional: permite ñ y acentos en el texto codificado.
    return cargar(QR_UTF8_URL).then(function () {
      qrLibreriaEstado.estado = "lista";
      return typeof window.qrcode === "function";
    });
  });
  return qrLibreriaEstado.promesa;
}

function textoQRContenedor(contenedor, data, textoCodigo) {
  const caja = document.createElement("div");
  const pCodigo = document.createElement("p");
  pCodigo.textContent = "Código: " + textoCodigo;
  pCodigo.style.fontSize = "28px";
  pCodigo.style.fontWeight = "800";
  pCodigo.style.color = "#000";
  pCodigo.style.letterSpacing = "2px";
  pCodigo.style.textAlign = "center";
  const pLink = document.createElement("p");
  pLink.textContent = String(data);
  pLink.style.fontSize = "12px";
  pLink.style.color = "#333";
  pLink.style.wordBreak = "break-all";
  pLink.style.textAlign = "center";
  caja.appendChild(pCodigo);
  if (String(data) !== String(textoCodigo)) caja.appendChild(pLink);
  contenedor.appendChild(caja);
}

function dibujarPieQR(contenedor, textoCodigo) {
  const p = document.createElement("p");
  p.textContent = "Codigo: " + textoCodigo;
  // P0-04: el pie lleva fondo y color propios. Sin esto, en páginas cuyo QR vive
  // dentro de un div sin clase (talento.html) el texto negro caía sobre el fondo
  // oscuro de la página y quedaba ilegible.
  p.style.fontSize = "22px";
  p.style.fontWeight = "800";
  p.style.color = "#000";
  p.style.backgroundColor = "#fff";
  // display:block + width:fit-content + margin auto = el pie siempre va DEBAJO del
  // QR y centrado. Con inline-block se montaba al lado cuando el contenedor no
  // tiene ancho fijo (talento.html). clear:both lo separa de cualquier flotante.
  p.style.display = "block";
  p.style.width = "fit-content";
  p.style.maxWidth = "100%";
  p.style.marginLeft = "auto";
  p.style.marginRight = "auto";
  p.style.clear = "both";
  p.style.padding = "6px 14px";
  p.style.borderRadius = "8px";
  p.style.letterSpacing = "2px";
  p.style.marginTop = "12px";
  p.style.marginBottom = "0";
  p.style.fontFamily = "ui-monospace, Menlo, Consolas, monospace";
  p.style.textAlign = "center";
  p.style.whiteSpace = "nowrap";
  p.style.position = "relative";
  p.style.zIndex = "1";
  contenedor.appendChild(p);
}

// Dibuja, de forma SÍNCRONA (sin bloquear la UI con esperas), el QR de `data`.
// La mayoría de los códigos de este sistema caben entre 21x21 y 45x45 módulos,
// así que no hay coste apreciable en listas largas.
function construirQR(contenedor, data, textoCodigo) {
  if (typeof window.qrcode !== "function") return false;
  let qr = null;
  try {
    qr = window.qrcode(0, "M");
    qr.addData(String(data));
    qr.make();
  } catch (e) {
    try {
      qr = window.qrcode(0, "L");
      qr.addData(String(data));
      qr.make();
    } catch (e2) {
      return false;
    }
  }
  const n = qr.getModuleCount();
  const escala = Math.max(2, Math.floor(220 / (n + 8)));
  const margen = escala * 4;
  const lado = n * escala + margen * 2;

  const canvas = document.createElement("canvas");
  canvas.width = lado;
  canvas.height = lado;
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, lado, lado);
  ctx.fillStyle = "#000000";
  for (let fila = 0; fila < n; fila++) {
    for (let col = 0; col < n; col++) {
      if (qr.isDark(fila, col)) {
        ctx.fillRect(margen + col * escala, margen + fila * escala, escala, escala);
      }
    }
  }

  const url = canvas.toDataURL("image/png");
  const img = document.createElement("img");
  img.alt = "codigo QR";
  img.width = 220;
  img.height = 220;
  img.style.width = "220px";
  img.style.height = "220px";
  img.src = url;
  // Guardamos también el texto para que "Copiar QR" no dependa de img.src.
  img.setAttribute("data-qr-texto", String(data));
  contenedor.appendChild(img);
  return true;
}

function ponerQR(contenedor, data, textoCodigo) {
  contenedor.innerHTML = "";
  const token = "qr" + (++qrContador);
  contenedor.setAttribute("data-qr-token", token);
  const vacio = function () { return contenedor.getAttribute("data-qr-token") !== token; };

  if (typeof window.qrcode === "function") {
    if (construirQR(contenedor, data, textoCodigo)) { dibujarPieQR(contenedor, textoCodigo); return; }
  }
  cargarLibreriaQR().then(function (ok) {
    if (vacio()) return;
    // Solo se vacía si de verdad hay que pintar aquí: si la rama síncrona de
    // arriba ya dibujó, este .then no debe borrar el QR ni el pie del código.
    if (contenedor.childNodes.length === 0) {
      if (ok && construirQR(contenedor, data, textoCodigo)) {
        dibujarPieQR(contenedor, textoCodigo);
      } else {
        textoQRContenedor(contenedor, data, textoCodigo);
      }
    }
  });
}

function linkWA(texto) {
  return "https://wa.me/?text=" + encodeURIComponent(texto);
}
function linkCorreo(asunto, texto) {
  return "mailto:?subject=" + encodeURIComponent(asunto) + "&body=" + encodeURIComponent(texto);
}
