# 07 - Aliados y coordinadores

## Que es

Dos herramientas de apoyo, separadas:

- **Coordinadores**: personas del equipo a las que el administrador les entrega un código (COORD-...) para que creen, cada uno, los links de registro de talentos o de stands. Así el administrador no arma los links uno por uno.
- **Aliados**: organizaciones que entregan premios al evento. El administrador les crea una cuenta con una bolsa de entradas de cortesía, y el aliado, desde su propio link, crea sus concursos y asigna ganadores, que reciben su pase para entrar (cortesía de tipo Premiación, capítulo 05).

## Quien lo usa

- **Administrador**: crea coordinadores y aliados, les entrega códigos y links, y controla (revoca/baja) los que ya no deben operar.
- **Coordinador de talentos / de stands**: entra con su código en coord.html y crea los links.
- **Aliado**: entra con su link en aliado.html y gestiona sus concursos.

## Antes de empezar

- Administrador: ten a mano el nombre completo y (opcional) el correo de cada coordinador; y para los aliados, los datos de la organización y de su responsable.
- Coordinador: tu código es único y personal. Si lo pierdes, pide uno nuevo.
- Aliado: tu link es tu llave; sin él no puedes hacer nada.

## Paso a paso

**Parte A - El administrador, las invitaciones y sus coordinadores**

Desde M-38 (28/11/2026) los coordinadores NACEN POR INVITACION, no se crean al vuelo. Todo esto vive en coord-invitas.html (boton **"👥 Coordinadores"** del panel).

1. En **"➕ Crear invitación"**: elige el **Tipo** (talentos o stands), escribe **nombre y apellido** (3 a 120 letras) y, si quieres, correo y teléfono; pulsa **"Crear invitación"**.
2. Aparece el LINK de la invitación (coordinator.html?i=INV-xxxx), con botones **"Copiar link"**, **"📱 WhatsApp"** y **"✉️ Correo"**. Enviaselo a la persona: ese link es SU llave de invitacion.
3. En **"📋 Lista de invitaciones"** ves las mas recientes primero (de a 20, con **"Mostrar todas"** para ver el resto) y filtros por estado (pendiente/aceptada/rechazada) y por tipo (talentos/stands). Cada invitacion queda registrada y se puede **"⬇️ Exportar CSV"** para respaldo.
4. Mientras este **"Pendiente"**, puedes:
   - **Rechazar**: pide un **motivo obligatorio de al menos 10 letras** (queda registrado con fecha) y el link deja de servir.
   - **Aceptar**: abre la ventana de confirmacion con nombre y contacto (se pueden corregir); al confirmar, el sistema genera el **codigo COORD-** igual que antes, lo muestra en el panel con botones de copiar/WhatsApp/correo y queda la invitacion como **"Aceptada"**. Es para coordinadores que confirmaron por otro canal y no usaran el link.
5. El coordinador real acepta POR SU LADO: abre el link, ve una pagina limpia de NitroSystem ("Invitacion para coordinar") con su tipo, confirma su **nombre** (obligatorio, 3 a 120 letras) y su contacto (opcional) y pulsa **"Confirmar mi acceso"**: recibe su codigo COORD- y el boton **"Entrar a mi panel ahora"** lo lleva a coord.html. Una misma invitacion no se puede aceptar dos veces, y un mismo correo/telefono/nombre no puede activar mas de 1 invitacion en 24 horas (limite anti-spam; ese aviso lo veria como "LIMITE_DIARIO"). El rechazo o expiracion del link se lo dice la propia pagina.
6. En **"👥 Coordinadores creados"** estan TODOS los coordinadores ya activos (viejos y nuevos) con las acciones de siempre:
   - **Revocar**: apaga su llave sin borrar lo que creo. Se puede reactivar despues con **"Reactivar"**.
   - **Eliminar definitivamente** (solo en revocados): lo saca de la lista para siempre; el sistema lo protege si ya creo talentos o stands.
   - **Editar** y **Guardar cambios**: corrige nombre o correo. **"📋 Copiar link"**, **"📱 WhatsApp"** y **"✉️ Correo"** reenvian su codigo.

**Parte B - El coordinador crea los links**

