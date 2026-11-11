// Helper compartido de diálogos de la app (regla v2.1: nunca alert/confirm nativos).
// Sustituye a los diálogos del navegador con el MISMO texto y la MISMA decisión.
// Restricción CSP: las páginas cierran style-src sin 'unsafe-inline', así que los
// estilos se aplican SOLO por CSSOM (el.style.propiedad), que la CSP no bloquea.
// El contenido se construye con createElement + textContent (sin innerHTML: sin XSS).
(function () {
  'use strict';

  if (typeof window === 'undefined') return;
  var NA = window.NA = window.NA || {};

  var ESTILOS = {
    fondo: {
      position: 'fixed',
      inset: '0',
      background: 'rgba(15,23,42,.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      zIndex: '9000'
    },
    caja: {
      background: '#fff',
      color: '#111',
      borderRadius: '12px',
      maxWidth: '440px',
      width: '100%',
      boxShadow: '0 20px 40px rgba(0,0,0,.25)',
      padding: '20px',
      font: '14px/1.45 system-ui, Segoe UI, Roboto, sans-serif'
    },
    titulo: {
      fontWeight: '700',
      fontSize: '16px',
      margin: '0 0 8px'
    },
    mensaje: {
      whiteSpace: 'pre-wrap',
      margin: '0 0 16px'
    },
    acciones: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '8px'
    },
    boton: {
      padding: '8px 14px',
      borderRadius: '8px',
      border: '1px solid #cbd5e1',
      background: '#f8fafc',
      cursor: 'pointer',
      font: 'inherit'
    },
    botonPrincipal: {
      background: '#0f172a',
      color: '#fff',
      borderColor: '#0f172a'
    }
  };

  // Una sola instancia a la vez: las llamadas encadenadas esperan en cola.
  var cola = [];
  var hayModalAbierto = false;
  var contadorIds = 0;

  function crearBoton(texto, clases, esPrincipal, alPulsar) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = clases;
    btn.textContent = texto;
    Object.assign(btn.style, ESTILOS.boton);
    if (esPrincipal) Object.assign(btn.style, ESTILOS.botonPrincipal);
    btn.addEventListener('click', alPulsar);
    return btn;
  }

  // decision = valor con el que se resuelve al cerrar por Aceptar.
  // cancelar  = valor con el que se resuelve al cerrar por Escape, clic en el
  //             fondo o botón Cancelar.
  function pintarModal(titulo, mensaje, botones, cancelar, resolver) {
    var focoPrevio = document.activeElement;

    var fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    Object.assign(fondo.style, ESTILOS.fondo);

    var caja = document.createElement('div');
    caja.className = 'modal-caja';
    Object.assign(caja.style, ESTILOS.caja);
    caja.setAttribute('role', 'dialog');
    caja.setAttribute('aria-modal', 'true');

    var h2 = document.createElement('h2');
    h2.className = 'modal-titulo';
    h2.id = 'na-modal-titulo-' + (++contadorIds);
    h2.textContent = titulo;
    Object.assign(h2.style, ESTILOS.titulo);
    caja.setAttribute('aria-labelledby', h2.id);
    caja.appendChild(h2);

    var p = document.createElement('p');
    p.className = 'modal-mensaje';
    p.id = 'na-modal-mensaje-' + contadorIds;
    p.textContent = mensaje;
    Object.assign(p.style, ESTILOS.mensaje);
    caja.setAttribute('aria-describedby', p.id);
    caja.appendChild(p);

    var acciones = document.createElement('div');
    acciones.className = 'modal-acciones';
    Object.assign(acciones.style, ESTILOS.acciones);

    var btnPrincipal = null;
    botones.forEach(function (b) {
      var btn = crearBoton(b.texto, b.clases, b.esPrincipal, function () {
        cerrar(b.valor);
      });
      if (b.esPrincipal) btnPrincipal = btn;
      acciones.appendChild(btn);
    });
    caja.appendChild(acciones);
    fondo.appendChild(caja);

    // Escape y clic en el fondo = misma decisión que Cancelar.
    function alTeclado(ev) {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        cerrar(cancelar);
      }
    }
    fondo.addEventListener('mousedown', function (ev) {
      if (ev.target === fondo) cerrar(cancelar);
    });
    document.addEventListener('keydown', alTeclado, true);

    function cerrar(valor) {
      fondo.remove();
      document.removeEventListener('keydown', alTeclado, true);
      if (focoPrevio && typeof focoPrevio.focus === 'function') focoPrevio.focus();
      resolver(valor);
      abrirSiguiente();
    }

    document.body.appendChild(fondo);
    if (btnPrincipal) btnPrincipal.focus();
  }

  function abrirSiguiente() {
    var siguiente = cola.shift();
    if (!siguiente) {
      hayModalAbierto = false;
      return;
    }
    hayModalAbierto = true;
    try {
      pintarModal(
        siguiente.titulo,
        siguiente.mensaje,
        siguiente.botones,
        siguiente.cancelar,
        siguiente.resolver
      );
    } catch (e) {
      console.error('NA.modales: no se pudo mostrar el diálogo.', e);
      siguiente.resolver(siguiente.cancelar);
      abrirSiguiente();
    }
  }

  function encolar(titulo, mensaje, botones, cancelar, valorSinDocument) {
    if (typeof document === 'undefined') {
      return Promise.resolve(valorSinDocument);
    }
    return new Promise(function (resolve) {
      cola.push({
        titulo: titulo,
        mensaje: mensaje,
        botones: botones,
        cancelar: cancelar,
        resolver: resolve
      });
      if (!hayModalAbierto) abrirSiguiente();
    });
  }

  // Reemplaza al diálogo nativo de aviso: Promise<true>
  NA.avisar = function (mensaje, titulo) {
    return encolar(
      titulo == null ? 'Aviso' : String(titulo),
      String(mensaje),
      [{ texto: 'Aceptar', clases: 'btn', esPrincipal: true, valor: true }],
      true, // Escape o clic en el fondo cierran el aviso
      true  // sin document, se resuelve igual que Aceptar
    );
  };

  // Reemplaza al diálogo nativo de confirmación: Promise<boolean> (true = Aceptar, false = Cancelar)
  NA.confirmar = function (mensaje, titulo) {
    return encolar(
      titulo == null ? 'Confirmar' : String(titulo),
      String(mensaje),
      [
        { texto: 'Cancelar', clases: 'btn btn-gris', esPrincipal: false, valor: false },
        { texto: 'Aceptar', clases: 'btn', esPrincipal: true, valor: true }
      ],
      false, // Escape o clic en el fondo = Cancelar
      false  // sin document, se resuelve igual que Cancelar
    );
  };
})();
