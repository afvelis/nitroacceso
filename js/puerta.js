// ===== Modal estético propio (regla v2.1: prohibido alert/confirm/prompt nativos) =====
function modalAlert(mensaje, titulo){
  titulo = titulo || 'Aviso';
  return new Promise(resolve => {
    const fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    fondo.innerHTML =
      '<div class="modal-caja">' +
        '<div class="modal-titulo">' + escaparHtml(titulo) + '</div>' +
        '<div class="modal-mensaje">' + escaparHtml(mensaje) + '</div>' +
        '<div class="modal-acciones"><button class="btn" id="modalOkBtn">Aceptar</button></div>' +
      '</div>';
    document.body.appendChild(fondo);
    const cerrar = () => { fondo.remove(); resolve(true); };
    fondo.querySelector('#modalOkBtn').addEventListener('click', cerrar);
    fondo.addEventListener('click', e => { if(e.target === fondo) cerrar(); });
  });
}
function modalConfirm(mensaje, titulo){
  titulo = titulo || 'Confirmar';
  return new Promise(resolve => {
    const fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    fondo.innerHTML =
      '<div class="modal-caja">' +
        '<div class="modal-titulo">' + escaparHtml(titulo) + '</div>' +
        '<div class="modal-mensaje">' + escaparHtml(mensaje) + '</div>' +
        '<div class="modal-acciones">' +
          '<button class="btn btn-gris" id="modalCancelarBtn">Cancelar</button>' +
          '<button class="btn" id="modalAceptarBtn">Aceptar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(fondo);
    const cerrar = v => { fondo.remove(); resolve(v); };
    fondo.querySelector('#modalCancelarBtn').addEventListener('click', () => cerrar(false));
    fondo.querySelector('#modalAceptarBtn').addEventListener('click', () => cerrar(true));
    fondo.addEventListener('click', e => { if(e.target === fondo) cerrar(false); });
  });
}
function modalPrompt(mensaje, valorInicial, titulo){
  titulo = titulo || 'Ingresar';
  return new Promise(resolve => {
    const fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    fondo.innerHTML =
      '<div class="modal-caja">' +
        '<div class="modal-titulo">' + escaparHtml(titulo) + '</div>' +
        '<div class="modal-mensaje">' + escaparHtml(mensaje) + '</div>' +
        '<input type="text" id="modalPromptInput" class="mb-14">' +
        '<div class="modal-acciones">' +
          '<button class="btn btn-gris" id="modalCancelarBtn">Cancelar</button>' +
          '<button class="btn" id="modalAceptarBtn">Aceptar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(fondo);
    const inp = fondo.querySelector('#modalPromptInput');
    inp.value = valorInicial || '';
    setTimeout(() => inp.focus(), 50);
    const cerrar = v => { fondo.remove(); resolve(v); };
    fondo.querySelector('#modalCancelarBtn').addEventListener('click', () => cerrar(null));
    fondo.querySelector('#modalAceptarBtn').addEventListener('click', () => cerrar(inp.value));
    inp.addEventListener('keydown', e => {
      if(e.key === 'Enter') cerrar(inp.value);
      if(e.key === 'Escape') cerrar(null);
    });
  });
}
// Sobrescritura: alert() nativo → modal propio (no bloquea, no requiere tocar las ~25 llamadas existentes)
window.alert = function(msg){ modalAlert(String(msg)); };
// ===== fin modal estético =====
const elPin = document.getElementById('pin');
const btnEntrar = document.getElementById('btnEntrar');
const tarjetaLogin = document.getElementById('tarjetaLogin');
const tarjetaEventoAbierto = document.getElementById('tarjetaEventoAbierto');
const tarjetaPrincipal = document.getElementById('tarjetaPrincipal');
const btnSalirEventoAbierto = document.getElementById('btnSalirEventoAbierto');
const btnDia1 = document.getElementById('btnDia1');
const btnDia2 = document.getElementById('btnDia2');
const estadoDia1 = document.getElementById('estadoDia1');
const estadoDia2 = document.getElementById('estadoDia2');
const panelCerrarDia1 = document.getElementById('panelCerrarDia1');
const btnCerrarDia1 = document.getElementById('btnCerrarDia1');
const panelEscaneo = document.getElementById('panelEscaneo');
const avisoDia = document.getElementById('avisoDia');
const btnEscanear = document.getElementById('btnEscanear');
const inputManual = document.getElementById('inputManual');
const btnBuscarManual = document.getElementById('btnBuscarManual');
const visorContainer = document.getElementById('visorContainer');
const visorQR = document.getElementById('visorQR');
const btnDetenerScan = document.getElementById('btnDetenerScan');
const panelResultado = document.getElementById('panelResultado');
const barraSiguiente = document.getElementById('barraSiguiente');
const btnSiguiente = document.getElementById('btnSiguiente');
const btnSalir = document.getElementById('btnSalir');

let diaSeleccionado = null;
let diaActivo = 1;
let tokenSesion = null;
let streamVideo = null;
let scanningInterval = null;
let listaActualId = null;
let listaActualCodigo = null;

