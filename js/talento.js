function $(id){ return document.getElementById(id); }
function esc(t){
  return String(t == null ? '' : t)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function pinta(el, texto, ok){
  el.textContent = texto;
  // P0-04 fase 4b: el color se aplica por clase (texto-ok / texto-aviso) y no por
  // CSSOM, para que todo lo que pinta esta pagina quede cubierto por la CSP.
  el.classList.remove('texto-ok', 'texto-aviso');
  el.classList.add(ok ? 'texto-ok' : 'texto-aviso');
}
function avisoMsg(id, texto, ok){ pinta($(id), texto, ok); }
function boton(texto, clase, fn){
  var b = document.createElement('button');
  b.className = 'btn ' + clase;
  b.textContent = texto;
  b.onclick = fn;
  return b;
}
function param(name){
  return new URLSearchParams(location.search).get(name);
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
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e2) {
      return false;
    }
  }
}
async function copiarImagen(url){
  var r = await fetch(url);
  var blob = await r.blob();
  if (!window.ClipboardItem) throw new Error('sin ClipboardItem');
  await navigator.clipboard.write([new ClipboardItem({ [blob.type || 'image/png']: blob })]);
}

var DATA = null;
var CODIGO = null;

function fallarLink(txt){
  $('cardCarga').hidden = true;
  $('cardError').hidden = false;
  $('msgError').textContent = txt;
}

function fallarAnulado(){
  $('cardCarga').hidden = true;
  $('cardTalento').hidden = true;
  $('cardFinal').hidden = true;
  $('barraFinal').hidden = true;
  $('cardAnulado').hidden = false;
  window.scrollTo(0, 0);
}

async function cargar(){
  var t = param('t');
  if (!t) { fallarLink('Link incompleto: falta el codigo del talento. Pidele el link completo a tu coordinador.'); return; }
  try {
    var d = await llamar('f_link_talento_ver', { p_codigo_link: t });
    if (!d) { fallarLink('Este link no existe o fue revocado. Pidele uno nuevo a tu coordinador.'); return; }
    if (d.anulado === true) { fallarAnulado(); return; }
    DATA = d;
    CODIGO = t;
    render();
  } catch (e) {
    fallarLink('No se pudo conectar con la base de datos: ' + e.message);
  }
}

function nombreTalento(){
  if (typeof DATA.talento === 'string') return DATA.talento;
  if (DATA.talento && DATA.talento.nombre) return DATA.talento.nombre;
  return 'Talento';
}

function dia1ConPersonas(){
  return (DATA.listas || []).some(function(l){ return l.dia === 1 && (l.personas || []).length > 0; });
}
function personasDia1(){
  var l = (DATA.listas || []).filter(function(x){ return x.dia === 1; })[0];
  return l ? (l.personas || []).length : 0;
}

function render(){
  $('cardCarga').hidden = true;
  $('cardFinal').hidden = true;
  $('cardAnulado').hidden = true;
  $('cardTalento').hidden = false;
  $('tituloTalento').textContent = nombreTalento();
  if (DATA.edicion_abierta) {
    avisoMsg('notaEdicionTal', 'La edicion esta ABIERTA: puedes guardar cambios mientras cada lista no pase a puerta.', true);
  } else {
    avisoMsg('notaEdicionTal', 'El administrador CERRo la edicion: estas viendo solo consulta.', false);
  }
  avisoMsg('msgGlobal', '', true);
  var zona = $('zonaListas');
  zona.innerHTML = '';
  var listas = (DATA.listas || []).slice().sort(function(a, b){ return a.dia - b.dia; });
  listas.forEach(function(l){ zona.appendChild(cardLista(l)); });
  $('barraFinal').hidden = false;
}

