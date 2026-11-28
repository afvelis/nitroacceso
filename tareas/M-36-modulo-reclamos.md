---
id: "M-36"
titulo: "Módulo de reclamos"
prioridad: "P2"
estado: "hecho"
area: "operacion"
depende_de: []
archivos:
  - "supabase/migrations/0012_m36_modulo_reclamos.sql"
  - reclamo.html
  - js/reclamo.js
  - js/dashboard.js
  - js/aliado.js
  - aliado.html
---

# M-36 · Módulo de reclamos

## Contexto

Idea de producto (registrada en ESTADO.md §3-C, Sesión 13): un módulo para registrar y seguir reclamos (quién reclama, qué reclama, estado de la respuesta). El alcance está POR DEFINIR: no se construye nada hasta tener requisitos en una tabla (quién lo usa, qué hace, qué NO hace) aprobada por el usuario. Los datos del evento ya pasaron (26/09/2026), así que primero hay que decidir si este módulo es para el próximo evento o para uso actual.

## Evidencia

- ESTADO.md §3-C: idea migrada a tarea el 29/10/2026, sin brief todavía.
- No hay tablas ni RPCs de reclamos en la base (ARQUITECTURA.md §3-§4 no las registra).

## Objetivo

Paso 0 cumplido: requisitos aprobados por el usuario en una tabla antes de construir cualquier cosa.

## Brief aprobado (23/11/2026)

**Problema.** Cuando a un aliado se le anula una asignación, el único camino es hablar con la mesa técnica y no queda rastro: ni quién reclamó, ni qué dijo, ni si se le respondió.

**Decisión del usuario (23/11/2026).** Aprobado tal cual el brief y la tabla de requisitos. Los avisos son **solo dentro de la app**: el módulo es nativo, no se externaliza por correo ni por ningún otro medio. La mejora continua se verá cuando el módulo esté completo.

**Alcance fase 1.** Registro del reclamo por el aliado (sin login, con el código del link), código `REC-XXXXXX` para seguimiento, alerta y bandeja de gestión para el administrador, y consulta del estado por el reclamante.

**Fuera de alcance.** Correo automático, chat, adjuntar archivos, y tocar cupones o estados: un reclamo no anula ni reactiva nada.

**Fallback del día del evento (RQ-12).** Si el módulo fallara, la mesa técnica sigue siendo el camino: el texto y el código del aliado ya están en pantalla.

## Tabla de requisitos aprobada

| ID | Requisito | Quién lo usa | Fase |
| --- | --- | --- | --- |
| RQ-01 | Botón «Reclamar» en la pantalla de anulado del aliado (el texto «comunícate con la mesa técnica» se queda como segunda opción) | Aliado | 1 |
| RQ-02 | Formulario con motivo (lista cerrada), detalle libre (máx. 500), nombre y **un** contacto (correo o teléfono) | Aliado | 1 |
| RQ-03 | Al enviar se guarda como `nuevo` y se devuelve un código `REC-XXXXXX` visible en pantalla | Aliado | 1 |
| RQ-04 | Sin login: el código del link (`ASI-…`) identifica el caso | Aliado | 1 |
| RQ-05 | El dashboard muestra contador de reclamos `nuevo` como alerta, con enlace a la bandeja | Admin | 1 |
| RQ-06 | Bandeja: filtros por estado y fecha, detalle, cambio de estado `nuevo → en_revision → resuelto / rechazado`, nota interna y respuesta visible (filtro por fecha: diferido a fase 2) | Admin | 1 |
| RQ-07 | El reclamante consulta su reclamo con el código `REC-…` en una pantalla mínima | Aliado | 1 |
| RQ-08 | Un reclamo no cambia estados, ni cupones, ni reactiva nada | — | 1 |
| RQ-09 | Máximo 3 reclamos por link cada 24 h; el aviso se muestra en la tarjeta | — | 1 |
| RQ-10 | Privacidad: solo nombre y un contacto; sin cédulas ni datos de terceros; RLS cerrada y todo por RPC | — | 1 |
| RQ-11 | Los reclamos se archivan con el evento; no se borran sin orden explícita | Admin | 2/3 |
| RQ-12 | Fallback: la mesa técnica sigue siendo el camino si el módulo falla | — | 1 |
| RQ-13 | Reclamos desde la vista de cortesía anulada | Beneficiario | 2 |
| RQ-14 | Registro de reclamos en puerta (pase rechazado / QR ilegible) | Staff de puerta | 2 |
| RQ-15 | Métricas: reclamos por estado, tiempo medio de respuesta, exportación CSV | Admin | 3 |

