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
- Si la lista de un día ya está **en puerta o cerrada**, ya no se edita: es solo para consultar.

## Paso a paso

**1. Abrir el link**

- Al abrirlo verás **"Cargando tu link..."** y después el **nombre del talento** como título.
- Si la edición está abierta: **"La edicion esta ABIERTA: puedes guardar cambios mientras cada lista no pase a puerta."** Si está cerrada: **"El administrador CERRo la edicion: estas viendo solo consulta."**

**2. Armar la lista del Día 1**

1. En la tarjeta **"Dia 1"** (cada día es una tarjeta con su insignia de estado), pulsa **"Agregar participante"**.
2. Se agrega una fila con cuatro campos: **Nombre, Apellido, Cedula, Cargo**. Llénalos.
3. Repite por cada persona. Para borrar una fila mal puesta, pulsa **"Quitar"**.
4. Pulsa **"Guardar lista del Dia 1"**.
5. Debe aparecer el mensaje **"Lista del Dia 1 guardada."** y la página se recarga con los datos guardados.

**3. Pasar la lista del Día 1 al Día 2**

Si el Dia 2 está **vacío** y ya guardaste personas en el Día 1, al pulsar **"Agregar participante"** en la tarjeta del Dia 2 el sistema ofrece una ayuda:

> Ya tienes una lista guardada del Dia 1 con N participante(s). Que prefieres hacer con el Dia 2?

- **"Repetir y editar la del Dia 1"**: copia todas las personas del Día 1 al Día 2 para luego ajustar. En el entorno de pruebas se copiaron correctamente las 3 personas de una lista.
- **"Lista nueva desde cero"**: empieza el Día 2 vacío, persona por persona.
- **"Cancelar"**: no pasa nada.

**Limitación conocida (que no es un error):** la opción de copiar **solo aparece mientras el Dia 2 esté vacío** y solo la primera vez. Si el Dia 2 ya tiene personas, o si antes pulsaste **"Lista nueva desde cero"**, esa opción **ya no vuelve a aparecer**. En ese caso agrega las personas a mano, una por una. En próximas versiones el sistema tendrá un botón nuevo para copiar cuando quieras; hoy depende de ti hacerlo a tiempo.

**4. Guardar el Día 2** igual que el Día 1: filas completas y **"Guardar lista del Dia 2"**.

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
- El mensaje **"Lista del Dia N guardada."** tras guardar.
- La caja QR de cada lista con su código corto debajo.
- En una lista cerrada o en edición cerrada: la tabla de personas en modo lectura y el aviso **"Esta lista ya esta en puerta o cerrada: no se puede editar, solo consultar."** (o "La edicion esta cerrada: esta lista es solo de consulta.").
- Si una lista no tiene QR todavía: **"El QR de esta lista aparecera aqui cuando guardes al menos un participante con todos sus datos."**

## Errores comunes

- **"Hay una fila con campos vacios en la lista del Dia N. Completa esa fila o pulsale Quitar."**: alguna fila quedó sin nombre, apellido, cédula o cargo.
- **"Hay cedulas repetidas dentro de la lista del Dia N. Cada participante debe tener una cedula distinta."**: dos personas con la misma cédula en el mismo día.
- **"No se pudo guardar la lista. Revisa que la edicion este abierta y que ningun campo quede vacio."**: la edición pudo cerrarse mientras editabas; avisa al administrador.
- **La lista no se puede editar**: la lista pasó a "En puerta" o "Cerrada", o el administrador cerró la edición. Solo consulta.
- **"⚠️ Este link fue modificado"**: tu coordinador corrigió el talento y generó un link nuevo; el viejo quedó anulado. Pide el link nuevo.
- **"Este link no existe o fue revocado. Pidele uno nuevo a tu coordinador."**: link incompleto, mal escrito o revocado.
- **La opción de copiar al Día 2 no aparece**: ver la limitación del paso 3: agrega a mano.

## Que no hacer

- **No guardes la lista sin revisarla**: una cédula mal escrita se descubre en la puerta, cuando ya no se puede editar.
- **No dejes el Dia 2 para el final**: si necesitas copiar la lista del Día 1, hazlo mientras el Dia 2 esté vacío.
- **No compartas el link del talento en redes ni grupos**: es único y está amarrado al correo del representante.
- **No intentes editar listas en puerta o cerradas**: el sistema lo bloquea por diseño.

*Probado en el entorno de pruebas el 10/11/2026.*