// ===== P0-03 · Auto-bloqueo por inactividad (5 min) =====
// Candado local: garantiza que iniciarAutoBloqueo() corra UNA sola vez por
// carga de página, sin importar por dónde entre (login o sesión existente).
let naAutoBloqueoActivo = false;
function activarAutoBloqueo(){
  if(naAutoBloqueoActivo) return;
  naAutoBloqueoActivo = true;
  iniciarAutoBloqueo();
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

function mostrarPrincipal(){
  tarjetaLogin.style.display = 'none';
  tarjetaEventoAbierto.style.display = 'none';
  tarjetaPrincipal.style.display = 'block';
}

function mostrarEventoAbierto(){
  tarjetaLogin.style.display = 'none';
  tarjetaPrincipal.style.display = 'none';
  tarjetaEventoAbierto.style.display = 'block';
}

function actualizarSelectorDia(){
  if(diaActivo === 1){
    btnDia1.disabled = false;
    btnDia2.disabled = true;
    estadoDia1.textContent = '';
    estadoDia2.textContent = '🔒 Disponible al cerrar Día 1';
    panelCerrarDia1.style.display = 'block';
  }else{
    btnDia1.disabled = true;
    btnDia2.disabled = false;
    estadoDia1.textContent = '✅ Cerrado';
    estadoDia2.textContent = '';
    panelCerrarDia1.style.display = 'none';
  }
  seleccionarDia(diaActivo, false);
}

function seleccionarDia(dia, permitirCambio = true){
  if(dia !== diaActivo){
    alert('No puedes cambiar a un día que no está activo.');
    return;
  }
  diaSeleccionado = dia;
  if(dia === 1){
    btnDia1.classList.add('activo');
    btnDia2.classList.remove('activo');
  }else{
    btnDia2.classList.add('activo');
    btnDia1.classList.remove('activo');
  }
  panelEscaneo.style.display = 'block';
  avisoDia.textContent = `✓ Controlando entrada del Día ${dia}`;
}

btnDia1.addEventListener('click', () => seleccionarDia(1));
btnDia2.addEventListener('click', () => seleccionarDia(2));

btnCerrarDia1.addEventListener('click', async () => {
  if(!await modalConfirm('¿Cerrar el Día 1 y activar el Día 2?\n\nAl confirmar:\n• Se cerrarán TODAS las listas abiertas del Día 1.\n• Las personas pendientes de esas listas ya no podrán entrar.\n• El control pasará al Día 2.\n\nEsta acción no se puede deshacer.', 'Cerrar Día 1')){
    return;
  }
  btnCerrarDia1.disabled = true;
  btnCerrarDia1.textContent = 'Cerrando Día 1...';
  try{
    const res = await llamar('f_puerta_cerrar_dia_y_activar_siguiente', { p_token: tokenSesion });
    if(res && res.ok){
      diaActivo = res.dia_nuevo;
      actualizarSelectorDia();
      alert('✅ Día ' + res.dia_cerrado + ' cerrado.\nListas cerradas: ' + res.listas_cerradas + '.\nDía ' + res.dia_nuevo + ' activado.');
    }else{
      const err = (res && res.error) || 'desconocido';
      alert('No se pudo cerrar el Día 1 (' + err + ').');
      btnCerrarDia1.disabled = false;
      btnCerrarDia1.textContent = '🔒 Cerrar Día 1 y activar Día 2';
    }
  }catch(e){
    alert('Error: ' + (e.message || e));
    btnCerrarDia1.disabled = false;
    btnCerrarDia1.textContent = '🔒 Cerrar Día 1 y activar Día 2';
  }
});

async function verificarEstadoEvento(){
  try{
    const estado = await llamar('f_puerta_estado', { p_token: tokenSesion });
    if(!estado){
      alert('No se pudo verificar el estado del evento.');
      borrarSesion();
      location.reload();
      return;
    }
    if(estado.edicion_abierta){
      mostrarEventoAbierto();
      return;
    }
    diaActivo = estado.dia_activo || 1;
    mostrarPrincipal();
    actualizarSelectorDia();
  }catch(e){
    alert('Error al verificar el evento: ' + (e.message || e));
  }
}

btnEntrar.addEventListener('click', async () => {
  const pin = elPin.value.trim();
  if(!pin){ alert('Escribe el PIN de puerta.'); return; }
  btnEntrar.disabled = true;
  btnEntrar.textContent = 'Entrando...';
  try{
    const r = await llamar('f_login', { p_pin: pin });
    if(!r || r.length === 0 || r[0].rol !== 'puerta'){
      alert('PIN incorrecto o no es de puerta.');
      btnEntrar.disabled = false;
      btnEntrar.textContent = 'Entrar';
      return;
    }
    guardarSesion(r[0].token, r[0].rol);
    tokenSesion = r[0].token;
    activarAutoBloqueo();
    await verificarEstadoEvento();
  }catch(e){
    alert('Error al entrar: ' + (e.message || e));
  }
  btnEntrar.disabled = false;
  btnEntrar.textContent = 'Entrar';
});

btnSalirEventoAbierto.addEventListener('click', () => {
  borrarSesion();
  location.reload();
});

btnSalir.addEventListener('click', async () => {
  if(await modalConfirm('¿Cerrar sesión de puerta?', 'Cerrar sesión')){
    detenerScanner();
    borrarSesion();
    location.reload();
  }
});

function mostrarPanel(html){
  panelResultado.innerHTML = html;
  panelResultado.style.display = 'block';
  barraSiguiente.style.display = 'block';
  try{ panelResultado.scrollIntoView({ behavior: 'smooth', block: 'start' }); }catch(e){}
}

function mostrarCargando(msg){
  panelResultado.innerHTML = `<div class="aviso">${escaparHtml(msg)}</div>`;
  panelResultado.style.display = 'block';
  barraSiguiente.style.display = 'none';
}

function mostrarError(msg){
  panelResultado.innerHTML = `<div class="aviso aviso-rojo">${escaparHtml(msg)}</div>`;
  panelResultado.style.display = 'block';
  barraSiguiente.style.display = 'block';
}

function siguienteEscaneo(){
  panelResultado.innerHTML = '';
  panelResultado.style.display = 'none';
  barraSiguiente.style.display = 'none';
  inputManual.value = '';
  iniciarScanner();
}

btnSiguiente.addEventListener('click', siguienteEscaneo);

function cargarJsQR(callback){
  if(window.jsQR){ callback(true); return; }
  const script = document.createElement('script');
  // P0-04: jsQR se sirve desde este mismo sitio (vendor/). Antes venía de un CDN
  // externo: si fallaba, no había lectura por cámara; si estaba comprometido,
  // podía ejecutar código en la puerta. El respaldo manual sigue igual.
  script.src = 'vendor/jsqr-1.4.0.js';
  script.onload = () => callback(true);
  script.onerror = () => callback(false);
  document.head.appendChild(script);
}

async function iniciarScanner(){
  if(!diaSeleccionado){ alert('Selecciona un día primero.'); return; }
  panelResultado.innerHTML = '';
  panelResultado.style.display = 'none';
  barraSiguiente.style.display = 'none';
  visorContainer.style.display = 'block';
  try{
    streamVideo = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    visorQR.srcObject = streamVideo;
    await visorQR.play();
  }catch(e){
    visorContainer.style.display = 'none';
    alert('No se pudo acceder a la cámara. Usa el código manual o el buscador por nombre.');
    return;
  }
  if('BarcodeDetector' in window){
    try{
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      scanningInterval = setInterval(async () => {
        if(!visorQR.videoWidth) return;
        try{
          const codigos = await detector.detect(visorQR);
          if(codigos && codigos.length > 0){
            procesarQRLeido(codigos[0].rawValue);
          }
        }catch(e){}
      }, 300);
      return;
    }catch(e){}
  }
  cargarJsQR(function(exito){
    if(!exito){
      visorContainer.style.display = 'none';
      alert('Tu navegador no soporta lectura de QR y no se pudo cargar el respaldo. Usa el código manual o el buscador por nombre.');
      detenerScanner();
      return;
    }
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    scanningInterval = setInterval(() => {
      if(!visorQR.videoWidth) return;
      canvas.width = visorQR.videoWidth;
      canvas.height = visorQR.videoHeight;
      ctx.drawImage(visorQR, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      try{
        const code = window.jsQR(imageData.data, imageData.width, imageData.height);
        if(code && code.data){
          procesarQRLeido(code.data);
        }
      }catch(e){}
    }, 300);
  });
}

function detenerScanner(){
  if(scanningInterval){
    clearInterval(scanningInterval);
    scanningInterval = null;
  }
  if(streamVideo){
    streamVideo.getTracks().forEach(t => t.stop());
    streamVideo = null;
  }
  visorContainer.style.display = 'none';
}

function extraerCodigo(valor){
  try{
    const url = new URL(valor);
    const params = url.searchParams;
    if(params.has('lista')) return params.get('lista');
    if(params.has('v')) return params.get('v');
    if(params.has('cl')) return params.get('cl');
    if(params.has('ci')) return params.get('ci');
  }catch(e){}
  const limpio = valor.trim().toUpperCase();
  if(limpio.startsWith('CL-') || limpio.startsWith('CI-') || limpio.startsWith('L-') || limpio.startsWith('V-') || limpio.startsWith('PR-')) return limpio;
  return valor;
}

function procesarQRLeido(valor){
  detenerScanner();
  const codigo = extraerCodigo(valor);
  const limpio = codigo.toUpperCase();
  if(limpio.startsWith('V-')){
    inputManual.value = codigo;
    buscarVendedor(codigo);
  }else if(limpio.startsWith('CL-')){
    inputManual.value = codigo;
    buscarCortesiaLista(codigo);
   }else if(limpio.startsWith('CI-')){
    inputManual.value = codigo;
    buscarCortesiaIndividual(codigo);
  }else if(limpio.startsWith('PR-')){
    inputManual.value = codigo;
    buscarPremiacion(codigo);
  }else if(limpio.startsWith('L-')){
    inputManual.value = codigo;
    buscarListaPorCodigo(codigo);
  }else{
    mostrarError('QR leído pero no reconocido: ' + codigo);
  }
}

btnEscanear.addEventListener('click', iniciarScanner);
btnDetenerScan.addEventListener('click', detenerScanner);

btnBuscarManual.addEventListener('click', () => {
  const texto = inputManual.value.trim();
  if(!texto){ alert('Escribe un código o nombre.'); return; }
  const limpio = texto.toUpperCase();
  if(limpio.startsWith('V-')){
    buscarVendedor(limpio);
  }else if(limpio.startsWith('CL-')){
    buscarCortesiaLista(limpio);
    }else if(limpio.startsWith('CI-')){
    buscarCortesiaIndividual(limpio);
  }else if(limpio.startsWith('PR-')){
    buscarPremiacion(limpio);
  }else if(limpio.startsWith('L-')){
    buscarListaPorCodigo(limpio);
  }else{
    buscarListaPorNombre(texto);
  }
});

async function buscarVendedor(codigoQR){
  mostrarCargando('Buscando vendedor...');
  try{
    const vendedor = await llamar('f_puerta_vendedor_por_qr', {
      p_token: tokenSesion,
      p_codigo_qr: codigoQR
    });
    if(!vendedor){
      mostrarError('No se encontró vendedor con ese QR.');
      return;
    }
    const estadoDia = diaSeleccionado === 1 ? vendedor.estado_dia1 : vendedor.estado_dia2;
    const marcadoDia = diaSeleccionado === 1 ? vendedor.marcado_dia1_at : vendedor.marcado_dia2_at;
    const yaAutorizado = estadoDia === 'autorizado';
    
    let html = `<div class="resultado ${yaAutorizado ? 'bloqueado' : ''}">`;
    html += `<div class="dato"><strong>Tipo</strong><span class="pill pill-azul">Vendedor de stand</span></div>`;
    html += `<div class="dato"><strong>Nombre</strong><span>${escaparHtml(vendedor.nombre)} ${escaparHtml(vendedor.apellido)}</span></div>`;
    html += `<div class="dato"><strong>Cédula</strong><span>${escaparHtml(vendedor.cedula)}</span></div>`;
    if(vendedor.empresa) html += `<div class="dato"><strong>Empresa</strong><span>${escaparHtml(vendedor.empresa)}</span></div>`;
    html += `<div class="dato"><strong>Día</strong><span>Día ${diaSeleccionado}</span></div>`;
    
    if(yaAutorizado){
      const fecha = marcadoDia ? new Date(marcadoDia).toLocaleDateString('es-VE') : 'fecha no registrada';
      const hora = marcadoDia ? new Date(marcadoDia).toLocaleTimeString('es-VE') : 'hora no registrada';
      html += `<div class="aviso aviso-rojo">⛔ ENTRADA YA CONSUMADA<br>Este código ya fue utilizado. Validado el <strong>${fecha}</strong> a las <strong>${hora}</strong>. No se puede autorizar de nuevo.</div>`;
    }else{
      html += `<button class="btn btn-grande" id="btnAutorizarVendedor">✅ AUTORIZAR ENTRADA</button>`;
    }
    html += `</div>`;
    mostrarPanel(html);
    
    if(!yaAutorizado){
      document.getElementById('btnAutorizarVendedor').addEventListener('click', async () => {
        const btn = document.getElementById('btnAutorizarVendedor');
        btn.disabled = true;
        btn.textContent = 'Autorizando...';
        try{
          const ok = await llamar('f_puerta_marcar_vendedor', {
            p_token: tokenSesion,
            p_vendedor_id: vendedor.vendedor_id,
            p_dia: diaSeleccionado,
            p_estado: 'autorizado'
          });
          if(ok){
            buscarVendedor(codigoQR);
          }else{
            alert('No se pudo autorizar.');
            btn.disabled = false;
            btn.textContent = '✅ AUTORIZAR ENTRADA';
          }
        }catch(e){
          alert('Error: ' + (e.message || e));
          btn.disabled = false;
          btn.textContent = '✅ AUTORIZAR ENTRADA';
        }
      });
    }
  }catch(e){
    mostrarError('Error al buscar vendedor: ' + (e.message || e));
  }
}

async function buscarCortesiaLista(codigo){
  mostrarCargando('Buscando cortesía...');
  try{
    const d = await llamar('f_puerta_cortesia_lista', {
      p_token: tokenSesion,
      p_codigo_corto: codigo
    });
    if(!d){
      mostrarError('No se encontró ninguna cortesía con ese código.');
      return;
    }
    if(d.anulada){
      mostrarPanel(`<div class="resultado bloqueado"><div class="aviso aviso-rojo">⛔ CORTESÍA ANULADA<br>Este pase fue anulado por el administrador. No autorices el ingreso y notifica al administrador.</div></div>`);
      return;
    }
    if(d.dia !== diaSeleccionado){
      mostrarPanel(`<div class="resultado bloqueado"><div class="aviso aviso-rojo">⚠️ Este QR de cortesía es del Día ${d.dia}, pero estás controlando el Día ${diaSeleccionado}. No autorices con este QR en este día.</div></div>`);
      return;
    }
    const total = d.personas.length;
    const aut = d.personas.filter(p => p.estado === 'autorizado').length;
    
    // NUEVO: Si todos ya entraron, mostrar bloqueo
    if(total > 0 && total === aut){
      const ultimaPersona = d.personas[d.personas.length - 1];
      const horaUltima = ultimaPersona.marcado_at ? new Date(ultimaPersona.marcado_at).toLocaleTimeString('es-VE') : 'hora no registrada';
      const nombres = d.personas.map(p => `✅ ${escaparHtml(p.nombre)} ${escaparHtml(p.apellido)}`).join('<br>');
      mostrarPanel(`
        <div class="resultado bloqueado">
          <div class="dato"><strong>Tipo</strong><span class="pill pill-morado">Cortesía por lista</span></div>
          <div class="dato"><strong>Organización</strong><span>${escaparHtml(d.nombre_organizacion || '-')}</span></div>
          <div class="dato"><strong>Código</strong><span class="mono">${escaparHtml(d.codigo_corto)}</span></div>
          <div class="aviso aviso-rojo mt-14">
             LISTA COMPLETADA<br>
            Las ${total} personas de esta lista ya ingresaron al evento. 
            Última entrada registrada a las <strong>${horaUltima}</strong>.
            Este QR ya no es válido.
          </div>
          <div class="fila-personas">
            <div class="aviso mb-12">Personas que ingresaron:</div>
            ${nombres}
          </div>
        </div>
      `);
      return;
    }
    
    let html = `<div class="resultado">`;
    html += `<div class="dato"><strong>Tipo</strong><span class="pill pill-morado">Cortesía por lista</span></div>`;
    html += `<div class="dato"><strong>Organización</strong><span>${escaparHtml(d.nombre_organizacion || '-')}</span></div>`;
    html += `<div class="dato"><strong>Razón</strong><span>${escaparHtml(razonLegible(d.razon, d.causa))}</span></div>`;
    html += `<div class="dato"><strong>Código</strong><span class="mono">${escaparHtml(d.codigo_corto)}</span></div>`;
    html += `<div class="fila-personas">`;
    html += `<div class="aviso mb-12">Total: ${total} • ✅ Autorizados: ${aut} • ⏳ Pendientes: ${total - aut}</div>`;
    
    d.personas.forEach((p, idx) => {
      const ya = p.estado === 'autorizado';
      const hora = p.marcado_at ? new Date(p.marcado_at).toLocaleTimeString('es-VE') : '';
      html += `<div class="persona-item ${idx === d.personas.length - 1 ? 'ultimo' : ''}">`;
      html += `<div class="persona-info"><div class="persona-nombre">${escaparHtml(p.nombre)} ${escaparHtml(p.apellido)}`;
      html += ya ? `<span class="estado-badge pill-verde">✅ Entró ${hora}</span>` : `<span class="estado-badge pill-amarillo">Pendiente</span>`;
      html += `</div><div class="persona-detalle">CI: ${escaparHtml(p.cedula)}</div></div>`;
      if(ya){
        html += `<span class="pill pill-rojo"> Consumida</span>`;
      }else{
        html += `<button class="btn btn-mini" data-cpersona="${p.persona_id}">✅ Autorizar</button>`;
      }
      html += `</div>`;
    });
    html += `</div></div>`;
    mostrarPanel(html);
    
    panelResultado.querySelectorAll('button[data-cpersona]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-cpersona');
        btn.disabled = true;
        btn.textContent = 'Autorizando...';
        try{
          const ok = await llamar('f_puerta_marcar_cortesia', {
            p_token: tokenSesion,
            p_persona_id: id,
            p_dia: diaSeleccionado,
            p_estado: 'autorizado'
          });
          if(ok){
            buscarCortesiaLista(codigo);
          }else{
            alert('No se pudo autorizar esta cortesía.');
            btn.disabled = false;
            btn.textContent = '✅ Autorizar';
          }
        }catch(e){
          alert('Error: ' + (e.message || e));
          btn.disabled = false;
          btn.textContent = '✅ Autorizar';
        }
      });
    });
  }catch(e){
    mostrarError('Error al buscar cortesía: ' + (e.message || e));
  }
}

