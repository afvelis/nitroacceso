# 05 - Cortesías

## Que es

Las **cortesías** son pases de entrada de regalo que crea el administrador y entrega como un **link con los QR ya listos**. Hay tres modalidades:

- **Lista**: una organización (p. ej. prensa) con un QR por día; todas las personas de la lista entran con el QR de su día.
- **Individual**: un pase con QR propio para una persona.
- **Premiación**: el pase del ganador de un concurso, con una cantidad de cupones (entradas) y acompañantes.

El beneficiario no entra con PIN: abre su link (`…cortesia.html?c=CÓDIGO`) y ve sus QR.

## Quien lo usa

- **Administrador**: crea, edita, extiende y anula cortesías desde la pantalla "Cortesias".
- **Beneficiario** (prensa, invitado, ganador): abre el link del pase que le enviaron.

## Antes de empezar

- Entra con tu PIN de administrador y usa el atajo **"🎁 Nueva cortesía"** del panel (o **"⚡ Accesos rápidos"**).
- Por defecto toda cortesía es **solo para el Día 1**; la propia pantalla lo explica: "📅 Las cortesías son por defecto para el Día 1 (el Día 2 se cobra en taquilla). Si necesita extenderla al Día 2, hágalo desde la Última creada o el Histórico con el botón \"Extender al Día 2\"".
- Para "Otros" como razón, el sistema exige escribir la **causa específica** (queda registrada).
- Las cortesías con **todos sus días ya cerrados** quedan **🧊 congeladas** y no admiten cambios.

## Paso a paso

**1. Crear una cortesía**

1. En la sección **"🎁 Crear cortesía"**, elige la **Modalidad**: "Lista (una organizacion, un QR por dia)", "Individual (un pase con QR propio)" o "Premiación (ganador de concurso, con cupones)".
2. **Lista**: escribe el **"Nombre de la organizacion"**, elige la **"Razon de la cortesia"** (Prensa / Vinculo familiar / Autoridad / Otros) y agrega las **"Personas del Dia 1"** con **"+ Agregar persona"** (nombre, apellido y cédula por fila).
3. **Individual**: escribe Nombre, Apellido y Cedula.
4. **Premiación**: llena los datos del ganador (nombre, apellido, cédula), la **"Cantidad de cupones ganados"**, el **"Nombre del concurso"** y el **"Aliado / Organización que realiza el concurso"**.
5. Para Prensa y Autoridad el sistema pregunta si el pase es **"Solo Día 1"** o **"Día 1 y Día 2"** (excepción). Para listas de esas razones aparece también el bloque "Personas del Dia 2 (excepción)" con **"+ Agregar persona"** y **"📋 Copiar lista al Dia 2"**.
6. Pulsa **"Crear cortesia"**.
7. Verás el mensaje **"Cortesía creada (Día 1)."** (o "(Día 1 y Día 2)") y el pase aparece arriba en **"⭐ Última cortesía creada"**.

**2. Entregar el pase**

En el panel "⭐ Última cortesía creada" tienes:

- El **link del pase** en una caja de código y el botón **"📋 Copiar link"**, más **"📱 WhatsApp"** y **"✉️ Correo"**.
- **"✏️ Editar"** para corregir datos, razones o personas, y administrar los días (**"📅 Extender al Día 2"**, **"🚫 Quitar Día 1"**, **"🚫 Quitar Día 2"**).
- **"🚫 Anular"** para dejar el pase sin efecto.

**3. El histórico**

La tabla **"📜 Histórico de cortesías"** muestra todas las creadas, con buscador. La más reciente se administra desde el panel ⭐; las anteriores se editan desde la tabla con sus botones. Muestra beneficiario, tipo, razón/concurso, días, cuántas entradas fueron reclamadas en puerta (**"Reclamadas / Obsequiadas"**) y el estado (Activa / Anulada / 🧊 Congelada).

**4. Premiaciones, con candados especiales**

- Una premiación **es solo lectura cuando el evento terminó** (ambos días cerrados): no se pueden crear, editar ni anular; solo consultarlas en el histórico.
- Si la premiación **ya fue canjeada en puerta**, tampoco se edita ni se anula: el sistema lo dirá.
- La anulación de cualquier cortesía hace que **todos sus QR dejen de funcionar de inmediato en la puerta**, y no se puede deshacer.

**5. Lo que ve el beneficiario**

El link abre el **"Pase de cortesía"** con: beneficiario, razón, días válidos, modalidad y los **QR del Día 1 / Día 2** (en listas, un QR por día con la cuenta de personas: "N/M han entrado"). Abajo, **"📤 Compartir este pase"**. Si el pase fue anulado, verá **"⛔ Cortesía anulada"**; si ya se usó por completo, **"⛔ Entrada ya consumida"**; y cuando los dos días del evento cerraron, la pantalla de cierre **"¡El evento ha culminado!"**.

## Que debes ver

- El mensaje **"Cortesía creada (Día 1)."** o **"Cortesía creada (Día 1 y Día 2)."** y, para las premiaciones, **"Premiación creada (...)".**
- El panel **"⭐ Última cortesía creada"** con insignia de tipo (Lista, Individual, Premiación), estado y el link copiable.
- En el histórico: la fila resaltada en verde por unos segundos recién creada o editada.
- En la edición: los botones de días (**"+ Agregar Día 1"**, **"📅 Extender al Día 2"**, **"🚫 Quitar Día 1"**, **"🚫 Quitar Día 2"**) y, si el día del origen tiene personas, la opción **"📋 Copiar personas del Día N (N)"**.
- En pase anulado del beneficiario: **"Esta cortesía fue anulada por el administrador y ya no es válida."**

## Errores comunes

- **"Falta la organización" / "Lista vacía" / "Faltan datos"**: no se pulsó crear con el formulario incompleto.
- **"Debe indicar la causa de la cortesía."**: elegiste "Otros" y no escribiste la causa.
- **"Hay una cedula repetida dentro del mismo dia."**: dos personas con la misma cédula en el mismo día de la lista.
- **"Ese dia ya esta agregado en esta cortesia."**: intentaste extender un día que ya existe.
- **El beneficiario dice que su QR no funciona**: revisa en el histórico si el pase quedó **Anulado** o si el día ya **cerró**; en esos casos el QR no pasa en puerta.
- **Prometiste el Día 2 y no se lo diste**: si nunca pulsaste "Extender al Día 2", el pase es solo del Día 1; la puerta lo rechazará el Día 2.

## Que no hacer

- **No anules un pase sin seguridad**: la anulación es inmediata e irreversible; el beneficiario solo se entera cuando su QR falla en la puerta.
- **No crees cortesías sin registrar la razón (y la causa en "Otros")**: el registro es tu control interno.
- **No edites una cortesía ya usada o congelada**: el sistema lo bloquea y no es un error.
- **No entregues el link del pase a otra persona**: es un pase personal o de una organización en particular.

*Pendiente de probar en el entorno de pruebas.*
