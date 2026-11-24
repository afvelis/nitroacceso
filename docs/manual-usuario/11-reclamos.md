# 11 - Reclamos

## Que es

El módulo de reclamos permite que un aliado al que le anularon una asignación (o cualquier reclamante con su código) deje constancia de su reclamo dentro de NitroSystem, y que el administrador lo revise y responda. Dos pantallas, una por rol:

- **Bandeja de reclamos** (`reclamos.html`): la lista de todos los reclamos, solo para el administrador.
- **Consulta de reclamo** (`reclamo.html`): el reclamante escribe su código y ve el estado y la respuesta.

Un reclamo **no cambia nada del evento**: ni cupones, ni pases, ni estados. Es registro y seguimiento, nada más.

## Quien lo usa

- **Administrador**: abre la bandeja desde el panel (después de entrar con su PIN, capítulo 01) y responde cada reclamo.
- **Reclamante** (aliado o quien envió el reclamo): consulta su reclamo con el código `REC-XXXXXX` que le dio la pantalla al enviarlo. No necesita PIN ni sesión: el código es su llave.

## Antes de empezar

- Administrador: entra al panel con tu PIN (capítulo 01).
- Reclamante: guarda el código `REC-XXXXXX` que apareció al enviar el reclamo. Sin ese código no se puede consultar nada.

## Paso a paso

**Parte A - El administrador y la bandeja de reclamos**

1. Desde el panel, en la tarjeta **"📮 Reclamos"**, pulsa **"Ver la bandeja de reclamos"**. También puedes entrar directo a reclamos.html con tu sesión activa.
2. La bandeja (**"📮 Bandeja de reclamos"**) muestra todos los reclamos como tarjetas. Cada tarjeta trae:
   - El **código del reclamo** (`REC-XXXXXX`) y la **etiqueta de estado** (`Nuevo`, `En revisión`, `Resuelto` o `Rechazado`).
   - **Fecha** de creación, **Motivo**, **Link** (la asignación desde la que se reclamó), **Quién** (el nombre que escribió el reclamante), **Contacto**, **Detalle** (lo que escribió en el formulario), **Nota interna** y **Respuesta**.
3. Arriba hay cinco filtros: **"Todos"**, **"Nuevos"**, **"En revisión"**, **"Resueltos"** y **"Rechazados"**. Pulsa uno y la bandeja muestra solo los reclamos de ese estado.
4. Para atender un reclamo, en su tarjeta:
   - Cambia el **Estado** (menú desplegable: `Nuevo`, `En revisión`, `Resuelto`, `Rechazado`).
   - Escribe la **Respuesta**, que es el texto que verá el reclamante cuando consulte con su código.
   - Escribe la **Nota interna**, que es solo para el equipo: el reclamante NUNCA la ve.
   - Pulsa **"Guardar cambios"**. El aviso **"Cambios guardados."** aparece dentro de esa misma tarjeta, junto al botón, y la etiqueta de estado se actualiza al momento.
5. Con **"← Volver al dashboard"** regresas al panel.

**Parte B - El reclamante consulta su reclamo**

1. Abre reclamo.html, escribe tu código `REC-XXXXXX` y pulsa **"Consultar"**.
2. La pantalla muestra: **Estado** (con su etiqueta de color), **Motivo**, **Fecha del reclamo** y, si ya hubo respuesta, **"Respuesta de la organización:"** con el texto que escribió el administrador.
3. Qué significa cada estado:
   - **Nuevo**: el reclamo llegó, todavía nadie lo tomó.
   - **En revisión**: alguien del equipo lo está viendo.
   - **Resuelto**: hubo respuesta final a tu favor o con solución.
   - **Rechazado**: se revisó y no se hace ningún cambio.
4. Si todavía no hay respuesta, la pantalla lo dice: **"Todavía no hay respuesta. Vuelve a consultar más tarde."** Vuelve a consultar otro día con el mismo código: no se pierde nada.
5. La nota interna del administrador no aparece en esta pantalla, aunque el reclamo ya tenga una.

## Que debes ver

- En la bandeja: cada tarjeta con su código, su etiqueta de estado y sus datos completos; al cambiar el filtro, la lista se ajusta al instante.
- Al guardar cambios: **"Cambios guardados."** dentro de la tarjeta y la etiqueta de estado nueva.
- En reclamo.html: el estado y el motivo que coinciden con lo que se guardó en la bandeja.

## Errores comunes

- **"No encontramos ningún reclamo con ese código. Revisa que esté bien escrito."**: el código está mal escrito o no existe. Revisa letra por letra (empieza con `REC-`).
- **"Acceso restringido"**: llegaste a la bandeja sin sesión de administrador vigente. Entra al panel con tu PIN y vuelve a pulsar **"Ver la bandeja de reclamos"**.
- **"Tu sesión expiró. Entra de nuevo con tu PIN."** (en la bandeja): tu sesión de administrador venció; entra de nuevo al panel y regresa a la bandeja.
- **Guardé y no vi nada**: el aviso **"Cambios guardados."** aparece dentro de la tarjeta que editaste; si la tarjeta se re-pintó, el aviso queda en la tarjeta nueva.

## Que no hacer

- **No escribas datos personales de terceros en el detalle del reclamo** (cédulas, teléfonos de otras personas): el formulario pide solo nombre y un contacto.
- **No prometas por la nota interna**: el reclamante no la ve; lo que él lee es la Respuesta.
- **No uses la bandeja para anular o reactivar asignaciones**: el reclamo no cambia nada del evento; eso se hace desde el panel de aliados (capítulo 07).

*Probado en el entorno de pruebas el 24/11/2026 (fase 1): envío desde la pantalla de anulado del aliado con código `REC-CEB4AD`, consulta pública antes y después de responder, bandeja con filtros y cambio de estado con respuesta. Pendiente de probar: la validación del formulario al enviar vacío y el contador de la tarjeta del panel.*