**Motivos admitidos por la base (lista cerrada):** `anulacion_no_entendida`, `anulacion_por_error`, `cupones_no_disponibles`, `datos_incorrectos`, `otro`.

**Estados admitidos:** `nuevo`, `en_revision`, `resuelto`, `rechazado`.

## Pasos

- [x] Preguntar al usuario las 5 preguntas de la idea: qué problema resuelve, quién lo usa, qué debe hacer, qué NO debe hacer, cómo se sabrá que sirve. (hecho 23/11/2026: el usuario aprobó la tabla de requisitos)
- [x] Redactar la tabla de requisitos y el brief por fases con el usuario. (hecho 23/11/2026: brief y tabla copiados abajo)
- [ ] Solo con el brief aprobado: diseñar tabla(s) + RPCs (siguiendo las reglas SQL de ARQUITECTURA.md §6) y las pantallas mínimas.
- [ ] Construir por fases, una a la vez, con su prueba dato a dato.

## Criterios de aceptación

- [ ] La tabla de requisitos existe y está aprobada por el usuario (queda copiada en esta tarea).
- [ ] Nada fue construido antes de la aprobación del brief.
- [ ] Si se construye después: cada fase con su prueba del objetivo dato a dato.
- [x] Fase 1 construida y probada (24/11/2026): formulario en la pantalla de anulado del aliado, código `REC-XXXXXX`, consulta pública, bandeja del admin con filtros y contador en el dashboard.
- [x] Servidor verificado por catálogo en staging el 23/11/2026: tabla `reclamos` con `rls=t`, `filas=0` inicial, sin grants para `anon`; las 4 funciones con `secdef=t`, `search_path=public, pg_temp` y `anon=t`.
- [x] Contador del dashboard probado en pantalla con N>0 (`1 reclamo nuevo`) en staging el 28/11/2026.
- [x] Validación campo a campo probada en pantalla con formulario vacío (28/11/2026): los 4 campos obligatorios marcan error borde rojo + `aria-invalid` + texto bajo campo. El campo opcional (detalle) no marca error vacío. Sin modales ni mensajes globales (cumple norma v2.2).

## Verificación

- [x] Contador del dashboard con N>0: `1 reclamo nuevo` (staging, 28/11/2026)
- [x] Validación campo a campo, formulario vacío (staging, 28/11/2026): 3 campos obligatorios con error visible, 1 opcional sin error, sin modales
- [x] `pg_get_functiondef` de las 4 RPCs coincide con el repo (verificado en sesiones anteriores)

## Fuera de alcance

- Construir pantallas, tablas o RPCs antes del brief aprobado.
- Tocar módulos existentes para «aprovechar» reclamos.

## Notas de implementación

**23/11/2026 — fase 1, servidor.**

