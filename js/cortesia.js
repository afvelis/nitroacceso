const INSTAGRAM_URL = 'https://www.instagram.com/nitrotoon';
const params = new URLSearchParams(location.search);
const codigo = (params.get('c') || '').trim();
const contenido = document.getElementById('contenido');

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
function urlWA(texto){ return 'https://wa.me/?text=' + encodeURIComponent(texto); }
function urlMail(asunto, cuerpo){ return 'mailto:?subject=' + encodeURIComponent(asunto) + '&body=' + encodeURIComponent(cuerpo); }

async function copiarTexto(texto, btn){
  const original = btn.textContent;
  try{
    await navigator.clipboard.writeText(texto);
    btn.textContent = '¡Copiado!';
    setTimeout(() => { btn.textContent = original; }, 2000);
  }catch(e){
    const ta = document.createElement('textarea');
    ta.value = texto;
    document.body.appendChild(ta);
    ta.select();
    try{
      document.execCommand('copy');
      btn.textContent = '¡Copiado!';
      setTimeout(() => { btn.textContent = original; }, 2000);
    }catch(e2){
      alert('No se pudo copiar automático. Copia manual: ' + texto);
    }
    document.body.removeChild(ta);
  }
}

function tarjetaError(titulo, texto){
  contenido.innerHTML = `
    <div class="tarjeta">
      <h2>${titulo}</h2>
      <div class="aviso aviso-rojo">${texto}</div>
    </div>`;
}

function pantallaEventoCulminado(){
  contenido.innerHTML = `
    <div class="tarjeta">
      <div class="culminado">
        <span class="icono">🎉</span>
        <div class="gracias">¡El evento ha culminado!</div>
        <p>Muchas gracias por su apoyo y convicción.</p>
        <p>Los esperamos en la próxima edición de <strong>NitroSystem</strong>.</p>
        <a class="instagram-btn" href="${INSTAGRAM_URL}" target="_blank" rel="noopener">📸 Síguenos en Instagram @nitrotoon</a>
      </div>
    </div>`;
}

function tarjetaDiaCerrado(dia){
  const nombreDia = (dia === 1) ? 'Día 1' : 'Día 2';
  return `<div class="tarjeta">
    <h2>📅 ${nombreDia}</h2>
    <div class="aviso aviso-rojo aviso-grande">
      <strong>Su invitación estaba autorizada para el ${nombreDia} del evento exclusivamente.</strong><br><br>
      Muchas gracias, lo invitamos a adquirir sus entradas para el otro día del evento en taquilla.
    </div>
  </div>`;
}

function formatearFecha(iso){
  try{
    const fecha = new Date(iso).toLocaleDateString('es-VE');
    const hora = new Date(iso).toLocaleTimeString('es-VE', { hour:'2-digit', minute:'2-digit' });
    return { fecha, hora };
  }catch(e){ return { fecha:'', hora:'' }; }
}

