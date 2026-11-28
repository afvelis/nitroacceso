// ===== M-38 · Gestión de invitaciones a coordinadores (solo admin) =====
// Pagina coord-invitas.html. La invitacion es el nuevo camino para crear
// coordinadores: el admin arma la invitacion, la persona acepta en
// coordinator.html y el sistema genera su codigo COORD- (creado en la tabla
// coordinadores, igual que antes hacia f_admin_crear_coordinador).
// El codigo COORD- NUNCA se muestra aqui de otra forma: se entrega al aceptar.

// Guarda: pagina de admin. Sin sesion de admin no se ve nada (vuelve al login).
var ses = leerSesion();
if (!ses || ses.rol !== 'admin') {
  location.replace('index.html');
} else {
  activarAutoBloqueo();
}

function $(id){ return document.getElementById(id); }
function esc(t){
  return String(t == null ? '' : t)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fechaBonita(iso){
  try {
    return new Date(iso).toLocaleDateString('es-VE', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  } catch (e) { return ''; }
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
function boton(texto, clase, fn){
  var b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn ' + clase;
  b.textContent = texto;
  b.onclick = function(e){ fn(e.target); };
  return b;
}

// ===== Validacion de campo (norma v2.2: borde rojo + aria-invalid + texto bajo el campo) =====
function marcarCampo(input, span, mensaje){
  input.setAttribute('aria-invalid', 'true');
  input.style.borderColor = 'var(--rojo)';
  if (span) span.textContent = mensaje;
}
function limpiarCampo(input, span){
  input.removeAttribute('aria-invalid');
  input.style.borderColor = '';
  if (span) span.textContent = '';
}
function nombreValido(valor, min, max){
  if (typeof valor !== 'string') return false;
  var v = valor.trim();
  if (v.length < (min || 3) || v.length > (max || 120)) return false;
  return !/[<>]/.test(v);
}

// ===== Pestañas =====
var pestanaActual = 'tabCrear';
function mostrarPestana(id){
  pestanaActual = id;
  ['tabCrear','tabLista','tabCoords'].forEach(function(t){
    $(t).hidden = (t !== id);
  });
  ['pestaCrear','pestaLista','pestaCoords'].forEach(function(p){
    var activa = { pestaCrear:'tabCrear', pestaLista:'tabLista', pestaCoords:'tabCoords' }[p] === id;
    $(p).classList.toggle('activa', activa);
  });
}
$('pestaCrear').onclick = function(){ mostrarPestana('tabCrear'); };
$('pestaLista').onclick = function(){ mostrarPestana('tabLista'); };
$('pestaCoords').onclick = function(){ mostrarPestana('tabCoords'); };

// ===== Tab 1: crear invitación =====
function validarFormularioInvitacion(){
  limpiarCampo($('cNombre'), $('errCNombre'));
  limpiarCampo($('cCorreo'), $('errCCorreo'));
  limpiarCampo($('cTelefono'), $('errCTelefono'));
  var ok = true;
  if (!nombreValido($('cNombre').value, 3, 120)) {
    marcarCampo($('cNombre'), $('errCNombre'), 'Escribe el nombre y apellido (3 a 120 letras, sin signos < o >).');
    ok = false;
  }
  var correo = $('cCorreo').value.trim();
  if (correo && !correoValido(correo)) {
    marcarCampo($('cCorreo'), $('errCCorreo'), 'Ese correo no es válido. Revísalo o déjalo vacío.');
    ok = false;
  }
  var tel = $('cTelefono').value.trim();
  if (tel && !telefonoValido(tel)) {
    marcarCampo($('cTelefono'), $('errCTelefono'), 'Teléfono no válido: usa dígitos (7 a 30), opcionalmente + ( ) . -');
    ok = false;
  }
  return ok;
}

async function crearInvitacion(){
  $('msgCrear').textContent = '';
  if (!validarFormularioInvitacion()) return;
  var btn = $('btnCrearInvitacion');
  btn.disabled = true;
  try {
    var r = await llamar('f_admin_crear_invitacion', {
      p_token: ses.token,
      p_tipo: $('cTipo').value,
      p_nombre: $('cNombre').value.trim(),
      p_email: $('cCorreo').value.trim() || null,
      p_telefono: $('cTelefono').value.trim() || null
    });
    if (!r || r.error === 'SESION') {
      $('msgCrear').textContent = 'Tu sesión expiró o no es de administrador: entra de nuevo desde el inicio.';
      return;
    }
    if (!r.ok) {
      $('msgCrear').textContent = 'No se pudo crear la invitación (' + (r.error || 'error') + '). Revísala e intenta de nuevo.';
      return;
    }
    pintarLinkInvitacion(r.codigo_invit, r.tipo);
    ['cNombre','cCorreo','cTelefono'].forEach(function(id){ $(id).value = ''; });
    $('msgCrear').textContent = 'Invitación creada. Copia o envía el LINK de abajo: la persona debe abrirlo para aceptar.';
    await cargarInvitaciones();
  } catch (e) {
    $('msgCrear').textContent = 'Fallo al crear la invitación: ' + String(e.message || e);
  } finally {
    btn.disabled = false;
  }
}

function pintarLinkInvitacion(codigoInvit, tipo){
  var cont = $('resultadoInvitacion');
  cont.innerHTML = '';
  var caja = document.createElement('div');
  caja.className = 'codigo';
  var pTitulo = document.createElement('p');
  pTitulo.innerHTML = 'Invitación ' + esc(tipo) + ': <strong>' + esc(codigoInvit) + '</strong>';
  var link = BASE + 'coordinator.html?i=' + codigoInvit;
  var pLink = document.createElement('p');
  pLink.className = 'codigo codigo-enlace';
  pLink.textContent = link;
  var fila = document.createElement('div');
  fila.className = 'fila';
  fila.appendChild(boton('Copiar link', 'btn-gris', function(btnC){ copiarTexto(link, btnC); }));
  var wa = document.createElement('a');
  wa.className = 'btn btn-gris';
  wa.target = '_blank';
  wa.rel = 'noopener';
  wa.textContent = '📱 WhatsApp';
  wa.href = 'https://wa.me/?text=' + encodeURIComponent('Hola, te invito a coordinar ' + tipo + ' en NitroSystem. Confirma tus datos en este link: ' + link);
  fila.appendChild(wa);
  var ml = document.createElement('a');
  ml.className = 'btn btn-gris';
  ml.textContent = '✉️ Correo';
  ml.href = 'mailto:?subject=' + encodeURIComponent('Invitación para coordinar en NitroSystem') + '&body=' + encodeURIComponent('Hola, te invito a coordinar ' + tipo + ' en NitroSystem. Confirma tus datos en este link: ' + link + '\n\n(Si no lo esperabas, ignora este mensaje.)');
  fila.appendChild(ml);
  var nota = document.createElement('p');
  nota.className = 'suave';
  nota.textContent = 'La invitación queda en la lista como "pendiente" hasta que la persona la acepte.';
  cont.appendChild(caja);
  caja.appendChild(pTitulo);
  caja.appendChild(pLink);
  cont.appendChild(fila);
  cont.appendChild(nota);
}
$('btnCrearInvitacion').onclick = crearInvitacion;

// ===== Tab 2: lista de invitaciones (20 primeras + "Ver más") =====
var invitaciones = [];
var filtroEstado = 'todos';
var filtroTipo = 'todos';
var LISTA_VISIBLE = 20;
var listaExpandida = false;

$('filtrosEstado').addEventListener('click', function(e){
  var b = e.target.closest('.filtro');
  if (!b) return;
  filtroEstado = b.getAttribute('data-filtro-estado');
  this.querySelectorAll('.filtro').forEach(function(x){ x.classList.toggle('activa', x === b); });
  renderInvitaciones();
});
$('filtrosTipo').addEventListener('click', function(e){
  var b = e.target.closest('.filtro');
  if (!b) return;
  filtroTipo = b.getAttribute('data-filtro-tipo');
  this.querySelectorAll('.filtro').forEach(function(x){ x.classList.toggle('activa', x === b); });
  renderInvitaciones();
});

function invitacionesFiltradas(){
  return invitaciones.filter(function(i){
    return (filtroEstado === 'todos' || i.estado === filtroEstado)
        && (filtroTipo === 'todos' || i.tipo === filtroTipo);
  });
}

async function cargarInvitaciones(){
  var cont = $('listaInvitaciones');
  try {
    var r = await llamar('f_admin_listar_invitaciones', { p_token: ses.token });
    if (r === null || (r && r.error === 'SESION')) {
      cont.innerHTML = '<p class="suave">Tu sesión expiró: entra de nuevo con tu PIN.</p>';
      return;
    }
    invitaciones = Array.isArray(r && r.filas) ? r.filas : [];
  } catch (e) {
    cont.innerHTML = '<p class="suave">No se pudo cargar la lista: ' + esc(e.message || e) + '</p>';
    return;
  }
  listaExpandida = false;
  renderInvitaciones();
}

function pillEstado(estado){
  var mapa = {
    pendiente: ['pill-pendiente', 'Pendiente'],
    aceptada: ['pill-aceptada', 'Aceptada'],
    rechazada: ['pill-rechazada', 'Rechazada'],
    expirada: ['pill-expirada', 'Expirada']
  };
  var m = mapa[estado] || ['pill-expirada', estado || '?'];
  var span = document.createElement('span');
  span.className = 'pill ' + m[0];
  span.textContent = m[1];
  return span;
}

function renderInvitaciones(){
  var cont = $('listaInvitaciones');
  cont.innerHTML = '';
  var lista = invitacionesFiltradas();
  $('btnExportarInvCSV').disabled = lista.length === 0;
  if (!invitaciones.length) {
    cont.innerHTML = '<p class="suave">Todavía no hay invitaciones. Crea la primera en "Crear invitación".</p>';
    $('btnVerMasInv').hidden = true;
    return;
  }
  if (!lista.length) {
    cont.innerHTML = '<p class="suave">Ninguna invitación coincide con el filtro activo.</p>';
    $('btnVerMasInv').hidden = true;
    return;
  }
  var visibles = listaExpandida ? lista.length : Math.min(LISTA_VISIBLE, lista.length);
  for (var i = 0; i < visibles; i++) {
    cont.appendChild(tarjetaInvitacion(lista[i]));
  }
  var resto = lista.length - visibles;
  var btnMas = $('btnVerMasInv');
  if (lista.length > LISTA_VISIBLE) {
    btnMas.hidden = false;
    btnMas.textContent = listaExpandida
      ? 'Mostrar solo las ' + LISTA_VISIBLE + ' primeras'
      : 'Mostrar todas (' + lista.length + '): quedan ' + resto + ' sin ver';
  } else {
    btnMas.hidden = true;
  }
  $('msgListaInv').textContent = listaExpandida
    ? 'Mostrando todas las ' + lista.length + ' invitaciones del filtro.'
    : (lista.length > LISTA_VISIBLE ? 'Mostrando ' + LISTA_VISIBLE + ' de ' + lista.length + '.' : '');
}

$('btnVerMasInv').onclick = function(){
  listaExpandida = !listaExpandida;
  renderInvitaciones();
};

function tarjetaInvitacion(inv){
  var div = document.createElement('div');
  div.className = 'inv';
  var encab = document.createElement('div');
  encab.className = 'fila-encab';
  var nom = document.createElement('span');
  nom.className = 'nombre';
  nom.textContent = inv.nombre;
  var tipo = document.createElement('span');
  tipo.className = 'badge-tipo';
  tipo.textContent = (inv.tipo === 'talentos') ? 'Talentos' : 'Stands';
  encab.appendChild(nom);
  encab.appendChild(tipo);
  encab.appendChild(pillEstado(inv.estado));
  div.appendChild(encab);

  var meta = document.createElement('p');
  meta.className = 'suave';
  var partes = ['Creada: ' + fechaBonita(inv.creada_at)];
  if (inv.aceptada_at) partes.push('Aceptada: ' + fechaBonita(inv.aceptada_at));
  if (inv.rechazada_at) partes.push('Rechazada: ' + fechaBonita(inv.rechazada_at));
  if (inv.email) partes.push('Correo: ' + inv.email);
  if (inv.telefono) partes.push('Teléfono: ' + inv.telefono);
  meta.textContent = partes.join(' · ');
  div.appendChild(meta);

  var msg = document.createElement('p');
  msg.className = 'mensaje-accion';
  msg.id = 'msgInv-' + inv.id;
  div.appendChild(msg);

  var fila = document.createElement('div');
  fila.className = 'fila';
  fila.style.marginTop = '6px';
  div.appendChild(fila);

  function avisoCard(texto, ok){
    msg.textContent = '';
    var txt = document.createElement('span');
    txt.textContent = texto;
    txt.style.color = ok ? 'var(--acento)' : 'var(--aviso)';
    msg.appendChild(txt);
  }

  if (inv.estado === 'pendiente') {
    fila.appendChild(boton('Aceptar', 'btn-verde', function(){ modalAceptar(inv, avisoCard); }));
    fila.appendChild(boton('Rechazar', 'btn-rojo', function(){ modalRechazar(inv, avisoCard); }));
    var linkInv = BASE + 'coordinator.html?i=' + inv.codigo_invit;
    fila.appendChild(boton('📋 Copiar link de invitación', 'btn-gris', function(btnC){ copiarTexto(linkInv, btnC); }));
  } else if (inv.estado === 'aceptada') {
    fila.appendChild(boton('Ver invitación', 'btn-gris', function(){
      verDetalles(inv, 'Esta invitación YA FUE ACEPTADA. El código COORD- de la persona se generó cuando la aceptó y se le entregó al momento; el link de invitación no lo sirve más.');
    }));
  } else if (inv.estado === 'rechazada') {
    var motivo = document.createElement('p');
    motivo.className = 'suave';
    motivo.textContent = 'Motivo del rechazo: ' + (inv.motivo_rechazo || '(sin motivo registrado)');
    div.insertBefore(motivo, msg);
  } else {
    fila.appendChild(boton('Ver invitación', 'btn-gris', function(){
      verDetalles(inv, 'Esta invitación está ' + (inv.estado || 'inactiva') + ': el link no sirve.');
    }));
  }
  return div;
}

function verDetalles(inv, nota){
  var fondo = document.createElement('div');
  fondo.className = 'modal-fondo';
  fondo.innerHTML =
    '<div class="modal-caja">' +
      '<div class="modal-titulo">Invitación ' + esc(inv.nombre) + '</div>' +
      '<div class="modal-mensaje">' + esc(nota) + '</div>' +
      '<div class="codigo">' + esc(
        'Fecha de creación: ' + fechaBonita(inv.creada_at) + '\n' +
        'Nombre: ' + inv.nombre) +
      '</div>' +
      '<div class="modal-mensaje" id="mDetalleLink"></div>' +
      '<div class="modal-acciones"><button type="button" class="btn btn-gris" id="mDetalleCerrar">Cerrar</button></div>' +
    '</div>';
  var wrap = document.createElement('div');
  wrap.appendChild(document.createTextNode('Código de invitación: '));
  var b = document.createElement('strong');
  b.textContent = inv.codigo_invit;
  wrap.appendChild(b);
  var pLink = document.createElement('p');
  pLink.className = 'codigo codigo-enlace';
  pLink.textContent = BASE + 'coordinator.html?i=' + inv.codigo_invit;
  wrap.appendChild(pLink);
  fondo.querySelector('#mDetalleLink').appendChild(wrap);
  document.body.appendChild(fondo);
  var cerrar = function(){ fondo.remove(); };
  fondo.querySelector('#mDetalleCerrar').addEventListener('click', cerrar);
  fondo.addEventListener('click', function(e){ if (e.target === fondo) cerrar(); });
}

// Modal "Aceptar por el coordinador": pide nombre y contacto, los valida,
// llama a f_admin_aceptar_invitacion y muestra el codigo COORD- con botones
// para entregarselo (WhatsApp / correo / copiar), como el panel de antes.
function modalAceptar(inv, avisoCard){
  var fondo = document.createElement('div');
  fondo.className = 'modal-fondo';
  fondo.innerHTML =
    '<div class="modal-caja">' +
      '<div class="modal-titulo">Aceptar invitación de ' + esc(inv.nombre) + '</div>' +
      '<div class="modal-mensaje">El sistema genera el código COORD- de la persona. Confirma nombre y contacto (se pueden corregir):</div>' +
      '<input type="text" id="mAceptNombre" class="campo-modal" aria-label="Nombre y apellido">' +
      '<input type="email" id="mAceptCorreo" class="campo-modal" aria-label="Correo (opcional)" placeholder="Correo (opcional)">' +
      '<input type="tel" id="mAceptTelefono" class="campo-modal" aria-label="Teléfono (opcional)" placeholder="Teléfono (opcional)">' +
      '<div class="modal-mensaje" id="mAceptError" style="color:var(--aviso)"></div>' +
      '<div class="modal-acciones">' +
        '<button type="button" class="btn btn-gris" id="mAceptCancelar">Cancelar</button>' +
        '<button type="button" class="btn" id="mAceptOk">Aceptar y generar código</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(fondo);
  var inNombre = fondo.querySelector('#mAceptNombre');
  var inCorreo = fondo.querySelector('#mAceptCorreo');
  var inTel = fondo.querySelector('#mAceptTelefono');
  inNombre.value = inv.nombre || '';
  inCorreo.value = inv.email || '';
  inTel.value = inv.telefono || '';
  setTimeout(function(){ inNombre.focus(); }, 50);
  var cerrar = function(){ fondo.remove(); };
  fondo.querySelector('#mAceptCancelar').addEventListener('click', cerrar);
  fondo.querySelector('#mAceptOk').addEventListener('click', async function(){
    var nombre = inNombre.value.trim();
    var correo = inCorreo.value.trim();
    var tel = inTel.value.trim();
    var err = fondo.querySelector('#mAceptError');
    err.textContent = '';
    if (!nombreValido(nombre, 3, 120)) { err.textContent = 'Nombre inválido: 3 a 120 letras.'; return; }
    if (correo && !correoValido(correo)) { err.textContent = 'Correo inválido.'; return; }
    if (tel && !telefonoValido(tel)) { err.textContent = 'Teléfono inválido.'; return; }
    var btnOk = fondo.querySelector('#mAceptOk');
    btnOk.disabled = true;
    try {
      var r = await llamar('f_admin_aceptar_invitacion', {
        p_token: ses.token, p_id: inv.id, p_nombre: nombre, p_email: correo || null, p_telefono: tel || null
      });
      if (!r || r.error === 'SESION') { await NA.avisar('Tu sesión expiró: entra de nuevo con tu PIN.'); cerrar(); return; }
      if (!r.ok) {
        var mapa = {
          YA_ACEPTADA: 'Esta invitación ya fue aceptada antes.',
          NO_VIGENTE: 'Esta invitación no está vigente (rechazada o expirada).',
          NOMBRE_INVALIDO: 'Nombre inválido: 3 a 120 letras.',
          EMAIL_INVALIDO: 'Correo inválido.',
          TELEFONO_INVALIDO: 'Teléfono inválido.',
          ID_INVALIDO: 'Invitación no reconocida.',
          NO_EXISTE: 'La invitación ya no existe.'
        };
        err.textContent = mapa[r.error] || 'No se pudo aceptar la invitación.';
        btnOk.disabled = false;
        return;
      }
      cerrar();
      await cargarInvitaciones();
      avisoCard('Invitación aceptada. Código generado: ' + r.codigo, true);
      await mostrarCodigoCreado(inv, r.codigo, r.tipo, nombre);
    } catch (e) {
      err.textContent = 'Fallo: ' + String(e.message || e);
      btnOk.disabled = false;
    }
  });
  fondo.addEventListener('click', function(e){ if (e.target === fondo) cerrar(); });
}

async function mostrarCodigoCreado(inv, codigo, tipo, nombre){
  var textoWA = 'Hola ' + nombre + ', ya aceptamos tu invitación para coordinar ' + tipo + ' en NitroSystem. Tu código de acceso es: ' + codigo + ' — entra en ' + BASE + 'coord.html y escribe ese código.';
  var textoMail = 'Hola ' + nombre + ',\n\nYa aceptamos tu invitación para coordinar ' + tipo + ' en NitroSystem.\n\nTu código de acceso es: ' + codigo + '\nLink: ' + BASE + 'coord.html?c=' + codigo;
  await NA.avisar(
    'Invitación aceptada.\n\n' +
    'Nombre: ' + nombre + '\n' +
    'Código generado: ' + codigo + '\n\n' +
    'Entrega ese código a la persona (botón WhatsApp, correo o copiar). Con él entra en coord.html.',
    'Código de coordinador creado'
  );
  var cont = $('resultadoInvitacion');
  $('msgCrear').textContent = 'La invitación de ' + nombre + ' se aceptó: su código quedó aquí abajo.';
  cont.innerHTML = '';
  mostrarPestana('tabCrear');
  var caja = document.createElement('div');
  caja.className = 'codigo';
  caja.textContent = codigo;
  var fila = document.createElement('div');
  fila.className = 'fila';
  fila.appendChild(boton('Copiar código', 'btn-gris', function(btnC){ copiarTexto(codigo, btnC); }));
  fila.appendChild(boton('📋 Copiar mensaje para WhatsApp', 'btn-gris', function(btnC){ copiarTexto(textoWA, btnC); }));
  var wa = document.createElement('a');
  wa.className = 'btn btn-gris';
  wa.target = '_blank';
  wa.rel = 'noopener';
  wa.textContent = '📱 WhatsApp';
  wa.href = 'https://wa.me/?text=' + encodeURIComponent(textoWA);
  fila.appendChild(wa);
  var ml = document.createElement('a');
  ml.className = 'btn btn-gris';
  ml.textContent = '✉️ Correo';
  ml.href = 'mailto:?subject=' + encodeURIComponent('Tu acceso a NitroSystem') + '&body=' + encodeURIComponent(textoMail);
  fila.appendChild(ml);
  var nota = document.createElement('p');
  nota.className = 'suave';
  nota.textContent = 'Así quedó creado el coordinador en la pestaña "Coordinadores creados".';
  cont.appendChild(caja);
  cont.appendChild(fila);
  cont.appendChild(nota);
}

// Modal "Rechazar": motivo obligatorio de al menos 10 letras (queda registrado).
function modalRechazar(inv, avisoCard){
  var fondo = document.createElement('div');
  fondo.className = 'modal-fondo';
  fondo.innerHTML =
    '<div class="modal-caja">' +
      '<div class="modal-titulo">Rechazar invitación de ' + esc(inv.nombre) + '</div>' +
      '<div class="modal-mensaje">El link deja de servir y el motivo queda registrado. Escribe el motivo (mínimo 10 letras):</div>' +
      '<input type="text" id="mRechMotivo" class="campo-modal" aria-label="Motivo del rechazo">' +
      '<div class="modal-mensaje" id="mRechError" style="color:var(--aviso)"></div>' +
      '<div class="modal-acciones">' +
        '<button type="button" class="btn btn-gris" id="mRechCancelar">Cancelar</button>' +
        '<button type="button" class="btn btn-rojo" id="mRechOk">Rechazar</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(fondo);
  var inp = fondo.querySelector('#mRechMotivo');
  setTimeout(function(){ inp.focus(); }, 50);
  var cerrar = function(){ fondo.remove(); };
  fondo.querySelector('#mRechCancelar').addEventListener('click', cerrar);
  fondo.querySelector('#mRechOk').addEventListener('click', async function(){
    var motivo = inp.value.trim();
    var err = fondo.querySelector('#mRechError');
    err.textContent = '';
    if (motivo.length < 10) { err.textContent = 'El motivo debe tener al menos 10 letras: queda registrado.'; return; }
    if (motivo.length > 500) { err.textContent = 'El motivo no puede pasar de 500 letras.'; return; }
    var btnOk = fondo.querySelector('#mRechOk');
    btnOk.disabled = true;
    try {
      var r = await llamar('f_admin_rechazar_invitacion', { p_token: ses.token, p_id: inv.id, p_motivo: motivo });
      if (!r || r.error === 'SESION') { await NA.avisar('Tu sesión expiró: entra de nuevo con tu PIN.'); cerrar(); return; }
      if (!r.ok) {
        var mapa = {
          MOTIVO_INVALIDO: 'El motivo debe tener entre 10 y 500 letras.',
          YA_DECIDIDA: 'Esta invitación ya fue aceptada o rechazada.',
          NO_EXISTE: 'La invitación ya no existe.',
          ID_INVALIDO: 'Invitación no reconocida.'
        };
        err.textContent = mapa[r.error] || 'No se pudo rechazar la invitación.';
        btnOk.disabled = false;
        return;
      }
      cerrar();
      await cargarInvitaciones();
      avisoCard('Invitación rechazada (motivo registrado).', true);
    } catch (e) {
      err.textContent = 'Fallo: ' + String(e.message || e);
      btnOk.disabled = false;
    }
  });
  fondo.addEventListener('click', function(e){ if (e.target === fondo) cerrar(); });
}

// ===== Exportar CSV (respaldo de invitaciones, igual que el informe de patrocinadores) =====
function celdaCSV(v){
  const s = String(v == null ? '' : v);
  return /[;\r\n"]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function exportarCSV(){
  var lista = invitacionesFiltradas();
  var lineas = ['Codigo invita;Nombre;Tipo;Estado;Correo;Telefono;Creada;Aceptada;Rechazada;Motivo rechazo'];
  lista.forEach(function(i){
    lineas.push([
      celdaCSV(i.codigo_invit), celdaCSV(i.nombre), celdaCSV(i.tipo), celdaCSV(i.estado),
      celdaCSV(i.email || ''), celdaCSV(i.telefono || ''),
      celdaCSV(fechaBonita(i.creada_at)), celdaCSV(fechaBonita(i.aceptada_at)),
      celdaCSV(fechaBonita(i.rechazada_at)), celdaCSV(i.motivo_rechazo || '')
    ].join(';'));
  });
  var texto = '\uFEFF' + lineas.join('\r\n') + '\r\n';
  var bola = new Blob([texto], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(bola);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'invitaciones-coordinadores-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function(){ URL.revokeObjectURL(url); }, 5000);
  $('msgListaInv').textContent = 'CSV descargado (' + lista.length + ' invitaciones del filtro).';
}
$('btnExportarInvCSV').onclick = exportarCSV;

// ===== Tab 3: coordinadores creados (movidos de admin.html, mismas RPC y mismos botones) =====
async function cargarLista(){
  var cont = $('listaCoords');
  try {
    var arr = await llamar('f_admin_listar_coordinadores', { p_token: ses.token });
    if (!arr) { cont.innerHTML = '<p class="suave">Tu sesión expiró: entra de nuevo con tu PIN.</p>'; return; }
    cont.innerHTML = '';
    if (!arr.length) { cont.innerHTML = '<p class="suave">Todavía no hay coordinadores creados. Hazlo con una invitación en la primera pestaña.</p>'; return; }
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
    '<span class="badge-tipo">' + tipoTxt + '</span>' +
    (c.activo ? ' <span class="pill pill-aceptada">Activo</span>' : ' <span class="pill pill-rechazada">Revocado</span>') + '</div>' +
    '<div class="codigo">' + esc(c.codigo) + '</div>' +
    '<p class="suave">' + (c.correo ? esc(c.correo) : 'Sin correo registrado') + (fecha ? ' · Creado el ' + fecha : '') + '</p>' +
    '<div class="fila fila-compacta"></div>' +
    '<div class="codigo codigo-enlace">' + esc(linkEntrada) + '</div>' +
    '<div class="fila"></div>';

  var filas = div.querySelectorAll('.fila');
  var fila1 = filas[0];
  fila1.appendChild(boton('Copiar código', 'btn-gris', function(btnC){ copiarTexto(c.codigo, btnC); }));
  fila1.appendChild(boton('Editar', 'btn-gris', function(){ mostrarEdicion(div, c); }));
  if (c.activo) {
    fila1.appendChild(boton('Revocar', 'btn-rojo', function(){ revocar(c, false); }));
  } else {
    fila1.appendChild(boton('Reactivar', 'btn-verde', function(){ revocar(c, true); }));
    fila1.appendChild(boton('Eliminar definitivamente', 'btn-rojo', function(){ borrarDefinitivo(c); }));
  }

  var fila2 = filas[1];
  fila2.appendChild(boton('📋 Copiar link', 'btn-gris', function(btnC){ copiarTexto(linkEntrada, btnC); }));
  var wa = document.createElement('a');
  wa.className = 'btn btn-gris';
  wa.target = '_blank';
  wa.rel = 'noopener';
  wa.textContent = '📱 WhatsApp';
  wa.href = 'https://wa.me/?text=' + encodeURIComponent('Hola ' + c.nombre + ', aquí tienes tu link de acceso para coordinar ' + tipoTxt + ' en NitroSystem: ' + linkEntrada);
  fila2.appendChild(wa);
  var ml = document.createElement('a');
  ml.className = 'btn btn-gris';
  ml.textContent = '✉️ Correo';
  ml.href = 'mailto:?subject=' + encodeURIComponent('Link de acceso NitroSystem - Coordinación de ' + tipoTxt) + '&body=' + encodeURIComponent('Hola ' + c.nombre + ',\n\nAquí tienes tu link de acceso para coordinar ' + tipoTxt + ' en NitroSystem:\n\n' + linkEntrada + '\n\nTu código es: ' + c.codigo);
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
    if (!nom) { await NA.avisar('El nombre no puede quedar vacío.'); return; }
    try {
      var ok = await llamar('f_admin_editar_coordinador', {
        p_token: ses.token, p_id: c.id, p_nombre: nom, p_correo: cor || null
      });
      if (!ok) { await NA.avisar('No se pudo guardar el cambio.'); return; }
      await cargarLista();
    } catch (e) { await NA.avisar('Fallo al guardar: ' + e.message); }
  }));
  fila.appendChild(boton('Cancelar', 'btn-gris', function(){ panel.remove(); }));
  panel.appendChild(l1);
  panel.appendChild(l2);
  panel.appendChild(fila);
  div.appendChild(panel);
}

async function revocar(c, activo){
  var pregunta = activo
    ? '¿Reactivar el código de ' + c.nombre + '? Podrá volver a entrar y crear links nuevos.'
    : '¿Revocar la llave de ' + c.nombre + '? Ya no podrá entrar ni crear links nuevos. Lo que ya creó queda intacto.';
  if (!await NA.confirmar(pregunta, 'Confirmar')) return;
  try {
    var ok = await llamar('f_admin_activar_coordinador', { p_token: ses.token, p_id: c.id, p_activo: activo });
    if (!ok) { await NA.avisar('No se pudo completar la acción.'); return; }
    await cargarLista();
  } catch (e) { await NA.avisar('Fallo: ' + e.message); }
}

async function borrarDefinitivo(c){
  if (!await NA.confirmar('¿Borrar DEFINITIVAMENTE a ' + c.nombre + ' de la lista? Esta acción no se puede deshacer. Si ya creó talentos o stands, el sistema no lo dejará borrar para proteger el evento.', 'Eliminar definitivamente')) return;
  try {
    var r = await llamar('f_admin_borrar_coordinador', { p_token: ses.token, p_id: c.id });
    if (r === 'ok') { await cargarLista(); return; }
    if (r === 'protegido') {
      await NA.avisar('No se pudo borrar definitivamente: este coordinador ya creó talentos o stands. Déjalo como revocado: así su llave queda inútil y los datos del evento quedan protegidos.');
      return;
    }
    await NA.avisar('No se pudo borrar. Puede que tu sesión expirara o que el coordinador ya no exista. Recarga la página.');
  } catch (e) { await NA.avisar('Fallo al borrar: ' + e.message); }
}

// ===== Arranque =====
cargarInvitaciones();
cargarLista();