function cardLista(l){
  var sec = document.createElement('section');
  sec.className = 'tarjeta';
  var estadoTxt = (l.estado === 'en_edicion') ? 'En edicion' : ((l.estado === 'en_puerta') ? 'En puerta' : 'Cerrada');
  var badgeCls = (l.estado === 'en_edicion') ? 'badge-ok' : ((l.estado === 'en_puerta') ? 'badge-tipo' : 'badge-no');
  sec.innerHTML = '<h2>Dia ' + l.dia + ' <span class="badge ' + badgeCls + '">' + estadoTxt + '</span></h2>';
  var editable = DATA.edicion_abierta && l.estado === 'en_edicion';
  if (editable) {
    var hint = document.createElement('p');
    hint.className = 'suave';
    hint.textContent = 'Pulsa "Agregar participante" para anadir integrantes y luego "Guardar lista". Nombre, apellido, cedula y cargo son obligatorios.';
    sec.appendChild(hint);
    var rows = document.createElement('div');
    rows.id = 'rows-' + l.dia;
    (l.personas || []).forEach(function(p){ rows.appendChild(filaPersona(p)); });
    sec.appendChild(rows);
    var fila = document.createElement('div');
    fila.className = 'fila';
    fila.appendChild(boton('Agregar participante', 'btn-gris', function(){
      var yaTienePanel = sec.querySelector('.panelOpcion');
      if (l.dia === 2 && (l.personas || []).length === 0 && dia1ConPersonas()
          && !sessionStorage.getItem('na_norep_' + CODIGO) && !rows.children.length && !yaTienePanel) {
        mostrarOpcionDia2(sec, rows, l);
      } else {
        rows.appendChild(filaPersona(null));
      }
    }));
    fila.appendChild(boton('Guardar lista del Dia ' + l.dia, '', function(){ guardarDia(l, rows); }));
    sec.appendChild(fila);
  } else {
    var nota = document.createElement('p');
    nota.className = 'suave';
    nota.textContent = DATA.edicion_abierta
      ? 'Esta lista ya esta en puerta o cerrada: no se puede editar, solo consultar.'
      : 'La edicion esta cerrada: esta lista es solo de consulta.';
    sec.appendChild(nota);
    sec.appendChild(tablaPersonas(l.personas));
  }
  if ((l.personas || []).length && l.codigo_corto) {
    sec.appendChild(construirCajaQR(l));
  } else if (editable) {
    var notaQr2 = document.createElement('p');
    notaQr2.className = 'suave';
    notaQr2.textContent = 'El QR de esta lista aparecera aqui cuando guardes al menos un participante con todos sus datos.';
    sec.appendChild(notaQr2);
  }
  return sec;
}

function construirCajaQR(l){
  var qr = document.createElement('div');
  qr.className = 'qrbox';
  var qrInner = document.createElement('div');
  qr.appendChild(qrInner);
  var notaQr = document.createElement('p');
  notaQr.className = 'suave';
  notaQr.textContent = 'Muestra este QR en la puerta, o dicta el codigo corto si el QR no se pudiera leer.';
  qr.appendChild(notaQr);
  var filaQr = document.createElement('div');
  filaQr.className = 'fila';
  qr.appendChild(filaQr);
  var msgQr = document.createElement('p');
  msgQr.className = 'suave';
  qr.appendChild(msgQr);
  ponerQR(qrInner, urlPuerta('lista', l.codigo_corto), l.codigo_corto);
  agregarBotonesQR(filaQr, msgQr, qrInner, l);
  return qr;
}

function mostrarOpcionDia2(sec, rows, l){
  var panel = document.createElement('div');
  panel.className = 'panelOpcion';
  var txt = document.createElement('p');
  txt.className = 'suave';
  txt.textContent = 'Ya tienes una lista guardada del Dia 1 con ' + personasDia1() + ' participante(s). Que prefieres hacer con el Dia 2?';
  panel.appendChild(txt);
  var fila = document.createElement('div');
  fila.className = 'fila';
  fila.appendChild(boton('Repetir y editar la del Dia 1', '', async function(){
    try {
      var ok = await llamar('f_link_talento_copiar', {
        p_codigo_link: CODIGO, p_dia_origen: 1, p_dia_destino: 2
      });
      if (ok === true) { await cargar(); return; }
      pinta($('msgGlobal'), 'No se pudo copiar la lista al Dia 2 (quizas el Dia 2 ya tiene integrantes).', false);
    } catch (e) {
      pinta($('msgGlobal'), 'No se pudo conectar: ' + e.message, false);
    }
  }));
  fila.appendChild(boton('Lista nueva desde cero', 'btn-azul', function(){
    sessionStorage.setItem('na_norep_' + CODIGO, '1');
    panel.remove();
    rows.appendChild(filaPersona(null));
  }));
  fila.appendChild(boton('Cancelar', 'btn-gris', function(){ panel.remove(); }));
  panel.appendChild(fila);
  sec.insertBefore(panel, rows);
}

