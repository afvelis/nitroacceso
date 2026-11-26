# 10 - Seguridad del panel: rotar PIN y revocar sesiones

## Que es

Esta es la tarjeta **"Sesiones y seguridad"** del panel de administración (la gestión completa). Desde aquí el administrador hace las cuatro acciones de seguridad del sistema:

- **"Rotar PIN admin"**, **"Rotar PIN puerta"** y **"Rotar PIN supervisor"**: cambiar un PIN por uno nuevo.
- **"Revocar todas las demás sesiones"**: echar a todos los que están dentro, menos tú.
- **"Reabrir puerta"** — cuando la pantalla de puerta se bloquea por intentos fallidos, este botón le devuelve el acceso en segundos. Pide un motivo de al menos 10 caracteres y queda registrado en la auditoría: quién lo hizo, cuándo y por qué. No cambia el PIN y no toca el bloqueo del administrador.

## Quien lo usa

Solo el **administrador**, después de entrar con su PIN (capítulo 01).

## El PIN de supervisor

La app tiene un **tercer PIN**, además del de administrador y el de puerta: el **PIN de supervisor**. Con él se entra por la **misma pantalla de puerta** y el mismo campo de PIN, y da el rol de **supervisor**: puede todo lo que hace el personal de puerta y, además, **cerrar el día** (activando el siguiente) y **reabrir listas cerradas** — justamente las dos acciones que el personal de puerta ya **no** puede hacer (ver capítulo 06).

- Es de **exactamente 8 dígitos**, como los otros dos, y se guarda cifrado en la base igual que ellos.
- El operador de puerta **no necesita saberlo ni usarlo**: es el PIN del responsable de la puerta.
- **Custodia recomendada:** que sea **distinto de los otros dos** (el sistema no deja grabar uno que coincida con otro), que **no se comparta con el operador de puerta** y que se custodie **en papel, en un lugar físico seguro y cerrado** (por ejemplo, un sobre bajo llave), lejos de los papeles del puesto de puerta: es la llave de las acciones que no se pueden deshacer.
- Cuando lo rotes, **rota también el registrado en el papel**: el anterior muere al instante.

## Antes de empezar

- Decide el PIN nuevo **antes** de empezar: debe tener **exactamente 8 dígitos**, ser distinto del que tenía **y de los PINs de los otros dos puestos** (el sistema rechaza un PIN nuevo que coincida con otro).
- Ten a mano tu **PIN de administrador actual**: lo vas a necesitar siempre, también cuando vas a cambiar el PIN de puerta o el de supervisor.
- Recuerda: en cuanto rotas un PIN, el anterior **deja de funcionar al instante**. Avisa a quien use el PIN que rotas (puerta o supervisor) antes de rotarlo.

## Paso a paso

**1. Rotar un PIN (admin, puerta o supervisor)**

1. En "Sesiones y seguridad", pulsa **"Rotar PIN admin"**, **"Rotar PIN puerta"** o **"Rotar PIN supervisor"**.
2. **Paso 1 de 2**: el sistema pide tu **PIN de ADMINISTRADOR actual**. Esto pasa SIEMPRE, también cuando vas a cambiar el PIN de puerta o el de supervisor: es la prueba de que estás tú delante de la pantalla. **No hace falta saber el PIN de puerta para cambiarlo.**
3. **Paso 2 de 2**: escribe el PIN nuevo, de **exactamente 8 dígitos**, distinto del que había y distinto de los PINs de los otros dos puestos.
4. Si sale bien: el aviso dice **"PIN [admin/puerta] rotado. El anterior ya no sirve."** El PIN nuevo funciona de inmediato y el anterior muere en ese momento.

**2. Revocar sesiones (esto NO lo hace la rotación)**

1. Pulsa **"Ver sesiones activas"** para ver quién está dentro (panel y puerta).
2. Pulsa **"Revocar todas las demás sesiones"** y confirma. El sistema cierra TODAS las sesiones menos la tuya y te dice cuántas cerró: **"Listo: N sesion(es) revocada(s). Esta sesión sigue activa."**

**Rotar y revocar son dos cosas distintas:** rotar un PIN **no cierra las sesiones ya abiertas** (quien ya entró sigue dentro hasta que su sesión expire o se cierre la pantalla). Si quieres además sacar a todos los que están dentro, pulsa también **"Revocar"**.

## Que debes ver

- El aviso **"PIN admin rotado. El anterior ya no sirve."** (o "PIN puerta", o "PIN supervisor") dentro de la ventana de la propia NitroSystem.
- Si el PIN actual de admin está mal: **"El PIN admin actual no coincide."** y el PIN NO cambia.
- Si el PIN nuevo no tiene 8 dígitos: **"El nuevo PIN debe ser exactamente 8 digitos."** y el PIN NO cambia.
- Si el PIN nuevo coincide con otro que ya estaba (el suyo propio o el de otro puesto — admin, puerta o supervisor): **"El nuevo PIN es igual al actual."** y el PIN NO cambia.
- Al revocar: el número exacto de sesiones cerradas, y tu propia sesión sigue funcionando.
- Al entrar con el PIN nuevo: entra normal (puede tardar un instante más que antes; es el costo de la protección extra, no una falla).

## Errores comunes

