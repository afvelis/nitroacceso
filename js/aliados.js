function $(id){ return document.getElementById(id); }
function esc(t){
  return String(t == null ? '' : t)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function boton(texto, clase, fn){
  var b = document.createElement('button');
  b.className = 'btn ' + clase;
  b.textContent = texto;
  b.onclick = function(e){ fn(e.target); };
  return b;
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
function modalConfirm(titulo, mensaje, textoOk, textoCancel){
  return abrirModal({titulo: titulo, mensaje: mensaje, botones: [
    {texto: textoCancel || 'Cancelar', clase:'btn-gris', valor:false},
    {texto: textoOk || 'Aceptar', clase:'btn-verde', valor:true}
  ]});
}

function modalCompartirLink(opts){
  return new Promise(function(resolve){
    var fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    var caja = document.createElement('div');
    caja.className = 'modal-caja modal-caja-grande';
    caja.innerHTML =
      '<h3 class="modal-titulo">' + esc(opts.titulo) + '</h3>' +
      '<div class="modal-seccion">' +
        (opts.subtitulo ? '<p>' + opts.subtitulo + '</p>' : '') +
        (opts.codigo ? '<p><b>Código:</b> ' + esc(opts.codigo) + '</p>' : '') +
        '<p><b>Link:</b></p>' +
        '<div class="codigo codigo-chico">' + esc(opts.link) + '</div>' +
        (opts.ayuda ? '<p class="nota-form">' + opts.ayuda + '</p>' : '') +
      '</div>' +
      '<div class="fila fila-ini" id="filaShare"></div>' +
      '<div class="modal-botones"></div>';

    var fila = caja.querySelector('#filaShare');

    var bCopiar = document.createElement('button');
    bCopiar.className = 'btn btn-verde';
    bCopiar.textContent = '📋 Copiar link';
    bCopiar.onclick = function(){ copiarTexto(opts.link, bCopiar); };
    fila.appendChild(bCopiar);

    if (opts.textoWA){
      var aWA = document.createElement('a');
      aWA.className = 'btn btn-gris';
      aWA.target = '_blank';
      aWA.rel = 'noopener';
      aWA.textContent = '📱 WhatsApp';
      aWA.href = 'https://wa.me/?text=' + encodeURIComponent(opts.textoWA);
      fila.appendChild(aWA);
    }

    if (opts.asuntoMail){
      var aMail = document.createElement('a');
      aMail.className = 'btn btn-gris';
      aMail.textContent = '✉️ Correo';
      aMail.href = 'mailto:?subject=' + encodeURIComponent(opts.asuntoMail) + '&body=' + encodeURIComponent(opts.cuerpoMail || '');
      fila.appendChild(aMail);
    }

    var contB = caja.querySelector('.modal-botones');
    var bCerrar = document.createElement('button');
    bCerrar.className = 'btn btn-gris';
    bCerrar.textContent = 'Cerrar';
    bCerrar.onclick = function(){
      if (fondo.parentNode) fondo.parentNode.removeChild(fondo);
      resolve();
    };
    contB.appendChild(bCerrar);

    fondo.appendChild(caja);
    document.body.appendChild(fondo);
  });
}

function modalDuplicados(duplicados){
  return new Promise(function(resolve){
    var fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    var caja = document.createElement('div');
    caja.className = 'modal-caja modal-caja-grande';

    var listaHtml = duplicados.map(function(d){
      var tipoTxt = d.tipo === 'cedula' ? 'Cédula'
                  : d.tipo === 'correo' ? 'Correo'
                  : d.tipo === 'telefono' ? 'Teléfono' : d.tipo;
      var estadoTxt = d.activo ? '' : ' <span class="badge badge-no">Anulado</span>';
      return '<div class="dup-item">' +
        '<span class="dup-tipo">' + esc(tipoTxt) + '</span>' +
        '<span class="dup-org">' + esc(d.nombre_organizacion || '(sin nombre)') + '</span>' + estadoTxt +
        '<div class="dup-sub">Responsable: ' + esc(d.responsable || '-') + '</div>' +
      '</div>';
    }).join('');

    caja.innerHTML =
      '<h3 class="modal-titulo titulo-aviso">⚠️ Coincidencias detectadas</h3>' +
      '<div class="modal-mensaje">' +
        'Los siguientes datos ya están registrados en otro(s) aliado(s):' +
        '<div class="mt-10">' + listaHtml + '</div>' +
        '<p class="nota-form">Si es la misma organización (sucursales, representante distinto, etc.), puedes continuar. La decisión quedará registrada.</p>' +
      '</div>' +
      '<label class="check-label">' +
        '<input type="checkbox" id="dupCheck">' +
        '<span>Confirmo que es la <b>misma organización</b> (sucursales o representante adicional) y quiero continuar.</span>' +
      '</label>' +
      '<label class="mt-14">Motivo / sucursal (opcional)' +
        '<input type="text" id="dupNota" placeholder="Ej.: Sucursal Maracay">' +
      '</label>' +
      '<div class="modal-botones"></div>';

    var check = caja.querySelector('#dupCheck');
    var nota = caja.querySelector('#dupNota');
    var contB = caja.querySelector('.modal-botones');

    var bCancel = document.createElement('button');
    bCancel.className = 'btn btn-gris';
    bCancel.textContent = 'Cancelar';
    bCancel.onclick = function(){
      if (fondo.parentNode) fondo.parentNode.removeChild(fondo);
      resolve(null);
    };
    contB.appendChild(bCancel);

    var bOk = document.createElement('button');
    bOk.className = 'btn btn-verde';
    bOk.textContent = 'Continuar y crear';
    bOk.disabled = true;
    bOk.onclick = function(){
      if (!check.checked) return;
      if (fondo.parentNode) fondo.parentNode.removeChild(fondo);
      resolve({nota_duplicado: nota.value.trim()});
    };
    contB.appendChild(bOk);

    check.onchange = function(){ bOk.disabled = !check.checked; };

    fondo.appendChild(caja);
    document.body.appendChild(fondo);
  });
}

async function copiarTexto(txt, btn){
  const original = btn ? btn.textContent : '';
  try {
    await navigator.clipboard.writeText(txt);
    if(btn) { btn.textContent = '¡Copiado!'; setTimeout(() => { btn.textContent = original; }, 1500); }
  } catch (e) {
    var ta = document.createElement('textarea'); ta.value = txt;
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); if(btn){ btn.textContent = '¡Copiado!'; setTimeout(() => { btn.textContent = original; }, 1500); } } catch (e2) {}
    document.body.removeChild(ta);
  }
}
function fechaBonita(iso){
  try { return new Date(iso).toLocaleDateString('es-VE', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }); } catch (e) { return ''; }
}
function msgErrorAliado(r){
  var map = {
    ERR_SESION: 'Tu sesión expiró. Entra de nuevo con tu PIN.',
    ERR_NOMBRE_ORG: 'El nombre de la organización es obligatorio.',
    ERR_RESPONSABLE: 'El responsable es obligatorio.',
    ERR_CEDULA: 'La cédula del responsable es obligatoria.',
    ERR_POOL_TIPO: 'El tipo de pool no es válido.',
    ERR_CUPONES: 'La cantidad de cupones no es válida (debe ser 1 o más).',
    ERR_CODIGO: 'No se pudo generar el código del link. Intenta de nuevo.',
    ERR_DUPLICADO_SIN_CONFIRMAR: 'Hay datos duplicados. Debes confirmar que es la misma organización antes de continuar.',
    ERR_DATOS: 'Faltan datos obligatorios.',
    ERR_NO_EXISTE: 'Ese registro ya no existe. Recarga la página.',
    ERR_ANULADA: 'Esa asignación está anulada.',
    ERR_ALIADO_ANULADO: 'Ese aliado está anulado.',
    ERR_LINK: 'El link del aliado no es válido.',
    ERR_NOMBRE: 'El nombre es obligatorio.',
    ERR_SIN_CUPONES: 'No hay cupones disponibles.',
    ERR_FECHA_REQUERIDA: 'La fecha es obligatoria.',
    ERR_FECHA_PASADA: 'La fecha no puede ser anterior a hoy.'
  };
  return map[r] || ('El sistema respondió: ' + r);
}

