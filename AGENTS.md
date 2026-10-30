# Instrucciones para agentes

El backlog accionable de este proyecto vive en [`tareas/`](tareas/README.md).

## Antes de tocar código

1. Lee [`tareas/README.md`](tareas/README.md) y [`tareas/00-revision-seguridad.md`](tareas/00-revision-seguridad.md).
2. Elige **una** tarea con `estado: pendiente`, prioridad más alta y dependencias resueltas.
3. Cambia su frontmatter a `estado: en_progreso` antes de empezar.
4. Implementa, verifica los criterios de aceptación y deja evidencia en `## Notas de implementación`.
5. Al terminar, marca `estado: hecho`; si te bloqueas, marca `estado: bloqueado` y explica el bloqueo concreto.

## Reglas

- No ejecutes pruebas destructivas, de fuerza bruta ni de carga contra producción. Usa staging.
- No imprimas ni commitees tokens, claves, contraseñas ni datos personales.
- La seguridad real vive en las RPC/RLS de Supabase, no en los guards de JavaScript. Si una tarea toca permisos, cambia el servidor y documenta el SQL.
- Si cambias QR, escaneo o sesión, deja un fallback manual para el día del evento.
- Los números de línea en las tareas son referencias; verifica el archivo actual antes de editar.
- Si una tarea requiere cambios fuera de este repo (Supabase, DNS, Cloudflare), documenta exactamente qué se hizo y cómo se verificó, sin asumir acceso a producción.

## Estado

El proyecto es un frontend estático (HTML/CSS/JS) para GitHub Pages con backend en Supabase vía RPC. No hay build, tests ni migraciones en el repo. La revisión de seguridad y el detalle de cada tarea están en [`tareas/`](tareas/README.md).

## Anexo aprobado — Protocolo de Continuidad v3 (28/10/2026)

El estado del proyecto y la arquitectura viven en el repo:

- [`ESTADO.md`](ESTADO.md) — estado vigente: módulos verificados, workstreams, siguiente paso, checklist de arranque. Único archivo volátil.
- [`ARQUITECTURA.md`](ARQUITECTURA.md) — tablas, RPCs verificadas, manifiesto de archivos, reglas SQL. Solo cambia si cambia el esquema.
- [`DECISIONES.md`](DECISIONES.md) — decisiones y por qués. Append-only.
- Las tareas ejecutables siguen en [`tareas/`](tareas/README.md).

### Modo chat gratuito (sin agente, sin acceso al repo) — EL MODO PRINCIPAL

Este proyecto se trabaja con IA pública gratuita, donde el usuario pega los archivos y es las manos del asistente. Esto NO es un modo alternativo: es el modo para el que está diseñado todo el sistema.

- Al arrancar, el usuario pega en este orden: (1) este `AGENTS.md` completo, (2) `ESTADO.md` completo, y (3) si la sesión toca RPC/esquema o una tarea de `tareas/`, también ese archivo. El asistente de chat gratuito NO puede abrir enlaces ni el repo: NUNCA asumas que puedes leer URLs ni archivos por tu cuenta.
- El asistente NUNCA inventa el contenido de un archivo: si necesita editar un HTML/JS/MD, pide al usuario que lo pegue completo (o que lo copie del raw de GitHub). Antes de reescribir cualquier RPC, el usuario ejecuta el `pg_get_functiondef` en el SQL Editor y pega el resultado.
- La verificación de arranque que "el agente" hace solo, en modo gratuito la hace el usuario mirando GitHub en el navegador y reportando: lista de archivos del repo, últimos commits, estados de `tareas/` y última ejecución del keep-alive en Actions.
- Al cerrar ("CERRAR SESIÓN" o "handoff"), el asistente entrega LISTO PARA COPIAR: el `ESTADO.md` completo regenerado (versión +1), las líneas nuevas de `DECISIONES.md` (si las hubo), los cambios de `estado:` de las tareas tocadas, y la lista exacta de archivos que el usuario debe actualizar en GitHub (lápiz → Ctrl+A → Ctrl+V → Commit changes → esperar el verde de Actions antes de probar, M-26).
- Durante la sesión el asistente mantiene el contexto en la conversación (su "caché") y lo vuelca a los archivos SOLO en el cierre. Si nota que la sesión lleva mucho rato o el contexto pesa, propone consolidar y cerrar (regla heredada de la v2.4).

### Arranque de sesión

1. Lee `ESTADO.md` y `tareas/README.md` (en modo agente) o verifica que el usuario te los pegó (modo chat gratuito).
2. Ejecuta la verificación de arranque descrita en ESTADO.md §2 (repo, commits recientes, estados de tareas, keep-alive; SQL solo si se tocará el esquema, y lo ejecuta el usuario).
3. Si algo no encaja entre ESTADO.md, el repo y la base: DETENTE y avisa en español llano. No reconstruyas en silencio.
4. Trabaja UNA tarea o paso a la vez; espera confirmación del usuario antes de continuar.

### Cierre de sesión (el usuario escribe "CERRAR SESIÓN" o "handoff")

Sin código nuevo. Entregar:

1. `ESTADO.md` completo y actualizado (subir su número de versión y fecha), en un solo bloque copiable.
2. Actualización de los campos `estado:` de las `tareas/` tocadas, con evidencia en sus "Notas de implementación".
3. Anexo de decisiones nuevas a `DECISIONES.md` (si las hubo).
4. Indicar al usuario qué archivos debe commitear (docs y código juntos) y esperar el verde de Actions antes de probar (M-26).

### Regla de escritura en el repo (para agentes con acceso)

Cuando un asistente tenga acceso de escritura a este repo (token entregado por el usuario), NUNCA commitea directo a `main`:

