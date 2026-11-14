# 04 - Stand

## Que es

La pantalla **"Registro de Stand"** es la página que abre el **link del stand** (un link del tipo `…stand.html?s=CÓDIGO`). Ahí el responsable del stand registra a sus vendedores, uno por uno, y obtiene los **QR (brazaletes)** de cada persona para la puerta.

## Quien lo usa

- **Coordinador de stands**: crea el link en coord.html y lo entrega (capítulo 07).
- **Responsable de stand**: usa el link para registrar vendedores y compartir brazaletes.

## Antes de empezar

- Ten el **link completo** a mano. Si abres un link alterado, la página dirá que fue modificado.
- Averigua con tu cuota: solo caben las personas que marca el **cupo** del stand. Mientras la edición esté abierta puedes volver con el mismo link para completar los lugares que faltaron.
- Para registrar necesitas: de cada persona, **nombre, apellido y cédula**; y del negocio, la **empresa** y **qué vende** (aplican a toda la lista).
- El botón **"🚪 Finalizar sesión"** es para dejar limpio el equipo prestado; no borra los QR ya generados.

## Paso a paso

**1. Abrir el link y leer la tarjeta del stand**

- Arriba verás el nombre del stand (ej.: "Stand 12 — Dulceria Karina") y la línea:
  **"Cupo: N | Registrados: N | Quedan: N"**.
  - **Cupo**: máximo de personas autorizadas del stand.
  - **Registrados**: personas con QR ya generado.
  - **Quedan**: lugares libres por llenar.

**2. Punto clave: qué es la "Lista de personas autorizadas"**

Esto confunde a muchos, léelo con calma:

- La tabla **"Lista de personas autorizadas"** con botones **"Agregar a la lista"**, "Modificar" y "Quitar" es **la lista de espera de esta tanda**: son las personas que estás preparando para registrar, **todavía no tienen QR**.
- Los QR de las personas **ya registradas** NO se ven en esa tabla. Se ven pulsando **"✅ Terminé: ver mis QR"** (la barra fija de abajo, que aparece cuando ya hay gente registrada) o inmediatamente después de registrar.
- La línea **"Cupo total: X · Registrados: Y · En lista: N · Disponibles: Z."** te separa las dos cosas: "Registrados" es lo que ya tiene QR; "En lista" es lo que aún falta confirmar.

**3. Llenar los datos del negocio**

En la tarjeta **"Datos del negocio"** escribe **"Empresa *"** y **"Qué vende *"**. Si ya estaban llenos de un registro anterior, puedes dejarlos o cambiarlos.

**4. Agregar personas a la lista de espera**

1. En "Agregar persona autorizada" escribe **Nombre**, **Apellido** y **Cédula** (**solo numeros**, Ej.: `12345678`, sin la V ni puntos).
2. Pulsa **"Agregar a la lista"**. La persona aparece en la tabla.
3. Para corregir una fila pulsa **"Modificar"** (el botón cambia a **"Guardar modificacion"** y aparece **"Cancelar modificacion"**); para sacarla pulsa **"Quitar"**.
4. Si te equivocas de persona completa, retírala de la tabla: todavía no tiene QR, así que no pierde nada.

**5. Registrar y generar los QR**

1. Pulsa **"Registrar y generar los QR"**.
2. Si registras menos personas que lugares libres, el sistema avisa:

   > Vas a registrar N de Z lugares disponibles. Solo se generaran N QR por ahora. Podras agregar los faltantes despues con este mismo link, hasta que el administrador cierre la edicion. Continuar?

3. Si estás de acuerdo, acepta.

La confirmación de registro parcial (con **"Aceptar"** y **"Cancelar"**) y los avisos de copiado/QR de esta página (solo **"Aceptar"**) aparecen en una **ventana de la propia NitroSystem**, no en un diálogo del navegador; el texto y la decisión son los mismos de antes.

4. Aparece la pantalla **"✅ Registro completado: estos son los brazaletes del stand."** con un brazalete por persona: nombre, stand, el sello **"Válido Día 1 y Día 2"**, el QR y los datos (Cédula, Empresa, Qué vende).
5. Comparte cada brazalete con sus botones: **"📋 Copiar QR"**, **"💬 WhatsApp"**, **"✉️ Correo"**.
6. Pulsa **"Cerrar"** para volver a la pantalla de registro y agregar más personas (el botón **"✅ Terminé: ver mis QR"** siempre te devuelve a los brazaletes).

**6. Recuperar un QR perdido**

En la tarjeta **"¿Ya te registraste?"**, escribe la cédula de la persona y pulsa **"Recuperar mi QR"**. La página muestra su brazalete para copiar o compartir otra vez.

**7. Cerrar la sesión en un equipo prestado**

Pulsa **"🚪 Finalizar sesión"**: la pantalla se limpia y muestra el aviso "Sesión finalizada en este equipo...". Tus QR guardados siguen siendo válidos. Este botón solo aparece mientras la edición está abierta: con la edición cerrada el link es de solo consulta y no muestra ese botón (se cierra la pestaña).

**8. Cuando la edición ya está cerrada**

El link sigue sirviendo para ver los QR: la página muestra **"Las inscripciones para este stand están cerradas. Aquí están tus QR para entrar al evento."** Si aún nadie se registró, dice **"Las inscripciones para este stand están cerradas y aún no hay vendedores registrados."**

## Que debes ver

- La tarjeta del stand con **"Cupo: N | Registrados: N | Quedan: N"**.
- La línea **"Cupo total: X · Registrados: Y · En lista: N · Disponibles: Z."** al armar la lista de espera.
- El mensaje de confirmación cuando registras parcialmente (texto del paso 5).
- La pantalla de brazaletes con **"✅ Registro completado..."**, el sello **"Válido Día 1 y Día 2"** y el QR de cada persona.
- Si el cupo se llenó: **"El cupo de este stand está lleno."**

## Errores comunes

- **"Completa nombre, apellido y cédula."**: falta alguno de los tres campos.
- **"Esa cédula ya está en la lista de abajo."** o **"La cédula N ya está registrada en este stand."**: no inscritas a la misma persona dos veces.
- **"No hay lugares restantes en el stand para agregar más personas."**: el cupo se acabó.
- **"El cupo no alcanza para todas las personas de la lista."**: pusiste más personas en la lista de espera que lugares libres; quita algunas y vuelve a intentar.
- **"Las inscripciones acaban de cerrarse."**: el administrador cerró la edición entre tu registro y tu clic; los QR pendientes no se generaron.
- **"No encontramos esa cédula en este stand."**: en recuperar QR, revisa que sea la cédula correcta del stand.
- **"Link modificado"**: el coordinador corrigió este stand y el viejo quedó anulado; usa el link nuevo que él te reenvió.
- **"Enlace inválido...", "Enlace inválido o stand no encontrado."**: el link quedó incompleto o mal copiado; pide el link completo.

## Que no hacer

- **No dejes el registro para después del cierre de edición**: una vez cerrada, no se puede agregar ni quitar a nadie; "quien quedó con QR entra, y quien no esté registrado paga entrada".
- **No confundas la lista de espera con los registrados**: el número que importa para saber cuántos QR hay es "Registrados", y los QR se ven con "✅ Terminé: ver mis QR".
- **No edites la URL del link** ni la compartas con otra empresa: cada link pertenece a un stand con su correo de contacto.

*Pendiente de probar en el entorno de pruebas.*