function textoPool(asi){
  // Calculamos cuántos cupones se han sumado por ampliaciones
  var ampliado = 0;
  if (asi.ampliaciones && asi.ampliaciones.length) {
    ampliado = asi.ampliaciones.reduce(function(acc, amp){
      return acc + ((amp.cupones_despues || 0) - (amp.cupones_antes || 0));
    }, 0);
  }

  if (asi.pool_tipo === 'unico'){
    var total = asi.cupones_unico || 0;
    var base = total - ampliado;
    var usados = asi.cupones_asignados || 0;
    var disp = (asi.disponible_unico == null) ? (total - usados) : asi.disponible_unico;
    
    var textAsignadas = '<b>' + base + '</b>';
    if (ampliado > 0) {
      textAsignadas += ' + <b>' + ampliado + '</b>';
    }
    
    return 'Único · Asignadas: ' + textAsignadas + ' · Usadas: <b>' + usados + '</b> · Disponibles: <b>' + disp + '</b>';
  }
  
  var d1 = asi.cupones_dia1 || 0;
  var d2 = asi.cupones_dia2 || 0;
  var u1 = asi.cupones_asignados_dia1 || 0;
  var u2 = asi.cupones_asignados_dia2 || 0;
  var dd1 = (asi.disponible_dia1 == null) ? (d1 - u1) : asi.disponible_dia1;
  var dd2 = (asi.disponible_dia2 == null) ? (d2 - u2) : asi.disponible_dia2;
  
  // Si el pool por día tuviera ampliaciones (a futuro), aquí se podría desglosar
  return 'Por día · D1: <b>' + d1 + '</b> (usadas ' + u1 + ' · disp. ' + dd1 + ') · D2: <b>' + d2 + '</b> (usadas ' + u2 + ' · disp. ' + dd2 + ')';
}

