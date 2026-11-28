// ===== M-38 · coordinator.html: la persona acepta su invitación =====
// Es una página pública SIN login: el link ?i=INV-xxxx es el identificador.
// 1) Lee el ?i= y consulta el estado (f_invitacion_ver, sin datos personales).
// 2) Si está pendiente, muestra el formulario y llama a f_coordinador_aceptar.
// 3) Al aceptar, muestra el código COORD- y redirige a coord.html?c=CODIGO.
// Los errores bloqueantes van en modal propio (NA.avisar, norma v2.2) y
// los de campo, en el propio campo (borde rojo + aria-invalid + texto abajo).

var params = new URLSearchParams(window.location.search);
var codigoInvit = String(params.get('i') || '').toUpperCase().trim();

var cardCarga = document.getElementById('cardCarga');
var cardInvitacion = document.getElementById('cardInvitacion');
var cardListo = document.getElementById('cardListo');
var msgAviso = document.getElementById('msgAviso');

var tipoInvitacion = null;

function contenidoInvitacionTexto(tipo){
  return tipo === 'talentos'
    ? 'Una organización te ha invitado a coordinar los TALENTOS del evento: crearás y entregarás sus links de registro.'
    : 'Una organización te ha invitado a coordinar los STANDS del evento: crearás y entregarás los links de registro de los vendedores.';
}
function etiquetaTipo(tipo){
  return tipo === 'talentos' ? 'Coordinación de talentos' : 'Coordinación de stands';
}
// ===== Validación de campo (norma v2.2) =====
function marcarCampo(input, span, mensaje){
  input.setAttribute('aria-invalid', 'true');
  input.style.borderColor = 'var(--rojo)';
  span.textContent = mensaje;
}
function limpiarCampo(input, span){
  input.removeAttribute('aria-invalid');
  input.style.borderColor = '';
  span.textContent = '';
}
function nombreValido(valor, min, max){
  if (typeof valor !== 'string') return false;
  var v = valor.trim();
  if (v.length < (min || 3) || v.length > (max || 120)) return false;
  return !/[<>]/.test(v);
}
function validarFormulario(){
  var ok = true;
  limpiarCampo(inNombre(), errNombre());
  limpiarCampo(inCorreo(), errCorreo());
  limpiarCampo(inTelefono(), errTelefono());
  if (!nombreValido(inNombre().value, 3, 120)) {
    marcarCampo(inNombre(), errNombre(), 'Escribe tu nombre y apellido (3 a 120 letras, sin signos < o >).');
    ok = false;
  }
  var correo = inCorreo().value.trim();
  if (correo && !correoValido(correo)) {
    marcarCampo(inCorreo(), errCorreo(), 'Ese correo no es válido. Revísalo o déjalo vacío.');
    ok = false;
  }
  var tel = inTelefono().value.trim();
  if (tel && !telefonoValido(tel)) {
    marcarCampo(inTelefono(), errTelefono(), 'Teléfono no válido: usa dígitos (7 a 30), opcionalmente + ( ) . -');
    ok = false;
  }
  return ok;
}
// Accesos DOM perezosos (los ids no cambian; helpers por legibilidad)
function inNombre(){ return document.getElementById('inNombre'); }
function inCorreo(){ return document.getElementById('inCorreo'); }
function inTelefono(){ return document.getElementById('inTelefono'); }
function errNombre(){ return document.getElementById('errNombre'); }
function errCorreo(){ return document.getElementById('errCorreo'); }
function errTelefono(){ return document.getElementById('errTelefono'); }

function mensajeDeError(error){
  var mapa = {
    CODIGO_INVALIDO: 'El link de invitación no es válido. Pide al administrador que te envíe el link de nuevo.',
    YA_ACEPTADA: 'Esta invitación ya fue aceptada antes. Si no tienes tu código, pídeselo al administrador.',
    NO_VIGENTE: 'Esta invitación ya no está vigente (fue rechazada o expiró). Habla con el administrador.',
    LIMITE_DIARIO: 'Ya se activó un acceso con estos datos en las últimas 24 horas (límite anti-spam). Espera o usa otro correo/teléfono.',
    NOMBRE_INVALIDO: 'Revisa tu nombre: debe tener entre 3 y 120 letras.',
    EMAIL_INVALIDO: 'Revisa tu correo.',
    TELEFONO_INVALIDO: 'Revisa tu teléfono.'
  };
  return mapa[error] || 'No se pudo confirmar tu acceso. Intenta de nuevo o avisa al administrador.';
}

