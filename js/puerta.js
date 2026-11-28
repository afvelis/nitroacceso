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
const msgError = document.getElementById('msgError');
const tarjetaLogin = document.getElementById('tarjetaLogin');
const tarjetaEventoAbierto = document.getElementById('tarjetaEventoAbierto');
const tarjetaPrincipal = document.getElementById('tarjetaPrincipal');
const btnSalirEventoAbierto = document.getElementById('btnSalirEventoAbierto');
const btnComprobarEvento = document.getElementById('btnComprobarEvento');
const msgEventoAbierto = document.getElementById('msgEventoAbierto');
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
const msgCerrarDia = document.getElementById('msgCerrarDia');

let diaSeleccionado = null;
let diaActivo = 1;
let tokenSesion = null;
let streamVideo = null;
let scanningInterval = null;
let listaActualId = null;
let listaActualCodigo = null;

// P1-02: la sesión de esta página puede ser de puerta o de supervisor.
// Helpers únicos: el resto del archivo usa estos, no relee sessionStorage.
function rolSesion(){
  const s = leerSesion();
  return (s && s.rol) || null;
}
function esSupervisor(){ return rolSesion() === 'supervisor'; }

// Pinta el resultado de una acción DENTRO de su tarjeta, junto al botón (norma v2.2).
// `clase` reutiliza las de aviso existentes ('aviso' neutra/amarilla, 'aviso-verde', 'aviso-rojo').
function pintarAviso(el, msg, clase){
  el.className = clase || 'aviso';
  el.textContent = msg;
  el.hidden = false;
}

// ===== P2-01 · OFFLINE: cola de escaneos + indicador de red + respaldo CSV =====
// Origen: tareas/P2-01-offline-pwa.md. Problema: el WiFi del venue puede caer
// en plena puerta; hasta hoy cada autorización fallaba y se perdía en un alert.
// Proyecto:
//   · Los códigos de un solo dato (V-/CI-/PR-) se ENCOLAN en IndexedDB cuando
//     no hay red y se envían solos al volver (la verificación real sigue en el
//     servidor: si el pase ya estaba consumido, la cola no duplica).
//   · Las listas (L-/CL-, búsquedas por nombre) NO se encolan: exigen ver y
//     elegir a cada persona.
//   · El operador SIEMPRE ve la banda de estado (conectado / N en cola / sin
//     conexión) y puede exportar un CSV de respaldo del día.
//   · Todo depende de window.NAOfflineDB (js/offline-db.js). Si no existe o
//     IndexedDB falla, la puerta sigue operando como hasta hoy: fail-open.
const NAOffline = (typeof window.NAOfflineDB === 'object') ? window.NAOfflineDB : null;

// Solo códigos de un solo dato: el QR ES la decisión, en la sincronización se
// resuelven con el servidor y no hay posibilidad de duplicar autorización.
const NA_CODIGO_UN_DATO = /^(V-|CI-|PR-)/;

// Contratos verificados en supabase/migrations: f_puerta_marcar_vendedor,
// f_puerta_marcar_cortesia y f_puerta_marcar_persona devuelven BOOLEAN
// (migración 0018); f_puerta_canjear_premiacion devuelve texto de resultado
// ('ok' / 'ERR_*'). La cola no depende de interpretar booleanos raros: OK es
// true/'ok'; todo lo demás es rechazo y queda a la vista del operador (si una
// RPC cambia a códigos de texto, se revisa NA_RES_* aquí abajo).

