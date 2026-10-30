const elPin = document.getElementById('pin');
const btnEntrar = document.getElementById('btnEntrar');
const msgError = document.getElementById('msgError');

function redirigirPorRol(rol){
  if(rol === 'admin'){
    location.href = 'dashboard.html';
  }else if(rol === 'puerta'){
    location.href = 'puerta.html';
  }
}

// Si ya hay sesión activa, redirigir directamente
(function(){
  const s = leerSesion();
  if(s && s.token && s.rol){
    redirigirPorRol(s.rol);
  }
})();

btnEntrar.addEventListener('click', async () => {
  const pin = elPin.value.trim();
  if(!pin){
    msgError.textContent = 'Escribe un PIN.';
    msgError.style.display = 'block';
    return;
  }
  
  btnEntrar.disabled = true;
  btnEntrar.textContent = 'Entrando...';
  msgError.style.display = 'none';
  
  try{
    const r = await llamar('f_login', { p_pin: pin });
    if(!r || r.length === 0){
      msgError.textContent = 'PIN incorrecto.';
      msgError.style.display = 'block';
      btnEntrar.disabled = false;
      btnEntrar.textContent = 'Entrar';
      return;
    }
    
    guardarSesion(r[0].token, r[0].rol);
    redirigirPorRol(r[0].rol);
  }catch(e){
    // P0-03: mensajes legibles y sin filtrar detalles internos.
    const msgRaw = (e && e.message) ? e.message : String(e);
    if(msgRaw.indexOf('BLOQUEADO') !== -1){
      msgError.textContent = '⛔ Bloqueado: demasiados intentos fallidos desde esta conexión. Espera 15 minutos y vuelve a intentar.';
    }else{
      msgError.textContent = 'Error al entrar. Revisa tu conexión e intenta de nuevo.';
    }
    msgError.style.display = 'block';
    btnEntrar.disabled = false;
    btnEntrar.textContent = 'Entrar';
  }
});

elPin.addEventListener('keydown', (e) => {
  if(e.key === 'Enter'){
    btnEntrar.click();
  }
});

