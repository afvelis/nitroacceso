# 06 - Puerta

## Que es

La **puerta** es la pantalla donde el personal autoriza las entradas del evento: escanea el QR de cada persona (o escribe su código), revisa su ficha y la marca como **"autorizado"**. La puerta solo funciona **cuando el evento está cerrado para edición**.

## Quien lo usa

Dos puestos entran por la misma pantalla y el mismo campo de PIN, cada uno con **su** PIN:

- **Personal de puerta**, con el **PIN de puerta** (distinto del PIN del administrador): escanea, busca, autoriza y **cierra listas**. Ese trabajo **no ha cambiado**.
- **Supervisor**, con el **PIN de supervisor** (distinto del PIN de puerta y del PIN del administrador): hace todo lo de arriba y, además, las dos acciones fuertes de la puerta: **cerrar el día** (y activar el siguiente) y **reabrir listas**.

Quien entra con el PIN de puerta es **operador de puerta**; quien entra con el PIN de supervisor es **supervisor**. En la pantalla de ingreso no se nota la diferencia: aparece en los botones de adentro.

## Antes de empezar

- Entra con tu PIN en la pantalla de ingreso (capítulo 01).
- Verifica con el administrador que el evento esté **cerrado para edición**. Si no lo está, la puerta todavía no opera.
- Decide cómo vas a leer los QR: con la **cámara** o con el **teclado** (código escrito). Ten en cuenta que la lectura con cámara no se ha probado en el entorno de pruebas; el método manual siempre está disponible como respaldo.
- Ten a mano los dos tipos de código que verás:
  - **L-** : lista de talento.
  - **V-** : vendedor de stand.
  - **CL-** : cortesía por lista.
  - **CI-** : cortesía individual.
  - **PR-** : premiación (premio).

## Paso a paso

**1. Entrar**

1. Escribe tu PIN y pulsa **"Entrar"**: el de puerta si eres personal de puerta, el de supervisor si eres el supervisor.
2. Si el evento sigue en edición, verás la tarjeta **"⚠️ Evento aún abierto"** con el aviso de que el módulo de puerta no puede usarse hasta que el administrador cierre la edición, el botón **"🔄 Comprobar de nuevo"** y el botón **"🚪 Salir"**. Avisa al administrador; cuando él confirme que cerró la edición, pulsa **"🔄 Comprobar de nuevo"**: la puerta se habilita **ahí mismo, sin salir ni volver a entrar**, y muestra "✅ El evento ya está cerrado. Día activo: N. Escanea el QR o abre la lista de nuevo.". Solo pulsa **"🚪 Salir"** si prefieres volver a entrar con el PIN. Si la comprobación falla, la propia tarjeta te lo dice y puedes volver a intentarlo.
3. Si el evento está cerrado, llegas al panel **"🎯 Control de acceso"**.

**2. Elegir el día de control**

- En **"Día de control"**, solo está disponible el día activo. Al Día 1 verás el rótulo del botón **"📅 DÍA 1"** seleccionado; el botón del Día 2 aparece con **"🔒 Disponible al cerrar Día 1"**.
- En la zona de escaneo debe quedar el rótulo **"✓ Controlando entrada del Día N"**.

**3. Pasar a la puerta del Día 2** — **solo el supervisor**

Cuando termina el Día 1, en la puerta aparece el botón **" Cerrar Día 1 y activar Día 2"**. Ojo: ese botón **solo se ve con sesión de supervisor**; si entraste con el PIN de puerta, no aparecerá. Y si una sesión de puerta intentara cerrar el día por otra vía, el sistema lo rechazaría mostrando en la tarjeta **"Solo el supervisor puede cerrar el día. Esta sesión es de puerta."**

El supervisor lo pulsa y el sistema advierte con un texto que dice, entre otras cosas: se cerrarán TODAS las listas abiertas del Día 1, las personas pendientes de esas listas ya no podrán entrar, y el control pasará al Día 2; **esta acción no se puede deshacer**. Al confirmar, el resultado sale **dentro de la misma tarjeta, junto al botón** (ya no en una ventanita aparte), con el texto exacto **"✅ Día 1 cerrado. Listas cerradas: N. Día 2 activado."**, y el mensaje **sigue visible aunque la página se recargue**. (La transición se probó en el entorno de pruebas; en el día del evento hazlo con calma y con la lista de pendientes a la vista.)

**4. Leer una entrada**

Dos caminos, el mismo resultado:

- **Con cámara**: pulsa **"📷 ESCANEAR QR"**, apunta al QR (debe verse el texto "Apunta la cámara al código QR") y el sistema lee el código solo. Para cortar, **"⏹ Detener cámara"**.
- **A mano**: en el campo "**Código (L-, V-, CL-, CI-, PR-) o nombre del talento**" escribe el código corto que aparece debajo del QR, o el nombre del talento si la persona no tiene QR a mano, y pulsa **"Buscar"**. El sistema también busca por pedazos del nombre: si parece más de un talento, muestra las opciones y tú eliges **"Abrir"**.

