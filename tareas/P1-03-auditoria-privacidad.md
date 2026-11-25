---
id: "P1-03"
titulo: "Auditoría de acciones y privacidad de datos"
prioridad: "P1"
estado: "en_progreso"
area: "datos"
depende_de: ["P0-02"]
archivos:
  - "admin.html"
  - "dashboard.html"
  - "puerta.html"
  - "aliado.html"
  - "config.js"
---

# P1-03 · Auditoría de acciones y privacidad de datos

## Contexto

Hoy se guarda `marcado_at` por persona, pero no se ve un registro de quién autorizó cada entrada, quién anuló una cortesía, quién cambió un cupo o quién intentó entrar con un token inválido. Tampoco hay aviso de privacidad, retención definida ni minimización de cédula/correo/teléfono. El aliado ve cédula, correo y teléfono del ganador; cualquiera con un link de lista ve nombres y cédulas.

## Evidencia

- [puerta.html:600-617](../puerta.html#L600-L617): autorización sin identificar al operador.
- [admin.html:639-650](../admin.html#L639-L650): limpieza sin registro de auditoría.
- [aliado.html:695-710](../aliado.html#L695-L710): el aliado ve datos del ganador.
- [cortesia.html:289](../cortesia.html#L289): nombres visibles en el pase.
- No hay página de privacidad ni retención documentada.

## Objetivo

Poder responder “quién hizo qué y cuándo” para las acciones críticas, y reducir la exposición de datos personales a lo necesario.

## Pasos

- [ ] Crear una tabla de auditoría append-only con: `id`, `evento_id`, `actor_tipo`, `actor_id`, `actor_label`, `accion`, `entidad`, `entidad_id`, `antes`, `despues`, `ip`, `user_agent`, `created_at`.
- [ ] Registrar como mínimo: login exitoso/fallido, logout, autorización de entrada, cierre/reapertura de lista, cierre de día, creación/anulación de cortesía, asignación de ganador, canje de premio, ampliación de cupones y limpieza.
- [ ] Incluir el operador/dispositivo en las autorizaciones de puerta. Si se mantiene un PIN compartido, al menos registrar `device_label` y el token usado.
- [ ] Añadir una vista de auditoría en admin, con filtros por fecha, acción y operador.
- [ ] Enmascarar cédula en listados (`V-123****`) y mostrar el valor completo solo en la vista de detalle que lo requiera.  <!-- código listo, PENDIENTE DE PRUEBA EN PANTALLA -->
- [ ] Revisar qué campos ve el aliado: limitar a nombre, cédula enmascarada y contacto necesario; no exponer más de lo necesario.
- [ ] Añadir aviso de privacidad/finalidad y consentimiento en formularios públicos.
- [ ] Definir retención: qué se conserva al cerrar el evento, por cuánto tiempo y cómo se borra.
- [ ] Añadir `noindex` y `Referrer-Policy` en páginas de pases, admin y puerta.
- [ ] Revisar que la auditoría no guarde tokens, contraseñas ni datos excesivos.

## Criterios de aceptación

- [ ] Se puede responder quién autorizó una entrada concreta y desde qué dispositivo.
- [ ] Se puede ver quién anuló una cortesía o cambió una asignación.
- [ ] Los intentos de login fallidos quedan registrados sin guardar el PIN.
- [ ] La cédula se muestra enmascarada en los listados y el aliado no ve más datos de los necesarios.
- [ ] Existe aviso de privacidad y una política de retención documentada.
- [ ] Las páginas sensibles tienen `noindex` y `Referrer-Policy`.
- [ ] La tabla de auditoría es append-only para los roles de la app.

## Verificación

1. Autorizar una entrada y comprobar la fila de auditoría con operador, hora y pase.
2. Anular una cortesía y comprobar el registro.
3. Revisar que la auditoría no contiene tokens ni PIN.
4. Abrir el listado de personas y comprobar que la cédula está enmascarada.
5. Revisar la página de privacidad y la retención.

## Fuera de alcance

- Implementar cumplimiento legal completo; esta tarea deja la base y la documentación.
- La CSP completa (ver [P0-04](P0-04-qr-csp-dependencias.md)).

## Notas de implementación

**25/11/2026 — Unidad 1a (solo frontend): minimización de cédula en renders.** Nota de ruta: el helper vive en `config.js` (raíz del repo, línea 164), no en `js/config.js` como decía la orden; es el mismo archivo que ya define `cedulaValida`.

- **Helper creado:** `config.js:164` — `cedulaMascara(valor)`: devuelve `''` si es null/vacío/undefined; quita espacios de extremos (no altera puntos ni guiones internos); ≤5 caracteres → todo puntos (`•` × largo); ≥6 → primeros 3 + `•••` + últimos 2 (`12345678` → `123•••78`). No escapa nada: el escape sigue siendo `escaparHtml`/`esc` en el punto de render. Comentario de una línea en el código aclara que es minimización (P1-03), no seguridad. Probado con node: null/undefined/''/`  12345678  `/`12345`/`12.345.678` → `''`/`''`/`''`/`123•••78`/`•••••`/`12.•••78`.
- **Renders enmascarados (archivo:línea real tras el cambio), envolviendo dentro del escape existente:**

| Render | Referencia tras cambio |
|---|---|
| Lista de cortesía, `CI: …` por persona | `js/puerta.js:796` |
| Lista de talento completada, map de nombres `(CI: …)` | `js/puerta.js:1126` |
| Lista de talento, `CI: … • cargo` por persona | `js/puerta.js:1194` |
| Informe admin, tabla personas, `<td>` cédula | `js/admin.js:676` |
| Informe admin, tabla vendedores, `<td>` cédula | `js/admin.js:685` |
| Checkbox de copia talento→otra lista, `— Cedula:` (textContent, sin escapar) | `js/talento.js:402` |
| Talento, tabla personas, `<td>` cédula | `js/talento.js:625` |
| Stand, fila de persona (`tr.children[2].textContent`) | `js/stand.js:190` |
| Stand, tarjeta QR, valor cédula (`vals[0].textContent`) | `js/stand.js:345` |
| Aliados, tarjeta de aliado, `Cédula: <b>` | `js/aliados.js:280` |
| Cortesías, lista de personas, `— CI` | `js/cortesias.js:621` |
| Concursos, tabla/columna Ganador, `CI:` | `js/aliados-concursos.js:102` |
| Concursos, modal detalle de ganador, `CI:` | `js/aliados-concursos.js:178` |
| Aliado, modal detalles del ganador, `Cédula` | `js/aliado.js:546` |
| Aliado, modal cola de envíos, `Cédula` | `js/aliado.js:614` |

- **Quedan con valor COMPLETO (vista de comparación física, por diseño de minimización):** `js/puerta.js:673` (vendedor escaneado: el operador debe comparar la cédula mostrada contra el documento físico del vendedor en la puerta), `js/puerta.js:876` (autorización de cortesía individual: el operador verifica la identidad del portador contra su documento antes de autorizar) y `js/puerta.js:959` (premiación: el operador verifica la identidad del ganador contra su documento antes de entregar el premio). Son las pantallas de detalle donde la máscara impediría hacer la comparación; los listados (punto anterior) no la necesitan.
- **Correos quitados en `js/aliado.js` (menor exposición; se conserva el teléfono como contacto para entregar el premio):** la línea `<div class="dato-gan"><strong>Correo</strong><span>' + (g.correo ? esc(g.correo) : '—') + '</span></div>` en dos sitios: (1) modal «Detalles del ganador», bloque «👤 Datos del ganador» (antes de la línea del Teléfono, era la línea 548 del archivo original) y (2) modal «Cola de envíos», tarjeta de pendiente de envío (era la línea 618 del archivo original). El correo no aparecía en ninguna otra de las dos vistas; no se quitó nada más.
- **Verificación ejecutada:** `python3 scripts/verificar-arranque.py` → 0 FALLAS (js/puerta.js sin desplazamiento de líneas: los cambios son solo de contenido; refs §9 `js/puerta.js:599-602` y `js/puerta.js:1334-1335` intactas). `node --check` OK en los 9 JS modificados. Greps de control: los 15 renders listados arriba contienen `cedulaMascara`; `js/puerta.js:673/876/959` siguen imprimiendo `escaparHtml(...cedula...)` completo.
- **PENDIENTE DE PRUEBA EN PANTALLA:** abrir en el navegador un listado (informe admin, talento, stand, cortesías) y confirmar visualmente `123•••78`.
- **Queda pendiente (unidad 1b y resto de P1-03):** la RPC sigue enviando la cédula completa al navegador (la máscara solo la esconde al pintar): hay que filtrar el dato con SQL/RPC; aviso de privacidad y consentimiento en formularios públicos; política de retención documentada.
