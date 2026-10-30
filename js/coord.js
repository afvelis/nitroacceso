function $(id){ return document.getElementById(id); }
function esc(t){
  return String(t == null ? '' : t)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function avisoMsg(id, texto, ok){
  var el = $(id);
  el.textContent = texto;
  el.style.color = ok ? 'var(--acento)' : 'var(--aviso)';
}
function urlWA(texto){ return 'https://wa.me/?text=' + encodeURIComponent(texto); }
function urlMail(asunto, texto){ return 'mailto:?subject=' + encodeURIComponent(asunto) + '&body=' + encodeURIComponent(texto); }
async function copiarTexto(txt){
  try {
    await navigator.clipboard.writeText(txt);
    return true;
  } catch (e) {
    try {
      var ta = document.createElement('textarea');
      ta.value = txt;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, 99999);
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e2) {
      return false;
    }
  }
}

var coord = null;
var misLinks = [];
var linksRenovados = {}; // guarda los codigos viejos que ya fueron renovados en esta sesion

function leerCoordGuardado(){
  try { return JSON.parse(sessionStorage.getItem('na_coord') || 'null'); } catch (e) { return null; }
}
function linkCompleto(item){
  return (coord.tipo === 'talentos')
    ? BASE + 'talento.html?t=' + item.codigo
    : BASE + 'stand.html?s=' + item.codigo;
}

async function entrarConCodigo(codigo){
  try {
    var d = await llamar('f_coord_entrar', { p_codigo: codigo });
    if (!d) { avisoMsg('msgEntrada', 'Codigo invalido o revocado. Pidele uno nuevo al administrador.', false); return; }
    coord = { codigo: codigo, tipo: d.tipo, nombre: d.nombre, edicion_abierta: d.edicion_abierta };
    sessionStorage.setItem('na_coord', JSON.stringify(coord));
    mostrarTrabajo();
  } catch (e) {
    avisoMsg('msgEntrada', 'No se pudo conectar con la base de datos: ' + e.message, false);
  }
}

async function entrar(){
  var codigo = $('inCodigo').value.toUpperCase().trim();
  if (!codigo) { avisoMsg('msgEntrada', 'Escribe tu codigo COORD- primero.', false); return; }
  await entrarConCodigo(codigo);
}

function mostrarTrabajo(){
  $('cardEntrada').hidden = true;
  $('cardTrabajo').hidden = false;
  $('saludo').textContent = 'Hola, ' + coord.nombre + ' — Coordinador de ' + coord.tipo;
  if (coord.edicion_abierta) {
    avisoMsg('notaEdicion', 'La edicion esta ABIERTA: puedes crear links nuevos y editar sus datos.', true);
    if (coord.tipo === 'talentos') {
      $('formTalentos').hidden = false;
      $('formStands').hidden = true;
    } else {
      $('formStands').hidden = false;
      $('formTalentos').hidden = true;
    }
  } else {
    avisoMsg('notaEdicion', 'El administrador CERRo la edicion: por ahora no puedes crear links nuevos ni editar sus datos.', false);
    $('formTalentos').hidden = true;
    $('formStands').hidden = true;
  }
  cargarMisLinks();
}

async function cargarMisLinks(){
  misLinks = [];
  try {
    var arr = await llamar('f_coord_mis_links', { p_codigo_coord: coord.codigo });
    misLinks = Array.isArray(arr) ? arr : [];
  } catch (e) {
    misLinks = [];
  }
  renderLinks();
}

function msgError(r, esTalento){
  if (r === 'ERR_COORD') return 'Tu codigo ya no es valido o fue revocado.';
  if (r === 'ERR_EDICION_CERRADA') return 'El administrador cerro la edicion: no se pueden crear ni editar links ahora mismo.';
  if (r === 'ERR_CORREO_USADO') return 'Ese correo ya esta amarrado a otro talento o stand. Usa un correo distinto.';
  if (r === 'ERR_CUPO') return 'El cupo no puede ser menor que la cantidad de vendedores ya registrados.';
  if (r === 'ERR_DATOS') {
    return esTalento
      ? 'Revisa: nombre obligatorio y al menos un dia marcado.'
      : 'Revisa: nombre y numero del stand obligatorios, cupo mayor que cero y tipo elegido.';
  }
  return 'No se pudo completar. Intenta de nuevo o avisa al administrador.';
}

