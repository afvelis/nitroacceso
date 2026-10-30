const token = leerSesion()?.token;
const rol = leerSesion()?.rol;

if(!token || rol !== 'admin'){
  location.href = 'index.html';
}

function esc(t){
  return String(t == null ? '' : t)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function razonLegible(r, causa){
  const map = { prensa:'Prensa', vinculo_familiar:'Vínculo familiar', premio:'Premio', autoridad:'Autoridad', otros:'Otros' };
  let t = map[r] || r;
  if(r === 'otros' && causa) t += ': ' + causa;
  return t;
}

function diasTexto(d1, d2){
  if(d1 && d2) return 'Día 1 y Día 2';
  if(d1) return 'Día 1';
  if(d2) return 'Día 2';
  return '-';
}

function claseBarra(porcentaje){
  if(porcentaje >= 75) return '';
  if(porcentaje >= 40) return 'media';
  return 'baja';
}

function fmtHoras(h){
  if(h === null || h === undefined) return '-';
  if(h < 1) return Math.round(h * 60) + ' min';
  return h + ' h';
}

function renderTiempos(t){
  if(!t){
    document.getElementById('zonaTiempos').innerHTML = '<p class="suave">No hay datos de tiempos disponibles todavía.</p>';
    return;
  }

  const coords = t.coordinadores || [];
  const talT = t.talentos_tiempos || [];
  const staT = t.stands_tiempos || [];

  // Promedios globales
  const promReaccion = coords.length ? (coords.reduce((s,c) => s + (c.horas_reaccion || 0), 0) / coords.length) : null;
  const promTal = talT.filter(x => x.horas_hasta_primera !== null);
  const promTalH = promTal.length ? (promTal.reduce((s,x) => s + x.horas_hasta_primera, 0) / promTal.length) : null;
  const promSta = staT.filter(x => x.horas_hasta_primero !== null);
  const promStaH = promSta.length ? (promSta.reduce((s,x) => s + x.horas_hasta_primero, 0) / promSta.length) : null;

  let html = `
    <div class="resumen-categoria">
      <div class="mini-stat"><div class="num">${fmtHoras(promReaccion !== null ? Math.round(promReaccion*10)/10 : null)}</div><div class="lbl">Reacción promedio de coordinadores</div></div>
      <div class="mini-stat"><div class="num">${fmtHoras(promTalH !== null ? Math.round(promTalH*10)/10 : null)}</div><div class="lbl">1er registro de talento (prom.)</div></div>
      <div class="mini-stat"><div class="num">${fmtHoras(promStaH !== null ? Math.round(promStaH*10)/10 : null)}</div><div class="lbl">1er vendedor de stand (prom.)</div></div>
    </div>
  `;

  // Coordinadores
  html += '<h3>👥 Coordinadores — tiempo desde su creación hasta su primer talento o stand</h3>';
  if(coords.length){
    html += '<div class="tabla-wrap"><table class="tabla"><tr><th>Coordinador</th><th>Tipo</th><th>Talentos</th><th>Stands</th><th>⏱️ Reacción</th></tr>';
    coords.forEach(c => {
      html += `<tr><td>${esc(c.nombre)}</td><td>${c.tipo === 'talentos' ? 'Talentos' : 'Stands'}</td><td>${c.num_talentos}</td><td>${c.num_stands}</td><td>${fmtHoras(c.horas_reaccion)}</td></tr>`;
    });
    html += '</table></div>';
  } else {
    html += '<p class="suave">Sin coordinadores.</p>';
  }

  // Talentos
  html += '<h3>🎭 Talentos — tiempo desde crear el link hasta registrar personas</h3>';
  if(talT.length){
    html += '<div class="tabla-wrap"><table class="tabla"><tr><th>Talento</th><th>Coordinador</th><th>Personas</th><th>⏱️ Hasta 1ra</th><th>⏱️ Hasta última</th><th>⏱️ Registro→entrada</th></tr>';
    talT.forEach(x => {
      html += `<tr><td>${esc(x.nombre)}</td><td>${esc(x.coordinador || '-')}</td><td>${x.total_personas}</td><td>${fmtHoras(x.horas_hasta_primera)}</td><td>${fmtHoras(x.horas_hasta_ultima)}</td><td>${fmtHoras(x.horas_prom_registro_entrada)}</td></tr>`;
    });
    html += '</table></div>';
  } else {
    html += '<p class="suave">Sin talentos.</p>';
  }

  // Stands
  html += '<h3>🏪 Stands — tiempo desde crear el link hasta registrar vendedores</h3>';
  if(staT.length){
    html += '<div class="tabla-wrap"><table class="tabla"><tr><th>Stand</th><th>Tipo</th><th>Coordinador</th><th>Vend.</th><th>⏱️ Hasta 1ro</th><th>⏱️ Hasta último</th><th>⏱️ Registro→entrada</th></tr>';
    staT.forEach(x => {
      html += `<tr><td>${esc(x.nombre || ('Stand ' + x.numero))}</td><td>${x.tipo === 'patrocinante' ? 'Patrocinante' : 'Pagado'}</td><td>${esc(x.coordinador || '-')}</td><td>${x.total_vendedores}</td><td>${fmtHoras(x.horas_hasta_primero)}</td><td>${fmtHoras(x.horas_hasta_ultimo)}</td><td>${fmtHoras(x.horas_prom_registro_entrada)}</td></tr>`;
    });
    html += '</table></div>';
  } else {
    html += '<p class="suave">Sin stands.</p>';
  }

  document.getElementById('zonaTiempos').innerHTML = html;
}

function renderizar(d){
  // ============ RESUMEN POR DÍA ============
  function cajaDia(titulo, dia){
    const autTot = dia.talentos_autorizados + dia.vendedores_autorizados + dia.cortesia_autorizados;
    const penTot = dia.talentos_pendientes + dia.vendedores_pendientes + dia.cortesia_pendientes;
    return `<div class="dia-caja">
      <h3>${titulo}</h3>
      <div class="dia-fila"><span>🎭 Talentos</span><span>✅ ${dia.talentos_autorizados} / ⏳ ${dia.talentos_pendientes}</span></div>
      <div class="dia-fila"><span>🏪 Vendedores</span><span>✅ ${dia.vendedores_autorizados} / ⏳ ${dia.vendedores_pendientes}</span></div>
      <div class="dia-fila"><span>🎁 Cortesías</span><span>✅ ${dia.cortesia_autorizados} / ⏳ ${dia.cortesia_pendientes}</span></div>
      <div class="dia-fila ultima"><span><strong>Total</strong></span><span><strong>✅ ${autTot} / ⏳ ${penTot}</strong></span></div>
    </div>`;
  }
  document.getElementById('gridDias').innerHTML =
    cajaDia('📅 Día 1', d.por_dia.dia1) + cajaDia('📅 Día 2', d.por_dia.dia2);

  // ============ MÉTRICAS GENERALES ============
  const stands = d.stands || [];
  const talentos = d.talentos || [];
  const cortesias = d.cortesias || [];

  const standsPatro = stands.filter(s => s.tipo === 'patrocinante');
  const standsPagados = stands.filter(s => s.tipo === 'pagado');

  const vendedoresPatro = standsPatro.reduce((s, x) => s + x.total_vendedores, 0);
  const vendedoresPagados = standsPagados.reduce((s, x) => s + x.total_vendedores, 0);
  const totalPersonasTalento = talentos.reduce((s, x) => s + x.total_personas, 0);

  const entradasDia1 = d.por_dia.dia1.talentos_autorizados + d.por_dia.dia1.vendedores_autorizados + d.por_dia.dia1.cortesia_autorizados;
  const entradasDia2 = d.por_dia.dia2.talentos_autorizados + d.por_dia.dia2.vendedores_autorizados + d.por_dia.dia2.cortesia_autorizados;

  const diaTop = entradasDia1 > entradasDia2 ? 'Día 1' : entradasDia2 > entradasDia1 ? 'Día 2' : 'Empate';

  document.getElementById('zonaMetricas').innerHTML = `
    <div class="resumen-categoria">
      <div class="mini-stat"><div class="num">${entradasDia1 + entradasDia2}</div><div class="lbl">Entradas totales</div></div>
      <div class="mini-stat"><div class="num">${diaTop}</div><div class="lbl">Día con más asistencia</div></div>
      <div class="mini-stat"><div class="num">${standsPatro.length}</div><div class="lbl">Patrocinantes</div></div>
      <div class="mini-stat"><div class="num">${standsPagados.length}</div><div class="lbl">Stands pagados</div></div>
      <div class="mini-stat"><div class="num">${talentos.length}</div><div class="lbl">Talentos</div></div>
      <div class="mini-stat"><div class="num">${cortesias.filter(c=>c.estado==='activa').length}</div><div class="lbl">Cortesías activas</div></div>
    </div>
    <div class="grid-3">
      <div class="destacado"><div class="numero">${vendedoresPatro}</div><div class="etiqueta">Personas traídas por patrocinantes</div></div>
      <div class="destacado"><div class="numero">${vendedoresPagados}</div><div class="etiqueta">Personas traídas por stands pagados</div></div>
      <div class="destacado"><div class="numero">${totalPersonasTalento}</div><div class="etiqueta">Personas traídas por talentos</div></div>
    </div>
  `;

  // ============ FUNCIÓN GENÉRICA DE ANÁLISIS POR CATEGORÍA ============
  function analizarCategoria(lista, tipo){
    if(!lista || lista.length === 0){
      return '<p class="suave">Sin registros en esta categoría todavía.</p>';
    }

    let ranking;
    if(tipo === 'stand'){
      ranking = lista.map(s => ({
        nombre: s.nombre || ('Stand ' + s.numero),
        detalle: (s.empresa || 'Sin empresa') + ' · ' + (s.vende || 'Sin rubro'),
        registrados: s.total_vendedores,
        presentes: s.aut_dia1 + s.aut_dia2,
        cupo: s.cupo,
        tasa: s.total_vendedores > 0 ? Math.round(((s.aut_dia1 + s.aut_dia2) / (s.total_vendedores * ((s.aut_dia1>0&&s.aut_dia2>0)?2:1))) * 100) : 0
      }));
    } else {
      ranking = lista.map(t => ({
        nombre: t.nombre,
        detalle: diasTexto(t.dia1, t.dia2),
        registrados: t.total_personas,
        presentes: t.autorizados,
        cupo: t.total_personas,
        tasa: t.total_personas > 0 ? Math.round((t.autorizados / t.total_personas) * 100) : 0
      }));
    }

    ranking.sort((a, b) => b.presentes - a.presentes);

    const totalReg = ranking.reduce((s, r) => s + r.registrados, 0);
    const totalPres = ranking.reduce((s, r) => s + r.presentes, 0);
    const tasaGlobal = totalReg > 0 ? Math.round((totalPres / totalReg) * 100) : 0;

    let html = `
      <div class="resumen-categoria">
        <div class="mini-stat"><div class="num">${lista.length}</div><div class="lbl">Participantes</div></div>
        <div class="mini-stat"><div class="num">${totalReg}</div><div class="lbl">Personas inscritas</div></div>
        <div class="mini-stat"><div class="num">${totalPres}</div><div class="lbl">Personas presentes</div></div>
        <div class="mini-stat"><div class="num">${tasaGlobal}%</div><div class="lbl">Tasa de conversión</div></div>
      </div>
      <h3>🏆 Ranking por personas presentes</h3>
    `;

    ranking.forEach((r, i) => {
      const medalla = i === 0 ? 'medalla-1' : i === 1 ? 'medalla-2' : i === 2 ? 'medalla-3' : 'medalla-otros';
      const clase = claseBarra(r.tasa);
      html += `
        <div class="ranking-item">
          <div class="medalla ${medalla}">${i+1}</div>
          <div class="ranking-info">
            <div class="ranking-nombre">${esc(r.nombre)}</div>
            <div class="ranking-detalle">${esc(r.detalle)}</div>
            <div class="barra-progreso"><div class="barra-fill ${clase}" data-ancho="${Math.min(r.tasa,100)}">${r.tasa}%</div></div>
          </div>
          <div class="ranking-valor">
            <div class="grande">${r.presentes}</div>
            <div class="peq">de ${r.registrados}</div>
          </div>
        </div>
      `;
    });

    return html;
  }

  document.getElementById('zonaPatrocinantes').innerHTML = analizarCategoria(standsPatro, 'stand');
  document.getElementById('zonaPagados').innerHTML = analizarCategoria(standsPagados, 'stand');
  document.getElementById('zonaTalentos').innerHTML = analizarCategoria(talentos, 'talento');

  // ============ RUBROS Y PROMOCIÓN ============
  const rubrosStands = stands.filter(s => s.vende && s.vende.trim() !== '');
  const conteoRubros = {};
  rubrosStands.forEach(s => {
    const clave = s.vende.trim().toLowerCase();
    if(!conteoRubros[clave]){
      conteoRubros[clave] = { vende: s.vende.trim(), cantidad: 0, personas: 0 };
    }
    conteoRubros[clave].cantidad++;
    conteoRubros[clave].personas += s.total_vendedores;
  });
  const rubrosOrdenados = Object.values(conteoRubros).sort((a, b) => b.personas - a.personas);
  const totalRubroPersonas = rubrosOrdenados.reduce((s, r) => s + r.personas, 0);

  let rh = `
    <div class="resumen-categoria">
      <div class="mini-stat"><div class="num">${d.rubros_distintos || rubrosOrdenados.length}</div><div class="lbl">Rubros distintos</div></div>
      <div class="mini-stat"><div class="num">${rubrosStands.length}</div><div class="lbl">Stands con rubro</div></div>
      <div class="mini-stat"><div class="num">${rubrosOrdenados[0] ? esc(rubrosOrdenados[0].vende) : '-'}</div><div class="lbl">Rubro más promocionado</div></div>
    </div>
  `;

  if(rubrosOrdenados.length > 0){
    rh += `<h3>📈 Concentración de rubros (por personas que los representan)</h3><table class="tabla"><tr><th>#</th><th>Rubro</th><th>Stands</th><th>Personas</th><th>% del evento</th></tr>`;
    rubrosOrdenados.slice(0, 10).forEach((r, i) => {
      const porcentaje = totalRubroPersonas > 0 ? Math.round((r.personas / totalRubroPersonas) * 100) : 0;
      const clase = claseBarra(porcentaje);
      rh += `<tr><td>${i+1}</td><td>${esc(r.vende)}</td><td>${r.cantidad}</td><td>${r.personas}</td><td><div class="barra-progreso"><div class="barra-fill ${clase}" data-ancho="${Math.min(porcentaje,100)}">${porcentaje}%</div></div></td></tr>`;
    });
    rh += `</table>`;
  } else {
    rh += `<p class="suave">Sin rubros registrados todavía.</p>`;
  }
  document.getElementById('zonaRubros').innerHTML = rh;

    // ============ PREMIACIONES ============
  const premiaciones = cortesias.filter(c => c.tipo === 'premiacion');
  if(premiaciones.length === 0){
    document.getElementById('zonaPremiaciones').innerHTML = '<p class="suave">Sin premiaciones registradas todavía.</p>';
  } else {
    const cuponesObsequiados = premiaciones.reduce((s,x) => s + (x.cupones_total || 0), 0);
    const cuponesConsumidos = premiaciones.reduce((s,x) => s + (x.cupones_consumidos || 0), 0);
    const canjeadas = premiaciones.filter(x => x.canjeado_at).length;
    const pendientesCanje = premiaciones.filter(x => x.estado === 'activa' && !x.canjeado_at).length;

    const porConcurso = {};
    premiaciones.forEach(p => {
      const k = (p.concurso || '(sin concurso)').trim();
      if(!porConcurso[k]) porConcurso[k] = { concurso: k, total: 0, obsequiados: 0, consumidos: 0, canjeadas: 0 };
      porConcurso[k].total++;
      porConcurso[k].obsequiados += (p.cupones_total || 0);
      porConcurso[k].consumidos += (p.cupones_consumidos || 0);
      if(p.canjeado_at) porConcurso[k].canjeadas++;
    });

    const porAliado = {};
    premiaciones.forEach(p => {
      const k = (p.aliado || '(sin aliado)').trim();
      if(!porAliado[k]) porAliado[k] = { aliado: k, total: 0, obsequiados: 0, consumidos: 0, canjeadas: 0 };
      porAliado[k].total++;
      porAliado[k].obsequiados += (p.cupones_total || 0);
      porAliado[k].consumidos += (p.cupones_consumidos || 0);
      if(p.canjeado_at) porAliado[k].canjeadas++;
    });

    let hp = `
      <div class="resumen-categoria">
        <div class="mini-stat"><div class="num">${premiaciones.length}</div><div class="lbl">Premiaciones</div></div>
        <div class="mini-stat"><div class="num">${cuponesObsequiados}</div><div class="lbl">Cupones obsequiados</div></div>
        <div class="mini-stat"><div class="num">${cuponesConsumidos}</div><div class="lbl">Cupones consumidos</div></div>
        <div class="mini-stat"><div class="num">${cuponesObsequiados - cuponesConsumidos}</div><div class="lbl">Cupones sin usar</div></div>
        <div class="mini-stat"><div class="num">${canjeadas}</div><div class="lbl">Canjeadas</div></div>
        <div class="mini-stat"><div class="num">${pendientesCanje}</div><div class="lbl">Pendientes de canje</div></div>
      </div>
    `;

    hp += '<h3>🎭 Cupones por concurso</h3>';
    const concursos = Object.values(porConcurso).sort((a,b) => b.obsequiados - a.obsequiados);
    hp += '<div class="tabla-wrap"><table class="tabla"><tr><th>Concurso</th><th>Premios</th><th>Obsequiados</th><th>Consumidos</th><th>Canjeados</th><th>% uso</th></tr>';
    concursos.forEach(c => {
      const uso = c.obsequiados > 0 ? Math.round((c.consumidos/c.obsequiados)*100) : 0;
      hp += `<tr><td>${esc(c.concurso)}</td><td>${c.total}</td><td>${c.obsequiados}</td><td>${c.consumidos}</td><td>${c.canjeadas}</td><td>${uso}%</td></tr>`;
    });
    hp += '</table></div>';

    hp += '<h3>🤝 Cupones por aliado</h3>';
    const aliados = Object.values(porAliado).sort((a,b) => b.obsequiados - a.obsequiados);
    hp += '<div class="tabla-wrap"><table class="tabla"><tr><th>Aliado</th><th>Premios</th><th>Obsequiados</th><th>Consumidos</th><th>Canjeados</th><th>% uso</th></tr>';
    aliados.forEach(a => {
      const uso = a.obsequiados > 0 ? Math.round((a.consumidos/a.obsequiados)*100) : 0;
      hp += `<tr><td>${esc(a.aliado)}</td><td>${a.total}</td><td>${a.obsequiados}</td><td>${a.consumidos}</td><td>${a.canjeadas}</td><td>${uso}%</td></tr>`;
    });
    hp += '</table></div>';

    document.getElementById('zonaPremiaciones').innerHTML = hp;
  }

  // ============ CORTESÍAS ============
  if(!cortesias || cortesias.length === 0){
    document.getElementById('tablaCortesias').innerHTML = '<p class="suave">Sin cortesías creadas todavía.</p>';
  } else {
        let h = `<table class="tabla"><tr><th>Beneficiario</th><th>Tipo</th><th>Razón / Concurso</th><th>Aliado</th><th>Días</th><th>Estado</th><th>Cupones</th><th>✅ D1</th><th>✅ D2</th></tr>`;
    cortesias.forEach(c => {
      let nombre, tipo, razonCol, aliadoCol, cuponesCol;
      if(c.tipo === 'premiacion'){
        nombre = 'Ganador de premiación';
        tipo = '<span class="pill pill-amarillo">Premiación</span>';
        razonCol = esc(c.concurso || '-');
        aliadoCol = esc(c.aliado || '-');
        const consumidos = c.cupones_consumidos || 0;
        const total = c.cupones_total || 0;
        cuponesCol = c.canjeado_at ? `<span class="pill pill-verde">${consumidos}/${total}</span>` : `<span class="pill pill-azul">0/${total}</span>`;
      } else if(c.tipo === 'lista'){
        nombre = c.nombre_organizacion || 'Lista';
        tipo = 'Lista';
        razonCol = esc(razonLegible(c.razon, c.causa));
        aliadoCol = '-';
        cuponesCol = '-';
      } else {
        nombre = 'Pase individual';
        tipo = 'Individual';
        razonCol = esc(razonLegible(c.razon, c.causa));
        aliadoCol = '-';
        cuponesCol = '-';
      }
      const estado = c.estado === 'activa' ? '<span class="pill pill-verde">Activa</span>' : '<span class="pill pill-rojo">Anulada</span>';
      h += `<tr><td>${esc(nombre)}</td><td>${tipo}</td><td>${razonCol}</td><td>${aliadoCol}</td><td>${diasTexto(c.dia1, c.dia2)}</td><td>${estado}</td><td>${cuponesCol}</td><td>${c.aut_dia1}</td><td>${c.aut_dia2}</td></tr>`;
    });
    h += `</table>`;
    document.getElementById('tablaCortesias').innerHTML = h;
  }

  // ============ COORDINADORES ============
  if(!d.coordinadores || d.coordinadores.length === 0){
    document.getElementById('tablaCoordinadores').innerHTML = '<p class="suave">Sin coordinadores creados.</p>';
  } else {
    let h = `<table class="tabla"><tr><th>Tipo</th><th>Nombre</th><th>Código</th><th>Estado</th></tr>`;
    d.coordinadores.forEach(c => {
      const estado = c.activo ? '<span class="pill pill-verde">Activo</span>' : '<span class="pill pill-rojo">Revocado</span>';
      h += `<tr><td>${c.tipo === 'talentos' ? 'Talentos' : 'Stands'}</td><td>${esc(c.nombre)}</td><td>${esc(c.codigo)}</td><td>${estado}</td></tr>`;
    });
    h += `</table>`;
    document.getElementById('tablaCoordinadores').innerHTML = h;
  }

  document.getElementById('panelCarga').style.display = 'none';
  document.getElementById('contenido').style.display = 'block';
}

(async () => {
  try{
    const d = await llamar('f_admin_segmentacion', { p_token: token });
    if(!d){
      alert('No se pudo cargar la segmentación. Verifica tu sesión.');
      borrarSesion();
      location.href = 'index.html';
      return;
    }
    renderizar(d);

    // Cargar tiempos de gestión (no bloquea si falla)
    try{
      const t = await llamar('f_admin_tiempos', { p_token: token });
      renderTiempos(t);
    }catch(e){
      document.getElementById('zonaTiempos').innerHTML = '<p class="suave">No se pudieron cargar los tiempos: ' + esc(e.message || e) + '</p>';
    }
  }catch(e){
    document.getElementById('panelCarga').innerHTML = `<p class="suave texto-error">Error al cargar: ${esc(e.message || e)}</p>`;
  }
})();
// P0-04: los anchos de las barras se aplican por CSSOM (propiedad), no con el atributo style
// inline, para poder cerrar style-src en la CSP. Un MutationObserver los refresca
// cada vez que se repinta un panel.
function aplicarAnchosBarras(){
  var nodos = document.querySelectorAll('[data-ancho]');
  for (var i = 0; i < nodos.length; i++) {
    var v = nodos[i].getAttribute('data-ancho');
    nodos[i].style.width = (v === null ? '' : v + '%');
  }
}
aplicarAnchosBarras();
new MutationObserver(aplicarAnchosBarras).observe(document.body, { childList: true, subtree: true });