function renderAliado(a){
  var div = document.createElement('div');
  div.className = 'aliado' + (a.activo ? '' : ' anulado');

  var head = document.createElement('div');
  head.className = 'aliado-head';
  var estadoBadge = a.activo
    ? '<span class="badge badge-ok">🟢 Activo</span>'
    : '<span class="badge badge-no">🔴 Anulado</span>';
  var notaBadge = a.nota_duplicado
    ? ' <span class="badge badge-nota">🏢 ' + esc(a.nota_duplicado) + '</span>'
    : '';
  head.innerHTML = '<strong>' + esc(a.nombre_organizacion || '(sin nombre)') + '</strong> ' + estadoBadge + notaBadge;
  div.appendChild(head);

  var info = document.createElement('div');
  info.innerHTML =
    '<p class="asig-linea">Responsable: <b>' + esc(a.responsable || '-') + '</b></p>' +
    '<p class="asig-linea">Cédula: <b>' + esc(a.cedula || '-') + '</b></p>' +
    '<p class="asig-linea">Correo: <b>' + esc(a.correo || '-') + '</b></p>' +
    '<p class="asig-linea">Teléfono: <b>' + esc(a.telefono || '-') + '</b></p>' +
    '<p class="asig-linea">Creado: ' + fechaBonita(a.creada_at) + '</p>';
  div.appendChild(info);

  if (a.activo){
    var filaAdmin = document.createElement('div');
    filaAdmin.className = 'fila';
    filaAdmin.style.marginTop = '8px';
    filaAdmin.appendChild(botonMini('➕ Agregar asignación', 'btn-verde', function(){
      abrirModalAgregarAsignacion(a);
    }));
    filaAdmin.appendChild(botonMini('🚫 Dar de baja al aliado', 'btn-rojo', function(){
      abrirModalAnularAliado(a);
    }));
    div.appendChild(filaAdmin);
  }

  var asigs = a.asignaciones || [];
  if (!asigs.length){
    var p = document.createElement('p');
    p.className = 'suave';
    p.style.marginTop = '10px';
    p.textContent = 'Sin asignaciones.';
    div.appendChild(p);
    return div;
  }

  asigs.forEach(function(asi){
    var box = document.createElement('div');
    box.className = 'asignacion' + (asi.estado === 'activa' ? '' : ' anulada');

    var top = document.createElement('div');
    top.className = 'asig-top';
    var poolBadge = (asi.pool_tipo === 'unico')
      ? '<span class="badge badge-tipo">Único</span>'
      : '<span class="badge badge-pool-dia">Por día</span>';
    var estBadge = (asi.estado === 'activa')
      ? '<span class="badge badge-ok">Activa</span>'
      : '<span class="badge badge-no">Anulada</span>';
    top.innerHTML = '<span class="codigo codigo-chico codigo-mini6">' + esc(asi.codigo_link || '-') + '</span> ' + poolBadge + ' ' + estBadge;
    box.appendChild(top);

    var l1 = document.createElement('p');
    l1.className = 'asig-linea';
    l1.innerHTML = textoPool(asi);
    box.appendChild(l1);

    var l2 = document.createElement('p');
    l2.className = 'asig-linea';
    l2.innerHTML = 'Premios creados: <b>' + (asi.premios_creados || 0) + '</b> · Cupones usados: <b>' + (asi.cupones_asignados || 0) + '</b>';
    box.appendChild(l2);

    if (asi.estado !== 'activa' && asi.razon_anulacion){
      var raz = document.createElement('p');
      raz.className = 'asig-linea';
      raz.style.color = 'var(--rojo)';
      raz.innerHTML = 'Razón de anulación: <b>' + esc(asi.razon_anulacion) + '</b>';
      box.appendChild(raz);
    }

    var filaAcc = document.createElement('div');
    filaAcc.className = 'fila';
    filaAcc.style.marginTop = '8px';

    if (asi.estado === 'activa'){
      var linkAliado = BASE + 'aliado.html?a=' + (asi.codigo_link || '');

      var bCopiar = botonMini('📋 Copiar link', 'btn-verde', function(b){ copiarTexto(linkAliado, b); });
      filaAcc.appendChild(bCopiar);

      var aWA = document.createElement('a');
      aWA.className = 'btn btn-gris btn-mini';
      aWA.target = '_blank';
      aWA.rel = 'noopener';
      aWA.textContent = '📱 WhatsApp';
      aWA.href = 'https://wa.me/?text=' + encodeURIComponent('Hola ' + (a.responsable || '') + ', aquí está el link de gestión de premios para ' + (a.nombre_organizacion || '') + ': ' + linkAliado);
      filaAcc.appendChild(aWA);

      var aMail = document.createElement('a');
      aMail.className = 'btn btn-gris btn-mini';
      aMail.textContent = '✉️ Correo';
      aMail.href = 'mailto:?subject=' + encodeURIComponent('Link de gestión de aliados - ' + (a.nombre_organizacion || '')) + '&body=' + encodeURIComponent('Hola ' + (a.responsable || '') + ',\n\nAquí está el link de gestión de premios:\n' + linkAliado);
      filaAcc.appendChild(aMail);

      var bAmpliar = botonMini('➕ Ampliar', 'btn-gris', function(){
        abrirModalAmpliar(a, asi);
      });
      filaAcc.appendChild(bAmpliar);

      var bAnular = botonMini('🚫 Anular', 'btn-rojo', function(){
        abrirModalAnularAsignacion(a, asi);
      });
      filaAcc.appendChild(bAnular);
    }

    var bConcursos = botonMini('🏆 Ver concursos', 'btn-gris', function(){
      location.href = 'aliados-concursos.html?asig=' + encodeURIComponent(asi.id);
    });
    filaAcc.appendChild(bConcursos);

    box.appendChild(filaAcc);

    div.appendChild(box);
  });

  return div;
}

