# 03 - Talento

## Que es

La pantalla **"Registro de talento"** es la página que abre el **link del talento** (un link del tipo `…talento.html?t=CÓDIGO`). Ahí el representante del talento arma la **lista de personas** que entran por el talento, día por día, y obtiene el **QR de cada lista** para mostrarlo en la puerta.

## Quien lo usa

- **Coordinador de talentos**: crea el link en coord.html y lo entrega (capítulo 07).
- **Representante del talento**: usa el link para armar sus listas y compartir los QR.

## Antes de empezar

- Ten el **link completo** a mano. Si solo te pasaron parte del texto, pide el link completo a tu coordinador.
- Averigua con tu talento **quiénes entran el Día 1 y quiénes el Día 2** antes de empezar.
- Cada persona necesita: **nombre, apellido, cédula y cargo**. Sin esos cuatro datos, la fila no se guarda.
- **Cedula: solo numeros, sin la V ni puntos.** Escribe `12345678`, no `V-12345678` ni `V12345678`. Los campos avisan al instante si escribes algo que no va (borde rojo y un texto debajo del campo), así que corrígelo antes de guardar.
- Si la lista de un día ya está **en puerta o cerrada**, ya no se edita: es solo para consultar.

## Paso a paso

**1. Abrir el link**

- Al abrirlo verás **"Cargando tu link..."** y después el **nombre del talento** como título.
- Si la edición está abierta: **"La edicion esta ABIERTA: puedes guardar cambios mientras cada lista no pase a puerta."** Si está cerrada: **"El administrador CERRo la edicion: estas viendo solo consulta."**

**2. Armar la lista del Día 1**

1. En la tarjeta **"Dia 1"** (cada día es una tarjeta con su insignia de estado), arriba verás la **barra de acciones**: los cuatro botones del día, uno junto al otro, y **pegajosa** (queda fija arriba de la tarjeta aunque la lista sea larga, con muchas o pocas personas).
2. Pulsa **"Agregar participante"**: se agrega una fila con cuatro campos: **Nombre, Apellido, Cedula, Cargo**.
3. **Los campos avisan mientras escribes**: si escribes algo que no va (por ejemplo, una letra en la cédula o un `<` en el nombre), ese campo se marca con borde rojo y un texto breve debajo explicando el problema. El aviso desaparece solo cuando corriges el campo. La **Cedula** pide **solo numeros, sin la V ni puntos**: `12345678`, no `V-12345678`.
4. Llena los cuatro campos de cada fila y repite por persona. Para borrar una fila mal puesta, pulsa **"Quitar"**.
5. Pulsa **"Guardar lista del Dia 1"**.
6. Debe aparecer el mensaje **"Lista del Dia N guardada."** justo debajo de los botones de esa barra de acciones, y la página se recarga con los datos guardados. Todo lo que el sistema tenga que decirte sobre esta lista sale **ahí, junto a los botones**, nunca escondido en otra parte de la página; si algo impide el guardado, además se abre una **ventana de aviso** (modal) con el detalle.

**3. Copiar personas del Día 1 al Día 2 (selectiva y repetible)**

En la barra de acciones de la tarjeta **"Dia 2"** hay un botón **"Copiar del Dia 1"** (aparece mientras el Dia 2 sea editable y el Dia 1 tenga personas guardadas). Al pulsarlo se abre un **panel de selección**:

- Una **casilla por cada persona del Dia 1**, con su nombre, cédula y cargo. **Todas vienen marcadas** por defecto.
- Quien **ya esté en la lista del Dia 2** (misma cédula) aparece con la etiqueta **"— ya en la lista"**, desmarcado y sin poder marcarse: copiarla no haría nada, porque la copia no duplica.
- El **contador** dice cuántas vas copiando: "**N de M seleccionadas**" (y cuántas ya estaban).
- **"Seleccionar todas"** / **"Ninguna"** marcan o desmarcan de un tirón (las "ya en la lista" no cuentan).
- Pulsa **"Copiar seleccionados"**: la copia **suma**: agrega al Dia 2 solo las personas nuevas y **no borra nada** de lo que ya esté. El resultado se dice en un aviso junto a los botones y en una ventana emergente: "N personas copiadas" y, si aplica, cuántas ya estaban.
- **"Cancelar"** cierra el panel sin copiar nada.

La copia es **repetible**: puedes volver a copiar más veces dentro de la misma sesión y otra vez cuando abras el link; quien ya esté simplemente queda "ya en la lista". Y si algo falla (edición cerrada, la lista del Dia 2 ya pasó a puerta, o el link dejó de valer), la ventana de aviso te dice el motivo concreto y tu **fallback manual nunca desaparece**: agrega a mano con "Agregar participante" y guarda.

**3b. Vaciar la lista del Dia N (borra de verdad)**

