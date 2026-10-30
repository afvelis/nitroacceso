function $(id){ return document.getElementById(id); }
function esc(t){
  return String(t == null ? '' : t)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function botonMini(texto, clase, fn){
  var b = document.createElement('button');
  b.className = 'btn ' + clase + ' btn-mini';
  b.textContent = texto;
  b.onclick = function(e){ fn(e.target); };
  return b;
}
function abrirModal(opts){
  return new Promise(function(resolve){
    var fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    var caja = document.createElement('div');
    caja.className = 'modal-caja' + (opts.grande ? ' modal-caja-grande' : '');
    caja.innerHTML =
      '<h3 class="modal-titulo">' + esc(opts.titulo || '') + '</h3>' +
      '<div class="modal-mensaje">' + (opts.mensaje || '') + '</div>' +
      '<div class="modal-botones"></div>';
    var contB = caja.querySelector('.modal-botones');
    (opts.botones || []).forEach(function(b){
      var btn = document.createElement('button');
      btn.className = 'btn ' + (b.clase || 'btn-gris');
      btn.textContent = b.texto;
      btn.onclick = function(){
        if (fondo.parentNode) fondo.parentNode.removeChild(fondo);
        resolve(b.valor);
      };
      contB.appendChild(btn);
    });
    fondo.appendChild(caja);
    document.body.appendChild(fondo);
  });
}
function modalAlert(titulo, mensaje){ return abrirModal({titulo: titulo, mensaje: mensaje, botones: [{texto:'Aceptar', clase:'btn-verde', valor:true}]}); }
async function copiarTexto(txt, btn){
  const original = btn ? btn.textContent : '';
  try {
    await navigator.clipboard.writeText(txt);
    if(btn) { btn.textContent = '¡Copiado!'; setTimeout(function(){ btn.textContent = original; }, 1500); }
  } catch (e) {
    var ta = document.createElement('textarea'); ta.value = txt;
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); if(btn){ btn.textContent = '¡Copiado!'; setTimeout(function(){ btn.textContent = original; }, 1500); } } catch (e2) {}
    document.body.removeChild(ta);
  }
}
function fechaBonita(iso){
  try { return new Date(iso).toLocaleDateString('es-VE', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }); } catch (e) { return ''; }
}
function fechaCorta(iso){
  try { return new Date(iso).toLocaleDateString('es-VE', { day:'2-digit', month:'short', year:'numeric' }); } catch (e) { return ''; }
}

function textoPool(asi){
  if (asi.pool_tipo === 'unico'){
    return 'Único · Cupones: <b>' + (asi.cupones_unico || 0) + '</b>';
  }
  return 'Por día · D1: <b>' + (asi.cupones_dia1 || 0) + '</b> · D2: <b>' + (asi.cupones_dia2 || 0) + '</b>';
}

function renderInfoAsig(asig){
  var cont = $('contenedorInfoAsig');
  cont.innerHTML = '';
  var a = asig.aliado || {};
  var estBadge = (a.activo)
    ? '<span class="badge badge-ok">🟢 Activo</span>'
    : '<span class="badge badge-no">🔴 Anulado</span>';
  var asigBadge = (asig.estado === 'activa')
    ? '<span class="badge badge-ok">Activa</span>'
    : '<span class="badge badge-no">Anulada</span>';
  var poolBadge = (asig.pool_tipo === 'unico')
    ? '<span class="badge badge-tipo">Único</span>'
    : '<span class="badge badge-pool-dia">Por día</span>';

  cont.innerHTML =
    '<div><strong>' + esc(a.nombre_organizacion || '(sin nombre)') + '</strong> ' + estBadge + '</div>' +
    '<p class="asig-linea" style="margin-top:6px">Responsable: <b>' + esc(a.responsable || '-') + '</b></p>' +
    '<p class="asig-linea">Correo: <b>' + esc(a.correo || '-') + '</b> · Teléfono: <b>' + esc(a.telefono || '-') + '</b></p>' +
    '<p class="asig-linea" style="margin-top:8px"><span class="codigo codigo-chico" style="margin:0;padding:4px 8px;display:inline-block">' + esc(asig.codigo_link || '-') + '</span> ' + poolBadge + ' ' + asigBadge + '</p>' +
    '<p class="asig-linea">' + textoPool(asig) + '</p>' +
    (asig.estado !== 'activa' && asig.razon_anulacion
      ? '<p class="asig-linea" style="color:var(--rojo)">Razón de anulación: <b>' + esc(asig.razon_anulacion) + '</b></p>'
      : '');
}