function pantallaPremiacion(d){
  const persona = d.individuales || {};
  const nombreCompleto = ((persona.nombre || '') + ' ' + (persona.apellido || '')).trim();
  const cupones = d.cupones_total || 0;
  const acompanantes = Math.max(0, cupones - 1);
  const linkEntrega = BASE + 'cortesia.html?c=' + codigo;

  let textoAcomp = '';
  if (acompanantes === 0){
    textoAcomp = 'Tu premio es una entrada individual gratuita.';
  } else if (acompanantes === 1){
    textoAcomp = 'Tu premio es 1 entrada gratis para ti y 1 acompañante. El ganador y su acompañante deben presentarse en la puerta juntos.';
  } else {
    textoAcomp = 'Tu premio son ' + cupones + ' entradas gratuitas para ti y ' + acompanantes + ' acompañantes. El ganador y sus acompañantes deben presentarse en la puerta juntos.';
  }

  let mensajeWA = 'Hola ' + nombreCompleto + ', ¡felicidades! Ganaste en ' + (d.concurso || 'el concurso') + '. Aquí está tu pase de premiación para NitroSystem: ' + linkEntrega;

  let html = '';
  html += '<div class="tarjeta">';
  html += '<div class="premiacion">';
  html += '<span class="icono-premio">🏆</span>';
  html += '<div class="gracias-premio">¡Felicidades, ' + escaparHtml(nombreCompleto) + '!</div>';
  html += '<div class="concurso">Ganaste en: <strong>' + escaparHtml(d.concurso || '-') + '</strong></div>';
  html += '</div>';

  if (d.canjeado_at){
    const f = formatearFecha(d.canjeado_at);
    html += '<div class="aviso aviso-rojo aviso-grande" style="margin-top:14px">';
    html += '<span class="canjeada-icono">✅</span>';
    html += '<strong>Tu premio ya fue canjeado.</strong><br>';
    html += 'Validado el <strong>' + f.fecha + '</strong> a las <strong>' + f.hora + '</strong>.<br><br>';
    html += 'Para pases adicionales puedes comprarlos directamente por taquilla.';
    html += '</div>';
    html += '<p class="nota">📌 <strong>Recuerda:</strong> tus acompañantes debían llegar contigo al momento de presentar tu premio para que su entrada fuera válida.</p>';
  } else {
    html += '<div class="detalle-cupones">' + textoAcomp + '</div>';
    html += '<div class="qr-box" id="qr-premio"></div>';
    html += '<p class="nota">📌 Muestra este QR en la puerta. Recuerda que tus acompañantes deben llegar contigo al momento de presentar tu premio para que su entrada sea válida.</p>';
  }

  html += '</div>';

  html += '<div class="tarjeta">';
  html += '<h2>📤 Compartir este pase</h2>';
  html += '<div class="link-box">' + escaparHtml(linkEntrega) + '</div>';
  html += '<div class="fila-botones">';
  html += '<button class="btn" id="btnCopiarLink">📋 Copiar link</button>';
  html += '<a class="btn btn-azul" id="btnWA" target="_blank" rel="noopener">📱 WhatsApp</a>';
  html += '<a class="btn btn-gris" id="btnMail">✉️ Correo</a>';
  html += '</div>';
  html += '</div>';

  contenido.innerHTML = html;

  // QR solo si no está canjeado
  if (!d.canjeado_at && persona.codigo_qr){
    const el = document.getElementById('qr-premio');
    if (el) ponerQR(el, urlPuerta('ci', persona.codigo_qr), persona.codigo_qr);
  }

  document.getElementById('btnCopiarLink').addEventListener('click', (e) => copiarTexto(linkEntrega, e.target));
  document.getElementById('btnWA').href = urlWA(mensajeWA);
  document.getElementById('btnMail').href = urlMail('Pase de premiación NitroSystem', mensajeWA);
}

