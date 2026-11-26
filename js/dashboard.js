const token = leerSesion()?.token;
const rol = leerSesion()?.rol;

const panelCarga = document.getElementById('panelCarga');
const panelContenido = document.getElementById('panelContenido');
const pillEstado = document.getElementById('pillEstado');
const diaActivo = document.getElementById('diaActivo');
const btnToggleEdicion = document.getElementById('btnToggleEdicion');
const gridContadores = document.getElementById('gridContadores');
const progresoDias = document.getElementById('progresoDias');
const panelAlertas = document.getElementById('panelAlertas');
const btnSalir = document.getElementById('btnSalir');

let datosDashboard = null;

async function copiarTexto(texto, btn){
  const original = btn.textContent;
  try{
    await navigator.clipboard.writeText(texto);
    btn.textContent = '¡Copiado!';
    setTimeout(() => { btn.textContent = original; }, 1500);
  }catch(e){
    const ta = document.createElement('textarea');
    ta.value = texto;
    document.body.appendChild(ta);
    ta.select();
    try{
      document.execCommand('copy');
      btn.textContent = '¡Copiado!';
      setTimeout(() => { btn.textContent = original; }, 1500);
    }catch(e2){
      await NA.avisar('No se pudo copiar: ' + texto);
    }
    document.body.removeChild(ta);
  }
}

