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

## Sesión 14 (29/10/2026)

- 29/10 · **Higiene documental:** F-1…F-5 (prueba en vivo) y M-33…M-36 (ideas de producto) migrados a `tareas/` con PLANTILLA.md; `tareas/README.md` queda como índice del backlog. Manifiesto de ARQUITECTURA §7 corregido: no existe README en la raíz (error del manifiesto desde la migración v3) y se registra la carpeta nueva `docs/`.
- 29/10 · **Acuerdo de granularidad (anexo permanente en AGENTS.md, regla 1):** ni testamentos ni micro-pasos clic por clic — instrucciones tipo "sube por Upload este archivo/lote", SIEMPRE con la ubicación exacta en disco y el destino exacto en el repo; después el asistente verifica por su cuenta (blob + Actions).
- 29/10 · **P0-02 aplicada directo sobre producción (sin staging — no existe; P1-04):** criterio aceptado porque la base no tiene tráfico (el evento pasó), todo SQL lo ejecutó el usuario con aprobación explícita bloque a bloque, todo fue reversible, las definiciones se capturaron ANTES (pg_get_functiondef, Consulta F) y el SQL exacto quedó versionado en `docs/seguridad-supabase.md`. Smoke test de la app tras cada fase.
- 29/10 · **Cierre de permisos (fase 2 de P0-02):** `REVOKE ALL ON ALL TABLES IN SCHEMA public` para anon/authenticated (la app va 100% por RPC SECURITY DEFINER) + REVOKE PUBLIC / GRANT anon en las 4 funciones con proacl NULL que la app usa. Criterio: mínimo privilegio; TRUNCATE/REFERENCES/TRIGGER sobrantes cerrados.
- 29/10 · **Se CONSERVA `rls_auto_enable()` + event trigger `ensure_rls`:** es una red de seguridad que activa RLS automáticamente en toda tabla nueva de `public`; solo-postgres. (Resuelve el [VERIFICAR] del 27/10 — no era helper suelto sino handler de event trigger.)
- 29/10 · **DROPs de código muerto (fase 3 de P0-02):** sobrecarga de 6 argumentos de `f_coord_crear_stand` (nadie la llamaba; elimina el riesgo PGRST202), `f_puerta_activar_dia2` (variante legacy del flujo de días; el flujo real usa `f_puerta_cerrar_dia_y_activar_siguiente`) y `f_aliado_crear_premio` (deprecada; ya era un coto que devolvía ERR_DEPRECADO_USAR_CONCURSOS). (Resuelven los otros dos [VERIFICAR] del 27/10.)
- 29/10 · **Deuda aceptada y trasladada:** `p_token` se valida en claro contra `sesiones.token` (sin hash) y no hay expiración ni revocación de sesiones → **P0-03**. Staging, migraciones versionadas y prueba funcional con un token REAL de puerta contra `f_admin_dashboard` → **P1-04**.

## Sesión 15 — P0-03 (29-30/10/2026)

