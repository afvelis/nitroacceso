# Runbook de incidentes — NitroSystem

> Versión 1 · 28/11/2026
>
> Este documento es para el EQUIPO DEL EVENTO. Cada procedimiento tiene pasos concretos, no teoría. Si el asistente dice "no sé qué hacer", este runbook lo resuelve.

## Tabla de contactos (llenar antes del evento)

| Rol | Nombre | Teléfono | Responsable secundario |
|-----|--------|----------|----------------------|
| Organizador principal | | | |
| Admin de Supabase | | | |
| Soporte técnico evento | | | |

---

## 1. Supabase caído o pausado

### Síntoma
- Todos los módulos muestran "No se pudo conectar" o "Error al cargar".
- La página se queda en "Cargando..." o muestra `alert("No se pudo conectar al servidor.")`.
- No se puede escanear ningún pase.

### Diagnóstico
1. Abre [status.supabase.com](https://status.supabase.com) desde otro dispositivo.
2. Si está verde: el problema es tu red o la conexión local.
3. Si está rojo: Supabase está caído globalmente.

### Procedimiento
1. **Si Supabase pausó el proyecto** (el free tier pausa después de inactividad):
   - Inicia sesión en [supabase.com/dashboard](https://supabase.com/dashboard).
   - Selecciona el proyecto del evento.
   - Pulsa **Start** (aparece en rojo: "Database paused").
   - Espera ~30 segundos hasta que diga "Database running".
   - Recarga la página de la puerta (Ctrl+F5). Debe volver a funcionar.
2. **Si es un fallo global**: no hay nada que hacer. Informa a la mesa técnica que la app está caída y espera a que Supabase lo resuelva.
3. **Si es tu red**: cambia de red (WiFi → hotspot del móvil → otro WiFi). Prueba la puerta con otro dispositivo.

### Verificación
- `aliado.html?a=ASI-DEMO01` carga sin error.
- La puerta autoriza un pase de prueba.

---

## 2. Caída de red en el venue

### Síntoma
- El dispositivo de puerta (laptop/tablet) tiene WiFi pero no hay internet.
- `f_puerta_marcar_vendedor` y todas las RPC fallan.
- El aliado no puede consultar reclamos.

### Procedimiento
1. **Puerta sin red**: no puede autorizar nada. Activa el Fallback Manual (sección 7).
2. **Otro dispositivo con WiFi pero sin internet**: reemplaza el hotspot por el móvil del técnico o conecta el dispositivo al hotspot del móvil.
3. **Sin internet en absoluto**: el equipo técnico verifica el router/switch del venue. Mientras tanto, usa el Fallback Manual (sección 7).

### Verificación
- `ping 8.8.8.8` funciona en el dispositivo de puerta.
- `aliado.html` carga desde el dispositivo.

---

## 3. Token de puerta perdido o expirado

### Síntoma
- La puerta muestra `ERR_SESION` o "No se pudo verificar el estado del evento".
- El login con PIN funciona pero al escanear un pase dice que la sesión expiró.

### Procedimiento
1. Pulsa **🚪 Salir** (aparece arriba a la derecha).
2. Vuelve a entrar con el PIN de puerta.
3. Si sigue fallando: el PIN puede haber sido revocado. Pide al admin que verifique en `dashboard.html` → pestaña Sesiones → el token de puerta está activo.
4. Si el token fue revocado: el admin pulsa **Revocar** en la sesión de puerta, el operario de puerta sale y vuelve a entrar con el PIN.

### Verificación
- Escanea un pase que no fue consumido: debe devolver `AUTORIZAR ENTRADA`.

---

## 4. Link de aliado filtrado (una persona usa otro link)

### Síntoma
- Un aliado con link `ASI-XXXX` entra con el link de otra organización.
- Un aliado no anulado ve datos de otro aliado.

### Procedimiento
1. Identifica el link filtrado (el que se ve en la URL del navegador del intruso).
2. El admin accede a `aliados.html` con su PIN.
3. Busca la organización que compartió el link.
4. Si es necesario: **Anular la asignación** de la organización que filtró el link (motivo: "Link compartido con terceros").
5. Si es necesario: **Crear un nuevo link** para la organización afectada (con nueva asignación y nuevos cupones).
6. Informa a la organización del evento que el link no es compartible y que se generó uno nuevo.

### Verificación
- El link filtrado (`ASI-XXXX`) ya no devuelve datos (asignación anulada).
- El nuevo link (`ASI-YYYY`) funciona correctamente.

---

## 5. QR que no escanea (cámara no lee)

### Síntoma
- La cámara de la puerta no detecta el QR del brazalete.
- O el QR se lee pero la RPC devuelve "No encontrado" o error.

### Procedimiento
1. **Cámara no detecta QR**: limpiar la lente de la cámara. Asegurar buena iluminación. Aproximar el brazalete a la pantalla.
2. **QR se lee pero RPC falla**: verificar que el dispositivo tiene internet (sección 2). Verificar que no es `edicion_abierta=true` (sección 1, si el admin dejó la edición abierta, la puerta no autoriza).
3. **Fallback manual**: si el QR no se puede leer, el operario de puerta anota manualmente:
   - Nombre del vendedor/pase
   - Cédula (del brazalete)
   - Hora
   - Firma del vendedor (si es posible)
   - El admin luego marca el pase manualmente desde `talento.html` o `stand.html` como "Autorizado a mano" (si el módulo lo permite).

### Verificación
- El mismo QR se escanea y autoriza correctamente tras resolver el problema (luz, internet, etc.).

---

## 6. Dispositivo comprometido (alguien usa la sesión de puerta sin autorización)

### Síntoma
- Escaneos no autorizados.
- La puerta autoriza personas que no deberían entrar.
- Se detecta actividad sospechosa en `dashboard.html` o `estadisticas.html`.

### Procedimiento
1. El admin accede a `dashboard.html` o `admin.html`.
2. Pulsa **🔴 Revocar todas las sesiones de puerta** (si está en la interfaz) o accede a `admin.html` → pestaña Sesiones → revoca la sesión de puerta comprometida.
3. El operario de puerta sale (botón "Salir") y vuelve a entrar con el PIN. La sesión nueva es válida.
4. Revisar `dashboard.html` → Estadísticas → ver cuántos escaneos se hicieron antes de la revocación y reportar a la organización.
5. Si el PIN también fue comprometido: cambiar el PIN de puerta (ver sección 8).

### Verificación
- Escanea un pase con la sesión nueva: debe autorizar correctamente.
- Escanea un pase ya autorizado: debe devolver `ENTRADA YA CONSUMIDA`.

---

## 7. Fallback manual: sin app disponible

### Síntoma
- La app no carga en ningún dispositivo.
- No hay internet en absoluto.
- Supabase está caído y no se reactiva.

### Procedimiento
1. **Listas impresas** (se imprimen antes del evento — ver sección 8):
   - El operario de puerta tiene impresas las listas de vendedores por stand (nombre, cédula, código de brazalete).
2. **Verificar identidad**:
   - Pedir credencial al vendedor.
   - Cruzar con la lista impresa.
3. **Autorizar manualmente**:
   - Marcar la lista impresa con un sello, tinta o check en la cédula.
   - Anotar hora en el cuaderno de registro.
4. **Registro**:
   - Cuaderno de registro con: cédula, nombre, hora, operario, stand.
5. **Al restablecerse la app**:
   - El admin ingresa a `stand.html` → `talento.html` → `puerta.html` y actualiza los marcados a mano en la base.

### Verificación
- Las listas impresas existen y están actualizadas (ver sección 8).
- El cuaderno de registro tiene todos los accesos manuales.

---

## 8. PINs comprometidos o cambios de PIN

### Procedimiento para cambiar un PIN
1. El admin accede a `admin.html` con su PIN.
2. Buscar la función de cambio de PIN en la interfaz (o usar el SQL Editor).
3. Si no hay interfaz, ejecutar:

```sql
-- Cambiar PIN de admin (ejemplo)
-- Primero obtener el hash bcrypt del nuevo PIN:
SELECT crypt('NUOVO_PIN_8_DIGITOS', gen_salt('bf', 12));
-- Luego actualizar la tabla admin:
UPDATE public.admin SET pin = 'EL_HASH_BCRYPT_AQUI' WHERE id = 1;
```

4. **Notificar al portador del PIN**: "Tu PIN cambió. El nuevo es: [PIN]".
5. **Rotar ambos PINs** (admin y puerta) si hay sospecha de compromiso general.

### Rotación de emergencia (antes del evento o durante)
1. Cambiar PIN admin (como arriba).
2. Cambiar PIN puerta (como arriba).
3. Informar a los usuarios de ambos PINs por el canal seguro (mensaje directo, no chat de grupo).
4. Verificar que ambos PINs funcionan accediendo a `admin.html` y `puerta.html`.

---

## 9. Restauración de backup

### Cuándo usarla
- Se borraron datos accidentalmente (tareas, personas, etc.).
- Se corruptió la base de datos (rare, pero posible con SQL incorrecto).
- Se necesita volver a un estado anterior.

### Procedimiento
1. **Obtener el archivo de backup**: `docs/sql/volcado-backup-*.sql` (se actualiza tras cada cambio importante).
2. **Ejecutar en el SQL Editor de Supabase**:
   - Abrir el SQL Editor.
   - Pegar todo el contenido del archivo.
   - Ejecutar lote por lote (o el editor completo).
   - Esperar a que diga "Complete" o "Success" en cada lote.
3. **Verificar**:
   - Consultar conteos de las tablas principales (`vendedores`, `personas`, `cortesias`, `aliado_concursos`).
   - Comparar con el conteo del backup (el archivo tiene comentarios con los conteos originales).
4. **Si algo no cuadra**: el archivo de backup incluye huella de contenido (`docs/sql/huella-contenido.sql`). Ejecutarlo y comparar con el hash del backup.

### Precaución
- La restauración **sobreescribe datos actuales**. No hagas backup de lo que no quieres perder.
- Si tienes una copia del backup más reciente (ej. de ayer), úsala. No uses el más antiguo disponible.

---

## 10. Antes del evento: checklist de preparación

- [ ] **PINs de admin y puerta**: ambos funcionales, anotados en lugar seguro.
- [ ] **Lista de contactos**: organizada (sección "Tabla de contactos" de este runbook).
- [ ] **Backup actualizado**: el último backup refleja el estado actual de la base.
- [ ] **Listas impresas**: las listas de vendedores/stand impresas y plastificadas.
- [ ] **Cámara de puerta**: limpia, iluminada, probada con QRs de prueba.
- [ ] **Hotspot móvil**: configurado y probado como respaldo de red.
- [ ] **Runbook impreso**: una copia física del runbook disponible para el equipo de puerta.
- [ ] **Cable Ethernet**: un cable de red para conectar la puerta directamente si el WiFi falla.
- [ ] **Cargadores**: todos los dispositivos cargados y con cable USB de respaldo.
- [ ] **Simulacro**: al menos un recorrido completo de "puerta con PIN → escanear pase → autorizar" con datos de prueba.

---

## Notas

- **Copia de seguridad**: este archivo vive en `docs/runbook-incidentes.md` del repositorio. Si el equipo no tiene acceso al repo, imprimir una copia física.
- **Mantener actualizado**: cada vez que se cambie un PIN, se añada un contacto o se modifique un procedimiento, actualizar este archivo y la copia impresa.
- **Contacto de emergencia del equipo**: si ningún procedimiento de aquí resuelve el problema, contactar al organizador principal.