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
      alert('No se pudo copiar: ' + texto);
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
  
  if(!confirm(mensaje)) return;
  
  btnToggleEdicion.disabled = true;
  btnToggleEdicion.textContent = 'Cambiando estado...';
  
  try{
    await llamar('f_admin_toggle_edicion', { p_token: token, p_abierta: !estadoActual });
    location.reload();
  }catch(e){
    alert('Error al cambiar el estado: ' + (e.message || e));
    btnToggleEdicion.disabled = false;
    btnToggleEdicion.textContent = datosDashboard?.evento?.edicion_abierta ? '🔒 Cerrar edición' : '🔓 Reabrir edición';
  }
});

btnSalir.addEventListener('click', () => {
  if(confirm('¿Cerrar sesión de administrador?')){
    borrarSesion();
    location.href = 'index.html';
  }
});

(async () => {
  try{
    const datos = await llamar('f_admin_dashboard', { p_token: token });
    if(!datos){
      alert('No se pudo cargar el dashboard. Verifica tu sesión.');
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