- 29/10 · **P0-03 · Expiración de sesión: 8 horas.** Equilibrio entre una jornada de evento (puerta trabaja ~10-12 h con posible re-login) y el riesgo de una tablet abandonada. Las sesiones mueren solas aunque nadie las revoque.
- 29/10 · **P0-03 · Rate limit: 5 intentos fallidos por IP en 15 minutos → bloqueo de 15 minutos**, incluso si el intento trae el PIN correcto (el bloqueo se chequea antes de mirar el PIN). El umbral es por IP (via `x-forwarded-for`/`x-real-ip`), no por dispositivo. Sin header `Retry-After` ni alertas: PostgREST no lo expone fácil y el proyecto no tiene canal de alertas; el mensaje BLOQUEADO legible en el login es el contrato.
- 29/10 · **P0-03 · Sesiones solo-hash: el token se genera en el login, viaja UNA vez al navegador y jamás vuelve a la base en claro.** En la base solo vive su SHA-256 (`token_hash`). La columna `token` fue ELIMINADA y la llave primaria pasó a `token_hash` — el "no tokens en claro" dejó de ser una política y es una imposibilidad física. 36 funciones al guardián `f_sesion_ok`, 3 `LANGUAGE sql` con hash inline (son `STABLE`, no pueden llamarlo), 13 helper-users vía `f_sesion_rol`.
- 29/10 · **P0-03 · PINs de exactamente 6 dígitos con bcrypt** (`pgcrypto`, `$2a$06$`). Rotación desde el panel (`f_admin_rotar_pin`) con **prueba de presencia del PIN admin actual** (aunque el objetivo sea el de puerta) y formato `^[0-9]{6}$`. La aceptación de PIN en claro muere sola al rotar (el hash no acepta el claro). Supabase Auth + MFA: descartado para esta fase — el modelo PIN+bcrypt cumplió los criterios; retomable como P2.
- 29/10 · **P0-03 · "Revocar todas las sesiones" = todas EXCEPTO la propia** (`f_admin_revocar_sesiones`). El admin no debe cerrarse a sí mismo la puerta; la salida individual existe por separado (`f_logout` + botones Salir).
- 29/10 · **P0-03 · Auto-bloqueo por inactividad: 5 minutos** en puerta y admin (clic/tecla/toque/scroll/ratón lo reinician). Cierra la sesión REAL (revoca) y regresa al login. Candado local evita temporizadores duplicados por doble activación.
- 29/10 · **P0-03 · `dashboard.html` no se tocó:** su botón "Salir" ya llamaba a `borrarSesion()`, que ahora revoca en la base — la salida real se hereda de `config.js`. Menos archivos tocados = menos riesgo.
- 29/10 · **P0-03 · `admin.html` v2: modales propios (regla v2.1) en TODA la página.** Motivo técnico real: Chrome SUPRIME los diálogos nativos (`alert/confirm/prompt`) cuando una página los dispara encadenados — la primera rotación de PIN "pareció" exitosa y nunca se aplicó porque el resultado nunca se vio. Los modales propios siempre son visibles: no es solo estética, evita fallos silenciosos.
- 29/10 · **P0-03 · Cierre de evento barre sesiones + intentos de login** (`f_admin_limpiar_todo` ahora borra `sesiones` y `login_intentos`) — petición explícita del usuario. PENDIENTE registrado: esa limpieza no reinicia `dia1_cerrado`/`dia2_cerrado` (pre-existente a P0-03); el próximo evento arrancaría con los días "cerrados" del anterior — decisión del usuario antes del próximo evento.
- 29/10 · **Estilo de trato · Reglas nuevas permanentes (agregadas a AGENTS.md):** (1) las consultas SQL con resultados se piden UNA a la vez — la ventana del usuario no permite pegar más; (2) todo cambio de repo se entrega con ruta exacta + texto de commit; (3) **las verificaciones de claves jamás muestran prefijos, largos ni fragmentos — solo booleanos** (`(left(pin,2) = '$2')`). La regla 3 nace de un incidente real: una consulta de verificación expuso 7 de los 8 caracteres de un PIN aún en claro; quedó neutralizado por rotación (el valor filtrado murió).
- 29/10 · **Verificación · "Success" no basta: todo lote de SQL se verifica con una consulta de conteo.** Un lote de la Fase D se aplicó en un proyecto equivocado del SQL Editor y pasó por exitoso; el conteo mostró 7/10 y se re-aplicó en el proyecto correcto (nitrotalentos). Lección: el conteo posterior ES la ejecución verificada.

## Sesión 16 — P0-04 (30/10/2026)

