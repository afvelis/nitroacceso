---
id: "F-11"
titulo: "Doble punto final en la hora de «ENTRADA YA CONSUMADA» en puerta"
prioridad: "P3"
estado: "hecho"
area: "interfaz"
depende_de: []
archivos:
  - "puerta.html"
  - "js/puerta.js"
  - "tareas/F-11-doble-punto-hora-puerta.md"
  - "tareas/F-9-dia-fuera-de-rango.md"
  - "docs/dev-local.md"
---

# F-11 · Doble punto final en la hora de «ENTRADA YA CONSUMADA» en puerta

## Contexto

Hallazgo observado en pantalla el 13/11/2026 durante la vía B de P1-04 (Sesión 27): al escanear un código ya usado, la puerta muestra `Validado el 13/11/2026 a las 11:59:10 p. m.. No se puede autorizar de nuevo.` — el texto de la hora ya acaba en punto (`p. m.`) y la plantilla le añade otro, dejando dos puntos finales seguidos. Defecto cosmético, sin efecto funcional.

## Evidencia

- Observado en pantalla (13/11/2026): `Validado el 13/11/2026 a las 11:59:10 p. m.. No se puede autorizar de nuevo.` tras autorizar `V-76A8F5D4` en staging.
- A localizar en [js/puerta.js](../js/puerta.js): buscar el texto `No se puede autorizar de nuevo` (aparece en las plantillas de aviso, p. ej. alrededores de `js/puerta.js:455` y `:627`) y la función que formatea la hora (`fecha` / `hora` que esas plantillas interpolan).

## Objetivo

Que el mensaje quede con una sola puntuación final, p. ej. `Validado el 13/11/2026 a las 11:59:10 p. m. No se puede autorizar de nuevo.`

## Pasos

- [x] Localizar con `grep -n "No se puede autorizar de nuevo"` las plantillas afectadas y confirmar el contexto inmediato de cada una antes de editar.
- [x] Quitar el punto añadido por la plantilla (o normalizar la hora formateada) para que quede una sola puntuación.
- [ ] Probar en pantalla con un código ya consumido y comparar el texto resultante. (PENDIENTE: en staging `edicion_abierta = true` y la puerta muestra el aviso de «Evento aún abierto / La base de datos no está congelada»; es el mecanismo de congelado funcionando, no un defecto. Ver «Verificación».)

## Criterios de aceptación

- [x] El mensaje de «ENTRADA YA CONSUMADA» muestra una sola puntuación entre la hora y el resto del texto. (Evidencia medida en la consola del navegador contra staging: frase completa `Validado el 13/11/2026 a las 11:59:10 p. m. No se puede autorizar de nuevo.` y comprobación de `doblePunto: false`.)
- [x] Las demás pantallas que usan el mismo texto (`:627` y la de premios canjeados, `:694`) quedan consistentes si comparten el defecto. (Se aplicó `horaTexto` en los 5 sitios de `js/puerta.js` donde la hora va seguida de puntuación: 462, 526, 634, 701 y 860. Las dos que van seguidas de `</span>` — las de `✅ Entró …`, plantillas en `:561` y `:917` — se dejaron intactas a propósito, porque recortar ahí dejaría `p. m` sin su punto. Verificado por LECTURA de código y por la decisión documentada, no ejecutando esas pantallas.)
- [ ] No se introducen regresiones en el flujo del evento. **PENDIENTE: la prueba en pantalla del flujo no se ejecutó** — en staging `edicion_abierta = true` la puerta muestra el aviso de congelado («Evento aún abierto / La base de datos no está congelada») y no deja operar, así que no se pudo ni buscar un código. Se cerrará cuando el usuario cierre la edición en staging y vea el aviso con un solo punto tras la hora. Lo que SÍ existe no sustituye la prueba del flujo: diff de una sola función y 5 líneas en `js/puerta.js`, `node --check js/puerta.js` OK y `scripts/verificar-arranque.py` en 0 FALLAS — comprobaciones estáticas, no del flujo del evento.

## Verificación