function renderizar(d){
  if (d.tipo === 'premiacion'){
    // Si el día autorizado de la premiación ya cerró, mostrar aviso (siempre y cuando no sea ya "evento culminado")
    const dia1Cerrado = !!d.dia1_cerrado;
    const dia2Cerrado = !!d.dia2_cerrado;
    const aplicaDia1 = !!d.dia1;
    const aplicaDia2 = !!d.dia2;
    const dia1Vigente = aplicaDia1 && !dia1Cerrado;
    const dia2Vigente = aplicaDia2 && !dia2Cerrado;
    const algunoVigente = dia1Vigente || dia2Vigente;

    if (!algunoVigente){
      // Todos los días autorizados cerraron
      const diaMostrar = aplicaDia1 ? 1 : 2;
      contenido.innerHTML = tarjetaDiaCerrado(diaMostrar);
      return;
    }
    pantallaPremiacion(d);
    return;
  }

  const esLista = d.tipo === 'lista';
  const tituloPrincipal = esLista ? d.nombre_organizacion : (d.individuales ? d.individuales.nombre + ' ' + d.individuales.apellido : '');
  const linkEntrega = BASE + 'cortesia.html?c=' + codigo;

  let mensajeWA;
  if(esLista){
    mensajeWA = `Hola, aquí está el pase de cortesía de ${d.nombre_organizacion} para NitroSystem (${razonLegible(d.razon, d.causa)}). Abre este link para ver los QR: ${linkEntrega}`;
  }else{
    mensajeWA = `Hola ${tituloPrincipal}, aquí está tu pase de cortesía para NitroSystem (${razonLegible(d.razon, d.causa)}). Abre este link para ver tu QR: ${linkEntrega}`;
  }

  const dia1Vigente = d.dia1 && !d.dia1_cerrado;
  const dia2Vigente = d.dia2 && !d.dia2_cerrado;
  const algunDiaVigente = dia1Vigente || dia2Vigente;

  let html = '';
  html += `<div class="tarjeta">
    <h2>🎁 Pase de cortesía</h2>
    <div class="dato"><strong>${esLista ? 'Organización' : 'Beneficiario'}</strong><span>${escaparHtml(tituloPrincipal)}</span></div>
    <div class="dato"><strong>Razón</strong><span class="pill pill-morado">${escaparHtml(razonLegible(d.razon, d.causa))}</span></div>
    <div class="dato"><strong>Válido para</strong><span class="pill ${algunDiaVigente ? 'pill-azul' : 'pill-rojo'}">${diasTexto(d.dia1, d.dia2)}</span></div>
    <div class="dato"><strong>Modalidad</strong><span class="pill pill-verde">${esLista ? 'Lista (' + (d.listas ? d.listas.length : 0) + ' QR por día)' : 'Pase individual'}</span></div>`;

  if(!algunDiaVigente){
    html += `<div class="aviso aviso-rojo aviso-grande" style="margin-top:14px">
      ⛔ <strong>Esta cortesía ya no tiene días vigentes.</strong><br>
      Todos los días aprobados ya cerraron. Los QR ya no funcionan en la puerta.
    </div>`;
  }
  html += `</div>`;

  if(esLista && d.listas){
    d.listas.forEach(l => {
      const diaCerrado = (l.dia === 1 && d.dia1_cerrado) || (l.dia === 2 && d.dia2_cerrado);
      if(diaCerrado){ html += tarjetaDiaCerrado(l.dia); return; }
      const totalPersonas = l.personas.length;
      const autorizadas = l.personas.filter(p => p.estado === 'autorizado').length;
      const completada = totalPersonas > 0 && totalPersonas === autorizadas;
      html += `<div class="tarjeta">`;
      if(completada){
        html += `<h2>📅 Día ${l.dia}</h2>`;
        html += `<div class="aviso aviso-verde">✅ LISTA COMPLETADA<br>Las ${totalPersonas} personas de esta lista ya ingresaron al evento. Este QR ya no es válido.</div>`;
        html += `<div><strong style="color:var(--suave);font-size:14px">Personas que ingresaron:</strong>
          <ul class="nombres">${l.personas.map(p => `<li>✅ ${escaparHtml(p.nombre)} ${escaparHtml(p.apellido)}</li>`).join('')}</ul>
        </div>`;
      } else {
        html += `<h2>📅 QR del Día ${l.dia}</h2>`;
        html += `<p style="color:var(--suave);font-size:15px">Muestra este QR en la puerta el Día ${l.dia}. Todas las personas de la lista entran con este único QR.</p>`;
        html += `<div class="qr-box" id="qr-dia-${l.dia}"></div>`;
        html += `<div><strong style="color:var(--suave);font-size:14px">Personas en esta lista (${autorizadas}/${totalPersonas} han entrado):</strong>
          <ul class="nombres">${l.personas.map(p => `<li>${p.estado === 'autorizado' ? '✅ ' : '⏳ '}${escaparHtml(p.nombre)} ${escaparHtml(p.apellido)}</li>`).join('')}</ul>
        </div>`;
      }
      html += `</div>`;
    });
  } else if(d.individuales){
    let diaCerradoIndividual = false;
    let diaMostrar = null;
    if(d.dia1 && !d.dia2){ diaCerradoIndividual = d.dia1_cerrado; diaMostrar = 1; }
    else if(d.dia2 && !d.dia1){ diaCerradoIndividual = d.dia2_cerrado; diaMostrar = 2; }
    const ambosCerrados = d.dia1 && d.dia2 && d.dia1_cerrado && d.dia2_cerrado;
    const unicoCerrado = diaMostrar !== null && diaCerradoIndividual;
    if(unicoCerrado){ html += tarjetaDiaCerrado(diaMostrar); }
    else if(ambosCerrados){ html += tarjetaDiaCerrado(1); }
    else {
      html += `<div class="tarjeta">
        <h2>🎟️ Tu QR personal</h2>
        <p style="color:var(--suave);font-size:15px">Muestra este QR en la puerta los días aprobados. Es personal e intransferible.</p>
        <div class="qr-box" id="qr-ind"></div>
      </div>`;
    }
  }

  html += `<div class="tarjeta">
    <h2>📤 Compartir este pase</h2>
    <div class="link-box">${escaparHtml(linkEntrega)}</div>
    <div class="fila-botones">
      <button class="btn" id="btnCopiarLink">📋 Copiar link</button>
      <a class="btn btn-azul" id="btnWA" target="_blank" rel="noopener">📱 WhatsApp</a>
      <a class="btn btn-gris" id="btnMail">✉️ Correo</a>
    </div>
    <div class="aviso aviso-verde" style="margin-top:14px">Si el QR no escanea en la puerta, el personal puede escribir el código que aparece debajo del QR.</div>
  </div>`;

  contenido.innerHTML = html;

  if(esLista && d.listas){
    d.listas.forEach(l => {
      const diaCerrado = (l.dia === 1 && d.dia1_cerrado) || (l.dia === 2 && d.dia2_cerrado);
      if(diaCerrado) return;
      const totalPersonas = l.personas.length;
      const autorizadas = l.personas.filter(p => p.estado === 'autorizado').length;
      const completada = totalPersonas > 0 && totalPersonas === autorizadas;
      if(!completada){
        const el = document.getElementById('qr-dia-' + l.dia);
        if(el) ponerQR(el, urlPuerta('cl', l.codigo_corto), l.codigo_corto);
      }
    });
  } else if(d.individuales){
    const ambosCerrados = d.dia1 && d.dia2 && d.dia1_cerrado && d.dia2_cerrado;
    const unicoCerrado = (d.dia1 && !d.dia2 && d.dia1_cerrado) || (d.dia2 && !d.dia1 && d.dia2_cerrado);
    if(!ambosCerrados && !unicoCerrado){
      const el = document.getElementById('qr-ind');
      if(el) ponerQR(el, urlPuerta('ci', d.individuales.codigo_qr), d.individuales.codigo_qr);
    }
  }

  document.getElementById('btnCopiarLink').addEventListener('click', (e) => copiarTexto(linkEntrega, e.target));
  document.getElementById('btnWA').href = urlWA(mensajeWA);
  document.getElementById('btnMail').href = urlMail('Pase de cortesía NitroSystem', mensajeWA);
}

