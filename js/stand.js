const params = new URLSearchParams(window.location.search);
const codigoLink = params.get('s');
let datosStand = null;
let loteActual = null;
let listaPersonas = [];
let editIndex = -1;

function urlWA(texto) { return 'https://wa.me/?text=' + encodeURIComponent(texto); }
function urlMail(asunto, texto) { return 'mailto:?subject=' + encodeURIComponent(asunto) + '&body=' + encodeURIComponent(texto); }
function nombreStand() {
  return 'Stand ' + datosStand.numero + (datosStand.nombre ? ' — ' + datosStand.nombre : '');
}
function lugaresRestantes() {
  return Math.max(0, datosStand.cupo - datosStand.vendedores.length);
}
function personasDelStand() {
  return datosStand.vendedores.map(function(v){
    return { nombre: v.nombre, apellido: v.apellido, cedula: v.cedula, codigo_qr: v.codigo_qr, empresa: v.empresa || datosStand.empresa || '', vende: v.vende || datosStand.vende || '' };
  });
}
function tituloRegistrados() {
  return (datosStand.tipo === 'patrocinante')
    ? 'Patrocinantes con QR asignado'
    : 'Comerciantes con QR asignado';
}
function precargarNegocio() {
  const v0 = datosStand.vendedores.length ? datosStand.vendedores[0] : null;
  const emp = datosStand.empresa || (v0 ? v0.empresa : '') || datosStand.nombre || '';
  const ven = datosStand.vende || (v0 ? v0.vende : '') || '';
  if (!document.getElementById('inEmpresa').value) {
    document.getElementById('inEmpresa').value = emp;
  }
  if (!document.getElementById('inVende').value) {
    document.getElementById('inVende').value = ven;
  }
}

async function cargar() {
  if (!codigoLink) {
    document.getElementById('cargando').className = 'tarjeta aviso';
    document.getElementById('cargando').innerHTML = 'Enlace inválido. Falta el código de stand.';
    return;
  }
  try {
    datosStand = await llamar('f_link_stand_ver', { p_codigo_link: codigoLink });
    if (!datosStand) {
      document.getElementById('cargando').className = 'tarjeta aviso';
      document.getElementById('cargando').innerHTML = 'Enlace inválido o stand no encontrado.';
      return;
    }
    if (datosStand.anulado) {
      document.getElementById('cargando').style.display = 'none';
      const av = document.getElementById('avisoCerrado');
      av.innerHTML = '<h2>Link modificado</h2>Este link fue modificado por el coordinador y quedó anulado. Comuníquese con el coordinador para que le envíe el nuevo link generado con los cambios.';
      av.style.display = 'block';
      return;
    }
    document.getElementById('cargando').style.display = 'none';
    renderStand();
  } catch (e) {
    document.getElementById('cargando').className = 'tarjeta aviso';
    document.getElementById('cargando').innerHTML = 'No se pudo conectar con la base de datos.<br><small>' + escaparHtml(e.message) + '</small>';
  }
}

function renderStand() {
  document.getElementById('cardAdios').style.display = 'none';
  document.getElementById('inCedulaRec').value = '';
  document.getElementById('msgRec').textContent = '';

  document.getElementById('stTitulo').textContent = nombreStand();
  document.getElementById('stTipo').textContent = datosStand.tipo;
  document.getElementById('stCupo').textContent = datosStand.cupo;
  document.getElementById('stReg').textContent = datosStand.vendedores.length;
  document.getElementById('stQuedan').textContent = lugaresRestantes();
  document.getElementById('infoStand').style.display = 'block';

  // ============ EVENTO CERRADO ============
  if (!datosStand.edicion_abierta) {
    document.getElementById('formLote').style.display = 'none';
    document.getElementById('recuperarQR').style.display = 'none';
    document.getElementById('cardFinalizar').style.display = 'none';
    document.getElementById('barraFija').style.display = 'none';

    if (datosStand.vendedores.length > 0) {
      // Mostrar directamente los brazaletes de todos los vendedores
      document.getElementById('avisoCerrado').textContent = 'Las inscripciones para este stand están cerradas. Aquí están tus QR para entrar al evento.';
      document.getElementById('avisoCerrado').style.display = 'block';
      loteActual = { personas: personasDelStand() };
      mostrarResultados(true);
    } else {
      // No hay vendedores registrados
      document.getElementById('avisoCerrado').textContent = 'Las inscripciones para este stand están cerradas y aún no hay vendedores registrados.';
      document.getElementById('avisoCerrado').style.display = 'block';
      document.getElementById('pantallaQR').style.display = 'none';
    }
    return;
  }

  // ============ EVENTO ABIERTO (edición) ============
  document.getElementById('avisoCerrado').style.display = 'none';
  document.getElementById('recuperarQR').style.display = 'block';
  document.getElementById('cardFinalizar').style.display = 'block';
  document.getElementById('pantallaQR').style.display = 'none';

  if (lugaresRestantes() === 0) {
    document.getElementById('avisoCerrado').textContent = 'El cupo de este stand está lleno.';
    document.getElementById('avisoCerrado').style.display = 'block';
    document.getElementById('formLote').style.display = 'none';
  } else {
    document.getElementById('avisoCerrado').style.display = 'none';
    document.getElementById('formLote').style.display = 'block';
    precargarNegocio();
    renderTabla();
  }

  document.getElementById('barraFija').style.display = (datosStand.vendedores.length > 0) ? 'block' : 'none';
}