async function buscarCortesiaIndividual(codigo){
  mostrarCargando('Buscando pase de cortesía...');
  try{
    const d = await llamar('f_puerta_cortesia_individual', {
      p_token: tokenSesion,
      p_codigo_qr: codigo
    });
    if(!d){
      mostrarError('No se encontró ningún pase de cortesía con ese código.');
      return;
    }
    if(d.anulada){
      mostrarPanel(`<div class="resultado bloqueado"><div class="aviso aviso-rojo">⛔ CORTESÍA ANULADA<br>Este pase fue anulado por el administrador. No autorices el ingreso y notifica al administrador.</div></div>`);
      return;
    }
    const aprobado = diaSeleccionado === 1 ? d.dia1 : d.dia2;
    const estado = diaSeleccionado === 1 ? d.estado_dia1 : d.estado_dia2;
    const marcado = diaSeleccionado === 1 ? d.marcado_dia1_at : d.marcado_dia2_at;
    
    let html = `<div class="resultado ${estado === 'autorizado' ? 'bloqueado' : ''}">`;
    html += `<div class="dato"><strong>Tipo</strong><span class="pill pill-morado">Cortesía individual</span></div>`;
    html += `<div class="dato"><strong>Nombre</strong><span>${escaparHtml(d.nombre)} ${escaparHtml(d.apellido)}</span></div>`;
    html += `<div class="dato"><strong>Cédula</strong><span>${escaparHtml(d.cedula)}</span></div>`;
    html += `<div class="dato"><strong>Razón</strong><span>${escaparHtml(razonLegible(d.razon, d.causa))}</span></div>`;
    html += `<div class="dato"><strong>Días aprobados</strong><span>${diasTexto(d.dia1, d.dia2)}</span></div>`;
    
    if(!aprobado){
      html += `<div class="aviso aviso-rojo">⚠️ Esta cortesía NO está aprobada para el Día ${diaSeleccionado}. No autorices el ingreso.</div>`;
    }else if(estado === 'autorizado'){
      const fecha = marcado ? new Date(marcado).toLocaleDateString('es-VE') : 'fecha no registrada';
      const hora = marcado ? new Date(marcado).toLocaleTimeString('es-VE') : 'hora no registrada';
      html += `<div class="aviso aviso-rojo">⛔ ENTRADA YA CONSUMADA<br>Este pase ya fue utilizado. Validado el <strong>${fecha}</strong> a las <strong>${hora}</strong>. No se puede autorizar de nuevo.</div>`;
    }else{
      html += `<button class="btn btn-grande" id="btnAutCortesia">✅ AUTORIZAR ENTRADA</button>`;
    }
    html += `</div>`;
    mostrarPanel(html);
    
    const b = document.getElementById('btnAutCortesia');
    if(b){
      b.addEventListener('click', async () => {
        b.disabled = true;
        b.textContent = 'Autorizando...';
        try{
          const ok = await llamar('f_puerta_marcar_cortesia', {
            p_token: tokenSesion,
            p_persona_id: d.persona_id,
            p_dia: diaSeleccionado,
            p_estado: 'autorizado'
          });
          if(ok){
            buscarCortesiaIndividual(codigo);
          }else{
            alert('No se pudo autorizar esta cortesía.');
            b.disabled = false;
            b.textContent = '✅ AUTORIZAR ENTRADA';
          }
        }catch(e){
          alert('Error: ' + (e.message || e));
          b.disabled = false;
          b.textContent = '✅ AUTORIZAR ENTRADA';
        }
      });
    }
  }catch(e){
    mostrarError('Error al buscar cortesía: ' + (e.message || e));
  }
}
async function buscarPremiacion(codigoQR){
  mostrarCargando('Buscando premiación...');
  try{
    const d = await llamar('f_puerta_premiacion_por_qr', {
      p_token: tokenSesion,
      p_codigo_qr: codigoQR
    });
    if(!d){
      mostrarError('No se encontró ninguna premiación con ese código.');
      return;
    }
    if(d.anulada){
      mostrarPanel(`<div class="resultado bloqueado"><div class="aviso aviso-rojo">⛔ PREMIACIÓN ANULADA<br>Este premio fue anulado por el administrador. No autorices el ingreso.</div></div>`);
      return;
    }
    const aprobado = diaSeleccionado === 1 ? d.dia1 : d.dia2;
    const cupones = d.cupones_total || 0;
    const consumidos = d.cupones_consumidos || 0;

    let html = `<div class="resultado ${d.canjeado_at ? 'bloqueado' : ''}">`;
    html += `<div class="dato"><strong>Tipo</strong><span class="pill pill-amarillo">Premiación</span></div>`;
    html += `<div class="dato"><strong>Ganador</strong><span>${escaparHtml(d.nombre)} ${escaparHtml(d.apellido)}</span></div>`;
    html += `<div class="dato"><strong>Cédula</strong><span>${escaparHtml(d.cedula)}</span></div>`;
    html += `<div class="dato"><strong>Concurso</strong><span>${escaparHtml(d.concurso || '-')}</span></div>`;
    html += `<div class="dato"><strong>Cupones totales</strong><span>${cupones}</span></div>`;
    html += `<div class="dato"><strong>Días aprobados</strong><span>${diasTexto(d.dia1, d.dia2)}</span></div>`;

    if(d.canjeado_at){
      const fecha = new Date(d.canjeado_at).toLocaleDateString('es-VE');
      const hora = new Date(d.canjeado_at).toLocaleTimeString('es-VE');
      html += `<div class="aviso aviso-rojo">⛔ PREMIO YA CANJEADO<br>Este premio fue canjeado el <strong>${fecha}</strong> a las <strong>${hora}</strong>. Consumió ${consumidos} de ${cupones} cupones. No se puede autorizar de nuevo.</div>`;
    } else if(!aprobado){
      html += `<div class="aviso aviso-rojo">⚠️ Esta premiación NO está aprobada para el Día ${diaSeleccionado}. No autorices el ingreso.</div>`;
    } else {
      html += `<div class="aviso">🎟️ <strong>Selecciona cuántos cupones consume este premio.</strong><br>Al confirmar, el QR queda consumido del todo y no se puede usar de nuevo, aunque no se usen todos los cupones.</div>`;
      html += `<label>Cupones que consumen ahora (1 a ${cupones})</label>`;
      html += `<input type="number" id="inputCupones" min="1" max="${cupones}" value="${cupones}" class="campo-cupones">`;
      html += `<button class="btn btn-grande" id="btnCanjearPremio">✅ AUTORIZAR Y CONSUMIR PREMIO</button>`;
    }
    html += `</div>`;
    mostrarPanel(html);

    const btnCanjear = document.getElementById('btnCanjearPremio');
    if(btnCanjear){
      btnCanjear.addEventListener('click', async () => {
        const inp = document.getElementById('inputCupones');
        const n = parseInt(inp.value, 10);
        if(!n || n < 1 || n > cupones){
          alert('Número de cupones inválido. Debe ser entre 1 y ' + cupones + '.');
          return;
        }
        if(!await modalConfirm('Se consumirán ' + n + ' de ' + cupones + ' cupón(es) de este premio.\n\nEl QR completo quedará anulado y no se podrá usar de nuevo aunque sobren cupones.\n\n¿Confirmar?', 'Canjear premio')){
          return;
        }
        btnCanjear.disabled = true;
        btnCanjear.textContent = 'Canjeando...';
        try{
          const r = await llamar('f_puerta_canjear_premiacion', {
            p_token: tokenSesion,
            p_codigo_qr: codigoQR,
            p_cupones_usados: n
          });
          if(r === 'ok'){
            buscarPremiacion(codigoQR);
          }else{
            alert('No se pudo canjear: ' + (r || 'desconocido'));
            btnCanjear.disabled = false;
            btnCanjear.textContent = '✅ AUTORIZAR Y CONSUMIR PREMIO';
          }
        }catch(e){
          alert('Error: ' + (e.message || e));
          btnCanjear.disabled = false;
          btnCanjear.textContent = '✅ AUTORIZAR Y CONSUMIR PREMIO';
        }
      });
    }
  }catch(e){
    mostrarError('Error al buscar premiación: ' + (e.message || e));
  }
}

