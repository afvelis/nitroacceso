function intentarCerrar(){
  window.close();
  setTimeout(function(){
    var el = document.getElementById('ayudaCerrar');
    if (el) el.style.display = 'block';
  }, 200);
}

document.getElementById('btnCerrar').addEventListener('click', intentarCerrar);