// 1) Estado de la invitación: sin este codigo no hay nada que mostrar.
async function iniciar(){
  if (!codigoInvit) {
    mostrarMuerto('No hay invitación activa en este link. El enlace debe abrirse con su código ?i=INV-xxx: pide al administrador que te lo reenvíe.');
    return;
  }
  try {
    var inv = await llamar('f_invitacion_ver', { p_codigo_invit: codigoInvit });
    if (!inv) {
      mostrarMuerto('Esta invitación no existe. Revisa el link: debe ser el que envió el administrador.');
      return;
    }
    tipoInvitacion = inv.tipo;
    if (inv.estado !== 'pendiente') {
      mostrarMuerto(inv.estado === 'aceptada'
        ? 'Esta invitación ya fue aceptada antes. Si no tienes tu código, pídeselo al administrador.'
        : 'Esta invitación ya no está vigente (fue rechazada o expiró). Habla con el administrador.');
      return;
    }
    document.getElementById('pillTipo').textContent = etiquetaTipo(inv.tipo);
    document.getElementById('textoInvitacion').textContent = contenidoInvitacionTexto(inv.tipo);
    cardCarga.hidden = true;
    cardInvitacion.hidden = false;
  } catch (e) {
    mostrarMuerto('No se pudo conectar con la base de datos. Revisa tu conexión y vuelve a abrir el link.');
  }
}

function mostrarMuerto(texto){
  cardCarga.hidden = true;
  cardInvitacion.hidden = true;
  cardListo.hidden = false;
  document.getElementById('codigoCoord').hidden = true;
  document.getElementById('btnIrPanel').hidden = true;
  document.getElementById('btnCopiarCodigo').hidden = true;
  document.getElementById('mensajeRedir').hidden = true;
  document.getElementById('textoListo').textContent = texto;
}

// 2) Confirmar: llama a la RPC pública y redirige a coord.html con el codigo.
async function confirmar(){
  var aviso = document.getElementById('msgAviso');
  aviso.hidden = true;
  if (!validarFormulario()) return;
  var btn = document.getElementById('btnConfirmar');
  btn.disabled = true;
  btn.textContent = 'Confirmando...';
  try {
    var r = await llamar('f_coordinador_aceptar', {
      p_codigo_invit: codigoInvit,
      p_nombre: inNombre().value.trim(),
      p_email: inCorreo().value.trim() || null,
      p_telefono: inTelefono().value.trim() || null
    });
    if (!r || !r.ok) {
      var texto = mensajeDeError(r ? r.error : 'FALLO');
      // Error que impide continuar: modal propio + aviso dentro del formulario (norma v2.2).
      await NA.avisar(texto, 'No se pudo confirmar');
      aviso.textContent = texto;
      aviso.hidden = false;
      if (r && (r.error === 'YA_ACEPTADA' || r.error === 'CODIGO_INVALIDO' || r.error === 'NO_VIGENTE')) {
        cardInvitacion.hidden = true;
      }
      return;
    }
    mostrarListo(r.codigo, r.tipo);
  } catch (e) {
    var textoNeto = 'No se pudo conectar con la base de datos. Revisa tu conexión e intenta de nuevo.';
    await NA.avisar(textoNeto, 'Sin conexión');
    aviso.textContent = textoNeto;
    aviso.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirmar mi acceso';
  }
}

var timerRedir = null;
var segundosRestantes = 8;
async function mostrarListo(codigo, tipo){
  cardInvitacion.hidden = true;
  cardListo.hidden = false;
  var caja = document.getElementById('codigoCoord');
  caja.hidden = false;
  caja.textContent = codigo;
  document.getElementById('btnIrPanel').onclick = function(){ irPanel(codigo); };
  document.getElementById('btnCopiarCodigo').onclick = async function(ev){
    ev.preventDefault();
    await copiarAlPortapapeles(codigo, ev.target);
  };
  var mensaje = document.getElementById('mensajeRedir');
  segundosRestantes = 8;
  repintarContador();
  timerRedir = setInterval(function(){
    segundosRestantes--;
    if (segundosRestantes <= 0) {
      clearInterval(timerRedir);
      timerRedir = null;
      irPanel(codigo);
      return;
    }
    repintarContador();
  }, 1000);
}
function repintarContador(){
  document.getElementById('mensajeRedir').textContent =
    'En ' + segundosRestantes + ' segundo(s) pasarás a tu panel. Si prefieres, usa el botón de arriba.';
}
function irPanel(codigo){
  clearInterval(timerRedir);
  timerRedir = null;
  location.href = BASE + 'coord.html?c=' + encodeURIComponent(codigo);
}
async function copiarAlPortapapeles(txt, btn){
  var original = btn ? btn.textContent : '';
  try {
    await navigator.clipboard.writeText(txt);
    if (btn) { btn.textContent = '¡Copiado!'; setTimeout(function(){ btn.textContent = original; }, 1500); }
  } catch (e) {
    var ta = document.createElement('textarea');
    ta.value = txt;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      if (btn) { btn.textContent = '¡Copiado!'; setTimeout(function(){ btn.textContent = original; }, 1500); }
    } catch (e2) {
      await NA.avisar('No se pudo copiar automáticamente. Tu código es: ' + txt);
    }
    document.body.removeChild(ta);
  }
}

document.getElementById('btnConfirmar').addEventListener('click', confirmar);
['inNombre','inCorreo','inTelefono'].forEach(function(id){
  var el = document.getElementById(id);
  if (el) el.addEventListener('input', function(){
    el.removeAttribute('aria-invalid');
    el.style.borderColor = '';
    document.getElementById(id === 'inNombre' ? 'errNombre' : (id === 'inCorreo' ? 'errCorreo' : 'errTelefono')).textContent = '';
  });
});
iniciar();
