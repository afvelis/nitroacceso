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
# ANEXO para AGENTS.md — Protocolo de Continuidad v3

> **Estado: PROPUESTA — el usuario debe aprobarla antes de fusionarla.**
> Este archivo es el texto exacto que se pegará AL FINAL de `AGENTS.md` (lápiz ✏️ → Ctrl+A no: solo AGREGAR al final → Commit changes → esperar el verde M-26). Si apruebas el anexo tal cual, solo copias desde la línea que dice "INICIO DEL ANEXO" hasta "FIN DEL ANEXO".

---

INICIO DEL ANEXO

## Anexo aprobado — Protocolo de Continuidad v3 (28/10/2026)

El estado del proyecto y la arquitectura viven en el repo:

- [`ESTADO.md`](continuidad/ESTADO.md) — estado vigente: módulos verificados, workstreams, siguiente paso, checklist de arranque. Único archivo volátil.
- [`ARQUITECTURA.md`](continuidad/ARQUITECTURA.md) — tablas, RPCs verificadas, manifiesto de archivos, reglas SQL. Solo cambia si cambia el esquema.
- [`DECISIONES.md`](continuidad/DECISIONES.md) — decisiones y por qués. Append-only.
- Las tareas ejecutables siguen en [`tareas/`](tareas/README.md).

### Modo chat gratuito (sin agente, sin acceso al repo) — EL MODO PRINCIPAL

Este proyecto se trabaja con IA pública gratuita, donde el usuario pega los archivos y es las manos del asistente. Esto NO es un modo alternativo: es el modo para el que está diseñado todo el sistema.

- Al arrancar, el usuario pega en este orden: (1) este `AGENTS.md` completo, (2) `ESTADO.md` completo, y (3) si la sesión toca RPC/esquema o una tarea de `tareas/`, también ese archivo. El asistente de chat gratuito NO puede abrir enlaces ni el repo: NUNCA asumas que puedes leer URLs ni archivos por tu cuenta.
- El asistente NUNCA inventa el contenido de un archivo: si necesita editar un HTML/JS/MD, pide al usuario que lo pegue completo (o que lo copie del raw de GitHub). Antes de reescribir cualquier RPC, el usuario ejecuta el `pg_get_functiondef` en el SQL Editor y pega el resultado.
- La verificación de arranque que "el agente" hace solo, en modo gratuito la hace el usuario mirando GitHub en el navegador y reportando: lista de archivos del repo, últimos commits, estados de `tareas/` y última ejecución del keep-alive en Actions.
- Al cerrar ("CERRAR SESIÓN" o "handoff"), el asistente entrega LISTO PARA COPIAR: el `ESTADO.md` completo regenerado (versión +1), las líneas nuevas de `DECISIONES.md` (si las hubo), los cambios de `estado:` de las tareas tocadas, y la lista exacta de archivos que el usuario debe actualizar en GitHub (lápiz ✏️ → Ctrl+A → Ctrl+V → Commit changes → esperar el 🟢 de Actions antes de probar, M-26).
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

Las subidas manuales del usuario (lápiz ✏️ en GitHub) pueden seguir yendo directo a `main`, como siempre.

### Jerarquía de fuentes

Si hay contradicción: `AGENTS.md` > `ESTADO.md` > repo > memoria del asistente. Las reglas SQL y de seguridad de la Parte "Reglas" de arriba siguen vigentes: el usuario ejecuta el SQL y los commits; ningún asistente pide ni maneja secretos.

FIN DEL ANEXO

---

### Qué cambiará en los archivos locales (tu PC)

- `moduloAcceso\IA_Asist_Continuidad\` queda como archivo del método antiguo: los 4 txt v2.4 ya están en su `historico\` y no se actualizan más.
- Los nuevos documentos viven en `moduloAcceso\continuidad\` (copia local para pegar en chats gratuitos) y en la RAÍZ del repo (fuente de verdad; se decidió el 28/10 dejarlos sin carpeta).
- Para chats gratuitos (DeepSeek web sin acceso al repo): pega `AGENTS.md` (con el anexo ya fusionado) + `ESTADO.md`, y añade `ARQUITECTURA.md` solo si la sesión toca RPC/esquema.