function renderAliados(arr){
  var cont = $('contenedorAliados');
  cont.innerHTML = '';
  if (!arr || !arr.length){
    cont.innerHTML = '<p class="suave centrado">Todavía no hay aliados registrados.</p>';
    return;
  }
  arr.forEach(function(a){ cont.appendChild(renderAliado(a)); });
}

var ses = leerSesion();

async function cargarAliados(){
  try {
    var arr = await llamar('f_admin_listar_aliados', { p_token: ses.token });
    if (arr == null){
      $('contenedorAliados').innerHTML = '<p class="suave centrado">Tu sesión expiró. Entra de nuevo con tu PIN.</p>';
      return;
    }
    renderAliados(arr);
  } catch (e) {
    $('contenedorAliados').innerHTML = '<p class="suave centrado">No se pudo cargar la lista: ' + esc(e.message) + '</p>';
  }
}

// ─────────────────────────────────────────────────────────────
// MODAL: Ampliar cupones
// ─────────────────────────────────────────────────────────────
function abrirModalAmpliar(a, asi){
  return new Promise(function(resolve){
    var fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    var caja = document.createElement('div');
    caja.className = 'modal-caja modal-caja-grande';
    
    var poolHtml = '';
    if (asi.pool_tipo === 'unico') {
      poolHtml = '<label class="ancho-total">¿Cuántos cupones deseas agregar? *<input id="aCupones" type="number" min="1" step="1" placeholder="Ej.: 5"></label>';
    } else {
      poolHtml = '<label>Cupones a sumar Día 1 *<input id="aCuponesD1" type="number" min="0" step="1" placeholder="Ej.: 0"></label>' +
                 '<label>Cupones a sumar Día 2 *<input id="aCuponesD2" type="number" min="0" step="1" placeholder="Ej.: 0"></label>';
    }

    caja.innerHTML = 
      '<h3 class="modal-titulo">➕ Ampliar cupones</h3>' +
      '<p class="asig-linea">Aliado: <b>' + esc(a.nombre_organizacion) + '</b> · Asignación: <b>' + esc(asi.codigo_link) + '</b></p>' +
      '<p class="asig-linea suave mb-12">' + textoPool(asi) + '</p>' +
      '<div class="modal-seccion">' +
        '<h4>Nuevos cupones</h4>' +
        '<div class="grid-2col">' + poolHtml + '</div>' +
      '</div>' +
      '<div class="modal-seccion">' +
        '<h4>Justificación</h4>' +
        '<div class="grid-2col">' +
          '<label class="ancho-total">Motivo *' +
            '<select id="aMotivo">' +
              '<option value="Acordado con organizador">Acordado con organizador</option>' +
              '<option value="Compensación por error">Compensación por error</option>' +
              '<option value="Otro">Otro</option>' +
            '</select>' +
          '</label>' +
          '<label class="ancho-total">Detalle (opcional)<input id="aDetalle" type="text" placeholder="Ej.: Se acordó en reunión del lunes"></label>' +
        '</div>' +
      '</div>' +
      '<div id="aMsg" class="suave min-h22"></div>' +
      '<div class="modal-botones"></div>';
    
    var contB = caja.querySelector('.modal-botones');
    
    var bCancel = document.createElement('button');
    bCancel.className = 'btn btn-gris';
    bCancel.textContent = 'Cancelar';
    bCancel.onclick = function(){
      if (fondo.parentNode) fondo.parentNode.removeChild(fondo);
      resolve(null);
    };
    contB.appendChild(bCancel);

    var bOk = document.createElement('button');
    bOk.className = 'btn btn-verde';
    bOk.textContent = 'Ampliar cupones';
    bOk.onclick = async function(){
      var msg = caja.querySelector('#aMsg');
      var motivo = caja.querySelector('#aMotivo').value;
      var detalle = caja.querySelector('#aDetalle').value.trim();
      var datos = { p_token: ses.token, p_asignacion_id: asi.id, p_motivo: motivo, p_motivo_detalle: detalle || null };

      function err(m){ msg.textContent = m; msg.style.color = 'var(--aviso)'; }

      if (asi.pool_tipo === 'unico') {
        var c = parseInt(caja.querySelector('#aCupones').value, 10);
        if (!c || c < 1) { err('Los cupones a sumar deben ser 1 o más.'); return; }
        datos.p_cupones_unico = c;
        datos.p_cupones_dia1 = null;
        datos.p_cupones_dia2 = null;
      } else {
        var c1 = parseInt(caja.querySelector('#aCuponesD1').value, 10);
        var c2 = parseInt(caja.querySelector('#aCuponesD2').value, 10);
        if (isNaN(c1) || c1 < 0) c1 = 0;
        if (isNaN(c2) || c2 < 0) c2 = 0;
        if (c1 + c2 < 1) { err('Debes sumar al menos 1 cupón en total (D1 + D2).'); return; }
        datos.p_cupones_unico = null;
        datos.p_cupones_dia1 = c1;
        datos.p_cupones_dia2 = c2;
      }

      bOk.disabled = true;
      bOk.textContent = 'Guardando...';
      msg.textContent = '';

      try {
        var r = await llamar('f_admin_ampliar_cupones', datos);
        if (!r || r.error) {
          var code = (r && r.error) ? r.error : 'ERR_DATOS';
          err(msgErrorAliado(code));
          bOk.disabled = false;
          bOk.textContent = 'Ampliar cupones';
          return;
        }
        
        if (fondo.parentNode) fondo.parentNode.removeChild(fondo);
        resolve(r);
        
        await modalAlert('✅ Cupones ampliados', 
          'Se agregaron cupones correctamente.<br><br>' +
          'Antes: <b>' + r.cupones_antes + '</b><br>' +
          'Ahora: <b>' + r.cupones_despues + '</b>'
        );
        await cargarAliados();
        
      } catch (e) {
        err('Fallo: ' + e.message);
        bOk.disabled = false;
        bOk.textContent = 'Ampliar cupones';
      }
    };
    contB.appendChild(bOk);

    fondo.appendChild(caja);
    document.body.appendChild(fondo);
  });
}

