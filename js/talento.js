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
// F-6 (defecto 3 de la prueba real): normaliza la cedula igual que la RPC
// f_link_talento_copiar en SQL: quita todo lo que no sea letra o numero y pasa
// a mayusculas (upper(regexp_replace(cedula, '[^0-9A-Za-z]', '', 'g'))). Asi la
// pantalla decide quien ya esta en la lista con el mismo criterio que la base.
function cedulaNormalizada(valor){
  return String(valor == null ? '' : valor).replace(/[^0-9A-Za-z]/g, '').toUpperCase();
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

// ===== Modales propios (regla v2.1: prohibido alert/confirm/prompt nativos) =====
// Motivo P0-03: los dialogos nativos se pueden suprimir y la respuesta nunca
// llega. Este modal propio es HTML y siempre se ve. Mismo patron visual que el
// resto de la app: fondo oscuro, tarjeta y botones.
function modalAviso(mensaje, titulo){
  titulo = titulo || 'Aviso';
  return new Promise(function(resolve){
    var fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    fondo.setAttribute('role', 'dialog');
    fondo.setAttribute('aria-modal', 'true');
    fondo.innerHTML =
      '<div class="modal-caja">' +
        '<div class="modal-titulo">' + esc(titulo) + '</div>' +
        '<div class="modal-mensaje">' + esc(mensaje) + '</div>' +
        '<div class="modal-acciones"><button class="btn" data-modal-ok>Aceptar</button></div>' +
      '</div>';
    document.body.appendChild(fondo);
    var cerrar = function(){ fondo.remove(); resolve(true); };
    fondo.querySelector('[data-modal-ok]').addEventListener('click', cerrar);
    fondo.addEventListener('click', function(e){ if (e.target === fondo) cerrar(); });
    fondo.querySelector('[data-modal-ok]').focus();
  });
}

function modalConfirmar(mensaje, titulo){
  titulo = titulo || 'Confirmar';
  return new Promise(function(resolve){
    var fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    fondo.setAttribute('role', 'dialog');
    fondo.setAttribute('aria-modal', 'true');
    fondo.innerHTML =
      '<div class="modal-caja">' +
        '<div class="modal-titulo">' + esc(titulo) + '</div>' +
        '<div class="modal-mensaje">' + esc(mensaje) + '</div>' +
        '<div class="modal-acciones">' +
          '<button class="btn btn-gris" data-modal-cancelar>Cancelar</button>' +
          '<button class="btn" data-modal-aceptar>Aceptar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(fondo);
    var cerrar = function(resultado){ fondo.remove(); resolve(resultado); };
    fondo.querySelector('[data-modal-cancelar]').addEventListener('click', function(){ cerrar(false); });
    fondo.querySelector('[data-modal-aceptar]').addEventListener('click', function(){ cerrar(true); });
    fondo.addEventListener('click', function(e){ if (e.target === fondo) cerrar(false); });
    fondo.querySelector('[data-modal-aceptar]').focus();
  });
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
  return listaDia1() !== null;
}
function listaDia1(){
  var l = (DATA.listas || []).filter(function(x){ return x.dia === 1; })[0];
  return (l && (l.personas || []).length > 0) ? l : null;
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
    // F-6: barra de acciones SIEMPRE visible mientras la lista sea editable.
    // En el Dia 2, si el Dia 1 tiene personas, la copia es la accion principal;
    // el fallback manual (agregar a mano y guardar) nunca desaparece.
    // F-6 (defectos 4 y 5 de la prueba en pantalla): UNA sola barra de acciones
    // con los 4 botones compactos en fila (clase barraAcciones). "Vaciar" vive
    // AQUI y no al final de la tarjeta, donde parecia parte del QR.
    // F-6 (defecto reportado al usarlo): la barra va ARRIBA (justo tras el
    // titulo/estado y la nota de edicion, ANTES de las filas): al crecer la lista quedaba al
    // fondo y "Vaciar" se perdia sin hacer scroll. Con position:sticky (CSS)
    // sigue a la vista con 3 o con 30 personas. Dia 1 cerrado no la pinta:
    // entra por este bloque solo si editable.
    var fila = document.createElement('div');
    fila.className = 'barraAcciones';
    if (l.dia === 2 && dia1ConPersonas()) {
      fila.appendChild(boton('Copiar del Dia 1', '', function(){ mostrarPanelCopiar(sec, rows, l); }));
    }
    fila.appendChild(boton('Agregar participante', 'btn-gris', function(){
      rows.appendChild(filaPersona(null));
    }));
    fila.appendChild(boton('Guardar lista del Dia ' + l.dia, '', function(){ guardarDia(l, rows); }));
    if (l.dia === 2) fila.appendChild(botonVaciarLista(l, rows));
    sec.appendChild(fila);
    sec.appendChild(rows);
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

// F-6 (defecto 1 de la prueba real): "Empezar de cero" solo limpiaba el DOM y
// la base seguia con las personas, con lo cual la copia decia "ya estaban
// todas". Ahora es "Vaciar la lista del Dia N" y PERSISTE el vaciado
// reutilizando la RPC de guardado (DELETE + INSERT; con p_personas: [] deja
// la lista vacia en la base). Sin dialogos nativos: modal propio.
// F-6 (defecto 4): el boton vive en la barra de acciones de la lista, no al
// final de la tarjeta (la columna de antes); la logica, los textos y el modal
// de confirmacion quedan intactos.
function botonVaciarLista(l, rows){
  var btnVaciar = boton('Vaciar la lista del Dia ' + l.dia, 'btn-aviso', async function(){
    // N real: personas GUARDADAS en la base (l.personas), no filas visibles.
    var guardadas = (l.personas || []).length;
    if (!guardadas) {
      await modalAviso('La lista del Dia ' + l.dia + ' ya esta vacia.', 'Nada que vaciar');
      return;
    }
    var pregunta = (guardadas === 1
      ? 'Se borrara 1 persona guardada en la lista del Dia ' + l.dia + '. Esta accion no se puede deshacer.'
      : 'Se borraran ' + guardadas + ' personas guardadas en la lista del Dia ' + l.dia + '. Esta accion no se puede deshacer.');
    if (!(await modalConfirmar(pregunta, 'Vaciar la lista del Dia ' + l.dia))) return;
    btnVaciar.disabled = true;
    rows.innerHTML = ''; // limpieza inmediata en pantalla; si el guardado falla, cargar() repone la base
    var txtFinal = '';
    var okFinal = true;
    try {
      var okVaciar = await llamar('f_link_talento_guardar', {
        p_codigo_link: CODIGO, p_dia: l.dia, p_personas: []
      });
      if (okVaciar === true) {
        txtFinal = 'Lista del Dia ' + l.dia + ' vaciada.';
      } else {
        await modalAviso('No se pudo vaciar la lista del Dia ' + l.dia + '. Se vuelve a mostrar lo que hay guardado en la base.', 'No se pudo vaciar');
        txtFinal = 'No se pudo vaciar la lista del Dia ' + l.dia + '.';
        okFinal = false;
      }
    } catch (e) {
      console.error('[talento] vaciar Dia ' + l.dia + ': error', e);
      await modalAviso('No se pudo vaciar la lista del Dia ' + l.dia + ': ' + e.message + '. Se vuelve a mostrar lo que hay guardado en la base.', 'Error de conexion');
      txtFinal = 'No se pudo vaciar la lista del Dia ' + l.dia + ': ' + e.message;
      okFinal = false;
    }
    // Recarga SIEMPRE desde la base: si el guardado fallo, la pantalla no se
    // queda diciendo que esta vacia cuando no lo esta.
    await cargar();
    // El aviso va DESPUES de cargar(): render() limpia msgGlobal, asi que si
    // se pinta antes, el texto desaparece en cuanto llega la recarga.
    avisoMsg('msgGlobal', txtFinal, okFinal);
  });
  return btnVaciar;
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

// F-6 (defecto 2 de la prueba real): mensaje honesto y con concordancia
// singular/plural para los cuatro casos posibles del resultado de la copia.
function textoResultadoCopiar(copiadas, omitidas){
  copiadas = copiadas || 0;
  omitidas = omitidas || 0;
  if (copiadas > 0) {
    var msg = (copiadas === 1) ? '1 persona copiada.' : copiadas + ' personas copiadas.';
    if (omitidas > 0) {
      msg += ' ' + ((omitidas === 1) ? '1 ya estaba en la lista.' : omitidas + ' ya estaban en la lista.');
    }
    return msg;
  }
  if (omitidas > 0) {
    return (omitidas === 1)
      ? 'No hay personas nuevas que copiar: la 1 seleccionada ya estaba en la lista.'
      : 'No hay personas nuevas que copiar: las ' + omitidas + ' seleccionadas ya estaban en la lista.';
  }
  return 'No se copio ninguna persona: no habia nada que copiar.';
}

// F-6: panel de seleccion de la copia Dia 1 -> Dia 2. Una casilla por persona
// del Dia 1 (todas marcadas por defecto). La copia SUMA: la RPC omite quien ya
// este en el destino con la misma cedula (normalizada) y no borra nada.
function mostrarPanelCopiar(sec, rows, l){
  if (sec.querySelector('.panelOpcion')) return; // ya hay un panel abierto
  var origen = listaDia1();
  if (!origen) return;
  // F-6 (defecto 3 de la prueba real): detectar quien ya esta en el destino
  // comparando la cedula normalizada igual que la RPC. Quien ya esta aparece
  // con la etiqueta "ya en la lista", desmarcado y deshabilitado: copiarlo no
  // haria nada.
  var enDestino = {};
  (l.personas || []).forEach(function(p){
    var c = cedulaNormalizada(p.cedula);
    if (c) enDestino[c] = true;
  });
  var personasOrigen = origen.personas || [];
  var yaEnLista = personasOrigen.filter(function(p){ return enDestino[cedulaNormalizada(p.cedula)]; }).length;
  var panel = document.createElement('div');
  panel.className = 'panelOpcion';
  var txt = document.createElement('p');
  txt.className = 'suave';
  panel.appendChild(txt);
  if (yaEnLista === personasOrigen.length) {
    // Defecto 3: si TODAS ya estan, no hay nada seleccionable: se informa y el
    // panel solo ofrece Cancelar.
    txt.textContent = 'Todas las personas del Dia 1 ya estan en la lista del Dia ' + l.dia + '.';
    var filaSalir = document.createElement('div');
    filaSalir.className = 'fila';
    filaSalir.appendChild(boton('Cancelar', 'btn-gris', function(){ panel.remove(); }));
    panel.appendChild(filaSalir);
    sec.insertBefore(panel, rows);
    return;
  }
  txt.textContent = 'Marca las personas del Dia 1 que quieres copiar a la lista del Dia ' + l.dia + '. Las que ya esten con la misma cedula no se duplican: solo se suman las nuevas.';

  var grupos = document.createElement('div');
  grupos.className = 'copiarLista';
  var casillas = [];
  personasOrigen.forEach(function(p){
    var eti = document.createElement('label');
    eti.className = 'copiarPersona';
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    var dup = !!enDestino[cedulaNormalizada(p.cedula)];
    cb.checked = !dup;
    cb.disabled = dup;
    cb.value = p.persona_id;
    eti.appendChild(cb);
    var span = document.createElement('span');
    span.textContent = (p.nombre || '') + ' ' + (p.apellido || '') + ' — Cedula: ' + (p.cedula || '') + (p.cargo ? ' — Cargo: ' + p.cargo : '');
    eti.appendChild(span);
    if (dup) {
      var marca = document.createElement('span');
      marca.className = 'texto-aviso'; // clase ya existente: no toca el style ni el hash CSP
      marca.textContent = ' — ya en la lista';
      eti.appendChild(marca);
    }
    cb.addEventListener('change', actualizaContador);
    casillas.push(cb);
    grupos.appendChild(eti);
  });
  panel.appendChild(grupos);

  var contador = document.createElement('p');
  var spanContador = document.createElement('span');
  spanContador.className = 'copiarContador';
  contador.appendChild(spanContador);
  panel.appendChild(contador);

  function marcadas(){
    return casillas.filter(function(c){ return c.checked; });
  }
  function actualizaContador(){
    // Defecto 3: el contador refleja solo las seleccionables (las deshabilitadas
    // por ya estar en la lista no cuentan en el denominador) y avisa cuantas
    // del origen ya estaban en la lista.
    spanContador.textContent = marcadas().length + ' de ' + (casillas.length - yaEnLista) + ' seleccionadas'
      + (yaEnLista > 0 ? ' (' + yaEnLista + ' ya en la lista)' : '');
  }
  actualizaContador();

  var filaSel = document.createElement('div');
  filaSel.className = 'fila';
  filaSel.appendChild(boton('Seleccionar todas', 'btn-gris', function(){
    casillas.forEach(function(c){ if (!c.disabled) c.checked = true; });
    actualizaContador();
  }));
  filaSel.appendChild(boton('Ninguna', 'btn-gris', function(){
    casillas.forEach(function(c){ if (!c.disabled) c.checked = false; });
    actualizaContador();
  }));
  panel.appendChild(filaSel);

  var filaAcciones = document.createElement('div');
  filaAcciones.className = 'fila';
  var copiando = false; // evita doble envio mientras la RPC esta en vuelo
  var btnCopiar = boton('Copiar seleccionados', '', async function(){
    if (copiando) return;
    var ids = marcadas().map(function(c){ return c.value; });
    if (!ids.length) {
      await modalAviso('Selecciona al menos una persona.', 'Falta la seleccion');
      return;
    }
    copiando = true;
    btnCopiar.disabled = true;
    console.info('[talento] copiar selectivo Dia 1 -> Dia ' + l.dia + ': inicio, ' + ids.length + ' seleccionada(s)');
    try {
      var r = await llamar('f_link_talento_copiar', {
        p_codigo_link: CODIGO,
        p_dia_origen: 1,
        p_dia_destino: l.dia,
        p_persona_ids: ids
      });
      if (r && r.ok === true) {
        panel.remove();
        var msg = textoResultadoCopiar(r.copiadas, r.omitidas);
        avisoMsg('msgGlobal', msg, true);
        await modalAviso(msg, 'Copia al Dia ' + l.dia);
        if (r.copiadas > 0) await cargar();
        return;
      }
      panel.remove();
      var motivo = (r && r.motivo) ? String(r.motivo) : '';
      var txtMotivo;
      if (motivo === 'edicion_cerrada') {
        txtMotivo = 'No se pudo copiar: el administrador cerro la edicion. Mientras tu lista no pase a puerta puedes agregar participantes a mano y guardar.';
      } else if (motivo === 'destino_no_editable') {
        txtMotivo = 'No se pudo copiar: la lista del Dia ' + l.dia + ' ya no esta en edicion.';
      } else if (motivo === 'link_invalido') {
        txtMotivo = 'No se pudo copiar: el link ya no es valido o fue revocado. Pidele uno nuevo a tu coordinador.';
      } else {
        txtMotivo = 'No se pudo copiar al Dia ' + l.dia + '. Puedes agregar participantes a mano y guardar.';
      }
      avisoMsg('msgGlobal', txtMotivo, false);
      await modalAviso(txtMotivo, 'No se pudo copiar');
    } catch (e) {
      console.error('[talento] copiar selectivo Dia 1 -> Dia ' + l.dia + ': error', e);
      copiando = false;
      btnCopiar.disabled = false;
      await modalAviso('No se pudo conectar con la base de datos: ' + e.message, 'Error de conexion');
    }
  }
  );
  filaAcciones.appendChild(btnCopiar);
  filaAcciones.appendChild(boton('Cancelar', 'btn-gris', function(){ panel.remove(); }));
  panel.appendChild(filaAcciones);
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
    if (!(await modalConfirmar('Esto dejara VACIA la lista del Dia ' + l.dia + '. Continuar?', 'Guardar lista vacia'))) return;
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