**5. Vendedor de stand (código V-)**

La ficha muestra el tipo **"Vendedor de stand"**, nombre, cédula, empresa y el día.

- Si está pendiente: pulsa el botón grande **"✅ AUTORIZAR ENTRADA"**: dice "Autorizando..." y, al completarse, la ficha se recarga y muestra el bloque rojo "⛔ ENTRADA YA CONSUMADA" con la fecha y hora de la entrada que acabas de autorizar: esa es la confirmación de que la persona ya pasó.
- **Importante**: autorizar a una persona **no marca a las demás del mismo stand**. Cada vendedor debe pasar por su propio QR o código.
- Si esa persona ya había entrado ese día, la ficha muestra el bloque rojo **"⛔ ENTRADA YA CONSUMADA"** con la fecha y la hora de la validación, y **no** aparece el botón de autorizar. **Esto es una protección, no un error**: evita que un mismo QR pase varias veces.

**6. Lista de talento (código L- o nombre)**

La ficha de la lista muestra tipo **"Lista de talento"**, el talento, el código corto, el estado de la lista y el resumen **"Total: N • ✅ Autorizados: X • ⏳ Pendientes: Y"**, con una fila por persona.

- Para cada persona pendiente, pulsa **"✅ Autorizar"** en su fila: dice "Autorizando..." y queda con **"✅ Entró el [fecha] a las [hora]"**.
- Las personas ya autorizadas muestran **" Consumida"**: no se dejan autorizar de nuevo.
- Puedes **" Cerrar lista"** cuando ya no esperas más personas: las pendientes quedan con **"No entra"**. Ese sigue siendo trabajo normal del operador de puerta.
- Si te equivocaste, **"🔓 Reabrir lista"** las vuelve a habilitar (el sistema lo advierte antes de confirmar). Ese botón **solo se ve con sesión de supervisor**, y el resultado de reabrir sale **dentro de la misma tarjeta, junto al botón**. Si eres operador de puerta y cerraste una lista por error, **no puedes reabrirla tú**: la lista queda cerrada hasta que el supervisor la reabra.
- Si toda la lista entró, aparece **"⛔ LISTA COMPLETADA"** con la hora de la última entrada y el aviso de que ese QR ya no es válido.

**7. Cortesías (códigos CL- y CI-)**

- **Cortesía por lista (CL-)**: ficha con la organización, la razón y las personas, igual que una lista de talento, con **"✅ Autorizar"** por persona. Si la cortesía fue anulada, se avisa: **⛔ CORTESÍA ANULADA**; no autorices y avisa al administrador. Si el QR es de otro día, el sistema te dice que no lo uses ese día.
- **Cortesía individual (CI-)**: ficha con nombre, cédula, razón y días aprobados, y el botón **"✅ AUTORIZAR ENTRADA"**. Si ya se usó: **"⛔ ENTRADA YA CONSUMADA"** con fecha y hora. Si no está aprobada para el día en curso, el sistema lo indica y **no** debes autorizar.

**8. Premiación (código PR-)**

La ficha muestra al ganador, el concurso y los cupones. Para autorizar, eliges **cuántos cupones consume** (de 1 al total), confirmas y pulsas **"✅ AUTORIZAR Y CONSUMIR PREMIO"**. Al confirmar, el QR queda consumido por completo, aunque sobren cupones; si ya se había canjeado, aparece **"⛔ PREMIO YA CANJEADO"**.

**9. Siguiente entrada**

Después de cada ficha, pulsa **"🔄 Escanear siguiente entrada"** para limpiar la pantalla y seguir.

**10. Salir**

Pulsa **"🚪 Cerrar sesión"**, confirma, y vuelves a la pantalla del PIN de puerta.

## Que debes ver

- En **cada autorización** la puerta vuelve a consultar el estado del evento al servidor antes de marcar: si el administrador abrió la edición o cambió el día desde otro equipo, la autorización **no se manda** y aparece el motivo en una ventana o en la propia tarjeta.