- 30/10 · **P0-04 · QR generado en local: `qrcode-generator` 1.4.4 (MIT) + gancho UTF-8, en `vendor/`.** Se dejó de depender de `api.qrserver.com` y `quickchart.io`. `ponerQR` sigue dejando un `<img>` con URL `data:` porque `talento.html` y `stand.html` hacen `fetch(img.src)` para «Copiar QR»: sin `<img>` real ese botón muere. El pie «Codigo: …» y el link en texto se conservan como respaldo si la librería no carga.
- 30/10 · **P0-04 · `jsQR` 1.4.0 (Apache-2.0) vendorizado en `vendor/`.** Sustituye al CDN como capa 2. Las tres capas quedan: `BarcodeDetector` → `jsQR` local → código manual. Verificado con cámara real en el navegador de puerta.
- 30/10 · **P0-04 · El pie del código QR lleva fondo y color propios, y va debajo del QR.** Tres bugs encadenados en el mismo sitio: (1) `ponerQR` borraba el contenedor dentro del `.then` de carga de la librería y pisaba lo ya pintado; (2) sin fondo propio, el texto negro caía sobre el fondo oscuro de la página (invisible en `talento.html`); (3) con `inline-block` se montaba al lado del QR. Se arregló en `config.js` para que valga en todas las páginas y en las futuras. Razón de fondo: **sin el pie legible, si la cámara falla el talento no puede dictar su código**, y esa es la fricción cero que el proyecto considera intocable.
- 30/10 · **P0-04 · «Copiar QR» busca la imagen en el momento del clic, no al construir la página.** Desde que el QR es local, el `<img>` no existe cuando se arma la caja: leer `img.src` antes hacía que el botón **siempre** cayera al respaldo de texto. Confirmado por el usuario pegando la imagen en WhatsApp.
- 30/10 · **P0-04 · `Referrer-Policy: no-referrer` y `noindex, nofollow` por `<meta>` en 14 páginas.** Motivo: sin `no-referrer`, al pulsar un enlace externo el navegador envía la URL completa, **que lleva el código del pase** (`?t=`, `?c=`, `?s=`); sin `noindex`, un buscador puede indexar un link con nombres y cédulas. `noindex` se omite a propósito en `index.html` y `acceso-denegado.html` (pantallas neutras). Va por `<meta>` porque GitHub Pages no permite cabeceras HTTP.
- 30/10 · **P0-04 · Los scripts inline pasan a `js/` (14 de 17).** El bloque se sustituye en su mismo sitio por `<script src="js/<pagina>.js">`, sin `defer` ni `async`, para no alterar el orden respecto a `config.js`. No se reescribió una línea de código: se verificó por reconstrucción (recomponer el HTML original da idéntico carácter por carácter).
- 30/10 · **P0-04 · Los 3 mini-scripts de chequeo de sesión (M-28) se quedan inline a propósito, y la fase 4 los cubre con `sha256` en la CSP.** Pasarlos a archivo externo obligaría al navegador a descargarlos antes de decidir y en ese hueco **se vería el panel a alguien sin sesión**: sería una regresión de seguridad disfrazada de mejora.
- 30/10 · **P0-04 · Sin Cloudflare: la CSP va por `<meta>` y `frame-ancestors` no se puede aplicar.** Confirmado por cabeceras (`server: GitHub.com`, `via: 1.1 varnish`, `x-served-by: cache-mia…`), no por suposición. Límite documentado del hosting.
- 30/10 · **P0-04 · CSP sin `'unsafe-inline'` en 5 páginas, con el `sha256` del bloque `<style>` de cada una.** `style-src 'self'` a secas **habría bloqueado el `<style>` del `<head>`** y dejado las páginas sin estilos; se detectó antes de entregar. El hash permite que cada página acepte **solo su propia hoja** y nada más. Con `script-src 'self'` un XSS no puede ejecutarse: eso es más de lo que pedía la tarea.
- 30/10 · **P0-04 · Los anchos dinámicos de barras se aplican por CSSOM, no con atributo `style`.** `el.style.width = …` desde JavaScript **no** lo bloquea la CSP porque no es un atributo inline; `style="width:X%"` sí. Sin esa distinción no se pueden hacer barras dinámicas con CSP estricta. En `estadisticas.html` las barras usan `data-ancho` y un `MutationObserver`.
- 30/10 · **P0-04 queda `bloqueado`, no `hecho`, con 15/15 casillas marcadas.** La CSP solo está en 5 de 14 páginas y faltan 9 (121 conversiones), incluidas `puerta.html` y `stand.html`. Marcarla `hecho` sería declarar protegido lo que no lo está.
- 30/10 · **Lección operativa · `Ctrl+F5` antes de declarar un fallo.** GitHub Pages sirve con `cache-control: max-age=600`: el navegador mostró el `config.js` viejo y nos hizo creer que un arreglo correcto había fallado. Costó una vuelta entera de diagnóstico.
- 30/10 · **Lección operativa · los `.md` se suben con el lápiz (Ctrl+A → Ctrl+V), no con arrastre.** Dos `.md` subidos por arrastre dieron «Something went really wrong» / error 500 en GitHub mientras los `.html` del mismo lote subían sin problema. El contenido estaba validado (UTF-8 sin BOM, LF, sin caracteres de control): el fallo era del transporte.
- 30/10 · **Lección operativa · instrucciones de prueba con la URL completa, no con la ruta.** «Abre tu link de talento» hizo perder turnos dos veces: `coord.html` muestra solo el tipo del coordinador (`talentos` o `stands`, fijado por su código), no dos pestañas, y `puerta.html` **nunca dibuja QR** (es la página que lo lee). Toda prueba debe decir: URL exacta, qué botón, qué debe verse y, si aplica, qué pantalla aparece si el dato no existe.
## Sesión 17 — P0-04 fase 4b: CSP en las 9 páginas restantes (30/10/2026)