function renderLinks(){
  var cont = $('listaLinks');
  if (!misLinks.length) { $('cardLinks').hidden = true; cont.innerHTML = ''; return; }
  $('cardLinks').hidden = false;
  cont.innerHTML = '';
  misLinks.forEach(function(item, idx){
    var link = linkCompleto(item);
    var textoWA = 'Hola, te comparto el link de registro de ' + item.titulo + ' para NitroSystem: ' + link;
    var div = document.createElement('div');
    div.className = 'item';
    var renovado = !!linksRenovados[item.codigo];
    div.innerHTML =
      '<div><strong>' + esc(item.titulo) + '</strong>' +
      (renovado ? '<span class="badge-renov">Renovado</span>' : '') + '</div>' +
      '<div class="codigo">' + esc(link) + '</div>' +
      (renovado ? '<p class="suave nota-renovado">El link anterior de este registro quedo anulado: usa y reenvia solo este.</p>' : '') +
      '<div class="fila"></div>' +
      '<div class="panel-edit" hidden></div>';
    var fila = div.querySelector('.fila');
    var panel = div.querySelector('.panel-edit');

    var bCop = document.createElement('button');
    bCop.className = 'btn btn-gris';
    bCop.textContent = 'Copiar';
    bCop.onclick = async function(){
      var ok = await copiarTexto(link);
      if (ok) {
        bCop.textContent = '¡Copiado!';
        avisoMsg('msgLinks', 'Link copiado. Pegalo donde quieras.', true);
        setTimeout(function(){ bCop.textContent = 'Copiar'; }, 2000);
      } else {
        avisoMsg('msgLinks', 'Tu navegador no dejo copiar solo. Selecciona el link con el mouse o el dedo y copialo manual.', false);
      }
    };

    var aWA = document.createElement('a');
    aWA.className = 'btn';
    aWA.textContent = 'WhatsApp';
    aWA.target = '_blank';
    aWA.href = urlWA(textoWA);

    var bMail = document.createElement('button');
    bMail.className = 'btn btn-azul';
    bMail.textContent = 'Correo';
    bMail.onclick = async function(){
      await copiarTexto(textoWA);
      avisoMsg('msgLinks', 'Intentamos abrir tu aplicacion de correo. Si no se abrio nada, no te preocupes: el mensaje ya quedo copiado, pegalo en tu correo o en WhatsApp.', true);
      window.location.href = urlMail('NitroSystem - link de registro', textoWA);
    };

    var bEdit = document.createElement('button');
    bEdit.className = 'btn btn-gris';
    bEdit.textContent = '✏️ Edicion del link';
    bEdit.onclick = function(){
      if (panel.hidden) { abrirPanelEdit(panel, item, idx); }
      else { panel.hidden = true; panel.innerHTML = ''; }
    };

    fila.appendChild(bCop);
    fila.appendChild(aWA);
    fila.appendChild(bMail);
    fila.appendChild(bEdit);
    cont.appendChild(div);
  });
}