// ─────────────────────────────────────────────────────────────
// MODAL: Anular asignación (Paso 1 del brief de aliados; RPC f_admin_anular_asignacion)
// ─────────────────────────────────────────────────────────────
function abrirModalAnularAsignacion(a, asi){
  return new Promise(function(resolve){
    var fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    var caja = document.createElement('div');
    caja.className = 'modal-caja modal-caja-grande';

    caja.innerHTML =
      '<h3 class="modal-titulo titulo-rojo">🚫 Anular asignación</h3>' +
      '<p class="asig-linea">Aliado: <b>' + esc(a.nombre_organizacion) + '</b> · Asignación: <b>' + esc(asi.codigo_link) + '</b></p>' +
      '<div class="aviso-rojo-box">' +
        '<b>⚠️ Esta acción no se puede deshacer desde esta pantalla.</b><br>' +
        'La asignación quedará anulada y sus cupones no usados quedarán sin efecto. ' +
        'La <b>razón que escribas la verán el aliado y los premiados</b> en sus links (M-04).' +
      '</div>' +
      '<label class="mt-14">Razón de anulación *' +
        '<textarea id="anRazon" rows="3" placeholder="Ej.: El aliado solicitó retirar su participación" class="campo-texto"></textarea>' +
      '</label>' +
      '<div id="anMsg" class="suave min-h22 mt-8"></div>' +
      '<div class="modal-botones"></div>';

    var contB = caja.querySelector('.modal-botones');

    var bCancel = document.createElement('button');
    bCancel.className = 'btn btn-gris';
    bCancel.textContent = 'Cancelar';
    bCancel.onclick = function(){
      if (fondo.parentNode) fondo.parentNode.removeChild(fondo);
      resolve(null);
    };
    contB.appendChild(bCancel);

    var bOk = document.createElement('button');
    bOk.className = 'btn btn-rojo';
    bOk.textContent = 'Anular asignación';
    bOk.onclick = async function(){
      var msg = caja.querySelector('#anMsg');
      var razon = caja.querySelector('#anRazon').value.trim();

      function err(m){ msg.textContent = m; msg.style.color = 'var(--aviso)'; }

      if (!razon || razon.length < 3){ err('La razón es obligatoria (mínimo 3 caracteres).'); return; }

      bOk.disabled = true;
      bOk.textContent = 'Anulando...';
      msg.textContent = '';

      try {
        var r = await llamar('f_admin_anular_asignacion', {
          p_token: ses.token,
          p_asignacion_id: asi.id,
          p_razon: razon
        });

        if (!r){
          err(msgErrorAliado('ERR_SESION'));
          bOk.disabled = false;
          bOk.textContent = 'Anular asignación';
          return;
        }
        if (r.error){
          err(msgErrorAliado(r.error));
          bOk.disabled = false;
          bOk.textContent = 'Anular asignación';
          return;
        }

        var pa = r.premios_anulados;
        var paTxt = (typeof pa === 'number') ? pa
                  : (Array.isArray(pa) ? pa.length
                  : (pa != null ? String(pa) : '0'));

        if (fondo.parentNode) fondo.parentNode.removeChild(fondo);
        resolve(r);

        await modalAlert('✅ Asignación anulada',
          'La asignación <b>' + esc(asi.codigo_link || '') + '</b> quedó anulada.<br><br>' +
          'Premios anulados: <b>' + paTxt + '</b>'
        );
        await cargarAliados();

      } catch (e){
        err('Fallo: ' + e.message);
        bOk.disabled = false;
        bOk.textContent = 'Anular asignación';
      }
    };
    contB.appendChild(bOk);

    fondo.appendChild(caja);
    document.body.appendChild(fondo);
  });
}

