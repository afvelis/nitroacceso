// reclamo.html — M-36 fase 1 (RQ-07): consulta pública del estado de un reclamo.
// Página sin login: el código REC-XXXXXX es el identificador. La RPC f_reclamo_ver
// no devuelve datos personales (código, origen, motivo, estado, respuesta y fechas).
// Todo dato que viene de la base se pinta con textContent/createElement: nada de
// innerHTML con datos (P0-01).
(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  const CODIGO_URL = params.get('r') || '';

  const MOTIVOS = {
    anulacion_no_entendida: 'No entiendo por qué anularon mi asignación',
    anulacion_por_error: 'Creo que me anularon por error',
    cupones_no_disponibles: 'Mis cupones no aparecen o no se pueden usar',
    datos_incorrectos: 'Mis datos están incorrectos',
    otro: 'Otro motivo'
  };

  const ESTADOS = {
    nuevo: { texto: 'Nuevo', clase: 'pill pill-amarillo' },
    en_revision: { texto: 'En revisión', clase: 'pill pill-azul' },
    resuelto: { texto: 'Resuelto', clase: 'pill pill-verde' },
    rechazado: { texto: 'Rechazado', clase: 'pill pill-rojo' }
  };

  function el(id){ return document.getElementById(id); }

  // dd/mm/aaaa hh:mm en la hora local del navegador.
  function fmtFechaHora(f){
    if(!f) return '-';
    const d = new Date(f);
    if(isNaN(d.getTime())) return String(f);
    const p = n => String(n).padStart(2, '0');
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function lineaResumen(etiqueta, valor){
    const p = document.createElement('p');
    p.className = 'suave-14';
    const b = document.createElement('strong');
    b.textContent = etiqueta + ' ';
    p.appendChild(b);
    p.appendChild(document.createTextNode(valor));
    return p;
  }

  function pintarError(texto){
    const zona = el('reclamoPanel');
    zona.textContent = '';
    const aviso = document.createElement('div');
    aviso.className = 'aviso aviso-rojo';
    aviso.textContent = texto;
    zona.appendChild(aviso);
  }

  async function consultar(codigo){
    const zona = el('reclamoPanel');
    zona.textContent = '';
    const cargando = document.createElement('p');
    cargando.className = 'suave';
    cargando.textContent = 'Consultando...';
    zona.appendChild(cargando);
    try{
      const r = await llamar('f_reclamo_ver', { p_codigo_reclamo: codigo });
      zona.textContent = '';
      if(!r){
        const aviso = document.createElement('div');
        aviso.className = 'aviso aviso-rojo';
        aviso.textContent = 'No encontramos ningún reclamo con ese código. Revisa que esté bien escrito.';
        zona.appendChild(aviso);
        return;
      }
      const estado = ESTADOS[r.estado] || { texto: String(r.estado || ''), clase: 'pill' };
      const pill = document.createElement('span');
      pill.className = estado.clase;
      pill.textContent = estado.texto;

      const cajaCodigo = document.createElement('div');
      cajaCodigo.className = 'codigo';
      cajaCodigo.textContent = r.codigo_reclamo;

      const esteEstado = document.createElement('p');
      esteEstado.className = 'mt-10';
      const lblEstado = document.createElement('strong');
      lblEstado.textContent = 'Estado: ';
      esteEstado.appendChild(lblEstado);
      esteEstado.appendChild(pill);

      zona.appendChild(cajaCodigo);
      zona.appendChild(esteEstado);
      zona.appendChild(lineaResumen('Motivo:', MOTIVOS[r.motivo] || String(r.motivo || '-')));
      zona.appendChild(lineaResumen('Fecha del reclamo:', fmtFechaHora(r.creada_at)));

      if(r.respuesta){
        const resp = document.createElement('div');
        resp.className = 'aviso aviso-verde mt-10';
        const titulo = document.createElement('span');
        titulo.textContent = 'Respuesta de la organización: ';
        titulo.style.fontWeight = '700';
        resp.appendChild(titulo);
        resp.appendChild(document.createTextNode(r.respuesta));
        zona.appendChild(resp);
      }else{
        const sinResp = document.createElement('p');
        sinResp.className = 'suave-14 mt-10';
        sinResp.textContent = 'Todavía no hay respuesta. Vuelve a consultar más tarde.';
        zona.appendChild(sinResp);
      }
    }catch(e){
      pintarError('No se pudo consultar en este momento. Revisa tu internet e inténtalo otra vez.');
    }
  }

  function consultarDelCampo(){
    const codigo = el('reclamoCodigo').value.trim();
    if(!codigo){
      const zona = el('reclamoPanel');
      zona.textContent = '';
      const p = document.createElement('p');
      p.className = 'suave-14';
      p.textContent = 'Escribe el código del reclamo que te dieron.';
      zona.appendChild(p);
      return;
    }
    consultar(codigo);
  }

  el('btnConsultarReclamo').addEventListener('click', consultarDelCampo);
  el('reclamoCodigo').addEventListener('keydown', ev => {
    if(ev.key === 'Enter'){ ev.preventDefault(); consultarDelCampo(); }
  });

  // Si el link llegó con ?r=, el campo nace lleno y se consulta automáticamente.
  if(CODIGO_URL){
    el('reclamoCodigo').value = CODIGO_URL;
    consultar(CODIGO_URL);
  }
})();
