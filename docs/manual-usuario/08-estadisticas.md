# 08 - Estadísticas

## Que es

La pantalla de **estadísticas** es la foto completa del evento en números: quiénes dijeron que venían y quiénes vinieron, qué stands y talentos rindieron más, cómo operó el equipo y qué se promocionó. Sirve para decidir el próximo evento, y también alimenta el informe final que se guarda en el historial.

Para verla en el panel: botón **"📊 Estadísticas"** de los accesos rápidos.

## Quien lo usa

Solo el **administrador**, con su sesión de PIN abierta.

## Antes de empezar

- Recuerda que los números reflejan el momento de la consulta: durante el evento, cambian a cada rato.
- Lo que la puerta marca (capítulo 06) es lo que llena estas estadísticas. Si la puerta no escaneó, las estadísticas no lo saben.

## Paso a paso

**1. Abrir y leer por bloques.** La página se lee de arriba hacia abajo:

- **"📅 Resumen por día"**: para el Día 1 y el Día 2, tres líneas con la cuenta **"✅ N / ⏳ N"** (entraron / pendientes) de talentos, vendedores y cortesías, más el total del día.
- **"📊 Foto general del evento"**: pequeñas casillas con el total de entradas, el día con más asistencia, la cantidad de patrocinantes, stands pagados, talentos y cortesías activas; y las personas que trajo cada categoría ("Personas traídas por patrocinantes", "…por stands pagados", "…por talentos").
- **"⏱️ Tiempos de gestión del equipo"**: tablas de reacción: cuánto tardó cada coordinador en crear su primer talento o stand, y cuánto tardaron los talentos y stands en registrar a sus personas desde que recibieron el link. Las medidas cortas se leen en horas o minutos.
- **"🥇 Patrocinantes — los que hacen posible el evento"**, **"🥈 Stands pagados — los que pagan por participar"** y **"🥉 Talentos — los que atraen al público"**: cada uno con sus totales (participantes, personas inscritas, personas presentes y **tasa de conversión** en %) y un **ranking con medallas** (🥇🥈🥉) por personas presentes, con una barra de porcentaje por registro.
- **"🛍️ Qué se promocionó y vendió en el evento"**: los rubros (lo que vende cada stand) ordenados por importancia, con el top de qué se promocionó más.
- **"🎁 Cortesías"**: tabla beneficiario por beneficiario, con tipo, razón o concurso, días, estado (Activa / Anulada) y cuántos entraron el Día 1 y el Día 2.
- **"🏆 Premiaciones"**: resumen de los premios entregados: cupones obsequiados, consumidos y sin usar, canjeadas y pendientes, todo separado por concurso y por aliado.
- **"👥 Coordinadores"**: la lista con su tipo, código y estado (Activo / Revocado).

## 🤝 Informe agregado para patrocinadores

**Qué es**: un resumen solo de números, preparado para compartir con los patrocinadores del evento. Está en el panel principal, en la tarjeta **"🤝 Informe para patrocinadores"**.

**Qué NO contiene** (y no es opcional, es un requisito de privacidad): **ni nombres, ni apellidos, ni cédulas, ni correos, ni teléfonos**. Solo totales y nombres de catálogo (número y nombre de stand, nombre de talento, empresa, cargo y motivo de cortesía). No hay ninguna lista de personas en este informe.

Además, en la tabla de **Cargos**, los cargos o grupos con menos de 3 personas se muestran agrupados en una sola fila como **"(grupos de menos de 3)"**: con 1 o 2 personas, el grupo permitiría identificar a una persona concreta, y eso el informe no lo permite.

**Paso a paso**:

1. Entra al **panel principal** del administrador.
2. Busca la tarjeta **"🤝 Informe para patrocinadores"**.
3. Pulsa **"Generar informe"**. Mientras calcula, el botón dice **"Generando..."**.
4. Revisa los números: cuatro totales arriba y luego las tablas por segmento, stands, talentos, empresas, cargos y motivos de cortesía.
5. Pulsa **"⬇️ Descargar CSV"** (archivo listo para Excel) o **"📋 Copiar resumen"** (totales y por segmento en texto plano, listo para pegar en un chat o correo). El botón pulsado cambia a **"¡Copiado!"**.

**Qué debes ver**: dentro de la propia tarjeta, cuatro casillas con los totales (**Registros**, **Personas distintas**, **Asistieron Día 1**, **Asistieron Día 2**), la tabla **Por segmento** y la de **Stands**; y el aviso verde **"Informe generado. Puedes descargarlo en CSV."** dentro de la misma tarjeta.

**Errores comunes**:

- **"No se pudo generar el informe. Vuelve a entrar al panel."**: tu sesión de PIN caducó. Vuelve a entrar con tu PIN y prueba de nuevo.
- **El CSV se abre desordenado en Excel**: usa **Datos → Desde texto/CSV** en Excel y elige como separador el punto y coma (**;**).

**Qué no hacer**:

- **No compartas el CSV como si fuera la lista de asistentes**: no lo es; es un resumen solo de números.
- **No uses este informe para contactar a nadie**: no contiene datos personales y no debe usarse para eso.

**2. Guardar el informe del evento**

Las estadísticas en pantalla se pierden al limpiar el sistema para el próximo evento; el informe es la copia que queda:

1. En el panel, entra a **"📄 Historial e informes"** (o la sección **"Historial e informes"** de la gestión completa).
2. Pulsa **"Guardar informe del evento"** y dale el nombre del evento (ej.: "NitroSystem 2026"). El sistema confirma "Informe guardado en el historial."
3. En la lista de informes, pulsa **"Ver informe / PDF"**: se abre el informe completo con todas las tablas y detalles. Dentro, el botón **"Imprimir / Guardar PDF"** abre la ventana de impresión; elige como destino "Guardar como PDF".

## Que debes ver

- Cada bloque con su título y sus números; si una categoría no tiene datos, su texto dice "Sin registros en esta categoría todavía." (o mensajes equivalentes "Sin coordinadores.", "Sin cortesías creadas todavía.", etc.).
- En los rankings: el número de posición con su medalla, el nombre, el detalle (empresa/rubro o días), la barra con el porcentaje y el par **presentes de inscritos**.
- El informe guardado en el historial con su fecha.

## Errores comunes

- **"No se pudo cargar la segmentación. Verifica tu sesión."**: tu sesión expiró; vuelve a entrar con tu PIN. Este aviso aparece en una **ventana de la propia NitroSystem** (con el botón **"Aceptar"**), no en un diálogo del navegador; el texto y la decisión son los mismos de antes.
- **Los números no cuadran con lo que vi en la puerta**: consulta los datos al final del día o del evento; en vivo cambian constantemente.
- **Cargué estadísticas y salieron vacías**: el evento aún no tiene operaciones registradas en esa categoría.

## Que no hacer

- **No uses las estadísticas en vivo como comprobante oficial de asistencia**: para el registro oficial está el informe guardado.
- **No relies solo en la pantalla**: si piensas limpiar el sistema para el próximo evento, primero guarda el informe y descarga el respaldo completo (ver la sección "Historial e informes" del capítulo 02 y el aviso de limpieza de la gestión completa).

*Pendiente de probar en el entorno de pruebas.*