1. Crea una rama dedicada con formato `agente/AAAA-MM-DD-tema` (ej.: `agente/2026-10-28-continuidad-v3`).
2. Hace ahí sus commits, con mensajes que empiecen con `[agente]` y expliquen qué hizo y por qué.
3. Abre un Pull Request hacia `main`.
4. SOLO el usuario revisa y fusiona el PR. El agente jamás fusiona ni borra ramas sin orden explícita del usuario.

Las subidas manuales del usuario (lápiz en GitHub) pueden seguir yendo directo a `main`, como siempre.

### Jerarquía de fuentes

Si hay contradicción: `AGENTS.md` > `ESTADO.md` > repo > memoria del asistente. Las reglas SQL y de seguridad de la sección "Reglas" de arriba siguen vigentes: el usuario ejecuta el SQL y los commits; ningún asistente pide ni maneja secretos.

## Anexo aprobado — Estilo de trato y ritmo de trabajo (28/10/2026, Sesión 13)

Acuerdo permanente del usuario, construido sesión tras sesión. Vale para cualquier IA que asista al proyecto (pública o agente): en chats gratuitos el usuario pega este archivo completo, así que este anexo viaja solo.

### Cómo se trabaja (el ritmo)

1. **UNA instrucción a la vez.** Nunca un "testamento" de pasos juntos. No se manda nada nuevo hasta que el paso actual esté hecho y verificado. **Granularidad del usuario (29/10/2026):** ni testamentos ni micro-pasos clic por clic — el usuario ya sabe operar GitHub y SQL. La instrucción correcta es: "sube por Upload este archivo" o "este lote", SIEMPRE con la ubicación exacta del archivo/carpeta en disco y el destino exacto en el repo; después el asistente verifica por su cuenta que quedó bien. Si el usuario pide más detalle, se da. **Texto del commit (29/10/2026):** cada instrucción de subida lleva también el texto exacto del commit. **Layout del repo (30/10/2026):** `AGENTS.md`, `ESTADO.md`, `ARQUITECTURA.md`, `DECISIONES.md` y `tareas/` viven en la RAÍZ del repo — la carpeta `moduloAcceso\continuidad\` es solo la copia local de trabajo; dar rutas de repo siempre contra la raíz.
2. **Cada paso lleva su PRUEBA DEL OBJETIVO, dato a dato:** todos los campos con valores exactos (si es formulario, la tabla completa; si es SQL, el texto completo; si es web, en qué página y qué botón), dónde se ejecuta y QUÉ DEBE VER el usuario en cada punto. No asumir nada.
3. **El asistente verifica antes de avanzar.** Cuando el usuario dice "subido" o "hecho", el asistente comprueba por sí mismo (blob sha del repo + Actions en verde, o lo que el usuario pegue) y solo entonces dice "correcto" y da el paso siguiente. El reporte del usuario dispara la verificación; no la sustituye. **SQL (29/10/2026):** tras CADA lote ejecutado se pide una consulta de conteo — **el "Success" del SQL Editor no es verificación** (un lote se aplicó por error en otro proyecto y pasó por exitoso; el conteo lo delató).
4. **Archivos SIEMPRE finales y completos**, listos para sustituir con Ctrl+A → Ctrl+V (o Upload files desde disco). Nunca parches por fragmentos ni instrucciones de edición parcial: un error del usuario aplicando fragmentos puede dañar la trayectoria del proyecto (registrado también en DECISIONES.md, 28/10/2026).
5. **Cada cambio lleva su INFORME:** qué se cambió y por qué. El usuario quiere entender, no solo obedecer.
6. **Nada destructivo sin aprobación explícita del usuario** (borrados, SQL de escritura, DROP). Todo el SQL lo ejecuta el usuario en el SQL Editor de Supabase — nunca asumir acceso a la base. Antes de reescribir cualquier RPC: `pg_get_functiondef` primero.
7. **Si algo no encaja** (archivo que falta, dato que no cuadra, contradicción entre fuentes): DETENER y avisar en español llano. No reconstruir en silencio.
8. **Si el usuario no entiende, re-explicar sin fastidio.** El usuario avisa cuando algo "hace ruido" aunque no se le pida — su intuición ya encontró un bug real (BUG-1, la función que reemplazaba en vez de sumar).
9. **UNA consulta SQL con resultados a la vez (29/10/2026).** La ventana del usuario no permite pegar varios resultados: nunca pedir dos consultas de una; una por turno, se pega el resultado, se verifica y se sigue.
10. **Las claves se auditan SOLO con booleanos (29/10/2026).** Ninguna consulta muestra PINs, tokens ni claves — ni prefijos, ni largos, ni fragmentos (un incidente expuso 7 de 8 caracteres de un PIN; quedó neutralizado por rotación). La forma correcta: `(left(pin, 2) = '$2') as es_bcrypt`, contajes y nada más.

### Lo que el asistente puede esperar del usuario

- Ejecuta exacto lo que se le manda y reporta por texto: "todo salió como esperas", o pega el texto exacto del error.
- Sus capturas de pantalla son solo para su archivo personal (carpeta Screenshots de Windows): NO son canal con el asistente. La verificación es por texto y por datos.
- El usuario ejecuta todos los SQL, sube todos los archivos a GitHub siempre en main (lápiz / Add file / Upload files), y espera el verde de Actions antes de probar nada.

### Formato de cada paso

1. Verificación del paso anterior → "Correcto" · 2. INFORME (qué + por qué) · 3. UNA instrucción con valores exactos · 4. PRUEBA DEL OBJETIVO dato a dato · 5. Reporte del usuario → vuelve a 1.