1. Abre el link de coordinador (o entra a coord.html) y en **"Entrar con tu codigo"** escribe tu código COORD- en **"Tu codigo de coordinador"** y pulsa **"Entrar"**. Si el administrador te envió el link por WhatsApp o correo, este entra solo.
2. Debe aparecer el saludo **"Hola, [nombre] — Coordinador de [talentos o stands]"** y la nota de estado: **"La edicion esta ABIERTA: puedes crear links nuevos y editar sus datos."** Si el administrador cerró la edición: **"El administrador CERRo la edicion: por ahora no puedes crear links nuevos ni editar sus datos."** (solo consulta).
3. Crea el link:
   - **Coordinador de talentos** ("Crear talento y su link de registro"): nombre del talento u organización, días de presentación (marca al menos uno entre "Dia 1" y "Dia 2") y el **correo único del representante** (obligatorio). Pulsa **"Crear talento y link"**: el mensaje confirma "Talento creado y link listo abajo."
   - **Coordinador de stands** ("Crear stand y su link de registro"): nombre del stand o negocio, número del stand, cupo de vendedores, tipo (Patrocinante o Pagado) y el **correo único del contacto**. Pulsa **"Crear stand y link"**: el mensaje confirma "Stand creado y link listo abajo."
4. En **"Tus links creados"** ves todos los links que has creado (los vigentes), con los botones **"Copiar"**, **"WhatsApp"**, **"Correo"** y **"✏️ Edicion del link"**.
5. Si corriges los datos de un link con "Edicion del link" y guardas, el sistema genera **un link NUEVO** y el anterior queda anulado; se te avisa con el texto de que debes **reenviar el link nuevo**. Copia y reenvía de inmediato. El correo y el código del link no se cambian.
6. **"Salir"** te devuelve a la pantalla del código.

**Parte C - El administrador y los aliados**

1. Desde el panel entra a **"🤝 Aliados"**. Verás **"🤝 Gestión de aliados"** con la acción **"➕ Nuevo aliado"**.
2. En la ventana de nuevo aliado llena: nombre de la organización, responsable, cédula del responsable, correo, teléfono y la bolsa de cupones (tipo "Único" y la cantidad). Pulsa **"Crear aliado"**.
   - Si algún dato ya existe en otro aliado, el sistema muestra **"⚠️ Coincidencias detectadas"**: revisa si es la misma organización (sucursales); hay que marcar la confirmación para poder continuar, y puedes anotar el motivo.
3. Al crearlo se muestra la ventana **"✅ Aliado creado"** con el código y el **link del aliado**, con botones para copiarlo y enviárselo.
4. Cada aliado se muestra con sus datos y sus asignaciones (cada asignación es una bolsa de cupones con su propio código y link). Botones por asignación: **"📋 Copiar link"** (para entregarlo al aliado), **"➕ Ampliar"** (agregar cupones con su motivo), **"🚫 Anular"** (cerrar esa bolsa; pide una razón, que es la que verán el aliado y los premiados) y **"🏆 Ver concursos"** (tabla de solo lectura con todos los concursos, ganadores, envíos y canjes).
5. Por aliado: **"➕ Agregar asignación"** (una bolsa nueva con código propio) y **"🚫 Dar de baja al aliado"** (lo retira de todo el programa; su razón será visible, y no se puede deshacer desde la pantalla).

**Parte D - El aliado y sus concursos**

El aliado abre su link (aliado.html) y ve su pantalla:

1. **"🤝 Bienvenido"** con su organización, responsable y código.
2. **"🎟️ Tus entradas de cortesía"** con tres números: **Asignadas** (el total de su bolsa), **Reservadas** (las comprometidas en concursos) y **Disponibles**. Recuerda: las entradas se reservan al crear cada concurso; si eliminas un concurso sin ganador, vuelven a estar disponibles.
3. **"🏆 Tus concursos"** con **"➕ Crear nuevo concurso"**: nombre, descripción opcional, fecha de ejecución (hoy o posterior) y cuántas entradas reservar. Al crear, el aviso dice que puedes crear otro o asignar ganador cuando estés listo.
4. Cada concurso abierto muestra **"🏆 Asignar ganador"** (nombre, apellido, cédula, correo, teléfono, entradas que consume el premio y días autorizados). Antes de guardar hay una **confirmación final** con casilla: una vez asignado, ni el aliado ni el administrador pueden modificar el ganador ni el concurso; solo el administrador puede anular el concurso para poder crear otro.
5. Concurso con ganador: **"📨 Enviar premio al ganador"** abre la cola de envíos con el mensaje ya escrito para copiar y enviar al ganador (su link de pase). Ahí aparecen los pendientes y los ya enviados.
6. **"✏️ Editar"** y **"🗑️ Eliminar"** solo funcionan en concursos **sin ganador**; al eliminar, las entradas reservadas vuelven a tu bolsa.
7. Si el día ya cerró, el aliado ve un resumen de cuántos de sus premiados asistieron.

## Que debes ver

