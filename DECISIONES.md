# DECISIONES.md — NitroSystem

> Registro append-only de decisiones y sus "por qués". Se agrega, nunca se borra ni se reescribe. Si una decisión cambia, se agrega una entrada nueva que la sustituye y se cita a la anterior.
> Formato: fecha · versión de origen · DECISIÓN — POR QUÉ.
> Fuente inicial: Q&A de los prompts de traspaso v2.0–v2.4 (importado el 28/10/2026 para la migración al sistema v3).

---

## Heredadas del prompt v2.4 — bloque "v2.0 a v2.2" (compilado 28/10/2026)

- [v2.0] PIN en index.html sin maxlength — el maxlength bloqueaba el PIN de 8 dígitos del admin.
- [v2.0] El toggle del dashboard envía `p_abierta: !estadoActual` — evita desincronización del estado.
- [v2.0] jsQR desde CDN como capa 2 de lectura QR — única librería externa aprobada; nunca reproducir librerías grandes de memoria.
- [v2.0] CSS `[hidden]{display:none !important;}` en talento.html — el `hidden` nativo perdía contra otros display.
- [v2.0] `f_coord_editar_talento` devuelve TAL- nuevo (rotación de código) al editar.
- [v2.0] `f_link_talento_ver` devuelve `{anulado:true}` para links anulados.
- [v2.0] Las cortesías no cuentan en los tiempos de gestión — son otra categoría operativa.
- [v2.0] `f_admin_tiempos` y `personas.creada_at` existen — requisito del informe de tiempos.
- [v2.0] El informe guarda segmentación y tiempos.
- [v2.0] Jerarquía de puertas: patrocinantes → pagados → talentos.
- [v2.0] Tarjetas de dashboard NO clicables (sigue como idea pendiente de producto).
- [v2.0] coord.html usa `f_coord_mis_links`.
- [v2.0] puerta.html usa `f_puerta_cerrar_dia_y_activar_siguiente`.
- [v2.0] `f_admin_editar_cortesia_datos` existe.
- [v2.0] Dashboard con alertas expandibles.
- [v2.0] stand.html con evento cerrado muestra QR directo.
- [v2.0] sessionStorage `na_norep_<codigo>` para no repetir pantallas.
- [v2.0] Botón "Terminé" fijo abajo.
- [v2.0] talento.html tiene comportamiento CONGELADO (botón "Cerrar esta pestaña" y panel azul del Día 2 no se tocan).
- [v2.0] "Salir" solo existe en el dashboard.
- [v2.0] Se prohibió reproducir librerías grandes de memoria.
- [v2.0] Cortesías funcionan con evento abierto o cerrado.
- [v2.0] Se permite repetir lista del Día 1 al crear la del Día 2.
- [v2.0] `f_admin_guardar_evento` fue reescrita.
- [v2.1] Se separó cortesias.html (panel admin) de admin.html.
- [v2.1] Modales propios — prohibido alert/confirm/prompt nativos en páginas nuevas.
- [v2.1] `f_admin_estado_dias` existe; días cerrados viven en config.
- [v2.1] Congelamiento de cortesías y premiaciones tras cierre.
- [v2.1] Premiación no reutilizable.
- [v2.1] Campo "aliado" en premiación.
- [v2.1] Se quitó "Premio" del selector de razón (premiación es tipo aparte).
- [v2.2] "Última creada" solo se edita arriba.
- [v2.2] Buscador del histórico.
- [v2.2] Columnas Aliado y Reclamadas/Obsequiadas.
- [v2.2] table-layout:fixed y nth-child para tablas.
- [v2.2] "Evento culminado" cuando ambos días cierran.
- [v2.2] window.alert sobrescrito en puerta.html.
- [v2.2] `f_admin_segmentacion` ampliada con campos de premiación.
- [v2.2] Botón Estadísticas directo.

## Heredadas del prompt v2.4 — bloque "v2.3" (compilado 28/10/2026)