async function buscarListaPorCodigo(codigoLista){
  mostrarCargando('Buscando lista...');
  try{
    const listas = await llamar('f_puerta_lista', {
      p_token: tokenSesion,
      p_dia: diaSeleccionado,
      p_buscar: codigoLista
    });
    if(!listas || listas.length === 0){
      mostrarError('No se encontró ninguna lista con ese código en el Día ' + diaSeleccionado + '.');
      return;
    }
    mostrarListaCompleta(listas[0]);
  }catch(e){
    mostrarError('Error al buscar lista: ' + (e.message || e));
  }
}

async function buscarListaPorNombre(nombre){
  mostrarCargando('Buscando por nombre...');
  try{
    const listas = await llamar('f_puerta_lista', {
      p_token: tokenSesion,
      p_dia: diaSeleccionado,
      p_buscar: nombre
    });
    if(!listas || listas.length === 0){
      mostrarError('No se encontraron listas que coincidan con "' + nombre + '" en el Día ' + diaSeleccionado + '.');
      return;
    }
    if(listas.length === 1){
      mostrarListaCompleta(listas[0]);
      return;
    }
    let html = `<div class="resultado">`;
    html += `<div class="dato"><strong>Se encontraron ${listas.length} listas. Elige una:</strong></div>`;
    html += `<div class="fila-personas">`;
    listas.forEach((l, idx) => {
      html += `<div class="persona-item ${idx === listas.length - 1 ? 'ultimo' : ''}">`;
      html += `<div class="persona-info">`;
      html += `<div class="persona-nombre">${escaparHtml(l.talento || 'Talento')}</div>`;
      html += `<div class="persona-detalle">Código: ${escaparHtml(l.codigo_corto)} • Estado: ${escaparHtml(l.estado)}</div>`;
      html += `</div>`;
      html += `<button class="btn btn-mini" data-lista-id="${l.lista_id}" data-codigo="${escaparHtml(l.codigo_corto)}">Abrir</button>`;
      html += `</div>`;
    });
    html += `</div></div>`;
    mostrarPanel(html);
    panelResultado.querySelectorAll('button[data-lista-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const listaId = btn.getAttribute('data-lista-id');
        const codigo = btn.getAttribute('data-codigo');
        await mostrarListaPorId(listaId, codigo);
      });
    });
  }catch(e){
    mostrarError('Error al buscar: ' + (e.message || e));
  }
}

