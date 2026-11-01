// ===== Regla v2.1 · Modales propios (prohibido alert/confirm/prompt nativos) =====
// Motivo P0-03: Chrome suprime diálogos nativos encadenados y la respuesta del
// sistema puede no mostrarse jamas. Los modales propios siempre son visibles.
function modalAlert(mensaje, titulo){
  titulo = titulo || 'Aviso';
  return new Promise(resolve => {
    const fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    fondo.innerHTML =
      '<div class="modal-caja">' +
        '<div class="modal-titulo">' + esc(titulo) + '</div>' +
        '<div class="modal-mensaje">' + esc(mensaje) + '</div>' +
        '<div class="modal-acciones"><button class="btn" id="modalOkBtn">Aceptar</button></div>' +
      '</div>';
    document.body.appendChild(fondo);
    const cerrar = () => { fondo.remove(); resolve(true); };
    fondo.querySelector('#modalOkBtn').addEventListener('click', cerrar);
    fondo.addEventListener('click', e => { if(e.target === fondo) cerrar(); });
  });
}
function modalConfirm(mensaje, titulo){
  titulo = titulo || 'Confirmar';
  return new Promise(resolve => {
    const fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    fondo.innerHTML =
      '<div class="modal-caja">' +
        '<div class="modal-titulo">' + esc(titulo) + '</div>' +
        '<div class="modal-mensaje">' + esc(mensaje) + '</div>' +
        '<div class="modal-acciones">' +
          '<button class="btn btn-gris" id="modalCancelarBtn">Cancelar</button>' +
          '<button class="btn" id="modalAceptarBtn">Aceptar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(fondo);
    const cerrar = v => { fondo.remove(); resolve(v); };
    fondo.querySelector('#modalCancelarBtn').addEventListener('click', () => cerrar(false));
    fondo.querySelector('#modalAceptarBtn').addEventListener('click', () => cerrar(true));
    fondo.addEventListener('click', e => { if(e.target === fondo) cerrar(false); });
  });
}
function modalPrompt(mensaje, valorInicial, titulo, esClave){
  titulo = titulo || 'Ingresar';
  return new Promise(resolve => {
    const fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    fondo.innerHTML =
      '<div class="modal-caja">' +
        '<div class="modal-titulo">' + esc(titulo) + '</div>' +
        '<div class="modal-mensaje">' + esc(mensaje) + '</div>' +
        '<input type="' + (esClave ? 'password' : 'text') + '" id="modalPromptInput" class="campo-modal">' +
        '<div class="modal-acciones">' +
          '<button class="btn btn-gris" id="modalCancelarBtn">Cancelar</button>' +
          '<button class="btn" id="modalAceptarBtn">Aceptar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(fondo);
    const inp = fondo.querySelector('#modalPromptInput');
    inp.value = valorInicial || '';
    setTimeout(() => inp.focus(), 50);
    const cerrar = v => { fondo.remove(); resolve(v); };
    fondo.querySelector('#modalCancelarBtn').addEventListener('click', () => cerrar(null));
    fondo.querySelector('#modalAceptarBtn').addEventListener('click', () => cerrar(inp.value));
    inp.addEventListener('keydown', e => {
      if(e.key === 'Enter') cerrar(inp.value);
      if(e.key === 'Escape') cerrar(null);
    });
  });
}
window.alert = function(msg){ modalAlert(String(msg)); };
// ===== fin modales propios =====

