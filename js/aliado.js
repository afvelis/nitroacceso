const params = new URLSearchParams(location.search);
const CODIGO = params.get('a') || '';
let DATOS = null;

// ============================================================
// MODALES
// ============================================================
function modalAlert(mensaje, titulo){
  titulo = titulo || 'Aviso';
  return new Promise(resolve => {
    const fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    fondo.innerHTML =
      '<div class="modal-caja">' +
        '<div class="modal-titulo">' + escaparHtml(titulo) + '</div>' +
        '<div class="modal-mensaje">' + escaparHtml(mensaje) + '</div>' +
        '<div class="modal-acciones"><button class="btn" id="mOk">Aceptar</button></div>' +
      '</div>';
    document.body.appendChild(fondo);
    const cerrar = () => { fondo.remove(); resolve(true); };
    fondo.querySelector('#mOk').addEventListener('click', cerrar);
    fondo.addEventListener('click', e => { if(e.target === fondo) cerrar(); });
  });
}

function modalConfirm(mensaje, titulo, opciones){
  opciones = opciones || {};
  const requiereCheck = !!opciones.requiereCheck;
  const checkTexto = opciones.checkTexto || 'Confirmo que revisé la información.';
  const btnTexto = opciones.btnTexto || 'Aceptar';
  const colorBoton = opciones.colorBoton || 'btn-rojo';
  return new Promise(resolve => {
    const fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    let extra = '';
    if(requiereCheck){
      extra = '<label class="check-linea">' +
                '<input type="checkbox" id="mCheck">' +
                '<span>' + escaparHtml(checkTexto) + '</span>' +
              '</label>';
    }
    fondo.innerHTML =
      '<div class="modal-caja">' +
        '<div class="modal-titulo">' + escaparHtml(titulo) + '</div>' +
        '<div class="modal-mensaje">' + escaparHtml(mensaje) + '</div>' +
        extra +
        '<div class="modal-acciones">' +
          '<button class="btn btn-gris" id="mCancelar">Cancelar</button>' +
          '<button class="btn ' + colorBoton + '" id="mAceptar" ' + (requiereCheck ? 'disabled' : '') + '>' + btnTexto + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(fondo);
    const cerrar = v => { fondo.remove(); resolve(v); };
    if(requiereCheck){
      fondo.querySelector('#mCheck').addEventListener('change', e => {
        fondo.querySelector('#mAceptar').disabled = !e.target.checked;
      });
    }
    fondo.querySelector('#mCancelar').addEventListener('click', () => cerrar(false));
    fondo.querySelector('#mAceptar').addEventListener('click', () => cerrar(true));
    fondo.addEventListener('click', e => { if(e.target === fondo) cerrar(false); });
  });
}