async function quitarVendedor(v) {
  const msg = document.getElementById('msgRec');
  msg.style.color = 'var(--suave)';
  msg.textContent = '';
  const seguro = confirm('Quitar a ' + v.nombre + ' ' + v.apellido + ' del stand? Su QR quedara anulado de inmediato y su lugar quedara libre para otra persona. Esta accion no se puede deshacer.');
  if (!seguro) return;
  try {
    const r = await llamar('f_link_stand_quitar_vendedor', { p_codigo_link: codigoLink, p_cedula: v.cedula });
    if (r === 'ok') {
      msg.style.color = 'var(--acento)';
      msg.textContent = 'Se quitó a ' + v.nombre + ' ' + v.apellido + ' y su QR quedó anulado. El lugar quedó libre.';
      loteActual = null;
      try { datosStand = await llamar('f_link_stand_ver', { p_codigo_link: codigoLink }); } catch (e) {}
      renderStand();
      return;
    }
    if (r === 'ERR_EDICION_CERRADA') msg.textContent = 'La edición está cerrada: ya no se puede quitar personas.';
    else if (r === 'ERR_NO_EXISTE') msg.textContent = 'Esa persona ya no aparece registrada. Recarga la página.';
    else msg.textContent = 'No se pudo quitar. Intenta de nuevo.';
  } catch (e) {
    msg.textContent = 'Error de conexión: ' + e.message;
  }
}

function leerInputs() {
  return {
    nombre: document.getElementById('inNombre').value.trim(),
    apellido: document.getElementById('inApellido').value.trim(),
    cedula: document.getElementById('inCedula').value.trim()
  };
}
function limpiarInputs() {
  document.getElementById('inNombre').value = '';
  document.getElementById('inApellido').value = '';
  document.getElementById('inCedula').value = '';
}
function salirDeEdicion() {
  editIndex = -1;
  document.getElementById('btnAgregar').textContent = 'Agregar a la lista';
  document.getElementById('btnCancelarEdit').style.display = 'none';
}
function iniciarEdicion(i) {
  editIndex = i;
  const p = listaPersonas[i];
  document.getElementById('inNombre').value = p.nombre;
  document.getElementById('inApellido').value = p.apellido;
  document.getElementById('inCedula').value = p.cedula;
  document.getElementById('btnAgregar').textContent = 'Guardar modificacion';
  document.getElementById('btnCancelarEdit').style.display = 'block';
  document.getElementById('msgPersona').textContent = '';
  document.getElementById('formLote').scrollIntoView({ behavior: 'smooth' });
}
function quitarPersona(i) {
  listaPersonas.splice(i, 1);
  if (editIndex === i) { salirDeEdicion(); limpiarInputs(); }
  else if (editIndex > i) { editIndex--; }
  renderTabla();
}

function renderTabla() {
  const tbody = document.getElementById('cuerpoTabla');
  tbody.innerHTML = '';
  if (!listaPersonas.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="suave">Todavía no hay personas en la lista.</td></tr>';
  } else {
    listaPersonas.forEach(function(p, i){
      const tr = document.createElement('tr');
      tr.innerHTML = '<td></td><td></td><td></td><td class="celd-acciones"></td>';
      tr.children[0].textContent = p.nombre;
      tr.children[1].textContent = p.apellido;
      tr.children[2].textContent = p.cedula;
      const td = tr.children[3];
      const bM = document.createElement('button');
      bM.className = 'btn btn-gris btn-mini';
      bM.textContent = 'Modificar';
      bM.onclick = function(){ iniciarEdicion(i); };
      const bQ = document.createElement('button');
      bQ.className = 'btn btn-rojo btn-mini';
      bQ.textContent = 'Quitar';
      bQ.onclick = function(){ quitarPersona(i); };
      td.appendChild(bM);
      td.appendChild(bQ);
      tbody.appendChild(tr);
    });
  }
  actualizarCupo();
}