function agregarBotonesQR(fila, msgEl, qrInner, l){
  var img = qrInner.querySelector('img');
  var urlImg = img ? img.src : null;
  var textoComp = 'NitroSystem - Lista del Dia ' + l.dia + ' de ' + nombreTalento()
    + '. Codigo corto: ' + l.codigo_corto
    + '. Link de puerta: ' + urlPuerta('lista', l.codigo_corto)
    + (urlImg ? ' . Ver el QR: ' + urlImg : '');

  fila.appendChild(boton('Copiar QR', 'btn-gris', async function(){
    // P0-04: el <img> del QR se crea al pintarlo (local), no antes. Se busca en el
    // momento del clic para no caer siempre al respaldo de texto.
    var imgAhora = qrInner.querySelector('img');
    var urlAhora = imgAhora ? imgAhora.src : null;
    if (urlAhora) {
      try {
        await copiarImagen(urlAhora);
        pinta(msgEl, 'QR copiado como imagen: pegalo en tu grupo o chat con Ctrl+V o manteniendo pulsado.', true);
        return;
      } catch (e) {}
    }
    var ok = await copiarTexto(textoComp);
    if (ok) {
      pinta(msgEl, 'Tu navegador no dejo copiar la imagen, asi que copie el texto con el codigo y el link: pegalo donde quieras.', true);
    } else {
      pinta(msgEl, 'No se pudo copiar. Selecciona el codigo corto con el dedo y copialo manual.', false);
    }
  }));

  var aWA = document.createElement('a');
  aWA.className = 'btn';
  aWA.textContent = 'WhatsApp';
  aWA.target = '_blank';
  aWA.href = urlWA(textoComp);
  fila.appendChild(aWA);

  fila.appendChild(boton('Correo', 'btn-azul', async function(){
    await copiarTexto(textoComp);
    pinta(msgEl, 'Intentamos abrir tu aplicacion de correo. Si no se abrio nada, el mensaje ya quedo copiado: pegalo en tu correo o en un grupo.', true);
    window.location.href = urlMail('NitroSystem - QR de lista Dia ' + l.dia, textoComp);
  }));
}

function mostrarFinal(){
  $('cardTalento').hidden = true;
  $('barraFinal').hidden = true;
  var zona = $('zonaQRFinal');
  zona.innerHTML = '';
  var listas = (DATA.listas || []).slice().sort(function(a, b){ return a.dia - b.dia; });
  var hay = false;
  listas.forEach(function(l){
    if ((l.personas || []).length && l.codigo_corto) {
      hay = true;
      var h = document.createElement('h3');
      h.textContent = 'Dia ' + l.dia + ' — codigo corto ' + l.codigo_corto;
      zona.appendChild(h);
      zona.appendChild(construirCajaQR(l));
    }
  });
  if (!hay) {
    zona.innerHTML = '<p class="suave">Todavia no tienes listas guardadas con participantes. Vuelve y guarda al menos una para tener tu QR.</p>';
  }
  avisoMsg('msgCerrar', '', true);
  $('cardFinal').hidden = false;
  window.scrollTo(0, 0);
}

function filaPersona(p){
  var div = document.createElement('div');
  div.className = 'filaPersona';
  var campos = [
    ['nombre', 'Nombre'],
    ['apellido', 'Apellido'],
    ['cedula', 'Cedula'],
    ['cargo', 'Cargo']
  ];
  campos.forEach(function(c){
    var inp = document.createElement('input');
    inp.placeholder = c[1];
    inp.value = (p && p[c[0]]) ? p[c[0]] : '';
    div.appendChild(inp);
  });
  var b = boton('Quitar', 'btn-rojo', function(){ div.remove(); });
  div.appendChild(b);
  return div;
}