- `supabase/migrations/0012_m36_modulo_reclamos.sql`: tabla `reclamos` (RLS activada, sin grants para `anon`/`authenticated`) y 4 RPC: `f_reclamo_crear`, `f_reclamo_ver`, `f_admin_listar_reclamos`, `f_admin_resolver_reclamo`.
- Brief y tabla de requisitos (RQ-01…RQ-15) aprobados por el usuario el 23/11/2026 y copiados arriba. Avisos solo dentro de la app: el módulo no se externaliza por correo ni por otro medio.
- Revisión del SQL por juez independiente antes de ejecutarlo: PASA. Se corrigió `set search_path` a `pg_temp` (estaba `pg/temp`, que no existe y anulaba en silencio el endurecimiento) y se añadió `pg_advisory_xact_lock` por link para que dos envíos simultáneos no se salten el límite de 3 por 24 h.
- Pendiente: el usuario ejecuta el SQL en staging y se verifica por catálogo (`pg_proc`/`information_schema`), no por el «Success» del editor. Después: frontend de la fase 1.

**24/11/2026 — fase 1 probada en pantalla (staging).**

Prueba real con la asignación `ASI-DEMO01` anulada a propósito (revertida después):

| RQ | Cómo se probó | Resultado |
| --- | --- | --- |
| RQ-01 | `aliado.html?a=ASI-DEMO01` con la asignación anulada | CUMPLIDO: tarjeta de anulado con el botón `Reclamar` |
| RQ-02/RQ-03 | Envío del formulario | CUMPLIDO: salió el código `REC-CEB4AD` con `Reclamo registrado.` dentro de la tarjeta |
| RQ-04 | Sin login, solo con el código del link | CUMPLIDO |
| RQ-05 | Tarjeta 📮 Reclamos del dashboard | PARCIAL: el botón «Ver la bandeja de reclamos» se usó desde la tarjeta; el texto del contador NO se comprobó en pantalla → PENDIENTE |
| RQ-06 | `reclamos.html`: lista, filtros y guardado | PARCIAL: filtros por ESTADO y guardado CUMPLIDOS; el filtro por FECHA del requisito NO se construyó (diferido a fase 2) |
| RQ-07 | `reclamo.html?r=REC-CEB4AD` antes y después de responder | CUMPLIDO: `Nuevo` → `En revisión` con la respuesta visible y sin nota interna |
| RQ-08 | El reclamo no tocó cupones ni estados de la asignación | CUMPLIDO (la asignación solo cambió por el SQL de la prueba) |
| RQ-09 | Límite de 3 por link cada 24 h | NO PROBADO en pantalla (implementado en servidor con `pg_advisory_xact_lock`) |
| RQ-10 | RLS y grants | CUMPLIDO (verificado por catálogo el 23/11/2026) |
| RQ-11 | Archivado con el evento | PENDIENTE (no hay nada construido para archivar; se decide en fase 2/3) |

Pendiente de prueba en pantalla: la validación campo a campo al enviar vacío, y el contador de la tarjeta `📮 Reclamos` del dashboard. El reclamo `REC-CEB4AD` queda en staging como ejemplo.

REC-CEB4AD: motivo = anulacion_por_error, respuesta = "Recibido, lo estamos revisando", estado final = En revisión.

**24/11/2026 — fase 1 también en servidor de producción.**

- `0012_m36_modulo_reclamos.sql` ejecutada en producción y verificada **por catálogo** (no por el «Success» del editor): `f_reclamo_crear(text,text,text,text,text)`, `f_reclamo_ver(text)`, `f_admin_listar_reclamos(uuid,text)` y `f_admin_resolver_reclamo(uuid,text,text,text,text)` con `secdef=t`, `cfg=search_path=public, pg_temp` y `anon=t`; tabla `public.reclamos` con `rls=t` y `filas=0`; sin grants para `anon`.
- Motivo de hacerlo el mismo día: el frontend ya estaba publicado en Pages, así que producción tenía el botón `Reclamar` sin sus funciones detrás. El módulo queda completo en los dos entornos.
- Contador del panel probado en pantalla en staging: la tarjeta `📮 Reclamos` mostró `Sin reclamos nuevos` con su botón `Ver la bandeja de reclamos`. **El caso con reclamos nuevos (N>0) no se ha visto en pantalla.**
- Sigue pendiente de prueba en pantalla: el envío del formulario vacío (validación campo a campo).