- El título **"🎯 Control de acceso"** y el rótulo **"✓ Controlando entrada del Día N"**.
- En la tarjeta **"⚠️ Evento aún abierto"** los dos botones: **"🔄 Comprobar de nuevo"** (encima) y **"🚪 Salir"** (debajo), con el resultado de cada comprobación pintado dentro de la tarjeta.
- En cada autorización: la ficha con tipo, nombre y cédula; el botón se lee tal cual **"✅ AUTORIZAR ENTRADA"** (vendedores y cortesía individual) o **"✅ Autorizar"** (personas de listas y cortesía por lista).
- El bloque rojo **"⛔ ENTRADA YA CONSUMADA … Validado el [fecha] a las [hora]. No se puede autorizar de nuevo."** cuando el código ya pasó: es la prueba de que el sistema está protegiendo el acceso.
- El resumen de la lista siempre con los tres números: total, autorizados y pendientes.
- Los letreros de bloqueo: **"⛔ LISTA CERRADA"**, **"⛔ LISTA COMPLETADA"**, **⛔ CORTESÍA ANULADA**, **"⛔ PREMIO YA CANJEADO"**.
- Según el rol: con **sesión de supervisor** ves además los botones **" Cerrar Día 1 y activar Día 2"** y **"🔓 Reabrir lista"** (en las listas cerradas); con **sesión de operador de puerta**, esos dos botones **no aparecen**.

## Errores comunes

- **"⛔ El administrador puso el evento en EDICIÓN. La puerta no puede autorizar..."** (ventana, y la tarjeta del evento vuelve a mostrarse): el evento se reabrió para editar mientras tenías la pestaña cargada. NADA que hagas en puerta opera hasta que el administrador cierre la edición de nuevo. Sal con "🚪 Salir", avisa al administrador y entra otra vez cuando confirme.
- **"⚠️ El día activo cambió a Día N desde otro equipo. Este panel tenía estado viejo y se actualizó..."**: alguien cerró el día desde otra pestaña. El sistema te deja en el día que de verdad está activo; vuelve a escanear el QR en ese día.
- **"⛔ No se pudo autorizar. El evento sigue operativo y en el Día N: el servidor rechazó por otra causa (día cerrado, pase ya consumido o lista cerrada)"** (bloque rojo junto al botón): el sistema re-verificó el estado del evento y el rechazo viene del servidor. En lista y cortesía, ese mismo bloque queda dentro de la tarjeta; el día del evento, si un rechazo se repite para varios pases seguidos, pasa al **fallback manual**: autoriza de a dedo con la lista impresa y anota cada entrada.
- **"⛔ No se pudo verificar el estado del evento. La autorización queda cancelada..."**: la conexión falló justo antes de autorizar y el sistema, por seguridad, no manda nada. Revisa la conexión y escanea de nuevo.
- **"⚠️ Evento aún abierto"**: la edición NO está cerrada. Avisa al administrador; nada que hagas en puerta opera hasta entonces. Cuando él confirme que cerró la edición, pulsa **"🔄 Comprobar de nuevo"**: si el evento ya está cerrado, la puerta se habilita sin recargar y sin perder la sesión; si sigue en edición, la propia tarjeta avisa "El evento sigue en edición. Se volverá a comprobar cuando pulses otra vez.".
- **"PIN incorrecto, o no es un PIN de puerta ni de supervisor."**: usaste el PIN del administrador o hay un dígito mal.
- **"Solo el supervisor puede cerrar el día. Esta sesión es de puerta."**: alguien con sesión de puerta intentó cerrar el día. Solo el supervisor puede hacerlo: avísale.
- **La cámara no abre o no lee**: pulsa "⏹ Detener cámara" y usa el código manual o la búsqueda por nombre. El sistema avisa "No se pudo acceder a la cámara. Usa el código manual o el buscador por nombre."
- **"QR leído pero no reconocido: …"**: el QR no es de este evento. No autorices; pide el pase correspondiente.
- **"No se encontró vendedor con ese QR."** o mensajes similares en listas y cortesías: código mal escrito; revisa letra por letra y vuelve a intentar.
- **Autoricé a la persona equivocada**: no se puede deshacer desde la puerta. Anótalo y avisa al administrador.
- **La persona dice que ya entró antes hoy**: la ficha te muestra la fecha y hora exactas de esa entrada.

## Que no hacer

- **No autorices sin leer la ficha**: mira tipo, día y estado antes de pulsar.
- **No autorices pases anulados, códigos de otro día ni listas cerradas**: el propio sistema te lo marca; si insistes tú, estás abriendo la puerta que el sistema cierra.
- **No pidas al administrador "habilitar" un código consumido**: la protección existe justamente para eso; el dueño del QR que ya lo usó no puede volver a usarlo.
- **No dejes la sesión de puerta sin vigilancia**: se cierra sola tras 5 minutos sin uso, y hay que volver a entrar con el PIN.

*Probado en el entorno de pruebas el 10/11/2026. Los mensajes de revalidación de estado (evento en edición, día cambiado, rechazo concreto junto al botón) quedaron escritos el 23/11/2026 y están PENDIENTES de prueba en navegador. El botón **"🔄 Comprobar de nuevo"** de la tarjeta "Evento aún abierto" también quedó escrito el 23/11/2026 y está PENDIENTE de prueba en navegador.*