function tablaPersonas(rows){
  var t = document.createElement('table');
  t.innerHTML = '<tr><th>Nombre</th><th>Apellido</th><th>Cedula</th><th>Cargo</th><th>Estado</th></tr>';
  (rows || []).forEach(function(p){
    var tr = document.createElement('tr');
    tr.innerHTML = '<td>' + esc(p.nombre) + '</td><td>' + esc(p.apellido) + '</td><td>' + esc(p.cedula) + '</td><td>' + esc(p.cargo) + '</td><td>' + esc(p.estado) + '</td>';
    t.appendChild(tr);
  });
  if (!(rows || []).length) {
    var tr2 = document.createElement('tr');
    tr2.innerHTML = '<td colspan="5">Sin personas registradas.</td>';
    t.appendChild(tr2);
  }
  return t;
}

async function guardarDia(l, rows){
  var filas = rows.querySelectorAll('.filaPersona');
  var arr = [];
  for (var i = 0; i < filas.length; i++) {
    var inputs = filas[i].querySelectorAll('input');
    var p = {
      nombre: inputs[0].value.trim(),
      apellido: inputs[1].value.trim(),
      cedula: inputs[2].value.trim(),
      cargo: inputs[3].value.trim()
    };
    if (!p.nombre && !p.apellido && !p.cedula && !p.cargo) continue;
    if (!p.nombre || !p.apellido || !p.cedula || !p.cargo) {
      avisoMsg('msgGlobal', 'Hay una fila con campos vacios en la lista del Dia ' + l.dia + '. Completa esa fila o pulsale Quitar.', false);
      return;
    }
    if (!textoPersonaValido(p.nombre) || !textoPersonaValido(p.apellido)) {
      avisoMsg('msgGlobal', 'Hay un nombre o apellido no valido (maximo 60 caracteres, sin < ni >) en la lista del Dia ' + l.dia + '.', false);
      return;
    }
    if (!cedulaValida(p.cedula)) {
      avisoMsg('msgGlobal', 'Hay una cedula no valida (solo numeros, 4 a 20 caracteres) en la lista del Dia ' + l.dia + '.', false);
      return;
    }
    if (!textoPersonaValido(p.cargo, 60)) {
      avisoMsg('msgGlobal', 'Hay un cargo no valido (sin < ni >) en la lista del Dia ' + l.dia + '.', false);
      return;
    }
    arr.push(p);
  }
  if (!arr.length) {
    if (!confirm('Esto dejara VACIA la lista del Dia ' + l.dia + '. Continuar?')) return;
  }
  try {
    var ok = await llamar('f_link_talento_guardar', {
      p_codigo_link: CODIGO, p_dia: l.dia, p_personas: arr
    });
    if (ok === true) {
      avisoMsg('msgGlobal', 'Lista del Dia ' + l.dia + ' guardada.', true);
      await cargar();
      return;
    }
    avisoMsg('msgGlobal', 'No se pudo guardar la lista. Revisa que la edicion este abierta y que ningun campo quede vacio.', false);
  } catch (e) {
    if (String(e.message).indexOf('duplicate') >= 0 || String(e.message).indexOf('unique') >= 0) {
      avisoMsg('msgGlobal', 'Hay cedulas repetidas dentro de la lista del Dia ' + l.dia + '. Cada participante debe tener una cedula distinta.', false);
      return;
    }
    avisoMsg('msgGlobal', 'No se pudo conectar: ' + e.message, false);
  }
}

$('btnTermine').onclick = mostrarFinal;
$('btnVolver').onclick = function(){
  $('cardFinal').hidden = true;
  $('cardTalento').hidden = false;
  $('barraFinal').hidden = false;
  window.scrollTo(0, 0);
};
$('btnCerrarPestana').onclick = function(){
  window.close();
  setTimeout(function(){
    pinta($('msgCerrar'), 'Tu navegador no permite que la pagina se cierre sola: cierrala con la X de la pestana o el boton de atras. Tus QR quedan guardados.', false);
  }, 300);
};

cargar();