function actualizarCupo() {
  const quedan = lugaresRestantes();
  const n = listaPersonas.length;
  document.getElementById('msgCupo').textContent = 'Cupo total: ' + datosStand.cupo + ' · Registrados: ' + datosStand.vendedores.length + ' · En lista: ' + n + ' · Disponibles: ' + quedan + '.';
  document.getElementById('btnAgregar').disabled = (editIndex === -1 && n >= quedan);
  document.getElementById('btnRegistrar').disabled = (n === 0);
}

document.getElementById('btnAgregar').onclick = function(){
  const msg = document.getElementById('msgPersona');
  msg.textContent = '';
  const p = leerInputs();
  if (!p.nombre || !p.apellido || !p.cedula) { msg.textContent = 'Completa nombre, apellido y cédula.'; return; }
  if (!textoPersonaValido(p.nombre) || !textoPersonaValido(p.apellido)) { msg.textContent = 'Nombre y apellido no válidos: máximo 60 caracteres y sin los caracteres < o >.'; return; }
  if (!cedulaValida(p.cedula)) { msg.textContent = 'Cédula no válida: solo números, puntos o espacios (4 a 20 caracteres).'; return; }
  if (editIndex === -1) {
    if (listaPersonas.length >= lugaresRestantes()) { msg.textContent = 'No hay lugares restantes en el stand para agregar más personas.'; return; }
    if (listaPersonas.some(function(x){ return x.cedula === p.cedula; })) { msg.textContent = 'Esa cédula ya está en la lista de abajo.'; return; }
    listaPersonas.push(p);
  } else {
    if (listaPersonas.some(function(x, i){ return i !== editIndex && x.cedula === p.cedula; })) { msg.textContent = 'Esa cédula ya está en la lista de abajo.'; return; }
    listaPersonas[editIndex] = p;
    salirDeEdicion();
  }
  limpiarInputs();
  renderTabla();
};

document.getElementById('btnCancelarEdit').onclick = function(){
  salirDeEdicion();
  limpiarInputs();
  document.getElementById('msgPersona').textContent = '';
};

document.getElementById('btnRegistrar').onclick = async function(){
  const empresa = document.getElementById('inEmpresa').value.trim();
  const vende = document.getElementById('inVende').value.trim();
  const errDiv = document.getElementById('msgError');
  errDiv.textContent = '';

  if (!empresa || !vende) {
    errDiv.textContent = 'Escribe la empresa y qué vende: aplican a toda la lista.'; return;
  }
  if (!textoPersonaValido(empresa, 80) || !textoPersonaValido(vende, 120)) {
    errDiv.textContent = 'Empresa y rubro no válidos: sin los caracteres < o >.'; return;
  }
  if (!listaPersonas.length) {
    errDiv.textContent = 'Agrega al menos una persona a la lista.'; return;
  }
  const personas = listaPersonas.slice();

  const quedan = lugaresRestantes();
  if (personas.length < quedan) {
    const seguir = confirm('Vas a registrar ' + personas.length + ' de ' + quedan + ' lugares disponibles. Solo se generaran ' + personas.length + ' QR por ahora. Podras agregar los faltantes despues con este mismo link, hasta que el administrador cierre la edicion. Continuar?');
    if (!seguir) return;
  }

  try {
    const res = await llamar('f_link_stand_registrar_lote', {
      p_codigo_link: codigoLink,
      p_empresa: empresa,
      p_vende: vende,
      p_personas: personas
    });
    if (!res.ok) {
      if (res.error === 'ERR_DATOS') errDiv.textContent = 'Faltan datos o el enlace es inválido.';
      else if (res.error === 'ERR_EDICION_CERRADA') errDiv.textContent = 'Las inscripciones acaban de cerrarse.';
      else if (res.error === 'ERR_CUPO_LLENO') errDiv.textContent = 'El cupo no alcanza para todas las personas de la lista.';
      else if (res.error === 'ERR_CEDULA_REPETIDA') errDiv.textContent = 'La cédula ' + res.cedula + ' ya está registrada en este stand.';
      else errDiv.textContent = 'Error inesperado al registrar.';
      return;
    }
    listaPersonas = [];
    salirDeEdicion();
    limpiarInputs();
    try { datosStand = await llamar('f_link_stand_ver', { p_codigo_link: codigoLink }); } catch (e) {}
    loteActual = { personas: personasDelStand() };
    mostrarResultados(false);
  } catch (e) { errDiv.textContent = 'Error de conexión: ' + e.message; }
};

document.getElementById('btnRecuperar').onclick = async function(){
  const cedula = document.getElementById('inCedulaRec').value.trim();
  const errDiv = document.getElementById('msgRec');
  errDiv.textContent = '';
  if (!cedula) { errDiv.textContent = 'Escribe tu cédula.'; return; }
  try {
    const res = await llamar('f_link_stand_mi_qr', { p_codigo_link: codigoLink, p_cedula: cedula });
    if (!res) { errDiv.textContent = 'No encontramos esa cédula en este stand.'; return; }
    loteActual = { personas: [res] };
    mostrarResultados(false);
  } catch (e) { errDiv.textContent = 'Error: ' + e.message; }
};