- **"El PIN admin actual no coincide."**: escribiste mal tu PIN de administrador en el paso 1. No es el PIN de puerta ni el PIN nuevo: es el de administrador, el que usaste para entrar.
- **Esperaba que rotar el PIN sacara a la gente**: no lo hace. Usa "Revocar todas las demás sesiones" (paso 2 de arriba).
- **Me bloqueó el sistema**: si se equivoca el PIN varias veces (5 fallos), el sistema bloquea esa conexión (IP) por **15 minutos**. Verás el aviso **"⛔ Bloqueado: espera N segundos y vuelve a intentar."** (N son los segundos que faltan). No hay forma de desbloquear el panel antes: espera, o si es urgente, avisa a otro dispositivo con red distinta. Cada fallo suma, incluso con el PIN correcto después. (El bloqueo de la puerta, que es de 90 segundos, sí lo levanta el administrador con "Reabrir puerta", arriba en esta tarjeta.)
- **El PIN de puerta (o el de supervisor) dejó de funcionar de golpe**: probablemente alguien lo rotó. Pide el PIN nuevo al administrador.

## Que no hacer

- **No compartas el PIN** con nadie ni por ningún canal: cada PIN es la llave de un puesto de trabajo.
- **No dejes el PIN escrito** en notas del teléfono ni pantallas pegadas cerca del puesto. (Excepción acordada: el PIN de supervisor se custodia impreso, en lugar cerrado y bajo llave — ver "El PIN de supervisor".)
- **No dejes de rotar los PIN después de restaurar un respaldo**: cualquier restauración de la base devuelve los PIN que existían cuando se hizo el respaldo. Después de restaurar, rota los tres PIN de inmediato, incluyendo el de supervisor si ya tiene uno.

## La privacidad de los datos del evento

- **Que alguien no lea la cédula sobre tu hombro:** en los listados la cédula se ve enmascarada (`123•••78`), para que quien camine cerca de la pantalla no pueda copiarla. Solo se ve completa en las pantallas de puerta donde hay que comparar a la persona contra su documento físico.
- **Existe un aviso de privacidad público** (`privacidad.html`), enlazado desde las pantallas de reclamo (la de consulta y la del aliado) y desde el pie de la pantalla de ingreso. Allí se explica, en español llano, qué datos se recogen, quién los ve, que la cédula se enmascara y cómo pedir acceso, corrección o borrado.
- **Cuánto tiempo se conservan y cómo se borran:** hay una política de retención documentada en el repositorio (`docs/privacidad-retencion.md`, PROPUESTA pendiente de aprobación del organizador). El borrado de datos personales **no lo hace la app**: se hace con SQL desde el SQL Editor del proyecto, lo ejecuta el organizador cuando él decide.

*Pendiente de probar en el entorno de pruebas.*

## Ver una cédula completa (con registro)

### Que es

En los listados la cédula se ve enmascarada (`123•••78`). Pero hay casos legítimos en los que necesitas verla **completa**: reclamación, duplicado, entrega de premio. Para eso existe el botón **"👁 Ver"** en la tarjeta de cada aliado: revela **UNA** cédula a la vez, pide un **motivo escrito** (mínimo 10 caracteres) y deja **rastro** en la base: quién la vio, cuándo, qué registro y por qué.

### Cuando usarlo y cuando NO

- **Sí:** una reclamación de la persona, comprobar un duplicado, entregar un premio.
- **No:** curiosidad, o pedir el dato a alguien que no lo dio. Cada revelado queda registrado con tu sesión y es revisable por el organizador: si no tienes un motivo real, no lo uses.

### Paso a paso

1. En **aliados.html**, busca la tarjeta de la persona/organización.
2. Junto a la cédula enmascarada, pulsa **"👁 Ver"**.
3. En la ventana que se abre, **escribe el motivo** (al menos 10 caracteres; por ejemplo: "Reclamo del aliado por cobro duplicado del 25/11"). Sin motivo no se revela nada.
4. Al confirmar, la cédula completa aparece **dentro de la tarjeta**, junto al botón.

### Que debes ver

- El mensaje **"Revelado registrado (#N)"** (con el número de registro) dentro de la tarjeta, junto a la cédula completa.
- Si escribes un motivo de menos de 10 caracteres: **"Escribe un motivo de al menos 10 caracteres."** y NO se revela nada ni se registra nada.
- Si tu sesión caducó: **"Tu sesión caducó. Vuelve a entrar."**

### Donde se audita

En **admin.html**, tarjeta **"🔎 Cédulas reveladas"**: pulsa **"Ver últimos 50"** y verás la lista de revelados (fecha, origen, motivo y número de registro). La cédula **nunca** aparece en esa lista y tampoco el hash de la sesión: solo el motivo que se escribió.

### Camino de emergencia (sin despliegue)

Para el día del evento, si no hay tiempo de entrar al panel: `docs/sql/revelar-cedula.sql` es una consulta que el **organizador** ejecuta en el SQL Editor de Supabase para buscar una cédula (normalizada, sin guiones) en las cuatro tablas donde puede vivir. La traza de esa consulta queda en el **log de Supabase**, no en `accesos_datos`: úsalo solo en emergencia.

*Pendiente de probar en el entorno de pruebas.*