async function abrirPanelEdit(panel, item, idx){
  panel.hidden = false;
  panel.innerHTML = '<p class="suave">Cargando datos del link...</p>';
  var datos = null;
  if (coord.tipo === 'stands') {
    try {
      datos = await llamar('f_link_stand_ver', { p_codigo_link: item.codigo });
    } catch (e) { datos = null; }
    if (!datos || datos.anulado) { panel.innerHTML = '<p class="suave">No se pudieron cargar los datos del stand. Intenta de nuevo.</p>'; return; }
  }
  panel.innerHTML = '';

  var msg = document.createElement('p');
  msg.className = 'suave';

  if (coord.tipo === 'stands') {
    var lN = document.createElement('label'); lN.textContent = 'Nombre del stand o negocio';
    var iN = document.createElement('input'); iN.value = datos.nombre || '';
    var lNu = document.createElement('label'); lNu.textContent = 'Numero del stand';
    var iNu = document.createElement('input'); iNu.value = datos.numero || '';
    var lC = document.createElement('label'); lC.textContent = 'Cupo de vendedores';
    var iC = document.createElement('input'); iC.type = 'number'; iC.min = '1'; iC.value = datos.cupo;
    var lT = document.createElement('label'); lT.textContent = 'Tipo de stand';
    var iT = document.createElement('select');
    iT.innerHTML = '<option value="patrocinante">Patrocinante</option><option value="pagado">Pagado</option>';
    iT.value = datos.tipo;
    panel.appendChild(lN); panel.appendChild(iN);
    panel.appendChild(lNu); panel.appendChild(iNu);
    panel.appendChild(lC); panel.appendChild(iC);
    panel.appendChild(lT); panel.appendChild(iT);
    var notaRot = document.createElement('p');
    notaRot.className = 'suave';
    notaRot.textContent = 'Al guardar cambios se genera un link NUEVO y el anterior queda anulado: deberas reenviar el link nuevo al contacto del stand.';
    panel.appendChild(notaRot);
  } else {
    var lNT = document.createElement('label'); lNT.textContent = 'Nombre del talento u organizacion';
    var iNT = document.createElement('input'); iNT.value = item.titulo || '';
    panel.appendChild(lNT); panel.appendChild(iNT);
    var notaDias = document.createElement('p');
    notaDias.className = 'suave';
    notaDias.textContent = 'Los dias de presentacion no se cambian aqui para proteger las listas ya creadas.';
    panel.appendChild(notaDias);
  }

  var nota = document.createElement('p');
  nota.className = 'suave';
  nota.textContent = 'El correo y el codigo del link no se cambian: son su llave unica.';
  panel.appendChild(nota);

  var fila = document.createElement('div');
  fila.className = 'fila';
  var bGuardar = document.createElement('button');
  bGuardar.className = 'btn';
  bGuardar.textContent = 'Guardar cambios';
  bGuardar.onclick = async function(){
    var r;
    if (coord.tipo === 'stands') {
      try {
        r = await llamar('f_coord_editar_stand', {
          p_codigo_coord: coord.codigo,
          p_codigo_link: item.codigo,
          p_nombre: iN.value.trim(),
          p_numero: iNu.value.trim(),
          p_cupo: parseInt(iC.value, 10),
          p_tipo: iT.value
        });
      } catch (e) { msg.textContent = 'No se pudo conectar: ' + e.message; msg.style.color = 'var(--aviso)'; return; }
      if (r && r.indexOf('STD-') === 0) {
        linksRenovados[r] = true;
        avisoMsg('msgLinks', 'Guardado. Usted modifico este link con parametros nuevos: se genero un link nuevo y el anterior quedo anulado. Reenvie el link nuevo al contacto del stand.', false);
        await cargarMisLinks();
        return;
      }
      msg.textContent = msgError(r, false);
      msg.style.color = 'var(--aviso)';
      return;
    }
    try {
      r = await llamar('f_coord_editar_talento', {
        p_codigo_coord: coord.codigo,
        p_codigo_link: item.codigo,
        p_nombre: iNT.value.trim()
      });
    } catch (e) { msg.textContent = 'No se pudo conectar: ' + e.message; msg.style.color = 'var(--aviso)'; return; }
    if (r === 'ok') {
      avisoMsg('msgLinks', 'Cambios guardados correctamente.', true);
      await cargarMisLinks();
      return;
    }
    if (r && r.indexOf('TAL-') === 0) {
      linksRenovados[r] = true;
      avisoMsg('msgLinks', 'Guardado. Usted modifico este link: se genero un link nuevo y el anterior quedo anulado. Reenvie el link nuevo al representante.', false);
      await cargarMisLinks();
      return;
    }
    msg.textContent = msgError(r, true);
    msg.style.color = 'var(--aviso)';
  };
  var bCancelar = document.createElement('button');
  bCancelar.className = 'btn btn-gris';
  bCancelar.textContent = 'Cancelar';
  bCancelar.onclick = function(){ panel.hidden = true; panel.innerHTML = ''; };
  fila.appendChild(bGuardar);
  fila.appendChild(bCancelar);
  panel.appendChild(fila);
  panel.appendChild(msg);
}