// Id de fila local (crypto.randomUUID) para trazabilidad: NO viaja al
// servidor. La idempotencia real es del servidor: marcar un pase ya consumido
// no lo duplica (devuelve false, y canjear dos veces devuelve ERR_USADA).
function naId(){
  try{
    if(window.crypto && window.crypto.randomUUID) return crypto.randomUUID();
  }catch(e){}
  return 'na-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

// ¿Es un fallo de RED (encolable) o un rechazo del servidor (no encolable)?
// Con navigator.onLine inestable en escritorio, miramos además el texto del
// error: fetch cae con 'Failed to fetch' (Chrome), 'NetworkError' (Fx),
// 'Load failed' (Safari). Un error PostgREST no viaja por aquí.
function esErrorRed(e){
  const m = String((e && e.message) || e || '').toLowerCase();
  return navigator.onLine === false
    || m.indexOf('failed to fetch') !== -1
    || m.indexOf('networkerror') !== -1
    || m.indexOf('network request failed') !== -1
    || m.indexOf('load failed') !== -1;
}

/** Mete un pedido en la cola y devuelve el total pendiente tras guardar. */
function naEncolar(tipo, pedido){
  if(!NAOffline) return Promise.resolve(null);
  return NAOffline.guardarEnCola(naId(), tipo, pedido)
    .then(() => NAOffline.contarPendientes())
    .then(n => { actualizarIndicadorRed(); return n; })
    .catch(() => null);
}

function naAvisoEncolado(n){
  if(n === null){
    return 'Offline SIN cola local: no se pudo guardar la autorización (IndexedDB no disponible). ' +
      'Apunta el código en el CSV de respaldo y lo autorizas a mano al volver la red.';
  }
  return '📴 Sin conexión. La autorización quedó GUARDADA en la cola local (' + n + ' pendientes) ' +
    'y se enviará sola al volver la red. No repetir el escaneo: está en cola.';
}

// Camino offline del campo manual Y de la cámara: SOLO códigos de un solo dato.
function naManejarCodigoSinRed(codigo){
  const limpio = String(codigo || '').toUpperCase();
  inputManual.value = limpio;
  if(NA_CODIGO_UN_DATO.test(limpio)){
    const dia = diaSeleccionado || diaActivo;
    naEncolar('escaneo', { codigo: limpio, dia: dia })
      .then(n => {
        inputManual.value = '';
        mostrarPanel(
          '<div class="resultado">' +
          '<div class="dato"><strong>Tipo</strong><span class="pill pill-azul">Escaneo en cola (offline)</span></div>' +
          '<div class="dato"><strong>Código</strong><span class="mono">' + escaparHtml(limpio) + '</span></div>' +
          '<div class="dato"><strong>Día</strong><span>Día ' + escaparHtml(String(dia)) + '</span></div>' +
          '<div class="aviso">' + escaparHtml(naAvisoEncolado(n)) + '</div>' +
          '<div class="aviso">En la sincronización el servidor dice el estado del pase: si ya estaba consumido, la cola NO lo vuelve a autorizar.</div>' +
          '</div>');
      });
    return;
  }
  mostrarError('📴 Sin conexión: consultar "' + limpio + '" exige red y NO entra en la cola (hay que ver la ficha para elegir a quién marcar). Escanea códigos V-/CI-/PR- o espera a que el indicador vuelva a verde.');
}

// ===== Indicador fijo de conexión (banda verde/amarilla/roja de puerta.html) ===
const elIndicadorRed = document.getElementById('estadoRed');
function actualizarIndicadorRed(){
  if(!elIndicadorRed || !NAOffline) return;
  NAOffline.contarPendientes()
    .then(n => {
      elIndicadorRed.className = 'estado-red ' + (
        (navigator.onLine === false) ? 'estado-red-rojo'
          : (n > 0 ? 'estado-red-amarillo' : 'estado-red-verde'));
      elIndicadorRed.textContent = (navigator.onLine === false)
        ? '🔴 Sin conexión' + (n > 0 ? ' · ' + n + ' escaneo(s) en cola' : '')
        : '🟢 Conectado' + (n > 0 ? ' · ' + n + ' escaneo(s) en cola' : ' · control al día');
    })
    .catch(() => {
      if(navigator.onLine === false){
        elIndicadorRed.className = 'estado-red estado-red-rojo';
        elIndicadorRed.textContent = '🔴 Sin conexión';
      }
    });
}

// ===== Envío de la cola =====
// Devuelve: NA_RES_SYNC (servidor aceptó antes o RECHAZA como ya-consumido →
// se borra de la cola para no volver a intentarlo) · NA_RES_ERROR (rechazo real
// del servidor, ej. lista cerrada → NO se reintenta, queda en la cola con
// estado 'error') · Promise.resolve(null) (fallo de red: PAUSA la cola para
// que se reintente en el próximo evento online). Esto es lo que impide
// autorizar 2 veces: una fila solo sale de la cola si se RESOLVIÓ en el
// servidor o si el servidor la rechazó definitivamente para ese pase.
const NA_RES_SYNC = { estado: 'synced' };
const NA_RES_ERROR = { estado: 'error' };

async function naEjecutarFila(fila){
  const p = fila.data || {};
  const dia = p.dia || diaActivo;
  try{
    if(fila.tipo === 'vendedor' && p.vendedor_id){
      const ok = await llamar('f_puerta_marcar_vendedor', {
        p_token: tokenSesion, p_vendedor_id: p.vendedor_id, p_dia: dia, p_estado: 'autorizado'
      });
      return ok ? NA_RES_SYNC : NA_RES_ERROR;
    }
    if(fila.tipo === 'cortesia' && p.persona_id && p.dia){
      const ok = await llamar('f_puerta_marcar_cortesia', {
        p_token: tokenSesion, p_persona_id: p.persona_id, p_dia: p.dia, p_estado: 'autorizado'
      });
      return ok ? NA_RES_SYNC : NA_RES_ERROR;
    }
    if(fila.tipo === 'persona' && p.persona_id){
      const ok = await llamar('f_puerta_marcar_persona', {
        p_token: tokenSesion, p_persona_id: p.persona_id, p_estado: 'autorizado'
      });
      return ok ? NA_RES_SYNC : NA_RES_ERROR;
    }
    if(fila.tipo === 'premiacion' && p.codigo_qr){
      const r = await llamar('f_puerta_canjear_premiacion', {
        p_token: tokenSesion, p_codigo_qr: p.codigo_qr, p_cupones_usados: p.cupones_usados
      });
      return (r === 'ok') ? NA_RES_SYNC : NA_RES_ERROR;
    }
    // ===== Códigos leídos por la cámara SIN datos a la vista ('escaneo') =====
    if(fila.tipo === 'escaneo' && NA_CODIGO_UN_DATO.test(p.codigo || '')){
      return await naResolverEscaneo(p);
    }
    return NA_RES_ERROR; // fila no representable: queda a la vista del operador
  }catch(e){
    return esErrorRed(e) ? { estado: 'pendiente', detalle: e && e.message } : NA_RES_ERROR;
  }
}

// Un escaneo por QR leído sin conexión: el servidor dice el estado AHORA
// (idempotencia) y solo marca si el pase está completo SIN CONSUMIR.
async function naResolverEscaneo(p){
  const codigo = String(p.codigo || '').toUpperCase();
  const dia = p.dia || diaActivo;
  if(codigo.indexOf('V-') === 0){
    const v = await llamar('f_puerta_vendedor_por_qr', { p_token: tokenSesion, p_codigo_qr: codigo });
    if(!v) return NA_RES_ERROR;
    const estadoDia = dia === 1 ? v.estado_dia1 : v.estado_dia2;
    if(estadoDia === 'autorizado') return NA_RES_SYNC;
    const ok = await llamar('f_puerta_marcar_vendedor', {
      p_token: tokenSesion, p_vendedor_id: v.vendedor_id, p_dia: dia, p_estado: 'autorizado'
    });
    return ok ? NA_RES_SYNC : NA_RES_ERROR;
  }
  if(codigo.indexOf('CI-') === 0){
    const d = await llamar('f_puerta_cortesia_individual', { p_token: tokenSesion, p_codigo_qr: codigo });
    if(!d) return NA_RES_ERROR;
    if(d.anulada) return NA_RES_ERROR;
    if(!(dia === 1 ? d.dia1 : d.dia2)) return NA_RES_ERROR;
    const estadoDia = dia === 1 ? d.estado_dia1 : d.estado_dia2;
    if(estadoDia === 'autorizado') return NA_RES_SYNC;
    const ok = await llamar('f_puerta_marcar_cortesia', {
      p_token: tokenSesion, p_persona_id: d.persona_id, p_dia: dia, p_estado: 'autorizado'
    });
    return ok ? NA_RES_SYNC : NA_RES_ERROR;
  }
  if(codigo.indexOf('PR-') === 0){
    const d = await llamar('f_puerta_premiacion_por_qr', { p_token: tokenSesion, p_codigo_qr: codigo });
    if(!d) return NA_RES_ERROR;
    if(d.anulada) return NA_RES_ERROR;
    if(d.canjeado_at) return NA_RES_SYNC; // ERR_USADA del servidor: no duplica
    if(!(dia === 1 ? d.dia1 : d.dia2)) return NA_RES_ERROR;
    const cupones = d.cupones_total || 0;
    if(cupones < 1) return NA_RES_ERROR;
    const r = await llamar('f_puerta_canjear_premiacion', {
      p_token: tokenSesion, p_codigo_qr: codigo, p_cupones_usados: cupones
    });
    return (r === 'ok') ? NA_RES_SYNC : NA_RES_ERROR;
  }
  return NA_RES_ERROR;
}

// Vuelca la cola SOLO cuando hay red. La cuenta y el estado del operador
// viven en la banda de conexión; aquí solo se ejecuta. Cada fila sale de la
// cola SOLO por synced (borrado) o rechazo del servidor (estado 'error'); una
// fila con fallo de red deja el resto de la ronda pendiente (contrato).
let naSincronizando = false;
async function naSincronizarCola(){
  if(!NAOffline || naSincronizando || !tokenSesion || navigator.onLine === false) return;
  naSincronizando = true;
  try{
    while(navigator.onLine !== false){
      const pendientes = (await NAOffline.obtenerCola()).filter(f => f.estado === 'pendiente');
      if(pendientes.length === 0) break;
      // Sin bajar la fila: resuelve TODAS o pausa. Cada fila se resuelve igual:
      // synced → id al borrado ('limpiarCola' SOLO borra synced; quedan las
      // 'error' con el motivo para el operador) · estado 'pendiente' → ficha a
      // mitad de ronda: SIN reintentar en el mismo ciclo ni en-loop: se pausa.
      const resueltas = [];
      const rechazadas = [];
      let cortada = false;
      for(const fila of pendientes){
        if(navigator.onLine === false){ cortada = true; break; }
        const res = await naEjecutarFila(fila);
        if(res && res.estado === 'synced') resueltas.push(fila.id);
        else if(res && res.estado === 'error') rechazadas.push(fila.id);
        else { cortada = true; break; } // red caída a mitad: pausa toda la ronda
      }
      if(resueltas.length) await NAOffline.limpiarCola(resueltas);
      for(const fila of pendientes){
        if(rechazadas.indexOf(String(fila.id)) !== -1){
          // Rechazo real del servidor (lista cerrada, ticket ya tomado…):
          // NO se reintenta solo: queda en la cola con estado 'error' para que
          // el operador decida si lo reproducen a mano.
          await NAOffline.marcarCola(fila.id, 'error');
        }
      }
      if(cortada) break;
    }
  }catch(e){ console.warn('Cola de escaneos (P2-01):', e); }
  naSincronizando = false;
  actualizarIndicadorRed();
}
// ===== Copia local de los pases del día (para el CSV de respaldo sin red) ====
// Con red: guarda filas planas (lista + persona) en IndexedDB; la vista del
// operador no depende de esto. Sin red: escribe un aviso y NO intenta.
let naCacheoPases = false;
async function naRefrescarCachePases(){
  if(!NAOffline || naCacheoPases || !tokenSesion || navigator.onLine === false) return;
  naCacheoPases = true;
  const dia = diaActivo;
  try{
    const listas = await llamar('f_puerta_lista', { p_token: tokenSesion, p_dia: dia, p_buscar: '' });
    const filas = [];
    for(const l of (listas || [])){
      try{
        const personas = await llamar('f_puerta_personas_de_lista', { p_token: tokenSesion, p_lista_id: l.lista_id });
        (personas || []).forEach(p => filas.push({
          dia: dia, codigo_corto: l.codigo_corto, talento: l.talento,
          lista_estado: l.estado, nombre: p.nombre, apellido: p.apellido,
          cedula: p.cedula, cargo: p.cargo, estado: p.estado, marcado_at: p.marcado_at
        }));
      }catch(e){ console.warn('P2-01: no se pudo cachear una lista'); }
    }
    await NAOffline.guardarPases(dia, filas);
  }catch(e){ console.warn('P2-01: caché de pases', e); }
  naCacheoPases = false;
}

// ===== Eventos de red e inicio del monitor offline =====
// Al volver la conexión: vuelca la cola (una sola ronda; si algo se rechaza
// queda 'error' visible en el aviso) y refresca la copia de pases para el CSV.
// ===== P2-01 · Vista local de la cola (pendientes + rechazados) y reintento ===
// El botón vivo del panel principal. La cola JAMÁS reenvía sola una fila que
// el servidor rechazó: aquí el operador ve el contenido decidir (el reintento
// es idempotente: volver a marcar un pase consumido no lo duplica).
async function naMostrarCola(){
  if(!NAOffline){
    modalAlert('Este navegador no tiene memoria local (IndexedDB): no hay cola que mostrar. La puerta seguirá operando con red como siempre.', 'Cola de escaneos pendientes');
    return;
  }
  let filas = [];
  try{ filas = await NAOffline.obtenerCola(); }
  catch(e){ modalAlert('No se pudo leer la cola local: ' + ((e && e.message) || e), 'Cola de escaneos pendientes'); return; }
  if(filas.length === 0){
    modalAlert('La cola está vacía: no hay escaneos pendientes ni rechazados.', 'Cola de escaneos pendientes');
    return;
  }
  const pendientes = filas.filter(f => f.estado === 'pendiente').length;
  const rechazados = filas.length - pendientes;
  let detalle = '⏳ Pendientes de enviar: ' + pendientes + '\n' +
    (rechazados ? '⚠️ Con rechazo del servidor (NO se reenvían solos): ' + rechazados + '\n' : '');
  detalle += '\n' + filas.map(f => {
    const d = f.data || {};
    const codigo = d.codigo || d.vendedor_id || d.persona_id || '—';
    return '· ' + codigo + (d.dia ? ' (Día ' + d.dia + ')' : '') + ' → ' + f.estado;
  }).join('\n');
  if(!pendientes){
    modalAlert(detalle + '\n\nLos rechazados NO se reintentan solos: el servidor ya respondió que no entran. Para limpiar la cola, borra la sesión (🚪).', 'Cola de escaneos pendientes');
    return;
  }
  if(await modalConfirm(detalle + '\n\n¿Volver a intentar el envío ahora (requiere conexión)?', 'Cola de escaneos pendientes')){
    naSincronizarCola();
  }
}
document.getElementById('btnVerCola').addEventListener('click', naMostrarCola);

function naIniciarMonitorRed(){
  actualizarIndicadorRed();
  window.addEventListener('online', () => {
    actualizarIndicadorRed();
    naSincronizarCola();
  });
  window.addEventListener('offline', () => {
    actualizarIndicadorRed();
  });
}

// ===== P2-01 · CSV de respaldo (botón del panel principal) =====
function naCSVValor(v){
  return '"' + String((v === undefined || v === null) ? '' : v).replace(/"/g, '""') + '"';
}
function naCSVFila(arr){ return arr.map(naCSVValor).join(','); }

// Filas con la MISMA forma en vivo y en la copia local (las que guarda
// naRefrescarCachePases): dia · codigo_corto · talento · lista_estado ·
// nombre · apellido · cedula · cargo · estado · marcado_at. Sin red usa solo
// la copia local y lo avisa: las marcas offline posteriores al refresco no
// están hasta que vuelva la conexión.
function naExportarCSVDia(){
  const msg = document.getElementById('msgCSV');
  const pintar = (t, c) => { if(msg) pintarAviso(msg, t, c); };
  const dia = diaSeleccionado || diaActivo;
  const nombre = 'puerta-dia' + dia + '-' + new Date().toISOString().slice(0, 10) + '.csv';
  const encabezado = ['Día', 'Código de lista', 'Talento', 'Estado de lista', 'Nombre', 'Apellido', 'Cédula', 'Cargo', 'Estado del pase', 'Hora de la marca'];
  const descargar = (filas, fuente) => {
    const lineas = [naCSVFila(encabezado)];
    filas.forEach(f => lineas.push(naCSVFila([
      f.dia, f.codigo_corto, f.talento, f.lista_estado, f.nombre, f.apellido,
      f.cedula, f.cargo, f.estado, f.marcado_at || ''
    ])));
    const blob = new Blob(['\ufeff' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    pintar('✅ CSV del Día ' + dia + ' descargado (' + filas.length + ' personas · fuente: ' + fuente + ').', 'aviso aviso-verde');
  };
  if(navigator.onLine !== false && NAOffline){
    // Con red: refresca la copia local y exporta DESDE ella (un solo camino,
    // misma fuente para el operador con red o sin red).
    naRefrescarCachePases()
      .then(() => NAOffline.obtenerPases(dia))
      .then(filas => {
        if(!filas){ pintar('Sin filas para el Día ' + dia + '.', 'aviso'); return; }
        if(filas.length === 0){ pintar('La copia del Día ' + dia + ' no tiene personas.', 'aviso'); return; }
        descargar(filas, 'copia local recién refrescada');
      })
      .catch(e => pintar('No se pudo exportar: ' + ((e && e.message) || e), 'aviso aviso-rojo'));
    return;
  }
  if(!NAOffline){ pintar('📴 Sin conexión y sin memoria local: no se puede generar el CSV en este equipo.', 'aviso aviso-rojo'); return; }
  NAOffline.obtenerPases(dia)
    .then(filas => {
      if(!filas){ pintar('📴 Sin conexión y SIN copia local del Día ' + dia + '. Se genera al entrar con red: cuando vuelva la conexión, vuelve a pulsar Exportar CSV.', 'aviso aviso-rojo'); return; }
      if(filas.length === 0){ pintar('La copia local del Día ' + dia + ' no tiene personas.', 'aviso'); return; }
      descargar(filas, 'copia local (puede estar desactualizada)');
    })
    .catch(e => pintar('No se pudo leer la copia local: ' + ((e && e.message) || e), 'aviso aviso-rojo'));
}
document.getElementById('btnExportarCSV').addEventListener('click', naExportarCSVDia);

// Guarda el día activo CONFIRMADO POR EL SERVIDOR en localStorage, para poder
// retomarlo en modo respaldo sin conexión (el día REAL lo revalida el servidor
// en cuanto vuelve la red).
function naGuardarDiaActivo(dia){
  try{ localStorage.setItem('na_puerta_dia_activo', String(dia)); }catch(e){}
}
function naLeerDiaActivo(){
  try{ return parseInt(localStorage.getItem('na_puerta_dia_activo') || '1', 10) || 1; }catch(e){ return 1; }
}

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

// es-VE devuelve "11:59:10 p. m." y la abreviatura ya lleva su punto. Las
// plantillas de aviso añaden su propia puntuación detrás de la hora, así que
// aquí se recorta el punto final de la abreviatura para no escribir "p. m..".
// F-11 (tareas/F-11-doble-punto-hora-puerta.md).
function horaTexto(iso){
  return new Date(iso).toLocaleTimeString('es-VE').replace(/\.$/, '');
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
  // Entrada (login, estadoEventoOperativo o resolverRechazoAutorizacion): deja
  // el botón de reintento usable y el aviso limpio, para que la guard de
  // reentrancia de reintentarEstadoEvento no lo devuelva en cada clic.
  btnComprobarEvento.disabled = false;
  msgEventoAbierto.textContent = '';
  msgEventoAbierto.hidden = true;
}

function actualizarSelectorDia(){
  if(diaActivo === 1){
    btnDia1.disabled = false;
    btnDia2.disabled = true;
    estadoDia1.textContent = '';
    estadoDia2.textContent = '🔒 Disponible al cerrar Día 1';
    // P1-02: solo una sesión de supervisor ve (y puede usar) el cierre de día.
    // La RPC ya lo rechaza para un token de puerta; este panel es la capa visible.
    panelCerrarDia1.style.display = esSupervisor() ? 'block' : 'none';
    // Hallazgo 2: si el día volvió a 1, el botón vuelve completo y habilitado.
    btnCerrarDia1.style.display = '';
    btnCerrarDia1.disabled = false;
    btnCerrarDia1.textContent = '🔒 Cerrar Día 1 y activar Día 2';
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
      naGuardarDiaActivo(res.dia_nuevo);
      actualizarSelectorDia();
      // El aviso vive dentro de #panelCerrarDia1: se pinta DESPUÉS de refrescar
      // el selector, y se deja el panel visible para que el resultado siga
      // legible tras pasar a Día 2 (norma v2.2).
      panelCerrarDia1.style.display = 'block';
      pintarAviso(msgCerrarDia,
        '✅ Día ' + res.dia_cerrado + ' cerrado. Listas cerradas: ' + res.listas_cerradas + '. Día ' + res.dia_nuevo + ' activado.',
        'aviso aviso-verde');
      // Hallazgo 2: ya no hay día que cerrar; el botón se oculta, no queda muerto.
      btnCerrarDia1.style.display = 'none';
    }else{
      const err = (res && res.error) || 'desconocido';
      if(err === 'ERR_ROL'){
        pintarAviso(msgCerrarDia, 'Solo el supervisor puede cerrar el día. Esta sesión es de puerta.');
      }else{
        pintarAviso(msgCerrarDia, 'No se pudo cerrar el día (' + err + ').', 'aviso aviso-rojo');
      }
      btnCerrarDia1.style.display = '';
      btnCerrarDia1.disabled = false;
      btnCerrarDia1.textContent = '🔒 Cerrar Día 1 y activar Día 2';
    }
  }catch(e){
    pintarAviso(msgCerrarDia, 'No se pudo conectar. Revisa la conexión e inténtalo otra vez.', 'aviso aviso-rojo');
    btnCerrarDia1.style.display = '';
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
    naGuardarDiaActivo(diaActivo);
    mostrarPrincipal();
    actualizarSelectorDia();
  }catch(e){
    // P2-01: sin conexión en el ARRANQUE no se expulsa al operador: la puerta
    // entra en MODO RESPALDO con el último día activo confirmado. La
    // revalidación real sigue en el servidor (0011): si la sesión ya caducó o
    // el evento cambió de lado, la cola lo delata al volver la red.
    if(esErrorRed(e)){
      naEntrarModoRespaldo();
      return;
    }
    alert('Error al verificar el evento: ' + (e.message || e));
  }
}

// ===== P2-01 · Modo respaldo (la puerta arranca sin conexión) =====
// Solo llega aquí si el fallo de f_puerta_estado fue de RED (no de sesión).
// Retoma el último día activo confirmado y avisa de forma VISIBLE; sin red no
// hay listas ni fichas: quedan los escaneos por código en cola y el CSV de
// respaldo. Ni ronda de revalidación automática: el rechazo real lo emite el
// servidor en cuanto vuelva, en la sincronización.
function naEntrarModoRespaldo(){
  if(!tokenSesion || tarjetaPrincipal.style.display === 'block') return;
  diaActivo = naLeerDiaActivo();
  mostrarPrincipal();
  actualizarSelectorDia();
  actualizarIndicadorRed();
  pintarAviso(avisoDia,
    '📴 SIN CONEXIÓN · Modo respaldo: continuas en el Día ' + diaActivo + ' (último día confirmado con red). Los códigos V-/CI-/PR- quedan en la cola local y se envían solos al volver la red. El CSV de respaldo usa la copia local. Al reconectar, recarga para revalidar el estado.',
    'aviso aviso-rojo');
}

// Marcador de tiempo agotado para la carrera con el temporizador de reintento.
const ESTADO_TIMEOUT = Symbol('f_puerta_estado sin respuesta a tiempo');

// P1-02 / incidente 23/11: la tarjeta "Evento aún abierto" no tenía camino de
// vuelta sin recargar (solo "Salir", que borra la sesión). Este reintento
// reconsulta f_puerta_estado y, si el administrador ya cerró la edición,
// recupera el panel SIN recargar y SIN perder la sesión.
async function reintentarEstadoEvento(){
  // Evita doble consulta por doble clic o por visibilitychange en pleno vuelo.
  if(btnComprobarEvento.disabled) return;
  btnComprobarEvento.disabled = true;
  msgEventoAbierto.hidden = true;
  let estado = null;
  let agotado = false;
  let temporizador = null;
  try{
    // Carrera con un límite de 10 segundos: llamar() no tiene timeout propio
    // (es código compartido, fuera de alcance) y sin este límite una red sin
    // respuesta dejaba el botón "Comprobar de nuevo" deshabilitado para siempre
    // por el guard de reentrancia.
    estado = await Promise.race([
      llamar('f_puerta_estado', { p_token: tokenSesion }),
      new Promise(resolve => {
        temporizador = setTimeout(() => resolve(ESTADO_TIMEOUT), 10000);
      })
    ]);
    // La llamada terminó (o se agotó): no dejar el temporizador colgando.
    clearTimeout(temporizador);
  }catch(e){
    clearTimeout(temporizador);
    estado = null;
  }
  if(estado === ESTADO_TIMEOUT){
    agotado = true;
    estado = null;
  }
  if(!estado){
    if(agotado){
      pintarAviso(msgEventoAbierto,
        '⏱️ La conexión no responde. Comprueba la red y pulsa "🔄 Comprobar de nuevo" otra vez.',
        'aviso aviso-rojo');
    }else{
      pintarAviso(msgEventoAbierto,
        '⛔ No se pudo consultar el estado del evento. Puede faltar conexión o la sesión pudo haber caducado. Pulsa "🔄 Comprobar de nuevo" otra vez; si vuelve a fallar, sal con "🚪 Salir" y entra de nuevo con tu PIN.',
        'aviso aviso-rojo');
    }
    btnComprobarEvento.disabled = false;
    return;
  }
  if(estado.edicion_abierta){
    pintarAviso(msgEventoAbierto,
      '⏳ El evento sigue en edición. Se volverá a comprobar cuando pulses otra vez.',
      'aviso');
    btnComprobarEvento.disabled = false;
    return;
  }
  diaActivo = estado.dia_activo || 1;
  naGuardarDiaActivo(diaActivo);
  mostrarPrincipal();
  actualizarSelectorDia();
  // Reintento exitoso: sin resultado de una consulta vieja (botones «Autorizar»
  // de un escaneo previo, quizá de otro día).
  panelResultado.innerHTML = '';
  panelResultado.style.display = 'none';
  barraSiguiente.style.display = 'none';
  // Éxito pintado en el contenedor de la pantalla principal (norma v2.2);
  // se pinta DESPUÉS de actualizarSelectorDia para sobrevivir al repintado.
  pintarAviso(avisoDia,
    '✅ El evento ya está cerrado. Día activo: ' + diaActivo + '. Escanea el QR o abre la lista de nuevo.',
    'aviso aviso-verde');
}

// ===== P1-02 fase 2 · Revalidación de estado antes de cada autorización =====
// Criterios 3 y 4 de tareas/P1-02-roles-estado-puerta.md:47-48: el estado de
// "evento en edición" y el día activo ya no se confían solo al chequeo del
// login. El servidor los revalida en cada f_puerta_marcar_* (migración 0011);
// estas dos funciones son la capa cliente: evitan mandar la llamada cuando ya
// se sabe que caerá y muestran el motivo concreto en vez de un error genérico.

// Revalida el estado del evento ANTES de cada autorización. Devuelve true solo
// si la RPC de marcar puede llamarse ya; en caso contrario NO se llama, se
// avisa con el modal propio (norma v2.1) y se actualiza el estado local.
async function estadoEventoOperativo(){
  // P2-01: un fallo DE RED en la revalidación no cancela la autorización: si
  // la marca también falla por red, se encola; el servidor (0011) sigue siendo
  // quien revalida de verdad (edición, día distinto, sesión caducada siguen
  // recibiendo la llamada y la RPC rechaza).
  if(navigator.onLine === false) return true;
  let estado = null;
  let falloRed = false;
  try{
    estado = await llamar('f_puerta_estado', { p_token: tokenSesion });
  }catch(e){
    falloRed = esErrorRed(e);
    estado = null;
  }
  if(!estado && falloRed) return true;
  if(!estado){
    // Fail-closed: sin verificación el servidor no recibe la autorización.
    modalAlert('⛔ No se pudo verificar el estado del evento. La autorización queda cancelada. Revisa la conexión y escanea el QR de nuevo.');
    return false;
  }
  if(estado.edicion_abierta){
    mostrarEventoAbierto();
    modalAlert('⛔ El administrador puso el evento en EDICIÓN. La puerta no puede autorizar hasta que lo cierre de nuevo. Vuelve a entrar cuando se cierre.');
    return false;
  }
  const diaServidor = estado.dia_activo || 1;
  if(diaServidor !== diaActivo){
    diaActivo = diaServidor;
    naGuardarDiaActivo(diaServidor);
    actualizarSelectorDia();
    modalAlert('⚠️ El día activo cambió a Día ' + diaServidor + ' desde otro equipo. Este panel tenía estado viejo y se actualizó. Escanea el QR de nuevo.');
    return false;
  }
  return true;
}

// Resuelve un rechazo real de la RPC de marcar (devolvió false): reconsulta el
// estado del evento y prepara el motivo concreto para pintarlo DENTRO de la
// tarjeta, junto al botón (norma v2.2), DESPUÉS del eventual repintado para
// que el mensaje sobreviva a la recarga de la vista.
// Devuelve { repintar, msg }: si repintar, el llamador recarga su vista antes
// de pintar msg; msg puede venir null cuando ya se avisó por modal o cambia la
// pantalla entera (evento en edición / día cambiado).
async function resolverRechazoAutorizacion(){
  let estado = null;
  try{
    estado = await llamar('f_puerta_estado', { p_token: tokenSesion });
  }catch(e){
    estado = null;
  }
  if(estado && estado.edicion_abierta){
    mostrarEventoAbierto();
    modalAlert('⛔ El administrador puso el evento en EDICIÓN. La puerta no puede autorizar hasta que lo cierre de nuevo. Vuelve a entrar cuando se cierre.');
    return { repintar: false, msg: null };
  }
  if(estado){
    const diaServidor = estado.dia_activo || 1;
    if(diaServidor !== diaActivo){
      diaActivo = diaServidor;
      actualizarSelectorDia();
      modalAlert('⚠️ El día activo cambió a Día ' + diaServidor + ' desde otro equipo. Este panel tenía estado viejo y se actualizó. Vuelve a escanear el QR.');
      return { repintar: true, msg: null };
    }
    return {
      repintar: false,
      msg: '⛔ No se pudo autorizar. El evento sigue operativo y en el Día ' + (estado.dia_activo || 1) + ': el servidor rechazó por otra causa (día cerrado, pase ya consumido, lista cerrada o lista de otro día). Vuelve a escanear el QR.'
    };
  }
  return { repintar: false, msg: '⛔ No se pudo autorizar y tampoco se pudo verificar el estado del evento. Revisa la conexión y vuelve a escanear el QR.' };
}

btnEntrar.addEventListener('click', async () => {
  const pin = elPin.value.trim();
  msgError.style.display = 'none';
  if(!pin){ alert('Escribe el PIN de puerta.'); return; }
  btnEntrar.disabled = true;
  btnEntrar.textContent = 'Entrando...';
  try{
    const r = await llamar('f_login', { p_pin: pin, p_rol_solicitado: 'puerta' });
    if(!r || r.length === 0 || (r[0].rol !== 'puerta' && r[0].rol !== 'supervisor')){
      // Hallazgo 1: el rechazo se pinta junto al campo (norma v2.2), como el
      // bloque BLOQUEADO; no por alert global.
      msgError.textContent = 'PIN incorrecto, o no es un PIN de puerta ni de supervisor.';
      msgError.style.display = 'block';
      btnEntrar.disabled = false;
      btnEntrar.textContent = 'Entrar';
      return;
    }
    guardarSesion(r[0].token, r[0].rol);
    tokenSesion = r[0].token;
    activarAutoBloqueo();
    await verificarEstadoEvento();
    // P2-01: al entrar CON red, vacía la cola del día anterior si la hay y
    // refresca la copia local de los pases del día (respaldo CSV + escaneos).
    if(navigator.onLine !== false){
      naSincronizarCola();
      naRefrescarCachePases();
    }
    // F-5: el panel principal ya está visible aquí si el evento está operativo,
    // así que el campo manual existe y se ve rellenado con el código del link.
    // Edición: solo pre-llena el campo; no lanza búsqueda automática.
    aplicarParametrosURL();
  }catch(e){
    // P0-08: el bloqueo de puerta se pinta junto al campo (norma v2.2), sin modal.
    const msgRaw = (e && e.message) ? e.message : String(e);
    if(msgRaw.indexOf('BLOQUEADO') !== -1){
      const m = msgRaw.match(/Espera (\d+) segundos/);
      msgError.textContent = m
        ? '⛔ Bloqueado: espera ' + m[1] + ' segundos o avisa al administrador.'
        : '⛔ Bloqueado: demasiados intentos fallidos. Espera o avisa al administrador.';
      msgError.style.display = 'block';
    }else{
      alert('Error al entrar: ' + (e.message || e));
    }
  }
  btnEntrar.disabled = false;
  btnEntrar.textContent = 'Entrar';
});

btnSalirEventoAbierto.addEventListener('click', () => {
  borrarSesion();
  location.reload();
});

btnComprobarEvento.addEventListener('click', reintentarEstadoEvento);

// Opcional trivial: al volver el foco a la pestaña, si el operario seguía en la
// tarjeta de evento abierto, se reconsulta solo. Mismo guard de reentrancia.
document.addEventListener('visibilitychange', () => {
  if(document.visibilityState === 'visible' && tarjetaEventoAbierto.style.display === 'block'){
    reintentarEstadoEvento();
  }
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
  // P2-01: con la red caída NO se intenta una consulta que va a fallar: los
  // códigos de un solo dato (V-/CI-/PR-) van directo a la cola (el servidor
  // resuelve el estado al sincronizar); las listas y los nombres exigen
  // ver a las personas y se rechazan con mensaje claro.
  if(navigator.onLine === false){
    naManejarCodigoSinRed(codigo);
    return;
  }
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
  // P2-01: mismo camino offline que la cámara (códigos de un solo dato → cola).
  if(navigator.onLine === false){
    naManejarCodigoSinRed(texto.toUpperCase());
    return;
  }
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
      const hora = marcadoDia ? horaTexto(marcadoDia) : 'hora no registrada';
      html += `<div class="aviso aviso-rojo">⛔ ENTRADA YA CONSUMADA<br>Este código ya fue utilizado. Validado el <strong>${fecha}</strong> a las <strong>${hora}</strong>. No se puede autorizar de nuevo.</div>`;
    }else{
      html += `<button class="btn btn-grande" id="btnAutorizarVendedor">✅ AUTORIZAR ENTRADA</button>`;
    }
    // Contenedor del resultado de la autorización (norma v2.2): presente siempre
    // (oculto) para que el rechazo de la RPC se pinte junto al botón y no por
    // una ventanita global.
    html += `<div id="msgAutVendedor" class="aviso" hidden></div>`;
    html += `</div>`;
    mostrarPanel(html);
    
    if(!yaAutorizado){
      document.getElementById('btnAutorizarVendedor').addEventListener('click', async () => {
        const btn = document.getElementById('btnAutorizarVendedor');
        // P1-02 fase 2: revalidar el estado del evento ANTES de autorizar
        // (criterios 3 y 4). Sin verificación no se llama a la RPC.
        if(!await estadoEventoOperativo()){
          return;
        }
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
            // P1-02 fase 2: rechazo real de la RPC. Se reconsulta el estado y
            // se muestra el motivo concreto dentro de esta tarjeta (norma v2.2).
            const r = await resolverRechazoAutorizacion();
            if(r.repintar) await buscarVendedor(codigoQR);
            const m = document.getElementById('msgAutVendedor');
            if(m && r.msg) pintarAviso(m, r.msg, 'aviso aviso-rojo');
            const b = document.getElementById('btnAutorizarVendedor');
            if(b){
              b.disabled = false;
              b.textContent = '✅ AUTORIZAR ENTRADA';
            }
          }
        }catch(e){
          // P2-01: red caída → cola local; el botón queda bloqueado para no
          // encolar EL MISMO pase dos veces. Otro fallo → como siempre.
          if(esErrorRed(e)){
            const n = await naEncolar('vendedor', { vendedor_id: vendedor.vendedor_id, dia: diaSeleccionado });
            const m = document.getElementById('msgAutVendedor');
            if(m) pintarAviso(m, naAvisoEncolado(n), n === null ? 'aviso aviso-rojo' : 'aviso');
          }else{
            alert('Error: ' + (e.message || e));
            btn.disabled = false;
            btn.textContent = '✅ AUTORIZAR ENTRADA';
          }
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
      const horaUltima = ultimaPersona.marcado_at ? horaTexto(ultimaPersona.marcado_at) : 'hora no registrada';
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
      html += `</div><div class="persona-detalle">CI: ${escaparHtml(cedulaMascara(p.cedula))}</div></div>`;
      if(ya){
        html += `<span class="pill pill-rojo"> Consumida</span>`;
      }else{
        html += `<button class="btn btn-mini" data-cpersona="${p.persona_id}">✅ Autorizar</button>`;
      }
      html += `</div>`;
    });
    html += `</div>`;
    // Contenedor del resultado de la autorización de esta cortesía (norma v2.2):
    // el rechazo de la RPC se pinta aquí, junto al botón correspondiente.
    html += `<div id="msgAutCortesiaLista" class="aviso" hidden></div>`;
    html += `</div>`;
    mostrarPanel(html);
    
    panelResultado.querySelectorAll('button[data-cpersona]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-cpersona');
        // P1-02 fase 2: revalidar el estado del evento ANTES de autorizar
        // (criterios 3 y 4). Sin verificación no se llama a la RPC.
        if(!await estadoEventoOperativo()){
          return;
        }
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
            // P1-02 fase 2: rechazo real de la RPC. Se reconsulta el estado y
            // se muestra el motivo concreto dentro de esta tarjeta (norma v2.2).
            const r = await resolverRechazoAutorizacion();
            if(r.repintar) await buscarCortesiaLista(codigo);
            const m = document.getElementById('msgAutCortesiaLista');
            if(m && r.msg) pintarAviso(m, r.msg, 'aviso aviso-rojo');
            if(!r.repintar){
              btn.disabled = false;
              btn.textContent = '✅ Autorizar';
            }
          }
        }catch(e){
          // P2-01: red caída → cola local (sin reenvío duplicado).
          if(esErrorRed(e)){
            const n = await naEncolar('cortesia', { persona_id: id, dia: diaSeleccionado });
            const m = document.getElementById('msgAutCortesiaLista');
            if(m) pintarAviso(m, naAvisoEncolado(n), n === null ? 'aviso aviso-rojo' : 'aviso');
          }else{
            alert('Error: ' + (e.message || e));
            btn.disabled = false;
            btn.textContent = '✅ Autorizar';
          }
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
      const hora = marcado ? horaTexto(marcado) : 'hora no registrada';
      html += `<div class="aviso aviso-rojo">⛔ ENTRADA YA CONSUMADA<br>Este pase ya fue utilizado. Validado el <strong>${fecha}</strong> a las <strong>${hora}</strong>. No se puede autorizar de nuevo.</div>`;
    }else{
      html += `<button class="btn btn-grande" id="btnAutCortesia">✅ AUTORIZAR ENTRADA</button>`;
    }
    // Contenedor del resultado de la autorización (norma v2.2).
    html += `<div id="msgAutCortesiaInd" class="aviso" hidden></div>`;
    html += `</div>`;
    mostrarPanel(html);
    
    const b = document.getElementById('btnAutCortesia');
    if(b){
      b.addEventListener('click', async () => {
        // P1-02 fase 2: revalidar el estado del evento ANTES de autorizar
        // (criterios 3 y 4). Sin verificación no se llama a la RPC.
        if(!await estadoEventoOperativo()){
          return;
        }
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
            // P1-02 fase 2: rechazo real de la RPC. Se reconsulta el estado y
            // se muestra el motivo concreto dentro de esta tarjeta (norma v2.2).
            const r = await resolverRechazoAutorizacion();
            if(r.repintar) await buscarCortesiaIndividual(codigo);
            const m = document.getElementById('msgAutCortesiaInd');
            if(m && r.msg) pintarAviso(m, r.msg, 'aviso aviso-rojo');
            const b2 = document.getElementById('btnAutCortesia');
            if(b2){
              b2.disabled = false;
              b2.textContent = '✅ AUTORIZAR ENTRADA';
            }
          }
        }catch(e){
          // P2-01: red caída → cola local (sin reenvío duplicado).
          if(esErrorRed(e)){
            const n = await naEncolar('cortesia', { persona_id: d.persona_id, dia: diaSeleccionado });
            const m = document.getElementById('msgAutCortesiaInd');
            if(m) pintarAviso(m, naAvisoEncolado(n), n === null ? 'aviso aviso-rojo' : 'aviso');
          }else{
            alert('Error: ' + (e.message || e));
            b.disabled = false;
            b.textContent = '✅ AUTORIZAR ENTRADA';
          }
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
      const hora = horaTexto(d.canjeado_at);
      html += `<div class="aviso aviso-rojo">⛔ PREMIO YA CANJEADO<br>Este premio fue canjeado el <strong>${fecha}</strong> a las <strong>${hora}</strong>. Consumió ${consumidos} de ${cupones} cupones. No se puede autorizar de nuevo.</div>`;
    } else if(!aprobado){
      html += `<div class="aviso aviso-rojo">⚠️ Esta premiación NO está aprobada para el Día ${diaSeleccionado}. No autorices el ingreso.</div>`;
    } else {
      html += `<div class="aviso">🎟️ <strong>Selecciona cuántos cupones consume este premio.</strong><br>Al confirmar, el QR queda consumido del todo y no se puede usar de nuevo, aunque no se usen todos los cupones.</div>`;
      html += `<label>Cupones que consumen ahora (1 a ${cupones})</label>`;
      html += `<input type="number" id="inputCupones" min="1" max="${cupones}" value="${cupones}" class="campo-cupones">`;
      html += `<button class="btn btn-grande" id="btnCanjearPremio">✅ AUTORIZAR Y CONSUMIR PREMIO</button>`;
    }
    // Contenedor del resultado del canjeo (norma v2.2), siempre presente (oculto).
    html += `<div id="msgAutPremiacion" class="aviso" hidden></div>`;
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
            // Rechazo real del servidor (ERR_DIA / ERR_ANULADA / ERR_USADA …):
            // se pinta DENTRO de la tarjeta, junto al botón (norma v2.2).
            const m = document.getElementById('msgAutPremiacion');
            if(m) pintarAviso(m, '⛔ No se pudo canjear: ' + (r || 'código desconocido') + '. Vuelve a escanear el QR.', 'aviso aviso-rojo');
            btnCanjear.disabled = false;
            btnCanjear.textContent = '✅ AUTORIZAR Y CONSUMIR PREMIO';
          }
        }catch(e){
          // P2-01: red caída → cola local. El canje en cola se ejecuta con
          // TODOS los cupones (mismo valor por defecto de la pantalla con red);
          // si el servidor lo rechaza (ERR_USADA), NO duplica.
          if(esErrorRed(e)){
            const nCola = await naEncolar('premiacion', { codigo_qr: codigoQR, cupones_usados: n });
            const m = document.getElementById('msgAutPremiacion');
            if(m) pintarAviso(m, naAvisoEncolado(nCola), nCola === null ? 'aviso aviso-rojo' : 'aviso');
            btnCanjear.disabled = false; // se valida de nuevo al regresar la red
            btnCanjear.textContent = '✅ AUTORIZAR Y CONSUMIR PREMIO';
          }else{
            alert('Error: ' + (e.message || e));
            btnCanjear.disabled = false;
            btnCanjear.textContent = '✅ AUTORIZAR Y CONSUMIR PREMIO';
          }
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
      const horaUltima = ultimaPersona.marcado_at ? horaTexto(ultimaPersona.marcado_at) : 'hora no registrada';
      const nombres = personas.map(p => `✅ ${escaparHtml(p.nombre)} ${escaparHtml(p.apellido)} (CI: ${escaparHtml(cedulaMascara(p.cedula))})`).join('<br>');
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
      // P1-02: reabrir solo lo ve el supervisor; la RPC ya lo rechaza para puerta.
      // El botón de cerrar lista (p_cerrada:true) es flujo normal del operador.
      if(esSupervisor()){
        html += `<button class="btn btn-gris" id="btnReabrirLista">🔓 Reabrir lista</button>`;
      }
    }else{
      html += `<button class="btn btn-rojo" id="btnCerrarLista"> Cerrar lista</button>`;
    }
    html += `</div>`;
    // Contenedor del resultado de reabrir: siempre presente (oculto) para que
    // el mensaje sobreviva al redibujado del panel tras el reabrir (norma v2.2).
    html += `<div id="msgReabrir" class="aviso" role="status" aria-live="polite" hidden></div>`;
    
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
      html += `<div class="persona-detalle">CI: ${escaparHtml(cedulaMascara(p.cedula))} • ${escaparHtml(p.cargo)}</div>`;
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
    html += `</div>`;
    // Contenedor del resultado de la autorización de esta persona (norma v2.2):
    // el rechazo de la RPC se pinta aquí, junto al botón correspondiente.
    html += `<div id="msgAutPersona" class="aviso" hidden></div>`;
    html += `</div>`;
    mostrarPanel(html);
    
    panelResultado.querySelectorAll('button[data-persona]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const personaId = btn.getAttribute('data-persona');
        // P1-02 fase 2: revalidar el estado del evento ANTES de autorizar
        // (criterios 3 y 4). Sin verificación no se llama a la RPC.
        if(!await estadoEventoOperativo()){
          return;
        }
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
            // P1-02 fase 2: rechazo real de la RPC. Se reconsulta el estado y
            // se muestra el motivo concreto dentro de esta tarjeta (norma v2.2).
            const r = await resolverRechazoAutorizacion();
            if(r.repintar) await buscarListaPorCodigo(listaActualCodigo);
            const m = document.getElementById('msgAutPersona');
            if(m && r.msg) pintarAviso(m, r.msg, 'aviso aviso-rojo');
            if(!r.repintar){
              btn.disabled = false;
              btn.textContent = '✅ Autorizar';
            }
          }
        }catch(e){
          // P2-01: red caída → cola local (sin reenvío duplicado).
          if(esErrorRed(e)){
            const n = await naEncolar('persona', { persona_id: personaId });
            const m = document.getElementById('msgAutPersona');
            if(m) pintarAviso(m, naAvisoEncolado(n), n === null ? 'aviso aviso-rojo' : 'aviso');
          }else{
            alert('Error: ' + (e.message || e));
            btn.disabled = false;
            btn.textContent = '✅ Autorizar';
          }
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
            await buscarListaPorCodigo(listaActualCodigo);
            // El panel se redibujó (la lista ya está abierta): repinta el
            // resultado en #msgReabrir, que sigue presente y oculto.
            const m = document.getElementById('msgReabrir');
            if(m){
              pintarAviso(m, 'Lista reabierta. Ya puedes autorizar a las personas pendientes.', 'aviso aviso-verde');
            }
          }else{
            const m = document.getElementById('msgReabrir');
            if(m){
              pintarAviso(m, 'No se pudo reabrir la lista. Puede que tu sesión no sea de supervisor.', 'aviso aviso-rojo');
            }
            btnReabrir.disabled = false;
            btnReabrir.textContent = '🔓 Reabrir lista';
          }
        }catch(e){
          const m = document.getElementById('msgReabrir');
          if(m){
            pintarAviso(m, 'No se pudo conectar. Revisa la conexión e inténtalo otra vez.', 'aviso aviso-rojo');
          }
          btnReabrir.disabled = false;
          btnReabrir.textContent = '🔓 Reabrir lista';
        }
      });
    }
  }catch(e){
    mostrarError('Error al cargar la lista: ' + (e.message || e));
  }
}

// F-5 (tareas/F-5-parametros-url-puerta.md): al entrar (login nuevo o sesión ya
// guardada), pre-llena el campo manual con el código que venga en el link
// compartido: ?v= → ?lista= → ?cl= → ?ci=. Solo pre-llena el campo: NO lanza
// búsqueda automática. Devuelve el código aplicado o null.
function aplicarParametrosURL(){
  const params = new URLSearchParams(location.search);
  const codigo = params.get('v') || params.get('lista') || params.get('cl') || params.get('ci');
  if(!codigo) return null;
  inputManual.value = codigo;
  return codigo;
}

(function(){
  const s = leerSesion();
  if(s && (s.rol === 'puerta' || s.rol === 'supervisor')){
    tokenSesion = s.token;
    activarAutoBloqueo();
    // P2-01: monitor de red desde la carga (no depende de llegar al panel).
    naIniciarMonitorRed();
    verificarEstadoEvento();
  }else{
    // P1-02: un rol guardado que ya no es válido aquí (p. ej. admin) no entra.
    borrarSesion();
  }
  if(tokenSesion){
    aplicarParametrosURL();
  }
})();