function renderizar(){
  if(!datosDashboard) return;
  
  const ev = datosDashboard.evento;
  const cont = datosDashboard.contadores;
  const d1 = datosDashboard.puerta_dia1;
  const d2 = datosDashboard.puerta_dia2;
  
  if(ev.edicion_abierta){
    pillEstado.textContent = ' Evento abierto (editando)';
    pillEstado.className = 'estado-pill estado-abierto';
    btnToggleEdicion.textContent = '🔒 Cerrar edición';
    btnToggleEdicion.className = 'btn btn-rojo';
  }else{
    pillEstado.textContent = '🔒 Evento cerrado (listo para puerta)';
    pillEstado.className = 'estado-pill estado-cerrado';
    btnToggleEdicion.textContent = '🔓 Reabrir edición';
    btnToggleEdicion.className = 'btn btn-gris';
  }
  diaActivo.textContent = 'Día ' + (ev.dia_activo || 1);
  
  const totalPersonas = cont.personas_talento + cont.vendedores_patrocinantes + cont.vendedores_pagados + cont.personas_cortesia;
  const tarjetas = [
    { num: totalPersonas, label: ' Personas en el evento', sub: 'Listas, stands y cortesías' },
    { num: cont.talentos, label: '🎭 Talentos', sub: cont.personas_talento + ' personas en sus listas' },
    { num: cont.stands_patrocinantes, label: ' Stands patrocinantes', sub: cont.vendedores_patrocinantes + ' personas registradas' },
    { num: cont.stands_pagados, label: '💰 Stands pagados', sub: cont.vendedores_pagados + ' personas registradas' },
    { num: cont.personas_cortesia, label: '🎁 Cortesías', sub: cont.cortesias_activas + ' pases activos · ' + cont.cortesias_anuladas + ' anulados' },
    { num: cont.coordinadores_activos, label: '👥 Coordinadores activos', sub: cont.coordinadores_revocados + ' revocados' }
  ];
  
  gridContadores.innerHTML = tarjetas.map(t => `
    <div class="contador">
      <span class="numero">${t.num}</span>
      <span class="etiqueta">${t.label}</span>
      <span class="sub">${t.sub}</span>
    </div>
  `).join('');
  
  function calcularProgreso(dia){
    const totalPersonas = dia.personas_autorizadas + dia.personas_pendientes;
    const totalVendedores = dia.vendedores_autorizados + dia.vendedores_pendientes;
    const totalCortesias = (dia.cortesia_autorizados || 0) + (dia.cortesia_pendientes || 0);
    const totalAutorizados = dia.personas_autorizadas + dia.vendedores_autorizados + (dia.cortesia_autorizados || 0);
    const totalGeneral = totalPersonas + totalVendedores + totalCortesias;
    const pct = totalGeneral > 0 ? Math.round((totalAutorizados / totalGeneral) * 100) : 0;
    return { totalAutorizados, totalGeneral, pct };
  }
  
  const p1 = calcularProgreso(d1);
  const p2 = calcularProgreso(d2);
  
  progresoDias.innerHTML = `
    <div class="progreso-dia">
      <div class="progreso-header">
        <span class="progreso-titulo"> Día 1</span>
        <span class="progreso-stats">✅ ${p1.totalAutorizados} autorizados / ⏳ ${p1.totalGeneral - p1.totalAutorizados} pendientes</span>
      </div>
      <div class="barra-fondo">
        <div class="barra-relleno">${p1.pct}%</div>
      </div>
    </div>
    <div class="progreso-dia">
      <div class="progreso-header">
        <span class="progreso-titulo">📅 Día 2</span>
        <span class="progreso-stats">✅ ${p2.totalAutorizados} autorizados /  ${p2.totalGeneral - p2.totalAutorizados} pendientes</span>
      </div>
      <div class="barra-fondo">
        <div class="barra-relleno">${p2.pct}%</div>
      </div>
    </div>
  `;
  // P0-04 4b: el ancho de las barras va por CSSOM (la CSP bloquea el atributo style=)
  const barras = progresoDias.querySelectorAll('.barra-relleno');
  if (barras[0]) barras[0].style.width = p1.pct + '%';
  if (barras[1]) barras[1].style.width = p2.pct + '%';
  
  // ALERTAS con detalle expandible de listas pendientes
  let alertas = [];
  
  if(ev.edicion_abierta){
    alertas.push({ tipo: 'amarilla', texto: '⚠️ El evento está abierto. El módulo de puerta no funcionará hasta que cierres la edición.' });
  }else{
    alertas.push({ tipo: 'verde', texto: '✅ El evento está cerrado. La puerta puede operar con normalidad.' });
  }
  
  // Alerta de listas abiertas del día activo con detalle expandible
  const diaActivoData = ev.dia_activo === 1 ? d1 : d2;
  if(ev.dia_activo && diaActivoData.listas_abiertas > 0){
    const detalle = diaActivoData.listas_abiertas_detalle || [];
    alertas.push({
      tipo: 'amarilla',
      texto: `📋 Hay ${diaActivoData.listas_abiertas} lista(s) del Día ${ev.dia_activo} sin cerrar. Toca para ver los links.`,
      expandible: true,
      detalle: detalle
    });
  }
  
  if(cont.coordinadores_revocados > 0){
    alertas.push({ tipo: 'amarilla', texto: `👥 Hay ${cont.coordinadores_revocados} coordinador(es) revocado(s). Puedes eliminarlos definitivamente desde gestión completa.` });
  }
  
  if(cont.cortesias_anuladas > 0){
    alertas.push({ tipo: 'amarilla', texto: `🎁 Hay ${cont.cortesias_anuladas} cortesía(s) anulada(s). Sus QR ya no funcionan en puerta.` });
  }
  
  if(alertas.length === 0){
    alertas.push({ tipo: 'verde', texto: '✅ Todo en orden.' });
  }
  
  panelAlertas.innerHTML = alertas.map((a, idx) => {
    let html = `<div class="alerta alerta-${a.tipo}${a.expandible ? ' alerta-clickeable' : ''}" ${a.expandible ? `data-idx="${idx}"` : ''}>${a.texto}</div>`;
    if(a.expandible && a.detalle && a.detalle.length > 0){
      html += `<div id="detalle-${idx}" class="detalle-listas oculto">`;
      a.detalle.forEach(item => {
        const tipoCls = item.tipo === 'talento' ? 'pill-tipo-talento' : 'pill-tipo-cortesia';
        html += `<div class="item-lista">
          <div class="info">
            <div class="nombre"><span class="pill-tipo ${tipoCls}">${escaparHtml(String(item.tipo || '').toUpperCase())}</span>${escaparHtml(item.nombre)}</div>
            <div class="meta">Código: <strong>${escaparHtml(item.codigo)}</strong></div>
            <span class="link-box">${escaparHtml(item.link)}</span>
          </div>
          <button class="btn btn-azul btn-mini" data-copiar="${encodeURIComponent(item.link || '')}">📋 Copiar link</button>
        </div>`;
      });
      html += `</div>`;
    }
    return html;
  }).join('');

  // P0-01: listeners en vez de onclick con datos interpolados.
  panelAlertas.querySelectorAll('.alerta-clickeable[data-idx]').forEach(el => {
    el.addEventListener('click', () => toggleDetalle(el.dataset.idx));
  });
  panelAlertas.querySelectorAll('button[data-copiar]').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      copiarLink(decodeURIComponent(btn.dataset.copiar), btn);
    });
  });
  
  panelCarga.style.display = 'none';
  panelContenido.style.display = 'block';
}