La comprobación se hizo en la consola del navegador (Chrome, página local de puerta apuntando a staging) con el motor de idioma real, con los 4 valores medidos: `crudo: '11:59:10 p. m.'` · `recortado: '11:59:10 p. m'` · `frase: 'Validado el 13/11/2026 a las 11:59:10 p. m. No se puede autorizar de nuevo.'` · `doblePunto: false`. En Node de este equipo (`TZ=America/Caracas`) el mismo recorte reproduce el resultado: `toLocaleTimeString('es-VE')` → `"11:59:10 p. m."` → tras el recorte `"11:59:10 p. m"`.

La comprobación EN PANTALLA dentro de la puerta queda PENDIENTE por el congelado de edición en staging: al medirlo, `edicion_abierta = true`, así que la puerta muestra el aviso de «Evento aún abierto / La base de datos no está congelada» y no deja operar. Ver el aviso en pantalla exigiría cerrar la edición en staging, lo que decide el usuario.

## Fuera de alcance

- Cualquier cambio en las RPC o la hora guardada en la base: es solo formato de presentación.
- La reautorización y su reescritura de `marcado_dia1_at` (tarea F-8).

## Notas de implementación

Implementado y CERRADO el 14/11/2026 (ver «Cierre (14/11/2026)» al final de esta sección, con la evidencia medida que sustenta los criterios marcados arriba). La prueba EN PANTALLA dentro de la puerta sigue pendiente por el congelado de edición en staging (`edicion_abierta = true`).

- Qué cambió: era el arreglo por normalización, no por plantilla. La abreviatura española `p. m.` necesita su punto; el sobrante es el que añade la plantilla. Se añadió la función auxiliar `horaTexto` (`js/puerta.js:130-134`), que formatea con `toLocaleTimeString('es-VE')` y recorta el punto final con `.replace(/\.$/, '')`. NO se usó `hour12: false` (cambiaría el formato a 24 h, cambio de presentación mayor que la tarea no pide).
- Archivos tocados: `js/puerta.js` (5 líneas de formateo) y esta tarea. Ningún SQL, ninguna RPC, ningún otro módulo.
- Llamadas cambiadas (todas conservan el fallback fuera de la función):
  - `js/puerta.js:462` (vendedor): `const hora = marcadoDia ? horaTexto(marcadoDia) : 'hora no registrada';`
  - `js/puerta.js:634` (cortesía individual): `const hora = marcado ? horaTexto(marcado) : 'hora no registrada';`
  - `js/puerta.js:701` (premio canjeado): `const hora = horaTexto(d.canjeado_at);` (siempre hay valor: está dentro del `if(d.canjeado_at)`).
  - `js/puerta.js:526` y `:860` (horaUltima de listas): se decidió APLICAR `horaTexto` porque sus plantillas (`js/puerta.js:536` y `:870`) terminan `a las <strong>${horaUltima}</strong>.` seguido de punto — `p. m.` + `.` daba el mismo doble punto que describe F-11.
- Decisiones sobre las otras interpolaciones de hora:
  - `js/puerta.js:558` (→ plantilla `:561`, `✅ Entró ${hora}</span>`): NO se tocó — la hora va seguida de cierre de `</span>`, sin puntuación.
  - `js/puerta.js:911` (→ plantilla `:917`, `✅ Entró el ${fecha} a las ${hora}</span>`): NO se tocó — termina en `</span>`, sin puntuación.
- Resultado esperado (pendiente de prueba en pantalla): `Validado el 13/11/2026 a las 11:59:10 p. m. No se puede autorizar de nuevo.` — un solo punto entre la hora y el resto.
- Manual de usuario: `docs/manual-usuario/06-puerta.md:85` cita el aviso pero con marcadores (`Validado el [fecha] a las [hora]. No se puede autorizar de nuevo.`); NO reproduce el doble punto literal, así que no requiere cambio ni se inventó sección nueva.
- Candidatos a tarea aparte (mismo defecto, NO tocados en este PR — F-11 es solo la pantalla de puerta):
  - `js/cortesia.js:304`: `...a las <strong>${f.hora}</strong>. No se puede autorizar de nuevo.` con `f.hora` de `formatearFecha` (`js/cortesia.js:75`) → se vería `p. m.. No se puede autorizar de nuevo.`
  - `js/cortesia.js:114`: `...a las <strong>' + f.hora + '</strong>.<br><br>` → mismo doble punto (`p. m..`).
  - `js/aliados.js:193` y `js/admin.js:113` usan `toLocaleDateString('es-VE', {... hour:'2-digit', minute:'2-digit'})`, que también acaba en `a. m./p. m.`; no se auditó la plantilla de cada uso: revisar antes de abrirles tarea.