// ============================================================
// HELPERS
// ============================================================
function esc(t){
  return String(t == null ? '' : t)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function diasTexto(d1, d2){
  if(d1 && d2) return 'Día 1 y Día 2';
  if(d1) return 'Día 1';
  if(d2) return 'Día 2';
  return '-';
}

function fmtFecha(f){
  if(!f) return '-';
  try{
    const d = new Date(f + 'T00:00:00');
    return d.toLocaleDateString('es-VE', { day:'2-digit', month:'long', year:'numeric' });
  }catch(e){ return f; }
}

function hoyISO(){
  return new Date().toISOString().substring(0,10);
}

function sumarDias(fechaISO, dias){
  const d = new Date(fechaISO + 'T00:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().substring(0,10);
}

async function recargar(){
  const d = await llamar('f_aliado_ver', { p_codigo_link: CODIGO });
  if(!d) return;
  DATOS = d;
  pintarTodo();
}

// ============================================================
// PINTADO
// ============================================================
function pintarTodo(){
  const a = DATOS.asignacion;
  const al = DATOS.aliado;

  document.getElementById('orgNombre').textContent = al.nombre_organizacion;
  document.getElementById('responsable').textContent = al.responsable;
  document.getElementById('codigoLink').textContent = a.codigo_link;
  document.getElementById('cuponesAsignados').textContent = a.cupones_unico;
  document.getElementById('cuponesReservados').textContent = a.cupones_reservados;
  const dispEl = document.getElementById('cuponesDisponibles');
  dispEl.textContent = a.cupones_disponibles;
  dispEl.classList.toggle('chico', a.cupones_disponibles <= 0);

  pintarAvisos();
  pintarConcursos();
  pintarEstadisticasDia();
}

function pintarAvisos(){
  const cont = document.getElementById('panelAvisos');
  const zona = document.getElementById('zonaAvisos');
  const concursos = DATOS.concursos || [];
  const hoy = hoyISO();
  const en3dias = sumarDias(hoy, 3);

  // 1) Premios sin enviar
  const sinEnviar = concursos.filter(c => c.estado === 'cerrado' && c.ganador && !c.ganador.enviado_at);

  // 2) Concursos abiertos con fecha entre hoy y hoy+3
  const proximos = concursos.filter(c => {
    if(c.estado !== 'abierto') return false;
    if(!c.fecha_concurso) return false;
    return c.fecha_concurso >= hoy && c.fecha_concurso <= en3dias;
  });

  // 3) Concursos abiertos con fecha pasada
  const vencidos = concursos.filter(c => {
    if(c.estado !== 'abierto') return false;
    if(!c.fecha_concurso) return false;
    return c.fecha_concurso < hoy;
  });

  if(sinEnviar.length === 0 && proximos.length === 0 && vencidos.length === 0){
    cont.style.display = 'none';
    zona.innerHTML = '';
    return;
  }

  let html = '';

  if(sinEnviar.length > 0){
    const nombres = sinEnviar.map(c => c.ganador.nombre + ' ' + c.ganador.apellido).join(', ');
    html +=
      '<div class="alerta-sub alerta-sub-azul">' +
        '<span class="alerta-sub-titulo">📨 Premios pendientes de enviar (' + sinEnviar.length + ')</span>' +
        'Aún no has enviado el link del premio a: ' + esc(nombres) + '. Recuerda que el ganador necesita el link para poder entrar al evento.' +
        '<div class="acciones">' +
          '<button class="btn btn-azul btn-mini" id="btnAbrirEnvios">📨 Abrir cola de envíos</button>' +
        '</div>' +
      '</div>';
  }

  if(proximos.length > 0){
    let lista = '';
    proximos.forEach(c => {
      lista += '<li><strong>' + esc(c.nombre) + '</strong> — se ejecuta el ' + fmtFecha(c.fecha_concurso) + ' y aún no tiene ganador.</li>';
    });
    html +=
      '<div class="alerta-sub alerta-sub-amarilla">' +
        '<span class="alerta-sub-titulo">🟡 Concurso(s) próximo(s) a ejecutarse (' + proximos.length + ')</span>' +
        'Estos concursos se ejecutan en los próximos 3 días y todavía no tienen ganador asignado:' +
        '<ul>' + lista + '</ul>' +
      '</div>';
  }

  if(vencidos.length > 0){
    let lista = '';
    vencidos.forEach(c => {
      lista += '<li><strong>' + esc(c.nombre) + '</strong> — ya pasó su fecha (' + fmtFecha(c.fecha_concurso) + ') y no tiene ganador asignado. Asígnale uno o edítalo/elimínalo.</li>';
    });
    html +=
      '<div class="alerta-sub alerta-sub-roja">' +
        '<span class="alerta-sub-titulo">🔴 Concurso(s) vencido(s) sin ganador (' + vencidos.length + ')</span>' +
        '<ul>' + lista + '</ul>' +
      '</div>';
  }

  zona.innerHTML = html;
  cont.style.display = 'block';

  const bEnvio = document.getElementById('btnAbrirEnvios');
  if(bEnvio) bEnvio.addEventListener('click', () => abrirModalColaEnvios());
}

function pintarConcursos(){
  const zona = document.getElementById('zonaConcursos');
  const concursos = DATOS.concursos || [];

  if(concursos.length === 0){
    zona.innerHTML = '<p class="vacio-notice">No hay concursos que mostrar en este momento.</p>';
    return;
  }

  let html = '';
  concursos.forEach(c => {
    const abierto = c.estado === 'abierto';
    const pillEstado = abierto
      ? '<span class="pill pill-verde">Abierto · sin ganador</span>'
      : '<span class="pill pill-morado">Cerrado · ganador asignado</span>';
    const fechaCreaTxt = c.creada_at ? fmtFecha(c.creada_at.substring(0, 10)) : '-';
    const fechaEjecTxt = c.fecha_concurso ? fmtFecha(c.fecha_concurso) : '—';
    const descTxt = c.descripcion ? '<div class="desc-suave13">' + esc(c.descripcion) + '</div>' : '';

    let botones = '';
    if(abierto){
      botones =
        '<div class="acciones">' +
          '<button class="btn btn-morado btn-mini" data-accion="asignar" data-id="' + c.id + '">🏆 Asignar ganador</button>' +
          '<button class="btn btn-gris btn-mini" data-accion="editar" data-id="' + c.id + '">✏️ Editar</button>' +
          '<button class="btn btn-rojo btn-mini" data-accion="eliminar" data-id="' + c.id + '">🗑️ Eliminar</button>' +
        '</div>';
    }else if(c.ganador){
      const yaEnviado = !!c.ganador.enviado_at;
      botones =
        '<div class="acciones">' +
          '<button class="btn btn-gris btn-mini" data-accion="detalles" data-id="' + c.id + '">🔍 Ver detalles del ganador</button>' +
          '<button class="btn ' + (yaEnviado ? 'btn-gris' : 'btn-azul') + ' btn-mini" data-accion="enviar" data-id="' + c.id + '">' +
            (yaEnviado ? '🔁 Reenviar premio' : '📨 Enviar premio al ganador') +
          '</button>' +
        '</div>';
    }

    html +=
      '<div class="concurso-item">' +
        '<div class="cab">' +
          '<div>' +
            '<div class="nom">' + esc(c.nombre) + '</div>' +
            '<div class="meta">' + c.cupones_reservados + (abierto ? ' entrada(s) reservada(s)' : ' entrada(s) asignada(s)') + '</div>' +
            '<div class="meta">📅 Creado: ' + fechaCreaTxt + ' · 🎯 Ejecución: ' + fechaEjecTxt + '</div>' +
            descTxt +
          '</div>' +
          '<div>' + pillEstado + '</div>' +
        '</div>' +
        botones +
      '</div>';
  });
  zona.innerHTML = html;

  zona.querySelectorAll('button[data-accion]').forEach(b => {
    b.addEventListener('click', () => {
      const acc = b.getAttribute('data-accion');
      const id = b.getAttribute('data-id');
      const c = DATOS.concursos.find(x => x.id === id);
      if(!c) return;
      if(acc === 'asignar') abrirModalGanador(c);
      else if(acc === 'editar') abrirModalConcurso(c);
      else if(acc === 'eliminar') confirmarEliminar(c);
      else if(acc === 'enviar') abrirModalColaEnvios();
      else if(acc === 'detalles') abrirModalDetallesGanador(c);
    });
  });
}

function pintarEstadisticasDia(){
  const zona = document.getElementById('zonaEstadisticasDia');
  const dc = DATOS.dias_cerrados || {};
  const e = DATOS.estadisticas_por_dia || {};
  const bloques = [];

  if(dc.dia1 && e.dia1 && e.dia1.total > 0){
    bloques.push({ dia:'Día 1', total: e.dia1.total, asistieron: e.dia1.asistieron });
  }
  if(dc.dia2 && e.dia2 && e.dia2.total > 0){
    bloques.push({ dia:'Día 2', total: e.dia2.total, asistieron: e.dia2.asistieron });
  }

  if(bloques.length === 0){
    zona.innerHTML = '';
    return;
  }

  let html = '<div class="mini-stats-dia">';
  bloques.forEach(b => {
    html +=
      '<div class="fila-stats">' +
        '<span class="dia-lbl">📊 ' + b.dia + '</span>' +
        '<span class="dia-num">' + b.asistieron + ' de ' + b.total + ' premio(s) asistieron</span>' +
      '</div>';
    if(b.asistieron === 0){
      html += '<div class="triste">😢 Tus ganadores no se presentaron al evento el ' + b.dia + '.</div>';
    }
  });
  html += '</div>';
  zona.innerHTML = html;
}

// ============================================================
// MODAL CREAR / EDITAR CONCURSO
// ============================================================
function abrirModalConcurso(existente){
  const editando = !!existente;
  const c = existente || { nombre: '', descripcion: '', fecha_concurso: '', cupones_reservados: 1 };
  const disp = DATOS.asignacion.cupones_disponibles + (editando ? c.cupones_reservados : 0);

  const fondo = document.createElement('div');
  fondo.className = 'modal-fondo';
  fondo.innerHTML =
    '<div class="modal-caja">' +
      '<div class="modal-titulo">' + (editando ? '✏️ Editar concurso' : '🏆 Crear nuevo concurso') + '</div>' +
      '<div class="modal-sub">' + (editando ? 'Puedes cambiar cualquier dato porque aún no tiene ganador asignado.' : 'Ponle un nombre a tu concurso y elige cuántas entradas reservarás para él.') + '</div>' +
      '<div class="cuponera">' +
        '<span class="grande">' + disp + '</span>' +
        '<span class="lbl">' + (editando ? 'entradas disponibles para este concurso' : 'entradas disponibles para reservar') + '</span>' +
      '</div>' +
      '<label>Nombre del concurso *' +
        '<input id="inNomConc" maxlength="80" value="' + esc(c.nombre) + '" placeholder="Ej.: Cosplay Nitro 2026">' +
      '</label>' +
      '<label>Descripción (opcional)' +
        '<textarea id="inDescConc" rows="2" maxlength="300" placeholder="Ej.: Concurso de disfraces temáticos.">' + esc(c.descripcion || '') + '</textarea>' +
      '</label>' +
      '<label>Fecha de ejecución del concurso *' +
        '<input id="inFechaConc" type="date" value="' + esc(c.fecha_concurso || '') + '">' +
        '<div class="hint-fecha12">Indica cuándo se realizará el concurso y se elegirá al ganador. Podrás editarla mientras el evento siga vigente. Si el calendario no funciona, escribe la fecha en formato AAAA-MM-DD (debe ser hoy o posterior).</div>' +
      '</label>' +
      '<label>Entradas reservadas para este concurso *' +
        '<input id="inCupConc" type="number" min="1" value="' + c.cupones_reservados + '" class="campo-corto">' +
      '</label>' +
      '<div class="modal-acciones">' +
        '<button class="btn btn-gris" id="mCancelar">Cancelar</button>' +
        '<button class="btn btn-morado" id="mGuardar">' + (editando ? 'Guardar cambios' : 'Crear concurso') + '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(fondo);

  const cerrar = () => fondo.remove();
  fondo.querySelector('#mCancelar').addEventListener('click', cerrar);
  fondo.addEventListener('click', e => { if(e.target === fondo) cerrar(); });

  fondo.querySelector('#mGuardar').addEventListener('click', async () => {
    const nombre = fondo.querySelector('#inNomConc').value.trim();
    const descripcion = fondo.querySelector('#inDescConc').value.trim();
    const fecha = fondo.querySelector('#inFechaConc').value || null;
    const cupones = parseInt(fondo.querySelector('#inCupConc').value, 10);

    if(!nombre){ await modalAlert('Escribe el nombre del concurso.', 'Falta el nombre'); return; }
    if(!textoPersonaValido(nombre, 80)){ await modalAlert('El nombre del concurso no es válido: máximo 80 caracteres y sin los caracteres < o >.', 'Nombre inválido'); return; }
    if(descripcion && !textoPersonaValido(descripcion, 300)){ await modalAlert('La descripción no es válida: máximo 300 caracteres y sin los caracteres < o >.', 'Descripción inválida'); return; }
    if(!fecha){ await modalAlert('Indica la fecha de ejecución del concurso.', 'Falta la fecha'); return; }
    const hoy = hoyISO();
    if(fecha < hoy){ await modalAlert('La fecha de ejecución debe ser hoy o posterior.', 'Fecha inválida'); return; }
    if(!cupones || cupones < 1){ await modalAlert('Indica cuántas entradas reservar (mínimo 1).', 'Entradas inválidas'); return; }
    if(cupones > disp){ await modalAlert('No puedes reservar ' + cupones + ' entradas: solo tienes ' + disp + ' disponibles.', 'Sin entradas'); return; }

    const btn = fondo.querySelector('#mGuardar');
    btn.disabled = true; btn.textContent = 'Guardando...';
    try{
      let r;
      if(editando){
        r = await llamar('f_aliado_editar_concurso', {
          p_codigo_link: CODIGO, p_concurso_id: c.id, p_nombre: nombre,
          p_descripcion: descripcion || null, p_fecha_concurso: fecha,
          p_cupones_reservados: cupones
        });
      }else{
        r = await llamar('f_aliado_crear_concurso', {
          p_codigo_link: CODIGO, p_nombre: nombre,
          p_descripcion: descripcion || null, p_fecha_concurso: fecha,
          p_cupones_reservados: cupones
        });
      }
      if(!r || r.error){
        const msgs = {
          'ERR_FECHA_REQUERIDA': 'La fecha de ejecución es obligatoria.',
          'ERR_FECHA_PASADA': 'La fecha de ejecución debe ser hoy o posterior.',
          'ERR_NOMBRE': 'El nombre del concurso es obligatorio.',
          'ERR_CUPONES': 'Indica cuántas entradas reservar (mínimo 1).'
        };
        const errTxt = msgs[r && r.error] || ('No se pudo guardar: ' + (r ? r.error : 'desconocido'));
        const disp2 = r && r.disponible !== undefined ? ' Disponibles: ' + r.disponible + '.' : '';
        await modalAlert(errTxt + disp2, 'Error');
        btn.disabled = false; btn.textContent = editando ? 'Guardar cambios' : 'Crear concurso';
        return;
      }
      cerrar();
      await recargar();
      await modalAlert(
        editando ? '✅ Concurso actualizado.' : '✅ Concurso creado.\n\nPuedes crear otro o asignar un ganador cuando estés listo.',
        editando ? 'Cambios guardados' : 'Concurso creado'
      );
    }catch(e){
      await modalAlert('Error: ' + (e.message || e), 'Error');
      btn.disabled = false; btn.textContent = editando ? 'Guardar cambios' : 'Crear concurso';
    }
  });
}

// ============================================================
// MODAL ASIGNAR GANADOR
// ============================================================
async function abrirModalGanador(concurso){
  const okAviso = await modalConfirm(
    'Vas a asignar el ganador del concurso:\n\n' +
    '• ' + concurso.nombre + '\n' +
    '• ' + concurso.cupones_reservados + ' entrada(s) reservada(s)\n\n' +
    'Una vez asignado, ni tú ni el administrador podrán modificar los datos del ganador ni el concurso. Si necesitas corregir, tendrás que pedirle al administrador que anule este concurso y crear otro.\n\n' +
    '¿Deseas continuar?',
    '🏆 Asignar ganador',
    { btnTexto: 'Continuar', colorBoton: 'btn-morado' }
  );
  if(!okAviso) return;

  const fondo = document.createElement('div');
  fondo.className = 'modal-fondo';
  fondo.innerHTML =
    '<div class="modal-caja">' +
      '<div class="modal-titulo">🏆 Datos del ganador</div>' +
      '<div class="modal-sub">Concurso: <strong>' + esc(concurso.nombre) + '</strong> · Reservadas: ' + concurso.cupones_reservados + ' entrada(s).</div>' +
      '<div class="grid2">' +
        '<label>Nombre *<input id="gNombre" maxlength="60" placeholder="Ej.: María"></label>' +
        '<label>Apellido *<input id="gApellido" maxlength="60" placeholder="Ej.: Pérez"></label>' +
      '</div>' +
      '<label>Cédula *<input id="gCedula" maxlength="20" inputmode="numeric" placeholder="Ej.: 12345678"></label>' +
      '<label>Correo electrónico *<input id="gCorreo" type="email" maxlength="120" placeholder="Ej.: maria@correo.com"></label>' +
      '<label>Teléfono / WhatsApp *<input id="gTelefono" maxlength="30" placeholder="Ej.: +58 414 1234567"></label>' +
      '<label>Entradas que consume este premio (máx. ' + concurso.cupones_reservados + ')*' +
        '<input id="gCupones" type="number" min="1" max="' + concurso.cupones_reservados + '" value="' + concurso.cupones_reservados + '" class="campo-corto">' +
      '</label>' +
      '<div class="mb-12">' +
        '<div class="lbl-dias">Días autorizados *</div>' +
        '<label class="fila-check"><input type="checkbox" id="gD1" class="chk-auto"> Día 1</label>' +
        '<label class="fila-check"><input type="checkbox" id="gD2" class="chk-auto"> Día 2</label>' +
      '</div>' +
      '<div class="modal-acciones">' +
        '<button class="btn btn-gris" id="mCancelar">Cancelar</button>' +
        '<button class="btn btn-morado" id="mAsignar">Asignar ganador</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(fondo);

  fondo.querySelector('#gD1').checked = true;

  const cerrar = () => fondo.remove();
  fondo.querySelector('#mCancelar').addEventListener('click', cerrar);
  fondo.addEventListener('click', e => { if(e.target === fondo) cerrar(); });

  fondo.querySelector('#mAsignar').addEventListener('click', async () => {
    const nombre = fondo.querySelector('#gNombre').value.trim();
    const apellido = fondo.querySelector('#gApellido').value.trim();
    const cedula = fondo.querySelector('#gCedula').value.trim();
    const correo = fondo.querySelector('#gCorreo').value.trim();
    const telefono = fondo.querySelector('#gTelefono').value.trim();
    const cupones = parseInt(fondo.querySelector('#gCupones').value, 10);
    const d1 = fondo.querySelector('#gD1').checked;
    const d2 = fondo.querySelector('#gD2').checked;

    if(!nombre){ await modalAlert('Falta el nombre del ganador.', 'Datos incompletos'); return; }
    if(!apellido){ await modalAlert('Falta el apellido del ganador.', 'Datos incompletos'); return; }
    if(!cedula){ await modalAlert('Falta la cédula del ganador.', 'Datos incompletos'); return; }
    if(!correo){ await modalAlert('Falta el correo del ganador. Es obligatorio para poder contactarlo.', 'Datos incompletos'); return; }
    if(!telefono){ await modalAlert('Falta el teléfono del ganador. Es obligatorio para poder contactarlo.', 'Datos incompletos'); return; }
    if(!textoPersonaValido(nombre, 60)){ await modalAlert('El nombre no es válido: máximo 60 caracteres y sin los caracteres < o >.', 'Nombre inválido'); return; }
    if(!textoPersonaValido(apellido, 60)){ await modalAlert('El apellido no es válido: máximo 60 caracteres y sin los caracteres < o >.', 'Apellido inválido'); return; }
    if(!cedulaValida(cedula)){ await modalAlert('La cédula no es válida: solo números, puntos o espacios (4 a 20 caracteres).', 'Cédula inválida'); return; }
    if(!correoValido(correo)){ await modalAlert('El correo no es válido. Ej.: maria@correo.com', 'Correo inválido'); return; }
    if(!telefonoValido(telefono)){ await modalAlert('El teléfono no es válido: solo números y los símbolos + ( ) . - con 7 a 30 caracteres.', 'Teléfono inválido'); return; }
    if(!cupones || cupones < 1 || cupones > concurso.cupones_reservados){
      await modalAlert('Las entradas deben ser entre 1 y ' + concurso.cupones_reservados + '.', 'Entradas inválidas'); return;
    }
    if(!d1 && !d2){ await modalAlert('Marca al menos un día (Día 1 o Día 2).', 'Días incompletos'); return; }

    const ok = await modalConfirm(
      'ÚLTIMA ADVERTENCIA\n\n' +
      '• Concurso: ' + concurso.nombre + '\n' +
      '• Ganador: ' + nombre + ' ' + apellido + '\n' +
      '• Cédula: ' + cedula + '\n' +
      '• Días: ' + diasTexto(d1, d2) + '\n' +
      '• Entradas: ' + cupones + '\n\n' +
      'Una vez guardado no se puede modificar.',
      '⚠️ Confirmación final',
      {
        requiereCheck: true,
        checkTexto: 'Confirmo que revisé la cédula, el nombre y el teléfono/correo del ganador. Una vez guardado, no podrá modificarse.',
        btnTexto: 'Asignar ganador',
        colorBoton: 'btn-morado'
      }
    );
    if(!ok) return;

    const btn = fondo.querySelector('#mAsignar');
    btn.disabled = true; btn.textContent = 'Asignando...';
    try{
      const r = await llamar('f_aliado_asignar_ganador', {
        p_codigo_link: CODIGO, p_concurso_id: concurso.id,
        p_nombre: nombre, p_apellido: apellido, p_cedula: cedula,
        p_correo: correo || null, p_telefono: telefono || null,
        p_cupones_total: cupones, p_dia1: d1, p_dia2: d2
      });
      if(!r || r.error){
        await modalAlert('No se pudo asignar: ' + (r ? r.error : 'desconocido'), 'Error');
        btn.disabled = false; btn.textContent = 'Asignar ganador';
        return;
      }
      cerrar();
      await recargar();
      abrirModalColaEnvios();
    }catch(e){
      await modalAlert('Error: ' + (e.message || e), 'Error');
      btn.disabled = false; btn.textContent = 'Asignar ganador';
    }
  });
}

// ============================================================
// MODAL VER DETALLES DEL GANADOR
// ============================================================
function abrirModalDetallesGanador(concurso){
  const g = concurso.ganador;
  if(!g) return;
  const estadoG = g.estado === 'activa'
    ? (g.canjeado_at ? '<span class="pill pill-amarillo">Canjeado</span>' : '<span class="pill pill-verde">Activo</span>')
    : '<span class="pill pill-rojo">Anulado</span>';
  // M-33: si el premio está anulado, bajo el dato "Estado" va una nota en texto
  // claro. Texto fijo (sin datos dinámicos), puede ir dentro del HTML del modal.
  const notaAnulado = g.estado === 'activa'
    ? ''
    : '<p class="suave-13 mt-10">Este premio fue anulado: ya no se puede canjear. Si crees que es un error, avisa a la mesa técnica del evento.</p>';
  const fechaTxt = concurso.fecha_concurso ? fmtFecha(concurso.fecha_concurso) : '—';

  const fondo = document.createElement('div');
  fondo.className = 'modal-fondo';
  fondo.innerHTML =
    '<div class="modal-caja">' +
      '<div class="modal-titulo">🔍 Detalles del ganador</div>' +
      '<div class="modal-sub">Concurso: <strong>' + esc(concurso.nombre) + '</strong></div>' +
      '<div class="bloque-datos">' +
        '<div class="bloque-titulo">👤 Datos del ganador</div>' +
        '<div class="dato-gan"><strong>Nombre</strong><span>' + esc(g.nombre) + ' ' + esc(g.apellido) + '</span></div>' +
        '<div class="dato-gan"><strong>Cédula</strong><span>' + esc(cedulaMascara(g.cedula)) + '</span></div>' +
        '<div class="dato-gan"><strong>Teléfono</strong><span>' + (g.telefono ? esc(g.telefono) : '—') + '</span></div>' +
      '</div>' +
      '<div class="bloque-datos">' +
        '<div class="bloque-titulo">🎟️ Premio</div>' +
        '<div class="dato-gan"><strong>Días autorizados</strong><span>' + diasTexto(g.dia1, g.dia2) + '</span></div>' +
        '<div class="dato-gan"><strong>Fecha del concurso</strong><span>' + fechaTxt + '</span></div>' +
        '<div class="dato-gan"><strong>Entradas ganadas</strong><span>' + g.cupones_total + '</span></div>' +
        '<div class="dato-gan"><strong>Estado</strong><span>' + estadoG + '</span></div>' +
        notaAnulado +
      '</div>' +
      '<div class="modal-acciones">' +
        '<button class="btn btn-gris" id="mCerrar">Cerrar</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(fondo);
  const cerrar = () => fondo.remove();
  fondo.querySelector('#mCerrar').addEventListener('click', cerrar);
  fondo.addEventListener('click', e => { if(e.target === fondo) cerrar(); });
}

// ============================================================
// MODAL COLA DE ENVÍOS
// ============================================================
function abrirModalColaEnvios(){
  const fondo = document.createElement('div');
  fondo.className = 'modal-fondo';
  fondo.innerHTML = '<div class="modal-caja" id="colaCaja"></div>';
  document.body.appendChild(fondo);

  const cerrar = () => fondo.remove();
  fondo.addEventListener('click', e => { if(e.target === fondo) cerrar(); });

  function textoEnvio(c){
    const g = c.ganador;
    const linkGan = BASE + 'cortesia.html?c=' + g.codigo_link;
    return '🎉 ¡Felicidades ' + g.nombre + ' ' + g.apellido + '! Ganaste en "' + c.nombre + '". Aquí está tu pase: ' + linkGan;
  }

  function render(){
    const caja = fondo.querySelector('#colaCaja');
    const todos = (DATOS.concursos || []).filter(c => c.estado === 'cerrado' && c.ganador);
    const pendientes = todos.filter(c => !c.ganador.enviado_at);
    const enviados = todos.filter(c => !!c.ganador.enviado_at);

    let html = '<div class="modal-titulo">📨 Enviar premios a los ganadores</div>';
    html += '<div class="modal-sub">' + todos.length + ' concurso(s) con ganador · ' + pendientes.length + ' pendiente(s) · ' + enviados.length + ' enviado(s)</div>';

    if(todos.length === 0){
      html += '<div class="aviso aviso-azul">Aún no tienes premios asignados a un ganador.</div>';
      html += '<div class="modal-acciones"><button class="btn btn-gris" id="mCerrar">Cerrar</button></div>';
      caja.innerHTML = html;
      caja.querySelector('#mCerrar').addEventListener('click', cerrar);
      return;
    }

    if(pendientes.length === 0){
      html += '<div class="felicidades"><span class="emoji">🎉</span>¡Felicidades!<br>Todos tus premios ya fueron enviados a sus ganadores.</div>';
    }else{
      html += '<div class="cola-seccion-titulo">⏳ Pendientes de envío (' + pendientes.length + ')</div>';
      pendientes.forEach(c => {
        const g = c.ganador;
        const fechaTxt = c.fecha_concurso ? fmtFecha(c.fecha_concurso) : '';
        const diasTxt = diasTexto(g.dia1, g.dia2) + (fechaTxt ? ' (' + fechaTxt + ')' : '');
        html +=
          '<div class="cola-item">' +
            '<div class="cola-cab">🏆 ' + esc(c.nombre) + '</div>' +
            '<div class="dato-gan"><strong>Ganador</strong><span>' + esc(g.nombre) + ' ' + esc(g.apellido) + '</span></div>' +
            '<div class="dato-gan"><strong>Cédula</strong><span>' + esc(cedulaMascara(g.cedula)) + '</span></div>' +
            '<div class="dato-gan"><strong>Teléfono</strong><span>' + (g.telefono ? esc(g.telefono) : '—') + '</span></div>' +
            '<div class="dato-gan"><strong>Premio</strong><span>' + diasTxt + ' · ' + g.cupones_total + ' entrada(s)</span></div>' +
            '<div class="cola-acciones">' +
              '<button class="btn btn-azul btn-mini" data-copiar="' + c.id + '">📋 Copiar link</button>' +
            '</div>' +
          '</div>';
      });
    }

    if(enviados.length > 0){
      html += '<div class="cola-seccion-titulo">✅ Ya enviados (' + enviados.length + ')</div>';
      enviados.forEach(c => {
        const g = c.ganador;
        const fechaEnv = g.enviado_at ? new Date(g.enviado_at).toLocaleString('es-VE') : '';
        html +=
          '<div class="cola-item enviado">' +
            '<div class="cola-cab">🏆 ' + esc(c.nombre) + '</div>' +
            '<div class="dato-gan"><strong>Ganador</strong><span>' + esc(g.nombre) + ' ' + esc(g.apellido) + '</span></div>' +
            '<div class="dato-gan"><strong>Enviado</strong><span>' + esc(fechaEnv) + '</span></div>' +
            '<div class="cola-acciones">' +
              '<button class="btn btn-gris btn-mini" data-copiar="' + c.id + '">📋 Copiar link de nuevo</button>' +
            '</div>' +
          '</div>';
      });
    }

    html += '<div class="modal-acciones"><button class="btn btn-gris" id="mCerrar">Cerrar</button></div>';
    caja.innerHTML = html;

    caja.querySelector('#mCerrar').addEventListener('click', cerrar);
    caja.querySelectorAll('button[data-copiar]').forEach(b => {
      b.addEventListener('click', async () => {
        const cid = b.getAttribute('data-copiar');
        const c = DATOS.concursos.find(x => x.id === cid);
        if(!c || !c.ganador) return;
        const g = c.ganador;
        const texto = textoEnvio(c);

        const orig = b.textContent;
        try{
          await navigator.clipboard.writeText(texto);
        }catch(e){
          const ta = document.createElement('textarea');
          ta.value = texto; document.body.appendChild(ta); ta.select();
          try{ document.execCommand('copy'); }catch(e2){}
          document.body.removeChild(ta);
        }
        b.textContent = '📋 ¡Copiado!';
        setTimeout(() => { b.textContent = orig; }, 800);

        if(!g.enviado_at){
          try{
            await llamar('f_aliado_marcar_enviado', {
              p_codigo_link: CODIGO,
              p_concurso_id: c.id
            });
            const d = await llamar('f_aliado_ver', { p_codigo_link: CODIGO });
            if(d){ DATOS = d; pintarTodo(); render(); }
          }catch(e){ /* silencioso */ }
        }
      });
    });
  }

  render();
}

// ============================================================
// CONFIRMAR ELIMINAR CONCURSO
// ============================================================
async function confirmarEliminar(concurso){
  const ok = await modalConfirm(
    '¿Eliminar el concurso "' + concurso.nombre + '"?\n\n' +
    'Este concurso no tiene ganador asignado. Al eliminarlo, las ' + concurso.cupones_reservados + ' entrada(s) reservadas volverán a estar disponibles en tu pool.\n\n' +
    'Esta acción no se puede deshacer.',
    '🗑️ Eliminar concurso',
    { btnTexto: 'Sí, eliminar', colorBoton: 'btn-rojo' }
  );
  if(!ok) return;

  try{
    const r = await llamar('f_aliado_eliminar_concurso', {
      p_codigo_link: CODIGO, p_concurso_id: concurso.id
    });
    if(!r || r.error){
      await modalAlert('No se pudo eliminar: ' + (r ? r.error : 'desconocido'), 'Error');
      return;
    }
    await recargar();
    await modalAlert(
      '✅ Eliminaste el concurso "' + concurso.nombre + '".\n\nAhora cuentas con ' + r.cupones_disponibles + ' entrada(s) de cortesía disponibles.',
      'Concurso eliminado'
    );
  }catch(e){
    await modalAlert('Error: ' + (e.message || e), 'Error');
  }
}

// ============================================================
// CARGA INICIAL
// ============================================================
async function cargar(){
  if(!CODIGO){
    document.getElementById('panelCarga').style.display = 'none';
    document.getElementById('panelError').style.display = 'block';
    return;
  }
  try{
    const d = await llamar('f_aliado_ver', { p_codigo_link: CODIGO });
    if(!d){
      document.getElementById('panelCarga').style.display = 'none';
      document.getElementById('panelError').style.display = 'block';
      return;
    }
    DATOS = d;
    document.getElementById('panelCarga').style.display = 'none';

    if(!d.aliado.activo || d.asignacion.estado !== 'activa'){
      // M-33: la vista "anulada" explica QUÉ pasó y QUÉ hacer. Dos casos:
      // organización desactivada vs. asignación anulada. Los valores dinámicos
      // (nombre, motivo, código) van SIEMPRE por textContent/createElement:
      // nunca por innerHTML (vienen de la base y la llena el administrador).
      // M-36: el camino "comunícate con la mesa técnica ... diles este código":
      // ya no se repite aquí, vive dentro de #bloqueReclamo (segunda opción,
      // debajo del formulario) y la primera opción es registrar un reclamo.
      const tituloAnulado = document.getElementById('tituloAnulado');
      const razonAnulada = document.getElementById('razonAnulada');
      const detalleAnulado = document.getElementById('detalleAnulado');
      detalleAnulado.textContent = '';
      document.getElementById('reclamoMesaCodigo').textContent = d.asignacion.codigo_link;
      if(!d.aliado.activo){
        tituloAnulado.textContent = '⛔ Tu organización quedó desactivada';
        razonAnulada.textContent = d.aliado.nombre_organizacion
          ? 'La cuenta de ' + d.aliado.nombre_organizacion + ' ya no está activa en este evento.'
          : 'La cuenta de esta organización ya no está activa en este evento.';
        const p1 = document.createElement('p');
        p1.textContent = 'Los cupones de esta organización no se pueden usar en la puerta.';
        detalleAnulado.appendChild(p1);
      }else{
        tituloAnulado.textContent = '⛔ Esta asignación quedó anulada';
        razonAnulada.textContent = d.asignacion.razon_anulacion
          ? 'Motivo: ' + d.asignacion.razon_anulacion
          : 'No se registró un motivo de la anulación.';
        const p1 = document.createElement('p');
        p1.textContent = 'Los cupones de esta asignación ya no se pueden usar en la puerta.';
        detalleAnulado.appendChild(p1);
      }
      document.getElementById('panelAnulado').style.display = 'block';
      pintarReclamoPrevio();
      return;
    }

    pintarTodo();
    document.getElementById('panelPrincipal').style.display = 'block';
  }catch(e){
    document.getElementById('panelCarga').innerHTML = '<p class="texto-rojo">Error al cargar: ' + esc(e.message || e) + '</p>';
  }
}

document.getElementById('btnNuevoConcurso').addEventListener('click', async () => {
  if(DATOS.asignacion.cupones_disponibles <= 0){
    const abiertos = (DATOS.concursos || []).filter(c => c.estado === 'abierto');
    if(abiertos.length > 0){
      await modalAlert(
        'No tienes entradas de cortesía disponibles en este momento.\n\n' +
        'Tienes ' + abiertos.length + ' concurso(s) abierto(s) sin ganador asignado. Puedes editar o eliminar alguno de esos concursos para liberar entradas e iniciar uno nuevo, o asignarle un ganador a uno de ellos.',
        'Sin entradas disponibles'
      );
    }else{
      await modalAlert(
        'No tienes más entradas de cortesía disponibles. Todas las entradas asignadas ya están reservadas en concursos.\n\n' +
        'Si necesitas más entradas de cortesía, comunícate con el organizador del evento.',
        'Sin entradas disponibles'
      );
    }
    return;
  }
  abrirModalConcurso(null);
});

// ============================================================
// M-36 FASE 1: RECLAMO EN LA PANTALLA ANULADA (RQ-01, RQ-02, RQ-03, RQ-09, RQ-12)
// Norma v2.2: validación al escribir en el propio campo (borde + aria-invalid
// + texto corto bajo el campo) y el resultado de la acción DENTRO de esta
// tarjeta (#reclamoResultado), nunca en un contenedor global ni en un modal.
// ============================================================
const CLAVE_ULTIMO_RECLAMO = 'na_ultimo_reclamo_' + CODIGO;

const ERRORES_RECLAMO_SERVIDOR = {
  CODIGO_INVALIDO: 'Este link no está registrado en el evento. Habla con la mesa técnica.',
  LIMITE_DIARIO: 'Ya enviaste 3 reclamos hoy con este link. Espera 24 horas o habla con la mesa técnica.',
  NO_SE_PUDO_CREAR: 'No se pudo registrar el reclamo. Inténtalo otra vez o habla con la mesa técnica.'
};

// Errores de la RPC que se marcan EN EL CAMPO que corresponde.
const ERRORES_CAMPO_RECLAMO = {
  NOMBRE_INVALIDO: ['reclamoNombre', 'errReclamoNombre', 'El nombre debe tener entre 3 y 120 caracteres.'],
  CONTACTO_INVALIDO: ['reclamoContacto', 'errReclamoContacto', 'El contacto debe tener entre 5 y 120 caracteres.'],
  DETALLE_LARGO: ['reclamoDetalle', 'errReclamoDetalle', 'El detalle es demasiado largo (máximo 500 caracteres).']
};

function campoReclamo(id){ return document.getElementById(id); }

function marcarErrorCampo(input, errEl, texto){
  input.setAttribute('aria-invalid', 'true');
  input.classList.add('campo-error');
  errEl.textContent = texto;
  errEl.hidden = false;
}

function limpiarErrorCampo(input, errEl){
  input.removeAttribute('aria-invalid');
  input.classList.remove('campo-error');
  errEl.textContent = '';
  errEl.hidden = true;
}

// Valida y pinta el estado del campo. Devuelve true si el campo está bien.
function validarNombreReclamo(){
  const input = campoReclamo('reclamoNombre');
  const v = input.value.trim();
  const ok = v.length >= 3 && v.length <= 120;
  if(ok){ limpiarErrorCampo(input, campoReclamo('errReclamoNombre')); return true; }
  marcarErrorCampo(input, campoReclamo('errReclamoNombre'),
    v.length === 0 ? 'Escribe tu nombre.' : 'El nombre debe tener entre 3 y 120 caracteres.');
  return false;
}

function validarContactoReclamo(){
  const input = campoReclamo('reclamoContacto');
  const v = input.value.trim();
  const ok = v.length >= 5 && v.length <= 120;
  if(ok){ limpiarErrorCampo(input, campoReclamo('errReclamoContacto')); return true; }
  marcarErrorCampo(input, campoReclamo('errReclamoContacto'),
    v.length === 0 ? 'Escribe un correo o teléfono para poder contactarte.' : 'El contacto debe tener entre 5 y 120 caracteres.');
  return false;
}

function validarDetalleReclamo(){
  const input = campoReclamo('reclamoDetalle');
  const v = input.value.trim();
  const ok = v.length <= 500;
  if(ok){ limpiarErrorCampo(input, campoReclamo('errReclamoDetalle')); return true; }
  marcarErrorCampo(input, campoReclamo('errReclamoDetalle'), 'El detalle es demasiado largo (máximo 500 caracteres).');
  return false;
}

function validarMotivoReclamo(){
  const sel = campoReclamo('reclamoMotivo');
  if(sel.value){ limpiarErrorCampo(sel, campoReclamo('errReclamoMotivo')); return true; }
  marcarErrorCampo(sel, campoReclamo('errReclamoMotivo'), 'Elige un motivo del reclamo.');
  return false;
}

// Pinta el resultado "ok" DENTRO de la tarjeta (nada viaja por innerHTML: el
// código viene de la base y va por textContent).
function pintarReclamoResultado(codigo){
  const zona = campoReclamo('reclamoResultado');
  zona.textContent = '';
  const aviso = document.createElement('div');
  aviso.className = 'aviso aviso-verde';
  aviso.textContent = '✅ Reclamo registrado.';
  zona.appendChild(aviso);
  const cajaCodigo = document.createElement('div');
  cajaCodigo.className = 'codigo';
  cajaCodigo.textContent = codigo;
  zona.appendChild(cajaCodigo);
  const guarda = document.createElement('p');
  guarda.className = 'suave-14 mt-10';
  guarda.textContent = 'Guarda este código: con él puedes consultar la respuesta.';
  zona.appendChild(guarda);
  const enlace = document.createElement('a');
  enlace.className = 'btn btn-azul btn-mini';
  enlace.textContent = 'Ver el estado de mi reclamo';
  enlace.href = BASE + 'reclamo.html?r=' + encodeURIComponent(codigo);
  zona.appendChild(enlace);
}

// "Sobrevive a la recarga": si en este navegador ya se registró un reclamo para
// este link, se re-pinta el resultado consultándolo a la base con f_reclamo_ver.
// Si no existe o falla la consulta, no se pinta nada falso.
async function pintarReclamoPrevio(){
  const guardado = sessionStorage.getItem(CLAVE_ULTIMO_RECLAMO);
  if(!guardado) return;
  try{
    const r = await llamar('f_reclamo_ver', { p_codigo_reclamo: guardado });
    if(r && r.codigo_reclamo) pintarReclamoResultado(r.codigo_reclamo);
  }catch(e){ /* sin red: queda la pantalla anulada normal */ }
}

async function enviarReclamo(){
  const motivoOk = validarMotivoReclamo();
  const nombreOk = validarNombreReclamo();
  const contactoOk = validarContactoReclamo();
  const detalleOk = validarDetalleReclamo();
  if(!motivoOk || !nombreOk || !contactoOk || !detalleOk) return;

  const zona = campoReclamo('reclamoResultado');
  const btn = campoReclamo('btnEnviarReclamo');
  btn.disabled = true;
  btn.textContent = 'Enviando...';
  try{
    const r = await llamar('f_reclamo_crear', {
      p_codigo_link: CODIGO,
      p_nombre: campoReclamo('reclamoNombre').value.trim(),
      p_contacto: campoReclamo('reclamoContacto').value.trim(),
      p_motivo: campoReclamo('reclamoMotivo').value,
      p_detalle: campoReclamo('reclamoDetalle').value.trim() || null
    });
    if(r && r.ok){
      sessionStorage.setItem(CLAVE_ULTIMO_RECLAMO, r.codigo_reclamo);
      pintarReclamoResultado(r.codigo_reclamo);
      campoReclamo('formReclamo').hidden = true;
      campoReclamo('btnReclamar').hidden = false;
    }else if(r && ERRORES_CAMPO_RECLAMO[r.error]){
      const [campoId, errId, texto] = ERRORES_CAMPO_RECLAMO[r.error];
      zona.textContent = '';
      marcarErrorCampo(campoReclamo(campoId), campoReclamo(errId), texto);
    }else{
      const mensaje = (r && ERRORES_RECLAMO_SERVIDOR[r.error]) || ERRORES_RECLAMO_SERVIDOR.NO_SE_PUDO_CREAR;
      zona.textContent = '';
      const aviso = document.createElement('div');
      aviso.className = 'aviso aviso-rojo';
      aviso.textContent = mensaje;
      zona.appendChild(aviso);
      // C1 (norma v2.2): CODIGO_INVALIDO y LIMITE_DIARIO impiden continuar,
      // así que además del mensaje en la tarjeta se avisa con el modal propio
      // de esta página (modalAlert, definido arriba en este mismo archivo).
      // Cualquier error de servidor no mapeado (p. ej. MOTIVO_INVALIDO solo
      // alcanzable manipulando el <select>) cae en el texto genérico: nunca
      // se pinta "undefined" porque el fallback es un string fijo.
      if(r && (r.error === 'CODIGO_INVALIDO' || r.error === 'LIMITE_DIARIO')){
        await modalAlert(mensaje, 'No se pudo registrar el reclamo');
      }
    }
  }catch(e){
    zona.textContent = '';
    const aviso = document.createElement('div');
    aviso.className = 'aviso aviso-rojo';
    aviso.textContent = 'No se pudo conectar con el servidor. Revisa tu internet e inténtalo otra vez.';
    zona.appendChild(aviso);
    // C1 (norma v2.2): el fallo de red también impide continuar: modal propio.
    await modalAlert('No se pudo conectar con el servidor. Revisa tu internet e inténtalo otra vez.', 'Sin conexión');
  }finally{
    btn.disabled = false;
    btn.textContent = 'Enviar reclamo';
  }
}

// Wiring del bloque (los elementos nacen con la página; se conectan una sola vez).
(function prepararBloqueReclamo(){
  if(!campoReclamo('bloqueReclamo')) return;
  const btnReclamar = campoReclamo('btnReclamar');
  const formReclamo = campoReclamo('formReclamo');
  btnReclamar.addEventListener('click', () => {
    btnReclamar.hidden = true;
    formReclamo.hidden = false;
  });
  campoReclamo('btnCancelarReclamo').addEventListener('click', () => {
    formReclamo.hidden = true;
    btnReclamar.hidden = false;
  });
  campoReclamo('btnEnviarReclamo').addEventListener('click', enviarReclamo);
  campoReclamo('reclamoMotivo').addEventListener('change', validarMotivoReclamo);
  campoReclamo('reclamoNombre').addEventListener('input', validarNombreReclamo);
  campoReclamo('reclamoContacto').addEventListener('input', validarContactoReclamo);
  const inDetalle = campoReclamo('reclamoDetalle');
  inDetalle.addEventListener('input', () => {
    campoReclamo('reclamoDetalleCuenta').textContent = inDetalle.value.length + '/500';
    validarDetalleReclamo();
  });
})();

cargar();