function toggleDetalle(idx){
  const el = document.getElementById('detalle-' + idx);
  if(el){
    el.classList.toggle('oculto');
  }
}

async function copiarLink(link, btn){
  await copiarTexto(link, btn);
}

btnToggleEdicion.addEventListener('click', async () => {
  const estadoActual = datosDashboard?.evento?.edicion_abierta;
  const mensaje = estadoActual
    ? '¿Cerrar la edición del evento?\n\nLa puerta podrá empezar a operar, pero ya no se podrán editar listas, talentos ni stands. Las cortesías sí se pueden seguir creando.'
    : '¿Reabrir la edición del evento?\n\nLa puerta dejará de funcionar hasta que cierres de nuevo.';
  
  if(!(await NA.confirmar(mensaje))) return;
  
  btnToggleEdicion.disabled = true;
  btnToggleEdicion.textContent = 'Cambiando estado...';
  
  try{
    await llamar('f_admin_toggle_edicion', { p_token: token, p_abierta: !estadoActual });
    location.reload();
  }catch(e){
    await NA.avisar('Error al cambiar el estado: ' + (e.message || e));
    btnToggleEdicion.disabled = false;
    btnToggleEdicion.textContent = datosDashboard?.evento?.edicion_abierta ? '🔒 Cerrar edición' : '🔓 Reabrir edición';
  }
});

btnSalir.addEventListener('click', async () => {
  if(await NA.confirmar('¿Cerrar sesión de administrador?')){
    borrarSesion();
    location.href = 'index.html';
  }
});

(async () => {
  try{
    const datos = await llamar('f_admin_dashboard', { p_token: token });
    if(!datos){
      await NA.avisar('No se pudo cargar el dashboard. Verifica tu sesión.');
      borrarSesion();
      location.href = 'index.html';
      return;
    }
    datosDashboard = datos;
    renderizar();
  }catch(e){
    panelCarga.innerHTML = `<div class="alerta alerta-roja">Error al cargar: ${escaparHtml(e.message || e)}</div>`;
  }
})();

// M-36 fase 1 (RQ-05): contador de reclamos nuevos. Llamada independiente:
// si falla o devuelve null, solo esa tarjeta queda con "No se pudo cargar el
// contador" y el resto del dashboard sigue funcionando.
(async () => {
  const contador = document.getElementById('contadorReclamos');
  if(!contador) return;
  try{
    const lista = await llamar('f_admin_listar_reclamos', { p_token: token, p_estado: 'nuevo' });
    if(!lista){
      contador.textContent = 'No se pudo cargar el contador';
      return;
    }
    contador.textContent = lista.length === 0
      ? 'Sin reclamos nuevos'
      : lista.length === 1
        ? '1 reclamo nuevo'
        : lista.length + ' reclamos nuevos';
  }catch(e){
    contador.textContent = 'No se pudo cargar el contador';
  }
})();