// ─────────────────────────────────────────────────────────────
// MODAL: Dar de baja al aliado (Paso 2 del brief; RPC f_admin_anular_aliado)
// ─────────────────────────────────────────────────────────────
function abrirModalAnularAliado(a){
  return new Promise(function(resolve){
    var fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    var caja = document.createElement('div');
    caja.className = 'modal-caja modal-caja-grande';

    var activas = (a.asignaciones || []).filter(function(x){ return x.estado === 'activa'; }).length;

    caja.innerHTML =
      '<h3 class="modal-titulo titulo-rojo">🚫 Dar de baja al aliado</h3>' +
      '<p class="asig-linea">Aliado: <b>' + esc(a.nombre_organizacion) + '</b> · Responsable: <b>' + esc(a.responsable || '-') + '</b></p>' +
      '<div class="nota-info">' +
        '<b>¿Para qué sirve?</b> Da de baja al aliado del <b>programa completo</b>: él y todos sus pools dejan de operar. Úsala solo cuando el aliado sale definitivamente.<br>' +
        '<b>¿En qué se diferencia de "Anular"?</b> El botón Anular vive dentro de una asignación y retira un solo pool, dejando al aliado activo. Esta opción los retira a todos de una vez.' +
      '</div>' +
      '<div class="aviso-rojo-box">' +
        '<b>Consecuencias:</b><br>' +
        '• El aliado queda bloqueado y no podrá volver a operar.<br>' +
        '• Sus asignaciones activas (<b>' + activas + '</b>) quedarán anuladas.<br>' +
        '• Los premios de esas asignaciones quedarán anulados.<br>' +
        '• La <b>razón</b> que escribas la verán el aliado y los premiados en sus links (M-04).<br>' +
        '• No se puede deshacer desde esta pantalla.' +
      '</div>' +
      '<label class="mt-14">Razón de anulación *' +
        '<textarea id="aaRazon" rows="3" placeholder="Ej.: El aliado solicitó retirarse del programa" class="campo-texto"></textarea>' +
      '</label>' +
      '<div id="aaMsg" class="suave min-h22 mt-8"></div>' +
      '<div class="modal-botones"></div>';

    var contB = caja.querySelector('.modal-botones');

    var bCancel = document.createElement('button');
    bCancel.className = 'btn btn-gris';
    bCancel.textContent = 'Cancelar';
    bCancel.onclick = function(){
      if (fondo.parentNode) fondo.parentNode.removeChild(fondo);
      resolve(null);
    };
    contB.appendChild(bCancel);

    var bOk = document.createElement('button');
    bOk.className = 'btn btn-rojo';
    bOk.textContent = 'Dar de baja al aliado';
    bOk.onclick = async function(){
      var msg = caja.querySelector('#aaMsg');
      var razon = caja.querySelector('#aaRazon').value.trim();

      function err(m){ msg.textContent = m; msg.style.color = 'var(--aviso)'; }

      if (!razon || razon.length < 3){ err('La razón es obligatoria (mínimo 3 caracteres).'); return; }

      bOk.disabled = true;
      bOk.textContent = 'Anulando...';
      msg.textContent = '';

      try {
        var r = await llamar('f_admin_anular_aliado', {
          p_token: ses.token,
          p_aliado_id: a.id,
          p_razon: razon
        });

        if (!r){
          err(msgErrorAliado('ERR_SESION'));
          bOk.disabled = false;
          bOk.textContent = 'Dar de baja al aliado';
          return;
        }
        if (r.error){
          err(msgErrorAliado(r.error));
          bOk.disabled = false;
          bOk.textContent = 'Dar de baja al aliado';
          return;
        }

        function cnt(v){
          return (typeof v === 'number') ? v : (Array.isArray(v) ? v.length : (v != null ? String(v) : '0'));
        }

        if (fondo.parentNode) fondo.parentNode.removeChild(fondo);
        resolve(r);

        await modalAlert('✅ Aliado dado de baja',
          'El aliado <b>' + esc(a.nombre_organizacion || '') + '</b> quedó dado de baja.<br><br>' +
          'Asignaciones anuladas: <b>' + cnt(r.asignaciones_anuladas) + '</b><br>' +
          'Premios anulados: <b>' + cnt(r.premios_anulados) + '</b>'
        );
        await cargarAliados();

      } catch (e){
        err('Fallo: ' + e.message);
        bOk.disabled = false;
        bOk.textContent = 'Dar de baja al aliado';
      }
    };
    contB.appendChild(bOk);

    fondo.appendChild(caja);
    document.body.appendChild(fondo);
  });
}
// ─────────────────────────────────────────────────────────────
// MODAL: Agregar asignación (Paso 3 del brief; RPC f_admin_crear_asignacion)
// ─────────────────────────────────────────────────────────────
function abrirModalAgregarAsignacion(a){
  return new Promise(function(resolve){
    var fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    var caja = document.createElement('div');
    caja.className = 'modal-caja modal-caja-grande';
    caja.innerHTML =
      '<h3 class="modal-titulo">➕ Agregar asignación</h3>' +
      '<p class="asig-linea">Aliado: <b>' + esc(a.nombre_organizacion) + '</b> · Responsable: <b>' + esc(a.responsable || '-') + '</b></p>' +
      '<div class="nota-info">' +
        'Se creará una <b>asignación nueva</b> con su propio código ASI- y su propio link. ' +
        'Sus cupones son independientes de las asignaciones anteriores del aliado.' +
      '</div>' +
      '<div class="modal-seccion">' +
        '<h4>Pool de cupones</h4>' +
        '<div class="grid-2col">' +
          '<label>Tipo de pool *' +
            '<select id="gPool">' +
              '<option value="unico">Único (todos los cupones en un solo pool)</option>' +
              '<option value="por_dia">Por día (Día 1 y Día 2)</option>' +
            '</select>' +
          '</label>' +
          '<label>Cupones totales *<input id="gCupones" type="number" min="1" step="1" placeholder="Ej.: 10"></label>' +
        '</div>' +
        '<p class="nota-form">💡 Por ahora solo está habilitado el pool <b>Único</b>. El pool por día se habilitará en una próxima etapa.</p>' +
      '</div>' +
      '<div id="gMsg" class="suave min-h22"></div>' +
      '<div class="modal-botones"></div>';

    var selPool = caja.querySelector('#gPool');
    selPool.onchange = async function(){
      if (selPool.value === 'por_dia'){
        await modalAlert('Disponible próximamente',
          'El pool <b>por día</b> se habilitará en una próxima etapa.<br><br>Por ahora se trabaja solo con pool <b>Único</b>.');
        selPool.value = 'unico';
      }
    };

    var contB = caja.querySelector('.modal-botones');

    var bCancel = document.createElement('button');
    bCancel.className = 'btn btn-gris';
    bCancel.textContent = 'Cancelar';
    bCancel.onclick = function(){
      if (fondo.parentNode) fondo.parentNode.removeChild(fondo);
      resolve(null);
    };
    contB.appendChild(bCancel);

    var bOk = document.createElement('button');
    bOk.className = 'btn btn-verde';
    bOk.textContent = 'Crear asignación';
    bOk.onclick = async function(){
      var msg = caja.querySelector('#gMsg');
      var cup = parseInt(caja.querySelector('#gCupones').value, 10);

      function err(m){ msg.textContent = m; msg.style.color = 'var(--aviso)'; }

      if (!cup || cup < 1){ err('Los cupones deben ser 1 o más.'); return; }

      bOk.disabled = true;
      bOk.textContent = 'Creando...';
      msg.textContent = '';

      try {
        var r = await llamar('f_admin_crear_asignacion', {
          p_token: ses.token,
          p_aliado_id: a.id,
          p_pool_tipo: 'unico',
          p_cupones_unico: cup,
          p_cupones_dia1: null,
          p_cupones_dia2: null
        });

        if (!r){
          err(msgErrorAliado('ERR_SESION'));
          bOk.disabled = false;
          bOk.textContent = 'Crear asignación';
          return;
        }
        if (r.error){
          err(msgErrorAliado(r.error));
          bOk.disabled = false;
          bOk.textContent = 'Crear asignación';
          return;
        }

        if (fondo.parentNode) fondo.parentNode.removeChild(fondo);
        resolve(r);

        var codigo = r.codigo_link || '';
        var link = BASE + 'aliado.html?a=' + codigo;

        await modalCompartirLink({
          titulo: '✅ Asignación creada',
          subtitulo: '<b>' + esc(a.nombre_organizacion || '') + '</b>',
          codigo: codigo,
          link: link,
          ayuda: 'Este link es la llave de esta asignación nueva. Compártelo con el aliado.',
          textoWA: 'Hola ' + (a.responsable || '') + ', aquí está el link de tu nueva asignación de premios para ' + (a.nombre_organizacion || '') + ': ' + link,
          asuntoMail: 'Nueva asignación de aliados - ' + (a.nombre_organizacion || ''),
          cuerpoMail: 'Hola ' + (a.responsable || '') + ',\n\nAquí está el link de tu nueva asignación de premios:\n' + link + '\n\nCon este link puedes crear concursos y asignar ganadores.'
        });

        await cargarAliados();

      } catch (e){
        err('Fallo: ' + e.message);
        bOk.disabled = false;
        bOk.textContent = 'Crear asignación';
      }
    };
    contB.appendChild(bOk);

    fondo.appendChild(caja);
    document.body.appendChild(fondo);
  });
}
// ─────────────────────────────────────────────────────────────
// MODAL: Nuevo aliado
// ─────────────────────────────────────────────────────────────
function abrirModalNuevoAliado(){
  return new Promise(function(resolve){
    var fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    var caja = document.createElement('div');
    caja.className = 'modal-caja modal-caja-grande modal-caja-xl';
    caja.innerHTML =
      '<h3 class="modal-titulo">➕ Nuevo aliado</h3>' +
      '<div class="modal-seccion">' +
        '<h4>Datos del aliado</h4>' +
        '<div class="grid-2col">' +
          '<label>Nombre de la organización *<input id="nOrg" type="text" placeholder="Ej.: Dunas Producciones"></label>' +
          '<label>Responsable *<input id="nResp" type="text" placeholder="Ej.: María Pérez"></label>' +
          '<label>Cédula del responsable *<input id="nCed" type="text" placeholder="Ej.: 12345678"></label>' +
          '<label>Correo *<input id="nCorreo" type="email" placeholder="Ej.: contacto@dunas.com"></label>' +
          '<label class="ancho-total">Teléfono *<input id="nTel" type="text" placeholder="Ej.: 04141234567"></label>' +
        '</div>' +
      '</div>' +
      '<div class="modal-seccion">' +
        '<h4>Pool de cupones</h4>' +
        '<div class="grid-2col">' +
          '<label>Tipo de pool *' +
            '<select id="nPool">' +
              '<option value="unico">Único (todos los cupones en un solo pool)</option>' +
              '<option value="por_dia">Por día (Día 1 y Día 2)</option>' +
            '</select>' +
          '</label>' +
          '<label>Cupones totales *<input id="nCupones" type="number" min="1" step="1" placeholder="Ej.: 10"></label>' +
        '</div>' +
        '<p class="nota-form">💡 Por ahora solo está habilitado el pool <b>Único</b>. El pool por día se habilitará en una próxima etapa.</p>' +
      '</div>' +
      '<div id="nMsg" class="suave min-h22"></div>' +
      '<div class="modal-botones"></div>';

    var selPool = caja.querySelector('#nPool');
    selPool.onchange = async function(){
      if (selPool.value === 'por_dia'){
        await modalAlert('Disponible próximamente',
          'El pool <b>por día</b> se habilitará en una próxima etapa.<br><br>Por ahora se trabaja solo con pool <b>Único</b>.');
        selPool.value = 'unico';
      }
    };

    var contB = caja.querySelector('.modal-botones');

    var bCancel = document.createElement('button');
    bCancel.className = 'btn btn-gris';
    bCancel.textContent = 'Cancelar';
    bCancel.onclick = function(){
      if (fondo.parentNode) fondo.parentNode.removeChild(fondo);
      resolve(null);
    };
    contB.appendChild(bCancel);

    var bCrear = document.createElement('button');
    bCrear.className = 'btn btn-verde';
    bCrear.textContent = 'Crear aliado';
    bCrear.onclick = async function(){
      var org = caja.querySelector('#nOrg').value.trim();
      var resp = caja.querySelector('#nResp').value.trim();
      var ced = caja.querySelector('#nCed').value.trim();
      var correo = caja.querySelector('#nCorreo').value.trim();
      var tel = caja.querySelector('#nTel').value.trim();
      var cup = parseInt(caja.querySelector('#nCupones').value, 10);
      var msg = caja.querySelector('#nMsg');

      function err(m){ msg.textContent = m; msg.style.color = 'var(--aviso)'; }

      if (!org){ err('Falta el nombre de la organización.'); return; }
      if (!resp){ err('Falta el responsable.'); return; }
      if (!ced){ err('Falta la cédula del responsable.'); return; }
      if (!correo){ err('Falta el correo.'); return; }
      if (!tel){ err('Falta el teléfono.'); return; }
      if (!cup || cup < 1){ err('Los cupones deben ser 1 o más.'); return; }

      bCrear.disabled = true;
      bCrear.textContent = 'Verificando...';
      msg.textContent = '';

      var dup = [];
      try {
        var rDup = await llamar('f_admin_chequear_duplicados_aliado', {
          p_token: ses.token,
          p_cedula: ced,
          p_correo: correo,
          p_telefono: tel
        });
        if (Array.isArray(rDup)) dup = rDup;
      } catch (e){
        msg.textContent = 'No se pudo verificar duplicados: ' + e.message;
        msg.style.color = 'var(--rojo)';
        bCrear.disabled = false;
        bCrear.textContent = 'Crear aliado';
        return;
      }

      var notaDup = null;
      if (dup.length > 0){
        bCrear.disabled = false;
        bCrear.textContent = 'Crear aliado';
        var respDup = await modalDuplicados(dup);
        if (!respDup) return;
        notaDup = respDup.nota_duplicado || null;
        bCrear.disabled = true;
        bCrear.textContent = 'Creando...';
      } else {
        bCrear.textContent = 'Creando...';
      }

      try {
        var r = await llamar('f_admin_crear_aliado', {
          p_token: ses.token,
          p_nombre_organizacion: org,
          p_responsable: resp,
          p_cedula: ced,
          p_correo: correo,
          p_telefono: tel,
          p_pool_tipo: 'unico',
          p_cupones_unico: cup,
          p_cupones_dia1: null,
          p_cupones_dia2: null,
          p_nota_duplicado: notaDup
        });

        if (!r || r.error){
          var code = (r && r.error) ? r.error : 'ERR_DATOS';
          msg.textContent = msgErrorAliado(code);
          msg.style.color = 'var(--rojo)';
          bCrear.disabled = false;
          bCrear.textContent = 'Crear aliado';
          return;
        }

        if (fondo.parentNode) fondo.parentNode.removeChild(fondo);
        resolve(Object.assign({}, r, {datos: {
          nombre_organizacion: org,
          responsable: resp,
          cedula: ced,
          correo: correo,
          telefono: tel,
          nota_duplicado: notaDup
        }}));
      } catch (e){
        msg.textContent = 'Fallo: ' + e.message;
        msg.style.color = 'var(--rojo)';
        bCrear.disabled = false;
        bCrear.textContent = 'Crear aliado';
      }
    };
    contB.appendChild(bCrear);

    fondo.appendChild(caja);
    document.body.appendChild(fondo);
  });
}

async function nuevoAliado(){
  var r = await abrirModalNuevoAliado();
  if (!r || !r.ok) return;

  var codigo = r.codigo_link || '';
  var link = BASE + 'aliado.html?a=' + codigo;
  var org = r.datos.nombre_organizacion;
  var resp = r.datos.responsable;

  await modalCompartirLink({
    titulo: '✅ Aliado creado',
    subtitulo: '<b>' + esc(org) + '</b> · ' + esc(resp),
    codigo: codigo,
    link: link,
    ayuda: 'Este link es la llave del aliado. Compártelo con él.',
    textoWA: 'Hola ' + resp + ', aquí está el link de gestión de premios para ' + org + ': ' + link,
    asuntoMail: 'Link de gestión de aliados - ' + org,
    cuerpoMail: 'Hola ' + resp + ',\n\nAquí está el link de gestión de premios para ' + org + ':\n' + link + '\n\nCon este link puedes crear concursos y asignar ganadores.'
  });

  await cargarAliados();
}

$('btnVolverArriba').onclick = function(){ location.replace('dashboard.html'); };
$('btnVolverAbajo').onclick = function(){ location.replace('dashboard.html'); };
$('btnNuevoAliado').onclick = nuevoAliado;
cargarAliados();
