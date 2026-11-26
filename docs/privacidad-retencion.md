# Privacidad: política de retención y borrado

> **ESTADO: PROPUESTA (25/11/2026, P1-03).** Este documento es la política de retención
> **propuesta** por la revisión de seguridad. **Ninguna regla de retención de aquí está
> aprobada todavía por el organizador**: cada número de días y cada SQL de borrado se ejecuta
> solo cuando el organizador lo revise y lo apruebe. El nombre del evento y las fechas de
> cierre los fija el organizador en cada edición.

El aviso público que los participantes pueden leer es [privacidad.html](../privacidad.html)
(raíz del repo). Este documento es la parte interna: qué se guarda, por cuánto tiempo y
cómo se borra.

## Principios (ya vigentes)

- **Minimización:** la cédula se muestra enmascarada (`123•••78`) en los listados; el dato
  completo solo se ve en la pantalla de puerta donde hay que cotejar contra la cédula física.
  Unidad 1b (SQL, pendiente): que la cédula completa ni siquiera llegue al navegador.
- **Los escaneos no tienen tabla propia:** el dato de escaneo son las columnas de estado y
  hora de `personas`, `vendedores` y `cortesia_personas` (`estado*`, `marcado*_at`).
- **La auditoría no guarda secretos:** `sesiones` solo guarda el hash del token
  (`token_hash`, la columna en claro se eliminó en P0-03), `login_intentos` guarda
  IP/dispositivo/resultado pero **jamás el PIN**, y las tablas de registro de acciones
  (`acciones_supervisor`, `reaperturas_puerta`) guardan hashes de sesión, no tokens.
- **Lo que NO se guarda nunca:** PINs en claro (solo bcrypt), tokens de sesión en claro
  (solo hash), datos de tarjeta (no se piden).

## Tabla de retención (PROPUESTA — requiere aprobación del organizador)