// ===== M-39: informe agregado para patrocinadores =====
// Tarjeta "🤝 Informe para patrocinadores" del panel. Llama a la RPC
// f_admin_informe_patrocinadores (supabase/migrations/0014) que devuelve SOLO
// AGREGADOS: contadores y nombres de catálogo (stand, talento, empresa, cargo,
// razón). Nunca hay datos de personas (ni nombres, ni cédulas, ni correos, ni
// teléfonos). El resultado y los errores se pintan dentro de la propia tarjeta
// (norma v2.2); los errores que impiden continuar van además en modal.

function fechaInformeFormateada(valor){
  const dt = valor ? new Date(valor) : null;
  return (dt && !isNaN(dt.getTime())) ? dt.toLocaleString() : String(valor || '');
}

function contadorInformeHtml(valor, etiqueta){
  return '<div class="contador">'
    + '<span class="numero">' + escaparHtml(valor) + '</span>'
    + '<span class="etiqueta">' + escaparHtml(etiqueta) + '</span>'
    + '</div>';
}

// Tabla simple (sin clases nuevas: evita tocar el CSS inline y el hash CSP).
// Cabecera y celdas SIEMPRE con escaparHtml. Array vacío => "Sin datos".
function tablaInformeHtml(titulo, cabeceras, filas){
  if(!filas || filas.length === 0){
    return '<h3>' + escaparHtml(titulo) + '</h3><p class="suave-15 mb-8">Sin datos</p>';
  }
  let html = '<table>';
  html += '<caption>' + escaparHtml(titulo) + '</caption>';
  html += '<tr>' + cabeceras.map(c => '<th>' + escaparHtml(c) + '</th>').join('') + '</tr>';
  html += filas.map(fila =>
    '<tr>' + fila.map(c => '<td>' + escaparHtml(c == null ? '' : c) + '</td>').join('') + '</tr>'
  ).join('');
  return html + '</table>';
}

// Catálogo: empresa vacía o nula se pinta como "—" (pantalla y CSV iguales).
function valorVis(valor){
  return (valor && String(valor).trim()) ? valor : '—';
}

function pintarInforme(d){
  const contenedor = document.getElementById('informePatrocinadores');
  if(!contenedor) return;
  const t = d.totales || {};
  let html = '';
  html += '<div class="grid-contadores">'
    + contadorInformeHtml(t.registros, 'Registros')
    + contadorInformeHtml(t.personas_distintas, 'Personas distintas')
    + contadorInformeHtml(t.asistieron_dia1, 'Asistieron Día 1')
    + contadorInformeHtml(t.asistieron_dia2, 'Asistieron Día 2')
    + '</div>';
  html += tablaInformeHtml('Por segmento', ['Segmento', 'Registros', 'Asistieron Día 1', 'Asistieron Día 2'],
    (d.segmentos || []).map(s => [s.segmento, s.registros, s.asistieron_dia1, s.asistieron_dia2]));
  html += tablaInformeHtml('Stands', ['Tipo', 'Número', 'Nombre', 'Empresa', 'Personas', 'Asistieron Día 1', 'Asistieron Día 2'],
    (d.stands || []).map(s => [s.tipo, s.numero, s.nombre, valorVis(s.empresa), s.personas, s.asistieron_dia1, s.asistieron_dia2]));
  html += tablaInformeHtml('Talentos', ['Nombre', 'Personas Día 1', 'Asistieron Día 1', 'Personas Día 2', 'Asistieron Día 2'],
    (d.talentos || []).map(x => [x.nombre, x.personas_dia1, x.asistieron_dia1, x.personas_dia2, x.asistieron_dia2]));
  html += tablaInformeHtml('Empresas', ['Empresa', 'Personas', 'Asistieron Día 1', 'Asistieron Día 2'],
    (d.empresas || []).map(e => [e.empresa, e.personas, e.asistieron_dia1, e.asistieron_dia2]));
  html += tablaInformeHtml('Cargos', ['Cargo', 'Personas'],
    (d.cargos || []).map(c => [c.cargo, c.personas]));
  html += tablaInformeHtml('Cortesías por motivo', ['Razón', 'Personas', 'Asistieron Día 1', 'Asistieron Día 2'],
    (d.cortesias_por_razon || []).map(r => [r.razon, r.personas, r.asistieron_dia1, r.asistieron_dia2]));
  html += '<p class="suave-15 mb-8">'
    + escaparHtml(d.aviso || '')
    + (d.aviso ? ' ' : '')
    + 'Generado: ' + escaparHtml(fechaInformeFormateada(d.generado_at))
    + '</p>';
  contenedor.innerHTML = html;
  // Botones creados por código (la CSP bloquea onclick=). "Copiar resumen"
  // usa copiarTexto(texto, btn) que ya existe más arriba en este archivo.
  const btnCsv = document.createElement('button');
  btnCsv.type = 'button';
  btnCsv.className = 'btn btn-gris';
  btnCsv.textContent = '⬇️ Descargar CSV';
  btnCsv.addEventListener('click', () => descargarCSVInforme(d));
  const btnCopiar = document.createElement('button');
  btnCopiar.type = 'button';
  btnCopiar.className = 'btn btn-gris';
  btnCopiar.textContent = '📋 Copiar resumen';
  btnCopiar.addEventListener('click', () => copiarTexto(textoResumenInforme(d), btnCopiar));
  contenedor.appendChild(btnCsv);
  contenedor.appendChild(btnCopiar);
}

