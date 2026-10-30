/* config.js - ajustes generales de nitroacceso */
const NOMBRE_EVENTO = "NITROSYSTEM";
const SUPABASE_URL = "https://exrbwctegkzxurzwihvh.supabase.co";
const SUPABASE_ANON = "sb_publishable_bi7cWsc1qmhvlAE4tdNLbA_bUE-SWDu";
const BASE = "https://afvelis.github.io/nitroacceso/";

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
window.NA = { esc: escaparHtml, escaparHtml: escaparHtml };

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

function ponerQR(contenedor, data, textoCodigo) {
  contenedor.innerHTML = "";
  const img = document.createElement("img");
  img.alt = "codigo QR";
  img.width = 220;
  img.height = 220;
  img.src = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" + encodeURIComponent(data);
  img.onerror = function () {
    const img2 = document.createElement("img");
    img2.alt = "codigo QR";
    img2.width = 220;
    img2.height = 220;
    img2.src = "https://quickchart.io/qr?size=220&text=" + encodeURIComponent(data);
    img2.onerror = function () {
      contenedor.innerHTML = "<p style='font-size:28px;font-weight:800;color:#000;'>" + textoCodigo + "</p>";
    };
    contenedor.innerHTML = "";
    contenedor.appendChild(img2);
  };
  contenedor.appendChild(img);
  const p = document.createElement("p");
  p.textContent = "Codigo: " + textoCodigo;
  p.style.fontSize = "22px";
  p.style.fontWeight = "800";
  p.style.color = "#000";
  p.style.letterSpacing = "2px";
  p.style.marginTop = "12px";
  p.style.fontFamily = "ui-monospace, Menlo, Consolas, monospace";
  p.style.textAlign = "center";
  contenedor.appendChild(p);
}

function linkWA(texto) {
  return "https://wa.me/?text=" + encodeURIComponent(texto);
}
function linkCorreo(asunto, texto) {
  return "mailto:?subject=" + encodeURIComponent(asunto) + "&body=" + encodeURIComponent(texto);
}