async function crearTalento(){
  var nombre = $('tNombre').value.trim();
  var dia1 = $('tDia1').checked;
  var dia2 = $('tDia2').checked;
  var correo = $('tCorreo').value.trim();
  if (!nombre) { avisoMsg('msgTalento', 'Escribe el nombre del talento.', false); return; }
  if (!dia1 && !dia2) { avisoMsg('msgTalento', 'Marca al menos un dia de presentacion.', false); return; }
  if (!correo) { avisoMsg('msgTalento', 'El correo del representante es obligatorio.', false); return; }
  try {
    var r = await llamar('f_coord_crear_talento', {
      p_codigo_coord: coord.codigo, p_nombre: nombre, p_dia1: dia1, p_dia2: dia2, p_correo: correo
    });
    if (r && r.indexOf('TAL-') === 0) {
      avisoMsg('msgTalento', 'Talento creado y link listo abajo.', true);
      $('tNombre').value = '';
      $('tDia1').checked = false;
      $('tDia2').checked = false;
      $('tCorreo').value = '';
      await cargarMisLinks();
      return;
    }
    avisoMsg('msgTalento', msgError(r, true), false);
  } catch (e) {
    avisoMsg('msgTalento', 'No se pudo conectar: ' + e.message, false);
  }
}

async function crearStand(){
  var nombre = $('sNombre').value.trim();
  var numero = $('sNumero').value.trim();
  var cupo = parseInt($('sCupo').value, 10);
  var tipo = $('sTipo').value;
  var correo = $('sCorreo').value.trim();
  if (!nombre) { avisoMsg('msgStand', 'Escribe el nombre del stand o negocio: es obligatorio.', false); return; }
  if (!numero) { avisoMsg('msgStand', 'Escribe el numero del stand: es obligatorio.', false); return; }
  if (!cupo || cupo <= 0) { avisoMsg('msgStand', 'El cupo debe ser un numero mayor que cero.', false); return; }
  if (!correo) { avisoMsg('msgStand', 'El correo del contacto es obligatorio.', false); return; }
  try {
    var r = await llamar('f_coord_crear_stand', {
      p_codigo_coord: coord.codigo, p_nombre: nombre, p_numero: numero, p_cupo: cupo, p_tipo: tipo, p_correo: correo
    });
    if (r && r.indexOf('STD-') === 0) {
      avisoMsg('msgStand', 'Stand creado y link listo abajo.', true);
      $('sNombre').value = '';
      $('sNumero').value = '';
      $('sCorreo').value = '';
      await cargarMisLinks();
      return;
    }
    avisoMsg('msgStand', msgError(r, false), false);
  } catch (e) {
    avisoMsg('msgStand', 'No se pudo conectar: ' + e.message, false);
  }
}

function salir(){
  sessionStorage.removeItem('na_coord');
  coord = null;
  misLinks = [];
  $('cardTrabajo').hidden = true;
  $('cardLinks').hidden = true;
  $('cardEntrada').hidden = false;
  $('inCodigo').value = '';
  avisoMsg('msgEntrada', '', true);
}

var guardado = leerCoordGuardado();
var codigoUrl = '';
try { codigoUrl = (new URLSearchParams(window.location.search).get('c') || '').toUpperCase().trim(); } catch (e) {}
if (codigoUrl) {
  $('inCodigo').value = codigoUrl;
  entrarConCodigo(codigoUrl);
} else if (guardado && guardado.codigo) {
  entrarConCodigo(guardado.codigo);
}
$('btnEntrar').onclick = entrar;
$('btnCrearTalento').onclick = crearTalento;
$('btnCrearStand').onclick = crearStand;
$('btnSalirCoord').onclick = salir;