function textoGanadorEnTabla(c){
  if (!c.ganador) return '<span class="suave">—</span>';
  var g = c.ganador;
  var nombre = ((g.nombre || '') + ' ' + (g.apellido || '')).trim() || '—';
  var estadoBadge = '';
  if (g.estado === 'anulada'){
    estadoBadge = ' <span class="badge badge-no">Anulada</span>';
  } else if (g.canjeado_at){
    estadoBadge = ' <span class="badge badge-ok">Canjeado</span>';
  }
  return '<b>' + esc(nombre) + '</b>' + estadoBadge +
    '<div class="estado-mini">CI: ' + esc(g.cedula || '-') + '</div>' +
    '<div class="estado-mini">🎟️ ' + (g.cupones_total || 0) + ' cupones · ' + (g.cupones_consumidos || 0) + ' usados</div>';
}

function textoEnvioCanje(c){
  if (!c.ganador) return '<span class="suave">—</span>';
  var g = c.ganador;
  var partes = [];
  partes.push('Envío: ' + (g.enviado_at ? '<b>✅ ' + fechaCorta(g.enviado_at) + '</b>' : '<span class="suave">pendiente</span>'));
  partes.push('Canje: ' + (g.canjeado_at ? '<b>✅ ' + fechaCorta(g.canjeado_at) + ' (D' + (g.canjeado_dia || '-') + ')</b>' : '<span class="suave">pendiente</span>'));
  return partes.join('<br>');
}

function renderConcursos(concursos){
  var cont = $('contenedorConcursos');
  cont.innerHTML = '';
  if (!concursos || !concursos.length){
    cont.innerHTML = '<p class="suave centrado">Este aliado todavía no tiene concursos.</p>';
    return;
  }
  var tabla = document.createElement('table');
  tabla.className = 'tabla-concursos';
  tabla.innerHTML =
    '<thead><tr>' +
      '<th>Concurso</th>' +
      '<th>Fecha</th>' +
      '<th>Estado</th>' +
      '<th>Cupones</th>' +
      '<th>Ganador</th>' +
      '<th>Envío / Canje</th>' +
      '<th>Acciones</th>' +
    '</tr></thead><tbody></tbody>';
  var tbody = tabla.querySelector('tbody');
  concursos.forEach(function(c){
    var tr = document.createElement('tr');
    var estadoBadge = (c.estado === 'abierto')
      ? '<span class="badge badge-ok">Abierto</span>'
      : '<span class="badge badge-cerrado">Cerrado</span>';
    var fechaTxt = c.fecha_concurso ? fechaCorta(c.fecha_concurso) : '<span class="suave">—</span>';
    tr.innerHTML =
      '<td><b>' + esc(c.nombre || '-') + '</b>' +
        (c.descripcion ? '<div class="estado-mini">' + esc(c.descripcion) + '</div>' : '') +
      '</td>' +
      '<td>' + fechaTxt + '</td>' +
      '<td>' + estadoBadge + '</td>' +
      '<td>' + (c.cupones_reservados || 0) + '</td>' +
      '<td>' + textoGanadorEnTabla(c) + '</td>' +
      '<td>' + textoEnvioCanje(c) + '</td>' +
      '<td class="acciones"></td>';
    var td = tr.querySelector('.acciones');
    td.appendChild(botonMini('👁️ Ver detalle', 'btn-gris', function(){ abrirModalDetalle(c); }));
    tbody.appendChild(tr);
  });
  cont.appendChild(tabla);
}