- Pruebas ejecutadas: `node --check js/puerta.js` → sintaxis OK. La suite de RPCs NO se corrió (no corresponde: cambio solo de presentación en frontend).
- Efecto colateral documentado: Añadir líneas a `js/puerta.js` desplaza los rangos que la tabla de `docs/dev-local.md` §9 cita literalmente; el verificador (`k2`) los comprueba y falla si quedan obsoletos. Se reapuntaron (`js/puerta.js:374-377` → `:382-385` y `:1028-1032` → `:1036-1040`). Lección: los números de línea en documentos caducan.
- Riesgos o pendientes: prueba en pantalla PENDIENTE (escanear un código ya autorizado con el servidor local y leer el texto exacto del aviso; debe decir `...p. m. No se puede autorizar de nuevo.` con un solo punto).

### Cierre (14/11/2026)

- El arreglo: helper `horaTexto` en `js/puerta.js:132` — formatea con `toLocaleTimeString('es-VE')` y recorta el punto final de la abreviatura (`replace(/\.$/, '')`), que es donde estaba el punto sobrante; la frase no lo pierde.
- Evidencia de Node (este equipo, `TZ=America/Caracas`): `new Date('2026-11-14T03:59:10Z').toLocaleTimeString('es-VE')` → `"11:59:10 p. m."`; tras el recorte → `"11:59:10 p. m"`.
- Evidencia de navegador (Chrome, consola, página local de puerta apuntando a staging): `crudo: '11:59:10 p. m.'` · `recortado: '11:59:10 p. m'` · `frase: 'Validado el 13/11/2026 a las 11:59:10 p. m. No se puede autorizar de nuevo.'` · `doblePunto: false`.
- Efecto colateral: añadir líneas a `js/puerta.js` desplazó los rangos que cita `docs/dev-local.md` §9; se reapuntaron (`js/puerta.js:382-385` y `:1036-1040`) y el verificador los comprueba.
- Endurecimiento: `puerta.html:109` (input del PIN) ahora lleva `autocomplete="off"`, igual que `index.html:50`. Mismo atributo en la misma línea, sin líneas añadidas ni quitadas.
- **La causa de los 4 intentos fallidos de PIN no quedó determinada.** Los PINs son correctos (auditoría de staging solo con booleanos: `puerta_acepta_200000 = true`, `admin_acepta_100000 = true`, ambos en bcrypt, `fallos_15min = 2`). El `autocomplete="off"` es una hipótesis defensiva, NO un diagnóstico: el campo de `puerta.html:109` es `type="password"` con `id="pin"` y sin `autocomplete`, mientras `index.html:50` usa el mismo `id` y `type` con `autocomplete="off"`; el gestor de contraseñas del navegador pudo sobrescribir lo tecleado (el campo está enmascarado, así que no se ve).
- Pendiente documental registrado (no se arregla aquí): `?cl=` y `?ci=` de `puerta.html` existen en el código y NO están documentados en el manual de usuario (lo dice `docs/dev-local.md` §9).
- El criterio de «sin regresiones» queda **PENDIENTE de la prueba en pantalla** (marcado `- [ ]`): en staging `edicion_abierta = true` la puerta no opera y no se pudo ejercitar el flujo; se cerrará cuando el usuario cierre la edición en staging y vea el aviso. No darlo por cerrado leyendo el estado `hecho` de la tarea: el `hecho` cubre el arreglo (criterio principal probado) y el endurecimiento, no ese criterio.
