# 09 - Problemas frecuentes

## Que es

Una tabla de chequeo rápido para el día del evento: tú describes el síntoma que ves en pantalla, la columna del medio te dice casi siempre la causa, y la de la derecha te dice qué hacer.

## Quien lo usa

Todos: personal de puerta, coordinadores, responsables de stand, representantes de talento y el administrador.

## Antes de empezar

- Ten a mano el canal de contacto del administrador: varios problemas solo se arreglan desde el panel (cerrar o reabrir la edición, anular o reactivar pases, entregar links nuevos).
- Antes de buscar aquí, lee el mensaje de pantalla tal cual: casi todos los avisos del sistema ya dicen qué revisar.

## Paso a paso

Busca en la tabla el síntoma más parecido a lo que ves y aplica "qué hacer". Si nada cuadra, captura el texto exacto del mensaje y avisa al administrador.

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| No entra el PIN; dice "PIN incorrecto." | Un dígito mal, o es el PIN del otro rol (admin vs puerta). | Revisa el PIN con el administrador y reintenta con calma. |
| Dice "⛔ Bloqueado: demasiados intentos fallidos desde esta conexión. Espera 15 minutos y vuelve a intentar." | Demasiados intentos fallidos seguidos. | Espera 15 minutos sin insistir. No hay desbloqueo antes; pasado el tiempo, entra con el PIN correcto. |
| En puerta aparece la tarjeta "⚠️ Evento aún abierto" | El administrador todavía NO cerró la edición del evento. | Avisa al administrador para que pulse "🔒 Cerrar edición" en su panel. Mientras tanto, la puerta no opera. Pulsa "🚪 Salir" si te piden liberar el puesto. |
| En puerta sale "⛔ ENTRADA YA CONSUMADA" | Ese QR o código ya entró ese día; el sistema lo bloquea. | No es un error: la ficha muestra la fecha y hora de la entrada anterior. Muéstrala a la persona; si insiste, avisa al administrador. No intentes "pasarla otra vez". |
| En puerta sale "⛔ LISTA CERRADA" | Alguien cerró esa lista (desde la puerta misma o al cerrar el Día 1). | Si fue un error, el mismo personal de puerta puede pulsar "🔓 Reabrir lista" en esa ficha (el sistema lo advierte antes de confirmar). Si fue al cerrar el Día 1, la lista del Día 1 no vuelve de ninguna forma. |
| El talento no puede editar su lista; solo ve la tabla en lectura | La lista ya está "En puerta" o "Cerrada", o el administrador cerró la edición. | Solo consulta: no se puede editar. Si faltaba algo importante, el administrador puede "🔓 Reabrir edición", corregir y volver a cerrar. |
| En el stand no aparecen los QR; solo está la "Lista de personas autorizadas" | La tabla visible es la lista de espera por registrar, no los ya registrados. | Pulsa "✅ Terminé: ver mis QR" (barra fija de abajo) o registra la lista con "Registrar y generar los QR". Si dice "Todavía no hay personas registradas en este stand.", aún no se registró nadie. |
| El stand dice "Las inscripciones acaban de cerrarse." o "Las inscripciones para este stand están cerradas." | La edición se cerró antes del registro (o ya pasó el registro). | Si quedaban lugares, el administrador puede "🔓 Reabrir edición", dejar completar y volver a cerrar. Con edición cerrada, el link solo sirve para ver los QR ya generados. |
| El link dice "Link no valido", "Este link no existe o fue revocado.", "Enlace inválido o stand no encontrado." o "⚠️ Este link fue modificado" | El link quedó incompleto, fue revocado, o el coordinador lo corrigió y el anterior quedó anulado. | Pide el link nuevo y completo a tu coordinador (o al administrador). No intentes recomponerlo a mano. |
| La cámara no abre o no lee el QR | El navegador no dio permiso, el equipo no tiene cámara útil o el código está dañado. | Usa siempre el método manual: escribe el código (L-, V-, CL-, CI-, PR-) o el nombre del talento en el campo de la puerta y pulsa "Buscar". El sistema avisa "No se pudo acceder a la cámara. Usa el código manual o el buscador por nombre." |
| Se cerró la edición por error (y la puerta quedó frenada) | Alguien pulsó "🔒 Cerrar edición" (o "Abrir edicion") sin querer. | El administrador pulsa "🔓 Reabrir edición", avisa a puerta, deja terminar las correcciones y cierra la edición de nuevo con "🔒 Cerrar edición". |
| La pantalla se cerró sola y volvió al PIN | Cierre automático tras 5 minutos sin uso (capítulo 01). | Normal. Vuelve a entrar con el PIN; en puerta, revisa el día activo antes de seguir. |
| El coordinador no puede crear o editar links; dice que la edición está cerrada | El administrador cerró la edición del evento. | Se desbloquea solo si el administrador reabre la edición temporalmente. |
| La página muestra una banda negra con letras amarillas abajo (texto "STAGING...") | Estás en el entorno de pruebas, no en el evento real. | Verifica con el administrador el link correcto del evento real. Lo que hagas ahí no afecta el evento. |
| Sale "Error al entrar..." o "No se pudo conectar..." | Falta de conexión del equipo con el sistema. | Revisa wifi o datos móviles y reintenta. Si sigue, prueba otro equipo; avisa al administrador. |

## Que debes ver

- Tras aplicar la solución, la pantalla correspondiente debe volver a su comportamiento normal: el PIN entra, la puerta muestra el panel de escaneo, la lista se edita, los QR aparecen.
- En caso de duda, el propio mensaje de la pantalla (entre comillas en la tabla) es la referencia: si ves ese texto exacto, estás en el caso correcto.

## Errores comunes

- **Reintentar muchas veces un PIN que no entra**: termina en el bloqueo de 15 minutos.
- **Tratar "ENTRADA YA CONSUMADA" como falla del sistema**: es la protección anti duplicados cumpliendo su trabajo.
- **Buscar una falla del equipo donde no la hay**: casi todos estos síntomas tienen causa operativa (estado del evento, link equivocado, código repetido), no de equipo.

## Que no hacer

- **No improvises soluciones destructivas**: nada de borrar listas, anular pases ni "reabrir cierre" por tu cuenta si no corresponde a tu rol.
- **No reenvies links viejos después de una corrección**: si el coordinador regeneró un link, el anterior quedó anulado para siempre.
- **No dejes pasar a nadie por fuera del sistema** (sin QR, sin código, sin autorización en pantalla): si hay una situación especial, la resuelve el administrador por el sistema.

*Pendiente de probar en el entorno de pruebas.*
