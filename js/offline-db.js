/* ===== js/offline-db.js · P2-01 — IndexedDB para el modo offline de puerta =====
   Guarda, SIN red, lo que la puerta necesita para seguir operando:

   · colas_escaneo  — cola de escaneos/autorizaciones pendientes de enviar al
     servidor. Cada fila: { id, tipo, data, estado, intentos, created_at }
       - tipo: 'vendedor' | 'cortesia' | 'persona' | 'premiacion' (llamada de
         marca exacta, con sus argumentos en data) o 'escaneo' (solo el código
         leído sin conexión; al sincronizar se consulta y se marca).
       - estado: 'pendiente' (se envía al volver la red) → 'synced' (enviado,
         se borra) o 'error' (el servidor lo rechazó por una causa que NO es
         de red: no se reintentará, queda guardado para revisión).
   · pases_dia1 / pases_dia2 — copia local de las listas de personas del día
     (salida de f_puerta_lista), hecha al entrar/exportar, para el CSV de
     respaldo sin conexión.

   Espíritu: la seguridad real sigue viva en las RPC del servidor (revalidación
   P1-02/0011). Esto es SOLO memoria local del operador de puerta: no sirve
   para acciones de admin ni para saltarse el estado del evento.

   Exposición: window.NAOfflineDB con cada función con nombre propio. */
(function(){
  'use strict';

  var DB_NOMBRE = 'nitroacceso-puerta';
  var DB_VERSION = 1;
  var T_COLA = 'colas_escaneo';
  var T_PASES_DIA = { 1: 'pases_dia1', 2: 'pases_dia2' };

  var dbPromesa = null;

  function abrirDB(){
    if (dbPromesa) return dbPromesa;
    dbPromesa = new Promise(function(resolve, reject){
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB no disponible en este navegador'));
        return;
      }
      var req = indexedDB.open(DB_NOMBRE, DB_VERSION);
      req.onupgradeneeded = function(ev){
        var db = ev.target.result;
        if (!db.objectStoreNames.contains(T_COLA)) {
          var osCola = db.createObjectStore(T_COLA, { keyPath: 'id' });
          osCola.createIndex('estado', 'estado', { unique: false });
          osCola.createIndex('created_at', 'created_at', { unique: false });
        }
        [T_PASES_DIA[1], T_PASES_DIA[2]].forEach(function(nombre){
          if (!db.objectStoreNames.contains(nombre)) {
            db.createObjectStore(nombre, { keyPath: 'dia' });
          }
        });
      };
      req.onsuccess = function(){ resolve(req.result); };
      req.onerror = function(){ dbPromesa = null; reject(req.error || new Error('No se pudo abrir IndexedDB')); };
    });
    return dbPromesa;
  }

  // Envuelve una transacción de una sola tienda en una promesa.
  function transaccion(store, modo, fn){
    return abrirDB().then(function(db){
      return new Promise(function(resolve, reject){
        var tx = db.transaction(store, modo);
        var resultado = null;
        try {
          resultado = fn(tx.objectStore(store));
        } catch (e) {
          reject(e);
          return;
        }
        tx.oncomplete = function(){ resolve(resultado); };
        tx.onerror = function(){ reject(tx.error); };
        tx.onabort = function(){ reject(tx.error || new Error('Transacción abortada')); };
      });
    });
  }

  // ----- Pases del día (respaldo CSV local) -----

  function guardarPases(dia, arrayPases){
    var nombre = T_PASES_DIA[dia];
    if (!nombre) return Promise.reject(new Error('Día inválido: ' + dia));
    return transaccion(nombre, 'readwrite', function(os){
      os.put({ dia: dia, pases: arrayPases || [], guardado_at: new Date().toISOString() });
    });
  }

  function obtenerPases(dia){
    var nombre = T_PASES_DIA[dia];
    if (!nombre) return Promise.reject(new Error('Día inválido: ' + dia));
    return transaccion(nombre, 'readonly', function(os){
      var req = os.get(dia);
      return req;
    }).then(function(req){
      var fila = (req && req.result) || null;
      if (fila && Array.isArray(fila.pases)) return fila.pases;
      return null;
    });
  }

  function limpiarPases(dia){
    var nombre = T_PASES_DIA[dia];
    if (!nombre) return Promise.reject(new Error('Día inválido: ' + dia));
    return transaccion(nombre, 'readwrite', function(os){ os.delete(dia); });
  }

  // ----- Cola de escaneos -----

  function guardarEnCola(request_id, tipo, data){
    return transaccion(T_COLA, 'readwrite', function(os){
      os.put({
        id: String(request_id),
        tipo: String(tipo),
        data: data || {},
        estado: 'pendiente',
        intentos: 0,
        created_at: new Date().toISOString()
      });
    });
  }

  // Devuelve TODA la cola (pendientes + errores), ordenada por creación.
  function obtenerCola(){
    return transaccion(T_COLA, 'readonly', function(os){
      return os.getAll();
    }).then(function(req){
      var filas = (req && req.result) || [];
      filas.sort(function(a, b){ return String(a.created_at).localeCompare(String(b.created_at)); });
      return filas;
    });
  }

  // Borra por id las filas RESUELTAS (synced: ya están respaldadas en el
  // servidor). Las de estado 'error' NO se borran aquí: quedan para revisión.
  function limpiarCola(idsExitosos){
    var ids = (idsExitosos || []).map(String);
    if (ids.length === 0) return Promise.resolve();
    return transaccion(T_COLA, 'readwrite', function(os){
      ids.forEach(function(id){ os.delete(id); });
    });
  }

  // Cambia el estado de una fila de la cola ('pendiente' → 'error') y, si se
  // pasa, acumula el número de intentos.
  function marcarCola(id, estado, intentos){
    return transaccion(T_COLA, 'readonly', function(os){
      return os.get(String(id));
    }).then(function(req){
      var fila = req && req.result;
      if (!fila) return null;
      return transaccion(T_COLA, 'readwrite', function(os){
        fila.estado = String(estado);
        if (typeof intentos === 'number') fila.intentos = intentos;
        os.put(fila);
      });
    });
  }

  // Cuenta cuántas filas quedan 'pendiente' (lo que pinta el indicador).
  function contarPendientes(){
    return obtenerCola().then(function(filas){
      return filas.filter(function(f){ return f.estado === 'pendiente'; }).length;
    });
  }

  if (typeof window !== 'undefined') {
    window.NAOfflineDB = {
      abrirDB: abrirDB,
      guardarPases: guardarPases,
      obtenerPases: obtenerPases,
      limpiarPases: limpiarPases,
      guardarEnCola: guardarEnCola,
      obtenerCola: obtenerCola,
      limpiarCola: limpiarCola,
      marcarCola: marcarCola,
      contarPendientes: contarPendientes,
      // Nombres internos, por si otra pantalla del proyecto necesita el shell:
      tiendaCola: T_COLA,
      tiendaPasesDia: T_PASES_DIA
    };
  }
})();
