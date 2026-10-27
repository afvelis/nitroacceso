---
id: "P1-03"
titulo: "Auditoría de acciones y privacidad de datos"
prioridad: "P1"
estado: "pendiente"
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
- [ ] Enmascarar cédula en listados (`V-123****`) y mostrar el valor completo solo en la vista de detalle que lo requiera.
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

> Pendiente.
