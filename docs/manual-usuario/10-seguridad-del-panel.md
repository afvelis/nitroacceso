# 10 - Seguridad del panel: rotar PIN y revocar sesiones

## Que es

Esta es la tarjeta **"Sesiones y seguridad"** del panel de administración (la gestión completa). Desde aquí el administrador hace las dos acciones de seguridad del sistema:

- **"Rotar PIN admin"** y **"Rotar PIN puerta"**: cambiar un PIN por uno nuevo.
- **"Revocar todas las demás sesiones"**: echar a todos los que están dentro, menos tú.

## Quien lo usa

Solo el **administrador**, después de entrar con su PIN (capítulo 01).

## Antes de empezar

- Decide el PIN nuevo **antes** de empezar: debe tener **exactamente 8 dígitos** y ser distinto del actual.
- Ten a mano tu **PIN de administrador actual**: lo vas a necesitar siempre, también para cambiar el PIN de puerta.
- Recuerda: en cuanto rotas un PIN, el anterior **deja de funcionar al instante**. Avisa a quien use el PIN de puerta antes de rotarlo.

## Paso a paso

**1. Rotar un PIN (admin o puerta)**

1. En "Sesiones y seguridad", pulsa **"Rotar PIN admin"** o **"Rotar PIN puerta"**.
2. **Paso 1 de 2**: el sistema pide tu **PIN de ADMINISTRADOR actual**. Esto pasa SIEMPRE, también cuando vas a cambiar el PIN de puerta: es la prueba de que estás tú delante de la pantalla. **No hace falta saber el PIN de puerta para cambiarlo.**
3. **Paso 2 de 2**: escribe el PIN nuevo, de **exactamente 8 dígitos** y distinto del que había.
4. Si sale bien: el aviso dice **"PIN [admin/puerta] rotado. El anterior ya no sirve."** El PIN nuevo funciona de inmediato y el anterior muere en ese momento.

**2. Revocar sesiones (esto NO lo hace la rotación)**

1. Pulsa **"Ver sesiones activas"** para ver quién está dentro (panel y puerta).
2. Pulsa **"Revocar todas las demás sesiones"** y confirma. El sistema cierra TODAS las sesiones menos la tuya y te dice cuántas cerró: **"Listo: N sesion(es) revocada(s). Esta sesión sigue activa."**

**Rotar y revocar son dos cosas distintas:** rotar un PIN **no cierra las sesiones ya abiertas** (quien ya entró sigue dentro hasta que su sesión expire o se cierre la pantalla). Si quieres además sacar a todos los que están dentro, pulsa también **"Revocar"**.

## Que debes ver

- El aviso **"PIN admin rotado. El anterior ya no sirve."** (o "PIN puerta...") dentro de la ventana de la propia NitroSystem.
- Si el PIN actual de admin está mal: **"El PIN admin actual no coincide."** y el PIN NO cambia.
- Si el PIN nuevo no tiene 8 dígitos: **"El nuevo PIN debe ser exactamente 8 digitos."** y el PIN NO cambia.
- Si el PIN nuevo es igual al que ya había: **"El nuevo PIN es igual al actual."** y el PIN NO cambia.
- Al revocar: el número exacto de sesiones cerradas, y tu propia sesión sigue funcionando.
- Al entrar con el PIN nuevo: entra normal (puede tardar un instante más que antes; es el costo de la protección extra, no una falla).

## Errores comunes

- **"El PIN admin actual no coincide."**: escribiste mal tu PIN de administrador en el paso 1. No es el PIN de puerta ni el PIN nuevo: es el de administrador, el que usaste para entrar.
- **Esperaba que rotar el PIN sacara a la gente**: no lo hace. Usa "Revocar todas las demás sesiones" (paso 2 de arriba).
- **Me bloqueó el sistema**: si se equivoca el PIN varias veces (5 fallos), el sistema bloquea esa conexión (IP) por **15 minutos**. Verás el aviso **"⛔ Bloqueado: demasiados intentos fallidos desde esta conexión. Espera 15 minutos..."**. No hay forma de desbloquearlo antes: espera, o si es urgente, avisa al administrador. Cada fallo suma, incluso con el PIN correcto después.
- **El PIN de puerta dejó de funcionar de golpe**: probablemente alguien lo rotó. Pide el PIN nuevo al administrador.

## Que no hacer

- **No compartas el PIN** con nadie ni por ningún canal: cada PIN es la llave de un puesto de trabajo.
- **No dejes el PIN escrito** en papeles, notas del teléfono ni pantallas pegadas cerca del puesto.
- **No dejes de rotar los PIN después de restaurar un respaldo**: cualquier restauración de la base devuelve los PIN que existían cuando se hizo el respaldo. Después de restaurar, rota los dos PIN de inmediato.

*Pendiente de probar en el entorno de pruebas.*