(function(){
  if(!codigo){
    tarjetaError('⚠️ Link incompleto', 'Este link no tiene código de cortesía. Verifica que copiaste el link completo o comunícate con el administrador.');
    return;
  }

  llamar('f_cortesia_ver', { p_codigo_link: codigo })
    .then(d => {
      if(!d){ tarjetaError('⚠️ Link no válido', 'Este código de cortesía no existe. Comunícate con el administrador.'); return; }
      if(d.anulada){
        tarjetaError('⛔ Cortesía anulada', 'Esta cortesía fue anulada por el administrador y ya no es válida. Comunícate con el administrador si crees que es un error.');
        return;
      }

      // Prioridad 1: si ambos días cerraron → evento culminado
      if(d.dia1_cerrado && d.dia2_cerrado){ pantallaEventoCulminado(); return; }

      // Verificación general de consumido (individual normal)
      if(d.tipo === 'individual' && d.individuales && d.individuales.consumido){
        let msg = 'Este pase de cortesía ya fue utilizado y no puede volver a usarse.';
        if(d.individuales.hora_consumo){
          const f = formatearFecha(d.individuales.hora_consumo);
          msg = `Este pase ya fue utilizado. Validado el <strong>${f.fecha}</strong> a las <strong>${f.hora}</strong>. No se puede autorizar de nuevo.`;
        }
        tarjetaError('⛔ Entrada ya consumida', msg);
        return;
      }

      renderizar(d);
    })
    .catch(e => { tarjetaError('⚠️ Error', 'No se pudo cargar la cortesía: ' + escaparHtml(e.message || e)); });
})();

