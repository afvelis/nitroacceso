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
