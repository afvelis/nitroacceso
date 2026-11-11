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

**Parte A - El administrador y sus coordinadores**

1. Desde el panel, usa el acceso rápido **"➕ Crear coordinador"** (o entra a **"🛠️ Gestión completa"**, sección **"Crear coordinador"**).
2. Elige el **Tipo**: "Coordinador de talentos" o "Coordinador de stands"; escribe **"Nombre y apellido"** y, si quieres, **"Correo (opcional)"**; pulsa **"Crear coordinador"**.
3. Aparece el **código** del coordinador en una caja, con el botón **"Copiar codigo"** y la orientación de entregárselo: con ese código el coordinador entra a crear sus links. Verás el aviso **"Coordinador creado correctamente."**
4. En la sección **"Coordinadores creados"** tienes, por cada coordinador, su código, su estado (Activo o Revocado) y su link de acceso, con los botones **"Copiar código"**, **"📋 Copiar link"**, **"📱 WhatsApp"** y **"✉️ Correo"** para entregárselo.
5. Acciones por coordinador:
   - **Revocar**: apaga su llave sin borrar lo que creó. Se puede reactivar después con **"Reactivar"**.
   - **Eliminar definitivamente** (solo en revocados): lo saca de la lista para siempre; el sistema lo protege si ya creó talentos o stands.
   - **Editar** y **Guardar cambios**: corrige nombre o correo.

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
