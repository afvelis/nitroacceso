/* config.js - ajustes generales de nitroacceso */
const NOMBRE_EVENTO = "NITROACCESO";
const SUPABASE_URL = "https://exrbwctegkzxurzwihvh.supabase.co";
const SUPABASE_ANON = "sb_publishable_bi7cWsc1qmhvlAE4tdNLbA_bUE-SWDu";
const BASE = "https://afvelis.github.io/nitroacceso/";

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
function borrarSesion() {
  sessionStorage.removeItem("na_token");
  sessionStorage.removeItem("na_rol");
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
      contenedor.innerHTML = "<p style='font-size:28px;font-weight:bold;'>" + textoCodigo + "</p>";
    };
    contenedor.innerHTML = "";
    contenedor.appendChild(img2);
  };
  contenedor.appendChild(img);
  const p = document.createElement("p");
  p.textContent = "Codigo: " + textoCodigo;
  p.style.fontSize = "20px";
  contenedor.appendChild(p);
}

function linkWA(texto) {
  return "https://wa.me/?text=" + encodeURIComponent(texto);
}
function linkCorreo(asunto, texto) {
  return "mailto:?subject=" + encodeURIComponent(asunto) + "&body=" + encodeURIComponent(texto);
}