function $(id){ return document.getElementById(id); }
function esc(t){
  return String(t == null ? '' : t)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function aviso(id, texto, ok){
  var el = $(id);
  el.textContent = texto;
  el.style.color = ok ? 'var(--acento)' : 'var(--aviso)';
}
function boton(texto, clase, fn){
  var b = document.createElement('button');
  b.className = 'btn ' + clase;
  b.textContent = texto;
  b.onclick = function(e){ fn(e.target); };
  return b;
}
async function copiarTexto(txt, btn){
  const original = btn ? btn.textContent : '';
  try {
    await navigator.clipboard.writeText(txt);
    if(btn) {
      btn.textContent = '¡Copiado!';
      setTimeout(() => { btn.textContent = original; }, 1500);
    }
  } catch (e) {
    var ta = document.createElement('textarea');
    ta.value = txt;
    document.body.appendChild(ta);
    ta.select();
    try { 
      document.execCommand('copy'); 
      if(btn) { btn.textContent = '¡Copiado!'; setTimeout(() => { btn.textContent = original; }, 1500); }
    } catch (e2) {}
    document.body.removeChild(ta);
  }
}
function fechaBonita(iso){
  try {
    return new Date(iso).toLocaleDateString('es-VE', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  } catch (e) { return ''; }
}
function urlWA(texto){ return 'https://wa.me/?text=' + encodeURIComponent(texto); }
function urlMail(asunto, cuerpo){ return 'mailto:?subject=' + encodeURIComponent(asunto) + '&body=' + encodeURIComponent(cuerpo); }
function razonLegible(r, causa){
  var map = { prensa:'Prensa', vinculo_familiar:'Vinculo familiar', premio:'Premio', autoridad:'Autoridad', otros:'Otros' };
  var t = map[r] || r;
  if (r === 'otros' && causa) t += ': ' + causa;
  return t;
}
function diasTexto(d1, d2){
  if (d1 && d2) return 'Dia 1 y Dia 2';
  if (d1) return 'Dia 1';
  if (d2) return 'Dia 2';
  return '-';
}

var ses = leerSesion();
var historialHay = false;

// ===== P0-03 · Auto-bloqueo por inactividad (5 min) =====
// Candado local: garantiza que el temporizador se instale una sola vez.
var naAutoBloqueoActivo = false;
function activarAutoBloqueo(){
  if (naAutoBloqueoActivo) return;
  naAutoBloqueoActivo = true;
  iniciarAutoBloqueo();
}

// ===== P0-03 · Sesiones y seguridad =====
function textoCorto(t, n){
  t = t || '';
  return t.length > n ? t.slice(0, n) + '…' : t;
}

async function cargarSesiones(){
  var cont = $('listaSesiones');
  cont.innerHTML = '<p class="suave">Consultando sesiones...</p>';
  try {
    var arr = await llamar('f_admin_sesiones', { p_token: ses.token });
    cont.innerHTML = '';
    if (!arr || !arr.length) { cont.innerHTML = '<p class="suave">Sin sesiones activas (o tu sesion expiro: entra de nuevo con tu PIN).</p>'; return; }
    arr.forEach(function(s){
      var div = document.createElement('div');
      div.className = 'item';
      var tipo = (s.rol === 'admin') ? 'Admin' : 'Puerta';
      var disp = textoCorto(s.device_label || 'Dispositivo desconocido', 60);
      var html =
        '<div><strong>' + esc(tipo) + '</strong>' +
        (s.propia ? '<span class="badge badge-ok">Esta sesion</span>' : '<span class="badge badge-tipo">Otra</span>') + '</div>' +
        '<p class="suave">Sesion (hash): ' + esc(s.sesion_hash) + ' · Creada: ' + esc(fechaBonita(s.creada_at)) + '</p>' +
        '<p class="suave">Expira: ' + esc(fechaBonita(s.expira_at)) +
        (s.ultimo_uso_at ? ' · Ultimo uso: ' + esc(fechaBonita(s.ultimo_uso_at)) : ' · Sin usos registrados') + '</p>' +
        '<p class="suave">Dispositivo: ' + esc(disp) + '</p>';
      div.innerHTML = html;
      cont.appendChild(div);
    });
  } catch (e) {
    cont.innerHTML = '<p class="suave">No se pudo cargar: ' + esc(e.message) + '</p>';
  }
}

async function revocarSesiones(){
  if (!await modalConfirm('Esto cerrara TODAS las demas sesiones activas (panel y puerta). ESTA sesion no se toca. Continuar?', 'Revocar sesiones')) return;
  try {
    var n = await llamar('f_admin_revocar_sesiones', { p_token: ses.token });
    if (n === -1) { alert('Tu sesion expiro: entra de nuevo con tu PIN.'); return; }
    alert('Listo: ' + n + ' sesion(es) revocada(s). Esta sesion sigue activa.');
    await cargarSesiones();
  } catch (e) { alert('Fallo: ' + e.message); }
}

async function rotarPin(objetivo){
  var nombre = (objetivo === 'admin') ? 'admin' : 'puerta';
  var actual = await modalPrompt('Rotar PIN ' + nombre + '.\n\nPaso 1 de 2: escribe tu PIN ADMIN ACTUAL (prueba de presencia):', '', 'Rotar PIN ' + nombre, true);
  if (actual === null) return;
  actual = actual.trim();
  if (!actual) { await modalAlert('Escribe tu PIN admin actual.', 'Falta el PIN'); return; }
  var nuevo = await modalPrompt('Paso 2 de 2: escribe el PIN ' + nombre + ' NUEVO (exactamente 6 digitos):', '', 'Rotar PIN ' + nombre, true);
  if (nuevo === null) return;
  nuevo = nuevo.trim();
  if (!/^[0-9]{6}$/.test(nuevo)) { await modalAlert('El nuevo PIN debe ser exactamente 6 digitos.', 'Formato invalido'); return; }
  try {
    var r = await llamar('f_admin_rotar_pin', { p_token: ses.token, p_objetivo: objetivo, p_pin_actual: actual, p_pin_nuevo: nuevo });
    if (r === 'ok') {
      alert('PIN ' + nombre + ' rotado. El anterior ya no sirve.');
    } else if (r === 'ERR_PIN_ACTUAL') {
      alert('El PIN admin actual no coincide.');
    } else if (r === 'ERR_FORMATO') {
      alert('El nuevo PIN debe ser exactamente 6 digitos.');
    } else if (r === 'ERR_IGUAL') {
      alert('El nuevo PIN es igual al actual.');
    } else if (r === 'ERR_OBJETIVO') {
      alert('Objetivo invalido.');
    } else if (r === 'ERR_CONFIG') {
      alert('Error de configuracion: falta el PIN en la base.');
    } else {
      alert('No se pudo rotar el PIN (sesion expirada o error). Recarga e intenta de nuevo.');
    }
  } catch (e) { alert('Fallo: ' + e.message); }
}

async function cargarEstado(){
  try {
    var st = await llamar('f_admin_stats', { p_token: ses.token });
    if (!st) { aviso('estadoEdicion', 'Tu sesion expiro: entra de nuevo con tu PIN.', false); return; }
    if (st.edicion_abierta) {
      aviso('estadoEdicion', 'Edicion ABIERTA: talentos y stands pueden editar sus listas.', true);
    } else {
      aviso('estadoEdicion', 'Edicion CERRADA: los links externos no pueden modificar nada.', false);
    }
  } catch (e) {
    aviso('estadoEdicion', 'No se pudo consultar el estado: ' + e.message, false);
  }
}

async function cambiarEdicion(abierta){
  try {
    await llamar('f_admin_toggle_edicion', { p_token: ses.token, p_abierta: abierta });
    await cargarEstado();
  } catch (e) {
    aviso('estadoEdicion', 'Fallo al cambiar la edicion: ' + e.message, false);
  }
}

async function crearCoord(){
  var tipo = $('cTipo').value;
  var nombre = $('cNombre').value.trim();
  var correo = $('cCorreo').value.trim();
  if (!nombre) { aviso('msgCrear', 'Escribe primero el nombre y apellido.', false); return; }
  try {
    var codigo = await llamar('f_admin_crear_coordinador', {
      p_token: ses.token, p_tipo: tipo, p_nombre: nombre, p_correo: correo || null
    });
    if (!codigo) { aviso('msgCrear', 'No se pudo crear el coordinador. Intenta de nuevo.', false); return; }
    var cont = $('resultadoCoord');
    cont.innerHTML = '';
    var caja = document.createElement('div');
    caja.className = 'codigo';
    caja.textContent = codigo;
    var fila = document.createElement('div');
    fila.className = 'fila';
    fila.appendChild(boton('Copiar codigo', 'btn-gris', function(btn){ copiarTexto(codigo, btn); }));
    var nota = document.createElement('p');
    nota.className = 'suave';
    nota.textContent = 'Entregale este codigo a tu coordinador: con el entra en coord.html y crea los links de registro.';
    cont.appendChild(caja);
    cont.appendChild(fila);
    cont.appendChild(nota);
    $('cNombre').value = '';
    $('cCorreo').value = '';
    aviso('msgCrear', 'Coordinador creado correctamente.', true);
    await cargarLista();
  } catch (e) {
    aviso('msgCrear', 'Fallo al crear: ' + e.message, false);
  }
}

async function cargarLista(){
  var cont = $('listaCoords');
  try {
    var arr = await llamar('f_admin_listar_coordinadores', { p_token: ses.token });
    if (!arr) { cont.innerHTML = '<p class="suave">Tu sesion expiro: entra de nuevo con tu PIN.</p>'; return; }
    cont.innerHTML = '';
    if (!arr.length) { cont.innerHTML = '<p class="suave">Todavia no hay coordinadores creados.</p>'; return; }
    arr.forEach(function(c){ cont.appendChild(tarjetaCoord(c)); });
  } catch (e) {
    cont.innerHTML = '<p class="suave">No se pudo cargar la lista: ' + esc(e.message) + '</p>';
  }
}

function tarjetaCoord(c){
  var div = document.createElement('div');
  div.className = 'item';
  var tipoTxt = (c.tipo === 'talentos') ? 'Talentos' : 'Stands';
  var fecha = fechaBonita(c.creada_at);
  var linkEntrada = BASE + 'coord.html?c=' + c.codigo;
  
  div.innerHTML =
    '<div><strong>' + esc(c.nombre) + '</strong>' +
    '<span class="badge badge-tipo">' + tipoTxt + '</span>' +
    '<span class="badge ' + (c.activo ? 'badge-ok">Activo' : 'badge-no">Revocado') + '</span></div>' +
    '<div class="codigo">' + esc(c.codigo) + '</div>' +
    '<p class="suave">' + (c.correo ? esc(c.correo) : 'Sin correo registrado') + (fecha ? ' · Creado el ' + fecha : '') + '</p>' +
    '<div class="fila fila-compacta"></div>' +
    '<div class="codigo codigo-enlace">' + esc(linkEntrada) + '</div>' +
    '<div class="fila"></div>';
    
  var fila1 = div.querySelectorAll('.fila')[0];
  fila1.appendChild(boton('Copiar código', 'btn-gris', function(btn){ copiarTexto(c.codigo, btn); }));
  fila1.appendChild(boton('Editar', 'btn-gris', function(){ mostrarEdicion(div, c); }));
  if (c.activo) {
    fila1.appendChild(boton('Revocar', 'btn-rojo', function(){ revocar(c, false); }));
  } else {
    fila1.appendChild(boton('Reactivar', 'btn-verde', function(){ revocar(c, true); }));
    fila1.appendChild(boton('Eliminar definitivamente', 'btn-rojo', function(){ borrarDefinitivo(c); }));
  }

  var fila2 = div.querySelectorAll('.fila')[1];
  fila2.appendChild(boton('📋 Copiar link', 'btn-gris', function(btn){ copiarTexto(linkEntrada, btn); }));
  
  var wa = document.createElement('a');
  wa.className = 'btn btn-gris';
  wa.target = '_blank';
  wa.rel = 'noopener';
  wa.textContent = '📱 WhatsApp';
  wa.href = urlWA('Hola ' + esc(c.nombre) + ', aquí tienes tu link de acceso para coordinar ' + tipoTxt + ' en NitroSystem: ' + linkEntrada);
  fila2.appendChild(wa);
  
  var ml = document.createElement('a');
  ml.className = 'btn btn-gris';
  ml.textContent = '✉️ Correo';
  ml.href = urlMail('Link de acceso NitroSystem - Coordinación de ' + tipoTxt, 'Hola ' + esc(c.nombre) + ',\n\nAquí tienes tu link de acceso para coordinar ' + tipoTxt + ' en NitroSystem:\n\n' + linkEntrada + '\n\nTu código es: ' + c.codigo);
  fila2.appendChild(ml);

  return div;
}

function mostrarEdicion(div, c){
  var existente = div.querySelector('.panel-edit');
  if (existente) { existente.remove(); return; }
  var panel = document.createElement('div');
  panel.className = 'panel-edit';
  var l1 = document.createElement('label');
  l1.textContent = 'Nombre y apellido';
  var i1 = document.createElement('input');
  i1.value = c.nombre || '';
  l1.appendChild(i1);
  var l2 = document.createElement('label');
  l2.textContent = 'Correo (opcional)';
  var i2 = document.createElement('input');
  i2.value = c.correo || '';
  l2.appendChild(i2);
  var fila = document.createElement('div');
  fila.className = 'fila';
  fila.appendChild(boton('Guardar cambios', 'btn-verde', async function(){
    var nom = i1.value.trim();
    var cor = i2.value.trim();
    if (!nom) { alert('El nombre no puede quedar vacio.'); return; }
    try {
      var ok = await llamar('f_admin_editar_coordinador', {
        p_token: ses.token, p_id: c.id, p_nombre: nom, p_correo: cor || null
      });
      if (!ok) { alert('No se pudo guardar el cambio.'); return; }
      await cargarLista();
    } catch (e) { alert('Fallo al guardar: ' + e.message); }
  }));
  fila.appendChild(boton('Cancelar', 'btn-gris', function(){ panel.remove(); }));
  panel.appendChild(l1);
  panel.appendChild(l2);
  panel.appendChild(fila);
  div.appendChild(panel);
}

async function revocar(c, activo){
  var pregunta = activo
    ? 'Reactivar el codigo de ' + c.nombre + '? Podra volver a entrar y crear links nuevos.'
    : 'Revocar la llave de ' + c.nombre + '? Ya no podra entrar ni crear links nuevos. Lo que ya creo queda intacto.';
  if (!await modalConfirm(pregunta, 'Confirmar')) return;
  try {
    var ok = await llamar('f_admin_activar_coordinador', { p_token: ses.token, p_id: c.id, p_activo: activo });
    if (!ok) { alert('No se pudo completar la accion.'); return; }
    await cargarLista();
  } catch (e) { alert('Fallo: ' + e.message); }
}

async function borrarDefinitivo(c){
  if (!await modalConfirm('Borrar DEFINITIVAMENTE a ' + c.nombre + ' de la lista? Esta accion no se puede deshacer. Si ya creo talentos o stands, el sistema no lo dejara borrar para proteger el evento.', 'Eliminar definitivamente')) return;
  try {
    var r = await llamar('f_admin_borrar_coordinador', { p_token: ses.token, p_id: c.id });
    if (r === 'ok') { await cargarLista(); return; }
    if (r === 'protegido') {
      alert('No se pudo borrar definitivamente: este coordinador ya creo talentos o stands. Dejalo como revocado: asi su llave queda inutil y los datos del evento quedan protegidos.');
      return;
    }
    alert('No se pudo borrar. Puede que tu sesion expirara o que el coordinador ya no exista. Recarga la pagina.');
  } catch (e) { alert('Fallo al borrar: ' + e.message); }
}

function htmlStats(s){
  var n = function(v){ return (v === null || v === undefined) ? 0 : v; };
  var html =
    '<h3>Dia 1</h3><ul>' +
    '<li>Personas en listas: ' + n(s.personas_dia1) + '</li>' +
    '<li>Llegaron (autorizados): ' + n(s.autorizados_dia1) + '</li>' +
    '<li>Pendientes por llegar: ' + n(s.pendientes_dia1) + '</li>' +
    '<li>Vendedores presentes: ' + n(s.presentes_dia1) + '</li>' +
    '</ul>' +
    '<h3>Dia 2</h3><ul>' +
    '<li>Personas en listas: ' + n(s.personas_dia2) + '</li>' +
    '<li>Llegaron (autorizados): ' + n(s.autorizados_dia2) + '</li>' +
    '<li>Pendientes por llegar: ' + n(s.pendientes_dia2) + '</li>' +
    '<li>Vendedores presentes: ' + n(s.presentes_dia2) + '</li>' +
    '</ul>' +
    '<h3>General</h3><ul>' +
    '<li>Talentos (organizaciones): ' + n(s.organizaciones) + '</li>' +
    '<li>Vendedores registrados: ' + n(s.vendedores) + '</li>' +
    '<li>Rubros distintos: ' + n(s.rubros_distintos) + '</li>' +
    '<li>Stands patrocinantes: ' + n(s.stands_patrocinantes) + '</li>' +
    '<li>Stands pagados: ' + n(s.stands_pagados) + '</li>' +
    '</ul>' +
    '<h3>Cortesias</h3><ul>' +
    '<li>Pases activos: ' + n(s.cortesias_activas) + '</li>' +
    '<li>Pases anulados: ' + n(s.cortesias_anuladas) + '</li>' +
    '<li>Dia 1: ' + n(s.cortesia_autorizados_dia1) + ' autorizados de ' + n(s.cortesia_personas_dia1) + ' personas</li>' +
    '<li>Dia 2: ' + n(s.cortesia_autorizados_dia2) + ' autorizados de ' + n(s.cortesia_personas_dia2) + ' personas</li>' +
    '</ul>';
  if (Array.isArray(s.rubros) && s.rubros.length) {
    html += '<h3>Rubros que mas se repiten</h3><ul>';
    s.rubros.slice(0, 8).forEach(function(r){
      html += '<li>' + esc(r.vende) + ': ' + n(r.total) + '</li>';
    });
    html += '</ul>';
  }
  return html;
}

async function guardarInforme(){
  var nombre = await modalPrompt('Nombre del evento para el historico (ej.: NitroSystem 2026):', 'NitroSystem ' + new Date().getFullYear(), 'Guardar informe');
  if (nombre === null) return;
  nombre = nombre.trim();
  if (!nombre) { alert('Escribe un nombre para el informe.'); return; }
  try {
    var id = await llamar('f_admin_guardar_evento', { p_token: ses.token, p_nombre: nombre });
    if (!id) { alert('No se pudo guardar el informe.'); return; }
    alert('Informe guardado en el historial.');
    await cargarHistorial();
  } catch (e) { alert('Fallo al guardar: ' + e.message); }
}

/* ====== P0-05 · Respaldo completo (JSON) + candados de la limpieza ======
   Alcance A: todo con las RPC existentes, sin tocar Supabase.
   - Nucleo: se guarda un informe NUEVO (foto fresca y consistente) y se lee de
     vuelta: talentos/listas/personas y stands/vendedores completos, tambien
     los de links anulados (la funcion los trae sin filtro).
   - Resto: cortesias (+personas por cortesia), aliados/asignaciones
     (+concursos por asignacion), coordinadores y estado de los dias.
   - Sesiones y login_intentos NO se exportan a proposito: son estado
     transitorio de seguridad que la limpieza borra; restaurarlos seria un error.
   - El respaldo queda registrado en esta pestaña (sessionStorage) y es el
     candado de la limpieza, junto al PIN y la confirmacion tipada. */
function leerRespaldo(){
  try { return JSON.parse(sessionStorage.getItem('na_respaldo') || 'null'); }
  catch (e) { return null; }
}
function haceMinutos(ts){
  var m = Math.round((Date.now() - ts) / 60000);
  return m <= 0 ? 'menos de 1 minuto' : (m === 1 ? '1 minuto' : m + ' minutos');
}

async function exportarRespaldo(){
  var nombre = await modalPrompt('Nombre del evento para el respaldo (tambien se guarda como informe en el historial):', 'NitroSystem ' + new Date().getFullYear(), 'Descargar respaldo completo');
  if (nombre === null) return;
  nombre = nombre.trim();
  if (!nombre) { alert('Escribe un nombre para el respaldo.'); return; }
  try {
    var id = await llamar('f_admin_guardar_evento', { p_token: ses.token, p_nombre: nombre });
    if (!id) { alert('No se pudo guardar el informe del respaldo (sesion expirada o nombre vacio).'); return; }
    var base = await Promise.all([
      llamar('f_admin_ver_evento', { p_token: ses.token, p_id: id }),
      llamar('f_admin_listar_cortesias', { p_token: ses.token }),
      llamar('f_admin_listar_aliados', { p_token: ses.token }),
      llamar('f_admin_listar_coordinadores', { p_token: ses.token }),
      llamar('f_admin_estado_dias', { p_token: ses.token }),
      llamar('f_admin_sesiones', { p_token: ses.token })
    ]);
    var informe = base[0];
    if (!informe) { alert('No se pudo leer el informe recien guardado. Intentalo de nuevo.'); return; }
    var cortesias = base[1] || [];
    var aliados = base[2] || [];
    var coordinadores = base[3] || [];
    var estadoDias = base[4] || null;
    var sesionesVisibles = base[5] || [];

    var estado = $('respaldoEstado');
    if (estado) estado.textContent = 'Armando respaldo: leyendo personas de cada cortesia y concursos de cada asignacion...';

    var cortesiasDetalle = [];
    for (var i = 0; i < cortesias.length; i++) {
      var det = null, errD = null;
      try { det = await llamar('f_admin_ver_cortesia', { p_token: ses.token, p_codigo_link: cortesias[i].codigo_link }); }
      catch (e2) { errD = String(e2 && e2.message ? e2.message : e2); }
      cortesiasDetalle.push({ codigo_link: cortesias[i].codigo_link, detalle: det, error: errD });
    }

    var concursosPorAsignacion = [];
    for (var ali = 0; ali < aliados.length; ali++) {
      var asigs = aliados[ali].asignaciones || [];
      for (var k = 0; k < asigs.length; k++) {
        var ver = null, errC = null;
        try { ver = await llamar('f_admin_ver_concursos_aliado', { p_token: ses.token, p_asignacion_id: asigs[k].id }); }
        catch (e3) { errC = String(e3 && e3.message ? e3.message : e3); }
        concursosPorAsignacion.push({ asignacion_id: asigs[k].id, codigo_link: asigs[k].codigo_link, ver: ver, error: errC });
      }
    }

    // Conteos del dry-run: fuente = este respaldo, recien verificado.
    var detalle = informe.detalle || {};
    var talentos = detalle.talentos || [], stands = detalle.stands || [];
    var nListas = 0, nPersonas = 0;
    talentos.forEach(function(t){ (t.listas || []).forEach(function(l){ nListas++; nPersonas += (l.personas || []).length; }); });
    var nVendedores = 0;
    stands.forEach(function(s){ nVendedores += (s.vendedores || []).length; });
    var nCortesiaPersonas = 0;
    cortesiasDetalle.forEach(function(cd){
      if (!cd.detalle) return;
      (cd.detalle.listas || []).forEach(function(l){ nCortesiaPersonas += (l.personas || []).length; });
      nCortesiaPersonas += (cd.detalle.individuales || []).length;
    });
    var nAsignaciones = 0, nConcursos = 0;
    aliados.forEach(function(al){ nAsignaciones += (al.asignaciones || []).length; });
    concursosPorAsignacion.forEach(function(x){ if (x.ver) nConcursos += (x.ver.concursos || []).length; });

    var conteos = {
      talentos: talentos.length,
      listas: nListas,
      personas: nPersonas,
      stands: stands.length,
      vendedores: nVendedores,
      coordinadores: coordinadores.length,
      cortesias: cortesias.length,
      cortesia_personas: nCortesiaPersonas,
      aliados: aliados.length,
      asignaciones_aliado: nAsignaciones,
      concursos_aliado: nConcursos,
      sesiones_activas_visibles: sesionesVisibles.length
    };

    var archivo = 'respaldo-' + nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + new Date().toISOString().slice(0, 10) + '.json';
    var respaldo = {
      tipo: 'respaldo-nitrosystem',
      version: 1,
      generado_at: new Date().toISOString(),
      evento: { nombre: nombre, informe_id: id, informe_guardado_at: informe.creado_at },
      conteos: conteos,
      datos: {
        informe: informe,
        cortesias: cortesias,
        cortesias_detalle: cortesiasDetalle,
        aliados: aliados,
        concursos_por_asignacion: concursosPorAsignacion,
        coordinadores: coordinadores,
        estado_dias: estadoDias
      }
    };
    var bola = new Blob([JSON.stringify(respaldo, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(bola);
    var a = document.createElement('a');
    a.href = url;
    a.download = archivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 5000);
    sessionStorage.setItem('na_respaldo', JSON.stringify({ ts: Date.now(), informe_id: id, nombre: nombre, archivo: archivo, conteos: conteos }));
    actualizarBotonLimpieza();
    alert('Respaldo descargado: ' + archivo + '\n\nGuarda ese archivo en tu PC (o USB). Es el respaldo que exige la limpieza.');
  } catch (e) { alert('Fallo al armar el respaldo: ' + e.message); }
}

async function cargarHistorial(){
  var cont = $('listaHistorial');
  try {
    var arr = await llamar('f_admin_listar_eventos', { p_token: ses.token });
    if (!arr) { cont.innerHTML = '<p class="suave">Tu sesion expiro: entra de nuevo con tu PIN.</p>'; return; }
    historialHay = arr.length > 0;
    cont.innerHTML = '';
    if (!historialHay) {
      cont.innerHTML = '<p class="suave">Todavia no hay informes guardados. Guarda el primero para tener historial y desbloquear la limpieza final.</p>';
    }
    arr.forEach(function(ev){
      var div = document.createElement('div');
      div.className = 'item';
      div.innerHTML =
        '<div><strong>' + esc(ev.nombre) + '</strong></div>' +
        '<p class="suave">Guardado el ' + fechaBonita(ev.creado_at) + '</p>' +
        '<div class="fila"></div>';
      div.querySelector('.fila').appendChild(boton('Ver informe / PDF', 'btn-gris', function(){ verInforme(ev); }));
      cont.appendChild(div);
    });
    actualizarBotonLimpieza();
  } catch (e) {
    cont.innerHTML = '<p class="suave">No se pudo cargar el historial: ' + esc(e.message) + '</p>';
  }
}

function actualizarBotonLimpieza(){
  var b = $('btnLimpiarTodo');
  var r = leerRespaldo();
  var respaldoOk = !!r && ((Date.now() - r.ts) <= 30 * 60 * 1000);
  b.disabled = !(historialHay && respaldoOk);
  var nota = $('notaLimpieza');
  if (!historialHay) {
    nota.textContent = 'Candado cerrado: guarda primero un informe del evento para poder limpiar.';
  } else if (!r) {
    nota.textContent = 'Candado cerrado: falta el respaldo completo (JSON). Descargalo con el boton de arriba.';
  } else if (!respaldoOk) {
    nota.textContent = 'Candado cerrado: tu respaldo tiene mas de 30 minutos (hace ' + haceMinutos(r.ts) + '). Descarga uno nuevo antes de limpiar.';
  } else {
    nota.textContent = 'Candado abierto: respaldo verificado hace ' + haceMinutos(r.ts) + '. La limpieza pedira tu PIN y el nombre del evento.';
  }
  var estado = $('respaldoEstado');
  if (estado && r) estado.textContent = 'Ultimo respaldo: ' + r.archivo + ' (hace ' + haceMinutos(r.ts) + ').';
}

async function verInforme(ev){
  try {
    var d = await llamar('f_admin_ver_evento', { p_token: ses.token, p_id: ev.id });
    if (!d) { alert('No se pudo abrir el informe.'); return; }
    var w = window.open('', '_blank');
    if (!w) { alert('El navegador bloqueo la ventana del informe. Permite las ventanas emergentes de este sitio y vuelve a intentar.'); return; }
    w.document.open();
    w.document.write(htmlInforme(d));
    w.document.close();
    // CSP: el boton se engancha aqui, dentro del documento del informe, no con onclick inline.
    var bImp = w.document.getElementById('btnImprimir');
    if (bImp) { bImp.addEventListener('click', function(){ w.print(); }); }
  } catch (e) { alert('Fallo al abrir el informe: ' + e.message); }
}

function tablaPersonas(rows){
  var h = '<table><tr><th>Nombre</th><th>Apellido</th><th>Cedula</th><th>Cargo</th><th>Estado</th></tr>';
  (rows || []).forEach(function(p){
    h += '<tr><td>' + esc(p.nombre) + '</td><td>' + esc(p.apellido) + '</td><td>' + esc(p.cedula) + '</td><td>' + esc(p.cargo) + '</td><td>' + esc(p.estado) + '</td></tr>';
  });
  h += '</table>';
  return h;
}

function tablaVendedores(rows){
  var h = '<table><tr><th>Nombre</th><th>Apellido</th><th>Cedula</th><th>Vende</th><th>Empresa</th><th>Dia 1</th><th>Dia 2</th></tr>';
  (rows || []).forEach(function(v){
    h += '<tr><td>' + esc(v.nombre) + '</td><td>' + esc(v.apellido) + '</td><td>' + esc(v.cedula) + '</td><td>' + esc(v.vende) + '</td><td>' + esc(v.empresa || '') + '</td><td>' + esc(v.estado_dia1) + '</td><td>' + esc(v.estado_dia2) + '</td></tr>';
  });
  h += '</table>';
  return h;
}

/* ====== NUEVAS SECCIONES DEL INFORME (segmentacion y tiempos) ====== */

function tablaRankingStands(arr){
  if (!arr.length) return '<p>Sin registros en esta categoria.</p>';
  var h = '<table><tr><th>Stand</th><th>Empresa</th><th>Rubro</th><th>Cupo</th><th>Registrados</th><th>Dia 1</th><th>Dia 2</th><th>Tasa</th></tr>';
  arr.forEach(function(s){
    var totalDias = (s.aut_dia1 > 0 && s.aut_dia2 > 0) ? 2 : 1;
    var tasa = s.total_vendedores > 0 ? Math.round(((s.aut_dia1 + s.aut_dia2) / (s.total_vendedores * totalDias)) * 100) : 0;
    h += '<tr><td>' + esc(s.nombre || ('Stand ' + s.numero)) + '</td><td>' + esc(s.empresa || '-') + '</td><td>' + esc(s.vende || '-') + '</td><td>' + s.cupo + '</td><td>' + s.total_vendedores + '</td><td>' + s.aut_dia1 + '</td><td>' + s.aut_dia2 + '</td><td>' + tasa + '%</td></tr>';
  });
  h += '</table>';
  return h;
}

function tablaRankingTalentos(arr){
  if (!arr.length) return '<p>Sin registros en esta categoria.</p>';
  var h = '<table><tr><th>Talento</th><th>Dias</th><th>Personas</th><th>Autorizados</th><th>Pendientes</th><th>Tasa</th></tr>';
  arr.forEach(function(t){
    var tasa = t.total_personas > 0 ? Math.round((t.autorizados / t.total_personas) * 100) : 0;
    h += '<tr><td>' + esc(t.nombre) + '</td><td>' + diasTexto(t.dia1, t.dia2) + '</td><td>' + t.total_personas + '</td><td>' + t.autorizados + '</td><td>' + t.pendientes + '</td><td>' + tasa + '%</td></tr>';
  });
  h += '</table>';
  return h;
}

function htmlSegmentacion(seg){
  if (!seg || !seg.por_dia) return '<p>Sin datos de segmentacion.</p>';
  var d1 = seg.por_dia.dia1 || {};
  var d2 = seg.por_dia.dia2 || {};
  var h = '';
  h += '<h3>Resumen por dia</h3>';
  h += '<table><tr><th>Categoria</th><th>Dia 1</th><th>Dia 2</th></tr>' +
    '<tr><td>Talentos autorizados / pendientes</td><td>' + (d1.talentos_autorizados||0) + ' / ' + (d1.talentos_pendientes||0) + '</td><td>' + (d2.talentos_autorizados||0) + ' / ' + (d2.talentos_pendientes||0) + '</td></tr>' +
    '<tr><td>Vendedores autorizados / pendientes</td><td>' + (d1.vendedores_autorizados||0) + ' / ' + (d1.vendedores_pendientes||0) + '</td><td>' + (d2.vendedores_autorizados||0) + ' / ' + (d2.vendedores_pendientes||0) + '</td></tr>' +
    '<tr><td>Cortesias autorizadas / pendientes</td><td>' + (d1.cortesia_autorizados||0) + ' / ' + (d1.cortesia_pendientes||0) + '</td><td>' + (d2.cortesia_autorizados||0) + ' / ' + (d2.cortesia_pendientes||0) + '</td></tr>' +
    '</table>';

  var stands = seg.stands || [];
  var patro = stands.filter(function(s){ return s.tipo === 'patrocinante'; });
  var pagados = stands.filter(function(s){ return s.tipo === 'pagado'; });

  h += '<h3>Patrocinantes (los que hacen posible el evento)</h3>';
  h += tablaRankingStands(patro);
  h += '<h3>Stands pagados (los que pagan por participar)</h3>';
  h += tablaRankingStands(pagados);
  h += '<h3>Talentos (los que atraen al publico)</h3>';
  h += tablaRankingTalentos(seg.talentos || []);

  if (seg.rubros && seg.rubros.length) {
    h += '<h3>Rubros mas promocionados</h3><table><tr><th>Rubro</th><th>Cantidad</th></tr>';
    seg.rubros.slice(0, 10).forEach(function(r){
      h += '<tr><td>' + esc(r.vende) + '</td><td>' + r.cantidad + '</td></tr>';
    });
    h += '</table>';
  }

  var cortesias = seg.cortesias || [];
  h += '<h3>Cortesias</h3>';
  if (!cortesias.length) {
    h += '<p>Sin cortesias creadas.</p>';
  } else {
    h += '<table><tr><th>Beneficiario</th><th>Tipo</th><th>Razon</th><th>Dias</th><th>Estado</th><th>Personas</th><th>Dia 1</th><th>Dia 2</th></tr>';
    cortesias.forEach(function(c){
      var nombre = c.tipo === 'lista' ? (c.nombre_organizacion || 'Lista') : 'Pase individual';
      h += '<tr><td>' + esc(nombre) + '</td><td>' + (c.tipo === 'lista' ? 'Lista' : 'Individual') + '</td><td>' + esc(razonLegible(c.razon, c.causa)) + '</td><td>' + diasTexto(c.dia1, c.dia2) + '</td><td>' + esc(c.estado) + '</td><td>' + c.total_personas + '</td><td>' + c.aut_dia1 + '</td><td>' + c.aut_dia2 + '</td></tr>';
    });
    h += '</table>';
  }

  var coords = seg.coordinadores || [];
  h += '<h3>Coordinadores</h3>';
  if (!coords.length) {
    h += '<p>Sin coordinadores creados.</p>';
  } else {
    h += '<table><tr><th>Tipo</th><th>Nombre</th><th>Codigo</th><th>Estado</th></tr>';
    coords.forEach(function(c){
      h += '<tr><td>' + (c.tipo === 'talentos' ? 'Talentos' : 'Stands') + '</td><td>' + esc(c.nombre) + '</td><td>' + esc(c.codigo) + '</td><td>' + (c.activo ? 'Activo' : 'Revocado') + '</td></tr>';
    });
    h += '</table>';
  }
  return h;
}

function htmlTiempos(t){
  if (!t) return '<p>Sin datos de tiempos.</p>';
  var h = '';
  var coords = t.coordinadores || [];
  var talT = t.talentos_tiempos || [];
  var staT = t.stands_tiempos || [];

  h += '<h3>Coordinadores - tiempo de reaccion</h3>';
  if (coords.length) {
    h += '<table><tr><th>Coordinador</th><th>Tipo</th><th>Talentos</th><th>Stands</th><th>Reaccion (horas)</th></tr>';
    coords.forEach(function(c){
      h += '<tr><td>' + esc(c.nombre) + '</td><td>' + (c.tipo === 'talentos' ? 'Talentos' : 'Stands') + '</td><td>' + c.num_talentos + '</td><td>' + c.num_stands + '</td><td>' + (c.horas_reaccion == null ? '-' : c.horas_reaccion) + '</td></tr>';
    });
    h += '</table>';
  } else { h += '<p>Sin coordinadores.</p>'; }

  h += '<h3>Talentos - tiempo desde crear el link hasta registrar personas</h3>';
  if (talT.length) {
    h += '<table><tr><th>Talento</th><th>Coordinador</th><th>Personas</th><th>Hasta 1ra (h)</th><th>Hasta ultima (h)</th><th>Registro a entrada (h)</th></tr>';
    talT.forEach(function(x){
      h += '<tr><td>' + esc(x.nombre) + '</td><td>' + esc(x.coordinador || '-') + '</td><td>' + x.total_personas + '</td><td>' + (x.horas_hasta_primera == null ? '-' : x.horas_hasta_primera) + '</td><td>' + (x.horas_hasta_ultima == null ? '-' : x.horas_hasta_ultima) + '</td><td>' + (x.horas_prom_registro_entrada == null ? '-' : x.horas_prom_registro_entrada) + '</td></tr>';
    });
    h += '</table>';
  } else { h += '<p>Sin talentos.</p>'; }

  h += '<h3>Stands - tiempo desde crear el link hasta registrar vendedores</h3>';
  if (staT.length) {
    h += '<table><tr><th>Stand</th><th>Tipo</th><th>Coordinador</th><th>Vendedores</th><th>Hasta 1ro (h)</th><th>Hasta ultimo (h)</th><th>Registro a entrada (h)</th></tr>';
    staT.forEach(function(x){
      h += '<tr><td>' + esc(x.nombre || ('Stand ' + x.numero)) + '</td><td>' + (x.tipo === 'patrocinante' ? 'Patrocinante' : 'Pagado') + '</td><td>' + esc(x.coordinador || '-') + '</td><td>' + x.total_vendedores + '</td><td>' + (x.horas_hasta_primero == null ? '-' : x.horas_hasta_primero) + '</td><td>' + (x.horas_hasta_ultimo == null ? '-' : x.horas_hasta_ultimo) + '</td><td>' + (x.horas_prom_registro_entrada == null ? '-' : x.horas_prom_registro_entrada) + '</td></tr>';
    });
    h += '</table>';
  } else { h += '<p>Sin stands.</p>'; }
  return h;
}

/* ====== FIN NUEVAS SECCIONES ====== */

function htmlInforme(d){
  var h = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Informe ' + esc(d.nombre) + '</title><style>' +
    'body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:17px;color:#111;background:#fff;margin:28px;}' +
    'h1{font-size:26px;margin:0 0 4px;} h2{font-size:21px;margin:24px 0 8px;border-bottom:2px solid #111;padding-bottom:4px;} h3{font-size:18px;margin:16px 0 6px;}' +
    'table{border-collapse:collapse;width:100%;margin:8px 0;} th,td{border:1px solid #777;padding:6px 8px;text-align:left;font-size:17px;} th{background:#eee;}' +
    '.nota{background:#fff8dc;border:1px solid #cc9;padding:10px;margin-bottom:14px;}' +
    'button{font-size:17px;padding:10px 16px;margin-bottom:10px;}' +
    '@media print{.noprint{display:none;}}' +
      '.campo-modal{margin-bottom:14px;} .fila-compacta{margin-bottom:8px;} .codigo-enlace{font-size:14px;word-break:break-all;}' +
    '</style></head><body>' +
    '<div class="nota noprint">Para sacar el PDF: pulsa el boton y en la ventana de impresion elige como destino "Guardar como PDF".</div>' +
    '<div class="noprint"><button id="btnImprimir">Imprimir / Guardar PDF</button></div>' +
    '<h1>Informe del evento: ' + esc(d.nombre) + '</h1>' +
    '<p>Guardado el: ' + fechaBonita(d.creado_at) + '</p>' +
    '<h2>Estadisticas generales</h2>' + htmlStats(d.stats || {});

  var seg = (d.detalle && d.detalle.segmentacion) || null;
  var tie = (d.detalle && d.detalle.tiempos) || null;

  if (seg) {
    h += '<h2>Segmentacion por valor</h2>' + htmlSegmentacion(seg);
  }
  if (tie) {
    h += '<h2>Tiempos de gestion del equipo</h2>' + htmlTiempos(tie);
  }

  var talentos = (d.detalle && d.detalle.talentos) || [];
  var stands = (d.detalle && d.detalle.stands) || [];
  h += '<h2>Talentos y sus listas (detalle)</h2>';
  if (!talentos.length) { h += '<p>Sin talentos registrados.</p>'; }
  talentos.forEach(function(t){
    var dias = (t.dia1 ? 'Dia 1' : '') + (t.dia1 && t.dia2 ? ' y ' : '') + (t.dia2 ? 'Dia 2' : '');
    h += '<h3>' + esc(t.talento) + ' (' + dias + ')</h3>';
    (t.listas || []).forEach(function(l){
      h += '<p>Dia ' + l.dia + ' - estado: ' + esc(l.estado) + ' - codigo corto: ' + esc(l.codigo_corto) + '</p>';
      h += tablaPersonas(l.personas);
    });
  });
  h += '<h2>Stands y sus vendedores (detalle)</h2>';
  if (!stands.length) { h += '<p>Sin stands registrados.</p>'; }
  stands.forEach(function(s){
    h += '<h3>Stand ' + esc(s.numero) + ' (' + esc(s.tipo) + ', cupo ' + esc(s.cupo) + ')</h3>';
    h += tablaVendedores(s.vendedores);
  });
  h += '</body></html>';
  return h;
}

/* Modal propio del dry-run: muestra EXACTAMENTE lo que se borrara (según el
   respaldo verificado) y exige escribir el nombre del evento. Sin alert/confirm. */
function modalConfirmarLimpieza(r){
  return new Promise(function(resolve){
    var fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    var c = r.conteos;
    function linea(nombre, valor){ return '<div>' + esc(nombre) + ': <b>' + esc(String(valor)) + '</b></div>'; }
    fondo.innerHTML =
      '<div class="modal-caja">' +
        '<div class="modal-titulo">Limpiar todo: ultima revision</div>' +
        '<div class="modal-mensaje">Respaldo verificado: <b>' + esc(r.archivo) + '</b> (hace ' + esc(haceMinutos(r.ts)) + '). Esto se borrara, segun ese respaldo:</div>' +
        '<div class="codigo">' +
          linea('personas', c.personas) +
          linea('listas', c.listas) +
          linea('talentos', c.talentos) +
          linea('vendedores', c.vendedores) +
          linea('stands', c.stands) +
          linea('coordinadores', c.coordinadores) +
          linea('cortesias', c.cortesias) +
          linea('personas de cortesia', c.cortesia_personas) +
          linea('sesiones', 'todas (activas visibles: ' + c.sesiones_activas_visibles + ')') +
          linea('login_intentos', 'todos') +
        '</div>' +
        '<div class="modal-mensaje suave">NO se borran: los informes guardados y los aliados con sus asignaciones y concursos. La config queda con la edicion abierta y el dia activo en 1. Despues de limpiar tu sesion se cierra.</div>' +
        '<div class="modal-mensaje">Escribe el nombre del evento (<b>' + esc(r.nombre) + '</b>) para confirmar:</div>' +
        '<input type="text" id="modalNombreLimpieza" class="campo-modal">' +
        '<div class="modal-acciones">' +
          '<button class="btn btn-gris" id="modalCancelarBtn">Cancelar</button>' +
          '<button class="btn btn-rojo" id="modalAceptarBtn" disabled>Continuar con la limpieza</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(fondo);
    var inp = fondo.querySelector('#modalNombreLimpieza');
    var btnOk = fondo.querySelector('#modalAceptarBtn');
    setTimeout(function(){ inp.focus(); }, 50);
    inp.addEventListener('input', function(){ btnOk.disabled = inp.value.trim() !== r.nombre; });
    inp.addEventListener('keydown', function(e){ if (e.key === 'Enter' && !btnOk.disabled) btnOk.click(); });
    var cerrar = function(v){ fondo.remove(); resolve(v); };
    fondo.querySelector('#modalCancelarBtn').addEventListener('click', function(){ cerrar(false); });
    fondo.querySelector('#modalAceptarBtn').addEventListener('click', function(){ cerrar(true); });
    fondo.addEventListener('click', function(e){ if (e.target === fondo) cerrar(false); });
  });
}

async function limpiarTodo(){
  if (!historialHay) { alert('Primero guarda un informe del evento: es tu candado de seguridad.'); return; }
  var r = leerRespaldo();
  if (!r) { alert('Respaldo requerido: descarga primero el respaldo completo (JSON). Es el respaldo que protege estos datos.'); return; }
  if ((Date.now() - r.ts) > 30 * 60 * 1000) {
    alert('Tu respaldo tiene mas de 30 minutos (hace ' + haceMinutos(r.ts) + '). Descarga uno nuevo antes de limpiar.');
    return;
  }
  if (!await modalConfirmarLimpieza(r)) return;
  var pin = await modalPrompt('Re-autenticacion: escribe tu PIN de administrador para autorizar la limpieza.', '', 'PIN de administrador', true);
  if (!pin) return;
  try {
    var lr = await llamar('f_login', { p_pin: pin });
    var tok = (lr && lr.length) ? lr[0].token : null;
    var rol = (lr && lr.length) ? lr[0].rol : null;
    if (tok) llamar('f_logout', { p_token: tok }).catch(function(){});
    if (rol !== 'admin') { alert('Ese PIN no es del administrador. Limpieza cancelada.'); return; }
  } catch (e4) {
    var m = String(e4 && e4.message ? e4.message : e4);
    if (m.indexOf('BLOQUEADO') !== -1) { alert('Bloqueado por demasiados intentos fallidos (15 min). Limpieza cancelada.'); return; }
    alert('No se pudo verificar el PIN. Limpieza cancelada.');
    return;
  }
  try {
    var ok = await llamar('f_admin_limpiar_todo', { p_token: ses.token });
    if (!ok) { alert('No se pudo limpiar. Recuerda: debe existir al menos un informe guardado.'); return; }
    sessionStorage.removeItem('na_respaldo');
    borrarSesion();
    alert('Limpieza completada. Entra de nuevo con tu PIN para empezar el proximo evento.');
    location.replace('index.html');
  } catch (e) { alert('Fallo al limpiar: ' + e.message); }
}

if (!ses || ses.rol !== 'admin') {
  location.replace('index.html');
} else {
  activarAutoBloqueo();
  $('btnCerrarEdicion').onclick = function(){ cambiarEdicion(false); };
  $('btnAbrirEdicion').onclick = function(){ cambiarEdicion(true); };
  $('btnCrearCoord').onclick = crearCoord;
  $('btnGuardarInforme').onclick = guardarInforme;
  $('btnExportarRespaldo').onclick = exportarRespaldo;
  $('btnLimpiarTodo').onclick = limpiarTodo;
  $('btnVerSesiones').onclick = cargarSesiones;
  $('btnRevocarSesiones').onclick = revocarSesiones;
  $('btnRotarAdmin').onclick = function(){ rotarPin('admin'); };
  $('btnRotarPuerta').onclick = function(){ rotarPin('puerta'); };
  $('btnVolver').onclick = function(){ location.replace('dashboard.html'); };
  cargarEstado();
  cargarLista();
  cargarHistorial();
}