- El coordinador bien entrado: su saludo con su tipo y su nota de edición abierta.
- Al crear talento o stand: el mensaje de confirmación y el link nuevo en "Tus links creados" con etiqueta **"Renovado"** cuando se regeneró.
- El administrador: el código del coordinador en su caja; los aliados con su insignia "🟢 Activo" o "🔴 Anulado"; las asignaciones con el resumen de cupones.
- Los concursos con su estado **"Abierto · sin ganador"** o **"Cerrado · ganador asignado"**.

## Errores comunes

- **"Codigo invalido o revocado. Pidele uno nuevo al administrador."**: el código no existe o fue revocado.
- **"Ese correo ya esta amarrado a otro talento o stand. Usa un correo distinto."**: cada link es único por correo.
- **"El administrador cerro la edicion: no se pueden crear ni editar links ahora mismo."**: espera a que la reabra.
- **"El cupo no puede ser menor que la cantidad de vendedores ya registrados."**: en un stand que ya tiene gente, no puedes reducir el cupo por debajo de lo registrado.
- **Sin entradas disponibles (aliado)**: todas están reservadas en concursos; edita o elimina un concurso sin ganador para liberarlas, o pide más entradas al organizador.
- **Le mandé el link viejo al aliado** (o al talento/stand)**: si regeneraste el link, el anterior quedó anulado; reenvía el nuevo.
- **"El cupo no puede ser menor..." / "Falta el parámetro..."**: no se aplica al flujo normal; si lo ves, revisa que hayas abierto la pantalla desde su link o botón, nunca escribiendo la dirección a mano.

## Que no hacer

- **No revokes coordinadores en pleno evento salvo emergencia**: pierden el acceso al instante.
- **No asignes ganadores sin revisar cédula, correo y teléfono**: quedan fijos para siempre y el pase es lo que el ganador mostrará en la puerta.
- **No elimines concursos con ganador**: el sistema no lo permite; si hay un error grave, el administrador debe anular la asignación con su razón.
- **No des tu código COORD- a otra persona**: crea links que quedarán a tu nombre.

*Pendiente de probar en el entorno de pruebas.*

## Nota (23/11/2026) — cuando algo quedó anulado

Si el administrador anuló la asignación de un aliado (o desactivó su organización), al abrir el link el aliado ya no ve su pantalla normal: ve una tarjeta que explica en llano qué pasó (el título dice si fue la organización o la asignación), el motivo si se registró uno, qué cupones ya no se pueden usar en la puerta y, al final, **el código que debe dictar a la mesa técnica del evento** para reclamar. En el detalle de un ganador con premio anulado, debajo de «Estado» aparece además el aviso de que ese premio ya no se puede canjear.

## Nota (23/11/2026) — fecha de creación en la tarjeta del aliado

En la tarjeta de cada aliado del panel del administrador, la línea **Creado:** muestra la fecha en formato **dd/mm/aaaa** (por ejemplo, `Creado: 10/11/2026`). El resto de la tarjeta no cambió.

*(Probado en el entorno de pruebas el 23/11/2026: la pantalla de asignación anulada con la asignación `ASI-DEMO01` anulada y revertida después; la fecha en la tarjeta `Aliado Demo`. El caso de organización desactivada quedó verificado por código, sin caso real que probar en pantalla.)*

## Nota (24/11/2026) — reclamar desde la pantalla de anulado

Si tu asignación quedó anulada, la misma tarjeta de anulado ahora tiene un camino propio para reclamar, sin salir de la app:

1. Pulsa el botón **"Reclamar"** de la tarjeta de anulado.
2. Llena el formulario: el **motivo** (elige uno de la lista, por ejemplo "Creo que me anularon por error"), el **detalle** (opcional, hasta 500 letras), tu **nombre** y **un contacto** (correo o teléfono).
3. Pulsa el botón de enviar. El aviso **"Reclamo registrado."** sale **dentro de la misma tarjeta**, junto con tu **código de reclamo `REC-XXXXXX`**.
4. **Guarda ese código**: es la única llave para consultar tu reclamo después en reclamo.html (capítulo 11).

Límite: se admiten hasta **3 reclamos por el mismo link cada 24 horas**; si te pasas, el aviso de error sale en la tarjeta y además se abre un aviso en pantalla (una ventana de la propia NitroSystem, no un diálogo del navegador).

La mesa técnica sigue siendo la segunda opción: el texto con su código y la orientación de hablar con ella permanecen en la tarjeta de anulado.

*(Probado en el entorno de pruebas el 24/11/2026 con la asignación `ASI-DEMO01` anulada a propósito y revertida después: el reclamo `REC-CEB4AD` se creó, se consultó y se respondió de punta a punta.)*