async function mostrarListaPorId(listaId, codigo){
  mostrarCargando('Cargando lista...');
  try{
    const listas = await llamar('f_puerta_lista', {
      p_token: tokenSesion,
      p_dia: diaSeleccionado,
      p_buscar: codigo
    });
    if(!listas || listas.length === 0){
      mostrarError('No se pudo cargar la lista.');
      return;
    }
    const lista = listas.find(l => l.lista_id === listaId) || listas[0];
    mostrarListaCompleta(lista);
  }catch(e){
    mostrarError('Error: ' + (e.message || e));
  }
}

async function mostrarListaCompleta(lista){
  listaActualId = lista.lista_id;
  listaActualCodigo = lista.codigo_corto;
  mostrarCargando('Cargando personas...');
  try{
    let personas = [];
    try{
      personas = await llamar('f_puerta_personas_de_lista', {
        p_token: tokenSesion,
        p_lista_id: lista.lista_id
      });
    }catch(e){
      mostrarError('Error al obtener personas de la lista.');
      return;
    }
    if(!personas || personas.length === 0){
      mostrarError('La lista está vacía.');
      return;
    }
    
    const totalPersonas = personas.length;
    const autorizados = personas.filter(p => p.estado === 'autorizado').length;
    const pendientes = totalPersonas - autorizados;
    const listaCompletada = totalPersonas > 0 && totalPersonas === autorizados;
    
    // NUEVO: Si todos ya entraron, mostrar bloqueo
    if(listaCompletada){
      const ultimaPersona = personas[personas.length - 1];
      const horaUltima = ultimaPersona.marcado_at ? new Date(ultimaPersona.marcado_at).toLocaleTimeString('es-VE') : 'hora no registrada';
      const nombres = personas.map(p => `✅ ${escaparHtml(p.nombre)} ${escaparHtml(p.apellido)} (CI: ${escaparHtml(p.cedula)})`).join('<br>');
      mostrarPanel(`
        <div class="resultado bloqueado">
          <div class="dato"><strong>Tipo</strong><span class="pill pill-azul">Lista de talento</span></div>
          <div class="dato"><strong>Talento</strong><span>${escaparHtml(lista.talento || 'Talento')}</span></div>
          <div class="dato"><strong>Código</strong><span class="mono">${escaparHtml(lista.codigo_corto)}</span></div>
          <div class="aviso aviso-rojo mt-14">
            ⛔ LISTA COMPLETADA<br>
            Las ${totalPersonas} personas de esta lista ya ingresaron al evento. 
            Última entrada registrada a las <strong>${horaUltima}</strong>.
            Este QR ya no es válido.
          </div>
          <div class="fila-personas">
            <div class="aviso mb-12">Personas que ingresaron:</div>
            ${nombres}
          </div>
        </div>
      `);
      return;
    }
    
    let html = `<div class="resultado">`;
    html += `<div class="dato"><strong>Tipo</strong><span class="pill pill-azul">Lista de talento</span></div>`;
    html += `<div class="dato"><strong>Talento</strong><span>${escaparHtml(lista.talento || 'Talento')}</span></div>`;
    html += `<div class="dato"><strong>Código</strong><span class="mono">${escaparHtml(lista.codigo_corto)}</span></div>`;
    html += `<div class="dato"><strong>Estado</strong><span class="pill ${lista.estado === 'cerrada' ? 'pill-rojo' : 'pill-verde'}">${escaparHtml(lista.estado)}</span></div>`;
    
    html += `<div class="acciones-lista">`;
    if(lista.estado === 'cerrada'){
      html += `<button class="btn btn-gris" id="btnReabrirLista">🔓 Reabrir lista</button>`;
    }else{
      html += `<button class="btn btn-rojo" id="btnCerrarLista"> Cerrar lista</button>`;
    }
    html += `</div>`;
    
    if(lista.estado === 'cerrada'){
      html += `<div class="aviso aviso-rojo mb-12">⛔ LISTA CERRADA<br>Esta lista fue cerrada y ya no permite nuevas autorizaciones. Las personas pendientes no pueden entrar.</div>`;
    }
    
    html += `<div class="fila-personas">`;
    html += `<div class="aviso mb-12 ${lista.estado === 'cerrada' && pendientes > 0 ? 'aviso-rojo' : ''}">`;
    html += `Total: ${totalPersonas} • ✅ Autorizados: ${autorizados} • ⏳ Pendientes: ${pendientes}`;
    if(lista.estado === 'cerrada' && pendientes > 0){
      html += `<br><strong>Lista cerrada: las personas pendientes NO pueden entrar.</strong>`;
    }
    html += `</div>`;
    
    personas.forEach((p, idx) => {
      const yaAutorizado = p.estado === 'autorizado';
      const fecha = p.marcado_at ? new Date(p.marcado_at).toLocaleDateString('es-VE') : '';
      const hora = p.marcado_at ? new Date(p.marcado_at).toLocaleTimeString('es-VE') : '';
      
      html += `<div class="persona-item ${idx === personas.length - 1 ? 'ultimo' : ''}">`;
      html += `<div class="persona-info">`;
      html += `<div class="persona-nombre">${escaparHtml(p.nombre)} ${escaparHtml(p.apellido)}`;
      if(yaAutorizado){
        html += `<span class="estado-badge pill-verde">✅ Entró el ${fecha} a las ${hora}</span>`;
      }else{
        html += `<span class="estado-badge pill-amarillo">Pendiente</span>`;
      }
      html += `</div>`;
      html += `<div class="persona-detalle">CI: ${escaparHtml(p.cedula)} • ${escaparHtml(p.cargo)}</div>`;
      html += `</div>`;
      
      if(lista.estado === 'cerrada'){
        if(yaAutorizado){
          html += `<span class="pill pill-verde">Entró</span>`;
        }else{
          html += `<span class="pill pill-rojo">No entra</span>`;
        }
      }else if(yaAutorizado){
        html += `<span class="pill pill-rojo"> Consumada</span>`;
      }else{
        html += `<button class="btn btn-mini" data-persona="${p.persona_id}">✅ Autorizar</button>`;
      }
      html += `</div>`;
    });
    html += `</div></div>`;
    mostrarPanel(html);
    
    panelResultado.querySelectorAll('button[data-persona]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const personaId = btn.getAttribute('data-persona');
        btn.disabled = true;
        btn.textContent = 'Autorizando...';
        try{
          const ok = await llamar('f_puerta_marcar_persona', {
            p_token: tokenSesion,
            p_persona_id: personaId,
            p_estado: 'autorizado'
          });
          if(ok){
            buscarListaPorCodigo(listaActualCodigo);
          }else{
            alert('No se pudo autorizar.');
            btn.disabled = false;
            btn.textContent = '✅ Autorizar';
          }
        }catch(e){
          alert('Error: ' + (e.message || e));
          btn.disabled = false;
          btn.textContent = '✅ Autorizar';
        }
      });
    });
    
    const btnCerrar = document.getElementById('btnCerrarLista');
    if(btnCerrar){
      btnCerrar.addEventListener('click', async () => {
    if(!await modalConfirm('¿Cerrar esta lista?\n\nLas personas pendientes ya no podrán entrar hasta que reabras la lista.', 'Cerrar lista')){
          return;
        }
        btnCerrar.disabled = true;
        btnCerrar.textContent = 'Cerrando...';
        try{
          const ok = await llamar('f_puerta_cerrar_lista', {
            p_token: tokenSesion,
            p_lista_id: listaActualId,
            p_cerrada: true
          });
          if(ok){
            buscarListaPorCodigo(listaActualCodigo);
          }else{
            alert('No se pudo cerrar la lista.');
            btnCerrar.disabled = false;
            btnCerrar.textContent = ' Cerrar lista';
          }
        }catch(e){
          alert('Error: ' + (e.message || e));
          btnCerrar.disabled = false;
          btnCerrar.textContent = '🔒 Cerrar lista';
        }
      });
    }
    
    const btnReabrir = document.getElementById('btnReabrirLista');
    if(btnReabrir){
      btnReabrir.addEventListener('click', async () => {
    if(!await modalConfirm('¿Reabrir esta lista?\n\nPodrás autorizar a las personas pendientes.', 'Reabrir lista')){
          return;
        }
        btnReabrir.disabled = true;
        btnReabrir.textContent = 'Reabriendo...';
        try{
          const ok = await llamar('f_puerta_cerrar_lista', {
            p_token: tokenSesion,
            p_lista_id: listaActualId,
            p_cerrada: false
          });
          if(ok){
            buscarListaPorCodigo(listaActualCodigo);
          }else{
            alert('No se pudo reabrir la lista.');
            btnReabrir.disabled = false;
            btnReabrir.textContent = '🔓 Reabrir lista';
          }
        }catch(e){
          alert('Error: ' + (e.message || e));
          btnReabrir.disabled = false;
          btnReabrir.textContent = '🔓 Reabrir lista';
        }
      });
    }
  }catch(e){
    mostrarError('Error al cargar la lista: ' + (e.message || e));
  }
}

(function(){
  const s = leerSesion();
  if(s && s.rol === 'puerta'){
    tokenSesion = s.token;
    activarAutoBloqueo();
    verificarEstadoEvento();
  }
  const params = new URLSearchParams(location.search);
  const listaParam = params.get('lista');
  const vendedorParam = params.get('v');
  const clParam = params.get('cl');
  const ciParam = params.get('ci');
  if(tokenSesion){
    if(vendedorParam){
      inputManual.value = vendedorParam;
    }else if(listaParam){
      inputManual.value = listaParam;
    }else if(clParam){
      inputManual.value = clParam;
    }else if(ciParam){
      inputManual.value = ciParam;
    }
  }
})();
