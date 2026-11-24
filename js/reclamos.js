// reclamos.html — M-36 fase 1 (RQ-05, RQ-06): bandeja de reclamos del admin.
// La sesión admin ya se validó en el <head>. La RPC devuelve null si la sesión
// no es admin. Todo dato de la base se pinta con textContent/createElement:
// nada de innerHTML con datos (P0-01). El resultado de cada "Guardar" se muestra
// DENTRO de la tarjeta de ese reclamo (norma v2.2).
(function () {
  'use strict';

  const SESION = leerSesion();
  const TOKEN = SESION ? SESION.token : null;

  const ESTADOS = {
    nuevo: 'Nuevo',
    en_revision: 'En revisión',
    resuelto: 'Resuelto',
    rechazado: 'Rechazado'
  };
  const ORDEN_ESTADOS = ['nuevo', 'en_revision', 'resuelto', 'rechazado'];

  const MOTIVOS = {
    anulacion_no_entendida: 'No entiendo por qué anularon mi asignación',
    anulacion_por_error: 'Creo que me anularon por error',
    cupones_no_disponibles: 'Mis cupones no aparecen o no se pueden usar',
    datos_incorrectos: 'Mis datos están incorrectos',
    otro: 'Otro motivo'
  };

  const ERRORES_GUARDAR = {
    SESION: 'Tu sesión expiró: vuelve a entrar.',
    ESTADO_INVALIDO: 'Estado no válido.',
    NO_EXISTE: 'Ese reclamo ya no existe.',
    RESPUESTA_LARGA: 'El texto es demasiado largo.',
    NOTA_LARGA: 'El texto es demasiado largo.'
  };

  let filtro = '';

  // Mensajes que deben aparecer en una tarjeta recién re-pintada (el resultado
  // del guardado sobrevive a la recarga de la lista).
  const mensajesPendientes = {};

  function el(id){ return document.getElementById(id); }

  function fmtFechaHora(f){
    if(!f) return '-';
    const d = new Date(f);
    if(isNaN(d.getTime())) return String(f);
    const p = n => String(n).padStart(2, '0');
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function setMensaje(zona, texto, esError){
    zona.textContent = '';
    if(!texto) return;
    const span = document.createElement('div');
    span.className = 'msg-tarjeta ' + (esError ? 'msg-err' : 'msg-ok');
    span.textContent = texto;
    zona.appendChild(span);
  }

  function pintarTarjeta(rec){
    const tarjeta = document.createElement('div');
    tarjeta.className = 'reclamo';

    const cab = document.createElement('div');
    cab.className = 'cab';
    const cod = document.createElement('strong');
    cod.textContent = rec.codigo_reclamo;
    const pill = document.createElement('span');
    pill.className = 'pill ' + (rec.estado === 'resuelto' ? 'pill-verde'
      : rec.estado === 'rechazado' ? 'pill-rojo'
      : rec.estado === 'en_revision' ? 'pill-azul' : 'pill-amarillo');
    pill.textContent = ESTADOS[rec.estado] || String(rec.estado || '');
    const fecha = document.createElement('span');
    fecha.className = 'suave-14';
    fecha.textContent = fmtFechaHora(rec.creada_at);
    cab.appendChild(cod);
    cab.appendChild(pill);
    cab.appendChild(fecha);
    tarjeta.appendChild(cab);

    function linea(etiqueta, valor){
      const p = document.createElement('p');
      p.className = 'r-linea';
      const b = document.createElement('b');
      b.textContent = etiqueta + ' ';
      p.appendChild(b);
      p.appendChild(document.createTextNode(valor));
      tarjeta.appendChild(p);
    }
    linea('Motivo:', MOTIVOS[rec.motivo] || String(rec.motivo || '-'));
    linea('Link:', rec.codigo_link || '-');
    linea('Quién:', rec.nombre_contacto || '-');
    linea('Contacto:', rec.contacto || '-');
    linea('Detalle:', rec.detalle || 'Sin detalle');
    linea('Nota interna:', rec.nota_interna || '—');
    linea('Respuesta:', rec.respuesta || '—');

    const form = document.createElement('div');
    form.className = 'form-reclamo';

    const lblEstado = document.createElement('label');
    lblEstado.textContent = 'Estado del reclamo';
    const sel = document.createElement('select');
    ORDEN_ESTADOS.forEach(est => {
      const opt = document.createElement('option');
      opt.value = est;
      opt.textContent = ESTADOS[est];
      if(rec.estado === est) opt.selected = true;
      sel.appendChild(opt);
    });
    lblEstado.appendChild(sel);
    form.appendChild(lblEstado);

    const lblResp = document.createElement('label');
    lblResp.textContent = 'Respuesta visible al reclamante';
    const taResp = document.createElement('textarea');
    taResp.rows = 3;
    taResp.maxLength = 1000;
    taResp.value = rec.respuesta || '';
    lblResp.appendChild(taResp);
    form.appendChild(lblResp);

    const lblNota = document.createElement('label');
    lblNota.textContent = 'Nota interna (no la ve el reclamante)';
    const taNota = document.createElement('textarea');
    taNota.rows = 2;
    taNota.maxLength = 1000;
    taNota.value = rec.nota_interna || '';
    lblNota.appendChild(taNota);
    form.appendChild(lblNota);

    const acciones = document.createElement('div');
    acciones.className = 'fila';
    const btn = document.createElement('button');
    btn.className = 'btn btn-verde btn-mini';
    btn.textContent = 'Guardar cambios';
    acciones.appendChild(btn);
    form.appendChild(acciones);

    const zonaMsg = document.createElement('div');
    form.appendChild(zonaMsg);

    tarjeta.appendChild(form);

    btn.addEventListener('click', async () => {
      setMensaje(zonaMsg, '');
      btn.disabled = true;
      btn.textContent = 'Guardando...';
      try{
        const r = await llamar('f_admin_resolver_reclamo', {
          p_token: TOKEN,
          p_codigo: rec.codigo_reclamo,
          p_estado: sel.value,
          p_respuesta: taResp.value.trim() || null,
          p_nota_interna: taNota.value.trim() || null
        });
        if(r && r.ok){
          mensajesPendientes[rec.codigo_reclamo] = 'Cambios guardados.';
          await cargar();
          return;
        }
        btn.disabled = false;
        btn.textContent = 'Guardar cambios';
        const error = r ? r.error : '';
        const texto = ERRORES_GUARDAR[error] || 'No se pudo guardar el reclamo. Inténtalo otra vez.';
        setMensaje(zonaMsg, texto, true);
        // C1 (norma v2.2): la sesión expirada impide continuar: modal propio.
        if(error === 'SESION'){
          try{ await NA.avisar(texto, 'Sesión expirada'); }catch(e2){ /* sin modal: queda el mensaje en la tarjeta */ }
        }
      }catch(e){
        btn.disabled = false;
        btn.textContent = 'Guardar cambios';
        setMensaje(zonaMsg, 'No se pudo conectar con el servidor. Inténtalo otra vez.', true);
      }
    });

    tarjeta.setAttribute('data-codigo', rec.codigo_reclamo);
    if(mensajesPendientes[rec.codigo_reclamo]){
      setMensaje(zonaMsg, mensajesPendientes[rec.codigo_reclamo], false);
      delete mensajesPendientes[rec.codigo_reclamo];
    }
    return tarjeta;
  }

  async function cargar(){
    const zona = el('zonaReclamos');
    zona.textContent = '';
    const cargando = document.createElement('p');
    cargando.className = 'suave';
    cargando.textContent = 'Consultando reclamos...';
    zona.appendChild(cargando);
    let lista = null;
    try{
      lista = await llamar('f_admin_listar_reclamos', { p_token: TOKEN, p_estado: filtro || null });
    }catch(e){
      lista = null;
    }
    zona.textContent = '';
    if(lista === null){
      const aviso = document.createElement('div');
      aviso.className = 'msg-tarjeta msg-err';
      aviso.textContent = 'Tu sesión expiró. Entra de nuevo con tu PIN.';
      zona.appendChild(aviso);
      // C1 (norma v2.2): la sesión expirada impide continuar: además del mensaje
      // en la tarjeta, aviso con el modal propio de la app (NA.avisar, del
      // helper compartido js/modales.js, cargado por la página).
      try{ await NA.avisar('Tu sesión expiró. Entra de nuevo con tu PIN.', 'Sesión expirada'); }catch(e2){ /* sin modal: queda el mensaje en la tarjeta */ }
      return;
    }
    if(!lista.length){
      const p = document.createElement('p');
      p.className = 'suave';
      p.textContent = 'No hay reclamos con este filtro.';
      zona.appendChild(p);
      return;
    }
    lista.forEach(rec => zona.appendChild(pintarTarjeta(rec)));
  }

  el('zonaFiltros').querySelectorAll('button[data-estado]').forEach(btn => {
    btn.addEventListener('click', () => {
      filtro = btn.getAttribute('data-estado') || '';
      el('zonaFiltros').querySelectorAll('button[data-estado]').forEach(b => {
        b.classList.toggle('filtro-activo', b === btn);
      });
      cargar();
    });
  });

  cargar();
})();