function mostrarResultados(soloLectura) {
  if (soloLectura) {
    // Modo cerrado: mantener info + aviso visibles, ocultar el resto
    ['formLote','recuperarQR','cardFinalizar','barraFija'].forEach(id => {
      document.getElementById(id).style.display = 'none';
    });
  } else {
    // Modo normal: ocultar todo excepto pantallaQR
    ['infoStand','avisoCerrado','formLote','recuperarQR','barraFija','cardFinalizar'].forEach(id => {
      document.getElementById(id).style.display = 'none';
    });
  }

  const cont = document.getElementById('listaQRs');
  cont.innerHTML = '';
  loteActual.personas.forEach(function(per){
    const card = document.createElement('div');
    card.className = 'tarjeta brazalete';
    card.innerHTML =
      '<div class="braz-ceja">NitroSystem</div>' +
      '<div class="braz-titulo"></div>' +
      '<div class="braz-stand"></div>' +
      '<div class="braz-pill">Válido Día 1 y Día 2</div>' +
      '<div class="qr-box"></div>' +
      '<div class="braz-datos">' +
      '<div class="braz-dato"><span class="braz-label">Cédula</span><span class="braz-valor"></span></div>' +
      '<div class="braz-dato"><span class="braz-label">Empresa</span><span class="braz-valor"></span></div>' +
      '<div class="braz-dato"><span class="braz-label">Qué vende</span><span class="braz-valor"></span></div>' +
      '</div>' +
      '<div class="botones-qr">' +
      '<button class="btn btn-gris">📋 Copiar QR</button>' +
      '<button class="btn">💬 WhatsApp</button>' +
      '<button class="btn btn-azul">✉️ Correo</button>' +
      '</div>';
    card.querySelector('.braz-titulo').textContent = per.nombre + ' ' + per.apellido;
    card.querySelector('.braz-stand').textContent = nombreStand();
    const vals = card.querySelectorAll('.braz-valor');
    vals[0].textContent = per.cedula;
    vals[1].textContent = per.empresa || '—';
    vals[2].textContent = per.vende || '—';

    const urlP = urlPuerta('v', per.codigo_qr);
    const qrCont = card.querySelector('.qr-box');
    ponerQR(qrCont, urlP, per.codigo_qr);

    const textoRespaldo = 'QR de ' + per.nombre + ' ' + per.apellido + ' para NitroSystem\n' + nombreStand() + '\nCodigo: ' + per.codigo_qr + '\nLink: ' + urlP;
    const botones = card.querySelectorAll('.botones-qr .btn');
    botones[0].onclick = async function(){
      const img = qrCont.querySelector('img');
      if (img) {
        try {
          const data = await fetch(img.src);
          const blob = await data.blob();
          await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
          alert('✅ Imagen del QR de ' + per.nombre + ' copiada.');
          return;
        } catch (e) {}
      }
      await navigator.clipboard.writeText(textoRespaldo);
      alert('⚠️ No se pudo copiar la imagen. Copiamos el texto con código y link como respaldo.');
    };
    botones[1].onclick = function(){
      window.open(urlWA(textoRespaldo), '_blank');
    };
    botones[2].onclick = function(){
      window.location.href = urlMail('Mi QR para NitroSystem', textoRespaldo);
      navigator.clipboard.writeText(textoRespaldo).catch(()=>{});
      setTimeout(() => alert('Si no abrió tu app de correo, el texto ya está copiado en tu portapapeles como respaldo.'), 500);
    };
    cont.appendChild(card);
  });

  // Botón "Cerrar" solo en modo normal (edición abierta)
  document.getElementById('btnVolver').style.display = soloLectura ? 'none' : 'block';
  document.getElementById('pantallaQR').style.display = 'block';
}

document.getElementById('btnTermine').onclick = function(){
  if (!datosStand || !datosStand.vendedores.length) {
    alert('Todavía no hay personas registradas en este stand.');
    return;
  }
  loteActual = { personas: personasDelStand() };
  mostrarResultados(false);
};

document.getElementById('btnVolver').onclick = function(){
  renderStand();
};

document.getElementById('btnFinalizar').onclick = function(){
  listaPersonas = [];
  loteActual = null;
  editIndex = -1;
  salirDeEdicion();
  limpiarInputs();
  document.getElementById('inEmpresa').value = '';
  document.getElementById('inVende').value = '';
  ['msgRec','msgPersona','msgError','msgReg'].forEach(function(id){
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
  renderStand();
  document.getElementById('cardFinalizar').style.display = 'none';
  document.getElementById('cardAdios').style.display = 'block';
  window.scrollTo(0, 0);
  try { window.close(); } catch (e) {}
};

cargar();