- [v2.3] El módulo de aliados usa "concursos" y no premios sueltos.
- [v2.3] Los cupones se reservan al crear el concurso.
- [v2.3] Eliminar concurso solo si no tiene ganador.
- [v2.3] El admin puede ampliar cupones solo con justificación.
- [v2.3] El aliado no puede editar un concurso que ya tiene ganador.
- [v2.3] Sin WhatsApp/Correo en el módulo del aliado (solo copiar) — formularios de terceros llevan solo Copiar (M-25).
- [v2.3] Avisos azul/amarillo/rojo en el módulo del aliado; 3 días de margen para el amarillo.
- [v2.3] El aviso de fecha vencida solo aparece después de creado.
- [v2.3] Validación temprana al pulsar "Crear nuevo concurso".
- [v2.3] Los premios de días cerrados desaparecen del módulo del aliado.
- [v2.3] La fecha de ejecución del concurso es OBLIGATORIA.

## Heredadas del prompt v2.4 — bloque "v2.4" (compilado 28/10/2026)

- [v2.4] El admin puede crear duplicados si marca el check — casos legítimos (sucursales/representantes); la alerta evita fraude accidental sin bloquear al admin; queda registrado en `nota_duplicado`.
- [v2.4] El chequeo de duplicados es doble (frontend + backend) — defensa en profundidad: frontend para UX, la RPC bloquea igual si alguien se salta el frontend.
- [v2.4] `aliados-concursos.html` es página aparte y no un modal — los concursos van a crecer (detalle, editar, anular, reenviar); patrón de páginas separadas.
- [v2.4] Los concursos viven aparte de aliados.html — mantener aliados.html enfocado en gestión de aliados y asignaciones.
- [v2.4] `acceso-denegado.html` sin rebote a index — redirigir al login regala la oportunidad de intentar entrar; la pantalla cerrada no da pistas (M-28).
- [v2.4] Chequeo de sesión en el head y no al final del body — evita el destello de pintar la página protegida antes de redirigir (M-31).
- [v2.4] El botón de cerrar pestaña muestra mensaje si no cierra — `window.close()` está bloqueado por defecto en navegadores modernos.
- [v2.4] Normas M-25 a M-32 — M-25 prepara el futuro motor de envíos; M-26 porque el 90% de los "no se reflejó" son deploys sin terminar; M-27 pulido visual; M-28 seguridad; M-29/M-30 para futuro; M-31 anti-destellos; M-32 porque un Ctrl+F mal aplicado rompió un archivo.

## 22/10/2026 · Sesión 11 (reconstruida el 28/10 desde los commits 95a6982 y 2eb4652)

- 22/10 · Ampliar cupones es un modal con justificación obligatoria (motivo de lista + detalle opcional) — toda ampliación queda en `aliado_ampliaciones` con cupones_antes/después y motivo; la RPC `f_admin_ampliar_cupones` ya lo exigía desde v2.3.
- 22/10 · El desglose de cupones muestra "base + ampliado" (ej.: Asignadas: 10 + 5) en vez de solo el total — transparencia: el admin ve cuánto cupón es original y cuánto vino de ampliaciones; la columna "Ampliaciones: N" se retiró de la línea de stats porque ahora el dato está en el desglose.
- 22/10 · El modal de Ampliar acepta pool "por día" (campos D1/D2) aunque la creación de asignaciones por día sigue deshabilitada en la UI — el modal quedó listo para cuando se habilite el pool por día (etapa pendiente del brief).

## 27/10/2026 · Sesión de auditoría y adopciones