function textoResumenInforme(d){
  const t = d.totales || {};
  const ev = d.evento || {};
  const lineas = [];
  lineas.push('Informe para patrocinadores - ' + (ev.nombre || 'Evento') + ' - generado ' + fechaInformeFormateada(d.generado_at));
  lineas.push('Registros: ' + (t.registros == null ? 0 : t.registros)
    + ' · Personas distintas: ' + (t.personas_distintas == null ? 0 : t.personas_distintas)
    + ' · Asistieron Día 1: ' + (t.asistieron_dia1 == null ? 0 : t.asistieron_dia1)
    + ' · Asistieron Día 2: ' + (t.asistieron_dia2 == null ? 0 : t.asistieron_dia2));
  lineas.push('Por segmento:');
  (d.segmentos || []).forEach(s => {
    lineas.push('- ' + s.segmento + ': ' + (s.registros == null ? 0 : s.registros)
      + ' registros, ' + (s.asistieron_dia1 == null ? 0 : s.asistieron_dia1) + ' asistieron Día 1, '
      + (s.asistieron_dia2 == null ? 0 : s.asistieron_dia2) + ' asistieron Día 2');
  });
  return lineas.join('\r\n');
}

// Celda CSV: si trae ; comillas o salto de línea, va entre comillas con las
// comillas internas duplicadas.
function celdaCSV(v){
  const s = String(v == null ? '' : v);
  return /[;\r\n"]/.test(s)
    ? '"' + s.replace(/"/g, '""') + '"'
    : s;
}

function bloqueCSV(lineas, titulo, cabeceras, filas){
  lineas.push('');
  lineas.push(titulo);
  // Array vacío => una sola línea "Sin datos" (igual que en pantalla), sin cabecera.
  if(!filas || filas.length === 0){
    lineas.push('Sin datos');
    return;
  }
  lineas.push(cabeceras.map(celdaCSV).join(';'));
  filas.forEach(fila => lineas.push(fila.map(celdaCSV).join(';')));
}

// CSV a partir del MISMO objeto `d` que se pinta en pantalla (el closure de
// pintarInforme). Separador ;, fin de línea CRLF y BOM para que
// Excel respete las tildes. Descarga con el patrón Blob de js/admin.js.
function descargarCSVInforme(d){
  const t = d.totales || {};
  const ev = d.evento || {};
  const lineas = [];
  lineas.push(celdaCSV('Informe para patrocinadores - ' + (ev.nombre || 'Evento') + ' - generado ' + fechaInformeFormateada(d.generado_at)));
  lineas.push(celdaCSV(d.aviso || 'Solo datos agregados: no contiene nombres, cédulas, correos ni teléfonos.'));
  bloqueCSV(lineas, 'Totales', ['Métrica', 'Valor'], [
    ['Registros', t.registros],
    ['Personas distintas', t.personas_distintas],
    ['Asistieron Día 1', t.asistieron_dia1],
    ['Asistieron Día 2', t.asistieron_dia2]
  ]);
  bloqueCSV(lineas, 'Por segmento', ['Segmento', 'Registros', 'Asistieron Día 1', 'Asistieron Día 2'],
    (d.segmentos || []).map(s => [s.segmento, s.registros, s.asistieron_dia1, s.asistieron_dia2]));
  bloqueCSV(lineas, 'Stands', ['Tipo', 'Número', 'Nombre', 'Empresa', 'Personas', 'Asistieron Día 1', 'Asistieron Día 2'],
    (d.stands || []).map(s => [s.tipo, s.numero, s.nombre, valorVis(s.empresa), s.personas, s.asistieron_dia1, s.asistieron_dia2]));
  bloqueCSV(lineas, 'Talentos', ['Nombre', 'Personas Día 1', 'Asistieron Día 1', 'Personas Día 2', 'Asistieron Día 2'],
    (d.talentos || []).map(x => [x.nombre, x.personas_dia1, x.asistieron_dia1, x.personas_dia2, x.asistieron_dia2]));
  bloqueCSV(lineas, 'Empresas', ['Empresa', 'Personas', 'Asistieron Día 1', 'Asistieron Día 2'],
    (d.empresas || []).map(e => [e.empresa, e.personas, e.asistieron_dia1, e.asistieron_dia2]));
  bloqueCSV(lineas, 'Cargos', ['Cargo', 'Personas'],
    (d.cargos || []).map(c => [c.cargo, c.personas]));
  bloqueCSV(lineas, 'Cortesías por motivo', ['Razón', 'Personas', 'Asistieron Día 1', 'Asistieron Día 2'],
    (d.cortesias_por_razon || []).map(r => [r.razon, r.personas, r.asistieron_dia1, r.asistieron_dia2]));
  const texto = '\uFEFF' + lineas.join('\r\n') + '\r\n';
  const hoy = new Date().toISOString().slice(0, 10);
  const bola = new Blob([texto], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(bola);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'informe-patrocinadores-' + hoy + '.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function(){ URL.revokeObjectURL(url); }, 5000);
}

// M-39: arranque autocontenido; si la tarjeta no existe (otra página
// reutiliza js/dashboard.js) no hace nada.
(async function iniciarInformePatrocinadores(){
  const btn = document.getElementById('btnInformePatrocinadores');
  const aviso = document.getElementById('avisoInformePatrocinadores');
  const contenedor = document.getElementById('informePatrocinadores');
  if(!btn || !aviso || !contenedor) return;
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Generando...';
    aviso.textContent = '';
    aviso.className = 'suave-15 mb-8';
    contenedor.textContent = '';
    contenedor.classList.add('oculto');
    try{
      const d = await llamar('f_admin_informe_patrocinadores', { p_token: token });
      if(!d || d.error === 'ERR_SESION'){
        const mensaje = 'No se pudo generar el informe. Vuelve a entrar al panel.';
        aviso.textContent = mensaje;
        aviso.className = 'alerta alerta-roja';
        await NA.avisar(mensaje);
        return;
      }
      pintarInforme(d);
      contenedor.classList.remove('oculto');
      aviso.textContent = 'Informe generado. Puedes descargarlo en CSV.';
      aviso.className = 'alerta alerta-verde';
    }catch(e){
      const msg = (e && e.message) ? e.message : e;
      aviso.innerHTML = 'No se pudo generar el informe: ' + escaparHtml(msg);
      aviso.className = 'alerta alerta-roja';
      await NA.avisar('No se pudo generar el informe: ' + msg);
    }finally{
      btn.disabled = false;
      btn.textContent = 'Generar informe';
    }
  });
})();