- El botón **"Vaciar la lista del Dia N"** (en la barra de acciones) **borra de verdad** todas las personas guardadas del Día N en la base: después de vaciar, la lista queda vacía aunque cierres y vuelvas a abrir el link.
- Antes de borrar pide **confirmación** en una ventana: "Se borraran N personas guardadas... Esta accion no se puede deshacer." Si aceptas, se vacía; si no, no pasa nada.
- Si prefieres mantener el Dia 2 casi igual al Dia 1, ese botón es tu atajo.

**4. Guardar el Día 2** igual que el Día 1: filas completas y **"Guardar lista del Dia 2"**. O copia del Dia 1 lo que haga falta (paso 3) y ajusta lo que sobre.

**5. Ver y compartir el QR de cada lista**

Cuando una lista tiene al menos una persona guardada, aparece su caja QR con el texto **"Muestra este QR en la puerta, o dicta el codigo corto si el QR no se pudiera leer."** Botones de cada QR:

- **"Copiar QR"**: copia la imagen para pegarla en un chat; si el navegador no lo permite, copia el texto con el código y el link.
- **"WhatsApp"**: abre WhatsApp con el mensaje listo para enviar.
- **"Correo"**: abre tu correo con el mensaje listo.

**6. Terminar y salir**

- En la barra fija de abajo, pulsa **"✅ Terminé: ver mis QR y salir"** para ver la pantalla final **"✅ Tarea cumplida"** con todos tus QR juntos.
- Desde ahí: **"Volver a mis listas"** para seguir editando, o **"Cerrar esta pestana"**. Si el navegador no deja cerrar la pestaña, el sistema lo dice y puedes cerrarla tú; tus QR quedan guardados.
- No hace falta cerrar sesión: quien abre el link entra y sale libremente; el link sigue funcionando mientras el talento exista.

## Que debes ver

- El título con el nombre del talento y una tarjeta por cada día con su insignia: **"En edicion"** (verde), **"En puerta"** (azul) o **"Cerrada"** (roja).
- En cada tarjeta editable: la **barra de acciones arriba y pegajosa** con hasta cuatro botones ("Copiar del Dia 1" solo en el Dia 2), y el **aviso del resultado justo debajo de esos botones**, sin importar cuántas personas tenga la lista.
- Los campos con error se marcan **con borde rojo y un texto breve debajo del propio campo** en cuanto escribes algo que no va.
- El mensaje **"Lista del Dia N guardada."** tras guardar.
- La caja QR de cada lista con su código corto debajo.
- En una lista cerrada o en edición cerrada: la tabla de personas en modo lectura y el aviso **"Esta lista ya esta en puerta o cerrada: no se puede editar, solo consultar."** (o "La edicion esta cerrada: esta lista es solo de consulta.").
- Si una lista no tiene QR todavía: **"El QR de esta lista aparecera aqui cuando guardes al menos un participante con todos sus datos."**

## Errores comunes

- **Ventana de aviso "Corrige los campos marcados"** con el texto **"No se pudo guardar la lista del Dia N: 1 fila tiene problemas (o "X filas tienen problemas"). Fila 2: Nombre, Cedula..."**: el guardado no se realizó y el sistema te dice **en cuántas filas y en qué campos** hay que corregir. Los campos en falta quedan marcados con borde rojo y un texto debajo (por ejemplo **"Este campo es obligatorio."** o **"Solo numeros, sin la V ni puntos dobles, minimo 4 digitos."**). Corrigelos ahí mismo y vuelve a pulsar Guardar.
- **"Hay cedulas repetidas dentro de la lista del Dia N. Cada participante debe tener una cedula distinta."**: dos personas con la misma cédula en el mismo día.
- **"No se pudo guardar la lista. Revisa que la edicion este abierta y que ningun campo quede vacio."**: la edición pudo cerrarse mientras editabas; avisa al administrador.
- **Copias que no se concretan**: si al copiar del Dia 1 aparece la ventana con "el administrador cerro la edicion", "la lista del Dia N ya no esta en edicion" o "el link ya no es valido", ese último es el motivo y no se copio nada; si tu lista sigue editable puedes agregar a mano y guardar.
- **La lista no se puede editar**: la lista pasó a "En puerta" o "Cerrada", o el administrador cerró la edición. Solo consulta.
- **"⚠️ Este link fue modificado"**: tu coordinador corrigió el talento y generó un link nuevo; el viejo quedó anulado. Pide el link nuevo.
- **"Este link no existe o fue revocado. Pidele uno nuevo a tu coordinador."**: link incompleto, mal escrito o revocado.

## Que no hacer

- **No guardes la lista sin revisarla**: una cédula mal escrita se descubre en la puerta, cuando ya no se puede editar. **Cedula: solo numeros, sin la V ni puntos.**
- **No uses "Vaciar la lista del Dia N" sin querer**: borra de verdad y no se puede deshacer; por eso pide confirmación.
- **No compartas el link del talento en redes ni grupos**: es único y está amarrado al correo del representante.
- **No intentes editar listas en puerta o cerradas**: el sistema lo bloquea por diseño.

*Probado en el entorno de pruebas el 11/11/2026.*