- 30/10 · **P0-04 · clases planas sin `!important` ni `@layer`: el JS debe poder ganarlas por CSSOM.** El primer intento de `puerta.html` usó `.oculto{display:none !important}` y la página quedó en blanco tras el PIN: el `el.style.display='block'` del JS no podía ganarle a la clase. Se revirtió (`b05f9480`, `e9511019`) y se resubió con clase plana + el patrón CSSOM (`2553da06`, `6eb2e946`). Regla: toda clase de mostrar/ocultar que el JS deba revertir va SIN `!important`.
- 30/10 · **P0-04 · la CSP no bloquea las escrituras CSSOM; sí bloquea el `style=` escrito en el HTML — incluido el que viaja dentro de plantillas `innerHTML` del `js/`.** Por eso la 4b ejecutó 114 conversiones y no los 121 del inventario viejo ni los 53 del recálculo: la cuenta solo sale bien ejecutando página por página.
- 30/10 · **P0-04 · integridad de ids en conversiones masivas.** Al reemplazar bloques grandes de HTML, `stand.html` perdió ids que el `js/` buscaba (`$()` devolvía `null`). Corregido en `93de6599`. Regla: en cada lote, comparar el conjunto de ids del original contra el del entregable y verificar que cada `getElementById` del `js/` tenga su id en el HTML (o en sus plantillas).
- 30/10 · **P0-04 · los hashes de la CSP se recalculan DESPUÉS de la última edición del CSS o del mini-script.** En `dashboard` y `aliados` el hash precalculado quedó viejo al añadir las clases nuevas; el verificador local (`verificar.py`) lo detectó antes de subir.
- 30/10 · **Lección operativa · bajar archivos grandes del repo con Ctrl+S del enlace raw + verificación de blob sha1.** El fetch por API llega recortado al chat para archivos grandes; la copia del navegador sale con CRLF y sin la última línea, y se repara (`CRLF→LF` + `
` final) hasta que el blob cuadra con `main`. Método usado para los 4 archivos de `aliado`/`cortesias` y los 3 MD del cierre. Nunca transcribir a mano ni reconstruir partes faltantes.
- 30/10 · **Lección operativa · al arrastrar lotes de varios archivos, revisar a dónde cayó cada uno; y un borrado no existe hasta que existe su commit.** Un `aliados-concursos.js` quedó duplicado en la raíz del repo (además del correcto en `js/`); el borrado costó 4 intentos porque el commit no se enviaba. Se confirmó el estado real mirando los commits con la API, no la pantalla (`6615d950`).
- 30/10 · **Lección operativa · los conteos de un inventario deben salir de los archivos byte a byte, no de notas de sesiones anteriores.** El «121 conversiones» de la Sesión 16 contó CSSOM como si fuera atributo; el recálculo de la Sesión 17 (53) no vio las plantillas `innerHTML`. Solo la ejecución produjo el número real: 114.
- 30/10 · **P0-04 queda `hecho` con las 14 páginas bajo CSP.** Pendiente derivado: el `no-referrer`/`noindex` de la fase 2 no está en `main` (regresión de las fases 3/4a) — tarea P0 nueva propuesta para la Sesión 18.