- 27/10 · Se adopta el backlog de seguridad `tareas/` (PR #1, rama docs/revision-seguridad, colaborador de confianza alex0195) como workstream oficial — el usuario confirmó su origen y confianza; se integra al flujo definido en AGENTS.md.
- 27/10 · Verificación de backend (Consulta A): no hay RPCs nuevas desde v2.4; se detectan 3 objetos no documentados (sobrecarga de `f_coord_crear_stand`, `f_puerta_activar_dia2`, `rls_auto_enable`) — decisión: documentar con [VERIFICAR] y decidir limpieza después, sin tocar la base ese día.
- 27/10 · La Consulta B quedó incompleta (paste cortado en `eventos`) — decisión: no sembrar ARQUITECTURA.md hasta cerrarla al 100%.

## 28/10/2026 · Migración al Sistema de Continuidad v3

- 28/10 · Se reemplaza el método "4 txt por versión" por AGENTS.md + ESTADO.md + ARQUITECTURA.md + DECISIONES.md + tareas/, todo versionado en el repo — el traspaso desincronizado del repo causó la pérdida de contexto del 22/10; los docs dentro del repo eliminan esa deriva estructuralmente y sirven igual para chats gratuitos (pegar AGENTS.md + ESTADO.md) que para agentes (leer el repo).
- 28/10 · Los 3 documentos de continuidad viven en la RAÍZ del repo (sin carpeta) — el usuario los subió así y es más simple para su flujo manual en GitHub web; todas las referencias del sistema apuntan a la raíz.
- 28/10 · Los 4 txt de la v2.4 pasan a historico/ y dejan de evolucionar — el ESTADO.md v1 hereda todo su contenido vigente (pendientes, reglas, decisiones).

## 28/10/2026 · Sesión 12 — Brief de aliados completado · BUG-1 corregido · Rebranding NitroSystem

- 28/10 · **La app se renombra de "Nitrotoon" a "NitroSystem"** (decisión del usuario; formato elegido "Solo NitroSystem": títulos y encabezados de marca pura, ej. "NitroSystem - Aliado"). El momento lo eligió el asistente ("antes de avanzar demasiado y que el cambio implique mucho trabajo"): se ejecutó al cierre del brief, en un solo commit de 15 archivos (14 HTML + config.js, 50 reemplazos). Intactos a propósito: repo y URLs `nitroacceso` (renombrar el repo rompería links externos), Instagram `@nitrotoon` (handle externo), y los documentos .md (actualizados en este mismo cierre).
- 28/10 · `NOMBRE_EVENTO` en config.js pasa de "NITROACCESO" a "NITROSYSTEM" — la constante no tiene uso funcional (detectado por tareas/00-revision-seguridad.md); se actualiza por coherencia de marca.
- 28/10 · **BUG-1:** `f_admin_ampliar_cupones` tenía semántica de REEMPLAZO (el número entrado se convertía en el total nuevo del pool y permitía reducirlo por accidente; el aviso decía p. ej. "Antes: 2 / Ahora: 1"). Se reescribió con **semántica de SUMA** + guardas (único: ≥1; por_dia: D1/D2 ≥0 y suma ≥1), misma firma y mismo retorno — sin cambios en el cliente. Daño real detectado: 5 asignaciones de prueba (TestCedula, prueba5, prueba6, y 2 de QA Multipool 4). Limpieza: filas contaminadas de `aliado_ampliaciones` (cupones_despues < cupones_antes) borradas, QA Multipool 4 restaurado (5 y 2 cupones) y los 3 aliados de prueba del 22/10 eliminados. Respaldos de la función ANTES y FIX en `moduloAcceso\entregas\sql\` del PC del usuario. La detección fue posible por el protocolo de pruebas dato a dato del usuario.
- 28/10 · **El brief de aliados queda completo** (workstream A): Anular asignación, Dar de baja al aliado (caja explicativa + contador de asignaciones activas — la prueba del contador "(2)" resolvió la duda del usuario del paso 2), Agregar asignación (multi-pool con modal de compartir) y pastilla "🤝 Gestionar aliados" en cortesias.html.
- 28/10 · Protocolo de trabajo consolidado en esta sesión (queda como práctica vigente): el usuario trabaja SIEMPRE en main (lápiz / Add file / Upload files); las ramas solo para agentes con token (regla de AGENTS.md). Cada paso se entrega con PRUEBA DEL OBJETIVO **dato a dato** (todos los campos, dónde ejecutar y qué esperar, sin asumir). El asistente verifica por red (git blob sha + Actions verde) antes de dar el paso siguiente. El usuario captura pantallas solo para su archivo personal (carpeta Screenshots de Windows) y reporta por texto; el asistente no puede ver imágenes y las capturas no son canal de verificación.
- 28/10 · **Regla de entrega (definitiva):** el asistente SIEMPRE entrega archivos FINALES completos, listos para sustituir el existente con Ctrl+A → Ctrl+V — nunca parches por fragmentos, nunca instrucciones de edición parcial. Un error del usuario aplicando fragmentos puede dañar la trayectoria del proyecto; la sustitución completa es segura y verificable por hash.
- 28/10 · Registros de QA del módulo de aliados: QA-1 / QA-2 / QA-3 (anulados con motivo de verificación; QA-2 con 2 premios: "Premio QA 1", "Premio QA 2") quedan como evidencia histórica y NO se limpian; **QA Multipool 4 queda VIVO** con 2 asignaciones (6 y 3 cupones tras la prueba del fix) para pruebas futuras.
- 28/10 · Mejoras nuevas registradas en ESTADO §3-C (numeradas siguiendo la serie M existente): **M-33** humanizar la vista "anulada" del aliado (usar `anulada_at`, que ya existe en `aliado_asignaciones` y `cortesias`; tono menos seco) · **M-34** fecha de creación en la tarjeta del admin · **M-35** mostrar los nombres de los premios anulados (requiere cambio de RPC) · **M-36** módulo de reclamos (formulario en la vista anulada en vez de "comunícate con la mesa técnica" + alerta en dashboard + gestión).

## 28/10/2026 · Sesión 13 — P0-01 (XSS) cerrado · Hoja de estilo de trato · Hallazgos F-1 a F-5

- 28/10 · **P0-01 (XSS almacenado) queda HECHO y probado en vivo** — 10 archivos (config.js + 8 HTML + `tareas/P0-01-xss-escape.md`), commits `44ef31ab` (fix) y `53ab76ff` (docs), Actions #166/#167 verdes. Dos capas demostradas: la validación nueva RECHAZA el payload `<img src=x onerror=alert(1)>` en los formularios públicos (no llega a la base) y el escape se probó con un nombre legítimo con apóstrofe y comillas (`O'Brien "Prueba"`), guardado y mostrado intacto en talento → puerta (lista `L-0765D8`) → vista de lista completada; no-regresión comprobada (autorización de punta a punta con cierre automático de lista). El ejemplo de prueba se eliminó del SQL Editor por id exacto con verificación final en 0 filas. La decisión original de la tarea (el payload "se ve como texto") queda satisfecha de forma más fuerte: el payload ya no puede entrar, por eso la prueba del escape usa un nombre espinoso legítimo.
- 28/10 · **La "Hoja de estilo de trato y ritmo de trabajo" del usuario queda incorporada como anexo permanente de AGENTS.md** (acuerdo del 28/10, Sesión 13): una instrucción a la vez, prueba del objetivo dato a dato, verificación del asistente antes de avanzar, archivos finales completos, informe de cada cambio, nada destructivo sin aprobación, detener si algo no encaja, re-explicar sin fastidio. Por qué: formaliza como método permanente lo que ya funcionaba en la práctica desde la Sesión 12 y garantiza que cualquier IA futura (pública o agente) lo reciba sin re-explicación.
- 28/10 · **Hallazgos F-1 a F-5 de la prueba en vivo quedan como backlog (workstream F en ESTADO §3), por migrar a `tareas/` con PLANTILLA.md**: F-1 el botón "Repetir y editar la del Dia 1" (talento.html → RPC `f_link_talento_copiar`) no copió la lista en la prueba del usuario — investigar con `pg_get_functiondef` + consola del navegador; F-2 "Mis links" de coord ordena del más viejo y no muestra cupo (propuesta del usuario: historial colapsable con los 2 últimos visibles); F-3 revalidar la lógica edición abierta/cerrada módulo por módulo sin consecuencias sobre los datos; F-4 el QR del talento no muestra el código corto en pantalla (stand sí, y su propio texto pide dictarlo); F-5 los parámetros `?lista=`/`?v=` se pierden si no hay sesión previa de puerta (puerta.html:1159-1174; el usuario lo rodeó pegando el código en el buscador manual).
- 28/10 · Corrección de dato: la fila de keep-alive en ESTADO v3 citaba "runs #158–160", que son de Pages build — el keep-alive real va por **run #11** (verde 28/10 14:15 local, event schedule, cadencia cada 3 días, próximo ~31/10).