function abrirModalDetalle(c){
  var g = c.ganador;
  var html =
    '<div class="modal-seccion">' +
      '<h4>Concurso</h4>' +
      '<p class="detalle-linea"><b>' + esc(c.nombre || '-') + '</b></p>' +
      (c.descripcion ? '<p class="detalle-linea">' + esc(c.descripcion) + '</p>' : '') +
      '<p class="detalle-linea">Fecha: <b>' + (c.fecha_concurso ? fechaCorta(c.fecha_concurso) : '—') + '</b> · Estado: <b>' + esc(c.estado) + '</b></p>' +
      '<p class="detalle-linea">Cupones reservados: <b>' + (c.cupones_reservados || 0) + '</b></p>' +
      '<p class="detalle-linea">Creado: ' + fechaBonita(c.creada_at) + (c.cerrada_at ? ' · Cerrado: ' + fechaBonita(c.cerrada_at) : '') + '</p>' +
    '</div>';
  if (g){
    var nombre = ((g.nombre || '') + ' ' + (g.apellido || '')).trim() || '—';
    var estadoTxt = (g.estado === 'anulada')
      ? 'Anulada' + (g.razon_anulacion ? ' — ' + esc(g.razon_anulacion) : '')
      : (g.canjeado_at ? 'Canjeado' : 'Activo');
    html +=
      '<div class="modal-seccion">' +
        '<h4>Ganador</h4>' +
        '<p class="detalle-linea"><b>' + esc(nombre) + '</b></p>' +
        '<p class="detalle-linea">CI: <b>' + esc(g.cedula || '-') + '</b></p>' +
        '<p class="detalle-linea">Correo: <b>' + esc(g.correo || '-') + '</b></p>' +
        '<p class="detalle-linea">Teléfono: <b>' + esc(g.telefono || '-') + '</b></p>' +
        '<p class="detalle-linea">Código: <span class="codigo codigo-chico" style="display:inline-block;margin:0;padding:4px 8px">' + esc(g.codigo_link || '-') + '</span></p>' +
        '<p class="detalle-linea">Estado del premio: <b>' + estadoTxt + '</b></p>' +
        '<p class="detalle-linea">Cupones: <b>' + (g.cupones_total || 0) + '</b> asignados · <b>' + (g.cupones_consumidos || 0) + '</b> usados</p>' +
        '<p class="detalle-linea">Días: <b>' + (g.dia1 && g.dia2 ? 'Día 1 y Día 2' : g.dia1 ? 'Día 1' : g.dia2 ? 'Día 2' : '—') + '</b></p>' +
        '<p class="detalle-linea">Enviado: <b>' + (g.enviado_at ? fechaBonita(g.enviado_at) : 'pendiente') + '</b></p>' +
        '<p class="detalle-linea">Canjeado: <b>' + (g.canjeado_at ? fechaBonita(g.canjeado_at) + ' (Día ' + (g.canjeado_dia || '-') + ')' : 'pendiente') + '</b></p>' +
      '</div>';
  } else {
    html +=
      '<div class="modal-seccion">' +
        '<h4>Ganador</h4>' +
        '<p class="detalle-linea suave">Este concurso no tiene ganador asignado todavía.</p>' +
      '</div>';
  }

  abrirModal({
    titulo: '👁️ Detalle del concurso',
    grande: true,
    mensaje: html,
    botones: [{texto:'Cerrar', clase:'btn-gris', valor:true}]
  });
}

var ses = leerSesion();
var asignacionId = null;

function obtenerAsignacionId(){
  var params = new URLSearchParams(location.search);
  return params.get('asig') || '';
}

async function cargar(){
  if (!asignacionId){
    $('contenedorInfoAsig').innerHTML = '<p class="suave centrado">Falta el parámetro <b>?asig=</b> en la URL.</p>';
    $('contenedorConcursos').innerHTML = '';
    return;
  }
  try {
    var r = await llamar('f_admin_ver_concursos_aliado', {
      p_token: ses.token,
      p_asignacion_id: asignacionId
    });
    if (r == null){
      $('contenedorInfoAsig').innerHTML = '<p class="suave centrado">Tu sesión expiró. Entra de nuevo con tu PIN.</p>';
      $('contenedorConcursos').innerHTML = '';
      return;
    }
    if (r.error){
      var msg = (r.error === 'ERR_NO_EXISTE')
        ? 'Esa asignación no existe.'
        : ('Error: ' + r.error);
      $('contenedorInfoAsig').innerHTML = '<p class="suave centrado">' + esc(msg) + '</p>';
      $('contenedorConcursos').innerHTML = '';
      return;
    }
    renderInfoAsig(r.asignacion || {});
    renderConcursos(r.concursos || []);
  } catch (e) {
    $('contenedorInfoAsig').innerHTML = '<p class="suave centrado">No se pudo cargar: ' + esc(e.message) + '</p>';
    $('contenedorConcursos').innerHTML = '';
  }
}

function volverAAliados(){
  location.replace('aliados.html');
}

asignacionId = obtenerAsignacionId();
$('btnVolverArriba').onclick = volverAAliados;
$('btnVolverAbajo').onclick = volverAAliados;
cargar();