| Tabla | Qué guarda | Cuánto se conserva | Cómo se borra |
|---|---|---|---|
| `personas` | Nombre, apellido, **cédula**, cargo de cada integrante de una lista de talento + estado/marcas de escaneo | Evento activo + 90 días tras el cierre | `DELETE FROM personas WHERE lista_id IN (…del evento…);` |
| `vendedores` | Nombre, apellido, **cédula**, lo que vende, empresa y QR de cada vendedor de un stand | Evento activo + 90 días tras el cierre | `DELETE FROM vendedores WHERE stand_id IN (…);` |
| `cortesia_personas` | Nombre, apellido, **cédula**, correo y teléfono (opcional) de cada cortesía + estados de escaneo | Evento activo + 90 días tras el cierre | `DELETE FROM cortesia_personas WHERE cortesia_id IN (…);` |
| `aliados` | Organización, responsable, correo, teléfono y **cédula** del responsable (usada al detectar duplicados) | Evento activo + 90 días tras el cierre | `DELETE FROM aliados;` (por evento, cuando exista separación por evento — ver nota abajo) |
| `reclamos` | Reclamo: nombre de contacto, contacto (correo/teléfono), motivo, detalle y respuesta | Evento activo + 90 días tras el cierre (suficiente para reclamaciones de premio o pases no usados) | `DELETE FROM reclamos WHERE resuelta_at < cierre - 90 días;` |
| `talentos`, `stands`, `coordinadores` | Contacto operativo: `correo_link` (correo del responsable/representante), códigos de link | Evento activo + 90 días tras el cierre | Por fila del evento cerrado |
| `cortesias`, `aliado_asignaciones`, `aliado_concursos`, `cupones_movimientos` | Datos operativos del pase/concurso (razón, organización, cantidades). Solo son personales si el organizador puso el nombre de una persona en la razón | Se conservan con el evento | `DELETE` por evento cerrado |
| `login_intentos` | Auditoría de logins: IP, dispositivo, resultado. Sin PIN, sin nombre, sin cédula | **Más que lo personal (12 meses)**, sin datos personales innecesarios | `DELETE FROM login_intentos WHERE creada_at < now() - interval '12 months';` |
| `sesiones` | Solo-hash del token, rol, etiqueta de dispositivo, expiración | 12 meses | `DELETE FROM sesiones WHERE revocado_at IS NOT NULL AND expira_at < …;` |
| `acciones_supervisor`, `reaperturas_puerta` | Auditoría de acciones delicadas: acción, motivo, hash de sesión | 12 meses | `DELETE FROM … WHERE creada_at < now() - interval '12 months';` |
| `accesos_datos` (auditoría de revelados de cédula, P1-05) | Quién (hash de sesión), cuándo, qué registro y **motivo** de cada revelado. **Nota:** el campo `motivo` es texto libre escrito por el administrador y puede contener datos personales (nombre de la persona reclamante, cédula dicha de memoria, etc.); por eso se conserva 12 meses junto a la auditoría y se borra con ella | 12 meses | `DELETE FROM accesos_datos WHERE creada_at < now() - interval '12 months';` |
| `cedulas_duplicadas_log` | Registro antifraude de **cédulas duplicadas** detectadas (P1-01) | Caso especial de minimización: es la misma cédula que la persona ya entregó; se conserva 12 meses y después se borra con la auditoría | `DELETE FROM cedulas_duplicadas_log WHERE creada_at < now() - interval '12 months';` |
| `config` | Codigo del evento y PINs (bcrypt). No contiene datos personales | No se borra; los PIN se rotan (manual, capítulo 10) | — |
| Resto de tablas de trabajo del evento: `listas`, `cortesia_listas`, `eventos`, `aliado_ampliaciones` (nombres verificados en `supabase/migrations/0001_esquema_inicial.sql:51,75,87,91`) | Datos operativos (grupos por día, códigos cortos, estadísticas guardadas, ampliaciones de cupones). Sin datos personales propios: la cédula vive en `personas`, `vendedores` y `cortesia_personas` | Se conservan con el evento | Se borran con el cierre del evento vía la RPC `f_admin_limpiar_todo` (con sus protecciones del manual capítulo 02 y `docs/seguridad-garantias.md` G6), o `DELETE` manual por SQL del organizador |

**Por qué 90 días:** es una propuesta. Cubre la cola post-evento real del sistema:
reclamos que se responden con días de retraso, premios que se reclaman después del
canje y pases de cortesía no usados, y deja margen en caso de revisión de la mesa.
No dan para más: los datos personales no deben sobrevivir al evento más de lo que
hacen falta para responder reclamos.

## Cómo se borra (así es hoy, no PROPUESTA esta parte)

- El borrado **no lo hace la app**: se hace **por SQL desde el SQL Editor del proyecto
  Supabase, lo ejecuta el organizador**. Ningún botón de la interfaz borra datos personales.
- Antes de ejecutar cualquier `DELETE`: guardar el informe/pase de cierre (el organizador
  ya exporta el informe final), y preferir un respaldo si se va a borrar algo grande.
- Los mecanismos de control del evento (`f_admin_limpiar_todo`, que limpia el evento
  con las protecciones del manual capítulo 02/seguridad) ya borran las tablas de datos
  del evento cuando la edición termina de ese modo; el DELETE manual de arriba es el
  caso de un evento que se cierra sin usar esa limpieza o para borrar después de la fecha.
- Regla vigente del proyecto: **el SQL lo ejecuta siempre el usuario**, no un agente.
- Nota abierta (queda para el multi-evento, M-37): hoy la base está montada para una
  edición a la vez (`config` de fila única), así que «borrar por evento» y «borrar por
  fecha» son la misma operación mientras no existan dos eventos conviviendo.

## Marcar lo aprobado

Cuando el organizador apruebe (o cambie) una regla de esta tabla, se registra en
`DECISIONES.md` (append-only) y este documento deja de marcar la fila como PROPUESTA
y cita la decisión con su fecha.
